# ADR-0094 — A swatch corner is bounded by what stays straight, not by the area it removes

## Status

**Accepted** — F-169. Supersedes the *bound* in
[ADR-0090](0090-a-swatch-corner-is-bounded-by-the-area-it-removes-not-fixed-at-zero.md), and
keeps its decision that a corner is a **ratio rather than a length**.

## Date

2026-09-06

## Context

The report, twice: *"When I said I need roundness in color card, I said for every containers, the
main color container of color is still rectangular."*

Measured before anything was changed, which is what the feature's own note demanded:

| surface | radius | reads as |
|---|---:|---|
| `Surface` — every card, `radius="md"` | 14 px | rounded |
| `Swatch` hero on a colour page (~340 px) | 42 px | rounded |
| **`Swatch` in a list or grid (44 px)** | **5.5 px** | **a rectangle** |
| **`Swatch` in the Lens readout (56 px)** | **7 px** | **a rectangle** |

The cards were fine. The **sample** was not — and the samples at 32–56 px are what fill the
Atlas, the wardrobe grid, the nearest-colour lists and every readout. The report said *the main
colour container of colour*, and it was exactly right.

**ADR-0090 had already reversed `radius.swatch: 0`** and made the corner a ratio, bounded by
`_maxSampledAreaLoss: 0.02` and enforced at parse time. A rounded square loses `(4 − π)r²`, so
the lost fraction is `0.8584 · ratio²`, and that ceiling caps the ratio at about **0.153**.

**There is no value inside that bound that looks any different.** So the question is not what
number to pick; it is whether the bound measures the right thing.

## The bound was measuring the wrong thing

ADR-0090's stated reason: a corner *"removes sampled area from exactly the region the eye uses to
judge a flat colour"*.

Area does affect colour appearance — the area effect is real, and larger samples read lighter and
more colourful. **It needs an order-of-magnitude change in area to matter.** The difference
between a swatch losing 1.3 % of itself and losing 5.4 % is not perceptible to anyone, in any
condition. The bound was rigorous about a quantity that does not carry the risk.

What actually degrades a sample is different, and it is a real limit rather than an invented one:
**a corner large enough stops the shape being a field and starts making it a blob.** At
`ratio = 0.5` a square *is* a circle. A circle is a worse container for judging a colour than a
rectangle — proportionally more of it is edge, and edge is where simultaneous contrast acts,
which is the physics `swatch.well` already exists for.

## Decision

**The bound is the straight run left on each edge.**

> `side − 2r ≥ side × f`, which rearranges to `ratio ≤ (1 − f) / 2`.
>
> At `f = 0.5` — half of every edge still straight — the ratio may reach **0.25**.

`radius._minStraightEdgeFraction: 0.5` replaces `_maxSampledAreaLoss`, enforced by the same
parse-time guard in the same place, with the same underscore convention that keeps it a
constraint rather than a token anything can draw with.

**`radius.swatchRatio` becomes 0.25**, and it is the consequence of the criterion rather than a
number chosen to reach a look.

**And it is capped at `radius.xl` (28).** A pure ratio is right in the middle of the range and
wrong at the top: at 0.25 the hero would take an 85 px corner, which is not a corner but a curve,
and the sample would stop reading as a rectangle at exactly the size where the flat field matters
most. `radius.xl` is the largest corner this design system draws anywhere; a sample rounder than
every container around it is a statement nobody made. **No new number** — the cap is the top of
the existing scale and moves when the scale does.

```
 32 px →  8      44 px → 11      56 px → 14      100 px → 25      340 px → 28 (capped)
```

## Consequences

**Good** — the thing the product is mostly made of finally looks like the rest of it, and the
bound now describes the risk it was always trying to describe. The criterion is geometric and
checkable: `swatch-corners.test.tsx` asserts the straight fraction at every size the product
actually draws, and the cap in both directions.

**Bad** — **a rounder sample does lose more area**, and that was ADR-0090's worry. The answer is
that the worry was mis-measured rather than imaginary: 5.4 % is still small, and the new bound is
strictly *about* the sample remaining judgeable where the old one only approximated it.

**Bad** — **two bounds in two features looks like a number being adjusted until it satisfied
somebody.** It is not, and the difference is worth stating: ADR-0090 replaced an absolute (`0`)
with a measure, and this replaces one measure with a better one *and moves the value as a
consequence*. Both are recorded, and the parse-time refusal has now survived two rewrites.

**Neutral** — the keyline arithmetic is untouched. It stays exactly one unit outside the sample,
which is what keeps the two rounded rectangles concentric, and the cap applies to both so the
relationship survives it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Raise `_maxSampledAreaLoss` to admit a bigger ratio** | The obvious move and the dishonest one: it keeps a bound that measures the wrong quantity and picks whatever ceiling lets the desired number through. The ceiling would then be a number chosen to permit a look, which is precisely what a parse-time constraint is supposed to prevent. |
| **A fixed corner in pixels** | ADR-0090's own argument, still correct: this product draws samples from 32 px to about 380 px, and a single length is invisible at one end and overwhelming at the other. |
| **A pure ratio with no cap** | An 85 px corner on the hero. The hero is the one place a person looks at a colour as a *field*, and it is the last place the shape should soften. |
| **Round the cards further as well** | The report names the colour container, every `Surface` already takes `md` and none overrides it, and changing the card scale in the same commit would be changing something nobody asked about while claiming to answer something they did. |
