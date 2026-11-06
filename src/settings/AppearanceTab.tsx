import { Droplet, Contrast, Droplets, Sun, Square, Maximize2, MonitorSmartphone } from "lucide-react";
import { MATERIAL_LABEL, PRESETS, resolvePreset } from "../theme/presets";
import { SettingRow } from "./SettingRow";
import { useT } from "../i18n";

interface AppearanceTabProps {
  themeMode: string;
  handleThemeModeChange: (mode: string) => void;
  themeColor: string;
  handleThemeColorChange: (color: string) => void;
  themeOpacity: number;
  handleOpacityChange: (val: number) => void;
  themeSaturation: number;
  handleSaturationChange: (val: number) => void;
  themeBrightness: number;
  handleBrightnessChange: (val: number) => void;
  cornersEnabled: boolean;
  toggleCorners: () => void;
  scale: number;
  handleScaleChange: (val: number) => void;
}

export function AppearanceTab({
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
  cornersEnabled,
  toggleCorners,
  scale,
  handleScaleChange,
}: AppearanceTabProps) {
  const t = useT();
  const showCustomColor = themeMode === "custom";
  const showAdaptive = themeMode === "adaptive";
  const showAdvancedSliders = showCustomColor || showAdaptive;

  return (
    <>
      <div className="setting-group-label">{t("appearance.preset.title")}</div>
      <div className="preset-block">
        {/* A grid of real swatches, not a dropdown: a theme is a look, and a
            name in a list cannot show what it looks like. Each card paints the
            preset's own colours, so the choice is made by eye. */}
        <div className="preset-grid" role="radiogroup" aria-label={t("appearance.preset.title")}>
          {PRESETS.map((preset) => {
            const active = resolvePreset(themeMode).id === preset.id && !showCustomColor && !showAdaptive;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`preset-card${active ? " active" : ""}`}
                onClick={() => handleThemeModeChange(preset.id)}
                title={t(preset.descKey)}
              >
                <span
                  className="preset-swatch"
                  style={{
                    background: `linear-gradient(150deg, ${preset.swatch[0]}, ${preset.swatch[1]})`,
                    // The card must read as the surface it describes, so the
                    // preview is filled by the preset, not by a generic card.
                    color: preset.text,
                  }}
                >
                  <span className={`preset-swatch-bar ${preset.material}`} />
                </span>
                <span className="preset-name">{t(preset.labelKey)}</span>
                <span className="preset-material">{t(MATERIAL_LABEL[preset.material])}</span>
              </button>
            );
          })}

          <button
            type="button"
            role="radio"
            aria-checked={showCustomColor}
            className={`preset-card${showCustomColor ? " active" : ""}`}
            onClick={() => handleThemeModeChange("custom")}
          >
            <span className="preset-swatch preset-swatch--dynamic">
              <Droplet size={14} />
            </span>
            <span className="preset-name">{t("appearance.preset.custom")}</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={showAdaptive}
            className={`preset-card${showAdaptive ? " active" : ""}`}
            onClick={() => handleThemeModeChange("adaptive")}
          >
            <span className="preset-swatch preset-swatch--dynamic">
              <MonitorSmartphone size={14} />
            </span>
            <span className="preset-name">{t("appearance.preset.adaptive")}</span>
          </button>
        </div>
        <p className="preset-hint">{t("appearance.preset.hint")}</p>
      </div>

      <div className="setting-group">

        {showCustomColor && (
          <SettingRow icon={Droplet} label={t("appearance.color")} desc={t("appearance.color.desc")}>
            <div className="color-picker-row">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => handleThemeColorChange(e.target.value)}
                className="color-picker-input"
              />
              <span className="color-picker-label">{themeColor.toUpperCase()}</span>
            </div>
          </SettingRow>
        )}

        <SettingRow
          icon={Contrast}
          label={t("appearance.opacity")}
          desc={t("appearance.opacity.desc", { percent: Math.round(themeOpacity * 100) })}
          divider={showAdvancedSliders}
        >
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={themeOpacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="settings-slider"
          />
        </SettingRow>

        {showAdvancedSliders && (
          <>
            <SettingRow
              icon={Droplets}
              label={t("appearance.saturation")}
              desc={t("appearance.saturation.desc", { percent: Math.round(themeSaturation * 100) })}
            >
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={themeSaturation}
                onChange={(e) => handleSaturationChange(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </SettingRow>

            <SettingRow
              icon={Sun}
              label={t("appearance.brightness")}
              desc={t("appearance.brightness.desc", { percent: Math.round(themeBrightness * 100) })}
              divider={false}
            >
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={themeBrightness}
                onChange={(e) => handleBrightnessChange(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </SettingRow>
          </>
        )}
      </div>

      <div className="setting-group-label">{t("appearance.display")}</div>
      <div className="setting-group">
        <SettingRow icon={Square} label={t("appearance.corners")} desc={t("appearance.corners.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={cornersEnabled} onChange={toggleCorners} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        <SettingRow
          icon={Maximize2}
          label={t("appearance.scale")}
          desc={t("appearance.scale.desc", { percent: Math.round(scale * 100) })}
          divider={false}
        >
          <div className="scale-button-container">
            <button
              onClick={() => handleScaleChange(Math.max(0.8, parseFloat((scale - 0.1).toFixed(1))))}
              disabled={scale <= 0.8}
              className="scale-adjust-btn"
              title={t("appearance.scale.decrease")}
              aria-label={t("appearance.scale.decrease")}
            >
              −
            </button>
            <span className="scale-display-value">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => handleScaleChange(Math.min(1.3, parseFloat((scale + 0.1).toFixed(1))))}
              disabled={scale >= 1.3}
              className="scale-adjust-btn"
              title={t("appearance.scale.increase")}
              aria-label={t("appearance.scale.increase")}
            >
              +
            </button>
          </div>
        </SettingRow>
      </div>
    </>
  );
}
