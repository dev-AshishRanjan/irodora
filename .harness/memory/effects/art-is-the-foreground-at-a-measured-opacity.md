# Art is the foreground at a measured opacity

**Effect:** [E-136](../../state/effects.json) · `manifest.opacity.art` + `manifest.size.artStroke` →
the emitters → `Illustration` · gates 2 and 4 · **medium**

## Why the link exists

F-229 measured every element the inventories bind an illustration to, and the art is drawn two ways:

| use | ink, as a fraction of `foreground` | line |
|---|---|---|
| **backdrop** — behind a screen's content, 21 of 33 | 0.10 – 0.18, median **0.15** | 1 px at 2 px/dp ≈ **0.5 dp** |
| **figure** — the drawing IS the content | 0.80 – 0.96 | 1 – 2 px |

**No declared colour token matches the backdrop ink.** The nearest are `chart.5` and `chart.4` at
ΔE00 4.6–7, and those are a chart ramp: a token whose meaning is "series 5", not "quiet art". So the
art is the `foreground` token at a declared opacity, which is also what the mockups do — the same
ink, turned down.

**The line is a width on screen, not in the drawing.** Each drawing carries its own grid — 24 units
for a sashiko tile, 96 for the silk band — so a stroke fixed in grid units would be four times
heavier on one than on another at the same rendered size. `Illustration` converts the declared dp at
the size it renders, exactly as `Glyph` does for an icon [[an-icon-line-is-a-rendered-width-not-a-grid-width]].

## What holds it

- The parser refuses a line outside [0.25, 3] dp and an opacity outside (0, 1] — and refuses an
  opacity past half the foreground, which is the one that matters: art that loud is not behind the
  content any more. Each watched failing, with a decoy accepting both ends of each range.
- `emit.test.ts`: both values in the TypeScript, React Native and CSS targets.
- `illustrations.test.tsx`: the rendered line at 48, 96 and 240 dp across four different grids, with
  a decoy; the backdrop opacity and the figure's 1, with a decoy.

## What it does not hold

That 0.15 is the right tone for a drawing at a size no mockup draws it at, or on a ground no mockup
puts it on. Two elements are already measured brighter — `06`'s card art at 0.31 and `15`'s strip at
0.33 — and the seven boxes that catch a neighbouring element were not measurable at all (F-282).
