---
kind: lesson
title: A column nothing writes makes its own feature unfalsifiable
category: convention
confidence: 0.9
created: 2026-09-01
scope: [packages/store, apps/mobile]
links: [[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]], [[a-tested-module-nobody-wired-up-passes-every-test-it-has]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# A column nothing writes makes its own feature unfalsifiable

`garment.wear_count` has been `INTEGER NOT NULL DEFAULT 0 CHECK (wear_count >= 0)` since
F-042's migration 4. `cost_minor` and `currency` have been beside it just as long. When F-051
came to implement FR-46 — *cost per wear* — **nothing in the application had ever written any
of the three.**

So the division had a denominator that could only ever be zero, and two operands that could
only ever be null. A cost-per-wear module built and tested against that schema would have
passed every test it had, on every garment that could exist, by returning *unknown* forever.

## Why it is the mirror of the generated-value lesson, and worse

[[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]] is about a
value that is produced and never read. This is a value that is **read and never produced** —
and it is harder to see, because the read side looks flawless:

- the column exists, with a constraint;
- the repository maps it, in both directions;
- `GarmentEnrichment` accepts it;
- a unit test of the computation passes on fixtures that set it.

**The fixtures are the tell.** Every test set `wearCount` to a number the application could not
produce. A suite written entirely against hand-made rows cannot distinguish a feature that
works from one whose inputs are unreachable, because the fixture *is* the missing writer.

## The question to ask, and when

Before planning any feature that computes over stored data:

> **Which code path writes each column I am about to read, and has it ever run?**

If the answer for a column is *"the schema allows it"*, the write path is part of this feature,
not a precondition of it. Discovering that during implementation is survivable; discovering it
after the feature is closed means shipping a computation whose acceptance criterion — *"absent
data yields unknown"* — is satisfied vacuously, forever, and looks correct on screen.

For F-051 that meant three deliverables rather than one: the division, an entry field for the
price, and the control that records a wear. Any one of them alone is inert.

## Where else to look right now

| Column | Written by | Read by |
|---|---|---|
| `garment.purchase_date` | **nothing** | nothing |
| `garment.material`, `formality`, `pattern` | **nothing** | `slotFor` reads `type` only |
| `garment.name` | **nothing** | `OutfitBuilder`, falling back to `type` |

Each is a nullable column the schema permits, the repository maps, and no screen fills. None is
a defect on its own — F-039 is explicit that enrichment is progressive — but each is a feature
that will discover this same gap on the day it is claimed. **The cost is not the column; it is
the plan that assumed the data was there.**

## The habit until there is a check

`a11y-scope.mjs` computes a consumer closure for components — every component is either used by
a screen or registered, and anything outside fails. There is no equivalent closure for *store
columns*, in either direction. Until there is, a plan that reads a column names the write path
in its **Reused** table, and if that cell would be empty, the write path goes in **New**.
