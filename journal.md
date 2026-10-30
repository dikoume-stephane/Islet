# 📓 JOURNAL — Projet Islet (transition Nectar → Islet)

Format : entrées datées, plus récent en haut.
Sections par entrée : **Fait** · **Constats** · **Bloqué** · **À faire ensuite**.

---

## 2026-10-30 (2) — Dépannage `link: extra operand`

**Fait**
- 2e retour utilisateur : `cargo check` et `bun run tauri build` échouent sur `linking with link.exe failed` + `link: extra operand … Try 'link --help'`.
- **Diagnostic : conflit de binaire, pas un défaut du code.** Ce message est celui de l'outil GNU `link` (coreutils) livré par Git for Windows (`…\Git\usr\bin\link.exe`) ; MSVC parle un tout autre dialecte d'erreurs. Rust invoque `link.exe` et c'est le GNU qui répond → échec sur les build scripts (`proc-macro2`, `quote`, `serde_core`, `zerocopy`) avant tout code projet. Cause probable n°1 : le workload `VCTools` n'a pas fini/été installé (`--passive` rend la main immédiatement) ; cause n°2 : ordre du `PATH` (Git avant MSVC).
- Frontend **validé sur la machine Windows de l'utilisateur** au passage : `tsc && vite build` → 2294 modules, ✓ built in 12.53 s — preuve que le rebranding n'a rien cassé côté JS.
- `ELEMENTS_MANQUANTS.md` : section **« 🔧 Dépannage — link: extra operand »** ajoutée (diagnostic `vswhere`, réinstallation du workload, `where.exe link`, correctif `CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER` auto-détecté, alternative « x64 Native Tools Command Prompt »). Avertissement chemin mis à jour (résolu : `projets_git`).
- Décision : **aucun `.cargo/config.toml` committé** — le chemin du linker est propre à chaque machine.

**À faire ensuite**
- Utilisateur : appliquer le correctif puis relancer `cargo check` → `bun run tauri build` → tests d'installation.

---

## 2026-10-30 — Prérequis de build documentés (blocage environnemental Windows)

**Fait**
- Retour utilisateur : `bun` et `cargo` « non reconnus » en PowerShell sur la machine Windows — **aucun des deux n'est installé**. Aucun code concerné : c'est l'environnement, pas le rebranding.
- `ELEMENTS_MANQUANTS.md` #4 enrichi d'une section **« 0️⃣ Prérequis »** : diagnostic (`bun -v; cargo -V; rustc -V`), installation Bun / rustup / Build Tools MSVC via `winget`, vérification après redémarrage du terminal, alternatives sans `winget`, statut WebView2/NSIS.
- Avertissement ajouté sur le **chemin du clone** : `D:\2DS\projet\gaming & git\Islet` contient une espace et un `&` — `&` = opérateur PowerShell et source connue d'échecs MSVC/NSIS → recommander `D:\2DS\Islet`.
- Section #4 réécrite en deux temps (prérequis → validation) avec `git fetch origin && git switch arena/7705c682-islet`.

**À faire ensuite**
- L'utilisateur installe la chaîne d'outils, relance la validation G3/G4, me renvoie le résultat → merge de la PR #1.

---

## 2026-10-29 (nuit) — Assets officiels reçus + réintégration sur nouveau `main` + PR

