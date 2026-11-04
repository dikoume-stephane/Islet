import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sparkles, BatteryCharging, HardDrive, Gauge, Clock } from "lucide-react";
import { SettingRow } from "./SettingRow";
import type { SettingRowProps } from "./types";
import { readAssistantSettings } from "../hooks/useAssistant";
import type { AssistantSettings } from "../lib/assistant";
import { formatUptime } from "../lib/assistant";
import { useSystemSignals } from "../hooks/useSystemSignals";

/**
 * Is settings.
 *
 * Values go through `save_setting`, like the rest of the app: localStorage +
 * `settings.json`, so the notch and this window agree without a second
 * persistence path.
 */

/** Storage key ↔ settings field. */
const KEY_MAP: Record<keyof AssistantSettings, string> = {
  enabled: "islet-assistant-enabled",
  battery: "islet-assistant-battery",
  storage: "islet-assistant-storage",
  performance: "islet-assistant-performance",
  session: "islet-assistant-session",
  lowBattery: "islet-assistant-low-battery",
  chargeLimit: "islet-assistant-charge-limit",
  freeSpaceFloor: "islet-assistant-free-space-floor",
  sessionHours: "islet-assistant-session-hours",
};

function saveSetting(key: string, value: string) {
  localStorage.setItem(key, value);
  invoke("save_setting", { key, value }).catch(console.error);
}

type IconProp = SettingRowProps["icon"];

interface ToggleRowProps {
  icon: IconProp;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon, label, desc, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <SettingRow icon={icon} label={label} desc={desc}>
      <label className="toggle-switch" style={disabled ? { opacity: 0.45 } : undefined}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="slider"></span>
      </label>
    </SettingRow>
  );
}

interface SliderRowProps {
  icon: IconProp;
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (next: number) => void;
  disabled?: boolean;
}

function SliderRow({
  icon,
  label,
  desc,
  value,
  min,
  max,
  suffix,
  onChange,
  disabled,
}: SliderRowProps) {
  return (
    <SettingRow icon={icon} label={label} desc={desc}>
      <div className="assistant-slider-row" style={disabled ? { opacity: 0.45 } : undefined}>
        <input
          type="range"
          className="settings-slider"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
        <span className="assistant-slider-value">
          {value}
          {suffix}
        </span>
      </div>
    </SettingRow>
  );
}

export function AssistantTab() {
  const [config, setConfig] = useState<AssistantSettings>(() => readAssistantSettings());
  const signals = useSystemSignals();

  const update = <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    saveSetting(KEY_MAP[key], String(value));
  };

  const off = !config.enabled;
  const battery = signals?.battery;

  return (
    <>
      <div className="setting-group-label">Is — Assistant</div>
      <div className="setting-group">
        <ToggleRow
          icon={Sparkles}
          label="Enable Is"
          desc="Short tips in the notch, plus a coloured outline that stays until you click the notch and read them"
          checked={config.enabled}
          onChange={(v) => update("enabled", v)}
        />
      </div>

      <div className="setting-group-label">What Is watches</div>
      <div className="setting-group">
        <ToggleRow
          icon={BatteryCharging}
          label="Battery"
          desc={
            battery?.present
              ? `Now: ${battery.percent ?? "?"} %${battery.charging ? " · charging" : ""}`
              : "Low battery, charge reminder, full charge"
          }
          checked={config.battery}
          disabled={off}
          onChange={(v) => update("battery", v)}
        />
        <ToggleRow
          icon={HardDrive}
          label="Storage"
          desc="Disk filling up, and drives about to run out of space"
          checked={config.storage}
          disabled={off}
          onChange={(v) => update("storage", v)}
        />
        <ToggleRow
          icon={Gauge}
          label="Performance"
          desc="Sustained CPU load and memory pressure"
          checked={config.performance}
          disabled={off}
          onChange={(v) => update("performance", v)}
        />
        <ToggleRow
          icon={Clock}
          label="Session"
          desc={
            signals
              ? `Uptime now: ${formatUptime(signals.uptime_secs)}`
              : "Long session, delayed restart and late nights"
          }
          checked={config.session}
          disabled={off}
          onChange={(v) => update("session", v)}
        />
      </div>

      <div className="setting-group-label">Thresholds</div>
      <div className="setting-group">
        <SliderRow
          icon={BatteryCharging}
          label="Low battery warning"
          desc="Warn when the battery drops to this level"
          value={config.lowBattery}
          min={5}
          max={50}
          suffix=" %"
          disabled={off || !config.battery}
          onChange={(v) => update("lowBattery", v)}
        />
        <SliderRow
          icon={BatteryCharging}
          label="Charge reminder"
          desc="Suggest unplugging once the battery reaches this level"
          value={config.chargeLimit}
          min={60}
          max={100}
          suffix=" %"
          disabled={off || !config.battery}
          onChange={(v) => update("chargeLimit", v)}
        />
        <SliderRow
          icon={HardDrive}
          label="Free space floor"
          desc="Warn when a drive has less than this share free"
          value={config.freeSpaceFloor}
          min={5}
          max={25}
          suffix=" %"
          disabled={off || !config.storage}
          onChange={(v) => update("freeSpaceFloor", v)}
        />
        <SliderRow
          icon={Clock}
          label="Long session"
          desc="Suggest a break after this many hours of uptime"
          value={config.sessionHours}
          min={2}
          max={16}
          suffix=" h"
          disabled={off || !config.session}
          onChange={(v) => update("sessionHours", v)}
        />
      </div>

      <div className="setting-group-label">Right now</div>
      <div className="setting-group">
        <SettingRow icon={Gauge} label="CPU" desc="Instantaneous load">
          <span className="assistant-readout">
            {signals ? `${signals.cpu_percent} %` : "—"}
          </span>
        </SettingRow>
        <SettingRow icon={Gauge} label="Memory" desc="Physical memory in use">
          <span className="assistant-readout">
            {signals ? `${Math.round(signals.memory.load_percent)} %` : "—"}
          </span>
        </SettingRow>
        <SettingRow icon={Clock} label="Uptime" desc="Time since Windows started">
          <span className="assistant-readout">
            {signals ? formatUptime(signals.uptime_secs) : "—"}
          </span>
        </SettingRow>
        <SettingRow icon={HardDrive} label="Disks" desc="Fixed volumes and free space">
          <span className="assistant-readout">
            {signals && signals.disks.some((d) => !d.removable)
              ? signals.disks
                  .filter((d) => !d.removable)
                  .map((d) => `${d.mount} ${d.free_gb.toFixed(0)}G`)
                  .join(" · ")
              : "—"}
          </span>
        </SettingRow>
      </div>
    </>
  );
}
