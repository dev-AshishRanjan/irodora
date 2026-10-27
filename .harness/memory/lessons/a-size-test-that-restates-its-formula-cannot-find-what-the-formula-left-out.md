---
kind: lesson
title: A size test that restates its formula cannot find what the formula left out
created: 2026-10-27
feature: F-249
severity: medium
scope: [apps/mobile, packages/ui]
links: [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]], [[a-fixture-that-shares-a-defect-cannot-find-it]]
---

# A size test that restates its formula cannot find what the formula left out

F-249 sized 08's two colour samples by their half of a card: the page width, less the page insets and
the seam, halved, less each half's padding. The fidelity test checked the sample against the same
expression, written out again — and passed. The review found the sample 2 dp too wide: every `Card`
reserves its 2 dp state edge inside its box (`SELECTION_EDGE`, transparent at rest), so each half was
2 dp narrower than the formula said. The sample overran its half, sat 6 dp from the seam on one side and
8 on the other, and was wider than the button beneath it, which stretches to the half.

The test was not wrong about arithmetic. It was the formula's own author, checking the formula against
itself, so whatever the author left out the test left out too.

## The rule

- **Derive a size from what the tree actually draws, not from the constants the code used.** The fix
  reads the card's `borderWidth` from the rendered pair card and puts it in the expected size; a third
  reserved edge, or a card that stops reserving one, now fails.
- **Cross-check a computed size against a sibling the layout sizes for you.** The sample and the Change
  button under it are drawn one width; asserting that the button sets no width of its own (so it
  stretches to the half the sample must fill) ties the computed number to the laid-out one.
- **A box that pads itself is a box that shrinks its children.** Any container with a reserved edge,
  ring or state border subtracts it before a child that sizes itself by the container's outer width.

## How to check

For any child sized by arithmetic over its container, find every style on the path from the container's
outer box to the child — padding, border width, gap, margin — in the rendered tree, and assert the
child's size from those values rather than from the expression the code used.
