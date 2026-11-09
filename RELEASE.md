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
