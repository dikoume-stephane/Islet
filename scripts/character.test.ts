import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLINK_DURATION_MS,
  frameFor,
  gazeVector,
  INITIAL_IS,
  isBlinking,
  MOODS,
  moodForSeverity,
  nextBlinkDelay,
  reduceIs,
  shouldSleep,
  SLEEP_AFTER_MS,
  type IsState,
} from "../src/lib/character.ts";

/**
 * Le personnage d'Is.
 *
 * Ce qui se vérifie ici, c'est que chaque humeur répond à quelque chose : un
 * conseil, un survol, un silence. Une animation qui ne dépend de rien est une
 * animation qui ment.
 */

const tip = (severity: "info" | "warn" | "critical"): IsState =>
  reduceIs(INITIAL_IS, { type: "tip", severity });

describe("moodForSeverity", () => {
  it("sourit pour un conseil sans conséquence", () => {
    assert.equal(moodForSeverity("info"), "happy");
  });

  it("écarquille les yeux pour un avertissement", () => {
    assert.equal(moodForSeverity("warn"), "alert");
  });

  it("écarquille aussi les yeux pour un conseil critique", () => {
    assert.equal(moodForSeverity("critical"), "alert");
  });
});

describe("reduceIs", () => {
  it("part au repos, sans signal", () => {
    assert.deepEqual(INITIAL_IS, { mood: "idle", signal: "none" });
  });

  it("adopte l'humeur du conseil qui arrive", () => {
    assert.deepEqual(tip("info"), { mood: "happy", signal: "tip" });
    assert.deepEqual(tip("critical"), { mood: "alert", signal: "tip" });
  });

  it("se penche quand un conseil attend d'être vu", () => {
    assert.deepEqual(reduceIs(INITIAL_IS, { type: "unread" }), { mood: "listening", signal: "unread" });
  });

  it("revient au repos quand le conseil est fermé", () => {
    assert.deepEqual(reduceIs(tip("warn"), { type: "dismiss" }), { mood: "idle", signal: "none" });
  });

  it("se penche au survol", () => {
    assert.deepEqual(reduceIs(INITIAL_IS, { type: "hover" }), { mood: "listening", signal: "none" });
  });

  it("ne change pas de visage pendant la lecture d'un conseil", () => {
    const alert = tip("critical");
    assert.deepEqual(reduceIs(alert, { type: "hover" }), alert);
  });

  it("garde le conseil affiché quand le curseur s'en va", () => {
    const alert = tip("warn");
    assert.deepEqual(reduceIs(alert, { type: "leave" }), { mood: "alert", signal: "tip" });
  });

  it("reste aux aguets après le départ du curseur s'il y a un non-lu", () => {
    const unread = reduceIs(INITIAL_IS, { type: "unread" });
    assert.deepEqual(reduceIs(unread, { type: "leave" }), { mood: "listening", signal: "unread" });
  });

  it("revient au repos après le départ du curseur, sans rien à dire", () => {
    const hovered = reduceIs(INITIAL_IS, { type: "hover" });
    assert.deepEqual(reduceIs(hovered, { type: "leave" }), { mood: "idle", signal: "none" });
  });

  it("réfléchit sans perdre son signal", () => {
    const unread = reduceIs(INITIAL_IS, { type: "unread" });
    assert.deepEqual(reduceIs(unread, { type: "think" }), { mood: "thinking", signal: "unread" });
  });

  it("se repose en restant aux aguets si un conseil attend", () => {
    const unread = reduceIs(INITIAL_IS, { type: "unread" });
    assert.deepEqual(reduceIs(unread, { type: "settle" }), { mood: "listening", signal: "unread" });
  });

  it("s'endort sans perdre son signal", () => {
    assert.deepEqual(reduceIs(tip("info"), { type: "sleep" }), { mood: "sleeping", signal: "tip" });
  });

  it("se réveille au repos", () => {
    const asleep = reduceIs(INITIAL_IS, { type: "sleep" });
    assert.deepEqual(reduceIs(asleep, { type: "wake" }), { mood: "idle", signal: "none" });
  });

  it("se réveille aux aguets si un conseil attend", () => {
    const unread = reduceIs(INITIAL_IS, { type: "unread" });
    const asleep = reduceIs(unread, { type: "sleep" });
    assert.deepEqual(reduceIs(asleep, { type: "wake" }), { mood: "listening", signal: "unread" });
  });

  it("ne réveille pas quelqu'un qui ne dort pas", () => {
    const alert = tip("warn");
    assert.deepEqual(reduceIs(alert, { type: "wake" }), alert);
  });
});

