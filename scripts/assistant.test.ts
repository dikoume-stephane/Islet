/**
 * Tests du moteur de conseils d'Is.
 *
 * Pourquoi pas Vitest : le projet n'a aucun framework de test et en ajouter un
 * pour une seule fonction pure serait disproportionné. `pickTip()` est
 * volontairement sans dépendance, donc Node 22 peut charger le TypeScript
 * directement et on garde zéro nouvelle dépendance.
 *
 *   bun run test:assistant        (ou : npm run test:assistant)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  pickTip,
  formatUptime,
  TIP_CATEGORY,
  type AssistantSettings,
  type TipIcon,
} from "../src/lib/assistant.ts";

// — Fixtures ---------------------------------------------------------------

const base = {
  sampled_at: 0,
  uptime_secs: 3600,
  boot_time: 0,
  cpu_percent: 5,
  memory: { load_percent: 40, total_gb: 16, free_gb: 9 },
  battery: {
    present: true,
    percent: 80,
    on_ac: true,
    charging: false,
    seconds_left: null as number | null,
    low: false,
    critical: false,
  },
  disks: [
    { mount: "C:", free_gb: 200, total_gb: 500, used_percent: 60, removable: false },
  ],
};

const signals = (over: Record<string, unknown> = {}) => ({ ...base, ...over });
const battery = (over: Record<string, unknown> = {}) => ({ ...base.battery, ...over });

const settings: AssistantSettings = {
  enabled: true,
  battery: true,
  storage: true,
  performance: true,
  session: true,
  lowBattery: 20,
  chargeLimit: 80,
  freeSpaceFloor: 10,
  sessionHours: 8,
};

const NOON = new Date("2026-11-04T14:00:00").getTime();
const LAST_NIGHT = new Date("2026-11-04T02:30:00").getTime();

const disk = (over: Record<string, unknown> = {}) => ({
  mount: "C:",
  free_gb: 200,
  total_gb: 500,
  used_percent: 60,
  removable: false,
  ...over,
});

const id = (s: ReturnType<typeof signals>, now = NOON) => pickTip(s, settings, {}, now)?.id ?? null;

// — Calme ----------------------------------------------------------------

test("machine calme : aucun conseil", () => {
  assert.equal(pickTip(signals(), settings, {}, NOON), null);
});

// — Batterie -------------------------------------------------------------

test("batterie ≤ 10 % : critique", () => {
  assert.equal(id(signals({ battery: battery({ percent: 8, on_ac: false }) })), "battery-critical");
});

test("batterie entre 10 et le seuil : avertissement", () => {
  assert.equal(id(signals({ battery: battery({ percent: 18, on_ac: false }) })), "battery-low");
});

test("batterie faible : le temps restant enrichit le message", () => {
  const tip = pickTip(
    signals({ battery: battery({ percent: 18, on_ac: false, seconds_left: 2400 }) }),
    settings,
    {},
    NOON,
  );
  assert.match(tip.title, /40 min/);
});

test("autonomie : conseil seulement quand le pourcentage rassure mais l'horloge non", () => {
  assert.equal(
    id(signals({ battery: battery({ percent: 55, on_ac: false, seconds_left: 3000 }) })),
    "battery-time",
  );
});

test("autonomie confortable : silence", () => {
  assert.equal(
    pickTip(signals({ battery: battery({ percent: 55, on_ac: false, seconds_left: 18000 }) }), settings, {}, NOON),
    null,
  );
});

test("estimation sous 15 min ignorée (bruit de Windows)", () => {
  assert.equal(
    pickTip(signals({ battery: battery({ percent: 55, on_ac: false, seconds_left: 480 }) }), settings, {}, NOON),
    null,
  );
});

test("branché au-dessus du seuil de charge : rappel de débrancher", () => {
  assert.equal(
    id(signals({ battery: battery({ percent: 85, charging: true }) })),
    "charge-reminder",
  );
});

test("branché à 100 % : batterie pleine", () => {
  assert.equal(
    id(signals({ battery: battery({ percent: 100, charging: true }) })),
    "battery-full",
  );
});

// — Disques --------------------------------------------------------------

test("disque presque plein : critique", () => {
  assert.equal(id(signals({ disks: [disk({ free_gb: 0.5, used_percent: 99.9 })] })), "disk-critical:C:");
});

test("disque sous le plancher d'espace libre : avertissement", () => {
  assert.equal(id(signals({ disks: [disk({ free_gb: 40, used_percent: 92 })] })), "disk-low:C:");
});

test("disque amovible ignoré", () => {
  const removable = disk({ mount: "E:", free_gb: 0.2, total_gb: 32, used_percent: 99, removable: true });
  assert.equal(pickTip(signals({ disks: [removable] }), settings, {}, NOON), null);
});

test("deux disques : le critique passe devant l'avertissement", () => {
  const s = signals({
    disks: [disk({ free_gb: 40, used_percent: 92 }), disk({ mount: "D:", free_gb: 1, total_gb: 2000, used_percent: 99.9 })],
  });
  assert.equal(id(s), "disk-critical:D:");
});

// — Performance ----------------------------------------------------------

test("mémoire ≥ 95 % : critique", () => {
  assert.equal(
    id(signals({ memory: { load_percent: 96, total_gb: 16, free_gb: 0.6 } })),
    "memory-critical",
  );
});

test("mémoire ≥ 90 % : avertissement", () => {
  assert.equal(
    id(signals({ memory: { load_percent: 92, total_gb: 16, free_gb: 1.3 } })),
    "memory-high",
  );
});

test("CPU ≥ 90 % : avertissement", () => {
  assert.equal(id(signals({ cpu_percent: 95 })), "cpu-high");
});

// — Session --------------------------------------------------------------

test("5 jours d'uptime : redémarrage conseillé", () => {
  assert.equal(id(signals({ uptime_secs: 6 * 86400 })), "restart");
});

test("session trop longue : pause", () => {
  assert.equal(id(signals({ uptime_secs: 9 * 3600 })), "session-long");
});

test("entre 00 h et 04 h : tard dans la nuit", () => {
  assert.equal(id(signals(), LAST_NIGHT), "late-night");
});

test("tard dans la nuit : l'heure est dans le message", () => {
  const tip = pickTip(signals(), settings, {}, LAST_NIGHT);
  assert.match(tip.title, /2:30/);
});

// — Interrupteurs et cooldowns -------------------------------------------

test("assistant désactivé : rien", () => {
  const s = signals({ battery: battery({ percent: 3, on_ac: false }) });
  assert.equal(pickTip(s, { ...settings, enabled: false }, {}, NOON), null);
});

test("catégorie batterie coupée : le disque prend la priorité", () => {
  const s = signals({
    battery: battery({ percent: 3, on_ac: false }),
    disks: [disk({ free_gb: 1, used_percent: 99.8 })],
  });
  assert.equal(pickTip(s, { ...settings, battery: false }, {}, NOON)?.id, "disk-critical:C:");
});

test("catégorie session coupée : pas de conseil nocturne", () => {
  assert.equal(pickTip(signals(), { ...settings, session: false }, {}, LAST_NIGHT), null);
});

test("cooldown en cours : le conseil reste silencieux", () => {
  const s = signals({ battery: battery({ percent: 5, on_ac: false }) });
  assert.equal(pickTip(s, settings, { "battery-critical": NOON - 60_000 }, NOON), null);
});

test("cooldown écoulé : le conseil revient", () => {
  const s = signals({ battery: battery({ percent: 5, on_ac: false }) });
  assert.equal(pickTip(s, settings, { "battery-critical": NOON - 11 * 60_000 }, NOON)?.id, "battery-critical");
});

test("priorité : batterie critique avant disque critique", () => {
  const s = signals({
    battery: battery({ percent: 4, on_ac: false }),
    disks: [disk({ free_gb: 0.2, used_percent: 99.96 })],
  });
  assert.equal(id(s), "battery-critical");
});

// — Formatage ------------------------------------------------------------

test("formatUptime : minutes seules sous une heure", () => {
  assert.equal(formatUptime(2400), "40 min");
});

test("formatUptime : heures et minutes", () => {
  assert.equal(formatUptime(9720), "2 h 42");
});

test("formatUptime : arrondi à la minute inférieure", () => {
  assert.equal(formatUptime(65), "1 min");
});

// — Cohérence du catalogue ----------------------------------------------

test("chaque icône de conseil a une catégorie", () => {
  const icons: TipIcon[] = [
    "battery-low", "battery-critical", "battery-time", "battery-full", "charge",
    "disk", "disk-critical", "memory", "cpu", "restart", "session", "late-night",
  ];
  for (const icon of icons) {
    assert.ok(TIP_CATEGORY[icon], `catégorie manquante pour ${icon}`);
    assert.ok(["battery", "storage", "performance", "session"].includes(TIP_CATEGORY[icon]));
  }
  assert.equal(Object.keys(TIP_CATEGORY).length, icons.length);
});

test("les 4 catégories sont représentées", () => {
  const used = new Set(Object.values(TIP_CATEGORY));
  assert.equal(used.size, 4);
});
