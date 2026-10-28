---
kind: lesson
title: A card's box ends at its edge, not at its shadow's foot, and a re-measure says which boxes it re-read
created: 2026-10-28
feature: F-250
severity: medium
scope: [mockups, apps/mobile]
links: [[an-inventorys-dp-are-rounded-so-a-snap-between-them-can-cross-a-midpoint]], [[a-size-test-that-restates-its-formula-cannot-find-what-the-formula-left-out]]
---

# A card's box ends at its edge, not at its shadow's foot, and a re-measure says which boxes it re-read

F-250 re-measured `09`'s inventory and wrote in its header that it had re-read *every box*. It had not
re-read the query card's: F-220's `B(29, 166, 710, 185)` stood, and its foot was the foot of a faint
drop shadow (rows 344–352, luma 16–24 against a ground of 24), 8 px below the card's last bright row
(342). The other cards' boxes stopped at their edges. Eight pixels is 4 dp, and it moved two intervals
across a snap: chips → foot read 21 dp (`lg`) instead of 17 (`md`), and card → the next title 17.3
(`md`) instead of 21.3 (`lg`). The fidelity test recomputed both from the record and passed, because
the record was what was wrong. The review found it by reading the image.

## The rule

- **A card ends at its edge.** Read the edge as its brightest ring of rows; what follows below it and
  is darker than the ground is the card's shadow, and the box stops before it. Do the same for every
  card in an image, so siblings are read one way.
- **Re-measure every box you claim to, or name the ones you kept.** A header that says *every box* is a
  record a later reader trusts; a box carried over from an earlier pass carries its errors with it.
- **A test that recomputes from the record cannot find an error in the record.** Spot-check a few
  intervals against the image itself, not against the inventory, before the inventory becomes the
  oracle.

## How to check

For each card in the image, take a column profile through its top and bottom edges at three x; the box
runs from the first bright row to the last, and any darker band beyond is shadow. Diff the re-measured
inventory against the old one: a box that did not change is a box to look at again.
