# ADR-0087 — A calibrated reading does not get a higher confidence until somebody has measured that it deserves one

## Status

**Accepted** — F-053. Deviates from
[`docs/architecture/color-engine.md`](../architecture/color-engine.md) §5.

## Date

2026-09-03

## Context

The architecture describes calibrated mode as: *detect the reference card → locate patches →
solve a correction → apply it to the garment sample → set `source: 'calibrated'` **and raise the
confidence ceiling***.

Every clause of that is implemented by F-053 except the last one, and the last one is a claim.

**Confidence in this product is a bounded quality signal from stated inputs** — sample count,
post-rejection variance, illumination uniformity, blur, the capture space. Each input is a
thing that was observed. "This reading went through a correction" is not an observation about
the reading's accuracy; it is an observation about which code path ran.

**The improvement is exactly NFR-2, and NFR-2 is not demonstrated.** *"Mean ΔE00 against
reference patches improves by ≥ 50 % versus uncalibrated on the device test matrix"* is an
`attested` criterion on F-053 under [ADR-0038](0038-every-acceptance-criterion-names-its-check.md),
discharged by **F-063**'s controlled measurement session, which has not happened. Raising the
ceiling now would encode the conclusion of a measurement nobody has taken, in the one number
the product uses to tell people how much to trust a colour.

There is a second reason, narrower and just as real: **a correction can make a reading worse.**
A 3×3 fitted to patches read through a shadow, or to a card half out of frame, is still a
matrix, and applying it still produces a number. The residual is what distinguishes those
cases, and a ceiling keyed to the code path cannot see it.

## Decision

**A calibrated reading keeps the confidence its capture earned.** `calibrate()` in
`apps/mobile/src/lens/calibration.ts` copies `reading.confidence` unchanged; nothing multiplies
it, adds to it, or raises a ceiling because `source` became `calibrated`.

**What is recorded instead is the residual.** `solveCorrection` reports mean and max ΔE00
before and after correction, and those travel with the correction into the audit record. They
are numbers about this specific fit, on this specific card, in this specific light.

**`source: 'calibrated'` is still set**, and it still means what
[ADR-0005](0005-measurement-provenance-is-a-type.md) and the claims lint say it means: this
value came from a capture corrected against published reference values, and it is one of the
two sources permitted near the word "measured". The label describes the **method**. The
confidence describes the **quality**. Conflating them is what this ADR refuses.

## Consequences

**Good** — nothing in the product asserts an accuracy improvement before one has been measured,
which is golden rule 11 applied to the number it would be easiest to quietly inflate. The
residual is a better signal than a ceiling would have been: it is per-reading rather than
per-mode, and it can say *this particular correction went badly* where a ceiling cannot. And
when F-063 runs, the evidence it needs is already recorded beside every calibrated reading
taken until then, rather than having to be reconstructed.

**Bad** — **calibrated mode currently offers the user no visible benefit.** They buy a card,
scan it, and the confidence figure is identical. That is an honest state of affairs and a poor
one; it makes FR-16 hard to justify to somebody until F-063 lands. It is also a deviation from
a documented architecture, so the two disagree until one is updated — the architecture doc now
points here.

**Neutral** — **the ceiling can be raised later without changing anything else.** The decision
is deliberately shaped so that F-063's session produces a number, and that number becomes a
function of the residual rather than a constant chosen today. Nothing has to be undone.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Raise the ceiling as the architecture says** | It is what the design intended, and a correction against published values genuinely should be more accurate than none. But *should* is the whole problem: NFR-2 is `attested` precisely because nobody has measured it here, and a confidence number is the last place in this product where an expectation should be allowed to stand in for a measurement. |
| **Derive the confidence from the residual now** | The most attractive option, and the likely successor. A low residual really is evidence of a good correction. Rejected because the mapping from ΔE00 to a `[0, 1]` confidence is exactly the kind of curve that gets invented once and then defended forever — and F-063's session is what tells us where its knees belong. Inventing it first would mean measuring against a curve we had already committed to. |
| **Do not label the result `calibrated` either** | Consistent, and wrong. `source` records the METHOD, and the method really did involve a physical reference and published values; a capture corrected against a card is a different kind of fact from one that was not, whatever its quality. Refusing the label would lose real information to avoid a claim the label does not make. |
| **Ship calibrated mode only after F-063** | Tempting, since the user-visible benefit arrives with the measurement. It would leave the correction, the residual and the audit record unbuilt — and F-063 needs all three to have something to measure. The order is forced: the thing being measured has to exist first. |

## Revisit when

**F-063's device matrix session produces numbers.** That is the trigger, and it should produce
a residual-to-confidence mapping rather than a constant — the successor ADR's job is to say
where that curve's knees are and what measured them.

**If a correction is ever observed making readings worse in the field.** The residual is
already recorded; if it turns out to predict that well, refusing a correction above some
residual becomes a decision worth making, and it is a different one from this.
