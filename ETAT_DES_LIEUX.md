# État des lieux d'Islet

Établi après la publication de la première version publique, **v1.4.1, le 17 novembre 2026**.

---

## 1. En une page

Islet est **livré**. La première release est publiée sur GitHub, signée, avec quatre fichiers
téléchargeables. Le dépôt contient l'application complète : un notch pour Windows, un dock, des
surcouches système, un personnage, une assistance IA locale optionnelle, et une interface bilingue.

Trois semaines de travail, 55 commits, 45 000 lignes. Le socle est tenu par un portillon de contrôles
automatisés qui passe : 440 tests, un audit en huit points, un build typé.

Ce qui reste n'est pas du développement bloquant. C'est **de la vérification à l'écran** (aucun
navigateur dans l'environnement qui produit ce code), du **confort visuel** relevé sur captures, et des
fonctionnalités volontairement laissées pour après la première sortie.

Le risque principal n'est pas technique : c'est que le portillon reste **manuel**. Rien ne l'exécute
avant une fusion, puisqu'il n'y a pas d'intégration continue.

---

## 2. La sortie

| | |
|---|---|
| Version | 1.4.1 |
| Publiée le | 17 novembre 2026, 18:31 UTC |
| Page | https://github.com/dikoume-stephane/Islet/releases/tag/v1.4.1 |
| Statut GitHub | Latest |

| Fichier | Taille | Rôle |
|---|---|---|
| `Islet-Setup-1.4.1.exe` | 17,5 Mo | Installeur maison, celui qu'on télécharge à la main |
| `Islet_1.4.1_x64-setup.exe` | 5,5 Mo | Installeur NSIS, celui dont dépend la mise à jour automatique |
| `islet-1.4.1-portable-windows-x64.zip` | 7,8 Mo | Version sans installation |
| `latest.json` | 3,8 Mo | Manifeste interrogé par l'application pour se mettre à jour |

Les quatre sont signés. La clé privée correspondante est la seule pièce **irremplaçable** du projet :
sans elle, plus aucune mise à jour ne peut être signée pour ceux qui ont installé l'application.

---

## 3. Le socle

| Mesure | Valeur |
|---|---|
| Commits | 55, du 28 octobre au 17 novembre 2026 |
| Rust | 14 372 lignes, 26 fichiers |
| TypeScript et TSX | 21 226 lignes, 42 composants |
| CSS | 9 490 lignes |
| Commandes Tauri | 130 enregistrées, 95 appelées par l'interface |
| Traductions | 693 clés, à parité entre français et anglais, 532 réellement utilisées |
| Tests | 440, en 13 suites, tous verts |
| Contrôles d'audit | 8, tous verts |
| Intégration continue | aucune |

### Ce que le portillon vérifie

`npm run prerelease` enchaîne trois étapes, et il faut les trois au vert :

1. **`npm run audit`**. Les coutures invisibles : commande appelée mais absente du Rust, commande
   enregistrée deux fois, plugin utilisé sans sa permission, clé de traduction manquante d'un côté,
   tiret cadratin ou points de suspension dans un libellé, désaccord entre les six fichiers de version,
   `debugger` ou `console.log` oublié.
2. **`npm run test`**. La logique pure des quinze modules (`src/lib`), sans interface ni système.
3. **`npm run build`**. `tsc` puis Vite. Une seule erreur de type arrête tout.

### Ce que le portillon ne vérifie pas

- **Le rendu.** Aucun navigateur dans l'environnement de production du code : chaque correction visuelle
  est vérifiée par le code et la compilation, jamais par l'œil, jusqu'à ce que tu la regardes.
- **Le Rust.** La compilation réelle a eu lieu plusieurs fois sur ta machine, mais jamais dans
  l'environnement de développement ; seul un analyseur syntaxique y passe.
- **Le comportement système.** Focus, transparence à la souris, dépôt de fichiers, verrouillage du
  clavier : tout cela ne se juge que sur Windows, à l'usage.

---

## 4. Fonctionnalités livrées

| Chantier | Contenu | État |
|---|---|---|
| Notch | Barre repliée, déploiement au survol, multi-écrans, trois modes | Livré |
| Surcouches | Volume, luminosité, Verr Maj, Verr Num, langue du clavier | Livré |
| Dock | Remplacement de la barre des tâches, épinglage, vignettes, recherche | Livré |
| Is | Personnage qui cligne, regarde, s'endort, conseils issus de l'état réel de la machine | Livré |
| Étagère | Fichiers déposés sur le notch, conservés comme raccourcis | Livré, à revérifier |
| Presse-papier | Historique en mémoire vive, épinglage, recopie | Livré |
| To-do du jour | Liste courte, échéances, retard visible | Livré, saisie corrigée |
| Chrono et minuteur | Ancrés sur une heure cible absolue, justes après veille | Livré |
| Paroles | LRCLIB, ligne par ligne, éteint par défaut | Livré |
| Pilule minimale | Le notch replié réduit à l'heure | Livré |
| Panneau développeur | Branche, fichiers modifiés, ports en écoute, commande de vérification | Livré |
| Mode concentration | Is se tait, décompte visible | Livré |
| Assistance IA | Fournisseur local, consentement explicite, éteint par défaut | Livré, deux tâches sur trois |
| Thèmes | Huit presets, dont Liquid Glass, avec contrôle d'opacité | Livré |
| Bilingue | Français et anglais, sélecteur Suivre Windows | Livré |
| Installation et mise à jour | NSIS signé, installeur maison, portable, désinstalleur | Livré |
| Accueil | Premier démarrage, nom, apparence, choix des modules | Livré |

