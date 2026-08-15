# ADR-0041 — Three definitions of relative luminance coexist, and none may be substituted for another

## Status

Accepted

## Date

2026-08-15

## Context

By the end of F-007 this repository computes relative luminance three different ways:

| Used by | Coefficients | Linearisation |
|---|---|---|
| `@irodora/color-spaces` | the exact sRGB→XYZ Y row, 17 digits | piecewise, IEC 61966-2-1 |
| `wcagContrast` | `0.2126, 0.7152, 0.0722` | piecewise, cutoff `0.04045` — same as IEC (ADR-0042) |
| `apcaLc` | `0.2126729, 0.7151522, 0.072175` | **pure power 2.4, no linear segment** |

Three transcriptions of the same physical quantity is the exact shape of the hazard
[E-005](../../.harness/state/effects.json) exists to warn about: *a second definition means a
claimed property nobody delivers*. The obvious instinct — and the one a reviewer will have —
is that two of the three must be wrong, and that the engine's should win because it is the
most precise.

**It is the wrong instinct, and the cost of following it is measurable.**

**WCAG.** The specification normatively defines relative luminance with coefficients rounded
to four decimal places, and its worked examples are computed with them. Substituting the
engine's exact Y row changes `rgb(27, 129, 156)` on white from **4.49990508** to
**4.50007872** — from failing AA to passing it. A sweep of 8-bit colours against white found
**984 such flips** across the 3:1, 4.5:1 and 7:1 thresholds — the full 16,777,216-colour sweep, verified by an independent review after this ADR first cited 111 from a partial one. A WCAG conformance claim computed
with different coefficients is a claim the specification does not support, and "the difference
is only 5e-4" is not an argument in a procurement questionnaire.

**APCA.** The algorithm specifies a *simple gamma* — `|v|^2.4`, with no linear segment near
black — and a third coefficient rounding taken from Lindbloom. Routing it through either
piecewise transfer function changes Lc for every dark colour: at 8-bit code 3 the two
linearisations differ by a factor of **39**. Most of this corpus is dark.

Both roundings are also *load-bearing in ways that look like defects*. WCAG's sums to exactly
1, which is why a neutral has bit-identical luminance under WCAG and under the engine — and
why a test suite built from greys would find the three definitions interchangeable. APCA's
sums to **1.0000001**, so `apcaLuminance(white)` is not 1; normalising it would break every
published Lc value.

## Decision

**All three definitions exist, in one file, with the reason. None is derived from another, and
each is used only by the standard that mandates it.**

1. `packages/color-difference/src/luminance.ts` holds the WCAG and APCA coefficient sets and
   their linearisations **side by side**, with a table naming which standard requires which.
   Scattered across the modules that consume them they look like three transcriptions, two of
   which must be wrong; together they are visibly three standards.
2. **The engine's definition is not duplicated there.** Anything wanting *our* luminance calls
   `srgbToXyz(rgb)[1]`, which has exactly one implementation.
3. **Every constant is a golden entry at tolerance 0**, compared digit for digit with no
   arithmetic in between — including the two coefficient sums, precisely because one of them
   looks wrong.
4. **The divergences are asserted as tests, not documented as comments**: that WCAG and the
   engine agree bitwise on neutrals; that they differ by 3.9e-5 on pure red; that the
   difference flips a real pass/fail; and that APCA's pure power function is not derivable
   from either piecewise one.

## Consequences

### Good

- **A WCAG number from this codebase is a WCAG number.** The contrast gate (F-003) can state
  conformance without an asterisk.
- **The instinct to unify is now expensive to act on.** Anyone who tries meets a failing test
  that names a specific colour and a specific threshold, rather than a comment they can
  disagree with.
- **APCA stays reproducible.** Its Lc values match `colorjs.io` bitwise, which they would not
  if the linearisation were "improved".

### Bad

- **Three near-identical constant sets invite exactly the transcription error F-006 shipped.**
  The digit-for-digit golden entries are the mitigation, and they are the only thing standing
  between this decision and a subtly wrong constant that every arithmetic check passes.
- **A reader encountering `0.2126` after `0.21263900587151027` will assume a bug** until they
  find this ADR. The file-level comment in `luminance.ts` exists to shorten that path.
- **If WCAG 3 supersedes WCAG 2.x with APCA**, two of these three collapse into one and this
  ADR is superseded. That is a good outcome and it is not near.

### Neutral

- The engine and WCAG agree to the last bit on every neutral, so the distinction is invisible
  in exactly the cases people spot-check with.

## Alternatives considered

**Compute everything from the engine's exact Y row.** The precise, tidy option. Rejected on
measurement: it breaks WCAG conformance for 984 colours and changes APCA's
answer for every dark colour. Precision is not the objective when the deliverable is
reproducing a specification.

**Keep each standard's constants inside the module that uses them.** Better containment, and
it was the plan's original instruction. Rejected because it hides the fact that there are
three: a reader of `wcag.ts` alone sees one plausible set of coefficients and no reason to
suspect the question was ever asked. One file, one table, one explanation is worth the weaker
containment — which is recovered by the rule that nothing outside `wcag.ts` and `apca.ts` may
consume them.

**Route APCA through WCAG's luminance**, since both are "contrast" luminances. Rejected: it is
a factor-of-39 error at the dark end, and it would break bitwise agreement with the only
independent APCA implementation available to check against.
