# Plan: F-182 — The Wardrobe owns Outfit and Shopping; the Profile owns Measure and Export

| | |
|---|---|
| **Feature** | F-182 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-26 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

The last four of F-179's eight orphans.

**The Wardrobe** offered adding a garment and nothing to do with the garments after that —
FR-33's outfit builder and FR-52's shopping check both sat on routes nothing navigated to. A
tab could fill up and never be used.

**The Profile** opened straight into setup and offered nothing else. FR-49's measurement
readouts and **FR-58's export** were unreachable.

Export is the one that matters most, and it is not a matter of polish: the on-device privacy
claim (NFR-12) is only meaningful if a person can act on it, and **a right somebody cannot find
is a right they do not have.**

## Approach

Nothing is built, again. Four routes, four finished screens, props already in the shape every
destination here uses.

**Both of the Wardrobe's controls are drawn only when there is a wardrobe.** That is the rule
the persistent add-garment control already follows, for the reason F-139 wrote down: offering to
build an outfit from nothing leads to an empty screen, and `/wardrobe/outfit` already renders
nothing without a profile. Two dead ends where the honest answer is not to offer yet.

**The Profile's two sit beside Settings**, at the top, because a person looking for their data
is looking at the top of the screen they were told holds it.

## Files to touch

```
apps/mobile/src/i18n/{en,ja}.ts             — four keys
apps/mobile/src/screens/Wardrobe.tsx        — onOpenOutfit, onOpenShopping
apps/mobile/src/screens/ProfileSetup.tsx    — onOpenMeasure, onOpenExport
apps/mobile/app/(tabs)/wardrobe/index.tsx   — supplies the two
apps/mobile/app/(tabs)/profile/index.tsx    — supplies the two
apps/mobile/test/screens.test.tsx           — both subjects render them
.harness/verification/unreachable-routes.json — the last four expire; the list empties
```

## Test plan

- **Reachability:** orphans 4 → **0**, reachable 13 → **17 of 17**, and the declaration list
  **empties**. Every one of the four must be reported dead the moment its wiring lands — the
  direction that keeps the list honest.
- **Conformance:** the Wardrobe subject with a NON-EMPTY wardrobe renders both new controls,
  which matters because they are drawn only when there is one; the empty subject correctly shows
  neither, so this is the only place they are checked.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · reachability · build`.
Not run: `cvd`, `color-golden`, `content`.

## Risks

- **Four secondary buttons in a column, again.** Same shape as F-181's three and the same note:
  right for now, and F-203's sweep should revisit it once the card system exists.
- **`/wardrobe/outfit` renders nothing without a profile.** Reaching it and finding an empty
  screen is a worse first impression than not reaching it — but the screen already says why, and
  hiding a route until a precondition is met is how the eight orphans happened in the first
  place. Offered, with its own refusal intact.

## Out of scope

Anything inside the four screens.
