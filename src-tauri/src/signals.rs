//! System signals read by Is.
//!
//! This module is a **pure sensor**: it samples the machine's state and
//! broadcasts it to the frontend on the `system-signals` event. No decision is
//! made here — the rules that turn a signal into a tip live on the TypeScript
//! side, next to the user's settings (thresholds, enabled categories, cooldowns).

use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

/// Sampling cadence. 30 s is plenty for battery or disk state and costs
/// nothing measurable (a handful of Win32 calls).
pub const SAMPLE_INTERVAL_SECS: u64 = 30;

/// Name of the event broadcast to the frontend.
pub const SIGNALS_EVENT: &str = "system-signals";

#[derive(Serialize, Clone, Default)]
pub struct BatterySignal {
    /// Whether a battery exists (false on a desktop tower).
    pub present: bool,
    /// Level 0-100. `None` when Windows doesn't know.
    pub percent: Option<u8>,
    /// Plugged into mains power.
    pub on_ac: bool,
    /// Currently charging.
    pub charging: bool,
    /// Seconds left before empty. `None` when unknown or on AC.
    pub seconds_left: Option<u32>,
    /// Low battery, as reported by Windows itself.
    pub low: bool,
    /// Critical level, as reported by Windows.
    pub critical: bool,
}

#[derive(Serialize, Clone, Default)]
pub struct DiskSignal {
    /// Volume letter, e.g. `C:`
    pub mount: String,
    pub free_gb: f64,
    pub total_gb: f64,
    /// Used share, 0-100
    pub used_percent: f64,
    /// Removable volume (USB key, SD card) — ignored by the rules by default
    pub removable: bool,
}

#[derive(Serialize, Clone, Default)]
pub struct MemorySignal {
    /// Share of physical memory in use, 0-100
    pub load_percent: f32,
    pub total_gb: f64,
    pub free_gb: f64,
}

#[derive(Serialize, Clone, Default)]
pub struct SystemSignals {
    /// Timestamp of the sample (Unix seconds)
    pub sampled_at: u64,
    /// Seconds elapsed since Windows started
    pub uptime_secs: u64,
    /// Boot time (Unix seconds)
    pub boot_time: u64,
    /// Instantaneous CPU load, 0-100
    pub cpu_percent: u32,
    pub memory: MemorySignal,
    pub battery: BatterySignal,
    pub disks: Vec<DiskSignal>,
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

// ---------------------------------------------------------------------------
// Battery
// ---------------------------------------------------------------------------

fn read_battery() -> BatterySignal {
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

    let mut status = SYSTEM_POWER_STATUS::default();
    // Failure = no usable power API on this machine: report "absent" instead of
    // inventing a value.
    if unsafe { GetSystemPowerStatus(&mut status) }.is_err() {
        return BatterySignal::default();
    }

    // BatteryFlag == 128 means "no system battery".
    let no_battery = status.BatteryFlag == 128;
    let unknown_flag = status.BatteryFlag == 255;

    let percent = if status.BatteryLifePercent == 255 {
        None
    } else {
        Some(status.BatteryLifePercent.min(100))
    };

    let present = !no_battery && percent.is_some();
    let on_ac = status.ACLineStatus == 1;
    // 8 = charging
    let charging = on_ac && (status.BatteryFlag & 8) != 0;
    let low = !unknown_flag && (status.BatteryFlag & 2) != 0;
    let critical = !unknown_flag && (status.BatteryFlag & 4) != 0;

    // 0xFFFFFFFF (u32::MAX) = unknown
    let seconds_left = if !on_ac && status.BatteryLifeTime != u32::MAX && status.BatteryLifeTime > 0 {
        Some(status.BatteryLifeTime)
    } else {
        None
    };

    BatterySignal {
        present,
        percent,
        on_ac,
        charging,
        seconds_left,
        low,
        critical,
    }
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

fn read_memory() -> MemorySignal {
    use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

    let mut mem = MEMORYSTATUSEX {
        dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
        ..Default::default()
    };

    if unsafe { GlobalMemoryStatusEx(&mut mem) }.is_err() {
        return MemorySignal::default();
    }

    let gb = 1024.0 * 1024.0 * 1024.0;
    MemorySignal {
        load_percent: mem.dwMemoryLoad as f32,
        total_gb: (mem.ullTotalPhys as f64 / gb * 10.0).round() / 10.0,
        free_gb: (mem.ullAvailPhys as f64 / gb * 10.0).round() / 10.0,
    }
}

// ---------------------------------------------------------------------------
// Disks
// ---------------------------------------------------------------------------

fn read_disks() -> Vec<DiskSignal> {
    use windows::Win32::Storage::FileSystem::{GetDiskFreeSpaceExW, GetDriveTypeW};
    use windows::core::PCWSTR;

    // The `windows` crate doesn't expose these two GetDriveTypeW values: they
    // are declared here under their original SDK names.
    const DRIVE_REMOVABLE_TYPE: u32 = 2;
    const DRIVE_FIXED_TYPE: u32 = 3;

    let mut out = Vec::new();
    let gb = 1024.0 * 1024.0 * 1024.0;

    for letter in b'C'..=b'Z' {
        // "X:\\" in UTF-16, NUL-terminated — the buffer must outlive the call.
        let mut path: Vec<u16> = format!("{}:\\", letter as char).encode_utf16().collect();
        path.push(0);
        let pcw = PCWSTR::from_raw(path.as_ptr());

        let drive_type = unsafe { GetDriveTypeW(pcw) };
        let removable = drive_type == DRIVE_REMOVABLE_TYPE;
        if drive_type != DRIVE_FIXED_TYPE && !removable {
            continue;
        }

        let mut free_to_caller = 0u64;
        let mut total = 0u64;
        let mut total_free = 0u64;

        let ok = unsafe {
            GetDiskFreeSpaceExW(
                pcw,
                Some(&mut free_to_caller),
                Some(&mut total),
                Some(&mut total_free),
            )
        };

        // Empty drive, CD, unmounted volume…: skip it.
        if ok.is_err() || total == 0 {
            continue;
        }

        let used = total.saturating_sub(total_free);
        out.push(DiskSignal {
            mount: format!("{}:", letter as char),
            free_gb: (free_to_caller as f64 / gb * 10.0).round() / 10.0,
            total_gb: (total as f64 / gb * 10.0).round() / 10.0,
            used_percent: (used as f64 / total as f64 * 1000.0).round() / 10.0,
            removable,
        });
    }

    out
}

// ---------------------------------------------------------------------------
// CPU
// ---------------------------------------------------------------------------

fn read_cpu_percent() -> u32 {
    use std::sync::atomic::{AtomicU64, Ordering};
    use windows::Win32::System::Threading::GetSystemTimes;

    static LAST_IDLE: AtomicU64 = AtomicU64::new(0);
    static LAST_KERNEL: AtomicU64 = AtomicU64::new(0);
    static LAST_USER: AtomicU64 = AtomicU64::new(0);

    let mut idle = windows::Win32::Foundation::FILETIME::default();
    let mut kernel = windows::Win32::Foundation::FILETIME::default();
    let mut user = windows::Win32::Foundation::FILETIME::default();

    if unsafe { GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user)) }.is_err() {
        return 0;
    }

