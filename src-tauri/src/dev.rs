//! Les signaux du développeur : l'état du dépôt suivi, et les ports qui
//! écoutent.
//!
//! **Ce module ne décide rien.** Il lance trois commandes git en lecture seule,
//! ou une commande `netstat`, et rend les sorties brutes. Tout ce qui compte
//! les fichiers modifiés, lit un retard, ou juge qu'un port est oublié depuis
//! trop longtemps vit dans `src/lib/dev.ts`, où cela se vérifie sans machine
//! Windows.
//!
//! Cette répartition n'est pas une coquetterie : un parseur de `netstat` est le
//! genre de code qui se trompe en silence sur une ligne IPv6, et qui ne se
//! compile que sur Windows. En le déplaçant côté TypeScript, il se teste sur
//! des lignes figées.
//!
//! **Aucun accès disque arbitraire.** Sans dossier choisi explicitement par
//! l'utilisateur dans les réglages, `dev_git_status` refuse de travailler. Le
//! dossier est validé (il existe, il contient un `.git`) avant tout appel.
//!
//! **La commande de vérification ne part jamais toute seule.** Elle est écrite
//! par l'utilisateur dans les réglages, vide par défaut, et ne s'exécute que
//! sur un clic dans le panneau. Aucune liste de commandes n'est devinée à sa
//! place, et aucune ne survit à la fermeture du panneau.
//!
//! Vérification de l'identité du dépôt : `git` est lancé avec `-C <dossier>` et
//! `--no-optional-locks`, pour ne pas rafraîchir l'index derrière le dos d'un
//! `git status` que l'utilisateur aurait en cours.

use serde::Serialize;
use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

/// Cache la fenêtre de console que Windows ouvrirait pour chaque commande.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Les trois sorties brutes de git, telles quelles.
#[derive(Serialize, Debug)]
pub struct GitRaw {
    /// Sortie de `rev-parse --abbrev-ref HEAD`.
    pub branch: String,
    /// Sortie de `status --porcelain`.
    pub porcelain: String,
    /// Sortie de `rev-list --count --left-right @{upstream}...HEAD`.
    /// Vide quand la branche n'a pas d'amont, ce qui n'est pas une erreur.
    pub counts: String,
}

/// Lance une commande et rend sa sortie standard.
///
/// Un code de sortie non nul n'est **pas** une erreur ici : `git rev-list`
/// échoue quand il n'y a pas de branche amont, et c'est une réponse normale.
/// Seul l'échec de lancement (programme absent) remonte.
fn run(program: &str, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new(program);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let output = command
        .output()
        .map_err(|error| format!("{program}: {error}"))?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// L'état du dépôt suivi.
#[tauri::command]
pub fn dev_git_status(folder: String) -> Result<GitRaw, String> {
    let path = std::path::Path::new(&folder);
    if folder.trim().is_empty() {
        return Err("no-folder".to_string());
    }
    if !path.is_dir() {
        return Err("folder-missing".to_string());
    }
    // `.git` est un dossier dans un dépôt ordinaire, un fichier dans un
    // worktree ou un sous-module : `exists` couvre les deux.
    if !path.join(".git").exists() {
        return Err("not-a-repository".to_string());
    }

    let branch = run("git", &["-C", &folder, "rev-parse", "--abbrev-ref", "HEAD"])?;
    let porcelain = run(
        "git",
        &["--no-optional-locks", "-C", &folder, "status", "--porcelain"],
    )?;
    let counts = run(
        "git",
        &[
            "-C",
            &folder,
            "rev-list",
            "--count",
            "--left-right",
            "@{upstream}...HEAD",
        ],
    )?;

    Ok(GitRaw {
        branch,
        porcelain,
        counts,
    })
}

/// Les lignes de `netstat -ano -p TCP`, telles quelles.
///
/// Le filtrage et l'interprétation se font côté TypeScript. Seule précaution
/// ici : la sortie est bornée, une machine très occupée en produit beaucoup.
#[tauri::command]
pub fn dev_listening_ports() -> Result<Vec<String>, String> {
    const MAX_LINES: usize = 4_000;
    let output = run("netstat", &["-ano", "-p", "TCP"])?;
    Ok(output
        .lines()
        .take(MAX_LINES)
        .map(|line| line.to_string())
        .collect())
}

/// Ce qu'une vérification de build laisse derrière elle.
#[derive(Serialize, Debug)]
pub struct BuildRaw {
    /// Code de sortie du shell. `None` quand la commande a été arrêtée.
    pub code: Option<i32>,
    pub timed_out: bool,
    pub duration_ms: u64,
    /// La fin de la sortie, stdout et stderr mêlés dans l'ordre d'arrivée.
    pub lines: Vec<String>,
}

/// Au-delà, la commande est arrêtée : un `cargo check` bloqué sur un verrou ne
/// doit pas condamner le panneau, ni immobiliser la machine.
pub const BUILD_TIMEOUT_MS: u64 = 180_000;

/// Un compilateur est bavard, un notch fait 380 points de haut.
const MAX_BUILD_LINES: usize = 120;

const BUILD_POLL_MS: u64 = 120;

/// Lit un tuyau du enfant jusqu'à sa fermeture, et range les lignes au fil de
/// l'eau. Deux processus d'écriture (stdout, stderr) : deux fils, sans quoi le
/// tampon du tuyau se remplit et l'enfant se bloque.
fn pump<R: Read + Send + 'static>(
    stream: R,
    sink: Arc<Mutex<Vec<String>>>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        for line in BufReader::new(stream).lines() {
            match line {
                Ok(text) => {
                    if let Ok(mut lines) = sink.lock() {
                        lines.push(text);
                    }
                }
                Err(_) => break,
            }
        }
    })
}

