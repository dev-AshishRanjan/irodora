# An exception a check allows needs an owner, and still counts

**Date:** 2026-10-13 · **Found in:** F-221's review (B2)

## What happened

F-221's criterion 1 asks for every route. One route, `/atlas/with/reading/[id]`, could not be
reached from a cleared app, so the capture spec declared it unreachable and the record let a run pass
without it. Three things were wrong with that:

- **The reason was false.** It said a reading comes only from the camera. F-166 had built a library
  photo path months earlier.
- **Nothing limited the exception.** Any route with a reason of twelve characters could be declared,
  so a route that merely failed could be declared away, and the run would exit 0.
- **The attestation was softened.** It read "every reachable route", which is not what the criterion
  says, and the definition of done forbids rewording a criterion into something easier.

## The rule

1. **An exception names who owes its removal**, a feature that exists and is not done, and the gate
   checks that. With no owner the exception is permanent, and an owner that has closed is a debt
   nobody holds.
2. **An exception is named in the verdict and still counts against it.** The record says
   "unreachable, owed by F-259", and the run fails. A pass that quietly excludes something has proven
   less than it says.
3. **A criterion is never narrowed in an attestation.** Either the thing is reached, or the
   criterion is amended in the open, through a decided question and an ADR, as F-221's criterion 2
   was. Otherwise the attestation stays outstanding.
4. **Check the premise of an exception against the code**, not memory. "Only the camera makes a
   reading" took one search to disprove.

## How to apply

Whenever a check gains an allow-list, a skip, a "declared" state or an "expected" red: give each
entry an owner the gate verifies, keep it visible in the verdict, and make sure the verdict still
fails while it stands — unless a person decided otherwise in an ADR.

Links: [[an-always-gate-nobody-runs-is-red-without-anyone-knowing]] · [[a-check-must-report-its-scope-not-only-its-verdict]]
