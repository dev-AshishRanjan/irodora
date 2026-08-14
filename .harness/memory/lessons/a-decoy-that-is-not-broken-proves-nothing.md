---
kind: lesson
title: A decoy that is not actually broken proves nothing, and it looks exactly like one that works
created: 2026-08-14
feature: F-005
scope: [packages/ports, packages/adapters, scripts]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[mutual-assignability-does-not-catch-an-optional-field]], [[a-pipe-discards-the-exit-status-a-gate-just-produced]]
---

# A decoy that is not broken proves nothing

The discipline is already written down: *a negative test needs a decoy, not an empty
fixture*. This is the next failure along, and it is subtler — **you write the decoy, the
check goes red, and the decoy was not testing what you thought.**

Or worse: the check goes *green*, and you conclude the guard is fine.

Four instances in one feature, each caught only by running the mutation rather than reading
it:

| Decoy | Why it was not a decoy |
|---|---|
| `AliasingBlob` — meant to store the caller's buffer by reference | Subclassed the in-memory store and delegated to `super.put`, **which copies**. The broken adapter behaved correctly |
| The Postgres lock-leak test | Re-acquired from the **same pooled connection**, and advisory locks are re-entrant within a session, so it always answered yes. The test could not detect the leak it was named after |
| `InMemoryDatabase` in that same case | Kept locks **per instance**, so two "connections" never contended and the case passed vacuously |
| The compose-portability proof harness | Matched `rule: X` against **ANSI-coloured output** and reported all eleven rules as broken when every one had fired |

## The shape

Two different failures wearing the same clothes:

- **A decoy that is secretly correct** → the check goes green, and you record the guard as
  proven when nothing was proven.
- **A harness that misreads a correct result** → the check goes red, and you go looking for a
  bug in code that is fine.

Both are cheap to catch and expensive to miss, and the same move catches both: **assert the
baseline too.** Every mutation table in this repository now runs an unmutated case and
requires it to pass. A row of failures with no passing baseline means the harness is broken,
not the code.

## What to do

1. Write the decoy.
2. Run it. Confirm it fails **for the reason you intended** — read the failure message, not
   just the exit code.
3. Run the **baseline** in the same harness and confirm it passes.
4. If the decoy inherits from the real implementation, check that the method you overrode is
   the one doing the work. Delegating to `super` is how a broken adapter quietly behaves
   correctly.
5. Strip ANSI before matching on output. Three separate checks in this repository have lied
   about their own results because of escape codes.
