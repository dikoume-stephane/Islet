import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_TIMER,
  MAX_LAPS,
  MAX_TIMER_MS,
  addLap,
  buildLaps,
  clampDuration,
  decodeStopwatch,
  decodeTimer,
  elapsedRatio,
  encodeStopwatch,
  encodeTimer,
  formatCountdown,
  lapStats,
  modeOf,
  parseTimerInput,
  pauseTimer,
  remainingOf,
  resumeTimer,
  startTimer,
  stopwatchElapsed,
  type StopwatchState,
  type TimerState,
} from "../src/lib/clock.ts";

/**
 * Le chronomètre et le minuteur.
 *
 * Un minuteur se vérifie mal à l'œil : il faut attendre vingt-cinq minutes pour
 * voir la fin. Ici le temps est un paramètre, alors on teste ce qui se casse en
 * vrai : la pause qui perd des secondes, la machine en veille, la cible périmée
 * après un redémarrage, les tours jamais marqués.
 */

const NOW = 1_700_000_000_000;

const timer = (overrides: Partial<TimerState> = {}): TimerState => ({
  totalMs: 25 * 60_000,
  endsAt: NOW + 25 * 60_000,
  heldMs: 0,
  ...overrides,
});

describe("formatCountdown", () => {
  it("affiche les minutes et les secondes", () => {
    assert.equal(formatCountdown(25 * 60_000), "25:00");
    assert.equal(formatCountdown(90_000), "1:30");
    assert.equal(formatCountdown(45_000), "0:45");
  });

  it("arrondit vers le haut, pour ne pas afficher 0:29 dès la première seconde", () => {
    assert.equal(formatCountdown(29_001), "0:30");
    assert.equal(formatCountdown(29_999), "0:30");
    assert.equal(formatCountdown(30_000), "0:30");
    assert.equal(formatCountdown(1), "0:01");
  });

  it("passe à l'heure au-delà de 60 minutes", () => {
    assert.equal(formatCountdown(3600_000), "1:00:00");
    assert.equal(formatCountdown(3600_000 + 5 * 60_000 + 3_000), "1:05:03");
    assert.equal(formatCountdown(99 * 3600_000), "99:00:00");
  });

  it("ne descend jamais sous zéro", () => {
    assert.equal(formatCountdown(0), "0:00");
    assert.equal(formatCountdown(-5_000), "0:00");
    assert.equal(formatCountdown(Number.NaN), "0:00");
  });
});

describe("parseTimerInput", () => {
  it("lit un nombre seul comme des minutes", () => {
    assert.equal(parseTimerInput("25"), 25 * 60_000);
    assert.equal(parseTimerInput(" 1 "), 60_000);
  });

  it("lit les formes minutes:secondes et heures:minutes:secondes", () => {
    assert.equal(parseTimerInput("1:30"), 90_000);
    assert.equal(parseTimerInput("0:45:00"), 45 * 60_000);
    assert.equal(parseTimerInput("2:00:00"), 2 * 3600_000);
  });

  it("refuse ce qui n'est pas une durée", () => {
    for (const raw of ["", "abc", "1:75", "1:2:75", "0", "-5", "1.5"]) {
      assert.equal(parseTimerInput(raw), null, raw);
    }
  });

  it("refuse au-delà de 99 heures, comme la saisie d'origine", () => {
    assert.equal(parseTimerInput("6000"), null);
    assert.equal(parseTimerInput("99"), 99 * 60_000);
  });
});

describe("startTimer", () => {
  it("range une cible absolue et non un compteur", () => {
    const state = startTimer(10 * 60_000, NOW);
    assert.equal(state.endsAt, NOW + 10 * 60_000);
    assert.equal(state.heldMs, 0);
    assert.equal(remainingOf(state, NOW), 10 * 60_000);
  });

  it("ne démarre rien avec une durée nulle ou absurde", () => {
    assert.deepEqual(startTimer(0, NOW), EMPTY_TIMER);
    assert.deepEqual(startTimer(-1_000, NOW), EMPTY_TIMER);
    assert.deepEqual(startTimer(Number.NaN, NOW), EMPTY_TIMER);
  });

  it("plafonne une durée déraisonnable", () => {
    assert.equal(startTimer(5000 * 3600_000, NOW).totalMs, MAX_TIMER_MS);
  });
});

