---
kind: lesson
title: An inventory's dp are rounded, so a fidelity test that snaps between them can cross a midpoint
created: 2026-10-26
feature: F-248
severity: medium
scope: [mockups, apps/mobile]
links: [[an-ink-gap-loses-the-line-inset-and-a-negative-one-is-a-finding]]
---

# An inventory's dp are rounded, so a fidelity test that snaps between them can cross a midpoint

An inventory records each element's box twice: in **pixels**, as measured, and in **dp**, converted
and rounded to the half. A fidelity test computes an interval between two elements and snaps it to the
scale (R9 §2). Built from the rounded dp, an interval near a step's midpoint can land on the wrong side.

F-248's first fidelity run found two such false failures on 07, each from the rounding alone:

- The app bar's gap: the divider sits 7 dp past the back word and the title 6 dp past the divider, in
  the record's rounded dp — `sm` and, on a tie, `xs`, so the siblings snapped to `xs`. From the pixels,
  the two are 6.81 and 6.13 dp: both `sm`.
- The card's label column: the record's dp put the values 120.5 dp past the labels; the pixels put
  them 120.86 — 121 to the half, the constant the page draws.

Neither was a defect in the page, and neither would have been caught the other way round: a test
reading rounded dp can as easily pass a page that is a step off.

The same run found a real one only the pixels showed: the action bar's box began at the leaked label
above it rather than at its rule, so the card → the bar and the rule → the buttons were each a step off.

## The rule

- **Recompute every dp in a fidelity test from the record's pixels** — `(box − the screen's origin) ×
  dpPerPx` — never from its rounded `dp`. Snap the interval, not two rounded edges.
- **Where an interval sits within a quarter step of a midpoint, look again at the image.** The rule
  decides it, but a half-pixel reading decides the rule; record the reading in the inventory.
- **An element's box starts where the element does.** A leaked label, a bezel or a component name
  printed above an element is not part of it; a box that includes one moves every interval measured
  from that edge.

## How to check

In a fidelity test's helpers, `el()` returns the element with its `dp` recomputed from `box` and the
frame's `screens[0].box` origin (as `wear-fidelity.test.tsx` does). Search the test for `.dp.` reads
that bypass it.
