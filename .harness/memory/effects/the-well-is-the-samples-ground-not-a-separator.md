# The well is the sample's ground, not a separator

**Effect:** [E-111](../../state/effects.json) · **Feature:** F-205 · **Date:** 2026-09-09

`status.ok` on `swatch.well` measured APCA **Lc 43.6** against a floor of 45, while passing WCAG
at 4.98:1 — which is how it stayed invisible for four releases.

Measuring showed the colour could not move:

```
status.ok needs L 0.68 to clear the floor there.
At 0.68 its salience overtakes status.warn  →  the rank ADR-0053 fixed breaks.
Raise warn to make room  →  its CVD separation from status.bad falls 63.9 → 54, under 60.
```

**No value satisfies all three constraints.** So the fix had to be structural.

## The wrong structural fix, and the guard that caught it

Move the separator: paint the status on `surface.1` instead of `swatch.well`. Darker ground, more
contrast, floor cleared. `checkStatusAdjacency` refused it immediately, and the rule's own words
say why:

> *`swatch.well` on the shared parent is the escape, because it is precisely the mandated neutral
> ground: **if the sample is already in its well, the status colour is not touching it**.*

The well is **the sample's own ground**. A status painted on it is inside the neutral surround
the sample already has. A status on a *different* ground becomes a sibling of the sample under a
parent that is not the well — which is the simultaneous-contrast case the rule exists to prevent.

I had read "separator" and built a separator. The rule was about **whose ground it is**.

## The trade I nearly made

A contrast point on a status *label*, bought with how a **colour sample** reads. In a product
whose whole job is that the sample reads truly, that is the wrong way round — and no gate would
have said so, because gate 9 measures pairings and F-069's rule lives somewhere else entirely.

## What the right answer turned out to be

`adjacentToSample` has **one caller**, and it passes `kind="bad"` — which measures Lc 64.8 on the
well. The failing pairing was **a declaration nothing rendered**.

Withdrawing it cost nothing, and no status value moved, so the salience rank and every CVD pair
were untouched by construction.

## The lesson

**Before satisfying a constraint by changing structure, find out what the structure was for.**
A word like *separator* describes what a thing looks like; the rule may be about what it belongs
to. And when a fix looks free, check who actually renders the thing you are fixing — the failing
pairing here had no callers at all, and the honest answer was available before any of the
colour maths.

[[a-bound-can-be-rigorous-about-the-wrong-quantity]]
