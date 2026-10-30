# 📊 PROGRESS — Phase 1 : Rebranding Nectar → Islet

**Dernière mise à jour :** 2026-10-29 (nuit, par l'agent)
**État global :** ✅ **Rebranding exécuté sur les assets OFFICIELS, PR ouverte vers `main` — en attente de la validation Windows (G3/G4) avant merge**

## Tableau de bord

| Bloc | Périmètre | Tâches | Faites | État | Avancement |
|---|---|---|---|---|---|
| 0 | Préparation & analyse | 4 | 4 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| DÉC | Décisions utilisateur | 6 | 6 | ✅ Tranchées (DÉC-5 = différé volontairement) | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| A | Identité visuelle | 7 | 6 | ✅ Fait — **assets officiels intégrés** (A8 → Phase 2) | ▓▓▓▓▓▓▓▓▓▓ 100 %¹ |
| B | Manifests & config | 5 | 5 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| C | Frontend | 5 | 5 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| D | Backend Rust | 5 | 5 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| E | Installateur NSIS | 2 | 2 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| F | Documentation | 4 | 4 | ✅ Terminé | ▓▓▓▓▓▓▓▓▓▓ 100 % |
| G | Validation | 6 | 2 | 🟡 G1/G2 ✅ · G3/G4 ⏳ Windows · G5 ⏳ DÉC-5 · G6 ⏳ | ▓▓▓░░░░░░░ 33 % |
| **Total** | | **44** | **38** | | **≈ 90 %** |

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
- *(aucune tâche agent active — le rebranding sandbox est terminé)*

¹ hors A8 (screenshots) volontairement reporté en Phase 2 — nécessite un build Windows fonctionnel.

## Prochaines actions
1. **Utilisateur (Windows)** : exécuter la validation G3/G4 — commandes dans `ELEMENTS_MANQUANTS.md` → puis **merge de la PR**.
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
