# Ce qu'il reste à corriger, à ajouter, à améliorer

Liste établie après la 1.4.1. Chaque ligne porte une lettre d'effort : **S** moins d'une heure,
**M** une demi-journée, **L** une journée ou plus. Rien ici n'est obligatoire pour que
l'application fonctionne : ce sont les écarts entre « ça marche » et « ça fait fini ».

---

## 1. Tes trois points, d'abord

### L'installeur

Tu as raison, et le problème n'est pas seulement cosmétique. Trois choses, par ordre d'importance.

**a. Il n'est pas signé.** `certificateThumbprint` est vide dans `tauri.conf.json`, et aucun
`signtool` n'intervient dans `release.ps1`. Résultat : Windows affiche « Windows a protégé votre PC »
et « Éditeur inconnu » à quiconque télécharge l'exécutable. C'est le premier contact avec
l'application, et il ressemble à une alerte de sécurité. Aucun travail visuel ne compense cela.
Deux voies : un certificat de signature de code (OV, moins cher, réputation à construire ; EV, plus
cher, confiance immédiate) ou un service de signature dans le nuage (Azure Trusted Signing).

**b. Il est en anglais seulement.** L'installeur maison ne contient aucune gestion de langue : ses
libellés sont écrits en dur, en anglais, dans `installer-app/src/App.tsx`. Une application bilingue
qui s'installe en anglais, c'est une couture visible. De plus, le paquet NSIS n'a pas de champ
`languages` : il s'installera en anglais par défaut, quoi qu'il arrive.

**c. Il ne ressemble pas à Windows 11.** Il est propre, mais il a l'air d'un site web posé dans une
fenêtre. Ce qui manque, concrètement : les coins arrondis et l'ombre d'une fenêtre moderne, un fond
qui prend la couleur d'accentuation du système, la police Segoe UI Variable, et surtout un vrai
déroulé d'étapes (copie des fichiers, création du raccourci, enregistrement du désinstalleur) au lieu
d'une barre qui avance sans dire ce qu'elle fait. Le petit écran « pourquoi désinstallez-vous » est
une bonne idée, à garder.

### Le thème « verre »

`liquid` n'est pas un verre, c'est du plastique fumé, et il y a une raison mesurable : son opacité
est fixée à **0,66** parce qu'un test de contraste (`scripts/theme.test.ts`) refuse en dessous, le
texte blanc devant rester lisible sur un fond blanc. Un vrai verre serait à 0,25. Le compromis est
donc assumé dans le code, mais le rendu en souffre.

Ce qui le rendrait crédible sans casser l'accessibilité :

| Amélioration | Effet | Effort |
|---|---|---|
| Liseré en dégradé sur le bord supérieur, sombre en bas | Le cerne lumineux d'une tranche de verre | S |
| Voile spéculaire en diagonale, très faible alpha | La réflexion qu'on attend d'une surface polie | S |
| `saturate()` poussé plus loin que le `blur()` | Un verre colore ce qu'il laisse passer | S |
| Ombre intérieure en haut du panneau | L'épaisseur de la matière | S |
| Grain fin (bruit SVG en fond, opacité 0,02) | Supprime l'aspect plastique lisse | M |
| Assombrir le texte derrière un scrim local au lieu d'opacifier tout le panneau | Rendrait possible un verre à 0,45 réellement transparent | M |

La réfraction, elle, reste hors d'atteinte : `backdrop-filter: url()` n'existe pas dans WebView2. On
peut imiter, pas reproduire.

### L'icône

Regardé de près : la mascotte occupe **environ 57 % de la largeur** du carré, avec de grandes marges
vides. Sur une tuile de 256 px, c'est correct. Sur une icône de barre des tâches à 32 px, ou à 16 px
dans la liste des programmes, la tête devient un pâté blanc et les yeux se referment.

Trois corrections, par ordre d'impact :

1. **Deux maîtres, pas un.** Une icône détaillée (marges actuelles, pour 256 px et au-delà) et une
   icône simplifiée pour 16, 24 et 32 px : tête plus large, yeux plus gros, moustaches et bouche
   supprimées, contour conservé. Windows choisit la bonne taille, il faut lui donner le bon dessin.
2. **Agrandir la mascotte à 78 ou 82 %** dans le maître principal. La règle des icônes Windows est
   plus généreuse que celle des logos d'application.
3. **Un liseré clair sur la tuile sombre.** Le fond de la tuile est `#111318` : sur une barre des
   tâches sombre, la tuile disparaît et seule la tête blanche flotte. Un filet de 1 px à 8 % de blanc
   rétablit la forme.

---

## 2. Défauts connus, à corriger

| # | Défaut | Détail | Effort |
|---|---|---|---|
| 1 | Barre de progression du lecteur | Signalée sur capture, symptôme exact à préciser | S |
| 2 | Listes de réglages coupées en bas | Dock et Notch, dernier réglage rogné | S |
| 3 | Bouton des icônes cachées du Dock | Échoue en silence, journalise chaque étape, la cause reste inconnue | M |
| 4 | Balayage des fenêtres | Le notch ne doit pas devenir une cible de dépôt sur tout l'écran | M |
| 5 | Minuteur et veille | Non vérifié : deux minutes de veille doivent avancer le décompte | S |
| 6 | Paroles sur piste qui dérive | Non vérifié sur un vrai morceau | S |
| 7 | Personnage | Clignement, regard, endormissement, et rendu quand les animations système sont coupées | S |

---

## 3. Finitions visuelles

