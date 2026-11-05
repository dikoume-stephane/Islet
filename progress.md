# 📊 PROGRESS — Phase 1 : Rebranding Nectar → Islet

**Dernière mise à jour :** 2026-11-04 (par l'agent)
**État global :** ✅ **Phases 1 et 2 mergées (PR #1 et #2). Phase 3 en cours : accueil (J1), signaux d'Is, langues FR/EN (J8) et matières (J2) livrés**

## Tableau de bord

| Bloc | Périmètre | Tâches | Faites | État | Avancement |
|---|---|---|---|---|---|
| 0 | Préparation & analyse | 4 | 4 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| DÉC | Décisions utilisateur | 6 | 6 | ✅ Tranchées (DÉC-5 résolue le 2026-11-02) | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| A | Identité visuelle | 7 | 6 | ✅ Fait — **assets officiels intégrés** (A8 → Phase 2) | ▓▓▓▓▓▓▓▓▓▓ 100 %¹ |
| B | Manifests & config | 5 | 5 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| C | Frontend | 5 | 5 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| D | Backend Rust | 5 | 5 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| E | Installateur NSIS | 2 | 2 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| F | Documentation | 4 | 4 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| G | Validation | 6 | 5 | 🟡 G1/G2/G3/G5/G6 ✅ · G4 partiel (exe ✅, NSIS ⏳) | ▓▓▓▓▓▓▓▓░░ 83 % |
| **Total** | | **44** | **38** | | **≈ 90 %** |

## Phase 3 — Fonctionnalités (cadrée le 2026-11-03)

| Bloc | Périmètre | Tâches | Faites | État | Avancement |
|---|---|---|---|---|---|
| H | Onboarding premier démarrage | 10 | 9 | ✅ Livré (J1) — validation Windows restante | ▓▓▓▓▓▓▓▓▓░ 90 % |
| I | Moteur de thèmes + Liquid Glass | 9 | 8 | ✅ Livré (J2), contrôle visuel Windows restant | ▓▓▓▓▓▓▓▓▓░ 90 % |
| J | Parité Nusa (paroles, shelf, eau, to-do…) | 7 | 0 | 📋 Cadré | ░░░░░░░░░░ 0 % |
| K | Assistant « Is » | 18 | 15 | 🟡 Signaux, conseils, signal d'attention livrés · personnage à venir | ▓▓▓▓▓▓▓▓░░ 83 % |
| L | IA optionnelle | 4 | 0 | 📋 Cadré | ░░░░░░░░░░ 0 % |
| M | Outillage (skills) | 3 | 3 | ✅ Skills + outillage build | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| N | Langues FR / EN (J8) | 17 | 17 | ✅ Interface entière bilingue, 460 clés | ▓▓▓▓▓▓▓▓▓▓ 100 % |

**Jalons** : ~~J1 accueil~~ ✅ → ~~J8 langues~~ ✅ → ~~J2 thèmes~~ ✅ → **J4 parité → J3 personnage → J5 dev → J6 confort → J7 IA**.
⚠️ Amendé le 2026-11-03 : **J3 (Is — signaux système)** a été attaqué avant J1, puis J1 a suivi le 2026-11-04. Restent pour Is : le personnage animé et les signaux orientés développement (git, ports, build).
✅ 2026-11-04 : **J8 langues FR/EN terminé** — 460 clés par dictionnaire, aucun texte en dur.
Toute fonctionnalité livrée désormais arrive bilingue du premier coup.
Détail complet dans `ROADMAP.md` § PHASE 3.

## Métriques clés

| Indicateur | Initial (2026-10-29) | Actuel | Cible fin Phase 1 |
|---|---|---|---|
| Occurrences `nectar` (insensible casse) | 1 241 | **3**¹ | ≈ 0¹ ✅ atteint |
| Remplacements appliqués | 0 | 1 219 (+ 4 lockfiles chirurgicaux + 4 regen npm) | — |
| Fichiers modifiés | 0 | 59 texte + ~60 binaires/renommages | — |
| Assets graphiques régénérés | 0 | **~45** (2 jeux d'icônes Tauri complets, 2 BMP NSIS, 2 wordmarks, logo master, SVG/PNG publics) | 45 ✅ |
| Lockfiles synchronisés | 0/6 | **6/6** | 6/6 ✅ |
| Build frontend (tsc + vite) | non testé | **✅ app principale + ✅ installer-app** | ✅ |
| Build Rust / NSIS (Windows) | — | ⏳ à exécuter par l'utilisateur | ✅ |
| Updater Islet signé | — | ⏳ DÉC-5 différé (endpoint repointé, comportement sûr) | avant 1re release |

¹ uniquement les mentions légales volontaires : section Credits du README + descriptions `Cargo.toml`. Hors fichiers de pilotage qui documentent l'ancien nom.

## En cours
- **J4 — Parité Nusa** : presse-papier (P3-C9) **et** paroles synchronisées (P3-C1) livrés,
  155 tests TypeScript au vert. Reste la validation Rust sur Windows, puis file shelf (P3-C2),
  chrono/minuteur (P3-C3), hydratation (P3-C4), to-do (P3-C5), indicateurs clavier (P3-C6)
  et pilule minimale (P3-C8).

¹ A8 livré en Phase 2 depuis une capture Windows réelle ; reste à refaire après rebuild pour l'icône du dock (build antérieur à la PR #2).

## Prochaines actions
1. **Utilisateur (Windows)** : rebuild avec les nouvelles icônes (`bun run tauri build --bundles nsis --no-sign`) + captures d'écran à jour (P2-7).
2. **Utilisateur (avant 1re release)** : générer la paire de clés updater (DÉC-5).
3. **Agent** : corriger les éventuelles erreurs remontées par le build Windows → **Phase 2**.

## Risques suivis
| # | Risque | Statut |
|---|---|---|
| R1 | Logo JPEG fond noir → icônes inacceptables | ✅ Levé : master transparent généré (`docs/islet-logo.png`) |
| R2 | Renommage clés/registre = reset réglages utilisateurs | ✅ Tranché : **reset assumé** (DÉC-3) |
| R3 | Build Rust impossible dans le sandbox | 🟡 Transféré : validation G3/G4 sur Windows |
| R4 | Clés updater upstream inutilisables | 🟡 DÉC-5 différé — endpoint sur repo Islet (404 safe) ; obligatoire avant toute release |
| R5 | Identifiant `com.2DS.islet` (majuscules) refusé par un outil | 🟡 Faible — repli prévu : `com.2ds.islet` (D-DRV-3) |
