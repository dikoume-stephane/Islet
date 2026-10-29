# Instructions Agent : Rebranding de Nectar vers Islet

## Rôle et Contexte
Tu agis en tant que **Lead Software Engineer & Code Refactoring Specialist**. Ton objectif immédiat est de réaliser un **rebranding complet et propre** du dépôt open-source `nectar` vers sa nouvelle identité `Islet`, avant toute phase de modification des fonctionnalités.

Tu dois opérer avec une précision chirurgicale pour garantir que le projet reste compilable, exécutable et que l'historique ou les dépendances ne soient pas rompus de manière inattendue.

---

## Objectif Principal
Remplacer toutes les occurrences de l'ancienne identité (**Nectar**) par la nouvelle identité (**Islet**), mettre à jour les ressources graphiques (logo), et restructurer les fichiers de configuration nécessaires.

---

## Cartographie des Modifications à Effectuer

### 1. Remplacement de l'Identité Visuelle (Logo)
- **Source du nouveau logo :** `docs/nexlogo` (ou extension associée selon le fichier présent dans ce dossier, ex: `.png`, `.svg`, `.ico`).
- **Actions :**
  - Identifier l'ensemble des icônes et logos actuels du projet (icônes d'application, favicons, assets UI, images de documentation).
  - Remplacer les fichiers média d'origine par le nouveau logo situé dans `docs/nexlogo`.
  - Conserver les formats et résolutions requis par la plateforme cible (ex: réexporter au format `.ico`, `.icns` ou `.png` selon la structure du projet).

### 2. Refactoring du Nom dans le Code et la Configuration
Tu dois parcourir l'ensemble de l'arbre du projet et effectuer les remplacements selon les règles de casse ci-dessous :

| Forme d'origine | Nouvelle forme | Emplacements typiques |
| :--- | :--- | :--- |
| `Nectar` | `Islet` | Titres UI, fenêtres, documentation, commentaires |
| `nectar` | `islet` | Identifiants de paquets, fichiers de config, noms de exécutables |
| `NECTAR` | `ISLET` | Constantes, variables d'environnement, macros |
| `com.nectar.*` / `org.nectar.*` | `com.islet.*` / `org.islet.*` | Namespaces, IDs d'application / Bundle IDs |

#### Fichiers prioritaires à inspecter :
- **Fichiers de build / manifeste :** `package.json`, `Cargo.toml`, `CMakeLists.txt`, `Makefile`, `build.gradle`, `.csproj`, `Info.plist`, ou tout fichier de configuration selon la stack du projet.
- **Ressources UI :** Fichiers XAML, HTML/CSS, assets graphiques, fenêtres principales.
- **Documentation :** `README.md`, `CONTRIBUTING.md`, notices de licence (attention aux règles de préservation ci-dessous).

### 3. Renommage des Fichiers et Dossiers
- Identifier tous les fichiers ou répertoires comportant `nectar` dans leur nom (ex: `nectar_config.json`, `src/nectar/`).
- Les renommer en respectant la casse (ex: `islet_config.json`, `src/islet/`).
- Mettre à jour tous les chemins d'importation (`import`, `include`, `require`) impactés par ces changements.

---

## Règles Obligatoires & Contraintes Légales

1. **Preservation de l'Attribution Originale (Licence) :**
   - **NE PAS** supprimer les mentions de copyright d'origine dans le fichier `LICENSE`.
   - Ajoute une section **Credits / Legal** dans le `README.md` indiquant :
     > *Islet est un fork du projet open-source [Nectar], modifié sous les termes de sa licence d'origine.*
   - Conserve les en-têtes de droit d'auteur originaux dans les fichiers de code source existants, sauf si tu ajoutes ta propre mention en tant que mainteneur du fork.

2. **Isolation du Refactoring :**
   - N'ajoute, ne supprime et ne modifie **aucune fonctionnalité métier** lors de cette phase.
   - Cette étape doit se limiter strict-sensu au rebranding (noms, logos, identifiants, métadonnées).

---

## Workflow d'Exécution Attendu pour l'Agent

1. **Analyse préalable :**
   - Scanner le projet pour lister toutes les occurrences du terme `nectar` (insensible à la casse).
   - Analyser le contenu du dossier `docs/nexlogo` pour identifier le format de la nouvelle image.
2. **Exécution méthodique :**
   - Remplacer les logos et assets graphiques.
   - Effectuer le remplacement textuel dans les fichiers de configuration et de code source.
   - Renommer les fichiers et répertoires impactés.
   - Mettre à jour la documentation (`README.md`).
3. **Vérification & Validation :**
   - Vérifier qu'aucune référence critique à `nectar` n'a été oubliée dans le code source.
   - S'assurer que le projet compile/s'exécute correctement sous le nouveau nom `Islet`.
