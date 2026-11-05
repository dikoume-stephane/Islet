# 🧠 MEMORY — Contexte durable du projet Islet

> Ce fichier est la **mémoire long terme** du travail : à relire en début de chaque session
> et à tenir à jour à chaque décision ou constat important. Dernière maj : 2026-11-05.

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

### Is — catalogue de conseils (livré 2026-11-04)

13 règles dans `src/lib/assistant.ts` (`pickTip`, fonction pure) : batterie critique/faible/autonomie/pleine, rappel de charge, disque critique/qui se remplit, mémoire critique/haute, CPU, redémarrage (5 j), session longue, tard dans la nuit (00–04 h).
Priorité : sécurité machine → intégrité des données → confort → hygiène. **Un seul conseil à la fois**, cooldown par type (10 min → 12 h).
Réglages : 4 catégories (`islet-assistant-{battery,storage,performance,session}`) + 4 seuils. Aucun nouveau capteur requis : `seconds_left` et `disks[].removable` étaient déjà échantillonnés.
Tests : 29 assertions exécutées via `npx esbuild src/lib/assistant.ts --bundle ... && node` — **aucun framework de test dans le projet**.

### Build — pièges connus (2026-11-04)

- `tauri dev` = profil **dev** = `debug = true` → debuginfo complète sur ~600 crates. C'est le plus gros consommateur de RAM, bien avant l'optimisation.
- Un `rustc` tué par manque de mémoire laisse des artefacts **tronqués**. Les erreurs qui suivent (`only metadata stub found for rlib dependency core`, `can't find crate for X`) sont une **cascade**, pas la cause : il faut lire la dernière ligne (`rustc-LLVM ERROR: out of memory`).
- Cargo compile en pipeline : un crate ne produit d'abord qu'un `.rmeta`, le `.rlib` complet arrive après. Si le build meurt entre les deux, tout ce qui en dépend échoue.
- `[profile.dev.package."*"] debug = false` est autorisé (seuls `panic`, `lto`, `rpath` sont interdits en override).
- `image` avec ses features par défaut tire `ravif` → `rav1e` (encodeur AV1 complet) : plusieurs minutes de compilation et beaucoup de RAM pour un format que l'app n'utilise pas.

### Is — signal d'attention (livré 2026-11-04)

Trois couches, dans `AssistantTip.tsx` + `App.css` (~120 lignes de CSS) et `useAssistant.ts` :
1. **Arrivée** — deux anneaux `assistant-tip-bloom` partent du mascotte, le cadre fait un éclat de 2,2 s.
2. **Présence** — lueur radiale derrière le mascotte, `assistant-tip-ping` sur le point de gravité.
3. **Marqueur** — à l'expiration, le conseil passe de `tip` à `unread` au lieu de disparaître. Classe `is-signalling` sur `.islet` = `box-shadow` statique dans la couleur de gravité, + `title` = texte du conseil. Clic sur le notch = acquittement.

Durées : `VISIBLE_MS` = 10 s (info) / 12 s (warn) / 15 s (critical).
Tout est désactivé sous `prefers-reduced-motion` **sauf** le marqueur (statique par nature) et un cadre fixe à 50 %.

⚠️ Le marqueur est **statique volontairement** : un élément qui pulse en permanence en haut de l'écran est pire que pas de rappel du tout.

### Onboarding (livré 2026-11-04)

