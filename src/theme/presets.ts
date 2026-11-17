import type { MessageKey } from "../i18n/en";

/**
 * Theme presets.
 *
 * A preset is a **named surface**, not a bag of loose sliders: the colour, the
 * opacity, the text colour and the material all have to agree, or the notch
 * ends up white text on a pale glass and nobody can read it. Keeping the set
 * in one table means the accessibility test can walk it and check every
 * combination instead of hoping.
 *
 * The previous model (`dark` | `light` | `custom` | `adaptive`) still resolves:
 * `dark` maps to `onyx` and `light` to `frost-light`, so an existing
 * `settings.json` keeps working with no migration pass. `custom` and `adaptive`
 * stay dynamic — they read the user's colour or the Windows accent at runtime.
 */

/** How the surface is built. Each level is a superset of the previous one. */
export type Material =
  /** Flat fill, no blur. The safest, and the only one on a metered GPU. */
  | "matte"
  /** Blur + saturation: the frosted glass of the original design. */
  | "frost"
  /** Adds a specular rim and a brightness lift. */
  | "glass"
  /** Adds the sheen and the liquid rim. The requested one. */
  | "liquid";

/** The CSS `backdrop-filter` each material asks for. `null` = leave surfaces alone. */
export const MATERIAL_FILTER: Record<Material, string | null> = {
  matte: null,
  frost: "blur(18px) saturate(150%)",
  glass: "blur(28px) saturate(180%) brightness(1.05)",
  liquid: "blur(34px) saturate(200%) brightness(1.08)",
};

/** Human-readable material names, also used by the settings UI. */
export const MATERIAL_LABEL: Record<Material, MessageKey> = {
  matte: "appearance.material.matte",
  frost: "appearance.material.frost",
  glass: "appearance.material.glass",
  liquid: "appearance.material.liquid",
};

export const MATERIAL_DESC: Record<Material, MessageKey> = {
  matte: "appearance.material.matte.desc",
  frost: "appearance.material.frost.desc",
  glass: "appearance.material.glass.desc",
  liquid: "appearance.material.liquid.desc",
};

export interface ThemePreset {
  id: string;
  labelKey: MessageKey;
  descKey: MessageKey;
  /** Base surface, 0-255 per channel. */
  rgb: [number, number, number];
  /** Opacity at the neutral slider position (0.8). */
  alpha: number;
  /** Extra opacity when the notch unfolds, so it never gets *lighter* open. */
  expandedBoost: number;
  light: boolean;
  text: string;
  textMuted: string;
  border: string;
  groupBg: string;
  accent: string;
  scrollbar: string;
  material: Material;
  /** Two stops for the preview swatch in the settings gallery. */
  swatch: [string, string];
}

