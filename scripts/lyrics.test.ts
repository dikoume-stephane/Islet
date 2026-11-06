import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_LYRICS,
  MAX_OFFSET_MS,
  OFFSET_STEP_MS,
  canHaveLyrics,
  clampOffset,
  emptyReasonKey,
  formatOffset,
  isSynced,
  lineAt,
  lineProgress,
  parseLrclib,
  parseLrc,
  parseTimestamp,
  seekTarget,
  splitPlain,
  type LyricLine,
} from "../src/lib/lyrics.ts";

/**
 * Lyrics: the parts that break in the real world.
 *
 * Every case here is something that exists in an LRC file on someone's disk,
 * or a shape an HTTP endpoint has actually returned.
 */

const SAMPLE = [
  "[ar:Daft Punk]",
  "[ti:One More Time]",
  "[length:05:20]",
  "[00:12.40]One more time",
  "[00:15.00]We're gonna celebrate",
  "[00:19.10]Oh yeah, alright",
  "[00:22.60]Don't stop the dancing",
].join("\n");

describe("parseTimestamp", () => {
  it("reads mm:ss", () => {
    assert.equal(parseTimestamp("00:12"), 12_000);
  });

  it("reads hundredths", () => {
    assert.equal(parseTimestamp("00:12.40"), 12_400);
  });

  it("reads thousandths", () => {
    assert.equal(parseTimestamp("01:02.345"), 62_345);
  });

  it("reads hours", () => {
    assert.equal(parseTimestamp("1:02:03.50"), 3_723_500);
  });

  it("accepts a colon as the fraction separator", () => {
    assert.equal(parseTimestamp("00:12:40"), 12_400);
  });

  it("tolerates spaces", () => {
    assert.equal(parseTimestamp(" 00: 12.40 "), 12_400);
  });

  it("refuses metadata", () => {
    assert.equal(parseTimestamp("ar:Daft Punk"), null);
    assert.equal(parseTimestamp("offset:+250"), null);
  });

  it("refuses impossible seconds", () => {
    assert.equal(parseTimestamp("00:75"), null);
  });

  it("refuses a single number", () => {
    assert.equal(parseTimestamp("42"), null);
    assert.equal(parseTimestamp(""), null);
  });
});

describe("parseLrc", () => {
  it("returns the timed lines in order", () => {
    const lines = parseLrc(SAMPLE);
    assert.equal(lines.length, 4);
    assert.deepEqual(lines[0], { at: 12_400, text: "One more time" });
    assert.deepEqual(lines[3], { at: 22_600, text: "Don't stop the dancing" });
  });

  it("never returns a metadata line as a lyric", () => {
    const texts = parseLrc(SAMPLE).map((line) => line.text);
    assert.ok(!texts.some((text) => text.includes("Daft Punk")));
    assert.ok(!texts.some((text) => text.includes("05:20")));
  });

  it("sorts an unsorted file", () => {
    const lines = parseLrc("[00:30.00]Third\n[00:10.00]First\n[00:20.00]Second");
    assert.deepEqual(lines.map((line) => line.text), ["First", "Second", "Third"]);
  });

  it("expands several timestamps on one line", () => {
    const lines = parseLrc("[00:10.00][01:20.00]Chorus");
    assert.equal(lines.length, 2);
    assert.deepEqual(lines.map((line) => line.at), [10_000, 80_000]);
    assert.ok(lines.every((line) => line.text === "Chorus"));
  });

  it("applies a global offset", () => {
    const lines = parseLrc("[offset:+250]\n[00:10.00]Late");
    assert.equal(lines[0].at, 10_250);
  });

  it("never produces a negative time", () => {
    const lines = parseLrc("[offset:-5000]\n[00:02.00]Clipped");
    assert.equal(lines[0].at, 0);
  });

  it("keeps one line per timestamp", () => {
    const lines = parseLrc("[00:10.00]First\n[00:10.00]Second");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].text, "First");
  });

  it("prefers words over an empty marker at the same time", () => {
    const lines = parseLrc("[00:10.00]\n[00:10.00]Something");
    assert.equal(lines.length, 1);
    assert.equal(lines[0].text, "Something");
  });

  it("keeps an empty line that clears the screen", () => {
    const lines = parseLrc("[00:10.00]Words\n[00:14.00]");
    assert.equal(lines.length, 2);
    assert.equal(lines[1].text, "");
  });

  it("handles Windows line endings", () => {
    const lines = parseLrc("[00:10.00]One\r\n[00:20.00]Two\r\n");
    assert.equal(lines.length, 2);
  });

  it("returns nothing for junk", () => {
    assert.deepEqual(parseLrc(""), []);
    assert.deepEqual(parseLrc("<html><body>403</body></html>"), []);
    assert.deepEqual(parseLrc("just words, no stamps"), []);
  });

  it("does not throw on an unclosed bracket", () => {
    assert.deepEqual(parseLrc("[00:10.00 Words"), []);
  });
});

