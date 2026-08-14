# ADR-0040 — OKLab uses CSS Color 4's recalculated matrices, not Ottosson's original ten decimals

## Status

Accepted. Supersedes [ADR-0039](0039-oklab-is-derived-through-xyz-not-from-srgb-directly.md).

## Date

2026-08-14

## Context

Ottosson's 2020 article publishes the OKLab transform as two matrices given to ten decimal
places. They are the obvious thing to transcribe, and F-006 transcribed them.

Two problems surfaced, in this order:

**1. D65 white does not land on `(1, 0, 0)`.** Composed with the sRGB→XYZ matrix this
repository uses, Ottosson's constants put the reference white at `L = 0.9999988`, chroma
**1.25e-4**. A neutral that is very slightly not neutral, at the top of the lightness range.
This was originally documented as an inherent property of OKLab and asserted in the golden
set as such.

**2. We disagreed with both `culori` and `colorjs.io` by 1.24e-4**, and by the *same* amount to
within 1e-9. That was read as proof of a structural difference — the theory being that both
libraries use Ottosson's separate direct linear-sRGB matrix while we compose through XYZ — and
written up as [ADR-0039](0039-oklab-is-derived-through-xyz-not-from-srgb-directly.md).

**The theory was wrong.** `colorjs.io` declares `base: XYZ_D65` and converts `fromBase(XYZ)`:
the same path as ours. Reading its source is what settled it, and its comment names the real
difference — *"Recalculated for consistent reference white"*, citing csswg-drafts issue 6642.

Both libraries carry CSS Color 4's recalculation of Ottosson's transform, derived against the
same white point the rest of the pipeline uses. We carried the original. That, and only that,
was the 1.24e-4. It also explains problem 1: the white residual was an artefact of composing
matrices derived against slightly different white points, not a property of the space.

The two problems were the same problem.

## Decision

**`packages/color-spaces` uses the CSS Color 4 matrices for OKLab, in all four directions,
and cites CSS Color 4 for them.**

The transform is still Ottosson's. These constants are a more precise statement of it, not a
different one — which is why Ottosson's published test table still reproduces to the three
decimals he prints it at, and why the golden set keeps those entries.

Measured after the change, over 10 000 stratified samples:

| | Before | After |
|---|---|---|
| D65 white chroma | 1.25e-4 | **5e-16** |
| Worst difference vs `colorjs.io` | 1.24e-4 | **0 — bitwise** |
| Worst difference vs `culori` | 1.24e-4 | **8.9e-16** |
| Worst ΔE00 vs `culori` | 0.046 | **0** |

`culori` composes linear-sRGB → LMS in a single matrix rather than going through XYZ, and
agrees to float64 rounding anyway. That is the direct evidence that the *path* never mattered
— the claim ADR-0039 was built on.

**The route through XYZ is unchanged and is still the decision.** `convert` sends everything
through the canonical hub (ADR-0003), and no direct path from any input space to OKLab exists
in the engine. That part of ADR-0039 was right; only its explanation of the disagreement was
wrong.

## Consequences

### Good

- **Our OKLCh and the browser's are the same number.** F-003 emits OKLCh tokens and F-017
  hands them to the browser as `oklch()`. Both resolve them through the CSS Color 4 matrices,
  so a token we compute and a token the browser renders now agree bitwise. ADR-0039 recorded
  that we would have to tell people they differ; we do not.
- **White is exactly neutral**, so a grey derived from the white point has zero chroma rather
  than 1.25e-4 of it. The corpus is half neutrals.
- **Bitwise agreement with an independent implementation is a much stronger oracle** than
  agreement to 1e-4. The assertion is now `toBe(0)`, which can detect a single changed bit.

### Bad

- **The citation is CSS Color 4, not the original article.** Anyone checking our constants
  against Ottosson's blog post will find they differ in the seventh decimal and will need this
  ADR to know why. The golden set names both: the matrices cite CSS Color 4, the reference
  table cites Ottosson.
- **A future CSS Color 4 revision to these matrices becomes our problem**, and would be a
  corpus rebuild ([E-001](../../.harness/state/effects.json)). Tracking a living specification
  has that cost; the alternative was disagreeing with every browser permanently.
- **`packages/color-spaces` now sources its matrices from two different publications** — IEC /
  SMPTE / CSS Color 4 for RGB, CIE for Lab, CSS Color 4 for OKLab, Li et al. and Lindbloom for
  adaptation. Each is cited per entry, but there is no single document behind the engine.

### Neutral

- The change moved every OKLab value by ~1e-4 and every OKLCh hue by ~0.007°. No corpus exists
  yet, so nothing had to be rebuilt. Doing this after F-012 would have been a corpus republish.

## Alternatives considered

**Keep Ottosson's original constants and document the residual.** This was the state for the
length of one commit. Rejected once the residual was understood as an artefact rather than a
property: documenting a defect accurately is still shipping the defect, and "white is not
quite neutral" is a bad thing to explain to a user of a colour product.

**Use Ottosson's separate direct linear-sRGB matrix for sRGB inputs.** Rejected for the reason
ADR-0039 gave, which survives its supersession: it makes OKLab the only space whose value
depends on where the colour came from, and that breaks the property that two colours with
identical XYZ are identical everywhere downstream.

**Recompute the matrices ourselves from the LMS primaries.** Rejected. It would produce
numbers no source publishes, and the golden set would then be checking the engine against
arithmetic performed by the same person who wrote the engine.

## What this cost, and the check that now exists

The original transcription also **dropped a digit** — `0.0329845436` typed as `0.032984543` —
and nothing caught it. Ottosson's table is quoted to three decimals and cannot resolve a
1.8e-8 relative error; the oracle check had 7.6e-5 of headroom because it was accommodating
the 1.24e-4 disagreement this ADR removes. The defect sat in the gap between two checks that
were each described as covering the other's blind spot.

**The matrices are now golden entries in their own right, compared digit for digit at
tolerance 0.** A transcription error is a transcription error, and the only reliable check is
comparing the transcription to the source. That entry is in
`packages/color-spaces/golden/oklab.golden.json` and it would have failed on day one.
