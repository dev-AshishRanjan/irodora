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

## F-236's review (2026-10-09): the scans read every form (S4)

The scans matched only `'state.…'`, so `tint="state.hanger"` (a JSX attribute) and
`<Mark color={MARK_TINT} />` passed unseen. They now read either quote form and the symbol.
Ownership is stated as built: the hanger by Illustration (its type) and EmptyState (its consumer),
the mark by brand.tsx (`MARK_TINT`) and WorkingState.
