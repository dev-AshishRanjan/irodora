# ADR-0002 — A tiered capability policy replaces the blanket "non-AI" rule

## Status

Accepted

## Date

2026-08-13

## Context

The founding brief said the product should be "not AI driven." The instinct behind that is
correct and valuable: colour conversion, harmony, similarity, contrast, CVD simulation,
compatibility scoring and wardrobe optimisation are all *solved deterministic problems*. A
deterministic engine gives reproducibility, explainability, offline operation, near-zero
marginal cost, privacy, predictable latency and testability. Reaching for a model here
would be worse engineering, not more advanced engineering.

But "no AI" as a rule is unenforceable, because nobody agrees where the line is. Is Otsu
thresholding AI? K-means clustering? A published white-balance estimator? A 200 KB
on-device segmentation model? Under a strict reading the product could not do garment
segmentation at all, and would be worse for it. Under a loose reading the rule permits
anything, and the guarantee is gone.

A rule that cannot be applied consistently provides no protection. What actually needs
protecting is narrower and much more defensible: **every claim the product makes to a user
must be answerable deterministically.**

## Decision

Replace the blanket ban with **four capability tiers**. Each has an explicit permission,
and the boundary between Tier 0 and everything else is the product's real guarantee.

### Tier 0 — Deterministic core

All colour maths, harmony, naming, difference, contrast, CVD simulation, compatibility
scoring, outfit scoring, and optimisation. No models. Reproducible, offline, explainable.

> **Every user-facing claim, score and explanation must be answerable at Tier 0.**

### Tier 1 — Classical computer vision

Region segmentation, colour clustering, outlier rejection, white-balance estimation, edge
and blur detection. Deterministic given input and published in the literature. Permitted
in core paths, and **always with a manual override** — the user can select the region.

### Tier 2 — Optional on-device models

Garment detection and segmentation *assist* only. Opt-in, on-device, never transmitted.
Never in the explanation path. Must degrade cleanly to Tier 1 when unavailable, declined
or wrong.

> A Tier 2 model may help you *find* the shirt. It may never help decide what colour the
> shirt is, or what goes with it.

### Tier 3 — Cloud language models

Never in a user request path. Internal editorial and engineering tooling only — drafting
corpus copy for human review, assisting development. Never applied to user imagery or user
data.

### The invariant

> Disable every tier above 0 and the product still works, still answers, still explains.
> Tiers 1–3 make it more convenient. They never make it more correct.

## Consequences

**Good.** The guarantee is now testable rather than rhetorical: a test can assert that a
recommendation produced with Tier 1–3 disabled is identical. It permits the classical CV
the Lens genuinely needs without eroding anything. It gives content and marketing an
unambiguous line — the product can honestly say its answers are deterministic and
explainable, because they are.

**Bad.** More nuance to communicate than "no AI", which is a great slogan. A future team
under delivery pressure could reclassify something into a tier it does not belong in;
mitigated by requiring an ADR to move any capability between tiers. Tier 2 adds real
complexity — every such feature needs a Tier 1 fallback path, tested.

**Neutral.** The product is not anti-AI. It is *anti-black-box-in-the-trust-path*, which
is a defensible technical position rather than a marketing posture.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep the blanket "no AI" ban** | Clean to say, impossible to apply. Would forbid k-means clustering while permitting an unexamined heuristic, and would block genuinely useful classical CV |
| **No policy — use whatever works** | Loses the product's central differentiator. The value here is precisely that the answers are reproducible and explainable; without a written line, that erodes one convenient exception at a time |
| **Ban only cloud inference, allow any on-device model** | Location is the wrong axis. An on-device model in the scoring path is exactly as unexplainable as a hosted one, and NFR-3 (identical results everywhere) would fail the moment a model version differed across platforms |

## Revisit when

- A user need is demonstrably unmeetable within Tier 0–1.
- A Tier 2 capability proves so reliable that removing its Tier 1 fallback is proposed —
  which requires a new ADR, not an omission.
