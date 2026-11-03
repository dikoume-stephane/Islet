# 🧠 MEMORY — Contexte durable du projet Islet

> Ce fichier est la **mémoire long terme** du travail : à relire en début de chaque session
> et à tenir à jour à chaque décision ou constat important. Dernière maj : 2026-11-03.

---

## 1. Identités du projet

| | Avant (upstream) | Après (ce dépôt) |
|---|---|---|
| Nom produit | Nectar | **Islet** |
| Dépôt | `kua8/Nectar` (github.com) | `dikoume-stephane/Islet` |
| Identifiant Tauri | `com.kua8.nectar` (+ `.installer`) | ✅ **`com.2DS.islet`** (+ `.installer`) — appliqué 2026-10-29 |
| Version au moment du fork | 1.4.1 | inchangée (Phase 1) |
| Licence | GPL-3.0-only (fichier `LICENSE` — **INTOUCHABLE**) | identique |
| Branche de travail Arena | — | `arena/6f8fc574-islet` (base : `main` `2d0c2b5`, après merge PR #1 et #2) |

## 2. Stack et structure

- **Frontend :** React 19 + TypeScript + Vite 7 + Tailwind 4, gestionnaire **bun**, entrées multiples : `index`, `settings`, `calendar`, `overlay`, `dock` (+ fenêtres Tauri séparées dans `tauri.conf.json`).
- **Backend :** Rust dans `src-tauri/` — **Windows uniquement** (crate `windows 0.61` avec ~35 features Win32, `webview2-com`, `wmi`, NSIS). ⛔ Pas de `cargo check` possible dans un sandbox Linux.
- **Second projet :** `installer-app/` = installateur « wrapper » Tauri autonome (`Nectar Setup`, identifiant `com.kua8.nectar.installer`), avec son propre `src-tauri`, ses propres lockfiles et son script `build-payload.ps1`.
- **Scripts :** `scripts/bump-version.mjs` (versions), `scripts/release.ps1` (build + release GitHub : noms `nectar.exe`, `Nectar-Setup-*`, repo `kua8/Nectar`).

## 3. Carte des « points chauds » du rebranding

> **ÉTAT 2026-10-29 (soir) : le mapping ci-dessous a été ENTIÈREMENT APPLIQUÉ.** Cette section est conservée comme référence historique (utile pour déboguer la Phase 2 ou comprendre un comportement hérité). Ancien → nouveau : tout `nectar/Nectar/NECTAR` → `islet/Islet/ISLET` ; `com.kua8.nectar` → `com.2DS.islet` ; `Software\kua8\nectar` → `Software\2DS\islet` ; Publisher `kua8` → `2DS`.

### Chaîne d'identité (à renommer partout, ensemble)
- `com.kua8.nectar` → dossier AppData, `tauri.conf.json` ×2, `diagnostics.rs`, `native_uninstall.rs`
- Registre : `Software\kua8\nectar` (`installer-app/src-tauri/src/registry.rs`) ; `Software\Microsoft\Windows\CurrentVersion\Uninstall\Nectar` (`registry.rs` + `src-tauri/src/uninstall_registry.rs`) ; raccourcis `Nectar.lnk` ; `DisplayName "Nectar"`
- Synchronisation processus (`main.rs`) : mutex `NectarSingleInstance`, event `NectarOpenSettings`, env `NECTAR_RESTARTING`
- Tray : tooltip « Nectar », menus « Quit/Restart Nectar »
- Fonctions Rust : `quit_nectar`, `restart_nectar`, `uninstall_nectar` (+ IDs de commandes Tauri appelés par `invoke()` côté frontend — **renommer des deux côtés ensemble**)

### Données utilisateur (⚠️ risque de rupture)
- **localStorage** : 188 clés `nectar-*` (`useSettings.ts`), lues aussi côté Rust (`services.rs`, `utils.rs::get_setting_str`) → renommage = reset des réglages des utilisateurs existants, sauf migration (code = hors Phase 1 ?). → **DÉC-3**
- CSS : préfixes `nectar*` dans `App.css`, `Settings.css`, `theme.ts`, `Dock.css`, `Overlay.css`, `Calendar.css` (~470 occurrences CSS/JSX)

### Assets graphiques
- Référencés par Tauri : `src-tauri/icons/` (17 PNG + `icon.ico` + `icon.icns` + `android/` + `ios/`), `installer-app/src-tauri/icons/` (3 PNG + ico)
- NSIS : `installer/assets/header.bmp` **150×57**, `sidebar.bmp` **164×314** (formats/ dimensions imposés)
- Publlic : `public/nectar.svg` + `public/nectar.png` (utilisé par `AboutTab.tsx` : `/nectar.png`), `installer-app/public/nectar.svg`
- Docs : `docs/logo.png` (512², logo Nectar), `docs/wordmark-{dark,light}.png` (474×127), `docs/screenshots/` (à refaire en Phase 2)
- **Master OFFICIEL : `docs/islet-logo.png`** (2000², alpha natif) — reçu via `main` (commit `14e3d80`) ; toute régénération d'icônes part de lui (`convert docs/islet-logo.png -resize 1024x1024` → `npx @tauri-apps/cli@2 icon`).
- **Icône officielle = tuile** : `docs/brand/islet-icon-tile.png` (1024², fond `#111318` arrondi 22,37 %, mascotte blanche à 64,5 %). Toute régénération d'icônes part de CE fichier, pas du master transparent — la mascotte blanche sur transparent est invisible en thème clair. Variante fond clair : `islet-icon-tile-light.png`.
- Wordmarks officiels : `docs/islet-wordmark-{dark,light}.png` (glyphes foncés/clairs respectivement). Sources design conservées : `new-logo*.jpg` (fond noir, historique), `yesjj.png` (illustration pastel 2048²), `yessjh.png` (variante fantôme 480²) — rôle à confirmer en Phase 2.

## 4. Contraintes & règles inviolables

1. `LICENSE` : ne **jamais** modifier (GPL-3.0, copyright FSF/auteurs).
2. README : ajouter section **Credits / Legal** — « Islet est un fork du projet open-source Nectar, modifié sous les termes de sa licence d'origine » + lien `kua8/Nectar`.
3. En-têtes de copyright existants conservés ; la ligne **« Made with ❤️ by kua8 »** (`AboutTab.tsx`) est de l'attribution → la conserver (on peut **ajouter** la mention du mainteneur du fork à côté — DÉC-4).
4. `AGENTS.md` **ne se rebrande pas** (document d'instructions historique).
5. Lockfiles (`bun.lock`, `package-lock.json` ×2, `Cargo.lock` ×2) : **régénérés**, jamais édités à la main.
6. Phase 1 = rebranding **purement nominatif/visuel** : zéro changement fonctionnel, zéro bump de version.
7. Clés privées : jamais dans le dépôt (`.gitignore` couvre déjà `*.key`, `*.key.pub`).
8. Branche de travail imposée : celle de la session Arena en cours (`arena/6f8fc574-islet`) — ne pas créer/pousser ailleurs.

## 5. Décisions

| # | Question | Statut | Réponse |
|---|---|---|---|
| DÉC-1 | Logo officiel + source transparente | ✅ tranché + **fourni** (via `main`, 2026-10-29) | Master officiel = **`docs/islet-logo.png`** (2000², transparence native) — tous les assets dérivés régénérés depuis ce fichier. Le master généré par l'agent a été remplacé |
| DÉC-2 | Wordmarks Islet (dark/light) | ✅ **fournis** (via `main`, 2026-10-29) | `docs/islet-wordmark-dark.png` (glyphes foncés → fonds clairs) / `islet-wordmark-light.png` (glyphes clairs → fonds sombres). ⚠️ mapping README par **couleur de glyphes** : mode sombre ← `*-light.png` |
| DÉC-3 | Identifiant + politique de données | ✅ tranché 2026-10-29 | Identifiant = **`com.2DS.islet`** (+ `com.2DS.islet.installer`). Données = **reset assumé** → renommage pur des clés/registre/AppData, aucun code de migration |
| DÉC-4 | Attribution mainteneur du fork | ✅ tranché 2026-10-29 | **« dikoume-stephane (2DS) »** — ajouté à côté de l'attribution kua8 (conservée) |
| DÉC-5 | Endpoint updater + nouvelle clé de signature | ✅ **résolue 2026-11-02** | « Plus tard » → endpoint repointé vers `dikoume-stephane/Islet` (404 = pas de mise à jour = **sécurisé**), pubkey kua8 laissée en placeholder. ⚠️ **Avant toute release Islet** : nouvelle paire de clés (`tauri signer generate`) + maj pubkey |

### Décisions dérivées (2026-10-29, révocables par l'utilisateur)
- **D-DRV-1** : vendeur registre `Software\kua8\nectar` → **`Software\2DS\islet`** (cohérent avec `com.2DS.islet` et l'attribution 2DS)
- **D-DRV-2** : `productName` Tauri = **`Islet`** (casquette) → artefacts NSIS `Islet_1.4.1_x64-setup.exe` ; binaire Cargo = `islet.exe` (minuscules)
- **D-DRV-3** : identifiant `com.2DS.islet` contient des majuscules — non conventionnel mais chaîne valide ; si le build Tauri le refuse, replier sur `com.2ds.islet`
- **D-DRV-4** : lockfiles `bun.lock` / `Cargo.lock` — `bun`/`cargo` absents du sandbox → retouche chirurgicale documentée (uniquement le champ `name`), désormais **régénérés sur Windows** par l'utilisateur (`bun install` ✅, `cargo check` ✅ 30/10)
- **DÉC-5 (résolue 2026-11-02)** : paire de signature updater générée par le mainteneur. Clé publique ID `BA3FEE8CCD2277FC` intégrée dans `plugins.updater.pubkey`. Clé privée : `~/.tauri/islet.key` — **hors dépôt, à sauvegarder**. Ne jamais la committer ni la partager. Build de release : `TAURI_SIGNING_PRIVATE_KEY` (+ `_PASSWORD` si protégée) ; build local : `--no-sign`.
- **D-DRV-5** : build Windows = `bun run tauri build --bundles nsis --no-sign`. `--bundles nsis` car `targets: "all"` ferait télécharger WiX pour un MSI que le projet ne livre jamais ; `--no-sign` car `createUpdaterArtifacts: true` + pubkey exigent `TAURI_SIGNING_PRIVATE_KEY` (DÉC-5 non tranchée). Ne PAS modifier `tauri.conf.json` pour contourner.
- **D-DRV-6** : `docs/logo.png` = contenu remplacé par le logo Islet (nom de fichier conservé, stabilité du README)

## 6. Rappels outillage sandbox

- Sandbox = Linux → validation possible : `bun install`, `bun run build` (tsc + vite). ImageMagick disponible (`identify`, conversion BMP possible).
- Validation impossible ici : `cargo check`, build NSIS, run de l'app, captures d'écran → machine Windows du mainteneur (`ELEMENTS_MANQUANTS.md` #4).
- **Fait sur Windows (30/10)** : `cargo check` ✅ 5m10s ; `islet.exe` release ✅ 12m29s ; bundling NSIS restant.
- **Piège récurrent** : `.git` du sandbox est parfois restauré en arrière en début de tour (HEAD revient à `c2c072c`) alors que le distant est correct → toujours `git fetch` + `git reset --hard origin/<branche de session>` AVANT d'éditer, sinon les fichiers ajoutés par le commit disparaissent de l'arbre.
- Fichiers de pilotage racine : `ROADMAP.md` (plan), `todo.md` (cases), `progress.md` (tableau de bord), `journal.md` (log), `ELEMENTS_MANQUANTS.md` (attentes utilisateur).

---

## 7. Phase 3 — cap fonctionnel (cadré le 2026-11-03)

### Décisions

| # | Sujet | Décision |
|---|---|---|
| DÉC-6 | Onboarding | Vit **dans la fenêtre Settings existante**, mode `onboarding`. Pas de 6ᵉ fenêtre Tauri. Déclenché par `islet-onboarded` absent. Toujours « Passer » possible |
| DÉC-7 | Assistant « Is » | Nom par défaut **`Is`**, renommable (`assistantName`). S'appuie **d'abord sur des signaux locaux** (git, ports, build, focus) — **aucune IA au départ** |
| DÉC-8 | IA | **Opt-in, désactivée par défaut**. Deux fournisseurs : Ollama/llama.cpp en local, ou endpoint OpenAI-compatible avec clé de l'utilisateur. Périmètre bridé : expliquer une erreur, résumer un diff. **Jamais d'écriture dans le dépôt** |
| DÉC-9 | Thèmes | Refonte en **presets nommés** (`ThemePreset`) + réglages libres, avec migration des `themeMode` existants. 8 presets proposés, dont **Liquid Glass** |
| DÉC-10 | Liquid Glass | Deux niveaux : *frost* (blur + saturate + liseré, partout) et *réfraction* SVG. **WebView2 = Chromium sur Windows → la réfraction fonctionne réellement** dans l'app, contrairement au web classique |
| DÉC-11 | Ordre de livraison | **J1 accueil → J2 thèmes → J4 parité → J3 personnage → J5 dev → J6 confort → J7 IA** — ⚠️ **amendé 2026-11-03** : l'utilisateur a demandé Is (signaux PC) d'abord ; J3 est donc attaqué avant J1 |

### 3.B — Is : lecture des signaux système (livré 2026-11-03)

**Demande utilisateur** : Is lit les signaux du PC et prévient — batterie, temps de mise en marche, rappel de charge, espace disque, « et bien d'autres petits tips utiles ».

| Élément | Fichier | Rôle |
|---|---|---|
| Capteur | `src-tauri/src/signals.rs` | Échantillonne batterie / mémoire / disques / CPU / uptime, événement `system-signals` toutes les 30 s + commande `get_system_signals` |
| Miroir TS | `src/hooks/useSystemSignals.ts` | Types + hook (`invoke` immédiat puis `listen`) |
| Règles | `src/lib/assistant.ts` | `pickTip()` pure : un seul conseil, priorité + délais de répétition |
| Orchestration | `src/hooks/useAssistant.ts` | Réglages `islet-assistant-*`, cooldowns persistés, affichage 10 s |
| Vue | `src/components/AssistantTip.tsx` + `App.css` | Avatar Is, pastille de gravité, croix de fermeture |
| Réglages | `src/settings/AssistantTab.tsx` | Onglet « Is » : interrupteurs, seuils, valeurs temps réel |

**Règles livrées** — ordre strict : batterie critique (≤ 10 %) → batterie faible (≤ seuil) → batterie pleine → rappel de charge (≥ seuil) → disque (occupation ≥ 100 − marge, disques fixes seulement) → mémoire ≥ 90 % → CPU ≥ 90 % → session ≥ N heures.
**Cooldowns** : critique 10 min · faible 30 min · plein/charge 2 h · disque 12 h · mémoire 45 min · CPU 30 min · session 8 h.
**Doublon traité** : `showLowBatteryPulse` (clé héritée `islet-low-battery-threshold`, défaut 20) est désactivé tant qu'Is gère la batterie ; il revient si Is est coupé.

**Contraintes techniques vérifiées**
- Le crate `windows` **0.61** ne fournit pas `DRIVE_FIXED` / `DRIVE_REMOVABLE` → constantes locales (`3` et `2`).
- `GetSystemPowerStatus`, `GetSystemTimes`, `GlobalMemoryStatusEx`, `GetDiskFreeSpaceExW` renvoient tous `Result<()>` dans 0.61.
- `settings-changed` est bien émis par `save_setting` ; il sert à propager un changement fait dans la fenêtre Settings vers le notch. Les webviews ne partageant pas toujours `localStorage`, le hook réécrit la valeur reçue.
- **Pas de `cargo` dans le sandbox** : la compilation reste à faire côté Windows.

### Ce qu'Islet fait déjà (ne pas re-livrer)

Musique (SMTC), command center (Wi-Fi/BT/DND/volume/luminosité), statut (batterie/météo), calendrier, **Pomodoro**, gestion des processus, overlays, multi-moniteurs, veille plein écran, tray, autostart, updater.

### Écart réel avec Nusa (à ajouter)

Paroles synchronisées (LRCLIB) · file shelf · suivi d'hydratation · to-do du jour · chronomètre/minuteur libre · indicateurs Caps Lock/langue · pilule minimale.

### Skills installées

`.claude/skills/` (versionné, 644 Ko) — `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`, `writing-guidelines`.
Installation : `npx skills add vercel-labs/agent-skills --skill <nom> -a claude-code -y --copy`.
⚠️ Le registre `skills.sh` est **injoignable depuis le sandbox** (DNS restreint) → passer par GitHub. ⚠️ Les noms réels sont préfixés `vercel-`.