| # | Sujet | Ce qui manque | Effort |
|---|---|---|---|
| 8 | Recherche dans les réglages | 693 clés, huit onglets : un champ de filtre serait le meilleur ajout de la version suivante | M |
| 9 | Cohérence des états vides | Chaque panneau devrait dire quelque chose quand il n'a rien à montrer, dans la même langue visuelle | M |
| 10 | Transitions entre onglets | Aujourd'hui le contenu se remplace d'un coup | S |
| 11 | Anneaux de focus | Navigation au clavier dans les réglages : visible, homogène, jamais supprimé | S |
| 12 | Contraste élevé Windows | Aucune prise en charge du mode contraste forcé, qui écrase les couleurs personnalisées | M |
| 13 | Aperçu des huit presets | Le contrôle visuel n'a jamais eu lieu ; un rendu miniature fidèle éviterait les surprises | M |
| 14 | Captures du README | Toujours celles de l'ancien nom, en attente depuis la phase 1 | S |

---

## 4. Robustesse et dette technique

| # | Sujet | Détail | Effort |
|---|---|---|---|
| 15 | **Le portillon ne couvre pas le Rust** | La CI vérifie le TypeScript seulement. Un `cargo check` sur un runner Windows coûterait vingt minutes par poussée : à faire une fois par nuit, ou à la demande | M |
| 16 | **Aucun test Rust** | 440 tests, tous en TypeScript. `utils.rs`, `state.rs` et les analyseurs de commandes système n'ont rien | L |
| 17 | **35 commandes Tauri jamais appelées** | 130 enregistrées, 95 utilisées. Surface d'attaque et poids mort | M |
| 18 | **161 clés de traduction mortes** | 693 déclarées, 532 utilisées. L'audit les tolère, personne ne les relit | S |
| 19 | **Deux fichiers de verrouillage** | `bun.lock` et `package-lock.json` coexistent. En garder un, sinon les versions divergent silencieusement | S |
| 20 | Fins de ligne | `.gitattributes` avec `* text=auto eol=lf` supprimerait les faux `Cargo.toml` modifiés | S |
| 21 | Journal applicatif | Aucune rotation : `islet.log` grossira indéfiniment | S |
| 22 | Plantage du Rust | Que voit l'utilisateur si le backend panique ? Aujourd'hui, probablement rien | M |
| 23 | Mémoire | Quatre fenêtres WebView, un dock toujours vivant : aucune mesure publiée | M |

---

## 5. Distribution

| # | Sujet | Pourquoi | Effort |
|---|---|---|---|
| 24 | **Signature de code** | Voir section 1a. Le seul point qui change vraiment l'expérience du premier contact | L |
| 25 | **Mise à jour jamais éprouvée** | Aucune version n'a encore été livrée par-dessus une installation existante. Une 1.4.2 le fera | S |
| 26 | Notes de version dans l'application | L'utilisateur ne sait pas ce qui a changé après une mise à jour | M |
| 27 | winget | `winget install Islet` vaut mieux qu'un lien de téléchargement pour un public technique | M |
| 28 | Page de téléchargement | Aujourd'hui un README et une release GitHub. C'est suffisant, ce n'est pas accueillant | M |
| 29 | Retour arrière | Si une mise à jour casse l'application, aucun moyen de revenir à la version précédente | M |

---

## 6. Fonctionnalités déjà décidées, en attente

| # | Sujet | Note | Effort |
|---|---|---|---|
| 30 | M1, proposer une commande | Troisième tâche de l'assistance, jamais exécutée automatiquement | M |
| 31 | M2, clé d'un fournisseur distant | Dans le trousseau Windows, jamais dans `settings.json` | M |
| 32 | J5e, glisser un fichier hors de l'étagère | Dépend de `startDrag`, à éprouver | M |
| 33 | I8, presets utilisateur | Chargés depuis le profil, sans écraser les huit livrés | M |
| 34 | L4, rappels de contexte | Les notes du panneau dev racontées par Is, avec délais de répétition | M |

---

## 7. Ce que je ne recommande pas

- **Un site web dédié** avant que winget et la signature n'existent. Un site qui pointe vers un
  exécutable non signé ne fait que rendre l'alerte plus visible.
- **Reproduire la réfraction du verre.** WebView2 ne sait pas le faire, et les contournements coûtent
  cher pour un gain nul hors capture d'écran.
- **Un système de thèmes communautaire** avant d'avoir une base d'utilisateurs. I8 suffit.
- **Des tests d'interface complets.** Ils sont lents et fragiles ; les sept vérifications manuelles
  de la section 2 rapportent davantage.
- **Le mode sombre forcé pour les overlays.** Windows le fait déjà mal, et le résultat serait pire
  que l'absence.

---

## 8. Ordre proposé

**Avant la 1.4.2**, une demi-journée : les défauts 1 et 2, `.gitattributes`, les deux fichiers de
verrouillage, la rotation du journal. Puis publier, ce qui éprouve la mise à jour signée.

**Ensuite, une journée**, pour l'effet le plus visible : la signature de code, le liseré et le voile
du thème verre, et les deux maîtres d'icône.

**Puis, une semaine** : l'installeur bilingue et habillé comme Windows 11, la recherche dans les
réglages, le balayage des fenêtres, et un contrôle du Rust une fois par nuit dans la CI.

**Enfin**, les fonctionnalités en attente, M1 et M2 d'abord.

---

## 9. Une remarque qui vaut plus que les trente-quatre lignes

Les trois points que tu as vus à l'œil nu ne sont pas dans la liste des bugs. Ce sont des questions de
**finition**, et elles échappent à l'audit comme aux tests : aucun script ne dira jamais qu'un verre a
l'air faux ou qu'une icône est trop petite.

Ce qui manque au projet, ce n'est donc pas un contrôle de plus, c'est un **moment de relecture
visuelle** avant chaque publication : trois captures, l'installeur, l'icône à 32 px, cinq minutes. À
faire une fois par version, pas à automatiser.
