import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampFocusMinutes,
  decodeFocusMinutes,
  DEFAULT_FOCUS_MINUTES,
  encodeFocusMinutes,
  FOCUS_PRESETS,
  focusActive,
  focusSeconds,
  MAX_FOCUS_MINUTES,
} from "../src/lib/focus.ts";

/**
 * Le mode focus.
 *
 * Presque tout se joue sur la relecture : la marque posée dans le stockage
 * local doit rendre l'app muette pendant la session, et surtout pas après.
 */

describe("les durées", () => {
  it("propose trois durées, de la plus courte à la plus longue", () => {
    assert.deepEqual([...FOCUS_PRESETS], [25, 45, 90]);
    assert.ok(FOCUS_PRESETS.includes(DEFAULT_FOCUS_MINUTES));
  });

  it("ramène une durée absurde dans les bornes", () => {
    assert.equal(clampFocusMinutes(-5), 5);
    assert.equal(clampFocusMinutes(0), 5);
    assert.equal(clampFocusMinutes(999), MAX_FOCUS_MINUTES);
    assert.equal(clampFocusMinutes(7.6), 8);
  });

  it("remplace une durée illisible par la valeur par défaut", () => {
    assert.equal(clampFocusMinutes(Number.NaN), DEFAULT_FOCUS_MINUTES);
    assert.equal(clampFocusMinutes(Number.POSITIVE_INFINITY), DEFAULT_FOCUS_MINUTES);
  });

  it("convertit en secondes ce que le minuteur attend", () => {
    assert.equal(focusSeconds(25), 1500);
    assert.equal(focusSeconds(45), 2700);
    assert.equal(focusSeconds(0), focusSeconds(5));
  });
});

describe("la marque de session", () => {
  it("ne rend rien quand il n'y a pas de session", () => {
    assert.equal(decodeFocusMinutes(null), null);
    assert.equal(decodeFocusMinutes(undefined), null);
    assert.equal(decodeFocusMinutes(""), null);
    assert.equal(decodeFocusMinutes("   "), null);
  });

  it("refuse ce qui ne se lit pas comme une durée", () => {
    assert.equal(decodeFocusMinutes("abc"), null);
    assert.equal(decodeFocusMinutes("25 min"), null);
    assert.equal(decodeFocusMinutes("-25"), null);
    assert.equal(decodeFocusMinutes("0"), null);
    assert.equal(decodeFocusMinutes("3"), null);
  });

  it("relit une durée valable", () => {
    assert.equal(decodeFocusMinutes("25"), 25);
    assert.equal(decodeFocusMinutes(" 45 "), 45);
    assert.equal(decodeFocusMinutes("999"), MAX_FOCUS_MINUTES);
  });

  it("écrit ce qu'il peut relire", () => {
    for (const minutes of FOCUS_PRESETS) {
      assert.equal(decodeFocusMinutes(encodeFocusMinutes(minutes)), minutes);
    }
    assert.equal(decodeFocusMinutes(encodeFocusMinutes(999)), MAX_FOCUS_MINUTES);
  });
});

describe("l'état de la session", () => {
  it("n'est active que si un minuteur tourne", () => {
    assert.equal(focusActive(25, false, false), false);
    assert.equal(focusActive(25, true, false), true);
  });

  it("tient pendant une pause : une interruption n'est pas un abandon", () => {
    assert.equal(focusActive(25, false, false, true), true);
  });

  it("tombe dès que le minuteur est terminé", () => {
    assert.equal(focusActive(25, true, true), false);
    assert.equal(focusActive(25, false, true), false);
    assert.equal(focusActive(25, false, true, false), false);
  });

  it("ne s'active pas sans marque, même avec un minuteur qui tourne", () => {
    assert.equal(focusActive(null, true, false), false);
  });
});
