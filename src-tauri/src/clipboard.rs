//! Clipboard history: the Windows sensor.
//!
//! Same split as `signals.rs`: this module **measures**, it does not decide.
//! It watches the clipboard, stores what it reads, and answers commands. The
//! ordering, the pinning rules and the search all live in `src/lib/clipboard.ts`,
//! where they can be tested without a Windows machine.
//!
//! Two things are deliberately *not* here:
//!
//! * **No disk.** The history lives in memory and dies with the process. A
//!   clipboard is where passwords and private messages travel; writing it to
//!   `%APPDATA%` by default would be a decision the user never asked for.
//! * **No reading behind the user's back.** Windows gives applications a way to
//!   opt out of clipboard monitoring (`CanIncludeInClipboardHistory` set to 0,
//!   or the `ExcludeClipboardContentFromMonitorProcessing` format). Password
//!   managers use it, and honouring it is the difference between a tool and a
//!   keylogger.

use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

/// Event carrying the whole list after every change. Sending the list rather
/// than a delta keeps the frontend stateless: there is exactly one source of
/// truth, and no way for the two sides to drift apart.
pub const CLIPBOARD_EVENT: &str = "clipboard-changed";

/// Polling cadence. The clipboard has no cheap "tell me when it changes"
/// notification without owning a message-only window and a message loop, and
/// `GetClipboardSequenceNumber` costs nothing: 400 ms is a good trade between
/// latency and wakeups. A copy is pasted by a human, not by a benchmark.
const POLL_MS: u64 = 400;

/// Must match `MAX_ITEMS` in `src/lib/clipboard.ts`.
const MAX_ITEMS: usize = 60;
/// Must match `MAX_TEXT_CHARS` in `src/lib/clipboard.ts`.
const MAX_TEXT_CHARS: usize = 20_000;

/// `CF_UNICODETEXT`, declared locally. The constant lives in a different
/// module depending on the `windows` crate version, and this number has not
/// changed since Windows NT.
const CF_UNICODETEXT_FORMAT: u32 = 13;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
pub struct ClipEntry {
    /// Content-derived and stable, so re-copying merges instead of stacking.
    pub id: String,
    /// Only `text` for now. Images would need the DIB copied and re-encoded,
    /// which is a different job and a different memory budget.
    pub kind: String,
    pub text: String,
    /// Length before truncation, so the UI can say how much was cut.
    pub chars: usize,
    /// Unix milliseconds.
    pub at: u64,
    pub pinned: bool,
    /// Executable that held the foreground when the copy happened, or "".
    pub source: String,
    pub truncated: bool,
}

fn history() -> &'static Mutex<Vec<ClipEntry>> {
    static CELL: OnceLock<Mutex<Vec<ClipEntry>>> = OnceLock::new();
    CELL.get_or_init(|| Mutex::new(Vec::new()))
}

/// Recording switch. Off means "stop watching" not "hide the list": the
/// entries already collected stay readable.
static RECORDING: AtomicBool = AtomicBool::new(true);
/// Last clipboard sequence number we processed.
static LAST_SEQUENCE: AtomicU32 = AtomicU32::new(0);
/// Window that had focus before the notch took it, used by `clipboard_paste`.
static PASTE_TARGET: AtomicU64 = AtomicU64::new(0);
/// Last foreground window that belongs to *another* process.
///
/// The notch takes focus as soon as it opens, so a `GetForegroundWindow` made
/// when the panel appears only ever sees Islet itself. The watcher therefore
/// samples the foreground each tick and keeps the last value that is not ours;
/// that is the window the user actually came from.
static LAST_FOREIGN: AtomicU64 = AtomicU64::new(0);

// ---------------------------------------------------------------------------
// Reading the clipboard
// ---------------------------------------------------------------------------

