import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sparkles, BatteryCharging, HardDrive, Gauge, Clock, Tag, Plug, Wifi, WifiOff } from "lucide-react";
import { SettingRow } from "./SettingRow";
import type { SettingRowProps } from "./types";
import { readAssistantSettings } from "../hooks/useAssistant";
import type { AssistantSettings } from "../lib/assistant";
import { formatUptime } from "../lib/assistant";
import { useSystemSignals } from "../hooks/useSystemSignals";
import { useT, useLanguage } from "../i18n";
import { gazeVector, MOODS, shouldSleep, type IsMood } from "../lib/character";
import { useTrailingThrottle } from "../hooks/useTrailingThrottle";
import { IsSprite } from "../components/IsSprite";
import {
  buildChatBody,
  buildMessages,
  chatUrl,
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  isLocalEndpoint,
  normalizeEndpoint,
  parseAnswer,
} from "../lib/ai";

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

  // --- Le personnage -------------------------------------------------------
  // L'aperçu obéit à trois choses : le curseur (le regard), le silence (le
  // sommeil) et un état choisi à la main, qui a le dernier mot tant qu'on ne
  // l'a pas rendu au repos.
  const [forced, setForced] = useState<IsMood | null>(null);
  const [dozing, setDozing] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const spriteRef = useRef<HTMLDivElement>(null);
  const lastMoveRef = useRef(Date.now());

  const trackPointer = useTrailingThrottle((x: number, y: number) => {
    lastMoveRef.current = Date.now();
    setDozing(false);
    const node = spriteRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setGaze(gazeVector({ x, y }, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }));
  }, 70);

  useEffect(() => {
    const onMove = (event: PointerEvent) => trackPointer(event.clientX, event.clientY);
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [trackPointer]);

  useEffect(() => {
    // Un état choisi à la main ne s'endort pas : on est en train de le regarder.
    const timer = setInterval(() => {
      if (forced) return;
      if (shouldSleep(Date.now() - lastMoveRef.current)) setDozing(true);
    }, 2000);
    return () => clearInterval(timer);
  }, [forced]);

  const mood: IsMood = forced ?? (dozing ? "sleeping" : "idle");

  return (
    <>
      <div className="setting-group-label">{t("settings.assistant.character")}</div>
      <div className="setting-group">
        <div className="assistant-character">
          <div className="assistant-character-sprite" ref={spriteRef}>
            <IsSprite mood={mood} size={72} gaze={gaze} accent="#64D2FF" />
          </div>
          <div className="assistant-character-text">
            <span className="assistant-character-name">{name.trim() || "Is"}</span>
            <span className="assistant-character-mood">{t(`settings.assistant.mood.${mood}`)}</span>
            <span className="assistant-character-hint">
              {forced ? t("settings.assistant.character.preview") : t("settings.assistant.character.auto")}
            </span>
          </div>
        </div>
        <div className="assistant-character-moods" role="group" aria-label={t("settings.assistant.moods")}>
          {MOODS.map((option) => (
            <button
              key={option}
              type="button"
              className={`assistant-mood-chip ${option === mood ? "is-active" : ""}`}
              aria-pressed={option === mood}
              onClick={() => {
                // « Repos » rend le personnage à lui-même : il cligne, il
                // regarde, il s'endort si on le laisse.
                setForced(option === "idle" ? null : option);
                setDozing(false);
                lastMoveRef.current = Date.now();
              }}
            >
              {t(`settings.assistant.mood.${option}`)}
            </button>
          ))}
        </div>
      </div>

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

      <div className="setting-group-label">{t("ai.settings.title")}</div>
      <div className="setting-group">
        <AiSettingsGroup />
      </div>
    </>
  );
}

/**
 * L'assistance IA : le consentement, l'adresse, et rien de plus.
 *
 * Ce bloc vit dans cet onglet plutôt que dans un onglet à part parce qu'il
 * configure la même chose : ce qu'Is a le droit de faire. Il lit et écrit ses
 * propres clés, comme le reste de ce fichier, et laisse le panneau du notch
 * décider quand poser une question.
 *
 * **Éteint à l'installation.** Le paragraphe de consentement n'apparaît qu'une
 * fois le réglage allumé : il décrit alors ce qui part vraiment, et vers où.
 */
