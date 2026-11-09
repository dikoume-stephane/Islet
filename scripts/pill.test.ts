import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapsedPill,
  minimalPillActive,
  PANEL_MODES,
  PILL_BASE_WIDTH,
  PILL_MIN_WIDTH,
  PILL_MUSIC_MODULE_WIDTH,
  type PillContent,
  type PillMode,
  type PillState,
} from "../src/lib/pill.ts";

/**
 * La pilule minimale.
 *
 * Deux choses seulement sont vérifiées ici, mais ce sont celles dont une erreur
 * ne se voit pas : à quel moment le réglage s'applique, et combien de pixels le
 * notch replié occupe selon ce qu'il montre.
 */

const neutral: PillContent = {
  minimal: false,
  music: false,
  playing: false,
  visualizer: true,
  albumArt: true,
};

const state = (over: Partial<PillState> = {}): PillState => ({
  enabled: true,
  hovered: false,
  mode: "status",
  alert: false,
  ...over,
});

describe("minimalPillActive", () => {
  it("s'applique au notch au repos quand le réglage est actif", () => {
    assert.equal(minimalPillActive(state()), true);
  });

  it("ne s'applique jamais quand le réglage est coupé", () => {
    assert.equal(minimalPillActive(state({ enabled: false })), false);
  });

  it("rend la main au survol", () => {
    assert.equal(minimalPillActive(state({ hovered: true })), false);
  });

  it("rend la main quand un conseil ou une alerte occupe le notch", () => {
    assert.equal(minimalPillActive(state({ alert: true })), false);
  });

  it("s'applique aussi en mode musique, morceau chargé", () => {
    assert.equal(minimalPillActive(state({ mode: "music" })), true);
  });

  for (const mode of PANEL_MODES) {
    it(`ne s'applique pas quand le panneau « ${mode} » est ouvert`, () => {
      assert.equal(minimalPillActive(state({ mode })), false);
    });
  }

  it("ne connaît que des modes déclarés", () => {
    const declared: PillMode[] = [
      "status",
      "music",
      "calendar",
      "clipboard",
      "lyrics",
      "shelf",
      "todos",
      "dev",
      "command-center",
    ];
    for (const mode of PANEL_MODES) {
      assert.ok(declared.includes(mode), mode);
    }
  });
});

describe("collapsedPill", () => {
  it("réduit le notch au temps, sans module", () => {
    assert.deepEqual(collapsedPill({ ...neutral, minimal: true }), {
      width: PILL_MIN_WIDTH,
      showVisualizer: false,
      showAlbumArt: false,
    });
  });

  it("ignore la musique quand la pilule minimale est active", () => {
    const music = { ...neutral, minimal: true, music: true, playing: true };
    assert.equal(collapsedPill(music).width, PILL_MIN_WIDTH);
    assert.equal(collapsedPill(music).showVisualizer, false);
  });

  it("garde 140 pixels au repos sans musique", () => {
    assert.deepEqual(collapsedPill(neutral), {
      width: PILL_BASE_WIDTH,
      showVisualizer: false,
      showAlbumArt: false,
    });
  });

  it("ajoute la largeur du visualiseur seulement quand il bouge", () => {
    const playing = collapsedPill({ ...neutral, music: true, playing: true, albumArt: false });
    assert.equal(playing.width, PILL_BASE_WIDTH + PILL_MUSIC_MODULE_WIDTH);
    const paused = collapsedPill({ ...neutral, music: true, playing: false, albumArt: false });
    assert.equal(paused.width, PILL_BASE_WIDTH);
    assert.equal(paused.showVisualizer, true);
  });

  it("ajoute la largeur de la pochette", () => {
    const art = collapsedPill({ ...neutral, music: true, visualizer: false });
    assert.equal(art.width, PILL_BASE_WIDTH + PILL_MUSIC_MODULE_WIDTH);
    assert.equal(art.showAlbumArt, true);
  });

  it("additionne les deux modules", () => {
    const both = collapsedPill({ ...neutral, music: true, playing: true });
    assert.equal(both.width, PILL_BASE_WIDTH + PILL_MUSIC_MODULE_WIDTH * 2);
    assert.equal(both.showVisualizer, true);
    assert.equal(both.showAlbumArt, true);
  });

  it("ne montre aucun module musical hors mode musique", () => {
    const only = collapsedPill({ ...neutral, music: false, playing: true });
    assert.equal(only.width, PILL_BASE_WIDTH);
    assert.equal(only.showVisualizer, false);
    assert.equal(only.showAlbumArt, false);
  });

  it("n'est jamais plus large en pilule minimale qu'en notch normal", () => {
    for (const music of [false, true]) {
      for (const playing of [false, true]) {
        for (const visualizer of [false, true]) {
          for (const albumArt of [false, true]) {
            const large = collapsedPill({ minimal: false, music, playing, visualizer, albumArt });
            const small = collapsedPill({ minimal: true, music, playing, visualizer, albumArt });
            assert.ok(small.width <= large.width, `${small.width} > ${large.width}`);
          }
        }
      }
    }
  });

  it("tient l'heure la plus large, format douze heures", () => {
    // « 11:59 PM » mesure une cinquantaine de pixels à 13 px, plus 24 de
    // rembourrage : il doit rester de la marge.
    assert.ok(PILL_MIN_WIDTH - 24 >= 56, String(PILL_MIN_WIDTH));
  });
});
