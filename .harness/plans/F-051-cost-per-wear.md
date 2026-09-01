# Plan: F-051 — Cost-per-wear

| | |
|---|---|
| **Feature** | F-051 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-46 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

A garment you paid for and have worn eleven times has a cost per wear. One you paid for and
have never worn does not — and neither does one whose price nobody recorded. **The feature is
as much the second sentence as the first.**

To a user, done looks like: the price goes in when the garment does; wearing an outfit is one
tap; and the number that appears afterwards is either a real division or an explicit *we do
not know, and here is which half is missing*. Never a plausible-looking estimate.

## Approach

`cost_minor`, `currency` and `wear_count` have existed on `garment` since F-042 and **nothing
has ever written the first two or incremented the third**. So FR-46 is three small things: a
division that refuses to guess, a way for a cost to arrive, and a way for a wear to be
recorded. Take any one away and the other two are inert.

**Reused:**

| What | Where | Why it is not rebuilt |
|---|---|---|
| `cost_minor`, `currency`, `wear_count` columns | `packages/store/src/schema.ts` migration 4 | Already correct, including `CHECK (wear_count >= 0)` and the INTEGER-minor-units decision. **No migration in this feature.** |
| `GarmentEnrichment` | `packages/store/src/repository.ts` | Already carries `costMinor`, `currency`, `wearCount`, and already distinguishes `undefined` (leave) from `null` (clear). A wear is an enrichment patch; nothing new is needed on the store contract. |
| `WardrobeStore` | `apps/mobile/src/wardrobe.ts` | The narrow screen-side port — `enrichGarment` and `listGarments` are exactly the two calls recording a wear needs. A screen taking `Repository` could not be rendered by jest. |
| `draftProblem` shape | `apps/mobile/src/wardrobe.ts` | *Return the reason, not a boolean.* Reused verbatim as the shape of both `costPerWear` and the cost-entry check — a disabled control or an absent number with no stated reason is the accessibility failure that looks like polish. |
| `TextField`, `Button`, `Text numeric`, `Surface` | `@irodora/ui` | An interactive control written inside a screen is checked by nothing [[an-interactive-control-inside-a-screen-is-checked-by-nothing]]. `Text numeric` already carries tabular numerals, which is what a column of money needs. |
| `useMessages` / `MessageKey` | `apps/mobile/src/i18n` | Every new string is a key in both catalogues; the compiler is the completeness guard (E-016, ADR-0056). |

**New:**

`apps/mobile/src/wardrobe/cost.ts` — one module, four exports, no React and no store:

```ts
type CostPerWear =
  | { readonly known: true;  readonly minorPerWear: number; readonly currency: string;
      readonly costMinor: number; readonly wearCount: number }
  | { readonly known: false; readonly reason: 'noCost' | 'noCurrency' | 'neverWorn' };

costPerWear(g: CostInputs): CostPerWear          // the division, or which half is missing
wearRecorded(g: WearInputs): GarmentEnrichment   // { wearCount: g.wearCount + 1 }
costEntry(amount: string, code: string): CostEntry   // typed text → minor units + code, or why not
minorUnitDigits(code: string): number            // ISO 4217 exponent
```

Four decisions inside it, each of which could have gone the invented-estimate way:

