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

## F-240's review (S2): the section as 15 draws it

The heading is drawn above the card, in body at 500, its line box meeting the card's edge, and the
card holds the pills alone, inset `sm`: the four insets 15 draws (11.5, 10, 12 and 10.5 dp) have a
median of 11, nearer 8 than 16. The first build copied F-239's form, with the heading in the card's
header at 400 and the card padded `md`; the plan's fidelity table said otherwise. F-239's section 3
still has that form, and F-262 moves it, with the measurements in its notes.
