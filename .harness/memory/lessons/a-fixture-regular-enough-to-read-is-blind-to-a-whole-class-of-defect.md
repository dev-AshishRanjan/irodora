---
kind: lesson
title: A fixture regular enough to read is blind to a whole class of defect
category: debugging-method
confidence: 0.9
created: 2026-09-01
scope: [apps/mobile, packages/color-sampling]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[averaging-non-linear-srgb-reads-too-dark]], [[a-decoy-written-against-old-values-quietly-stops-discriminating]]
---

# A fixture regular enough to read is blind to a whole class of defect

F-054's outfit scanner had twenty-three tests, four named decoys, and a fixture anyone could
check by eye: three stacked blocks of flat colour, each edge one row wide.

Five mutations were run against it. **Two passed.**

| Mutation | Why the fixture could not see it |
|---|---|
| removed the minimum separation between the two boundaries | every edge was **one row wide**, so the jump profile had exactly two non-zero values and any selection rule found them |
| replaced linear-light averaging with encoded averaging | every row was **one value repeated**, and averaging identical values gives the same answer in any space |

Neither is an exotic failure. The second is
[[averaging-non-linear-srgb-reads-too-dark]] — the most consequential colour bug in this
repository, one-directional, and it looks like slightly worse light rather than like a defect.

## The pattern

**The properties that make a fixture easy to reason about are the same properties that
collapse the difference between the right implementation and a wrong one.**

- Flat regions collapse *every* averaging method into the same number.
- Hard edges collapse *every* edge-selection rule into the same answer.
- Zero-valued baselines collapse a **difference** and a **total** into the same number — which
  is the third instance of this in two days: F-052's outfits-unlocked count needed a wardrobe
  that already produced outfits, or `after.valid` and `after.valid - before.valid` would have
  been identical.

A test written against such a fixture is not weak in a way that reading it reveals. It asserts
a true thing, about a case where several different implementations agree.

## What to do about it

**Run the mutation. It is the only thing that tells you.** Reading the suite does not: all
twenty-three assertions were correct, and the file's own header listed the two invisible
mutations as the dangerous ones. Believing that header was the mistake.

When a mutation passes, the fix is a **fixture with the irregularity the real input has**, not a
new assertion over the old one:

| The mutation that passed | The fixture that catches it |
|---|---|
| edge-selection | one edge **spread over two rows** — what a photograph does |
| averaging space | rows with **variation across them** — what fabric does |
| difference vs total | a baseline that is **not zero** |

Each is one small function in the test file, and each is closer to the real input than the
clean version was.

## Where else to look right now

Any suite whose fixtures are constructed from constants. The question is not *"do the
assertions pass"* — they do — but ***"which two implementations would this fixture rate
equally?"***

The cheapest way to answer it is to break the code on purpose, once per claim the file makes
about itself, and watch which cases go red. A claim in a test file's header that no mutation
supports is documentation, not verification.
