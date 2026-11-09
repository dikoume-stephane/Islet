import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { GitBranch, ArrowUp, ArrowDown, Radio, X, Settings, ExternalLink } from "lucide-react";
import { formatAge, type DevNote } from "../lib/dev";
import { shortPath } from "../lib/shelf";
import type { DevState } from "../hooks/useDev";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n/en";

/**
 * Le panneau développeur du notch : l'état du dépôt suivi et les ports qui
 * écoutent.
 *
 * Le panneau ne calcule rien : `src/lib/dev.ts` a déjà décidé du retard, de
 * l'âge d'un port et des remarques à afficher. Ici on nomme, on trie à l'écran
 * et on offre deux gestes : libérer un port, ouvrir les réglages.
 */

interface NotchDevProps {
  dev: DevState;
  onClose: () => void;
}

/** Traduit les codes d'erreur bruts du backend. */
function errorKey(error: string): MessageKey {
  if (error.includes("not-a-repository")) return "dev.error.notRepository";
  if (error.includes("folder-missing")) return "dev.error.folderMissing";
  if (error.includes("no-folder")) return "dev.error.noFolder";
  return "dev.error.gitMissing";
}

export function NotchDev({ dev, onClose }: NotchDevProps) {
  const t = useT();
  const [killing, setKilling] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const kill = async (pid: number, name: string) => {
    setKilling(pid);
    try {
      await invoke("kill_process", { pid, name });
    } catch {
      // Le processus a pu disparaître entre le relevé et le clic : le prochain
      // rafraîchissement suffit à rétablir la vérité.
    } finally {
      setKilling(null);
    }
  };

  const noteText = (note: DevNote): string => {
    if (note.kind === "behind") return t("dev.note.behind", { count: note.commits });
    if (note.kind === "dirty") return t("dev.note.dirty", { age: formatAge(note.minutes * 60_000) });
    return t("dev.note.port", { port: note.port, age: formatAge(note.minutes * 60_000) });
  };

  const pulse = dev.pulse;

  return (
    // Le conteneur avale les clics : la molette et le clic du notch servent à
    // changer de panneau, pas à fermer celui-ci par accident.
    <div className="dev-content" onClick={(event) => event.stopPropagation()}>
      <div className="dev-panel">
      <header className="dev-head">
        <span className="dev-head-icon">
          <GitBranch size={13} strokeWidth={2.2} />
        </span>
        <span className="dev-branch">
          {pulse ? pulse.branch : t("dev.noRepo")}
        </span>
        {pulse?.detached && <span className="dev-tag">{t("dev.detached")}</span>}
        {pulse !== null && pulse.dirty > 0 && (
          <span className="dev-tag is-dirty">{t("dev.dirty", { count: pulse.dirty })}</span>
        )}
        {pulse !== null && pulse.ahead > 0 && (
          <span className="dev-tag is-ahead">
            <ArrowUp size={10} strokeWidth={3} />
            {pulse.ahead}
          </span>
        )}
        {pulse !== null && pulse.behind > 0 && (
          <span className="dev-tag is-behind">
            <ArrowDown size={10} strokeWidth={3} />
            {pulse.behind}
          </span>
        )}
        <button type="button" className="dev-close" onClick={onClose} aria-label={t("wc.close")}>
          <X size={12} strokeWidth={2.4} />
        </button>
      </header>

      {dev.error && (
        <div className="dev-empty">
          <span>{t(errorKey(dev.error))}</span>
          <button
            type="button"
            className="dev-link"
            onClick={() => invoke("open_settings_window").catch(() => {})}
          >
            <Settings size={11} strokeWidth={2.2} />
            {t("dev.openSettings")}
          </button>
        </div>
      )}

      {!dev.error && !pulse && (
        <div className="dev-empty">
          <span>{t("dev.noRepo.hint")}</span>
          <button
            type="button"
            className="dev-link"
            onClick={() => invoke("open_settings_window").catch(() => {})}
          >
            <Settings size={11} strokeWidth={2.2} />
            {t("dev.openSettings")}
          </button>
        </div>
      )}

      {dev.notes.length > 0 && (
        <div className="dev-notes" aria-live="polite">
          {dev.notes.map((note) => (
            <span className="dev-note" key={`${note.kind}-${"port" in note ? note.port : ""}`}>
              {noteText(note)}
            </span>
          ))}
        </div>
      )}

      <div className="dev-ports-head">
        <Radio size={11} strokeWidth={2.4} />
        <span>{t("dev.ports")}</span>
        <span className="dev-ports-count">{dev.ports.length}</span>
      </div>

      <div className="dev-ports">
        {dev.ports.length === 0 && <div className="dev-ports-empty">{t("dev.noPorts")}</div>}
        {dev.ports.map((entry) => {
          const name = dev.names[entry.pid];
          return (
            <div className="dev-port" key={entry.port}>
              <span className="dev-port-number">{entry.port}</span>
              <span className="dev-port-name" title={entry.addresses.join(", ")}>
                {name ?? `pid ${entry.pid}`}
              </span>
              <span className="dev-port-age">{formatAge(dev.at - entry.since)}</span>
              <span
                className={`dev-port-scope ${entry.exposed ? "is-exposed" : ""}`}
                title={entry.exposed ? t("dev.exposed") : t("dev.loopback")}
              />
              {name && (
                <button
                  type="button"
                  className="dev-port-kill"
                  disabled={killing === entry.pid}
                  onClick={() => kill(entry.pid, name)}
                  aria-label={t("dev.kill", { port: entry.port })}
                  title={t("dev.kill", { port: entry.port })}
                >
                  <X size={10} strokeWidth={2.8} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <footer className="dev-foot">
        <span className="dev-foot-path" title={dev.folder}>
          {dev.folder ? shortPath(dev.folder, 2) : t("dev.noFolder")}
        </span>
        <button
          type="button"
          className="dev-foot-button"
          onClick={() => invoke("open_settings_window").catch(() => {})}
          aria-label={t("dev.openSettings")}
          title={t("dev.openSettings")}
        >
          <ExternalLink size={10} strokeWidth={2.2} />
        </button>
      </footer>
      </div>
    </div>
  );
}
