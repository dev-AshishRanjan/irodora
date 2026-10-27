# ADR-0154: 08's compare samples are drawn apart, as 08 draws them, each above the judgeable floor

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-249 |
| **Supersedes in part** | [ADR-0095](0095-a-sample-that-carries-a-number-subtends-the-observer-that-number-was-fit-for.md)'s *"And the samples touch"*, for Compare; F-151's second criterion's *"edge to edge"* |
| **Applies** | Golden rules 11 and 14; R9 §1, §10; FR-48; [ADR-0125](0125-a-delta-e00-is-described-by-one-table-of-three-bands-anchored-on-published-thresholds.md) (a band describes the printed number) |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`08` draws two samples, 151.5 dp each, in one card split down its whole height by a 1 dp seam, each
sample 11 dp from the seam. ADR-0095 (F-151) made Compare's samples touch through `Pair`, with no line
and no corner where they meet, because *"the question how different are these two is answered at the
boundary"* and anything drawn between them is an induced edge that costs most for small differences.

Rule 14 builds `08` unless golden rule 11, 12 or 13, a blocking gate, two contradicting mockups or an
undrawn capability forces otherwise. So the question is whether ADR-0095's arrangement is one of
those, or a design judgement `08` now answers.

## Research, and what it shows

- **The formulas were fit on hairline pairs, not gapless ones.** *"All color-difference formulas are
  developed to evaluate color differences for pairs of stimuli with hair-line separation"* (arXiv
  1904.11293, *A color-difference formula for evaluating color pairs with no separation — ΔE_NS*).
  The same paper reports CIE's reference conditions as a hairline-divided pair over more than 4°
  under a D65 simulator. CIE 116-1995's own text was not read here; its conditions are cited only as
  that paper reports them.
- **Separation changes the perceived difference, in both directions.** Printed pairs with no
  separation showed *"a clear separation effect"* against the hairline data, and the effect reverses
  above a CIEDE2000 difference of 9.1 (arXiv 1904.11293; IS&T CIC 26, 2018). A gap's size changes
  discrimination ellipses (RiuNet 10251/140937).
- **So neither arrangement is the condition ΔE00 was fit under.** ADR-0095's gapless pair is the
  no-separation condition; `08`'s 11 dp gaps either side of a seam are a gap condition. ADR-0095's
  arrangement half is a design judgement about where the eye judges, not a standard and not a
  golden rule. Its size half rests on the 2° observer, and is unaffected.
- **The cost ADR-0095 names does not arise between two corpus colours.** Every one of the 14,280
  ordered pairs of the 120 entries prints a ΔE00 in ADR-0125's *perceptible* band (≥ 1.8; F-249's
  census). The small differences an induced edge costs most for are never the pair on this screen.

## Decision

- **D1.** The samples are drawn apart, as `08` draws them: two `Swatch`es, one in each half of the
  pair card, with the seam between. `08` draws no keyline round them (ADR-0157 D3), so each carries
  the line a sample that binds none carries: one only where it would otherwise lose its edge
  (ADR-0116; OQ-46's interim, unchanged).
- **D2.** Each is square and sized by its half: `pairSampleSize(width)` is the half's width less its
  two `sm` insets — 157.5 dp at 384, 125.5 at 320 — never under `size.judgeable` (77) on a supported
  width. *Amended by F-249's review (S1):* the half is what the card leaves inside the state edge it
  reserves in its box (2 dp a side, transparent at rest); the first figures, 159.5 and 127.5, left the
  edge out and overran the half by 2 dp.
- **D3.** The figures stay beneath the pair (F-151's second criterion, its second half).
- **D4.** `Pair` stays in `@irodora/ui`: `Contemporary` keeps it. ADR-0095's status line names this
  amendment, and R9 §10 lists it.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| Keep `Pair` touching | A departure from `08` that no golden rule forces — and the gapless pair is not the formulas' reference condition either |
| The samples meeting at a hairline | Moves `08`'s gaps; neither what `08` draws nor what ADR-0095 decided |
| A control to switch between the two | A control no mockup draws |

## Evidence, and its limits

The studies are of printed samples under controlled viewing, not a phone in a hand, and none tested
a 1 dp seam between gaps. The bands describe the printed number (ADR-0125), never what a person sees,
which keeps either arrangement honest about what it shows.

## Consequences

- `screens.test`'s F-151 describe is rewritten: apart, the seam between, both samples before every
  figure, and each at or above the floor at 320 dp.
- E-091 is updated: Compare leaves `Pair`.
- OQ-45 gains this research as evidence for its seam half. It is not closed: F-249 does not need it.

## Revisit when

A mockup draws the pair touching; a colour-difference model for separated pairs on a display is
published; or OQ-45's seam half is answered in a way that applies here.
