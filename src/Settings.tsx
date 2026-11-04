import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Effect, EffectState } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Settings, Palette, PanelTop, Monitor, Layers, Info, Sparkles } from "lucide-react";
import { Onboarding } from "./settings/Onboarding";
import { WindowControls } from "./components/WindowControls";
import {
  useSettings,
  GeneralTab,
  AssistantTab,
  AppearanceTab,
  NotchTab,
  CalendarSyncPage,
  DockTab,
  OverlaysTab,
  AboutTab,
} from "./settings/index";
import type { SettingsTab } from "./settings/index";
import { initTheme } from "./theme";
import "./Settings.css";

const appWindow = getCurrentWebviewWindow();

const TABS: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "assistant", label: "Is", icon: Sparkles },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notch", label: "Notch", icon: PanelTop },
  { id: "dock", label: "Dock", icon: Monitor },
  { id: "overlays", label: "Overlays", icon: Layers },
  { id: "about", label: "About", icon: Info },
];

/**
 * Size of the first-run flow. Noticeably larger than the regular Settings
 * window: five screens in a 620x480 box would scroll constantly.
 */
const ONBOARDING_SIZE = { width: 720, height: 620 };

function SettingsApp() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  // The first sidebar entry is the assistant's tab; once the user renames it in
  // the welcome flow, the tab should say that name rather than a stale "Is".
  const [assistantName, setAssistantName] = useState(
    () => localStorage.getItem("islet-assistant-name") || "Is",
  );
  // `null` until we know: showing the Settings UI for a frame and then
  // swapping to the welcome flow is exactly the flicker we want to avoid.
  const [onboarding, setOnboarding] = useState<boolean | null>(null);
  const settings = useSettings();

  useEffect(() => {
    return initTheme();
  }, []);

  // First run? The flag lives in settings.json, not localStorage: the two
  // webviews do not reliably share storage, and this decision must be made
  // once, authoritatively, on the main window's behalf.
  useEffect(() => {
    let cancelled = false;
    invoke<Record<string, unknown>>("load_settings")
      .then((stored) => {
        if (cancelled) return;
        const done = String(stored["islet-onboarded"] ?? "") === "true";
        setOnboarding(!done);
        if (!done) {
          // Let the notch and the dock settle first: the window appearing on
          // top of a half-drawn desktop feels like a crash, not a welcome.
          setTimeout(() => {
            if (!cancelled) invoke("open_settings_window").catch(console.error);
          }, 1200);
        }
      })
      .catch(() => {
        if (!cancelled) setOnboarding(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The welcome flow has its own window size; restore the regular one on exit.
  useEffect(() => {
    if (onboarding === null) return;
    const size = onboarding
      ? ONBOARDING_SIZE
      : { width: 620 * settings.scale, height: 480 * settings.scale };
    invoke("resize_settings_window", size).catch(console.error);
  }, [onboarding, settings.scale]);

  useEffect(() => {
    const unlisten = listen<string>("settings-navigate", (e) => {
      if (e.payload === "calendar-sync") setActiveTab("calendar-sync");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<{ key: string; value: unknown }>("settings-changed", (e) => {
      if (e.payload.key === "islet-assistant-name") {
        setAssistantName(String(e.payload.value ?? "Is") || "Is");
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const preventContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", preventContext as any);

    appWindow.setEffects({ effects: [Effect.Acrylic], state: EffectState.Active, color: [10, 10, 15, 20] }).catch(() => {});

    return () => {
      document.removeEventListener("contextmenu", preventContext as any);
    };
  }, []);

  // Undecided: render the window chrome only, so nothing flashes.
  if (onboarding === null) {
    return (
      <div className="settings-container" style={{ zoom: settings.scale }}>
        <div className="title-bar" data-tauri-drag-region>
          <span className="title-text" data-tauri-drag-region>
            Settings
          </span>
          <WindowControls />
        </div>
      </div>
    );
  }

  if (onboarding) {
    return (
      <div className="settings-container" style={{ zoom: settings.scale }}>
        <div className="title-bar" data-tauri-drag-region>
          <span className="title-text" data-tauri-drag-region>
            Welcome to Islet
          </span>
          <WindowControls />
        </div>
        <Onboarding onFinish={() => setOnboarding(false)} />
      </div>
    );
  }

  return (
    <div className="settings-container" style={{ zoom: settings.scale }}>
      <div className="title-bar" data-tauri-drag-region>
        <span className="title-text" data-tauri-drag-region>
          Settings
        </span>
        <WindowControls />
      </div>

      <div className="settings-body">
        <div className="settings-sidebar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-tab ${activeTab === id || (id === "notch" && activeTab === "calendar-sync") ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <div className="sidebar-tab-icon">
                <Icon size={14} strokeWidth={1.5} />
              </div>
              <span>{id === "assistant" ? assistantName : label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === "general" && (
            <GeneralTab
              autostart={settings.autostart}
              toggleAutostart={settings.toggleAutostart}
              timeFormat24h={settings.timeFormat24h}
              toggleTimeFormat24h={settings.toggleTimeFormat24h}
              showUpdateIndicator={settings.showUpdateIndicator}
              toggleUpdateIndicator={settings.toggleUpdateIndicator}
              lowBatteryThreshold={settings.lowBatteryThreshold}
              handleThresholdChange={settings.handleThresholdChange}
              restartIslet={settings.restartIslet}
              quitIslet={settings.quitIslet}
              replayOnboarding={() => setOnboarding(true)}
            />
          )}
          {activeTab === "assistant" && <AssistantTab />}

          {activeTab === "appearance" && (
            <AppearanceTab
              themeMode={settings.themeMode}
              handleThemeModeChange={settings.handleThemeModeChange}
              themeColor={settings.themeColor}
              handleThemeColorChange={settings.handleThemeColorChange}
              themeOpacity={settings.themeOpacity}
              handleOpacityChange={settings.handleOpacityChange}
              themeSaturation={settings.themeSaturation}
              handleSaturationChange={settings.handleSaturationChange}
              themeBrightness={settings.themeBrightness}
              handleBrightnessChange={settings.handleBrightnessChange}
              cornersEnabled={settings.cornersEnabled}
              toggleCorners={settings.toggleCorners}
              scale={settings.scale}
              handleScaleChange={settings.handleScaleChange}
            />
          )}
          {activeTab === "calendar-sync" && <CalendarSyncPage onBack={() => setActiveTab("notch")} />}
          {activeTab === "notch" && (
            <NotchTab
              onOpenCalendarSync={() => setActiveTab("calendar-sync")}
              notchMode={settings.notchMode}
              setNotchModeValue={settings.setNotchModeValue}
              monitors={settings.monitors}
              notchMonitorMode={settings.notchMonitorMode}
              setNotchMonitorModeValue={settings.setNotchMonitorModeValue}
              notchMonitorId={settings.notchMonitorId}
              setNotchMonitorIdValue={settings.setNotchMonitorIdValue}
              notchModeByMonitor={settings.notchModeByMonitor}
              setNotchModeForMonitor={settings.setNotchModeForMonitor}
              replaceNotchModes={settings.replaceNotchModesByMonitor}
              calendarEnabled={settings.calendarEnabled}
              toggleCalendar={settings.toggleCalendar}
              timerEnabled={settings.timerEnabled}
              toggleTimerEnabled={settings.toggleTimerEnabled}
              timerSoundEnabled={settings.timerSoundEnabled}
              toggleTimerSound={settings.toggleTimerSound}
              stopwatchEnabled={settings.stopwatchEnabled}
              toggleStopwatchEnabled={settings.toggleStopwatchEnabled}
              musicModeEnabled={settings.musicModeEnabled}
              toggleMusicMode={settings.toggleMusicMode}
              musicCompactNotch={settings.musicCompactNotch}
              toggleMusicCompactNotch={settings.toggleMusicCompactNotch}
              mediaLayout={settings.mediaLayout}
              toggleMediaLayout={settings.toggleMediaLayout}
              mediaAmbienceEnabled={settings.mediaAmbienceEnabled}
              toggleAmbience={settings.toggleAmbience}
              mediaCompactGlowEnabled={settings.mediaCompactGlowEnabled}
              toggleCompactGlow={settings.toggleCompactGlow}
              weatherEnabled={settings.weatherEnabled}
              toggleWeather={settings.toggleWeather}
              tempUnitFahrenheit={settings.tempUnitFahrenheit}
              toggleTempUnit={settings.toggleTempUnit}
              cityName={settings.cityName}
              setCityName={settings.setCityName}
              citySearchResults={settings.citySearchResults}
              showCityDropdown={settings.showCityDropdown}
              setShowCityDropdown={settings.setShowCityDropdown}
              selectCity={settings.selectCity}
              handleCityClear={settings.handleCityClear}
              statusWidgets={settings.statusWidgets}
              handleWidgetsChange={settings.handleWidgetsChange}
              hasBattery={settings.hasBattery}
            />
          )}
          {activeTab === "dock" && (
            <DockTab
              dockEnabled={settings.dockEnabled}
              toggleDock={settings.toggleDock}
              dockMode={settings.dockMode}
              setDockModeValue={settings.setDockModeValue}
              dockPreviewEnabled={settings.dockPreviewEnabled}
              toggleDockPreview={settings.toggleDockPreview}
              dockSearchEnabled={settings.dockSearchEnabled}
              toggleDockSearch={settings.toggleDockSearch}
              dockCalendarEnabled={settings.dockCalendarEnabled}
              toggleDockCalendar={settings.toggleDockCalendar}
              dockIconOnly={settings.dockIconOnly}
              toggleDockIconOnly={settings.toggleDockIconOnly}
              dockAdaptive={settings.dockAdaptive}
              toggleDockAdaptive={settings.toggleDockAdaptive}
              startIcon={settings.startIcon}
              handleStartIconChange={settings.handleStartIconChange}
              dockWinNumberEnabled={settings.dockWinNumberEnabled}
              toggleDockWinNumber={settings.toggleDockWinNumber}
              dockMixedReorder={settings.dockMixedReorder}
              toggleDockMixedReorder={settings.toggleDockMixedReorder}
              monitors={settings.monitors}
              dockMonitorMode={settings.dockMonitorMode}
              setDockMonitorModeValue={settings.setDockMonitorModeValue}
              dockMonitorId={settings.dockMonitorId}
              setDockMonitorIdValue={settings.setDockMonitorIdValue}
              dockModeByMonitor={settings.dockModeByMonitor}
              setDockModeForMonitor={settings.setDockModeForMonitor}
              replaceDockModes={settings.replaceDockModesByMonitor}
            />
          )}
          {activeTab === "overlays" && (
            <OverlaysTab
              volumeOverlayEnabled={settings.volumeOverlayEnabled}
              toggleVolumeOverlay={settings.toggleVolumeOverlay}
              volumeEdgeEnabled={settings.volumeEdgeEnabled}
              toggleVolumeEdge={settings.toggleVolumeEdge}
              brightnessOverlayEnabled={settings.brightnessOverlayEnabled}
              toggleBrightnessOverlay={settings.toggleBrightnessOverlay}
              brightnessEdgeEnabled={settings.brightnessEdgeEnabled}
              toggleBrightnessEdge={settings.toggleBrightnessEdge}
            />
          )}
          {activeTab === "about" && (
            <AboutTab
              appVersion={settings.appVersion}
              autoUpdate={settings.autoUpdate}
              toggleAutoUpdate={settings.toggleAutoUpdate}
              updateStatus={settings.updateStatus}
              updateVersion={settings.updateVersion}
              checkForUpdates={settings.checkForUpdates}
              installUpdate={settings.installUpdate}
              exportStatus={settings.exportStatus}
              importStatus={settings.importStatus}
              handleExportSettings={settings.handleExportSettings}
              handleImportSettings={settings.handleImportSettings}
              resetStatus={settings.resetStatus}
              handleResetSettings={settings.handleResetSettings}
              uninstallStatus={settings.uninstallStatus}
              uninstallError={settings.uninstallError}
              handleUninstallIslet={settings.handleUninstallIslet}
            />
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
);
