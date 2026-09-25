---
kind: effect
title: A token that changes meaning keeps its name, and every reader it had
category: contract
confidence: 0.85
created: 2026-09-25
scope: [packages/design-tokens, packages/ui]
links: [[the-well-is-the-samples-ground-not-a-separator]], [[the-mockups-readme-is-the-palette-now]]
---

# E-151 — what `border.strong` and `ring` mean → the components that paint state

**`design-system.manifest.json` (`border.strong`, `ring`) → TextField · SearchField ·
`selection.tsx` · `controls.tsx` · `selection.test.tsx` · gates 9 and 10**

## What changed

The README draws `border.strong` at `#464D5B`. That is 2.11:1 on Sumi's ground, and 3:1 is the
floor for a state indicator. §4 E3 resolves this by meaning. Where a label also identifies the
component, the border is **decorative** and keeps its drawn value. Where the border is the only sign
of a state, the token is `ring`: `#788090` on Sumi, which passes on the ground and on levels 1–3
where focus lands, and `#3A3B3E` on Washi, separated from the drawn ink by gate 10.

So `border.strong` pairs with nothing now, and carries an `uncheckedReason`.

## The trap

The NAME did not change, so nothing that read `border.strong` stopped compiling. The two text fields
drew their focus edge in `border.strong`, which passed when the token was a checked non-text colour.
After F-225 they would still have rendered, below 3:1 on the cards, and no type or gate could see
it. They were found by reading, moved to `ring` in increment 4, and are now held by a rendered test
in all four palettes. That test was mutation-checked: painting focus in `border.strong` fails it.

## How to apply

When a token's meaning moves and its name does not, grep every reader
(`colors['border.strong']`, `colors.ring`) and decide each one by hand. For each state indicator,
add a rendered assertion, because the gate measures the declared pairing, not the component that
paints it.
