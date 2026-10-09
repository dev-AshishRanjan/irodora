# E-186 — A poor capture is refused, and never reaches the sheet

**Link:** `lens/refusal.ts#refusalOf` → the Lens (`RefusedState` in place of the sheet), the profile and
wardrobe hand-offs, ProfileSetup's photo estimate, F-243, F-244
**Guard:** `lens-refusal.test` (fair, good and excellent not refused) · the Lens screen tests (no
band, conditions or confidence) · the refused subject in the sweep **Severity:** high **Feature:** F-236

---

## Why B changes when A does

D1 (ADR-0128): FR-18 says a poor capture *"blocks a confident claim"*. So the trigger is the engine's
own class, and a poor reading is shown as 27's refused card with retry. The sheet, and everything
reached from it, never sees one. Loosening the trigger puts poor readings back into the hand-offs. A
second trigger anywhere else would refuse a reading the Lens offered.

## For the person comparing (F-267)

This is the largest reading F-236 made: the old screen showed a poor capture at a capped confidence.
It is flagged for comparison by eye. Live readings are not refused.
