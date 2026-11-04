# E-241 — One record, one way to say it is not shown exactly

**Link:** `detail.ts#renderNote` → `06`'s readout, `19`'s anchor and rows
**Guard:** `goes-with.test`, `goes-with-states.test`, `detail.test` **Severity:** medium **Feature:** F-252

---

## The shape

- The one record outside sRGB (*fuka-mizu*, `renderDeltaE00` 0.309) says *nearest sRGB rendering,
  ΔE00 0.31* wherever its sample is drawn: 06's hex row, and on 19 after the anchor's OKLCh line or a
  row's figure.
- In Japanese the note is Japanese words, set in the bundled face.

## What it does not guard

- A second record leaving sRGB in a later corpus: the census in `goes-with.test` pins one, and fails.
