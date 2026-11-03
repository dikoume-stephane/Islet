import type { SystemSignals } from "../hooks/useSystemSignals";

/**
 * Is — tip engine.
 *
 * Pure function: given a system sample, the user's settings and the last
 * display timestamp of each tip, choose **at most one** tip to show. The
 * backend only measures; every policy decision lives here.
 */

export type TipSeverity = "info" | "warn" | "critical";

export type TipIcon =
  | "battery-low"
  | "battery-critical"
  | "battery-full"
  | "charge"
  | "disk"
  | "memory"
  | "cpu"
  | "session";

export interface AssistantTip {
  /** Stable key, also used as the cooldown key. */
  id: string;
  severity: TipSeverity;
  icon: TipIcon;
  /** One line, shown in the notch. */
  title: string;
}

export interface AssistantSettings {
  enabled: boolean;
  battery: boolean;
  storage: boolean;
  performance: boolean;
  session: boolean;
  /** Low battery threshold, in percent. */
  lowBattery: number;
  /** Battery level at which to suggest unplugging, in percent. */
  chargeLimit: number;
  /** Warn about a drive below this share of free space, in percent. */
  freeSpaceFloor: number;
  /** Uptime, in hours, after which to suggest a break. */
  sessionHours: number;
}

/** Minimum delay between two displays of the same tip (ms). */
const COOLDOWN_MS: Record<TipIcon, number> = {
  "battery-critical": 10 * 60_000,
  "battery-low": 30 * 60_000,
  "battery-full": 2 * 60 * 60_000,
  charge: 2 * 60 * 60_000,
  disk: 12 * 60 * 60_000,
  memory: 45 * 60_000,
  cpu: 30 * 60_000,
  session: 8 * 60 * 60_000,
};

export type CooldownMap = Record<string, number>;

/**
 * Pick the most useful tip to show right now.
 *
 * Deliberate priority order: machine safety (critical battery) → data
 * integrity (disk) → comfort (charge, memory) → working hygiene (session).
 * Only one tip at a time, so Is never floods the notch.
 */
export function pickTip(
  signals: SystemSignals | null,
  settings: AssistantSettings,
  cooldowns: CooldownMap,
  now: number = Date.now(),
): AssistantTip | null {
  if (!signals || !settings.enabled) return null;

  const candidates: AssistantTip[] = [];
  const { battery, memory, disks, cpu_percent, uptime_secs } = signals;

  // — Battery ---------------------------------------------------------------
  if (settings.battery && battery.present && battery.percent !== null && !battery.charging) {
    if (battery.percent <= 10) {
      candidates.push({
        id: "battery-critical",
        severity: "critical",
        icon: "battery-critical",
        title: `Battery at ${battery.percent}% — plug in now`,
      });
    } else if (battery.percent <= settings.lowBattery) {
      candidates.push({
        id: "battery-low",
        severity: "warn",
        icon: "battery-low",
        title: `Battery at ${battery.percent}% — time to charge`,
      });
    }
  }

  if (settings.battery && battery.present && battery.charging && battery.percent !== null) {
    if (battery.percent >= 100) {
      candidates.push({
        id: "battery-full",
        severity: "info",
        icon: "battery-full",
        title: "Battery full — you can unplug",
      });
    } else if (battery.percent >= settings.chargeLimit) {
      candidates.push({
        id: "charge-reminder",
        severity: "info",
        icon: "charge",
        title: `Charged to ${battery.percent}% — you can unplug`,
      });
    }
  }

  // — Disks -----------------------------------------------------------------
  if (settings.storage) {
    const floor = 100 - settings.freeSpaceFloor;
    for (const disk of disks) {
      if (disk.removable || disk.total_gb < 1) continue;
      if (disk.used_percent >= floor) {
        candidates.push({
          id: `disk-low:${disk.mount}`,
          severity: "warn",
          icon: "disk",
          title: `${disk.mount} almost full — ${disk.free_gb.toFixed(0)} GB left`,
        });
      }
    }
  }

  // — Performance -----------------------------------------------------------
  if (settings.performance) {
    if (memory.load_percent >= 90) {
      candidates.push({
        id: "memory-high",
        severity: "warn",
        icon: "memory",
        title: `Memory at ${Math.round(memory.load_percent)}% — close an app?`,
      });
    }
    if (cpu_percent >= 90) {
      candidates.push({
        id: "cpu-high",
        severity: "warn",
        icon: "cpu",
        title: `CPU at ${cpu_percent}% — something is busy`,
      });
    }
  }

  // — Session ---------------------------------------------------------------
  if (settings.session) {
    const hours = uptime_secs / 3600;
    if (hours >= settings.sessionHours) {
      candidates.push({
        id: "session-long",
        severity: "info",
        icon: "session",
        title: `${Math.floor(hours)} h uptime — take a break?`,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Keep the insertion order (= priority order) and return the first tip whose
  // cooldown has elapsed.
  const eligible = candidates.find((tip) => {
    const last = cooldowns[tip.id] ?? 0;
    return now - last >= COOLDOWN_MS[tip.icon];
  });

  return eligible ?? null;
}

/** Format a duration in seconds for a short display (`7 h 42`, `18 min`). */
export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}
