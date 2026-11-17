import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changedKinds,
  indicatorChips,
  languageLabel,
  primaryLanguage,
  toState,
  type KeyboardState,
} from "../src/lib/keyboard.ts";

/**
 * Les témoins du clavier.
 *
 * Ce qui se casse en vrai n'est pas visuel : c'est la table des langues
 * (Windows envoie une sous-langue dans les seize bits bas, et se tromper de
 * masque affiche « ZH » à un Belge), et le bruit (trois pastilles qui
 * s'allument à chaque touche au lieu d'une seule).
 */

const state = (overrides: Partial<KeyboardState> = {}): KeyboardState => ({
  caps: false,
  num: true,
  scroll: false,
  langId: 0x040c,
  at: 1_700_000_000_000,
  ...overrides,
});

describe("primaryLanguage", () => {
  it("retire la sous-langue des seize bits bas", () => {
    assert.equal(primaryLanguage(0x040c), 0x0c); // français de France
    assert.equal(primaryLanguage(0x080c), 0x0c); // français de Belgique
    assert.equal(primaryLanguage(0x0c0c), 0x0c); // français du Canada
    assert.equal(primaryLanguage(0x0809), 0x09); // anglais du Royaume-Uni
    assert.equal(primaryLanguage(0x0409), 0x09); // anglais des États-Unis
    assert.equal(primaryLanguage(0x0804), 0x04); // chinois simplifié
    assert.equal(primaryLanguage(0x0404), 0x04); // chinois traditionnel
  });

  it("supporte une valeur nulle ou absurde", () => {
    assert.equal(primaryLanguage(0), 0);
    assert.equal(primaryLanguage(Number.NaN), 0);
    assert.equal(primaryLanguage(Number.POSITIVE_INFINITY), 0);
  });
});

describe("languageLabel", () => {
  it("nomme les langues qu'on rencontre vraiment", () => {
    assert.equal(languageLabel(0x040c), "FR");
    assert.equal(languageLabel(0x0409), "EN");
    assert.equal(languageLabel(0x0809), "EN");
    assert.equal(languageLabel(0x0407), "DE");
    assert.equal(languageLabel(0x0410), "IT");
    assert.equal(languageLabel(0x0413), "NL");
    assert.equal(languageLabel(0x0416), "PT");
    assert.equal(languageLabel(0x0419), "RU");
    assert.equal(languageLabel(0x0411), "JA");
    assert.equal(languageLabel(0x0412), "KO");
    assert.equal(languageLabel(0x0804), "ZH");
    assert.equal(languageLabel(0x040a), "ES");
    assert.equal(languageLabel(0x0415), "PL");
    assert.equal(languageLabel(0x041f), "TR");
  });

  it("rend une chaîne vide plutôt qu'un code pour une langue inconnue", () => {
    // 0x7f n'est attribué à personne : mieux vaut ne rien afficher.
    assert.equal(languageLabel(0x047f), "");
    assert.equal(languageLabel(0), "");
  });

  it("ignore ce qui n'est pas une langue", () => {
    assert.equal(languageLabel(Number.NaN), "");
    assert.equal(languageLabel(-4), "");
  });
});

describe("toState", () => {
  it("lit une charge utile complète", () => {
    const parsed = toState({ caps: true, num: false, scroll: true, lang_id: 0x040c, kind: "caps", at: 42 });
    assert.deepEqual(parsed, { caps: true, num: false, scroll: true, langId: 0x040c, at: 42 });
  });

  it("refuse ce qui n'est pas un objet", () => {
    assert.equal(toState(null), null);
    assert.equal(toState(undefined), null);
  });

  it("ne croit pas un drapeau approximatif et ramène les langues impossibles à zéro", () => {
    const parsed = toState({ caps: "oui" as unknown as boolean, lang_id: 999_999 });
    assert.equal(parsed?.caps, false);
    assert.equal(parsed?.langId, 0);
  });

  it("remplit un horodatage manquant", () => {
    const before = Date.now();
    const parsed = toState({ caps: false });
    assert.ok(parsed !== null && parsed.at >= before);
  });
});

describe("changedKinds", () => {
  it("sans état précédent, seule la langue est annoncée", () => {
    assert.deepEqual(changedKinds(null, state()), ["lang"]);
  });

  it("sans état précédent ni langue, rien n'est annoncé", () => {
    assert.deepEqual(changedKinds(null, state({ langId: 0 })), []);
  });

  it("ne signale que la touche qui a bougé", () => {
    assert.deepEqual(changedKinds(state({ caps: false }), state({ caps: true })), ["caps"]);
    assert.deepEqual(changedKinds(state({ num: true }), state({ num: false })), ["num"]);
    assert.deepEqual(changedKinds(state({ scroll: false }), state({ scroll: true })), ["scroll"]);
  });

  it("signale un changement de langue", () => {
    assert.deepEqual(changedKinds(state({ langId: 0x040c }), state({ langId: 0x0409 })), ["lang"]);
  });

  it("ne signale rien quand tout est identique", () => {
    assert.deepEqual(changedKinds(state(), state()), []);
  });

  it("cumule les changements simultanés, dans l'ordre des pastilles", () => {
    const next = state({ caps: true, langId: 0x0409 });
    assert.deepEqual(changedKinds(state(), next), ["caps", "lang"]);
  });
});

describe("indicatorChips", () => {
  it("affiche toujours Verr Maj et Verr Num, puis la langue", () => {
    const chips = indicatorChips(state());
    assert.deepEqual(chips.map((chip) => chip.kind), ["caps", "num", "lang"]);
    assert.deepEqual(chips.map((chip) => chip.on), [false, true, true]);
    assert.equal(chips[2].code, "FR");
  });

  it("n'affiche Défil que s'il est actif : une pastille éteinte serait du bruit", () => {
    assert.deepEqual(indicatorChips(state({ scroll: false })).map((c) => c.kind), ["caps", "num", "lang"]);
    assert.deepEqual(indicatorChips(state({ scroll: true })).map((c) => c.kind), ["caps", "num", "scroll", "lang"]);
  });

  it("cache la langue quand on ne sait pas la nommer", () => {
    assert.deepEqual(indicatorChips(state({ langId: 0 })).map((c) => c.kind), ["caps", "num"]);
    assert.deepEqual(indicatorChips(state({ langId: 0x047f })).map((c) => c.kind), ["caps", "num"]);
  });

  it("ne met pas de code sur les touches", () => {
    const chips = indicatorChips(state());
    assert.deepEqual(chips.filter((c) => c.kind !== "lang").map((c) => c.code), ["", ""]);
  });
});
