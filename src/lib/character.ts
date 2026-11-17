/**
 * Le personnage d'Is : son humeur, son regard, son sommeil.
 *
 * L'avatar n'est pas une décoration posée dans un coin : c'est la façon dont
 * l'assistant se montre. Il a donc le droit d'avoir des états, et ces états
 * doivent vouloir dire quelque chose. Une humeur qui ne répond à aucun
 * événement est un mensonge animé.
 *
 * Tout ce qui décide vit ici, sans React ni i18n :
 *
 * - le **réducteur** (`reduceIs`) : une humeur, un signal, des événements. Une
 *   seule règle à la fois, donc une seule chose à corriger quand un état ne
 *   colle pas ;
 * - le **cadre** (`frameFor`) : ce que le dessin doit faire d'une humeur
 *   (ouverture des yeux, bouche, halo, durée du souffle). Le composant ne
 *   décide rien ;
 * - le **regard** (`gazeVector`) : une direction unitaire, nulle dès que le
 *   curseur s'éloigne. Un personnage qui suit le curseur à travers tout l'écran
 *   ne regarde personne, il surveille ;
 * - le **sommeil** (`shouldSleep`) et le **clignement**
 *   (`nextBlinkDelay`) : deux horloges, tenues par l'appelant.
 *
 * Fichier pur : aucun import React, aucune clé i18n, aucune horloge implicite.
 */

/** Les humeurs prévues par le ROADMAP (3.B.1). */
export type IsMood = "idle" | "listening" | "thinking" | "happy" | "sleeping" | "alert";

/** Ce qu'Is a à montrer, indépendamment de son humeur. */
export type IsSignal = "none" | "tip" | "unread";

export type TipSeverity = "info" | "warn" | "critical";

export interface IsState {
  mood: IsMood;
  signal: IsSignal;
}

export type IsEvent =
  /** Un conseil arrive, avec sa gravité. */
  | { type: "tip"; severity: TipSeverity }
  /** Un conseil attend d'être vu, mais n'est plus affiché. */
  | { type: "unread" }
  /** Le conseil est fermé. */
  | { type: "dismiss" }
  /** Le curseur approche : Is se penche. */
  | { type: "hover" }
  /** Le curseur s'en va. */
  | { type: "leave" }
  /** Is réfléchit (réservé aux tâches longues). */
  | { type: "think" }
  /** Is revient au repos. */
  | { type: "settle" }
  /** Plus rien ne se passe depuis longtemps. */
  | { type: "sleep" }
  /** Quelque chose a bougé. */
  | { type: "wake" };

export const INITIAL_IS: IsState = { mood: "idle", signal: "none" };

/**
 * La gravité d'un conseil donne le visage d'Is.
 *
 * Un conseil sans conséquence se dit avec le sourire ; un avertissement se dit
 * les yeux écarquillés. C'est la seule correspondance du fichier, et elle est
 * volontairement courte : deux sévérités qui produiraient la même tête n'ont
 * pas besoin d'être distinguées ici, la couleur du conseil s'en charge.
 */
export function moodForSeverity(severity: TipSeverity): IsMood {
  return severity === "info" ? "happy" : "alert";
}

/** Le réducteur : une humeur, un signal, et l'événement qui vient d'arriver. */
export function reduceIs(state: IsState, event: IsEvent): IsState {
  switch (event.type) {
    case "tip":
      return { mood: moodForSeverity(event.severity), signal: "tip" };
    case "unread":
      return { mood: "listening", signal: "unread" };
    case "dismiss":
      return { mood: "idle", signal: "none" };
    case "hover":
      // Un conseil à l'écran garde son visage : se pencher pendant qu'on lit une
      // alerte changerait le sens de ce qu'on est en train de lire.
      if (state.signal === "tip") return state;
      return { mood: "listening", signal: state.signal };
    case "leave":
      if (state.signal === "unread") return { mood: "listening", signal: "unread" };
      return { mood: state.signal === "tip" ? state.mood : "idle", signal: state.signal };
    case "think":
      return { mood: "thinking", signal: state.signal };
    case "settle":
      return { mood: state.signal === "unread" ? "listening" : "idle", signal: state.signal };
    case "sleep":
      return { mood: "sleeping", signal: state.signal };
    case "wake":
      if (state.mood !== "sleeping") return state;
      return { mood: state.signal === "unread" ? "listening" : "idle", signal: state.signal };
    default:
      return state;
  }
}

