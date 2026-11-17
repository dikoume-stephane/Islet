#!/usr/bin/env node
/**
 * Écrit la clé publique de signature des mises à jour dans `tauri.conf.json`.
 *
 * Le fichier `.key.pub` produit par `tauri signer generate` contient **déjà** la
 * valeur attendue : la clé publique minisign encodée en base64, telle quelle.
 * `plugins.updater.pubkey` doit donc recevoir ce contenu, sans réencodage. Ce
 * script le recopie après vérification, et remplace la valeur sur place pour ne
 * pas réécrire le reste du fichier.
 *
 * Si on lui donne la clé sous sa forme lisible (celle qui commence par
 * `untrusted comment:`), il l'encode. S'il reçoit une clé privée, il refuse.
 *
 * Usage :
 *   node scripts/set-pubkey.mjs                       # ~/.tauri/islet.key.pub
 *   node scripts/set-pubkey.mjs chemin/vers/islet.key.pub
 *   node scripts/set-pubkey.mjs --check               # compare, n'écrit rien
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const target = args.find((arg) => !arg.startsWith("--"));

const pubPath = target ?? path.join(os.homedir(), ".tauri", "islet.key.pub");
if (!fs.existsSync(pubPath)) {
  console.error(`Clé publique introuvable : ${pubPath}`);
  console.error("Passe le chemin en argument, ou génère la paire avec : bun run tauri signer generate -w ~/.tauri/islet.key");
  process.exit(1);
}

const raw = fs.readFileSync(pubPath, "utf8").trim();

// Deux formes possibles : le base64 du fichier .pub (cas normal), ou la clé
// lisible qu'on aurait collée à la main.
const encoded = raw.startsWith("untrusted comment:") ? Buffer.from(`${raw}\n`).toString("base64") : raw;

function decode(candidate) {
  try {
    return Buffer.from(candidate, "base64").toString("utf8");
  } catch {
    return "";
  }
}

const decoded = decode(encoded);
if (/secret key/i.test(decoded)) {
  console.error(`${pubPath} est une clé privée, pas une clé publique.`);
  console.error("Le fichier attendu est celui qui finit par .pub, jamais celui qui finit par .key.");
  process.exit(1);
}
if (!/^untrusted comment: minisign public key: [0-9A-F]{16}\nR[A-Za-z0-9+/=]{55}\n?$/.test(decoded)) {
  console.error(`${pubPath} ne ressemble pas à une clé publique minisign.`);
  console.error("En-tête attendu : « untrusted comment: minisign public key: … » suivi d'une ligne de 56 caractères.");
  process.exit(1);
}

const configPath = path.join("src-tauri", "tauri.conf.json");
const config = fs.readFileSync(configPath, "utf8");
const pattern = /("pubkey"\s*:\s*")([^"]*)(")/;
const match = pattern.exec(config);
if (!match) {
  console.error(`Aucune entrée "pubkey" dans ${configPath}`);
  process.exit(1);
}

const current = match[2];
if (checkOnly) {
  if (current === encoded) {
    console.log("La clé du fichier de configuration est celle du trousseau.");
    process.exit(0);
  }
  console.error("La clé du fichier de configuration ne correspond pas à ce fichier .pub.");
  process.exit(1);
}

if (current === encoded) {
  console.log("Rien à faire : la clé est déjà à jour.");
  process.exit(0);
}

fs.writeFileSync(configPath, config.replace(pattern, `$1${encoded}$3`));
console.log(`Clé publique mise à jour depuis ${pubPath} (${decoded.split("\n")[0].replace("untrusted comment: minisign public key: ", "empreinte ")}).`);
console.log("Relance l'audit (npm run audit) puis la sortie, et commite le changement.");