describe("splitPlain", () => {
  it("separates paragraphs on blank lines", () => {
    assert.deepEqual(splitPlain("First line\nstill first\n\nSecond block"), [
      "First line\nstill first",
      "Second block",
    ]);
  });

  it("collapses repeated blank lines", () => {
    assert.deepEqual(splitPlain("A\n\n\n\nB"), ["A", "B"]);
  });

  it("trims and drops empty input", () => {
    assert.deepEqual(splitPlain("  \n\n A \n\n "), ["A"]);
    assert.deepEqual(splitPlain(""), []);
  });
});

describe("lineAt", () => {
  const lines: LyricLine[] = [
    { at: 1000, text: "a" },
    { at: 5000, text: "b" },
    { at: 9000, text: "c" },
  ];

  it("returns -1 before the first line", () => {
    assert.equal(lineAt(lines, 0), -1);
    assert.equal(lineAt(lines, 999), -1);
  });

  it("returns the line at its exact timestamp", () => {
    assert.equal(lineAt(lines, 1000), 0);
    assert.equal(lineAt(lines, 5000), 1);
  });

  it("holds the current line between lines", () => {
    assert.equal(lineAt(lines, 4999), 0);
    assert.equal(lineAt(lines, 8999), 1);
  });

  it("keeps the last line on screen at the end of the track", () => {
    assert.equal(lineAt(lines, 600_000), 2);
  });

  it("returns -1 for an empty file", () => {
    assert.equal(lineAt([], 5000), -1);
  });

  it("shifts the lookup by the user's offset", () => {
    // +500 ms means "show the lyrics half a second later".
    assert.equal(lineAt(lines, 5200), 1);
    assert.equal(lineAt(lines, 5200, 500), -1 + 1);
  });

  it("stays coherent when the offset is negative", () => {
    assert.equal(lineAt(lines, 4600), 0);
    assert.equal(lineAt(lines, 4600, -500), 1);
  });
});

describe("seekTarget", () => {
  it("is the inverse of lineAt", () => {
    const lines: LyricLine[] = [
      { at: 1000, text: "a" },
      { at: 5000, text: "b" },
    ];
    const target = seekTarget(lines[1], 250);
    assert.equal(target, 5250);
    assert.equal(lineAt(lines, target, 250), 1);
  });

  it("never seeks before the start", () => {
    assert.equal(seekTarget({ at: 100, text: "a" }, -5000), 0);
  });
});

describe("lineProgress", () => {
  const lines: LyricLine[] = [
    { at: 0, text: "a" },
    { at: 4000, text: "b" },
  ];

  it("runs from 0 to 1 across a line", () => {
    assert.equal(lineProgress(lines, 0, 0), 0);
    assert.equal(lineProgress(lines, 0, 2000), 0.5);
    assert.equal(lineProgress(lines, 0, 4000), 1);
  });

  it("clamps outside the line", () => {
    assert.equal(lineProgress(lines, 0, -500), 0);
    assert.equal(lineProgress(lines, 1, 99_000), 1);
  });

  it("returns 0 for no line", () => {
    assert.equal(lineProgress(lines, -1, 1000), 0);
  });

  it("gives the last line a default length", () => {
    assert.equal(lineProgress(lines, 1, 6000), 0.5);
  });
});

describe("clampOffset", () => {
  it("rounds to the step", () => {
    assert.equal(clampOffset(137), OFFSET_STEP_MS);
    assert.equal(clampOffset(-137), -OFFSET_STEP_MS);
  });

  it("clamps to the allowed range", () => {
    assert.equal(clampOffset(99_999), MAX_OFFSET_MS);
    assert.equal(clampOffset(-99_999), -MAX_OFFSET_MS);
  });

  it("survives nonsense", () => {
    assert.equal(clampOffset(Number.NaN), 0);
    assert.equal(clampOffset(Number.POSITIVE_INFINITY), 0);
  });
});

