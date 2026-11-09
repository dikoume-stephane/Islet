import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  devNotes,
  parseGitPulse,
  parseNetstat,
  trackGit,
  trackPorts,
  type DevNote,
  type GitPulse,
  type GitRaw,
  type PortEntry,
} from "../lib/dev";

/**
 * Les signaux du développeur, relevés seulement quand on les regarde.
 *
 * Deux règles de conduite.
 *
 * **Rien n'est lu quand le réglage est coupé**, et rien n'est lu non plus quand
 * le panneau est fermé : lancer `netstat` et trois commandes git toutes les
 * quinze secondes pour un panneau que personne n'a ouvert serait du travail
 * payé par la batterie de quelqu'un d'autre.
 *
 * **Sans dossier choisi, aucune commande git n'est lancée.** Le dossier vient
 * des réglages, jamais d'une devinette.
 */

const PORTS_INTERVAL_MS = 15_000;
const GIT_INTERVAL_MS = 20_000;

export interface DevState {
  pulse: GitPulse | null;
  ports: PortEntry[];
  notes: DevNote[];
  /** pid vers nom de processus, pour nommer le propriétaire d'un port. */
  names: Record<number, string>;
  /** Dernier relevé réussi : les âges se calculent à partir de lui. */
  at: number;
  /** Code d'erreur brut du backend, traduit par le panneau. */
  error: string | null;
  /** Le dossier suivi, tel qu'il a été choisi. */
  folder: string;
}

const EMPTY: DevState = { pulse: null, ports: [], notes: [], names: {}, at: 0, error: null, folder: "" };

interface ProcessRow {
  pid: number;
  name: string;
}

export function useDev(enabled: boolean, folder: string, active: boolean): DevState {
  const [state, setState] = useState<DevState>(EMPTY);
  const pulseRef = useRef<GitPulse | null>(null);
  const portsRef = useRef<PortEntry[]>([]);

  const refreshPorts = useCallback(async () => {
    const [lines, processes] = await Promise.all([
      invoke<string[]>("dev_listening_ports"),
      invoke<ProcessRow[]>("get_running_processes").catch(() => [] as ProcessRow[]),
    ]);
    const now = Date.now();
    const ports = trackPorts(portsRef.current, parseNetstat(lines), now);
    portsRef.current = ports;
    const names: Record<number, string> = {};
    for (const process of processes) names[process.pid] = process.name;
    setState((previous) => ({
      ...previous,
      ports,
      names,
      at: now,
      notes: devNotes(pulseRef.current, ports, now),
    }));
  }, []);

  const refreshGit = useCallback(async () => {
    if (folder.trim() === "") {
      pulseRef.current = null;
      setState((previous) => ({
        ...previous,
        pulse: null,
        error: null,
        notes: devNotes(null, portsRef.current, Date.now()),
      }));
      return;
    }
    try {
      const raw = await invoke<GitRaw>("dev_git_status", { folder });
      const now = Date.now();
      const pulse = trackGit(pulseRef.current, parseGitPulse(raw, now), now);
      pulseRef.current = pulse;
      setState((previous) => ({
        ...previous,
        pulse,
        error: null,
        at: now,
        notes: devNotes(pulse, portsRef.current, now),
      }));
    } catch (error) {
      // Le dossier a pu être déplacé, ou git n'est pas installé : on le dit
      // plutôt que d'afficher un dépôt qui n'existe plus.
      pulseRef.current = null;
      setState((previous) => ({ ...previous, pulse: null, error: String(error) }));
    }
  }, [folder]);

  useEffect(() => {
    if (!enabled || !active) return;
    refreshPorts().catch(() => {});
    refreshGit().catch(() => {});
    const portsTimer = setInterval(() => refreshPorts().catch(() => {}), PORTS_INTERVAL_MS);
    const gitTimer = setInterval(() => refreshGit().catch(() => {}), GIT_INTERVAL_MS);
    return () => {
      clearInterval(portsTimer);
      clearInterval(gitTimer);
    };
  }, [enabled, active, refreshPorts, refreshGit]);

  useEffect(() => {
    if (enabled) return;
    pulseRef.current = null;
    portsRef.current = [];
    setState(EMPTY);
  }, [enabled]);

  return { ...state, folder };
}
