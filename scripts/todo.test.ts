import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_TASKS,
  MAX_TITLE_LENGTH,
  addDays,
  cleanTitle,
  counts,
  dayOffset,
  groupTasks,
  isLate,
  minutesLate,
  minutesUntil,
  nextDueAt,
  normalizeTasks,
  parseDueInput,
  pendingReminders,
  postponeToTomorrow,
  sortTasks,
  startOfDay,
  type Task,
} from "../src/lib/todo.ts";

/**
 * Les tâches du jour.
 *
 * Deux choses se cassent en vrai, et aucune ne se voit à l'œil : une heure
 * saisie à 9 h du matin qui crée une tâche en retard au lieu de la mettre
 * demain, et une journée qui change de date pendant que l'app tourne. Les
 * horodatages sont donc construits en heure locale et comparés, jamais écrits
 * en dur.
 */

/** Jeudi 5 novembre 2026, 10 h du matin, heure locale. */
const NOW = new Date(2026, 10, 5, 10, 0, 0, 0).getTime();

const at = (day: number, hour: number, minute = 0): number => new Date(2026, 10, day, hour, minute, 0, 0).getTime();

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Tâche",
  dueAt: null,
  done: false,
  createdAt: NOW - 60_000,
  doneAt: null,
  ...overrides,
});

describe("cleanTitle", () => {
  it("écrase les espaces et retire ceux des bords", () => {
    assert.equal(cleanTitle("  écrire   le   rapport  "), "écrire le rapport");
    assert.equal(cleanTitle("\n\trespirer\n"), "respirer");
  });

  it("borne la longueur et supporte le vide", () => {
    assert.equal(cleanTitle("a".repeat(500)).length, MAX_TITLE_LENGTH);
    assert.equal(cleanTitle(""), "");
    assert.equal(cleanTitle(undefined as unknown as string), "");
  });
});

describe("dates", () => {
  it("trouve le début du jour local", () => {
    assert.equal(startOfDay(NOW), at(5, 0));
    assert.equal(startOfDay(at(5, 23, 59)), at(5, 0));
  });

  it("avance d'un jour en gardant l'heure", () => {
    assert.equal(addDays(at(5, 9, 30), 1), at(6, 9, 30));
    assert.equal(addDays(at(5, 9, 30), -1), at(4, 9, 30));
  });

  it("compte les jours d'écart", () => {
    assert.equal(dayOffset(NOW, at(5, 23, 59)), 0);
    assert.equal(dayOffset(NOW, at(6, 0, 0)), 1);
    assert.equal(dayOffset(NOW, at(4, 23, 59)), -1);
    assert.equal(dayOffset(NOW, at(12, 8, 0)), 7);
  });
});

