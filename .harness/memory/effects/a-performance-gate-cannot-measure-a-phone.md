# A performance gate cannot measure a phone

**E-035** · from `tests/bench/budgets.json` · guard `gate:perf`, proven by `bench-proof.mjs`

## What depends on what

`budgets.json` holds every ceiling gate 12 enforces. Gate 12 is `requiredFor: release`. So a
number edited in that file changes what may ship, with no code change and nothing failing —
the same shape as E-009 for rule weights, one level up: this file **decides the verdict**
rather than participating in it.

## The problem this gate has that no other gate has

NFR-4's budgets are on-device, *"measured on the slowest device in the support matrix rather
than the fastest"*. The gate runs on a CI runner, which is neither the slowest thing nor a
device.

There were three options and only one of them is honest:

1. **Assert NFR-4's numbers on the runner.** `recommendOutfit` costs 0.76 ms here against a
   200 ms budget. The assertion passes by a factor of two hundred, reads like coverage in
   every report, and would keep passing if the app took a second on a phone.
2. **Invent a scaling factor** between this hardware and a four-year-old Android. Nobody has
   measured one. It would turn a desktop number into a claim about a phone, which is exactly
   what NFR-21 and ADR-0031 exist to prevent, in a file nobody reads as a claim.
3. **Measure what is here, print what is not.** Every budget carries a `scope`.
   `node-reference` budgets are measured and failed on a miss; `device` budgets are printed as
   **NOT RUN** with the reason, on every single run, and stay attested on the features that own
   them — F-030, F-040, and R4's capsule solver.

A green gate 12 says *the engine is not the problem*. It does not say the app is fast, and the
gate's own output says so every time.

## The engine ceilings are chosen, not derived

Written down because it is the sentence most likely to be quietly forgotten. 15 ms for
`recommendOutfit` is not "200 ms scaled to a workstation". It is a ceiling on what the pure
computation may cost on reference hardware, picked at roughly twenty times the observation so
an ordinary slowdown does not flake the gate while the `SHORTLIST_LIMIT` bound coming off
still fails it. Each rationale in `budgets.json` says so in its own words.

## A ceiling below the timer's resolution is not a strict budget

`scoreColor` costs about 0.6 µs. Timed one call at a time, its p95 is `0.00` — and the first
draft of this gate happily reported that against a 1 ms ceiling. **A budget nothing can exceed
is a check that passes because it does nothing**, which is the failure the whole harness is
built around, appearing here in the one form that looks like good news.

Two things fix it. Cheap work is measured in **batches** (`callsPerRun`), so the ceiling is on
1000 calls and lands above the timer's floor. And the bench **refuses** any `node-reference`
measurement whose p95 is exactly zero, naming the fix, so the next one cannot be added
silently.

## The arithmetic checks itself, in both directions

A p95 computed wrongly produces a plausible number and a green gate for ever. There is no
downstream symptom, ever — which makes it unlike almost every other defect in this repository.

So the percentile runs against known arrays with known answers before anything is measured,
**and** against the question the known answers cannot ask: is p95 different from p5? The proof
plants a percentile hardcoded to return the right value for every case the first half checks
and a constant otherwise. Only the second half sees it
[[a-decoy-that-is-not-broken-proves-nothing]].

## What guards it, and what does not

Nine planted cases go red; one must stay green, and the green one is load-bearing: a `device`
budget with a 0.001 ms ceiling, unreachable by anything, staying green because device budgets
are never measured here. If this gate is ever changed to satisfy NFR-4 with a desktop number,
that case is what catches it.

**Nothing stops somebody raising a ceiling to turn a red run green.** `gates.json` says a miss
is a tracked work item and never an edited threshold; the enforcement is the diff, the
`rationale` beside each number, and review — the same honest limit ADR-0046 records for
published content.

## The guard that had never run

Gate 12's CI step carried
`if: github.event_name == 'push' && hashFiles('tests/bench/package.json') != ''`. That file has
existed since F-001, so the surviving effect of the condition was to skip the gate on every
pull request — the place a slow change is actually reviewed. Flipping the gate to `active` with
the guard still in place was watched failing gate 0 first, which is the point of
[[a-ci-step-guarded-by-an-if-is-invisible-to-the-mirror-check]]. No step in `ci.yml` carries an
`if:` any more.

## Related

- [[a-ci-step-guarded-by-an-if-is-invisible-to-the-mirror-check]] — how this gate came to be
  active and unrun in the first place.
- [[a-gate-that-errors-is-failing-open]] — the same shape: a check reporting green for a reason
  other than passing.
- [[the-cache-key-decides-whether-a-gate-ran-at-all]]
- [[the-shortlist-bound-is-the-only-thing-making-two-stage-equal-a-full-scan]] — the bound whose
  removal this gate is tuned to catch.
