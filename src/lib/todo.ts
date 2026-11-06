/**
 * Les tâches du jour.
 *
 * Trois décisions portent ce fichier :
 *
 * 1. **Une échéance est un instant, pas un texte.** « 9h30 » devient un
 *    horodatage au moment de la saisie. Tout le reste (retard, demain, à venir)
 *    se calcule ensuite par comparaison, y compris après un redémarrage.
 * 2. **Une heure déjà passée veut dire demain.** Taper « 9 » à 10 h du matin
 *    doit créer la tâche de demain 9 h, pas une tâche immédiatement en retard.
 *    C'est la seule interprétation qui ne piège personne.
 * 3. **Le retard est un état, pas une erreur.** Une tâche non faite dont
 *    l'heure est passée remonte en tête, et « reporter à demain » la déplace au
 *    lieu de la supprimer. Rien ne disparaît tout seul.
 *
 * Fichier pur : aucun import React, aucune clé i18n, aucune horloge implicite.
 * Le stockage vit côté Rust (`todo.rs`), la mise en forme côté composant.
 */

/** Un titre au-delà de cette longueur ne tient de toute façon pas dans le notch. */
export const MAX_TITLE_LENGTH = 140;

/** Plafond de tâches. Au-delà, une liste n'est plus une liste du jour. */
export const MAX_TASKS = 200;

/**
 * Une tâche n'est annoncée qu'une fois son échéance atteinte, et seulement si
 * elle date de moins d'une heure : au démarrage, on ne réveille personne pour
 * une échéance de la matinée. Au-delà, un rappel n'est plus un rappel, c'est un
 * reproche.
 */
export const REMINDER_WINDOW_MS = 3600_000;

export const DAY_MS = 86_400_000;

export interface Task {
  id: string;
  title: string;
  /** Échéance en millisecondes Unix. `null` : une tâche du jour, sans heure. */
  dueAt: number | null;
  done: boolean;
  createdAt: number;
  doneAt: number | null;
}

// --- Dates ------------------------------------------------------------------

export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Ajoute des jours au calendrier, pas des millisecondes : l'heure d'été passe. */
export function addDays(ms: number, days: number): number {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** 0 pour le même jour, 1 pour demain, -1 pour hier. */
export function dayOffset(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

function atTime(dayStart: number, hour: number, minute: number): number {
  const date = new Date(dayStart);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

// --- Titres -----------------------------------------------------------------

/** Espaces multiples écrasés, espaces de bord retirés, longueur bornée. */
export function cleanTitle(raw: string): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
}

// --- Saisie d'une échéance ---------------------------------------------------

export type DueInput = { ok: true; dueAt: number | null } | { ok: false };

const CLOCK_RE = /^(\d{1,2})(?:[h:](\d{1,2})?)?$/;

function parseClock(token: string): { hour: number; minute: number } | null {
  const match = CLOCK_RE.exec(token);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * « 9 », « 9h », « 9h30 », « 9:30 », « demain », « demain 9h », « 9h demain »,
 * ou vide pour aucune heure.
 */
export function parseDueInput(raw: string, now: number = Date.now()): DueInput {
  const text = String(raw ?? "").trim().toLowerCase();
  if (text === "" || text === "aucune" || text === "none") return { ok: true, dueAt: null };

  const words = text.split(/\s+/);
  const dayWords = words.filter((word) => word === "demain" || word === "tomorrow");
  const others = words.filter((word) => word !== "demain" && word !== "tomorrow");
  // Un seul mot de jour, un seul morceau d'heure : « demain demain » ou
  // « 9h30 14h » ne veulent rien dire.
  if (dayWords.length > 1 || others.length > 1) return { ok: false };
  const hasDayWord = dayWords.length === 1;
  const rest = others.join("");

  const tomorrow = addDays(startOfDay(now), 1);

  if (rest === "") {
    // « demain » seul : 9 h, l'heure où une journée commence à compter.
    return hasDayWord ? { ok: true, dueAt: atTime(tomorrow, 9, 0) } : { ok: false };
  }

  const clock = parseClock(rest);
  if (!clock) return { ok: false };

  if (hasDayWord) return { ok: true, dueAt: atTime(tomorrow, clock.hour, clock.minute) };

  const target = atTime(startOfDay(now), clock.hour, clock.minute);
  // Une heure déjà passée désigne demain : personne ne crée une tâche en retard.
  return { ok: true, dueAt: target <= now ? atTime(tomorrow, clock.hour, clock.minute) : target };
}

// --- État d'une tâche ---------------------------------------------------------

/** En retard : une échéance dépassée sur une tâche encore ouverte. */
export function isLate(task: Task, now: number = Date.now()): boolean {
  return !task.done && task.dueAt !== null && task.dueAt < now;
}

/** Minutes de retard, 0 si la tâche n'est pas en retard. */
export function minutesLate(task: Task, now: number = Date.now()): number {
  if (!isLate(task, now) || task.dueAt === null) return 0;
  return Math.max(0, Math.floor((now - task.dueAt) / 60_000));
}

/** Minutes avant l'échéance, 0 si elle est passée ou absente. */
export function minutesUntil(task: Task, now: number = Date.now()): number {
  if (task.dueAt === null || task.dueAt <= now) return 0;
  return Math.floor((task.dueAt - now) / 60_000);
}

/**
 * Tri d'affichage : les tâches ouvertes d'abord, par échéance, les tâches sans
 * heure ensuite par ordre d'arrivée, les tâches faites à la fin.
 */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done && b.done) return (b.doneAt ?? 0) - (a.doneAt ?? 0);
    if (a.dueAt !== null && b.dueAt !== null) return a.dueAt - b.dueAt;
    if (a.dueAt !== null) return -1;
    if (b.dueAt !== null) return 1;
    return a.createdAt - b.createdAt;
  });
}

