---
name: measurement-claims
description: Check that every claim about colour accuracy — in copy, in code, or in your own report — has a measurement behind it.
---

# Skill: measurement-claims

[ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md) ·
[`measurement-claims.md`](../../governance/measurement-claims.md) · NFR-21.

## When

Writing UI copy · marketing copy · app-store text · documentation · a code comment · a
variable name · **your own report of what you verified**.

## The check

### 1. What is the provenance?

`Provenance.source` determines what may be said:

| Source | May say | Never |
|---|---|---|
| `reference` | "reference value", "standard" | — |
| `calibrated` | "calibrated measurement", "measured" | "exact", "perfect" |
| `estimated` | "estimated", "approximately", "closest reference" | "measured", "exact", "actual colour" |
| `declared` | "selected", "entered" | "measured", "detected" |

### 2. Banned constructions

```
"exact colour"       "100% accurate"      "perfect match"
"the true colour"    "lab-accurate"       "guaranteed"
"AI-powered"         "professional-grade" (outside calibrated mode)
"measures the colour" (for an estimated source)
```

### 3. Is there a number? Then there must be a row

Any accuracy figure traces to
[`tests/color-lab/results/`](../../../tests/color-lab/) — device, mode, illuminant, sample
size, mean ΔE00, p95 ΔE00.

**No row, no number.**

### 4. Naming is never identity

"Closest digital reference", never "this is 藍鼠". A rendered hex is a modern approximation
of a colour historically produced by a dye on a fibre under daylight.

## It applies to code

```ts
// No.
function isExactMatch(a: Color, b: Color): boolean
const EXACT_COLOR_THRESHOLD = 1.0;

// Yes.
function isWithinTolerance(a: Color, b: Color, tolerance: number): boolean
const PERCEPTIBLE_DIFFERENCE_THRESHOLD = 1.0;
```

A name propagates into a field, then into a response, then into copy, then into a claim we
cannot support. It is the same failure at four removes.

## It applies to your own reports

**Golden rule 11.** Do not write "tests pass" if you did not run them. Do not write
"verified" without the gate output. **Say which gates did not run.**

A report claiming six green gates when four ran is a false claim about verification — the
same category of dishonesty, and a more immediately damaging one.

## Rewriting

| Instead of | Write |
|---|---|
| "Instantly identifies any colour" | "Estimates colour from your camera, with a confidence score" |
| "100% accurate colour matching" | "Typically within ΔE00 4 in good light — see accuracy" |
| "AI-powered recommendations" | "Deterministic recommendations you can reproduce" |
| "The exact shade of your shirt" | "The closest reference to your shirt's colour" |
| "Professional-grade colour" | "Lab and LCh values, with ΔE00 comparison" |

## Adding an allowlist entry

A **human decision**, recorded with the measurement that supports it.

An agent may not decide that a claim is justified. That is the one judgement this policy
keeps out of the loop that has an incentive to make it.
