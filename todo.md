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

---

# 🚀 PHASE 3 — Fonctionnalités

## Bloc H — Onboarding (J1)
- [ ] H1 — Détection premier lancement (`islet-onboarded`) avec migration douce
- [ ] H2 — Mode `onboarding` dans la fenêtre Settings existante
- [ ] H3 — Étape 1 : bienvenue + nom de l'assistant (défaut « Is »)
- [ ] H4 — Étape 2 : apparence avec **aperçu en direct** sur le notch
- [ ] H5 — Étape 3 : notch ou dock (+ écran cible)
- [ ] H6 — Étape 4 : transparence sur les données (local vs réseau)
- [ ] H7 — Étape 5 : récapitulatif + écriture du drapeau
- [ ] H8 — « Passer » à chaque étape + entrée « Revoir l'accueil » dans General

## Bloc I — Moteur de thèmes (J2)
- [ ] I1 — Type `ThemePreset` + table de presets
- [ ] I2 — Migration des `themeMode` existants (`dark`→`onyx`, `light`→`frost-light`, …)
- [ ] I3 — Aperçu en direct dans Appearance et l'onboarding
- [ ] I4 — Garde-fous : `prefers-reduced-transparency`, contraste AA, repli opaque
- [ ] I5 — **Liquid Glass** : frost (blur + saturate + liseré spéculaire)
- [ ] I6 — **Liquid Glass** : réfraction SVG (`feDisplacementMap`) — WebView2 = Chromium
- [ ] I7 — Onyx · Frost Light · Aurora · Nord · Paper · Neon Grid · Bento
- [ ] I8 — Presets utilisateur chargés depuis `themes/` du profil

## Bloc J — Parité Nusa (J4, J6)
- [ ] J1 — Paroles synchronisées LRCLIB (ligne courante, clic = seek, décalage ±, cache)
- [ ] J2 — Chronomètre + minuteur libre (en plus du Pomodoro)
- [ ] J3 — Indicateurs Caps Lock / Verr Num / langue
- [ ] J4 — Pilule minimale (temps seul)
- [ ] J5 — File shelf (glisser-déposer, persistance)
- [ ] J6 — Suivi d'hydratation + rappels
- [ ] J7 — To-do du jour avec échéances et rappels

## Bloc K — Assistant « Is » (J3, J5)

### K0 — Signaux système ✅ (livré 2026-11-03)
- [x] K0a — Capteur Rust `signals.rs` : batterie, mémoire, disques, CPU, uptime → événement `system-signals` (30 s) + commande `get_system_signals`
- [x] K0b — Miroir TypeScript `useSystemSignals`
- [x] K0c — Moteur de règles pur `pickTip()` : priorité + délais de répétition par conseil
- [x] K0d — Hook `useAssistant` : réglages `islet-assistant-*`, cooldowns persistés, affichage 10 s
- [x] K0e — Rendu dans le notch (`AssistantTip`, largeur 290 px, déroulé auto en mode `peek`)
- [x] K0f — Onglet Settings « Is » : 4 catégories, 4 seuils, valeurs temps réel
- [x] K0g — `SETTINGS.md` + neutralisation du doublon avec la pastille « Low Battery » héritée
- [x] K0h — **Catalogue étendu (2026-11-04)** : 5 conseils de plus, **13 au total** (+ 2 messages enrichis)
  - batterie : temps restant dans le message de charge faible (`— 40 min left`)
  - batterie : conseil « environ 1 h 40 d'autonomie » quand la jauge rassure mais l'horloge non
  - disque : palier **critique** (moins de 2 Go libres ou 97 % utilisé) distinct de l'avertissement
  - disque : affichage en Mo sous 10 Go (`350 MB left`) au lieu d'un `0 GB` trompeur
  - mémoire : palier **critique** à 95 % (sauvegarde ton travail)
  - session : rappel de **redémarrage** après 5 jours d'uptime
  - session : conseil **tard dans la nuit** (00:00–04:00, une fois par nuit)
- [x] K0i — 29 tests de la fonction pure `pickTip()` (esbuild + node, hors dépôt) : priorités, seuils, interrupteurs, cooldowns
- [ ] K0j — `cargo check` + build NSIS sur la machine Windows (pas de cargo dans le sandbox)

