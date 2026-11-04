import type { ChangeEvent, CSSProperties } from "react";
import { Monitor, Eye, EyeOff, Circle, Search, Shuffle, MonitorCheck, CalendarDays, Maximize2, Keyboard, Sparkles, RotateCcw } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { Dropdown } from "./Dropdown";
import type { MonitorInfo, MonitorMode } from "./types";
import { usePerMonitor } from "./usePerMonitor";
import { useT } from "../i18n";

const START_ICON_PRESETS = [
  { key: "default", src: "/islet.png", label: "Islet" },
  { key: "windows", src: "/windows.png", label: "Windows" },
];

const startIconTileStyle = (active: boolean): CSSProperties => ({
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  border: active ? "2px solid var(--islet-accent, #007aff)" : "2px solid rgba(255,255,255,0.1)",
  background: active ? "rgba(0,122,255,0.15)" : "rgba(255,255,255,0.05)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.15s ease",
  padding: "6px",
  color: "rgba(255,255,255,0.5)",
});

interface DockTabProps {
  dockEnabled: boolean;
  toggleDock: () => void;
  dockMode: string;
  setDockModeValue: (mode: string) => void;
  dockPreviewEnabled: boolean;
  toggleDockPreview: () => void;
  dockSearchEnabled: boolean;
  toggleDockSearch: () => void;
  dockCalendarEnabled: boolean;
  toggleDockCalendar: () => void;
  dockIconOnly: boolean;
  toggleDockIconOnly: () => void;
  dockAdaptive: boolean;
  toggleDockAdaptive: () => void;
  startIcon: string;
  handleStartIconChange: (icon: string) => void;
  dockWinNumberEnabled: boolean;
  toggleDockWinNumber: () => void;
  dockMixedReorder: boolean;
  toggleDockMixedReorder: () => void;
  monitors: MonitorInfo[];
  dockMonitorMode: MonitorMode;
  setDockMonitorModeValue: (mode: MonitorMode) => void;
  dockMonitorId: string;
  setDockMonitorIdValue: (id: string) => void;
  dockModeByMonitor: Record<string, string>;
  setDockModeForMonitor: (monitorId: string, mode: string | null) => void;
  replaceDockModes: (next: Record<string, string>) => void;
}

