# ADR-0008 — Postgres narrows the candidates; the engine ranks them perceptually

## Status

Accepted

## Date

2026-08-13

## Context

Colour search (FR-47) has two halves that look like one problem:

- **Textual** — "dark muted green", "藍鼠", "ai-nezumi", "indigo".
- **Perceptual** — "colours nearest to `#263B3C`", which is also what naming (FR-7) and
  duplicate detection (FR-44) need.

The tempting implementation is to push both into the database — a text index for the first,
a vector or spatial index over Lab for the second.

The second half does not work, for a reason that is easy to miss: **ΔE00 is not a metric.**
It violates the triangle inequality by design, because its lightness, chroma and hue
weightings and its `Rt` rotation term deliberately distort Euclidean distance to match
perception. Every spatial index — GiST, k-d tree, pgvector, HNSW — assumes the triangle
inequality holds. Run ΔE00 ranking through one and you get an ordering that is *almost*
right, is wrong in specific regions of the space, and produces no error anywhere.

That failure mode is the worst kind: silent, plausible, and directly in the product's
core claim.

## Decision

**Two stages. The database narrows; the engine ranks.**

```
query
  ├─ textual  → Postgres FTS (GIN over name columns)
  │             + pg_trgm for fuzzy romaji and typo tolerance
  │             + a deterministic phrase→region mapping for natural language
  │
  └─ perceptual → coarse Lab-bucket B-tree range scan  (candidate shortlist, ~100s)
                     ↓
                  ΔE00 computed in @irodora/color-difference over the shortlist
                     ↓
                  exact perceptual ranking
```

1. **Postgres never ranks by perceptual distance.** It returns a *superset* by cheap
   Euclidean-ish bucketing, deliberately generous.
2. **The engine computes exact ΔE00** over the shortlist. Hundreds of ΔE00 evaluations
   cost microseconds; correctness is not negotiable and the cost is not material.
3. Shortlist radius is chosen so recall is provably complete for the target result count,
   verified by a test that brute-forces the full corpus and asserts the two-stage result
   is identical.
4. **Natural-language phrases map deterministically** to lightness/chroma/hue regions from
   a versioned lexicon in `content/rules/`. "Dark muted green" is a region, not an
   embedding. It is explainable, editable by content editors, and identical every time.
5. **No search engine at R1.** Postgres FTS plus trigram handles the catalog by an order
   of magnitude.

## Consequences

**Good.** Perceptual ranking is exactly correct, and the two-stage result is proven
identical to brute force. The engine stays the single source of colour truth — no colour
maths leaks into SQL. Natural-language search is explainable and editable without a
deployment. One less piece of infrastructure at R1.

**Bad.** Two round trips of logic for one user query. The bucket radius needs tuning as the
corpus grows, with a test that would catch it being wrong. Client-side perceptual search
must either fetch the corpus (it does — offline mode needs it anyway) or call the API.

**Neutral.** The Lab-bucket index is a coarse accelerator, not a semantic structure. It can
be replaced with something better without touching the ranking.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **pgvector over Lab/OKLab** | Fast, indexed, familiar. Assumes a metric space; ΔE00 is not one. Would return subtly wrong orderings with no error signal — the failure this decision exists to avoid. Viable only if we abandoned ΔE00 for ΔEok, which we will not do for user-facing claims |
| **Rank by ΔE00 in SQL** | Correct results. Requires a full scan or a stored-procedure reimplementation of ΔE00 — a *second* implementation of the product's most important function, which would eventually disagree with the first |
| **Elasticsearch / OpenSearch** | Better text search and faceting. Real operational cost, another store to secure and back up, and it does not solve perceptual ranking either |
| **Rank by ΔEok everywhere** | Genuinely metric, so a spatial index works. But ΔEok is a ranking approximation, and professional users (FR-61) expect ΔE00. We use ΔEok for cheap pre-ranking already; promoting it to the stated result would weaken the claim |

## Revisit when

- The corpus exceeds ~100 000 entries and the shortlist scan shows up in the p95 budget.
- Faceted catalog search becomes a primary navigation surface, at which point a dedicated
  search engine earns its operational cost — for the *text* half only.
