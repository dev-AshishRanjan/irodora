---
kind: effect
id: E-046
title: A join is a private encoding until somebody splits it, and then it is a contract no type describes
severity: high
created: 2026-09-01
scope: [packages/optimization]
links: [[nine-symbols-became-public-api-by-crossing-a-package-boundary]], [[the-phrase-lexicon-has-two-readers-now-and-they-fail-differently]]
---

# E-046 — a join is a private encoding until somebody splits it

F-048 built `Coverage.combinations` as a `ReadonlySet<string>` — sorted garment ids joined on
`|`:

```ts
const key = (ids: readonly string[]): string => [...ids].sort().join('|');
```

**The join was an implementation detail.** `applyChange` only ever compares and subtracts whole
keys, so it never has to know what is inside one. The set could have held opaque handles.

F-050 splits them. `solveCapsule` reads the set as its problem instance and does
`c.split('|')` to recover the ids, and a private encoding became a **contract between two
modules** the moment a second reader parsed it. Nothing in the type system says so: both sides
see `string`.

## The loud failure and the silent one

Change the separator, or drop the sort, and parsing breaks in a way the capsule tests catch at
once — their fixtures build keys with the same join, and the brute-force oracle disagrees
immediately. That is the good case.

**The silent failure is a garment id that contains a `|`.** The key still parses — into the
wrong number of wrong ids. The solver optimises over garments that do not exist and returns a
capsule naming them, with an outfit count that is internally consistent and wrong. No gate here
can see that, because every value involved is a perfectly good `string`.

## Why this is not a live defect

Garment ids are UUIDv7 from `@irodora/store` and slot-index strings in fixtures. Neither can
contain the separator.

It is recorded because **the constraint now exists and is written down nowhere else**. The day
an id becomes user-supplied — a slug, a name somebody types, an imported identifier from
another system — this is the link that says why that is not free.

## The fix, if it ever binds

Not escaping the separator, which moves the problem rather than removing it. **Carry the
combination as the ids it already is**, rather than a string that has to be taken apart again.

That is a change to F-048's public type and it is deliberately *not* made now: there is no
defect to fix yet, and rewriting a type to satisfy a hypothetical is how a small file becomes a
large one. The link is the cheaper half of the trade — it costs nothing today and it is the
thing a future session would otherwise have to rediscover by debugging.

## Guard

`gate:test` catches every change to the *encoding*. Nothing catches a change to what an **id**
is allowed to contain, and that is the half worth remembering.
