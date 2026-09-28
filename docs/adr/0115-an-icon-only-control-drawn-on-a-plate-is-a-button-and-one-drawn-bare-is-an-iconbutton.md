# ADR-0115 — An icon-only control drawn on a plate is a `Button`, and one drawn bare is an `IconButton`

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Feature** | F-232 |
| **Builds on** | ADR-0062 (HeroUI behind `@irodora/ui`), ADR-0110 (the icons as drawn) |

---

## Context

F-228 made `IconButton` the named, weighted glyph in a tap target, and on purpose it draws **no
container**: the square and circular plates board `00` draws were left to F-232. F-228 said so
because choosing a plate then would have imposed one answer before anyone read the board.

The inventories record every icon-only control as a `ui:Button` with an `icon`, and no copy on the
element or on any child. **There are thirty:**

- **Fifteen are drawn on a plate**, which is a `bg` or `border` token on the element:
  - twelve on `00`, each on a `level2` plate;
  - three on `13` (`13.slots.slot-*.lock`), each on a `border.subtle` plate.
- **Fifteen are drawn bare**, with no token at all. Examples: `06.share`, `09.search.clear`,
  `16.tray.previous`.

F-232's plan counted "71 (30 plated, 41 plateless)". That total included every `ui:Button` with an
icon, labelled ones too. The rule is about icon-only controls, and there are thirty.

**Plate radii, measured with `corner.ps1` and its baseline-corrected fit:**
- **Each column's first row on `00`** fits r 3–5.5 px on a 33–37 px plate, which is `sm`.
- **Column 3's second row** fits r 12.5–15.5 px on a 34 px plate, which is a circle.

So the board draws both a square and a circular form. The plan had them as the same control.

## Decision

1. **A `ui:Button` with an `icon`, no copy on itself or on any child, and a `bg` or `border` token is
   Button's icon-only form.**
   - The plate is the pressable. It takes the press scale, the hit area is measured from it (ADR-0114),
     and it gives one announcement.
   - The plate's paint and radius come from the element's tokens: `level2` with `sm`, `level2` with
     `pill`, or `border.subtle` with `sm`.
2. **The same element with no plate token is an `IconButton`:** the glyph alone, as F-228 built it.
3. **A plate's geometry with no paint is neither.** For example, a `radius` token without `bg` or
   `border`. The classifier names such an element as ambiguous rather than guessing. None is drawn
   today. The test's decoy is one.
4. **The rule is written into `inventory.schema.json`'s `component` description**, and a test
   classifies all thirty elements, pinning the fifteen and fifteen.

## Consequences

**Good.**
- **One pressable, one name.** Wrapping an `IconButton` in a plate `View` would have given two
  nested surfaces. Only one of them presses, and the plate would sit outside the press scale.
- **Nothing is chosen by taste:** which form a control takes is read off the inventory, and the
  numbers are pinned by a test.
- `IconButton` keeps its F-228 contract unchanged, so the fifteen bare controls already built on it
  do not move.

**Bad.**
- **`Button` gains a third shape** (labelled, labelled with a leading icon from F-234, and icon-only),
  so its prop surface grows. The icon-only form must refuse a label child, or it would be a
  labelled button with a plate.
- **The accessible name is still the caller's.** The type requires it, as `IconButton` does. A
  plated control announced by a wrong name is as bad as an unnamed one, and nothing here checks the
  wording.
- **The rule reads tokens, so a mis-recorded token picks the wrong component.** A plate recorded
  without its `bg` would build as a bare glyph. `verify-mockups` cannot see that. Only a person
  comparing the screen with its mockup would (F-221, F-267).

## Alternatives considered

- **`IconButton` with an optional plate prop.** Rejected. It would reverse F-228's decision that
  `IconButton` draws no container. It would also put two visual contracts behind one name, and the
  fifteen bare controls would then have a prop that must stay unset.
- **A new `PlateButton` component.** Rejected. A plated icon control IS a button: it takes Button's
  press feedback, its disabled and loading states and its owned accessibility. A fourth control
  would copy all of that.
- **Deciding per screen.** Rejected. Thirty controls across nine images would get thirty
  decisions, and the rule would be argued again every time.
