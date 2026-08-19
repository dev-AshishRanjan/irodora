---
name: perf-budget
description: Measure against committed absolute budgets, and treat a miss as a work item rather than a threshold to edit.
---

# Skill: perf-budget

Budgets: [PRD NFR-4](../../../docs/PRD.md#6-non-functional-requirements) · gate definitions in [`gates.json`](../../verification/gates.json).

## The rule

> **Absolute thresholds, never baseline deltas.**

CI hardware varies. A delta gate flakes, someone disables it, and the budget stops existing
without anyone deciding to remove it.

> **A miss is a tracked work item, never an edited threshold.**

If a threshold is genuinely wrong, it changes with an ADR — not as a side effect of a
failing build.

## Measuring

**Measure before optimising. Then measure after.** Optimising on intuition in colour maths
is particularly unreliable — the expensive operation is rarely the one that looks
expensive.

| What | How |
|---|---|
| Backend latency | `pnpm bench` — real runtime, deterministic corpus, absolute thresholds |
| Frontend | `pnpm test:perf` — over the wire, gzipped, at the `load` event |
| Engine | Microbenchmarks over a fixed input set |
| Database | `EXPLAIN ANALYZE` on the real plan, not the imagined one |

**The frontend measurement is captured at the `load` event** so lazily-imported chunks are
correctly excluded. That exclusion **is** the definition of the budget.

**Core Web Vitals are measured under `prefers-reduced-motion: reduce`** with CPU throttling,
median of three runs. Not Lighthouse: with animation running, TBT scales with how long you
observed rather than with the page — it measures the observation window, not the site.
Reduced motion is a state the product genuinely ships, so the number means something.

**The honest limit:** this does not measure what a motion-enabled visitor experiences. Say
so rather than implying otherwise.

## Where the cost actually is

| Area | Usual cause |
|---|---|
| Recommendation | **Candidate set size.** Cost scales with candidates; prune the search space, not the maths |
| Engine hot path | Allocation in an inner loop. Typed arrays, precomputed matrices |
| Catalog read | A cache key that varies per request caches nothing |
| Database | A missing index on a tenant-scoped query. RLS adds planning overhead |
| Web first load | A misplaced `'use client'` pulling the engine into a page that needs none |
| Capsule solve | Combinatorial. Bound it and return best-so-far on expiry |

**Never trade correctness for speed in the engine.** An approximated `pow` or `cbrt` needs a
flag, a golden test proving its error bound, and an ADR.

## Optimising

1. Measure, and identify the actual hot path.
2. Fix the algorithm before the constant factor.
3. Re-measure.
4. **Confirm correctness is unaffected** — for engine work that means the golden set and
   the cross-platform identity test.
5. Record the before and after in `progress.md`.

**Never optimise before the behaviour is verified.** It moves the boundary between
known-correct and unverified in the wrong direction, and then a failure has two possible
causes.

## Adding a budget

Absolute · measured by a gate · with a stated method · and **verified to be able to fail**
against a deliberately slow implementation. A budget that cannot go red is not a budget.