### K0 — Signal d'attention ✅ (livré 2026-11-04)
- [x] K0k — **L'arrivée** : deux anneaux partent du mascotte + cadre coloré qui s'éteint (2,2 s)
- [x] K0l — **La présence** : lueur derrière le mascotte + le point de gravité bat toutes les 2,4 s
- [x] K0m — **Le marqueur** : le conseil se replie, le notch garde un contour coloré jusqu'au clic
- [x] K0n — Durée graduée par gravité : 10 s (info) / 12 s (avertissement) / 15 s (critique)
- [x] K0o — Le marqueur porte le texte du conseil en infobulle — on peut relire ce qu'on a manqué
- [x] K0p — Correctif : `TIP_CATEGORY` — les 5 conseils ajoutés n'étaient pas coupés avec leur catégorie
- [x] K0q — Tests sortis de `/tmp` → `scripts/assistant.test.ts`, `bun run test:assistant` (31 tests, 0 dépendance)
- [ ] K0r — Option « signal d'attention » désactivable, si le marqueur s'avère gênant à l'usage

### Personnage & contexte dev
- [ ] K1 — Sprite 5 états (idle, blink, listening, thinking, happy, sleeping, alert)
- [ ] K2 — Regard qui suit le curseur à proximité du notch
- [ ] K3 — Sommeil après inactivité / réveil à l'interaction
- [ ] K4 — Modèle d'état unique (`mood`, `signal`, `speech`) + watchers Rust
- [ ] K5 — Respect de `prefers-reduced-motion`
- [ ] K6 — **Git pulse** : branche, fichiers modifiés, ahead/behind
- [ ] K7 — **Port radar** : ports en écoute + kill
- [ ] K8 — **Build watcher** : commande enregistrée, ✅/❌ + durée
- [ ] K9 — **Focus guard** : DND + chrono + Is au repos
- [ ] K10 — Rappels de contexte (branche dirty, port occupé trop longtemps)

## Bloc L — IA optionnelle (J7)
- [ ] L1 — Fournisseur local (Ollama / llama.cpp sur localhost)
- [ ] L2 — Fournisseur BYO (endpoint OpenAI-compatible, clé dans le trousseau)
- [ ] L3 — Périmètre bridé (expliquer une erreur, résumer un diff)
- [ ] L4 — Opt-in strict + indicateur « Is pense en ligne »

## Bloc M — Outillage
- [x] M1 — Skills Vercel installées dans `.claude/skills/` (5 skills)
- [x] M2 — `skills-lock.json` généré (5 skills, hashes de contenu) → `npx skills experimental_install` restaure l'ensemble
- [x] M3 — **Build lent / à court de RAM (2026-11-04)** : `tauri dev` mourait sur `rustc-LLVM ERROR: out of memory`
  - `[profile.dev.package."*"] debug = false` — divise par ~2 le pic mémoire, Islet garde ses infos de debug
  - `image` sans les features par défaut → supprime `ravif`/`rav1e` (encodeur AV1) et `exr`/`tiff`
  - `scripts/dev.ps1` — imprime RAM / disque / toolchain, limite la parallélisation (`-Jobs`, `-Clean`)
  - README : section « If the Rust build runs out of memory »

## Bloc N — Langues FR / EN (J8)

> Cadré dans `ROADMAP.md` § 3.G. **À faire après J1 et J2**, sinon on traduit deux fois.

- [ ] N1 — Socle : `t()`, `src/i18n/fr.ts` + `en.ts`, `islet-language`, langue par défaut = celle de Windows
- [ ] N2 — Onglet **Général → Langue** (Français / English / Suivre le système)
- [ ] N3 — Catalogue d'Is : 13 conseils + `formatUptime` + `formatClock` (**priorité 1**, c'est le texte le plus lu)
- [ ] N4 — Réglages : 11 onglets (~250 chaînes)
- [ ] N5 — Notch, dock, composants, fenêtre À propos
- [ ] N6 — Dates et nombres via `Intl.DateTimeFormat` / `Intl.NumberFormat` avec la langue active
- [ ] N7 — Contrôle : chaque traduction vérifiée **dans le notch à 290 px**, pas seulement dans les réglages
