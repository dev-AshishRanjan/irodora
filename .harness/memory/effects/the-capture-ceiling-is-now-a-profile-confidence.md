---
kind: effect
title: A capture ceiling used to describe one swatch; it now weights a person's recommendations
category: contract
confidence: 0.85
created: 2026-08-25
scope: [apps/mobile]
links: [[a-declared-pair-of-slugs-is-a-claim-about-published-values]], [[provenance-in-the-type-is-what-makes-honesty-structural]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# E-031 — `cappedConfidence` grew a second audience, and the type did not change

**`apps/mobile/src/lens/reading.ts#cappedConfidence` → `profile/photo.ts` · `ProfileSetup.tsx`**

## What changed about a number that did not change

F-040 defined a reading's confidence as the **minimum** of three ceilings — the capture space,
the illumination, the quality. Its audience was one swatch on one screen: a person looked at a
colour and a sentence beside it said how much to trust it.

F-027 made that number the **ceiling on seven profile dimensions**, and F-028 will weight
recommendations by those dimensions. The same float now decides how much authority a person's
whole colour profile carries.

Nothing about the type moved. `confidence: number` in `[0, 1]`, same field, same signature,
same call site. **`typecheck` is green through the entire change**, in both directions.

## The three inputs, and the distance from the edit to the consequence

```
SPACE_CONFIDENCE_CEILING.unknown   ─┐
assessIllumination(...).ceiling    ─┼─ min ─→ reading.confidence ─→ every profile dimension
assessQuality(...).ceiling         ─┘
```

Two of those three live in `@irodora/color-sampling`, a package away. Somebody tuning an
illumination ceiling because a garment scan felt pessimistic is, without being told, changing
how much a personal profile influences an outfit recommendation.

## The guard, and the half that is easy to leave out

`test/profile.test.ts` asserts a poor reading produces a less confident estimate — **and that a
good one produces the ceiling**. Both halves, in the same test, because "the cap is applied" and
"the value is a constant" are indistinguishable from the first assertion alone
[[a-decoy-that-is-not-broken-proves-nothing]].

## What the guard does not cover

**Whether the ceilings are the right numbers.** They are conventions (NFR-2), declared as such
in their own doc comments, and F-063's device lab is what would replace them with measurements.
The same is true of `PHOTO_CEILING` — 0.5 is a bound chosen because NFR-23's validation has not
run, not a result. A test can check that a bound is applied; only a study can check that it is
the right bound.
