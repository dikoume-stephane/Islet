/**
 * Tests du moteur de thèmes.
 *
 * Le but n'est pas de vérifier que `applyTheme` écrit bien des variables CSS —
 * ça se voit à l'œil. C'est de garantir les deux choses qu'on ne voit pas :
 * **une ancienne configuration continue de fonctionner** et **aucun preset ne
 * rend son texte illisible sur un fond clair ou sombre**.
 *
 *   bun run test:theme        (ou : npm run test:theme)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PRESETS,
  MATERIAL_FILTER,
  MATERIAL_LABEL,
  MATERIAL_DESC,
  canonicalMode,
  composite,
  contrast,
  isDynamicMode,
  luminance,
  parseHex,
  presetBackground,
  resolveAlpha,
  resolvePreset,
  type ThemePreset,
} from "../src/theme/presets.ts";
import { translate } from "../src/i18n/index.ts";

/** `#rrggbb` ou `rgba(r, g, b, a)` — les deux formes utilisées par les presets. */
function parseColor(value: string): [number, number, number, number] {
  if (value.startsWith("#")) return [...parseHex(value), 1];
  const inner = value.match(/rgba?\(([^)]+)\)/)?.[1];
  assert.ok(inner, `couleur illisible : ${value}`);
  const parts = inner.split(",").map((p) => parseFloat(p.trim()));
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

/** Les deux fonds extrêmes : un bureau noir et un bureau blanc. */
const DESKTOPS: [string, [number, number, number]][] = [
  ["noir", [0, 0, 0]],
  ["blanc", [255, 255, 255]],
];

// — Résolution des modes ---------------------------------------------------

test("les identifiants de preset sont uniques", () => {
  const ids = PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, `doublon dans ${ids.join(", ")}`);
});

test("les anciens modes résolvent vers un preset", () => {
  // Personne ne doit perdre son thème en mettant à jour : `dark` était le
  // défaut historique, `light` l'autre choix.
  assert.equal(resolvePreset("dark").id, "onyx");
  assert.equal(resolvePreset("light").id, "frost-light");
});

test("une valeur inconnue retombe sur le thème par défaut", () => {
  // Un settings.json corrompu ne doit pas laisser l'application sans couleurs.
  for (const weird of [null, undefined, "", "nawak", "DARK", "liquid-glass"]) {
    assert.equal(resolvePreset(weird).id, "onyx", `valeur ${String(weird)}`);
  }
});

test("custom et adaptive restent dynamiques, jamais des presets", () => {
  assert.ok(isDynamicMode("custom"));
  assert.ok(isDynamicMode("adaptive"));
  assert.ok(!isDynamicMode("onyx"));
  assert.equal(canonicalMode("custom"), "custom");
  assert.equal(canonicalMode("adaptive"), "adaptive");
});

test("un mode enregistré est toujours réécrit en identifiant de preset", () => {
  // Ce qui compte : `settings.json` ne doit plus jamais apprendre `dark`.
  assert.equal(canonicalMode("dark"), "onyx");
  assert.equal(canonicalMode("light"), "frost-light");
  assert.equal(canonicalMode("liquid"), "liquid");
  assert.equal(canonicalMode(null), "onyx");
});

// — Opacité ----------------------------------------------------------------

test("l'opacité neutre rend le preset tel qu'il est défini", () => {
  for (const preset of PRESETS) {
    const alpha = resolveAlpha(preset, 0.8);
    assert.ok(
      Math.abs(alpha - preset.alpha) < 1e-9,
      `${preset.id} : ${alpha} au lieu de ${preset.alpha}`,
    );
  }
});

test("l'opacité reste dans les bornes et ne rend jamais un preset illisible", () => {
  for (const preset of PRESETS) {
    for (const slider of [0, 0.1, 0.2, 0.5, 1, 2]) {
      const alpha = resolveAlpha(preset, slider);
      assert.ok(alpha >= 0.35 && alpha <= 1, `${preset.id} @ ${slider} : ${alpha}`);
    }
    // Monotone : pousser le curseur ne doit jamais rendre plus transparent.
    assert.ok(resolveAlpha(preset, 0.9) >= resolveAlpha(preset, 0.4));
  }
});

test("la couleur de fond composée est un rgba valide", () => {
  const preset = resolvePreset("onyx");
  assert.equal(presetBackground(preset, 0.8), "rgba(0, 0, 0, 0.8)");
});

// — Contraste --------------------------------------------------------------

test("le texte principal est lisible sur un bureau noir comme sur un bureau blanc", () => {
  // 4.5:1 est le seuil AA pour du texte de moins de 18 px — et tout le texte
  // d'Islet est plus petit que 18 px.
  for (const preset of PRESETS) {
    const alpha = resolveAlpha(preset, 0.8);
    const text = parseHex(preset.text);
    for (const [name, desktop] of DESKTOPS) {
      const surface = composite(preset.rgb, alpha, desktop);
      const ratio = contrast(text, surface);
      assert.ok(
        ratio >= 4.5,
        `${preset.id} sur bureau ${name} : ${ratio.toFixed(2)}:1 pour le texte principal`,
      );
    }
  }
});

