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

## Bloc H — Onboarding (J1) ✅ (livré 2026-11-04)
- [x] H1 — Détection premier lancement (`islet-onboarded`) avec migration douce côté Rust
  - `utils::migrate_onboarding_flag` : un `settings.json` non vide sans drapeau = utilisateur existant → marqué comme déjà accueilli. Une installation neuve n'a pas de fichier du tout → accueil affiché.
- [x] H2 — Mode `onboarding` dans la fenêtre Settings existante (pas de 6ᵉ point d'entrée Tauri)
  - Fenêtre agrandie à 720 × 620 le temps de l'accueil, restaurée à 620 × 480 × échelle ensuite
  - Ouverture différée de 1,2 s pour laisser le notch s'installer
- [x] H3 — Étape 1 : bienvenue + nom de l'assistant (défaut « Is », préréglages Is/Nova/Pico/Kai)
  - ⚠️ **Choix de langue retiré de l'étape** : il n'aurait rien fait (J8 pas encore livré). Il arrive avec l'i18n.
- [x] H4 — Étape 2 : 4 thèmes (Dark / Light / Custom + accent / Adaptive) avec aperçu **en direct** via `applyTheme`
- [x] H5 — Étape 3 : notch (Fixed / Smart / Peek) + dock on/off
- [x] H6 — Étape 4 : transparence données (ce qui reste local, météo, CalDAV) + opt-in mises à jour auto
- [x] H7 — Étape 5 : récapitulatif + écriture de `islet-onboarded`
- [x] H8 — « Passer » à chaque étape + entrée « Replay the Welcome » dans General
- [x] H9 — Nom réellement utilisé : champ dans Settings › Is, **et libellé de l'onglet latéral** qui suit
- [ ] H10 — Validation sur Windows : taille de fenêtre, lisibilité, comportement du zoom

## Bloc I — Moteur de thèmes (J2) ✅ livré 2026-11-04
- [x] I1 — Type `ThemePreset` + table de presets (`src/theme/presets.ts`)
- [x] I2 — Migration : `dark`→`onyx`, `light`→`frost-light`, valeur inconnue→`onyx`,
      `custom`/`adaptive` restent dynamiques. Aucun passage de migration nécessaire.
- [x] I3 — Galerie de swatches dans Apparence, appliquée **immédiatement** (pas
      d'aller-retour par l'événement `settings-changed`)
- [x] I4 — Garde-fous : `prefers-reduced-transparency`, `prefers-contrast`,
      `@supports not backdrop-filter`, et un test de contraste sur bureau noir **et** blanc
- [x] I5 — **Liquid Glass** : frost (`blur(34px) saturate(200%) brightness(1.08)`),
      liseré spéculaire, reflet fixe. Ancienne valeur de repli conservée partout.
- [x] I7 — Onyx · Liquid Glass · Frost Light · Aurora · Nord · Paper · Neon Grid · Bento
- [ ] I6 — Réfraction SVG (`feDisplacementMap`) : **non retenue**. `backdrop-filter: url()`
      n'est pas implémenté dans Chromium/WebView2 (seul un `filter:` sur un élément
      l'est), donc elle ne marchait pas sur la cible. Le liseré et le reflet donnent
      l'essentiel du rendu sans faux espoir.
- [ ] I8 — Presets utilisateur chargés depuis `themes/` du profil
- [ ] I9 — Contrôle visuel des huit presets sur Windows (le sandbox n'a pas de navigateur)

## Bloc J — Parité Nusa (J4, J6)

### J0 — Historique du presse-papier (P3-C9) ✅ livré 2026-11-05
- [x] J0a — `src/lib/clipboard.ts` : logique pure (plafond 60, épingles inévincables, recherche accents-insensible, aperçu, temps relatif, tailles) — **31 tests**
- [x] J0b — `scripts/clipboard.test.ts` + `npm run test:clipboard`, branché dans `npm run test`
- [x] J0c — `src-tauri/src/clipboard.rs` : sondage `GetClipboardSequenceNumber` (400 ms), `CF_UNICODETEXT`, opt-out `ExcludeClipboardContentFromMonitorProcessing` + `CanIncludeInClipboardHistory`, id FNV-1a côté Rust
- [x] J0d — 9 commandes Tauri (`get_state`, `remember_target`, `copy`, `paste`, `toggle_pin`, `remove`, `clear`, `set_recording`, `is_recording`) + événements `clipboard-changed` / `clipboard-recording`
- [x] J0e — `useClipboard` + `NotchClipboard` : recherche auto-focus, sections épinglés/récents, `Entrée` copie le premier résultat, `Échap` ferme, flash « Copié » annoncé en `aria-live`
- [x] J0f — Câblage notch : mode `clipboard` (molette), largeur 340 / hauteur 384, rayon bas 28, molette libre dans la liste
- [x] J0g — Réglages onglet Notch (`islet-clipboard-enabled`, `islet-clipboard-paste`) + section `SETTINGS.md`
- [ ] J0h — **À vérifier sur Windows** : compilation Rust (pas de toolchain dans le sandbox) et collage réel dans la fenêtre précédente

- [x] J1 — **Paroles synchronisées LRCLIB** ✅ livré 2026-11-05
  - [x] J1a — `src/lib/lyrics.ts` : parseur LRC (`mm:ss.xx`, `hh:mm:ss`, `mm:ss:xx`, étiquettes, `[offset:]`, doublons), `lineAt` par recherche binaire, `seekTarget`, `lineProgress`, `parseLrclib`, `formatOffset` — **60 tests**
  - [x] J1b — `src-tauri/src/lyrics.rs` : `lyrics_fetch` (LRCLIB, 8 s de délai), cache disque `lyrics/*.json` plafonné à 400 fichiers, refus si `islet-lyrics-enabled` n'est pas `"true"`, `lyrics_clear_cache`, `lyrics_cache_count`
  - [x] J1c — `useLyrics` : une requête par morceau, **seulement quand le panneau est ouvert**, position extrapolée à 250 ms, décalage persisté
  - [x] J1d — `NotchLyrics` : mode de notch dédié (340 × 320, rayon bas 28), ligne courante en gras + hairline de progression, clic = seek, `Échap` ferme, squelettes de chargement, états vide / erreur / instrumental
  - [x] J1e — Réglages : `islet-lyrics-enabled` (off par défaut) + note de confidentialité + cache effaçable dans l'onglet Notch
  - [ ] J1f — **À vérifier sur Windows** : compilation Rust et rendu réel sur une piste dont les paroles dérivent
- [x] J2 — **Chronomètre + minuteur libre** ✅ livré 2026-11-05
  - [x] J2a — `src/lib/clock.ts` : cible absolue, pause/reprise au millième, tours (temps intermédiaires, écarts, meilleur/pire), relecture validée du stockage — **47 tests**
  - [x] J2b — `useCountdown` : horloge à 250 ms pour redessiner, `localStorage`, décompte qui reste juste après une veille ou un redémarrage
  - [x] J2c — `useStopwatch` : même ancrage, chronomètre relu au montage, tours persistés, `clearLaps`
  - [x] J2d — `NotchClock` : jauge de progression, heure de fin, état « temps écoulé », raccourcis 1/3/5/10/25/50, liste complète des tours avec meilleur et pire, effacement des tours
  - [x] J2e — Notch compact : un minuteur en pause reste affiché au lieu de rendre la place à l'horloge
  - [ ] J2f — **À vérifier sur Windows** : lancer un minuteur, mettre le PC en veille deux minutes, vérifier que le décompte a bien avancé de deux minutes au réveil
- [x] J3 — Indicateurs Caps Lock / Verr Num / langue → voir J8
- [x] J5 — **File shelf** ✅ livré 2026-11-05
  - [x] J5a — `src/lib/shelf.ts` : nature par extension, unités SI traduites, dédoublonnage insensible à la casse, plafond 24, ordre (manquants en bas), chemins abrégés — **41 tests**
  - [x] J5b — `src-tauri/src/shelf.rs` : `shelf_list` / `_add` / `_remove` / `_clear`, persistance `shelf.json`, existence et taille revérifiées à chaque lecture
  - [x] J5c — `tauri.conf.json` : `dragDropEnabled: true` sur la fenêtre principale (indispensable pour recevoir de vrais chemins)
  - [x] J5d — `useShelf` + `NotchShelf` : écoute des dépôts, mode de notch 340 × 300, ouverture automatique après un dépôt, ouverture/révélation via `plugin-opener`, compteur de fichiers manquants
  - [ ] J5e — **Glisser-vers-l'extérieur** : `tauri_plugin_drag::init()` + `startDrag`, à faire et à tester sur Windows
  - [ ] J5f — **À vérifier sur Windows** : le notch ne doit pas devenir une cible de dépôt sur tout l'écran
- [ ] J6 — Suivi d'hydratation + rappels — **écarté à la demande de l'utilisateur le 2026-11-05**
- [x] J7 — **To-do du jour** ✅ livré 2026-11-05
  - [x] J7a — `src/lib/todo.ts` : saisie d'une heure (« 9 », « 9h30 », « 14:30 », « demain 9h »), retard, sections, prochaine échéance, rappels, report au lendemain, relecture tolérante des tâches — **40 tests**
  - [x] J7b — `src-tauri/src/todo.rs` : `todo_list` / `_add` / `_toggle` / `_set_due` / `_remove` / `_clear_done`, fichier `todos.json`, plafond 200 qui oublie d'abord les tâches faites les plus anciennes
  - [x] J7c — `useTodos` : backend autoritaire après chaque commande, rien n'est lu ni écrit quand le réglage est coupé
  - [x] J7d — `NotchTodos` : ajout en deux champs, sections retard / aujourd'hui / à venir / terminées, coche, report, suppression, état vide explicatif
  - [x] J7e — Rappel : une échéance atteinte ouvre le panneau une fois (fenêtre d'une heure, pas de son) et ne se répète jamais dans la session
  - [ ] J7f — **À vérifier sur Windows** : compiler `todo.rs` (pas de toolchain ici), créer une tâche à une heure proche et voir le notch s'ouvrir tout seul
- [x] J8 — **Indicateurs clavier** ✅ livré 2026-11-05
  - [x] J8a — `src/lib/keyboard.ts` : table des langues Windows (sous-langue retirée, code court, langue inconnue laissée de côté), lecture défensive de l'événement, détection de ce qui a changé, choix des pastilles — **19 tests**
  - [x] J8b — `src-tauri/src/keyboard_indicators.rs` : lecture des trois touches depuis le fil du crochet, garde anti-répétition (400 ms), sondage de la disposition au premier plan toutes les 250 ms, aucun envoi quand le réglage est coupé
  - [x] J8c — Crochet clavier : Verr Maj / Verr Num / Défil remarqués sans jamais bloquer la touche
  - [x] J8d — `Overlay.tsx` : surcouche au bas de l'écran, 1,5 s, seule la pastille qui a changé est mise en avant
  - [x] J8e — Réglage `islet-keyboard-indicators-enabled` dans l'onglet Surcouches
  - [ ] J8f — **À vérifier sur Windows** : compiler, appuyer sur Verr Maj dans une autre application et voir la pastille ; faire Alt+Maj et vérifier que la langue change bien
- [x] J9 — **Pilule minimale** ✅ livré 2026-11-05
  - [x] J9a — `src/lib/pill.ts` : quand le réglage s'applique (au repos seulement), largeur et modules du notch replié — **21 tests**
  - [x] J9b — `scripts/pill.test.ts` + `npm run test:pill`, branché dans `npm run test`
  - [x] J9c — `App.tsx` : largeur du notch replié ramenée à 96 px, visualiseur et pochette retirés tant qu'on ne survole pas, calcul sorti de `getDynamicWidth`
  - [x] J9d — Réglage `islet-notch-pill-minimal` (éteint par défaut) dans l'onglet Notch, libellé et description bilingues
  - [ ] J9e — **À vérifier sur Windows** : activer le réglage, lancer un morceau et vérifier que le notch replié ne montre que l'heure, puis le survoler et retrouver pochette et widgets

## Bloc L — Signaux du développeur (J5)

### L0 — Git pulse, port radar et rappels de contexte ✅ livré 2026-11-05
- [x] L0a — `src/lib/dev.ts` : interpretation de `netstat` (IPv4, IPv6, boucle locale, en-têtes traduits), suivi de l'âge des ports, lecture des trois sorties de git, remarques de contexte, format d'âge — **34 tests**
- [x] L0b — `scripts/dev.test.ts` + `npm run test:dev`, branché dans `npm run test`
- [x] L0c — `src-tauri/src/dev.rs` : `dev_git_status` (trois commandes en lecture seule, `--no-optional-locks`, refus si le dossier n'est pas un dépôt) et `dev_listening_ports` (netstat borné, sorties brutes)
- [x] L0d — `useDev` : ne lit rien quand le réglage est coupé ni quand le panneau est fermé ; ports toutes les 15 s, git toutes les 20 s
- [x] L0e — `NotchDev` : branche, pastilles sale / avance / retard, remarques, liste des ports avec propriétaire, âge, exposition réseau et bouton de libération ; états vides et erreurs parlantes
- [x] L0f — Câblage notch : mode `dev` (molette), 350 × 380, rayon bas 28
- [x] L0g — Réglages onglet Notch : `islet-dev-enabled` et `islet-dev-folder` (sélecteur de dossier natif, retrait, lecture seule)
- [ ] L0h — **À vérifier sur Windows** : compiler `dev.rs` (pas de toolchain ici), choisir un dépôt, vérifier branche et retard, puis libérer un port de test
- [ ] L1 — **Vérifier sur Windows** que `netstat` reste en anglais sur un système français (l'interprétation s'ancre sur `LISTENING`)
- [ ] L2 — **Build watcher** (P3-B10) : commande enregistrée, exécutée à la demande, ✅/❌ et durée
- [ ] L3 — **Focus guard** (P3-B11) : mode focus = Ne pas déranger + chrono + Is au repos
- [ ] L4 — **Rappels de contexte en conseils d'Is** (P3-B12, suite) : brancher `devNotes` sur `pickTip` avec délais de répétition

## Bloc K — Assistant « Is » (J3, J5)

### K1 — Le personnage (J3) ✅ livré 2026-11-05
- [x] K1a — `src/lib/character.ts` : réducteur d'humeur, cadres de dessin, regard en direction unitaire, clignement, sommeil — **39 tests**
- [x] K1b — `scripts/character.test.ts` + `npm run test:character`, branché dans `npm run test`
- [x] K1c — `src/components/IsSprite.tsx` + `IsSprite.css` : sprite SVG (mascotte : dôme, palmier, hémisphère, yeux à reflet, bouche en w), souffle, clignement, regard, halo coloré, mouvement réduit
- [x] K1d — `AssistantTip` : Is prend le visage du conseil (sourire pour une remarque, yeux écarquillés pour une alerte) et suit le curseur du notch
- [x] K1e — Onglet Is : bloc « Le personnage » avec aperçu vivant, six états à essayer, endormissement après 45 s d'immobilité
- [x] K1f — Accueil : la mascotte remplace le logo sur l'étape du nom, se penche quand on tape
- [ ] K1g — **À vérifier sur Windows** : l'aperçu de l'onglet Is doit cligner, suivre la souris et s'endormir ; vérifier aussi le rendu réduit (mouvement désactivé dans Windows)

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

## Bloc N — Langues FR / EN (J8) ✅ livré 2026-11-04

### Socle ✅
- [x] N1 — Moteur `src/i18n/` : `t()`, `translate()`, `useT()`, `useLanguage()`, `setLanguage()`
  - **Aucune dépendance** : deux dictionnaires plats + interpolation `{{}}` + pluriels `{one, other}`
  - L'anglais définit les clés ; `fr.ts` est typé dessus → clé oubliée = erreur de compilation
  - `initI18n()` branché dans les 5 fenêtres (notch, réglages, dock, surcouche, agenda)
  - Réactif : `useSyncExternalStore` + écoute de `settings-changed` / `settings-external-changed`
- [x] N2 — Sélecteur dans **Général → Langue** (Suivre Windows / Français / English), appliqué sans redémarrage
- [x] N3 — **Catalogue d'Is** : 14 conseils + `formatUptime` + `formatClock`
  - `pickTip` ne construit plus de phrase : il renvoie une **clé + des paramètres**
  - 40 tests, dont la longueur de chaque conseil **dans les deux langues** (≤ 46 car.)
- [x] N4 — Interface du notch (Update Available, Low Battery, Charging, On Battery)
- [x] N5 — Onglet **Is** (nom, catégories, seuils, valeurs temps réel) + onglet **Général**
- [x] N6 — **Les 5 écrans d'accueil** (welcome, apparence, notch/dock, confidentialité, fin)
- [x] N7 — Sidebar et titres de la fenêtre Réglages
- [x] N8 — `formatDate()` / `formatNumber()` (via `Intl`) disponibles pour la suite
- [x] N9 — Règle permanente inscrite dans `AGENTS.md` : toute chaîne visible passe par `t()`

### Interface complète ✅
- [x] N10 — Onglets **Apparence** et **Notch** (~60 chaînes, dont les guides fournisseurs CalDAV)
- [x] N11 — Onglets **Dock**, **Surcouches**, **Processus**, **À propos** (~50 chaînes)
- [x] N12 — Fenêtre Dock (menu contextuel, recherche, info-bulles) — 13 clés
- [x] N13 — Agenda, notch-agenda, minuteur/chronomètre, sync CalDAV — 60 clés
- [x] N14 — Notch : centre de contrôle, volume, luminosité, contrôles de fenêtre
- [x] N15 — Widgets de barre d'état (`StatusWidgetConfig`) : libellés passés en clés

### Reste (hors interface)
- [ ] N16 — Messages générés côté Rust (mises à jour, erreurs de diagnostic) : décider
      s'ils remontent en clés résolues côté frontend ou restent en anglais
- [ ] N17 — Contrôle visuel : chaque écran relu **dans l'application**, pas seulement dans le dictionnaire