export const PRESETS: ThemePreset[] = [
  {
    // The original design, kept byte-for-byte: black at 80 %, no blur on the
    // notch, and the blur the other windows already had via the CSS fallback.
    id: "onyx",
    labelKey: "appearance.preset.onyx",
    descKey: "appearance.preset.onyx.desc",
    rgb: [0, 0, 0],
    alpha: 0.8,
    expandedBoost: 0.12,
    light: false,
    text: "#ffffff",
    textMuted: "rgba(255, 255, 255, 0.6)",
    border: "rgba(255, 255, 255, 0.1)",
    groupBg: "rgba(255, 255, 255, 0.04)",
    accent: "#007aff",
    scrollbar: "rgba(255, 255, 255, 0.1)",
    material: "matte",
    swatch: ["#0b0d12", "#1a1d24"],
  },
  {
    // The request. Alpha is 0.62 rather than the 0.42 a decorative glass would
    // use: white text has to clear 4.5:1 even over a white desktop, and the
    // contrast test in scripts/theme.test.ts fails the build below that.
    id: "liquid",
    labelKey: "appearance.preset.liquid",
    descKey: "appearance.preset.liquid.desc",
    rgb: [14, 16, 22],
    alpha: 0.66,
    expandedBoost: 0.1,
    light: false,
    text: "#ffffff",
    textMuted: "rgba(255, 255, 255, 0.80)",
    border: "rgba(255, 255, 255, 0.22)",
    groupBg: "rgba(255, 255, 255, 0.07)",
    accent: "#5ac8fa",
    scrollbar: "rgba(255, 255, 255, 0.22)",
    material: "liquid",
    swatch: ["#0e1016", "#2a3340"],
  },
  {
    id: "frost-light",
    labelKey: "appearance.preset.frost",
    descKey: "appearance.preset.frost.desc",
    rgb: [255, 255, 255],
    alpha: 0.78,
    expandedBoost: 0.12,
    light: true,
    text: "#1c1c1e",
    textMuted: "rgba(28, 28, 30, 0.72)",
    border: "rgba(0, 0, 0, 0.12)",
    groupBg: "rgba(0, 0, 0, 0.04)",
    accent: "#007aff",
    scrollbar: "rgba(0, 0, 0, 0.15)",
    material: "glass",
    swatch: ["#ffffff", "#dfe4ec"],
  },
  {
    id: "aurora",
    labelKey: "appearance.preset.aurora",
    descKey: "appearance.preset.aurora.desc",
    rgb: [16, 10, 32],
    alpha: 0.66,
    expandedBoost: 0.1,
    light: false,
    text: "#ffffff",
    textMuted: "rgba(255, 255, 255, 0.78)",
    border: "rgba(191, 90, 242, 0.28)",
    groupBg: "rgba(255, 255, 255, 0.06)",
    accent: "#bf5af2",
    scrollbar: "rgba(255, 255, 255, 0.18)",
    material: "glass",
    swatch: ["#2b1b4d", "#0f6c78"],
  },
  {
    id: "nord",
    labelKey: "appearance.preset.nord",
    descKey: "appearance.preset.nord.desc",
    rgb: [46, 52, 64],
    alpha: 0.88,
    expandedBoost: 0.1,
    light: false,
    text: "#eceff4",
    textMuted: "rgba(236, 239, 244, 0.72)",
    border: "rgba(236, 239, 244, 0.16)",
    groupBg: "rgba(236, 239, 244, 0.06)",
    accent: "#88c0d0",
    scrollbar: "rgba(236, 239, 244, 0.18)",
    material: "frost",
    swatch: ["#2e3440", "#4c566a"],
  },
  {
    id: "paper",
    labelKey: "appearance.preset.paper",
    descKey: "appearance.preset.paper.desc",
    rgb: [246, 241, 231],
    alpha: 0.97,
    expandedBoost: 0.03,
    light: true,
    text: "#2e2a22",
    textMuted: "rgba(46, 42, 34, 0.72)",
    border: "rgba(46, 42, 34, 0.14)",
    groupBg: "rgba(46, 42, 34, 0.05)",
    accent: "#a0522d",
    scrollbar: "rgba(46, 42, 34, 0.18)",
    material: "matte",
    swatch: ["#f6f1e7", "#e6dccb"],
  },
  {
    id: "neon",
    labelKey: "appearance.preset.neon",
    descKey: "appearance.preset.neon.desc",
    rgb: [7, 7, 12],
    alpha: 0.84,
    expandedBoost: 0.1,
    light: false,
    text: "#f2fbff",
    textMuted: "rgba(242, 251, 255, 0.66)",
    border: "rgba(0, 229, 255, 0.3)",
    groupBg: "rgba(0, 229, 255, 0.07)",
    accent: "#00e5ff",
    scrollbar: "rgba(0, 229, 255, 0.28)",
    material: "glass",
    swatch: ["#07070c", "#00e5ff"],
  },
  {
    id: "bento",
    labelKey: "appearance.preset.bento",
    descKey: "appearance.preset.bento.desc",
    rgb: [20, 22, 27],
    alpha: 0.92,
    expandedBoost: 0.06,
    light: false,
    text: "#f5f5f7",
    textMuted: "rgba(245, 245, 247, 0.62)",
    border: "rgba(245, 245, 247, 0.14)",
    groupBg: "rgba(245, 245, 247, 0.05)",
    accent: "#ff9f0a",
    scrollbar: "rgba(245, 245, 247, 0.16)",
    material: "frost",
    swatch: ["#14161b", "#232830"],
  },
];

/** The two modes that are not a fixed palette. */
export const DYNAMIC_MODES = ["custom", "adaptive"] as const;
export type DynamicMode = (typeof DYNAMIC_MODES)[number];

export function isDynamicMode(mode: string): mode is DynamicMode {
  return mode === "custom" || mode === "adaptive";
}

/**
 * Legacy values kept for settings files written before the preset table.
 * `dark` was the default, so anything unknown also lands on `onyx`: a corrupt
 * value must not leave the app with no colours at all.
 */
const LEGACY_ALIASES: Record<string, string> = {
  dark: "onyx",
  light: "frost-light",
};

/** Resolve a stored mode to a preset. Unknown values fall back to `onyx`. */
export function resolvePreset(mode: string | null | undefined): ThemePreset {
  const key = mode ?? "onyx";
  const id = LEGACY_ALIASES[key] ?? key;
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/** The preset id to store for a mode, so `settings.json` never keeps a legacy value. */
export function canonicalMode(mode: string | null | undefined): string {
  if (isDynamicMode(mode ?? "")) return mode as string;
  return resolvePreset(mode).id;
}

/** `rgba(...)` from a preset, at a given opacity. */
export function presetBackground(preset: ThemePreset, alpha: number): string {
  const [r, g, b] = preset.rgb;
  return `rgba(${r}, ${g}, ${b}, ${round(alpha)})`;
}

/**
 * The opacity slider means "how solid is this surface, relative to the preset".
 * At its neutral position (0.8) a preset renders at its own alpha, so switching
 * preset never silently changes the slider — and a translucent preset stays
 * translucent instead of jumping to opaque.
 */
export function resolveAlpha(preset: ThemePreset, slider: number): number {
  const factor = clamp(slider, 0.2, 1) / 0.8;
  // Never below 0.35: a 12 % surface is a mistake, not a preference.
  return clamp(preset.alpha * factor, 0.35, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// — Contrast, for the audit test ------------------------------------------

/** Composite an `[r, g, b, a]` colour over an opaque backdrop. */
export function composite(rgb: [number, number, number], alpha: number, backdrop: [number, number, number]): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(rgb[i] * alpha + backdrop[i] * (1 - alpha))) as [number, number, number];
}

/** WCAG relative luminance. */
export function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two opaque colours. */
export function contrast(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Parse `#rrggbb` into channels. Only what the presets use. */
export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