describe("parseDueInput", () => {
  it("lit une heure comme l'heure du jour, dans toutes ses écritures", () => {
    assert.deepEqual(parseDueInput("14:30", NOW), { ok: true, dueAt: at(5, 14, 30) });
    assert.deepEqual(parseDueInput("14h30", NOW), { ok: true, dueAt: at(5, 14, 30) });
    assert.deepEqual(parseDueInput("14h", NOW), { ok: true, dueAt: at(5, 14, 0) });
    assert.deepEqual(parseDueInput("14h5", NOW), { ok: true, dueAt: at(5, 14, 5) });
    assert.deepEqual(parseDueInput(" 14 ", NOW), { ok: true, dueAt: at(5, 14, 0) });
  });

  it("renvoie à demain une heure déjà passée", () => {
    // 10 h du matin : « 9 » ne peut pas vouloir dire « il y a une heure ».
    assert.deepEqual(parseDueInput("9", NOW), { ok: true, dueAt: at(6, 9, 0) });
    assert.deepEqual(parseDueInput("09:05", NOW), { ok: true, dueAt: at(6, 9, 5) });
    assert.deepEqual(parseDueInput("10:00", NOW), { ok: true, dueAt: at(6, 10, 0) });
    // Une minute plus tard, c'est encore aujourd'hui.
    assert.deepEqual(parseDueInput("10:01", NOW), { ok: true, dueAt: at(5, 10, 1) });
  });

  it("comprend « demain », avant ou après l'heure", () => {
    assert.deepEqual(parseDueInput("demain 9h", NOW), { ok: true, dueAt: at(6, 9, 0) });
    assert.deepEqual(parseDueInput("9h demain", NOW), { ok: true, dueAt: at(6, 9, 0) });
    assert.deepEqual(parseDueInput("tomorrow 18:00", NOW), { ok: true, dueAt: at(6, 18, 0) });
    // « demain » seul : 9 h.
    assert.deepEqual(parseDueInput("demain", NOW), { ok: true, dueAt: at(6, 9, 0) });
    assert.deepEqual(parseDueInput("DEMAIN", NOW), { ok: true, dueAt: at(6, 9, 0) });
  });

  it("rend « aucune heure » pour un champ vide", () => {
    for (const raw of ["", "   ", "aucune", "none"]) {
      assert.deepEqual(parseDueInput(raw, NOW), { ok: true, dueAt: null }, raw);
    }
  });

  it("refuse ce qui n'est pas une heure", () => {
    for (const raw of ["abc", "25h", "12:75", "9h30 14h", "demain demain", "1 2", "h", "-9"]) {
      assert.deepEqual(parseDueInput(raw, NOW), { ok: false }, raw);
    }
  });
});

describe("retard", () => {
  const due = task({ dueAt: at(5, 9, 0) });

  it("une échéance dépassée sur une tâche ouverte est un retard", () => {
    assert.equal(isLate(due, NOW), true);
    assert.equal(minutesLate(due, NOW), 60);
  });

  it("une tâche faite n'est jamais en retard", () => {
    assert.equal(isLate({ ...due, done: true }, NOW), false);
    assert.equal(minutesLate({ ...due, done: true }, NOW), 0);
  });

  it("une tâche sans heure n'est jamais en retard", () => {
    assert.equal(isLate(task(), NOW), false);
    assert.equal(minutesLate(task(), NOW), 0);
  });

  it("compte les minutes avant l'échéance", () => {
    assert.equal(minutesUntil(task({ dueAt: at(5, 10, 45) }), NOW), 45);
    assert.equal(minutesUntil(due, NOW), 0);
  });
});