`src/settings/Onboarding.tsx` — 5 étapes rendues **dans la fenêtre Settings existante** (pas un 6ᵉ point d'entrée Tauri) : bienvenue + nom, apparence (4 thèmes, aperçu live via `applyTheme`), notch/dock, confidentialité, récapitulatif.

- **Détection** : `utils::migrate_onboarding_flag` — un `settings.json` non vide sans `islet-onboarded` = utilisateur existant, marqué automatiquement. Installation neuve = pas de fichier = accueil affiché.
- **Taille** : 720 × 620 pendant l'accueil, 620 × 480 × échelle ensuite (`resize_settings_window`).
- **Ouverture** : différée de 1,2 s pour que le notch soit dessiné avant la fenêtre.
- **Sauvegarde immédiate** : chaque choix s'écrit au clic — un crash au milieu conserve l'acquis.
- Le **nom** est un vrai réglage : champ dans Settings › Is et libellé de l'onglet latéral.
- « Replay the Welcome » dans Settings › General (ne réinitialise rien).

### Langues — livré intégralement 2026-11-04 (J8 ✅)

`src/i18n/` : `en.ts` (source des clés), `fr.ts` (typé dessus), `index.ts` (moteur).
**Aucune dépendance** : deux dictionnaires plats, interpolation `{{}}`, pluriels `{one, other}`.

- **L'anglais définit le jeu de clés.** `fr.ts` est `Record<keyof typeof en, …>` : une clé oubliée en français est une **erreur de compilation**, pas un oubli de revue. C'est le mécanisme central — ne pas le contourner.
- `t()` global (hors React) · `useT()` / `useLanguage()` dans les composants (via `useSyncExternalStore`) · `translate(lang, …)` pour les tests.
- `initI18n()` dans les **5 fenêtres** (App, Settings, Dock, Overlay, Calendar). Réactif via `settings-changed` + `settings-external-changed`.
- Réglage `islet-language` = `system` | `fr` | `en`, défaut `system` → `navigator.language`.
- `formatDate()` / `formatNumber()` via `Intl`, jamais un format écrit à la main.

**Règle permanente inscrite dans `AGENTS.md`** : toute chaîne visible passe par `t()`, dans les deux dictionnaires.
**Pièges connus**
- Le notch fait **290 px** : au-delà de ~46 caractères la ligne se tronque. Deux traductions ont déjà été raccourcies. Le test le vérifie.
- Ne jamais concaténer deux clés pour former une phrase (ordre des mots).
- « notch » n'est pas traduit : c'est le nom de la fonctionnalité dans le produit.
- Les fichiers `.ts` doivent garder des imports **sans extension** (résolution bundler) ; pour les tests Node, passer par un bundle esbuild.

**État final : 460 clés, aucune chaîne visible en dur dans le JSX.** Couverts : les 11 onglets
des Réglages, les fenêtres Notch / Dock / Agenda / Surcouche / Réglages, les écrans d'accueil,
les widgets de barre d'état, le menu contextuel du dock, le centre de contrôle, les contrôles
de fenêtre, et le catalogue d'Is. Reste seulement le texte généré côté Rust (messages de mise
à jour et d'erreur) — voir `todo.md` N16.

Deux schémas utiles, rencontrés en migrant :
- **Un libellé dans une constante de module ne se traduit pas tout seul.** `WIDGET_DEFS`
  portait `label: "Weather"` ; il porte maintenant `labelKey` et le composant appelle `t()`.
  Toute constante de libellés doit stocker une **clé**, jamais une chaîne.
- **Deux pluriels dans une même phrase.** Le moteur ne pluralise que `params.count` : on
  compose avec des **groupes nominaux clés** (`caldav.sources`, `caldav.events`) assemblés
  par une seule clé de phrase (`caldav.summary`). Ce n'est pas de la concaténation de
  phrases ; l'ordre des mots reste dans une clé unique.

Décisions DÉC-12 → DÉC-15 dans `ROADMAP.md` § 3.G : pas de bibliothèque (un `t()` maison + 2 dictionnaires plats), langue par défaut = celle de Windows, onglet Général → Langue, appliqué sans redémarrage.
⚠️ Le notch est étroit (290 px) : toute traduction doit être vérifiée là, pas seulement dans les réglages.

### Typographie de l'interface (règle utilisateur, 2026-11-04)

Décidé par l'utilisateur après revue de l'interface, et inscrit dans `AGENTS.md` :

- **Aucun tiret cadratin (`—`)** dans le texte affiché, dans aucune des deux langues.
  Remplacements retenus : deux lignes, un point, un deux-points, ou une parenthèse
  selon le cas. Un test parcourt `en.ts` et `fr.ts` et échoue si un `—` réapparaît.
- **`…` et non `...`** pour les points de suspension (états de chargement).
- **Signe moins `−` (U+2212)** pour les boutons de décrémentation ; le trait d'union
  et le cadratin y étaient typographiquement faux.
- Le tiret **demi-cadratin `–` reste** uniquement dans les plages (« 09:00 – 10:00 »,
  « 4 – 11 novembre ») : autre glyphe, autre fonction.

### Conseils d'Is — composition en deux parties (2026-11-04)

`TipMessage` ne porte plus une clé unique mais **`titleKey` + `detailKey?`**, avec les
mêmes `params`. `tipText()` renvoie les deux moitiés, `tipPlainText()` les joint pour
une info-bulle ou un lecteur d'écran.

Pourquoi deux lignes et non une : le notch fait 290 px, partagés avec la mascotte
(20 px) et la croix (18 px), soit **~200 px de texte, environ 33 caractères à 12 px**.
Une phrase « fait · action » y était tronquée juste avant le mot utile. D'où :

| Élément | Style | Rôle |
|---|---|---|
| `.assistant-tip-title` | 12 px, **700**, blanc | le fait, jamais coupé |
| `.assistant-tip-detail` | 11 px, 500, blanc 62 % | l'action, 8:1 de contraste |

L'ancienne règle « ≤ 46 caractères sur une ligne » était fausse : elle autorisait des
lignes que le rendu coupait. Le test mesure maintenant **ligne par ligne**
(titre ≤ 28, détail ≤ 32).

### Matières et presets (J2, livré 2026-11-04)

`src/theme/presets.ts` porte **8 presets** (`onyx`, `liquid`, `frost-light`, `aurora`,
`nord`, `paper`, `neon`, `bento`) et **4 matières** (`matte`, `frost`, `glass`, `liquid`).
Un preset décide de tout à la fois : couleur de surface, alpha, texte, bordure, accent,
matière. C'est volontaire — une couleur et une matière choisies séparément finissent en
texte blanc sur vitre pâle.

- **Aucune migration nécessaire** : `islet-theme-mode` accepte encore `dark` et `light`,
  qui résolvent vers `onyx` et `frost-light` ; une valeur inconnue retombe sur `onyx`.
  `custom` et `adaptive` restent dynamiques et gardent leur rendu d'origine.
- **Le curseur d'opacité est un facteur**, pas une valeur absolue : à 0,8 le preset rend
  exactement son alpha. Changer de preset ne déplace donc jamais le curseur.
- `--islet-material-filter` est lu par les surfaces avec **leur flou historique en repli** :
  un `settings.json` d'avant J2 rend à l'identique.
- `data-material` sur `<html>` pilote le liseré et le reflet (CSS dans `src/material.css`).

⚠️ **`backdrop-filter: url(#filtre)` n'existe pas dans Chromium** (ni WebView2). Le
`feDisplacementMap` du cadrage initial était donc une fausse piste : la réfraction n'est
pas livrée, et le Liquid Glass repose sur flou + saturation + liseré + reflet.

⚠️ **Une vitre translucide doit être densifiée** : à 42 % d'opacité, du blanc sur un
bureau blanc est à ~2,4:1. Les alphas sont calculés pour passer 4,5:1 sur fond noir
**et** blanc, texte principal comme secondaire. `test:theme` (20 tests) le vérifie et
échouerait sur tout preset trop transparent.

### Tests

`npm run test` → `test:assistant` (44) + `test:theme` (20) + `test:clipboard` (31),
bundle esbuild puis `node --test`. **95 tests, zéro dépendance ajoutée** (esbuild est
fourni par Vite).
⚠️ `node --test` **ignore `node_modules`** : le bundle doit être écrit ailleurs (ici `.test-build/`, gitignoré). Node ESM exige aussi des extensions explicites, d'où le passage par esbuild plutôt que `--experimental-strip-types`.

### Skills installées

`.claude/skills/` (versionné, 644 Ko) — `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`, `writing-guidelines`.
Installation : `npx skills add vercel-labs/agent-skills --skill <nom> -a claude-code -y --copy`.
⚠️ Le registre `skills.sh` est **injoignable depuis le sandbox** (DNS restreint) → passer par GitHub. ⚠️ Les noms réels sont préfixés `vercel-`.

---

## 8. Presse-papier (J4, livré 2026-11-05)

Demande : « le super presse-papier de Nusa ». Nusa 1.2 l'a livré sous la Shelf ; ici il a
son propre mode de notch (`clipboard`), atteint à la molette comme le calendrier.

**Répartition des rôles, à ne pas inverser :** Rust **mesure** (sondage
`GetClipboardSequenceNumber` toutes les 400 ms, lecture `CF_UNICODETEXT`, id FNV-1a base36
calculé côté Rust), TypeScript **décide** (`src/lib/clipboard.ts` : ordre, épingles,
recherche accents-insensible, aperçu, temps relatif), React **affiche**. Le frontend ne
recalcule jamais l'id : deux implémentations d'un même hash finissent par diverger.

**Choix qui engagent la suite**
- **Mémoire seule, aucun disque.** L'historique meurt avec le processus. Un presse-papier
  contient des mots de passe ; l'écrire dans `%APPDATA%` serait une décision que personne
  n'a demandée.
- **Opt-out respecté.** `ExcludeClipboardContentFromMonitorProcessing` et
  `CanIncludeInClipboardHistory == 0` : sans ça, l'outil est un keylogger. Ne jamais
  retirer ce filtre pour « voir plus d'entrées ».
- **Plafond 60 entrées non épinglées** (`MAX_ITEMS`), les épinglés ne sont **jamais**
  évincés ; texte tronqué à 20 000 caractères (`MAX_TEXT_CHARS`) avec le nombre de
  caractères masqués affiché.
- **« Vider l'historique » conserve les épinglés** ; la pause arrête l'enregistrement sans
  vider la liste.
- **Fenêtre cible du collage** : `GetForegroundWindow()` sur le survol du notch
  (`clipboard_remember_target`) + repli sur la dernière fenêtre **d'un autre processus**
  échantillonnée par le veilleur (`LAST_FOREIGN`). Le notch prend le focus dès qu'il
  s'ouvre : demander la cible à ce moment-là répondrait « Islet ».
- **Le réglage pilote Rust**, pas seulement l'affichage : `clipboard_set_recording` est
  appelé à chaque changement de `islet-clipboard-enabled`, sinon « désactivé » ne
  voudrait dire que « caché ».
- **La molette dans la liste ne change pas de mode** : `.clipboard-panel` est exclu de
  `handleWheel`, comme `.calendar-grid`.

⚠️ **Pas de toolchain Rust dans le sandbox** : `clipboard.rs` n'a pas été compilé ici.
La syntaxe a été relue, pas vérifiée par `cargo`.

---

## 9. Paroles synchronisées (J4 / P3-C1, livré 2026-11-05)

`src/lib/lyrics.ts` décide · `src-tauri/src/lyrics.rs` transporte · `NotchLyrics.tsx` affiche.

- **Le corps brut de LRCLIB traverse Rust sans être reparsé** : un seul parseur, celui qui a 60 tests. Deux
  parseurs finissent toujours par diverger.
- **Opt-in vérifié deux fois** : le réglage est off par défaut, et `lyrics_fetch` relit `islet-lyrics-enabled`
  côté Rust avant d'émettre la moindre requête. Un bug du frontend ne peut pas transformer l'app en mouchard.
- **La requête attend que le panneau soit ouvert** (`visible`). Activer le réglage arme la fonction ; ouvrir
  le panneau la déclenche. Un morceau qu'on n'ouvre jamais ne laisse aucune trace.
- **Les « pas de paroles » ne sont pas mis en cache** : LRCLIB s'enrichit tous les jours, un 404 mémorisé
  rendrait la réponse future inatteignable. Le cache (400 fichiers max, élagage par date) ne garde que des succès.
- **Le décalage est une préférence globale** (`islet-lyrics-offset`, ±5 s par pas de 250 ms), pas une donnée du
  fichier : le déplacer ne peut rien corrompre.
- **`[00:12:40]` est interprété comme `mm:ss:xx`** quand le premier champ vaut zéro, comme `h:mm:ss` sinon.
  C'est le seul arbitrage possible sur un format ambigu, il est commenté dans `parseTimestamp`.
- **Le défilement suit la lecture sauf si l'utilisateur vient de faire défiler** (4 s de répit). Un panneau qui
  reprend la main pendant qu'on lit est pire qu'un panneau figé.
- `MediaInfo` n'expose pas l'album : on n'en envoie pas. Inventer un champ donnerait une fausse impression de
  précision sur l'appariement LRCLIB.