export interface GroupedTasks {
  late: Task[];
  today: Task[];
  later: Task[];
  done: Task[];
}

export function groupTasks(tasks: readonly Task[], now: number = Date.now()): GroupedTasks {
  const grouped: GroupedTasks = { late: [], today: [], later: [], done: [] };
  for (const task of sortTasks(tasks)) {
    if (task.done) {
      grouped.done.push(task);
    } else if (isLate(task, now)) {
      grouped.late.push(task);
    } else if (task.dueAt !== null && dayOffset(now, task.dueAt) > 0) {
      grouped.later.push(task);
    } else {
      // Sans heure, une tâche est une tâche du jour : c'est ce que veut dire
      // « la to-do du jour » pour tout ce qui n'a pas d'heure fixe.
      grouped.today.push(task);
    }
  }
  return grouped;
}

export interface TaskCounts {
  open: number;
  late: number;
  done: number;
  total: number;
}

export function counts(tasks: readonly Task[], now: number = Date.now()): TaskCounts {
  let open = 0;
  let late = 0;
  let done = 0;
  for (const task of tasks) {
    if (task.done) done += 1;
    else {
      open += 1;
      if (isLate(task, now)) late += 1;
    }
  }
  return { open, late, done, total: tasks.length };
}

// --- Rappels ------------------------------------------------------------------

/** La prochaine échéance à venir parmi les tâches ouvertes, `null` s'il n'y en a pas. */
export function nextDueAt(tasks: readonly Task[], now: number = Date.now()): number | null {
  let next: number | null = null;
  for (const task of tasks) {
    if (task.done || task.dueAt === null || task.dueAt <= now) continue;
    if (next === null || task.dueAt < next) next = task.dueAt;
  }
  return next;
}

/**
 * Les tâches qui viennent d'arriver à échéance et qui n'ont pas encore été
 * annoncées. `announced` porte les identifiants déjà signalés dans la session.
 */
export function pendingReminders(
  tasks: readonly Task[],
  now: number = Date.now(),
  announced: readonly string[] = [],
): Task[] {
  const seen = new Set(announced);
  return tasks
    .filter(
      (task) =>
        !task.done &&
        task.dueAt !== null &&
        task.dueAt <= now &&
        task.dueAt > now - REMINDER_WINDOW_MS &&
        !seen.has(task.id),
    )
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
}

// --- Reporter -----------------------------------------------------------------

/**
 * Demain, à la même heure. Une tâche sans heure reçoit 9 h : reporter une tâche
 * sans échéance doit produire une échéance, sinon le geste ne ferait rien.
 */
export function postponeToTomorrow(task: Task, now: number = Date.now()): Task {
  const tomorrow = addDays(startOfDay(now), 1);
  if (task.dueAt === null) return { ...task, dueAt: atTime(tomorrow, 9, 0) };
  const date = new Date(task.dueAt);
  return { ...task, dueAt: atTime(tomorrow, date.getHours(), date.getMinutes()) };
}

// --- Relecture du stockage ----------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Le backend est la source de vérité, mais un fichier écrit par une ancienne
 * version ou édité à la main ne doit pas casser l'affichage : les entrées
 * invalides sont écartées une à une, jamais toutes ensemble.
 */
export function normalizeTasks(raw: unknown, now: number = Date.now()): Task[] {
  if (!Array.isArray(raw)) return [];
  const tasks: Task[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    const title = cleanTitle(typeof entry.title === "string" ? entry.title : "");
    if (id === "" || title === "" || seen.has(id)) continue;
    const createdAt = timestamp(entry.createdAt) ?? now;
    tasks.push({
      id,
      title,
      dueAt: timestamp(entry.dueAt),
      done: entry.done === true,
      createdAt,
      doneAt: timestamp(entry.doneAt),
    });
    seen.add(id);
    if (tasks.length >= MAX_TASKS) break;
  }
  return tasks;
}
