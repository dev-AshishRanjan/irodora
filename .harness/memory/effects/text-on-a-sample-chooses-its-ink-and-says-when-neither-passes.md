# E-158 — Text on a sample chooses its ink, and says when neither passes

**Link:** `packages/ui/src/inkOnSample.ts` → the tinted badge · F-233 · F-259
**Guard:** `badges.test.tsx` **Severity:** medium **Feature:** F-232 (C8)

---

## Why B changes when A does

A sample is data, not a token, so no declared pairing covers text drawn on one. The contrast
gate's `pair-undeclared` rule is blind to it. `24` sets each ΔE00 figure on its row's sample, so
the ink has to be chosen somewhere, and that choice is `inkOnSample`:
- It picks `foreground` or `inverse.foreground`, whichever has the higher WCAG contrast. They are
  one light and one dark in every palette.
- It reports whether that ink clears 4.5:1.

## The case it exists to expose

A **mid-tone clears 4.5:1 with neither ink.** `24`'s tints are mid-tones: `#87795D` and `#827252`
fail both. The helper does not hide that. The result says `passes: false`, and settling it is
F-259's move (the tint's derivation), not something a component should paper over with whichever
ink looks best.

## How to check

`badges.test` asserts three things:
- "neither" on both of `24`'s mid-tones;
- the dark ink on `#4495A3`, which is the decoy, a sample the dark ink does pass;
- the swap with the theme's polarity: on Washi the foreground is the dark ink.

F-233, and anything else that sets text on a sample, should call this rather than pick an ink by
eye.

Related: [[two-thorough-checks-and-neither-looked-at-a-pair]].
