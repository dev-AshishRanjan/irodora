# ADR-0090 — A swatch corner is bounded by the area it removes, not fixed at zero

- **Status:** accepted
- **Date:** 2026-09-05
- **Supersedes:** the `radius.swatch` clause of
  [ADR-0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md)
- **Feature:** F-161

## Context

`radius.swatch` was `0`, and the manifest parser threw on any other value:

> the swatch radius is 0 and does not change. A corner radius removes sampled area from exactly
> the region the eye uses to judge a flat colour.

The manifest note added the sentence that matters:

> the effect grows as the swatch shrinks

The product ships samples from **32px** (a wardrobe cell chip) to about **380px** (the colour page
hero). Every one of them was square, on every screen, which is the single largest reason the
interface reads as hard — reported directly: *"We need every boxes / cards / div to be rounded to
match apple's style."*

## Decision

**`radius.swatch: 0` is replaced by `radius.swatchRatio: 0.125`, and the parse-time guard becomes
a bound on the sampled area a corner may remove.**

The original objection is about **area lost as a proportion of the sample**. That is a function of
radius *relative to size*, which is what the note's own "grows as the swatch shrinks" says. A
rounded square of side `s` with corner radius `r` loses `(4 − π)r²`, so the fraction lost is:

```
loss = (4 − π) · (r/s)²  ≈  0.8584 · ratio²
```

| ratio | area lost |
| --- | --- |
| 0.100 | 0.86 % |
| **0.125 (chosen)** | **1.34 %** |
| 0.153 | 2.00 % (the enforced ceiling) |
| 0.250 | 5.4 % |

The manifest declares `maxSampledAreaLoss: 0.02` and the parser refuses a ratio that exceeds it.
**The guard is not removed; it is restated as the thing it was always about.** A value cannot be
raised to something perceptually significant without the manifest failing to parse.

### A fixed pixel radius is the option that cannot work

12px is 37 % of a 32px chip — losing 12 % of its area — and 3 % of the hero, where it is invisible.
Any single number is unusable at one end of the range and pointless at the other. A ratio is
correct at every size, and the range this product actually ships is why.

### The keyline does not change

F-068 measured a single hairline at **1.00 against its own colour** — not a weak edge but no edge
at all — and the two-tone opaque pair is what fixes it, verified across the sRGB gamut in
`swatch-edge.test.ts`. Contrast is per-pixel and indifferent to geometry, so that evidence carries
over unchanged.

**Roundness was asked for. Giving up an accessibility guarantee was not**, and the reporter's
"change the ADR" was about the corner, not the edge.

### What is new is concentricity

The keyline is a 1px-inset parent around the sample. At radius 0, "both views use the same radius"
was trivially right. With a corner, equal radii leave the outer arc tighter than the inner one and
show a sliver of ground through each corner — so the outer layer takes `r + 1`. This is the one
genuinely new failure mode and it has its own test, because nothing else in the system would see
it.

## Consequences

**Every colour surface in the product changes in one commit** — the Atlas, the colour page, the
wardrobe, the Lens result, the palette pickers. That is correct: a system that rounds some samples
and not others is worse than either choice. It also means the change cannot be evaluated
incrementally.

**The arithmetic bounds the change; it does not prove it is imperceptible.** 1.34 % is small, and
whether *small* is *unnoticeable* when judging a flat colour is a perceptual claim nobody here has
tested. Golden rule 11 applies: the number is what we have, and it is not the same as evidence
about the eye.

**`emit.test.ts` asserted `nativeRadius.swatch === 0`** and changes with the decision. A test that
pinned the old value while an ADR reversed it would be a check disagreeing with the thing it
checks.

## Alternatives considered

**Keep `0`.** Honest to the original reasoning, and it loses to the person who has to look at the
product — who has now asked twice. The reasoning also turns out not to require zero, only a bound.

**Round the containers and leave the sample square.** Offered and declined: *"Whatever it is, we
need roundness, like apple ui system."* It would also have left the one element that appears on
every screen as the only hard-edged thing in a soft system, which reads as an oversight rather
than as a decision.

**Round the sample and drop the keyline.** Cleanest looking and refused here. It knowingly gives
up the guarantee F-068 measured, and nothing in the request asked for that.
