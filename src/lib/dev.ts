/**
 * Les signaux du développeur : l'état du dépôt suivi et les ports qui écoutent.
 *
 * Deux sources, deux natures. **Git** répond à trois commandes en lecture
 * seule ; **netstat** répond une table de texte. Aucune des deux ne décide quoi
 * que ce soit : le Rust rapporte, ce fichier interprète.
 *
 * Le partage n'est pas décoratif. Un parseur de `netstat` est exactement le
 * genre de code qui se trompe en silence sur une ligne IPv6, et qu'on ne peut
 * pas vérifier sans machine Windows. Ici il se vérifie sur des lignes figées,
 * ce que le banc de tests fait.
 *
 * Règle de sûreté tenue par l'appelant, rappelée ici : **aucun accès disque
 * arbitraire**. Sans dossier choisi explicitement par l'utilisateur, aucune
 * commande git n'est lancée.
 *
 * Fichier pur : aucun import React, aucune clé i18n, aucune horloge implicite.
 */

/** Nombre de ports gardés dans le panneau. Un poste de développement en ouvre vite beaucoup. */
export const MAX_PORTS = 40;

/** Une branche sale depuis ce temps mérite une remarque (douze minutes). */
export const DIRTY_AFTER_MS = 12 * 60_000;

/** Un port tenu depuis ce temps est probablement oublié (deux heures). */
export const PORT_HELD_MS = 2 * 3600_000;

/**
 * En dessous de ce numéro, un port n'appartient pas au travail en cours mais au
 * système : RPC, SMB, découverte réseau. Ces écouteurs vivent aussi longtemps que
 * la machine, donc les signaler reviendrait à dire « le port 445 est occupé
 * depuis deux heures » à chaque ouverture du panneau.
 */
export const PORT_NOTE_MIN = 1024;

/** PID du noyau sous Windows : `System Idle Process` puis `System`. */
const SYSTEM_PIDS = new Set([0, 4]);

/** Une ligne de `netstat -ano -p TCP` en écoute, telle que Rust la rapporte. */
export interface RawListener {
  port: number;
  address: string;
  pid: number;
}

/**
 * Interprète la sortie de `netstat -ano -p TCP`.
 *
 * Les en-têtes sont traduits par Windows, les lignes non : `LISTENING` reste en
 * anglais quelle que soit la langue du système. C'est donc là-dessus qu'on
 * s'ancre, et non sur la position des colonnes.
 */
export function parseNetstat(lines: readonly string[]): RawListener[] {
  const listeners: RawListener[] = [];
  for (const line of lines) {
    const row = line.trim();
    if (row === "") continue;
    const tokens = row.split(/\s+/);
    const stateIndex = tokens.findIndex((token) => token === "LISTENING" || token === "LISTEN");
    // Proto, adresse locale, adresse distante, état, PID : l'état ne peut pas
    // être en première position sur une ligne exploitable.
    if (stateIndex < 2) continue;
    const local = tokens[stateIndex - 2];
    const pidToken = tokens[tokens.length - 1];
    if (typeof local !== "string" || !/^\d+$/.test(pidToken ?? "")) continue;

    const colon = local.lastIndexOf(":");
    if (colon <= 0) continue;
    const port = Number(local.slice(colon + 1));
    if (!Number.isInteger(port) || port <= 0 || port > 65535) continue;

    let address = local.slice(0, colon);
    if (address.startsWith("[") && address.endsWith("]")) address = address.slice(1, -1);
    listeners.push({ port, address, pid: Number(pidToken) });
  }
  return listeners;
}

/** Vrai si l'adresse écoute sur toutes les interfaces, donc joignable du réseau. */
export function isExposedAddress(address: string): boolean {
  const clean = address.replace(/^\[|\]$/g, "");
  return clean === "0.0.0.0" || clean === "::" || clean === "*";
}

