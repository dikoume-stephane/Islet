/**
 * Le mode focus : une session de travail pendant laquelle Islet se tait.
 *
 * Un seul fait à retenir, et il décide de tout : **une session est un minuteur
 * ordinaire que l'on a marqué**. Le décompte visible est celui du notch, celui
 * qui survit déjà à une mise en veille et à un redémarrage ; ce fichier n'ajoute
 * que la marque, pour que l'app sache qu'il ne s'agit pas d'une minuterie de
 * cuisine mais d'une heure où l'on ne veut pas être dérangé.
 *
 * Ce que la marque change, tout le reste le lit : plus de conseil d'Is, plus
 * d'aperçu du notch, plus de pastille d'alerte. Is au repos n'est pas un état
 * inventé, c'est la conséquence de n'avoir rien à dire.
 *
 * Fichier pur : aucun React, aucune clé i18n, aucune horloge implicite.
 */

/** Les trois durées proposées. Un champ libre n'apporterait que des virgules. */
export const FOCUS_PRESETS = [25, 45, 90] as const;

export const DEFAULT_FOCUS_MINUTES = 25;

/** Au-delà de trois heures, ce n'est plus une session, c'est un oubli. */
export const MAX_FOCUS_MINUTES = 180;

const MIN_FOCUS_MINUTES = 5;

/**
 * Ramène une durée dans les bornes.
 *
 * On ne garde pas la valeur telle quelle : une durée absurde venue d'un
 * `settings.json` modifié à la main doit produire une session plausible, pas un
 * minuteur de sept heures ou une session de zéro seconde.
 */
export function clampFocusMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_FOCUS_MINUTES;
  const rounded = Math.round(minutes);
  if (rounded < MIN_FOCUS_MINUTES) return MIN_FOCUS_MINUTES;
  if (rounded > MAX_FOCUS_MINUTES) return MAX_FOCUS_MINUTES;
  return rounded;
}

/** La durée à envoyer au minuteur, en secondes. */
export function focusSeconds(minutes: number): number {
  return clampFocusMinutes(minutes) * 60;
}

/**
 * Relit la marque laissée dans le stockage local.
 *
 * `null` veut dire « aucune session en cours ». Une valeur illisible est
 * traitée comme telle : mieux vaut une app qui parle qu'une app muette dont on
 * ne sait pas pourquoi elle se tait.
 */
export function decodeFocusMinutes(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  if (minutes < MIN_FOCUS_MINUTES) return null;
  return clampFocusMinutes(minutes);
}

/** Ce qu'on écrit dans le stockage local : la durée de la session, en clair. */
export function encodeFocusMinutes(minutes: number): string {
  return String(clampFocusMinutes(minutes));
}

/**
 * Une session est-elle en cours ?
 *
 * La marque seule ne suffit pas : il faut qu'un minuteur tourne **ou qu'il soit
 * en pause**, et qu'il ne soit pas terminé. Une pause est une interruption, pas
 * un abandon : reprendre la session ne doit pas rouvrir les vannes. Une marque
 * oubliée après un plantage, elle, ne doit pas rendre l'app muette pour
 * toujours : sans minuteur, il n'y a pas de session.
 */
export function focusActive(
  marked: number | null,
  running: boolean,
  finished: boolean,
  paused = false,
): boolean {
  if (marked === null) return false;
  if (finished) return false;
  return running || paused;
}
