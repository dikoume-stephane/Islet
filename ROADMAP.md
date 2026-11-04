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

---

## 🌊 PHASE 2 — Finitions visuelles

> Ouverte le 2026-11-02, après merge de la PR #1 (`0ccd91e`).
> Objectif : cohérence et lisibilité de l'identité sur tous les supports.

### Audit initial

| Constat | Gravité | Statut |
|---|---|---|
| Mascotte blanche sur transparent → **icône invisible en thème clair** (barre des tâches, Explorateur, GitHub clair) | 🔴 Critique | ✅ Corrigé — tuile `#111318` |
| README ligne 31 attribuait le fork à **Bloom/Sehajveer Singh** au lieu de **Nectar/kua8** | 🔴 Juridique | ✅ Corrigé |
| `settings.html`, `calendar.html`, `overlay.html` affichaient le **favicon Vite** | 🟡 | ✅ Corrigé |
| Orphelins : `public/tauri.svg`, `public/vite.svg`, `src/assets/react.svg` | 🟢 | ✅ Supprimés |
| `AboutTab` (`invert(1)` en clair), installateur (fond sombre), BMP NSIS | ✅ RAS | — |

### Tâches

| ID | Tâche | Statut |
|---|---|---|
| P2-1 | Tuile d'icône + régénération des 2 jeux d'icônes Tauri | ✅ |
| P2-2 | `public/islet.svg`/`islet.png` + `docs/logo.png` depuis la tuile | ✅ |
| P2-3 | Favicons des 5 fenêtres HTML | ✅ |
| P2-4 | Attribution README (Bloom → Nectar/kua8) | ✅ |
| P2-5 | Variante claire `islet-icon-tile-light.png` + `<picture>` README | ✅ |
| P2-6 | `docs/brand/README.md` (charte + procédures de régénération) | ✅ |
| P2-7 | Remplacer `docs/screenshots/*` par des captures à jour | ⏳ Windows requis |
| P2-8 | Générer la paire de clés updater (DÉC-5) | ⏳ Utilisateur |

> **P2-7** reste ouvert (nouvelle capture après rebuild) et **P2-8** est fait depuis (clé `BA3FEE8CCD2277FC` intégrée).

---

# 🚀 PHASE 3 — Fonctionnalités

> Ouverte le 2026-11-02. Cadre : **aucune régression** sur l'existant, tout ce qui touche au réseau ou à l'IA est **opt-in**.
> Les skills Vercel sont installées dans `.claude/skills/` (voir § Recherche).

## 3.0 Vision

Islet n'est plus seulement une barre des tâches remplacée : c'est une **surface d'information permanente** en haut de l'écran. La Phase 3 ajoute trois couches :

1. **Un accueil** — au premier lancement, l'utilisateur configure son Islet au lieu de tomber sur des réglages par défaut.
2. **Un personnage** — « Is », mascotte-assistante qui vit dans le notch et sert surtout les développeurs.
3. **Une matière** — un moteur de thèmes qui donne une vraie identité visuelle, dont *Liquid Glass*.

---

## 3.A — Onboarding au premier démarrage

**Demande** : « le panneau de contrôle s'ouvre au premier démarrage pour permettre à l'utilisateur de choisir ses préférences ».

| ID | Tâche | Détail |
|---|---|---|
| P3-A1 | Détection du premier lancement | Clé `islet-onboarded` (settings.json + localStorage), migration douce si absente |
| P3-A2 | Fenêtre plein écran d'accueil | Réutilise la fenêtre `settings.html` en mode `onboarding` (évite un 6ᵉ point d'entrée Tauri) |
| P3-A3 | Étape 1 — Bienvenue | Nom de l'assistant (« Is » par défaut), choix de la langue d'affichage |
| P3-A4 | Étape 2 — Apparence | Sélecteur de thème avec **aperçu en direct** sur le notch réel |
| P3-A5 | Étape 3 — Notch ou Dock | Choix du mode, écran cible si plusieurs moniteurs |
| P3-A6 | Étape 4 — Confidentialité | Ce qui reste local, ce qui sort sur le réseau (légendes, météo, updates) |
| P3-A7 | Étape 5 — Récapitulatif | Résumé + bouton « Terminer », écrire `islet-onboarded: true` |
| P3-A8 | Rappel ultérieur | Entrée « Revoir l'accueil » dans Settings › General |

