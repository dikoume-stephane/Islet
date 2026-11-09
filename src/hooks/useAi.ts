import { invoke } from "@tauri-apps/api/core";
import { useCallback, useRef, useState } from "react";
import {
  answerLines,
  buildChatBody,
  buildMessages,
  chatUrl,
  isLocalEndpoint,
  parseAnswer,
  type AiLanguage,
  type AiTask,
} from "../lib/ai";

/**
 * L'assistance IA, interrogée à la main.
 *
 * **Rien ne part tout seul.** Aucun minuteur, aucun effet au montage : `ask`
 * n'est appelée que par un clic, et elle refuse si le réglage est éteint. Une
 * seule question à la fois : un second clic pendant une réponse ne lance pas
 * une seconde requête.
 *
 * Le texte envoyé est celui que l'appelant donne (les dernières lignes d'un
 * build, un résumé de diff), déjà borné par `src/lib/ai.ts`. Aucun fichier
 * n'est lu ici, aucun contenu de dépôt ne transite.
 */

export interface AiAnswer {
  task: AiTask;
  lines: string[];
  at: number;
}

export interface AiState {
  /** Le réglage, relu pour que le panneau sache s'il peut proposer le bloc. */
  enabled: boolean;
  /** Vrai quand le fournisseur tourne sur cette machine. */
  local: boolean;
  /** La tâche en cours, ou null. */
  thinking: AiTask | null;
  answer: AiAnswer | null;
  /** Code brut d'erreur : `timeout`, `bad-url`, `HTTP 500`, `empty`, `request: …`. */
  error: string | null;
  ask: (task: AiTask, payload: string) => void;
  askChanges: () => void;
  reset: () => void;
}

interface AiRaw {
  ok: boolean;
  status: number;
  body: string;
}

export function useAi(
  enabled: boolean,
  folder: string,
  endpoint: string,
  model: string,
  language: AiLanguage,
): AiState {
  const [thinking, setThinking] = useState<AiTask | null>(null);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const ask = useCallback(
    (task: AiTask, payload: string) => {
      if (!enabled || busyRef.current) return;
      busyRef.current = true;
      setThinking(task);
      setError(null);
      setAnswer(null);

      const body = buildChatBody(model, buildMessages(task, payload, language));
      invoke<AiRaw>("ai_post", { url: chatUrl(endpoint), body })
        .then((raw) => {
          if (!raw.ok) throw new Error(`HTTP ${raw.status}`);
          const text = parseAnswer(raw.body);
          if (text === null) throw new Error("empty");
          setAnswer({ task, lines: answerLines(text), at: Date.now() });
        })
        .catch((failure: unknown) => {
          setError(String(failure).replace(/^Error: /, ""));
        })
        .finally(() => {
          busyRef.current = false;
          setThinking(null);
        });
    },
    [enabled, endpoint, model, language],
  );

  /**
   * Résumer les changements : le résumé chiffré du diff est lu à la demande,
   * puis envoyé. On n'envoie jamais le diff complet, seulement `--stat`.
   */
  const askChanges = useCallback(() => {
    if (!enabled || busyRef.current) return;
    if (folder.trim() === "") {
      setError("no-folder");
      return;
    }
    busyRef.current = true;
    setThinking("changes");
    setError(null);
    setAnswer(null);
    invoke<string>("dev_git_diff", { folder })
      .then((stat) => {
        busyRef.current = false;
        setThinking(null);
        ask("changes", stat);
      })
      .catch((failure: unknown) => {
        busyRef.current = false;
        setThinking(null);
        setError(String(failure).replace(/^Error: /, ""));
      });
  }, [ask, enabled, folder]);

  const reset = useCallback(() => {
    setAnswer(null);
    setError(null);
  }, []);

  return {
    enabled,
    local: isLocalEndpoint(endpoint),
    thinking,
    answer,
    error,
    ask,
    askChanges,
    reset,
  };
}
