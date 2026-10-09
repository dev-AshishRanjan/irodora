# E-189 — The mono is a bundled face, at 27's width

**Link:** `ui/Text#Face` + `'mono'` → `Chip`'s mono badge, `WorkingState`'s steps, the tabular reading
in `testing/tree.ts`, the font subset
**Guard:** `text-face.test` · `badges.test` · `verify-font-coverage` · `generate-font-subset --check`
**Severity:** low **Feature:** F-236

---

## Why B changes when A does

ADR-0130: 27's steps advance 0.69 of their cap. The platform monos advance 0.84–0.86, and the second
step's copy would overflow its card. Inconsolata's width axis reaches the drawing at wdth 83, wght 600,
cut and bundled. A string set in the mono must be inside the subset. A step in another face changes the
card's width budget.
