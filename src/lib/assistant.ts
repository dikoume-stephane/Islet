import type { SystemSignals } from "../hooks/useSystemSignals";
import type { Language, MessageParams } from "../i18n";
import type { MessageKey } from "../i18n/en";

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
  | "battery-time"
  | "battery-full"
  | "charge"
  | "disk"
  | "disk-critical"
  | "memory"
  | "cpu"
  | "restart"
  | "session"
  | "late-night";

/**
 * What a tip says, as data rather than a sentence.
 *
 * The engine never builds English. It returns a dictionary key plus the values
 * to interpolate, and the view translates at render time — so switching
 * language re-renders the same tip correctly instead of pinning it to whatever
 * language was active when it was picked.
 */
export interface TipMessage {
  key: MessageKey;
  params: MessageParams;
}

export interface AssistantTip {
  /** Stable key, also used as the cooldown key. */
  id: string;
  severity: TipSeverity;
  icon: TipIcon;
  message: TipMessage;
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
  "battery-time": 2 * 60 * 60_000,
  "battery-full": 2 * 60 * 60_000,
  charge: 2 * 60 * 60_000,
  "disk-critical": 2 * 60 * 60_000,
  disk: 12 * 60 * 60_000,
  memory: 45 * 60_000,
  cpu: 30 * 60_000,
  restart: 12 * 60 * 60_000,
  session: 8 * 60 * 60_000,
  "late-night": 8 * 60 * 60_000,
};

/**
 * Which setting gates each tip.
 *
 * The hook uses this instead of comparing icon names by hand: adding a tip to
 * the catalogue is then enough for it to honour its category switch.
 */
export const TIP_CATEGORY: Record<
  TipIcon,
  "battery" | "storage" | "performance" | "session"
> = {
  "battery-critical": "battery",
  "battery-low": "battery",
  "battery-time": "battery",
  "battery-full": "battery",
  charge: "battery",
  disk: "storage",
  "disk-critical": "storage",
  memory: "performance",
  cpu: "performance",
  restart: "session",
  session: "session",
  "late-night": "session",
};

/** Uptime after which Windows itself is worth restarting (5 days). */
const RESTART_AFTER_SECS = 5 * 24 * 3600;
/** Below this much free space a drive is treated as an emergency (GB). */
const DISK_CRITICAL_GB = 2;
/** Show the "time left" tip only under this remaining time (and above the low threshold). */
const BATTERY_TIME_NOTICE_SECS = 90 * 60;
/** Ignore battery estimates shorter than this — Windows is too noisy there. */
const BATTERY_TIME_FLOOR_SECS = 15 * 60;
/** Local hours treated as "late night" (0 → 4 AM). */
const LATE_NIGHT_FROM = 0;
const LATE_NIGHT_TO = 4;

export type CooldownMap = Record<string, number>;

/**
 * Pick the most useful tip to show right now.
 *
 * Deliberate priority order: machine safety (critical battery, disk out of
 * space) → data integrity (disk filling up) → comfort (charge level, time
 * left, memory) → working hygiene (restart, long session, late night).
 * Only one tip at a time, so Is never floods the notch.
 */
export interface PickOptions {
  /** Clock, for tests. */
  now?: number;
  /** Language used to format durations (`2 h 42` vs `2h 42`). */
  lang?: Language;
}

