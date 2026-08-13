---
kind: lesson
title: A negative test needs a decoy, not an empty fixture
category: convention
confidence: 1.0
created: 2026-08-13
scope: [apps/api, tests]
links: [[a-new-user-data-table-needs-tenancy-and-a-decoy-test]], [[a-gate-that-errors-is-failing-open]]
---

# A negative test needs a decoy

**"X cannot see Y" is not tested by asserting that X sees nothing when Y does not exist.**

```ts
// Passes whether or not the policy works.
const rows = await asTenant(A).select().from(garment).where(eq(garment.id, idInB));
expect(rows).toHaveLength(0);
```

If tenant B is empty, the assertion is satisfied by the **fixture**, not by the policy. The
test would keep passing after someone dropped the RLS policy entirely.

## The fix

**Populate the thing that must not be visible**, then assert it is not.

```ts
const decoy = await seedGarment({ tenant: B, name: 'decoy' });
const rows = await asTenant(A).select().from(garment).where(eq(garment.id, decoy.id));
expect(rows).toHaveLength(0);
```

Now removing the policy makes the test fail, which is the only property that matters.

## Where this applies beyond tenancy

- **Redaction** — assert that a log sink receives *nothing* while an image is genuinely in
  scope, not while the code path is unreachable.
- **Entitlements** — the user must genuinely lack the entitlement and the feature must
  genuinely exist.
- **Rate limits** — the requests must actually be sent.
- **Conformance suites** — every suite includes at least one case verified to fail against a
  deliberately broken adapter. A conformance case that cannot fail launders every adapter
  through it.
- **Content validation** — the gate must be shown failing on a deliberately incomplete entry.

## The general form

> **Prove your test can fail.** Break the thing it guards and watch it go red.
>
> A green assertion that cannot go red is worse than no test: it occupies the space where a
> real check would go, and it reports success forever.
