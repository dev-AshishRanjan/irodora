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

## F-236's review (2026-10-09)

- **It fails closed (M1).** A poor reading that names no failed check is the engine's class and
  its failures disagreeing. `refusalOf` throws rather than open the sheet, and the test pins it.
- **F-201's poor-capture line is unreachable.** `against.poorCapture` printed a warning above the
  distance to a target. A poor capture is now refused before the sheet opens, so the line cannot
  show. It is left to F-245, which rebuilds that block for 04, rather than removed from F-201's
  tested code inside F-236.
