# E-218 — The combination is the engine's four pieces, scored once

**Link:** `wearCombination` (`apps/mobile/src/wear.ts`) → `Wear.tsx`, `scoreOutfit`, `compare()`,
`recommendForSlot` for the outer layer **Guard:** `wear.test` (every colour's slots filled; rankings equal
the engine's under the occasion's weighting; the outer layer is `recommendForSlot` for a second top; the
card's figures are `scoreOutfit`'s; contrast is `compare()`'s smaller |Lc|, with the decoy that the two
directions differ; no fit without a profile) **Severity:** high **Feature:** F-248

---

## Why B changes when A does

Everything `07` says about the outfit comes from one call: the four pieces — the colour in hand, the
trousers, the shoes and the outer layer as each slot shows them — scored once by `scoreOutfit`, and the
top measured against the trousers by `compare()`. The screen formats; it computes nothing.

Three failures would each reach the card with every render green:

- **A fit figure without a profile.** The no-evidence profile scores, so a figure exists; ADR-0150 says
  none is drawn, and `fit` is `null` here, not at the screen.
- **The outer layer through `recommendOutfit`.** It refuses to recommend a second top — rightly, for
  *"what goes with this"* — so a slot ranked through it comes back empty. The outer layer is ranked as a
  top by `recommendForSlot` directly (ADR-0151 D2).
- **The contrast pair.** It is the top against the trousers, the outfit's two largest areas, and the
  smaller magnitude of APCA's two directions, so the figure never overstates (rule 11).

## One colour once (F-248's review, S1)

Each slot is ranked against the colour in hand alone, so the three rankings share their first. The
first build showed each ranking's first, and so showed one colour in all three slots — for all 120
colours, under every occasion — while every test passed, because every fixture had the same defect and
none asked whether the four were different. The CVD row then read 0% and the export refused the
duplicate. `placeSlots` places the slots in one pass, and `wear.test` now asks the question directly,
for every colour, occasion and profile.

## What it does not guard

- **That the four pieces are a good outfit.** That is the engine's claim, with its rationales.
- **The layout.** `wear-fidelity.test` and `wear-states.test` hold how the figures are drawn.

Related: [[a-zero-confidence-profile-still-reports-a-perfect-fit]],
[[a-pill-is-warmer-than-the-colour-beside-it-or-it-is-false]].
