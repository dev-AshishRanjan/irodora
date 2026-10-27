# E-226 — One pair's temperature is one measure on two pages

**Link:** `packages/recommendation/src/outfit-score.ts#warmCoolRelation` → `scoreOutfit`'s harmony
component (07, 13, the Lab) and `compare.ts`'s `temperature` (08's contrast line); F-349
**Guard:** `outfit-score.test` (the no-change oracle over the fixture outfits; equality with the harmony
component for every ordered corpus pair; decoys: a warm pair and a warm–cool pair differ, a single colour
has no spread) **Severity:** medium **Feature:** F-249

---

## Why B changes when A does

The warm–cool relation was private inside the outfit harmony component. `08` prints a pair's relation
in 07's words, so F-249 exported the component's own measure and made `harmony` delegate to it. Two
definitions would have let 07 and 08 word one pair two ways; one definition means a change to the
measure moves both pages — and `scoreOutfit`, whose harmony score, its direction and its evidence must
not move by accident.

## What the test holds

- `scoreOutfit`'s harmony is what it was before the export, against the old formula kept in the test as
  an oracle, over the fixture outfits.
- `warmCoolRelation` of a pair and `scoreOutfit`'s harmony for that pair agree for all 14,280 ordered
  corpus pairs, and all three relations occur, so a constant cannot pass.

## What it does not guard

- **A preference table.** `scoreOutfit` lifts or lowers harmony by a person's history (FR-37);
  `warmCoolRelation` has none, and neither 07 nor 08 passes one.
- **F-349**, which replaces the words with a geometric relation where one applies, on both pages.