function AiSettingsGroup() {
  const t = useT();
  const [enabled, setEnabled] = useState(() => localStorage.getItem("islet-ai-enabled") === "true");
  const [endpoint, setEndpoint] = useState(
    () => localStorage.getItem("islet-ai-endpoint") || DEFAULT_ENDPOINT
  );
  const [model, setModel] = useState(() => localStorage.getItem("islet-ai-model") || DEFAULT_MODEL);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; detail: string } | null>(null);

  const local = isLocalEndpoint(endpoint);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    saveSetting("islet-ai-enabled", String(next));
    setTest(null);
  };

  const commitEndpoint = () => {
    const clean = normalizeEndpoint(endpoint);
    setEndpoint(clean);
    saveSetting("islet-ai-endpoint", clean);
  };

  const commitModel = () => {
    const clean = model.trim() === "" ? DEFAULT_MODEL : model.trim();
    setModel(clean);
    saveSetting("islet-ai-model", clean);
  };

  /**
   * Une question minuscule, pour savoir si le fournisseur répond.
   *
   * C'est le seul bouton de cet écran qui envoie quelque chose, et il faut le
   * cliquer : c'est exactement la règle du module.
   */
  const runTest = async () => {
    if (testing) return;
    setTesting(true);
    setTest(null);
    const started = Date.now();
    try {
      const body = buildChatBody(model, buildMessages("explain", "error: test", "fr"));
      const raw = await invoke<{ ok: boolean; status: number; body: string }>("ai_post", {
        url: chatUrl(endpoint),
        body,
      });
      if (!raw.ok) {
        setTest({ ok: false, detail: `HTTP ${raw.status}` });
      } else if (parseAnswer(raw.body) === null) {
        setTest({ ok: false, detail: t("ai.error.empty") });
      } else {
        setTest({ ok: true, detail: String(Date.now() - started) });
      }
    } catch (failure) {
      setTest({ ok: false, detail: String(failure).replace(/^Error: /, "") });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <SettingRow
        icon={Sparkles}
        label={t("ai.settings.enable")}
        desc={t("ai.settings.enable.desc")}
        divider={!enabled}
      >
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={toggle} />
          <span className="slider"></span>
        </label>
      </SettingRow>

      {enabled && (
        <>
          {/* Le consentement se lit comme une phrase, pas comme un libellé de
              réglage : c'est ce qui part, vers où, et quand. */}
          <div className="ai-consent">
            <span>{t("ai.settings.consent")}</span>
            <span className={`ai-scope ${local ? "is-local" : "is-remote"}`}>
              {local ? <WifiOff size={11} strokeWidth={2.4} /> : <Wifi size={11} strokeWidth={2.4} />}
              {local ? t("ai.settings.local") : t("ai.settings.remote")}
            </span>
          </div>

          <SettingRow icon={Plug} label={t("ai.settings.endpoint")} desc={t("ai.settings.endpoint.desc")}>
            <input
              className="ai-field"
              type="text"
              value={endpoint}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setEndpoint(event.target.value)}
              onBlur={commitEndpoint}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </SettingRow>

          <SettingRow icon={Sparkles} label={t("ai.settings.model")} desc={t("ai.settings.model.desc")}>
            <input
              className="ai-field"
              type="text"
              value={model}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setModel(event.target.value)}
              onBlur={commitModel}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </SettingRow>

          <SettingRow icon={Plug} label={t("ai.settings.test")} divider={false}>
            <div className="ai-test-row">
              <button type="button" className="settings-inline-btn" onClick={runTest} disabled={testing}>
                {t("ai.settings.test")}
              </button>
              {test && (
                <span className="ai-test-result">
                  {test.ok
                    ? t("ai.settings.test.ok", { ms: test.detail })
                    : t("ai.settings.test.ko", { detail: test.detail })}
                </span>
              )}
            </div>
          </SettingRow>
        </>
      )}
    </>
  );
}
