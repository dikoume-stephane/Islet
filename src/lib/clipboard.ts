/**
 * Clipboard history, as data.
 *
 * The Rust side owns the Windows clipboard: it watches the sequence number,
 * reads the text and honours the formats password managers set to opt out. It
 * deliberately owns **no policy** — no ordering, no de-duplication, no pinning
 * rules. Those live here, in pure functions the test suite can walk without a
 * Windows machine, exactly like `pickTip` does for Is' tips.
 */

export type ClipKind = "text" | "image";

export interface ClipItem {
  /** Stable id derived from the content, so re-copying the same text merges. */
  id: string;
  kind: ClipKind;
  /** Raw text. Empty for images. */
  text: string;
  /** Character count of the original text, before any truncation. */
  chars: number;
  /** Unix milliseconds. */
  at: number;
  pinned: boolean;
  /** Application that owned the clipboard, when Windows could tell us. */
  source: string;
  /** The text was cut because it exceeded `MAX_TEXT_CHARS`. */
  truncated: boolean;
}

/** How many unpinned entries survive. Pinned entries are never counted out. */
export const MAX_ITEMS = 60;

/**
 * Upper bound on stored text. A copied log file can be megabytes wide and a
 * history panel has no use for all of it: memory is better spent elsewhere.
 */
export const MAX_TEXT_CHARS = 20_000;

/** Longest preview drawn in the notch, in characters. */
export const PREVIEW_CHARS = 96;

// — Identity ---------------------------------------------------------------

/**
 * FNV-1a over UTF-16 code units. Not a security hash: it only has to be stable
 * across restarts and cheap on 20 000 characters.
 */