---

## 5. Ce qui reste ouvert

### 5.1 Bugs relevés, corrigés dans le code, non revérifiés à l'écran

| Sujet | Ce qui a été fait | Ce qui manque |
|---|---|---|
| Saisie dans le notch | `set_notch_activatable` rend la fenêtre activable le temps d'un champ | Vérifier la to-do, la recherche du presse-papier, la commande de vérification |
| Libellés des boutons | Le `title` global est remplacé par des `aria-label` et des libellés par bouton | Vérifier qu'aucune bulle blanche ne subsiste |
| Croix des conseils | Règle CSS créée, elle n'existait pas | Vérifier le rendu |
| Textes qui débordaient | Les blocs de prose reprennent le retour à la ligne | Vérifier la page dev |
| Étagère | Ouverture à l'approche, glisser reconnu par le hitbox | Vérifier qu'un fichier déposé arrive bien |
| Liste des langues | Rendu hors du panneau par un portail | Vérifier le dépliage et le choix |
| Bouton des icônes cachées | Échoue toujours en silence, mais écrit dans le journal à chaque étape | Lire `islet.log` après un clic, puis décider |

### 5.2 Défauts visuels signalés, non traités

- La barre de progression du lecteur média paraît mal proportionnée sur les captures.
- Les listes de réglages (Dock, Notch) se coupent en bas de fenêtre quand on fait défiler.

### 5.3 Fonctionnalités laissées pour après la sortie

| Référence | Contenu | Pourquoi elle attend |
|---|---|---|
| M1 | Proposer une commande (troisième tâche de l'assistance) | Portée à définir, jamais exécutée automatiquement |
| M2 | Clé d'un fournisseur distant | Exige le trousseau Windows, jamais `settings.json` |
| J5e | Glisser un fichier **hors** de l'étagère | Dépend de `startDrag`, à éprouver sur Windows |
| I8 | Presets utilisateur chargés depuis le profil | Confort, pas fondation |
| L4 | Rappels de contexte en conseils d'Is | Suite de B12, réglages de répétition à définir |

### 5.4 Vérifications Windows encore ouvertes

Le `todo.md` en liste une vingtaine, dont plusieurs sont en réalité acquises depuis que l'application
tourne et que la release a été construite. Les trois qui comptent encore :

- **Minuteur et veille** : lancer un minuteur, mettre le PC en veille deux minutes, vérifier le réveil.
- **Paroles** : une piste dont les paroles dérivent, et le décalage manuel.
- **Personnage** : clignement, suivi du regard, endormissement, et le rendu quand les animations sont
  désactivées dans Windows.

---

## 6. Points de fragilité

1. **Pas d'intégration continue.** Le portillon est un script que l'on lance à la main. Une correction
   poussée sans le lancer peut casser un test ou une traduction sans que personne ne le voie.
2. **Le hitbox concentre les bugs.** Quatre des cinq défauts corrigés cette semaine venaient du même
   endroit : le notch est une fenêtre sans activation, transparente à la souris, sans focus. Chaque fois
   qu'on lui demande un comportement de fenêtre normale, il faut le lui rendre explicitement.
3. **Les tests ne couvrent que la logique pure.** Ni l'interface, ni le Rust n'ont de test. Les 440
   tests protègent les calculs, pas les écrans.
4. **La clé de signature est unique et fragile.** Perdue, elle coupe les mises à jour de toute la base
   installée. Sauvegarde et mot de passe doivent être conservés hors de la machine.
5. **Le numéro 1.4.1 a été conservé** pour une première publication : il suggère trois versions
   antérieures qui n'ont jamais existé.
6. **Fins de ligne.** `core.autocrlf` fait apparaître des `Cargo.toml` modifiés qui ne contiennent aucun
   changement. Un `.gitattributes` réglerait cela.

---

## 7. Prochaines étapes proposées

Dans l'ordre, du moins coûteux au plus engageant.

1. **Revérifier les sept correctifs de la semaine** sur l'application installée. C'est le seul travail
   qui ne peut pas être fait ici, et il conditionne tout le reste.
2. **Traiter les deux défauts visuels restants** (barre de progression, listes coupées), courts et sans
   risque.
3. **Mettre `todo.md` à jour** : marquer les vérifications Windows désormais acquises, pour que la liste
   redevienne une information et non un souvenir.
4. **Ajouter une intégration continue minimale**, sans Rust : audit, tests et build sur chaque pull
   request. C'est ce qui rend le portillon obligatoire au lieu de volontaire.
5. **Publier une 1.4.2** avec les correctifs des sept points ci-dessus, ce qui éprouve au passage la
   chaîne de mise à jour signée de bout en bout. Cette chaîne n'a jamais servi pour un vrai utilisateur.
6. **Puis reprendre les fonctionnalités** : M1 et M2 pour l'assistance, J5e pour l'étagère.

---

## 8. Ce qui a changé cette semaine, en une ligne chacun

- Le portillon de sortie existe, et il attrape des défauts que personne ne voyait.
- La compilation Rust réelle a eu lieu, puis la mémoire de LLVM a été domptée.
- Le journal applicatif raconte désormais le démarrage et l'arrêt, au lieu de se taire.
- Cinq défauts d'usage corrigés, dont la saisie impossible dans le notch.
- La chaîne de signature réparée, et son piège principal désamorcé.
- La première version publiée.
