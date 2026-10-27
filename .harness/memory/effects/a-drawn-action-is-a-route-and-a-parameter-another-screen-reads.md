# E-227 — A drawn action is a route and a parameter another screen reads

**Link:** `apps/mobile/app/(tabs)/atlas/compare.tsx` (08's back, glyph, *Export Precision Delta PDF* and
*Add Pair to Palette Studio*) → `/atlas`, `/profile/export` (`pair`, `format`), `/atlas/palettes`
(`colours`), `exportSubjectFor`, `palette.ts#draftOf`; F-251, F-263
**Guard:** `compare-states.test` (each handler's own body holds its target; decoys: a back that only pops,
swapped targets, `format=pdf` on the glyph); `export-subject.test` (the pair subject for every corpus
entry, in all six formats, with its ΔE00 row; a colour twice is refused); `palette.test` (`draftOf`: the
anchor then a neutral, an unknown slug no draft); `verify-route-targets` **Severity:** medium
**Feature:** F-249

---

## Why B changes when A does

Each of `08`'s actions leaves the page for another screen and hands it the pair in a query parameter:
the export reads `pair` and `format`, the Studio reads `colours`. Those screens are rebuilt by later
features (`18` by F-263, `10` and `16` by F-251). A rebuild that renames a route or stops reading a
parameter breaks `08`'s actions with nothing on `08` failing, because the page only calls a handler —
and the route is where the handler is wired.

## What the test holds

- The route's own source: each handler's body names its target and carries the pair.
- The export: `exportSubjectFor` prefers `pair` over `colours` over a slug over the latest palette, and
  writes the pair's two colours and their ΔE00 in every format, the PDF included; a pair of one colour
  twice is refused rather than written.
- The Studio: `draftOf` gives A as the anchor and B as a neutral, and nothing for a slug the corpus does
  not hold.

## What it does not guard

- **The device.** That the PDF opens chosen and the Studio opens unsaved on a phone is the attested half
  of criterion 5.
