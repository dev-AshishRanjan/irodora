# E-160 — A colour drawn against a sample moves per sample

**Link:** `onSample` (design-tokens) → `sampleEdge` / `sampleInk` → `Swatch`, `Strip`, `FabricSwatch`,
`Text on` → gate 9's corpus test **Guard:** `on-sample.test.ts`, `swatch-edge.test.ts`,
`screens-sample-ink.test.ts` (gate 9) **Severity:** high **Feature:** F-233 (ADR-0116)

---

## Why B changes when A does

R9 §4 E3 moves a token the smallest OKLab lightness step that passes a blocking floor. The manifest
applies it per theme, because a theme's surfaces are known when it is built. A sample is not known
until it is drawn, so two things drawn against one are chosen at render:
- **the ink of text on it** (C8), at 4.5:1: `foreground` or `inverse.foreground`, unmoved where one
  passes;
- **the line around it**, at 3:1: the README keyline composited over the well (or the well itself
  where no keyline is drawn), unmoved where it passes.

Where nothing drawn passes, the smallest lightness move wins, ties broken by ΔE00. Where no
lightness move reaches (the device palette's tinted inks, on 222 of 720 seeds), the candidate gives
up the least chroma it must, hue held, and then moves.

So a change to the search, the tie-break, the floors, the inks, the keyline or the well repaints
every sample, and the colour is computed on Hermes and on Node alike.

## What surprised us

- **"White and black clear 4.58:1 against anything" proved nothing.** A move holds chroma, so it never
  reaches either. Reach is what matters: √((Y_max + 0.05) / (Y_min + 0.05)) over what a move can
  reach must clear the floor. The four palettes do; device palettes do not, which made the fallback
  live in production.
- **The first fallback dropped chroma to 0** (a grey for a red) and ranked a whole grid by ΔE00 at
  630 ms per sample interpreted. The one that shipped walks chroma down from the candidate's own and
  costs 12 ms.
- **A minimal move lands a hair above the floor**, so a scan must quantise its samples to 8 bits, as
  every drawn colour is, or it reports a failure between two codes.

## How to check

- `on-sample.test`: the gamut scan, the reach, the 222 gaps, the tie, the chromatic fallback,
  minimality.
- `screens-sample-ink.test` (gate 9): the census pinned per palette, and a digest of every value
  drawn against the corpus. A drift fails there.

Related: [[text-on-a-sample-chooses-its-ink-and-says-when-neither-passes]],
[[a-component-can-satisfy-the-letter-of-its-own-proof]], [[text-on-a-sample-is-measured-whatever-chose-its-ink]].
