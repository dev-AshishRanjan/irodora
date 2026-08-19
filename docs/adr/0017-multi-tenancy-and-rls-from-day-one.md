# ADR-0017 — Tenancy is carried from day one and enforced by the database

## Status

**Superseded by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md).** One device, one user, one database
file. There is no tenant boundary because there is no shared store.

## Date

2026-08-13

## Context

The consumer product has no tenants in any meaningful sense. Every user is an individual
with their own wardrobe. Adding a tenancy hierarchy now looks like premature generality.

Two things make it necessary anyway:

**Retrofitting tenancy onto a live schema is one of the most expensive migrations there
is.** Every table needs a column, every row needs a backfill with a tenant that has to be
inferred, every query needs a predicate, and every one of those changes is a chance to
miss a query and create a cross-tenant leak in production. The Studio tier (FR-64) and
enterprise self-hosting are on the roadmap, so this migration is scheduled, not
speculative.

**Application-level isolation fails eventually.** A `WHERE user_id = ?` predicate is
correct until someone writes a query without it — in a new endpoint, in a background job,
in a data-fix script. The failure is silent and the blast radius is other people's
wardrobe photographs.

## Decision

**Full tenancy hierarchy from the first migration. Isolation enforced by Postgres
row-level security, with application code as the second line of defence.**

```
tenant ──< organization ──< workspace ──< membership >── user
                                              │
                                    owner | admin | editor | member | viewer
```

A consumer user is a tenant with one organisation, one workspace and one membership. The
cost today is a column and a policy.

1. **Every table holding user data carries `tenant_id NOT NULL`.**
2. **RLS with `FORCE`:**

   ```sql
   ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
   ALTER TABLE <t> FORCE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON <t>
     USING (tenant_id = current_setting('irodora.tenant_id')::uuid);
   ```

   `FORCE` is not optional. Without it the table owner bypasses the policy, and the
   application's migration role is usually the owner — so the protection would be absent
   in exactly the connection that matters.

3. **`irodora.tenant_id` is set per connection from the authenticated session**, never from
   a request parameter. A missing setting raises an error rather than returning every row.
   Failing open on a tenancy boundary is the worst available default.
4. **404, never 403, for another tenant's resource.** A 403 confirms the id exists, which
   is a free enumeration oracle.
5. **Content is global and deliberately not tenant-scoped** — the corpus is shared. Keeping
   the two regions separate is what allows the entire catalog to be cached at the edge
   while user data never leaves its tenant.
6. **A negative test proves isolation**: authenticate as tenant A, attempt every read path
   against tenant B's ids, assert nothing is returned. It runs with a **decoy** — real data
   present in tenant B — because a negative test against an empty fixture passes whether
   or not the policy works.

## Consequences

**Good.** Cross-tenant leakage requires defeating the database, not merely a missed
predicate. The Studio tier and enterprise self-hosting need no migration. Audit and
metering are naturally tenant-scoped. A forgotten `WHERE` clause returns nothing instead of
everything.

**Bad.** Every connection needs tenancy setup, and a forgotten setting is a production
error — loud, which is the correct trade, but still an error. RLS adds planning overhead to
queries (small, but not zero). Background jobs need an explicit tenant context, which is
extra ceremony. The hierarchy is four levels deep for a product that uses one, which
developers will find unnecessary until the day it is not.

**Neutral.** The hierarchy is present but collapsed for consumer users; the UI never
exposes it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Application-level `WHERE user_id` only** | Simplest, no RLS overhead. Correct until one query is written without it — in a new endpoint, a job, or a fix script — and the failure mode is disclosing other people's photographs |
| **Add tenancy when the Studio tier ships** | Avoids current complexity. Turns a column into a whole-schema migration with a backfill, executed under delivery pressure against live data, with a leak as the failure mode |
| **Database-per-tenant** | Strongest possible isolation. Absurd for consumer users, and unmanageable at any scale for migrations, connections and backups |
| **Schema-per-tenant** | Good isolation, decent ergonomics. Migration complexity grows linearly with tenant count, and connection pooling across schemas is awkward |

## Revisit when

- RLS planning overhead appears in the p95 latency budget.
- A tenant needs genuine physical isolation (a compliance requirement), at which point
  database-per-tenant becomes a deployment option — and the schema already supports it.
