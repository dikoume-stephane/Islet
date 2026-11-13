import {
  PanelTop,
  Calendar,
  Music,
  Minimize2,
  RectangleHorizontal,
  LayoutList,
  Sparkles,
  Circle,
  CloudSun,
  X,
  Monitor,
  MonitorCheck,
  CloudCog,
  ChevronRight,
  Hourglass,
  Timer,
  BellRing,
  ClipboardList,
  Mic2,
  Layers,
  Trash2,
  ListTodo,
  GitBranch,
  FolderGit2,
  Terminal,
  Moon,
} from "lucide-react";
import { SettingRow } from "./SettingRow";
import { Dropdown } from "./Dropdown";
import { useCaldav } from "../hooks/useCaldav";
import { StatusWidgetConfig } from "../components/StatusWidgetConfig";
import type { WidgetConfig, MonitorInfo, MonitorMode } from "./types";
import { usePerMonitor } from "./usePerMonitor";
import { useT } from "../i18n";
import { shortPath } from "../lib/shelf";
import { FOCUS_PRESETS } from "../lib/focus";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface NotchTabProps {
  notchMode: string;
  setNotchModeValue: (mode: string) => void;
  monitors: MonitorInfo[];
  notchMonitorMode: MonitorMode;
  setNotchMonitorModeValue: (mode: MonitorMode) => void;
  notchMonitorId: string;
  setNotchMonitorIdValue: (id: string) => void;
  notchModeByMonitor: Record<string, string>;
  setNotchModeForMonitor: (monitorId: string, mode: string | null) => void;
  replaceNotchModes: (next: Record<string, string>) => void;
  calendarEnabled: boolean;
  toggleCalendar: () => void;
  clipboardEnabled: boolean;
  toggleClipboard: () => void;
  clipboardPaste: boolean;
  toggleClipboardPaste: () => void;
  lyricsEnabled: boolean;
  toggleLyrics: () => void;
  shelfEnabled: boolean;
  toggleShelf: () => void;
  todoEnabled: boolean;
  toggleTodo: () => void;
  devEnabled: boolean;
  toggleDev: () => void;
  devFolder: string;
  pickDevFolder: () => void;
  clearDevFolder: () => void;
  devBuild: string;
  changeDevBuild: (command: string) => void;
  focusMinutes: number;
  changeFocusMinutes: (minutes: number) => void;
  timerEnabled: boolean;
  toggleTimerEnabled: () => void;
  timerSoundEnabled: boolean;
  toggleTimerSound: () => void;
  stopwatchEnabled: boolean;
  toggleStopwatchEnabled: () => void;
  musicModeEnabled: boolean;
  toggleMusicMode: () => void;
  musicCompactNotch: boolean;
  toggleMusicCompactNotch: () => void;
  pillMinimal: boolean;
  togglePillMinimal: () => void;
  mediaLayout: "classic" | "compact";
  toggleMediaLayout: (layout: "classic" | "compact") => void;
  mediaAmbienceEnabled: boolean;
  toggleAmbience: () => void;
  mediaCompactGlowEnabled: boolean;
  toggleCompactGlow: () => void;
  weatherEnabled: boolean;
  toggleWeather: () => void;
  tempUnitFahrenheit: boolean;
  toggleTempUnit: () => void;
  cityName: string;
  setCityName: (name: string) => void;
  citySearchResults: Array<{ name: string; country: string; latitude: number; longitude: number }>;
  showCityDropdown: boolean;
  setShowCityDropdown: (show: boolean) => void;
  selectCity: (city: { name: string; country: string; latitude: number; longitude: number }) => void;
  handleCityClear: () => void;
  statusWidgets: WidgetConfig;
  handleWidgetsChange: (config: WidgetConfig) => void;
  hasBattery: boolean;
  onOpenCalendarSync: () => void;
}

