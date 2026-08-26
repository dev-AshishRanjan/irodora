# ADR-0073 — The "Japanese aesthetic" score is corpus affinity, and says so

## Status

Accepted

## Date

2026-08-26

## Context

[FR-32](../PRD.md) lists six things an outfit is scored on, and one of them is **"Japanese
aesthetic"**. Five of the six describe measurable relationships between colours. That one
describes a judgement about a culture's visual tradition.

Implementing it literally means shipping a number that claims *how Japanese an outfit is*. Three
problems with that, and they compound:

1. **Nobody has measured it, and nobody could.** There is no dataset, no panel, no published
   scale. Any formula would be a set of coefficients somebody chose, wearing the authority of a
   number out of 100.
2. **It is the exact failure the product exists not to commit.** Golden rule 11 and
   [ADR-0031](0031-measurement-claims-policy.md) forbid claiming precision the system cannot
   demonstrate — and this repository has a lint that fails the build on the phrase *"exact
   colour"*. A score purporting to quantify cultural aesthetics is a larger claim than any
   phrase on that list.
3. **It would be quoted.** A component score reaches a screen with a label. "Japanese aesthetic:
   82" is a sentence a person will repeat, and we would have no answer to *"82 out of what?"*

The corpus makes a smaller, real question available. It holds 120 Japanese colours with full
provenance at a pinned version, and *"how close are these colours to that corpus"* is a distance
with a unit — ΔE00 — reproducible from the corpus version alone.

## Decision

**The component is named `corpusAffinity`, and every layer that touches it says what it
measures: proximity to the published corpus, not aesthetic authenticity.**

- The field is `corpusAffinity`; there is no `japaneseAesthetic` identifier anywhere.
- Its message keys are `outfit.corpusAffinity.{supports,opposes,neutral}` — so the copy
  eventually written against them cannot quietly become a claim about culture without somebody
  renaming a key.
- Its `evidence` reports `meanDeltaE00ToNearest` and `furthest`, so the number is inspectable as
  the distance it is.
- **An empty reference set scores 50, not 100.** A distance to nothing is not a perfect distance.

`CORPUS_NEAR_DELTA_E = 5` is a convention and is documented as one: roughly where two colours
stop reading as the same, chosen so the component asks *"is this in the corpus's world"* rather
than *"do you own exactly the published swatch"*.

## Consequences

**Good.** The number is defensible: it has a unit, a reference set and a version. It cannot be
read as a claim about culture, because the label does not make one. It is reproducible — the
same outfit against the same corpus version scores the same forever. And it degrades honestly:
against an empty or foreign reference set it says so rather than reporting a high score.

**Bad.** It is **not what FR-32 asked for**, and the difference is real rather than cosmetic. An
outfit assembled entirely from published corpus colours scores high whether or not it is
well composed; an outfit of colours that a Japanese designer would recognise but that are not in
our 120 scores low. **The component measures our corpus, not the tradition**, and the corpus is
120 entries chosen by one editor (ADR-0060, OQ-5). Anyone reading this score should read that
sentence with it.

**Neutral.** The PRD's wording is unchanged; this ADR records that the implementation answers a
narrower question than the requirement's label suggests. If a defensible measure of aesthetic
tradition ever exists, it would be a new component rather than a redefinition of this one.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Implement it literally as "Japanese aesthetic"** | Answers FR-32 in its own words. Ships an unmeasurable cultural claim as a number out of 100, which is the failure ADR-0031 exists to prevent, at a larger scale than any phrase the claims lint bans |
| **Drop the component and score five** | Honest by omission. FR-32 names six and a missing one is a silent scope reduction — worse than a smaller claim clearly labelled |
| **Score membership of a published *palette*** | Tighter and equally defensible. Far too sparse: five seed palettes, so almost every real outfit scores zero and the component discriminates nothing |
| **Ask an editor to score outfits and fit a model** | The only route to the literal requirement. There is one editor, no panel and no dataset; it is a research programme, not a feature |

## Revisit when

- The corpus grows enough that `corpusAffinity` starts measuring breadth of coverage rather than
  proximity — at which point the threshold, not the definition, is what needs attention.
- Editorial review by a competent speaker begins (OQ-5) and there is somebody who could
  legitimately define an aesthetic measure, with a dataset behind it.
