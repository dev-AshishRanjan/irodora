# E-232 — A slider row is found by its parts' ids

**Link:** `packages/ui/src/controls.tsx#Slider` (the row form, part ids, `valueName`, `name`) → `09`'s Finder and its sweep locators
**Guard:** `slider.test` (order, ids only with a testID, the stacked form unchanged, the spoken value, the thumb's name); the `09.screen` sweep's chroma-value decoy **Severity:** medium **Feature:** F-250

---

## Why ids

`09` draws each slider on one row — label, track, value — where every earlier slider drew its header
above the track. The sweep finds `09.sliders.*.label`, `.track` and `.value` as elements, and the
value's words are the engine's, so they are found by the row's own ids rather than by a text that
changes with the point.

## What it does not guard

- **Gesture arbitration on Android** between the slider and the list it sits in, and a screen reader's
  step over C's 401 values: both attested on the device (criterion 5).
