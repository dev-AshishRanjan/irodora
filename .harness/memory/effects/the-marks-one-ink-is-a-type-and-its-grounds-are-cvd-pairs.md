# E-172 — The mark's one ink is a type, and its grounds are CVD pairs

**Link:** `brand.tsx#MARK_INKS` → F-236's tint, F-243's capture mark, the manifest's `cvdPairs` and
C10 exception **Guard:** the type refusal and achromatic check in `brand.test`;
`mark-census.test.ts`; `cvd/mark.test.ts` **Severity:** medium **Feature:** F-230

---

## Why B changes when A does

ADR-0122 makes the mark one neutral ink, and BRAND §7 disqualifies a mark that depends on colour to
be recognisable. Two changes run through `MARK_INKS`:

- **A tint.** F-236 adds 27's loading tint when it mints it. That is the one C10 exception, and
  `mark-census.test.ts` holds the count at exactly one.
- **A new ground.** A mark is only as separable as the ground under it. Gate 10 scores the pairs
  `cvdPairs` declares, and only those, so `cvd/mark.test.ts` derives every placement from the
  inventories and requires its (ink, ground). 02's capture button (F-243) draws the mark in
  `accent.foreground` on `accent`; that ink equals `inverse.foreground` in every palette, and
  F-243 adds it to `MARK_INKS` if it draws with that token.

## The decoy that makes it a gate

ADR-0093's red and green petals, as a pair, score 54.8 under deutan against a minimum of 60. So the
check can fail for a coloured mark: the icon ADR-0122 superseded would not have passed it.

## F-236 (2026-10-09)

27's tint is minted: `MARK_TINT` is `state.mark`, the one chromatic `MarkInk`, part of the C10 group
E-188 describes. Its ground, `surface.1`, is a declared CVD pair, and the census's one exception reads it.