export interface PortEntry {
  port: number;
  /** Toutes les adresses sur lesquelles ce port écoute (IPv4 et IPv6 confondues). */
  addresses: string[];
  exposed: boolean;
  pid: number;
  /** Première fois où ce port a été vu tenu par ce processus. */
  since: number;
}

/**
 * Fait le pont entre deux relevés.
 *
 * Un port garde son horodatage d'origine tant que le même processus le tient :
 * c'est ce qui permet de dire « occupé depuis deux heures » plutôt que
 * « occupé », qui n'aide personne.
 */
export function trackPorts(
  previous: readonly PortEntry[],
  listeners: readonly RawListener[],
  now: number,
): PortEntry[] {
  const byPort = new Map<number, PortEntry>();
  for (const listener of listeners) {
    const existing = byPort.get(listener.port);
    if (existing) {
      if (!existing.addresses.includes(listener.address)) existing.addresses.push(listener.address);
      existing.exposed = existing.exposed || isExposedAddress(listener.address);
      continue;
    }
    const before = previous.find((entry) => entry.port === listener.port && entry.pid === listener.pid);
    byPort.set(listener.port, {
      port: listener.port,
      addresses: [listener.address],
      exposed: isExposedAddress(listener.address),
      pid: listener.pid,
      since: before ? before.since : now,
    });
  }
  return [...byPort.values()].sort((a, b) => a.port - b.port).slice(0, MAX_PORTS);
}

/** Ce que Rust rapporte du dépôt : trois sorties brutes, rien d'interprété. */
export interface GitRaw {
  branch: string;
  porcelain: string;
  counts: string;
}

export interface GitPulse {
  branch: string;
  /** `git` a répondu `HEAD` : on n'est sur aucune branche. */
  detached: boolean;
  dirty: number;
  ahead: number;
  behind: number;
  /** Premier instant où la branche a été vue sale. */
  dirtySince: number | null;
  at: number;
}

/** Interprète les trois sorties de `dev_git_status`. */
export function parseGitPulse(raw: GitRaw, now: number): Omit<GitPulse, "dirtySince"> {
  const branch = raw.branch.trim();
  const dirty = raw.porcelain.split("\n").filter((line) => line.trim() !== "").length;
  // `rev-list --count --left-right upstream...HEAD` répond « derrière puis devant ».
  const counts = raw.counts
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => Number(value));
  const behind = Number.isFinite(counts[0]) ? Math.max(0, Math.trunc(counts[0])) : 0;
  const ahead = Number.isFinite(counts[1]) ? Math.max(0, Math.trunc(counts[1])) : 0;
  return {
    branch: branch === "" ? "?" : branch,
    detached: branch === "HEAD",
    dirty,
    ahead,
    behind,
    at: now,
  };
}

/** Complète un relevé avec l'âge de la saleté, qui ne se déduit pas d'une photo. */
export function trackGit(
  previous: GitPulse | null,
  fresh: Omit<GitPulse, "dirtySince">,
  now: number,
): GitPulse {
  if (fresh.dirty === 0) return { ...fresh, dirtySince: null };
  const carried = previous && previous.dirty > 0 ? previous.dirtySince : null;
  return { ...fresh, dirtySince: carried ?? now };
}

/** Une remarque de contexte, décidée localement. */
export type DevNote =
  | { kind: "dirty"; minutes: number }
  | { kind: "behind"; commits: number }
  | { kind: "port"; port: number; pid: number; minutes: number };

/**
 * Les remarques que le panneau affiche, de la plus utile à la moins utile.
 *
 * Deux seulement : au-delà, ce n'est plus un rappel, c'est un tableau de bord.
 */
