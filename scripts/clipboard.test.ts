/**
 * Tests de l'historique du presse-papier.
 *
 * Le Rust lit le presse-papier de Windows ; **toutes les décisions** (ordre,
 * dédoublonnage, épinglage, plafond, recherche) vivent dans `src/lib/clipboard.ts`
 * et sont testées ici, sans machine Windows.
 *
 *   bun run test:clipboard        (ou : npm run test:clipboard)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ITEMS,
  MAX_TEXT_CHARS,
  PREVIEW_CHARS,
  clearUnpinned,
  countClips,
  describeSize,
  enforceCap,
  foldForSearch,
  hashContent,
  hiddenChars,
  insertClip,
  isUrl,
  makeClip,
  normalizeText,
  orderClips,
  previewOf,
  relativeTime,
  removeClip,
  searchClips,
  togglePin,
  type ClipItem,
} from "../src/lib/clipboard.ts";
import { translate } from "../src/i18n/index.ts";

const T0 = new Date("2026-11-05T10:00:00").getTime();
const MINUTE = 60_000;

/** Build a clip without repeating the null check in every test. */
const clip = (text: string, at = T0, source = ""): ClipItem => {
  const item = makeClip("text", text, at, source);
  assert.ok(item, `makeClip a refusé « ${text} »`);
  return item;
};

// — Identité ---------------------------------------------------------------

test("le même texte donne le même identifiant", () => {
  // C'est ce qui permet de fusionner une re-copie au lieu d'empiler un doublon.
  assert.equal(hashContent("text", "bonjour"), hashContent("text", "bonjour"));
  assert.notEqual(hashContent("text", "bonjour"), hashContent("text", "bonjours"));
});

test("une image et un texte ne partagent jamais un identifiant", () => {
  assert.notEqual(hashContent("image", ""), hashContent("text", ""));
});

test("les fins de ligne Windows et les espaces de fin ne changent pas l'entrée", () => {
  assert.equal(normalizeText("a\r\nb  "), "a\nb");
  assert.equal(
    hashContent("text", normalizeText("toto\r\n")),
    hashContent("text", normalizeText("toto")),
  );
});

// — Construction -----------------------------------------------------------

test("un texte vide ou blanc ne crée aucune entrée", () => {
  // Copier un espace dans un champ ne doit pas remplir l'historique.
  assert.equal(makeClip("text", "", T0), null);
  assert.equal(makeClip("text", "   \n\t ", T0), null);
});

test("un texte très long est conservé mais tronqué, et le dit", () => {
  const long = "a".repeat(MAX_TEXT_CHARS + 500);
  const item = makeClip("text", long, T0);
  assert.ok(item);
  assert.equal(item.text.length, MAX_TEXT_CHARS);
  assert.equal(item.chars, long.length);
  assert.equal(item.truncated, true);
  assert.equal(hiddenChars(item), 500);
});

test("un texte normal n'est pas marqué comme tronqué", () => {
  const item = clip("bonjour");
  assert.equal(item.truncated, false);
  assert.equal(hiddenChars(item), 0);
});

// — Insertion et dédoublonnage ---------------------------------------------

test("un nouvel élément arrive en tête", () => {
  const list = insertClip(insertClip([], clip("un", T0)), clip("deux", T0 + MINUTE));
  assert.deepEqual(list.map((i) => i.text), ["deux", "un"]);
});

test("re-copier un texte le remonte au lieu de le dupliquer", () => {
  let list = insertClip([], clip("alpha", T0));
  list = insertClip(list, clip("beta", T0 + MINUTE));
  list = insertClip(list, clip("alpha", T0 + 2 * MINUTE));

  assert.equal(list.length, 2);
  assert.deepEqual(list.map((i) => i.text), ["alpha", "beta"]);
  assert.equal(list[0].at, T0 + 2 * MINUTE);
});

