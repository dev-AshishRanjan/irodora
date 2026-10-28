# E-232 — A slider row is found by its parts' ids

**Link:** `packages/ui/src/controls.tsx#Slider` (the row form, part ids, `valueName`, `name`) → `09`'s Finder and its sweep locators
**Guard:** `slider.test` (order, ids only with a testID, the stacked form unchanged, the spoken value, the thumb's name); the `09.screen` sweep's chroma-value decoy **Severity:** medium **Feature:** F-250

---

## Why ids

`09` draws each slider on one row — label, track, value — where every earlier slider drew its header
above the track. The sweep finds `09.sliders.*.label` by its catalogue words, and `.track` and
`.value` by the row's own ids: the value's words are the engine's and change with the point, so no
text could find them. The row is top-aligned with its track in a box one label line tall, so a value
that wraps never moves the thumb (F-250's review, S4); `slider.test` holds that too.

## What it does not guard

- **Gesture arbitration on Android** between the slider and the list it sits in, and a screen reader's
  step over C's 401 values: both attested on the device (criterion 5).
