# Plan: F-123 — The investment signal, once somebody has decided what it means

| | |
|---|---|
| **Feature** | F-123 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-52 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-02 |

---

## Intent

FR-52 names four things; F-052 built three. The fourth — *investment signal* — appears once in
the PRD and is defined nowhere, so **criterion 1 is a decision before it is code.**

Done: [ADR-0082](../../docs/adr/0082-the-investment-signal-is-two-numbers-from-your-own-wardrobe-and-no-verdict.md)
defines it, `shoppingCheck` returns it, and the Shopping screen shows it beside the three answers
F-052 built.

## The decision, in one paragraph

The signal is **`breakEvenWears` and `typicalWears`, both medians over the person's own
comparable garments, with no verdict.** *"56 wears to cost what your coats cost you. Your coats
average 35."* It asserts nothing about the future — which is what separates it from the
projection FR-46 forbids, whose denominator nobody chose. Full reasoning, five rejected
alternatives and the honest downside in the ADR.

## Approach

**Comparables** are the garments the person owns whose type matches the candidate's (trimmed,
case-folded — `findDuplicates`' own `normalise`), whose currency matches, and for which
`costPerWear` returns `known`.

**Reused:**

| Piece | Where |
|---|---|
| `costPerWear` — a garment's rate, and the four ways there is not one | `apps/mobile/src/wardrobe/cost.ts` (F-051) |
| `costEntry` — a typed price, refusing what it cannot record | same |
| `minorToMajor` — a stored price back into a field | same (F-122) |
| `shoppingCheck` — the three answers this joins | `apps/mobile/src/wardrobe/shopping.ts` (F-052) |
| the category normalisation | `packages/optimization` — matched, not imported (it is not exported) |

**New:** `apps/mobile/src/wardrobe/investment.ts` — pure, and the only place this is decided:

```ts
export type InvestmentUnknown = 'noPrice' | 'noComparable' | 'tooFew';
export type InvestmentSignal =
  | { known: true; breakEvenWears: number; typicalWears: number;
      comparableCount: number; medianMinorPerWear: number; currency: string }
  | { known: false; reason: 'tooFew'; have: number; need: number }
  | { known: false; reason: 'noPrice' | 'noComparable' };
export const MINIMUM_COMPARABLES = 3;
export function investmentSignal(candidate, wardrobe): InvestmentSignal;
```

Three decisions carried from the ADR:

1. **`neverWorn` is not a reason here.** `costPerWear` already refuses a garment with no wears,
   so an unworn garment is simply not a comparable — the zero-division trap is handled by code
   that is already tested for it, rather than re-derived.
2. **`tooFew` carries `have` and `need`.** The ADR's own "revisit when" is measured on this, and
   it turns a dead end into an instruction on the screen.
3. **Exact, not rounded.** The screen rounds, and rounds **up** — 65.4 wears is not reached at
   65. Same boundary discipline as `formatMinor`.

**Increments:**

| # | Step | Verified by |
|---|---|---|
| 1 | ADR-0082 + its index row | `state` |
| 2 | `investment.ts` + `test/investment.test.ts` | `test` |
| 3 | `ShoppingCandidate` gains a price; `shoppingCheck` returns the signal | `test`, `typecheck` |
| 4 | i18n (en + ja), font subset; the Shopping screen's price fields and the two lines | `typecheck`, `test:content` |
| 5 | registry subjects for the known and refused branches | `a11y`, `contrast` |

## Files to touch

```
docs/adr/0082-…-and-no-verdict.md          — NEW. Criterion 1
docs/adr/README.md                          — its index row
apps/mobile/src/wardrobe/investment.ts      — NEW. The medians and the refusals
apps/mobile/test/investment.test.ts         — NEW. With decoys
apps/mobile/src/wardrobe/shopping.ts        — a price on the candidate, a fourth answer
apps/mobile/test/shopping.test.ts           — the fourth answer, and the three unchanged
apps/mobile/src/screens/Shopping.tsx        — price + currency fields, the two lines
apps/mobile/src/i18n/{en,ja}.ts             — the copy
apps/mobile/assets/fonts/*                  — regenerated if new kanji appear
apps/mobile/test/screens.test.tsx           — registry subjects
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-052** the currency exponent is not stored beside the price | A **fourth** consumer, and the first that *divides* two prices. Both operands must be in one currency — there are no exchange rates and inventing one is the estimate FR-46 forbids | the pinned exponent table, plus a mixed-currency test case |
| **E-016** `en.ts` → `ja.ts` and every render site | New keys for the two lines and the three refusals | **`gate:typecheck`**, plus `i18n.test.ts` |
| **E-017** Japanese copy → the bundled font subset | New ja strings. It has fired on every feature that writes Japanese | **`script:verify-font-coverage.mjs`**, regenerated before any gate is declared |
| `ShoppingCheck`'s shape | A fourth field. Every existing consumer keeps compiling; the screen must render it or `i18n.test.ts` fails on an unrendered key | `gate:typecheck`, `test` |

**No new effect link.** Nothing shared moves; this composes F-051's function over a list.

## Test plan

- **The median:** odd and even counts; a wardrobe whose insertion order is not sorted, or the
  assertion passes for a function returning the first element.
- **The refusals discriminate.** For each there is a neighbouring case that must NOT refuse —
  a candidate with a price but no comparables, three comparables where one is unworn (→ `tooFew`
  at 2, not a silent divide), and exactly `MINIMUM_COMPARABLES` (→ known).
- **The decoys, and these are the feature:**
  - **A garment of a different type must not count.** A wardrobe of coats and one jumper rates
    a type-filtering and a non-filtering implementation identically unless the jumper's rate
    differs enough to move the median — so the fixture makes it differ.
  - **A garment in another currency must not count.** Dividing GBP by JPY type-checks and
    produces a number.
  - **An unworn garment must not count**, and must not divide by zero.
  - **`typicalWears` is the median of the COMPARABLES, not of the wardrobe.**
- **Mutation, not inspection:** each of the above run as an actual edit to `investment.ts`,
  with the suite required to go red. A decoy that is not broken proves nothing.
- **Screens:** registry subjects for the known branch and for `tooFew`, so both meet gates 8
  and 9 in both themes.
- **Not applicable:** `color-golden`, `cvd` — no colour maths. `e2e` — gate 7, pending F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content
pnpm test:a11y && pnpm test:contrast
pnpm build
```

**Will not run:** `e2e` (gate 7, F-091), `color-golden`, `cvd`, `perf`.

## Risks and open questions

- **No `OQ-*`.** The ADR closes the definitional question; it does not need one.
- **The signal will refuse often**, and most for new users — stated as the ADR's `Bad`
  consequence rather than hidden. The `tooFew` count is a mitigation, not a fix.
- **A median over three is a weak statistic.** Defensible only because the alternative is an
  invented constant and because it is shown beside its own basis.

## Out of scope

- **A price comparison fallback** for wardrobes with one or two comparables. Named in the ADR
  as the likely successor and explicitly not built here — it is a second signal, and building
  it now would mean shipping the fallback before there is evidence the threshold is wrong.
- **Recording the check.** F-052 refused a `shopping_check` table and the reason has not changed.
- **Any verdict.** Refused in the ADR, on the record.
