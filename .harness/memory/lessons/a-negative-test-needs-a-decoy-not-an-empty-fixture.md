---
kind: lesson
title: A negative test needs a decoy, not an empty fixture
category: convention
confidence: 1.0
created: 2026-08-13
scope: [tests, packages]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-gate-that-errors-is-failing-open]]
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

## The variant where the fixture is fine and the FILTER is empty (F-124)

Same trap, one step earlier. The assertion compares two derived sets:

```ts
const declared = MESSAGE_KEYS.filter((k) => k.startsWith('outfit.') && k.split('.').length === 3);
expect([...declared].sort()).toEqual([...OUTFIT_MESSAGE_KEYS].sort());
```

The data is real and populated. **But if the filter ever matches nothing and the engine ever
emits nothing, `[] === []` and the check passes forever** — and the filter is the fragile half,
because it encodes a naming convention nobody enforces.

The obvious `startsWith('outfit.')` is wrong here for a reason worth remembering: **sixteen
ordinary screen keys share that prefix** — `outfit.title`, `outfit.overall`, `outfit.perWear`.
Only the segment count separates the engine's keys from the screen's copy.

**The fix is to assert the partition, not just the comparison:**

```ts
expect(screenCopy.length).toBeGreaterThan(0);
expect(engineKeys.length).toBeGreaterThan(0);
expect(screenCopy.length + engineKeys.length).toBe(outfitKeys.length);
```

Both sides non-empty, and nothing lost between them. A namespace prefix shared by two sources is
**not** a partition, and a `filter` in an assertion deserves the same suspicion as an empty
fixture.

## The general form

> **Prove your test can fail.** Break the thing it guards and watch it go red.
>
> A green assertion that cannot go red is worse than no test: it occupies the space where a
> real check would go, and it reports success forever.
