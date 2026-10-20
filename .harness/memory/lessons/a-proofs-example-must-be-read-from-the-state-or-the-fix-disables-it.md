---
kind: lesson
title: A proof's example must be read from the state, or the feature that fixes the example disables the proof
created: 2026-10-20
feature: F-242
severity: medium
scope: [scripts]
links: [[a-proof-must-call-the-function-the-way-the-gate-does]], [[a-decoy-that-is-not-broken-proves-nothing]], [[a-surface-feature-cannot-close-with-its-surface-unswept]]
---

# A proof's example must be read from the state, or the feature that fixes the example disables the proof

`verify-mockups --prove` checks the rule that a surface feature may not close with its surface
unswept. Its two cases planted on a named example: mark **F-242** done, and `01.screen` must be
reported as built and not enrolled; drop `01` from F-242's mockups, and `01.screen` must be reported
as built by nobody.

F-242 is the feature that builds `01.screen`, and it enrolled it. From that commit the plants planted
nothing — a done feature whose surface IS enrolled is not a finding — so both cases stopped
discriminating. Lint stayed green; only Tier 2's `verify:mockups:prove` said so.

Any example a proof names is a fact about today's state, and the work the rule exists for changes
that state. A proof of "nothing is left unswept" that names the next unswept thing expires the day
that thing is swept — by exactly the feature the rule was written to keep honest.

## The rule

**When a proof's case needs a member of a moving set — the next owed surface, the first undecided
question, a feature not yet done — it reads that member from the state at run time, and fails loudly
when the set is empty.** It does not name one.

`verify-mockups` now takes the first screen still owed by exactly one feature, and throws if none is
left, which is the honest end of that rule's life rather than a silent pass.

## How to check

Grep a proof for literal feature ids, surface ids or question ids. For each, ask whether finishing
ordinary work would change it. If it would, read it from the state.
