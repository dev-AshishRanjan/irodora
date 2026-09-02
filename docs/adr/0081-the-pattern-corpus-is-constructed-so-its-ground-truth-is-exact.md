# ADR-0081 — The pattern corpus is constructed, so its ground truth is exact

## Status

Accepted

## Date

2026-09-01

## Context

FR-19 asks for primary, secondary and accent colours with area proportions, and F-064 sets an
acceptance criterion that names two things:

> Meets **its accuracy target** on **the pattern test corpus** for stripes, checks, colour
> blocks and prints.

**Neither existed.** There is no accuracy target for pattern extraction anywhere in this
repository — NFR-2 is about *capture* accuracy from a physical device matrix, which is F-063 and
is blocked on F-053 — and nothing matching a pattern corpus exists in `content/`, `tests/` or any
package.

So a criterion referenced a threshold nobody had stated and a dataset nobody had built. That is
the same shape as FR-52's *"investment signal"* (filed as F-123) and OQ-3's reference card
(F-053, blocked). The difference, and the reason this one is closed by an ADR rather than
deferred, is that it is a decision about **our own test data** rather than about a purchase or
another company's tooling.

There were two ways to build the corpus.

**Photographs of real garments.** What the product actually sees. But a photograph has **no
exact ground truth** — the "real" proportion of navy in a picture of a striped shirt is itself
an estimate, and measuring an estimator against an estimate produces a number that cannot be
attributed to either. Sourced imagery is also licensed content, which `content/AGENTS.md`
governs, and building our own photographic set means a camera, controlled light, and the
apparatus F-063 exists to provide.

**Constructed images.** A striped image built from two known colours in a known ratio. The
ground truth is not measured; it is the construction.

## Decision

**The pattern corpus is constructed, and the accuracy target is derived from that rather than
chosen.**

Six images — stripes, check, colour blocks, print, a blended-edge variant and a fully graded one
— built from four mid-range colours, written out in
[`packages/color-sampling/golden/patterns.md`](../../packages/color-sampling/golden/patterns.md)
so each is re-derivable from that file alone.

Because the construction carries no measurement error, a correct quantiser must recover the
colours **essentially exactly** when the pattern has no more distinct colours than it was asked
for. The target says so:

| | |
|---|---|
| `PATTERN_TARGET_DELTA_E` | **1.0** ΔE00 against the constructed colour |
| `PATTERN_TARGET_PROPORTION` | **0.01** — one percentage point of the constructed share |

1.0 is *below* the ≈2.3 at which a difference is generally held to be noticeable, and that is
the point: **this is not a perceptual tolerance, it is a "did the arithmetic work" tolerance.**
A perceptual slack here would let a real defect through while looking generous.

## Consequences

**This tests the algorithm, not the camera path — and the distinction is the whole reason the
target can be tight.** Nothing here says anything about how well the product extracts a pattern
from a photograph taken in somebody's bedroom. That claim needs F-063's rows, is attested, and is
blocked. A reader of a green `color-golden` gate must not read it as the second thing, which is
why both this ADR and the corpus file say so in as many words.

**The print class is the weakest, and is labelled as such.** A constructed print is many small
deterministic marks on a ground — the shape of a floral, a genuine stress case for a quantiser,
and not a photograph of one.

**Two of the six images exist because a mutation survived without them**, and that is worth
recording as a property of the corpus rather than as a story about its author. Every hard-edged
construction has each pixel exactly equal to a source colour, so a quantiser and a colour
*counter* score identically on all of them; `blendedStripes` puts 5 % of the image in colours
that are in no palette. And even that was not enough — a 20 % trimmed mean over a cluster that is
97 % one colour **is** that colour, so "return the first member" still passed; `graded` has no
flat region at all. **A corpus regular enough to read is blind to a whole class of defect**, and
these two are what stops this one being.

**A published dataset would have been preferable and does not exist.** `AGENTS.md` §7 is
explicit that golden datasets come from published sources, and this is a deliberate departure:
there is no published corpus of garment patterns with per-colour area ground truth. The
departure is bounded by the construction being fully stated — the same standard the colour
corpus holds an editorial entry to ("Re-derivable from this sentence alone").

## Alternatives considered

**Pick a looser target and photograph some garments.** It would look more like the real problem
and mean less: a ΔE00 of 5 against a hand-estimated proportion tells you nothing about whether
the quantiser is correct, because both numbers have error in them and neither is separable.

**No target at all — assert only that extraction returns something.** This is what the criterion
would have been reduced to, and it is the shape ADR-0038 exists to prevent: a criterion nobody
can check quietly becomes nothing.

**Defer the whole feature until F-063 exists.** F-063 is blocked on F-053, which is blocked on
OQ-3, which is a purchasing decision. The algorithm does not depend on any of that, and holding a
`could` feature behind three blocked ones would have been a choice to build nothing.