describe("frameFor", () => {
  it("donne un cadre à chaque humeur", () => {
    for (const mood of MOODS) {
      const frame = frameFor(mood);
      assert.ok(frame.breath > 0, mood);
      assert.ok(["w", "smile", "o", "flat", "sleep"].includes(frame.mouth), mood);
      assert.ok(frame.eyeOpen >= 0, mood);
      assert.ok(frame.aura >= 0 && frame.aura <= 2, mood);
    }
  });

  it("ferme les yeux pour dormir", () => {
    assert.equal(frameFor("sleeping").eyeOpen, 0);
    assert.equal(frameFor("sleeping").aura, 0);
  });

  it("écarquille les yeux quand il y a urgence", () => {
    assert.ok(frameFor("alert").eyeOpen > 1);
    assert.equal(frameFor("alert").mouth, "o");
  });

  it("sourit pour de bon quand tout va bien", () => {
    const happy = frameFor("happy");
    assert.equal(happy.mouth, "smile");
    assert.ok(happy.eyeOpen < 1);
    assert.equal(happy.blush, true);
  });

  it("respire plus vite quand ça presse", () => {
    assert.ok(frameFor("alert").breath < frameFor("idle").breath);
    assert.ok(frameFor("idle").breath < frameFor("sleeping").breath);
  });

  it("retombe sur le repos pour une humeur inconnue", () => {
    // Le catalogue peut grandir avant le dessin.
    assert.deepEqual(frameFor("inconnue" as never), frameFor("idle"));
  });
});

describe("gazeVector", () => {
  const center = { x: 100, y: 100 };

  it("ne regarde rien sans curseur", () => {
    assert.deepEqual(gazeVector(null, center), { x: 0, y: 0 });
  });

  it("ne bouge pas quand le curseur est sur l'avatar", () => {
    assert.deepEqual(gazeVector({ x: 100, y: 100 }, center), { x: 0, y: 0 });
  });

  it("regarde à droite si le curseur est à droite", () => {
    const gaze = gazeVector({ x: 200, y: 100 }, center);
    assert.ok(gaze.x > 0);
    assert.equal(gaze.y, 0);
  });

  it("regarde vers le bas si le curseur est en dessous", () => {
    const gaze = gazeVector({ x: 100, y: 220 }, center);
    assert.ok(gaze.y > 0);
  });

  it("ignore ce qui est trop loin", () => {
    assert.deepEqual(gazeVector({ x: 900, y: 900 }, center), { x: 0, y: 0 });
  });

  it("regarde plus loin ce qui est plus loin", () => {
    const near = gazeVector({ x: 140, y: 100 }, center);
    const far = gazeVector({ x: 220, y: 100 }, center);
    assert.ok(far.x > near.x);
  });

  it("ne dépasse jamais la longueur d'un vecteur unitaire", () => {
    for (let x = -300; x <= 500; x += 17) {
      for (let y = -300; y <= 500; y += 23) {
        const gaze = gazeVector({ x, y }, center);
        assert.ok(Math.hypot(gaze.x, gaze.y) <= 1.000001, `${x},${y}`);
      }
    }
  });

  it("accepte un rayon plus court", () => {
    assert.deepEqual(gazeVector({ x: 200, y: 100 }, center, 50), { x: 0, y: 0 });
    assert.ok(gazeVector({ x: 200, y: 100 }, center, 200).x > 0);
  });
});

describe("clignement", () => {
  it("tire un délai dans la fourchette", () => {
    assert.equal(nextBlinkDelay(0), 2400);
    assert.equal(nextBlinkDelay(1), 6600);
    const middle = nextBlinkDelay(0.5);
    assert.ok(middle > 2400 && middle < 6600);
  });

  it("support un tirage hors bornes", () => {
    assert.equal(nextBlinkDelay(-3), 2400);
    assert.equal(nextBlinkDelay(7), 6600);
    assert.equal(nextBlinkDelay(Number.NaN), 2400);
  });

  it("cligne pendant la durée prévue, puis rouvre", () => {
    assert.equal(isBlinking(1000, 1000), true);
    assert.equal(isBlinking(1000 + BLINK_DURATION_MS - 1, 1000), true);
    assert.equal(isBlinking(1000 + BLINK_DURATION_MS, 1000), false);
    assert.equal(isBlinking(999, 1000), false);
  });
});

describe("sommeil", () => {
  it("ne dort pas avant le seuil", () => {
    assert.equal(shouldSleep(SLEEP_AFTER_MS - 1), false);
  });

  it("dort au seuil et au-delà", () => {
    assert.equal(shouldSleep(SLEEP_AFTER_MS), true);
    assert.equal(shouldSleep(SLEEP_AFTER_MS * 3), true);
  });

  it("accepte un seuil plus court", () => {
    assert.equal(shouldSleep(5000, 4000), true);
    assert.equal(shouldSleep(3000, 4000), false);
  });

  it("ne dort pas sur une durée absurde", () => {
    assert.equal(shouldSleep(Number.NaN), false);
  });
});
