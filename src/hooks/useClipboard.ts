import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ClipItem } from "../lib/clipboard";

/**
 * Bind the notch panel to the Rust clipboard store.
 *
 * The store is the source of truth: it answers `clipboard_get_state` on mount
 * (the notch may open long after the first copy) and then pushes the whole list
 * on every change. Nothing is mirrored locally, so a language switch, a pin or
 * a removal can never leave the two sides out of step.
 */
export function useClipboard() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [recording, setRecording] = useState(true);

  useEffect(() => {
    let alive = true;

    invoke<ClipItem[]>("clipboard_get_state")
      .then((list) => alive && setItems(list))
      .catch(() => {});
    invoke<boolean>("clipboard_is_recording")
      .then((value) => alive && setRecording(value))
      .catch(() => {});

    const changed = listen<ClipItem[]>("clipboard-changed", (event) => {
      if (alive) setItems(event.payload);
    });
    const toggled = listen<boolean>("clipboard-recording", (event) => {
      if (alive) setRecording(event.payload);
    });

    return () => {
      alive = false;
      changed.then((off) => off()).catch(() => {});
      toggled.then((off) => off()).catch(() => {});
    };
  }, []);

  /** Copy an entry back to the clipboard. */
  const copy = useCallback(async (id: string) => {
    await invoke("clipboard_copy", { id }).catch(() => {});
  }, []);

  /** Copy and paste into the window the user came from. */
  const paste = useCallback(async (id: string) => {
    await invoke("clipboard_paste", { id }).catch(() => {});
  }, []);

  const togglePin = useCallback(async (id: string) => {
    const next = await invoke<ClipItem[]>("clipboard_toggle_pin", { id }).catch(() => null);
    if (next) setItems(next);
  }, []);

  const remove = useCallback(async (id: string) => {
    const next = await invoke<ClipItem[]>("clipboard_remove", { id }).catch(() => null);
    if (next) setItems(next);
  }, []);

  const clear = useCallback(async () => {
    const next = await invoke<ClipItem[]>("clipboard_clear").catch(() => null);
    if (next) setItems(next);
  }, []);

  const setRecordingState = useCallback(async (enabled: boolean) => {
    await invoke("clipboard_set_recording", { enabled }).catch(() => {});
    setRecording(enabled);
  }, []);

  return { items, recording, copy, paste, togglePin, remove, clear, setRecording: setRecordingState };
}
