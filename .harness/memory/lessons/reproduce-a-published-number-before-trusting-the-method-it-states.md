---
kind: lesson
title: Reproduce a published number before trusting the method it says produced it
category: colour
confidence: 0.9
created: 2026-09-25
scope: [packages/design-tokens, docs/design]
links: [[a-derived-theme-stores-the-moves-its-rule-computed]], [[a-batch-edit-that-reports-its-own-success-is-not-evidence]]
---

# Reproduce a published number before trusting the method it says produced it

**What happened.** R9-MOCKUP-FIDELITY §4 E3 said each forced token moves "the smallest CIE L\* step
that passes", and it published three values: `#94A1AF`, `#5D6674` and `#5C6472`. F-225 had to
implement that rule, so it implemented the search and ran it on §4's own three rows before anything
else.

In CIE L\* the search gives `#94A1AF`, `#5D6674` and **`#5D6472`**, so the third row is off by one
step. In OKLab it gives all three exactly. The numbers had been computed in OKLab. The prose named
the other space, and nobody had checked it, because both spaces agree on two rows out of three.

Two more things came out of reproducing rather than copying:

- **Row 3 was measured on one surface.** `#5C6472` passes on the ground. Focus also lands on levels
  1–3, where it fails. The rule, applied to every surface it is drawn on, gives `#788090`.
- **The rule has no answer for Slate's status triple.** Of the 256 lightness-only combinations
  that pass contrast, none is clean (`mockups/tools/slate-status-search.mjs`). Only an exhaustive search could show that no answer
  exists. A partial one would have looked like "not found yet".
- **This lesson nearly broke itself.** The first figure quoted for that search, 13,662, came from a
  run nobody committed. The review could not reproduce it, and got a different grid's count. The
  search is now a committed tool, and the docs quote what it prints.

**The rule.** When a document publishes a number together with the method that produced it, run
the method on the document's own inputs first. If it reproduces the number, the method is
confirmed. If it gives a different number, one of the two is wrong, and finding out which comes
before building on either. Record the space, the step and the surfaces with every move, because a
number without its method cannot be re-derived.
