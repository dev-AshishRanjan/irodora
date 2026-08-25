---
kind: lesson
title: Test the requirement's own example before your own, and when it fails suspect the design
category: engineering
confidence: 0.9
created: 2026-08-25
scope: [packages, apps/mobile]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[measure-what-a-golden-set-can-detect-before-trusting-it]]
---

# Test the requirement's own example before your own

FR-47 names a phrase: *"dark muted green"*. The first lexicon draft could not resolve it.

`muted` had been given chroma `[0, 0.04]`, and every hue term carries a chroma **floor** of
0.04, so *"muted green"* intersected to the single point `0.04` — a region matching almost
nothing. Every other test passed. The mechanism was right and the **words were wrong**: muted is
low-to-*mid* chroma, and it has to overlap the floor at which a hue becomes perceptible, or no
hue can ever be muted.

Nothing found this except writing a test named after the phrase the requirement itself uses.

## The general form

> A test built from **your own** example tests the design you already have. A test built from
> the **requirement's** example tests whether that design answers the question that was asked.

The requirement's example is free, it is the one a reviewer will try, and it is the one case the
author is guaranteed not to have chosen to suit the implementation.

## And when a decoy fails, suspect the design first

This happened twice in one feature, and both times the instinct to "fix the test" would have
been wrong.

**`muted green`** — I first wrote `expect(resolvePhrase(…)).toBeNull()`, reasoning that the
terms contradicted. They did not contradict; my vocabulary was wrong.

**`beaded`** — a decoy asserting a name is not a hex. It failed, because `beaded` **is** a valid
hex: six characters, every one a hex digit, and `#BEADED` is a real colour. So are `decade` and
`facade`. No amount of anchoring the pattern fixes that. The rule became *an unprefixed hex must
contain a digit, and `#` is how you say you meant the colour* — with the cost (`ffffff` searches
names) asserted so it is visible rather than discovered.

A decoy that fails is evidence. It is only sometimes evidence about the test.

## Read your measurements at more precision than you plan to use

The same feature placed lexicon boundaries at round numbers on the strength of a measurement
printed to three decimals — `mid` appeared to begin at `0.400`, so the boundary went at 0.40.

It actually begins at **`0.3999990449505662`**. One entry would have been excluded from every
query for a medium colour, silently, forever. The agreement check caught it; the boundaries now
sit in the measured **gap** between bands rather than on a round number near one.

`toFixed(3)` in an exploratory script is a decision about what you are able to see
[[measure-what-a-golden-set-can-detect-before-trusting-it]].
