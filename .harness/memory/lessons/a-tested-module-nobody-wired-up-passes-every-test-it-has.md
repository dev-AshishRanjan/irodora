---
kind: lesson
title: A tested module nobody wired up passes every test it has, and does nothing
category: convention
confidence: 1.0
created: 2026-08-19
scope: [root]
links: [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[a-gate-that-errors-is-failing-open]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# A tested module nobody wired up passes every test it has

**A unit test proves a function behaves. Only a request through the whole stack proves the
function runs.** The gap between those two sentences held three security-relevant mechanisms in
F-015 for six increments, with a green suite the entire time.

## Where it came from

F-015's plan decomposed the API foundation into increments: the error mapper, the route wrapper,
idempotency, pagination, rate limiting. Each landed with its own tests. Each was green.

**None of them was attached to the server.** `buildServer` installed the validator compiler and
the health routes and stopped. So:

- `mapError` — the function whose entire purpose is that *only an `ApiError` contributes its
  message* — was never called. A thrown `Error` went out as the framework's default 500 body,
  **carrying its own message**. The e2e decoy that throws a connection string proved it in one
  request.
- `assertIdempotencyKey` refused nothing. A mutation with no `Idempotency-Key` succeeded.
- `checkRateLimit` counted nothing. There was no limiter.

Every acceptance criterion had a passing test. Three of them were false.

## Why the plan did not catch it

Because the plan listed the *parts*. Each increment named a module and a test, and every one was
delivered exactly as written. **No increment said "wire it in", so nothing did** — and no gate
could notice, because gate 4 runs the units and the units were fine.

This is the same shape as a gate shipping before its data
[[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]]: the check runs, finds nothing
to object to, and exits 0 by its own correct logic. The exit code carries no information about
the thing you actually care about.

## What to do about it

1. **Decompose by behaviour, not by module.** "Errors never leak internals" is an increment;
   "write `mapError`" is half of one. If an increment's deliverable cannot be observed from
   outside the process, it is not finished.
2. **Put the integration test in the same increment as the part**, not in a later one. It was
   scheduled two increments after the last mechanism, and that gap is exactly how long the
   defect lived.
3. **Make the assembled server the unit under test for anything cross-cutting.** Hooks, error
   handlers and middleware have no meaningful unit-level behaviour — their whole content is
   *being installed, in the right order, on the right instance*.
4. **Prove the wiring by removing it.** Unwiring each hook in turn must turn cases red:
   `useErrorHandling` → 13 of 26, `useRateLimiting` → 3, `useIdempotency` → 3, baseline green
   either side. A suite that stays green when a hook is deleted was never testing the hook.

## The case that did not discriminate, and how it was caught

The "fails open when the cache is unreachable" test asserted a 200 with no rate-limit headers.
**That is exactly what a server with no limiter at all produces.** It passed against the unwired
app, so it proved nothing about failing open — it proved nothing about anything.

The fix was to assert that the limiter *ran and chose to allow*: count the attempted increments
and require at least one. **A test whose expected output is indistinguishable from "the feature
is absent" is not a test of the feature** — which is the same principle as
[[a-negative-test-needs-a-decoy-not-an-empty-fixture]], arriving from the other direction.
