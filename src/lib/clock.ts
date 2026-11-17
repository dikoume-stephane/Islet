/**
 * Le noyau du chronomètre et du minuteur.
 *
 * Deux règles portent tout le fichier :
 *
 * 1. **Rien ne se compte à rebours.** Un minuteur range sa cible (`endsAt`) et
 *    on la compare à l'heure qu'il est. Une machine mise en veille, une webview
 *    freinée par le système : une soustraction reste juste là où un `setInterval`
 *    qui retire une seconde par seconde finit par mentir. Même raison pour le
 *    chronomètre, qui garde son départ et jamais son total.
 * 2. **Ce qui est relu est relu avec méfiance.** Un `localStorage` survit aux
 *    versions et se modifie à la main : un état écrit par une ancienne build ne
 *    doit produire ni `NaN` affiché, ni minuteur de 900 heures, ni chronomètre
 *    qui tourne depuis 1970.
 *
 * Fichier pur : aucun import React, aucune clé i18n, aucune horloge implicite
 * (le `now` arrive toujours en paramètre, les tests peuvent le fixer).
 */
import { parseDuration } from "../clockFormat";

/** Un minuteur ne dépasse pas 99 heures, comme la saisie qui le crée. */
export const MAX_TIMER_MS = 99 * 3600 * 1000;

/** Au-delà, une cible de minuteur n'est plus une nouvelle mais une ruine. */
export const STALE_TIMER_MS = 24 * 3600 * 1000;

/** Un chronomètre qui tourne depuis plus d'une journée n'est plus un chronomètre. */
export const MAX_STOPWATCH_MS = MAX_TIMER_MS;

/** Plafond de tours : assez pour une séance, trop peu pour remplir le disque. */
export const MAX_LAPS = 200;

export type TimerMode = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  /** Durée choisie au départ, pour la jauge. */
  totalMs: number;
  /** Cible absolue quand ça tourne, `null` en pause ou à l'arrêt. */
  endsAt: number | null;
  /** Temps restant gelé quand ça ne tourne pas. */
  heldMs: number;
}

export const EMPTY_TIMER: TimerState = { totalMs: 0, endsAt: null, heldMs: 0 };

export function clampDuration(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.min(Math.max(Math.round(ms), 0), MAX_TIMER_MS);
}

export function startTimer(totalMs: number, now: number = Date.now()): TimerState {
  const total = clampDuration(totalMs);
  if (total <= 0) return EMPTY_TIMER;
  return { totalMs: total, endsAt: now + total, heldMs: 0 };
}

export function modeOf(state: TimerState, now: number = Date.now()): TimerMode {
  if (state.totalMs <= 0) return "idle";
  if (state.endsAt === null) return state.heldMs > 0 ? "paused" : "finished";
  return state.endsAt <= now ? "finished" : "running";
}

/** Millisecondes restantes, jamais négatives. */
export function remainingOf(state: TimerState, now: number = Date.now()): number {
  if (state.endsAt !== null) return Math.max(0, state.endsAt - now);
  return Math.max(0, state.heldMs);
}

export function pauseTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (modeOf(state, now) !== "running") return state;
  return { totalMs: state.totalMs, endsAt: null, heldMs: remainingOf(state, now) };
}

export function resumeTimer(state: TimerState, now: number = Date.now()): TimerState {
  if (modeOf(state, now) !== "paused") return state;
  return { totalMs: state.totalMs, endsAt: now + state.heldMs, heldMs: 0 };
}

