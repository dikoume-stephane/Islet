/**
 * L'assistance IA : ce qu'on demande, à qui, et ce qu'on garde de la réponse.
 *
 * Le module est **volontairement étroit**. Trois tâches, pas une de plus, et
 * aucune d'elles n'écrit dans le dépôt : expliquer un échec de build, résumer
 * les changements en cours, proposer une commande. Un agent qui modifie des
 * fichiers n'est pas au programme, et ce fichier est l'endroit où cela se voit.
 *
 * Deux règles de sûreté, tenues ici parce que c'est ici qu'on décide :
 *
 * - **Rien ne part par défaut.** Aucune fonction de ce fichier n'envoie quoi
 *   que ce soit ; elles construisent une requête, l'appelant décide. Le réglage
 *   est éteint à l'installation, et une requête ne se construit que si
 *   l'utilisateur a écrit lui-même l'adresse du fournisseur.
 * - **Ce qui part est borné et annoncé.** Le texte envoyé est tronqué à
 *   `MAX_INPUT_CHARS`, et le fournisseur par défaut vit sur la machine
 *   (`127.0.0.1`). Un point coloré dans le panneau dit lequel des deux répond.
 *
 * Fichier pur : aucun React, aucune clé i18n, aucune horloge implicite.
 */

/** Les deux tâches livrées. « Proposer une commande » viendra après. */
export type AiTask = "explain" | "changes";

export const AI_TASKS: readonly AiTask[] = ["explain", "changes"];

/** Un modèle local avale beaucoup ; au-delà, on paie des jetons pour rien. */
export const MAX_INPUT_CHARS = 4_000;

/** Ce qu'on montre dans un panneau de 350 points de large. */
export const MAX_ANSWER_CHARS = 900;

/** Ollama écoute là, et ne demande aucun compte. */
export const DEFAULT_ENDPOINT = "http://127.0.0.1:11434";

export const DEFAULT_MODEL = "llama3.1";

/** Au-delà, la requête est refusée par Rust de toute façon : on la retient ici. */
export const MAX_BODY_CHARS = 60_000;

export type AiLanguage = "fr" | "en";

/**
 * Nettoie une adresse de fournisseur.
 *
 * On accepte ce que l'utilisateur tape avec les doigts dans un champ : un
 * espace de trop, une barre finale, un chemin déjà complet. Ce qu'on n'accepte
 * pas : un schéma autre que http ou https.
 */
export function normalizeEndpoint(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed === "") return DEFAULT_ENDPOINT;
  if (!/^https?:\/\//i.test(trimmed)) return DEFAULT_ENDPOINT;
  return trimmed;
}

/**
 * L'adresse complète de la complétion, compatible OpenAI.
 *
 * Deux conventions cohabitent chez les serveurs locaux : Ollama expose
 * `/v1/chat/completions`, et beaucoup d'autres collent `/v1`. On accepte donc
 * une adresse avec ou sans `/v1`, et on complète ce qui manque.
 */
export function chatUrl(raw: string): string {
  const base = normalizeEndpoint(raw);
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

/**
 * Le fournisseur tourne-t-il sur cette machine ?
 *
 * Ce n'est pas une décoration : c'est la phrase la plus importante de l'écran
 * de consentement, et le point du panneau. Une adresse qu'on ne sait pas lire
 * est traitée comme distante, jamais comme locale.
 */
export function isLocalEndpoint(raw: string): boolean {
  const trimmed = raw.trim();
  // Un champ vide vaut l'adresse par défaut, qui est locale. Une adresse
  // illisible, en revanche, ne promet rien : on la traite comme distante.
  if (trimmed === "") return true;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  const url = normalizeEndpoint(trimmed).toLowerCase();
  const match = /^https?:\/\/([^/:]+|\[[^\]]+\])/.exec(url);
  if (!match) return false;
  const host = match[1];
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "0.0.0.0";
}

