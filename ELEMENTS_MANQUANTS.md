# ⚠️ ELEMENTS MANQUANTS — Statut après exécution de la Phase 1

> **Mise à jour 2026-11-02.** Phase 1 mergée (PR #1). Phase 2 en cours (PR #2). Clé updater intégrée.
> Il reste **1 action utilisateur** : refaire les captures d'écran sur Windows (P2-7).

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
git pull                         # récupérer cette doc + les derniers commits
bun install                      # régénère aussi bun.lock proprement
bun run build                    # frontend
cargo check --manifest-path src-tauri/Cargo.toml   # G3 : compile-check Rust
bun run tauri build --bundles nsis --no-sign       # G4 : build + installateur NSIS
```

> ✅ **G3 est passé** le 30/10 : `cargo check` → `Finished dev profile in 5m 10s`, aucune erreur. `bun run tauri build` a aussi produit `src-tauri/target/release/islet.exe` (`Finished release profile in 12m 29s`).

Puis tester : installer **Islet** (idéalement par-dessus Nectar 1.4.1 pour observer la cohabitation), lancer, ouvrir Settings › About (logo/attributions), désinstaller via l'app **et** via Windows Settings. Me retourner **toute erreur** (ou le succès) → je corrige et on merge la PR #1.

### 🔧 Dépannage — échec au *bundling* (après un build Rust réussi)

Symptômes rencontrés et leur cause réelle :

| Message | Cause | Solution |
|---|---|---|
| `Downloading …/wix3/…` puis `failed to bundle project: io: Hôte inconnu. (os error 11001)` | `bundle.targets` vaut **`"all"`** → Tauri tente aussi le **MSI**, qui doit télécharger **WiX** depuis GitHub. `11001` = DNS qui ne résout pas l'hôte. | **Islet ne livre que du NSIS** : ajouter `--bundles nsis` → WiX n'est plus téléchargé du tout. |
| `A public key has been found, but no private key. Make sure to set TAURI_SIGNING_PRIVATE_KEY` | `bundle.createUpdaterArtifacts: true` + pubkey présent → chaque bundle exige la clé privée de signature. | **`--no-sign`** (CLI ≥ 2.11) : `Updater signing is skipped due to --no-sign flag.` L'archive updater est produite mais non signée. |

```powershell
bun run tauri build --bundles nsis --no-sign
```

Si le téléchargement de **NSIS** échoue aussi (même erreur DNS), au choix :

1. **Vérifier/réparer le DNS** : `Resolve-DnsName github.com` ; en cas d'échec, changer de DNS (1.1.1.1 / 8.8.8.8) ou couper VPN/proxy, puis `ipconfig /flushdns`.
2. **Pré-remplir le cache manuellement** (Tauri ne re-télécharge pas si le dossier existe) :
   - `https://github.com/tauri-apps/binary-releases/releases/download/nsis-3/nsis-3.zip` → extraire dans `%LOCALAPPDATA%\tauri\NSIS`
   - `nsis_tauri_utils.dll` → `%LOCALAPPDATA%\tauri\NSIS\Plugins\x86-unicode\additional\`
   - (WiX, seulement si le MSI est vraiment voulu : `https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip` → `%LOCALAPPDATA%\tauri\WixTools314`)

> 💡 **L'exécutable seul suffit pour valider le rebranding** : `src-tauri\target\release\islet.exe` s'exécute directement, sans installateur — icône, About, Settings, notch, tout est testable. Le NSIS ne valide que l'installation/désinstallation.

## ✅ #5 / DÉC-5 — Clé de signature updater (résolu le 2026-11-02)

La paire a été générée par le mainteneur et la **clé publique** est intégrée dans `src-tauri/tauri.conf.json` :

| | |
|---|---|
| ID de clé (minisign) | `BA3FEE8CCD2277FC` |
| Emplacement privé | `C:\Users\stephane dikoume 2DS\.tauri\islet.key` |
| Pubkey embarquée | `plugins.updater.pubkey` (base64 des 2 lignes du `.pub`) |
| Endpoint | `https://github.com/dikoume-stephane/Islet/releases/latest/download/latest.json` |

L'ancienne clé (`66A2BF13F216B96A`) appartenait à l'upstream kua8 — remplacée.

### 🔐 Règles à ne jamais enfreindre

1. **`islet.key` (privée) ne quitte JAMAIS la machine** — ni dépôt, ni GitHub, ni chat.
2. **Sauvegarde-la** dans un gestionnaire de mots de passe ou un support chiffré : perdue, plus aucune mise à jour ne pourra être signée, et les Islet installés refuseront les futures versions.
3. `.gitignore` couvre déjà `*.key` et `*.key.pub` — même posés dans le dossier, ils ne seraient pas committés.

### 🧪 Build local **non signé** (usage courant)

```powershell
bun run tauri build --bundles nsis --no-sign
```

### 🚀 Build de release **signé**

Si la clé a un mot de passe, la variable `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` est indispensable. Vérifie avec :

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\islet.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "ton-mot-de-passe"   # seulement si la clé en a un
bun run tauri build --bundles nsis
```

Sortie attendue : `Islet_1.4.1_x64-setup.exe` **et** `Islet_1.4.1_x64-setup.exe.sig`. Sans le `.sig`, `scripts/release.ps1` s'arrête (`Expected build output not found`).

> `scripts/release.ps1` orchestre tout le reste (manifeste `latest.json`, note de version, `gh release`) et refuse de démarrer sans `TAURI_SIGNING_PRIVATE_KEY`.

## 🟢 Clarification — `docs/yesjj.png` / `yessjh.png`

Réponse du 2026-11-02 : **ressources de design**, conservées telles quelles sans intégration. (`yesjj.png` sert de fond d'écran dans `docs/screenshots/desktop.webp`.)

---

## 📬 Reste à faire

```
#4 rebuild Windows  : bun run tauri build --bundles nsis --no-sign
                      → vérifier l'icône en thème clair, l'installateur NSIS
P2-7 screenshots    : captures à jour (notch, dock, settings, desktop)
```

Ensuite : merge de la PR #2, puis on choisit le prochain chantier
(infrastructure de release / expérience utilisateur / nouvelles fonctionnalités).
