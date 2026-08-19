---
kind: effect
id: E-015
title: The shortlist lower bound is the only thing making two-stage retrieval equal a full scan
severity: critical
guard: gate:test
confidence: 0.96
created: 2026-08-18
scope: [packages/color-naming, apps/mobile]
links: [[deltae00-is-the-ranking-authority]], [[deltae00-is-not-a-metric-and-cannot-be-indexed]], [[a-decoy-that-is-not-broken-proves-nothing]], [[measure-what-a-golden-set-can-detect-before-trusting-it]]
---

# The shortlist bound is the only thing making two-stage retrieval correct

**Loosen `boxLowerBoundDeltaE00` wrongly and every ranking becomes quietly, regionally wrong —
no error, no failing conversion, just a different answer than a full scan would give.**

## Why

`nameColor` does not examine the whole corpus. It bounds each Lab bucket below, visits buckets
in increasing bound, and **stops when the next bucket's bound reaches the k-th best distance
found so far**. That stopping rule is sound if and only if the bound never overestimates.

Overestimate it — by tightening a constant, by dropping the `S_C` divisor, by "simplifying" the
`Rt` floor — and the search skips a bucket that contained a better candidate. The result is
still three plausible colours in a sensible order. Nothing throws.

## Why it is easy to get wrong

The obvious design is a **fixed radius**: shortlist everything within R Lab units, then rank.
It is wrong, and it is wrong in the way that survives review: **ΔE00 is not a metric**
[[deltae00-is-not-a-metric-and-cannot-be-indexed]], so Euclidean distance in Lab does not bound
it. An R sufficient for one corpus is insufficient for another, and adding one entry can change
an answer. A test written against the corpus of the day would prove the radius correct *for
that corpus*.

Measured: a fixed radius of 10 Lab units is wrong on **317 of 360** queries, first failing at
45 records.

## The guard

`gate:test`, in three parts. All three are needed; any one alone is weak.

1. **The soundness property** (`test/bound.test.ts`) — random query, random box, random point
   inside: `lb <= deltaE00(query, point)`. 130k+ samples from recorded seeds, concentrated in
   the regions where each step of the derivation could fail: box corners, the blue region near
   h ≈ 275° where `Rt` peaks, high chroma where `S_C` is largest, and `L` at the extremes where
   `S_L` peaks. **This is the sharpest instrument** — the equivalence suite only catches
   unsoundness the data happens to hit [[measure-what-a-golden-set-can-detect-before-trusting-it]].
2. **The equivalence suite** (`test/equivalence.test.ts`) — two-stage ≡ brute force over 4,664
   adversarial synthetic records × 120 queries, at four limits, at bucket steps 1 / 2 / 5 / 25 /
   10⁶, and cross-checked against `culori`.
3. **The decoys**, without which 1 and 2 are tests nobody has watched fail
   [[a-decoy-that-is-not-broken-proves-nothing]]: an unsound bound (Euclidean/2, no `S_C`
   divisor) that the soundness property must find a counterexample to, and the fixed radius that
   the equivalence suite must reject.

**`bucketStep` invariance is the load-bearing assertion.** Identical results at every step,
including one large enough that the whole corpus is a single bucket, is what proves correctness
does not depend on the tuning parameter. If that ever fails, the stopping rule has become
sensitive to bucket geometry and the bound is wrong.

## The destination that has no guard

**ADR-0008 puts the coarse narrowing in the database** — now SQLite FTS5 rather than Postgres
(ADR-0051), which changes nothing here. If F-041 (`@irodora/store`) writes a SQL bucket
predicate, it is a **second implementation of `labBucketKey`** with no
import edge to this one. Nothing would notice them diverging, and the guarantee proven here
would silently stop transferring to the API path.

Whoever adds that owes: the same bucket function, or a test that the SQL narrowing returns a
superset of what the engine would visit. Recorded here so the obligation is inherited rather
than rediscovered.

**A related trap for contextual filters** (family, era, classification — `color-engine.md` §8):
a filter must be applied by building the index over a filtered record set, or by testing the
predicate *inside* the candidate loop before a record enters the heap. Filtering the **result**
after the search silently breaks the stopping rule, because the k-th best that terminated the
search may not survive the filter.

## What to do when you change it

1. Run the soundness property first, and read the worst-slack number it reports.
2. Re-run the decoys. A tightening that makes the unsound bound stop being caught means the
   property has lost its teeth.
3. Confirm `bucketStep` invariance still holds.
4. `RT_FLOOR`, `T_MAX` and `G_MAX` are **correctness constants, not knobs.** Changing one is
   changing what the search is allowed to skip.