test("le texte secondaire reste lisible lui aussi", () => {
  // Il porte les descriptions de réglages et la ligne d'action des conseils :
  // le dégrader pour faire joli est exactement le faux pas à éviter.
  for (const preset of PRESETS) {
    const alpha = resolveAlpha(preset, 0.8);
    const [r, g, b, mutedAlpha] = parseColor(preset.textMuted);
    for (const [name, desktop] of DESKTOPS) {
      const surface = composite(preset.rgb, alpha, desktop);
      const muted = composite([r, g, b], mutedAlpha, surface);
      const ratio = contrast(muted, surface);
      assert.ok(
        ratio >= 4.5,
        `${preset.id} sur bureau ${name} : ${ratio.toFixed(2)}:1 pour le texte secondaire`,
      );
    }
  }
});

test("le texte secondaire est bien plus discret que le principal", () => {
  // L'inverse — un détail plus contrasté que le titre — casserait la
  // hiérarchie de lecture.
  for (const preset of PRESETS) {
    const alpha = resolveAlpha(preset, 0.8);
    const surface = composite(preset.rgb, alpha, [0, 0, 0]);
    const [r, g, b, mutedAlpha] = parseColor(preset.textMuted);
    const primary = contrast(parseHex(preset.text), surface);
    const muted = contrast(composite([r, g, b], mutedAlpha, surface), surface);
    assert.ok(muted < primary, `${preset.id} : le détail est plus fort que le titre`);
  }
});

test("la luminance suit la formule WCAG", () => {
  assert.equal(luminance([0, 0, 0]), 0);
  assert.ok(Math.abs(luminance([255, 255, 255]) - 1) < 1e-9);
  assert.ok(Math.abs(contrast([0, 0, 0], [255, 255, 255]) - 21) < 1e-9);
});

// — Matières ---------------------------------------------------------------

test("chaque matière a un filtre cohérent avec son nom", () => {
  // `matte` ne touche à rien : c'est ce qui laisse les fenêtres sur leur flou
  // historique.
  assert.equal(MATERIAL_FILTER.matte, null);
  assert.equal(MATERIAL_FILTER.frost, "blur(18px) saturate(150%)");
  assert.match(MATERIAL_FILTER.glass!, /blur\(28px\)/);
  assert.match(MATERIAL_FILTER.liquid!, /saturate\(200%\)/);
});

test("l'intensité des matières est croissante", () => {
  const blurOf = (value: string | null) => (value ? Number(value.match(/blur\((\d+)px\)/)![1]) : 0);
  assert.ok(blurOf(MATERIAL_FILTER.matte) < blurOf(MATERIAL_FILTER.frost));
  assert.ok(blurOf(MATERIAL_FILTER.frost) < blurOf(MATERIAL_FILTER.glass));
  assert.ok(blurOf(MATERIAL_FILTER.glass) < blurOf(MATERIAL_FILTER.liquid));
});

test("chaque preset pointe une matière connue", () => {
  for (const preset of PRESETS) {
    assert.ok(preset.material in MATERIAL_FILTER, `${preset.id} : matière inconnue`);
  }
});

// — Traduction -------------------------------------------------------------

test("chaque preset et chaque matière sont traduits dans les deux langues", () => {
  const keys = [
    ...PRESETS.flatMap((p) => [p.labelKey, p.descKey]),
    ...Object.values(MATERIAL_LABEL),
    ...Object.values(MATERIAL_DESC),
  ];

  for (const key of keys) {
    for (const lang of ["en", "fr"] as const) {
      const out = translate(lang, key);
      assert.ok(out.length > 0 && out !== key, `${lang} manque ${key}`);
    }
  }
});

test("les deux langues ne disent pas la même chose", () => {
  for (const preset of PRESETS) {
    assert.notEqual(
      translate("fr", preset.descKey),
      translate("en", preset.descKey),
      `${preset.id} : description identique en FR et EN`,
    );
  }
});

/** Garde-fou de longueur : une carte de la galerie fait ~112 px de large. */
test("les noms de preset tiennent sur une carte", () => {
  for (const preset of PRESETS) {
    for (const lang of ["en", "fr"] as const) {
      const name = translate(lang, preset.labelKey);
      assert.ok(name.length <= 14, `${preset.id} (${lang}) : « ${name} » trop long`);
    }
  }
});

// — Cohérence du contrat ---------------------------------------------------

test("un preset ne se contredit pas", () => {
  for (const preset of PRESETS) {
    assert.ok(preset.alpha > 0 && preset.alpha <= 1, `${preset.id} : alpha hors bornes`);
    assert.ok(preset.expandedBoost >= 0, `${preset.id} : boost négatif`);
    assert.ok(preset.alpha + preset.expandedBoost <= 1.0001, `${preset.id} : dépasse l'opacité`);
    assert.equal(preset.swatch.length, 2, `${preset.id} : il faut deux arrêts de dégradé`);
    // Un preset clair doit avoir un texte sombre, sinon il est illisible par
    // construction (le test de contraste le rattraperait, autant être direct).
    const textIsDark = luminance(parseHex(preset.text)) < 0.3;
    assert.equal(preset.light, textIsDark, `${preset.id} : ton clair et texte clair`);
  }
});

/** Aide de lecture pour les prochains : la liste tient en une ligne. */
test("la galerie propose au moins six presets", () => {
  assert.ok(PRESETS.length >= 6, `${PRESETS.length} presets`);
  const ids = PRESETS.map((p) => p.id);
  assert.ok(ids.includes("liquid"), "le thème demandé doit être livré");
});

export type { ThemePreset };
