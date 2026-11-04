import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudOff,
  Download,
  HardDrive,
  Monitor,
  Moon,
  Palette,
  PanelTop,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import { applyTheme } from "../theme";
import "./Onboarding.css";

/**
 * First-run welcome.
 *
 * Shown inside the existing Settings window rather than a sixth Tauri
 * entry-point: same chrome, same components, one less webview to keep alive.
 *
 * Rules this screen obeys:
 *  - Never blocking. "Passer" leaves at any step; the app is already running
 *    behind the window.
 *  - Every choice is written as it is made, so a crash mid-way keeps whatever
 *    was already chosen.
 *  - It ends by writing `islet-onboarded`, and that write is the only thing
 *    that makes it disappear for good.
 */

const STEPS = ["welcome", "look", "home", "privacy", "done"] as const;

const DEFAULT_ACCENT = "#007aff";
const THEME_ACCENTS = ["#007aff", "#bf5af2", "#ff375f", "#30d158", "#ff9f0a", "#ffd60a"];

/** Write a setting the same way the rest of the app does: local, then Rust. */
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private-mode quota: the Rust write below still wins.
  }
  invoke("save_setting", { key, value }).catch(() => {});
}

function read(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}

interface OnboardingProps {
  /** Called once the flow is over (finished or skipped). */
  onFinish: () => void;
}