**Fait**
- L'utilisateur a uploadé les **assets officiels directement sur `main`** (commit `14e3d80`) : `docs/islet-logo.png` (**2000², transparence native** — le vrai master), `docs/islet-wordmark-dark.png` / `-light.png` (1376×768, transparents), + `docs/yesjj.png` (2048², illustration pastel) et `docs/yessjh.png` (480², variante fantôme).
- Analyse colorimétrique des wordmarks : `dark` = glyphes **foncés** (#262626, pour fonds clairs) ; `light` = glyphes **clairs** (#f5f5f5, pour fonds sombres). README câblé en conséquence (mode sombre → fichier `light`, par couleur de glyphes).
- Le commit local précédent (`d1d4102`) a été perdu lors d'une restauration de snapshot entre deux tours — changements intacts dans l'arbre de travail, puis **rebases propres** : branche réinitialisée sur `origin/main` (`14e3d80`) + réapplication du rebranding par-dessus (aucun conflit).
- **Tous les assets dérivés régénérés depuis le master officiel** : sets d'icônes Tauri ×2 apps (50 fichiers chacun), BMP NSIS, `docs/logo.png`, `public/islet.png` (512²), wrappers `islet.svg` ×2. Anciens `docs/wordmark-*.png` (provisoires) supprimés — `islet-wordmark-*.png` sont la référence unique.
- Commit unique recréé, branche poussée, **PR ouverte** vers `main`.

**Constats**
- Les wordmarks/logo provisoires générés précédemment sont tous remplacés par les officiels. Plus rien de provisoire dans l'identité visuelle.
- `docs/yesjj.png` / `docs/yessjh.png` conservés tels quels (probables sources design / illustration hero — à confirmer pour Phase 2).

**Bloqué / en attente utilisateur**
- Inchangé : G3/G4 (validation Windows — commandes dans `ELEMENTS_MANQUANTS.md`), DÉC-5 (clés updater).

**À faire ensuite**
- Merge de la PR après validation Windows → puis **Phase 2**.

**Fait** (après réception des décisions DÉC-1 → DÉC-6)
- **Master logo** : `docs/islet-logo.png` (1024², transparent) généré depuis `docs/new-logo2.jpg` par flood-fill du fond noir (pupilles préservées). ⚠️ Le fichier annoncé « fourni » n'existait pas → master généré par l'agent, remplaçable.
- **Wordmarks** : `docs/wordmark-dark.png` / `docs/wordmark-light.png` régénérés (« Islet », DejaVu-Bold, 474×127) — **provisoires**, en attente des officiels. `docs/logo.png` = contenu remplacé par le logo Islet (nom conservé, stabilité README).
- **Remplacement textuel** : script à règles ordonnées (identifiants → casse). **1 219 remplacements dans 59 fichiers** : `com.kua8.nectar(.installer)` → `com.2DS.islet(.installer)`, `Software\kua8\nectar` → `Software\2DS\islet`, `kua8/Nectar` → `dikoume-stephane/Islet`, `Publisher: kua8 → 2DS`, casse `NECTAR/Nectar/nectar` → `ISLET/Islet/islet`.
- **Renommages** : `public/nectar.{svg,png}` → `public/islet.{svg,png}` (+ installer-app) via `git mv`. Le SVG = wrapper vectoriel embarquant le mascot PNG (base64, CSP `data:` déjà autorisée).
- **Icônes** : régénération complète via `npx @tauri-apps/cli@2 icon` → `src-tauri/icons/` (PNG ×17, `.ico` multi-tailles, `.icns`, android/, ios/) ; installer-app réduit aux 4 fichiers référencés par sa config.
- **NSIS** : `header.bmp` (150×57) + `sidebar.bmp` (164×314) recréés (fond `#0B0D13`, mascotte + « Islet »).
- **Métadonnées** : `productName: Islet`, titres fenêtres, `description`/`authors` Cargo (`kua8` **conservé** + `dikoume-stephane (2DS)` ajouté), artefacts `release.ps1` (`Islet_x.y.z_x64-setup.exe`, `islet.exe`, `islet-installer.exe`), endpoint updater repointé vers `dikoume-stephane/Islet`.
- **Légal** : `LICENSE` intact ; `AGENTS.md` intact ; section **Credits / Legal** ajoutée au README ; ligne d'attribution kua8 conservée dans AboutTab + mention fork ajoutée.
- **Lockfiles (6)** : package-lock ×2 régénérés via npm ; bun.lock ×2 + Cargo.lock ×2 = retouche chirurgicale du seul champ `name` (bun/cargo absents du sandbox) — diffs vérifiés : 4 lignes au total.
- **Validation sandbox** : `npm install` + `npm run build` (tsc + vite) **✅ verts pour les deux applications** ; JSON des configs valides ; audit final : **3 occurrences « Nectar » restantes, toutes intentionnelles** (Credits README + descriptions Cargo).

**Constats**
- Aucune référence cassée (`/islet.svg|png` résolvent, classes CSS/JSX cohérentes, clés localStorage `islet-*` identiques côté TS et Rust).
- Reset des réglages existants **assumé** (DÉC-3) : pas de migration, Nectar et Islet cohabiteront avec des états séparés.
- Updater : endpoint repointé mais sans clé de signature Islet valide → **pas de mise à jour fonctionnelle avant DÉC-5** (comportement sûr : 404 = pas d'update, aucun risque d'update vers l'upstream).

**Bloqué / en attente utilisateur**
- G3/G4 : `cargo check` + `bun tauri build` + test NSIS **sur Windows** (commandes prêtes dans `ELEMENTS_MANQUANTS.md`).
- DÉC-5 : nouvelle paire de clés updater (avant la première release).
- Wordmarks/logo officiels pour remplacer les provisoires.

**À faire ensuite**
- Utilisateur : lancer la validation Windows → puis G6 (PR finale).
- Puis instructions de **Phase 2**.

---

## 2026-10-29 (après-midi) — Initialisation & phase d'analyse

**Fait**
- Lecture d'`AGENTS.md` : mission = rebranding complet `nectar` → `islet`, sans toucher aux fonctionnalités, avec préservation de l'attribution GPL-3.0.
- Scan complet du dépôt : **1 241 occurrences** de « nectar » (insensible à la casse) dans **70 fichiers**.
- Cartographie technique complète (identifiants, chemins, registre, assets) — détails dans `memory.md`.
- Visualisation des deux candidats logo : `docs/new-logo.jpg` (2048²) et `docs/new-logo2.jpg` (1024²) — mascotte « île + palmier » sur fond noir.
- Création des fichiers de pilotage : `ROADMAP.md`, `todo.md`, `progress.md`, `journal.md`, `memory.md`, `ELEMENTS_MANQUANTS.md`.

**Constats**
1. Le chemin indiqué dans `AGENTS.md` (`docs/nexlogo`) **n'existe pas** dans le dépôt. Les logos candidats sont les deux JPEG ci-dessus + les wordmarks Nectar existants.
2. Les deux JPEG sont sur **fond noir opaque** : inutilisables tels quels pour les `.ico`/`.icns`/favicons → besoin d'une version transparente.
3. Stack : Tauri 2 + React 19 + Vite (bun) ; backend Rust **Windows-only** (crate `windows 0.61`, NSIS, webview2) → le sandbox Linux ne pourra valider que le frontend (`tsc && vite build`).
4. Points sensibles identifiés : clés localStorage `nectar-*` (188), identifiant `com.kua8.nectar`, registre `Software\kua8\nectar` + `Uninstall\Nectar`, mutex `NectarSingleInstance`, pubkey updater appartenant à l'upstream kua8.
5. 6 lockfiles contiennent « nectar » → seront **régénérés**, jamais édités à la main.

**Bloqué**
- 5 décisions `DÉC-1 → DÉC-5` en attente utilisateur → voir **`ELEMENTS_MANQUANTS.md`**.

**À faire ensuite**
- Attente des décisions + du logo transparent.
- Dès feu vert : démarrer le Bloc B (manifests) selon l'ordre de `ROADMAP.md`.

---

*Modèle d'entrée à copier pour la suite :*

<!--
## AAAA-MM-JJ — Titre

**Fait**
- …

**Constats**
- …

**Bloqué**
- …

**À faire ensuite**
- …
-->
