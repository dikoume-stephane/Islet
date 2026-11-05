/**
 * Shelf — the logic behind "drop a file on the notch and find it again".
 *
 * Same split as the clipboard and the lyrics: Rust touches the file system
 * (does the file still exist, how big is it), this file decides everything
 * else (what a file *is*, how it sorts, how a size reads, what a name looks
 * like in a 90 px row) and can be tested without Windows.
 *
 * The shelf stores **references, never copies**. Dropping a 4 GB video must
 * cost nothing, and deleting the original must be visible rather than silently
 * leaving a ghost that cannot be opened.
 */

export interface ShelfEntry {
  /** Stable across sessions: derived from the path by the backend. */
  id: string;
  /** Absolute path, as the shell gave it. */
  path: string;
  /** Bytes. Zero for folders and for files that vanished. */
  size: number;
  /** Unix milliseconds. */
  added_at: number;
  /** The file was deleted or moved since it was dropped. */
  missing: boolean;
}

export type ShelfKind = "image" | "video" | "audio" | "document" | "archive" | "code" | "folder" | "other";

export interface ShelfItem extends ShelfEntry {
  /** Last path segment, for the row. */
  name: string;
  /** What the icon and the label use. */
  kind: ShelfKind;
}

/** How many files the shelf holds. Past this, the oldest one leaves. */
export const MAX_SHELF_ITEMS = 24;

const KIND_BY_EXTENSION: Record<string, ShelfKind> = {
  // Images
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image",
  svg: "image", ico: "image", avif: "image", heic: "image",
  // Video
  mp4: "video", mkv: "video", mov: "video", avi: "video", webm: "video", wmv: "video", m4v: "video",
  // Audio
  mp3: "audio", flac: "audio", wav: "audio", ogg: "audio", m4a: "audio", aac: "audio", opus: "audio",
  // Documents
  pdf: "document", doc: "document", docx: "document", odt: "document", rtf: "document",
  txt: "document", md: "document", xls: "document", xlsx: "document", ods: "document",
  ppt: "document", pptx: "document", odp: "document", csv: "document", epub: "document",
  // Archives
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  bz2: "archive", xz: "archive", iso: "archive",
  // Code
  ts: "code", tsx: "code", js: "code", jsx: "code", json: "code", html: "code", css: "code",
  py: "code", rs: "code", cs: "code", cpp: "code", c: "code", h: "code", java: "code",
  go: "code", rb: "code", php: "code", sh: "code", ps1: "code", yml: "code", yaml: "code",
  toml: "code", sql: "code", xml: "code",
};

/** The extension of a path, lowercased, or "" when there is none. */
export function extensionOf(path: string): string {
  const name = fileName(path);
  const dot = name.lastIndexOf(".");
  // A leading dot is a hidden file, not an extension: `.gitignore` has none.
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/** Last segment of a Windows or POSIX path. */
export function fileName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const cut = Math.max(trimmed.lastIndexOf("\\"), trimmed.lastIndexOf("/"));
  return cut >= 0 ? trimmed.slice(cut + 1) : trimmed;
}

/** What a file is, from its name only. */
export function kindOf(path: string, isFolder = false): ShelfKind {
  if (isFolder) return "folder";
  return KIND_BY_EXTENSION[extensionOf(path)] ?? "other";
}

/** True when the path looks like a directory (no extension and no dot). */
export function looksLikeFolder(path: string): boolean {
  return extensionOf(path) === "";
}

/** Bytes to a readable pair the UI can translate: `{ value: 1.2, unit: "mb" }`. */
export function sizeOf(bytes: number): { value: number; unit: "bytes" | "kb" | "mb" | "gb" } {
  if (!Number.isFinite(bytes) || bytes <= 0) return { value: 0, unit: "bytes" };
  if (bytes < 1024) return { value: Math.round(bytes), unit: "bytes" };
  const kb = bytes / 1024;
  if (kb < 1024) return { value: kb < 10 ? Math.round(kb * 10) / 10 : Math.round(kb), unit: "kb" };
  const mb = kb / 1024;
  if (mb < 1024) return { value: mb < 10 ? Math.round(mb * 10) / 10 : Math.round(mb), unit: "mb" };
  const gb = mb / 1024;
  return { value: Math.round(gb * 10) / 10, unit: "gb" };
}

/**
 * The key two entries are compared on.
 *
 * Windows paths are case-insensitive and a file dropped from Explorer can come
 * back with different capitalisation, so `C:\Temp\A.txt` and `c:\temp\a.txt`
 * are the same shelf item.
 */
export function dedupeKey(path: string): string {
  return path.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
}

/** The display shape of one entry. */
export function toItem(entry: ShelfEntry): ShelfItem {
  return {
    ...entry,
    name: fileName(entry.path) || entry.path,
    kind: entry.missing ? "other" : kindOf(entry.path, entry.size === 0 && looksLikeFolder(entry.path)),
  };
}

/**
 * Add paths to the shelf.
 *
 * Newest first, no duplicates, capped. A path that is already there moves to
 * the front rather than being added twice: dropping the same file again means
 * "I am working on this now", not "I want two of them".
 */
export function mergeShelf(
  current: ShelfEntry[],
  incoming: ShelfEntry[],
  cap = MAX_SHELF_ITEMS,
): ShelfEntry[] {
  const seen = new Set<string>();
  const out: ShelfEntry[] = [];

  for (const entry of [...incoming, ...current]) {
    const key = dedupeKey(entry.path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
    if (out.length >= cap) break;
  }
  return out;
}

/** Remove one entry by id. */
export function removeFromShelf(items: ShelfEntry[], id: string): ShelfEntry[] {
  return items.filter((item) => item.id !== id);
}

/** Drop every entry whose file is gone. */
export function withoutMissing(items: ShelfEntry[]): ShelfEntry[] {
  return items.filter((item) => !item.missing);
}

/** How many entries point at a file that no longer exists. */
export function countMissing(items: ShelfEntry[]): number {
  return items.reduce((total, item) => (item.missing ? total + 1 : total), 0);
}

/**
 * Newest first, but a missing file always sits at the end.
 *
 * A broken entry at the top of a six-row list is a broken list; at the bottom
 * it is an invitation to clean up.
 */
export function orderShelf(items: ShelfEntry[]): ShelfEntry[] {
  return [...items].sort((a, b) => {
    if (a.missing !== b.missing) return a.missing ? 1 : -1;
    return b.added_at - a.added_at;
  });
}

/**
 * The tail of a path, for a tooltip: `C:\Users\me\Documents\plan.pdf` becomes
 * `Documents\plan.pdf`. Two segments is enough to recognise a file without
 * making the tooltip wider than the screen.
 */
export function shortPath(path: string, segments = 2): string {
  const parts = path.replace(/\//g, "\\").split("\\").filter(Boolean);
  if (parts.length <= segments + 1) return path;
  return `…\\${parts.slice(-segments).join("\\")}`;
}

/** How many items are shown at once before the list scrolls. */
export const VISIBLE_ROWS = 5;
