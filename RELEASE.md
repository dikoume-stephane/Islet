# Livrer une version d'Islet

Ce document est le mode d'emploi de la sortie. Il suppose Windows, et il est écrit pour être suivi dans
l'ordre, sans rien deviner.

Deux choses ne peuvent pas être vérifiées dans l'environnement de travail qui a produit ce dépôt : la
**compilation Rust** (pas de toolchain) et le **rendu visuel** (pas de navigateur). Tout le reste l'est.
La procédure commence donc par mettre ces deux angles morts à l'épreuve, avant de construire quoi que ce
soit.

---

## 1. Le portillon, avant tout

```
npm install
npm run prerelease
```

Trois étapes, dans cet ordre, et il faut les trois au vert :

| Étape | Ce qu'elle vérifie |
|---|---|
| `npm run audit` | Les coutures invisibles : commandes appelées et enregistrées, permissions des plugins, parité des traductions, versions des six fichiers, aucun `debugger` ni `console.log` |
| `npm run test` | Les 440 tests des modules purs (`src/lib/`) |
| `npm run build` | `tsc` puis Vite : une seule erreur de type arrête tout |

Si l'audit signale quelque chose, ne pas contourner : ces contrôles existent parce que leurs pannes sont
silencieuses à l'usage (une commande oubliée dans le `generate_handler!` échoue au clic, pas à la
compilation).

---

## 2. La première compilation (le vrai test)

C'est ici que se joue la livraison : `src-tauri/` n'a **jamais** été compilé hors de votre machine.

```
bun install
bun run tauri dev
```

Ce qu'on attend : la fenêtre du notch apparaît, la compilation se termine sans erreur, et la console ne
montre ni `warning: unused` en série ni `error[E`.

Si ça casse, l'erreur est dans un fichier récent, et le message la nomme. Trois candidats, dans l'ordre
de probabilité :

1. `src-tauri/src/dev.rs` (git, ports, build) : le module le plus long.
2. `src-tauri/src/ai.rs` : `ai_post`.
3. Un nom de commande dans `src-tauri/src/main.rs` (le `generate_handler!`) : s'il ne correspond à rien,
   l'erreur parle de fonction introuvable.

### Si l'app se ferme toute seule

`error: process didn't exit successfully ... (exit code: 1)` ne dit rien par lui-même : un exécutable
tué sort avec ce code, sans écrire une ligne. Le journal, lui, sait. Il est ici :

```
Get-Content "$env:APPDATA\com.2DS.islet\logs\islet.log" -Tail 40
```

