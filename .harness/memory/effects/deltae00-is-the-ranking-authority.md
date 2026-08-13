---
kind: effect
id: E-003
title: ΔE00 is the ranking authority — a defect here changes every answer silently
severity: critical
guard: gate:color-golden
confidence: 0.97
created: 2026-08-13
scope: [packages/color-difference, packages/color-naming, packages/recommendation]
links: [[srgb-xyz-is-the-root-of-every-derived-value]], [[deltae00-is-not-a-metric-and-cannot-be-indexed]]
---

# ΔE00 is the ranking authority

**Every naming result, duplicate decision, CVD separation score and recommendation ranking
derives from `deltaE00`.**

## Why it is dangerous rather than merely important

CIEDE2000's two classic implementation errors **produce plausible results**:

- **The hue-difference discontinuity at ±180°.** Handled naively, differences near the wrap
  point come out wrong — but only near the wrap point, and the values still look reasonable.
- **The `Rt` rotation term's sign.** Easy to invert. Affects blue-region comparisons
  specifically, and produces numbers in the right range.

Neither throws. Neither looks wrong in a spot check. Both change every ranking in the
product.

## The guard, and why it is specific

The golden set contains **all 34 Sharma–Wu–Dalal test pairs**, asserted to 4 decimal places.
That set exists precisely because these errors are common — the pairs were constructed to
bracket the discontinuity and the rotation region.

An implementation that does not reproduce them is wrong, regardless of how it reads and
regardless of what our other tests say.

## What must happen on a change

1. All 34 pairs, to 4 decimal places.
2. Property tests: symmetry (`ΔE(a,b) = ΔE(b,a)`) and identity (`ΔE(a,a) = 0`).
3. Oracle cross-validation against `culori` and `colorjs.io`. **A disagreement is a finding,
   not automatically our bug** — check the standard.
4. Re-run the `cvd` gate: separation scores are downstream.
5. Check duplicate-detection thresholds: they are expressed in ΔE00 units, so a change in
   the metric changes what counts as a duplicate.

## Never

Put ΔE00 behind a spatial index. It is not a metric — it violates the triangle inequality by
design — and every spatial index assumes otherwise. See
[[deltae00-is-not-a-metric-and-cannot-be-indexed]].
