---
name: db-migration
description: Write a migration that can be rolled back, does not race on a multi-container start, and does not silently drop tenant isolation.
---

# Skill: db-migration

Model: [`data-model.md`](../../../docs/architecture/data-model.md) ·
[ADR-0013](../../../docs/adr/0013-postgres-drizzle-single-system-of-record.md) ·
[ADR-0017](../../../docs/adr/0017-multi-tenancy-and-rls-from-day-one.md).

## Three rules

### 1. Forward-only

A mistake is corrected by a **compensating migration**, never by editing a shipped one.
Someone has already run it.

### 2. Expand/contract for anything destructive

```
Release N     add the new column · dual-write · backfill
Release N+1   switch reads
Release N+2   stop writing the old · drop it
```

**A migration that drops a column in the same release that stops writing it cannot be
rolled back** — and the release checklist requires that the previous image runs against the
new schema.

### 3. Every user-data table carries tenancy

```sql
ALTER TABLE t ADD COLUMN tenant_id uuid NOT NULL REFERENCES tenant(id);
ALTER TABLE t ENABLE ROW LEVEL SECURITY;
ALTER TABLE t FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON t
  USING (tenant_id = current_setting('irodora.tenant_id')::uuid);
```

**`FORCE` is not optional.** Without it the table owner bypasses the policy, and the
application's migration role is usually the owner — so the protection would be absent in
exactly the connection that matters.

## Steps

1. **Write it** in Drizzle. Review the generated SQL — do not merge a migration you have
   not read.
2. **Add RLS** if it holds user data.
3. **Index deliberately.** Tenant-scoped queries need `tenant_id` leading. RLS adds
   planning overhead; a missing index shows up as a latency regression, not an error.
4. **Backfill in batches** with a bounded statement timeout. A single `UPDATE` over a large
   table takes a lock nothing else can work around.
5. **Test the rollback.** Run the previous release's code against the new schema.
6. **Update the repository layer**, and run [`effect-trace`](../effect-trace/SKILL.md) — a
   schema change reaches migrations, repositories, queries and RLS policies.

## Boot-time application

Migrations run at boot under `pg_advisory_lock` in the local and VPS profiles. Several
containers starting simultaneously is the **normal case** under Coolify and Dokploy, not an
edge case — the lock is what makes that safe.

In the cloud profile they run as a separate task before the service update, which gives a
clearer failure boundary.

## Colour columns

`xyz_x/y/z` are canonical. `lab_*`, `oklch_*` and `hex` are **materialised derivations
written by the engine** — never computed in SQL, never typed by hand
([E-001](../../state/effects.json)).

A migration that adds a derived column also adds the corpus rebuild that populates it.

## Never

- Edit a shipped migration.
- Drop a column in the same release that stops writing it.
- Add a user-data table without `tenant_id` and RLS.
- Add a `skin_color` column, or anything equivalent — schema-checked, and NFR-22 is why.
- Compute a colour conversion in SQL.
- Backfill without batching and a timeout.
