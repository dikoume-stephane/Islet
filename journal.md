# 📓 JOURNAL — Projet Islet (transition Nectar → Islet)

Format : entrées datées, plus récent en haut.
Sections par entrée : **Fait** · **Constats** · **Bloqué** · **À faire ensuite**.

---

## 2026-11-12 (15) — Cinq bugs vus à l'usage, et ce qu'ils avaient en commun

**Fait**
- **On ne pouvait rien taper dans le notch.** `WS_EX_NOACTIVATE` est re-stampé en permanence par
  `re_assert_topmost` et par le hitbox : le notch ne vole jamais le focus, c'est voulu, mais aucune
  frappe ne lui parvient non plus. Nouvelle commande `set_notch_activatable` : le style tombe pendant
  qu'un champ est ouvert, revient aussitôt refermé. Le drapeau `NOTCH_ACTIVATABLE` empêche le hitbox de
  le remettre pendant la saisie.
- **Tous les boutons avaient le même texte.** Le `title` du message manqué était posé sur la barre
  entière, donc le titre natif de Windows s'affichait sur n'importe quel survol et par-dessus
  l'interface. Le libellé passe en `aria-label` : les lecteurs d'écran le lisent, Windows n'en fait plus
  une bulle blanche. Les cinq boutons ronds du centre de contrôle reçoivent leur propre libellé.
- **La croix des conseils était un carré blanc.** `.assistant-tip-close` n'existait pas dans la
  feuille de style : le navigateur dessinait son bouton par défaut.
- **Les phrases longues sortaient des panneaux.** `.islet` porte `white-space: nowrap` pour l'heure, et
  tout le texte des panneaux en héritait. Les blocs de prose reprennent le retour à la ligne.
- **L'étagère ne réagissait pas à un fichier approché.** Deux causes cumulées : rien n'ouvrait le
  panneau à l'approche, et une fenêtre transparente à la souris n'est pas une cible de dépôt pour OLE.
  Le hitbox considère désormais qu'un bouton gauche enfoncé n'est pas un simple survol : le notch
  redevient interactif pendant un glisser, même replié.

**Constats**
- Quatre de ces cinq bugs viennent du même endroit : le notch est une fenêtre qui ne veut pas exister
  pour Windows. Pas de focus, pas d'activation, transparente à la souris. Chaque fois qu'on lui demande
  un comportement de fenêtre normale (saisir, recevoir un fichier, afficher une bulle), il faut le lui
  rendre explicitement, puis le lui retirer.
- Un bouton sans libellé n'est pas seulement une gêne : il hérite du texte du parent, et le `title` du
  parent parlait à sa place.
- Le bouton des icônes cachées échoue toujours en silence ; il écrit maintenant dans le journal à
  chaque étape franchie.

**Bloqué**
- Rien de tout cela n'est vérifié à l'écran : pas de navigateur ici. Le compilateur est le juge du
  reste.

**À faire ensuite**
- Faire relire les cinq correctifs à l'usage, puis reprendre la sortie.
## 2026-11-09 (14) — LLVM manque de mémoire sur le crate Islet lui-même

**Symptôme** — Deuxième `bun run tauri dev` : `rustc-LLVM ERROR: out of memory`, `Allocation failed`,
puis `rustc` tué avec `STATUS_STACK_BUFFER_OVERRUN` (0xc0000409). La première compilation, elle, avait
abouti en une minute : le même code, la même machine, deux résultats.

