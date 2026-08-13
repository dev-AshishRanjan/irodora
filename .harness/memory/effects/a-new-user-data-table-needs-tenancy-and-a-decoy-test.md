---
kind: effect
id: E-010
title: A new user-data table needs tenancy, FORCE, and a decoy in its negative test
severity: critical
guard: test:apps/api/test/tenancy-isolation.test.ts
confidence: 0.96
created: 2026-08-13
scope: [apps/api]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# A new user-data table needs tenancy and a decoy test

Every table holding user data needs **four** things, and three of them are easy to
remember:

```sql
ALTER TABLE t ADD COLUMN tenant_id uuid NOT NULL REFERENCES tenant(id);
ALTER TABLE t ENABLE ROW LEVEL SECURITY;
ALTER TABLE t FORCE ROW LEVEL SECURITY;          -- ← the one that gets missed
CREATE POLICY tenant_isolation ON t
  USING (tenant_id = current_setting('irodora.tenant_id')::uuid);
```

## Why `FORCE` is not optional

**Without it, the table owner bypasses the policy** — and the application's migration role
is usually the owner. So the protection would be absent in exactly the connection that
matters, while `\d t` shows RLS enabled and everything looks correct.

## Why the setting must raise rather than default

`current_setting('irodora.tenant_id')` with no value set must **error**, not return NULL. A
NULL comparison silently matches nothing, which sounds safe — but the same missing setting
in a code path that builds its own query returns *everything*.

Failing open on a tenancy boundary is the worst available default. Failing loudly is the
correct one.

## The fourth thing: the test needs a decoy

```ts
// This passes whether or not the policy works.
it('cannot read another tenant', async () => {
  const rows = await asTenant(A).select().from(t).where(eq(t.id, someIdInB));
  expect(rows).toHaveLength(0);
});
```

If tenant B is **empty**, the assertion is satisfied by the fixture, not by the policy. It
would keep passing after someone dropped the policy entirely.

**Populate tenant B with real rows**, then assert that tenant A sees none of them. That is
the only version of this test that can fail.

## Also

**404, never 403**, for another tenant's resource. A 403 confirms the id exists, which is a
free enumeration oracle.
