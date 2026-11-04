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

## Règle permanente : toute chaîne visible passe par `t()`

Depuis J8 (2026-11-04), Islet parle **français et anglais**. Ce n'est pas une
traduction faite une fois : c'est une contrainte qui s'applique à **tout code écrit
à partir de maintenant**.

**Obligatoire**
1. Aucune phrase affichée à l'utilisateur en dur dans le JSX, un `.ts` ou un message
   d'erreur. Tout passe par `t("clé")` depuis `src/i18n`.
2. Ajouter la clé dans `src/i18n/en.ts` **et** `src/i18n/fr.ts`. L'oubli de la
   seconde est une erreur de compilation, pas un détail de revue.
3. Ne jamais construire une phrase par concaténation de deux clés : l'ordre des mots
   change d'une langue à l'autre. Une phrase = une clé + des `{{placeholders}}`.
4. Pour le pluriel, utiliser la forme `{ one, other }` et passer `params.count`.
5. Dates et nombres via `formatDate()` / `formatNumber()` (qui reposent sur `Intl`),
   jamais un format écrit à la main : `11/04/2026` désigne deux jours différents
   selon le pays.
6. Vérifier la longueur **dans le notch (290 px, une seule ligne)** : au-delà de
   ~46 caractères la ligne est tronquée. Le test `test:assistant` le vérifie
   automatiquement pour les conseils d'Is.

**Corollaire pour les revues** : un écran mi-français mi-anglais est un bug, pas un
état intermédiaire acceptable. Si un écran n'est pas encore traduit, le documenter
dans `todo.md` (Bloc N) plutôt que le laisser à moitié.

**Ce qui n'est PAS traduit** : les noms d'applications, les titres de morceaux, les
noms de processus, et le mot « notch » — c'est le nom de la fonctionnalité dans le
produit, pas un mot à traduire.

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
