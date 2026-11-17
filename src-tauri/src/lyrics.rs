//! Lyrics: fetch a track from LRCLIB, keep it on disk, decide nothing else.
//!
//! Same division of labour as `clipboard.rs`: this module **transports**. It
//! builds the request, handles the cache and reports what happened. Turning the
//! response into lines, choosing which line is current and applying the user's
//! offset all live in `src/lib/lyrics.ts`, where they run against sixty tests
//! without a Windows machine.
//!
//! Three deliberate choices:
//!
//! * **The raw body travels.** The command returns LRCLIB's JSON untouched and
//!   the frontend parses it with the parser that is actually tested. Parsing
//!   here as well would mean two parsers, and two parsers eventually disagree.
//! * **Opt-in is enforced here too.** The setting lives in the frontend, but a
//!   bug there must not be able to turn a local-first app into one that phones
//!   home: `islet-lyrics-enabled` is read again before any request leaves.
//! * **Misses are not cached.** LRCLIB grows every day. Caching "no lyrics" for
//!   a track would make a future answer unreachable forever.

use serde::Serialize;
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Manager};

/// LRCLIB's single-track endpoint. No key, no account.
const ENDPOINT: &str = "https://lrclib.net/api/get";
/// Directory under the app config folder. One small JSON file per track.
const CACHE_DIR: &str = "lyrics";
/// A lyric page is a few kilobytes; eight seconds is already generous.
const TIMEOUT_SECS: u64 = 8;
/// Beyond this the cache is pruned, oldest first. 400 tracks is roughly 6 MB.
const MAX_CACHE_FILES: usize = 400;

#[derive(Serialize)]
pub struct LyricsResponse {
    /// Raw JSON body from the provider, empty when there is nothing to show.
    pub body: String,
    /// `found`, `missing`, `error` or `disabled`.
    pub outcome: String,
    /// True when the body came from the on-disk cache.
    pub cached: bool,
    /// Detail for the `error` case; empty otherwise.
    pub message: String,
}

impl LyricsResponse {
    fn empty(outcome: &str) -> Self {
        Self {
            body: String::new(),
            outcome: outcome.to_string(),
            cached: false,
            message: String::new(),
        }
    }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/// FNV-1a over the identifying fields, in hex.
///
/// The same track must land on the same file across restarts, and two tracks
/// by the same artist must not collide. Title, artist and duration do
/// that without trusting the file system with a name it would refuse.
fn cache_key(track: &str, artist: &str, duration_ms: i64) -> String {
    let seed = format!(
        "{}|{}|{}",
        track.trim().to_lowercase(),
        artist.trim().to_lowercase(),
        duration_ms.max(0) / 1000
    );
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in seed.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{:016x}", hash)
}

fn cache_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|p| p.join(CACHE_DIR))
}

fn cache_file(app: &AppHandle, key: &str) -> Option<PathBuf> {
    cache_dir(app).map(|dir| dir.join(format!("{}.json", key)))
}

fn read_cache(app: &AppHandle, key: &str) -> Option<String> {
    let path = cache_file(app, key)?;
    let body = std::fs::read_to_string(path).ok()?;
    // An empty file is a failed earlier write, not an answer.
    if body.trim().is_empty() { None } else { Some(body) }
}

fn write_cache(app: &AppHandle, key: &str, body: &str) {
    let Some(dir) = cache_dir(app) else { return };
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }
    let _ = std::fs::write(dir.join(format!("{}.json", key)), body);
    prune_cache(&dir);
}

/// Drop the oldest files once the cache grows past its cap.
///
/// Lyrics never change, so there is no invalidation to do; there is only a
/// disk to keep finite on a machine nobody thinks about until it is full.
fn prune_cache(dir: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    let mut files: Vec<(std::time::SystemTime, PathBuf)> = entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                return None;
            }
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((modified, path))
        })
        .collect();

    if files.len() <= MAX_CACHE_FILES {
        return;
    }
    files.sort_by_key(|(modified, _)| *modified);
    let excess = files.len() - MAX_CACHE_FILES;
    for (_, path) in files.into_iter().take(excess) {
        let _ = std::fs::remove_file(path);
    }
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

fn is_enabled(app: &AppHandle) -> bool {
    // Absent means "never configured", and the default of a network feature is
    // off. Reading it backwards here would make the opt-in meaningless.
    crate::utils::get_setting_str(app, "islet-lyrics-enabled")
        .map(|value| value == "true")
        .unwrap_or(false)
}

