---
kind: lesson
title: An undrawn state starts from an action, never from opening
created: 2026-11-03
feature: F-251
severity: medium
scope: [apps/mobile]
links: [[a-reading-of-one-drawn-instance-is-not-the-drawings-number]]
---

# An undrawn state starts from an action, never from opening

The review asked that the slot in hand be visible in words (M2). The first fix made the in-hand
slot's *Replace* read *Choosing* — and on a full draft a slot is in hand **on opening**, so 16's drawn
state would have read *Choosing* where 16 draws *Replace*. The screen suite caught it: the FR-49 test
expected 16's words.

## What to do

- An interaction state no mockup draws (R9 §4 E4) begins with the person's action — here, pressing
  *Replace* — and the state the screen opens in is the drawn one.
- Where the drawing already marks the state (16 frames the in-hand colour's tile), let that mark carry
  it at rest.