export function pickTip(
  signals: SystemSignals | null,
  settings: AssistantSettings,
  cooldowns: CooldownMap,
  options: PickOptions = {},
): AssistantTip | null {
  if (!signals || !settings.enabled) return null;

  const now = options.now ?? Date.now();
  const lang = options.lang ?? "en";

  const candidates: AssistantTip[] = [];
  const { battery, memory, disks, cpu_percent, uptime_secs } = signals;

  // — Battery ---------------------------------------------------------------
  // A Windows estimate is shown only when it exists and is plausible; it
  // makes the warning actionable ("40 min") instead of abstract ("18 %").
  const left = battery.seconds_left;
  const leftIsPlausible = left !== null && left > BATTERY_TIME_FLOOR_SECS;
  const leftText = leftIsPlausible ? formatUptime(left, lang) : "";

  if (settings.battery && battery.present && battery.percent !== null && !battery.charging) {
    if (battery.percent <= 10) {
      candidates.push({
        id: "battery-critical",
        severity: "critical",
        icon: "battery-critical",
        message: { key: "tip.batteryCritical", params: { percent: battery.percent } },
      });
    } else if (battery.percent <= settings.lowBattery) {
      candidates.push({
        id: "battery-low",
        severity: "warn",
        icon: "battery-low",
        message: leftIsPlausible
          ? {
              key: "tip.batteryLowWithTime",
              params: { percent: battery.percent, time: leftText },
            }
          : { key: "tip.batteryLow", params: { percent: battery.percent } },
      });
    } else if (leftIsPlausible && left <= BATTERY_TIME_NOTICE_SECS) {
      // Still comfortably above the low threshold, but the clock is running:
      // useful when the percentage alone is reassuring.
      candidates.push({
        id: "battery-time",
        severity: "info",
        icon: "battery-time",
        message: { key: "tip.batteryTime", params: { time: leftText } },
      });
    }
  }

  if (settings.battery && battery.present && battery.charging && battery.percent !== null) {
    if (battery.percent >= 100) {
      candidates.push({
        id: "battery-full",
        severity: "info",
        icon: "battery-full",
        message: { key: "tip.batteryFull", params: {} },
      });
    } else if (battery.percent >= settings.chargeLimit) {
      candidates.push({
        id: "charge-reminder",
        severity: "info",
        icon: "charge",
        message: { key: "tip.chargeReminder", params: { percent: battery.percent } },
      });
    }
  }

  // — Disks -----------------------------------------------------------------
  // Two tiers: an emergency (a few hundred megabytes left) must not look like
  // a warning (10 % free). Emergencies are pushed first so they win.
  if (settings.storage) {
    const floor = 100 - settings.freeSpaceFloor;
    const warnings: AssistantTip[] = [];
    const emergencies: AssistantTip[] = [];

    for (const disk of disks) {
      if (disk.removable || disk.total_gb < 1) continue;

      // Units only: the sentence around them lives in the dictionary, so
      // French can phrase it its own way ("350 Mo restants").
      const freeText =
        disk.free_gb < 10
          ? `${(disk.free_gb * 1024).toFixed(0)} MB`
          : `${disk.free_gb.toFixed(0)} GB`;

      if (disk.free_gb < DISK_CRITICAL_GB || disk.used_percent >= 97) {
        emergencies.push({
          id: `disk-critical:${disk.mount}`,
          severity: "critical",
          icon: "disk-critical",
          message: { key: "tip.diskCritical", params: { mount: disk.mount, free: freeText } },
        });
      } else if (disk.used_percent >= floor) {
        warnings.push({
          id: `disk-low:${disk.mount}`,
          severity: "warn",
          icon: "disk",
          message: { key: "tip.diskLow", params: { mount: disk.mount, free: freeText } },
        });
      }
    }

    candidates.push(...emergencies, ...warnings);
  }

  // — Performance -----------------------------------------------------------
  if (settings.performance) {
    if (memory.load_percent >= 95) {
      candidates.push({
        id: "memory-critical",
        severity: "critical",
        icon: "memory",
        message: { key: "tip.memoryCritical", params: { percent: Math.round(memory.load_percent) } },
      });
    } else if (memory.load_percent >= 90) {
      candidates.push({
        id: "memory-high",
        severity: "warn",
        icon: "memory",
        message: { key: "tip.memoryHigh", params: { percent: Math.round(memory.load_percent) } },
      });
    }
    if (cpu_percent >= 90) {
      candidates.push({
        id: "cpu-high",
        severity: "warn",
        icon: "cpu",
        message: { key: "tip.cpuHigh", params: { percent: cpu_percent } },
      });
    }
  }

  // — Session hygiene -------------------------------------------------------
  // Three different reasons, in decreasing urgency: a machine that has been
  // running for days, a person who has been working too long, and a clock
  // that says it is the middle of the night.
  if (settings.session) {
    const hours = uptime_secs / 3600;
    const hour = new Date(now).getHours();

    if (uptime_secs >= RESTART_AFTER_SECS) {
      const days = Math.floor(uptime_secs / 86400);
      candidates.push({
        id: "restart",
        severity: "info",
        icon: "restart",
        message: { key: "tip.restart", params: { count: days } },
      });
    }

    if (hours >= settings.sessionHours) {
      candidates.push({
        id: "session-long",
        severity: "info",
        icon: "session",
        message: { key: "tip.sessionLong", params: { hours: Math.floor(hours) } },
      });
    }

    if (hour >= LATE_NIGHT_FROM && hour < LATE_NIGHT_TO) {
      candidates.push({
        id: "late-night",
        severity: "info",
        icon: "late-night",
        message: { key: "tip.lateNight", params: { time: formatClock(now) } },
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

/**
 * Format a duration in seconds for a short display.
 *
 * English omits the space (`2h 42`), French keeps it (`2 h 42`) — a small
 * difference, but a notch line that reads wrong is the first thing a French
 * user notices. Minutes-only reads the same in both.
 */
export function formatUptime(seconds: number, lang: Language = "en"): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  const padded = String(m).padStart(2, "0");
  return lang === "fr" ? `${h} h ${padded}` : `${h}h ${padded}`;
}

/** Local wall-clock time as `1:07` — 24 h format, no locale surprises. */
function formatClock(now: number): string {
  const date = new Date(now);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}
