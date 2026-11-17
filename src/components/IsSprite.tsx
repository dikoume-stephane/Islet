import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { BLINK_DURATION_MS, frameFor, nextBlinkDelay, type IsMood } from "../lib/character";
import "./IsSprite.css";

/**
 * Is, dessiné.
 *
 * Le personnage est un SVG plutôt qu'une image : ses yeux suivent le curseur,
 * il cligne des yeux à intervalles irréguliers, il respire, et tout cela doit
 * pouvoir changer sans qu'on retouche un fichier binaire.
 *
 * Le composant ne décide rien : `frameFor` lui dit l'ouverture des yeux, la
 * bouche, le halo et la durée du souffle. Deux horloges seulement vivent ici,
 * le clignement et son aléatoire, parce qu'elles sont locales au dessin.
 *
 * `prefers-reduced-motion` coupe le souffle **et** le clignement : un
 * personnage figé n'est pas une régression, c'est la demande.
 */

export interface IsSpriteProps {
  mood: IsMood;
  /** Côté du carré, en pixels. */
  size?: number;
  /** Direction unitaire du regard, voir `gazeVector`. */
  gaze?: { x: number; y: number };
  /** Couleur du halo, celle du conseil quand il y en a un. */
  accent?: string;
  className?: string;
}

/** Déplacement maximal des yeux, en unités du dessin (côté 48). */
const GAZE_SHIFT = 2.6;

export function IsSprite({ mood, size = 20, gaze, accent = "#FFFFFF", className }: IsSpriteProps) {
  const reduceMotion = useReducedMotion();
  const frame = frameFor(mood);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    // Un personnage endormi ne cligne pas : ses yeux sont déjà fermés.
    if (reduceMotion || mood === "sleeping") {
      setBlinking(false);
      return;
    }
    let cancelled = false;
    let reopen: ReturnType<typeof setTimeout> | undefined;
    let next: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      next = setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        reopen = setTimeout(() => {
          if (cancelled) return;
          setBlinking(false);
          schedule();
        }, BLINK_DURATION_MS);
      }, nextBlinkDelay(Math.random()));
    };

    schedule();
    return () => {
      cancelled = true;
      if (next) clearTimeout(next);
      if (reopen) clearTimeout(reopen);
    };
  }, [reduceMotion, mood]);

  const closed = mood === "sleeping" || blinking;
  const eyeRy = Math.min(3.2 * Math.max(frame.eyeOpen, 0.2), 4.2);
  const eyeRx = frame.eyeOpen > 1 ? 3.35 : 3.2;
  const dx = (gaze?.x ?? 0) * GAZE_SHIFT;
  const dy = (gaze?.y ?? 0) * GAZE_SHIFT;

  const style = {
    width: size,
    height: size,
    "--is-accent": accent,
    "--is-breath": `${frame.breath}ms`,
    "--is-aura": frame.aura,
  } as CSSProperties;

  return (
    <span
      className={["is-sprite", reduceMotion ? "is-still" : "", className ?? ""].filter(Boolean).join(" ")}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width={size} height={size} focusable="false" role="presentation">
        {frame.aura > 0 && <circle className="is-sprite-aura" cx="24" cy="26" r="16" />}

        <g className="is-sprite-body">
          {/* Le palmier, puis le corps : le tronc sort de la tête. */}
          <path className="is-sprite-palm" d="M24 12.4 C24.4 8.4 25.8 5.4 28.4 3.4" />
          <path d="M28.4 3.4 C31.2 0.4 35.6 0.1 38 2.1 C35.2 4.7 31 5.4 28.4 3.4 Z" />
          <path d="M27.8 3.3 C25.4 0.3 21.4 0.1 19.2 2.1 C22 4.6 25.6 5.2 27.8 3.3 Z" />
          <path d="M29 4.2 C31.6 4.1 33.8 6.1 34.2 8.9 C31.2 8.6 29.1 6.6 29 4.2 Z" />
          <path
            d="M9.5 34.4 V26 C9.5 18.1 16 11.5 24 11.5 C32 11.5 38.5 18.1 38.5 26 V34.4
               C36.3 36.8 33.5 36.8 31.4 34.7 C29.3 32.6 26.7 32.6 24.6 34.7
               C22.4 32.6 19.7 32.6 17.6 34.7 C15.5 36.8 12.7 36.8 10.5 34.4 Z"
          />
        </g>

        {frame.blush && (
          <g className="is-sprite-blush">
            <ellipse cx="15.2" cy="27.4" rx="2.4" ry="1.4" />
            <ellipse cx="32.8" cy="27.4" rx="2.4" ry="1.4" />
          </g>
        )}

        <g className="is-sprite-eyes" style={{ transform: `translate(${dx}px, ${dy}px)` }}>
          {closed ? (
            <>
              <path d="M16.3 23.2 Q19.4 27 22.5 23.2" />
              <path d="M25.5 23.2 Q28.6 27 31.7 23.2" />
            </>
          ) : (
            <>
              <ellipse cx="19.4" cy="24" rx={eyeRx} ry={eyeRy} />
              <ellipse cx="28.6" cy="24" rx={eyeRx} ry={eyeRy} />
              <circle className="is-sprite-glint" cx="20.4" cy="22.9" r="1.1" />
              <circle className="is-sprite-glint" cx="29.6" cy="22.9" r="1.1" />
            </>
          )}
        </g>

        {frame.mouth === "w" && <path className="is-sprite-mouth" d="M21 30.4 q1.5 1.9 3 0 q1.5 1.9 3 0" />}
        {frame.mouth === "smile" && <path className="is-sprite-mouth" d="M20.4 29.6 Q24 34.2 27.6 29.6" />}
        {frame.mouth === "o" && <ellipse className="is-sprite-mouth-solid" cx="24" cy="31" rx="2" ry="2.5" />}
        {(frame.mouth === "flat" || frame.mouth === "sleep") && (
          <path className="is-sprite-mouth" d="M21 31 h6" />
        )}
      </svg>
    </span>
  );
}
