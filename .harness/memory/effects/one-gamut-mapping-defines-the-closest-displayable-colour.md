---
kind: effect
id: E-012
title: One gamut mapping defines "the closest displayable colour", for every surface at once
severity: high
guard: gate:color-golden
confidence: 0.9
created: 2026-08-15
scope: [packages/color-spaces, packages/color-harmony, packages/color-core, apps/web, apps/mobile]
links: [[deltae00-is-the-ranking-authority]], [[one-separation-definition-for-ui-and-engine]]
---

# One gamut mapping, or the same colour twice

`gamutMap` answers a question every surface asks: **this colour does not fit the display —
what do we show instead?** Harmony generation (F-014) must map every colour it returns.
Corpus values outside sRGB need a fallback. A P3 capture rendered on an sRGB screen goes
through it. So does any token that ever leaves the manifest's narrow gamut.

That makes it the same shape as [[deltae00-is-the-ranking-authority]] and
[[one-separation-definition-for-ui-and-engine]]: **a definition shared by many callers, with
no import edge that shows the sharing.** Nothing breaks if a second one appears. The build
stays green, the tests stay green, and the product quietly shows two different colours for
the same input depending on which path produced it.

## What a second implementation looks like

It does not look like a rival algorithm. It looks like:

- `Math.min(1, Math.max(0, channel))` — a clip, written inline because "the value was
  slightly out of range". This is the one that will actually happen, and it moves hue by up
  to **33.6°** on saturated colours.
- A component that renders `oklch()` and lets **the browser** map it. CSS Color 4's algorithm
  disagrees with ours by up to **5.21 ΔE00** and drifts hue up to **11.97°** (ADR-0045). Both
  are "correct"; they are not the same colour.
- A second `isInGamut` with a different epsilon, so the boundary moves depending on who asks.

## What must happen

1. **Anything that needs a displayable colour calls `gamutMap`.** Not a clip, not `toGamut`
   from a library, not the browser.
2. **Where CSS must do the mapping, hand it a colour we already mapped.** Then both paths
   agree because there is nothing left to map.
3. **`GAMUT_EPSILON` is the only gamut tolerance.** A second one is a second boundary.
4. Re-run `pnpm test:golden` after any change to the conversions — the mapping is a search
   over `xyzToSrgb`, so a conversion change moves every mapped value without touching
   `gamut.ts`.

## The bound, stated

`L` and `H` are preserved **exactly** in OKLCh (7 × 10⁻¹², the round-trip noise). After
rendering, a final clamp of at most `GAMUT_EPSILON` per channel applies, and near the black
point that tiny absolute movement is a large relative one — hue drift reaches 23° for results
below `L, C = 0.01`, where OKLCh hue is not a meaningful angle. Above `L, C = 0.05` it is
6.9 × 10⁻⁵°. Anything quoting a hue-preservation figure must say which regime it means.

## The consumer that depends on more than the result (F-014)

`@irodora/color-harmony` does not merely *call* `gamutMap` — it **depends on the property**
ADR-0045 chose. Criterion 4 requires every generated colour to be mapped; FR-6 requires each
generator to hold its relationship to a stated tolerance. Those coexist only because mapping
reduces chroma and holds hue.

Measured after mapping: a complementary pair stays 180° apart to **6.2 × 10⁻⁵ °**, a triad
120° apart to 5.3 × 10⁻⁵ °.

**If gamut mapping ever adopted MINDE** — up to 11.97° of hue drift, the alternative ADR-0045
rejected — every hue-based generator would quietly return something that is no longer the
relationship it claims. A triad that is not a triad, with nothing thrown and no test failing
unless one measures the drift. `packages/color-harmony/test/harmony.test.ts` is that test.

Chroma relationships are different and the difference is stated rather than hidden:
`chroma-contrast` asks for a ratio, and mapping may reduce one end and not the other. Its
tolerance is weaker, and every generated colour reports `wasGamutMapped` and `gamutDeltaE00`
so the cost is a number rather than a phrase.
