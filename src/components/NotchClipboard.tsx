import { useEffect, useMemo, useRef, useState } from "react";
import { Pin, PinOff, Search, Trash2, Pause, Play, X } from "lucide-react";
import { useT } from "../i18n";
import {
  countClips,
  describeSize,
  orderClips,
  previewOf,
  relativeTime,
  searchClips,
  hiddenChars,
  type ClipItem,
} from "../lib/clipboard";
import { useClipboard } from "../hooks/useClipboard";

/**
 * The clipboard panel that lives in the notch.
 *
 * Deliberately the same shape as the calendar module: a header, a scrollable
 * body, no chrome of its own. It is a place to look, not a window to manage.
 *
 * Clicking an entry copies it; holding the `pasteOnClick` preference pastes it
 * straight into the window the user came from. Both go through Rust: a webview
 * cannot read the Windows clipboard on its own, and pretending otherwise would
 * be a lie the first time someone tried it with a password manager open.
 */

interface NotchClipboardProps {
  /** Paste into the previous window instead of only copying. */
  pasteOnClick: boolean;
  /** Close the panel (Escape, or the header button). */
  onClose: () => void;
}

export function NotchClipboard({ pasteOnClick, onClose }: NotchClipboardProps) {
  const t = useT();
  const { items, recording, copy, paste, togglePin, remove, clear, setRecording } = useClipboard();
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const now = Date.now();

  // One field, one job: the panel opens for "give me back what I just copied",
  // and typing is how you find it. Auto-focus on a desktop panel with a single
  // primary input is the case the guideline allows.
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const visible = useMemo(() => orderClips(searchClips(items, query)), [items, query]);
  const counts = countClips(items);
  const pinned = visible.filter((item) => item.pinned);
  const recent = visible.filter((item) => !item.pinned);

  const activate = async (item: ClipItem) => {
    if (pasteOnClick) {
      // Paste returns the user to where they were; keeping the panel open over
      // the window we just typed into would hide the result of the gesture.
      await paste(item.id);
      setFlash(item.id);
      window.setTimeout(onClose, 220);
      return;
    }
    await copy(item.id);
    setFlash(item.id);
    // Long enough to read, short enough not to become a state.
    window.setTimeout(() => setFlash((current) => (current === item.id ? null : current)), 1200);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    // Enter copies the first match: type three letters, hit Enter, paste. The
    // whole feature in one gesture.
    if (event.key === "Enter" && query.trim() && visible.length > 0) {
      event.preventDefault();
      void activate(visible[0]);
    }
  };

  const row = (item: ClipItem) => {
    const preview = previewOf(item);
    const hidden = hiddenChars(item);
    return (
      <li key={item.id} className="clip-row">
        <button
          type="button"
          className={`clip-main${flash === item.id ? " clip-main--flash" : ""}`}
          onClick={() => void activate(item)}
          title={preview}
          aria-label={`${t("clip.copy")}: ${preview}`}
        >
          <span className="clip-preview">{flash === item.id ? t("clip.copied") : preview}</span>
          <span className="clip-meta">
            {relativeTime(item.at, now, t)}
            <span className="clip-dot" aria-hidden>
              ·
            </span>
            {describeSize(item, t)}
            {hidden > 0 && (
              <>
                <span className="clip-dot" aria-hidden>
                  ·
                </span>
                {t("clip.truncated", { count: hidden })}
              </>
            )}
          </span>
        </button>

        <div className="clip-actions">
          <button
            type="button"
            className={`clip-action${item.pinned ? " is-pinned" : ""}`}
            aria-label={t(item.pinned ? "clip.unpin" : "clip.pin")}
            aria-pressed={item.pinned}
            title={t(item.pinned ? "clip.unpin" : "clip.pin")}
            onClick={() => void togglePin(item.id)}
          >
            {item.pinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
          <button
            type="button"
            className="clip-action"
            aria-label={t("clip.remove")}
            title={t("clip.remove")}
            onClick={() => void remove(item.id)}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="clipboard-panel" onKeyDown={onKeyDown}>
      {/* The row swopping to "Copied" is a visual confirmation; this is the
          same information for a screen reader, which has no row to watch. */}
      <span className="clip-announce" role="status" aria-live="polite">
        {flash ? t("clip.copied") : ""}
      </span>
      <div className="clip-header">
        <span className="clip-title">{t("clip.title")}</span>
        <span className="clip-count">
          {counts.total > 0 ? t("clip.count", { count: counts.total }) : ""}
          {!recording && (
            <span className="clip-badge">{t("clip.paused")}</span>
          )}
        </span>
        <div className="clip-header-actions">
          <button
            type="button"
            className="clip-action"
            aria-label={t(recording ? "clip.pause" : "clip.resume")}
            aria-pressed={!recording}
            title={t(recording ? "clip.pause" : "clip.resume")}
            onClick={() => void setRecording(!recording)}
          >
            {recording ? <Pause size={11} /> : <Play size={11} />}
          </button>
          <button type="button" className="clip-action" aria-label={t("wc.close")} title={t("wc.close")} onClick={onClose}>
            <X size={12} />
          </button>
        </div>
      </div>

      <label className="clip-search">
        <Search size={11} aria-hidden />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("clip.search")}
          aria-label={t("clip.search")}
          spellCheck={false}
        />
      </label>

      <div className="clip-list">
        {visible.length === 0 ? (
          <p className="clip-empty">{query.trim() ? t("clip.emptySearch") : t("clip.empty")}</p>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <div className="clip-section">{t("clip.pinned")}</div>
                <ul className="clip-rows">{pinned.map(row)}</ul>
              </>
            )}
            {recent.length > 0 && (
              <>
                <div className="clip-section">{t("clip.recent")}</div>
                <ul className="clip-rows">{recent.map(row)}</ul>
              </>
            )}
          </>
        )}
      </div>

      <div className="clip-footer">
        <span className="clip-privacy">{t("clip.privacy")}</span>
        {counts.total > counts.pinned && (
          <button type="button" className="clip-clear" onClick={() => void clear()} title={t("clip.clearHint")}>
            {t("clip.clear")}
          </button>
        )}
      </div>
    </div>
  );
}
