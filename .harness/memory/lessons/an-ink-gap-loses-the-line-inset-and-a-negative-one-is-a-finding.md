---
kind: lesson
title: An ink gap loses each text's line inset, and an interval that goes negative is a finding, not a step
created: 2026-10-21
feature: F-246
severity: medium
scope: [mockups, apps/mobile]
links: [[a-test-tree-has-no-height]], [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]]
---

# An ink gap loses each text's line inset, and an interval that goes negative is a finding, not a step

A mockup is measured from its **ink**: the top of a letter, the edge of a pill. A built text sits in
a **line box** that is taller than its ink by the step's leading, half above and half below. So the
interval a screen must build between two things is the ink gap **less** each text's own inset. The
inset is inside the text's box; it is never added on.

F-246's plan added them. It marked two intervals "(expected)" — the family label to its chips, and
the heading to the grid — at `sm` and `md`, reasoning "5.5 plus the bottom inset". Computed the right
way round they are 2.9 and 5.2 dp, both `xs`. The fidelity test caught the plan, because it computed
every interval rather than restating it.

The same subtraction can go below zero. On 05's card, the kanji to the romaji is −3.65 dp once both
line insets are removed: the Japanese body step's line box alone is taller than the mockup's line
pitch. The test's snap took the nearest step, `xs`, and said nothing. The review called that a
blocking departure: the card was about 19 dp taller than drawn, and no record said so.

## The rule

- **Subtract, per side, the inset of each text that bounds the interval.** A drawn shape (a pill, a
  field, a rule, a card) has none.
- **A negative interval is refused by the snap.** It is named where it is computed. It takes the
  scale's floor, and the surface's ADR records what that adds over the drawing. R9 §2 now says so.
- **Compute the height a component will build, and compare it with the drawing**, when its parts are
  text: that is where the type scale's leading and the mockup's pitch disagree.

## How to check

In a fidelity test, grep for `snap(` and confirm each call's argument subtracts the inset of every
text it touches. A `snap` that accepts a negative number is the defect.
