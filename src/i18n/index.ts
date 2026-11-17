import { useSyncExternalStore } from "react";
import { listen } from "@tauri-apps/api/event";
import { en, type MessageKey } from "./en";
import { fr } from "./fr";

/**
 * Islet's translation layer.
 *
 * Deliberately small: two flat dictionaries, one lookup, one interpolation
 * pass. No `react-i18next`, no lazily-loaded namespaces, no ICU parser — for
 * ~400 keys in two languages that would be three dependencies and a build step
 * to do what forty lines already do.
 *
 * The one idea worth keeping: **English defines the key set**. `fr.ts` is
 * typed against it, so forgetting a translation is a compile error instead of
 * an English sentence appearing in the middle of the French interface.
 */

export type Language = "fr" | "en";
/** What the user picks. `system` follows Windows until they choose otherwise. */
export type LanguagePreference = Language | "system";

export const LANGUAGE_KEY = "islet-language";

const DICTIONARIES: Record<Language, Record<string, string | { one: string; other: string }>> = {
  en,
  fr,
};

/** Values accepted in `{{placeholders}}`. */
export type MessageParams = Record<string, string | number>;

// — Current language -------------------------------------------------------

/** Read Windows' language, once, as the default for a brand-new profile. */
function systemLanguage(): Language {
  try {
    const tag = navigator.language || "";
    return tag.toLowerCase().startsWith("fr") ? "fr" : "en";
  } catch {
    return "en";
  }
}

function readPreference(): LanguagePreference {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === "fr" || stored === "en" || stored === "system") return stored;
  } catch {
    // Storage unavailable: fall through to the system default.
  }
  return "system";
}

/** The preference as stored, before resolving `system`. */
let preference: LanguagePreference = "system";
/** The language actually in use. */
let current: Language = "en";

const listeners = new Set<() => void>();

function recompute() {
  const next: Language = preference === "system" ? systemLanguage() : preference;
  if (next === current) return;
  current = next;
  // The document language drives hyphenation, spell-check and screen-reader
  // pronunciation — worth setting even though nothing lays out from it.
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}

/** Language in use right now. Safe to call outside React. */
export function getLanguage(): Language {
  return current;
}

/** The stored preference (`system` | `fr` | `en`). */
export function getLanguagePreference(): LanguagePreference {
  return preference;
}

/**
 * Change the language. Writes to localStorage and to settings.json so the
 * notch, the dock and the settings window all agree, then notifies React.
 */
export function setLanguage(next: LanguagePreference) {
  preference = next;
  try {
    localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    // Quota: the in-memory change still applies for this session.
  }
  // Import lazily: this module is pulled in by tests that must not touch Tauri.
  import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("save_setting", { key: LANGUAGE_KEY, value: next }))
    .catch(() => {});
  recompute();
}

// — Translation ------------------------------------------------------------

/**
 * Fill `{{placeholders}}`. A missing param is left visible as `{{name}}` on
 * purpose: a silently blank string hides the bug until a user reports it.
 */
function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/**
 * Translate a key.
 *
 * `params.count` selects the plural form when the message provides `one` /
 * `other`; any other param is interpolated.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const value = DICTIONARIES[current][key] ?? DICTIONARIES.en[key];
  if (value === undefined) return key;
  if (typeof value === "string") return interpolate(value, params);
  const count = Number(params?.count ?? 0);
  return interpolate(count === 1 ? value.one : value.other, params);
}

/** Translate with an explicit language — for tests and non-React code. */
export function translate(lang: Language, key: MessageKey, params?: MessageParams): string {
  const value = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key];
  if (value === undefined) return key;
  if (typeof value === "string") return interpolate(value, params);
  const count = Number(params?.count ?? 0);
  return interpolate(count === 1 ? value.one : value.other, params);
}

// — React binding ----------------------------------------------------------

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The active language, re-rendering the component when it changes. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

/**
 * The translator, bound to the active language.
 *
 * Use `const t = useT()` at the top of a component and write `{t("key")}`.
 * Depending on `useLanguage` under the hood is what makes a language switch
 * repaint immediately instead of waiting for a reload.
 */
export function useT() {
  // Subscribing here (rather than in each caller) keeps the hook honest: any
  // component using `t` re-renders when the language changes.
  useLanguage();
  return t;
}

// — Boot -------------------------------------------------------------------

let booted = false;

/**
 * Start the translation layer: read the stored preference synchronously (so the
 * first paint is already in the right language) then follow changes coming from
 * another window or from an external edit of settings.json.
 *
 * Idempotent: every window calls it, only the first call does the work.
 */
export function initI18n(): () => void {
  preference = readPreference();
  current = preference === "system" ? systemLanguage() : preference;
  document.documentElement.lang = current;

  if (booted) return () => {};
  booted = true;

  const apply = (key: string, value: unknown) => {
    if (key !== LANGUAGE_KEY) return;
    if (value === "fr" || value === "en" || value === "system") {
      preference = value;
      try {
        localStorage.setItem(LANGUAGE_KEY, value);
      } catch {
        // Non-fatal: the session keeps the change.
      }
      recompute();
    }
  };

  const p1 = listen<{ key: string; value: unknown }>("settings-changed", (e) =>
    apply(e.payload.key, e.payload.value),
  );
  const p2 = listen<{ key: string; value: unknown }>("settings-external-changed", (e) =>
    apply(e.payload.key, e.payload.value),
  );

  return () => {
    p1.then((fn) => fn());
    p2.then((fn) => fn());
    booted = false;
  };
}

/**
 * `Intl` formatters, rebuilt when the language changes.
 *
 * Dates and numbers are where a hand-rolled format betrays a translation
 * fastest: "11/04/2026" means two different days on either side of the
 * Atlantic. Everything user-facing goes through here.
 */
export function formatDate(value: Date | number, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(current === "fr" ? "fr-FR" : "en-US", opts).format(value);
}

export function formatNumber(value: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(current === "fr" ? "fr-FR" : "en-US", opts).format(value);
}