/// Fetch the lyrics of one track.
///
/// Never errors: a failed request is reported as `outcome: "error"` with a
/// human message, because the panel shows a line of text either way and a
/// rejected promise would only be caught to be turned into the same string.
#[tauri::command]
pub async fn lyrics_fetch(
    app: AppHandle,
    track: String,
    artist: String,
    duration_ms: i64,
) -> LyricsResponse {
    if track.trim().is_empty() || artist.trim().is_empty() {
        return LyricsResponse::empty("missing");
    }
    // A stream has no timeline; asking would waste a request and answer for the
    // wrong recording.
    if duration_ms <= 0 {
        return LyricsResponse::empty("missing");
    }
    if !is_enabled(&app) {
        return LyricsResponse::empty("disabled");
    }

    let key = cache_key(&track, &artist, duration_ms);
    if let Some(body) = read_cache(&app, &key) {
        return LyricsResponse {
            body,
            outcome: "found".to_string(),
            cached: true,
            message: String::new(),
        };
    }

    let url = match build_url(&track, &artist, duration_ms) {
        Ok(url) => url,
        Err(err) => return LyricsResponse {
            body: String::new(),
            outcome: "error".to_string(),
            cached: false,
            message: err,
        },
    };

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        // LRCLIB asks clients to identify themselves; a bare "Islet" is enough
        // and stays honest about who is asking.
        .user_agent("Islet (https://github.com/dikoume-stephane/Islet)")
        .build()
    {
        Ok(client) => client,
        Err(err) => return LyricsResponse {
            body: String::new(),
            outcome: "error".to_string(),
            cached: false,
            message: err.to_string(),
        },
    };

    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(err) => {
            eprintln!("[lyrics] request failed: {}", err);
            return LyricsResponse {
                body: String::new(),
                outcome: "error".to_string(),
                cached: false,
                message: if err.is_timeout() { "timeout".to_string() } else { err.to_string() },
            };
        }
    };

    let status = response.status();
    if status.as_u16() == 404 {
        // The provider answered, and it does not have this track.
        return LyricsResponse::empty("missing");
    }
    if !status.is_success() {
        eprintln!("[lyrics] provider returned {}", status);
        return LyricsResponse {
            body: String::new(),
            outcome: "error".to_string(),
            cached: false,
            message: format!("HTTP {}", status.as_u16()),
        };
    }

    let body = match response.text().await {
        Ok(body) => body,
        Err(err) => return LyricsResponse {
            body: String::new(),
            outcome: "error".to_string(),
            cached: false,
            message: err.to_string(),
        },
    };

    // A captive portal or a proxy returns HTML with a 200. Caching that would
    // poison the entry for good, so the shape is checked before writing.
    if !body.trim_start().starts_with('{') {
        return LyricsResponse {
            body: String::new(),
            outcome: "error".to_string(),
            cached: false,
            message: "unexpected-response".to_string(),
        };
    }

    write_cache(&app, &key, &body);

    LyricsResponse {
        body,
        outcome: "found".to_string(),
        cached: false,
        message: String::new(),
    }
}

fn build_url(track: &str, artist: &str, duration_ms: i64) -> Result<reqwest::Url, String> {
    let mut url = reqwest::Url::parse(ENDPOINT).map_err(|e| e.to_string())?;
    {
        // `query_pairs_mut` percent-encodes the values, which matters for every
        // title with an ampersand or an accent in it.
        let mut query = url.query_pairs_mut();
        query.append_pair("track_name", track.trim());
        query.append_pair("artist_name", artist.trim());
        query.append_pair("duration", &(duration_ms.max(0) / 1000).to_string());
    }
    Ok(url)
}

/// Delete every cached lyrics file. Returns how many were removed.
///
/// The cache is a convenience, never a source of truth: wiping it costs one
/// request per track and nothing else.
#[tauri::command]
pub fn lyrics_clear_cache(app: AppHandle) -> u32 {
    let Some(dir) = cache_dir(&app) else { return 0 };
    let Ok(entries) = std::fs::read_dir(&dir) else { return 0 };
    let mut removed = 0;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("json")
            && std::fs::remove_file(&path).is_ok()
        {
            removed += 1;
        }
    }
    removed
}

/// How many tracks are cached, for the settings tab.
#[tauri::command]
pub fn lyrics_cache_count(app: AppHandle) -> u32 {
    let Some(dir) = cache_dir(&app) else { return 0 };
    let Ok(entries) = std::fs::read_dir(&dir) else { return 0 };
    entries
        .flatten()
        .filter(|entry| entry.path().extension().and_then(|ext| ext.to_str()) == Some("json"))
        .count() as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_key_is_stable_and_case_insensitive() {
        let a = cache_key("One More Time", "Daft Punk", 320_000);
        let b = cache_key("  one more time ", "daft punk", 320_900);
        assert_eq!(a, b);
        assert_eq!(a.len(), 16);
    }

    #[test]
    fn cache_key_separates_different_tracks() {
        let a = cache_key("Intro", "Artist", 60_000);
        let b = cache_key("Intro", "Artist", 61_000);
        assert_ne!(a, b);
    }

    #[test]
    fn url_encodes_the_query() {
        let url = build_url("Tom & Jerry", "AC/DC", 200_000).unwrap();
        let text = url.as_str();
        assert!(text.contains("track_name=Tom+%26+Jerry") || text.contains("track_name=Tom%20%26%20Jerry"));
        assert!(text.contains("artist_name=AC%2FDC"));
        assert!(text.contains("duration=200"));
    }
}