/** Ce que le dessin doit faire d'une humeur. */
export interface SpriteFrame {
  /** 0 = yeux fermés, 1 = ouverts, au-delà = écarquillés. */
  eyeOpen: number;
  mouth: "w" | "smile" | "o" | "flat" | "sleep";
  blush: boolean;
  /** Force du halo, 0 à 2. */
  aura: number;
  /** Durée d'un souffle, en millisecondes. */
  breath: number;
}

const FRAMES: Record<IsMood, SpriteFrame> = {
  idle: { eyeOpen: 1, mouth: "w", blush: false, aura: 0, breath: 4200 },
  listening: { eyeOpen: 1.12, mouth: "w", blush: true, aura: 1, breath: 3600 },
  thinking: { eyeOpen: 0.92, mouth: "flat", blush: false, aura: 1, breath: 5200 },
  happy: { eyeOpen: 0.58, mouth: "smile", blush: true, aura: 2, breath: 3000 },
  sleeping: { eyeOpen: 0, mouth: "sleep", blush: false, aura: 0, breath: 6200 },
  alert: { eyeOpen: 1.3, mouth: "o", blush: false, aura: 2, breath: 1700 },
};

export function frameFor(mood: IsMood): SpriteFrame {
  return FRAMES[mood] ?? FRAMES.idle;
}

/** Toutes les humeurs, dans l'ordre où on les montre. */
export const MOODS: readonly IsMood[] = [
  "idle",
  "listening",
  "thinking",
  "happy",
  "alert",
  "sleeping",
];

/**
 * Le regard, en direction unitaire.
 *
 * Le vecteur vaut zéro au centre et dès que le curseur sort du rayon : les yeux
 * ne suivent que ce qui est proche. La norme croît avec la distance, comme un
 * vrai regard qui se lève vers ce qui s'éloigne.
 */
export const GAZE_RADIUS = 240;

export function gazeVector(
  pointer: { x: number; y: number } | null,
  center: { x: number; y: number },
  radius: number = GAZE_RADIUS,
): { x: number; y: number } {
  if (!pointer) return { x: 0, y: 0 };
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance > radius || radius <= 0) return { x: 0, y: 0 };
  const factor = distance / radius;
  return { x: (dx / distance) * factor, y: (dy / distance) * factor };
}

/* --- Clignement --------------------------------------------------------- */

/** Durée d'un clignement, en millisecondes. */
export const BLINK_DURATION_MS = 130;

/**
 * Délai avant le prochain clignement, entre 2,4 et 6,6 secondes.
 *
 * `random` est un tirage dans [0, 1) : l'appelant fournit l'aléatoire, ce qui
 * rend la fonction reproductible dans un test.
 */
export function nextBlinkDelay(random: number): number {
  const safe = Number.isFinite(random) ? Math.min(Math.max(random, 0), 1) : 0;
  return 2400 + Math.round(safe * 4200);
}

export function isBlinking(elapsed: number, blinkAt: number, duration: number = BLINK_DURATION_MS): boolean {
  if (!Number.isFinite(elapsed) || !Number.isFinite(blinkAt)) return false;
  const delta = elapsed - blinkAt;
  return delta >= 0 && delta < duration;
}

/* --- Sommeil ------------------------------------------------------------ */

/**
 * Délai d'inactivité avant que le personnage s'endorme, dans l'aperçu des
 * réglages comme dans le notch.
 */
export const SLEEP_AFTER_MS = 45_000;

export function shouldSleep(idleMs: number, threshold: number = SLEEP_AFTER_MS): boolean {
  if (!Number.isFinite(idleMs)) return false;
  return idleMs >= threshold;
}
