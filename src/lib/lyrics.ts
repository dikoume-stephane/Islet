/**
 * Lyrics — parsing and playback policy, with no network and no React.
 *
 * Same split as the clipboard: Rust fetches LRCLIB and keeps a cache on disk,
 * this file decides everything that can be decided (which line is current, how
 * a click maps back to a seek position, how a malformed file degrades) and the
 * panel only draws the result.
 *
 * The interesting decisions are all here:
 *
 * * **A file with timestamps beats a file without.** LRCLIB returns both when
 *   it can; the plain version is the fallback, not an alternative view.
 * * **The offset belongs to the user, not the file.** Some rips drift by a few
 *   hundred milliseconds; the ± control shifts the lookup, never the data, so
 *   moving it back and forth cannot corrupt anything.
 * * **Nothing here throws.** A truncated download, a `[00:xx]` typo or an HTML
 *   error page must degrade to "no lyrics", never to a blank panel.
 */

export interface LyricLine {
  /** Milliseconds from the start of the track. */
  at: number;
  text: string;
}

export type LyricsStatus =
  /** Nothing asked yet, or the track changed and the old answer is gone. */
  | "idle"
  /** A request is in flight. */
  | "loading"
  /** Timed lines are available. */
  | "synced"
  /** Only unsynchronised text is available. */
  | "plain"
  /** The provider answered, and it does not have this track. */
  | "not-found"
  /** The request failed: offline, timeout, bad response. */
  | "error";

export interface LyricsDoc {
  status: LyricsStatus;
  /** Timed lines, sorted, empty unless `status === "synced"`. */
  lines: LyricLine[];
  /** Paragraphs of untimed lyrics, empty unless `status === "plain"`. */
  plain: string[];
  /** Where the lyrics came from. Empty when there are none. */
  provider: string;
  /** True when the document was served from the on-disk cache. */
  cached: boolean;
  /** LRCLIB knows this track is instrumental. */
  instrumental: boolean;
}

export const EMPTY_LYRICS: LyricsDoc = {
  status: "idle",
  lines: [],
  plain: [],
  provider: "",
  cached: false,
  instrumental: false,
};

/** How far the user may shift the lyrics, in milliseconds. */
export const MAX_OFFSET_MS = 5000;
/** One press of the ± control. */
export const OFFSET_STEP_MS = 250;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** `[offset:+250]`: a whole-file correction some editors write. */
const OFFSET_TAG = /^offset:\s*([+-]?\d+)$/i;

/** `[ar:...]`, `[ti:...]`, `[length:03:12]` and friends. */
const META_TAG = /^[a-z]+:.*$/i;

/**
 * One `[..]` group to milliseconds, or null if it is not a timestamp.
 *
 * `[ar:Artist]` reaches this function too, so returning null has to be the
 * normal path rather than an exception. Accepts `mm:ss`, `mm:ss.xx`,
 * `mm:ss.xxx`, `mm:ss:xx` and the rarer `h:mm:ss.xx`.
 */
export function parseTimestamp(stamp: string): number | null {
  const parts = stamp.replace(/\s+/g, "").split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  // `[00:12:40]` is ambiguous: `mm:ss:xx` in the files some editors write,
  // `h:mm:ss` in the ones that genuinely run past the hour. A zero first part
  // can only be the former, so that is the tie-break.
  let hoursRaw = "0";
  let minutesRaw: string;
  let secondsRaw: string;
  let fractionRaw: string | undefined;

  if (parts.length === 2) {
    [minutesRaw, secondsRaw] = parts;
  } else if (Number(parts[0]) > 0) {
    [hoursRaw, minutesRaw, secondsRaw] = parts;
  } else {
    minutesRaw = parts[0];
    secondsRaw = parts[1];
    fractionRaw = parts[2];
  }

  if (!/^\d{1,3}$/.test(hoursRaw) || !/^\d{1,3}$/.test(minutesRaw)) return null;

  const seconds = /^(\d{1,2})(?:[.:](\d{1,3}))?$/.exec(secondsRaw);
  if (!seconds) return null;
  const value = Number(seconds[1]);
  if (value > 59) return null;

  const digits = fractionRaw ?? seconds[2];
  // ".5" is 500 ms, ".05" is 50, ".005" is 5: the digits are decimal places,
  // not a raw count of milliseconds.
  const fraction = digits === undefined || digits === "" ? 0 : Math.round(Number(`0.${digits}`) * 1000);

  return Number(hoursRaw) * 3_600_000 + Number(minutesRaw) * 60_000 + value * 1000 + fraction;
}