export function devNotes(
  pulse: GitPulse | null,
  ports: readonly PortEntry[],
  now: number,
): DevNote[] {
  const notes: DevNote[] = [];

  if (pulse && pulse.behind > 0) notes.push({ kind: "behind", commits: pulse.behind });
  if (pulse && pulse.dirty > 0 && pulse.dirtySince !== null) {
    const age = now - pulse.dirtySince;
    if (age >= DIRTY_AFTER_MS) notes.push({ kind: "dirty", minutes: Math.floor(age / 60_000) });
  }

  const held = ports
    .filter(
      (entry) =>
        entry.port >= PORT_NOTE_MIN &&
        !SYSTEM_PIDS.has(entry.pid) &&
        now - entry.since >= PORT_HELD_MS,
    )
    .sort((a, b) => a.since - b.since)
    .slice(0, 2);
  for (const entry of held) {
    notes.push({
      kind: "port",
      port: entry.port,
      pid: entry.pid,
      minutes: Math.floor((now - entry.since) / 60_000),
    });
  }

  return notes.slice(0, 2);
}

/** « 12 min », « 2 h 05 » : des nombres, la langue se met autour. */
export function formatAge(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const minutes = Math.floor(safe / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

/* ─── La vérification de build ─────────────────────────────────────────────
 *
 * La commande vient de l'utilisateur et ne part que sur un clic. Ce qui se
 * décide ici : ce qu'on retient de sa sortie, et comment on la juge. Un
 * compilateur écrit trois cents lignes dont deux comptent, et un notch fait
 * 380 points de haut.
 */

/** La réponse brute de `dev_run_build`. */
export interface BuildRaw {
  code: number | null;
  timed_out: boolean;
  duration_ms: number;
  lines: string[];
}

/** Ce que le panneau retient d'une commande de vérification. */
export type BuildRun = {
  verdict: BuildVerdict;
  /** Durée mesurée par Rust, ou zéro quand la commande n'a pas pu partir. */
  durationMs: number;
  /** La fin de la sortie, déjà nettoyée pour l'affichage. */
  lines: string[];
  /**
   * La sortie complète rendue par Rust (120 lignes au plus).
   *
   * Gardée pour l'assistance IA : expliquer un échec à partir de quatre lignes
   * demanderait au modèle de deviner. Le panneau, lui, n'en montre que la fin.
   */
  fullLines: string[];
  at: number;
};

export type BuildVerdict = "ok" | "failed" | "timeout";

/** Nombre de lignes de sortie gardées pour le panneau. */
export const BUILD_TAIL = 4;

/** Les séquences d'échappement ANSI : couleurs et titres de cargo, de vite, de bun. */
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g;

/**
 * La fin d'une sortie, propre.
 *
 * Retire les couleurs (un notch n'est pas un terminal), les lignes vides, et ne
 * garde que les dernières : c'est là que se trouve l'erreur. Le tri se fait
 * dans l'ordre d'arrivée, stdout et stderr mêlés, comme les a vus Rust.
 */
export function buildTail(lines: readonly string[], max: number = BUILD_TAIL): string[] {
  const kept: string[] = [];
  for (const line of lines) {
    const clean = line.replace(ANSI, "").replace(/\s+$/, "");
    if (clean.trim() === "") continue;
    kept.push(clean);
  }
  // `slice(-0)` rend tout le tableau : c'est la raison du garde-fou explicite.
  if (max <= 0) return [];
  return kept.slice(-max);
}

/** Juge une réponse de build : arrêtée, réussie, ou échouée. */
export function buildVerdict(raw: BuildRaw): BuildVerdict {
  if (raw.timed_out) return "timeout";
  return raw.code === 0 ? "ok" : "failed";
}

/**
 * « 850 ms », « 3.4 s », « 48 s », « 2 min ».
 *
 * Les dixièmes ne servent que sous la dizaine de secondes, où la différence
 * intéresse ; au-delà, une seconde près suffit. Le point décimal est le même
 * dans les deux langues : c'est un nombre, pas une phrase.
 */
export function formatDuration(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  if (safe < 1_000) return `${Math.round(safe)} ms`;
  if (safe < 10_000) return `${(Math.floor(safe / 100) / 10).toFixed(1)} s`;
  if (safe < 60_000) return `${Math.floor(safe / 1_000)} s`;
  return formatAge(safe);
}
