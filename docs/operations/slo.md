# Service Levels

| | |
|---|---|
| **Status** | Baseline · gated from R2 |
| **Implements** | NFR-4, NFR-5, NFR-6, NFR-7 |

Thresholds here are **absolute and committed**, never baseline deltas. CI hardware varies,
and a delta gate flakes until somebody disables it — at which point the budget stops
existing without anybody deciding to remove it.

---

## Availability

| Service | Target | Window |
|---|---|---|
| Catalog reads (`GET /v1/colors`, `/palettes`, `/search`) | 99.95 % | 30 days |
| Authenticated API | 99.9 % | 30 days |
| Sync | 99.9 % | 30 days |
| Worker jobs (reports, exports) | 99.5 % | 30 days |
| Web application | 99.9 % | 30 days |

**Availability is not the whole story here.** The client falls back to the local engine
when the API is unreachable (NFR-6), so an API outage degrades the product rather than
stopping it. That is measured separately: *degraded-mode success rate* — the proportion of
sessions that complete a core journey while the API is unavailable. Target ≥ 95 %.

### Error budget

99.9 % over 30 days ≈ **43 minutes**. Consumption policy:

| Consumed | Response |
|---|---|
| < 50 % | Normal delivery |
| 50–80 % | Reliability work prioritised in the next cycle |
| > 80 % | Feature work pauses; reliability only until the window resets |

---

## Latency (NFR-4)

Gated by `perf`. Absolute thresholds.

| Operation | p50 | p95 | Gate |
|---|---|---|---|
| Live pick (on-device, per frame) | 20 ms | **50 ms** | `perf` |
| Local colour analysis (precision pick) | 80 ms | **200 ms** | `perf` |
| Recommendation (server) | 70 ms | **200 ms** | `perf` |
| Catalog read (cache hit) | 15 ms | 50 ms | `perf` |
| Catalog read (cache miss) | 60 ms | 200 ms | `perf` |
| Any API endpoint | 100 ms | **300 ms** | `perf` |
| Capsule solve, 40 garments | 800 ms | **3 s** | `perf` |
| Sync batch, 100 changes | 200 ms | 800 ms | `perf` |

**Capsule optimisation has a hard time budget and returns best-so-far on expiry.** A
deterministic answer within budget is worth more than an optimal one that never arrives —
and "best found within 3 seconds, deterministically" is a reproducible result, which
matters for FR-10.

---

## Frontend (NFR-5)

Gated by `web-perf`.

| Metric | Budget |
|---|---|
| First-load JS — Atlas and colour detail | ≤ 120 kB gzipped |
| First-load JS — Lens route | ≤ 240 kB gzipped (includes the engine) |
| LCP | ≤ 2.0 s |
| CLS | ≤ 0.05 |
| TBT | ≤ 200 ms *(reported; gating decision per route)* |

Measured over the wire, gzipped, captured at the `load` event so lazily-imported chunks are
correctly excluded — that exclusion **is** the definition of the budget. Under
`prefers-reduced-motion: reduce` with CPU throttling, median of three runs.

**The Atlas ships no colour engine.** It is server-rendered and static per corpus version.
If engine code appears in the Atlas bundle, a `'use client'` is in the wrong place — which
is exactly the regression the route-level budget exists to catch.

---

## Scale (NFR-7)

| Dimension | Target at R4 |
|---|---|
| Corpus entries | 100 000 |
| Wardrobe items per user | 10 000 |
| Catalog reads | 1 000 rps sustained |
| Authenticated requests | 200 rps sustained |
| Concurrent sync sessions | 5 000 |

Catalog reads are dominated by CDN and cache, since the corpus is immutable per version.
Origin load should scale far below request volume, and a rising origin-to-edge ratio is a
signal that cache keys have gone wrong.

---

## What is measured, and where it comes from

Every number above has an instrumented source
([ADR-0022](../adr/0022-observability-opentelemetry-no-raw-imagery.md)):

| Signal | Source |
|---|---|
| Availability | Synthetic probes against `/readyz` plus real request success rate |
| Latency | OTel spans, per route and per module boundary |
| Engine time | A dedicated span around colour computation |
| Cache hit rate | Valkey metrics plus CDN reports |
| Degraded-mode success | A client event emitted on local-engine fallback |
| Sync conflict rate | Server-side counter per entity type |
| Scan failure rate | Client event, bucketed by cause |
| Frontend vitals | `PerformanceObserver` in the `web-perf` gate |

A metric without a named source is not published.

---

## On a miss

**A missed budget is a tracked work item, never an edited threshold.** If a threshold is
genuinely wrong, it changes deliberately, with an ADR, and the change is recorded — the
same rule as any other gate ([`.harness/protocols/verification.md`](../../.harness/protocols/verification.md)).