/// FNV-1a over the UTF-16 code units, then base 36.
///
/// `src/lib/clipboard.ts` has the same algorithm for its own tests; on the wire
/// **this** value is the id, and the frontend never recomputes it. Two
/// implementations that must agree are two implementations that will disagree
/// eventually, so only one of them decides.
fn content_id(text: &str) -> String {
    let mut hash: u32 = 0x811c_9dc5;
    for unit in text.encode_utf16() {
        hash ^= unit as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    format!("text-{}", base36(hash))
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

/// What we compare when deciding "same entry". Windows line endings and
/// trailing spaces change on every copy round trip.
fn normalize(text: &str) -> String {
    text.replace("\r\n", "\n")
        .lines()
        .map(|line| line.trim_end())
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

/// True when the application that put the content on the clipboard asked not to
/// be observed. Password managers set one of these two things, and ignoring
/// them is how clipboard tools end up in security advisories.
unsafe fn is_excluded() -> bool {
    use windows::Win32::System::DataExchange::{
        IsClipboardFormatAvailable, RegisterClipboardFormatW,
    };
    use windows::core::PCWSTR;

    // Documented escape hatch: presence of the format is enough, the value is
    // never read.
    let name: Vec<u16> = "ExcludeClipboardContentFromMonitorProcessing\0"
        .encode_utf16()
        .collect();
    let format = RegisterClipboardFormatW(PCWSTR(name.as_ptr()));
    if format != 0 && IsClipboardFormatAvailable(format).is_ok() {
        return true;
    }

    // Windows 10+ alternative: the app publishes CanIncludeInClipboardHistory=0.
    let flag: Vec<u16> = "CanIncludeInClipboardHistory\0".encode_utf16().collect();
    let flag_format = RegisterClipboardFormatW(PCWSTR(flag.as_ptr()));
    if flag_format != 0 && IsClipboardFormatAvailable(flag_format).is_ok() {
        if let Some(value) = read_clipboard_u32(flag_format) {
            return value == 0;
        }
    }

    false
}

/// Read a `DWORD` stored under a registered format, if present.
unsafe fn read_clipboard_u32(format: u32) -> Option<u32> {
    use windows::Win32::Foundation::HGLOBAL;
    use windows::Win32::System::DataExchange::GetClipboardData;
    use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

    let handle = GetClipboardData(format).ok()?;
    let global = HGLOBAL(handle.0);
    let ptr = GlobalLock(global) as *const u32;
    if ptr.is_null() {
        return None;
    }
    let value = std::ptr::read_unaligned(ptr);
    let _ = GlobalUnlock(global);
    Some(value)
}

/// Read the clipboard as text. `None` when it holds anything else.
unsafe fn read_clipboard_text() -> Option<String> {
    use windows::Win32::Foundation::HGLOBAL;
    use windows::Win32::System::DataExchange::GetClipboardData;
    use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

    let handle = GetClipboardData(CF_UNICODETEXT_FORMAT).ok()?;
    if handle.0.is_null() {
        return None;
    }
    let global = HGLOBAL(handle.0);
    let ptr = GlobalLock(global) as *const u16;
    if ptr.is_null() {
        return None;
    }

    // The buffer is NUL-terminated. Walk it rather than trust a length we were
    // not given; cap the walk so a malformed handle cannot hang the thread.
    let mut len = 0usize;
    while len < MAX_TEXT_CHARS * 2 && *ptr.add(len) != 0 {
        len += 1;
    }
    let text = String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len));
    let _ = GlobalUnlock(global);
    Some(text)
}

/// Executable name of the window that had focus, e.g. `Code.exe`.
///
/// Best effort by design: the field is a nicety in the panel, never a decision
/// input, so a failure is simply an empty string.
unsafe fn foreground_process() -> String {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId,
    };

    let fg = GetForegroundWindow();
    if fg.0.is_null() {
        return String::new();
    }
    let mut pid = 0u32;
    GetWindowThreadProcessId(fg, Some(&mut pid));
    if pid == 0 {
        return String::new();
    }

    let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
        return String::new();
    };
    let mut buf = [0u16; 260];
    let mut len = buf.len() as u32;
    let ok = QueryFullProcessImageNameW(
        process,
        PROCESS_NAME_WIN32,
        windows::core::PWSTR(buf.as_mut_ptr()),
        &mut len,
    );
    let _ = CloseHandle(process);
    if ok.is_err() {
        return String::new();
    }

    let path = String::from_utf16_lossy(&buf[..len as usize]);
    path.rsplit('\\').next().unwrap_or("").to_string()
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/// Insert at the top, merging an identical entry and keeping its pin.
///
/// Mirrors `insertClip()` in `src/lib/clipboard.ts`. It has to exist twice
/// because the Rust side must answer `clipboard_get_state` before any webview
/// exists (the notch may open late), so it cannot wait for the frontend to
/// normalise anything.
fn push_entry(list: &mut Vec<ClipEntry>, entry: ClipEntry) {
    let existing_pin = list
        .iter()
        .find(|item| item.id == entry.id)
        .map(|item| item.pinned)
        .unwrap_or(false);

    list.retain(|item| item.id != entry.id);
    list.insert(
        0,
        ClipEntry {
            pinned: existing_pin || entry.pinned,
            ..entry
        },
    );

    // Cap unpinned entries; a pin the user asked for is never evicted.
    let mut unpinned_budget = MAX_ITEMS.saturating_sub(list.iter().filter(|i| i.pinned).count());
    let mut keep = vec![true; list.len()];
    for (index, item) in list.iter().enumerate() {
        if !item.pinned {
            if unpinned_budget == 0 {
                keep[index] = false;
            } else {
                unpinned_budget -= 1;
            }
        }
    }
    let mut cursor = 0;
    list.retain(|_| {
        cursor += 1;
        keep[cursor - 1]
    });
}