describe("sortTasks", () => {
  it("range les échéances par ordre croissant, puis les tâches sans heure", () => {
    const early = task({ id: "early", dueAt: at(5, 8, 0) });
    const late = task({ id: "late", dueAt: at(5, 18, 0) });
    const noTime = task({ id: "none", createdAt: NOW - 10_000 });
    const older = task({ id: "older", createdAt: NOW - 90_000 });

    assert.deepEqual(
      sortTasks([late, noTime, early, older]).map((t) => t.id),
      ["early", "late", "older", "none"],
    );
  });

  it("met les tâches faites à la fin, la plus récemment cochée d'abord", () => {
    const open = task({ id: "open" });
    const doneOld = task({ id: "doneOld", done: true, doneAt: NOW - 100_000 });
    const doneNew = task({ id: "doneNew", done: true, doneAt: NOW - 5_000 });
    assert.deepEqual(sortTasks([doneOld, open, doneNew]).map((t) => t.id), ["open", "doneNew", "doneOld"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const list = [task({ id: "b", dueAt: at(5, 18, 0) }), task({ id: "a", dueAt: at(5, 8, 0) })];
    const before = list.map((t) => t.id);
    sortTasks(list);
    assert.deepEqual(list.map((t) => t.id), before);
  });
});

describe("groupTasks", () => {
  const late = task({ id: "late", dueAt: at(5, 9, 0) });
  const todayTimed = task({ id: "todayTimed", dueAt: at(5, 16, 0) });
  const todayUntimed = task({ id: "todayUntimed" });
  const later = task({ id: "later", dueAt: at(7, 12, 0) });
  const done = task({ id: "done", done: true, doneAt: NOW - 1_000 });

  it("répartit chaque tâche dans une seule section", () => {
    const grouped = groupTasks([later, done, todayUntimed, late, todayTimed], NOW);
    assert.deepEqual(grouped.late.map((t) => t.id), ["late"]);
    assert.deepEqual(grouped.today.map((t) => t.id), ["todayTimed", "todayUntimed"]);
    assert.deepEqual(grouped.later.map((t) => t.id), ["later"]);
    assert.deepEqual(grouped.done.map((t) => t.id), ["done"]);
  });

  it("une échéance d'hier est un retard, pas « à venir »", () => {
    const yesterday = task({ id: "yesterday", dueAt: at(4, 18, 0) });
    const grouped = groupTasks([yesterday], NOW);
    assert.deepEqual(grouped.late.map((t) => t.id), ["yesterday"]);
    assert.deepEqual(grouped.later, []);
  });

  it("une tâche faite reste dans « terminées », même en retard", () => {
    const grouped = groupTasks([task({ id: "d", dueAt: at(1, 9, 0), done: true, doneAt: NOW })], NOW);
    assert.deepEqual(grouped.late, []);
    assert.deepEqual(grouped.done.map((t) => t.id), ["d"]);
  });
});

describe("counts", () => {
  it("compte les tâches ouvertes, en retard et faites", () => {
    const result = counts(
      [
        task({ id: "a", dueAt: at(5, 9, 0) }),
        task({ id: "b" }),
        task({ id: "c", done: true, doneAt: NOW }),
      ],
      NOW,
    );
    assert.deepEqual(result, { open: 2, late: 1, done: 1, total: 3 });
  });

  it("ne compte rien dans une liste vide", () => {
    assert.deepEqual(counts([], NOW), { open: 0, late: 0, done: 0, total: 0 });
  });
});

describe("nextDueAt", () => {
  it("trouve la prochaine échéance à venir", () => {
    const tasks = [
      task({ id: "late", dueAt: at(5, 9, 0) }),
      task({ id: "b", dueAt: at(5, 16, 0) }),
      task({ id: "a", dueAt: at(5, 12, 0) }),
      task({ id: "done", dueAt: at(5, 11, 0), done: true, doneAt: NOW }),
    ];
    assert.equal(nextDueAt(tasks, NOW), at(5, 12, 0));
  });

  it("n'annonce rien quand tout est passé ou sans heure", () => {
    assert.equal(nextDueAt([task({ id: "a" }), task({ id: "b", dueAt: at(5, 9, 0) })], NOW), null);
    assert.equal(nextDueAt([], NOW), null);
  });
});

describe("pendingReminders", () => {
  it("retient les échéances atteintes, pas celles à venir", () => {
    const justMissed = task({ id: "missed", dueAt: NOW - 60_000 });
    const soon = task({ id: "soon", dueAt: NOW + 600_000 });
    assert.deepEqual(pendingReminders([justMissed, soon], NOW).map((t) => t.id), ["missed"]);
  });

  it("ignore une échéance trop ancienne, pour ne pas réveiller au démarrage", () => {
    const old = task({ id: "old", dueAt: NOW - 3 * 3600_000 });
    assert.deepEqual(pendingReminders([old], NOW), []);
    assert.deepEqual(pendingReminders([task({ id: "limite", dueAt: NOW - 61 * 60_000 })], NOW), []);
    // Une heure tout juste reste dans la fenêtre : le rappel vient d'arriver.
    assert.deepEqual(pendingReminders([task({ id: "chaud", dueAt: NOW - 59 * 60_000 })], NOW).map((t) => t.id), ["chaud"]);
  });

  it("n'annonce deux fois ni ce qui est déjà annoncé, ni ce qui est fait", () => {
    const due = task({ id: "due", dueAt: NOW - 60_000 });
    assert.deepEqual(pendingReminders([due], NOW, ["due"]), []);
    assert.deepEqual(pendingReminders([{ ...due, done: true, doneAt: NOW }], NOW), []);
  });

  it("annonce dans l'ordre des échéances", () => {
    const tasks = [
      task({ id: "b", dueAt: NOW - 10_000 }),
      task({ id: "a", dueAt: NOW - 60_000 }),
    ];
    assert.deepEqual(pendingReminders(tasks, NOW).map((t) => t.id), ["a", "b"]);
  });

  it("ignore les tâches sans heure", () => {
    assert.deepEqual(pendingReminders([task({ id: "none" })], NOW), []);
  });
});

describe("postponeToTomorrow", () => {
  it("déplace à demain en gardant l'heure", () => {
    const moved = postponeToTomorrow(task({ dueAt: at(5, 9, 15) }), NOW);
    assert.equal(moved.dueAt, at(6, 9, 15));
  });

  it("ramène au lendemain même après plusieurs jours de retard", () => {
    const moved = postponeToTomorrow(task({ dueAt: at(1, 18, 30) }), NOW);
    assert.equal(moved.dueAt, at(6, 18, 30));
  });

  it("donne 9 h à une tâche sans heure, sinon le geste ne ferait rien", () => {
    assert.equal(postponeToTomorrow(task(), NOW).dueAt, at(6, 9, 0));
  });

  it("ne change rien d'autre que l'échéance", () => {
    const original = task({ id: "x", title: "Appeler", dueAt: at(5, 9, 0) });
    const moved = postponeToTomorrow(original, NOW);
    assert.deepEqual({ ...moved, dueAt: original.dueAt }, original);
  });
});

describe("normalizeTasks", () => {
  const raw = (overrides: Record<string, unknown> = {}) => ({
    id: "t1",
    title: "Rapport",
    dueAt: null,
    done: false,
    createdAt: NOW,
    doneAt: null,
    ...overrides,
  });

  it("garde une tâche bien formée", () => {
    const [task1] = normalizeTasks([raw()], NOW);
    assert.deepEqual(task1, {
      id: "t1",
      title: "Rapport",
      dueAt: null,
      done: false,
      createdAt: NOW,
      doneAt: null,
    });
  });

  it("écarte les entrées invalides une à une", () => {
    const tasks = normalizeTasks(
      [
        raw({ id: "ok" }),
        raw({ id: "" }),
        raw({ id: "sans-titre", title: "   " }),
        null,
        "texte",
        raw({ id: "ok2" }),
      ],
      NOW,
    );
    assert.deepEqual(tasks.map((t) => t.id), ["ok", "ok2"]);
  });

  it("garde la tâche quand seule son échéance est illisible", () => {
    // Perdre une tâche parce qu'un champ de date est abîmé serait pire que
    // perdre la date : on garde le titre et on oublie l'heure.
    const tasks = normalizeTasks([raw({ id: "a", dueAt: "demain" }), raw({ id: "b", dueAt: -5 })], NOW);
    assert.deepEqual(tasks.map((t) => t.id), ["a", "b"]);
    assert.deepEqual(tasks.map((t) => t.dueAt), [null, null]);
  });

  it("écarte les doublons d'identifiant", () => {
    assert.equal(normalizeTasks([raw({ id: "same" }), raw({ id: "same", title: "Autre" })], NOW).length, 1);
  });

  it("nettoie le titre et remplit une date de création manquante", () => {
    const [task1] = normalizeTasks([raw({ title: "  deux   mots ", createdAt: undefined })], NOW);
    assert.equal(task1.title, "deux mots");
    assert.equal(task1.createdAt, NOW);
  });

  it("borne le nombre de tâches et refuse ce qui n'est pas une liste", () => {
    const many = Array.from({ length: MAX_TASKS + 20 }, (_, i) => raw({ id: `t${i}` }));
    assert.equal(normalizeTasks(many, NOW).length, MAX_TASKS);
    assert.deepEqual(normalizeTasks({}, NOW), []);
    assert.deepEqual(normalizeTasks(null, NOW), []);
  });

  it("ne croit pas un drapeau fait approximatif", () => {
    assert.equal(normalizeTasks([raw({ done: "oui" })], NOW)[0].done, false);
  });
});
