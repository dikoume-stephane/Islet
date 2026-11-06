/**
 * Les témoins du clavier : Verr Maj, Verr Num, Défil, et la langue de saisie.
 *
 * Le backend (`src-tauri/src/keyboard_indicators.rs`) est un simple capteur :
 * il voit passer les touches et lit la disposition de la fenêtre au premier
 * plan, puis envoie un identifiant de langue **Windows** brut. Tout ce qui
 * décide vit ici : quelle langue c'est, ce qui a changé, ce qu'on affiche.
 *
 * Raison de cette répartition : une table de langues est une donnée qui se
 * trompe facilement et qui se teste facilement. Elle se vérifie donc sans
 * compiler quoi que ce soit, et sans toucher à Windows.
 *
 * Fichier pur : aucun import React, aucune clé i18n, aucune horloge implicite.
 */

export type KeyboardKind = "caps" | "num" | "scroll" | "lang";

/** Charge utile de l'événement `keyboard-indicators`. */
export interface KeyboardPayload {
  caps: boolean;
  num: boolean;
  scroll: boolean;
  /** Identifiant de langue Windows, par exemple `0x040C` pour le français. */
  lang_id: number;
  /** Ce qui vient de changer. */
  kind: KeyboardKind;
  /** Horodatage Unix en millisecondes. */
  at: number;
}

export interface KeyboardState {
  caps: boolean;
  num: boolean;
  scroll: boolean;
  langId: number;
  at: number;
}

/** Sous-langue retirée : `0x040C` (français de France) et `0x080C` (belge) sont du français. */
const PRIMARY_MASK = 0x3ff;

/**
 * Langue principale de Windows vers son code court.
 *
 * Volontairement limitée aux langues qu'on rencontre vraiment sur un poste de
 * travail : mieux vaut ne rien afficher que d'afficher un code à quatre chiffres
 * hexadécimaux au milieu de trois pastilles.
 */
const LANGUAGE_LABELS: Record<number, string> = {
  0x01: "AR", // arabe
  0x02: "BG", // bulgare
  0x03: "CA", // catalan
  0x04: "ZH", // chinois
  0x05: "CS", // tchèque
  0x06: "DA", // danois
  0x07: "DE", // allemand
  0x08: "EL", // grec
  0x09: "EN", // anglais
  0x0a: "ES", // espagnol
  0x0b: "FI", // finnois
  0x0c: "FR", // français
  0x0d: "HE", // hébreu
  0x0e: "HU", // hongrois
  0x0f: "IS", // islandais
  0x10: "IT", // italien
  0x11: "JA", // japonais
  0x12: "KO", // coréen
  0x13: "NL", // néerlandais
  0x14: "NO", // norvégien
  0x15: "PL", // polonais
  0x16: "PT", // portugais
  0x18: "RO", // roumain
  0x19: "RU", // russe
  0x1a: "HR", // croate
  0x1b: "SK", // slovaque
  0x1c: "SQ", // albanais
  0x1d: "SV", // suédois
  0x1e: "TH", // thaï
  0x1f: "TR", // turc
  0x20: "UR", // ourdou
  0x21: "ID", // indonésien
  0x22: "UK", // ukrainien
  0x23: "BE", // biélorusse
  0x24: "SL", // slovène
  0x25: "ET", // estonien
  0x26: "LV", // letton
  0x27: "LT", // lituanien
  0x29: "FA", // persan
  0x2a: "VI", // vietnamien
  0x2b: "HY", // arménien
  0x2c: "AZ", // azéri
  0x2d: "EU", // basque
  0x2f: "AF", // afrikaans
  0x32: "KA", // géorgien
  0x37: "SW", // swahili
  0x50: "MN", // mongol
};

/** La sous-langue en moins. */
export function primaryLanguage(langId: number): number {
  if (!Number.isFinite(langId)) return 0;
  return Math.trunc(langId) & PRIMARY_MASK;
}

/**
 * « FR », « EN », « DE », ou une chaîne vide quand la langue n'est pas connue.
 * Vide plutôt qu'un code : une pastille à quatre chiffres hexadécimaux
 * n'apprend rien à personne.
 */
export function languageLabel(langId: number): string {
  return LANGUAGE_LABELS[primaryLanguage(langId)] ?? "";
}

/** Un identifiant de langue plausible, pour ne pas laisser passer n'importe quoi. */
function safeLanguage(langId: unknown): number {
  if (typeof langId !== "number" || !Number.isFinite(langId)) return 0;
  const value = Math.trunc(langId);
  return value > 0 && value <= 0xffff ? value : 0;
}

/** Lit un événement du backend sans lui faire confiance. */
export function toState(payload: Partial<KeyboardPayload> | null | undefined): KeyboardState | null {
  if (!payload || typeof payload !== "object") return null;
  return {
    caps: payload.caps === true,
    num: payload.num === true,
    scroll: payload.scroll === true,
    langId: safeLanguage(payload.lang_id),
    at: typeof payload.at === "number" && Number.isFinite(payload.at) ? payload.at : Date.now(),
  };
}

/**
 * Ce qui a changé depuis l'état précédent. Sert à n'allumer que la pastille
 * concernée : trois pastilles qui s'agitent à chaque touche ne disent rien.
 */
export function changedKinds(previous: KeyboardState | null, next: KeyboardState): KeyboardKind[] {
  if (!previous) return next.langId > 0 ? ["lang"] : [];
  const changed: KeyboardKind[] = [];
  if (previous.caps !== next.caps) changed.push("caps");
  if (previous.num !== next.num) changed.push("num");
  if (previous.scroll !== next.scroll) changed.push("scroll");
  if (previous.langId !== next.langId) changed.push("lang");
  return changed;
}

export interface Chip {
  kind: KeyboardKind;
  /** `null` pour la langue : son libellé vient de la table, pas du dictionnaire. */
  on: boolean;
  /** Code court pour la langue, vide pour les touches. */
  code: string;
}

/**
 * Les pastilles à afficher, dans l'ordre : les trois touches puis la langue.
 * La langue disparaît quand on ne sait pas la nommer, et Défil n'apparaît que
 * s'il est actif : sur un clavier sans Verr Défil, la pastille éteinte est du
 * bruit permanent.
 */
export function indicatorChips(state: KeyboardState): Chip[] {
  const chips: Chip[] = [
    { kind: "caps", on: state.caps, code: "" },
    { kind: "num", on: state.num, code: "" },
  ];
  if (state.scroll) chips.push({ kind: "scroll", on: true, code: "" });
  const code = languageLabel(state.langId);
  if (code !== "") chips.push({ kind: "lang", on: true, code });
  return chips;
}
