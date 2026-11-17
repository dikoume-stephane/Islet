import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_SHELF_ITEMS,
  countMissing,
  dedupeKey,
  extensionOf,
  fileName,
  kindOf,
  looksLikeFolder,
  mergeShelf,
  orderShelf,
  removeFromShelf,
  shortPath,
  sizeOf,
  toItem,
  withoutMissing,
  type ShelfEntry,
} from "../src/lib/shelf.ts";

/**
 * Shelf: the things that go wrong when a file system is involved.
 *
 * Paths come from Explorer, so they can be uppercase, lowercase, UNC, with a
 * trailing slash, or already deleted by the time they reach the panel.
 */

const entry = (path: string, overrides: Partial<ShelfEntry> = {}): ShelfEntry => ({
  id: path.toLowerCase(),
  path,
  size: 1024,
  added_at: 1_000,
  missing: false,
  ...overrides,
});

describe("fileName", () => {
  it("reads the last Windows segment", () => {
    assert.equal(fileName("C:\\Users\\me\\plan.pdf"), "plan.pdf");
  });

  it("reads the last POSIX segment", () => {
    assert.equal(fileName("/home/me/plan.pdf"), "plan.pdf");
  });

  it("ignores a trailing slash", () => {
    assert.equal(fileName("C:\\Users\\me\\Documents\\"), "Documents");
  });

  it("returns the input when there is no separator", () => {
    assert.equal(fileName("plan.pdf"), "plan.pdf");
  });
});

describe("extensionOf", () => {
  it("lowercases the extension", () => {
    assert.equal(extensionOf("C:\\a\\Photo.JPG"), "jpg");
  });

  it("keeps multi-part extensions whole", () => {
    assert.equal(extensionOf("archive.tar.gz"), "gz");
  });

  it("treats a leading dot as a hidden file, not an extension", () => {
    assert.equal(extensionOf("C:\\repo\\.gitignore"), "");
  });

  it("handles a trailing dot", () => {
    assert.equal(extensionOf("weird."), "");
  });

  it("returns nothing for a folder", () => {
    assert.equal(extensionOf("C:\\Users\\me\\Documents"), "");
  });
});

describe("kindOf", () => {
  it("names the usual families", () => {
    assert.equal(kindOf("a.png"), "image");
    assert.equal(kindOf("a.mp4"), "video");
    assert.equal(kindOf("a.flac"), "audio");
    assert.equal(kindOf("a.pdf"), "document");
    assert.equal(kindOf("a.zip"), "archive");
    assert.equal(kindOf("a.ts"), "code");
  });

  it("falls back to other", () => {
    assert.equal(kindOf("a.qqq"), "other");
    assert.equal(kindOf("no-extension"), "other");
  });

  it("honours an explicit folder", () => {
    assert.equal(kindOf("C:\\Users\\me\\Documents", true), "folder");
  });
});

describe("looksLikeFolder", () => {
  it("is true without an extension", () => {
    assert.equal(looksLikeFolder("C:\\Users\\me\\Videos"), true);
  });

  it("is false with one", () => {
    assert.equal(looksLikeFolder("C:\\a\\clip.mp4"), false);
  });
});

describe("sizeOf", () => {
  it("keeps small sizes in bytes", () => {
    assert.deepEqual(sizeOf(512), { value: 512, unit: "bytes" });
  });

  it("steps through the units", () => {
    assert.deepEqual(sizeOf(2048), { value: 2, unit: "kb" });
    assert.deepEqual(sizeOf(5 * 1024 * 1024), { value: 5, unit: "mb" });
    assert.deepEqual(sizeOf(3 * 1024 * 1024 * 1024), { value: 3, unit: "gb" });
  });

  it("keeps one decimal for small values", () => {
    assert.deepEqual(sizeOf(1536), { value: 1.5, unit: "kb" });
  });

  it("rounds above ten", () => {
    assert.deepEqual(sizeOf(500 * 1024), { value: 500, unit: "kb" });
  });

  it("survives nonsense", () => {
    assert.deepEqual(sizeOf(0), { value: 0, unit: "bytes" });
    assert.deepEqual(sizeOf(-5), { value: 0, unit: "bytes" });
    assert.deepEqual(sizeOf(Number.NaN), { value: 0, unit: "bytes" });
  });
});

describe("dedupeKey", () => {
  it("ignores case, slashes and a trailing separator", () => {
    assert.equal(dedupeKey("C:/Temp/File.TXT"), "c:\\temp\\file.txt");
    assert.equal(dedupeKey("c:\\temp\\file.txt\\"), "c:\\temp\\file.txt");
  });
});

