/**
 * La pilule minimale : le notch replié ramené au temps seul.
 *
 * Le notch déplié n'a jamais de mal à justifier sa place : on l'a ouvert pour
 * quelque chose. Replié, il encombre. Entre le silence complet et une barre qui
 * porte météo, batterie, visualiseur et pochette, il manquait un état calme :
 * l'heure, rien d'autre.
 *
 * Ce fichier ne dessine rien. Il répond à deux questions, et ce sont les deux
 * qui se trompent facilement :
 *
 * 1. **Quand** la pilule minimale est-elle en vigueur ? Au repos seulement : au
 *    survol, ou dès qu'un conseil, une alerte ou un panneau occupe le notch,
 *    c'est le notch normal qui reprend la main. Une forme réduite qui resterait
 *    réduite pendant qu'on la lit ne servirait à rien.
 * 2. **Quelle largeur** pour le notch replié, et quels modules musicaux il
 *    montre. C'est de la géométrie qui se règle à un ou deux pixels près, et qui
 *    se reproduit mal à la main : autant la vérifier ici.
 *
 * Fichier pur : aucun import React, aucune clé i18n.
 */

/** Les états du notch, tels que `App.tsx` les nomme. */
export type PillMode =
  | "status"
  | "music"
  | "calendar"
  | "clipboard"
  | "lyrics"
  | "shelf"
  | "todos"
  | "command-center";

/**
 * Les modes ouverts : un panneau impose sa propre largeur, la pilule n'y a pas
 * voix au chapitre.
 */
export const PANEL_MODES: readonly PillMode[] = [
  "calendar",
  "clipboard",
  "lyrics",
  "shelf",
  "todos",
  "command-center",
];

/** Largeur du notch replié réduit au temps. */
export const PILL_MIN_WIDTH = 96;

/** Largeur du notch replié avec ses widgets latéraux. */
export const PILL_BASE_WIDTH = 140;

/** Largeur ajoutée par un module musical replié (visualiseur, pochette). */
export const PILL_MUSIC_MODULE_WIDTH = 30;

export interface PillState {
  /** Réglage `islet-notch-pill-minimal`. */
  enabled: boolean;
  /** La souris est sur le notch. */
  hovered: boolean;
  mode: PillMode;
  /** Un conseil ou une alerte occupe le notch. */
  alert: boolean;
}

/**
 * La pilule minimale ne gouverne que le notch au repos.
 *
 * Le survol suffit à rendre la main : c'est le geste par lequel on demande à
 * voir le reste, et il ne doit jamais dépendre d'un réglage.
 */
export function minimalPillActive(state: PillState): boolean {
  if (!state.enabled || state.hovered || state.alert) return false;
  return !PANEL_MODES.includes(state.mode);
}

export interface PillContent {
  /** Résultat de `minimalPillActive`. */
  minimal: boolean;
  /** Un morceau est chargé, en lecture ou en pause. */
  music: boolean;
  /** La lecture est en cours. */
  playing: boolean;
  /** Réglage du visualiseur. */
  visualizer: boolean;
  /** Réglage de la pochette. */
  albumArt: boolean;
}

export interface CollapsedPill {
  /** Largeur du notch replié, en pixels. */
  width: number;
  showVisualizer: boolean;
  showAlbumArt: boolean;
}

/**
 * Géométrie et contenu du notch replié.
 *
 * Le visualiseur ne compte dans la largeur que lorsqu'il bouge : au repos, ses
 * barres retombent et il n'occupe plus rien de plus que la pochette.
 */
export function collapsedPill(content: PillContent): CollapsedPill {
  if (content.minimal) {
    return { width: PILL_MIN_WIDTH, showVisualizer: false, showAlbumArt: false };
  }
  if (!content.music) {
    return { width: PILL_BASE_WIDTH, showVisualizer: false, showAlbumArt: false };
  }
  let width = PILL_BASE_WIDTH;
  if (content.visualizer && content.playing) width += PILL_MUSIC_MODULE_WIDTH;
  if (content.albumArt) width += PILL_MUSIC_MODULE_WIDTH;
  return { width, showVisualizer: content.visualizer, showAlbumArt: content.albumArt };
}
