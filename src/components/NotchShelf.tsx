import { useMemo } from "react";
import {
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  File as FileIcon,
  FolderOpen,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";
import { formatNumber, useT } from "../i18n";
import {
  countMissing,
  orderShelf,
  shortPath,
  sizeOf,
  toItem,
  type ShelfItem,
  type ShelfKind,
} from "../lib/shelf";
import type { ShelfState } from "../hooks/useShelf";

/**
 * The shelf panel.
 *
 * A file dropped on the notch lands here as a row: icon, name, size, and one
 * click to open it. Nothing is copied, so the row is a shortcut, not a copy —
 * which is also why a deleted file shows as "missing" instead of pretending.
 *
 * The empty state is not a consolation prize: a shelf nobody has used yet is
 * the moment to explain the gesture, and it is the only moment the explanation
 * fits.
 */

/** The size unit as a translation key, so the label stays in the dictionary. */
const UNIT_KEY = {
  bytes: "shelf.unit.bytes",
  kb: "shelf.unit.kb",
  mb: "shelf.unit.mb",
  gb: "shelf.unit.gb",
} as const;

const KIND_ICON: Record<ShelfKind, typeof FileIcon> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  archive: FileArchive,
  code: FileCode2,
  folder: Folder,
  other: FileIcon,
};

interface NotchShelfProps {
  shelf: ShelfState;
  /** Open a path with its default application. */
  onOpen: (path: string) => void;
  /** Show the file in Explorer. */
  onReveal: (path: string) => void;
  onClose: () => void;
}

export function NotchShelf({ shelf, onOpen, onReveal, onClose }: NotchShelfProps) {
  const t = useT();
  const { items, remove, clear, pruneMissing, hovering } = shelf;

  // Sorting is a decision, so it lives in the lib and is tested there.
  const rows = useMemo(() => orderShelf(items).map(toItem), [items]);
  const missing = countMissing(items);

  const sizeLabel = (item: ShelfItem): string => {
    if (item.missing) return t("shelf.missing");
    if (item.kind === "folder") return t("shelf.folder");
    const { value, unit } = sizeOf(item.size);
    return t(UNIT_KEY[unit], { value: formatNumber(value, { maximumFractionDigits: 1 }) });
  };

  return (
    <div className={`shelf-panel${hovering ? " is-dropping" : ""}`}>
      <div className="shelf-header">
        <span className="shelf-title">{t("shelf.title")}</span>
        <span className="shelf-count">
          {items.length > 0 ? t("shelf.count", { count: items.length }) : ""}
          {missing > 0 && (
            <button
              type="button"
              className="shelf-prune"
              onClick={() => void pruneMissing()}
              title={t("shelf.pruneHint")}
            >
              <AlertTriangle size={9} aria-hidden />
              {missing}
            </button>
          )}
        </span>
        <button type="button" className="shelf-action" aria-label={t("wc.close")} title={t("wc.close")} onClick={onClose}>
          <X size={12} />
        </button>
      </div>

      <div className="shelf-list">
        {rows.length === 0 ? (
          <div className="shelf-empty">
            <FolderOpen size={20} strokeWidth={1.4} aria-hidden />
            <span className="shelf-empty-title">{t("shelf.empty")}</span>
            <span className="shelf-empty-hint">{t("shelf.emptyHint")}</span>
          </div>
        ) : (
          <ul className="shelf-rows">
            {rows.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <li key={item.id} className={`shelf-row${item.missing ? " is-missing" : ""}`}>
                  <button
                    type="button"
                    className="shelf-main"
                    onClick={() => onOpen(item.path)}
                    title={shortPath(item.path, 3)}
                    disabled={item.missing}
                  >
                    <Icon size={15} strokeWidth={1.7} className="shelf-icon" aria-hidden />
                    <span className="shelf-text">
                      <span className="shelf-name">{item.name}</span>
                      <span className="shelf-meta">{sizeLabel(item)}</span>
                    </span>
                  </button>
                  <div className="shelf-actions">
                    <button
                      type="button"
                      className="shelf-action"
                      aria-label={t("shelf.reveal")}
                      title={t("shelf.reveal")}
                      onClick={() => onReveal(item.path)}
                      disabled={item.missing}
                    >
                      <FolderOpen size={11} />
                    </button>
                    <button
                      type="button"
                      className="shelf-action"
                      aria-label={t("shelf.remove")}
                      title={t("shelf.remove")}
                      onClick={() => void remove(item.id)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shelf-footer">
        <span className="shelf-note">{t("shelf.note")}</span>
        {items.length > 0 && (
          <button type="button" className="shelf-clear" onClick={() => void clear()} title={t("shelf.clearHint")}>
            {t("shelf.clear")}
          </button>
        )}
      </div>
    </div>
  );
}
