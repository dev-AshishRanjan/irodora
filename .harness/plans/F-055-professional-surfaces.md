# Plan: F-055 — Professional surfaces: Lab/LCh, ΔE00 tables, batch compare

| | |
|---|---|
| **Feature** | F-055 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-28, FR-61 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

Somebody with a colorimeter has numbers, not swatches. They want to type an L\*a\*b\* reading
in, put it beside a reference library, and read a ΔE00 table — with the space each value
arrived in named next to it, because the same quantity computed in a different space is a
different claim.

Done, to a user: choose a reference, type measurements from an instrument, and get a sorted
table of differences that says what was measured, in what space, against what version of what
library. **No verdict, no tolerance we invented, and no entitlement check** — FR-61 is explicit
that this is available to everyone, because there is nobody to charge.

## Approach

**A typed L\*a\*b\* triple is already a first-class colour in this codebase.** `fromSpace('lab',
[l, a, b], provenance)` routes through `labToXyz` and records `originSpace: 'lab'`, and
`source: 'reference'` is exactly what FR-28 asks the resulting profile to be marked. So the
whole of criterion 2 is one engine call with a validated input, and the work is the validation,
the table, and the surface.

**Reused:**

| Piece | The call that already does it | Where |
|---|---|---|
| A typed Lab/LCh triple → a `Color` with provenance | `fromSpace(space, triple, { source: 'reference', confidence: 1 })` | `@irodora/color-core` |
| ΔE00 between two colours | `deltaE00` | `@irodora/color-difference` |
| The pairwise metric set, if a row is opened | `compare` | `apps/mobile/src/compare.ts` (F-019) |
| Lab and LCh of a published entry | `derived.lab`, `derived.lch` — **as published** | the corpus bundle |
| Saved palettes as named subsets of the corpus | `listPalettes`, `resolveSlugs` | `@irodora/store`, `apps/mobile/src/corpus` |
| Tabular numerals | `<Text numeric>` | `@irodora/ui` |

**New:**

`apps/mobile/src/measure.ts`:

```ts
export type EntrySpace = 'lab' | 'lch';
export type MeasurementProblem = 'blank' | 'notANumber' | 'outOfRange';
export type ParsedMeasurement =
  | { ok: true;  color: Color; components: Triple; space: EntrySpace }
  | { ok: false; problem: MeasurementProblem; field: 0 | 1 | 2 };

export function parseMeasurement(space: EntrySpace, fields: readonly [string, string, string]): ParsedMeasurement;
export function batchCompare(reference: Color, samples: readonly Sample[]): readonly BatchRow[];
```

Five decisions:

1. **`source: 'reference'`, and that is FR-28's word, not a convenience.** The claims lint binds
   language to provenance — only `reference` and `calibrated` may appear near "measured"
   (F-025, NFR-21) — so this is the one path in the app where a typed number is allowed to be
   called a measurement. It earns it: an instrument produced it. A hex somebody typed stays
   `declared`, and `unsafeFromHex` is not touched.
2. **The origin space travels with the value and is shown.** FR-61: *"with the space each was
   computed in named beside it"*. `fromSpace` records `originSpace`, so the screen reads it
   rather than assuming, and a corpus entry (`oklch`) and a colorimeter reading (`lab`) are
   visibly different things in the same table.
3. **Out-of-range is refused, and the field is named.** L\* outside [0, 100] is not a
   measurement, and neither is a chroma below zero. The refusal says *which* of the three
   fields, because "invalid input" on a three-field form is the message that makes somebody
   retype all three.
4. **No tolerance, and no pass/fail.** A calibration table that colours rows green and red
   needs a threshold, and any threshold we picked would be ours rather than the standard the
   professional works to. The table reports ΔE00 and sorts by it; the judgement is theirs.
   Same reasoning as F-052's *"three measurements and no verdict"*.
5. **Nothing is stored.** A batch is a session, not a record. `saved_color` exists and this
   deliberately does not write to it — a measurement worth keeping is a palette, which is
   Palette Studio's job and a deliberate act.

**Increments** — each leaves typecheck, lint and test green:

| # | Step | Verified by |
|---|---|---|
| 1 | `measure.ts`: `parseMeasurement` and its refusals | `test` |
| 2 | `measure.ts`: `batchCompare` and the row ordering | `test` |
| 3 | i18n keys in both catalogues; font subset regenerated | `typecheck` (E-016), `test:content` (E-017) |
| 4 | `Measure.tsx`, its route, a Home entry, registry subjects | `test`, `a11y`, `contrast` |

## Files to touch

