import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** Exact mirror of `SystemSignals` on the Rust side (`src-tauri/src/signals.rs`). */
export interface BatterySignal {
  present: boolean;
  percent: number | null;
  on_ac: boolean;
  charging: boolean;
  seconds_left: number | null;
  low: boolean;
  critical: boolean;
}

export interface DiskSignal {
  mount: string;
  free_gb: number;
  total_gb: number;
  used_percent: number;
  removable: boolean;
}

export interface MemorySignal {
  load_percent: number;
  total_gb: number;
  free_gb: number;
}

export interface SystemSignals {
  sampled_at: number;
  uptime_secs: number;
  boot_time: number;
  cpu_percent: number;
  memory: MemorySignal;
  battery: BatterySignal;
  disks: DiskSignal[];
}

const SIGNALS_EVENT = "system-signals";

/**
 * Machine-level state, refreshed every 30 s by the backend.
 *
 * Returns `null` until the first sample arrives: callers must handle that case
 * instead of rendering made-up values.
 */
export function useSystemSignals(): SystemSignals | null {
  const [signals, setSignals] = useState<SystemSignals | null>(null);

  useEffect(() => {
    let alive = true;

    // Read immediately so the UI doesn't wait 30 s on mount.
    invoke<SystemSignals>("get_system_signals")
      .then((snapshot) => {
        if (alive) setSignals(snapshot);
      })
      .catch((err) => console.warn("get_system_signals:", err));

    const unlisten = listen<SystemSignals>(SIGNALS_EVENT, (event) => {
      if (alive) setSignals(event.payload);
    });

    return () => {
      alive = false;
      unlisten.then((fn) => fn());
    };
  }, []);

  return signals;
}
