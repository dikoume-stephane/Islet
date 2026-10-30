# ⚠️ ELEMENTS MANQUANTS — Statut après exécution de la Phase 1

> **Mise à jour 2026-10-29 (nuit).** Rebranding exécuté **sur les assets officiels** (reçus via upload sur `main`). PR ouverte.
> Il reste **2 actions utilisateur** + 1 clarification. Format de réponse en bas.

---

## ✅ Résolus

| # | Élément | Statut |
|---|---|---|
| #1 | Logo | ✅ **Master officiel reçu** (`docs/islet-logo.png`, 2000² transparent — uploadé sur `main`) → tous les assets régénérés depuis lui (icônes Tauri ×2 apps, BMP NSIS, `docs/logo.png`, `islet.svg/png`) |
| #2 | Wordmarks | ✅ **Officiels reçus** (`docs/islet-wordmark-{dark,light}.png`) → intégrés au README (mapping par couleur de glyphes : mode sombre → `*-light.png`). Anciens fichiers supprimés |
| #3 | Identifiant / données | ✅ `com.2DS.islet` (+ `.installer`) ; registre `Software\2DS\islet` ; **reset assumé** |
| #6 | Attribution | ✅ « dikoume-stephane (2DS) » dans `Cargo.toml` ×2, README (Credits/Legal), AboutTab |

---

## 🔴 Action requise — validation finale Windows (#4)

Le backend Rust est Windows-only → le sandbox Linux ne peut pas compiler.

### 0️⃣ Prérequis — à installer une seule fois

Diagnostic (PowerShell) — si une commande est « non reconnue », elle manque :

```powershell
bun -v; cargo -V; rustc -V
```

Installation (~15 min, ~4 Go téléchargés) :

```powershell
# 1. Bun — runtime JS + gestionnaire de paquets du projet
powershell -c "irm bun.sh/install.ps1 | iex"

# 2. Rust (rustup, toolchain x86_64-pc-windows-msvc par défaut)
winget install --id Rustlang.Rustup -e

# 3. Chaîne C++ MSVC — OBLIGATOIRE pour lier le backend Rust
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

→ **Fermer et rouvrir le terminal** (le `PATH` n'est pas rafraîchi dans la session courante), puis revérifier : `bun -v; cargo -V; rustc -V`.

- Pas de `winget` ? Rust : <https://win.rustup.rs/x86_64> (choisir l'installation par défaut) · Build Tools : <https://visualstudio.microsoft.com/downloads/> → *Build Tools for Visual Studio* → charge de travail **Développement Desktop en C++**.
- **WebView2** : déjà présent sur Windows 10/11 (via Edge) — rien à faire.
- **NSIS** : téléchargé automatiquement par Tauri au premier `tauri build`.

> ✅ **Chemin du dépôt** : résolu — le clone est passé à `D:\2DS\projet\projets_git\Islet` (plus de `&`). Éviter à l'avenir les `&`, `#`, `%` dans le chemin : ce sont des opérateurs pour PowerShell/NSIS.

### 🔧 Dépannage — `linking with link.exe failed` / `link: extra operand`

**Ce message ne vient PAS du linker MSVC.** `link: extra operand '…rcgu.o'` / `Try 'link --help'` est la sortie de l'outil GNU **`link`** fourni avec Git for Windows (`C:\Program Files\Git\usr\bin\link.exe`). Rust appelle `link.exe`, et c'est ce binaire-là qui répond → l'échec frappe les *build scripts* (`proc-macro2`, `quote`, `serde_core`, `zerocopy`) avant même le code du projet.

**1) Vérifier que le compilateur C++ est réellement installé :**

```powershell
& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
```

- **Sortie vide** → le workload manque (cas le plus fréquent) :

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

  …ou *Visual Studio Installer* → **Build Tools** → *Modifier* → cocher **« Développement Desktop en C++ »** → Installer.
  ⚠️ `--passive` revient immédiatement : l'installation continue en arrière-plan (~10 min). La relancer/attendre jusqu'à ce que `vswhere` renvoie un chemin.

- **Sortie = un chemin** → MSVC est présent, c'est l'ordre du `PATH` → étape 2.

**2) Vérifier qui gagne :**

```powershell
where.exe link
```

Si `C:\Program Files\Git\usr\bin\link.exe` (ou `C:\msys64\usr\bin\link.exe`) apparaît **avant** `…\VC\Tools\MSVC\14.xx\bin\Hostx64\x64\link.exe`, MSVC est masqué.

**Correctif (PowerShell, pour la session) — on indique explicitement le linker à Cargo :**

```powershell
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vs   = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
$msvc = Get-ChildItem "$vs\VC\Tools\MSVC" | Sort-Object Name -Descending | Select-Object -First 1
$env:CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER = "$($msvc.FullName)\bin\Hostx64\x64\link.exe"
Test-Path $env:CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER   # doit afficher True
```

Puis relancer `cargo check`. Équivalent : ouvrir **« x64 Native Tools Command Prompt for VS 2022 »** (menu Démarrer), dont le `PATH` met MSVC en tête, et y exécuter les commandes.

> Réglage **local à la machine** : aucun `.cargo/config.toml` n'est committé (un chemin absolu n'a pas sa place dans le dépôt).

### 1️⃣ Validation

```powershell
git fetch origin && git switch arena/7705c682-islet
bun install                    # régénère aussi bun.lock proprement
bun run build                  # frontend (déjà validé ici, contrôle rapide)
cargo check --manifest-path src-tauri/Cargo.toml   # G3 : compile-check Rust (~5 min au 1er run)
bun run tauri build            # G4 : build complet + installateur NSIS (~5-10 min)
```

Puis tester : installer **Islet** (idéalement par-dessus Nectar 1.4.1 pour observer la cohabitation), lancer, ouvrir Settings › About (logo/attributions), désinstaller via l'app **et** via Windows Settings. Me retourner **toute erreur** (ou le succès) → je corrige et on merge la PR #1.

## 🟡 Avant la première release (#5 / DÉC-5, différé)

La clé publique updater actuelle appartient à l'upstream (kua8) ; l'endpoint pointe déjà vers `dikoume-stephane/Islet` (404 tant qu'il n'y a pas de release → aucun risque de mise à jour parasite). Avant de publier une release Islet :

```powershell
bunx tauri signer generate -w ~/.tauri/islet.key    # garde la clé PRIVÉE hors du dépôt
```

→ m'envoyer uniquement la **clé publique** ; je l'intègre dans `src-tauri/tauri.conf.json`. (`.gitignore` couvre déjà `*.key`.)

## 🟢 Clarification demandée (sans urgence)

**Rôle de `docs/yesjj.png` (2048², illustration pastel) et `docs/yessjh.png` (480², variante « fantôme » du mascot)** — uploadés avec les assets officiels. Je les ai conservés tels quels. Confirme leur usage : illustration hero (README/site) ? ressources design Phase 2 ? sans objet ?

---

## 📬 Format de réponse attendu

```
#4 validation Windows : OK / erreurs (coller le log)
#5 clé updater : maintenant (coller la clé publique) / toujours plus tard
yesjj.png / yessjh.png : hero README / ressources Phase 2 / sans objet
→ ensuite : merge de la PR, puis GO Phase 2
```