```
apps/mobile/src/measure.ts               — NEW. Entry parsing, the batch table
apps/mobile/test/measure.test.ts         — NEW. Every branch, with decoys
apps/mobile/src/screens/Measure.tsx      — NEW. The surface
apps/mobile/app/measure.tsx              — NEW. The route: repository, corpus, palettes
apps/mobile/src/screens/Home.tsx         — one entry
apps/mobile/app/index.tsx                — its route push
apps/mobile/src/i18n/en.ts               — the screen's copy
apps/mobile/src/i18n/ja.ts               — the same keys, in Japanese script
apps/mobile/test/screens.test.tsx        — registry subjects for the screen's branches
apps/mobile/assets/fonts/*               — regenerated if step 3 introduces a new kanji
.harness/state/feature_list.json         — status, notes
.harness/state/progress.md               — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **ADR-0005 / the claims lint** | This is the first surface where a typed value is marked `reference`. Get it wrong and the app can legitimately print "measured" next to a number somebody guessed | **`lint`** — `verify-claims.mjs`; plus a test asserting the provenance of a parsed measurement by value |
| **E-016** `i18n/en.ts` → `ja.ts` | Adds keys | **`gate:typecheck`**, plus `i18n.test.ts` |
| **E-017** Japanese copy → font subset | New ja strings. It has fired on both features today | **`script:verify-font-coverage.mjs`**, regenerated in step 3 |
| **E-053** engine keys → catalogue | **Not touched.** Nothing here renders an engine `messageKey` | its test, unchanged |
| `compare.ts` | **Not changed.** It takes two `PublishedEntry` values and this needs two `Color`s, so `batchCompare` computes ΔE00 directly rather than widening a function F-019 owns | — |

**No effect link is warranted.** One new mobile module, one new screen, no shared contract
moves. If `batchCompare` ever needs to agree with `compare()` on a shared number, that is when
one is owed.

## Test plan

- **Unit — `parseMeasurement`:**
  - a valid Lab triple produces a `Color` whose `provenance.source` is `reference` and whose
    `originSpace` is `lab`, asserted **by value**;
  - the same for LCh, with `originSpace: 'lch'`;
  - the XYZ it produces equals `labToXyz` of the same triple — asserted against the engine call,
    so an inlined conversion here fails.
- **Negative, with decoys:**
  - blank, non-numeric and out-of-range each refuse **and name the field**. The decoy is the
    valid triple, which must still parse — a parser that refused everything would satisfy all
    three refusals.
  - `L* = 100` and `L* = 0` are **accepted** — the bounds are inclusive, and an exclusive
    comparison is the off-by-one that silently rejects white and black.
  - a negative chroma is refused; a hue of `360` is accepted and equals `0`.
- **Unit — `batchCompare`:**
  - rows are ordered by ΔE00 ascending, ties broken by id so the order is total (`sort` is
    stable, so without a tie-break the order is the input's, which is the caller's);
  - the ΔE00 of a sample against itself is 0;
  - each row carries the sample's own origin space, not the reference's — **the decoy is a
    batch mixing a corpus entry (`oklch`) with a typed reading (`lab`)**, which is the only
    fixture where "carries its own" and "carries the reference's" differ.
- **Screens:** registry subjects for the empty state, a table with rows, and a refused entry —
  three visually disjoint branches.
- **Golden / color-golden / cvd:** not applicable. No new colour maths: the conversion is
  `fromSpace`'s and the difference is `deltaE00`'s, each with its own golden coverage.
- **E2E:** in this feature's verification list and **cannot run** — gate 7 is pending on F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content
pnpm test:a11y && pnpm test:contrast
pnpm build
```

Evidence: state-gate check count, mobile test count before and after, and every decoy observed
failing the mutation it was written for — **including a fixture check**, because two of five
mutations survived F-054's suite until the fixtures stopped being uniform
[[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].

**Will not run:** `e2e` (gate 7, F-091), `perf`, `color-golden`, `cvd`, `artifact`.

## Risks and open questions

- **No `OQ-*` is attached to F-055.** Criterion 3's *"calibration workflow"* reads, in a
  professional-surfaces context, as the instrument-and-table workflow this feature builds:
  measure known patches with your own colorimeter, enter them, read the differences against a
  reference library. **It is not F-053's camera calibration**, which needs a physical reference
  card and is blocked on OQ-3 — that one is about correcting a *camera*, and nothing here
  touches one. Stated explicitly because the two words are the same.
- **Lab bounds are a convention, not a law.** L\* is defined on [0, 100]; a\* and b\* have no
  formal bound, so the range refused is a sanity bound (±128) and is named as one. A real
  instrument will not produce a value outside it, and a typo will.
- **The reference libraries are the corpus and the device's saved palettes.** Industry libraries
  are licensed content this product does not have, and shipping a "Pantone" list we made up
  would be the worst kind of provenance failure.

## Out of scope

- **Importing a custom palette from a file.** FR-28's second clause; the file-format half of it
  is F-056 (exports, which owns the ASE and design-token formats), and an importer written
  before its exporter has no format to agree with.
- **Camera calibration and the reference card.** F-053, blocked on OQ-3. See above.
- **A tolerance, a pass/fail column, or a verdict.** Not ours to set.
- **Persisting a batch.** A session, not a record.
- **Any entitlement check.** FR-61 says available to every user *because none exists*; adding a
  gate here would be inventing a tier this product does not have (ADR-0051).
