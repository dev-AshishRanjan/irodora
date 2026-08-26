---
kind: effect
title: One contrast table answers two different questions, and moving a number moves both
category: contract
confidence: 0.85
created: 2026-08-26
scope: [packages/recommendation]
links: [[a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy]], [[the-capture-ceiling-is-now-a-profile-confidence]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# E-033 — `CONTRAST_TARGET` is read by two functions asking different things

**`score.ts#CONTRAST_TARGET` → `scoreColor` · `outfit.ts#pairingFit`**

## The two readings

`CONTRAST_TARGET` says how much lightness separation each preference asks for:
`low 0.12 · medium 0.30 · high 0.50`.

| | measures the separation between |
|---|---|
| `scoreColor` | a colour and the **middle of the person's own lightness range** |
| `pairingFit` | **two garments** |

Both are legitimate readings of *"how much contrast do you like"*, and keeping them on one
table is the point: it is what makes **"high contrast" mean a single thing in this product**. A
second table would let the same word describe two different amounts on one screen — which is
[[a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy]] arriving in the recommendation engine.

## The cost, which is not symmetrical

Raising `high` makes a person **harder to suit** *and* makes two garments **harder to pair**.
Only one of those may have been intended. Neither is a type error, neither throws, and both
produce plausible numbers.

## The guard is two-directional, and it caught a real mistake — mine

Both readings are asserted with a preference either side: a `high` profile must prefer more
separation than a `low` one, in scoring **and** in pairing. A one-sided assertion passes on a
fit that only ever rewards distance.

That is not hypothetical. **F-030's first draft of the pairing test asserted that a
high-contrast preference prefers the furthest available colour, and it failed** — against a
near-black top, an off-white overshoots the `high` target (0.776 separation against 0.50) by
more than a mid grey undershoots it (0.314), so the mid grey scores higher.

**The test was wrong and the engine was right.** A contrast preference is a *target*, not a
floor: somebody who asked for strong contrast did not ask for the maximum, and somebody who
asked for soft contrast is not asking for none. The property is now asserted explicitly rather
than left to be rediscovered by the next person who writes the same wrong test.

## What is still not covered

Whether these three numbers are the *right* amounts. They are conventions (NFR-2), stated as
such, and no study stands behind them. A test can check that a table is read consistently by two
callers; only a person wearing the result can say whether 0.50 is what "high" should mean.