describe("toItem", () => {
  it("derives the name and the kind", () => {
    const item = toItem(entry("C:\\Users\\me\\photo.PNG", { size: 4096 }));
    assert.equal(item.name, "photo.PNG");
    assert.equal(item.kind, "image");
  });

  it("marks a folder when there is no extension and no size", () => {
    const item = toItem(entry("C:\\Users\\me\\Videos", { size: 0 }));
    assert.equal(item.kind, "folder");
  });

  it("does not pretend a missing file is a folder", () => {
    const item = toItem(entry("C:\\Users\\me\\gone", { size: 0, missing: true }));
    assert.equal(item.kind, "other");
  });

  it("keeps the path visible even when it has no name", () => {
    const item = toItem(entry("C:\\"));
    assert.ok(item.name.length > 0);
  });
});

describe("mergeShelf", () => {
  it("puts the newest first", () => {
    const result = mergeShelf([entry("C:\\a.txt")], [entry("C:\\b.txt", { added_at: 2_000 })]);
    assert.deepEqual(result.map((i) => i.path), ["C:\\b.txt", "C:\\a.txt"]);
  });

  it("does not duplicate the same file", () => {
    const result = mergeShelf([entry("C:\\a.txt")], [entry("c:\\A.TXT", { added_at: 2_000 })]);
    assert.equal(result.length, 1);
    assert.equal(result[0].added_at, 2_000);
  });

  it("moves a re-dropped file to the front", () => {
    const result = mergeShelf(
      [entry("C:\\a.txt", { added_at: 1 }), entry("C:\\b.txt", { added_at: 2 })],
      [entry("C:\\a.txt", { added_at: 3 })],
    );
    assert.deepEqual(result.map((i) => i.path), ["C:\\a.txt", "C:\\b.txt"]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: MAX_SHELF_ITEMS + 5 }, (_, index) =>
      entry(`C:\\f${index}.txt`, { added_at: index }),
    );
    const result = mergeShelf([], many);
    assert.equal(result.length, MAX_SHELF_ITEMS);
    // The oldest ones are the ones dropped.
    assert.equal(result[result.length - 1].path, `C:\\f${MAX_SHELF_ITEMS - 1}.txt`);
  });

  it("accepts a custom cap", () => {
    const result = mergeShelf([], [entry("C:\\a"), entry("C:\\b")], 1);
    assert.equal(result.length, 1);
  });

  it("keeps an empty shelf empty", () => {
    assert.deepEqual(mergeShelf([], []), []);
  });
});

describe("removeFromShelf", () => {
  it("removes by id", () => {
    const result = removeFromShelf([entry("C:\\a.txt"), entry("C:\\b.txt")], "c:\\a.txt");
    assert.deepEqual(result.map((i) => i.path), ["C:\\b.txt"]);
  });

  it("ignores an unknown id", () => {
    assert.equal(removeFromShelf([entry("C:\\a.txt")], "nope").length, 1);
  });
});

describe("missing files", () => {
  it("counts them", () => {
    const items = [entry("C:\\a"), entry("C:\\b", { missing: true }), entry("C:\\c", { missing: true })];
    assert.equal(countMissing(items), 2);
  });

  it("can drop them all", () => {
    const items = [entry("C:\\a"), entry("C:\\b", { missing: true })];
    assert.deepEqual(withoutMissing(items).map((i) => i.path), ["C:\\a"]);
  });
});

describe("orderShelf", () => {
  it("sorts newest first", () => {
    const items = [entry("C:\\old", { added_at: 1 }), entry("C:\\new", { added_at: 9 })];
    assert.deepEqual(orderShelf(items).map((i) => i.path), ["C:\\new", "C:\\old"]);
  });

  it("pushes missing entries to the bottom", () => {
    const items = [
      entry("C:\\gone", { added_at: 99, missing: true }),
      entry("C:\\here", { added_at: 1 }),
    ];
    assert.deepEqual(orderShelf(items).map((i) => i.path), ["C:\\here", "C:\\gone"]);
  });

  it("does not mutate the input", () => {
    const items = [entry("C:\\old", { added_at: 1 }), entry("C:\\new", { added_at: 9 })];
    orderShelf(items);
    assert.equal(items[0].path, "C:\\old");
  });
});

describe("shortPath", () => {
  it("keeps the last two segments", () => {
    assert.equal(shortPath("C:\\Users\\me\\Documents\\plan.pdf"), "…\\Documents\\plan.pdf");
  });

  it("leaves a short path alone", () => {
    assert.equal(shortPath("C:\\plan.pdf"), "C:\\plan.pdf");
  });

  it("normalises forward slashes", () => {
    assert.equal(shortPath("/home/me/a/b/c.txt", 1), "…\\c.txt");
  });
});

describe("typography", () => {
  it("uses a single ellipsis character, never three dots", () => {
    const path = shortPath("C:\\Users\\me\\Documents\\plan.pdf");
    assert.ok(path.startsWith("\u2026"));
    assert.ok(!path.includes("..."));
  });
});