    let to_u64 = |ft: windows::Win32::Foundation::FILETIME| {
        (ft.dwHighDateTime as u64) << 32 | ft.dwLowDateTime as u64
    };

    let idle_u = to_u64(idle);
    let kernel_u = to_u64(kernel);
    let user_u = to_u64(user);

    let prev_idle = LAST_IDLE.swap(idle_u, Ordering::Relaxed);
    let prev_kernel = LAST_KERNEL.swap(kernel_u, Ordering::Relaxed);
    let prev_user = LAST_USER.swap(user_u, Ordering::Relaxed);

    let idle_d = idle_u.saturating_sub(prev_idle);
    let kernel_d = kernel_u.saturating_sub(prev_kernel);
    let user_d = user_u.saturating_sub(prev_user);
    let total = kernel_d + user_d;

    if total == 0 {
        return 0;
    }
    (((total.saturating_sub(idle_d)) * 100) / total) as u32
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/// Sample every signal once. Non-blocking and panic-free: any failed read
/// degrades to a neutral value.
pub fn sample() -> SystemSignals {
    let uptime_secs = unsafe { windows::Win32::System::SystemInformation::GetTickCount64() } / 1000;
    let sampled_at = now_unix();

    SystemSignals {
        sampled_at,
        uptime_secs,
        boot_time: sampled_at.saturating_sub(uptime_secs),
        cpu_percent: read_cpu_percent(),
        memory: read_memory(),
        battery: read_battery(),
        disks: read_disks(),
    }
}

/// Start the periodic sampling on a background thread.
///
/// The first sample is published right away so the notch never waits 30 s
/// before showing anything.
pub fn start_sampler(app: AppHandle) {
    std::thread::spawn(move || {
        loop {
            // On the very first round the CPU reading has no reference point and
            // reports 0: harmless, since the alert threshold is 90 %.
            let snapshot = sample();
            let _ = app.emit(SIGNALS_EVENT, &snapshot);

            std::thread::sleep(std::time::Duration::from_secs(SAMPLE_INTERVAL_SECS));
        }
    });
}

// ---------------------------------------------------------------------------
// Commande Tauri
// ---------------------------------------------------------------------------

/// Return an immediate sample — used when the frontend mounts so it doesn't
/// have to wait for the first event.
#[tauri::command]
pub fn get_system_signals() -> SystemSignals {
    sample()
}
