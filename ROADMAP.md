# 🗺️ ROADMAP — Transition Nectar → Islet (Phase 1 : Rebranding)

> **Statut :** ⏸️ En attente de validation (éléments manquants, voir `ELEMENTS_MANQUANTS.md`)
> **Référence normative :** `AGENTS.md` (règles de casse, contraintes légales)
> **Suivi détaillé :** `todo.md` · Avancement : `progress.md` · Historique : `journal.md` · Contexte durable : `memory.md`

---

## 0. Vue d'ensemble

| | |
|---|---|
| **Produit** | Application desktop Windows — Tauri 2 + React 19 + Vite/TypeScript + Rust |
| **Ancien nom** | `nectar` (auteur upstream : kua8, repo `kua8/Nectar`) |
| **Nouveau nom** | `Islet` |
| **Version courante** | 1.4.1 (inchangée pendant le rebranding) |
| **Périmètre Phase 1** | Noms, logos, identifiants, métadonnées, documentation. **AUCUNE modification fonctionnelle.** |
| **Hors Phase 1 (Phase 2+)** | Changements métier, nouvelles features, refonte UI, infrastructure de release réelle |

### Inventaire initial (scan du 2026-10-29)
- **1 241 occurrences** de `nectar` (insensible à la casse) dans **70 fichiers** ; ~1 120 hors lockfiles.
- Zones chaudes : `src/settings/useSettings.ts` (188 clés localStorage `nectar-*`), `src/App.tsx` (128), `src/App.css` (116), `SETTINGS.md` (105), `src/theme.ts` (72), `src/Dock.tsx` (67).
- Identifiants critiques : `com.kua8.nectar`, `com.kua8.nectar.installer`, registre `Software\kua8\nectar`, `Uninstall\Nectar`, mutex `NectarSingleInstance`, env `NECTAR_RESTARTING`, AppData `com.kua8.nectar`.

### Règles de casse (rappel AGENTS.md)
| Origine | Cible | Exemples |
|---|---|---|
| `Nectar` | `Islet` | Titres fenêtres, tray, docs, `Uninstall\Nectar` |
| `nectar` | `islet` | `package.json` name, binaires, clés localStorage |
| `NECTAR` | `ISLET` | `NECTAR_RESTARTING`, macros NSIS |
| `com.*.nectar` | `com.*.islet` *(décision D1 requise)* | Identifiants Tauri, AppData, registre |

