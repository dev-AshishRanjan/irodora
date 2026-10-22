# E-214 — One ranking for the Lab and the colour page

**Link:** `rankForSlot` (`apps/mobile/src/outfit/builder.ts`) → `regenerate` (the Outfit Lab),
`wearableCombinations` (`apps/mobile/src/detail.ts`), the colour page, `NO_EVIDENCE_PROFILE`
**Guard:** `outfit-builder.test` unchanged; `detail.test` (the page's order against `scoreOutfit` worked
by hand, ties by id, a second top never offered, a type with no slot excluded) **Severity:** medium
**Feature:** F-247

---

## Why B changes when A does

`06`'s *Wearable Combinations* are the person's own garments that go best with this colour **as a top**
(ADR-0148). Rather than a second scoring loop, the page uses the Lab's: `rankForSlot` was extracted from
`regenerate` with no change to what it returns, and both now call it — the Lab with the locked pieces as
the chosen ones, the colour page with the colour as the one chosen top.

So any change to the ranking moves both surfaces at once:

- the tie-break (higher overall, then garment id);
- whether the chosen pieces are scored with the candidate (they are: FR-33's *with those trousers*);
- the words that place a garment type in a slot (`SLOT_WORDS`).

On the colour page nothing would look wrong. It prints the order and **no score** (E-101: without a
profile the fit weighs nothing, so a figure would be a claim the engine did not make), so a re-ordering
is invisible except to the person who expected a different garment first.

## What it does not guard

- **That the order is a good one.** That is the engine's and its rule set's.
- **Garments the slot words do not know** — an unrecognised type is never offered, by design; the
  second empty card (*Nothing to Pair Yet*) is what a person sees when that leaves nothing.

Related: [[one-coverage-context-for-the-pill-and-the-dial]], [[a-zero-confidence-profile-still-reports-a-perfect-fit]].
