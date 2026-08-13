---
name: color-math
description: Add or change colour science correctly — golden data, property tests, oracles, tolerance policy, and the traps that produce plausible wrong answers.
---

# Skill: color-math

**Read [`rules/color/color-science.md`](../../rules/color/color-science.md) and
[`docs/architecture/color-engine.md`](../../../docs/architecture/color-engine.md) first.**

This is the product. A wrong implementation here is not a bug that surfaces — it is a
product that is quietly incorrect and looks fine.

## Before you write anything

### Read the paper, not a blog post about it

Every trap below is present in at least one widely-copied blog implementation. The papers
are short and the formulae are explicit.

### Find the reference values

You need golden data **before** the implementation, from a published source, cited in the
fixture. Writing the code first means writing the test against the code, which proves only
self-agreement.

| Need | Source |
|---|---|
| sRGB ↔ XYZ ↔ Lab | Bruce Lindbloom's published tables |
| CIEDE2000 | **All 34 Sharma–Wu–Dalal test pairs** |
| OKLab | Ottosson's published reference values |
| Contrast | The WCAG worked examples |
| CVD | Published confusion-line pairs |

## Implementing

### The traps

**The sRGB transfer function has a linear segment below 0.04045.** Pure power throughout is
visibly wrong in dark colours — and dark colours are half this corpus. Golden data includes
near-black.

**CIEDE2000's hue discontinuity at ±180°, and the `Rt` sign.** Both errors produce plausible
results. This is why all 34 test pairs are asserted to 4 decimal places.

**Averaging in non-linear sRGB.** The most common colour bug there is, and it always reads
too dark. Convert to linear, average, convert back.

**Hue is an angle.** `(350° + 10°) / 2 = 0°`, not `180°`. Shortest arc, always.

**ΔE00 is not a metric.** It violates the triangle inequality by design. Never behind a
spatial index.

**Runtime matrix inversion.** Store the inverse explicitly at full published precision. A
runtime inverse introduces platform-dependent error in the one place we cannot afford it.

### The constraints

```ts
// All of these fail lint in packages/color-*:
import fs from 'node:fs';
if (typeof window !== 'undefined') { … }
process.env.X;
import chroma from 'chroma-js';
```

`float64` throughout. No approximated transcendentals. Round only at the boundary.

## Verifying

### 1. Golden

```ts
it('matches the Sharma–Wu–Dalal reference set', () => {
  for (const { lab1, lab2, expected } of ciede2000Golden) {
    expect(deltaE00(lab1, lab2)).toBeCloseTo(expected, 4);
  }
});
```

**If a golden test fails after your change, the default assumption is that you broke the
engine.** Changing a golden value requires an ADR — it is a claim about physical reality.

### 2. Property

```ts
fc.assert(fc.property(arbitrarySrgb(), (c) => {
  expect(deltaE00(c, xyzToSrgb(srgbToXyz(c)))).toBeLessThan(0.01);
}));
```

Round-trip · ΔE symmetry and identity · lightness monotonicity · output bounds · hue wrap ·
gamut-mapping idempotence.

### 3. Oracles

Cross-validate against `culori` and `colorjs.io` over large random samples. **A
disagreement is a finding, not automatically our bug** — determine which is right against
the published standard before changing anything.

### 4. Cross-platform identity

Node, browser, React Native. **Bitwise identical.** This is the test that proves NFR-3, and
it is the one that catches an accidentally-introduced platform dependency.

### 5. Effects

Did you change a conversion? Then **every precomputed corpus value is invalid**
([E-001](../../state/effects.json)). Rebuild the corpus.

## Tolerance policy

| Comparison | Tolerance |
|---|---|
| Golden conversion | ΔE00 ≤ 0.01, Lab ≤ 0.02 absolute |
| CIEDE2000 vs reference | 4 decimal places |
| Round-trip property | ΔE00 ≤ 0.01 |
| Cross-platform | **Bitwise. Zero tolerance** |

A loosened tolerance requires an ADR. Loosening one to make a test pass is the specific
failure this skill exists to prevent.

## Language

Applies to comments and variable names as much as to UI copy
([ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md)):

`isWithinTolerance`, not `isExactMatch`. "Estimates", not "measures". "Closest reference",
not "exact colour". Chroma is not saturation.
