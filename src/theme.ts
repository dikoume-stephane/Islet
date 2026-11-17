import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./material.css";
import {
  MATERIAL_FILTER,
  isDynamicMode,
  presetBackground,
  resolveAlpha,
  resolvePreset,
  type Material,
} from "./theme/presets";

// Convert a hex color string to rgba with a specified alpha
function hexToRgba(hex: string, alpha: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

// Convert Hex to HSL
export function hexToHsl(hex: string): HSL {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = (parseInt(hex.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(hex.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(hex.substring(4, 6), 16) || 0) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Convert HSL back to Hex color string
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (val: number) => {
    const hexVal = Math.round((val + m) * 255).toString(16);
    return hexVal.length === 1 ? '0' + hexVal : hexVal;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Apply a theme.
 *
 * `mode` is either a preset id (`onyx`, `liquid`, `frost-light`, …) or one of
 * the two dynamic modes (`custom`, `adaptive`) that read the user's colour or
 * the Windows accent at runtime. Legacy `dark` / `light` still resolve, so a
 * settings file written before the preset table keeps working unchanged.
 *
 * Three things are written: the colour variables, the tone class
 * (`light-mode` / `dark-mode`, which the CSS reads in a hundred places), and
 * the material attributes, which drive blur, rim and sheen.
 */
export async function applyTheme(
  mode: string,
  customColor: string,
  opacity?: number,
  saturation?: number,
  brightness?: number
) {
  const root = document.documentElement;

  if (opacity === undefined || opacity === null) {
    const cachedOpacity = localStorage.getItem('islet-theme-opacity');
    opacity = cachedOpacity !== null ? parseFloat(cachedOpacity) : 0.80;
  }

  if (saturation === undefined || saturation === null) {
    const cachedSaturation = localStorage.getItem('islet-theme-saturation');
    saturation = cachedSaturation !== null ? parseFloat(cachedSaturation) : 0.50;
  }

  if (brightness === undefined || brightness === null) {
    const cachedBrightness = localStorage.getItem('islet-theme-brightness');
    brightness = cachedBrightness !== null ? parseFloat(cachedBrightness) : 0.15;
  }

  const dynamic = isDynamicMode(mode);
  const preset = resolvePreset(mode);

  // Dynamic modes keep the material they always had (none on the notch): they
  // are colour experiments, not surfaces, and changing that silently would be
  // a regression for everyone who already picked one.
  applyMaterial(root, dynamic ? 'matte' : preset.material, dynamic ? mode : preset.id);

  if (!dynamic) {
    const op = resolveAlpha(preset, opacity);
    const opExpanded = Math.min(1, op + preset.expandedBoost);

    root.style.setProperty('--islet-bg', presetBackground(preset, op));
    root.style.setProperty('--islet-bg-expanded', presetBackground(preset, opExpanded));
    root.style.setProperty('--islet-text', preset.text);
    root.style.setProperty('--islet-text-muted', preset.textMuted);
    root.style.setProperty('--islet-border', preset.border);
    root.style.setProperty('--islet-group-bg', preset.groupBg);
    root.style.setProperty('--islet-accent', preset.accent);
    root.style.setProperty('--islet-scrollbar-thumb', preset.scrollbar);
    setTone(root, preset.light);
    return;
  }

  const op = opacity;
  const opExpanded = Math.min(1.0, opacity + 0.12);

  if (mode === 'custom') {
    const hsl = hexToHsl(customColor);
    hsl.s = saturation * 100;
    hsl.l = brightness * 100;
    const finalBgColor = hslToHex(hsl.h, hsl.s, hsl.l);
    const isLight = brightness > 0.55;

    root.style.setProperty('--islet-bg', hexToRgba(finalBgColor, op));
    root.style.setProperty('--islet-bg-expanded', hexToRgba(finalBgColor, opExpanded));
    root.style.setProperty('--islet-text', isLight ? '#1c1c1e' : '#ffffff');
    root.style.setProperty('--islet-text-muted', isLight ? 'rgba(28, 28, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)');
    root.style.setProperty('--islet-border', isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)');
    root.style.setProperty('--islet-group-bg', isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)');
    root.style.setProperty('--islet-accent', customColor);
    root.style.setProperty('--islet-scrollbar-thumb', isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)');
    setTone(root, isLight);
  } else if (mode === 'adaptive') {
    try {
      const accentHex = await invoke<string>('get_system_accent_color');
      const hsl = hexToHsl(accentHex);
      hsl.s = saturation * 100;
      hsl.l = brightness * 100;
      const finalBgColor = hslToHex(hsl.h, hsl.s, hsl.l);
      const isLight = brightness > 0.55;

      root.style.setProperty('--islet-bg', hexToRgba(finalBgColor, op));
      root.style.setProperty('--islet-bg-expanded', hexToRgba(finalBgColor, opExpanded));
      root.style.setProperty('--islet-text', isLight ? '#1c1c1e' : '#ffffff');
      root.style.setProperty('--islet-text-muted', isLight ? 'rgba(28, 28, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)');
      root.style.setProperty('--islet-border', isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--islet-group-bg', isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)');
      root.style.setProperty('--islet-accent', accentHex);
      root.style.setProperty('--islet-scrollbar-thumb', isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)');
      setTone(root, isLight);
    } catch (e) {
      console.error("Failed to apply adaptive theme:", e);
      applyTheme('onyx', customColor, op, saturation, brightness);
    }
  } else {
    // Unreachable: every non-dynamic mode resolved to a preset above. Kept as
    // a safety net so a corrupt settings.json still paints a usable surface.
    applyTheme('onyx', customColor, op, saturation, brightness);
  }
}

/** Light or dark tone — the two classes the stylesheets actually read. */
function setTone(root: HTMLElement, light: boolean) {
  root.classList.toggle('light-mode', light);
  root.classList.toggle('dark-mode', !light);
}

/**
 * Publish the material on `<html>`: a data attribute for the CSS layers (rim,
 * sheen) and the filter variable that every blurry surface reads.
 */
function applyMaterial(root: HTMLElement, material: Material, presetId: string) {
  root.dataset.material = material;
  root.dataset.preset = presetId;

  const filter = MATERIAL_FILTER[material];
  if (filter) root.style.setProperty('--islet-material-filter', filter);
  else root.style.removeProperty('--islet-material-filter');
}

export function initTheme() {
  const syncMode = localStorage.getItem('islet-theme-mode') || 'dark';
  const syncColor = localStorage.getItem('islet-theme-color') || '#007aff';
  const syncOpacityVal = localStorage.getItem('islet-theme-opacity');
  const syncOpacity = syncOpacityVal !== null ? parseFloat(syncOpacityVal) : 0.80;
  const syncSaturationVal = localStorage.getItem('islet-theme-saturation');
  const syncSaturation = syncSaturationVal !== null ? parseFloat(syncSaturationVal) : 0.50;
  const syncBrightnessVal = localStorage.getItem('islet-theme-brightness');
  const syncBrightness = syncBrightnessVal !== null ? parseFloat(syncBrightnessVal) : 0.15;

  // Fast synchronous draw using cached localStorage
  applyTheme(syncMode, syncColor, syncOpacity, syncSaturation, syncBrightness);

  // Sync settings.json in background to avoid flickers
  invoke<Record<string, any>>('load_settings').then((settings) => {
    const mode = settings['islet-theme-mode'] ? String(settings['islet-theme-mode']) : syncMode;
    const color = settings['islet-theme-color'] ? String(settings['islet-theme-color']) : syncColor;
    const opacityVal = settings['islet-theme-opacity'] ? parseFloat(String(settings['islet-theme-opacity'])) : syncOpacity;
    const saturationVal = settings['islet-theme-saturation'] ? parseFloat(String(settings['islet-theme-saturation'])) : syncSaturation;
    const brightnessVal = settings['islet-theme-brightness'] ? parseFloat(String(settings['islet-theme-brightness'])) : syncBrightness;

    if (
      mode !== syncMode ||
      color !== syncColor ||
      opacityVal !== syncOpacity ||
      saturationVal !== syncSaturation ||
      brightnessVal !== syncBrightness
    ) {
      localStorage.setItem('islet-theme-mode', mode);
      localStorage.setItem('islet-theme-color', color);
      localStorage.setItem('islet-theme-opacity', String(opacityVal));
      localStorage.setItem('islet-theme-saturation', String(saturationVal));
      localStorage.setItem('islet-theme-brightness', String(brightnessVal));
      applyTheme(mode, color, opacityVal, saturationVal, brightnessVal);
    }
  }).catch(console.error);

  // Helper: read all theme values from localStorage and apply
  const applyThemeFromStorage = () => {
    const mode = localStorage.getItem('islet-theme-mode') || 'dark';
    const color = localStorage.getItem('islet-theme-color') || '#007aff';
    const opacity = parseFloat(localStorage.getItem('islet-theme-opacity') || '0.80');
    const saturation = parseFloat(localStorage.getItem('islet-theme-saturation') || '0.50');
    const brightness = parseFloat(localStorage.getItem('islet-theme-brightness') || '0.15');
    applyTheme(mode, color, opacity, saturation, brightness);
  };

  const isletThemeKeys = ['islet-theme-mode', 'islet-theme-color', 'islet-theme-opacity', 'islet-theme-saturation', 'islet-theme-brightness'];

  // Listen to setting changes broadcasted from settings window
  // (localStorage sync is handled by saveAndLocal in Settings.tsx; we just apply the theme)
  const settingsPromise = listen<{ key: string; value: any }>('settings-changed', (event) => {
    const { key } = event.payload;
    if (isletThemeKeys.includes(key)) {
      applyThemeFromStorage();
    }
  });

  // Listen to system accent color updates in case of adaptive theme
  const accentPromise = listen<string>('system-accent-changed', (event) => {
    const currentMode = localStorage.getItem('islet-theme-mode') || 'dark';
    if (currentMode === 'adaptive') {
      const opacity = parseFloat(localStorage.getItem('islet-theme-opacity') || '0.80');
      const saturation = parseFloat(localStorage.getItem('islet-theme-saturation') || '0.50');
      const brightness = parseFloat(localStorage.getItem('islet-theme-brightness') || '0.15');
      applyTheme('adaptive', event.payload, opacity, saturation, brightness);
    }
  });

  // Listen to external edits (e.g. settings.json edited outside the app)
  // localStorage sync is handled by useSettingsSync hook; we just apply the theme
  const externalPromise = listen<{ key: string; value: any }>('settings-external-changed', (event) => {
    const { key } = event.payload;
    if (isletThemeKeys.includes(key)) {
      applyThemeFromStorage();
    }
  });

  return () => {
    settingsPromise.then(f => f());
    accentPromise.then(f => f());
    externalPromise.then(f => f());
  };
}