/**
 * An LRC file to timed lines.
 *
 * Handles the cases that actually appear in the wild: several timestamps on one
 * line (a chorus repeated later), metadata tags, `[offset:]`, Windows line
 * endings, and duplicate timestamps left by badly merged files.
 */
export function parseLrc(raw: string): LyricLine[] {
  if (!raw) return [];

  const parsed: LyricLine[] = [];
  let globalOffset = 0;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Leading run of [..] groups, then the text.
    const stamps: number[] = [];
    let rest = line;
    while (rest.startsWith("[")) {
      const close = rest.indexOf("]");
      if (close < 0) break;
      const inner = rest.slice(1, close);
      rest = rest.slice(close + 1);

      const offset = OFFSET_TAG.exec(inner);
      if (offset) {
        globalOffset = Number(offset[1]) || 0;
        continue;
      }
      if (META_TAG.test(inner)) continue;

      const at = parseTimestamp(inner);
      if (at !== null) stamps.push(at);
    }

    // A line made only of metadata carries no lyric text.
    if (stamps.length === 0) continue;
    const text = rest.trim();
    for (const at of stamps) parsed.push({ at, text });
  }

  // `[offset:250]` means "make everything 250 ms later".
  const shifted = globalOffset === 0
    ? parsed
    : parsed.map((line) => ({ at: Math.max(0, line.at + globalOffset), text: line.text }));

  return sortAndDedupe(shifted);
}

/**
 * Sort by time and drop duplicate timestamps.
 *
 * Two lines at the same millisecond is always an artefact (merged files,
 * re-synced edits); keeping both makes the panel flicker between them on every
 * position tick. The first non-empty one wins, because empty lines are used as
 * "clear the screen" markers and must not erase a line with words in it.
 */