describe("modeOf et le temps qui passe", () => {
  it("distingue les quatre états", () => {
    assert.equal(modeOf(EMPTY_TIMER, NOW), "idle");
    assert.equal(modeOf(timer(), NOW), "running");
    assert.equal(modeOf(timer({ endsAt: null, heldMs: 60_000 }), NOW), "paused");
    assert.equal(modeOf(timer(), NOW + 26 * 60_000), "finished");
  });

  it("reste juste après une mise en veille", () => {
    const state = startTimer(10 * 60_000, NOW);
    // La machine dort huit minutes : aucun intervalle ne tourne, et pourtant.
    assert.equal(remainingOf(state, NOW + 8 * 60_000), 2 * 60_000);
    assert.equal(modeOf(state, NOW + 8 * 60_000), "running");
    // Puis deux minutes de plus : c'est fini, sans dérive accumulée.
    assert.equal(modeOf(state, NOW + 10 * 60_000), "finished");
    assert.equal(remainingOf(state, NOW + 30 * 60_000), 0);
  });

  it("ne rend jamais un reste négatif", () => {
    assert.equal(remainingOf(timer({ endsAt: NOW - 1 }), NOW), 0);
    assert.equal(remainingOf(timer({ endsAt: null, heldMs: -50 }), NOW), 0);
  });
});

describe("pause et reprise", () => {
  it("gèle le reste exact au moment de la pause", () => {
    const paused = pauseTimer(startTimer(60_000, NOW), NOW + 20_500);
    assert.equal(paused.endsAt, null);
    assert.equal(paused.heldMs, 39_500);
    assert.equal(modeOf(paused, NOW + 10 * 60_000), "paused");
    assert.equal(remainingOf(paused, NOW + 10 * 60_000), 39_500);
  });

  it("repart depuis le reste gelé, pas depuis le début", () => {
    const paused = pauseTimer(startTimer(60_000, NOW), NOW + 20_000);
    const resumed = resumeTimer(paused, NOW + 5 * 60_000);
    assert.equal(resumed.endsAt, NOW + 5 * 60_000 + 40_000);
    assert.equal(resumed.heldMs, 0);
    assert.equal(modeOf(resumed, NOW + 5 * 60_000), "running");
  });

  it("ne touche pas à un minuteur qui n'est pas dans l'état attendu", () => {
    const running = timer();
    assert.deepEqual(resumeTimer(running, NOW), running);
    const finished = timer({ endsAt: NOW - 1 });
    assert.deepEqual(pauseTimer(finished, NOW), finished);
  });

  it("une pause à zéro est un minuteur fini, pas une pause", () => {
    const done = pauseTimer(startTimer(1_000, NOW), NOW + 1_000);
    assert.equal(modeOf(done, NOW + 2_000), "finished");
  });
});

describe("elapsedRatio", () => {
  it("va de 0 à 1 et s'y arrête", () => {
    const state = startTimer(100_000, NOW);
    assert.equal(elapsedRatio(state, NOW), 0);
    assert.equal(elapsedRatio(state, NOW + 25_000), 0.25);
    assert.equal(elapsedRatio(state, NOW + 100_000), 1);
    assert.equal(elapsedRatio(state, NOW + 900_000), 1);
  });

  it("vaut zéro sans minuteur", () => {
    assert.equal(elapsedRatio(EMPTY_TIMER, NOW), 0);
  });
});

