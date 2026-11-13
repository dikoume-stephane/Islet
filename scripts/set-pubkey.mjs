#!/usr/bin/env node
/**
 * Écrit la clé publique de signature des mises à jour dans `tauri.conf.json`.
 *
 * Tauri attend, dans `plugins.updater.pubkey`, le contenu **entier** du fichier
 * `.key.pub` encodé en base64, commentaire `untrusted comment:` compris. Le
 * refaire à la main invite aux erreurs d'encodage : ce script lit le fichier
 * tel quel, octet pour octet, et remplace la valeur sur place, sans réécrire le
 * reste du fichier.
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

const encoded = Buffer.from(fs.readFileSync(pubPath)).toString("base64");
const configPath = path.join("src-tauri", "tauri.conf.json");
const config = fs.readFileSync(configPath, "utf8");

const pattern = /("pubkey"\s*:\s*")([^"]*)(")/;
const found = pattern.test(config);
if (!found) {
  console.error(`Aucune entrée "pubkey" dans ${configPath}`);
  process.exit(1);
}
const current = pattern.exec(config)[2];

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
console.log(`Clé publique mise à jour depuis ${pubPath}.`);
console.log("Relance l'audit (npm run audit) puis la sortie, et commite le changement.");
