import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { getVersion } from "@tauri-apps/api/app";
import type { UpdateCheckResult } from "../updater";
import { useSettingsSync } from "../hooks/useSettingsSync";
import { hexToHsl } from "../theme";
import type { WidgetConfig, MonitorInfo, MonitorMode } from "./types";

function saveSetting(key: string, value: string) {
  localStorage.setItem(key, value);
  invoke("save_setting", { key, value }).catch(console.error);
}

function readBool(val: string | null): boolean {
  return val === "true";
}

export function useSettings() {
  const [autostart, setAutostart] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [calendarEnabled, setCalendarEnabled] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerSoundEnabled, setTimerSoundEnabled] = useState(true);
  const [stopwatchEnabled, setStopwatchEnabled] = useState(true);
  const [musicModeEnabled, setMusicModeEnabled] = useState(true);
  const [musicCompactNotch, setMusicCompactNotch] = useState(true);
  const [volumeOverlayEnabled, setVolumeOverlayEnabled] = useState(true);
  const [volumeEdgeEnabled, setVolumeEdgeEnabled] = useState(
    () => localStorage.getItem("islet-volume-edge-enabled") !== "false"
  );
  const [brightnessOverlayEnabled, setBrightnessOverlayEnabled] = useState(
    () => localStorage.getItem("islet-brightness-overlay-enabled") !== "false"
  );
  const [brightnessEdgeEnabled, setBrightnessEdgeEnabled] = useState(
    () => localStorage.getItem("islet-brightness-edge-enabled") !== "false"
  );
  const [mediaAmbienceEnabled, setMediaAmbienceEnabled] = useState(true);
  const [mediaCompactGlowEnabled, setMediaCompactGlowEnabled] = useState(true);
  const [mediaLayout, setMediaLayout] = useState<"classic" | "compact">(
    () => (localStorage.getItem("islet-media-layout") as "classic" | "compact") || "classic"
  );
  const [cornersEnabled, setCornersEnabled] = useState(
    () => localStorage.getItem("islet-corners-enabled") === "true"
  );
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(
    () => localStorage.getItem("islet-show-update-indicator") !== "false"
  );
  const [timeFormat24h, setTimeFormat24h] = useState(
    () => localStorage.getItem("islet-time-format-24h") === "true"
  );
  const [tempUnitFahrenheit, setTempUnitFahrenheit] = useState(false);
  const [cityName, setCityName] = useState("");
  const [citySearchResults, setCitySearchResults] = useState<
    Array<{ name: string; country: string; latitude: number; longitude: number }>
  >([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [statusWidgets, setStatusWidgets] = useState<WidgetConfig>({
    left: ["weather"],
    right: ["battery"],
  });
  const [dockEnabled, setDockEnabled] = useState(true);
  const [dockPreviewEnabled, setDockPreviewEnabled] = useState(true);
  const [dockSearchEnabled, setDockSearchEnabled] = useState(true);
  const [dockCalendarEnabled, setDockCalendarEnabled] = useState(true);
  const [dockIconOnly, setDockIconOnly] = useState(
    () => localStorage.getItem("islet-dock-icon-only") === "true"
  );
  const [startIcon, setStartIcon] = useState(
    () => localStorage.getItem("islet-start-icon") || "default"
  );
  const [dockAdaptive, setDockAdaptive] = useState(
    () => localStorage.getItem("islet-dock-adaptive") === "true"
  );
  const [dockWinNumberEnabled, setDockWinNumberEnabled] = useState(
    () => localStorage.getItem("islet-dock-win-number-enabled") !== "false"
  );
  const [dockMixedReorder, setDockMixedReorder] = useState(
    () => localStorage.getItem("islet-dock-mixed-reorder") === "true"
  );
  const [dockMode, setDockMode] = useState(() => {
    const raw = localStorage.getItem("islet-dock-mode") || "smart";
    return raw === "auto-hide" ? "smart" : raw;
  });
  const [notchMode, setNotchMode] = useState("fixed");
  const [dockMonitorMode, setDockMonitorMode] = useState<MonitorMode>(
    () => (localStorage.getItem("islet-dock-monitor-mode") as MonitorMode) || "primary"
  );
  const [dockMonitorId, setDockMonitorId] = useState(
    () => localStorage.getItem("islet-dock-monitor-id") || ""
  );
  const [notchMonitorMode, setNotchMonitorMode] = useState<MonitorMode>(
    () => (localStorage.getItem("islet-notch-monitor-mode") as MonitorMode) || "primary"
  );
  const [notchMonitorId, setNotchMonitorId] = useState(
    () => localStorage.getItem("islet-notch-monitor-id") || ""
  );
  const [dockModeByMonitor, setDockModeByMonitor] = useState<Record<string, string>>({});
  const [notchModeByMonitor, setNotchModeByMonitor] = useState<Record<string, string>>({});
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [lowBatteryThreshold, setLowBatteryThreshold] = useState(20);
  const [hasBattery, setHasBattery] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "uptodate" | "error" | "downloading" | "installing"
  >("idle");
  const [updateVersion, setUpdateVersion] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [autoUpdate, setAutoUpdate] = useState(
    () => localStorage.getItem("islet-auto-update") === "true"
  );
  const [scale, setScale] = useState(
    () => parseFloat(localStorage.getItem("islet-scale") || "1.0")
  );
  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem("islet-theme-mode") || "dark"
  );
  const [themeColor, setThemeColor] = useState(
    () => localStorage.getItem("islet-theme-color") || "#007aff"
  );
  const [themeOpacity, setThemeOpacity] = useState(() => {
    const val = localStorage.getItem("islet-theme-opacity");
    return val !== null ? parseFloat(val) : 0.8;
  });
  const [themeSaturation, setThemeSaturation] = useState(() => {
    const val = localStorage.getItem("islet-theme-saturation");
    return val !== null ? parseFloat(val) : 0.5;
  });
  const [themeBrightness, setThemeBrightness] = useState(() => {
    const val = localStorage.getItem("islet-theme-brightness");
    return val !== null ? parseFloat(val) : 0.15;
  });
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success" | "error">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success" | "error">("idle");
  const [resetStatus, setResetStatus] = useState<"idle" | "confirm" | "resetting">("idle");
  const [uninstallStatus, setUninstallStatus] = useState<"idle" | "confirm" | "uninstalling" | "error">("idle");
  const [uninstallError, setUninstallError] = useState("");

  // ── Load all settings from backend + localStorage ──
  const loadAllSettings = useCallback(async () => {
    try {
      const settings: Record<string, string> = await invoke("load_settings");
      const getVal = (key: string) => {
        const val = settings[key];
        if (val !== undefined && val !== null) return String(val);
        return localStorage.getItem(key);
      };

      const apply = <T>(val: string | null, setter: (v: T) => void, transform: (v: string) => T) => {
        if (val !== null) setter(transform(val));
      };

      apply(getVal("islet-weather-enabled"), setWeatherEnabled, readBool);
      apply(getVal("islet-calendar-enabled"), setCalendarEnabled, readBool);
      apply(getVal("islet-timer-enabled") ?? getVal("islet-calendar-enabled"), setTimerEnabled, readBool);
      apply(getVal("islet-timer-sound-enabled"), setTimerSoundEnabled, readBool);
      apply(getVal("islet-stopwatch-enabled") ?? getVal("islet-calendar-enabled"), setStopwatchEnabled, readBool);
      apply(getVal("islet-music-mode-enabled"), setMusicModeEnabled, readBool);
      apply(getVal("islet-music-compact-notch"), setMusicCompactNotch, readBool);
      apply(getVal("islet-volume-overlay-enabled"), setVolumeOverlayEnabled, readBool);
      apply(getVal("islet-brightness-overlay-enabled"), setBrightnessOverlayEnabled, readBool);
      apply(getVal("islet-media-ambience-enabled"), setMediaAmbienceEnabled, readBool);
      apply(getVal("islet-media-compact-glow-enabled"), setMediaCompactGlowEnabled, readBool);
      apply(getVal("islet-corners-enabled"), setCornersEnabled, readBool);
      apply(getVal("islet-time-format-24h"), setTimeFormat24h, readBool);
      apply(getVal("islet-show-update-indicator"), setShowUpdateIndicator, readBool);
      apply(getVal("islet-auto-update"), setAutoUpdate, readBool);
      apply(getVal("islet-volume-edge-enabled"), setVolumeEdgeEnabled, readBool);
      apply(getVal("islet-brightness-edge-enabled"), setBrightnessEdgeEnabled, readBool);
      apply(getVal("islet-dock-enabled"), setDockEnabled, readBool);
      apply(getVal("islet-dock-preview-enabled"), setDockPreviewEnabled, readBool);
      apply(getVal("islet-dock-search-enabled"), setDockSearchEnabled, readBool);
      apply(getVal("islet-dock-calendar-enabled"), setDockCalendarEnabled, readBool);
      apply(getVal("islet-dock-icon-only"), setDockIconOnly, readBool);
      apply(getVal("islet-start-icon"), setStartIcon, (v) => v);
      apply(getVal("islet-dock-adaptive"), setDockAdaptive, readBool);
      apply(getVal("islet-dock-win-number-enabled"), setDockWinNumberEnabled, readBool);
      apply(getVal("islet-dock-mixed-reorder"), setDockMixedReorder, readBool);

      apply(getVal("islet-temp-unit"), setTempUnitFahrenheit, (v) => v === "fahrenheit");
      apply(getVal("islet-scale"), setScale, parseFloat);
      apply(getVal("islet-low-battery-threshold"), setLowBatteryThreshold, parseInt);

      apply(getVal("islet-notch-mode"), setNotchMode, (v) => (v === "auto-hide" ? "smart" : v));
      apply(getVal("islet-dock-mode"), setDockMode, (v) => (v === "auto-hide" ? "smart" : v));

      apply(getVal("islet-dock-monitor-mode"), setDockMonitorMode, (v) => v as MonitorMode);
      apply(getVal("islet-dock-monitor-id"), setDockMonitorId, (v) => v);
      apply(getVal("islet-notch-monitor-mode"), setNotchMonitorMode, (v) => v as MonitorMode);
      apply(getVal("islet-notch-monitor-id"), setNotchMonitorId, (v) => v);

      const dockByMonVal = getVal("islet-dock-mode-by-monitor");
      if (dockByMonVal) {
        try { setDockModeByMonitor(JSON.parse(dockByMonVal)); } catch {}
      }
      const notchByMonVal = getVal("islet-notch-mode-by-monitor");
      if (notchByMonVal) {
        try { setNotchModeByMonitor(JSON.parse(notchByMonVal)); } catch {}
      }

      const savedCity = getVal("islet-weather-city");
      if (savedCity) setCityName(savedCity);

      apply(getVal("islet-theme-mode"), setThemeMode, (v) => v);
      apply(getVal("islet-theme-color"), setThemeColor, (v) => v);
      apply(getVal("islet-theme-opacity"), setThemeOpacity, parseFloat);
      apply(getVal("islet-theme-saturation"), setThemeSaturation, parseFloat);
      apply(getVal("islet-theme-brightness"), setThemeBrightness, parseFloat);

      const widgetsVal = getVal("islet-status-widgets");
      if (widgetsVal) {
        try {
          const parsed = JSON.parse(widgetsVal);
          if (parsed && Array.isArray(parsed.left) && Array.isArray(parsed.right)) {
            setStatusWidgets(parsed);
          }
        } catch {}
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }, []);

  // ── Initialize on mount ──
  useEffect(() => {
    loadAllSettings();

    isEnabled()
      .then(setAutostart)
      .catch(() => {});

    getVersion()
      .then((ver) => setAppVersion(ver))
      .catch(() => setAppVersion(""));

    invoke<boolean>("has_battery").then(setHasBattery).catch(() => {});

    checkForUpdates(false);
  }, []);

  useEffect(() => {
    const refreshMonitors = () => {
      invoke<MonitorInfo[]>("get_monitors").then(setMonitors).catch(() => {});
    };
    refreshMonitors();
    const unlisten = listen("monitors-changed", refreshMonitors);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // ── Sync settings from other windows ──
  useSettingsSync({
    "islet-dock-mode": setDockMode,
    "islet-notch-mode": setNotchMode,
    "islet-dock-monitor-mode": (v) => setDockMonitorMode(v as MonitorMode),
    "islet-dock-monitor-id": setDockMonitorId,
    "islet-notch-monitor-mode": (v) => setNotchMonitorMode(v as MonitorMode),
    "islet-notch-monitor-id": setNotchMonitorId,
    "islet-dock-mode-by-monitor": (v) => { try { setDockModeByMonitor(JSON.parse(v)); } catch {} },
    "islet-notch-mode-by-monitor": (v) => { try { setNotchModeByMonitor(JSON.parse(v)); } catch {} },
    "islet-dock-enabled": setDockEnabled,
    "islet-dock-icon-only": setDockIconOnly,
    "islet-start-icon": setStartIcon,
    "islet-dock-adaptive": setDockAdaptive,
    "islet-dock-win-number-enabled": setDockWinNumberEnabled,
    "islet-dock-preview-enabled": setDockPreviewEnabled,
    "islet-dock-search-enabled": setDockSearchEnabled,
    "islet-dock-calendar-enabled": setDockCalendarEnabled,
    "islet-dock-mixed-reorder": setDockMixedReorder,
    "islet-weather-enabled": setWeatherEnabled,
    "islet-calendar-enabled": setCalendarEnabled,
    "islet-timer-enabled": setTimerEnabled,
    "islet-timer-sound-enabled": setTimerSoundEnabled,
    "islet-stopwatch-enabled": setStopwatchEnabled,
    "islet-music-mode-enabled": setMusicModeEnabled,
    "islet-music-compact-notch": setMusicCompactNotch,
    "islet-media-ambience-enabled": setMediaAmbienceEnabled,
    "islet-media-compact-glow-enabled": setMediaCompactGlowEnabled,
    "islet-media-layout": setMediaLayout,
    "islet-corners-enabled": setCornersEnabled,
    "islet-show-update-indicator": setShowUpdateIndicator,
    "islet-time-format-24h": setTimeFormat24h,
    "islet-low-battery-threshold": setLowBatteryThreshold,
    "islet-scale": setScale,
    "islet-temp-unit": (v) => setTempUnitFahrenheit(v === "fahrenheit"),
    "islet-auto-update": setAutoUpdate,
    "islet-volume-overlay-enabled": setVolumeOverlayEnabled,
    "islet-volume-edge-enabled": setVolumeEdgeEnabled,
    "islet-brightness-overlay-enabled": setBrightnessOverlayEnabled,
    "islet-brightness-edge-enabled": setBrightnessEdgeEnabled,
    "islet-theme-mode": setThemeMode,
    "islet-theme-color": setThemeColor,
    "islet-theme-opacity": setThemeOpacity,
    "islet-theme-saturation": setThemeSaturation,
    "islet-theme-brightness": setThemeBrightness,
    "islet-weather-city": (v) => setCityName(v || ""),
  });

  // ── Listen for system accent changes (adaptive theme) ──
  useEffect(() => {
    const unlisten = listen<string>("system-accent-changed", (event) => {
      const mode = localStorage.getItem("islet-theme-mode") || "dark";
      if (mode === "adaptive") {
        try {
          const hsl = hexToHsl(event.payload);
          setThemeSaturation(hsl.s / 100);
          setThemeBrightness(hsl.l / 100);
        } catch (e) {
          console.error("Failed to parse system accent color change HSL:", e);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // ── City search debounce ──
  useEffect(() => {
    if (cityName.trim().length < 2) {
      setCitySearchResults([]);
      setShowCityDropdown(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`
        );
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setCitySearchResults(
            data.results.map((r: any) => ({
              name: r.name,
              country: r.country || "",
              latitude: r.latitude,
              longitude: r.longitude,
            }))
          );
          setShowCityDropdown(true);
        } else {
          setCitySearchResults([]);
        }
      } catch {
        setCitySearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [cityName]);

  // ── Update checker ──
  const checkForUpdates = async (manual = true) => {
    setUpdateStatus("checking");
    try {
      const result = await invoke<UpdateCheckResult>("check_for_updates", { force: manual });
      if (result.available) {
        setUpdateStatus("available");
        setUpdateVersion(result.version ?? "");
      } else {
        setUpdateStatus("uptodate");
      }
    } catch (e) {
      console.error("Updater error:", e);
      setUpdateStatus("error");
    }
  };

  const installUpdate = async () => {
    try {
      setUpdateStatus("downloading");
      await invoke("install_update");
      setUpdateStatus("idle");
    } catch (e) {
      console.error(e);
      setUpdateStatus("error");
    }
  };

  // Reflect install progress triggered from any window (including auto-update).
  useEffect(() => {
    const unlisten = listen<{ status: string; progress?: number }>("auto-update-status", (event) => {
      switch (event.payload.status) {
        case "downloading":
          setUpdateStatus("downloading");
          break;
        case "installing":
          setUpdateStatus("installing");
          break;
        case "done":
          setUpdateStatus((prev) => (prev === "downloading" || prev === "installing" ? "idle" : prev));
          break;
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // ── Autostart ──
  const toggleAutostart = async () => {
    try {
      const currentlyEnabled = await isEnabled();
      if (currentlyEnabled) {
        await disable();
        setAutostart(false);
      } else {
        await enable();
        setAutostart(true);
      }
    } catch (err) {}
  };

  // ── Simple boolean toggles ──
  const toggleWeather = () => {
    const next = !weatherEnabled;
    setWeatherEnabled(next);
    saveSetting("islet-weather-enabled", String(next));
  };

  const toggleCalendar = () => {
    const next = !calendarEnabled;
    setCalendarEnabled(next);
    saveSetting("islet-calendar-enabled", String(next));
  };

  const toggleTimerEnabled = () => {
    const next = !timerEnabled;
    setTimerEnabled(next);
    saveSetting("islet-timer-enabled", String(next));
  };

  const toggleTimerSound = () => {
    const next = !timerSoundEnabled;
    setTimerSoundEnabled(next);
    saveSetting("islet-timer-sound-enabled", String(next));
  };

  const toggleStopwatchEnabled = () => {
    const next = !stopwatchEnabled;
    setStopwatchEnabled(next);
    saveSetting("islet-stopwatch-enabled", String(next));
  };

  const toggleMusicMode = () => {
    const next = !musicModeEnabled;
    setMusicModeEnabled(next);
    saveSetting("islet-music-mode-enabled", String(next));
  };

  const toggleMusicCompactNotch = () => {
    const next = !musicCompactNotch;
    setMusicCompactNotch(next);
    saveSetting("islet-music-compact-notch", String(next));
  };

  const toggleMediaLayout = (layout: "classic" | "compact") => {
    setMediaLayout(layout);
    saveSetting("islet-media-layout", layout);
  };

  const toggleVolumeOverlay = () => {
    const next = !volumeOverlayEnabled;
    setVolumeOverlayEnabled(next);
    saveSetting("islet-volume-overlay-enabled", String(next));
  };

  const toggleVolumeEdge = () => {
    const next = !volumeEdgeEnabled;
    setVolumeEdgeEnabled(next);
    saveSetting("islet-volume-edge-enabled", String(next));
  };

  const toggleBrightnessOverlay = () => {
    const next = !brightnessOverlayEnabled;
    setBrightnessOverlayEnabled(next);
    saveSetting("islet-brightness-overlay-enabled", String(next));
  };

  const toggleBrightnessEdge = () => {
    const next = !brightnessEdgeEnabled;
    setBrightnessEdgeEnabled(next);
    saveSetting("islet-brightness-edge-enabled", String(next));
  };

  const toggleAmbience = () => {
    const next = !mediaAmbienceEnabled;
    setMediaAmbienceEnabled(next);
    saveSetting("islet-media-ambience-enabled", String(next));
  };

  const toggleCompactGlow = () => {
    const next = !mediaCompactGlowEnabled;
    setMediaCompactGlowEnabled(next);
    saveSetting("islet-media-compact-glow-enabled", String(next));
  };

  const toggleCorners = () => {
    const next = !cornersEnabled;
    setCornersEnabled(next);
    saveSetting("islet-corners-enabled", String(next));
  };

  const toggleUpdateIndicator = () => {
    const next = !showUpdateIndicator;
    setShowUpdateIndicator(next);
    saveSetting("islet-show-update-indicator", String(next));
  };

  const toggleTimeFormat24h = () => {
    const next = !timeFormat24h;
    setTimeFormat24h(next);
    saveSetting("islet-time-format-24h", String(next));
  };

  const toggleTempUnit = () => {
    const next = !tempUnitFahrenheit;
    setTempUnitFahrenheit(next);
    saveSetting("islet-temp-unit", next ? "fahrenheit" : "celsius");
  };

  const toggleDock = () => {
    const next = !dockEnabled;
    setDockEnabled(next);
    saveSetting("islet-dock-enabled", String(next));
  };

  const toggleDockPreview = () => {
    const next = !dockPreviewEnabled;
    setDockPreviewEnabled(next);
    saveSetting("islet-dock-preview-enabled", String(next));
  };

  const toggleDockSearch = () => {
    const next = !dockSearchEnabled;
    setDockSearchEnabled(next);
    saveSetting("islet-dock-search-enabled", String(next));
  };

  const toggleDockCalendar = () => {
    const next = !dockCalendarEnabled;
    setDockCalendarEnabled(next);
    saveSetting("islet-dock-calendar-enabled", String(next));
  };

  const toggleDockMixedReorder = () => {
    const next = !dockMixedReorder;
    setDockMixedReorder(next);
    saveSetting("islet-dock-mixed-reorder", String(next));
  };

  const toggleDockIconOnly = () => {
    const next = !dockIconOnly;
    setDockIconOnly(next);
    saveSetting("islet-dock-icon-only", String(next));
  };

  const handleStartIconChange = (icon: string) => {
    setStartIcon(icon);
    saveSetting("islet-start-icon", icon);
  };

  const toggleDockAdaptive = () => {
    const next = !dockAdaptive;
    setDockAdaptive(next);
    saveSetting("islet-dock-adaptive", String(next));
  };

  const toggleDockWinNumber = () => {
    const next = !dockWinNumberEnabled;
    setDockWinNumberEnabled(next);
    saveSetting("islet-dock-win-number-enabled", String(next));
  };

  const toggleAutoUpdate = () => {
    const next = !autoUpdate;
    setAutoUpdate(next);
    saveSetting("islet-auto-update", String(next));
  };

  // ── Value setters ──
  const setDockModeValue = (newMode: string) => {
    setDockMode(newMode);
    saveSetting("islet-dock-mode", newMode);
  };

  const setNotchModeValue = (newMode: string) => {
    setNotchMode(newMode);
    saveSetting("islet-notch-mode", newMode);
  };

  const setDockMonitorModeValue = (mode: MonitorMode) => {
    setDockMonitorMode(mode);
    saveSetting("islet-dock-monitor-mode", mode);
  };

  const setDockMonitorIdValue = (id: string) => {
    setDockMonitorId(id);
    saveSetting("islet-dock-monitor-id", id);
  };

  const setNotchMonitorModeValue = (mode: MonitorMode) => {
    setNotchMonitorMode(mode);
    saveSetting("islet-notch-monitor-mode", mode);
  };

  const setNotchMonitorIdValue = (id: string) => {
    setNotchMonitorId(id);
    saveSetting("islet-notch-monitor-id", id);
  };

  const setDockModeForMonitor = (monitorId: string, mode: string | null) => {
    setDockModeByMonitor((prev) => {
      const next = { ...prev };
      if (mode === null) delete next[monitorId]; else next[monitorId] = mode;
      saveSetting("islet-dock-mode-by-monitor", JSON.stringify(next));
      return next;
    });
  };

  const replaceDockModesByMonitor = (next: Record<string, string>) => {
    setDockModeByMonitor(next);
    saveSetting("islet-dock-mode-by-monitor", JSON.stringify(next));
  };

  const replaceNotchModesByMonitor = (next: Record<string, string>) => {
    setNotchModeByMonitor(next);
    saveSetting("islet-notch-mode-by-monitor", JSON.stringify(next));
  };

  const setNotchModeForMonitor = (monitorId: string, mode: string | null) => {
    setNotchModeByMonitor((prev) => {
      const next = { ...prev };
      if (mode === null) delete next[monitorId]; else next[monitorId] = mode;
      saveSetting("islet-notch-mode-by-monitor", JSON.stringify(next));
      return next;
    });
  };

  const handleThresholdChange = (val: number) => {
    setLowBatteryThreshold(val);
    saveSetting("islet-low-battery-threshold", val.toString());
  };

  const handleScaleChange = (val: number) => {
    setScale(val);
    saveSetting("islet-scale", val.toString());
  };

  const handleWidgetsChange = (config: WidgetConfig) => {
    setStatusWidgets(config);
    saveSetting("islet-status-widgets", JSON.stringify(config));
  };

  // ── Theme handlers ──
  const handleThemeModeChange = async (mode: string) => {
    setThemeMode(mode);
    saveSetting("islet-theme-mode", mode);

    if (mode === "adaptive") {
      try {
        const accentHex = await invoke<string>("get_system_accent_color");
        const hsl = hexToHsl(accentHex);
        setThemeSaturation(hsl.s / 100);
        saveSetting("islet-theme-saturation", String(hsl.s / 100));
        setThemeBrightness(hsl.l / 100);
        saveSetting("islet-theme-brightness", String(hsl.l / 100));
      } catch (e) {
        console.error("Failed to parse adaptive accent HSL:", e);
      }
    }
  };

  const handleThemeColorChange = (color: string) => {
    setThemeColor(color);
    saveSetting("islet-theme-color", color);

    try {
      const hsl = hexToHsl(color);
      setThemeSaturation(hsl.s / 100);
      saveSetting("islet-theme-saturation", String(hsl.s / 100));
      setThemeBrightness(hsl.l / 100);
      saveSetting("islet-theme-brightness", String(hsl.l / 100));
    } catch (e) {
      console.error("Failed to parse custom color HSL:", e);
    }
  };

  const handleOpacityChange = (value: number) => {
    setThemeOpacity(value);
    saveSetting("islet-theme-opacity", String(value));
  };

  const handleSaturationChange = (value: number) => {
    setThemeSaturation(value);
    saveSetting("islet-theme-saturation", String(value));
  };

  const handleBrightnessChange = (value: number) => {
    setThemeBrightness(value);
    saveSetting("islet-theme-brightness", String(value));
  };

  // ── City search ──
  const selectCity = async (city: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => {
    setCityName(city.name);
    setShowCityDropdown(false);
    setCitySearchResults([]);
    localStorage.setItem("islet-weather-city", city.name);
    localStorage.setItem("islet-weather-lat", city.latitude.toString());
    localStorage.setItem("islet-weather-lon", city.longitude.toString());
    await invoke("save_setting", { key: "islet-weather-lat", value: city.latitude.toString() }).catch(() => {});
    await invoke("save_setting", { key: "islet-weather-lon", value: city.longitude.toString() }).catch(() => {});
    await invoke("save_setting", { key: "islet-weather-city", value: city.name }).catch(() => {});
    emit("weather-refresh", { lat: city.latitude, lon: city.longitude });
  };

  const handleCityClear = async () => {
    setCityName("");
    setShowCityDropdown(false);
    setCitySearchResults([]);
    localStorage.removeItem("islet-weather-city");
    localStorage.removeItem("islet-weather-lat");
    localStorage.removeItem("islet-weather-lon");
    await invoke("save_setting", { key: "islet-weather-lat", value: null }).catch(() => {});
    await invoke("save_setting", { key: "islet-weather-lon", value: null }).catch(() => {});
    await invoke("save_setting", { key: "islet-weather-city", value: null }).catch(() => {});
    emit("weather-refresh", true);
  };

  // ── Export / Import ──
  const handleExportSettings = async () => {
    setExportStatus("exporting");
    try {
      const { save: saveDialog } = await import("@tauri-apps/plugin-dialog");
      const settingsJson = await invoke<string>("export_settings");
      const filePath = await saveDialog({
        title: "Export Islet Settings",
        defaultPath: "islet-settings.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (filePath) {
        await invoke("write_settings_to_path", { path: filePath, content: settingsJson });
        setExportStatus("success");
        setTimeout(() => setExportStatus("idle"), 2000);
      } else {
        setExportStatus("idle");
      }
    } catch (e) {
      console.error("Export failed:", e);
      setExportStatus("error");
      setTimeout(() => setExportStatus("idle"), 3000);
    }
  };

  const handleImportSettings = async () => {
    setImportStatus("importing");
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const filePath = await openDialog({
        title: "Import Islet Settings",
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (filePath) {
        const content = await invoke<string>("read_settings_from_path", { path: filePath as string });
        await invoke("import_settings", { settings: content });
        await loadAllSettings();
        setImportStatus("success");
        setTimeout(() => setImportStatus("idle"), 2000);
      } else {
        setImportStatus("idle");
      }
    } catch (e) {
      console.error("Import failed:", e);
      setImportStatus("error");
      setTimeout(() => setImportStatus("idle"), 3000);
    }
  };

  const handleResetSettings = async () => {
    if (resetStatus === "idle") {
      setResetStatus("confirm");
      setTimeout(() => setResetStatus((s) => (s === "confirm" ? "idle" : s)), 4000);
      return;
    }
    if (resetStatus !== "confirm") return;

    setResetStatus("resetting");
    try {
      await invoke("reset_settings");
      localStorage.clear();
      await invoke("restart_islet");
    } catch (e) {
      console.error("Reset failed:", e);
      setResetStatus("idle");
    }
  };

  const handleUninstallIslet = async () => {
    if (uninstallStatus === "idle" || uninstallStatus === "error") {
      setUninstallStatus("confirm");
      setTimeout(() => setUninstallStatus((s) => (s === "confirm" ? "idle" : s)), 4000);
      return;
    }
    if (uninstallStatus !== "confirm") return;

    setUninstallStatus("uninstalling");
    try {
      await invoke("uninstall_islet");
    } catch (e) {
      console.error("Uninstall failed:", e);
      setUninstallError(typeof e === "string" ? e : String((e as Error)?.message ?? e));
      setUninstallStatus("error");
      setTimeout(() => setUninstallStatus((s) => (s === "error" ? "idle" : s)), 12000);
    }
  };

  return {
    // System
    autostart,
    toggleAutostart,
    autoUpdate,
    toggleAutoUpdate,
    lowBatteryThreshold,
    handleThresholdChange,
    timeFormat24h,
    toggleTimeFormat24h,
    showUpdateIndicator,
    toggleUpdateIndicator,
    scale,
    handleScaleChange,
    cornersEnabled,
    toggleCorners,

    // Theme
    themeMode,
    handleThemeModeChange,
    themeColor,
    handleThemeColorChange,
    themeOpacity,
    handleOpacityChange,
    themeSaturation,
    handleSaturationChange,
    themeBrightness,
    handleBrightnessChange,

    // Notch
    notchMode,
    setNotchModeValue,
    calendarEnabled,
    toggleCalendar,
    timerEnabled,
    toggleTimerEnabled,
    timerSoundEnabled,
    toggleTimerSound,
    stopwatchEnabled,
    toggleStopwatchEnabled,
    musicModeEnabled,
    toggleMusicMode,
    musicCompactNotch,
    toggleMusicCompactNotch,
    mediaLayout,
    toggleMediaLayout,
    mediaAmbienceEnabled,
    toggleAmbience,
    mediaCompactGlowEnabled,
    toggleCompactGlow,

    // Weather
    weatherEnabled,
    toggleWeather,
    tempUnitFahrenheit,
    toggleTempUnit,
    cityName,
    setCityName,
    citySearchResults,
    showCityDropdown,
    setShowCityDropdown,
    selectCity,
    handleCityClear,

    // Widgets
    statusWidgets,
    handleWidgetsChange,
    hasBattery,

    // Dock
    dockEnabled,
    toggleDock,
    dockMode,
    setDockModeValue,
    dockPreviewEnabled,
    toggleDockPreview,
    dockSearchEnabled,
    toggleDockSearch,
    dockCalendarEnabled,
    toggleDockCalendar,
    dockIconOnly,
    toggleDockIconOnly,
    startIcon,
    handleStartIconChange,
    dockAdaptive,
    toggleDockAdaptive,
    dockWinNumberEnabled,
    toggleDockWinNumber,
    dockMixedReorder,
    toggleDockMixedReorder,

    monitors,
    dockMonitorMode,
    setDockMonitorModeValue,
    dockMonitorId,
    setDockMonitorIdValue,
    notchMonitorMode,
    setNotchMonitorModeValue,
    notchMonitorId,
    setNotchMonitorIdValue,
    dockModeByMonitor,
    setDockModeForMonitor,
    replaceDockModesByMonitor,
    notchModeByMonitor,
    setNotchModeForMonitor,
    replaceNotchModesByMonitor,

    // Overlays
    volumeOverlayEnabled,
    toggleVolumeOverlay,
    volumeEdgeEnabled,
    toggleVolumeEdge,
    brightnessOverlayEnabled,
    toggleBrightnessOverlay,
    brightnessEdgeEnabled,
    toggleBrightnessEdge,

    // Updates
    updateStatus,
    updateVersion,
    appVersion,
    checkForUpdates,
    installUpdate,

    exportStatus,
    importStatus,
    handleExportSettings,
    handleImportSettings,
    resetStatus,
    handleResetSettings,
    uninstallStatus,
    uninstallError,
    handleUninstallIslet,

    // Utilities
    restartIslet: () => invoke("restart_islet"),
    quitIslet: () => invoke("quit_islet"),
  };
}