/** Part du temps écoulée, de 0 à 1, pour la jauge. */
export function elapsedRatio(state: TimerState, now: number = Date.now()): number {
  if (state.totalMs <= 0) return 0;
  const left = remainingOf(state, now);
  return Math.min(1, Math.max(0, 1 - left / state.totalMs));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * `0:45`, `25:00`, `1:05:03`.
 *
 * On arrondit vers le haut : un minuteur de 30 secondes doit afficher `0:30`
 * pendant sa première seconde, pas `0:29`. Il affiche `0:00` seulement quand
 * c'est vraiment fini.
 */
export function formatCountdown(ms: number): string {
  const safe = Number.isFinite(ms) ? ms : 0;
  const total = Math.max(0, Math.ceil(safe / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${pad2(mins)}:${pad2(secs)}`;
  return `${mins}:${pad2(secs)}`;
}

/** « 25 » vaut 25 minutes, « 1:30 » vaut 90 secondes. `null` si illisible. */
export function parseTimerInput(text: string): number | null {
  const seconds = parseDuration(text);
  return seconds === null ? null : seconds * 1000;
}

// --- Persistance du minuteur ------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toDuration(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(value, MAX_TIMER_MS) : 0;
}

function toTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function encodeTimer(state: TimerState): string {
  return JSON.stringify({ v: 1, t: state.totalMs, e: state.endsAt, h: state.heldMs });
}

export function decodeTimer(raw: string | null | undefined, now: number = Date.now()): TimerState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  const totalMs = toDuration(data.t);
  if (totalMs <= 0) return null;
  const endsAt = toTimestamp(data.e);

  if (endsAt !== null) {
    // Une cible très ancienne n'apprend plus rien, et une cible très lointaine
    // trahit une horloge qui a reculé : dans les deux cas on repart à zéro.
    if (endsAt < now - STALE_TIMER_MS) return null;
    if (endsAt > now + MAX_TIMER_MS) return null;
    return { totalMs, endsAt, heldMs: 0 };
  }

  const heldMs = toDuration(data.h);
  if (heldMs <= 0) return null;
  return { totalMs, endsAt: null, heldMs: Math.min(heldMs, totalMs) };
}

// --- Chronomètre ------------------------------------------------------------

export interface StopwatchState {
  /** Temps accumulé avant le départ en cours. */
  baseMs: number;
  /** Départ du segment en cours, `null` à l'arrêt. */
  startedAt: number | null;
  /** Temps cumulés des tours, dans l'ordre. */
  laps: number[];
}

export const EMPTY_STOPWATCH: StopwatchState = { baseMs: 0, startedAt: null, laps: [] };

export function stopwatchElapsed(state: StopwatchState, now: number = Date.now()): number {
  const segment = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt);
  return state.baseMs + segment;
}

export function addLap(state: StopwatchState, now: number = Date.now()): StopwatchState {
  const total = stopwatchElapsed(state, now);
  const laps = [...state.laps, total].slice(-MAX_LAPS);
  return { ...state, laps };
}

export function encodeStopwatch(state: StopwatchState): string {
  return JSON.stringify({ v: 1, b: state.baseMs, s: state.startedAt, l: state.laps });
}

export function decodeStopwatch(raw: string | null | undefined, now: number = Date.now()): StopwatchState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;

  const baseMs = data.b;
  if (typeof baseMs !== "number" || !Number.isFinite(baseMs) || baseMs < 0 || baseMs > MAX_STOPWATCH_MS) return null;

  let startedAt: number | null = null;
  if (data.s !== null && data.s !== undefined) {
    if (typeof data.s !== "number" || !Number.isFinite(data.s)) return null;
    // Un peu de marge dans le futur (horloge ajustée), pas plus.
    if (data.s > now + 60_000) return null;
    if (data.s < now - MAX_STOPWATCH_MS) return null;
    startedAt = data.s;
  }

  if (!Array.isArray(data.l)) return null;
  const laps: number[] = [];
  for (const value of data.l) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
    laps.push(Math.min(value, MAX_STOPWATCH_MS));
  }
  laps.sort((a, b) => a - b);

  return { baseMs, startedAt, laps: laps.slice(-MAX_LAPS) };
}

// --- Tours ------------------------------------------------------------------

export interface Lap {
  /** Numéro affiché, à partir de 1. */
  index: number;
  totalMs: number;
  splitMs: number;
  /** Écart avec le tour précédent, 0 pour le premier. */
  deltaMs: number;
  best: boolean;
  worst: boolean;
}

/**
 * Découpe des temps cumulés en tours lisibles.
 *
 * Le meilleur et le pire ne sont marqués qu'à partir de trois tours : sur deux
 * tours, l'un est forcément le meilleur et l'autre le pire, ce qui n'apprend
 * rien. Et si tous les tours sont identiques, personne n'est distingué.
 */
export function buildLaps(totals: number[]): Lap[] {
  const clean = totals.filter((value) => Number.isFinite(value) && value >= 0);
  const splits = clean.map((total, i) => Math.max(0, total - (i === 0 ? 0 : clean[i - 1])));

  let bestIndex = -1;
  let worstIndex = -1;
  if (clean.length >= 3) {
    const min = Math.min(...splits);
    const max = Math.max(...splits);
    if (max > min) {
      bestIndex = splits.indexOf(min);
      worstIndex = splits.indexOf(max);
    }
  }

  return clean.map((total, i) => ({
    index: i + 1,
    totalMs: total,
    splitMs: splits[i],
    deltaMs: i === 0 ? 0 : splits[i] - splits[i - 1],
    best: i === bestIndex,
    worst: i === worstIndex,
  }));
}

export interface LapStats {
  count: number;
  bestMs: number | null;
  worstMs: number | null;
  averageMs: number | null;
}

export function lapStats(totals: number[]): LapStats {
  const laps = buildLaps(totals);
  if (laps.length === 0) return { count: 0, bestMs: null, worstMs: null, averageMs: null };
  const splits = laps.map((lap) => lap.splitMs);
  const sum = splits.reduce((acc, value) => acc + value, 0);
  return {
    count: laps.length,
    bestMs: Math.min(...splits),
    worstMs: Math.max(...splits),
    averageMs: Math.round(sum / splits.length),
  };
}
