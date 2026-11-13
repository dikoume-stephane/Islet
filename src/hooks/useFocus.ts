import { useCallback, useEffect, useState } from "react";
import { encodeFocusMinutes, decodeFocusMinutes, focusActive, focusSeconds } from "../lib/focus";
import type { Countdown } from "./useCountdown";

/**
 * Le mode focus, tenu par le minuteur du notch.
 *
 * **Un seul décompte dans l'app.** La session ne construit pas son propre
 * minuteur : elle démarre celui du notch, celui qui survit à une mise en veille
 * et à un redémarrage, et qui affiche déjà le temps restant là où l'utilisateur
 * a l'habitude de le lire. Ce que le focus ajoute, c'est une **marque** dans le
 * stockage local : pendant qu'elle tient, l'app se tait.
 *
 * La marque meurt avec le minuteur. Un arrêt, une remise à zéro, un décompte
 * arrivé à zéro : la marque tombe. C'est ce qui empêche une session interrompue
 * par un plantage de rendre l'app muette pour toujours.
 */

const FOCUS_KEY = "islet-focus-session";

export interface Focus {
  /** Vrai quand une session est marquée et que le minuteur tourne encore. */
  active: boolean;
  /** Durée de la session en cours, ou la durée choisie quand il n'y en a pas. */
  minutes: number;
  /** Secondes restantes, relues du minuteur du notch. */
  remainingSeconds: number;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

function read(): number | null {
  try {
    return decodeFocusMinutes(localStorage.getItem(FOCUS_KEY));
  } catch {
    return null;
  }
}

function remember(minutes: number | null) {
  try {
    if (minutes === null) localStorage.removeItem(FOCUS_KEY);
    else localStorage.setItem(FOCUS_KEY, encodeFocusMinutes(minutes));
  } catch {
    // Stockage refusé : la session de cette fois vit quand même, en mémoire.
  }
}

export function useFocus(countdown: Countdown, minutes: number): Focus {
  const [marked, setMarked] = useState<number | null>(read);

  const active = focusActive(marked, countdown.running, countdown.finished, countdown.paused);

  useEffect(() => {
    if (marked === null) return;
    // En pause, la session tient : c'est une interruption, pas un abandon.
    if (countdown.running || countdown.paused) return;
    setMarked(null);
    remember(null);
  }, [marked, countdown.running, countdown.paused]);

  const start = useCallback(() => {
    const seconds = focusSeconds(minutes);
    countdown.start(seconds);
    const chosen = Math.round(seconds / 60);
    setMarked(chosen);
    remember(chosen);
  }, [countdown, minutes]);

  const stop = useCallback(() => {
    countdown.reset();
    setMarked(null);
    remember(null);
  }, [countdown]);

  const toggle = useCallback(() => {
    if (active) stop();
    else start();
  }, [active, start, stop]);

  return {
    active,
    minutes: marked ?? minutes,
    remainingSeconds: countdown.remainingSeconds,
    start,
    stop,
    toggle,
  };
}
