# 🎨 Assets de marque Islet

Ce dossier est la **source unique de vérité** pour l'identité visuelle d'Islet.
Tout asset dérivé (icônes Tauri, favicons, images d'installateur) est généré à partir d'ici.

## Fichiers

| Fichier | Taille | Usage |
|---|---|---|
| `islet-mascot-transparent.png` | 2000², RGBA | **Master de la mascotte** (blanc sur transparent). Ne pas utiliser directement comme icône d'app : invisible sur fond clair. |
| `islet-icon-tile.png` | 1024², RGBA | **Icône officielle** — tuile `#111318` arrondie + mascotte. C'est la source de tous les jeux d'icônes. |
| `islet-icon-tile-light.png` | 1024², RGBA | Variante claire (tuile `#EDEDED`, mascotte `#111318`) pour les contextes à fond blanc. |

## Pourquoi une tuile ?

La mascotte est **blanche sur fond transparent**. Utilisée seule comme icône, elle disparaît
dans tous les contextes clairs : barre des tâches Windows en thème clair, Explorateur,
Bureau, onglet de navigateur, GitHub en mode clair.

La tuile sombre garantit un contraste constant quel que soit le fond de l'hôte — la
convention des applications de bureau modernes.

## Régénérer les assets

### Icônes de l'application

```bash
npx @tauri-apps/cli@2 icon docs/brand/islet-icon-tile.png -o src-tauri/icons
```

### Icônes de l'installateur

```bash
cd installer-app
npx @tauri-apps/cli@2 icon ../docs/brand/islet-icon-tile.png -o src-tauri/icons
# puis ne conserver que les 4 fichiers référencés par bundle.icon :
# 32x32.png, 128x128.png, 128x128@2x.png, icon.ico
```

### Favicons / logos web

`public/islet.svg` et `installer-app/public/islet.svg` sont des wrappers SVG embarquant
`islet-icon-tile.png` en base64 (Tauri sert ces fichiers comme favicon).
`public/islet.png` est la tuile redimensionnée en 512².

### Images de l'installateur NSIS

`installer/assets/header.bmp` (150×57) et `sidebar.bmp` (164×314) : fond `#0B0D13`,
mascotte blanche, texte « Islet ». Format BMP 24 bits obligatoire pour NSIS.

## Charte

| | |
|---|---|
| Fond de tuile | `#111318` |
| Rayon des coins | 22,37 % du côté (≈ 229 px sur 1024) |
| Mascotte | 64,5 % du côté (≈ 660 px sur 1024) |
| Couleur de la mascotte | `#FFFFFF` (variante claire : `#111318`) |
| Fond d'installateur | `#0B0D13` |
| Accent | `#007AFF` |
