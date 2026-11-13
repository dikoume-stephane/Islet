import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  Radio,
  X,
  Settings,
  ExternalLink,
  Play,
  Loader2,
  Sparkles,
  CircleHelp,
} from "lucide-react";
import { formatAge, formatDuration, type BuildVerdict, type DevNote } from "../lib/dev";
import { shortPath } from "../lib/shelf";
import type { DevState } from "../hooks/useDev";
import type { AiState } from "../hooks/useAi";
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
  ai: AiState;
  onClose: () => void;
}

/** Traduit les codes d'erreur bruts du fournisseur de modèle. */
function aiErrorKey(error: string): { key: MessageKey; detail?: string } {
  if (error === "timeout") return { key: "ai.error.timeout" };
  if (error === "bad-url") return { key: "ai.error.badUrl" };
  if (error === "no-folder") return { key: "ai.error.noFolder" };
  if (error === "empty") return { key: "ai.error.empty" };
  if (error.startsWith("HTTP ")) return { key: "ai.error.http", detail: error.slice(5) };
  return { key: "ai.error.generic" };
}

/** Traduit les codes d'erreur bruts du backend. */
function errorKey(error: string): MessageKey {
  if (error.includes("not-a-repository")) return "dev.error.notRepository";
  if (error.includes("folder-missing")) return "dev.error.folderMissing";
  if (error.includes("no-folder")) return "dev.error.noFolder";
  return "dev.error.gitMissing";
}

export function NotchDev({ dev, ai, onClose }: NotchDevProps) {
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

  /** La phrase complète d'un verdict, pour l'infobulle et les lecteurs d'écran. */
  const verdictText = (verdict: BuildVerdict, durationMs: number): string => {
    const age = formatDuration(durationMs);
    if (verdict === "ok") return t("dev.build.ok", { age });
    if (verdict === "timeout") return t("dev.build.timeout", { age });
    return t("dev.build.failed", { age });
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

      {dev.buildCommand.trim() === "" ? (
        <div className="dev-build-empty">{t("dev.build.none")}</div>
      ) : (
        <div className="dev-build">
          <button
            type="button"
            className="dev-build-run"
            onClick={dev.runBuild}
            disabled={dev.buildRunning || dev.folder.trim() === ""}
            aria-label={t("dev.build.run")}
          >
            {dev.buildRunning ? (
              <Loader2 className="dev-spin" size={11} strokeWidth={2.6} />
            ) : (
              <Play size={11} strokeWidth={2.6} />
            )}
            <span>{dev.buildRunning ? t("dev.build.running") : t("dev.build.run")}</span>
          </button>
          <span className="dev-build-command" title={dev.buildCommand}>
            {dev.buildCommand}
          </span>
          {dev.build && !dev.buildRunning && (
            <span
              className={`dev-build-verdict is-${dev.build.verdict}`}
              title={verdictText(dev.build.verdict, dev.build.durationMs)}
            >
              {formatDuration(dev.build.durationMs)}
            </span>
          )}
        </div>
      )}

      {dev.build && !dev.buildRunning && dev.build.lines.length > 0 && (
        <div
          className={`dev-build-out is-${dev.build.verdict}`}
          title={verdictText(dev.build.verdict, dev.build.durationMs)}
          aria-live="polite"
        >
          {dev.build.lines.map((line, index) => (
            <span className="dev-build-line" key={`${index}-${line.slice(0, 12)}`}>
              {line}
            </span>
          ))}
        </div>
      )}

      {ai.enabled && (
        <div className="dev-ai">
          <div className="dev-ai-head">
            <Sparkles size={11} strokeWidth={2.2} />
            <span>{t("ai.panel.title")}</span>
            <span
              className={`dev-ai-scope ${ai.local ? "is-local" : "is-remote"}`}
              title={ai.local ? t("ai.scope.local.desc") : t("ai.scope.remote.desc")}
            >
              {ai.local ? t("ai.scope.local") : t("ai.scope.remote")}
            </span>
          </div>

          <div className="dev-ai-actions">
            {dev.build !== null && dev.build.verdict === "failed" && (
              <button
                type="button"
                className="dev-ai-button"
                disabled={ai.thinking !== null}
                onClick={() => ai.ask("explain", dev.build ? dev.build.fullLines.join("\n") : "")}
              >
                <CircleHelp size={10} strokeWidth={2.4} />
                {t("ai.ask.explain")}
              </button>
            )}
            <button
              type="button"
              className="dev-ai-button"
              disabled={ai.thinking !== null || dev.folder.trim() === ""}
              onClick={ai.askChanges}
            >
              <CircleHelp size={10} strokeWidth={2.4} />
              {t("ai.ask.changes")}
            </button>
          </div>

          {ai.thinking !== null && (
            <div className="dev-ai-thinking" aria-live="polite">
              <Loader2 className="dev-spin" size={10} strokeWidth={2.6} />
              {t("ai.thinking")}
            </div>
          )}

          {ai.answer !== null && ai.thinking === null && (
            <div className="dev-ai-answer" aria-live="polite">
              {ai.answer.lines.map((line, index) => (
                <span className="dev-ai-line" key={`${index}-${line.slice(0, 10)}`}>
                  {line}
                </span>
              ))}
              <button
                type="button"
                className="dev-ai-dismiss"
                onClick={ai.reset}
                aria-label={t("wc.close")}
                title={t("wc.close")}
              >
                <X size={9} strokeWidth={2.8} />
              </button>
            </div>
          )}

          {ai.error !== null && ai.thinking === null && (
            <div className="dev-ai-error">
              {(() => {
                const mapped = aiErrorKey(ai.error);
                return mapped.detail
                  ? t(mapped.key, { status: mapped.detail })
                  : t(mapped.key);
              })()}
            </div>
          )}
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