test("une épingle survit à une re-copie", () => {
  // Sinon, recopier un texte épinglé le désépinglerait silencieusement.
  let list = insertClip([], clip("secret utile", T0));
  list = togglePin(list, list[0].id);
  list = insertClip(list, clip("autre", T0 + MINUTE));
  list = insertClip(list, clip("secret utile", T0 + 2 * MINUTE));

  const pinned = list.find((i) => i.text === "secret utile");
  assert.ok(pinned?.pinned);
});

// — Plafond ----------------------------------------------------------------

test("l'historique ne dépasse jamais son plafond", () => {
  let list: ClipItem[] = [];
  for (let i = 0; i < MAX_ITEMS + 25; i += 1) {
    list = insertClip(list, clip(`entrée ${i}`, T0 + i * MINUTE), 10);
  }
  assert.equal(list.length, 10);
  // Les plus récentes sont celles qui restent.
  assert.equal(list[0].text, `entrée ${MAX_ITEMS + 24}`);
});

test("le plafond ne supprime jamais une épingle", () => {
  let list: ClipItem[] = [];
  list = insertClip(list, clip("à garder", T0));
  list = togglePin(list, list[0].id);

  for (let i = 0; i < 20; i += 1) {
    list = insertClip(list, clip(`jetable ${i}`, T0 + (i + 1) * MINUTE), 5);
  }

  assert.ok(list.length <= 5);
  assert.ok(list.some((i) => i.text === "à garder" && i.pinned), "l'épingle a été perdue");
});

test("enforceCap préserve l'ordre reçu", () => {
  const list = Array.from({ length: 6 }, (_, i) => clip(`e${i}`, T0 + i));
  const capped = enforceCap(list, 3);
  assert.deepEqual(capped.map((i) => i.text), ["e0", "e1", "e2"]);
});

// — Épinglage et suppression -----------------------------------------------

test("togglePin bascule deux fois et revient à l'état initial", () => {
  const list = [clip("a", T0)];
  const once = togglePin(list, list[0].id);
  const twice = togglePin(once, list[0].id);
  assert.equal(once[0].pinned, true);
  assert.equal(twice[0].pinned, false);
});

test("supprimer retire l'entrée et laisse les autres intactes", () => {
  const a = clip("a", T0);
  const b = clip("b", T0 + MINUTE);
  const list = removeClip([a, b], a.id);
  assert.deepEqual(list.map((i) => i.text), ["b"]);
});

test("vider l'historique garde les épingles", () => {
  let list = insertClip(insertClip([], clip("a", T0)), clip("b", T0 + MINUTE));
  list = togglePin(list, list[1].id);
  const cleared = clearUnpinned(list);
  assert.deepEqual(cleared.map((i) => i.text), ["a"]);
});

// — Ordre et comptage ------------------------------------------------------

test("l'affichage met les épingles devant, puis la récence", () => {
  let list = insertClip(insertClip([], clip("vieux", T0)), clip("récent", T0 + 5 * MINUTE));
  list = togglePin(list, list[1].id); // "vieux" épinglé

  assert.deepEqual(orderClips(list).map((i) => i.text), ["vieux", "récent"]);
});

test("le compteur distingue le total des épingles", () => {
  let list = insertClip(insertClip([], clip("a", T0)), clip("b", T0 + MINUTE));
  list = togglePin(list, list[0].id);
  assert.deepEqual(countClips(list), { total: 2, pinned: 1 });
});

// — Recherche --------------------------------------------------------------

test("la recherche ignore la casse et les accents", () => {
  const list = [clip("Résumé de la réunion"), clip("autre chose")];
  assert.equal(searchClips(list, "resume").length, 1);
  assert.equal(searchClips(list, "RÉSUMÉ").length, 1);
});

test("plusieurs mots doivent tous correspondre, dans n'importe quel ordre", () => {
  const list = [clip("batterie à 18 %"), clip("batterie pleine")];
  assert.equal(searchClips(list, "18 batterie").length, 1);
  assert.equal(searchClips(list, "batterie").length, 2);
});

