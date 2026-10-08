# E-179 — A re-read of 14 moves the icon

**Link:** `mockups/inventory/14.json` (`14.icon.tile`'s tokens, axis and share; `14.icon.tile.mark`'s
offsets; `14.splash.glow`'s alpha and sigma) → `generate-brand-assets.mjs` (`fourteen()`) →
`icon.png`, `adaptive-background.png`, the adaptive layers' grid, `launch-glow.png`
**Guard:** `--check` (the assets are regenerated from the record); `--prove`'s tile, share, centring and
glow cases, each with decoys **Severity:** medium **Feature:** F-231

---

## Why B changes when A does

The generator reads the icon's tile (two surface roles and a 15.2° axis), the mark's share of the tile
(0.61) and the glow's blur from 14's inventory rather than restating them. A re-read that moves any of them
moves the asset, and `--check` fails until the assets are regenerated — the drawing and the record cannot
silently part.

## The roles

The tile's ends are surface ROLES (`level2`, `ground`) mapped to tokens as the inventory tests map them; a
role the generator does not know is refused. The tile is dark only: 14 draws one icon.
