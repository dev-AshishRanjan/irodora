---
kind: lesson
title: The chromatic adaptation transform is a product decision, not an implementation detail
severity: high
created: 2026-08-14
scope: [packages/color-spaces, packages/color-core, content]
links: [[srgb-xyz-is-the-root-of-every-derived-value]], [[deltae00-is-not-a-metric-and-cannot-be-indexed]]
---

# The chromatic adaptation transform is a product decision, not an implementation detail

**CAT16 and Bradford agree to a median of 0.15 ΔE76 and disagree by up to 8.6 on saturated
blue. Blue is half this corpus.**

## The numbers

Measured over 4 000 stratified sRGB samples adapted D65 → D50
(`packages/color-spaces/test/adaptation.test.ts`):

| | ΔE76 |
|---|---|
| median | 0.15 — invisible |
| worst | **8.57**, at sRGB `[0.087, 0.017, 0.993]` |

Every cone-space transform diverges most in the blue region, because that is where the cone
responses are least well separated. It is also where indigo, ai and kon live.

## Why this is not an implementation detail

Two colours that a user would call "the same navy" can differ by 8 ΔE00 depending on a
choice made in one line of `matrices.ts`. That reaches:

- **every derived corpus value**, the same way `srgbToXyz` does — see
  [[srgb-xyz-is-the-root-of-every-derived-value]]. Changing it is a corpus rebuild;
- **any comparison against a colorimeter or another tool.** When a professional user's
  software disagrees with us by roughly this much on a blue, the first question is which
  transform each side used, not which side is broken;
- **the Lens**, which adapts a measurement taken under a warm bulb to daylight before saying
  anything about it. That adaptation is the product.

## How to apply

- **Name the default in one place.** `DEFAULT_ADAPTATION` exists so the choice is one edit and
  one ADR, not a constant repeated at twelve call sites.
- **Keep Bradford available even though CAT16 is better.** Reproducing someone else's number
  is worth having; when a colorimeter's software disagrees, being able to switch and see the
  difference vanish *identifies* the cause in one step.
- **State the transform alongside any published ΔE figure.** A ΔE00 without its adaptation
  transform is under-specified by up to 8 units in exactly the colours this product is about.
- **Adapting to the same white point must be exactly the identity.** `M⁻¹ · I · M` is the
  identity in arithmetic and one part in 10^16 away in float64 — enough for "adapt everything
  to D65 on load" to perturb a corpus that was already D65, and enough to show up in the
  cross-platform identity digest.

## Related

Same shape as [[srgb-xyz-is-the-root-of-every-derived-value]]: a single constant with no
import edge to the thousands of values that depend on it.
