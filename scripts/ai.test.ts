import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AI_TASKS,
  answerLines,
  buildChatBody,
  buildMessages,
  chatUrl,
  clampInput,
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  isLocalEndpoint,
  MAX_ANSWER_CHARS,
  MAX_INPUT_CHARS,
  normalizeEndpoint,
  parseAnswer,
} from "../src/lib/ai.ts";

/**
 * L'assistance IA.
 *
 * Le fichier ne parle à personne : il prépare une requête et relit une réponse.
 * C'est exactement ce qui doit être vérifié, puisqu'une fois la requête partie,
 * il n'y a plus grand-chose à corriger.
 */

describe("les adresses de fournisseur", () => {
  it("nettoie ce qu'on tape dans un champ", () => {
    assert.equal(normalizeEndpoint("  http://127.0.0.1:11434/  "), "http://127.0.0.1:11434");
    assert.equal(normalizeEndpoint(""), DEFAULT_ENDPOINT);
  });

  it("refuse un schéma qui n'est ni http ni https", () => {
    assert.equal(normalizeEndpoint("file:///etc/passwd"), DEFAULT_ENDPOINT);
    assert.equal(normalizeEndpoint("ftp://exemple.fr"), DEFAULT_ENDPOINT);
    assert.equal(normalizeEndpoint("javascript:alert(1)"), DEFAULT_ENDPOINT);
  });

  it("complète le chemin de la complétion", () => {
    assert.equal(chatUrl("http://127.0.0.1:11434"), "http://127.0.0.1:11434/v1/chat/completions");
    assert.equal(chatUrl("http://127.0.0.1:11434/v1"), "http://127.0.0.1:11434/v1/chat/completions");
    assert.equal(
      chatUrl("http://127.0.0.1:11434/v1/chat/completions"),
      "http://127.0.0.1:11434/v1/chat/completions",
    );
    assert.equal(chatUrl("https://api.exemple.fr/v1"), "https://api.exemple.fr/v1/chat/completions");
  });

  it("reconnaît un fournisseur local, et doute de tout le reste", () => {
    assert.equal(isLocalEndpoint("http://127.0.0.1:11434"), true);
    assert.equal(isLocalEndpoint("http://localhost:1234/v1"), true);
    assert.equal(isLocalEndpoint("HTTP://LOCALHOST:8080"), true);
    assert.equal(isLocalEndpoint("https://api.openai.com/v1"), false);
    assert.equal(isLocalEndpoint("http://192.168.1.20:11434"), false);
    assert.equal(isLocalEndpoint("pas une adresse"), false);
    // Vide : l'adresse par défaut prend la main, et elle est locale.
    assert.equal(isLocalEndpoint("  "), true);
  });
});

describe("ce qui part", () => {
  it("garde la fin d'un texte trop long, là où se trouve l'erreur", () => {
    const long = "début\n".repeat(2000) + "error TS2304: Cannot find name 'x'.";
    const kept = clampInput(long, 200);
    assert.ok(kept.length <= 210);
    assert.ok(kept.endsWith("error TS2304: Cannot find name 'x'."));
    assert.ok(kept.startsWith("[…]"));
  });

  it("ne touche pas à un texte assez court", () => {
    assert.equal(clampInput("ok\n"), "ok");
  });

  it("jette une première ligne coupée au milieu", () => {
    const kept = clampInput("a".repeat(50) + "\nseconde ligne", 14);
    assert.equal(kept, "[…]\nseconde ligne");
  });
});

describe("les messages", () => {
  it("parle la langue de l'interface", () => {
    const fr = buildMessages("explain", "erreur", "fr");
    const en = buildMessages("explain", "erreur", "en");
    assert.equal(fr[0].role, "system");
    assert.equal(fr[1].role, "user");
    assert.ok(fr[0].content.includes("build"));
    assert.notEqual(fr[0].content, en[0].content);
  });

  it("donne une consigne différente par tâche", () => {
    const explain = buildMessages("explain", "x", "fr")[0].content;
    const changes = buildMessages("changes", "x", "fr")[0].content;
    assert.notEqual(explain, changes);
    assert.ok(changes.includes("diff"));
  });

  it("n'envoie jamais un message utilisateur vide", () => {
    assert.equal(buildMessages("explain", "   ", "fr")[1].content, "?");
  });

  it("borne ce qui part, quelle que soit la taille de l'entrée", () => {
    const huge = "x".repeat(MAX_INPUT_CHARS * 2);
    const user = buildMessages("explain", huge, "fr")[1].content;
    assert.ok(user.length <= MAX_INPUT_CHARS + 5);
  });

  it("ne livre que deux tâches", () => {
    assert.deepEqual([...AI_TASKS], ["explain", "changes"]);
  });
});

describe("le corps de la requête", () => {
  const messages = buildMessages("explain", "error", "fr");

  it("est du JSON, sans flux", () => {
    const body = JSON.parse(buildChatBody("llama3.1", messages));
    assert.equal(body.stream, false);
    assert.equal(body.model, "llama3.1");
    assert.equal(body.messages.length, 2);
  });

  it("retombe sur le modèle par défaut quand le champ est vide", () => {
    assert.equal(JSON.parse(buildChatBody("   ", messages)).model, DEFAULT_MODEL);
  });
});

describe("la réponse", () => {
  it("lit le format OpenAI", () => {
    const raw = JSON.stringify({ choices: [{ message: { role: "assistant", content: "  Cause : x.  " } }] });
    assert.equal(parseAnswer(raw), "Cause : x.");
  });

  it("lit aussi le format natif d'Ollama", () => {
    assert.equal(parseAnswer(JSON.stringify({ response: "Cause : y." })), "Cause : y.");
    assert.equal(parseAnswer(JSON.stringify({ message: { content: "Cause : z." } })), "Cause : z.");
  });

  it("ne prend pas une coquille pour une réponse", () => {
    assert.equal(parseAnswer("pas du json"), null);
    assert.equal(parseAnswer("{}"), null);
    assert.equal(parseAnswer(JSON.stringify({ choices: [{ message: { content: "   " } }] })), null);
    assert.equal(parseAnswer(JSON.stringify({ choices: [] })), null);
  });

  it("tronque une réponse trop longue en le disant", () => {
    const long = "a".repeat(MAX_ANSWER_CHARS + 100);
    const answer = parseAnswer(JSON.stringify({ response: long }));
    assert.equal(answer.length, MAX_ANSWER_CHARS + 1);
    assert.ok(answer.endsWith("…"));
  });

  it("découpe pour le panneau, sans lignes vides", () => {
    assert.deepEqual(answerLines("une\n\n deux \ntrois\nquatre\ncinq\nsix"), [
      "une",
      "deux",
      "trois",
      "quatre",
      "cinq",
    ]);
    assert.deepEqual(answerLines(null), []);
  });
});
