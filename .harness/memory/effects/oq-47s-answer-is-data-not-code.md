# E-167 — OQ-47's answer is data, not code

**Link:** `mockups/inventory/01.json` (its tab elements and `raw.filled`) → `TABS[].activeGlyph` and
every `TAB_*` constant **Guard:** `apps/mobile/test/tab-bar.test.tsx`,
`packages/ui/test/tab-bar.test.tsx` **Severity:** medium **Feature:** F-234

---

## Why B changes when A does

`01` draws only Home active, its glyph filled. What an active Atlas, Lens, Wardrobe or Profile tab
draws is OQ-47, a person's. Until it is answered each keeps the outline `01` gives it. The shape is
recorded as `raw.filled` in the inventory and read into `TABS[].activeGlyph`, and a test holds the
two together — so the answer is an inventory edit and a registry edit, and the test fails until both
are made.

Every number the bar draws — its content height, the space under the labels, the side inset, the
indicator, the glyph size and where the glyph and word sit — is recomputed from `01.json` in
`@irodora/ui`'s `tab-bar.test`. Re-measure `01` and the bar moves.

Related: [[a-controls-default-size-is-a-median-of-the-drawings]]
