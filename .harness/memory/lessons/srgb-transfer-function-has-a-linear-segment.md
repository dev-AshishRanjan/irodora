---
kind: lesson
title: The sRGB transfer function has a linear segment, and this corpus lives in it
category: error-resolution
confidence: 1.0
created: 2026-08-13
scope: [packages/color-spaces]
links: [[averaging-non-linear-srgb-reads-too-dark]], [[srgb-xyz-is-the-root-of-every-derived-value]]
---

# The sRGB transfer function has a linear segment

**Below `0.04045`, sRGB is linear — not a power curve.** Implementations that use the pure
power function throughout are visibly wrong in dark colours.

```
sRGB → linear:
  c ≤ 0.04045  →  c / 12.92
  c >  0.04045  →  ((c + 0.055) / 1.055) ^ 2.4
```

## Why it matters here more than elsewhere

**Half this corpus is dark.** Indigo (藍), sumi ink (墨), charcoal, kachi-iro, deep
blue-greys — the Japanese colour tradition the product is built on lives disproportionately
in the region where the cutoff applies.

In a typical application the error is invisible. Here it is in the product's core subject
matter.

## The reason it survives review

The pure-power version is shorter, reads cleanly, and is what most blog posts show. It is
correct to within a fraction of a percent for mid-tones, so a spot check on a mid-grey
passes. The error concentrates exactly where nobody spot-checks.

## How to apply

Implement the piecewise function, both directions. **Put near-black values in the golden
set** — they are the only thing that distinguishes a correct implementation from a
plausible one.

Same shape of trap in CIELAB: the ε/κ boundary near black is also piecewise, and also
routinely simplified.

## Read the standard, not a summary

This lesson generalises: every trap in this domain that produces a *plausible* wrong answer
is present in at least one widely-copied blog implementation. The papers and standards are
short and explicit.
