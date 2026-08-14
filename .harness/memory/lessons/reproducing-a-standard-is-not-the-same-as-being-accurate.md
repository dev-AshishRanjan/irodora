---
kind: lesson
title: Reproducing a standard is not the same as being accurate
severity: high
created: 2026-08-15
scope: [packages/color-difference, packages/design-tokens, apps/web]
links: [[measure-what-a-golden-set-can-detect-before-trusting-it]], [[two-oracles-agreeing-against-you-is-evidence-about-you]], [[the-adaptation-transform-is-a-product-decision-not-a-detail]]
---

# Reproducing a standard is not the same as being accurate

**WCAG specifies relative-luminance coefficients rounded to four decimal places. Using our
exact ones instead flips `rgb(27, 129, 156)` on white from failing AA to passing it — and 110
other colours besides.**

## The measurement

| | contrast against white |
|---|---|
| WCAG's published `0.2126, 0.7152, 0.0722` | **4.49990508** — fails AA |
| the exact sRGB → XYZ Y row | **4.50007872** — passes AA |

A sweep of 8-bit colours against white found **111 flips** across the 3:1, 4.5:1 and 7:1
thresholds. The difference in the ratio is around 5e-4, which is exactly the size that reads
as "obviously negligible, just call `srgbToXyz`".

## Why the instinct is wrong

Most of the numbers in this repository answer *"what colour is this really?"* and for those,
more precision is strictly better. A conformance number answers a different question:
**"does this meet the published criterion?"** — and there the deliverable is agreement with a
document, not proximity to physical truth.

Three consequences that took a measurement each to establish:

1. **The rounding can be load-bearing.** WCAG's coefficients sum to exactly 1, which is why a
   *neutral* has bit-identical luminance under WCAG and under the engine. Every grey agrees.
   Only chromatic colours diverge — so a test suite built from greys concludes the two are
   interchangeable.
2. **A different standard may specify a rounding that looks broken.** APCA's coefficients sum
   to 1.0000001, so `apcaLuminance(white)` is not 1. Normalising it would break every
   published Lc value.
3. **A different standard may specify maths that looks primitive.** APCA linearises with a
   pure power function and no linear segment near black. At 8-bit code 3 that is a factor of
   39 away from the piecewise transfer function — and it is correct, because it is what the
   algorithm specifies.

## How to apply

- **When implementing a specification, implement the specification.** Precision improvements
  are a different deliverable and need their own decision (ADR-0041).
- **Find the case where the difference changes an answer, and pin it as a test.** "5e-4" is
  arguable; "this colour passes AA under one and fails under the other" is not. Without that
  test, the next person simplifies it and is right to.
- **Never share a constant between two standards because the numbers look similar.** Three
  luminance definitions live in one file here specifically so a reader sees all three and the
  reason, rather than one plausible set with no hint the question was ever asked.
- **This is the [[the-adaptation-transform-is-a-product-decision-not-a-detail]] shape again**:
  a constant with no import edge to the thousands of decisions that depend on it.

## Related

The counterweight to [[two-oracles-agreeing-against-you-is-evidence-about-you]]. There, two
libraries agreeing against us meant we were wrong. Here, `colorjs.io` computes WCAG contrast
from the exact Y row and disagrees with us on every chromatic colour — and we are right,
because the question is which document is being reproduced. **An oracle disagreement is a
finding either way; what settles it is the source, never the count.**
