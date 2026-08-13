# ADR-0013 — PostgreSQL is the single system of record, accessed through Drizzle

## Status

Accepted

## Date

2026-08-13

## Context

"This product is about colour" invites the assumption that it needs a specialised colour
store. It does not. The colour catalog is highly relational — colours belong to families,
cite sources, appear in palettes with roles and ranks, and are grouped into immutable
versions. That is a textbook relational schema.

The genuinely specialised need is **perceptual nearest-neighbour**, and
[ADR-0008](0008-search-postgres-fts-with-engine-side-perceptual-ranking.md) establishes
that no database can answer it correctly anyway, because ΔE00 is not a metric. The
database narrows; the engine ranks. That removes the strongest argument for a second store.

We also need row-level tenant isolation (NFR-14, FR-59), full-text and fuzzy search
(FR-47), immutable content versioning (FR-25), and an append-only audit trail (NFR-15).
Postgres does all of these natively and well.

## Decision

**PostgreSQL 17 as the single system of record. Drizzle as the ORM and migration tool.**

1. **One database.** Users, tenants, profiles, wardrobes, colours, palettes, rules,
   recommendations, audit — all of it.
2. **Drizzle**, chosen for a specific property: its query builder is close enough to SQL
   that the generated query is predictable by reading the code. For a latency-budgeted
   API, an ORM that hides its queries is a liability.
3. **The schema is TypeScript**, so table types flow into the application without a
   separate generation step.
4. **Row-level security with `FORCE`** on every table holding user data. `FORCE` matters:
   without it the table owner bypasses the policy, and the application's migration role is
   usually the owner. `tenant_id` is set per connection from the authenticated session;
   a missing setting raises an error rather than returning everything.
5. **Migrations are forward-only**, applied at boot under `pg_advisory_lock` so
   simultaneous container starts on a VPS cannot race — the normal case under
   Coolify/Dokploy, not an edge case.
6. **Expand/contract for destructive changes**, across separate releases. A migration that
   drops a column in the same release that stops writing it cannot be rolled back.
7. **Derived colour columns** (`lab_*`, `oklch_*`, `hex`) are written by the engine, never
   computed in SQL — one implementation of the maths ([E-001](../../.harness/state/effects.json)).

## Consequences

**Good.** One store to secure, back up, monitor and reason about. Real transactions across
user data. Tenant isolation enforced by the database, so an application bug cannot leak
across tenants. FTS and `pg_trgm` cover search at R1. Managed Postgres exists on every
platform we target, and the container runs happily on a small VPS.

**Bad.** Postgres becomes the scaling bottleneck if read volume grows faster than caching
absorbs it — mitigated by the catalog being immutable and CDN-cacheable, which is most of
the read traffic. RLS adds a per-connection setup step and a class of bug where a forgotten
setting produces an error in production rather than in a test; the mitigation is that it
errors rather than silently returning everything. Drizzle is younger than Prisma or
TypeORM, with a smaller ecosystem.

**Neutral.** Valkey is a cache and queue, not a store — nothing lives only there.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Postgres + a dedicated colour/vector store** | Sounds right for "a colour product". Buys nothing: the catalog is relational, and perceptual ranking cannot be indexed correctly regardless. Costs a second store, a consistency problem, and a sync path |
| **Prisma** | Better tooling and a mature ecosystem. Generates queries that are harder to predict from the call site, and its migration model is less comfortable with hand-written SQL — which RLS policies and expand/contract require |
| **Raw SQL, no ORM** | Total control and no abstraction cost. Loses compile-time schema types, which is a large safety loss across ~30 tables, and hand-rolled migration tooling is work with no product value |
| **MongoDB** | Flexible schema during early iteration. The data is relational, tenant isolation would move entirely into application code, and content versioning with referential integrity is exactly what a document store is worst at |

## Revisit when

- Read volume exceeds what caching plus one primary with replicas can serve.
- A module extracted per [ADR-0001](0001-monorepo-modular-monolith-with-extraction-triggers.md)
  needs its own store to decouple its scaling.