/**
 * La fin d'un texte, bornée.
 *
 * On garde la **fin** : une erreur de compilation se lit à la dernière ligne,
 * un `diff --stat` se résume par le bas. La coupe est annoncée dans le texte
 * envoyé, pour que le modèle sache qu'il lui manque le début.
 */
export function clampInput(text: string, max: number = MAX_INPUT_CHARS): string {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= max) return clean;
  const kept = clean.slice(clean.length - max);
  const firstBreak = kept.indexOf("\n");
  // Une ligne coupée au milieu serait un piège pour le modèle : on la jette.
  const body = firstBreak >= 0 && firstBreak < kept.length - 1 ? kept.slice(firstBreak + 1) : kept;
  return `[…]\n${body}`;
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/** Les consignes, une par tâche et par langue. Courtes : elles sont payées. */
const SYSTEM_PROMPTS: Record<AiTask, Record<AiLanguage, string>> = {
  explain: {
    fr: "Tu expliques un échec de build à un développeur pressé. Donne la cause probable en une phrase, puis la correction en une ou deux lignes. Pas de préambule, pas de code complet, cinq lignes au maximum.",
    en: "You explain a build failure to a developer in a hurry. Give the likely cause in one sentence, then the fix in one or two lines. No preamble, no full code, five lines at most.",
  },
  changes: {
    fr: "Tu résumes le travail en cours d'un dépôt à partir d'un résumé de diff. Dis ce qui a bougé et ce qu'il reste probablement à finir. Pas de préambule, cinq lignes au maximum.",
    en: "You summarise the work in progress in a repository from a diff summary. Say what moved and what is probably left to finish. No preamble, five lines at most.",
  },
};

/** Ce qu'on envoie : deux messages, système et utilisateur. Rien d'autre. */
export function buildMessages(task: AiTask, payload: string, language: AiLanguage): ChatMessage[] {
  const body = clampInput(payload);
  return [
    { role: "system", content: SYSTEM_PROMPTS[task][language] },
    { role: "user", content: body === "" ? "?" : body },
  ];
}

/**
 * Le corps de la requête, au format chat complétion.
 *
 * `stream` est explicitement faux : le panneau affiche une réponse d'un bloc,
 * et un flux à découper serait du code pour rien.
 */
export function buildChatBody(model: string, messages: readonly ChatMessage[]): string {
  const clean = model.trim() === "" ? DEFAULT_MODEL : model.trim();
  return JSON.stringify({
    model: clean,
    messages,
    stream: false,
    temperature: 0.2,
  });
}

/**
 * La réponse du modèle, ou `null`.
 *
 * Trois fournisseurs, trois formes, et il n'y a pas de raison de les croire sur
 * parole : `choices[0].message.content` (OpenAI, Ollama en mode compatibilité),
 * `message.content` (Ollama natif), `response` (Ollama `generate`). On essaie
 * les trois, on rend `null` plutôt qu'une chaîne vide déguisée en succès.
 */
export function parseAnswer(raw: string): string | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;

  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | null;
    const message = first && (first.message as Record<string, unknown> | undefined);
    if (message && typeof message.content === "string") return finish(message.content);
    if (first && typeof first.text === "string") return finish(first.text);
  }

  const message = record.message as Record<string, unknown> | undefined;
  if (message && typeof message.content === "string") return finish(message.content);

  if (typeof record.response === "string") return finish(record.response);

  return null;
}

function finish(text: string): string | null {
  const clean = text.trim();
  if (clean === "") return null;
  if (clean.length <= MAX_ANSWER_CHARS) return clean;
  return `${clean.slice(0, MAX_ANSWER_CHARS).trimEnd()}…`;
}

/** La réponse découpée pour le panneau : des lignes courtes, pas un pavé. */
export function answerLines(answer: string | null, max: number = 5): string[] {
  if (answer === null) return [];
  const lines: string[] = [];
  for (const raw of answer.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    lines.push(line);
    if (lines.length >= Math.max(0, max)) break;
  }
  return lines;
}