1. **`minorPerWear` is not rounded.** `costMinor / wearCount` is left exact and the *screen*
   decides how to render it. Rounding in the computation would bake a display choice into a
   value other callers (F-052's investment signal) will read.
2. **A cost with no currency is `unknown`, not a bare number.** The division is arithmetically
   fine; showing `1250` with no unit is a measurement with no units, which this repository
   already refuses elsewhere (`COVERAGE_THRESHOLD` is exported for exactly that reason). The
   store permits the combination, so the computation must have a name for it.
3. **`wearCount === 0` is `neverWorn`, never `Infinity` and never `costMinor`.** Dividing by
   zero yields `Infinity` in JavaScript silently; treating an unworn garment as costing its
   full price *per wear* would be an invented estimate with a straight face.
4. **Minor units need the currency's exponent, so the exponent is data, not an assumption.**
   `45.50` is 4550 minor units in GBP and `150` is 150 minor units in JPY. Assuming 2 makes
   every yen price a hundred times too large, and it is the kind of wrong that looks right in
   a test written by the same person. ISO 4217's non-2 exponents are a short cited table.

**Increments** — each leaves typecheck, lint and test green:

| # | Step | Verified by |
|---|---|---|
| 1 | `cost.ts`: `costPerWear` + `wearRecorded`, with `apps/mobile/test/cost.test.ts` | `pnpm test` — the module is pure, so every branch is reachable without rendering |
| 2 | `cost.ts`: `minorUnitDigits` + `costEntry`, with its own tests including the JPY/GBP decoy | `pnpm test` |
| 3 | i18n keys in `en.ts` and `ja.ts`; font subset regenerated if new kanji appear | `typecheck` (E-016), `pnpm test:content` (E-017) |
| 4 | `AddGarment`: cost and currency fields in the existing optional section | `test`, `a11y`, `contrast` |
| 5 | `OutfitBuilder`: cost-per-wear per placed garment + the *wore this* control | `test`, `a11y`, `contrast` |

## Files to touch

```
apps/mobile/src/wardrobe/cost.ts          — NEW. The division, the wear patch, the money parse
apps/mobile/test/cost.test.ts             — NEW. Every branch, with decoys
apps/mobile/src/screens/AddGarment.tsx    — two fields in the existing optional Surface
apps/mobile/src/screens/OutfitBuilder.tsx — the per-garment line and the wore-this control;
                                            gains a WardrobeStore prop, so the wardrobe it
                                            renders becomes state seeded from the prop
apps/mobile/app/outfit.tsx                — passes the repository it already holds
apps/mobile/src/i18n/en.ts                — new keys (source of MessageKey)
apps/mobile/src/i18n/ja.ts                — the same keys, in Japanese script
apps/mobile/test/screens.test.tsx         — the two OutfitBuilder subjects gain the new prop
apps/mobile/assets/fonts/*                — regenerated ONLY if step 3 introduces a new kanji
.harness/state/feature_list.json          — status, notes
.harness/state/progress.md                — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-016** `apps/mobile/src/i18n/en.ts` → `ja.ts`, every render site | Adds keys. `ja.ts` is `Record<MessageKey, string>`, so omitting one is a compile error | **`gate:typecheck`** — already blocking. Plus `apps/mobile/test/i18n.test.ts`, which asserts Japanese *script* in every prose value, so an English string pasted into `ja.ts` fails |
| **E-017** Japanese copy → bundled Noto Sans JP subset | New ja strings may introduce a codepoint the subset lacks → tofu, on the audience whose judgement matters most | **`script:verify-font-coverage.mjs`** via `pnpm test:content`. F-045's lesson applied in the same change rather than recorded a second time: regenerate the subset in step 3, not after gate 11 goes red |
| **E-023** `packages/store/src/schema.ts#MIGRATIONS` | **Not touched.** Every column this feature needs exists in migration 4. Named here so the absence is a decision: a `wear_log` table would let us answer *when* something was worn, and no criterion asks | n/a — the guard would be `gate:test`, and there is nothing to guard |
| `OutfitBuilder`'s props (not an effect link — a local contract) | `screens.test.tsx` constructs it twice and `app/outfit.tsx` once. A required new prop is a compile error at all three | **`gate:typecheck`**, and `screens.test.tsx` renders both subjects in both themes |

**No new effect link is warranted.** `costPerWear` is a leaf: nothing else in the repository
computes cost per wear, and F-052's investment signal will *import* this rather than repeat it
— which is the E-008 rule applied to a non-colour computation. If F-052 reimplements it, that
is the moment a link is owed.

## Test plan

- **Unit:** `costPerWear` across the full cross-product of {cost present, absent} ×
  {currency present, absent} × {wears 0, 1, n} — twelve cases, each asserting the
  discriminant *and* the reason. `wearRecorded` asserts the patch is exactly `{ wearCount:
  n + 1 }` and carries no other key, because a patch that also wrote `costMinor: null` would
  clear a price on every wear and nothing else would notice.
- **Money parse:** `costEntry('45.50', 'GBP')` → 4550; `costEntry('150', 'JPY')` → 150;
  `costEntry('1.500', 'KWD')` → 1500. The **decoy** is JPY: a table that returned 2 for every
  code passes the GBP case and fails only this one, which is why it is asserted by value and
  not by "it parses".
- **Negative, with decoys rather than empty fixtures:**
  - `costPerWear({ costMinor: 4550, currency: 'GBP', wearCount: 0 })` must be `neverWorn` —
    the decoy is that the same garment with `wearCount: 1` returns `known`, so the assertion
    is discriminating rather than a function that always refuses.
  - A garment with `costMinor: 0` and wears is **known, at zero** — a gift is not missing
    data, and `costMinor ?? 0`-style falsiness would report it as `noCost`. This is the case a
    `if (!costMinor)` implementation fails and every other test passes.
  - `costEntry('', 'GBP')` and `costEntry('45.50', 'GB')` both refuse with a reason.
  - `minorPerWear` is never `Infinity` and never `NaN` — asserted directly, because both are
    numbers that render as a plausible-looking word rather than crashing.
- **Screens:** the two new `AddGarment` fields and the `OutfitBuilder` line are rendered by
  `screens.test.tsx`'s existing conformance suite (both themes, both locales, tap targets,
  accessible names, status adjacency).
