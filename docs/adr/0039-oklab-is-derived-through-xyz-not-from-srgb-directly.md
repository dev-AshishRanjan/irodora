# ADR-0039 — OKLab is derived through XYZ, and that costs 0.047 ΔE00 against every other implementation

## Status

Accepted

## Date

2026-08-14

## Context

Ottosson publishes OKLab with **two** entry points, and both are his:

- **M1**, from CIE XYZ (D65) to the LMS cone space, and
- a separate matrix from **linear sRGB** to the same LMS space, tuned so that sRGB white
  lands exactly on `(1, 0, 0)`.

They are not the same composition. Going `sRGB → XYZ → LMS` and going `sRGB → LMS` directly
produce results that differ, because the second matrix absorbs the sRGB→XYZ step at a
precision chosen to make white exact rather than at the precision of the two matrices
multiplied together.

`culori` and `colorjs.io` — and, in practice, browsers implementing CSS `oklch()` — use the
direct linear-sRGB path. Implementing F-006 through XYZ therefore put us in measured
disagreement with every other implementation we can check against, which is exactly the
situation [ADR-0004](0004-own-the-colour-engine-culori-as-test-oracle.md) says to resolve
against the published standard before changing anything.

There is no standard to resolve it against. Both matrices are published, by the same author,
in the same document. The question is not which is correct but which composition this
repository uses.

## Decision

**OKLab is computed as `XYZ → LMS → OKLab`, using M1. The direct linear-sRGB matrix is not
used, and no direct path from any input space to OKLab exists in the engine.**

This follows from [ADR-0003](0003-canonical-colour-representation-xyz-d65.md) rather than
overriding it: CIE XYZ (D65) is canonical and everything derives from it. A direct
sRGB → OKLab path would make OKLab the one space with two derivations, and which one a
caller got would depend on which function they reached for.

The cost is measured over 10 000 stratified samples and asserted in
`packages/color-spaces/test/oracle.test.ts`:

| | |
|---|---|
| Component difference vs `culori` and `colorjs.io` | **1.24e-4** in OKLab units |
| Perceptual size of that difference | **0.047 ΔE00**, worst case at white |
| Both oracles differ from us by the **same** amount | to within 1e-9 |

That last row is the part that made this a decision rather than a bug hunt: two independently
written libraries disagreeing with us by an identical amount is the signature of a path
difference, not of two coincidentally similar defects.

## Consequences

### Good

- **One derivation per space.** "Convert to OKLab" has a single meaning, and a colour that
  arrived as Display-P3 and a colour that arrived as sRGB reach OKLab by the same route.
- **The reproducibility envelope stays honest.** A stored result can be replayed because
  there is one path to replay, not one path per input space.
- **White's residual is visible rather than hidden.** D65 white through this route is
  `L = 0.9999988`, `C = 1.25e-4`. The direct matrix would make that exactly `(1, 0, 0)` and
  would make the residual disappear from view without removing it from the other spaces.

### Bad

- **Our OKLCh differs from the browser's.** F-003 emits OKLCh design tokens and F-017 hands
  them to the browser as `oklch()`. The browser will resolve them by its own path, so a token
  we computed and a token the browser rendered differ by up to 0.047 ΔE00. This is two orders
  of magnitude below what a display or a camera resolves, and it is far below the contrast
  gate's sensitivity — but it means "the browser and the engine agree exactly" is a claim we
  cannot make, and copy must not make it.
- **Anyone comparing our output to `culori` or `colorjs.io` in OKLab will see a difference**
  and will have to be told why. The test names the reason so the answer is one file away.
- **A future decision to switch would move every OKLCh value in the corpus** and would need
  its own ADR and a corpus rebuild ([E-001](../../.harness/state/effects.json)).

### Neutral

- 0.047 ΔE00 is roughly a twentieth of a just-noticeable difference under ideal viewing
  conditions. Nothing in the product's own accuracy budget is affected: the device colour lab
  (NFR-2, F-063) measures in whole ΔE00 units.

## Alternatives considered

**Use the direct linear-sRGB matrix for sRGB inputs and M1 for everything else.** This is what
would give bitwise agreement with the browser for the case that matters most. Rejected: it
makes OKLab the only space whose value depends on where the colour came from, which breaks the
property that two colours with identical XYZ are identical everywhere downstream. That
property is what makes the corpus comparable at all.

**Adopt the direct matrix everywhere by pre-composing it with XYZ → linear sRGB.** Rejected
for a subtler reason: the resulting matrix is not one Ottosson publishes, so the golden set
would lose its only `published-value` entries and the engine's OKLab would be checkable
against nothing but itself.

**Treat the disagreement as a defect and chase it.** This was the first assumption, and
measuring it is what showed it was not: the two oracles differ from us by the same 1.24e-4 to
within 1e-9. Recorded because the next person to notice the disagreement will start from the
same assumption.
