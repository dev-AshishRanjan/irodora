# E-219 — A hand-off the receiving screen forgets opens it empty

**Link:** `outfit/fromWear.ts` → `app/(tabs)/wardrobe/outfit.tsx`, `OutfitBuilder initialDraft`, F-257
**Guard:** `outfit-from-wear.test` (nearest by ΔE00, ties by id, the top locked, an empty slot left empty,
taken once; decoy: a second take is null); `wear-states.test` (the Lab route takes it once, in an
initialiser, and opens with its draft) **Severity:** medium **Feature:** F-248

---

## Why B changes when A does

`07`'s *Save to Outfit Lab* stores nothing (ADR-0152 D5). It leaves the combination in a mailbox and
opens the Lab, and the Lab — taking it once, in a state initialiser, so a re-render cannot hand it back —
opens with the owned garment nearest each colour, the top locked, as `13` draws its outfit opening with
slot 1 locked.

The two ends live in two routes. When F-257 rebuilds the Lab to `13`, a route that no longer takes the
hand-off makes the save open an empty Lab: `07` still offers, the Lab still opens, and nothing fails.
The route-source test names the take; F-257 carries a note.

## What it does not guard

- **The outer layer.** The Lab has three slots; `13`'s fourth row is F-257's, and until it exists the
  outer layer stays on `07`.
- **A device.** The attested check saves and sees the Lab open with the draft.

Related: [[07s-drawn-actions-open-routes-other-features-rebuild]].
