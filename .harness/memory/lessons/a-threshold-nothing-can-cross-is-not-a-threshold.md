# A threshold nothing can cross is not a threshold

**From F-038.** A performance budget of 1 ms on work that costs 0.6 µs. It passed. It would have
passed if the function got a thousand times slower.

## What happened

Gate 12's first draft timed `scoreColor` one call at a time and asserted its p95 against a 1 ms
ceiling. The output read:

```
✓ score-color-p95   p95 0.00 ms, median 0.00 ms, ceiling 1 ms, 2000 runs
```

Green, fast, 2000 runs, a real function, a real corpus. Everything about that line says the
budget is being enforced. Nothing about it is.

`performance.now()` cannot resolve work cheaper than its own tick, so every sample was exactly
zero — and zero is under every ceiling. The assertion had no reachable failing state.

## Why it is worth a lesson rather than a fix

This failure mode does not look like a failure. Most broken checks are *loud* eventually: a
mocked dependency drifts, a fixture goes stale, someone notices the suite passing on a deleted
file. **A threshold that cannot be crossed is silent for ever**, and it is silent while reporting
a measurement, which is more convincing than silence.

The general shape, of which the timer is one instance:

- a ceiling above anything the code could ever produce
- a floor below anything it could ever produce
- a comparison between two values that are the same expression
- a percentile over a sample the measurement cannot populate

Each of these has the same tell: **there is no input to the system that turns the check red.**
That question — *what would make this fail?* — is cheap to ask and answers itself immediately.
Asking *does it pass?* never finds it.

## What was done about it

Two things, and the second matters more than the first.

**The measurement moved above the timer's floor.** Cheap work is timed in batches of 1000, and
the ceiling is on the batch. The budget file says so in `measures`, so the number is not silently
per-call.

**The gate refuses a p95 of exactly zero**, names the fix, and fails. That converts a class of
mistake into a caught one: the *next* budget added below the timer's resolution cannot be added
quietly, by me or by anyone else. `bench-proof.mjs` plants durations forced to zero and watches
the refusal fire, because a guard nobody has seen fire is a comment
[[a-decoy-that-is-not-broken-proves-nothing]].

## The related failure in the same feature

The same gate's other budget carried the rationale *"higher than the recommendation budget
because `corpusAffinity` is the most expensive thing the engine does per call"*. Measured, it is
not: `scoreOutfit` p95 is 0.45 ms against `recommendOutfit` at 0.76 ms.

Both defects come from the same habit — **writing the justification from the intuition rather
than from the number** — and the intuition was wrong in the flattering direction both times. The
budget was generous and the reasoning made the code sound more expensive than it is. Neither
would ever have produced a failing test.

## Related

- [[a-gate-that-errors-is-failing-open]]
- [[a-performance-gate-cannot-measure-a-phone]] — the effect note for the gate this came from.
- [[an-identity-check-a-typo-can-satisfy-is-not-a-check]] — the same question asked of an
  equality rather than an inequality.