/// Ne garde que la fin d'une sortie, sans les lignes vides.
fn keep_last(lines: Vec<String>, max: usize) -> Vec<String> {
    let kept: Vec<String> = lines
        .into_iter()
        .filter(|line| !line.trim().is_empty())
        .collect();
    if kept.len() <= max {
        return kept;
    }
    kept[kept.len() - max..].to_vec()
}

/// Lance la commande de vérification, dans le dossier suivi, et rend son
/// verdict.
///
/// La commande vient des réglages et n'est jamais écrite ici : ce module ne
/// propose aucun raccourci, aucune commande par défaut. Elle s'exécute avec
/// `cmd /C`, donc avec les mêmes variables d'environnement qu'un terminal
/// ouvert à la main, ce qui est le seul moyen que `bun`, `cargo` ou un
/// gestionnaire de version soient trouvés.
#[tauri::command]
pub fn dev_run_build(folder: String, command: String) -> Result<BuildRaw, String> {
    if command.trim().is_empty() {
        return Err("no-command".to_string());
    }
    if folder.trim().is_empty() {
        return Err("no-folder".to_string());
    }
    let path = std::path::Path::new(&folder);
    if !path.is_dir() {
        return Err("folder-missing".to_string());
    }

    let mut shell = Command::new("cmd");
    shell
        .arg("/C")
        .arg(command.trim())
        .current_dir(path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        shell.creation_flags(CREATE_NO_WINDOW);
    }

    let started = Instant::now();
    let mut child = shell.spawn().map_err(|error| format!("cmd: {error}"))?;

    let output = Arc::new(Mutex::new(Vec::<String>::new()));
    let mut readers = Vec::new();
    if let Some(stdout) = child.stdout.take() {
        readers.push(pump(stdout, Arc::clone(&output)));
    }
    if let Some(stderr) = child.stderr.take() {
        readers.push(pump(stderr, Arc::clone(&output)));
    }

    let limit = Duration::from_millis(BUILD_TIMEOUT_MS);
    let mut timed_out = false;
    let code = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status.code(),
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                for reader in readers {
                    let _ = reader.join();
                }
                return Err(format!("cmd: {error}"));
            }
        }
        if started.elapsed() >= limit {
            let _ = child.kill();
            let _ = child.wait();
            timed_out = true;
            break None;
        }
        thread::sleep(Duration::from_millis(BUILD_POLL_MS));
    };

    // Les tuyaux peuvent encore rendre ce qui a été écrit juste avant la mort
    // du processus : on attend les lecteurs avant de lire le tampon.
    for reader in readers {
        let _ = reader.join();
    }

    let duration_ms = started.elapsed().as_millis() as u64;
    let lines = match output.lock() {
        Ok(guard) => guard.clone(),
        Err(_) => Vec::new(),
    };

    Ok(BuildRaw {
        code,
        timed_out,
        duration_ms,
        lines: keep_last(lines, MAX_BUILD_LINES),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_without_folder() {
        assert_eq!(dev_git_status(String::new()).unwrap_err(), "no-folder");
    }

    #[test]
    fn refuses_a_folder_that_is_not_a_repository() {
        let temp = std::env::temp_dir();
        let error = dev_git_status(temp.to_string_lossy().to_string());
        // Le dossier temporaire existe, mais n'est pas un dépôt.
        assert_eq!(error.unwrap_err(), "not-a-repository");
    }

    #[test]
    fn run_reports_a_missing_program() {
        assert!(run("definitely-not-a-program-islet", &[]).is_err());
    }

    #[test]
    fn build_refuses_without_a_command() {
        let temp = std::env::temp_dir().to_string_lossy().to_string();
        assert_eq!(dev_run_build(temp, String::new()).unwrap_err(), "no-command");
    }

    #[test]
    fn build_refuses_without_a_folder() {
        assert_eq!(
            dev_run_build(String::new(), "echo hi".to_string()).unwrap_err(),
            "no-folder"
        );
    }

    #[test]
    fn build_refuses_a_folder_that_is_gone() {
        // Un chemin sous le dossier temporaire qui n'existe pas : pas de lettre
        // de lecteur en dur, pour que le test dise la même chose sur toute
        // machine.
        let absent = std::env::temp_dir().join("islet-nowhere-at-all");
        assert_eq!(
            dev_run_build(absent.to_string_lossy().to_string(), "echo hi".to_string()).unwrap_err(),
            "folder-missing"
        );
    }

    #[test]
    fn keep_last_drops_blank_lines_and_keeps_the_end() {
        let lines: Vec<String> = vec!["a".into(), "".into(), "b".into(), "c".into(), "  ".into()];
        assert_eq!(keep_last(lines, 10), vec!["a", "b", "c"]);
        let long: Vec<String> = (0..5).map(|index| index.to_string()).collect();
        assert_eq!(keep_last(long, 2), vec!["3", "4"]);
    }
}
