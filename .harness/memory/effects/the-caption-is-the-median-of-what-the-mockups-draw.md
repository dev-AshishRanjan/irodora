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