**Contraintes**
- Aucun blocage : bouton **Passer** à chaque étape.
- Ne s'affiche **qu'une fois** ; en cas de crash pendant l'accueil, l'état partiel est conservé.
- Réutilise les composants `SettingRow` / `Dropdown` existants → cohérence visuelle gratuite.

---

## 3.B — Assistant « Is »

**Demande** : « le mini avatar "Is" (ou le nom que l'utilisateur aura choisi) soit un mini assistant, utile pour les dev surtout », avec l'idée d'un avatar « que l'on poussera un peu plus tard ».

### 3.B.1 Le personnage

| ID | Tâche | Détail |
|---|---|---|
| P3-B1 | Sprite de base | `docs/yessjh.png` (variante fantôme) retravaillée en 5 états ; ou mascotte existante déclinée |
| P3-B2 | États d'animation | `idle` (respiration), `blink` (clignement aléatoire), `listening`, `thinking`, `happy`, `sleeping`, `alert` |
| P3-B3 | Regard | Les yeux suivent le curseur quand il est proche du notch (léger parallaxe, pas de suivi hors fenêtre) |
| P3-B4 | Réveil / sommeil | S'endort après inactivité prolongée, se réveille à l'interaction ou à un événement |
| P3-B5 | Nom personnalisable | Champ dans l'onboarding, stocké dans `settings.json` (`assistantName`, défaut `"Is"`) |
| P3-B6 | Interaction « pousser » (plus tard) | Physique ressort sur le sprite, réutilise les springs du notch ; **hors périmètre initial** |
| P3-B7 | Réduction des animations | Respecte `prefers-reduced-motion` → `idle` statique |

### 3.B.0 — Livré : catalogue de conseils système (2026-11-03 → 2026-11-04)

Is échantillonne la machine toutes les 30 s (Rust `signals.rs`) et affiche **un seul**
conseil à la fois dans le notch, choisi par une fonction pure (`pickTip`) où vivent
toutes les décisions : priorités, seuils, délais de répétition.

| # | Conseil | Déclencheur | Gravité | Répétition |
|---|---|---|---|---|
| 1 | Batterie critique | ≤ 10 % sur batterie | 🔴 | 10 min |
| 2 | Batterie faible | ≤ seuil (20 % par défaut) | 🟠 | 30 min |
| 3 | Autonomie restante | < 90 min alors que le % rassure | 🔵 | 2 h |
| 4 | Batterie pleine | 100 % branché | 🔵 | 2 h |
| 5 | Rappel de charge | ≥ seuil de charge (80 %) | 🔵 | 2 h |
| 6 | Disque critique | < 2 Go libres ou ≥ 97 % utilisé | 🔴 | 2 h |
| 7 | Disque qui se remplit | sous le plancher d'espace libre (10 %) | 🟠 | 12 h |
| 8 | Mémoire critique | ≥ 95 % | 🔴 | 45 min |
| 9 | Mémoire haute | ≥ 90 % | 🟠 | 45 min |
| 10 | CPU occupé | ≥ 90 % | 🟠 | 30 min |
| 11 | Redémarrage conseillé | 5 jours d'uptime | 🔵 | 12 h |
| 12 | Session longue | ≥ seuil d'heures (8 h) | 🔵 | 8 h |
| 13 | Tard dans la nuit | 00:00 – 04:00 locales | 🔵 | 8 h |

**Principes tenus**
- Un conseil à la fois, jamais deux ; le notch ne devient pas un flux de notifications.
- Les messages sont **actionnables** : un temps restant, un volume en Mo, une heure.
- Priorité = sécurité machine → intégrité des données → confort → hygiène de travail.
- Tout est réglable (4 catégories, 4 seuils) et désactivable d'un interrupteur.
- Aucune décision dans le backend : le Rust mesure, le TypeScript décide → testable sans machine Windows.
- 29 tests de `pickTip()` couvrent seuils, priorités, interrupteurs et cooldowns.

### 3.B.2 Ce qu'Is fait pour un développeur

Le parti pris : **aucune IA requise au départ**. Is agrège des signaux locaux déjà disponibles, sans prompt ni coût. L'IA vient en 3.B.4, en option.

| ID | Signal | Ce qu'Is montre | Source |
|---|---|---|---|
| P3-B8 | **Git pulse** | Branche courante, fichiers modifiés, ahead/behind du dépôt ouvert | `git` CLI lancé sur le dossier du projet suivi |
| P3-B9 | **Port radar** | Ports en écoute, processus associé, bouton « tuer » | `netstat`/API Windows, réutilise `ProcessesTab` |
| P3-B10 | **Build watcher** | L'utilisateur enregistre une commande (`bun run build`, `cargo check`…) ; Is l'exécute à la demande et affiche ✅/❌ + durée | spawn Rust, sortie capturée |
| P3-B11 | **Focus guard** | Mode focus = DND + chrono + Is au repos ; réutilise le Pomodoro existant | modules notch |
| P3-B12 | **Rappels de contexte** | « 12 min sans commit sur une branche dirty », « port 3000 occupé depuis 2 h » | règles locales, pas de LLM |

> ⚠️ **Aucun accès disque arbitraire** : l'utilisateur choisit explicitement le ou les dossiers que suit Is.

### 3.B.3 Modèle d'état

```
Is = { mood: idle|listening|thinking|happy|sleeping|alert,
       signal: none|git|ports|build|focus,
       speech?: string }   // bulle courte, 1 ligne max
```

Un seul réducteur, alimenté par des *watchers* Rust (`emit` → `listen`), sur le modèle déjà utilisé par `settings-changed`.

### 3.B.4 Assistance IA (optionnelle, différée)

| ID | Tâche | Détail |
|---|---|---|
| P3-B13 | Fournisseur « local d'abord » | Ollama ou llama.cpp sur `localhost` — aucun compte, aucune donnée sortante |
| P3-B14 | Fournisseur « clé à soi » | Endpoint OpenAI-compatible configurable (BYO key, stockée dans le trousseau Windows) |
| P3-B15 | Portée volontairement étroite | Expliquer une erreur de build collée, résumer un diff, proposer une commande. **Pas** d'agent qui écrit dans le dépôt |
| P3-B16 | Opt-in strict | Désactivé par défaut, écran de consentement explicite, indicateur visible quand Is « pense » en ligne |

---

## 3.C — Parité fonctionnelle avec Nusa

Nusa = notch Windows (C#/WPF) : musique + **lèvres synchronisées**, focus, eau, shelf, to-do, statut système.
Islet couvre **déjà** musique, command center, statut, calendrier, Pomodoro, processus. Voici l'écart réel :

| ID | Fonction | État Islet | À faire |
|---|---|---|---|
| P3-C1 | **Lecteur + paroles synchronisées** | Lecteur ✅ (SMTC) | Paroles via **LRCLIB** (API publique, sans clé), ligne courante mise en avant, clic = seek, décalage ±, cache local |
| P3-C2 | **File shelf** | ❌ | Glisser-déposer des fichiers sur le notch, liste persistante, glisser-vers-l'extérieur |
| P3-C3 | **Chronomètre + minuteur** | Pomodoro ✅ | Chronomètre (tourne, tours) et minuteur libre en plus du Pomodoro |
| P3-C4 | **Suivi d'hydratation** | ❌ | Objectif quotidien, ajout rapide, rappels, petite courbe 7 jours |
| P3-C5 | **To-do du jour** | ❌ | Tâches avec heure d'échéance, rappel via le notch, report au lendemain |
| P3-C6 | **Indicateurs clavier** | ❌ | Caps Lock / Verr Num / langue active — overlay bref, comme les overlays volume existants |
| P3-C7 | **Veille plein écran** | ✅ | Rien à faire : déjà géré |
| P3-C8 | **Modes notch minimalistes** | Partiel | Ajouter la « pilule minimale » (temps seul, aucun module) |

**Hors périmètre** : eau/paroles/to-do ne nécessitent **aucun compte** ; LRCLIB est interrogé à la demande et le cache reste local.

---

## 3.D — Moteur de thèmes

**Demande** : « plus de thèmes, avec un thème liquid glass et d'autres que tu vas me proposer ».

### 3.D.1 Refonte du moteur

Aujourd'hui : `themeMode` ∈ {`dark`, `light`, `custom`, `adaptive`} + réglages HSL.
Cible : **presets nommés** + réglages libres, sans casser `settings.json` existant.

| ID | Tâche | Détail |
|---|---|---|
| P3-D1 | Table de presets | Objet `ThemePreset` (variables CSS, blur, rayon, ombres, police d'accent) |
| P3-D2 | Migration | `themeMode` actuel → preset équivalent (`dark` → `onyx`, `light` → `frost-light`…) |
| P3-D3 | Aperçu en direct | Applique le preset au notch réel pendant la sélection (onboarding + Appearance) |
| P3-D4 | Garde-fous d'accessibilité | `prefers-reduced-transparency`, contraste minimum sur le texte, repli opaque si le blur est indisponible |
| P3-D5 | Thèmes communautaires | Un preset = un fichier JSON ; chargement depuis `themes/` du profil utilisateur |

### 3.D.2 Presets proposés

| Preset | Intention | Signature |
|---|---|---|
| **Liquid Glass** ⭐ | La demande explicite | `backdrop-filter: blur() saturate(180%)`, liseré spéculaire `inset 0 1px 0`, réfraction par `feDisplacementMap` là où c'est supporté |
| **Onyx** | Le défaut actuel, assumé | Noir mat, quasi opaque, aucune distraction |
| **Frost Light** | Jour / bureaux clairs | Verre laiteux clair, contraste AA garanti |
| **Aurora** | Vivant, coloré | Dégradé de fond animé très lent, verre par-dessus |
| **Nord** | Confort, longue session | Palette froide désaturée (inspiration Nord/Solarized) |
| **Paper** | Minimal imprimé | Aplats crème, ombres douces, zéro transparence |
| **Neon Grid** | Ambiance dev / rétro | Accents cyan-magenta, grille discrète |
| **Bento** | Modulaire | Blocs à coins marqués, séparateurs visibles entre modules |

> **Note technique décisive** : sous Tauri, le rendu web passe par **WebView2 = Chromium**. La réfraction SVG (`backdrop-filter: url(#filtre)`) fonctionne donc réellement sur Windows — c'est l'exception au « Chromium only » qui rend le vrai Liquid Glass possible ici, contrairement au web classique.

---

## 3.E — Jalons

| Jalon | Contenu | Dépendance |
|---|---|---|
| **J1 — Accueil** | 3.A complet | Aucune |
| **J2 — Matière** | 3.D presets + Liquid Glass | Aucune |
| **J3 — Personnage** | 3.B.1 + 3.B.3 (états, regard, sommeil) | J1 (nom de l'assistant) |
| **J4 — Parité** | 3.C1 (paroles), 3.C3 (chrono), 3.C6 (clavier) | Aucune |
| **J5 — Dev** | 3.B.8 → 3.B.12 (git, ports, build, focus) | J3 |
| **J6 — Confort** | 3.C2 (shelf), 3.C4 (eau), 3.C5 (to-do) | — |
| **J7 — IA (option)** | 3.B.13 → 3.B.16 | J5 |

Ordre recommandé : **J1 → J2 → J4 → J3 → J5 → J6 → J7** (J1/J2 apportent le plus de valeur visible par effort).

---

## 3.F — Recherche et sources

### Skills installées (`.claude/skills/`)

`npx skills add vercel-labs/agent-skills` — 5 skills, 644 Ko, 98 fichiers :

| Skill | Usage dans ce projet |
|---|---|
| `web-design-guidelines` | Audit d'accessibilité et d'ergonomie de l'UI (fetch des règles à jour) |
| `vercel-react-best-practices` | 70 règles perf React (re-renders, bundle, effets) |
| `vercel-composition-patterns` | Découpage des composants du notch et de l'assistant |
| `vercel-react-view-transitions` | Transitions entre états du notch |
| `writing-guidelines` | Rédaction des textes UI et de la doc |

> Le registre `skills.sh` n'est pas joignable depuis le sandbox : installation faite **directement depuis GitHub**.

### Nusa (référence)

- Notch C#/WPF pour Windows 10/11, ~30 Mo RAM, 0 % CPU au repos (annoncé).
- Fonctions : musique + paroles synchronisées (LRCLIB), Pomodoro, rappels d'eau, shelf de fichiers, to-do, overlays volume/luminosité, Caps Lock et langue, batterie/Wi-Fi/casque, masquage en plein écran.
- Enseignement : la valeur n'est pas dans le nombre de fonctions mais dans **le fait qu'elles tiennent dans un seul objet permanent**.

### Liquid Glass (technique)

- Deux niveaux : **frost** (blur + saturate + liseré) partout ; **réfraction** (`feDisplacementMap` dans `backdrop-filter`) sur Chromium uniquement.
- Un `feTurbulence` donne un grain organique ; un **displacement map fabriqué** (canal R = X, G = Y, gris au centre) donne la vraie lentille d'Apple.
- Garde-fous obligatoires : `prefers-reduced-transparency`, `prefers-contrast`, repli opaque par défaut.