describe("persistance du minuteur", () => {
  it("fait l'aller-retour", () => {
    const state = startTimer(5 * 60_000, NOW);
    const back = decodeTimer(encodeTimer(state), NOW + 60_000);
    assert.deepEqual(back, state);
    assert.equal(remainingOf(back!, NOW + 60_000), 4 * 60_000);
  });

  it("garde un minuteur en pause", () => {
    const paused = pauseTimer(startTimer(5 * 60_000, NOW), NOW + 60_000);
    const back = decodeTimer(encodeTimer(paused), NOW + 3 * 600_000);
    assert.equal(back?.heldMs, 4 * 60_000);
    assert.equal(modeOf(back!, NOW + 3 * 600_000), "paused");
  });

  it("sert un minuteur redémarré après la fin, comme fini", () => {
    const back = decodeTimer(encodeTimer(startTimer(60_000, NOW)), NOW + 120_000);
    assert.equal(modeOf(back!, NOW + 120_000), "finished");
    assert.equal(remainingOf(back!, NOW + 120_000), 0);
  });

  it("oublie une cible de plus d'un jour", () => {
    const raw = encodeTimer(startTimer(60_000, NOW));
    assert.notEqual(decodeTimer(raw, NOW + 23 * 3600_000), null);
    assert.equal(decodeTimer(raw, NOW + 25 * 3600_000), null);
  });

  it("refuse une cible dans un futur impossible", () => {
    assert.equal(decodeTimer(JSON.stringify({ v: 1, t: 60_000, e: NOW + 200 * 3600_000, h: 0 }), NOW), null);
  });

  it("refuse tout ce qui n'est pas un état valide", () => {
    for (const raw of [
      "",
      "pas du json",
      "[]",
      "null",
      JSON.stringify({ v: 1, t: 0, e: NOW + 1000, h: 0 }),
      JSON.stringify({ v: 1, t: -5, e: NOW + 1000, h: 0 }),
      JSON.stringify({ v: 1, t: "25", e: NOW + 1000, h: 0 }),
      JSON.stringify({ v: 1, t: 60_000, e: null, h: 0 }),
      JSON.stringify({ v: 1, t: 60_000, e: "demain", h: 0 }),
    ]) {
      assert.equal(decodeTimer(raw, NOW), null, raw);
    }
  });

  it("ramène un reste gelé dans les bornes de sa durée", () => {
    const back = decodeTimer(JSON.stringify({ v: 1, t: 60_000, e: null, h: 90 * 60_000 }), NOW);
    assert.equal(back?.heldMs, 60_000);
  });
});

describe("chronomètre", () => {
  const watch = (overrides: Partial<StopwatchState> = {}): StopwatchState => ({
    baseMs: 0,
    startedAt: null,
    laps: [],
    ...overrides,
  });

  it("additionne le temps accumulé et le segment en cours", () => {
    assert.equal(stopwatchElapsed(watch({ baseMs: 5_000, startedAt: NOW }), NOW + 3_000), 8_000);
    assert.equal(stopwatchElapsed(watch({ baseMs: 5_000, startedAt: null }), NOW + 3_000), 5_000);
  });

  it("reste juste après une veille", () => {
    const state = watch({ startedAt: NOW });
    assert.equal(stopwatchElapsed(state, NOW + 3600_000), 3600_000);
  });

  it("ne compte pas à l'envers si l'horloge recule", () => {
    assert.equal(stopwatchElapsed(watch({ startedAt: NOW }), NOW - 10_000), 0);
  });

  it("ajoute les tours dans l'ordre et les plafonne", () => {
    let state = watch({ startedAt: NOW });
    state = addLap(state, NOW + 1_000);
    state = addLap(state, NOW + 3_000);
    assert.deepEqual(state.laps, [1_000, 3_000]);

    const many = watch({ startedAt: NOW, laps: Array.from({ length: MAX_LAPS }, (_, i) => i + 1) });
    const capped = addLap(many, NOW + 1_000_000);
    assert.equal(capped.laps.length, MAX_LAPS);
    assert.equal(capped.laps[capped.laps.length - 1], 1_000_000);
  });

  it("fait l'aller-retour et garde les tours", () => {
    const state = watch({ baseMs: 2_000, startedAt: NOW, laps: [1_000, 2_500] });
    assert.deepEqual(decodeStopwatch(encodeStopwatch(state), NOW + 500), state);
  });

  it("refuse un départ dans un futur lointain ou un passé impossible", () => {
    assert.equal(decodeStopwatch(JSON.stringify({ v: 1, b: 0, s: NOW + 600_000, l: [] }), NOW), null);
    assert.equal(decodeStopwatch(JSON.stringify({ v: 1, b: 0, s: NOW - 200 * 3600_000, l: [] }), NOW), null);
  });

  it("refuse des tours qui ne sont pas des nombres positifs", () => {
    for (const laps of [["1"], [Number.NaN], [-3], "3"]) {
      const raw = JSON.stringify({ v: 1, b: 0, s: null, l: laps });
      assert.equal(decodeStopwatch(raw, NOW), null, JSON.stringify(laps));
    }
  });

  it("refuse un état complet illisible", () => {
    for (const raw of ["", "nope", "{}", JSON.stringify({ b: -1, s: null, l: [] })]) {
      assert.equal(decodeStopwatch(raw, NOW), null, raw);
    }
  });

  it("remet les tours dans l'ordre en les relisant", () => {
    const back = decodeStopwatch(JSON.stringify({ v: 1, b: 0, s: null, l: [3_000, 1_000, 2_000] }), NOW);
    assert.deepEqual(back?.laps, [1_000, 2_000, 3_000]);
  });
});

