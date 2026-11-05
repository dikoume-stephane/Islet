import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { mergeShelf, type ShelfEntry } from "../lib/shelf";

/**
 * The shelf: files dropped on the notch, kept as references.
 *
 * Two sources feed it, and only one of them is the network of events:
 *
 * * the drop handler, which is the whole point, and
 * * `shelf_list` on mount, because the shelf outlives the process.
 *
 * Dropping a file changes nothing on disk: the path is remembered and the file
 * stays where it is. That is why the list can be cleared without a warning
 * dialog.
 */

interface UseShelfOptions {
  /** The `islet-shelf-enabled` setting. Off means no drop handler at all. */
  enabled: boolean;
}

export interface ShelfState {
  items: ShelfEntry[];
  /** A drop just happened: the panel uses this to open itself. */
  flash: number;
  /** True while a drop is hovering the notch. */
  hovering: boolean;
  add: (paths: string[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  /** Ask the backend to re-check which files still exist. */
  refresh: () => Promise<void>;
  /** Drop every entry whose file is gone. */
  pruneMissing: () => Promise<void>;
}

export function useShelf({ enabled }: UseShelfOptions): ShelfState {
  const [items, setItems] = useState<ShelfEntry[]>([]);
  const [flash, setFlash] = useState(0);
  const [hovering, setHovering] = useState(false);

  const load = useCallback(async () => {
    const list = await invoke<ShelfEntry[]>("shelf_list").catch(() => null);
    if (list) setItems(list);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The drop handler. Registered only while the feature is on: a disabled
  // shelf must not be a window that swallows files.
  useEffect(() => {
    if (!enabled) {
      setHovering(false);
      return;
    }

    let alive = true;
    const pending = getCurrentWebview().onDragDropEvent((event) => {
      if (!alive) return;
      const payload = event.payload;
      if (payload.type === "enter" || payload.type === "over") {
        setHovering(true);
        return;
      }
      if (payload.type === "leave") {
        setHovering(false);
        return;
      }
      setHovering(false);
      if (payload.paths.length === 0) return;
      // Optimistic insert so the row is there before the round trip; the
      // backend answers with the authoritative list right after.
      setItems((current) =>
        mergeShelf(
          current,
          payload.paths.map((path, index) => ({
            id: `pending-${index}-${path}`,
            path,
            size: 0,
            added_at: Date.now() + index,
            missing: false,
          })),
        ),
      );
      invoke<ShelfEntry[]>("shelf_add", { paths: payload.paths })
        .then((list) => {
          if (!alive) return;
          setItems(list);
          setFlash(Date.now());
        })
        .catch(() => {});
    });

    return () => {
      alive = false;
      pending.then((off) => off()).catch(() => {});
    };
  }, [enabled]);

  const add = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    const list = await invoke<ShelfEntry[]>("shelf_add", { paths }).catch(() => null);
    if (list) {
      setItems(list);
      setFlash(Date.now());
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const list = await invoke<ShelfEntry[]>("shelf_remove", { id }).catch(() => null);
    if (list) setItems(list);
  }, []);

  const clear = useCallback(async () => {
    const list = await invoke<ShelfEntry[]>("shelf_clear").catch(() => null);
    if (list) setItems(list);
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const pruneMissing = useCallback(async () => {
    const listed = await invoke<ShelfEntry[]>("shelf_list").catch(() => null);
    if (!listed) return;
    // One by one, from the list we just read: no bulk "delete everything that
    // looks broken" command, so a stale list can never wipe a healthy entry.
    let next = listed;
    for (const item of listed.filter((entry) => entry.missing)) {
      const answer = await invoke<ShelfEntry[]>("shelf_remove", { id: item.id }).catch(() => null);
      if (answer) next = answer;
    }
    setItems(next);
  }, []);

  return { items, flash, hovering, add, remove, clear, refresh, pruneMissing };
}
