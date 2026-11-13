import { Power, Download, Clock, BatteryWarning, RefreshCw, LogOut, GraduationCap, Languages } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { Dropdown } from "./Dropdown";
import { useT, useLanguage, setLanguage, getLanguagePreference, type LanguagePreference } from "../i18n";

interface GeneralTabProps {
  autostart: boolean;
  toggleAutostart: () => void;
  timeFormat24h: boolean;
  toggleTimeFormat24h: () => void;
  showUpdateIndicator: boolean;
  toggleUpdateIndicator: () => void;
  lowBatteryThreshold: number;
  handleThresholdChange: (val: number) => void;
  restartIslet: () => void;
  quitIslet: () => void;
  /** Replay the first-run welcome flow. */
  replayOnboarding: () => void;
}

export function GeneralTab({
  autostart,
  toggleAutostart,
  timeFormat24h,
  toggleTimeFormat24h,
  showUpdateIndicator,
  toggleUpdateIndicator,
  lowBatteryThreshold,
  handleThresholdChange,
  restartIslet,
  quitIslet,
  replayOnboarding,
}: GeneralTabProps) {
  const t = useT();
  // Subscribing to the language is what repaints this tab the instant it is
  // switched — the dropdown must not be the one control that needs a restart.
  useLanguage();
  const preference = getLanguagePreference();

  return (
    <>
      <div className="setting-group-label">{t("settings.language")}</div>
      <div className="setting-group">
        <SettingRow
          icon={Languages}
          label={t("settings.language.title")}
          desc={t("settings.language.desc")}
          divider={false}
        >
          <Dropdown
            value={preference}
            onChange={(v) => setLanguage(v as LanguagePreference)}
            options={[
              { value: "system", label: t("settings.language.system") },
              // Each language names itself, in itself. A French speaker looking
              // for French should not have to recognise "French" in English.
              { value: "fr", label: t("settings.language.fr") },
              { value: "en", label: t("settings.language.en") },
            ]}
          />
        </SettingRow>
      </div>

      <div className="setting-group-label">{t("settings.general.system")}</div>
      <div className="setting-group">
        <SettingRow icon={Power} label={t("settings.general.autostart")} desc={t("settings.general.autostart.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={autostart} onChange={toggleAutostart} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        <SettingRow
          icon={Download}
          label={t("settings.general.updateIndicator")}
          desc={t("settings.general.updateIndicator.desc")}
        >
          <label className="toggle-switch">
            <input type="checkbox" checked={showUpdateIndicator} onChange={toggleUpdateIndicator} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        <SettingRow
          icon={Clock}
          label={t("settings.general.timeFormat")}
          desc={t("settings.general.timeFormat.desc")}
        >
          <label className="toggle-switch">
            <input type="checkbox" checked={timeFormat24h} onChange={toggleTimeFormat24h} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        <SettingRow
          icon={BatteryWarning}
          label={t("settings.general.lowBattery")}
          desc={t("settings.general.lowBattery.desc", { percent: lowBatteryThreshold })}
          divider={false}
        >
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={lowBatteryThreshold}
            onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
            className="settings-slider"
          />
        </SettingRow>
      </div>

      <div className="setting-group-label">{t("settings.general.app")}</div>
      <div className="setting-group">
        <SettingRow
          icon={GraduationCap}
          label={t("settings.general.replay")}
          desc={t("settings.general.replay.desc")}
          action
          onClick={replayOnboarding}
        />
        <SettingRow
          icon={RefreshCw}
          label={t("settings.general.restart")}
          desc={t("settings.general.restart.desc")}
          action
          onClick={restartIslet}
        />
        <SettingRow
          icon={LogOut}
          label={t("settings.general.quit")}
          desc={t("settings.general.quit.desc")}
          action
          danger
          onClick={quitIslet}
          divider={false}
        />
      </div>
    </>
  );
}
