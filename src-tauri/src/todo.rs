//! La to-do du jour : les taches, leurs echeances, et ce qu'on en fait.
//!
//! Ce module ne decidera de rien. Une echeance saisie devient un horodatage
//! cote frontend (`src/lib/todo.ts`), le retard et le report aussi, et tout cela
//! est teste la-bas. Ici on garde le fichier, on date, on coche, on supprime.
//!
//! Meme division que `shelf.rs` et `lyrics.rs`, et une regle en plus : un
//! fichier abime ne doit jamais emporter les taches qu'il contient encore en
//! bon etat. `read_store` rend une liste vide plutot qu'une erreur, et chaque
//! commande reecrit ce qu'elle a lu.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Doit correspondre a `MAX_TASKS` dans `src/lib/todo.ts`.
const MAX_ITEMS: usize = 200;
/// A cote de `settings.json` et de `shelf.json`.
const STORE_FILE: &str = "todos.json";
/// Doit correspondre a `MAX_TITLE_LENGTH` dans `src/lib/todo.ts`.
const MAX_TITLE_LEN: usize = 140;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    /// Echeance en millisecondes Unix, `null` pour une tache sans heure.
    #[serde(default)]
    pub due_at: Option<i64>,
    #[serde(default)]
    pub done: bool,
    pub created_at: i64,
    #[serde(default)]
    pub done_at: Option<i64>,
}

// ---------------------------------------------------------------------------
// Stockage
// ---------------------------------------------------------------------------

fn store_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|p| p.join(STORE_FILE))
}

fn read_store(app: &AppHandle) -> Vec<Task> {
    store_path(app)
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str::<Vec<Task>>(&text).ok())
        .unwrap_or_default()
}

fn write_store(app: &AppHandle, items: &[Task]) {
    let Some(path) = store_path(app) else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(items) {
        let _ = std::fs::write(path, json);
    }
}

/// Espaces multiples ecrases, bords retires, longueur bornee.
fn clean_title(raw: &str) -> String {
    let collapsed = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    collapsed.chars().take(MAX_TITLE_LEN).collect()
}