export function DockTab({
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
  dockAdaptive,
  toggleDockAdaptive,
  startIcon,
  handleStartIconChange,
  dockWinNumberEnabled,
  toggleDockWinNumber,
  dockMixedReorder,
  toggleDockMixedReorder,
  monitors,
  dockMonitorMode,
  setDockMonitorModeValue,
  dockMonitorId,
  setDockMonitorIdValue,
  dockModeByMonitor,
  setDockModeForMonitor,
  replaceDockModes,
}: DockTabProps) {
  const t = useT();
  const perMonitor = usePerMonitor(dockMode, dockModeByMonitor, replaceDockModes, monitors);
  const multiMonitor = dockMonitorMode === "all" && monitors.length > 1;
  const showPerMonitor = multiMonitor && perMonitor.enabled;

  const handleStartIconUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleStartIconChange(`custom:${reader.result as string}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <div className="setting-group-label">{t("dock.group")}</div>
      <div className="setting-group">
        <SettingRow icon={Monitor} label={t("dock.enable")} desc={t("dock.enable.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={dockEnabled} onChange={toggleDock} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {dockEnabled && (
          <>
            {!showPerMonitor && (
              <SettingRow icon={dockMode === "fixed" ? EyeOff : Eye} label={t("dock.behavior")} desc={t("dock.behavior.desc")}>
                <Dropdown
                  value={dockMode}
                  onChange={setDockModeValue}
                  options={[
                    { value: "fixed", label: t("common.mode.fixed") },
                    { value: "smart", label: t("common.mode.smart") },
                    { value: "peek", label: t("common.mode.peek") },
                  ]}
                />
              </SettingRow>
            )}

            <SettingRow icon={MonitorCheck} label={t("common.showOn")} desc={t("common.showOn.desc", { target: "dock" })}>
              <Dropdown
                value={dockMonitorMode}
                onChange={(v) => setDockMonitorModeValue(v as MonitorMode)}
                options={[
                  { value: "primary", label: t("common.monitor.primary") },
                  { value: "all", label: t("common.monitor.all") },
                  { value: "specific", label: t("common.monitor.specific") },
                ]}
              />
            </SettingRow>

            {dockMonitorMode === "specific" && (
              <SettingRow icon={Monitor} label={t("common.monitor")} desc={t("common.monitor.desc", { target: "dock" })}>
                <Dropdown
                  value={dockMonitorId}
                  onChange={setDockMonitorIdValue}
                  placeholder={monitors.length === 0 ? "Loading..." : undefined}
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
                  value={dockModeByMonitor[m.id] || dockMode}
                  onChange={(v) => setDockModeForMonitor(m.id, v)}
                  options={[
                    { value: "fixed", label: t("common.mode.fixed") },
                    { value: "smart", label: t("common.mode.smart") },
                    { value: "peek", label: t("common.mode.peek") },
                  ]}
                />
              </SettingRow>
            ))}

            <SettingRow icon={Eye} label={t("dock.previews")} desc={t("dock.previews.desc")}>
              <label className="toggle-switch">
                <input type="checkbox" checked={dockPreviewEnabled} onChange={toggleDockPreview} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <SettingRow icon={Search} label={t("dock.search")} desc={t("dock.search.desc")}>
              <label className="toggle-switch">
                <input type="checkbox" checked={dockSearchEnabled} onChange={toggleDockSearch} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <SettingRow icon={CalendarDays} label={t("dock.calendar")} desc={t("dock.calendar.desc")}>
              <label className="toggle-switch">
                <input type="checkbox" checked={dockCalendarEnabled} onChange={toggleDockCalendar} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <SettingRow icon={Circle} label={t("dock.iconOnly")} desc={t("dock.iconOnly.desc")}>
              <label className="toggle-switch">
                <input type="checkbox" checked={dockIconOnly} onChange={toggleDockIconOnly} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <SettingRow icon={Keyboard} label={t("dock.winNumber")} desc={t("dock.winNumber.desc")}>
              <label className="toggle-switch">
                <input type="checkbox" checked={dockWinNumberEnabled} onChange={toggleDockWinNumber} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            {dockMode === "fixed" && (
              <SettingRow icon={Maximize2} label={t("dock.adaptive")} desc={t("dock.adaptive.desc")}>
                <label className="toggle-switch">
                  <input type="checkbox" checked={dockAdaptive} onChange={toggleDockAdaptive} />
                  <span className="slider"></span>
                </label>
              </SettingRow>
            )}

            <SettingRow
              icon={Shuffle}
              label={t("dock.mixed")}
              desc={dockMixedReorder ? t("dock.mixed.on") : t("dock.mixed.off")}
            >
              <label className="toggle-switch">
                <input type="checkbox" checked={dockMixedReorder} onChange={toggleDockMixedReorder} />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <div className="setting-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <div className="setting-icon-bg">
                  <Sparkles size={14} strokeWidth={1.5} />
                </div>
                <div className="setting-info">
                  <span className="setting-label">{t("dock.startIcon")}</span>
                  <span className="setting-desc">{t("dock.startIcon.desc")}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingLeft: "34px" }}>
                {START_ICON_PRESETS.map((icon) => (
                  <div
                    key={icon.key}
                    onClick={() => handleStartIconChange(icon.key)}
                    style={startIconTileStyle(startIcon === icon.key)}
                    title={icon.label}
                  >
                    <img src={icon.src} alt={icon.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />
                  </div>
                ))}
                <div
                  onClick={() => document.getElementById("start-icon-file-input")?.click()}
                  style={startIconTileStyle(startIcon.startsWith("custom:"))}
                  title={t("dock.startIcon.custom")}
                >
                  {startIcon.startsWith("custom:") ? (
                    <img
                      src={startIcon.replace("custom:", "")}
                      alt="Custom"
                      style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "8px" }}
                      draggable={false}
                    />
                  ) : (
                    <span style={{ fontSize: "20px" }}>+</span>
                  )}
                </div>
                {startIcon !== "default" && (
                  <div onClick={() => handleStartIconChange("default")} style={startIconTileStyle(false)} title={t("dock.startIcon.reset")}>
                    <RotateCcw size={18} strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <input
                id="start-icon-file-input"
                type="file"
                accept=".png,.ico,.jpg,.jpeg,.svg,.bmp"
                style={{ display: "none" }}
                onChange={handleStartIconUpload}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