export function hashContent(kind: ClipKind, text: string): string {
  // 32-bit FNV-1a, written with Math.imul so it stays in the integer range.
  let hash = 0x811c9dc5;
  const source = kind === "image" ? "image" : text;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${kind}-${(hash >>> 0).toString(36)}`;
}

/**
 * What we compare when deciding "is this the same entry?".
 *
 * Trailing spaces and Windows line endings change on every copy-paste round
 * trip, so comparing the raw text would stack the same sentence five times.
 */
export function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

// — Building an entry ------------------------------------------------------

export function makeClip(
  kind: ClipKind,
  rawText: string,
  at: number,
  source = "",
): ClipItem | null {
  const text = kind === "image" ? "" : rawText;
  if (kind === "text" && normalizeText(text).length === 0) return null;

  const truncated = text.length > MAX_TEXT_CHARS;
  // `slice` never splits a surrogate pair in half in the way `substring` on a
  // bad index would: we stay at a code-unit boundary, which is what the panel
  // and the re-copy path expect.
  const stored = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;

  return {
    id: hashContent(kind, normalizeText(stored)),
    kind,
    text: stored,
    chars: text.length,
    at,
    pinned: false,
    source,
    truncated,
  };
}

// — Mutations --------------------------------------------------------------

/**
 * Add a copied item to the history.
 *
 * Same content is merged rather than duplicated: the entry moves back to the
 * top and keeps its pin. That is the whole point of a clipboard history —
 * seeing the same string twice is noise.
 */
export function insertClip(
  list: ClipItem[],
  incoming: ClipItem,
  max = MAX_ITEMS,
): ClipItem[] {
  const existing = list.find((item) => item.id === incoming.id);
  const merged: ClipItem = existing
    ? { ...incoming, pinned: existing.pinned, at: incoming.at }
    : incoming;

  const rest = list.filter((item) => item.id !== incoming.id);
  return enforceCap([merged, ...rest], max);
}

/**
 * Trim to `max` entries, unpinned first.
 *
 * A pinned entry the user chose to keep must survive a busy afternoon of
 * copying; dropping it would be the one data loss this feature can cause.
 */
export function enforceCap(list: ClipItem[], max = MAX_ITEMS): ClipItem[] {
  if (list.length <= max) return list;

  const keep = new Set<ClipItem>();
  let unpinnedBudget = max - list.filter((item) => item.pinned).length;
  if (unpinnedBudget < 0) unpinnedBudget = 0;

  for (const item of list) {
    if (keep.size >= max) break;
    if (item.pinned) {
      keep.add(item);
    } else if (unpinnedBudget > 0) {
      keep.add(item);
      unpinnedBudget -= 1;
    }
  }

  // Preserve the incoming order rather than the insertion order of the set.
  return list.filter((item) => keep.has(item));
}

export function togglePin(list: ClipItem[], id: string): ClipItem[] {
  return list.map((item) =>
    item.id === id ? { ...item, pinned: !item.pinned } : item,
  );
}

export function removeClip(list: ClipItem[], id: string): ClipItem[] {
  return list.filter((item) => item.id !== id);
}

/** "Clear history" keeps what the user pinned, by definition of pinning. */
export function clearUnpinned(list: ClipItem[]): ClipItem[] {
  return list.filter((item) => item.pinned);
}

// — Reading ----------------------------------------------------------------

/** Case- and accent-insensitive, so "resume" finds "Résumé". */
export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Filter by query. Several words must all match, in any order: typing
 * "batterie 18" finds an entry that contains both, wherever they sit.
 */
export function searchClips(list: ClipItem[], query: string): ClipItem[] {
  const terms = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return list;

  return list.filter((item) => {
    const haystack = foldForSearch(`${item.text} ${item.source}`);
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Display order: pinned first, then most recent first.
 *
 * Pinning exists to keep something reachable; burying it under today's copies
 * would make the gesture pointless.
 */
export function orderClips(list: ClipItem[]): ClipItem[] {
  const pinned = list.filter((item) => item.pinned).sort((a, b) => b.at - a.at);
  const recent = list.filter((item) => !item.pinned).sort((a, b) => b.at - a.at);
  return [...pinned, ...recent];
}

/**
 * One-line summary for the notch.
 *
 * Line breaks and tabs collapse to spaces: a copied stack trace would otherwise
 * draw three lines in a box that has room for one.
 */
export function previewOf(item: ClipItem, max = PREVIEW_CHARS): string {
  if (item.kind === "image") return "";

  const flat = item.text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;

  // Cut on a word boundary when one is close enough, otherwise mid-word: a
  // preview that ends in a broken word reads worse than a hard cut.
  const slice = flat.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

/** How many characters the stored copy actually lost, for the "shortened" hint. */
export function hiddenChars(item: ClipItem): number {
  return Math.max(0, item.chars - item.text.length);
}

export function countClips(list: ClipItem[]): { total: number; pinned: number } {
  return {
    total: list.length,
    pinned: list.filter((item) => item.pinned).length,
  };
}

// — Time -------------------------------------------------------------------

/**
 * Short relative time. Deliberately coarse: "3 min" is all a clipboard panel
 * needs, and it keeps the row narrow.
 */
export function relativeTime(
  at: number,
  now: number,
  translate: (key: "clip.time.now" | "clip.time.minutes" | "clip.time.hours" | "clip.time.days", params?: Record<string, number>) => string,
): string {
  const minutes = Math.round((now - at) / 60_000);
  if (minutes < 1) return translate("clip.time.now");
  if (minutes < 60) return translate("clip.time.minutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return translate("clip.time.hours", { count: hours });
  return translate("clip.time.days", { count: Math.round(hours / 24) });
}

/** True when the entry is a single URL, which the panel draws differently. */
export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

/** Language-aware description of an entry's size, shown under the preview. */
export function describeSize(item: ClipItem, translate: (key: "clip.size.chars" | "clip.size.image", params?: Record<string, number>) => string): string {
  if (item.kind === "image") return translate("clip.size.image");
  return translate("clip.size.chars", { count: item.chars });
}
