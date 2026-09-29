# E-163 — A sample renamed in the inventory must be renamed in the scans

**Link:** the inventories' component names and bindings → `illustrations.test`'s
`SAMPLE_COMPONENTS` and the sample family's default tests **Guard:** `sample-family.test.tsx`,
`cards.test.tsx`, `fabric-swatch.test.tsx`, `illustrations.test.tsx` **Severity:** medium
**Feature:** F-233

---

## Why B changes when A does

The sample family's defaults are counted off the inventories: a square sample is the median of the
29 square `ui:Swatch` elements (60 dp), the keyline is drawn by 35 of 64, a card is `md` on 56 of
87, a strip `md` on 4 of 5, and the fabric's teeth are 12's `raw` readings. Re-record an element
under another name, add one, or change a binding, and a count moves — the tests fail on purpose.

`illustrations.test` finds samples by name, so a sample re-recorded under a name the list lacks
stops being scanned, silently. F-233 renamed five elements and moved every list in the same change.

Related: [[a-controls-default-size-is-a-median-of-the-drawings]].
