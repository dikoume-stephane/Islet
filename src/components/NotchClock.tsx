import { useEffect, useState } from "react";
import type { Stopwatch } from "../hooks/useStopwatch";
import { formatStopwatch, parseDuration } from "../clockFormat";
import { buildLaps, type Lap } from "../lib/clock";
import { useLanguage, useT } from "../i18n";

type Tab = "timer" | "stopwatch";

const TAB_KEY = "islet-clock-tab";

/** Minutes proposées : les courtes pour les pauses, 25 pour un Pomodoro. */
const PRESETS = [1, 3, 5, 10, 25, 50];

export function StopwatchReadout({ base, startedAt, precise }: { base: number; startedAt: number | null; precise: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), precise ? 50 : 250);
    return () => clearInterval(id);
  }, [startedAt, precise]);

  const ms = base + (startedAt === null ? 0 : Math.max(0, Math.max(now, startedAt) - startedAt));
  return <>{formatStopwatch(ms, precise)}</>;
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function readTab(): Tab {
  try {
    return localStorage.getItem(TAB_KEY) === "stopwatch" ? "stopwatch" : "timer";
  } catch {
    return "timer";
  }
}

/** L'heure de fin, dans la langue de l'interface et au format de la machine. */
function endsAtLabel(timestamp: number, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
  } catch {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
}

/** Écart signé avec le tour précédent, au même format que les temps de tour. */
function formatDelta(ms: number): string {
  if (Math.round(ms) === 0) return "";
  const sign = ms > 0 ? "+" : "−";
  return `${sign}${formatStopwatch(Math.abs(ms), true)}`;
}

interface Props {
  timerEnabled: boolean;
  stopwatchEnabled: boolean;
  solo: boolean;
  timerSeconds: number;
  isTimerRunning: boolean;
  isTimerFinished: boolean;
  timerEndsAt: number | null;
  timerProgress: number;
  formatTimerTime: (seconds: number) => string;
  onStartTimer: (seconds: number) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  stopwatch: Stopwatch;
  onClearLaps: () => void;
}

