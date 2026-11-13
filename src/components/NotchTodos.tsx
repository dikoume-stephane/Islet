import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Plus, Trash2, X } from "lucide-react";
import { useLanguage, useT } from "../i18n";
import { cleanTitle, counts, dayOffset, groupTasks, isLate, parseDueInput, type Task } from "../lib/todo";
import type { TodoState } from "../hooks/useTodos";

/**
 * La to-do du jour, dans le notch.
 *
 * Trois principes d'affichage :
 *
 * * **Le retard est visible, jamais criard.** Une tâche en retard remonte en
 *   tête de liste avec une pastille ambre et un bouton « reporter à demain ».
 * * **Une tâche n'est jamais supprimée par accident.** Cocher se défait d'un
 *   clic ; supprimer demande une icône dédiée, et il n'y a pas de suppression
 *   groupée des tâches ouvertes.
 * * **Une liste vide explique le geste.** C'est le seul moment où l'explication
 *   tient à l'écran.
 */

interface NotchTodosProps {
  todos: TodoState;
  onClose: () => void;
}

/** Les libellés d'échéance vieillissent tout seuls : on les rafraîchit. */
function useNowTick(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function NotchTodos({ todos, onClose }: NotchTodosProps) {
  const t = useT();
  const language = useLanguage();
  const now = useNowTick(30_000);

  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [invalid, setInvalid] = useState(false);

  const grouped = useMemo(() => groupTasks(todos.tasks, now), [todos.tasks, now]);
  const summary = counts(todos.tasks, now);

  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }),
    [language],
  );
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }),
    [language],
  );

  const dueChip = (task: Task): string => {
    if (task.dueAt === null) return "";
    if (isLate(task, now)) return t("todo.late");
    const offset = dayOffset(now, task.dueAt);
    if (offset === 0) return timeFormat.format(task.dueAt);
    if (offset === 1) return t("todo.tomorrow");
    return dayFormat.format(task.dueAt);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = cleanTitle(title);
    if (clean === "") return;
    const parsed = parseDueInput(due, Date.now());
    if (!parsed.ok) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setTitle("");
    setDue("");
    void todos.add(clean, parsed.dueAt);
  };

  const row = (task: Task) => (
    <li key={task.id} className={`todo-row${task.done ? " is-done" : ""}${isLate(task, now) ? " is-late" : ""}`}>
      <button
        className="todo-check"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? t("todo.markOpen") : t("todo.markDone")}
        onClick={() => void todos.toggle(task.id)}
      >
        {task.done && <Check size={11} strokeWidth={3} />}
      </button>
      <button className="todo-title" onClick={() => void todos.toggle(task.id)} title={task.title}>
        {task.title}
      </button>
      {dueChip(task) !== "" && <span className="todo-chip">{dueChip(task)}</span>}
      <span className="todo-tools">
        {!task.done && (
          <button
            className="todo-tool"
            aria-label={t("todo.postpone")}
            title={t("todo.postpone")}
            onClick={() => void todos.postpone(task)}
          >
            <CalendarClock size={12} />
          </button>
        )}
        <button
          className="todo-tool danger"
          aria-label={t("todo.remove")}
          title={t("todo.remove")}
          onClick={() => void todos.remove(task.id)}
        >
          <Trash2 size={12} />
        </button>
      </span>
    </li>
  );

  const section = (key: string, label: string, tasks: Task[], extra?: React.ReactNode) =>
    tasks.length === 0 ? null : (
      <div className="todo-section" key={key}>
        <div className="todo-section-head">
          <span className={`todo-section-title${key === "late" ? " is-late" : ""}`}>{label}</span>
          <span className="todo-section-count">{tasks.length}</span>
          {extra}
        </div>
        <ul className="todo-list">{tasks.map(row)}</ul>
      </div>
    );

  return (
    <div className="todo-panel">
      <div className="todo-header">
        <span className="todo-heading">{t("todo.title")}</span>
        <span className="todo-count">
          {summary.open > 0 ? t("todo.count", { count: summary.open }) : ""}
          {summary.late > 0 && <span className="todo-late-badge">{t("todo.lateCount", { count: summary.late })}</span>}
        </span>
        <button className="todo-tool" aria-label={t("wc.close")} onClick={onClose}>
          <X size={13} />
        </button>
      </div>

      <form className={`todo-add${invalid ? " is-invalid" : ""}`} onSubmit={submit}>
        <input
          className="todo-add-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("todo.addPlaceholder")}
          aria-label={t("todo.addPlaceholder")}
          spellCheck={false}
        />
        <input
          className="todo-add-time"
          value={due}
          onChange={(event) => {
            setDue(event.target.value);
            setInvalid(false);
          }}
          placeholder={t("todo.timePlaceholder")}
          aria-label={t("todo.timeLabel")}
          aria-invalid={invalid}
          spellCheck={false}
        />
        <button className="todo-add-button" type="submit" aria-label={t("todo.add")} disabled={cleanTitle(title) === ""}>
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </form>
      {invalid && <span className="todo-add-error">{t("todo.invalidTime")}</span>}

      <div className="todo-body">
        {!todos.ready ? null : summary.total === 0 ? (
          <div className="todo-empty">
            <span className="todo-empty-title">{t("todo.empty")}</span>
            <span className="todo-empty-hint">{t("todo.emptyHint")}</span>
          </div>
        ) : (
          <>
            {section(
              "late",
              t("todo.sectionLate"),
              grouped.late,
              <button className="todo-postpone-all" onClick={() => grouped.late.forEach((task) => void todos.postpone(task))}>
                {t("todo.postponeAll")}
              </button>,
            )}
            {section("today", t("todo.sectionToday"), grouped.today)}
            {section("later", t("todo.sectionLater"), grouped.later)}
            {section(
              "done",
              t("todo.sectionDone"),
              grouped.done,
              <button className="todo-postpone-all" onClick={() => void todos.clearDone()}>
                {t("todo.clearDone")}
              </button>,
            )}
          </>
        )}
      </div>
    </div>
  );
}
