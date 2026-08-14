---
kind: lesson
title: Mutual assignability is not shape equality — an optional field slips through both directions
created: 2026-08-14
feature: F-002
scope: [packages/contracts, packages/color-core]
links: [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]], [[a-gate-that-errors-is-failing-open]]
---

# Mutual assignability does not catch an optional field

Pinning two types together with assignability in both directions looks airtight:

```ts
expectTypeOf<A>().toExtend<B>();
expectTypeOf<B>().toExtend<A>();
```

It is not. **Add an optional property to either side and both assertions still pass.**

```ts
type A = { source: string; capturedAt?: string };
type B = { source: string; capturedAt?: string; device?: string };
// A extends B  ✓   (device is optional, absence is fine)
// B extends A  ✓   (extra properties are fine in type-level assignability)
```

Removing an optional property slips through the same hole, in the same way.

## Why it matters here

This was the check meant to stop `@irodora/contracts` and `@irodora/color-core` drifting
apart — two definitions of one shape, permitted only because NFR-3 forbids the colour engine
a Zod dependency ([ADR-0036](../../../docs/adr/0036-wire-schema-and-engine-type-pinned-by-the-compiler.md)).
Adding a field is the most common drift there is. The guard would have shipped documented as
catching it, and would not have.

**It was found by deliberately breaking the schema and watching typecheck stay green** — the
[testing rules](../../rules/common/testing.md) discipline of proving a test can fail, applied
to a compile-time assertion. Reading the assertion would not have found it; it reads as
exhaustive.

## The fix

Assert the key set separately. `keyof` includes optional keys, and unions compare exactly:

```ts
expectTypeOf<keyof A>().toEqualTypeOf<keyof B>();   // catches added/removed/renamed
expectTypeOf<A>().toExtend<B>();                    // catches retyped, and optionality changes
expectTypeOf<B>().toExtend<A>();
```

`toEqualTypeOf` on the whole object is the obvious alternative and does not work: Zod infers
mutable properties where the engine declares `readonly` ones, so it fails permanently for a
difference with no wire meaning. Someone will eventually try to simplify these three lines
into one. Both simplifications are wrong, and one of them — collapsing to the mutual pair —
fails silently, which is worse.

## The general shape

**A check that is weaker than its description is more dangerous than no check**, because the
description is what the next person relies on. The same pattern appears in
[[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]] (a lint rule that parsed but
did not enforce) and [[a-gate-that-errors-is-failing-open]].

The habit that catches all three: **write the violation, run the check, watch it go red.**
For a type-level assertion that means editing the type and running `tsc` — not reading it and
concluding it looks right.