export function NotchTab({
  notchMode,
  setNotchModeValue,
  monitors,
  notchMonitorMode,
  setNotchMonitorModeValue,
  notchMonitorId,
  setNotchMonitorIdValue,
  notchModeByMonitor,
  setNotchModeForMonitor,
  replaceNotchModes,
  calendarEnabled,
  toggleCalendar,
  clipboardEnabled,
  toggleClipboard,
  clipboardPaste,
  toggleClipboardPaste,
  lyricsEnabled,
  toggleLyrics,
  shelfEnabled,
  toggleShelf,
  todoEnabled,
  toggleTodo,
  devEnabled,
  toggleDev,
  devFolder,
  pickDevFolder,
  clearDevFolder,
  devBuild,
  changeDevBuild,
  focusMinutes,
  changeFocusMinutes,
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
  pillMinimal,
  togglePillMinimal,
  mediaLayout,
  toggleMediaLayout,
  mediaAmbienceEnabled,
  toggleAmbience,
  mediaCompactGlowEnabled,
  toggleCompactGlow,
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
  statusWidgets,
  handleWidgetsChange,
  hasBattery,
  onOpenCalendarSync,
}: NotchTabProps) {
  const t = useT();
  const caldav = useCaldav();
  const sources = (caldav.account ? 1 : 0) + caldav.links.length;
  const perMonitor = usePerMonitor(notchMode, notchModeByMonitor, replaceNotchModes, monitors);
  const multiMonitor = notchMonitorMode === "all" && monitors.length > 1;
  const showPerMonitor = multiMonitor && perMonitor.enabled;
  return (
    <>
      <div className="setting-group-label">Notch</div>
      <div className="setting-group">
        {!showPerMonitor && (
          <SettingRow icon={PanelTop} label={t("notch.behavior")} desc={t("notch.behavior.desc")}>
            <Dropdown
              value={notchMode}
              onChange={setNotchModeValue}
              options={[
                { value: "fixed", label: t("common.mode.fixed") },
                { value: "smart", label: t("common.mode.smart") },
                { value: "peek", label: t("common.mode.peek") },
              ]}
            />
          </SettingRow>
        )}

        <SettingRow icon={MonitorCheck} label={t("common.showOn")} desc={t("common.showOn.desc", { target: "notch" })}>
          <Dropdown
            value={notchMonitorMode}
            onChange={(v) => setNotchMonitorModeValue(v as MonitorMode)}
            options={[
              { value: "primary", label: t("common.monitor.primary") },
              { value: "all", label: t("common.monitor.all") },
              { value: "specific", label: t("common.monitor.specific") },
            ]}
          />
        </SettingRow>

        {notchMonitorMode === "specific" && (
          <SettingRow icon={Monitor} label={t("common.monitor")} desc={t("common.monitor.desc", { target: "notch" })}>
            <Dropdown
              value={notchMonitorId}
              onChange={setNotchMonitorIdValue}
              placeholder={monitors.length === 0 ? t("common.loading") : undefined}
              options={monitors.map((m) => ({
                value: m.id,
                label: `${m.label}${m.is_primary ? " " + t("common.monitor.primaryTag") : ""}`,
              }))}
            />
          </SettingRow>
        )}

        {multiMonitor && (
          <SettingRow icon={Monitor} label={t("common.perMonitor")} desc={t("common.perMonitor.desc")}>
            <label className="toggle-switch">
              <input type="checkbox" checked={perMonitor.enabled} onChange={perMonitor.toggle} />
              <span className="slider"></span>
            </label>
          </SettingRow>
        )}

        {showPerMonitor && monitors.map((m) => (
          <SettingRow key={m.id} icon={Monitor} label={t("common.monitor.behavior", { name: m.label })} desc={m.is_primary ? t("common.monitor.primaryDesc") : undefined}>
            <Dropdown
              value={notchModeByMonitor[m.id] || notchMode}
              onChange={(v) => setNotchModeForMonitor(m.id, v)}
              options={[
                { value: "fixed", label: t("common.mode.fixed") },
                { value: "smart", label: t("common.mode.smart") },
                { value: "peek", label: t("common.mode.peek") },
              ]}
            />
          </SettingRow>
        ))}

        <SettingRow icon={RectangleHorizontal} label={t("notch.pillMinimal")} desc={t("notch.pillMinimal.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={pillMinimal} onChange={togglePillMinimal} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        <SettingRow icon={Calendar} label={t("notch.calendar")} desc={t("notch.calendar.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={calendarEnabled} onChange={toggleCalendar} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {calendarEnabled && (
          <SettingRow
            icon={CloudCog}
            label={t("notch.calendarSync")}
            desc={
              sources
                ? t("notch.calendarSync.connected", { count: sources })
                : t("notch.calendarSync.desc")
            }
            action
            onClick={onOpenCalendarSync}
          >
            <ChevronRight size={14} strokeWidth={1.5} />
          </SettingRow>
        )}

        <SettingRow icon={ClipboardList} label={t("clip.settings.enable")} desc={t("clip.settings.enable.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={clipboardEnabled} onChange={toggleClipboard} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {clipboardEnabled && (
          <SettingRow icon={ClipboardList} label={t("clip.settings.paste")} desc={t("clip.settings.paste.desc")}>
            <label className="toggle-switch">
              <input type="checkbox" checked={clipboardPaste} onChange={toggleClipboardPaste} />
              <span className="slider"></span>
            </label>
          </SettingRow>
        )}

        <SettingRow icon={Hourglass} label={t("notch.timer")} desc={t("notch.timer.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={timerEnabled} onChange={toggleTimerEnabled} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {timerEnabled && (
          <SettingRow icon={BellRing} label={t("notch.timerSound")} desc={t("notch.timerSound.desc")}>
            <label className="toggle-switch">
              <input type="checkbox" checked={timerSoundEnabled} onChange={toggleTimerSound} />
              <span className="slider"></span>
            </label>
          </SettingRow>
        )}

        <SettingRow
          icon={Moon}
          label={t("focus.settings.minutes")}
          desc={t("focus.settings.minutes.desc")}
        >
          <div className="focus-presets">
            {FOCUS_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={`focus-preset${focusMinutes === minutes ? " is-on" : ""}`}
                onClick={() => changeFocusMinutes(minutes)}
                aria-pressed={focusMinutes === minutes}
              >
                {minutes}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow icon={Timer} label={t("notch.stopwatch")} desc={t("notch.stopwatch.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={stopwatchEnabled} onChange={toggleStopwatchEnabled} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        <SettingRow icon={Music} label={t("notch.music")} desc={t("notch.music.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={musicModeEnabled} onChange={toggleMusicMode} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {musicModeEnabled && (
          <>
            <SettingRow icon={Minimize2} label={t("notch.compact")} desc={t("notch.compact.desc")}>
              <label className="toggle-switch">
                <input type="checkbox" checked={musicCompactNotch} onChange={toggleMusicCompactNotch} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <SettingRow icon={LayoutList} label={t("notch.mediaLayout")} desc={t("notch.mediaLayout.desc")}>
              <div className="unit-toggle-minimal wide">
                <span className={mediaLayout === "classic" ? "active" : ""} onClick={() => toggleMediaLayout("classic")}>
                  {t("notch.mediaLayout.classic")}
                </span>
                <span className={mediaLayout === "compact" ? "active" : ""} onClick={() => toggleMediaLayout("compact")}>
                  {t("notch.mediaLayout.compact")}
                </span>
              </div>
            </SettingRow>

            <SettingRow icon={Sparkles} label={t("notch.ambient")} desc={t("notch.ambient.desc")}>
              <label className="toggle-switch">
                <input type="checkbox" checked={mediaAmbienceEnabled} onChange={toggleAmbience} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <SettingRow icon={Circle} label={t("notch.compactGlow")} desc={t("notch.compactGlow.desc")} divider={false}>
              <label className="toggle-switch">
                <input type="checkbox" checked={mediaCompactGlowEnabled} onChange={toggleCompactGlow} />
                <span className="slider"></span>
              </label>
            </SettingRow>
          </>
        )}
      </div>

      <div className="setting-group-label">{t("notch.weather")}</div>
      <div className="setting-group">
        <SettingRow icon={Layers} label={t("shelf.settings.enable")} desc={t("shelf.settings.enable.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={shelfEnabled} onChange={toggleShelf} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {shelfEnabled && (
          <SettingRow icon={Layers} label={t("shelf.note")} desc={t("shelf.settings.note")} divider={false} />
        )}

        <SettingRow icon={ListTodo} label={t("todo.settings.enable")} desc={t("todo.settings.enable.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={todoEnabled} onChange={toggleTodo} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {todoEnabled && <SettingRow icon={ListTodo} label={t("todo.settings.note")} divider={false} />}

        <SettingRow icon={Mic2} label={t("lyrics.settings.enable")} desc={t("lyrics.settings.enable.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={lyricsEnabled} onChange={toggleLyrics} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {lyricsEnabled && <LyricsCacheRow />}

        <SettingRow icon={CloudSun} label={t("notch.weather.status")} desc={cityName || t("notch.weather.auto")}>
          <div className="weather-controls">
            <div className="unit-toggle-minimal" onClick={toggleTempUnit}>
              <span className={!tempUnitFahrenheit ? "active" : ""}>C</span>
              <span className={tempUnitFahrenheit ? "active" : ""}>F</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={weatherEnabled} onChange={toggleWeather} />
              <span className="slider"></span>
            </label>
          </div>
        </SettingRow>

        {weatherEnabled && (
          <div className="manual-city-input">
            <div className="city-input-row">
              <input
                type="text"
                placeholder={t("notch.weather.search")}
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                onFocus={() => citySearchResults.length > 0 && setShowCityDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && citySearchResults.length > 0) {
                    e.preventDefault();
                    selectCity(citySearchResults[0]);
                  }
                  if (e.key === "Escape") {
                    setShowCityDropdown(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
              />
              {cityName && (
                <button
                  className="city-clear-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCityClear();
                  }}
                  title={t("notch.weather.clear")}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
            {showCityDropdown && citySearchResults.length > 0 && (
              <div className="city-dropdown">
                {citySearchResults.map((city) => (
                  <button
                    key={`${city.name}-${city.latitude}`}
                    className="city-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCity(city);
                    }}
                  >
                    <span className="city-dropdown-name">{city.name}</span>
                    <span className="city-dropdown-country">{city.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="setting-group-label">{t("notch.widgets")}</div>
      <div className="setting-group">
        <StatusWidgetConfig value={statusWidgets} onChange={handleWidgetsChange} hasBattery={hasBattery} />
      </div>

      <div className="setting-group-label">{t("dev.settings.group")}</div>
      <div className="setting-group">
        <SettingRow icon={GitBranch} label={t("dev.settings.enable")} desc={t("dev.settings.enable.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={devEnabled} onChange={toggleDev} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {devEnabled && (
          <SettingRow
            icon={FolderGit2}
            label={t("dev.settings.folder")}
            desc={devFolder === "" ? t("dev.settings.folder.desc") : shortPath(devFolder, 3)}
          >
            <div className="dev-folder-actions">
              {devFolder !== "" && (
                <button type="button" className="dev-folder-button" onClick={clearDevFolder}>
                  {t("dev.settings.clear")}
                </button>
              )}
              <button type="button" className="dev-folder-button is-primary" onClick={pickDevFolder}>
                {t("dev.settings.pick")}
              </button>
            </div>
          </SettingRow>
        )}

        {devEnabled && <DevBuildRow value={devBuild} onSave={changeDevBuild} />}
      </div>
    </>
  );
}

/**
 * La commande de vérification.
 *
 * Gardée en brouillon local, enregistrée quand le champ perd le focus ou reçoit
 * Entrée : écrire `bun run build` ne doit pas produire treize écritures dans
 * `settings.json`. Le panneau du notch lit la valeur enregistrée, pas le
 * brouillon : une commande à moitié tapée ne peut donc pas être lancée.
 */
function DevBuildRow({ value, onSave }: { value: string; onSave: (command: string) => void }) {
  const t = useT();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    if (next !== value) onSave(next);
  };

  return (
    <SettingRow
      icon={Terminal}
      label={t("dev.settings.build")}
      desc={t("dev.settings.build.desc")}
      divider={false}
    >
      <input
        className="dev-build-input"
        type="text"
        value={draft}
        placeholder={t("dev.settings.build.placeholder")}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </SettingRow>
  );
}

/**
 * Lyrics cache: how much is on disk, and one button to take it away.
 *
 * Kept as its own component rather than three more props: the count is a fact
 * about the file system, not a user preference, so it is read here and never
 * round-trips through `useSettings`. The privacy line sits underneath because
 * this is the only feature in the app that talks to a server.
 */
function LyricsCacheRow() {
  const t = useT();
  const [count, setCount] = useState<number | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    let alive = true;
    invoke<number>("lyrics_cache_count")
      .then((value) => alive && setCount(value))
      .catch(() => alive && setCount(null));
    return () => {
      alive = false;
    };
  }, []);

  const clear = () => {
    invoke<number>("lyrics_clear_cache")
      .then(() => {
        setCount(0);
        setCleared(true);
        window.setTimeout(() => setCleared(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <SettingRow
      icon={Trash2}
      label={t("lyrics.settings.cache")}
      desc={
        cleared
          ? t("lyrics.settings.cache.cleared")
          : count === null
            ? t("lyrics.settings.privacy")
            : t("lyrics.settings.cache.desc", { count })
      }
    >
      <button type="button" className="settings-inline-btn" onClick={clear} disabled={!count}>
        {t("lyrics.settings.cache.clear")}
      </button>
    </SettingRow>
  );
}
