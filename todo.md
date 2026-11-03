# ✅ TODO — Phase 1 : Rebranding Nectar → Islet

> Cases synchronisées avec `ROADMAP.md`. Ordre = ordre d'exécution.
> Légende : `[ ]` à faire · `[~]` en cours · `[x]` fait · `[⏳]` en attente utilisateur/externe

## Préparation
- [x] Lire `AGENTS.md` et indexer le dépôt
- [x] Scanner les occurrences `nectar` (1 241 × / 70 fichiers)
- [x] Cartographier identifiants, registre, mutex, AppData, localStorage
- [x] Créer les fichiers de pilotage

## Décisions utilisateur
- [x] **DÉC-1** — Logo officiel reçu : `docs/islet-logo.png` (2000², transparent) — **master canonique**, tous les assets régénérés depuis lui
- [x] **DÉC-2** — Wordmarks officiels reçus (`docs/islet-wordmark-*.png`) et intégrés
- [x] **DÉC-3** — Identifiant = `com.2DS.islet` (+ `.installer`) ; données = **reset assumé**
- [x] **DÉC-4** — Attribution fork = « dikoume-stephane (2DS) »
- [x] **DÉC-5** — Clés updater : différé avant 1re release (endpoint déjà repointé vers le repo Islet)

## Bloc B — Manifests & config ✅
- [x] B1 — `package.json` ×2 : `name` → `islet` / `islet-installer`
- [x] B2 — `Cargo.toml` ×2 : `name`, `islet_lib`, descriptions + authors (`kua8` conservé + `dikoume-stephane (2DS)`)
- [x] B3 — `tauri.conf.json` ×2 : `productName` = `Islet` / `Islet Setup`, `identifier` = `com.2DS.islet(.installer)`, titres fenêtres
- [x] B4 — Lockfiles ×6 synchronisés (npm regen ×2 ; retouche chirurgicale `name` ×4, diffs vérifiés)
- [x] B5 — `bump-version.mjs`, `release.ps1` (repo `dikoume-stephane/Islet`, artefacts `Islet_*-setup.exe`, `islet.exe`, `islet-installer.exe`), `build-payload.ps1`

## Bloc C — Frontend ✅
- [x] C1 — Clés localStorage `nectar-*` → `islet-*` (188 × useSettings.ts + lecteurs Rust miroirs)
- [x] C2 — Classes CSS & tokens (`App.css`, `Settings.css`, `theme.ts`, `Dock.css`, `Overlay.css`, `Calendar.css` + JSX)
- [x] C3 — Chaînes UI + attribution kua8 conservée + mention fork (AboutTab)
- [x] C4 — Titres HTML ×6
- [x] C5 — Références `/nectar.*` → `/islet.*` (fichiers renommés via `git mv`)

## Bloc D — Backend Rust ✅
- [x] D2 — Mutex `IsletSingleInstance`, event `IsletOpenSettings`, env `ISLET_RESTARTING`
- [x] D3 — Fns `quit_islet` / `restart_islet` / `uninstall_islet` + commandes Tauri + `invoke`
- [x] D4 — Registre : `Software\2DS\islet`, `Uninstall\Islet`, `Islet.lnk`, `Publisher = 2DS`
- [x] D5 — Tooltip tray, menus, `hide_osd("islet-…")`, commentaires
- [x] D6 — AppData `com.2DS.islet` (`diagnostics.rs`, `native_uninstall.rs`)

## Bloc E — Installateur NSIS ✅
- [x] E1 — `installer.nsh` : macros `ISLET_*`, `IsletGuiInit`, commentaires, `islet.exe`
- [x] E2 — `header.bmp` (150×57) + `sidebar.bmp` (164×314) régénérés aux couleurs Islet

## Bloc A — Identité visuelle ✅ (provisoire partiellement)
- [x] A2 — Master PNG transparent 1024² : `docs/islet-logo.png`
- [x] A3 — `src-tauri/icons/` régénérés (17 PNG + ico + icns + android/ios, via CLI Tauri)
- [x] A4 — `installer-app/src-tauri/icons/` (4 fichiers référencés)
- [x] A5 — BMP NSIS (voir E2)
- [x] A6 — `islet.svg` (wrapper vectoriel du mascot) + `islet.png` ×2 apps ; `docs/logo.png` remplacé
- [x] A7 — Wordmarks **officiels** `docs/islet-wordmark-{dark,light}.png` intégrés (reçus via `main`) ; anciens fichiers supprimés ; README recâblé par couleur de glyphes
- [x] A8 — Screenshots régénérés depuis une capture Windows réelle (notch, dock, desktop) — ⚠️ icône du dock = ancienne mascotte (build antérieur à la PR #2), à refaire après rebuild

## Bloc F — Documentation ✅
- [x] F1 — `README.md` : badges/liens repo Islet + **section Credits / Legal** (fork de Nectar, GPL-3.0)
- [x] F2 — `SETTINGS.md` (105 clés renommées, chemins `com.2DS.islet`)
- [x] F3 — `installer-app/README.md`
- [x] F4 — `LICENSE` intact · `AGENTS.md` intact · en-têtes conservés · attributions ajoutées

## Bloc G — Validation 🟡
- [x] G1 — Audit `grep -ri nectar` : **3 occurrences restantes, toutes intentionnelles** (légal)
- [x] G2 — `npm install` + `npm run build` ✅ app principale **et** installer-app (tsc + vite verts)
- [x] G3 — `cargo check` sur Windows : ✅ `Finished dev profile in 5m 10s`, aucune erreur (30/10)
- [⏳] G4 — `islet.exe` release ✅ produit (12m 29s) ; **bundling restant** : `bun run tauri build --bundles nsis --no-sign` (MSI/WiX + clé updater écartés) puis test installateur/désinstallateur NSIS
- [x] G5 — Clé updater Islet générée et intégrée (ID `BA3FEE8CCD2277FC`, 2026-11-02) — privée hors dépôt, sauvegarde à la charge du mainteneur
- [x] G6 — **PR #1 mergée** : https://github.com/dikoume-stephane/Islet/pull/1
