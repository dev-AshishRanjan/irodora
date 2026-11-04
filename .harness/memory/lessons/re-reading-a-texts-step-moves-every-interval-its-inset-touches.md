---
kind: lesson
title: Re-reading a text’s step moves every interval its inset touches
created: 2026-11-04
feature: F-252
severity: medium
scope: [mockups, apps/mobile]
links: [[an-ink-gap-loses-the-line-inset-and-a-negative-one-is-a-finding]], [[a-reading-of-one-drawn-instance-is-not-the-drawings-number]]
---

# Re-reading a text’s step moves every interval its inset touches

F-252's plan tabulated 19's intervals with each text's line inset subtracted, at the steps F-220 had
recorded: both section headings at `body` (inset 5.2 dp). Increment 1 re-read their capitals and
found `label` (inset 3.85). The plan's table was not recomputed, and the screen was built from it:
the anchor card → the rows heading, 24.5 dp of ink, less 5.2 = 19.3, `md`. At `label` it is 20.65,
which lies nearer `lg`. The anchor's two lines moved the same way, so ADR-0172's stated costs for
the two named intervals were wrong too (+8.3 and +6.4 dp became +6.9 and +3.7).

The fidelity test caught both, because it recomputes every interval from the inventory's pixels and
the step the inventory now records — not from the plan.

## What to do

- **When increment 1 moves a text's step, recompute every interval that subtracts that text's
  inset** before building, and correct the plan's table and the ADR's costs in the dated record.
- Keep the fidelity test reading the step from the inventory (`el(id).type.size`), never a literal,
  so the next re-measure is caught the same way.
