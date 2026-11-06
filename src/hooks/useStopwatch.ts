import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_STOPWATCH,
  addLap,
  decodeStopwatch,
  encodeStopwatch,
  stopwatchElapsed,
  type StopwatchState,
} from "../lib/clock";

/**
 * Le chronomètre du notch.
 *
 * Comme le minuteur, il retient un **départ** et calcule le reste : le total
 * affiché ne peut pas dériver. Il est aussi relu du `localStorage` au montage,
 * donc un chronomètre lancé avant un redémarrage continue de mesurer le temps
 * réel, ce qui est le comportement attendu d'un chronomètre.
 */

const WATCH_KEY = "islet-stopwatch-state";

function readState(): StopwatchState {
  try {
    return decodeStopwatch(localStorage.getItem(WATCH_KEY), Date.now()) ?? EMPTY_STOPWATCH;
  } catch {
    return EMPTY_STOPWATCH;
  }
}

function remember(state: StopwatchState) {
  try {
    if (state.baseMs <= 0 && state.startedAt === null && state.laps.length === 0) localStorage.removeItem(WATCH_KEY);
    else localStorage.setItem(WATCH_KEY, encodeStopwatch(state));
  } catch {
    // Rien de vital : ce chronomètre est déjà à l'écran.
  }
}

export interface Stopwatch {
  base: number;
  startedAt: number | null;
  running: boolean;
  laps: number[];
  toggle: () => void;
  reset: () => void;
  lap: () => void;
  clearLaps: () => void;
}

export function useStopwatch(): Stopwatch {
  const [state, setState] = useState<StopwatchState>(readState);

  useEffect(() => {
    remember(state);
  }, [state]);

  const toggle = useCallback(() => {
    const now = Date.now();
    setState((prev) =>
      prev.startedAt === null
        ? { ...prev, startedAt: now }
        : { baseMs: stopwatchElapsed(prev, now), startedAt: null, laps: prev.laps },
    );
  }, []);

  const reset = useCallback(() => setState(EMPTY_STOPWATCH), []);

  const lap = useCallback(() => {
    const now = Date.now();
    setState((prev) => (prev.startedAt === null && prev.baseMs === 0 ? prev : addLap(prev, now)));
  }, []);

  const clearLaps = useCallback(() => setState((prev) => (prev.laps.length === 0 ? prev : { ...prev, laps: [] })), []);

  return {
    base: state.baseMs,
    startedAt: state.startedAt,
    running: state.startedAt !== null,
    laps: state.laps,
    toggle,
    reset,
    lap,
    clearLaps,
  };
}