function sortAndDedupe(lines: LyricLine[]): LyricLine[] {
  const sorted = [...lines].sort((a, b) => a.at - b.at);
  const out: LyricLine[] = [];
  for (const line of sorted) {
    const last = out[out.length - 1];
    if (last && last.at === line.at) {
      if (!last.text && line.text) out[out.length - 1] = line;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Untimed lyrics to paragraphs. A blank line separates them. */
export function splitPlain(raw: string): string[] {
  if (!raw) return [];
  return raw
    // A blank line, with or without stray spaces, ends a paragraph.
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .join("\n"),
    )
    .filter((block) => block !== "");
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

/**
 * Index of the line that should be on screen at `positionMs`, or -1.
 *
 * Binary search rather than `findLast`: the position updates several times a
 * second for hours, and a linear scan of a 300 line file on every tick is a
 * small cost paid a thousand times an evening.
 *
 * `offsetMs` is the user's correction, positive meaning "show the lyrics
 * later", so it is subtracted from the position rather than added to the data.
 */
export function lineAt(lines: LyricLine[], positionMs: number, offsetMs = 0): number {
  if (lines.length === 0) return -1;
  const target = positionMs - offsetMs;
  if (target < lines[0].at) return -1;

  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].at <= target) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/**
 * Where to seek so that clicking a line puts it at the top.
 *
 * The inverse of `lineAt`: we want `position - offset == line.at`.
 */
export function seekTarget(line: LyricLine, offsetMs = 0): number {
  return Math.max(0, line.at + offsetMs);
}

/** How far through its own line the playback is, 0 to 1. */
export function lineProgress(lines: LyricLine[], index: number, positionMs: number, offsetMs = 0): number {
  if (index < 0 || index >= lines.length) return 0;
  const start = lines[index].at;
  const end = index + 1 < lines.length ? lines[index + 1].at : start + 4000;
  const span = end - start;
  if (span <= 0) return 1;
  const value = (positionMs - offsetMs - start) / span;
  return Math.min(1, Math.max(0, value));
}

/** Clamp an offset to what the control allows. */
export function clampOffset(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.max(-MAX_OFFSET_MS, Math.min(MAX_OFFSET_MS, Math.round(ms / OFFSET_STEP_MS) * OFFSET_STEP_MS));
}

/**
 * `+1.5 s`, `-0.25 s`, `0 s`.
 *
 * The decimal separator is a parameter because the lib has no access to the
 * active language and must not import it: French wants a comma, English a dot.
 */
export function formatOffset(ms: number, decimalSeparator = "."): string {
  const rounded = clampOffset(ms);
  if (rounded === 0) return "0 s";
  const sign = rounded > 0 ? "+" : "-";
  const magnitude = Math.abs(rounded) / 1000;
  const text = Number.isInteger(magnitude) ? String(magnitude) : magnitude.toFixed(2).replace(/0$/, "");
  return `${sign}${text.replace(".", decimalSeparator)} s`;
}

// ---------------------------------------------------------------------------
// Provider responses
// ---------------------------------------------------------------------------

/** Shape of a successful LRCLIB `/api/get` answer, as far as we rely on it. */
interface LrclibPayload {
  syncedLyrics?: unknown;
  plainLyrics?: unknown;
  instrumental?: unknown;
  trackName?: unknown;
  artistName?: unknown;
}

/**
 * Read an LRCLIB body.
 *
 * Written as a defensive parser over `unknown` because the body comes from the
 * network: a proxy page, a captive portal or a future API change must all land
 * on `not-found` instead of throwing inside a React effect.
 */
export function parseLrclib(raw: unknown): LyricsDoc {
  if (raw === null || typeof raw !== "object") return { ...EMPTY_LYRICS, status: "not-found" };
  const payload = raw as LrclibPayload;

  const syncedRaw = typeof payload.syncedLyrics === "string" ? payload.syncedLyrics : "";
  const plainRaw = typeof payload.plainLyrics === "string" ? payload.plainLyrics : "";
  const instrumental = payload.instrumental === true;

  const lines = parseLrc(syncedRaw);
  if (lines.length > 0) {
    return { status: "synced", lines, plain: [], provider: "lrclib", cached: false, instrumental };
  }

  const plain = splitPlain(plainRaw);
  if (plain.length > 0) {
    return { status: "plain", lines: [], plain, provider: "lrclib", cached: false, instrumental };
  }

  // Instrumental tracks have neither field set: that is an answer, not a miss.
  if (instrumental) {
    return { status: "plain", lines: [], plain: [], provider: "lrclib", cached: false, instrumental: true };
  }

  return { ...EMPTY_LYRICS, status: "not-found" };
}

/** Does this track get a lyrics button at all? */
export function canHaveLyrics(title: string, artist: string, durationMs: number): boolean {
  if (!title.trim()) return false;
  // A stream has no timeline: timestamps would land nowhere.
  if (durationMs <= 0) return false;
  // Local files and videos report a filename artist; LRCLIB has nothing for it.
  if (!artist.trim()) return false;
  return true;
}

/** Should the panel fall back to the plain view? */
export function isSynced(doc: LyricsDoc): boolean {
  return doc.status === "synced" && doc.lines.length > 0;
}

/**
 * What to say when there is nothing on screen.
 *
 * Kept as a key rather than a sentence so the caller translates at render.
 */
export function emptyReasonKey(doc: LyricsDoc): string | null {
  switch (doc.status) {
    case "idle":
      return null;
    case "loading":
      return null;
    case "not-found":
      return "lyrics.notFound";
    case "error":
      return "lyrics.error";
    case "plain":
      return doc.instrumental ? "lyrics.instrumental" : null;
    default:
      return null;
  }
}