test("une requête vide renvoie tout, une requête absente renvoie rien", () => {
  const list = [clip("a", T0), clip("b", T0 + MINUTE)];
  assert.equal(searchClips(list, "   ").length, 2);
  assert.equal(searchClips(list, "introuvable").length, 0);
});

test("la recherche regarde aussi l'application source", () => {
  const list = [clip("texte", T0, "Code.exe")];
  assert.equal(searchClips(list, "code").length, 1);
});

test("foldForSearch retire bien les diacritiques", () => {
  assert.equal(foldForSearch("Éléphant"), "elephant");
  assert.equal(foldForSearch("ÇA"), "ca");
});

// — Aperçu -----------------------------------------------------------------

test("l'aperçu écrase les retours à la ligne", () => {
  // Un stack trace collé ne doit pas dessiner trois lignes dans le notch.
  const item = clip("ligne 1\nligne 2\tligne 3");
  assert.equal(previewOf(item), "ligne 1 ligne 2 ligne 3");
});

test("un aperçu long est coupé sur un mot, avec des points de suspension", () => {
  const item = clip("mot ".repeat(60));
  const preview = previewOf(item, 40);
  assert.ok(preview.length <= 41, `aperçu trop long : ${preview.length}`);
  assert.ok(preview.endsWith("…"));
  assert.ok(!preview.includes("  "), "double espace laissé par la coupe");
});

test("un texte court n'est pas suivi de points de suspension", () => {
  assert.equal(previewOf(clip("bonjour"), 40), "bonjour");
  assert.ok(!previewOf(clip("bonjour"), 40).includes("…"));
});

test("un aperçu d'image est vide, l'interface dessine une vignette", () => {
  const item = makeClip("image", "", T0);
  assert.ok(item);
  assert.equal(previewOf(item), "");
});

test("l'aperçu par défaut tient dans la largeur du dernier palier", () => {
  assert.ok(PREVIEW_CHARS <= 96, "au-delà de 96 caractères la ligne se tronque");
});

// — Détails ----------------------------------------------------------------

test("une URL est reconnue", () => {
  assert.ok(isUrl("https://github.com/dikoume-stephane/Islet"));
  assert.ok(!isUrl("https://exemple.fr et du texte après"));
  assert.ok(!isUrl("pas une url"));
});

test("la description de taille est traduite et cohérente", () => {
  const item = clip("bonjour");
  const fr = describeSize(item, (key, params) => translate("fr", key, params));
  const en = describeSize(item, (key, params) => translate("en", key, params));
  assert.match(fr, /7/);
  assert.match(en, /7/);
  assert.notEqual(fr, en);
});

test("le temps relatif est grossier, jamais faux", () => {
  const tr = (key: "clip.time.now" | "clip.time.minutes" | "clip.time.hours" | "clip.time.days", params?: Record<string, number>) =>
    translate("fr", key, params);

  assert.match(relativeTime(T0, T0 + 10_000, tr), /instant/);
  assert.match(relativeTime(T0, T0 + 3 * MINUTE, tr), /3 min/);
  assert.match(relativeTime(T0, T0 + 2 * 60 * MINUTE, tr), /2 h/);
  assert.match(relativeTime(T0, T0 + 3 * 24 * 60 * MINUTE, tr), /3 j/);
});

// — Typographie ------------------------------------------------------------

test("aucune chaîne du module ne contient de tiret cadratin", async () => {
  // La règle vaut pour tout texte affiché, y compris dans les clés de ce module.
  const keys = [
    "clip.group",
    "clip.empty",
    "clip.pinned",
    "clip.recent",
    "clip.copy",
    "clip.copied",
    "clip.pin",
    "clip.unpin",
    "clip.remove",
    "clip.clear",
    "clip.search",
    "clip.paused",
    "clip.privacy",
  ] as const;

  for (const key of keys) {
    for (const lang of ["en", "fr"] as const) {
      const out = translate(lang, key);
      assert.ok(!out.includes("—"), `${lang}/${key} contient un tiret cadratin`);
      assert.ok(!out.includes("..."), `${lang}/${key} utilise trois points`);
    }
  }
});
