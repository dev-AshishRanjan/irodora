# A review that can be repeated is a loop with no exit

**Date:** 2026-09-15 · **Found in:** F-219

The harness said "prefer the evaluator subagent" in five places and never said how many times. So
every FAIL went back to the implementer, and every fix went back to a fresh evaluator. F-219 — a
claims-lint extension — went through **six** review rounds. Each round was honest, and each found
new phrasings a regular expression did not catch, because a regular expression can never be shown
to catch every phrasing. The loop could not converge on its own, and it burned a great deal of the
user's budget before the user stopped it: *"We do review only once."*

Two things made it unbounded:

1. **Nothing capped the rounds.** A review was treated as the definition of done, so "done" meant a
   PASS verdict, and a PASS had no guaranteed arrival.
2. **Each review was briefed to find more, and the bar moved with what it found.** A finding list
   that grows with each probe is useful once and a trap when it is the exit condition.

**The rule** (now binding — AGENTS.md loop step 5, `/verify`, verify-gate, definition-of-done, the
evaluator's own definition):

- The evaluator reviews a feature **once**, and its brief asks for **every** finding in that pass.
- The implementer fixes each finding inside the feature, or records it as a `backlog` feature — never
  silently drops it — re-runs the gates, and records the evidence. That is done.
- **A feature is never sent back for a second review.** A finding that can be neither fixed nor
  recorded stops the loop for the user.

Links: [[an-always-gate-nobody-runs-is-red-without-anyone-knowing]]
