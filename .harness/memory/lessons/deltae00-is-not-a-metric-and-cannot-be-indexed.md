---
kind: lesson
title: ΔE00 is not a metric, so no spatial index can rank by it correctly
category: convention
confidence: 1.0
created: 2026-08-13
scope: [packages/color-difference]
links: [[deltae00-is-the-ranking-authority]]
---

# ΔE00 is not a metric

**CIEDE2000 violates the triangle inequality — by design.** Its lightness, chroma and hue
weighting functions and its `Rt` rotation term deliberately distort Euclidean distance to
match perception.

## The consequence that matters

**Every spatial index assumes the triangle inequality holds.** GiST, k-d trees, pgvector,
HNSW — all of them prune the search space using it.

Run ΔE00 ranking through one and you get an ordering that is:

- almost right, most of the time;
- **wrong in specific regions** of the colour space;
- **silent** — no error, no warning, no signal at all.

That combination is the worst possible failure mode, and it sits directly in the product's
core claim.

## What we do instead

Two stages ([ADR-0008](../../../docs/adr/0008-search-postgres-fts-with-engine-side-perceptual-ranking.md)):

1. **Postgres narrows** — a coarse Lab-bucket range scan returning a deliberately generous
   superset.
2. **The engine ranks** — exact ΔE00 over the shortlist.

Hundreds of ΔE00 evaluations cost microseconds. Correctness is not negotiable and the cost
is not material.

A test brute-forces the full corpus and asserts the two-stage result is **identical**. That
test is what keeps the shortlist radius honest as the corpus grows.

## The tempting wrong turn

"Use ΔEok instead — it is genuinely metric, so the index works."

ΔEok is fine for cheap pre-ranking and we use it there. But it is an approximation, and
professional users expect ΔE00. Promoting the approximation to the *stated* result would
weaken the claim to buy an index we do not need.
