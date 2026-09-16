# A screen that imports a drawing library draws its own icons

**Effect:** [E-135](../../state/effects.json) · `scripts/verify-app-glyphs.mjs` → `apps/mobile` →
gate 2 · **medium**

## Why the link exists

F-228's third criterion is that no screen draws an icon of its own. The two ways that need no
ingenuity are an import — `react-native-svg`, an icon font, an `.svg` asset — and SVG markup in a
string. The check refuses both across `app/`, `src/` and `plugins/`, in the lint chain.

The share card is the one exception, and it is one thing in two files with opposite shapes:
`card.ts` writes markup and imports nothing, `ColourCard.tsx` imports `react-native-svg` and writes no
markup. So each exemption names its RULE, and neither file is free to do the other's thing. An
exemption that matches nothing fails, so the list cannot outlive the card.

**The link reaches every future screen.** A surface feature that reaches for an icon library — the
obvious move when an icon seems missing — fails gate 2 and is pointed at `Glyph` and `IconButton`.
The right fix for a missing icon is an inventory binding and a glyph, not a library.

## What holds it

`--prove`, in the lint chain: eighteen cases under the OS temp directory beside the real tree —
subpath, `require` and lazy imports; an icon font, platform symbols, a named library with no telltale
word, an `.svg` asset; markup in a string; a comment that only mentions SVG; a package whose name
merely contains the letters; each exemption used for its own rule and refused for the other; and a
dead exemption. Its first run caught the markup pattern missing a self-closing `<svg/>`.

## What it does not hold

An icon assembled from `View`s — borders and rotations — which source analysis cannot tell from
layout. Review and the surface features' inventory sweeps are the defence there.
