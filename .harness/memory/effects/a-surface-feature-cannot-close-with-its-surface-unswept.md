# E-203 — A surface feature cannot close with its surface unswept

**Link:** `feature_list.json` (each feature's `status` and `mockups`) → `verify-mockups`'s surface
rule, `.harness/verification/inventory-surfaces.json`, the inventory sweep in `screens.test`
**Guard:** `verify-mockups` in `lint` and its `--prove` (four planted cases); `screens.test`'s
renders equal the table's enrolled list **Severity:** medium **Feature:** F-221

---

## Why B changes when A does

F-221 enrolls in the inventory sweep only the surfaces whose features are done: 14's splash and 27's
four cards. Every other surface waits on the features that build it, those whose `mockups` names
its mockup and that wait on F-221 (F-242 to F-263). The day all of a surface's builders are done, it
must be enrolled, or the release's structural evidence is short with nothing saying so.

So a status change in the feature list can turn `lint` red, and a feature's `mockups` field decides
which surfaces it owes.

## Why it is a lint script and not the test

The first draft read the feature list from `screens.test`. `verify-cache-scope` refused it: a cached
test keyed on the feature list would re-run on every state edit, and one not keyed on it would stay
green after the list changed. The table both read is a small data file, declared to turbo.

## What it does not do

It does not decide whether an enrolled surface looks right: that is the capture, beside its mockup,
and a person (ADR-0134).

## F-242 (2026-10-20): the first screen enrolled

`01.screen` is the first whole screen in the sweep: Home over the tab bar its layout puts under it,
in both themes and both languages, all 44 elements found by what they draw. Seventeen needed a locator
of their own (the cards by `home.*` ids, the hero's names and figures and the count by the screen's
own functions, the tab bar's active indicator by the id `TabBar` now gives it, and the tab words by
`tab.*`, which the inventory read as `tabs.*`). `25.screen` stays not whole: its layout is `01`'s, swept
as `01.screen` in Washi as well as Sumi.
