/**
 * L'audit d'avant livraison.
 *
 * Ce script ne teste pas des fonctions : il vérifie les **coutures**, celles
 * qui ne cassent pas à la compilation et qui se voient seulement à l'usage.
 * Une commande appelée depuis l'interface mais oubliée dans le `generate_handler!`
 * de Tauri ne produit aucune erreur : elle échoue au clic, chez l'utilisateur.
 * Une clé de traduction ajoutée d'un seul côté s'affiche en français dans
 * l'interface anglaise. Un plugin utilisé sans sa permission échoue à l'appel.
 *
 * Usage : `npm run audit`. Sort en erreur (code 1) dès qu'un contrôle casse,
 * pour pouvoir le brancher sur un `npm run prerelease`.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function ok(label, detail = "") {
  console.log(`  ok   ${label}${detail ? ` (${detail})` : ""}`);
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function walk(dir, extensions) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "target") continue;
      out.push(...walk(rel, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(rel);
    }
  }
  return out;
}

const frontFiles = [...walk("src", [".ts", ".tsx"]), ...walk("scripts", [".ts"])];
const rustFiles = walk("src-tauri/src", [".rs"]);

/* ── 1. Les commandes : appelées, déclarées, enregistrées ─────────────── */

function frontCommands() {
  const names = new Map();
  for (const file of frontFiles) {
    const text = read(file);
    const patterns = [
      /invoke(?:<[^>]*>)?\(\s*"([a-z0-9_]+)"/g,
      /\bcall\(\s*"([a-z0-9_]+)"/g,
      /\bcall\(\s*`([a-z0-9_]+)`/g,
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        if (!names.has(match[1])) names.set(match[1], new Set());
        names.get(match[1]).add(file);
      }
    }
  }
  return names;
}

function rustCommands() {
  const names = new Set();
  for (const file of rustFiles) {
    const text = read(file);
    for (const match of text.matchAll(/#\[tauri::command\][\s\S]{0,160}?fn\s+([a-z0-9_]+)/g)) {
      names.add(match[1]);
    }
  }
  return names;
}

function handlerList() {
  const main = read("src-tauri/src/main.rs");
  const start = main.indexOf("generate_handler![") + "generate_handler![".length;
  let depth = 1;
  let index = start;
  while (index < main.length && depth > 0) {
    if (main[index] === "[") depth += 1;
    else if (main[index] === "]") depth -= 1;
    index += 1;
  }
  const block = main.slice(start, index - 1);
  return block
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split("::").pop().trim());
}

console.log("\nCommandes Tauri");
const invoked = frontCommands();
const declared = rustCommands();
const registered = handlerList();

for (const name of invoked.keys()) {
  if (!declared.has(name)) fail(`commande appelée mais absente du Rust : ${name}`);
  else if (!registered.includes(name)) fail(`commande appelée mais non enregistrée dans main.rs : ${name}`);
}
for (const name of registered) {
  if (!declared.has(name)) fail(`commande enregistrée mais introuvable dans le Rust : ${name}`);
}
const duplicates = registered.filter((name, index) => registered.indexOf(name) !== index);
if (duplicates.length > 0) fail(`commandes enregistrées deux fois : ${[...new Set(duplicates)].join(", ")}`);
ok("appelées, déclarées, enregistrées", `${invoked.size} appelées, ${registered.length} enregistrées`);

/* ── 2. Les plugins : utilisés, autorisés, initialisés ────────────────── */

console.log("\nPlugins");
const capabilities = read("src-tauri/capabilities/default.json");
const mainRs = read("src-tauri/src/main.rs");
const PLAYERS = [
  { pkg: "@tauri-apps/plugin-dialog", permission: "dialog:default", init: "tauri_plugin_dialog::init" },
  { pkg: "@tauri-apps/plugin-opener", permission: "opener:default", init: "tauri_plugin_opener::init" },
  { pkg: "@tauri-apps/plugin-autostart", permission: "autostart:default", init: "tauri_plugin_autostart::init" },
];
for (const plugin of PLAYERS) {
  const used = frontFiles.some((file) => read(file).includes(`${plugin.pkg}"`));
  if (!used) continue;
  if (!capabilities.includes(`"${plugin.permission}"`)) {
    fail(`plugin utilisé sans permission : ${plugin.pkg} demande ${plugin.permission}`);
  }
  if (!mainRs.includes(plugin.init)) fail(`plugin utilisé mais non initialisé côté Rust : ${plugin.pkg}`);
}
ok("permissions des plugins utilisés");

/* ── 3. Les traductions ───────────────────────────────────────────────── */

console.log("\nTraductions");

function keysOf(file) {
  const keys = new Set();
  const text = read(file);
  for (const match of text.matchAll(/^\s{2}"([a-zA-Z0-9_.]+)":/gm)) keys.add(match[1]);
  return keys;
}

const fr = keysOf("src/i18n/fr.ts");
const en = keysOf("src/i18n/en.ts");
for (const key of en) if (!fr.has(key)) fail(`clé absente du français : ${key}`);
for (const key of fr) if (!en.has(key)) fail(`clé absente de l'anglais : ${key}`);
ok("parité des clés", `${en.size} clés dans chaque langue`);

const forbidden = /—|\.\.\./;
for (const file of ["src/i18n/fr.ts", "src/i18n/en.ts"]) {
  const text = read(file);
  for (const line of text.split("\n")) {
    if (!/^\s{2}"/.test(line)) continue;
    if (forbidden.test(line)) fail(`tiret cadratin ou points de suspension dans une chaîne : ${file} ${line.trim().slice(0, 60)}`);
  }
}
ok("aucun tiret cadratin ni points de suspension dans les libellés");

const used = new Set();
for (const file of frontFiles) {
  // Les commentaires citent des exemples de clés : ils ne sont pas des appels.
  const text = read(file)
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !(trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*"));
    })
    .join("\n");
  for (const match of text.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) used.add(match[1]);
}
for (const key of used) if (!en.has(key)) fail(`clé utilisée mais introuvable : ${key}`);
ok("clés utilisées présentes", `${used.size} clés`);

/* ── 4. Les versions ──────────────────────────────────────────────────── */

console.log("\nVersions");
// Les six fichiers que `scripts/release.ps1` compare avant de construire : un
// oubli ici ne se verrait qu'au moment de livrer, après vingt minutes de build.
const VERSION_FILES = [
  "package.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "installer-app/package.json",
  "installer-app/src-tauri/tauri.conf.json",
  "installer-app/src-tauri/Cargo.toml",
];
const versions = new Map();
for (const file of VERSION_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    fail(`fichier de version absent : ${file}`);
    continue;
  }
  const text = read(file);
  const version = file.endsWith(".json")
    ? JSON.parse(text).version
    : /^version\s*=\s*"([^"]+)"/m.exec(text)?.[1];
  if (!version) fail(`version illisible dans ${file}`);
  versions.set(file, version);
}
const distinct = new Set(versions.values());
if (distinct.size > 1) {
  const detail = [...versions].map(([file, version]) => `${file.split("/").pop()} ${version}`).join(", ");
  fail(`versions désaccordées : ${detail}`);
} else {
  ok("versions alignées", `${[...distinct][0]} sur ${versions.size} fichiers`);
}

/* ── 5. Pas de trace de mise au point ─────────────────────────────────── */

console.log("\nMise au point");
for (const file of walk("src", [".ts", ".tsx"])) {
  const text = read(file);
  if (/^\s*debugger\s*;?\s*$/m.test(text)) fail(`debugger oublié dans ${file}`);
  for (const line of text.split("\n")) {
    if (/^\s*(?!\*|\/\/)console\.log\(/.test(line)) fail(`console.log oublié dans ${file}`);
  }
}
ok("aucun debugger ni console.log");

/* ── 6. Le dépôt, pour la forme ───────────────────────────────────────── */

console.log("\nDépôt");
if (!read("src-tauri/tauri.conf.json").includes('"identifier": "com.2DS.islet"')) {
  fail("identifiant d'application inattendu (attendu : com.2DS.islet)");
}
ok("identifiant com.2DS.islet");

/* ── Verdict ──────────────────────────────────────────────────────────── */

if (failures.length > 0) {
  console.error(`\n${failures.length} problème(s) :`);
  for (const message of failures) console.error(`  ✖ ${message}`);
  process.exit(1);
}
console.log("\nAudit passé.\n");
