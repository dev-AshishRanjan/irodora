# E-211 — A superseded element is declared, not counted

**Link:** `supersededFindings` (`apps/mobile/test/inventory.ts`) → the inventory sweep in
`screens.test`, `inventory-surfaces.json`, every inventory's `conflicts`, and the six features that
enroll a C1 surface (F-243, F-250, F-254, F-255, F-262, F-263)
**Guard:** `screens.test` (a declaration counts only where the inventory lists the element under that
conflict; a superseded element is never also located; undeclared, the compass is reported missing)
**Severity:** high **Feature:** F-246

---

## Why B changes when A does

C1 resolves six mockups' four-item tab bars into `01`'s five tabs, so each of those inventories
records tab glyphs that no tab on the built screen draws. The sweep asks *is every recorded element
drawn?*, and a replaced element and a missing one give the same answer to that question.

Counting cannot separate them, and `05` shows why it can be worse than silent: its *search* tab glyph
is "found", because the search field draws a `search` glyph of its own. A different element passes
the count. So a surface declares what a conflict replaces (ADR-0144), and the declaration is held to
the inventory's own `conflicts` list: it can hide only an element listed under the conflict it names.
A declared element is not counted, and giving it a locator as well is a finding.

Every C1 surface's feature declares its own. The evidence block counts them
(`conformance-sweep.json` → `inventory.superseded`), so a growing number is visible.

**Only a conflict that replaces elements can be named** (F-246's review, S3). C1 replaces; C6, C8, C11
and C13 list elements that are kept and drawn a stated way, so a declaration naming one of theirs
would hide an element the build must still draw. `REPLACING_CONFLICTS` is the list, and the type
refuses anything else.

## What it does not guard

- **That the replacement is right.** The replacing elements are asserted by the surface's others —
  `05.tabs` as a `TabBar`, the indicator, the atlas and profile glyphs, the label — not by the
  declaration.
- **A conflict the inventory does not record.** The list is the inventory's; a missing entry there is
  `verify-mockups`' business, not this.

Related: [[the-atlas-field-answers-what-its-placeholder-says]].
