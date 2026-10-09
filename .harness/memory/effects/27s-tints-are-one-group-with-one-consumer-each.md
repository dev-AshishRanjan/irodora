# E-188 — 27's tints are one group, with one consumer each

**Link:** the manifest's `state.*` group (`state.hanger`, `state.mark`, `state.refused.plate`,
`.edge`, `.glyph`, `state.lock`) → `MARK_TINT`, the hanger, the refused plate, the padlock
**Guard:** `c10-exceptions.test` · `cvd/mark.test` · `brand.test` · the single-consumer scans in
`states.test` and `state-tints.test` **Severity:** medium **Feature:** F-236

---

## Why B changes when A does

The six are decoration minted for 27 (ADR-0128 §4), the same in every palette, read from 27's
pictures. Each has exactly one consumer, and the scans name a second. A tint used elsewhere becomes
a vocabulary colour nobody chose. A moved value moves 27's pictures and, for `state.mark`, the mark's
CVD pair on `surface.1`.
