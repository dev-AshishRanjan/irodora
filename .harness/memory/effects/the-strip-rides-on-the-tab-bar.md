# E-195 — The strip rides on the tab bar

**Link:** `tabBar.tsx#AppTabBar` (`VisionStrip` above `TabBar`) → every route with the bar; the
layout comparisons in F-262, F-264, F-265 and F-267
**Guard:** `vision.test` (on exactly while a mode is on, with decoys; tritan qualified; Japanese) ·
the `screens/VisionStrip` subject · F-145's tab-ownership test **Severity:** medium **Feature:** F-240

---

## Why B changes when A does

The strip is how the preview is labelled on screen (criterion 2; R9 §4 E4). It sits above the tab bar
on every route that has one, and draws nothing in Standard. Move or replace the bar and the label
moves with it. A sheet covers it while open, which ADR-0131 accepts because the sheet is closed in
one gesture and the mode is still on behind it.

## For the comparisons

No mockup draws the strip. A person comparing a route with its mockup while a mode is on sees one
more row above the bar, and that is the E4 departure, not a defect.
