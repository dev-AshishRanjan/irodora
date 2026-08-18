# ADR-0048 — The similarity percentage is a stated scale, not a measurement

## Status

Accepted

## Date

2026-08-18

## Context

FR-7 requires naming to return "≥ 3 ranked candidates with ΔE00 **and a similarity percentage**".
[`color-engine.md`](../architecture/color-engine.md) already constrains how: *"Similarity is
reported as a percentage derived from ΔE00 against a stated scale, and the ΔE00 value itself is
always available — a percentage alone invites over-reading."*

It does not say **which** scale, and there is no standard one to reach for. ΔE00 is an open-ended
distance; a percentage is bounded and, to a reader, sounds like a proportion of something. Any
mapping between them is a product decision, and the decision is mostly about what the number is
allowed to imply.

The risk is specific and it is ours: this product's entire claim is that its colour answers are
honest. A number rendered as "94 % similar" will be read as a *confidence* or a *probability of
a match* unless we are deliberate, and ADR-0031 exists because that class of over-claim is the
one we are most likely to commit by accident.

## Decision

**`similarityPercent(ΔE00) = 100 × 2^(−ΔE00 / SIMILARITY_HALF_LIFE_DELTA_E)`, with
`SIMILARITY_HALF_LIFE_DELTA_E = 10`.**

1. **It is a definition, not a measurement, and the code says so.** No experiment produced this
   curve. It must never be described as a probability, a confidence, or a percentage of
   agreement.

2. **Monotone non-increasing, so it can never invert the ranking** — a further colour can never
   display as more similar than a nearer one. Property-tested.

   **It is deliberately *not* claimed to be strictly decreasing.** The first draft of this
   decision said that, and a property test produced a counterexample on its first run: the curve
   is **not injective in float64**, so two distinct ΔE00 values close enough together map to the
   same `Number`. Sorting by similarity would therefore *tie* where ΔE00 does not, and
   near-identical candidates would reorder with input order. **This is the argument for ΔE00
   being the sort key**, not merely a caveat on the scale — `rank.ts` sorts on `deltaE00` with an
   id tiebreak, and never on this number.

3. **`similarity(0) = 100` exactly**, and the value is positive across the whole attainable ΔE00
   range (the largest distance in CIELAB is around 150, giving ≈ 0.003 %).

4. **ΔE00 is always returned beside it**, on every candidate, and `deltaE00` is what ranks
   (E-003). The percentage never decides an order.

5. **An exponential, not a clamped linear ramp.** `separationDetail` in `@irodora/cvd-engine`
   uses a ramp, correctly, for a different question — *are these two distinguishable at all*. A
   ramp here would read 0 for everything past its ceiling, which loses the ordering among distant
   candidates and displays a legitimate third candidate as "0 % similar" — a number that reads as
   a claim of unrelatedness rather than as "the third-closest thing we hold".

6. **The anchor is editorial and is labelled as such.** `10` is roughly where two colours stop
   reading as variants of one another, which puts 50 % somewhere a person would recognise.

   **It is deliberately not justified by a just-noticeable-difference figure.** The nearby
   constant in `cvd-engine/src/separation.ts` cites "~2.3", which is the classic **ΔE\*ab** JND
   (Mahy et al. 1994) attached to a **ΔE00** threshold — two different metrics, whose ΔE00
   equivalent is usually quoted nearer 1. Nothing computed there is wrong, because that constant
   is uncalibrated too, but the *rationale* conflates them and this decision does not inherit it.
   Rather than cite a number we cannot source, this ADR states plainly that the anchor is a
   judgement.

## Consequences

**Good.** The percentage is honest about what it is, and it cannot contradict the ranking. A
reader gets a legible number for the common case and the real distance beside it for the case
that matters. Making the constant a named export with its rationale in the file means changing
it is a visible, reviewable act rather than a tweak.

**Bad — and this is the cost that will actually be paid.** **An uncalibrated number rendered as a
percentage still invites over-reading, and this decision does not remove that; it only refuses to
make it worse.** "94 % similar" will be read as a confidence by some proportion of users no matter
what the code comments say. The mitigations are outside this ADR — F-022 owns the surface, and it
is F-022's job to render the ΔE00 with equal weight rather than as a footnote. If that surface
ships with the percentage large and the ΔE00 small, this decision has failed in practice while
remaining correct on paper.

**Bad, second.** The exponential has no floor, so distant candidates compress into a narrow band
near zero — 3 % and 0.4 % look equally "not it" to a reader even though one is markedly closer.
The ordering survives and the ΔE00 distinguishes them, but the percentage stops being informative
past roughly ΔE00 40.

**Neutral.** `Math.pow` is implementation-approximated in ECMAScript, so this is not bit-exact
across engines. That is already true product-wide — `deltaE00` calls `atan2`, `exp`, `sin`, `cos`
and `pow` — and is guarded the same way, by a seeded determinism digest rather than by pretending
the arithmetic is exact.

**Neutral.** The constant belongs in versioned content with the rule weights when F-029 lands
(E-009), so it can move with a corpus version rather than a deploy. Not moved now: a scale tuned
before any consumer exists is fitted to nothing.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Linear ramp with a ceiling, as `separationDetail` uses** | Consistent with an existing house pattern, and trivially explainable. Rejected: it saturates, so it loses the ordering among distant candidates and shows a legitimate third candidate as "0 % similar" — which reads as a claim of unrelatedness |
| **Report ΔE00 only, no percentage** | The most honest option available, and genuinely tempting. Rejected because **FR-7 requires a similarity percentage** — a professional user reads ΔE00, and everyone else needs a number they can act on. Refusing to provide one does not stop over-reading; it just makes the product unusable for the people the percentage is for |
| **Calibrate the constant against a perceptual study** | What "not calibrated" is apologising for. It needs a study we have not run, on a population we have not defined, for a judgement ("is this the same colour") that is not what ΔE00 measures. Recorded as the honest upgrade path rather than pretended at |
| **`100 × (1 − ΔE00/100)`, clamped** | Simple and linear in the distance. It implies ΔE00 100 is the maximum, which is false, and it is not rank-preserving once clamped at either end |
| **`100 / (1 + ΔE00)`** | Also strictly decreasing and equally defensible. Chosen against only because a *half-life* is explainable in one sentence — "every 10 ΔE00 halves it" — and a reciprocal is not. This is a genuine coin-flip and the ADR records it as such |
| **Put the constant in `content/rules/` now (F-029)** | Where it ends up. Premature: no consumer exists, so it would be a versioned value nobody has ever rendered |
