import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_TIMER,
  decodeTimer,
  elapsedRatio,
  encodeTimer,
  formatCountdown,
  modeOf,
  pauseTimer,
  remainingOf,
  resumeTimer,
  startTimer,
  type TimerState,
} from "../lib/clock";

/**
 * Le minuteur du notch.
 *
 * L'état rangé est une **cible absolue**, pas un compteur : l'intervalle ci-dessous
 * ne sert qu'à redessiner. Conséquence voulue, le décompte reste juste après une
 * mise en veille, une fermeture de l'app ou un redémarrage, puisque la cible est
 * relue du `localStorage` au montage.
 */

const TIMER_KEY = "islet-timer-state";

/** Quatre battements par seconde : l'affichage des secondes change à l'heure dite. */
const TICK_MS = 250;

function readState(): TimerState {
  try {
    return decodeTimer(localStorage.getItem(TIMER_KEY), Date.now()) ?? EMPTY_TIMER;
  } catch {
    return EMPTY_TIMER;
  }
}

function remember(state: TimerState) {
  try {
    if (state.totalMs <= 0) localStorage.removeItem(TIMER_KEY);
    else localStorage.setItem(TIMER_KEY, encodeTimer(state));
  } catch {
    // Stockage plein ou refusé : le minuteur de cette session vit quand même.
  }
}

export interface Countdown {
  /** Secondes restantes, arrondies au supérieur, 0 quand c'est fini. */
  remainingSeconds: number;
  /** Durée choisie, pour savoir si un minuteur existe. */
  totalSeconds: number;
  running: boolean;
  paused: boolean;
  finished: boolean;
  /** Horodatage de fin quand ça tourne, sinon `null`. */
  endsAt: number | null;
  /** Part écoulée, de 0 à 1. */
  progress: number;
  start: (seconds: number) => void;
  toggle: () => void;
  reset: () => void;
  /** Met en forme un nombre de secondes, même signature que l'ancien affichage. */
  format: (seconds: number) => string;
}

export function useCountdown(): Countdown {
  const [state, setState] = useState<TimerState>(readState);
  const [now, setNow] = useState(() => Date.now());

  const mode = modeOf(state, now);
  const running = mode === "running";

  useEffect(() => {
    remember(state);
  }, [state]);

  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback((seconds: number) => {
    const at = Date.now();
    setNow(at);
    setState(startTimer(seconds * 1000, at));
  }, []);

  const toggle = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setState((prev) => {
      switch (modeOf(prev, at)) {
        case "running":
          return pauseTimer(prev, at);
        case "paused":
          return resumeTimer(prev, at);
        case "finished":
          // Relancer un minuteur terminé le relance pour la même durée : c'est
          // ce qu'on veut après « encore cinq minutes », pas un écran à zéro.
          return startTimer(prev.totalMs, at);
        default:
          return prev;
      }
    });
  }, []);

  const reset = useCallback(() => {
    setNow(Date.now());
    setState(EMPTY_TIMER);
  }, []);

  const format = useCallback((seconds: number) => formatCountdown(seconds * 1000), []);

  return {
    remainingSeconds: Math.ceil(remainingOf(state, now) / 1000),
    totalSeconds: Math.ceil(state.totalMs / 1000),
    running,
    paused: mode === "paused",
    finished: mode === "finished",
    endsAt: state.endsAt,
    progress: elapsedRatio(state, now),
    start,
    toggle,
    reset,
    format,
  };
}
