---
kind: lesson
title: A fix made in review is the one most likely to ship untested, because the review report feels like the test
category: engineering
confidence: 1.0
created: 2026-09-03
scope: [packages, apps]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# Three of four guards added in review had no test

F-053's colour-science review found three silent-wrong-answer paths. I fixed all three, added a
fourth guard alongside them, and the suite went green. Then I mutated each guard out of the real
source and re-ran:

```
unmutated suite exit: 0 (PASS — the harness works)
  caught    A1  — accept upright without comparing against the rotated fit
  SURVIVED  A1b — assertCard stops refusing a rotationally symmetric card
  SURVIVED  A2  — the affine branch stops refusing a zero-area quad
  SURVIVED  A3  — the winding check stops refusing a self-intersecting quad
```

**Three of the four could be deleted with every test still passing.** One had a test only
because the reviewer's report happened to describe a scenario I turned into one.

## Why this class specifically

A fix written from a review report arrives with a **description of the failure already in hand**.
That description is vivid, specific and someone else's — it reads like evidence. Writing the
guard feels like closing the loop, because the report explained exactly what was wrong and the
code now handles it.

But the report is not in the repository. **The next person to touch that branch has the code and
the suite, and the suite says the guard is optional.** A guard that can be deleted silently is
worth roughly what an unwritten one is worth, minus the false confidence.

Ordinary feature work does not have this shape as sharply: you write a test because you have to
convince yourself the thing works at all. A review fix has already been argued for.

## The habit

**After fixing anything a review found, mutate the fix out and re-run.** It costs one script and
one minute. Everything the lessons about mutation already say still applies — invoke the runner
as `node node_modules/<runner>/…` rather than a `.bin` shim, and **assert a PASS on the unmutated
source first**, or a harness that cannot start reports every mutation as caught
[[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]].

Restore in a `finally` **and** guard the start, for the reason F-134 exists: a `finally` does not
run when the process is killed. Better still, mutate a **copy** in a scratch directory, or keep
the checked function pure so the mutation is an object literal and nothing is planted at all.

## The same session, the other direction

The property tests added in the same pass broke **my own stated property** on their first run —
I had asserted idempotence of the correction and applied it to the wrong operand, so it recovered
`M⁻¹` instead of the identity. `fast-check` found it with a uniform 0.7 gain and printed
`0.6999999999999993`, which reads as *"this is 0.7"* rather than as noise.

Both halves are the same lesson: **the thing you are most sure of is the thing with no check
under it.**
