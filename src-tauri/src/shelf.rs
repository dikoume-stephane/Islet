//! Shelf: the files you dropped on the notch.
//!
//! **References, never copies.** A shelf that copies a 4 GB video so you can
//! find it again is a shelf that fills a disk. The path is stored; the file
//! stays where it is.
//!
//! Same division as `clipboard.rs` and `lyrics.rs`: this module touches the
//! file system (does it still exist, how big is it) and persists the list.
//! Everything about presentation — what kind of file it is, how a size reads,
//! how it sorts — lives in `src/lib/shelf.ts`, where it is tested.
//!
//! `missing` is recomputed on every read rather than stored: the file may have
//! been deleted while Islet was closed, and a shelf that lies about that is
//! worse than a shelf that is empty.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Must match `MAX_SHELF_ITEMS` in `src/lib/shelf.ts`.
const MAX_ITEMS: usize = 24;
/// Stored next to `settings.json`.
const STORE_FILE: &str = "shelf.json";

#[derive(Serialize, Deserialize, Clone)]
pub struct ShelfEntry {
    /// Content-derived from the path, so re-dropping the same file updates the
    /// existing row instead of adding a second one.
    pub id: String,
    pub path: String,
    /// Bytes. Zero for a folder, and for a file that is gone.
    pub size: u64,
    /// Unix milliseconds.
    pub added_at: u64,
    /// Never persisted: recomputed from the file system on every read.
    #[serde(default)]
    pub missing: bool,
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

fn store_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|p| p.join(STORE_FILE))
}

/// FNV-1a over the normalised path, in base 36.
///
/// The same reasoning as the clipboard id: one implementation, in the backend,
/// so the frontend never has to recompute what the backend decided.
fn id_for(path: &str) -> String {
    let normalized = path.replace('/', "\\").to_lowercase();
    let mut hash: u32 = 0x811c_9dc5;
    for unit in normalized.encode_utf16() {
        hash ^= unit as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    format!("shelf-{}", base36(hash))
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

fn read_store(app: &AppHandle) -> Vec<ShelfEntry> {
    store_path(app)
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str::<Vec<ShelfEntry>>(&text).ok())
        .unwrap_or_default()
}

fn write_store(app: &AppHandle, items: &[ShelfEntry]) {
    let Some(path) = store_path(app) else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(items) {
        let _ = std::fs::write(path, json);
    }
}

/// Fill in `size` and `missing` from the file system.
fn refresh(items: Vec<ShelfEntry>) -> Vec<ShelfEntry> {
    items
        .into_iter()
        .map(|mut item| match std::fs::metadata(&item.path) {
            Ok(meta) => {
                item.missing = false;
                item.size = if meta.is_dir() { 0 } else { meta.len() };
                item
            }
            Err(_) => {
                item.missing = true;
                item.size = 0;
                item
            }
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Commandes Tauri
// ---------------------------------------------------------------------------

/// The shelf, newest first, with existence and size refreshed.
#[tauri::command]
pub fn shelf_list(app: AppHandle) -> Vec<ShelfEntry> {
    refresh(read_store(&app))
}

/// Add dropped paths at the front.
///
/// The dedupe and the cap are repeated here even though the frontend does them
/// too: this is the side that writes the file, and a list that grows without
/// bound because of a frontend bug is not a thing to discover a month later.
#[tauri::command]
pub fn shelf_add(app: AppHandle, paths: Vec<String>) -> Vec<ShelfEntry> {
    let now = crate::utils::get_now_ms().max(0) as u64;
    let mut items = read_store(&app);

    // Walked in reverse and each one pushed to the front: the block keeps the
    // order Explorer gave it, and the block sits at the very top. Dragging a
    // selection of five files should not reverse it.
    for path in paths.into_iter().rev() {
        let trimmed = path.trim();
        if trimmed.is_empty() {
            continue;
        }
        let id = id_for(trimmed);
        items.retain(|item| item.id != id);
        items.insert(
            0,
            ShelfEntry {
                id,
                path: trimmed.to_string(),
                size: 0,
                added_at: now,
                missing: false,
            },
        );
    }

    items.truncate(MAX_ITEMS);
    let items = refresh(items);
    write_store(&app, &items);
    items
}

/// Remove one entry.
#[tauri::command]
pub fn shelf_remove(app: AppHandle, id: String) -> Vec<ShelfEntry> {
    let mut items = read_store(&app);
    items.retain(|item| item.id != id);
    let items = refresh(items);
    write_store(&app, &items);
    items
}

/// Empty the shelf. Only the list is cleared: the files are untouched.
#[tauri::command]
pub fn shelf_clear(app: AppHandle) -> Vec<ShelfEntry> {
    write_store(&app, &[]);
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn id_is_stable_and_case_insensitive() {
        assert_eq!(id_for("C:\\Temp\\File.TXT"), id_for("c:/temp/file.txt"));
        assert_eq!(id_for("C:\\a"), id_for("C:\\a\\"));
        assert!(id_for("C:\\a").starts_with("shelf-"));
    }

    #[test]
    fn different_paths_get_different_ids() {
        assert_ne!(id_for("C:\\a\\b.txt"), id_for("C:\\a\\c.txt"));
    }
}