**Diagnostic** — Le correctif du 2026-11-04 ne visait que les dépendances :
`[profile.dev.package."*"] debug = false`. Le crate Islet, lui, restait en `-C debuginfo=2` (visible
dans la ligne de commande citée par l'erreur). Or c'est le plus gros objet unique du build : seize mille
lignes, plus les 129 commandes dépliées par `generate_handler!`. Selon ce que la machine a de libre au
moment du codegen, ce seul processus passe ou casse. Un build qui réussit une fois n'est pas un build
qui réussit toujours.

**Correctifs**
1. `[profile.dev] debug = 1` : les tables de lignes restent, les variables locales disparaissent. Une
   panique dit toujours son fichier et sa ligne, ce qui est exactement ce dont le journal a besoin.
2. `[profile.dev] incremental = false` : le cache de requêtes d'`incremental` pèse plusieurs gigaoctets
   sur un crate de cette taille, et il ne sert que si l'on modifie `src-tauri` lui-même.
3. README et RELEASE.md : dire que le profil est déjà réglé, et renvoyer au nettoyage quand l'erreur
   vient de la compilation et non de l'exécution.

**Constats**
- Le message d'erreur du jour ne parle pas de l'application mais de `rustc`. Confondre les deux fait
  chercher un bug dans le code alors que la machine a seulement manqué de place.
- `incremental = false` rallonge chaque compilation du crate Islet d'une poignée de secondes. C'est le
  prix d'un build qui ne dépend plus de ce qui tournait à côté.

**Bloqué**
- La compilation n'a pas été retentée : elle se fait sur la machine Windows.

**À faire ensuite**
- Relancer. Si la mémoire manque encore, `scripts/dev.ps1 -Clean` puis `-Jobs 1`.

---

## 2026-11-09 (13) — Première compilation réelle, et un exécutable qui sort en code 1

**Fait**
- Le portillon de sortie (`scripts/audit.mjs`, `npm run prerelease`) et `RELEASE.md`.
- `reset_settings` n'était enregistré qu'une fois dans `generate_handler!` : un doublon silencieux,
  retiré.
- Le commerce de la première machine Windows : **`src-tauri` compile**. 1 min 00 s, une seule
  remarque, `unused import: HGLOBAL` dans `clipboard.rs`, corrigée.
- Trace de démarrage : `startup: init`, `startup: single instance mutex acquired`,
  `startup: building application`, `setup: begin`, `setup: done`, `run: ready`, `run: exit requested`,
  `run: exit`, `run: window <label> destroyed`, `quit: restoring taskbar and exiting`,
  `quit: relaunching`, et le cas de la webview qui meurt dans les trente secondes.

**Constats**
- Un exécutable qui sort en code 1 ne laisse **rien** dans le terminal : pas de panique, pas de
  message, juste `process didn't exit successfully`. C'est le pire cas à diagnostiquer, et c'est
  exactement celui qu'on a eu. La sortie du 2026-11-04 venait de la mémoire ; ici la compilation
  aboutit.
- La cause probable est une tuerie, pas un arrêt propre : `TerminateProcess(handle, 1)` et `taskkill`
  produisent ce code, alors que `handle.exit(0)` et une panique produisent 0 et 101. Rien ne
  l'affirme pourtant, et c'est bien le problème.
- Le journal applicatif (`%APPDATA%\com.2DS.islet\logs\islet.log`) existait mais ne disait rien du
  démarrage : `main.rs` n'y écrivait jamais. Il ne pouvait donc pas répondre à la seule question
  posée. C'est cette lacune qui est corrigée, pas le symptôme.

**Bloqué**
- La cause exacte de la sortie en code 1 n'est pas établie : il faut relancer et lire le journal.

**À faire ensuite**
- Relancer `bun run tauri dev`, lire `islet.log`. Si `run: exit requested` apparaît, c'est un arrêt
  demandé ; si `webview died right after launch` apparaît, c'est WebView2 ; si le journal s'arrête
  net après `setup: done`, c'est une tuerie extérieure.

---

## 2026-11-05 (12) — J6 clos, et J7 entamé : l'assistance IA

**Fait**
- **J6 est clos.** La Shelf (C2) et les to-dos du jour (C5) étaient livrés en J4 ; le suivi d'hydratation
  (C4) est écarté à la demande. Il n'y avait donc rien à coder, seulement à le dire.
- `src/lib/ai.ts` : adresse normalisée et complétée, repérage du fournisseur local, bornage du texte
  envoyé, corps de requête compatible OpenAI, lecture tolérante de trois formes de réponse. **19 tests**.
- `src-tauri/src/ai.rs` : `ai_post(url, body)`, un POST borné, schéma http ou https seulement, soixante
  secondes de délai, code et corps rendus bruts.
- `dev_git_diff` : `git diff --stat HEAD`, avec les mêmes gardes que `dev_git_status` (extraction d'un
  `checked_folder` commun, les deux commandes refusent la même chose).
- Panneau du notch : deux questions (« expliquer l'échec » après un build raté, « résumer les
  changements » quand la branche est sale) et une pastille qui dit si le modèle est sur la machine.
- Onglet Is : réglage éteint par défaut, paragraphe de consentement, adresse, modèle, bouton de test.

**Constats**
- Le module Rust ne décide de rien, comme `dev.rs` : il poste un corps déjà construit et rend la réponse.
  C'est ce qui permet de vérifier toute la logique sans machine ni serveur de modèle.
- Ce qui part est **la fin** du texte, jamais le début : une erreur de compilation se lit à la dernière
  ligne, et couper au milieu d'une ligne piégerait le modèle. La coupe est annoncée par `[…]`.
- Une adresse illisible est traitée comme **distante**, pas comme locale. Promettre « rien ne sort » sur
  une adresse qu'on n'a pas su lire serait exactement le mensonge que le consentement doit éviter.
- « Résumer un diff » envoie `--stat`, jamais le contenu : un diff complet pèse des mégaoctets et peut
  contenir ce qu'on n'a pas l'intention de sortir de la machine.
- La clé à soi (B14) attend. L'endpoint est réglable, mais garder une clé dans `settings.json` ou dans le
  `localStorage` serait inacceptable : il faut le trousseau Windows, donc une tâche à part.

**Bloqué**
- `ai.rs` n'est pas compilé : pas de toolchain Rust ici. Rien n'a été testé contre un vrai Ollama non plus.

**À faire ensuite**
- M1 « proposer une commande », M2 la clé à soi, M3 la vérification Windows.

---

## 2026-11-05 (11) — J5, le mode focus (P3-B11), et J5 terminé

**Fait**
- `src/lib/focus.ts` : les trois durées (25, 45, 90), les bornes (5 à 180 minutes), la marque de session
  relue du stockage local, et la règle qui décide si une session est en cours. **12 tests**.
- `src/hooks/useFocus.ts` : la session **marque le minuteur du notch** au lieu d'en créer un second. Un
  seul décompte dans l'app, celui qui survit déjà à une mise en veille et à un redémarrage.
- `src/App.tsx` : pendant la session, le conseil d'Is n'est plus affiché, la pastille d'alerte ne
  s'allume plus, et `triggerEventPeek` refuse de s'exécuter. Une seule garde, donc tous les aperçus s'y
  plient d'un coup. Le bouton du centre de commandes porte le temps restant.
- Réglages : `islet-focus-minutes`, trois boutons dans l'onglet Notch.

**Constats**
- Le piège était de croire qu'il fallait un deuxième minuteur. Une session n'est pas une horloge, c'est
  une **marque** posée à côté d'une horloge qui existe déjà. Moins de code, et la promesse tient mieux :
  le décompte reste juste après une mise en veille.
- Deuxième piège, la pause. Une session mise en pause doit rester silencieuse : reprendre ne doit pas
  rouvrir les vannes au milieu hasardeux d'un travail commencé. `focusActive` accepte maintenant
  `paused`, et un test le dit.
- Troisième, la marque orpheline. Une valeur laissée dans le stockage après un plantage ne doit pas
  rendre l'app muette pour toujours : sans minuteur qui tourne ou qui est en pause, il n'y a pas de
  session.
- Le bouton du centre de commandes était un faux Ne pas déranger : il basculait un booléen que personne
  ne lisait. Il fait maintenant quelque chose, et il le dit.

**Bloqué**
- Rien de compilé côté Rust cette fois : B11 est entièrement côté front.

**À faire ensuite**
- J5 est terminé. La suite du ROADMAP : J6 (déjà couvert par la Shelf et les to-dos), puis J7.

---

## 2026-11-05 (10) — J5, le build watcher (P3-B10)

**Fait**
- `src-tauri/src/dev.rs` : `dev_run_build(folder, command)` lance la commande par `cmd /C` dans le
  dossier suivi, mêle stdout et stderr au fil de l'eau (deux fils, sinon un tuyau plein bloque
  l'enfant), arrête tout au bout de trois minutes, et rend code, durée et fin de sortie.
- `src/lib/dev.ts` : `buildVerdict` (arrêtée, réussie, échouée), `buildTail` (couleurs ANSI retirées,
  lignes vides jetées, quatre dernières lignes gardées), `formatDuration` (« 850 ms », « 3.4 s »,
  « 48 s », « 2 min »). **12 tests**.
- `useDev` + `NotchDev` : bouton d'exécution, commande tronquée, pastille de verdict et durée, fin de
  la sortie en petits caractères ; rien ne part sans un clic, rien ne se relance tout seul.
- Réglages : `islet-dev-build`, enregistrée au blur ou sur Entrée, pas à chaque frappe.

**Constats**
- Le seul vrai piège était le tuyau. Lire la sortie après `wait()` sur un enfant bavard remplit le
  tampon et bloque les deux processus : deux fils de lecture, joints avant de lire le résultat.
- `slice(-0)` rend tout le tableau. Un test sur `buildTail(lines, 0)` l'a attrapé ; c'est le genre de
  défaut qui ne se voit qu'une fois, à la relecture d'un écran vide.
- Décision : trois minutes de plafond. Assez pour un `cargo check` à froid, trop court pour laisser
  un verrou de répertoire de build immobiliser le panneau.

**Bloqué**
- `dev.rs` toujours non compilé : pas de toolchain Rust ici. À vérifier sur Windows, avec la question
  ouverte de savoir si `cmd /C` trouve `bun` comme le terminal de l'utilisateur.

**À faire ensuite**
- Le focus guard (P3-B11), dernier morceau de J5.

---

## 2026-11-05 (9) — J5, première moitié : les signaux du développeur

**Fait**
- `src/lib/dev.ts` : interprétation de `netstat -ano -p TCP` (IPv4, IPv6, boucle locale, en-têtes
  traduits), suivi de l'âge des ports, lecture des trois sorties de git, remarques de contexte, format
  d'âge. **34 tests**.
- `src-tauri/src/dev.rs` : `dev_git_status` (trois commandes en lecture seule, `--no-optional-locks`,
  refus si le dossier n'est pas un dépôt) et `dev_listening_ports` (sortie netstat bornée, brute).
- `useDev` + `NotchDev` : panneau du notch avec branche, pastilles sale / avance / retard, remarques,
  ports avec propriétaire, âge, exposition réseau et bouton de libération.
- Réglages onglet Notch : `islet-dev-enabled`, `islet-dev-folder` avec sélecteur de dossier natif.
- P3-B8, P3-B9 et P3-B12 livrés. Restent B10 (build watcher) et B11 (focus guard).

**Constats**
- Le partage Rust/TypeScript n'est pas une habitude, c'est une nécessité ici. Un parseur de `netstat`
  est exactement le code qui se trompe en silence sur une ligne IPv6, et qui ne **compile** que sur
  Windows. En le déplaçant côté TypeScript, il se vérifie sur des lignes figées : les en-têtes sont
  traduits par Windows, les lignes ne le sont pas, donc l'ancrage est sur `LISTENING` et non sur une
  position de colonne.
- `git rev-list --count --left-right` répond « derrière puis devant ». L'inverser aurait donné un
  panneau qui ment sans que personne ne s'en aperçoive ; c'est un test.
- Le workspace m'a fait perdre une dizaine de minutes : un `</div>` inséré un peu trop haut a avalé la
  fermeture du groupe voisin, et TypeScript signalait l'erreur trois cents lignes plus loin. Leçon :
  quand on insère un groupe de réglages, vérifier la pile des balises, pas seulement le message.

**Bloqué**
- `dev.rs` n'est pas compilé ici : pas de toolchain Rust.

**À faire ensuite**
- Sur Windows : choisir un dépôt, lire la branche et le retard, libérer un port de test ; vérifier que
  `netstat` reste en anglais sur un système français.
- J5 reste : build watcher (B10), focus guard (B11), puis brancher les remarques sur `pickTip`.

---

## 2026-11-05 (8) — J3 : le personnage

**Fait**
- `src/lib/character.ts` : réducteur d'humeur (`reduceIs`), cadres de dessin (`frameFor`), regard en
  direction unitaire (`gazeVector`), clignement et sommeil. **39 tests**.
- `src/components/IsSprite.tsx` : la mascotte en SVG, six humeurs plus le clignement, souffle, reflets,
  halo coloré, `prefers-reduced-motion` respecté.
- `AssistantTip` : Is prend le visage du conseil et suit le curseur du notch.
- Onglet Is : bloc « Le personnage », six états à essayer, endormissement après 45 s.
- Accueil : la mascotte remplace le logo sur l'étape du nom.

**Constats**
- Le sprite en image (le PNG du logo) ne pouvait pas avoir d'yeux qui suivent : il fallait dessiner. Le
  SVG a un second avantage, celui de la mise au point : j'ai pu rasteriser les essais hors navigateur
  (`@resvg/resvg-js`) et **regarder** le personnage aux tailles réelles, ce qui a tué deux fausses bonnes
  idées (une ligne de mer qui s'emmêlait avec la bouche, un hémisphère trop dentelé).
- Le regard est un vecteur **unitaire** dont la norme croît avec la distance et s'annule au-delà de
  240 px. Un personnage qui suit le curseur d'un bout à l'autre de l'écran ne regarde personne.
- Une humeur qui ne répond à aucun événement est un mensonge animé : chaque état a son déclencheur, et
  le réducteur refuse de changer le visage d'un conseil qu'on est en train de lire.

**Bloqué**
- Rien côté Rust : chantier entièrement interface.

**À faire ensuite**
- Vérifier sur Windows le rendu et le mouvement réduit.
- Suite du ROADMAP : J5 (git, ports, build, focus), puis J6, J7.

---

## 2026-11-05 (7) — J4 : la pilule minimale

**Fait**
- `src/lib/pill.ts` : quand le réglage s'applique, largeur et modules du notch replié. **21 tests**
  (`npm run test:pill`).
- `App.tsx` : le notch replié passe de 140 à 96 pixels, et perd visualiseur et pochette tant qu'on ne
  le survole pas. Le calcul de largeur sort de `getDynamicWidth`, où il était noyé.
- Réglage `islet-notch-pill-minimal`, **éteint par défaut**, onglet Notch.

**Constats**
- La question n'était pas la largeur, c'était **quand** le réglage s'applique. Réduire le notch pendant
  qu'on le survole aurait donné une forme qui ne s'ouvre jamais : le survol, un conseil, une alerte ou
  un panneau ouvert reprennent donc la main, et le test le vérifie mode par mode.
- Deuxième piège de géométrie : le visualiseur ne compte dans la largeur **que lorsqu'il bouge**. Au
  repos ses barres retombent ; les compter quand même laissait 30 pixels de vide. Le test compare les
  seize combinaisons de musique, lecture, visualiseur et pochette.
- Éteint par défaut, volontairement : changer la forme du notch sous les pieds de quelqu'un qui a réglé
  ses widgets serait une régression déguisée en finition.

**Bloqué**
- Rien de neuf côté Rust : ce chantier est entièrement côté interface.

**À faire ensuite**
- Sur Windows : activer le réglage, lancer un morceau, vérifier que le notch replié ne montre que
  l'heure, puis le survoler.
- J4 est complet côté code (`C9`, `C1`, `C2`, `C3`, `C5`, `C6`, `C8` ; `C4` écarté). Suite du ROADMAP :
  J3, puis J5.

---

## 2026-11-05 (6) — J4 : les témoins du clavier

**Fait**
- `src/lib/keyboard.ts` : table des langues Windows, lecture défensive de l'événement, détection de ce
  qui a changé, choix des pastilles. **19 tests** (`npm run test:keyboard`).
- `src-tauri/src/keyboard_indicators.rs` : les trois touches lues depuis le fil du crochet, garde
  anti-répétition, sondage de la disposition au premier plan toutes les 250 ms, rien n'est lu quand le
  réglage est coupé.
- Crochet clavier : Verr Maj, Verr Num et Défil remarqués **sans jamais bloquer la touche**.
- `Overlay.tsx` : surcouche de 1,5 s au bas de l'écran, seule la pastille qui vient de changer est mise
  en avant.
- Réglage `islet-keyboard-indicators-enabled` (actif par défaut) dans l'onglet Surcouches.

**Constats**
- Le piège central est un détail de documentation Win32 : `GetKeyState` répond pour le fil appelant. Lu
  depuis le fil de sondage, il aurait rendu un état figé, et le bogue aurait été difficile à croire
  (« le voyant ne suit pas »). D'où la séparation : touches dans le crochet, langue par sondage.
- Le crochet voit la touche avant Windows, donc l'état lu est l'ancien : c'est une chance, pas une gêne,
  puisque le nouveau est son inverse et qu'on peut l'annoncer tout de suite.
- La table des langues n'a pas sa place en Rust : elle se serait trompée en silence. Elle est en
  TypeScript, testée, et une langue inconnue ne s'affiche pas plutôt que d'afficher « 047F ».

**Bloqué**
- Pas de toolchain Rust : `keyboard_indicators.rs` est relu, pas compilé.

**À faire ensuite**
- Sur Windows : compiler, appuyer sur Verr Maj dans une autre application, puis Alt+Maj.
- J4 : pilule minimale (P3-C8), dernier chantier de la parité Nusa.

---

## 2026-11-05 (5) — J4 : la to-do du jour

**Fait**
- `src/lib/todo.ts` : saisie d'une heure en langage naturel, retard, sections, prochaine échéance,
  rappels, report au lendemain, relecture tolérante. **40 tests** (`npm run test:todo`).
- `src-tauri/src/todo.rs` : six commandes, fichier `todos.json`, plafond de 200 qui oublie d'abord les
  tâches faites les plus anciennes, titres nettoyés et bornés des deux côtés.
- `useTodos` : le backend renvoie la liste entière après chaque commande, jamais un différentiel. Rien
  n'est lu ni écrit quand le réglage est coupé.
- `NotchTodos` : ajout en deux champs (intitulé, heure), sections retard / aujourd'hui / à venir /
  terminées, coche, report, suppression, état vide qui explique le geste.
- Rappel : une échéance atteinte ouvre le panneau une fois, dans une fenêtre d'une heure, sans son.
- Réglage `islet-todo-enabled` (actif par défaut) dans l'onglet Notch.

**Constats**
- Le test a attrapé deux vrais trous avant l'écran : « 14h » n'était pas reconnu (la regex exigeait deux
  chiffres après le `h`) et « demain demain » passait pour une heure valide.
- Une échéance illisible dans le fichier ne fait pas perdre la tâche : on garde le titre, on oublie
  l'heure. Perdre une tâche pour un champ de date abîmé serait pire que perdre la date.
- L'hydratation (P3-C4) a été écartée à la demande de l'utilisateur, avant ce chantier.

**Bloqué**
- Toujours pas de toolchain Rust : `todo.rs` est relu, pas compilé.

**À faire ensuite**
- Sur Windows : compiler, créer une tâche dans deux minutes, voir le notch s'ouvrir seul.
- J4 : indicateurs clavier (P3-C6), pilule minimale (P3-C8).

---

## 2026-11-05 (4) — J4 : chrono et minuteur libre

**Fait**
- `src/lib/clock.ts` : modèle du minuteur (cible absolue, pause, reprise, jauge), du chronomètre
  (départ, tours) et relecture validée du stockage. **47 tests** (`npm run test:clock`).
- `useCountdown` : l'intervalle ne sert qu'à redessiner, l'état rangé est une cible. Relu du
  `localStorage` au montage : un minuteur en cours survit à un redémarrage.
- `useStopwatch` : même ancrage, tours persistés, `clearLaps` en plus.
- `NotchClock` : jauge de progression, « Se termine à 14:32 », état « Temps écoulé », raccourcis
  1/3/5/10/25/50, liste complète des tours avec écarts et meilleur/pire, effacement des tours.
- Notch compact : un minuteur en pause reste affiché au lieu de rendre la place à l'horloge.
- Le bouton principal est inerte sans minuteur : ce sont les raccourcis et la saisie libre qui en créent un.

**Constats**
- L'ancien décompte était un `setInterval` de 1000 ms qui retirait une seconde. Il dérivait et
  s'arrêtait à la mise en veille. Le remplacer par une cible absolue supprime les deux défauts d'un coup
  et rend la persistance triviale.
- `formatCountdown(Number.NaN)` rendait `NaN:NaN` : trouvé par un test, pas à l'œil. Garde ajoutée.
- Un ex æquo de meilleur tour (deux tours identiques) est départagé par le premier arrivé ; c'est
  verrouillé par un test pour que la règle ne bouge pas par accident.

**À faire ensuite**
- Sur Windows : lancer un minuteur, mettre le PC en veille deux minutes, vérifier le réveil.
- J4 : hydratation (P3-C4), to-do (P3-C5), indicateurs clavier (P3-C6), pilule minimale (P3-C8).

---

## 2026-11-05 (3) — J4 : l'étagère à fichiers

**Fait**
- `src/lib/shelf.ts` : nature d'un fichier par extension, unités de taille traduisibles, dédoublonnage
  insensible à la casse, plafond de 24, ordre qui repousse les fichiers manquants en bas, chemins
  abrégés. **41 tests** (`npm run test:shelf`).
- `src-tauri/src/shelf.rs` : `shelf_list`, `shelf_add`, `shelf_remove`, `shelf_clear`, persistance
  `shelf.json`, `missing` et `size` recalculés à chaque lecture.
- `tauri.conf.json` : `dragDropEnabled: true` sur la fenêtre principale. C'était la condition pour
  recevoir de vrais chemins ; `false` ne livre que des objets `File` sans chemin exploitable.
- `useShelf` : écoute `onDragDropEvent`, insertion optimiste puis liste autoritaire, écouteur
  enregistré **seulement** quand le réglage est actif.
- `NotchShelf` : mode de notch 340 × 300, icône par nature, taille lisible, ouverture au clic,
  révélation dans l'Explorateur, retrait, compteur ambre des fichiers manquants, état vide qui
  explique le geste.
- Un dépôt terminé ouvre le panneau de lui-même ; en mode `peek`, il déclenche aussi un peek.
- Réglages : `islet-shelf-enabled` (actif par défaut) dans l'onglet Notch.

**Constats**
- Le dock réordonne ses icônes avec `framer-motion Reorder`, donc en événements pointeur : activer le
  gestionnaire de dépôt OLE sur la fenêtre principale ne le casse pas. Le dock vit de toute façon dans
  sa propre fenêtre.
- `openPath` et `revealItemInDir` sont déjà fournis par `@tauri-apps/plugin-opener`, dont
  `tauri_plugin_opener::init()` est enregistré : aucune commande Rust n'est nécessaire pour ouvrir.
- Le glisser-vers-l'extérieur aurait demandé `tauri_plugin_drag::init()`, impossible à compiler ici.
  Je ne l'ai pas écrit plutôt que de risquer une compilation cassée chez l'utilisateur.

**Bloqué**
- Pas de toolchain Rust dans le sandbox : `shelf.rs` est relu, pas compilé.

**À faire ensuite**
- Sur Windows : vérifier qu'un dépôt sur le notch fonctionne et que le reste de l'écran n'est pas
  devenu une cible de dépôt.
- J4 : chrono/minuteur libre (P3-C3), hydratation, to-do, indicateurs clavier, pilule minimale.

---

## 2026-11-05 (2) — J4 : les paroles synchronisées

**Fait**
- `src/lib/lyrics.ts` : parseur LRC complet (centièmes, millièmes, heures, `mm:ss:xx`, étiquettes
  `[ar:]`, `[offset:]`, plusieurs horodatages par ligne, doublons), ligne courante par recherche
  binaire, cible de seek, progression de ligne, clamp et formatage du décalage, lecture défensive
  des réponses LRCLIB. **60 tests**, `npm run test:lyrics`, branchés dans `npm run test`.
- `src-tauri/src/lyrics.rs` : `lyrics_fetch` (8 s de délai, User-Agent honnête), cache disque
  `lyrics/*.json` avec élagage au-delà de 400 fichiers, refus net si `islet-lyrics-enabled` n'est
  pas `"true"`, `lyrics_clear_cache`, `lyrics_cache_count`.
- `useLyrics` : une requête par morceau, **seulement quand le panneau est ouvert**, position
  extrapolée toutes les 250 ms, décalage persisté dans `islet-lyrics-offset`.
- `NotchLyrics` : mode de notch dédié (340 × 320), ligne courante en gras avec un hairline qui se
  remplit, clic pour se déplacer, `Échap` ferme, squelettes de chargement, états « pas de paroles »,
  erreur avec bouton Réessayer, instrumental, texte non synchronisé.
- Réglages : `islet-lyrics-enabled` (off par défaut) dans l'onglet Notch, note de confidentialité,
  compteur de cache et bouton de purge.
- Réparation du sandbox en début de tour : HEAD revenu sur `3e3af78` par `git reset --mixed` après
  contrôle des empreintes, `npm install`, aperçu 8099 reconstruit et resservi.

**Constats**
- Le corps brut de LRCLIB traverse Rust sans être reparsé : le seul parseur est celui qui est testé.
- `[00:12:40]` est ambigu. Interprété comme `mm:ss:xx` quand le premier champ vaut zéro, `h:mm:ss`
  sinon : c'est le seul arbitrage tenable sur un format que personne ne normalise.
- `MediaInfo` n'expose pas l'album : on n'en envoie pas. Un champ inventé donnerait une fausse
  impression de précision dans l'appariement.
- Le hook de paroles a d'abord été placé avant `isletMode` et `isLyricsMode` : zone morte temporelle,
  build vert mais plantage à l'exécution. Déplacé après la déclaration du mode.

**Bloqué**
- Toujours pas de toolchain Rust dans le sandbox : `lyrics.rs` est relu, pas compilé.

**À faire ensuite**
- Sur Windows : compiler, jouer une piste connue, vérifier le décalage et le seek au clic.
- Poursuivre J4 : file shelf (P3-C2), chrono/minuteur libre (P3-C3), hydratation, to-do,
  indicateurs clavier, pilule minimale.

---

## 2026-11-05 (1) — J4 : le presse-papier de Nusa

**Fait**
- `src/lib/clipboard.ts` : toute la logique qui se teste sans Windows (plafond 60, épingles
  inévincables, recherche accents-insensible, aperçu à 96 caractères, temps relatif,
  tailles, typographie). **31 tests** dans `scripts/clipboard.test.ts`, branchés dans
  `npm run test`.
- `src-tauri/src/clipboard.rs` : veilleur (400 ms sur `GetClipboardSequenceNumber`),
  lecture `CF_UNICODETEXT`, refus des copies marquées privées par un gestionnaire de mots
  de passe, id FNV-1a base36 calculé côté Rust, 9 commandes, 2 événements.
- `src/hooks/useClipboard.ts` et `src/components/NotchClipboard.tsx` : panneau du notch,
  recherche auto-focus, sections Épinglés / Récents, `Entrée` copie le premier résultat,
  `Échap` ferme, flash « Copié » doublé d'une annonce `aria-live`.
- Câblage `App.tsx` : mode `clipboard` dans le cycle de molette, 340 × 384, rayon bas 28,
  rayon identique à l'agenda, retour à `status` à la sortie du survol et quand le réglage
  passe à off.
- Réglages : onglet Notch (`islet-clipboard-enabled`, `islet-clipboard-paste`),
  `useSettings` complété, `SETTINGS.md` documenté.
- Aperçu statique `/home/user/apercu-presse-papier/` (port 8100) : mêmes règles CSS que
  `App.css`, trois surfaces (onyx, liquid, frost clair), FR/EN, recherche et épinglage
  réels sur des données d'exemple.

**Constats**
- Le notch prend le focus dès qu'il s'ouvre : demander `GetForegroundWindow` à ce
  moment-là répond « Islet ». La cible du collage est donc mémorisée au survol **et**
  échantillonnée en continu par le veilleur, qui ne retient que les fenêtres d'un autre
  processus.
- « Désactivé » doit atteindre Rust, pas seulement React : le réglage appelle
  `clipboard_set_recording`, sinon le presse-papier continuerait d'être lu en silence.
- La molette servait à changer de mode ; sans exclure `.clipboard-panel`, une liste de
  soixante entrées aurait été impossible à faire défiler.

**Bloqué**
- Pas de toolchain Rust dans le sandbox : `clipboard.rs` est relu, pas compilé. Le
  collage réel (Ctrl+V simulé, restauration de fenêtre) demande un essai Windows.

**À faire ensuite**
- Compiler sur Windows, essayer un collage dans Notepad, vérifier qu'un gestionnaire de
  mots de passe (Bitwarden, KeePass) n'apparaît pas dans la liste.
- Poursuivre J4 : paroles LRCLIB, file shelf, indicateurs clavier, pilule minimale.

---

## 2026-11-04 (5) — J2 Matière : huit presets, dont Liquid Glass

**Fait**
- `src/theme/presets.ts` : huit presets complets (couleur, alpha, texte, bordure, accent,
  matière) et quatre matières. `resolvePreset()` absorbe les anciennes valeurs `dark` et
  `light`, une valeur inconnue retombe sur `onyx` : **aucune migration de `settings.json`**.
- `src/material.css` : flou variable, liseré spéculaire, reflet, et trois garde-fous
  (`prefers-reduced-transparency`, `prefers-contrast`, `@supports not backdrop-filter`).
- Les surfaces (notch, dock, réglages, agenda) lisent `--islet-material-filter` avec leur
  flou historique en repli, donc rien ne change tant qu'on reste sur Onyx.
- Apparence : la liste déroulante devient une **galerie de swatches** (8 cartes + couleur
  libre + suit Windows). Le thème s'applique immédiatement, sans attendre l'aller-retour
  par `settings-changed`.
- 20 tests (`test:theme`) : migration, bornes d'opacité, et surtout **contraste sur fond
  noir et blanc** pour le texte principal et secondaire.

**Constat 1 — la réfraction SVG ne peut pas marcher**
Le cadrage affirmait que `backdrop-filter: url(#filtre)` fonctionnait sous WebView2 parce
que Chromium. C'est faux : Chromium n'implémente `url()` que pour `filter:`, où il
s'applique à l'élément lui-même et non à ce qui est derrière. Aucune réfraction possible.
Livrer un `feDisplacementMap` inerte aurait été pire que de ne rien livrer.

**Constat 2 — le verre décoratif est illisible**
Premier jet à 42 % d'opacité : texte blanc à 2,4:1 sur un bureau blanc. Les alphas ont
été remontés jusqu'à ce que **chaque** preset passe 4,5:1 sur les deux extrêmes (noir et
blanc), texte principal *et* secondaire. Liquid Glass est à 66 %, Frost à 78 %, Papier à
97 %. Le test refuse tout retour en arrière.

**Non vérifié**
- Rendu réel sur Windows : le sandbox n'a pas de navigateur. L'aperçu
  `/home/user/apercu-themes/index.html` est généré depuis la table de presets, donc il ne
  peut pas mentir sur les couleurs ni sur les contrastes, seulement sur le flou (le
  `backdrop-filter` du navigateur de l'utilisateur n'a pas le même fond).

**À faire ensuite**
- J4 (parité Nusa : paroles LRCLIB, chrono, clavier), puis J3 (personnage d'Is).

---

## 2026-11-04 (4) — Plus de tiret cadratin, et des conseils composés

**Demande** — « n'utilise jamais de tiret cadratin dans l'interface » et « mets l'une
des parties du conseil en marquage ».

**Fait**
- **43 tirets cadratins retirés** des deux dictionnaires, de `App.tsx` (info-bulle
  météo), `Overlay.tsx` (titre de session), `Dock.tsx` (état vide) et `AboutTab`
  (version inconnue). Les remplacements ne sont pas mécaniques : chaque phrase a été
  refaite avec un point, un deux-points ou une parenthèse selon ce qu'elle raconte.
  Un test échoue désormais si un `—` revient dans l'un des deux dictionnaires.
- **`...` → `…`** : « Loading… », « Checking… », et les menus du dock. Le français
  le faisait déjà ; l'anglais avait gardé trois points.
- **Signe moins `−`** (U+2212) sur les boutons de zoom de l'Apparence, qui affichaient
  un cadratin. Ajout des `aria-label` manquants sur ces deux boutons.
- **Conseils d'Is en deux parties** : `TipMessage` porte `titleKey` + `detailKey`
  au lieu d'une clé unique. Le titre (le fait) est en gras blanc, le détail (l'action)
  en 11 px à 62 % de blanc.

**Constat — la règle des 46 caractères était fausse**
Le notch fait 290 px, dont 90 px partent en marges, mascotte, croix et gouttières :
il reste **~200 px**, soit ~33 caractères à 12 px. Les conseils de 40 à 43 caractères
étaient donc déjà tronqués, et le test les validait. Mesure refaite : la composition
passe sur **deux lignes** (12 px gras / 11 px léger), ce qui tient dans la hauteur de
36 px et laisse le titre intact quoi qu'il arrive.

**Pourquoi ne pas avoir gardé une seule ligne** — à 200 px, « Mémoire à 96 % ·
sauvegardez votre travail » (42 car.) se coupait avant « travail ». Réduire la copie
à 33 caractères aurait donné des conseils robotiques. Deux lignes coûtent 1 px de
gouttière et règlent le problème définitivement.

**À faire ensuite**
- Relire le rendu réel du notch sur Windows (le sandbox n'a pas de navigateur).
- La suite de la Phase 3 : J2 Matière, puis J4, J3, J5, J6, J7.

---

## 2026-11-04 (3) — J8 terminé : l'interface entière parle français et anglais

**Fait**
- **460 clés** dans `en.ts` et dans `fr.ts`, aucune dupliquée, aucun `{{placeholder}}`
  orphelin. `fr.ts` reste typé sur `keyof typeof en` : une traduction oubliée ne compile pas.
- Migrés dans ce lot : `NotchTab` (dont les six guides fournisseurs CalDAV et les comptes
  CalDAV, ~70 clés), `DockTab`, `CalendarSyncPage` (état « 2 sources · 5 événements ·
  sync. il y a 3 min »), `StatusWidgetConfig`, puis les fenêtres : `Calendar.tsx`,
  `NotchCalendar`, `NotchClock`, `Dock.tsx` (menu contextuel), `Overlay.tsx`,
  `WindowControls`, et les pastilles du centre de contrôle dans `App.tsx`.
- Les libellés de widgets (`Weather`, `Battery`, `CPU`…) vivaient dans une **constante de
  module** : ils sont devenus des `labelKey: MessageKey` résolus au rendu, sinon la
  langue figée au chargement ne basculerait jamais.
- Test de longueur : les 14 conseils restent **≤ 46 caractères** dans les deux langues
  (max mesuré : 43) — `npm run test:assistant` → **40/40**.

**Constats**
- Deux pièges de traduction rencontrés, tous deux corrigés :
  1. `timeAgo()` renvoyait une phrase anglaise déjà construite ; il renvoie maintenant une
     clé (`{{count}} min ago` / `il y a {{count}} min`).
  2. Une ligne d'état contient **deux pluriels** (« 2 sources · 3 événements ») alors que
     le moteur ne pluralise que `params.count`. Solution : les groupes nominaux sont des
     clés à part (`caldav.sources`, `caldav.events`), la phrase qui les assemble est une
     seule clé (`caldav.summary`) — ce n'est pas de la concaténation de phrases.
- Restent volontairement littérales : « Notch » (jamais traduit, c'est le nom de l'objet),
  « Is » (nom de la mascotte), les noms propres d'applications et les crédits du pied de
  page À propos.

**Non vérifié**
- Contrôle visuel dans l'application : le sandbox Linux ne peut pas lancer Tauri. L'aperçu
  `/home/user/apercu-langue/index.html` est généré **depuis les dictionnaires réels**
  (`.test-build/i18n.bundle.mjs`), donc il ne peut pas mentir sur le texte — mais pas sur
  le rendu CSS.

**À faire ensuite**
- J2 (Matière / Liquid Glass), puis J4 (parité Nusa), J3 (personnage), J5, J6, J7.
- Chaque nouvelle fonctionnalité arrive **bilingue du premier coup** (règle dans `AGENTS.md`).

---

## 2026-11-04 (2) — `tauri dev` s'arrête en cours de route : c'était la RAM

**Symptôme** — `bun run tauri dev` meurt pendant la compilation de `rustls` avec
`only metadata stub found for rlib dependency core`, `can't find crate for rustls_pki_types`,
puis `rustc-LLVM ERROR: out of memory`, et le terminal lui-même redémarre.

**Diagnostic** — Les trois premières erreurs sont une **cascade**, pas la cause.
Cargo compile en pipeline : un crate produit d'abord un `.rmeta`, le `.rlib` complet
arrive ensuite. Quand rustc est tué par le système en cours de route, le `.rlib` n'arrive
jamais et tout ce qui en dépend échoue avec ces messages trompeurs. La vraie cause est
la dernière ligne : **la machine a manqué de mémoire**. Le terminal qui redémarre confirme
que c'est le système entier qui a manqué, pas seulement un processus rustc.
Le profil `dev` compile avec `debug = true`, soit de la debuginfo complète sur ~600 crates —
c'est de très loin le premier poste de consommation mémoire.

**Correctifs**
1. `[profile.dev.package."*"] debug = false` — la debuginfo des dépendances disparaît,
   celle du code Islet reste (points d'arrêt et traces lisibles conservés).
2. `image` n'active plus ses features par défaut : `ravif`/`rav1e` (encodeur AV1 complet),
   `exr` et `tiff` sortent de l'arbre. Formats conservés : png, jpeg, webp, bmp, gif, ico —
   tout ce qu'un utilisateur peut déposer comme icône ou ce que le lecteur média renvoie.
3. `scripts/dev.ps1` : affiche RAM totale, espace libre sur C:, cible Rust, prévient si la
   toolchain est 32 bits (un rustc i686 plafonne à ~3 Go quoi qu'il arrive), puis lance
   `tauri dev` avec 2 jobs (`-Jobs 4`, `-Clean`).
4. README : section « If the Rust build runs out of memory ».

**Non vérifié** — pas de cargo dans le sandbox : Cargo.toml est validé syntaxiquement
(tomllib) mais la compilation réelle se fait sur la machine Windows. `Cargo.lock` perdra
les entrées `rav1e`/`ravif`/`exr`/`tiff` au premier build ; c'est cargo qui le réécrit,
aucun `--locked` dans `scripts/release.ps1`.

---

## 2026-11-04 (5) — J8 : le français arrive, et il devient impossible à oublier

**Demande** — « j8, pour que tout ce qu'on fait ensuite suive la logique de deux langues ».
Le point important n'était pas de traduire l'existant mais de rendre l'oubli **impossible**
pour la suite.

**Décision centrale — l'anglais définit les clés, le français est typé dessus.**
`fr.ts` est déclaré `Record<keyof typeof en, string | {one; other}>`. Ajouter une clé dans
`en.ts` sans la traduire ne produit pas un oubli discret : ça ne compile pas. C'est ce
mécanisme, plus que la documentation, qui fera tenir les deux langues dans six mois.

**Pas de bibliothèque.** `react-i18next` aurait apporté trois dépendances, un provider, un
système de namespaces chargés à la demande et une syntaxe propre à apprendre, pour ~400 clés
dans deux langues. Le moteur fait 150 lignes : un dictionnaire plat, `{{interpolation}}`,
pluriels `{one, other}`, et `Intl` pour les dates et les nombres.

**Le catalogue d'Is ne construit plus de phrases.** `pickTip()` renvoyait un `title` déjà
rédigé en anglais : un conseil affiché au moment du basculement de langue serait resté
figé dans l'ancienne. Il renvoie maintenant une **clé + des paramètres**, et la vue traduit
au rendu. Effet secondaire bienvenu : les tests ne dépendent plus de l'anglais.

**Deux traductions trop longues, trouvées avant l'utilisateur.** Le générateur d'aperçu
mesure chaque conseil. `batteryLowWithTime` faisait 51 caractères en anglais et 56 en
français pour un notch de 290 px, où la ligne se tronque vers 46. Les deux ont été
raccourcies. Le test le vérifie désormais pour les 14 conseils, dans les deux langues.

**Pièges rencontrés**
- `node --test` **ignore `node_modules`** : le bundle de test doit être écrit ailleurs
  (`.test-build/`, gitignoré). Trois tentatives avant de comprendre.
- Node ESM exige des extensions explicites ; le code source garde des imports sans
  extension (résolution bundler de Vite). D'où le passage par esbuild pour les tests,
  au lieu de `--experimental-strip-types`.

**Livré** — socle, sélecteur dans Général, 14 conseils, interface du notch, onglet Is,
onglet Général, les 5 écrans d'accueil, sidebar et titres.
**Reste** — 8 onglets des Réglages, le dock, l'agenda, les surcouches : `todo.md` N10→N15.

**Validations** — `npm run build` ✅ · `npm run test:assistant` **40 tests** ✅.

---

## 2026-11-04 (4) — J1 : l'accueil au premier démarrage

**Fait** — `src/settings/Onboarding.tsx` + `Onboarding.css`, cinq étapes rendues dans la
fenêtre Settings existante : bienvenue et nom, apparence, notch ou dock, confidentialité,
récapitulatif.

**Décisions de conception**
- **Pas de 6ᵉ point d'entrée Tauri.** L'accueil réutilise `settings.html` : même chrome,
  mêmes composants `SettingRow` / `Dropdown`, un webview de moins à garder en vie.
- **La fenêtre s'ouvre 1,2 s après le démarrage.** La montrer immédiatement donne
  l'impression d'un crash qui se superpose à un bureau à moitié dessiné ; une seconde de
  respiration et c'est un accueil.
- **Chaque choix s'écrit au clic**, pas au récapitulatif. Un crash au milieu du parcours
  conserve ce qui était déjà choisi.
- **Détection côté Rust**, pas côté frontend. `load_settings` lit le fichier, les webviews
  ne partagent pas leur `localStorage` de façon fiable. La migration marque comme déjà
  accueilli tout profil dont `settings.json` contient au moins une clé : un utilisateur
  existant ne verra jamais l'accueil débarquer après une mise à jour.

**Écart assumé** — Le plan prévoyait un choix de langue à l'étape 1. Je l'ai retiré : tant
que J8 n'est pas livré, ce sélecteur n'aurait rien changé à l'écran. Un réglage qui ne fait
rien est pire qu'un réglage absent, et c'est exactement le genre de faux contrôle qui
abîme la confiance. Il revient avec l'i18n, où il aura un effet réel.

**Corollaire** — Le nom de l'assistant serait devenu un réglage mort : saisi à l'accueil,
lu nulle part. Il est maintenant éditable dans Settings › Is et le libellé de l'onglet
latéral le suit. Un réglage doit se voir quelque part.

**Validations** — `npm run build` ✅, 31 tests de `pickTip()` toujours verts.
Pas de `cargo check` dans le sandbox : la migration Rust est à compiler côté Windows.

**À valider sur Windows** — la taille 720 × 620 avec le facteur d'échelle, la lisibilité
du parcours, et surtout que la fenêtre s'ouvre bien au tout premier lancement (test
destructif : supprimer `settings.json` ou retirer `islet-onboarded`).

---

## 2026-11-04 (3) — Rendre les conseils d'Is impossibles à manquer

**Contexte** — Retour utilisateur après le premier build réussi : « pour les conseils,
il faut un hook pour que l'utilisateur les remarque ». Le vrai problème était plus
large que l'effet visuel : un conseil affiché 10 s en haut de l'écran pendant qu'on
regarde un terminal est **structurellement** ratable, et une fois replié il ne reste
aucune trace. L'utilisateur ne peut pas savoir qu'il a manqué quelque chose.

**Réponse — trois couches**
1. **L'arrivée** — deux anneaux partent du mascotte, le cadre de la ligne fait un éclat
   dans la couleur de gravité. C'est le mouvement qui accroche l'œil périphérique, pas
   le texte.
2. **La présence** — lueur radiale derrière le mascotte, et le point de gravité bat
   toutes les 2,4 s tant que le conseil est affiché.
3. **Le marqueur** — à l'expiration, le conseil devient `unread` au lieu de disparaître.
   Le notch replié garde un contour dans la couleur de gravité, avec le texte du conseil
   en infobulle, jusqu'au clic. C'est la couche qui répond vraiment à la demande :
   on peut rater 10 s, on ne peut pas rater un contour qui reste.

Durée graduée par gravité : 10 s / 12 s / 15 s. Tout est coupé sous
`prefers-reduced-motion`, sauf le marqueur — qui est statique par conception.

**Bug corrigé au passage** — `useAssistant` testait les icônes une par une pour
savoir si une catégorie venait d'être coupée. La liste datait d'avant l'extension du
catalogue : `battery-time`, `disk-critical`, `restart` et `late-night` n'étaient jamais
retirés quand on coupait leur catégorie. Remplacé par `TIP_CATEGORY`, une table
`TipIcon → catégorie` dans `assistant.ts`.

**Tests rapatriés** — les 29 tests écrits la veille vivaient dans `/tmp` et ont disparu
avec le bac à sable. Ils sont maintenant dans `scripts/assistant.test.ts`, lancés par
`bun run test:assistant`. Node 22 charge le TypeScript directement via
`--experimental-strip-types` : **aucune dépendance ajoutée**. 31 tests au total.

**Demande suivante** — changer de langue (français / anglais). Cadré dans
`ROADMAP.md` § 3.G : ~400 chaînes à extraire, pas de bibliothèque (un `t()` sur deux
dictionnaires plats), langue par défaut = celle de Windows. Placé en **J8**, juste après
J1 et J2 pour ne pas traduire deux fois. Le catalogue d'Is est prioritaire dans ce
chantier : c'est le texte le plus lu de l'application.

**À valider sur Windows** — le rendu réel des anneaux et du contour dans le notch, et
surtout que le clic d'acquittement ne gêne pas (il ne fait rien d'autre, mais c'est un
geste sur le notch).

---

## 2026-11-04 — Is : catalogue de conseils étendu

**Fait**
- **Cinq conseils ajoutés** (8 → **13**) et **deux messages enrichis** — catalogue complet dans `ROADMAP.md` § 3.B.0 :
  - `battery-low` enrichi du temps restant quand Windows le connaît (`— 40 min left`)
  - `battery-time` : « About 1 h 40 of battery left » quand le pourcentage rassure mais l'horloge non
  - `disk-critical` : nouveau palier rouge (< 2 Go libres ou ≥ 97 % utilisé), distinct de l'avertissement
  - Disques : affichage en **Mo** sous 10 Go — `0 GB left` était trompeur
  - `memory-critical` : palier rouge à 95 % (« save your work »)
  - `restart` : rappel de redémarrage après **5 jours** d'uptime (distinct de la pause)
  - `late-night` : conseil entre **00:00 et 04:00**, une fois par nuit
- `AssistantTab` : descriptions des catégories Storage et Session alignées sur la couverture réelle.

**Constats**
- **Aucune modification du backend** : tout reposait déjà sur des données échantillonnées, dont `battery.seconds_left` et `disks[].removable` qui étaient présents mais inexploités. Zéro nouveau risque de compilation Windows.
- `seconds_left` de Windows est bruité sous ~15 min : un plancher évite les estimations absurdes.

**Validations**
- **29 tests** de `pickTip()` (priorités, seuils, interrupteurs, cooldowns, formateurs) exécutés via esbuild + node, hors dépôt — aucun framework de test ajouté au projet.
- `npm run build` ✅.

**À faire ensuite**
- `cargo check` + build NSIS côté Windows (K0j) pour valider le capteur Rust.
- Puis J1 (onboarding) ou J2 (thèmes), au choix de l'utilisateur.

---

## 2026-11-03 (2) — Is lit les signaux du PC et prévient l'utilisateur

**Contexte** — Retour de l'utilisateur sur le cadrage Phase 3 : « c'est parfait pour un debut », puis une demande précise — Is doit lire les signaux de la machine et notifier : batterie, temps de mise en marche, rappel de charge, espace disque, « et bien d'autres petits tips utiles ». L'ordre proposé (J1 accueil d'abord) est donc inversé : on attaque l'assistant.

**Fait**
- **Capteur Rust** `src-tauri/src/signals.rs` (nouveau, ~300 lignes) : batterie (`GetSystemPowerStatus`), mémoire (`GlobalMemoryStatusEx`), disques `C:`–`Z:` (`GetDriveTypeW` + `GetDiskFreeSpaceExW`), CPU (`GetSystemTimes`), uptime (`GetTickCount64`). Échantillon toutes les 30 s publié sur l'événement `system-signals`, plus une commande `get_system_signals` pour le premier affichage.
- **Câblage** : `Cargo.toml` (+ feature `Win32_System_Power`), `main.rs` (`mod signals;`, commande enregistrée, `start_sampler` lancé après la synchro calendrier).
- **Moteur de conseils** `src/lib/assistant.ts` : fonction pure `pickTip()`, un seul conseil à la fois, ordre de priorité batterie critique → batterie faible → batterie pleine → rappel de charge → disque → mémoire → CPU → session longue, avec un délai de répétition par type (10 min à 12 h).
- **Hooks** `useSystemSignals` (invoke + écoute) et `useAssistant` (réglages `islet-assistant-*`, cooldowns persistés, affichage 10 s, écoute de `settings-changed`).
- **UI** : composant `AssistantTip` (avatar Is + pastille de gravité + croix), intégré dans le notch, largeur dédiée (290 px), déroulé automatique en mode `peek`. Le conseil passe avant les pastilles charge/mise à jour.
- **Réglages** : nouvel onglet « Is » dans Settings — interrupteur général, 4 catégories, 4 seuils, et une section « Right now » qui affiche CPU, mémoire, uptime et espace libre réels.
- **Doublon évité** : la pastille « Low Battery » historique (`islet-low-battery-threshold`) se met en veille quand Is prend la batterie en charge ; elle revient si l'utilisateur coupe Is.
- `SETTINGS.md` : nouvelle section « Is (assistant) » avec les 10 clés.

**Constats**
- Le crate `windows` 0.61 n'expose pas `DRIVE_FIXED` / `DRIVE_REMOVABLE` : les valeurs du SDK (3 et 2) sont redéclarées localement. Vérifié dans les bindings du tag `0.61.0`.
- `GetSystemPowerStatus` renvoie bien `Result<()>` dans cette version, comme `GetSystemTimes` et `GlobalMemoryStatusEx` — la gestion d'erreur est homogène.
- `settings-changed` existe bien et est émis par `save_setting` : l'écoute dans `useAssistant` est légitime. Les fenêtres ne partageant pas forcément leur `localStorage`, le hook réécrit la valeur reçue avant de relire la configuration.

**Bloqué**
- Pas de `cargo` dans le sandbox : la compilation Rust est à faire sur la machine Windows de l'utilisateur.

**À faire ensuite**
- `cargo check` puis build NSIS sur la machine de l'utilisateur.
- Enchaîner sur J1 (accueil au premier démarrage), puis les thèmes.

## 2026-11-03 — Cadrage Phase 3 : accueil, assistant « Is », parité Nusa, thèmes

**Contexte** — Phase 2 mergée (PR #2, `2d0c2b5`). L'utilisateur ouvre la Phase 3 avec quatre demandes : un accueil au premier démarrage, les fonctionnalités de Nusa, une mascotte-assistante orientée développeurs, et davantage de thèmes dont *Liquid Glass*.

**Fait**
- **Skills installées** (`npx skills add vercel-labs/agent-skills`) : `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`, `writing-guidelines` → `.claude/skills/` (644 Ko, 98 fichiers, versionné).
- **Recherche Nusa** : notch C#/WPF pour Windows 10/11. Fonctions relevées — musique + paroles synchronisées (LRCLIB), Pomodoro, rappels d'eau, shelf de fichiers, to-do, overlays volume/luminosité, Caps Lock + langue, batterie/Wi-Fi/casque, masquage plein écran. Écart calculé contre l'existant Islet : paroles, shelf, eau, to-do, chronomètre, indicateurs clavier, pilule minimale.
- **Recherche Liquid Glass** : deux niveaux (frost partout, réfraction Chromium-only via `feDisplacementMap` dans `backdrop-filter`). Constat décisif : **sous Tauri le rendu passe par WebView2 = Chromium**, donc la réfraction est réellement disponible sur Windows — ce qui est faux sur le web classique.
- **Roadmap Phase 3** écrite dans `ROADMAP.md` : 4 blocs (3.A accueil, 3.B assistant, 3.C parité Nusa, 3.D thèmes), 7 jalons J1→J7, et proposition de 8 presets de thème.

**Décisions**
- **Pas d'IA au départ** : l'assistant « Is » s'appuie d'abord sur des signaux locaux (git, ports, build, focus). L'IA (Ollama local ou endpoint BYO) est un bloc séparé, opt-in, désactivé par défaut, et volontairement bridé (expliquer une erreur, résumer un diff — pas d'agent qui écrit dans le dépôt).
- **Onboarding dans la fenêtre Settings existante** (mode `onboarding`) plutôt qu'une 6ᵉ fenêtre Tauri : moins de surface, composants déjà cohérents.
- **Moteur de thèmes par presets** avec migration des `themeMode` actuels, plutôt qu'un simple ajout de cases.
- Ordre de livraison proposé : J1 (accueil) → J2 (thèmes) → J4 (parité) → J3 (personnage) → J5 (dev) → J6 → J7.

**Constats**
- Le registre `skills.sh` n'est pas joignable depuis le sandbox (DNS restreint) : l'installation a été faite directement depuis GitHub, ce qui fonctionne.
- Les noms de skills sont préfixés `vercel-` (`vercel-react-best-practices`, …), à ne pas confondre avec les noms de dossiers du dépôt source.

**À faire ensuite**
- Attendre l'arbitrage de l'utilisateur sur l'ordre des jalons, puis démarrer J1 (onboarding).

## 2026-11-02 (3) — Screenshots intégrés

**Fait**
- L'utilisateur a poussé `docs/screenshots/desktop.png` (1920×1080, capture réelle de l'app sous Windows) sur `main` → `54fb1dd`, mergé dans la branche.
- Le même commit régénère `src-tauri/Cargo.lock` par `cargo check` : le paquet passe de `nectar` à `islet` (29 lignes déplacées, 0 occurrence de « nectar » restante). D-DRV-4 est donc **soldée** côté Cargo.
- Dérivés produits : `desktop.webp` (1400×788, 35,6 ko contre 65 ko pour l'ancien), `island.png` (recadrage du notch, 320×90), `dock.png` (recadrage du dock, 560×70). Les trois étaient les images obsolètes du README.
- `docs/screenshots/README.md` : provenance, dimensions, état, commandes de régénération.
- README : largeur de `island.png` ajustée à sa taille native (320).

**Constat — à refaire**
- La capture a été prise avec un build **antérieur à la PR #2** : l'icône Islet du dock montre encore la mascotte blanche nue (vérifié au zoom ×4 sur le premier emplacement du dock), pas la tuile sombre. Le reste (notch, dock, thème) est à jour.
- Une nouvelle capture après rebuild est donc nécessaire ; le crop du dock sera alors automatiquement correct sans retoucher le code.

**Validations**
- `desktop.webp` 35,6 ko (le README reste léger), images recadrées contrôlées visuellement.

**À faire ensuite**
- Rebuild + nouvelle capture côté Windows, puis remplacer `desktop.png` (procédure dans `docs/screenshots/README.md`).

## 2026-11-02 (2) — Clé de signature updater intégrée (DÉC-5 résolue)

**Fait**
- Le mainteneur a généré la paire : privée `C:\Users\stephane dikoume 2DS\.tauri\islet.key`, publique `islet.key.pub`.
- Clé publique **décodée et validée** avant intégration : 2 lignes, en-tête `untrusted comment: minisign public key: BA3FEE8CCD2277FC`, seconde ligne `RW…` (56 car.), base64 aller-retour identique.
- `plugins.updater.pubkey` de `src-tauri/tauri.conf.json` remplacé : ancienne clé kua8 (`66A2BF13F216B96A`) → **`BA3FEE8CCD2277FC`**. Diff = **une seule ligne**, JSON revalidé, autres champs (`active`, `windows.installMode`, `endpoints`) intacts.
- `installer-app` n'a **pas** d'updater (vérifié) → rien à changer de ce côté.
- Chaîne de release vérifiée : `scripts/release.ps1` exige `TAURI_SIGNING_PRIVATE_KEY`, attend `Islet_<ver>_x64-setup.exe.sig` et génère `latest.json` avec `signature` + `pub_date`. Aucune modification nécessaire.

**Constats**
- `.gitignore` couvre `*.key` et `*.key.pub` ; `git ls-files` confirme qu'aucune clé n'est suivie.
- La clé privée n'a **jamais** transité par le chat ni par le dépôt : seule la publique a été communiquée (c'est sa fonction).
- Point d'attention : si la clé privée a un mot de passe, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` est requis au build de release.

**À faire ensuite**
- Rebuild Windows signé ou non (`--bundles nsis` / `--no-sign`) + captures P2-7.

## 2026-11-02 — Phase 2 : finitions visuelles (icône, favicons, attribution)

**Fait**
- **Défaut critique corrigé** : la mascotte officielle est **blanche sur transparent** → comme icône d'application elle était **invisible sur tout fond clair** (barre des tâches Windows en thème clair, Explorateur, Bureau, onglet navigateur, README GitHub en mode clair). Vérifié en compositant le master sur blanc : il ne restait qu'un contour fantôme.
- Solution retenue (validée par l'utilisateur parmi 3 propositions) : **tuile `#111318`** à coins arrondis 22,37 %, mascotte blanche à 64,5 % du côté. Visible sur fond clair **et** sombre ; testé jusqu'à 32 px.
- `docs/brand/` créé comme **source unique de vérité** : `islet-mascot-transparent.png` (master conservé), `islet-icon-tile.png` (icône officielle), `islet-icon-tile-light.png` (variante fond clair, mascotte `#111318` sur tuile `#EDEDED`), `README.md` (charte + procédures de régénération).
- Jeux d'icônes **régénérés depuis la tuile** : `src-tauri/icons` (23 fichiers) et `installer-app/src-tauri/icons` (élagué aux 4 fichiers de `bundle.icon`).
- `public/islet.svg`, `installer-app/public/islet.svg` (wrappers base64 de la tuile), `public/islet.png` (512²), `docs/logo.png` (1024²) alignés.
- **Favicons** : `settings.html`, `calendar.html`, `overlay.html` pointaient encore sur `/vite.svg` → `/islet.svg`.
- **Orphelins supprimés** : `public/tauri.svg`, `public/vite.svg`, `src/assets/react.svg` (0 référence).
- **Attribution corrigée** : README ligne 31 créditait « Bloom by Sehajveer Singh » alors que la section Credits/Legal crédite « Nectar by kua8 ». Risque juridique en GPL (mauvais auteur crédité) → ligne réécrite sur Nectar/kua8 + mention du mainteneur 2DS.
- README : `<picture>` pour servir la variante claire du logo selon `prefers-color-scheme`.

**Constats**
- `AboutTab` était déjà correct (`filter: invert(1)` sous `.light-mode`).
- L'installateur et les BMP NSIS étaient déjà corrects (fond sombre) — contrôlés visuellement.
- `docs/screenshots/*` restent obsolètes : il faut un build Windows pour les refaire (P2-7).
- `docs/yesjj.png` = illustration pastel utilisée comme fond d'écran dans `docs/screenshots/desktop.webp` ; conservée comme ressource design.

**Validations**
- `npm run build` ✅ app principale et installer-app.
- Rendu contrôlé : tuile sur blanc / sombre / 32 px ; BMP header+sidebar ; simulation d'écran d'installateur.

**À faire ensuite**
- P2-7 : captures d'écran à jour (Windows) · P2-8 : clés updater · puis nouvelles fonctionnalités.

## 2026-10-30 (3) — G3 ✅ sur Windows · échec de bundling diagnostiqué

**Fait**
- **G3 validé par l'utilisateur** : `cargo check` → `Finished dev profile in 5m 10s`, **0 erreur**, crate `islet v1.4.1` compilé. Le rebranding Rust est donc syntaxiquement et structurellement sain (aucun identifiant cassé dans les commandes Tauri, le registre, le mutex, etc.).
- `bun run tauri build` a compilé `islet.exe` en release (`Finished release profile in 12m 29s`).
- Échec suivant : `failed to bundle project: io: Hôte inconnu. (os error 11001)` en téléchargeant **WiX** (`wix314-binaries.zip`).

**Constats — deux causes cumulées, aucune dans le code**
1. `bundle.targets: "all"` → Tauri tente **aussi le MSI**, qui exige de télécharger WiX depuis GitHub. `11001` = DNS ne résout pas l'hôte (réseau, pas le projet). Or `scripts/release.ps1` ne construit **que du NSIS** (`--bundles nsis`) : le MSI n'est jamais livré.
2. Juste après, le prochain blocage aurait été la **signature updater** : `createUpdaterArtifacts: true` + pubkey → `A public key has been found, but no private key. Make sure to set TAURI_SIGNING_PRIVATE_KEY` (comportement documenté de tauri-cli). `release.ps1` refuse d'ailleurs de démarrer sans cette variable ; `--no-sign` existe depuis le CLI 2.11 (vérifié : `tauri-cli 2.11.5`, `--no-sign` présent).

**Décisions**
- Commande de validation = **`bun run tauri build --bundles nsis --no-sign`** : ni WiX, ni clé privée. Pas de modification de `tauri.conf.json` (targets/updater inchangés → aucune régression fonctionnelle, la clé reste DÉC-5).
- `README.md` (section *Build from source*) documente désormais `--bundles nsis` et `--no-sign`.
- `ELEMENTS_MANQUANTS.md` : tableau de dépannage bundling (WiX/DNS, clé updater) + solutions de secours (DNS, pré-remplissage de `%LOCALAPPDATA%\tauri\NSIS`, WixTools314) + rappel que **`islet.exe` seul suffit** à valider le rebranding visuel.

**À faire ensuite**
- Utilisateur : lancer `islet.exe` (validation visuelle immédiate) puis `bun run tauri build --bundles nsis --no-sign` → test installateur → merge PR #1.

---

## 2026-10-30 (2) — Dépannage `link: extra operand`

**Fait**
- 2e retour utilisateur : `cargo check` et `bun run tauri build` échouent sur `linking with link.exe failed` + `link: extra operand … Try 'link --help'`.
- **Diagnostic : conflit de binaire, pas un défaut du code.** Ce message est celui de l'outil GNU `link` (coreutils) livré par Git for Windows (`…\Git\usr\bin\link.exe`) ; MSVC parle un tout autre dialecte d'erreurs. Rust invoque `link.exe` et c'est le GNU qui répond → échec sur les build scripts (`proc-macro2`, `quote`, `serde_core`, `zerocopy`) avant tout code projet. Cause probable n°1 : le workload `VCTools` n'a pas fini/été installé (`--passive` rend la main immédiatement) ; cause n°2 : ordre du `PATH` (Git avant MSVC).
- Frontend **validé sur la machine Windows de l'utilisateur** au passage : `tsc && vite build` → 2294 modules, ✓ built in 12.53 s — preuve que le rebranding n'a rien cassé côté JS.
- `ELEMENTS_MANQUANTS.md` : section **« 🔧 Dépannage — link: extra operand »** ajoutée (diagnostic `vswhere`, réinstallation du workload, `where.exe link`, correctif `CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER` auto-détecté, alternative « x64 Native Tools Command Prompt »). Avertissement chemin mis à jour (résolu : `projets_git`).
- Décision : **aucun `.cargo/config.toml` committé** — le chemin du linker est propre à chaque machine.

**À faire ensuite**
- Utilisateur : appliquer le correctif puis relancer `cargo check` → `bun run tauri build` → tests d'installation.

---

## 2026-10-30 — Prérequis de build documentés (blocage environnemental Windows)

**Fait**
- Retour utilisateur : `bun` et `cargo` « non reconnus » en PowerShell sur la machine Windows — **aucun des deux n'est installé**. Aucun code concerné : c'est l'environnement, pas le rebranding.
- `ELEMENTS_MANQUANTS.md` #4 enrichi d'une section **« 0️⃣ Prérequis »** : diagnostic (`bun -v; cargo -V; rustc -V`), installation Bun / rustup / Build Tools MSVC via `winget`, vérification après redémarrage du terminal, alternatives sans `winget`, statut WebView2/NSIS.
- Avertissement ajouté sur le **chemin du clone** : `D:\2DS\projet\gaming & git\Islet` contient une espace et un `&` — `&` = opérateur PowerShell et source connue d'échecs MSVC/NSIS → recommander `D:\2DS\Islet`.
- Section #4 réécrite en deux temps (prérequis → validation) avec `git fetch origin && git switch arena/7705c682-islet`.

**À faire ensuite**
- L'utilisateur installe la chaîne d'outils, relance la validation G3/G4, me renvoie le résultat → merge de la PR #1.

---

## 2026-10-29 (nuit) — Assets officiels reçus + réintégration sur nouveau `main` + PR

**Fait**
- L'utilisateur a uploadé les **assets officiels directement sur `main`** (commit `14e3d80`) : `docs/islet-logo.png` (**2000², transparence native** — le vrai master), `docs/islet-wordmark-dark.png` / `-light.png` (1376×768, transparents), + `docs/yesjj.png` (2048², illustration pastel) et `docs/yessjh.png` (480², variante fantôme).
- Analyse colorimétrique des wordmarks : `dark` = glyphes **foncés** (#262626, pour fonds clairs) ; `light` = glyphes **clairs** (#f5f5f5, pour fonds sombres). README câblé en conséquence (mode sombre → fichier `light`, par couleur de glyphes).
- Le commit local précédent (`d1d4102`) a été perdu lors d'une restauration de snapshot entre deux tours — changements intacts dans l'arbre de travail, puis **rebases propres** : branche réinitialisée sur `origin/main` (`14e3d80`) + réapplication du rebranding par-dessus (aucun conflit).
- **Tous les assets dérivés régénérés depuis le master officiel** : sets d'icônes Tauri ×2 apps (50 fichiers chacun), BMP NSIS, `docs/logo.png`, `public/islet.png` (512²), wrappers `islet.svg` ×2. Anciens `docs/wordmark-*.png` (provisoires) supprimés — `islet-wordmark-*.png` sont la référence unique.
- Commit unique recréé, branche poussée, **PR ouverte** vers `main`.

**Constats**
- Les wordmarks/logo provisoires générés précédemment sont tous remplacés par les officiels. Plus rien de provisoire dans l'identité visuelle.
- `docs/yesjj.png` / `docs/yessjh.png` conservés tels quels (probables sources design / illustration hero — à confirmer pour Phase 2).

**Bloqué / en attente utilisateur**
- Inchangé : G3/G4 (validation Windows — commandes dans `ELEMENTS_MANQUANTS.md`), DÉC-5 (clés updater).

**À faire ensuite**
- Merge de la PR après validation Windows → puis **Phase 2**.

**Fait** (après réception des décisions DÉC-1 → DÉC-6)
- **Master logo** : `docs/islet-logo.png` (1024², transparent) généré depuis `docs/new-logo2.jpg` par flood-fill du fond noir (pupilles préservées). ⚠️ Le fichier annoncé « fourni » n'existait pas → master généré par l'agent, remplaçable.
- **Wordmarks** : `docs/wordmark-dark.png` / `docs/wordmark-light.png` régénérés (« Islet », DejaVu-Bold, 474×127) — **provisoires**, en attente des officiels. `docs/logo.png` = contenu remplacé par le logo Islet (nom conservé, stabilité README).
- **Remplacement textuel** : script à règles ordonnées (identifiants → casse). **1 219 remplacements dans 59 fichiers** : `com.kua8.nectar(.installer)` → `com.2DS.islet(.installer)`, `Software\kua8\nectar` → `Software\2DS\islet`, `kua8/Nectar` → `dikoume-stephane/Islet`, `Publisher: kua8 → 2DS`, casse `NECTAR/Nectar/nectar` → `ISLET/Islet/islet`.
- **Renommages** : `public/nectar.{svg,png}` → `public/islet.{svg,png}` (+ installer-app) via `git mv`. Le SVG = wrapper vectoriel embarquant le mascot PNG (base64, CSP `data:` déjà autorisée).
- **Icônes** : régénération complète via `npx @tauri-apps/cli@2 icon` → `src-tauri/icons/` (PNG ×17, `.ico` multi-tailles, `.icns`, android/, ios/) ; installer-app réduit aux 4 fichiers référencés par sa config.
- **NSIS** : `header.bmp` (150×57) + `sidebar.bmp` (164×314) recréés (fond `#0B0D13`, mascotte + « Islet »).
- **Métadonnées** : `productName: Islet`, titres fenêtres, `description`/`authors` Cargo (`kua8` **conservé** + `dikoume-stephane (2DS)` ajouté), artefacts `release.ps1` (`Islet_x.y.z_x64-setup.exe`, `islet.exe`, `islet-installer.exe`), endpoint updater repointé vers `dikoume-stephane/Islet`.
- **Légal** : `LICENSE` intact ; `AGENTS.md` intact ; section **Credits / Legal** ajoutée au README ; ligne d'attribution kua8 conservée dans AboutTab + mention fork ajoutée.
- **Lockfiles (6)** : package-lock ×2 régénérés via npm ; bun.lock ×2 + Cargo.lock ×2 = retouche chirurgicale du seul champ `name` (bun/cargo absents du sandbox) — diffs vérifiés : 4 lignes au total.
- **Validation sandbox** : `npm install` + `npm run build` (tsc + vite) **✅ verts pour les deux applications** ; JSON des configs valides ; audit final : **3 occurrences « Nectar » restantes, toutes intentionnelles** (Credits README + descriptions Cargo).

**Constats**
- Aucune référence cassée (`/islet.svg|png` résolvent, classes CSS/JSX cohérentes, clés localStorage `islet-*` identiques côté TS et Rust).
- Reset des réglages existants **assumé** (DÉC-3) : pas de migration, Nectar et Islet cohabiteront avec des états séparés.
- Updater : endpoint repointé mais sans clé de signature Islet valide → **pas de mise à jour fonctionnelle avant DÉC-5** (comportement sûr : 404 = pas d'update, aucun risque d'update vers l'upstream).

**Bloqué / en attente utilisateur**
- G3/G4 : `cargo check` + `bun tauri build` + test NSIS **sur Windows** (commandes prêtes dans `ELEMENTS_MANQUANTS.md`).
- DÉC-5 : nouvelle paire de clés updater (avant la première release).
- Wordmarks/logo officiels pour remplacer les provisoires.

**À faire ensuite**
- Utilisateur : lancer la validation Windows → puis G6 (PR finale).
- Puis instructions de **Phase 2**.

---

## 2026-10-29 (après-midi) — Initialisation & phase d'analyse

**Fait**
- Lecture d'`AGENTS.md` : mission = rebranding complet `nectar` → `islet`, sans toucher aux fonctionnalités, avec préservation de l'attribution GPL-3.0.
- Scan complet du dépôt : **1 241 occurrences** de « nectar » (insensible à la casse) dans **70 fichiers**.
- Cartographie technique complète (identifiants, chemins, registre, assets) — détails dans `memory.md`.
- Visualisation des deux candidats logo : `docs/new-logo.jpg` (2048²) et `docs/new-logo2.jpg` (1024²) — mascotte « île + palmier » sur fond noir.
- Création des fichiers de pilotage : `ROADMAP.md`, `todo.md`, `progress.md`, `journal.md`, `memory.md`, `ELEMENTS_MANQUANTS.md`.

**Constats**
1. Le chemin indiqué dans `AGENTS.md` (`docs/nexlogo`) **n'existe pas** dans le dépôt. Les logos candidats sont les deux JPEG ci-dessus + les wordmarks Nectar existants.
2. Les deux JPEG sont sur **fond noir opaque** : inutilisables tels quels pour les `.ico`/`.icns`/favicons → besoin d'une version transparente.
3. Stack : Tauri 2 + React 19 + Vite (bun) ; backend Rust **Windows-only** (crate `windows 0.61`, NSIS, webview2) → le sandbox Linux ne pourra valider que le frontend (`tsc && vite build`).
4. Points sensibles identifiés : clés localStorage `nectar-*` (188), identifiant `com.kua8.nectar`, registre `Software\kua8\nectar` + `Uninstall\Nectar`, mutex `NectarSingleInstance`, pubkey updater appartenant à l'upstream kua8.
5. 6 lockfiles contiennent « nectar » → seront **régénérés**, jamais édités à la main.

**Bloqué**
- 5 décisions `DÉC-1 → DÉC-5` en attente utilisateur → voir **`ELEMENTS_MANQUANTS.md`**.

**À faire ensuite**
- Attente des décisions + du logo transparent.
- Dès feu vert : démarrer le Bloc B (manifests) selon l'ordre de `ROADMAP.md`.

---

*Modèle d'entrée à copier pour la suite :*

<!--
## AAAA-MM-JJ — Titre

**Fait**
- …

**Constats**
- …

**Bloqué**
- …

**À faire ensuite**
- …
-->