describe("formatOffset", () => {
  it("shows a sign", () => {
    assert.equal(formatOffset(1500), "+1.5 s");
    assert.equal(formatOffset(-250), "-0.25 s");
  });

  it("shows plain zero", () => {
    assert.equal(formatOffset(0), "0 s");
  });

  it("drops a trailing zero", () => {
    assert.equal(formatOffset(1000), "+1 s");
  });

  it("uses the requested decimal separator", () => {
    assert.equal(formatOffset(1500, ","), "+1,5 s");
  });

  it("clamps before formatting", () => {
    assert.equal(formatOffset(60_000), "+5 s");
  });
});

describe("parseLrclib", () => {
  it("prefers the synced version", () => {
    const doc = parseLrclib({
      syncedLyrics: "[00:01.00]Hello",
      plainLyrics: "Hello",
      instrumental: false,
    });
    assert.equal(doc.status, "synced");
    assert.equal(doc.lines.length, 1);
    assert.equal(doc.plain.length, 0);
    assert.equal(doc.provider, "lrclib");
  });

  it("falls back to plain text", () => {
    const doc = parseLrclib({ syncedLyrics: null, plainLyrics: "Hello\n\nWorld" });
    assert.equal(doc.status, "plain");
    assert.deepEqual(doc.plain, ["Hello", "World"]);
  });

  it("does not treat a broken synced file as empty when plain exists", () => {
    const doc = parseLrclib({ syncedLyrics: "[nope]", plainLyrics: "Hello" });
    assert.equal(doc.status, "plain");
  });

  it("reports an instrumental track as an answer", () => {
    const doc = parseLrclib({ syncedLyrics: null, plainLyrics: null, instrumental: true });
    assert.equal(doc.status, "plain");
    assert.equal(doc.instrumental, true);
    assert.equal(emptyReasonKey(doc), "lyrics.instrumental");
  });

  it("reports a miss", () => {
    assert.equal(parseLrclib({ syncedLyrics: null, plainLyrics: null }).status, "not-found");
  });

  it("survives a body that is not an object", () => {
    assert.equal(parseLrclib("<html>").status, "not-found");
    assert.equal(parseLrclib(null).status, "not-found");
    assert.equal(parseLrclib(42).status, "not-found");
  });

  it("survives wrong field types", () => {
    const doc = parseLrclib({ syncedLyrics: 12, plainLyrics: ["a"] });
    assert.equal(doc.status, "not-found");
  });
});

describe("canHaveLyrics", () => {
  it("needs a title and an artist", () => {
    assert.equal(canHaveLyrics("Song", "Artist", 200_000), true);
    assert.equal(canHaveLyrics("", "Artist", 200_000), false);
    assert.equal(canHaveLyrics("Song", "  ", 200_000), false);
  });

  it("refuses a stream", () => {
    assert.equal(canHaveLyrics("Live radio", "Station", 0), false);
    assert.equal(canHaveLyrics("Live radio", "Station", -1), false);
  });
});

describe("emptyReasonKey", () => {
  it("stays silent while loading or idle", () => {
    assert.equal(emptyReasonKey({ ...EMPTY_LYRICS, status: "idle" }), null);
    assert.equal(emptyReasonKey({ ...EMPTY_LYRICS, status: "loading" }), null);
  });

  it("names the failure", () => {
    assert.equal(emptyReasonKey({ ...EMPTY_LYRICS, status: "not-found" }), "lyrics.notFound");
    assert.equal(emptyReasonKey({ ...EMPTY_LYRICS, status: "error" }), "lyrics.error");
  });

  it("says nothing when there is text to show", () => {
    assert.equal(emptyReasonKey({ ...EMPTY_LYRICS, status: "plain", plain: ["a"] }), null);
  });
});

describe("isSynced", () => {
  it("needs the synced status and at least one line", () => {
    assert.equal(isSynced({ ...EMPTY_LYRICS, status: "synced", lines: [{ at: 0, text: "a" }] }), true);
    assert.equal(isSynced({ ...EMPTY_LYRICS, status: "synced" }), false);
    assert.equal(isSynced({ ...EMPTY_LYRICS, status: "plain", plain: ["a"] }), false);
  });
});

describe("typography", () => {
  it("never uses an em dash in what the parser produces", () => {
    const lines = parseLrc("[00:01.00]One\n[00:02.00]Two");
    assert.ok(lines.every((line) => !line.text.includes("\u2014")));
  });

  it("never uses three dots in the offsets", () => {
    for (const ms of [0, 250, -250, 5000, -5000]) {
      assert.ok(!formatOffset(ms).includes("..."));
    }
  });
});