export function Onboarding({ onFinish }: OnboardingProps) {
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  // — Choices, read from what the app already has ─────────────────────────
  const [name, setName] = useState(() => read("islet-assistant-name", "Is"));
  const [themeMode, setThemeMode] = useState(() => read("islet-theme-mode", "dark"));
  const [accent, setAccent] = useState(() => read("islet-theme-color", DEFAULT_ACCENT));
  const [notchMode, setNotchMode] = useState(() => read("islet-notch-mode", "fixed"));
  const [dockEnabled, setDockEnabled] = useState(() => read("islet-dock-enabled", "true") !== "false");
  const [autoUpdate, setAutoUpdate] = useState(() => read("islet-auto-update", "false") === "true");

  const finish = useCallback(() => {
    save("islet-onboarded", "true");
    onFinish();
  }, [onFinish]);

  const next = useCallback(() => {
    if (stepIndex >= STEPS.length - 1) finish();
    else setStepIndex((i) => i + 1);
  }, [stepIndex, finish]);

  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  // Live theme preview: the choice is visible immediately, in this window.
  useEffect(() => {
    const opacity = Number.parseFloat(read("islet-theme-opacity", "0.8"));
    const saturation = Number.parseFloat(read("islet-theme-saturation", "0.5"));
    const brightness = Number.parseFloat(read("islet-theme-brightness", "0.15"));
    applyTheme(themeMode, accent, opacity, saturation, brightness).catch(() => {});
  }, [themeMode, accent]);

  // Enter advances. Deliberately no Escape-to-skip: losing the flow by touching
  // the wrong key is worse than a slightly slower exit.
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "Enter" && !typing) nextRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commitName = (value: string) => {
    setName(value);
    const trimmed = value.trim();
    // An empty name would leave the notch with a nameless assistant: fall back
    // to the default rather than storing nothing.
    save("islet-assistant-name", trimmed === "" ? "Is" : trimmed);
  };

  const pickTheme = (mode: string) => {
    setThemeMode(mode);
    save("islet-theme-mode", mode);
  };

  const pickAccent = (hex: string) => {
    setAccent(hex);
    save("islet-theme-color", hex);
  };

  const pickNotch = (mode: string) => {
    setNotchMode(mode);
    save("islet-notch-mode", mode);
  };

  const toggleDock = () => {
    const nextValue = !dockEnabled;
    setDockEnabled(nextValue);
    save("islet-dock-enabled", String(nextValue));
  };

  const toggleAutoUpdate = () => {
    const nextValue = !autoUpdate;
    setAutoUpdate(nextValue);
    save("islet-auto-update", String(nextValue));
  };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.18 },
      };

  const summary = useMemo(
    () => [
      { label: "Assistant", value: name.trim() || "Is" },
      {
        label: "Theme",
        value:
          themeMode === "custom"
            ? "Custom accent"
            : themeMode.charAt(0).toUpperCase() + themeMode.slice(1),
      },
      { label: "Notch", value: notchMode.charAt(0).toUpperCase() + notchMode.slice(1) },
      { label: "Dock", value: dockEnabled ? "On" : "Off" },
    ],
    [name, themeMode, notchMode, dockEnabled],
  );

  return (
    <div className="onboarding">
      <div className="onboarding-scroll">
        <motion.div className="onboarding-step" key={step} {...motionProps}>
          {step === "welcome" && (
            <>
              <div className="onboarding-hero">
                <img src="/islet.png" alt="" draggable={false} />
              </div>
              <h1 className="onboarding-title">Welcome to Islet</h1>
              <p className="onboarding-lead">
                A notch and a dock, on top of your screen. Two minutes to set it up the way you
                work — and nothing is locked in afterwards.
              </p>

              <div className="onboarding-card">
                <label className="onboarding-field">
                  <span className="onboarding-field-label">What should I be called?</span>
                  <span className="onboarding-field-hint">
                    The little assistant that reads your PC and tells you about it.
                  </span>
                  <input
                    className="onboarding-input"
                    value={name}
                    maxLength={24}
                    spellCheck={false}
                    onChange={(e) => commitName(e.target.value)}
                    placeholder="Is"
                    aria-label="Assistant name"
                  />
                </label>
                <div className="onboarding-chips">
                  {["Is", "Nova", "Pico", "Kai"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`onboarding-chip ${name === preset ? "is-active" : ""}`}
                      onClick={() => commitName(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "look" && (
            <>
              <h1 className="onboarding-title">Choose a look</h1>
              <p className="onboarding-lead">
                The notch, the dock and Is all follow this. You can change it any time in
                Settings › Appearance.
              </p>

              <div className="onboarding-themes">
                <ThemeCard
                  icon={Moon}
                  label="Dark"
                  hint="The default. Blends into a dark wallpaper."
                  active={themeMode === "dark"}
                  preview="dark"
                  onClick={() => pickTheme("dark")}
                />
                <ThemeCard
                  icon={Sun}
                  label="Light"
                  hint="Frosted white, readable on bright desktops."
                  active={themeMode === "light"}
                  preview="light"
                  onClick={() => pickTheme("light")}
                />
                <ThemeCard
                  icon={Palette}
                  label="Custom"
                  hint="Your own accent colour, darkened to stay readable."
                  active={themeMode === "custom"}
                  preview="custom"
                  accent={accent}
                  onClick={() => pickTheme("custom")}
                />
                <ThemeCard
                  icon={Wand2}
                  label="Adaptive"
                  hint="Follows the Windows accent colour automatically."
                  active={themeMode === "adaptive"}
                  preview="adaptive"
                  onClick={() => pickTheme("adaptive")}
                />
              </div>

              {themeMode === "custom" && (
                <div className="onboarding-card onboarding-card--tight">
                  <span className="onboarding-field-label">Accent colour</span>
                  <div className="onboarding-swatches">
                    {THEME_ACCENTS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        className={`onboarding-swatch ${accent === hex ? "is-active" : ""}`}
                        style={{ background: hex }}
                        onClick={() => pickAccent(hex)}
                        aria-label={`Accent ${hex}`}
                      >
                        {accent === hex && <Check size={12} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === "home" && (
            <>
              <h1 className="onboarding-title">Where does it live?</h1>
              <p className="onboarding-lead">
                The notch hangs from the top of the screen. The dock replaces the Start menu strip
                at the bottom. Both can run at once.
              </p>

              <div className="setting-group-label">Top of the screen</div>
              <div className="onboarding-choice-group">
                {[
                  {
                    value: "fixed",
                    icon: PanelTop,
                    label: "Fixed",
                    hint: "Always visible. The classic notch.",
                  },
                  {
                    value: "smart",
                    icon: Sparkles,
                    label: "Smart",
                    hint: "Hides itself until the mouse reaches the top edge.",
                  },
                  {
                    value: "peek",
                    icon: Monitor,
                    label: "Peek",
                    hint: "Stays as a small pill, unfolds on hover.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`onboarding-choice ${notchMode === option.value ? "is-active" : ""}`}
                    onClick={() => pickNotch(option.value)}
                  >
                    <option.icon size={16} strokeWidth={1.6} />
                    <span className="onboarding-choice-text">
                      <span className="onboarding-choice-label">{option.label}</span>
                      <span className="onboarding-choice-hint">{option.hint}</span>
                    </span>
                    {notchMode === option.value && <Check size={14} strokeWidth={2.5} />}
                  </button>
                ))}
              </div>

              <div className="setting-group-label">Bottom of the screen</div>
              <button
                type="button"
                className={`onboarding-choice onboarding-choice--wide ${dockEnabled ? "is-active" : ""}`}
                onClick={toggleDock}
              >
                <HardDrive size={16} strokeWidth={1.6} />
                <span className="onboarding-choice-text">
                  <span className="onboarding-choice-label">Show the dock</span>
                  <span className="onboarding-choice-hint">
                    Your pinned apps, window previews and a search field, at the bottom edge.
                  </span>
                </span>
                <span className={`onboarding-toggle ${dockEnabled ? "is-on" : ""}`} aria-hidden>
                  <span className="onboarding-toggle-knob" />
                </span>
              </button>
            </>
          )}

          {step === "privacy" && (
            <>
              <h1 className="onboarding-title">What leaves your PC</h1>
              <p className="onboarding-lead">
                Almost nothing. Islet works offline; three things can reach the internet, and each
                one is yours to decide.
              </p>

              <div className="onboarding-card onboarding-card--tight">
                <div className="onboarding-privacy-row">
                  <CloudOff size={15} strokeWidth={1.6} className="onboarding-privacy-icon" />
                  <span>
                    <strong>Stays here.</strong> Battery, disks, memory, CPU, uptime, your windows,
                    your settings, what Is tells you. None of it is sent anywhere, and there is no
                    account.
                  </span>
                </div>
                <div className="onboarding-privacy-row">
                  <CloudOff size={15} strokeWidth={1.6} className="onboarding-privacy-icon" />
                  <span>
                    <strong>Weather</strong> asks a public forecast service for one city — the name
                    of it, nothing else. Off unless you set a city.
                  </span>
                </div>
                <div className="onboarding-privacy-row">
                  <CloudOff size={15} strokeWidth={1.6} className="onboarding-privacy-icon" />
                  <span>
                    <strong>Calendar sync</strong> only talks to the CalDAV server you configure
                    yourself. Off by default.
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={`onboarding-choice onboarding-choice--wide ${autoUpdate ? "is-active" : ""}`}
                onClick={toggleAutoUpdate}
              >
                <Download size={16} strokeWidth={1.6} />
                <span className="onboarding-choice-text">
                  <span className="onboarding-choice-label">Check for updates automatically</span>
                  <span className="onboarding-choice-hint">
                    Contacts GitHub on startup and downloads new versions. Installing stays
                    manual — you always get the prompt.
                  </span>
                </span>
                <span className={`onboarding-toggle ${autoUpdate ? "is-on" : ""}`} aria-hidden>
                  <span className="onboarding-toggle-knob" />
                </span>
              </button>
            </>
          )}

          {step === "done" && (
            <>
              <div className="onboarding-done-badge">
                <Check size={22} strokeWidth={2.6} />
              </div>
              <h1 className="onboarding-title">You're set</h1>
              <p className="onboarding-lead">
                Everything here is reversible: Settings › General has an entry to replay this
                screen.
              </p>

              <div className="onboarding-card onboarding-card--tight">
                <dl className="onboarding-summary">
                  {summary.map((row) => (
                    <div key={row.label} className="onboarding-summary-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <p className="onboarding-footnote">
                Next: hover the notch to open it, or right-click its icon in the tray for the same
                Settings window you are looking at.
              </p>
            </>
          )}
        </motion.div>
      </div>

      <div className="onboarding-footer">
        <div className="onboarding-dots" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`onboarding-dot ${i === stepIndex ? "is-active" : ""}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          {stepIndex > 0 && (
            <button type="button" className="onboarding-btn onboarding-btn--ghost" onClick={back}>
              <ArrowLeft size={13} strokeWidth={2.2} />
              Back
            </button>
          )}
          <button type="button" className="onboarding-btn onboarding-btn--ghost" onClick={finish}>
            Skip
          </button>
          <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={next}>
            {stepIndex === STEPS.length - 1 ? "Start using Islet" : "Continue"}
            <ArrowRight size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ThemeCardProps {
  icon: typeof Moon;
  label: string;
  hint: string;
  active: boolean;
  preview: "dark" | "light" | "custom" | "adaptive";
  accent?: string;
  onClick: () => void;
}

function ThemeCard({ icon: Icon, label, hint, active, preview, accent, onClick }: ThemeCardProps) {
  return (
    <button
      type="button"
      className={`onboarding-theme ${active ? "is-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {/* Miniature of the notch, painted with the same variables the real one
          uses, so the card cannot drift from what the user will actually get. */}
      <span
        className={`onboarding-theme-preview preview-${preview}`}
        style={accent ? ({ "--preview-accent": accent } as CSSProperties) : undefined}
      >
        <span className="onboarding-theme-notch" />
      </span>
      <span className="onboarding-theme-label">
        <Icon size={13} strokeWidth={1.8} />
        {label}
      </span>
      <span className="onboarding-theme-hint">{hint}</span>
      {active && (
        <span className="onboarding-theme-check">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
