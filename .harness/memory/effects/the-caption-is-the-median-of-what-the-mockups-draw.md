---
kind: effect
title: The caption is the median of what the mockups draw
category: contract
confidence: 0.85
created: 2026-09-28
scope: [mockups, packages/design-tokens]
links: [[the-mockups-readme-is-the-palette-now]]
---

# E-152 — the inventories' ems → the type scale's `caption`

**`mockups/inventory` (`raw.emDp`, `type.size`) → `design-system.manifest.json` typography scale ·
`type-scale.test.ts`**

## What changed

Board `00` prints four type steps. The screens draw a fifth that its labels do not name: 121
elements below 12 dp, including `01`'s tab labels on every screen. OQ-12 asked whether that is a
step or a floor. ADR-0113 answered with a measurement: **`caption` is 10.3 dp, the median of the 92
ems the inventories record below 12 dp.** `18`'s report preview is left out; it is type inside a drawn
document, at thumbnail scale.

## Why it is a link

A measured value that nothing re-measures is a typed value. `type-scale.test.ts` recomputes the
median from every inventory on every run. It also holds the manifest's step names to the inventory
schema's `type.size` enum, so a record can never name a size the app cannot set.

## How to apply

When F-273 (or anyone) measures more captions, this test fails with the new median. Change the
manifest to it and record the change in ADR-0113's revisit list. Never loosen the test. Adding a type
step means adding it to the schema's enum and to the manifest together.

## F-230: measured steps

ADR-0121 extends the rule above to every size the mockups draw more than 4 dp from a board step: a
**measured step**, bound to its elements at their median em. `wordmark` 31.6 and `wordmarkSplash`
59.7 are the first two. A re-reading can now move a measured step, or move an element across the
4 dp line, and the census reports either.

## F-230's review: a measured step's leading

A measured step leads at the nearest board step's ratio, **or its face's own line where that is
taller**. iOS centres a line only at or above its face's own and otherwise clips a tall line's top
(ADR-0121, amended). Each bundled face's `ownLine` is in the manifest, and the font test reads it
back.

## F-242 (2026-10-20): two pills recorded at the caption, with no em

`01`'s on-device pill and count pill draw their text at about 9 dp an em, so their inventory records
now carry the caption step. Their ems were estimated from an advance (characters across a run), not a
line box, so they are kept in a comment in `01.mjs` rather than as `raw.emDp`: an estimate of another
kind would have moved the median this step is measured from.
