import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  pickTip,
  TIP_CATEGORY,
  type AssistantSettings,
  type AssistantTip,
  type CooldownMap,
} from "../lib/assistant";
import type { SystemSignals } from "./useSystemSignals";
import { getLanguage } from "../i18n";

const COOLDOWNS_KEY = "islet-assistant-cooldowns";

/**
 * How long a tip stays fully unfolded, by severity.
 *
 * A red tip buys itself a few more seconds: "plug in now" is worth reading
 * twice, "take a break" is not.
 */
const VISIBLE_MS: Record<AssistantTip["severity"], number> = {
  info: 10_000,
  warn: 12_000,
  critical: 15_000,
};

function readBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Read Is settings from local storage (the app's source of truth). */
export function readAssistantSettings(): AssistantSettings {
  return {
    enabled: readBool("islet-assistant-enabled", true),
    battery: readBool("islet-assistant-battery", true),
    storage: readBool("islet-assistant-storage", true),
    performance: readBool("islet-assistant-performance", true),
    session: readBool("islet-assistant-session", true),
    lowBattery: readNumber("islet-assistant-low-battery", 20),
    chargeLimit: readNumber("islet-assistant-charge-limit", 80),
    freeSpaceFloor: readNumber("islet-assistant-free-space-floor", 10),
    sessionHours: readNumber("islet-assistant-session-hours", 8),
  };
}

function readCooldowns(): CooldownMap {
  try {
    const raw = localStorage.getItem(COOLDOWNS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCooldowns(map: CooldownMap) {
  try {
    localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(map));
  } catch {
    // Full quota or unavailable storage: worst case a tip comes back sooner
    // than expected, never a crash.
  }
}

/**
 * Drive Is: watch system signals, pick a tip, show it once, then honour its
 * cooldown.
 */
export function useAssistant(signals: SystemSignals | null) {
  const [tip, setTip] = useState<AssistantTip | null>(null);
  /**
   * The last tip whose window elapsed without being acknowledged. Kept so the
   * notch can carry a coloured marker: a 10 s message is easy to miss, a mark
   * that stays until you look is not.
   */
  const [unread, setUnread] = useState<AssistantTip | null>(null);
  const [settings, setSettings] = useState<AssistantSettings>(() => readAssistantSettings());
  const cooldownsRef = useRef<CooldownMap>(readCooldowns());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipRef = useRef<AssistantTip | null>(null);
  tipRef.current = tip;
  const unreadRef = useRef<AssistantTip | null>(null);
  unreadRef.current = unread;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearHideTimer();
    setTip(null);
  }, [clearHideTimer]);

  /** Acknowledge the marker: the notch stops signalling. */
  const acknowledge = useCallback(() => {
    setUnread(null);
  }, []);

  // Re-evaluate on every new sample (every 30 s).
  useEffect(() => {
    if (!signals) return;
    // Never replace a tip that is already being read.
    if (tipRef.current) return;

    const next = pickTip(signals, readAssistantSettings(), cooldownsRef.current, {
      lang: getLanguage(),
    });
    if (!next) return;

    // Marked as seen as soon as it appears: if the user closes it quickly or the
    // notch folds, the same tip doesn't loop.
    cooldownsRef.current[next.id] = Date.now();
    writeCooldowns(cooldownsRef.current);

    setTip(next);
    setUnread(null);
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setTip(null);
      // The window closed without a click: leave a mark instead of vanishing.
      setUnread(next);
    }, VISIBLE_MS[next.severity]);
  }, [signals, clearHideTimer]);

  // Settings change in the Settings window: mirror the received value into our
  // own localStorage (webview hosts don't always share it), then re-read the
  // configuration and drop a tip that just became unwanted.
  useEffect(() => {
    const apply = (key: string, value: unknown) => {
      if (!key.startsWith("islet-assistant-")) return;
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));

      const next = readAssistantSettings();
      setSettings(next);

      if (!next.enabled) {
        dismiss();
        setUnread(null);
        return;
      }
      // A category switched off while one of its tips is on screen: remove it,
      // and drop a marker that just became unwanted.
      const current = tipRef.current;
      if (current && !next[TIP_CATEGORY[current.icon]]) {
        dismiss();
      }
      if (unreadRef.current && !next[TIP_CATEGORY[unreadRef.current.icon]]) {
        setUnread(null);
      }
    };

    const unlistenSC = listen<{ key: string; value: unknown }>("settings-changed", (e) =>
      apply(e.payload.key, e.payload.value),
    );
    const unlistenSEC = listen<{ key: string; value: unknown }>(
      "settings-external-changed",
      (e) => apply(e.payload.key, e.payload.value),
    );

    return () => {
      unlistenSC.then((fn) => fn());
      unlistenSEC.then((fn) => fn());
    };
  }, [dismiss]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  return { tip, unread, dismiss, acknowledge, settings };
}
