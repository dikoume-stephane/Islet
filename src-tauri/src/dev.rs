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
//! Vérification de l'identité du dépôt : `git` est lancé avec `-C <dossier>` et
//! `--no-optional-locks`, pour ne pas rafraîchir l'index derrière le dos d'un
//! `git status` que l'utilisateur aurait en cours.

use serde::Serialize;
use std::process::Command;

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
}