/// FNV-1a sur la date de creation et le titre, en base 36.
fn id_for(title: &str, created_at: i64) -> String {
    let seed = format!("{}|{}", created_at, title.to_lowercase());
    let mut hash: u32 = 0x811c_9dc5;
    for unit in seed.encode_utf16() {
        hash ^= unit as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    format!("todo-{}", base36(hash))
}

fn base36(mut value: u32) -> String {
    const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if value == 0 {
        return "0".to_string();
    }
    let mut out = Vec::with_capacity(7);
    while value > 0 {
        out.push(DIGITS[(value % 36) as usize]);
        value /= 36;
    }
    out.reverse();
    String::from_utf8(out).unwrap_or_default()
}

/// Au-dela du plafond, on oublie d'abord les taches faites, les plus anciennes
/// en premier : une tache cochee depuis six mois n'a plus rien a dire.
fn prune(mut items: Vec<Task>) -> Vec<Task> {
    if items.len() <= MAX_ITEMS {
        return items;
    }
    items.sort_by(|a, b| a.done.cmp(&b.done).then(b.created_at.cmp(&a.created_at)));
    items.truncate(MAX_ITEMS);
    items
}

/// Un identifiant neuf, jamais deja pris.
fn unique_id(items: &[Task], title: &str, created_at: i64) -> String {
    let base = id_for(title, created_at);
    if !items.iter().any(|task| task.id == base) {
        return base;
    }
    let mut suffix = 2;
    loop {
        let candidate = format!("{}-{}", base, suffix);
        if !items.iter().any(|task| task.id == candidate) {
            return candidate;
        }
        suffix += 1;
    }
}

// ---------------------------------------------------------------------------
// Commandes Tauri
// ---------------------------------------------------------------------------

/// Les taches, telles qu'elles ont ete enregistrees.
#[tauri::command]
pub fn todo_list(app: AppHandle) -> Vec<Task> {
    read_store(&app)
}

/// Ajouter une tache. Le titre vide est refuse sans bruit : c'est le frontend
/// qui empeche de l'envoyer, et ce n'est pas une raison pour en garder une.
#[tauri::command]
pub fn todo_add(app: AppHandle, title: String, due_at: Option<i64>) -> Vec<Task> {
    let title = clean_title(&title);
    let mut items = read_store(&app);
    if title.is_empty() {
        return items;
    }
    let now = crate::utils::get_now_ms();
    let id = unique_id(&items, &title, now);
    items.insert(
        0,
        Task {
            id,
            title,
            due_at,
            done: false,
            created_at: now,
            done_at: None,
        },
    );
    let items = prune(items);
    write_store(&app, &items);
    items
}

/// Cocher ou decocher. L'horodatage de fin suit l'etat : pas de `done_at`
/// orphelin sur une tache rouverte.
#[tauri::command]
pub fn todo_toggle(app: AppHandle, id: String) -> Vec<Task> {
    let now = crate::utils::get_now_ms();
    let mut items = read_store(&app);
    for task in items.iter_mut() {
        if task.id == id {
            task.done = !task.done;
            task.done_at = if task.done { Some(now) } else { None };
        }
    }
    write_store(&app, &items);
    items
}

/// Changer l'echeance, y compris pour l'effacer (`None`).
#[tauri::command]
pub fn todo_set_due(app: AppHandle, id: String, due_at: Option<i64>) -> Vec<Task> {
    let mut items = read_store(&app);
    for task in items.iter_mut() {
        if task.id == id {
            task.due_at = due_at;
        }
    }
    write_store(&app, &items);
    items
}

/// Supprimer une tache. C'est la seule action qui efface.
#[tauri::command]
pub fn todo_remove(app: AppHandle, id: String) -> Vec<Task> {
    let mut items = read_store(&app);
    items.retain(|task| task.id != id);
    write_store(&app, &items);
    items
}

/// Retirer toutes les taches faites, et elles seules.
#[tauri::command]
pub fn todo_clear_done(app: AppHandle) -> Vec<Task> {
    let mut items = read_store(&app);
    items.retain(|task| !task.done);
    write_store(&app, &items);
    items
}

#[cfg(test)]
mod tests {
    use super::*;

    fn task(id: &str, done: bool, created_at: i64) -> Task {
        Task {
            id: id.to_string(),
            title: id.to_string(),
            due_at: None,
            done,
            created_at,
            done_at: None,
        }
    }

    #[test]
    fn title_is_cleaned_and_capped() {
        assert_eq!(clean_title("  ecrire   le   rapport "), "ecrire le rapport");
        assert_eq!(clean_title("").is_empty(), true);
        assert_eq!(clean_title(&"a".repeat(500)).len(), MAX_TITLE_LEN);
    }

    #[test]
    fn ids_are_stable_and_prefixes() {
        assert_eq!(id_for("Rapport", 1_000), id_for("rapport", 1_000));
        assert!(id_for("Rapport", 1_000).starts_with("todo-"));
        assert_ne!(id_for("Rapport", 1_000), id_for("Rapport", 2_000));
    }

    #[test]
    fn duplicate_ids_get_a_suffix() {
        let items = vec![task(&id_for("Rapport", 1_000), false, 1_000)];
        let fresh = unique_id(&items, "Rapport", 1_000);
        assert_ne!(fresh, id_for("Rapport", 1_000));
        assert!(fresh.ends_with("-2"));
    }

    #[test]
    fn prune_keeps_open_tasks_and_recent_done_ones() {
        // 198 ouvertes + 3 faites : deux places restent, pour les deux faites
        // les plus recentes, et la plus vieille disparait.
        let mut items: Vec<Task> = Vec::new();
        for index in 0..198 {
            items.push(task("open", false, index));
        }
        items.push(task("done-old", true, 1));
        items.push(task("done-new", true, 999_999));
        items.push(task("done-mid", true, 500_000));
        let pruned = prune(items);
        assert_eq!(pruned.len(), MAX_ITEMS);
        assert!(pruned.iter().any(|t| t.id == "done-new"));
        assert!(pruned.iter().any(|t| t.id == "done-mid"));
        assert!(!pruned.iter().any(|t| t.id == "done-old"));
    }

    #[test]
    fn prune_leaves_small_lists_alone() {
        let items = vec![task("a", true, 1), task("b", false, 2)];
        assert_eq!(prune(items.clone()).len(), 2);
        assert_eq!(prune(items)[0].id, "a");
    }
}