fn snapshot() -> Vec<ClipEntry> {
    history()
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default()
}

fn publish(app: &AppHandle) {
    let _ = app.emit(CLIPBOARD_EVENT, snapshot());
}

/// Read the clipboard once and record it if it changed.
fn poll_once(app: &AppHandle) {
    use windows::Win32::System::DataExchange::{
        CloseClipboard, GetClipboardSequenceNumber, OpenClipboard,
    };

    let sequence = unsafe { GetClipboardSequenceNumber() };
    let previous = LAST_SEQUENCE.swap(sequence, Ordering::Relaxed);
    if sequence == previous || sequence == 0 {
        return;
    }

    if !RECORDING.load(Ordering::Relaxed) {
        return;
    }

    let captured = unsafe {
        // The clipboard is a single global resource: another application may
        // hold it for a few milliseconds, in which case we simply skip this
        // tick and catch the next one.
        if OpenClipboard(None).is_err() {
            return;
        }
        let excluded = is_excluded();
        let text = if excluded { None } else { read_clipboard_text() };
        let source = if text.is_some() {
            foreground_process()
        } else {
            String::new()
        };
        let _ = CloseClipboard();
        text.map(|value| (value, source))
    };

    let Some((raw, source)) = captured else {
        return;
    };

    let trimmed = normalize(&raw);
    if trimmed.is_empty() {
        return;
    }

    let truncated = raw.len() > MAX_TEXT_CHARS;
    let stored = if truncated {
        raw.chars().take(MAX_TEXT_CHARS).collect::<String>()
    } else {
        raw.clone()
    };

    let entry = ClipEntry {
        id: content_id(&trimmed),
        kind: "text".to_string(),
        text: stored,
        chars: raw.chars().count(),
        at: crate::utils::get_now_ms() as u64,
        pinned: false,
        source,
        truncated,
    };

    if let Ok(mut guard) = history().lock() {
        push_entry(&mut guard, entry);
    }
    publish(app);
}

/// Sample the foreground window and remember it when it is not ours.
fn sample_foreground() {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.0.is_null() {
        return;
    }
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    if pid == 0 || pid == std::process::id() {
        return;
    }
    LAST_FOREIGN.store(hwnd.0 as usize as u64, Ordering::Relaxed);
}

/// Start watching the clipboard on a background thread.
pub fn start_watcher(app: AppHandle) {
    // Seed the sequence number first: opening Islet with a full clipboard must
    // not immediately record what was copied before the app existed.
    unsafe {
        LAST_SEQUENCE.store(
            windows::Win32::System::DataExchange::GetClipboardSequenceNumber(),
            Ordering::Relaxed,
        );
    }

    std::thread::spawn(move || loop {
        sample_foreground();
        poll_once(&app);
        std::thread::sleep(std::time::Duration::from_millis(POLL_MS));
    });
}

// ---------------------------------------------------------------------------
// Writing the clipboard
// ---------------------------------------------------------------------------

/// Put text back on the clipboard. Returns false when another application is
/// holding it.
unsafe fn write_clipboard_text(text: &str) -> bool {
    use windows::Win32::Foundation::HGLOBAL;
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    if OpenClipboard(None).is_err() {
        return false;
    }

    let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let bytes = wide.len() * std::mem::size_of::<u16>();

    let Ok(global) = GlobalAlloc(GMEM_MOVEABLE, bytes) else {
        let _ = CloseClipboard();
        return false;
    };

    let ptr = GlobalLock(global) as *mut u16;
    if ptr.is_null() {
        let _ = CloseClipboard();
        return false;
    }
    std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
    let _ = GlobalUnlock(global);

    let _ = EmptyClipboard();
    // On success the clipboard owns the handle; freeing it afterwards would be
    // a use-after-free on Windows' side.
    let ok = SetClipboardData(CF_UNICODETEXT_FORMAT, Some(windows::Win32::Foundation::HANDLE(global.0))).is_ok();
    let _ = CloseClipboard();
    ok
}

