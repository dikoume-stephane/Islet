import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { normalizeTasks, postponeToTomorrow, type Task } from "../lib/todo";

/**
 * Les tâches du jour.
 *
 * Le fichier vit côté Rust (`todos.json`, à côté de `settings.json`) : c'est
 * une donnée à vous, pas un réglage, et elle doit survivre à l'app comme à une
 * réinstallation. Le backend renvoie toujours la liste entière après une
 * commande, jamais un différentiel : une seule vérité, relue.
 *
 * Tout ce qui décide (retard, report, saisie d'une heure) vit dans
 * `src/lib/todo.ts`, où c'est testé sans React.
 */

interface UseTodosOptions {
  /** Le réglage `islet-todo-enabled`. Éteint : rien n'est lu ni écrit. */
  enabled: boolean;
}

export interface TodoState {
  tasks: Task[];
  /** Vrai une fois la première lecture faite, pour ne pas clignoter à vide. */
  ready: boolean;
  add: (title: string, dueAt: number | null) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  setDue: (id: string, dueAt: number | null) => Promise<void>;
  postpone: (task: Task) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearDone: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useTodos({ enabled }: UseTodosOptions): TodoState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);

  /** Une commande, puis la liste autoritaire qu'elle renvoie. */
  const call = useCallback(async (command: string, args?: Record<string, unknown>) => {
    const list = await invoke<Task[]>(command, args).catch(() => null);
    if (list) setTasks(normalizeTasks(list));
  }, []);

  const reload = useCallback(async () => {
    const list = await invoke<Task[]>("todo_list").catch(() => null);
    if (list) setTasks(normalizeTasks(list));
    setReady(true);
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const add = useCallback(
    async (title: string, dueAt: number | null) => {
      // `dueAt` absent plutôt que `null` : un `null` explicite est accepté par
      // le backend, mais l'absence est ce que Tauri transmet le plus sûrement.
      await call("todo_add", { title, dueAt: dueAt ?? undefined });
    },
    [call],
  );

  const toggle = useCallback((id: string) => call("todo_toggle", { id }), [call]);
  const setDue = useCallback((id: string, dueAt: number | null) => call("todo_set_due", { id, dueAt: dueAt ?? undefined }), [call]);
  const remove = useCallback((id: string) => call("todo_remove", { id }), [call]);
  const clearDone = useCallback(() => call("todo_clear_done"), [call]);

  const postpone = useCallback(
    async (task: Task) => {
      const moved = postponeToTomorrow(task);
      await call("todo_set_due", { id: task.id, dueAt: moved.dueAt ?? undefined });
    },
    [call],
  );

  return { tasks, ready, add, toggle, setDue, postpone, remove, clearDone, reload };
}