- **Golden / conformance / cvd / color-golden:** **not applicable.** There is no colour maths
  here — this is integer division and a table — and adding a golden dataset for a division
  would be theatre.
- **E2E:** not in this feature's verification list, and gate 7 is still pending on F-091.

## Verification

```
node scripts/verify-state.mjs          # gate 0 — the feature's own list: state
pnpm typecheck                         # E-016's guard
pnpm lint
pnpm format:check
pnpm test                              # gate 4 — the feature's own list: test
pnpm test:content                      # E-017's guard, because step 3 touches ja.ts
pnpm test:a11y                         # runs over every screen; two are changed
pnpm test:contrast                     # same
pnpm build
```

Evidence to capture: the state gate's check count, the mobile test count before and after,
and the two mutation results from the decoy list above (a `!costMinor` implementation and a
fixed exponent of 2), because a decoy that is not observed failing proves nothing
[[a-decoy-that-is-not-broken-proves-nothing]].

**Not run, and it will be said so:** `e2e` (gate 7, pending F-091), `perf`, `color-golden`,
`cvd`, `artifact`.

## Risks and open questions

- **No `OQ-*` is attached to F-051 and none is opened by it.**
- **The exponent table is a claim about the world.** It is ISO 4217's, cited in the module,
  and covers the currencies whose exponent is not 2. A code the table does not list falls to
  2 — which is the standard's own default and is stated in the code rather than assumed.
  A code that is not a currency at all is refused by shape (three ASCII letters), and the
  module **does not claim to validate membership**: asserting `ZZZ` is not a currency would
  need the full list, and a wrong claim about that is worse than no claim.
- **`enrichGarment` is a read-modify-write for `wearCount`.** The count is read from the row
  the screen is holding and written back as `n + 1`. On a single-writer device with one JS
  thread this is safe; it would not be under sync. Named here so the next person meets it as
  a known property rather than a bug — and `wearRecorded` taking the count as an argument is
  what makes an atomic `UPDATE ... SET wear_count = wear_count + 1` a one-line change to the
  store later, rather than a redesign.
- **`OutfitBuilder` holding the wardrobe in state** means it stops reflecting a prop change
  after mount. The route recomputes `listGarments()` on every render and has no other trigger,
  and `AddGarment` already does exactly this with its count, so the pattern is the screen's
  existing one rather than a new one.

## Out of scope

- **A wardrobe browse surface.** FR-41 has no screen, and building one here would be a second
  feature wearing this one's id. The cost-per-wear line therefore appears where garments
  already appear — beside a placed garment in the outfit builder.
- **A wear *log*.** `wear_count` is a counter. *When* something was worn is a different
  question with a different table, and no criterion asks it.
- **Currency conversion, symbols, or locale-aware money formatting.** The code is displayed
  (`GBP`, `JPY`), which is unambiguous and needs no table of symbols. A symbol would be a
  second claim about a currency for no gain.
- **The investment signal** — that is FR-52 and F-052, which will import this.
- **Editing cost after creation**, for the same reason as the browse surface: there is no
  screen on which a saved garment is opened.
