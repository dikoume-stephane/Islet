# Captures d'écran

| Fichier | Source | Dimensions | Usage README |
|---|---|---|---|
| `desktop.png` | capture d'origine fournie par le mainteneur (1920×1080) | 1920×1080 | — (master) |
| `desktop.webp` | `desktop.png` redimensionné, qualité 82 | 1400×788 | hero |
| `island.png` | recadrage du notch dans `desktop.png` | 320×90 | section *The Notch* |
| `dock.png` | recadrage du dock dans `desktop.png` | 560×70 | section *The Dock* |

## ⚠️ État de la capture

Prise avec un build **antérieur à la PR #2** : l'icône Islet du dock montre encore
l'ancienne mascotte blanche sur fond transparent, au lieu de la tuile sombre
`docs/brand/islet-icon-tile.png`.

Tout le reste est à jour (notch, dock, thème). À refaire après un build incluant la PR #2 :

1. `bun run tauri build --bundles nsis --no-sign`
2. lancer `src-tauri\target\release\islet.exe`
3. capturer l'écran, remplacer `desktop.png`
4. régénérer les dérivés :

```bash
convert docs/screenshots/desktop.png -resize 1400x -quality 82 docs/screenshots/desktop.webp
convert docs/screenshots/desktop.png -crop 320x90+800+0 +repage docs/screenshots/island.png
convert docs/screenshots/desktop.png -crop 560x70+680+1010 +repage docs/screenshots/dock.png
```

> Les décalages `+800+0` et `+680+1010` dépendent de la résolution (1920×1080) et de la
> position du notch/dock : recadrer à l'œil si la mise en page change.
