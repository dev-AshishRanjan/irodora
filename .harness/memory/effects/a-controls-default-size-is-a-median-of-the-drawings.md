# E-157 — A control's default size is a median of the drawings

**Link:** `mockups/inventory` → the control defaults in `@irodora/ui`
**Guard:** the recompute tests (button-forms, pill-selection, badges, segmented-choice, switch,
slider) **Severity:** medium **Feature:** F-232

---

## Why B changes when A does

Board `00` has no scale (`dpPerPx: null`), so it gives proportions but no dp. A control's default
drawn size therefore comes from the screens (P3).

**From screens:** the median over every element of its kind drawn on a scaled screen, snapped to
half a dp.
- `BUTTON_HEIGHT` 32: labelled pills.
- `CHIP_HEIGHT` 21.5: interactive pill chips.
- `BADGE_HEIGHT` 21: static chips.
- `SELECTION_DOT` 6.5: the drawn selection dots.
- `SEGMENTED_HEIGHT` 30.5 and `SEGMENT_INSET` 2.5: the six segmented rows.

**From the one screen that draws the control:**
- `SWITCH_TRACK` and `SWITCH_THUMB`: `15`.
- `SLIDER_TRACK` and `SLIDER_THUMB`: `09`.

**From 00's own ratios, where no screen draws the control:**
- `ICON_PLATE` 30: the plate-to-pill ratio times `BUTTON_HEIGHT`.
- `GLYPH_IN_PLATE` 0.65: calibrated on the camera, whose width on the icon grid is known exactly.

Re-record an element and a default can move. The tests recompute each one from the inventories and
fail on a mismatch, so a constant cannot quietly agree with a drawing nobody has any more. That is
ADR-0113's caption rule, applied to controls.

## What to know before touching one

- A default is only what an unsized caller gets. Surfaces pass their element's own `dp`.
- `raw.trackPx`, `raw.thumbPx` and `raw.glyphPx` are image-px readings kept on the element so a
  test can recompute from them. Change one and its test tells you which default moved.
- Readings come off JPEGs: about ±0.5 dp for sizes, and ΔE00 ≈ 2 for colours.

Related: [[an-inventory-is-the-structure-a-surface-is-built-from]],
[[the-target-is-the-hit-area-and-the-rule-adds-it-back]].