/// Re-set the clipboard and synthesise Ctrl+V in the window the user came from.
unsafe fn paste_into_target() {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, KEYBDINPUT, KEYEVENTF_KEYUP, VK_CONTROL, VK_V,
    };
    use windows::Win32::UI::WindowsAndMessaging::{SetForegroundWindow, ShowWindow, SW_RESTORE};

    let mut target = PASTE_TARGET.load(Ordering::Relaxed);
    if target == 0 {
        target = LAST_FOREIGN.load(Ordering::Relaxed);
    }
    if target == 0 {
        return;
    }
    let previous = windows::Win32::Foundation::HWND(target as *mut std::ffi::c_void);

    let _ = SetForegroundWindow(previous);
    let _ = ShowWindow(previous, SW_RESTORE);

    // Focus does not move instantly: give the shell a moment, otherwise the
    // keystroke lands in whatever still has focus (usually the notch).
    std::thread::sleep(std::time::Duration::from_millis(90));

    let key = |vk, flags| INPUT {
        r#type: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    let inputs = [
        key(VK_CONTROL, Default::default()),
        key(VK_V, Default::default()),
        key(VK_V, KEYEVENTF_KEYUP),
        key(VK_CONTROL, KEYEVENTF_KEYUP),
    ];
    SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
}

// ---------------------------------------------------------------------------
// Commandes Tauri
// ---------------------------------------------------------------------------

/// Full history, most recent first. The frontend calls this on mount so the
/// panel is never empty while waiting for the next event.
#[tauri::command]
pub fn clipboard_get_state() -> Vec<ClipEntry> {
    snapshot()
}

/// The user opened the panel: remember where they were, so "paste" can go back.
#[tauri::command]
pub fn clipboard_remember_target() {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.0.is_null() {
        return;
    }
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    // Remembering Islet itself would paste into the notch. When the notch
    // already has focus, the watcher's last foreign window is the honest answer.
    if pid != 0 && pid != std::process::id() {
        PASTE_TARGET.store(hwnd.0 as usize as u64, Ordering::Relaxed);
    }
}

/// Copy an entry back onto the clipboard. Always safe: no keystroke, no focus.
#[tauri::command]
pub fn clipboard_copy(id: String) -> Result<(), String> {
    let text = history()
        .lock()
        .map_err(|_| "clipboard busy".to_string())?
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.text.clone())
        .ok_or_else(|| "unknown entry".to_string())?;

    if unsafe { write_clipboard_text(&text) } {
        Ok(())
    } else {
        Err("clipboard busy".to_string())
    }
}

/// Copy then paste into the previous window. Blocking on purpose: it runs off
/// the UI thread and the sleep is what makes the keystroke land in the right
/// place.
#[tauri::command]
pub async fn clipboard_paste(id: String) -> Result<(), String> {
    let text = history()
        .lock()
        .map_err(|_| "clipboard busy".to_string())?
        .iter()
        .find(|item| item.id == id)
        .map(|item| item.text.clone())
        .ok_or_else(|| "unknown entry".to_string())?;

    tauri::async_runtime::spawn_blocking(move || unsafe {
        if !write_clipboard_text(&text) {
            return Err("clipboard busy".to_string());
        }
        paste_into_target();
        Ok(())
    })
    .await
    .map_err(|_| "paste failed".to_string())?
}

#[tauri::command]
pub fn clipboard_toggle_pin(id: String, app: AppHandle) -> Vec<ClipEntry> {
    if let Ok(mut guard) = history().lock() {
        for item in guard.iter_mut() {
            if item.id == id {
                item.pinned = !item.pinned;
                break;
            }
        }
    }
    publish(&app);
    snapshot()
}

#[tauri::command]
pub fn clipboard_remove(id: String, app: AppHandle) -> Vec<ClipEntry> {
    if let Ok(mut guard) = history().lock() {
        guard.retain(|item| item.id != id);
    }
    publish(&app);
    snapshot()
}

/// "Clear history" keeps the pins: that is what pinning is for.
#[tauri::command]
pub fn clipboard_clear(app: AppHandle) -> Vec<ClipEntry> {
    if let Ok(mut guard) = history().lock() {
        guard.retain(|item| item.pinned);
    }
    publish(&app);
    snapshot()
}

#[tauri::command]
pub fn clipboard_set_recording(enabled: bool, app: AppHandle) {
    RECORDING.store(enabled, Ordering::Relaxed);
    let _ = app.emit("clipboard-recording", enabled);
}

#[tauri::command]
pub fn clipboard_is_recording() -> bool {
    RECORDING.load(Ordering::Relaxed)
}