### ⚠️ Interdictions absolues
1. **Ne jamais modifier `LICENSE`** (GPL-3.0, copyright original conservé).
2. **Ne pas rebrander `AGENTS.md`** (document d'instructions historique).
3. **Ne pas éditer manuellement les lockfiles** — les régénérer (`bun.lock`, `package-lock.json` ×2, `Cargo.lock` ×2).
4. Aucune clé privée dans le dépôt (`*.key`, `*.key.pub` déjà ignorés par `.gitignore`).

---

## 1. Blocs de travail détaillés

### 🟦 BLOC 0 — Préparation ✅ FAIT
- [x] Scan exhaustif des occurrences `nectar`
- [x] Cartographie des identifiants, registre, mutex, chemins AppData
- [x] Inventaire des assets graphiques et formats requis
- [x] Création des fichiers de journalisation (`todo.md`, `progress.md`, `journal.md`, `memory.md`, `ROADMAP.md`, `ELEMENTS_MANQUANTS.md`)

---

### 🟨 BLOC A — Identité visuelle (logos & icônes)
> **Dépendance bloquante :** `ELEMENTS_MANQUANTS.md` #1 (choix du logo officiel + source transparente)

| ID | Tâche | Détail technique |
|---|---|---|
| A1 | Valider le logo officiel Islet | `docs/nexlogo` **n'existe pas**. Candidats présents : `docs/new-logo.jpg` (2048²) et `docs/new-logo2.jpg` (1024²) — fond noir opaque, sans canal alpha |
| A2 | Produire le master PNG transparent | 1024×1024 min, fond transparent, dérivé du logo validé. Les JPEG actuels ne conviennent pas directement aux icônes (fond noir visible) |
| A3 | Régénérer `src-tauri/icons/` | 17 PNG (32→1024, Square*, StoreLogo), `icon.ico` (multi-résolutions), `icon.icns`, dossiers `android/` et `ios/`. Format/tailles imposés par Tauri (`bundle.icon` dans `tauri.conf.json`) |
| A4 | Régénérer `installer-app/src-tauri/icons/` | 3 PNG + `icon.ico` |
| A5 | Rebander `installer/assets/` | `header.bmp` (150×57) et `sidebar.bmp` (164×314) — format BMP3 obligatoire pour NSIS |
| A6 | Remplacer les SVG/PNG publics | `public/nectar.svg` → `public/islet.svg`, `public/nectar.png` → `public/islet.png` (+ mise à jour des références, ex. `AboutTab.tsx` ligne ~175), idem `installer-app/public/` |
| A7 | Wordmarks | Remplacer `docs/wordmark-dark.png` / `docs/wordmark-light.png` (474×127) par des wordmarks « Islet » — voir `ELEMENTS_MANQUANTS.md` #2 |
| A8 | Captures d'écran | `docs/screenshots/*` — obsolètes après rebranding → repoussé en Phase 2 (nécessite un build Windows fonctionnel) |

---

### 🟩 BLOC B — Manifests & configuration build

| ID | Tâche | Fichiers |
|---|---|---|
| B1 | Renommer les packages npm | `package.json` (`name: "nectar"` → `"islet"`), `installer-app/package.json` |
| B2 | Renommer les crates Cargo | `src-tauri/Cargo.toml` (`name`, `lib.name` : `nectar_lib` → `islet_lib`), `installer-app/src-tauri/Cargo.toml` ; champ `description` vide → description Islet |
| B3 | Configs Tauri | `src-tauri/tauri.conf.json` : `productName`, `identifier` (décision D1), `windows[].title` (`"nectar"`→`"Islet"`, `"Nectar Dock"`→`"Islet Dock"`) ; `installer-app/src-tauri/tauri.conf.json` (`productName`/`title` « Nectar Setup » → « Islet Setup », identifiant) |
| B4 | Régénérer les lockfiles | `bun.lock`, `package-lock.json` ×2 (via `bun install` / `npm install`), `Cargo.lock` ×2 (via `cargo check` — ⚠️ Windows requis pour le backend) |
| B5 | Scripts de build/release | `scripts/bump-version.mjs`, `scripts/release.ps1` (noms `nectar.exe`, `nectar-installer.exe`, `Nectar-Setup-*.exe`, repo `kua8/Nectar`), `installer-app/scripts/build-payload.ps1` |

---

### 🟧 BLOC C — Frontend (React/TS/CSS)

| ID | Tâche | Détail |
|---|---|---|
| C1 | Clés localStorage | `nectar-*` → `islet-*` — 188 occurrences dans `src/settings/useSettings.ts` + lectures miroir côté Rust (`services.rs`, etc.). ⚠️ Casse les réglages des utilisateurs existants → **décision D2 requise** |
| C2 | Classes CSS & tokens | Préfixes/classes `nectar` dans `App.css` (116), `Settings.css` (85), `theme.ts` (72), `Dock.css` (62), `Overlay.css` (33), `Calendar.css`, `App.tsx` (128), `Dock.tsx` (67)… renommage synchronisé CSS ↔ JSX |
| C3 | Chaînes UI visibles | Titres « Nectar », `AboutTab.tsx` (logo, « Updated Nectar », boutons désinstallation…), menus. Conserver l'attribution « Made with ❤️ by kua8 » (contrainte légale) + ajouter mention fork |
| C4 | Titres des entrées HTML | `index.html`, `settings.html`, `dock.html`, `calendar.html`, `overlay.html` (+ `installer-app/index.html`) |
| C5 | Imports/ références d'assets | `/nectar.svg`, `/nectar.png` → nouveaux chemins (après A6) |

---

### 🟥 BLOC D — Backend Rust (`src-tauri/` + `installer-app/src-tauri/`)

| ID | Tâche | Détail |
|---|---|---|
| D1 | Identifiant application | `com.kua8.nectar` → nouvelle valeur (proposition par défaut : `com.kua8.islet`, ou `com.islet.app` — **décision requise**). Impacte : `tauri.conf.json` ×2, AppData (`diagnostics.rs`, `native_uninstall.rs`), registre |
| D2 | Noms de processus & sync | Mutex `NectarSingleInstance` → `IsletSingleInstance`, événement `NectarOpenSettings` → `IsletOpenSettings`, variable env `NECTAR_RESTARTING` → `ISLET_RESTARTING` (`main.rs`) |
| D3 | Fonctions/commandes | `quit_nectar`, `restart_nectar`, `uninstall_nectar` → `*_islet` + identifiants de commandes Tauri associés + appels `invoke()` côté frontend |
| D4 | Registre Windows | `Software\kua8\nectar` → `Software\…\islet` (`installer-app/.../registry.rs`), `Uninstall\Nectar` → `Uninstall\Islet` (`registry.rs`, `uninstall_registry.rs`), raccourcis `Nectar.lnk` → `Islet.lnk`, `DisplayName` |
| D5 | Chaînes visibles natif | Tooltip tray « Nectar », items menu « Quit Nectar » / « Restart Nectar », `hide_osd("nectar-…")` (miroir de C1), commentaires de code |
| D6 | AppData & logs | Chemin `com.kua8.nectar` (logs, flags) — dépend de D1/D2. Vérifier aussi `tray_icons.rs`, `diagnostics.rs`, `updater.rs` |

> ⚠️ **Conflit de coexistence :** renommer mutex/registre/clés permet à Nectar et Islet de cohabiter sur une même machine. Décision souhaitée ou non ? → voir `ELEMENTS_MANQUANTS.md` #3.

---

### 🟪 BLOC E — Installateur NSIS

| ID | Tâche | Détail |
|---|---|---|
| E1 | `installer/build/installer.nsh` | Macros `NECTAR_BG` → `ISLET_BG` (etc.), fonctions `NectarGuiInit`/`NectarCloseClick`, commentaires, références `nectar.exe` |
| E2 | Payload décoratif | Cohérence avec A5 (header/sidebar BMP Islet) ; vérifier `build-payload.ps1` |

---

### 📘 BLOC F — Documentation

| ID | Tâche | Détail |
|---|---|---|
| F1 | `README.md` | Renommage complet, badges → nouveau repo, liens releases, **ajout obligatoire** section *Credits / Legal* : *« Islet est un fork du projet open-source [Nectar](https://github.com/kua8/Nectar), modifié sous les termes de sa licence d'origine (GPL-3.0). »* |
| F2 | `SETTINGS.md` | 105 occurrences (clés de réglages renommées en C1) |
| F3 | `installer-app/README.md` | 5 occurrences |
| F4 | Vérification légale | `LICENSE` **intact** ; en-têtes de copyright des fichiers sources conservés ; mention mainteneur du fork ajoutée où pertinent (décision D4) |

---

### ✅ BLOC G — Validation & clôture

| ID | Tâche | Critère de sortie |
|---|---|---|
| G1 | Audit textuel | `grep -ri nectar` ≈ 0 reste — seuls `AGENTS.md` + section Credits du README + lockfiles générés conservent des mentions légitimes |
| G2 | Build frontend | `bun install && bun run build` (`tsc && vite build`) sans erreur — **faisable dans ce sandbox** |
| G3 | Check Rust | `cargo check` — ⚠️ **Windows uniquement** (crate `windows`, webview2) → à exécuter sur la machine du mainteneur, voir `ELEMENTS_MANQUANTS.md` #4 |
| G4 | Build complet Windows | `bun tauri build` + test installateur NSIS + désinstallateur + coexistence/upgrade depuis Nectar 1.4.1 |
| G5 | Updater | Endpoint (`tauri.conf.json`) repointé vers le repo Islet + nouvelle paire de clés de signature — voir `ELEMENTS_MANQUANTS.md` #5 (peut être différé avant première release) |
| G6 | Livraison | Commit(s) propres sur `arena/7705c682-islet` → PR avec résumé et checklist de revue |

---

## 2. Graphe de dépendances

```
ELEMENTS MANQUANTS (décisions humaines)
   │
   ├─► A1/A2 (logo master) ──► A3→A4→A5→A6──┐
   │                                         │
   ├─► D1 (identifiant) ──► B3 ──► D4, D6    │
   │        └─► G5 (updater/keys)            │
   │                                         ▼
   ├─► D2 (migration réglages) ──► C1    BLOCS B────► C────► D────► E ────► F ────► G1→G6
   │                                     (manifests) ▲         (Rust)              (validation
   └─► D3 (attribution fork) ──► F1        lockfiles─┘ (B4)                        finale)
```

## 3. Ordre d'exécution recommandé (une fois les décisions prises)

1. **Bloc B** (manifests) puis **B4** (lockfiles) — base du nouveau nom
2. **Bloc C** (frontend) — plus gros volume (~630 occurrences)
3. **Bloc D** (Rust) — identifiants natifs, registre, mutex
4. **Bloc E** (NSIS)
5. **Bloc A** (graphismes, dès réception du logo) — peut avancer en parallèle dès A2 résolu
6. **Bloc F** (docs)
7. **Bloc G** (validation G1→G2 ici, G3→G5 sur Windows, puis PR)

## 4. Critères de fin de Phase 1

- [ ] Zéro occurrence fonctionnelle de `nectar` hors mentions légales volontaires
- [ ] Application compilable et fonctionnelle sous le nom **Islet**, sans changement métier
- [ ] `LICENSE` inchangé + section Credits/Legal présente
- [ ] Icônes/logos Islet partout (app, installateur, docs)
- [ ] Journal + mémoire + progression à jour → feu vert pour la **Phase 2** (instructions à venir de l'utilisateur)