export function NotchClock({
  timerEnabled,
  stopwatchEnabled,
  solo,
  timerSeconds,
  isTimerRunning,
  isTimerFinished,
  timerEndsAt,
  timerProgress,
  formatTimerTime,
  onStartTimer,
  onToggleTimer,
  onResetTimer,
  stopwatch,
  onClearLaps,
}: Props) {
  const [savedTab, setSavedTab] = useState<Tab>(readTab);
  const [custom, setCustom] = useState("");
  const [invalid, setInvalid] = useState(false);

  const tab: Tab = savedTab === "stopwatch" && stopwatchEnabled ? "stopwatch" : timerEnabled ? "timer" : "stopwatch";

  const pickTab = (next: Tab) => {
    setSavedTab(next);
    remember(TAB_KEY, next);
  };

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const seconds = parseDuration(custom);
    if (seconds === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setCustom("");
    onStartTimer(seconds);
  };

  const laps: Lap[] = buildLaps(stopwatch.laps);
  // Le tour en cours n'est pas un tour : il n'est pas dans la liste, et c'est
  // normal, on ne l'a pas encore bouclé.
  const recentLaps = laps.slice().reverse();
  const t = useT();
  const language = useLanguage();
  const percent = Math.round(Math.min(1, Math.max(0, timerProgress)) * 100);
  // Aucun minuteur en mémoire : « Démarrer » n'aurait rien à démarrer, ce sont
  // les raccourcis et la saisie libre qui créent le minuteur.
  const idle = timerSeconds === 0 && !isTimerFinished;

  return (
    <div className={`timer-column${solo ? " solo" : ""}`}>
      <div className="timer-section-new">
        {timerEnabled && stopwatchEnabled && (
          <div className="clock-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "timer"} className={tab === "timer" ? "active" : ""} onClick={() => pickTab("timer")}>
              {t("clock.timer")}
            </button>
            <button
              role="tab"
              aria-selected={tab === "stopwatch"}
              className={tab === "stopwatch" ? "active" : ""}
              onClick={() => pickTab("stopwatch")}
            >
              {t("clock.stopwatch")}
            </button>
          </div>
        )}

        {tab === "timer" ? (
          <>
            <div className="timer-display-large">
              <span className={`timer-time-large${isTimerFinished ? " is-done" : ""}`} role="timer">
                {formatTimerTime(timerSeconds)}
              </span>
              <div
                className="timer-track"
                role="progressbar"
                aria-label={t("clock.progressLabel")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <span className="timer-track-fill" style={{ transform: `scaleX(${Math.min(1, Math.max(0, timerProgress))})` }} />
              </div>
              {isTimerFinished ? (
                <span className="timer-sub is-done">{t("clock.done")}</span>
              ) : isTimerRunning && timerEndsAt !== null ? (
                <span className="timer-sub">{t("clock.endsAt", { time: endsAtLabel(timerEndsAt, language) })}</span>
              ) : null}
            </div>

            <div className="timer-controls-new">
              <button onClick={onToggleTimer} className="timer-btn primary" disabled={idle}>
                {isTimerRunning ? t("clock.pause") : isTimerFinished ? t("clock.restart") : t("clock.start")}
              </button>
              <button onClick={onResetTimer} className="timer-btn secondary">
                {t("clock.reset")}
              </button>
            </div>

            <div className="timer-presets-new">
              {PRESETS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => onStartTimer(mins * 60)}
                  className="preset-btn-small"
                  aria-label={t("clock.presetAria", { minutes: mins })}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <form className={`timer-custom${invalid ? " invalid" : ""}`} onSubmit={submitCustom}>
              <input
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setInvalid(false);
                }}
                placeholder={t("clock.customPlaceholder")}
                spellCheck={false}
                aria-label={t("clock.customLabel")}
                aria-invalid={invalid}
              />
              <button type="submit" disabled={!custom.trim()}>
                {t("clock.go")}
              </button>
            </form>

            {/* Une seule annonce à la fin, pas une par seconde. */}
            <span className="sr-only" aria-live="polite">
              {isTimerFinished ? t("clock.done") : ""}
            </span>
          </>
        ) : (
          <>
            <div className="timer-display-large">
              <span className="timer-time-large timer-time-precise">
                <StopwatchReadout base={stopwatch.base} startedAt={stopwatch.startedAt} precise />
              </span>
            </div>

            <div className="timer-controls-new">
              <button onClick={stopwatch.toggle} className="timer-btn primary">
                {stopwatch.running ? t("clock.pause") : t("clock.start")}
              </button>
              <button onClick={stopwatch.lap} className="timer-btn secondary" disabled={!stopwatch.running && stopwatch.base === 0}>
                {t("clock.lap")}
              </button>
              <button onClick={stopwatch.reset} className="timer-btn secondary">
                {t("clock.reset")}
              </button>
            </div>

            <div className="sw-laps-head">
              <span className="sw-laps-title">
                {laps.length > 0 ? t("clock.lapsTitle", { count: laps.length }) : t("clock.lapsHint")}
              </span>
              {laps.length > 0 && (
                <button className="sw-laps-clear" onClick={onClearLaps}>
                  {t("clock.clearLaps")}
                </button>
              )}
            </div>

            <div className="sw-laps" aria-live="polite">
              {recentLaps.map((lap) => (
                <div key={lap.index} className={`sw-lap${lap.best ? " is-best" : lap.worst ? " is-worst" : ""}`}>
                  <span>#{lap.index}</span>
                  <span className="sw-lap-split">{formatStopwatch(lap.splitMs, true)}</span>
                  <span className="sw-lap-delta">{formatDelta(lap.deltaMs)}</span>
                  {lap.best && <span className="sr-only">{t("clock.bestLap")}</span>}
                  {lap.worst && <span className="sr-only">{t("clock.worstLap")}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
