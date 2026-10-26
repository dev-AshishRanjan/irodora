---
kind: lesson
title: A fixture that shares a defect cannot find it, so state the invariant and check every case
created: 2026-10-26
feature: F-248
severity: high
scope: [apps/mobile, packages/recommendation]
links: [[the-combination-is-the-engines-four-pieces-scored-once]], [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]]
---

# A fixture that shares a defect cannot find it, so state the invariant and check every case

F-248 built 07's outfit page: a colour in hand, and three slots the engine fills. Each slot was ranked
against the colour in hand alone and showed its ranking's first. The three rankings share their first,
so **every one of the 120 colours showed one colour in all three slots**, under every occasion — and the
CVD row read 0%, the harmony always agreed, and the export refused the duplicate for every colour.

Every test was green. The unit tests, the fidelity test, the states test and the inventory sweep each
drew the page for one or two fixture colours, and each fixture had the defect: the tests checked that
each slot showed *its ranking's colour*, which it did. The export test exported four colours of its own
choosing. Nothing asked the one question a person sees first — **are these four different?** The single
independent review found it in one probe over all 120 colours.

## The rule

- **Write down the invariant a person would check first, and test it over every case the data
  allows** — here, four different colours for every corpus colour, occasion and profile. A corpus is
  small and pure; the whole space is cheaper than an argument about which fixture is representative.
- **A downstream consumer's precondition is part of the upstream's contract.** The export refuses a
  colour twice; the test of what 07 exports must write what 07 builds, not a list of the test's own.
- **Be suspicious of a new screen whose tests all pass on the first run.** Probe it the way the
  reviewer did: render the real thing for every input and look at what it shows.

## How to check

For a surface that composes several engine answers into one view, list what must hold across them
(distinct, ordered, summing, within a range) and add one test per property that iterates the whole
input space, with a decoy proving the property is not trivially true (here: the rankings' firsts do
repeat).
