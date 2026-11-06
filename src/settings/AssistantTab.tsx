import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sparkles, BatteryCharging, HardDrive, Gauge, Clock, Tag } from "lucide-react";
import { SettingRow } from "./SettingRow";
import type { SettingRowProps } from "./types";
import { readAssistantSettings } from "../hooks/useAssistant";
import type { AssistantSettings } from "../lib/assistant";
import { formatUptime } from "../lib/assistant";
import { useSystemSignals } from "../hooks/useSystemSignals";
import { useT, useLanguage } from "../i18n";

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
  const [name, setName] = useState(() => localStorage.getItem("islet-assistant-name") || "Is");
  const signals = useSystemSignals();
  const t = useT();
  // Re-read the durations when the language changes ("2 h 42" vs "2h 42").
  const lang = useLanguage();

  const commitName = (value: string) => {
    // Same rule as the welcome flow: never store an empty name.
    const clean = value.slice(0, 24);
    setName(clean);
    saveSetting("islet-assistant-name", clean.trim() === "" ? "Is" : clean.trim());
  };

  const update = <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    saveSetting(KEY_MAP[key], String(value));
  };

  const off = !config.enabled;
  const battery = signals?.battery;

  return (
    <>
      <div className="setting-group-label">{t("settings.assistant.group", { name })}</div>
      <div className="setting-group">
        <SettingRow icon={Tag} label={t("settings.assistant.name")} desc={t("settings.assistant.name.desc")}>
          <input
            className="assistant-name-input"
            value={name}
            maxLength={24}
            spellCheck={false}
            onChange={(e) => commitName(e.target.value)}
            aria-label={t("settings.assistant.name")}
          />
        </SettingRow>
        <ToggleRow
          icon={Sparkles}
          label={t("settings.assistant.enable", { name })}
          desc={t("settings.assistant.enable.desc")}
          checked={config.enabled}
          onChange={(v) => update("enabled", v)}
        />
      </div>

      <div className="setting-group-label">{t("settings.assistant.watches", { name })}</div>
      <div className="setting-group">
        <ToggleRow
          icon={BatteryCharging}
          label={t("settings.assistant.battery")}
          desc={
            battery?.present
              ? t("settings.assistant.battery.live", {
                  percent: battery.percent ?? "?",
                  charging: battery.charging ? ` · ${t("common.charing")}` : "",
                })
              : t("settings.assistant.battery.desc")
          }
          checked={config.battery}
          disabled={off}
          onChange={(v) => update("battery", v)}
        />
        <ToggleRow
          icon={HardDrive}
          label={t("settings.assistant.storage")}
          desc={t("settings.assistant.storage.desc")}
          checked={config.storage}
          disabled={off}
          onChange={(v) => update("storage", v)}
        />
        <ToggleRow
          icon={Gauge}
          label={t("settings.assistant.performance")}
          desc={t("settings.assistant.performance.desc")}
          checked={config.performance}
          disabled={off}
          onChange={(v) => update("performance", v)}
        />
        <ToggleRow
          icon={Clock}
          label={t("settings.assistant.session")}
          desc={
            signals
              ? t("settings.assistant.session.live", {
                  uptime: formatUptime(signals.uptime_secs, lang),
                })
              : t("settings.assistant.session.desc")
          }
          checked={config.session}
          disabled={off}
          onChange={(v) => update("session", v)}
        />
      </div>

      <div className="setting-group-label">{t("settings.assistant.thresholds")}</div>
      <div className="setting-group">
        <SliderRow
          icon={BatteryCharging}
          label={t("settings.assistant.lowBattery")}
          desc={t("settings.assistant.lowBattery.desc")}
          value={config.lowBattery}
          min={5}
          max={50}
          suffix=" %"
          disabled={off || !config.battery}
          onChange={(v) => update("lowBattery", v)}
        />
        <SliderRow
          icon={BatteryCharging}
          label={t("settings.assistant.chargeLimit")}
          desc={t("settings.assistant.chargeLimit.desc")}
          value={config.chargeLimit}
          min={60}
          max={100}
          suffix=" %"
          disabled={off || !config.battery}
          onChange={(v) => update("chargeLimit", v)}
        />
        <SliderRow
          icon={HardDrive}
          label={t("settings.assistant.freeSpaceFloor")}
          desc={t("settings.assistant.freeSpaceFloor.desc")}
          value={config.freeSpaceFloor}
          min={5}
          max={25}
          suffix=" %"
          disabled={off || !config.storage}
          onChange={(v) => update("freeSpaceFloor", v)}
        />
        <SliderRow
          icon={Clock}
          label={t("settings.assistant.sessionHours")}
          desc={t("settings.assistant.sessionHours.desc")}
          value={config.sessionHours}
          min={2}
          max={16}
          suffix=" h"
          disabled={off || !config.session}
          onChange={(v) => update("sessionHours", v)}
        />
      </div>

      <div className="setting-group-label">{t("settings.assistant.live")}</div>
      <div className="setting-group">
        <SettingRow icon={Gauge} label={t("settings.assistant.cpu")} desc={t("settings.assistant.cpu.desc")}>
          <span className="assistant-readout">
            {signals ? `${signals.cpu_percent} %` : t("common.none")}
          </span>
        </SettingRow>
        <SettingRow icon={Gauge} label={t("settings.assistant.memory")} desc={t("settings.assistant.memory.desc")}>
          <span className="assistant-readout">
            {signals ? `${Math.round(signals.memory.load_percent)} %` : t("common.none")}
          </span>
        </SettingRow>
        <SettingRow icon={Clock} label={t("settings.assistant.uptime")} desc={t("settings.assistant.uptime.desc")}>
          <span className="assistant-readout">
            {signals ? formatUptime(signals.uptime_secs, lang) : t("common.none")}
          </span>
        </SettingRow>
        <SettingRow icon={HardDrive} label={t("settings.assistant.disks")} desc={t("settings.assistant.disks.desc")}>
          <span className="assistant-readout">
            {signals && signals.disks.some((d) => !d.removable)
              ? signals.disks
                  .filter((d) => !d.removable)
                  .map((d) => `${d.mount} ${d.free_gb.toFixed(0)}G`)
                  .join(" · ")
              : t("common.none")}
          </span>
        </SettingRow>
      </div>
    </>
  );
}
