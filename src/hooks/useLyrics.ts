import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  EMPTY_LYRICS,
  OFFSET_STEP_MS,
  canHaveLyrics,
  clampOffset,
  lineAt,
  parseLrclib,
  type LyricsDoc,
} from "../lib/lyrics";

/**
 * Lyrics for the track that is playing.
 *
 * Three jobs, and no fourth:
 *
 * 1. Ask Rust for the lyrics of the current track, once per track.
 * 2. Keep a live playback position, because `media-update` arrives a few times
 *    a minute and a highlighted line needs a smoother clock than that.
 * 3. Hold the user's offset, which is a preference and outlives the track.
 *
 * The parsing, the ordering and the "which line" decision are in
 * `src/lib/lyrics.ts`. Nothing here re-implements them.
 */

/** Debounce before asking. Skipping through a playlist must not fire ten requests. */
const ASK_DELAY_MS = 700;
/** Same cadence as the compact player: fast enough for words, cheap enough to ignore. */
const TICK_MS = 250;
/** The offset is a preference, tuned once and remembered. */
const OFFSET_KEY = "islet-lyrics-offset";

interface LyricsResponse {
  body: string;
  outcome: "found" | "missing" | "error" | "disabled";
  cached: boolean;
  message: string;
}

interface UseLyricsOptions {
  /** The `islet-lyrics-enabled` setting. Nothing leaves the machine when false. */
  enabled: boolean;
  /**
   * Whether the lyrics panel is on screen.
   *
   * The request waits for this: turning the feature on in the settings arms it,
   * opening the panel is what fires it. A track you never look at never leaves
   * a trace on a server.
   */
  visible: boolean;
  title: string;
  artist: string;
  durationMs: number;
  positionMs: number;
  positionUpdatedAt: number;
  isPlaying: boolean;
}

export interface LyricsState {
  doc: LyricsDoc;
  /** Current line index, or -1 before the first line. */
  current: number;
  /** Live position in milliseconds, for the highlight and the progress. */
  position: number;
  /** The user's correction, in milliseconds. */
  offset: number;
  shiftEarlier: () => void;
  shiftLater: () => void;
  resetOffset: () => void;
  /** Ask again after a failure. */
  retry: () => void;
}

function readStoredOffset(): number {
  const raw = localStorage.getItem(OFFSET_KEY);
  if (raw === null) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? clampOffset(value) : 0;
}

export function useLyrics(options: UseLyricsOptions): LyricsState {
  const { enabled, visible, title, artist, durationMs, positionMs, positionUpdatedAt, isPlaying } = options;

  const [doc, setDoc] = useState<LyricsDoc>(EMPTY_LYRICS);
  const [offset, setOffset] = useState<number>(readStoredOffset);
  const [attempt, setAttempt] = useState(0);

  // The clock. `media-update` is a few times a minute; the highlight needs
  // better than that, so the position is extrapolated from the last sample.
  const basePosRef = useRef(positionMs);
  const baseTimeRef = useRef(positionUpdatedAt || Date.now());
  useEffect(() => {
    basePosRef.current = positionMs;
    baseTimeRef.current = positionUpdatedAt || Date.now();
  }, [positionMs, positionUpdatedAt]);

  const [position, setPosition] = useState(positionMs);
  useEffect(() => {
    const tick = () => {
      const elapsed = isPlaying ? Date.now() - baseTimeRef.current : 0;
      const next = basePosRef.current + elapsed;
      setPosition(durationMs > 0 ? Math.min(next, durationMs) : next);
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [isPlaying, durationMs]);

  // One request per track, only while the panel is open, only when the feature
  // is on. `fetchedRef` keeps a reopen from asking twice; `failedRef` lets a
  // failure try again on the next visit instead of sticking forever.
  const fetchedRef = useRef("");
  const failedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (!visible) return;
    if (!enabled || !canHaveLyrics(title, artist, durationMs)) return;

    const key = `${title}|${artist}|${durationMs}`;
    if (key === fetchedRef.current && !failedRef.current) return;

    fetchedRef.current = key;
    failedRef.current = false;
    setDoc({ ...EMPTY_LYRICS, status: "loading" });

    const settle = (next: LyricsDoc, failed: boolean) => {
      if (cancelled) return;
      failedRef.current = failed;
      setDoc(next);
    };

    const timer = window.setTimeout(() => {
      invoke<LyricsResponse>("lyrics_fetch", { track: title, artist, durationMs })
        .then((response) => {
          if (response.outcome === "found") {
            let payload: unknown = null;
            try {
              payload = JSON.parse(response.body);
            } catch {
              settle({ ...EMPTY_LYRICS, status: "error" }, true);
              return;
            }
            // `parseLrclib` decides everything except the cache flag, which the
            // parser has no way to know.
            settle({ ...parseLrclib(payload), cached: response.cached }, false);
            return;
          }
          if (response.outcome === "missing") {
            settle({ ...EMPTY_LYRICS, status: "not-found" }, false);
            return;
          }
          if (response.outcome === "disabled") {
            // The setting is off: behave as if nothing had been asked.
            settle(EMPTY_LYRICS, false);
            return;
          }
          settle({ ...EMPTY_LYRICS, status: "error" }, true);
        })
        .catch(() => settle({ ...EMPTY_LYRICS, status: "error" }, true));
    }, ASK_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // `attempt` lets "retry" replay the same request against the same key.
  }, [enabled, visible, title, artist, durationMs, attempt]);

  const storeOffset = useCallback((value: number) => {
    const next = clampOffset(value);
    setOffset(next);
    if (next === 0) localStorage.removeItem(OFFSET_KEY);
    else localStorage.setItem(OFFSET_KEY, String(next));
  }, []);

  const shiftEarlier = useCallback(() => storeOffset(offset - OFFSET_STEP_MS), [offset, storeOffset]);
  const shiftLater = useCallback(() => storeOffset(offset + OFFSET_STEP_MS), [offset, storeOffset]);
  const resetOffset = useCallback(() => storeOffset(0), [storeOffset]);
  const retry = useCallback(() => {
    failedRef.current = false;
    setAttempt((value) => value + 1);
  }, []);

  const current = lineAt(doc.lines, position, offset);

  return { doc, current, position, offset, shiftEarlier, shiftLater, resetOffset, retry };
}
