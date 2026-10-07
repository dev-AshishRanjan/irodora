---
kind: lesson
title: Describe the number you print, not the number you computed
category: design
confidence: 0.9
created: 2026-10-07
scope: [packages/color-difference, apps/mobile]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# Describe the number you print, not the number you computed

**A word beside a figure must agree with the figure as shown.** ADR-0125's bands put an edge at
ΔE00 0.8. A computed 0.7999 is below it — and prints as *0.80*. Banding the raw value would print
*ΔE00 0.80 · Very Close*, a word that contradicts the number beside it at exactly the edge a person
would check.

## What to do

- Round to the display precision first, then classify: `deltaE00Band(printedDeltaE00(d))`.
- Test the edge with a value that rounds onto it, and keep the raw classification as the decoy.
- The same holds for a percentage: floor it (so it never claims more than the value), and guard the
  floor against float64 — 0.57 × 100 is 56.99999999999999.

F-222 (ADR-0124, ADR-0125).