describe("buildLaps", () => {
  it("découpe des temps cumulés en temps intermédiaires", () => {
    const laps = buildLaps([1_000, 3_500, 4_000]);
    assert.deepEqual(laps.map((lap) => lap.splitMs), [1_000, 2_500, 500]);
    assert.deepEqual(laps.map((lap) => lap.totalMs), [1_000, 3_500, 4_000]);
    assert.deepEqual(laps.map((lap) => lap.index), [1, 2, 3]);
  });

  it("mesure l'écart avec le tour précédent, nul pour le premier", () => {
    const laps = buildLaps([1_000, 3_500, 4_000]);
    assert.deepEqual(laps.map((lap) => lap.deltaMs), [0, 1_500, -2_000]);
  });

  it("ne désigne personne avant trois tours", () => {
    assert.deepEqual(buildLaps([1_000]).map((l) => [l.best, l.worst]), [[false, false]]);
    assert.deepEqual(buildLaps([1_000, 2_000]).map((l) => [l.best, l.worst]), [
      [false, false],
      [false, false],
    ]);
  });

  it("marque le meilleur et le pire à partir de trois tours", () => {
    // 2 s, puis 1 s, puis 3 s : le deuxième tour est le meilleur, le troisième le pire.
    const laps = buildLaps([2_000, 3_000, 6_000]);
    assert.deepEqual(laps.map((l) => l.splitMs), [2_000, 1_000, 3_000]);
    assert.deepEqual(laps.map((l) => l.best), [false, true, false]);
    assert.deepEqual(laps.map((l) => l.worst), [false, false, true]);
  });

  it("départage les ex æquo par le premier tour arrivé", () => {
    // 1 s, 3 s, 1 s : deux meilleurs tours, un seul est marqué.
    const laps = buildLaps([1_000, 4_000, 5_000]);
    assert.deepEqual(laps.map((l) => l.best), [true, false, false]);
    assert.deepEqual(laps.map((l) => l.worst), [false, true, false]);
  });

  it("ne distingue personne quand tous les tours sont identiques", () => {
    const laps = buildLaps([1_000, 2_000, 3_000]);
    assert.deepEqual(laps.map((l) => l.best), [false, false, false]);
    assert.deepEqual(laps.map((l) => l.worst), [false, false, false]);
  });

  it("ignore les valeurs qui ne sont pas des temps", () => {
    const laps = buildLaps([1_000, Number.NaN, -5, 3_000]);
    assert.deepEqual(laps.map((lap) => lap.splitMs), [1_000, 2_000]);
  });

  it("ne rend pas de temps négatif si les totaux reculent", () => {
    const laps = buildLaps([5_000, 1_000]);
    assert.deepEqual(laps.map((lap) => lap.splitMs), [5_000, 0]);
  });
});

describe("lapStats", () => {
  it("résume des tours", () => {
    const stats = lapStats([1_000, 3_000, 6_000]);
    assert.deepEqual(stats, { count: 3, bestMs: 1_000, worstMs: 3_000, averageMs: 2_000 });
  });

  it("ne résume rien sans tour", () => {
    assert.deepEqual(lapStats([]), { count: 0, bestMs: null, worstMs: null, averageMs: null });
  });
});

describe("clampDuration", () => {
  it("borne dans les deux sens", () => {
    assert.equal(clampDuration(-2_000), 0);
    assert.equal(clampDuration(1_000.4), 1_000);
    assert.equal(clampDuration(MAX_TIMER_MS * 2), MAX_TIMER_MS);
    assert.equal(clampDuration(Number.POSITIVE_INFINITY), 0);
  });
});
