# A zero-confidence profile still reports a perfect fit

**Effect:** [E-101](../../state/effects.json) · **Feature:** F-195 · **Date:** 2026-09-08

`recommendOutfit` needs a `PersonalProfile`, and half of what it returns is *does this suit me*.
Somebody who has never built a profile cannot be asked that — but the other half, *how does this
sit with the colour in your hand*, is answerable from two colours and nothing else.

The engine already had the representation. `scoreColor` returns `NO_EVIDENCE_SCORE` when no
dimension carries confidence, and its own docblock names the case: *"a profile nobody has filled
in is zero across the board"*. So the app supplies exactly that profile, and no score gets
implemented a second time.

## The part that would have shipped

**Confidence 0 removes the personal half from every SCORE and leaves it fully populated in every
EXPLANATION.** The fits are computed before the weights are applied, so:

- every `factors[].contribution` is 0 — correct, and invisible
- every `factors[].fit` is **1**, because full-range intervals contain everything
- every `messageKey` is the `neutral` one — which reads like an opinion, not an absence

A screen that drew the factors it was handed would tell somebody who has entered nothing that
their lightness range suits this colour. Four axes, confidently, about a person the product knows
nothing about. That is NFR-21 broken in the most persuasive form available, and **every test
about scores would still be green** — because the scores are right. Only the prose is false.

## What the guard actually is

`personalKnown` is a **returned value**, not a confidence field a caller is trusted to read:

```
shownScore(candidate, personalKnown)    // pairing figure, not the blend
shownFactors(candidate, personalKnown)  // empty, not four neutral sentences
```

The blend is the second half of the same problem. With personal pinned at the midpoint, every
candidate's blend is dragged toward it — the **order** survives and the **magnitude** becomes a
statement about the engine's midpoint rather than about the colour.

Both branches are registered conformance subjects, so the two trees are measured rather than
assumed.

## The shape to remember

**A field can be zeroed in one output and unchanged in another, and the unchanged one is the one
people read.** When a value is suppressed by weighting, check what else was derived from it
before the weight was applied — the weight only silences the path it is on.

[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
[[an-engine-with-no-caller-is-not-a-finished-feature]]
