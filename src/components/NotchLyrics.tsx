import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, RotateCcw, RefreshCw, X } from "lucide-react";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n/en";
import { formatOffset, lineProgress, seekTarget, type LyricLine } from "../lib/lyrics";
import type { LyricsState } from "../hooks/useLyrics";

/**
 * The lyrics panel.
 *
 * Same grammar as the clipboard and the calendar: the notch draws the surface,
 * this component arranges rows inside it.
 *
 * Two things make it feel alive without ever misbehaving:
 *
 * * The list scrolls itself to keep the current line in the middle, but only
 *   when the user has not scrolled by hand in the last few seconds. A panel
 *   that yanks itself back while you read ahead is worse than no follow.
 * * Clicking a line seeks to it. The offset moves the target with the lyrics,
 *   so a corrected file stays consistent when you jump around.
 */

interface NotchLyricsProps {
  lyrics: LyricsState;
  title: string;
  artist: string;
  durationMs: number;
  /** Jump the player to a position, in milliseconds. */
  onSeek: (positionMs: number) => void;
  onClose: () => void;
  /** Decimal separator for the offset: a comma in French. */
  decimalSeparator: string;
}

export function NotchLyrics({
  lyrics,
  title,
  artist,
  durationMs,
  onSeek,
  onClose,
  decimalSeparator,
}: NotchLyricsProps) {
  const t = useT();
  const { doc, current, position, offset, shiftEarlier, shiftLater, resetOffset, retry } = lyrics;
  const listRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  // Timestamp of the last manual scroll. While it is recent, the panel leaves
  // the list exactly where the user put it.
  const manualUntilRef = useRef(0);

  useEffect(() => {
    if (Date.now() < manualUntilRef.current) return;
    const node = currentRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  const jump = (line: LyricLine) => {
    onSeek(Math.min(durationMs || line.at, seekTarget(line, offset)));
  };

  const status = (key: MessageKey, extra?: React.ReactNode) => (
    <div className="lyr-status" role="status" aria-live="polite">
      <span>{t(key)}</span>
      {extra}
    </div>
  );

  return (
    <div className="lyrics-panel" onKeyDown={onKeyDown}>
      {/* The track is the context: a panel of words with no song title above
          them is a panel you cannot trust. */}
      <div className="lyr-header">
        <span className="lyr-track" title={`${title} · ${artist}`}>
          <span className="lyr-track-title">{title || t("lyrics.noTrack")}</span>
          {artist && <span className="lyr-track-artist">{artist}</span>}
        </span>
        <button type="button" className="lyr-action" aria-label={t("wc.close")} title={t("wc.close")} onClick={onClose}>
          <X size={12} />
        </button>
      </div>

      <div
        className="lyr-body"
        ref={listRef}
        onWheel={() => {
          manualUntilRef.current = Date.now() + 4000;
        }}
        onTouchMove={() => {
          manualUntilRef.current = Date.now() + 4000;
        }}
      >
        {doc.status === "loading" ? (
          <div className="lyr-skeleton" aria-hidden>
            {[0, 1, 2, 3, 4].map((row) => (
              <span key={row} className="lyr-skeleton-line" style={{ width: `${58 + ((row * 13) % 34)}%` }} />
            ))}
          </div>
        ) : doc.status === "synced" ? (
          <div className="lyr-lines">
            {doc.lines.map((line, index) => {
              const isCurrent = index === current;
              const past = index < current;
              return (
                <button
                  key={`${line.at}-${index}`}
                  ref={isCurrent ? currentRef : undefined}
                  type="button"
                  className={`lyr-line${isCurrent ? " is-current" : ""}${past ? " is-past" : ""}`}
                  onClick={() => jump(line)}
                  aria-current={isCurrent ? "true" : undefined}
                  title={t("lyrics.jump")}
                >
                  <span className="lyr-line-text">{line.text || "\u00a0"}</span>
                  {/* A hairline that fills across the line: enough to see the
                      words keep coming without a karaoke wipe over the text. */}
                  {isCurrent && (
                    <span
                      className="lyr-line-progress"
                      aria-hidden
                      style={{ transform: `scaleX(${lineProgress(doc.lines, index, position, offset)})` }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : doc.status === "plain" ? (
          doc.instrumental ? (
            status("lyrics.instrumental")
          ) : (
            <div className="lyr-plain">
              {doc.plain.map((block, index) => (
                <p key={index} className="lyr-plain-block">
                  {block}
                </p>
              ))}
            </div>
          )
        ) : doc.status === "not-found" ? (
          status("lyrics.notFound")
        ) : doc.status === "error" ? (
          status(
            "lyrics.error",
            <button type="button" className="lyr-retry" onClick={retry}>
              <RefreshCw size={10} aria-hidden />
              {t("lyrics.retry")}
            </button>,
          )
        ) : (
          status("lyrics.off")
        )}
      </div>

      <div className="lyr-footer">
        {doc.provider && (
          <span className="lyr-source">
            {doc.cached ? t("lyrics.cached") : t("lyrics.source")}
          </span>
        )}
        {/* The offset only means something against timed lines: offering it for
            plain text would be a control that does nothing. */}
        {doc.status === "synced" && (
        <div className="lyr-offset">
          <button
            type="button"
            className="lyr-action"
            aria-label={t("lyrics.offsetEarlier")}
            title={t("lyrics.offsetEarlier")}
            onClick={shiftEarlier}
          >
            <ChevronDown size={12} />
          </button>
          <button
            type="button"
            className={`lyr-offset-value${offset === 0 ? " is-zero" : ""}`}
            title={t("lyrics.offsetReset")}
            aria-label={t("lyrics.offsetReset")}
            onClick={resetOffset}
          >
            {formatOffset(offset, decimalSeparator)}
          </button>
          <button
            type="button"
            className="lyr-action"
            aria-label={t("lyrics.offsetLater")}
            title={t("lyrics.offsetLater")}
            onClick={shiftLater}
          >
            <ChevronUp size={12} />
          </button>
          {offset !== 0 && <RotateCcw size={9} className="lyr-offset-hint" aria-hidden />}
        </div>
        )}
      </div>
    </div>
  );
}
