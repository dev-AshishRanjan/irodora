# E-196 — 15's section 2 is ChoiceGroup's pill form

**Link:** `ChoiceGroup`'s `pills` form → `Preferences` section 2 → F-262
**Guard:** the `ChoiceGroup (pills, 15)` subject · `pill-selection.test` (23 dp, the xs gap) ·
`preferences-vision.test` (the height from 15's inventory with the chosen box as decoy; order;
chosen pill; presses; the route) **Severity:** medium **Feature:** F-240

---

## Why B changes when A does

The four CVD pills are one radio group in ChoiceGroup's pill form, at the height `15` draws: 23 dp,
the median of its three unchosen pills (the chosen box is taller by its edge). The screen takes the
mode and its chooser as props; the route reads `useVision()`. F-262 composes the rest of `15` around
it and builds `15.cvd.badge`, which this section does not.