Il se lit comme une histoire, dans l'ordre : `startup: init`, `startup: single instance mutex
acquired`, `startup: building application`, `setup: begin`, `setup: done`, `run: ready`. L'endroit où
l'histoire s'arrête est l'endroit du problème.

| Dernière ligne | Ce que ça veut dire |
|---|---|
| `startup: another instance owns the mutex` | Une autre Islet tournait déjà : la fermer, ou vérifier la barre système |
| `setup: begin` sans `setup: done` | Le montage échoue : la ligne d'erreur est juste au-dessus |
| `run: exit requested` | Quelque chose a demandé l'arrêt (menu, `quit_islet`, erreur de webview) |
| `webview died right after launch` | WebView2 meurt au démarrage : voir la mise à jour de WebView2 |
| `quit: restoring taskbar and exiting` | Une sortie propre, par le menu ou par la touche d'arrêt |
| rien après `setup: done` | Le processus a été tué de l'extérieur : antivirus, ou un `taskkill` |

Si le message parle de `rustc-LLVM ERROR: out of memory` et non du journal, le problème est en amont
de l'exécution : la compilation a manqué de mémoire. Voir la section « If the Rust build runs out of
memory » du README, et `scripts/dev.ps1 -Clean` une fois.

### Les cinq vérifications à faire dans la foulée

1. **Panneau développeur** : molette sur le notch jusqu'au panneau « dev ». Il doit afficher « Aucun
   dépôt ». Ouvrir les réglages, onglet Notch, groupe Développeur, choisir ce dépôt-ci. Revenir : la
   branche, les fichiers modifiés et les ports doivent apparaître.
2. **Commande de vérification** : dans le même groupe, taper `bun run build`, Entrée. Dans le panneau,
   cliquer « Lancer » : vert et une durée, ou rouge avec la fin de la sortie. Un second clic pendant
   l'exécution ne doit rien relancer.
3. **Ports** : un port tenu par `node.exe` doit avoir une croix. La cliquer doit le libérer. Les ports
   système (135, 445) restent listés mais ne produisent jamais de remarque.
4. **Mode focus** : centre de commandes, bouton lune. Le décompte s'affiche dans le bouton, et plus aucun
   conseil d'Is n'apparaît pendant la session. Une pause garde le silence.
5. **Assistance IA éteinte** : ouvrir le panneau développeur, aucune ligne « Assistance » ne doit
   apparaître. C'est le comportement par défaut, et c'est ce qui part en release.

---

## 3. Fabriquer les fichiers

Le dépôt fournit déjà la chaîne complète dans `scripts/release.ps1`. **Toujours commencer par un essai à
blanc**, qui construit tout sans rien publier :

```
powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version 1.4.1 -DryRun
```

Le script commence par refuser de travailler si les six fichiers de version ne sont pas d'accord, ou si
`TAURI_SIGNING_PRIVATE_KEY` n'est pas dans l'environnement : la mise à jour automatique a besoin d'une
signature, et une release non signée casserait les installations existantes.

Les notes publiées viennent de `RELEASE_NOTES.md`, qui est écrit pour être lu par un utilisateur et non
par un développeur :

```
powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Version 1.4.1 -NotesFile RELEASE_NOTES.md -DryRun
```

Sans `-NotesFile`, le script reprend le corps du dernier commit et le dit à l'écran : pratique en cours
de route, illisible une fois publié.

Il produit, dans `release/` :

| Fichier | À quoi il sert |
|---|---|
| `Islet-Setup-1.4.1.exe` | L'installeur maison (celui qu'on télécharge à la main) |
| `Islet_1.4.1_x64-setup.exe` (+ `.sig`) | L'installeur NSIS dont dépend la mise à jour automatique |
| `islet-1.4.1-portable-windows-x64.zip` | La version sans installation |
| `latest.json` | Le manifeste que l'app interroge pour se mettre à jour |

Quand tout est là et que les cinq vérifications de la section 2 sont passées, relancer la même commande
sans `-DryRun` : elle pousse, crée la release sur GitHub et publie. `-Prerelease` la marque comme
bêta.

---

## 3 bis. La clé de signature

Deux variables, dans la même fenêtre que la release :

```
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\islet.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "le mot de passe de la clé"
```

Si la clé n'a pas de mot de passe, la seconde ligne devient `$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""`.

Un mot de passe se perd, et ne se retrouve pas : la clé est chiffrée. Deux issues, et une seule est
raisonnable avant la première sortie.

**Renouveler la paire** (sans danger tant que personne n'a installé Islet) :

```
Remove-Item "$env:USERPROFILE\.tauri\islet.key", "$env:USERPROFILE\.tauri\islet.key.pub" -ErrorAction SilentlyContinue
bun run tauri signer generate -w "$env:USERPROFILE\.tauri\islet.key"
```

La commande demande un mot de passe : **Entrée deux fois** pour ne pas en mettre. Elle affiche ensuite
la clé publique. Pour l'inscrire dans le fichier de configuration, sans risque d'erreur d'encodage :

```
npm run pubkey
npm run audit
git add src-tauri/tauri.conf.json
git commit -m "chore(release): nouvelle cle de signature"
```

Le script `scripts/set-pubkey.mjs` lit le fichier `.key.pub` tel quel et remplace la valeur de
`plugins.updater.pubkey` ; `npm run pubkey -- --check` compare sans écrire.

**Après la première sortie, ne renouvelez plus la clé** : la clé publique est embarquée dans les
applications déjà installées, et une autre clé les empêcherait de vérifier la mise à jour. Sauvegardez
`islet.key` et son mot de passe en lieu sûr.

## 4. Après l'installation, sur une machine propre

Installer `Islet-Setup-<version>.exe`, puis :

- [ ] Les réglages sont dans `%APPDATA%\com.2DS.islet\settings.json` (l'identifiant, pas un autre chemin).
- [ ] Lancer Islet une deuxième fois n'ouvre pas un second exemplaire.
- [ ] Le notch s'affiche en haut de l'écran, se déplie au survol, et se replie.
- [ ] Le son, la luminosité et Verr Maj sortent leurs surcouches.
- [ ] Les réglages s'ouvrent, l'interface est en français **et** en anglais (sélecteur dans Général).
- [ ] Quitter par le menu de la barre système laisse la machine dans son état normal (barre des tâches
      restaurée, pas de fenêtre fantôme).
- [ ] Désinstaller depuis « Applications et fonctionnalités » ne laisse pas de dossier d'installation.

---

## 5. Ce qui ne doit pas partir

- `settings.json` : il contient les réglages de **votre** machine, jamais ceux de l'utilisateur.
- Aucune clé, aucun jeton, aucun `.env`. L'assistance IA est éteinte par défaut et ne stocke rien.
- Les dossiers `dist/`, `target/`, `release/` : ils sont reconstruits, pas versionnés.
- Un `Cargo.lock` modifié à la main, jamais.

---

## 6. Changer de version

```
bun run bump 1.4.2
```

Le script met les six fichiers d'accord. Vérifier ensuite avec `npm run audit`, qui refuse un
désaccord : c'est exactement ce que `release.ps1` vérifiera plus tard, mais autant le savoir avant.

---

## 7. Ce que cette version ne fait pas encore

À dire honnêtement dans les notes de version :

- Pas de **clé d'API** pour un fournisseur distant : l'assistance IA ne parle qu'à un serveur local
  (Ollama ou équivalent). Un endpoint distant se règle, mais sans clé, donc en pratique réservé à un
  serveur de confiance sur le réseau local.
- Pas de **proposition de commande** par le modèle (deux tâches sur trois sont livrées).
- Le **mode Concentration de Windows** n'est pas piloté : le mode focus est le silence d'Islet, pas
  celui du système.
- Les **paroles** et les **to-do** interrogent ou écrivent sur la machine uniquement, sauf les paroles qui
  demandent LRCLIB à la demande, et seulement si le réglage est allumé.
