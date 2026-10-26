# E-222 — A control on a sample takes the sample's ink

**Link:** `Button`'s `on` (`packages/ui/src/Button.tsx`) → `07`'s compact Swaps, `sampleInk` **Guard:**
`forms-07.test` (both inks, in both themes, on the words, glyph and outline; the default tree as the
decoy); the conformance suite's on-sample Button subjects in every palette **Severity:** medium
**Feature:** F-248

---

## Why B changes when A does

`07` draws slots 3 and 4's *Swap* outlined on the sample itself: its words and edge sit on the colour.
A theme token cannot be their ink — Washi's dark words would sit on a dark sample — so they take the ink
text on that sample takes (C8, ADR-0116), chosen per sample by `sampleInk`, and so pass 4.5:1 against it
in every palette (ADR-0153 D2).

`Button on` is `sampleInk`'s second consumer after `Text on`. A change to how `sampleInk` chooses, or to
how the Button paints its parts, moves every compact Swap on `07` at once; the conformance suite measures
the words against the sample they sit on, which is why its subjects draw the Button on a sample of its
own rather than on the page.

## What it does not guard

- **The outline as a non-text edge** below 3:1 on a mid-tone. It is the same ink as the words, which pass
  4.5:1; the contrast gate measures declared pairs, and this one is per sample.

Related: [[text-on-a-sample-is-measured-whatever-chose-its-ink]].
