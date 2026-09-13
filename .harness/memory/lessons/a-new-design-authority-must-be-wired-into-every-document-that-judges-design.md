# A new design authority must be wired into every document that judges design, or the harness argues against the product

**Date:** 2026-09-14 · **Found in:** the R9 re-cut (F-218 … F-270)

The user made `mockups/` the specification for the UI, with no deviation. Adding that to the top
of `AGENTS.md` would not have been enough. Six places in this repository make design judgements,
and every one would have told a future agent to refuse or "improve" something the approved mockups
draw on purpose:

| document | what it would have said about the mockups |
|---|---|
| `DESIGN-BRIEF.md` C1, C6 | the tinted chrome and the glowing splash mark are blockers |
| `BRAND.md` | glow and gradient are banned; chrome is near-neutral with one accent |
| `DESIGN-SYSTEM.md` | the interface is near-achromatic *by rule* |
| `visual-taste` | a serif display face is one of the generic AI looks to avoid |
| `design-review`, `designer` agent | C1 and C6 stop the review at level 1 |
| `build-ui` | "is there an approved design?" — answered by the brief, not the mockup |

An agent following any of them faithfully would have deviated from the mockups while believing it
was following the harness.

**The rule.** When a new authority outranks an old one, find every document that makes the kind of
judgement the new authority now makes, and give each an explicit precedence line pointing at it.
Leave the old text in place as the record of what was superseded; do not rewrite it into agreement.

**The second half.** "No deviation" was only satisfiable because the forced departures were written
as a closed list — golden rules 11–13, blocking gates, contradictions resolved by a fixed precedence,
undrawn capabilities (`docs/design/R9-MOCKUP-FIDELITY.md` §4). Without the list, "no deviation" is
either impossible (the mockups contradict each other nine ways on the tab bar alone) or quietly
discretionary. Everything outside the list becomes an open question for a person.

Links: [[the-constraint-and-the-taste-usually-agree]]
