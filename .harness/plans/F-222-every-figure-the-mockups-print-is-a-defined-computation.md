# Plan: F-222 — Every figure the mockups print is a defined computation

| | |
|---|---|
| **Feature** | F-222 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-11, NFR-21, FR-48. Constrained by FR-7 and FR-74 (never a match or identity), FR-29, FR-32, FR-42/43, FR-52 and ADR-0031, ADR-0048, ADR-0072, ADR-0073, ADR-0119 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | packages: `@irodora/color-difference` (engine), `@irodora/optimization`, `@irodora/recommendation`, `@irodora/ui`. Also the app's catalogues, one Lens row and its tests, inventories 03 04 08 09 13 22 23, PRD §10, R9 §4/§8/§11 |
| **Author** | The planner subagent, adopted with the amendments below by the implementing session |
| **Date** | 2026-10-07 |

> **Claims-lint note.** `.harness/plans/*.md` is scanned by `verify-claims.mjs`. Every line below that
> quotes a drawn claim ends in a `claims-ok:` marker with a reason. Keep those markers when editing.

---

## Intent

Seven figures in mockups 03, 04, 08, 13, 22, 23 and 27 have no definition in the product. Four of
them are held by OQ-9. F-222 closes OQ-9 with an ADR and gives every figure one of two things:

- a pure, tested function with a stated formula, or
- a figure the product already defines.

Throughout, no slot is allowed to call anything a match.

**Done, for a person** (once the surface features draw it):

- the Lens reading sheet shows a similarity percentage beside each ΔE00, and the reading's
  confidence in one format that says what the number is;
- the target and compare instruments describe a distance in words taken from one cited table;
- the outfit score says whether the outfit counts toward the wardrobe's valid outfits, and the
  threshold it was counted at;
- the shopping check counts the owned garments a candidate pairs with, and the gaps it fills, region
  by region;
- the profile says how many owned garments sit in the person's supporting band.

**Done, for this feature:** the functions exist with golden, property and decoy tests. ADR-0124 and
ADR-0125 record the decisions. Every `oq:OQ-9` and `derived:F-222` binding in the inventories names a
real computation. The two existing renderings of a provenance confidence use the one format. F-222
builds no screen.

### Reading the acceptance: ambiguities, and the reading chosen

1. **Criterion 1, "each figure in §8 marked OQ-9 or F-222".** §8 marks seven rows: 03 confidence
   format (F-222); 03's percentage (OQ-9); 04 bands (F-222); 13 verdict label (OQ-9); 22 Gaps
   Addressed (F-222); 22 Wardrobe Pairings (OQ-9); 23 Garment Calibration History (OQ-9). The
   inventories also bind two other sets of elements to `derived:F-222`:
   - **08's four readings** (ΔE00, ΔL\*, ΔC\*, ΔH). Criterion 2 names 08, so they are in scope.
   - **09's three slider readings.** These are not in §8, not in F-222's mockup list, and not in any
     criterion. *Reading:* F-222 does not define them. It adds the missing §8 row for 09 and
     re-points the three bindings to `derived:F-250`, with a note on F-250. Leaving them bound to a
     feature that never defines them would be an unrecorded break (golden rule 5).
2. **Criterion 2, "the ΔE00 descriptor bands behind … Slightly Darker".** "Slightly Darker" is a
   lightness-axis reading, not an overall ΔE00 band. *Reading:* one table of bands on the ΔE00
   scale, applied twice: to the overall ΔE00, and to each axis's **weighted CIEDE2000 term**
   (ΔL′/k<sub>L</sub>S<sub>L</sub>, ΔC′/k<sub>C</sub>S<sub>C</sub>, ΔH′/k<sub>H</sub>S<sub>H</sub>).
   These are in ΔE00's own unit, and ADR-0119 already makes them the bars' unit. Banding raw ΔL\* or
   degrees of hue against ΔE00 thresholds would be one table over three different units.
3. **Criterion 3, "used in 03 and 27".** Neither surface is built yet: 03 is F-244 and 27 is F-236.
   *Reading:* F-222 defines the format; makes it the only path, applied to the two places a
   provenance confidence is rendered today — the Lens readout (`Lens.tsx:954`, `toFixed(2)`) and the
   sample's accessible name (`Swatch.tsx:148`, `Math.round`); and adds a guard that refuses a second
   format. The *drawn* uses (03's conditions chip, 27's refused state) are an **attested** entry
   discharged by F-244 and F-236 — the F-223 → F-260 precedent (ADR-0038, ADR-0060 §5).
4. **Criterion 4, "gaps() before and after the candidate".** *Reading:* the regions present in
   `gaps(wardrobe)` and absent from `gaps(wardrobe + candidate)`, counted **by region**, not by name
   and not as a difference of list lengths. Two traps, both live in the published lexicon
   `phrase-lexicon.2026.08.1.json`:
   - **Synonyms.** `gaps()` names one region under several term pairs (`dark` ≡ `暗い`, `light` ≡
     `明るい`, `grey` ≡ `neutral`), so a dark near-neutral top is reported up to four times
     (`coverage.ts:281–313`, lexicon lines 28–96 and 270–290).
   - **New gaps.** Adding a garment can *open* gaps: a first shoe makes top and trouser regions start
     unlocking outfits.

   `before.length − after.length` is wrong in both directions.

---

## Approach

### OQ-9: the decision, per figure

Decided on the person's delegation of 2026-10-05 (R9 §11: *"For all OQ, when needed decide for
yourself. Think, reason and research before deciding. Be professional and enterprise grade."*).
Recorded in **ADR-0124**.

#### 1. 03: the drawn percentage beside each ΔE00

The drawn value is 97% Match, with 92% and 88% on the next two rows. (claims-ok: quotes the drawn construction this plan resolves)

**Decision.** The slot prints the similarity percentage FR-7 already requires:

- the function is `similarityPercent(ΔE00) = 100 × 2^(−ΔE00/10)`, defined in ADR-0048
  (`packages/color-naming/src/similarity.ts:60,73`);
- it already sits on every ranked candidate (`rank.ts:52,93`);
- it is printed as an integer, **floored**, followed by the word *Similar* (ja: 類似度 before the
  figure).

So the row reads *ΔE00 1.18 • 97% Similar*. Only the forbidden word changes; the slot, position, type
and tabular figures stay as drawn.

**Why this one:**

- FR-7's own acceptance text asks for ranked candidates with ΔE00 **and a similarity percentage**. The
  drawn element is exactly that: a percentage beside a ΔE00, in the same style, which is the equal
  weight ADR-0048's *Bad* consequence asks for.
- The word is forced by golden rule 11, by FR-7 (*"never asserts identity — copy is 'closest
  reference'"*), and by the claims lint: the drawn line is in
  `packages/testing/fixtures/claims/drawn.md:21–23`, and gate 2 refuses it.
- Flooring means 100% appears only when ΔE00 is exactly 0. A percentage never rounds up to closeness
  the distance does not have.

**Rejected:** the ΔE00 band word in the slot (it changes a drawn figure into a word, and repeats the
ΔE00 beside it); the reading's confidence (a property of the reading, not of each pair, so three rows
would print the same number); a new similarity scale (a second definition in `packages/color-*`, a
defect); leaving the element out (a defined figure fits it, so rule 14 does not allow that).

#### 2. 13: the overall score's verdict label

The drawn line is Outfit Score: 93 / 100 • Master Harmony. (claims-ok: quotes the drawn construction this plan resolves)

**Decision.** The slot states whether the overall score clears the coverage threshold, with the
threshold stated:

- the predicate is `countsAsOutfit(overall, threshold = COVERAGE_THRESHOLD)`, i.e.
  `overall >= threshold`;
- the threshold is `COVERAGE_THRESHOLD = 60` (`coverage.ts:61`);
- it is the same predicate `coverage()` counts with (`clears`, `coverage.ts:114–127`), refactored so
  both share it.

| case | en | ja |
|---|---|---|
| counts | *Valid Outfit (≥ 60)* | 有効なコーデ（60以上） |
| does not count | *Not Counted (under 60)* | 対象外（60未満） |

The figure in each string comes from the constant, not from the copy. No status colour is used: the
label stays `text.primary` as drawn.

**Why this one:** "Valid outfits" is FR-42's own vocabulary, and 01 prints the count of them, so the
label tells a person whether this outfit is one of those — new, true information. It describes which
side of a published threshold the score sits on; it does not judge the outfit. The
`unreached-tokens.json` `warn` entry says the product is *"deliberately built to describe rather than
judge"*. It passes every verdict pattern in `claims.json` (`verdict-harmony`, `ja-verdict-harmony`);
increment 1 adds it to `near-misses.md` so the claims proof holds it.

**Rejected:** a banding of the overall into quality words (F-219's verdict class; it also lets the
overall stand in for the components, which FR-32 forbids); the outfit's harmony relationship name
(`scoreOutfit`'s harmony component classifies no relationship, `outfit-score.ts:174–180`, and the lint
refuses a relationship name after a score); the weakest component (the five rows below already show
it); the occasion or the rule version; leaving it out.

#### 3. 23: the garment history figure

**Decision.**

- **Detail:** *N garments profiled · X% concordance*. Neither word is forced out. It is computed by
  `profileConcordance(profile, garmentColours, rules)`:
  - each owned garment's colour is scored by FR-29's `scoreColor` (`score.ts:216`);
  - a garment is *concordant* when its score is `>= COMPONENT_SUPPORTS_ABOVE` (66,
    `outfit-score.ts:104`), the score at which the personal-fit component already reads "supports"
    (`outfit-score.ts:139–144`), so no new number is introduced;
  - X is the share, floored;
  - the result is `null`, a refusal rather than 0%, when the wardrobe is empty or the profile brings
    no evidence (every weighted confidence is 0, so `scoreColor` returns `NO_EVIDENCE_SCORE` with
    confidence 0).
- **Title:** **"Calibration" does not ship.** In this product "calibrated" is a provenance level:
  observed against a known target, FR-16 (ADR-0031 §1, ADR-0005). Nothing about garments calibrates a
  profile. One word changes, and the slot and type stay: *Garment Profile History* (ja:
  手持ちの服の照合履歴). A new §4 E2 row, forced by rule 11.
- ja detail: 28着を照合・94%がプロフィールに適合. It avoids 一致, which `ja-percent-match` refuses
  before a figure.

**Why this one:** the only reading of "garments profiled · concordance" the product can compute. It
reuses FR-29 and an existing boundary, and tells a person how much of what they own sits in the band
their profile supports.

**Rejected:** the guided run's agreement (ADR-0072; it repeats the four confidence notes drawn above,
is not about garments, does not exist for a photo-assisted or edited profile, and the trial answers
are not stored); a calibration concordance (an accuracy figure with no device-lab row behind it,
ADR-0031 §3); waiting on a capability (R9 §9) — a defined figure exists.

#### 4. 22: "Wardrobe Pairings · Matches owned garments"

**Decision.**

- **Figure:** `wardrobePairings(after, CANDIDATE_ID).length` — the number of distinct owned garments
  that form at least one valid outfit with the candidate, read from the after-coverage's
  `combinations` (`coverage.ts:96`).
- **Order:** by outfits shared, descending, then by id, so it serves 22's compatibility preview.
- **Detail:** the drawn words stay. This is the clothing sense ("goes with"), backed by the
  valid-outfit threshold; the claims lint already holds this exact line as honest copy
  (`near-misses.md:54`, F-219's fourth evaluation). Nothing forces the words out, so rule 14 keeps
  them.
- **No answer:** `null` when `shoppingCheck.outfits` is null (no slot, or no profile), matching
  `shopping.ts:218–221`.

**Rejected:** the outfits count (already shown); ΔE00-based "compatibility" counts (not what pairs;
the badges are OQ-28).

#### 22 "Gaps Addressed" (criterion 4; §8 marks it F-222)

- **Figure:** `gapsAddressedBy(candidate, wardrobe, lexicon, context).length` — the distinct regions
  `gaps(wardrobe)` reports and `gaps([...wardrobe, candidate])` does not, keyed by slot plus lightness
  range plus chroma range.
- **Detail:** names the first addressed region in published terms; the drawn green is sample content
  (E1).
- 0 is an answer. `null` is the same refusal as for pairings.
- **Stated limit:** `gaps()` only names near-neutral regions (`coverage.ts:255–268`, E-044). A
  hue-bearing gap is not a gap this product names, so a vivid candidate fills 0.

#### The confidence display format (criterion 3; 03, 27)

`provenance.confidence` ∈ [0,1] is *"a bounded quality signal from stated inputs — **not** a
probability"* (`provenance.ts:126`): the minimum of the space, illumination and quality ceilings
(`reading.ts:84–90`).

- the figure is `confidencePercent(c) = ⌊100·c + 1e-9⌋`, an integer; the guard term exists because
  float64 cannot hold most two-decimal confidences (0.57 × 100 = 56.99999999999999); floored so the
  display never exceeds the value;
- the text is `confidenceText(c, word, script)`: latin *95% Confidence*, as 03 draws it; japanese
  信頼度95%;
- **what it means**, in the catalogue as `confidence.meaning`: en *"A ceiling set by the light, the
  capture and the colour space — not the chance that the colour is right."*; ja
  光・撮影の状態・色空間から決まる上限で、色が正しい確率ではありません。

The meaning line is shown on the Lens readout, and is 03's chip accessibility hint (F-244). 27 prints
a confidence only where its refused state states the cap the capture hit (`QUALITY_CEILING.poor` =
0.3); F-236 decides that, and if it prints one, it uses this format.

### ΔE00 descriptor bands (criterion 2): ADR-0125

**One table**, `DELTA_E00_BANDS` in `packages/color-difference/src/bands.ts`. A value belongs to the
highest band whose lower edge it reaches, so each edge belongs to the band above it.

| band id | ΔE00 range | en | ja | anchor (confirmed against the primary source before it is cited) |
|---|---|---|---|---|
| `veryClose` | [0, 0.8) | Very Close | 非常に近い | below the 50:50 % **perceptibility** threshold PT = 0.8 ΔE00 |
| `close` | [0.8, 1.8) | Close | 近い | below the 50:50 % **acceptability** threshold AT = 1.8 ΔE00 |
| `perceptible` | [1.8, 5) | Perceptible Shift | 知覚できる差 | past AT, inside CIEDE2000's small-difference range |
| `clear` | [5, ∞) | Clear Difference | 明らかな差 | past the 0–5 CIELAB-unit magnitude CIEDE2000 was fitted for |

**Sources** (to be verified by the implementer against the primary source where reachable):
Paravina RD, Ghinea R, Herrera LJ et al., *Color difference thresholds in dentistry*, J Esthet Restor
Dent 2015;27(S1):S1–S9, restated as 0.8 / 1.8 ΔE00 in Paravina, Pérez, Ghinea, J Esthet Restor Dent
2019;31(2):103–112; the 0–5 range from CIE 116-1995's reference conditions, carried by CIE 142-2001.

**Why:** these are the only published 50:50 thresholds stated in ΔE00 units. 04 and 08 draw the words
*Very Close* (at 1.42) and *Perceptible Shift* (at 3.42). The table keeps 08's pairing; 04's 1.42
becomes *Close*, because a value is sample content (E1). **Stated limit, for the ADR:** the thresholds
were measured on uniform specimens under controlled viewing. A band describes the **printed number**,
never what a given person will see, and never the garment's true distance.

**Rejected:** Mokrzycki & Tatol's 1 / 2 / 3.5 / 5 bands (ΔE\*ab); the ΔE\*ab JND of 2.3 (the
conflation ADR-0048 refused); textile CIEDE2000(2:1:1) PT 0.62 (different weights from every ΔE00 the
product prints); three bands without PT (implies a 1.5 is imperceptible); no bands (criterion 2).

**The band is read off the printed value:** `deltaE00Band(printedDeltaE00(d))`, where
`printedDeltaE00(d) = Number(d.toFixed(2))` (ADR-0061's display precision), so *ΔE00 0.80* is never
labelled *Very Close*.

**Axis readings:** `axisReading(printedFigure, weightedTerm)` returns
`{ band: deltaE00Band(|weightedTerm|), direction }`, the direction following the **printed figure's**
sign (`more`, `less`, or `level` for 0 or −0; ADR-0119's amendment).

| band | lightness more / less | chroma more / less |
|---|---|---|
| `veryClose` | Slightly Lighter / Slightly Darker | Slightly More Vivid / Slightly Less Vivid |
| `close` | Lighter / Darker | More Vivid / Less Vivid |
| `perceptible` | Noticeably Lighter / Noticeably Darker | Noticeably More Vivid / Noticeably Less Vivid |
| `clear` | Much Lighter / Much Darker | Much More Vivid / Much Less Vivid |

ja: わずかに / (none) / はっきり / かなり, then 明るい / 暗い / 鮮やか / くすんだ. Hue has band phrases
only: Slight Hue Shift · Hue Shift · Noticeable Hue Shift · Large Hue Shift. `level` phrases: No
Lightness Shift · No Chroma Shift · No Hue Shift. 04's hue reading becomes the hue band phrase (the
existing §4 E2 row, FR-74). 08's *Shift towards teal*: F-222 supplies the band phrase; F-249 appends
the phrase lexicon's hue term for B. **No word contains match, identical or same (en), or 一致,
マッチ, 合致 or 同 (ja)** — the test enforces it.

### Reused (file:line)

- `similarityPercent`, `SIMILARITY_HALF_LIFE_DELTA_E` (`color-naming/src/similarity.ts:60,73`);
  `rank.ts:52,93`.
- `deltaE00`'s arithmetic (`color-difference/src/ciede2000.ts:74–155`). **Refactored into a shared
  core, never copied.** A second CIEDE2000 term computation is a defect by definition.
- The Sharma–Wu–Dalal inputs in `golden/ciede2000.golden.json`; `assertGoldenDataset`
  (`packages/testing/src/golden.ts:66`); `test/identity/vectors.ts`.
- `coverage`, `applyChange`, `gaps`, `COVERAGE_THRESHOLD`, `clears`, `Coverage.combinations`
  (`optimization/src/coverage.ts:61,96,114,144,178,274`).
- `scoreOutfit().overall` (`outfit-score.ts:380,424`); `scoreColor` (`score.ts:216`);
  `COMPONENT_SUPPORTS_ABOVE` (`outfit-score.ts:104`); `NO_EVIDENCE_SCORE` (`score.ts:102`).
- `parsePhraseLexicon`, `LexiconRange`, `LexiconTerm` (`corpus/src/lexicon.ts:56,61,197`).
- `shoppingCheck`, `CANDIDATE_ID` (`apps/mobile/src/wardrobe/shopping.ts:62,179`), for F-258.
- `Provenance.confidence` (`color-core/src/provenance.ts:127`); the published ceilings as test vectors:
  `QUALITY_CEILING`, `ILLUMINATION_CEILING`, `SPACE_CONFIDENCE_CEILING`, `CONFIDENCE_UNANIMOUS` /
  `MAJORITY`, `PHOTO_CEILING`.
- `swatchAccessibleName` (`ui/src/Swatch.tsx:146`); `ProximityHeadline` `band`, `DeltaBars`
  `reading`, `ReadoutTable` `reading`.
- The message catalogues and their both-ways key pins (ADR-0056, `apps/mobile/test/i18n.test.ts`);
  F-223's `satisfies Record<Id, MessageKey>` pattern.
- The claims fixtures; `mockups/tools/generate-inventory.mjs`.

### New

```ts
// @irodora/color-difference — src/ciede2000.ts
export interface Ciede2000Terms {
  readonly termL: number; // ΔL′/(kL·SL), signed, + when b is lighter
  readonly termC: number; // ΔC′/(kC·SC), signed
  readonly termH: number; // ΔH′/(kH·SH), signed with Δh′
  readonly sl: number; readonly sc: number; readonly sh: number;
  readonly rt: number;
  readonly deltaE00: number; // Object.is-identical to deltaE00(a,b,weights)
}
export function deltaE00Terms(a: Lab, b: Lab, weights?: Ciede2000Weights): Ciede2000Terms;
// deltaE00 and deltaE00Terms both call one internal core; deltaE00 passes no sink, so its path does
// not allocate. The final expression stays verbatim.

// src/bands.ts
export const DELTA_E00_BANDS; // veryClose 0, close 0.8, perceptible 1.8, clear 5
export type DeltaE00Band = 'veryClose' | 'close' | 'perceptible' | 'clear';
export const DELTA_E00_DISPLAY_DECIMALS = 2;
export function printedDeltaE00(value: number): number;   // throws on non-finite or negative
export function deltaE00Band(magnitude: number): DeltaE00Band; // throws on non-finite or negative
export type AxisDirection = 'more' | 'less' | 'level';
export interface AxisReading { readonly band: DeltaE00Band; readonly direction: AxisDirection }
export function axisReading(printedFigure: number, weightedTerm: number): AxisReading;

// @irodora/optimization — src/coverage.ts
export function countsAsOutfit(overall: number, threshold?: number): boolean; // clears() calls it
export interface GapRegion { readonly slot: OutfitSlot; readonly lightness: LexiconRange; readonly chroma: LexiconRange }
// Gap gains `readonly region: GapRegion` (additive)
export interface AddressedGap { readonly region: GapRegion; readonly named: readonly Gap[]; readonly wouldUnlock: number }
export function gapsAddressedBy(candidate, wardrobe, lexicon, context): readonly AddressedGap[];
export interface Pairing { readonly id: string; readonly outfits: number }
export function wardrobePairings(after: Coverage, candidateId: string): readonly Pairing[];

// @irodora/recommendation — src/concordance.ts
export interface ProfileConcordance { readonly garments: number; readonly concordant: number;
  readonly share: number; readonly threshold: number; readonly rulesVersion: string }
export function profileConcordance(profile, colors, rules): ProfileConcordance | null;

// @irodora/ui — src/percent.ts
export function floorPercent(fraction: number): number;     // [0,1] → integer, ⌊100f + 1e-9⌋
export function confidencePercent(confidence: number): number;
export function confidenceText(confidence: number, word: string, script: Script): string;
```

App: `apps/mobile/src/delta-readings.ts` holds `BAND_KEYS`, `LIGHTNESS_KEYS`, `CHROMA_KEYS`,
`HUE_KEYS`, each `satisfies` a total record of `MessageKey`, plus `bandKey(d)` and
`axisKey(axis, reading)`. Catalogue changes in en and ja: `delta.band.*` (4), `delta.lightness.*`
(9), `delta.chroma.*` (9), `delta.hue.*` (5), `confidence.word`, `confidence.meaning`;
`lens.confidence` is removed.

**Rules for the engine change:** do not bump `DIFFERENCE_VERSION`; do not regenerate
`golden/cross-platform-identity.fixture.json` — the metric is unchanged, and an untouched fixture that
still passes is the evidence. ADRs link only to files that exist; links to new source land in
increment 8.

### Increments (each ends green, one commit each)

0. **Claim and plan.** F-222 `blocked` → `in_progress`, `plan` set; this plan saved. Gate: `state`.
1. **Decide and record — one commit, because gate 2 forces it** (removing OQ-9 from PRD §10 makes
   every `oq:OQ-9` binding fail `verify-mockups`):
   - ADR-0124 and ADR-0125, with the README rows;
   - PRD §10 and R9 §11 record the closure; R9 §8 rewritten (plus an 08 readings note and a 09 row →
     F-250); R9 §4 E2 rows for 03, 04 (×2), 13 and the new 23 title row;
   - inventories 03, 04, 08, 09, 13, 22, 23 rebound (03's `.match` leaf ids → `.similarity`),
     regenerated and formatted;
   - the honest composed forms, en and ja, in `near-misses.md`;
   - F-222 drops `openQuestions` and gains its attested entry; downstream notes and `blockedBy`; backlog
     F-316.
   Gates: `state`, `lint`, `verify:claims:prove`, `verify:mockups:prove`, `format:check`, `test`.
2. **`deltaE00Terms`, with its golden data.** The shared core; `golden/ciede2000-terms.golden.json`;
   its golden test; property tests. Gates: typecheck, lint, test, `test:golden` (34 pairs and the
   identity digests unchanged), `test:cvd`, `bench` before and after.
3. **Bands.** `bands.ts`; `golden/deltae00-bands.golden.json`; tests. Gates as for 2, without bench.
4. **Shopping and outfit figures.** `countsAsOutfit` (and `clears` uses it), `Gap.region`,
   `gapsAddressedBy`, `wardrobePairings`; tests against the **published** lexicon, recording the
   synonym count. Gates: typecheck, lint, test, build.
5. **Concordance.** `profileConcordance` and exhaustive-grid tests (no new dependency). Gates:
   typecheck, lint, test, build.
6. **Band words.** `delta-readings.ts`, the en and ja keys, its test. Gates: typecheck, lint, test,
   build, `test:content` (font coverage; re-subset if new codepoints appear, as F-230 did).
7. **Confidence format.** `ui/src/percent.ts` and its tests; `swatchAccessibleName` uses
   `confidencePercent`; Lens.tsx renders `confidenceText` plus `confidence.meaning`, after quality,
   light and space (FR-17); `screens.test.tsx` updated; `test/confidence-format.test.ts` with the
   source-scan guard. Gates: typecheck, lint, test, build, `test:a11y`, `test:content`.
8. **Effects and close-out.** E-175, E-176, E-177 with notes; E-003, E-044, E-046 updated; ADR links to
   the new files. Then one evaluator review, a fix commit, and the done commit.

## Mockup fidelity

- **Governing (P1):** `03` (state of `(tabs)/lens`, with `27` for state content, P2), `04`, `08`,
  `13`, `22`, `23` (finished `profile/index`, C15). No `25` or `26` variant applies to these figures.
- **Elements this feature defines:** 03 `03.chips.conditions` (confidence, via the attested half),
  `03.matches.row-{1,2,3}.similarity`; 04 `04.gauge.band`, `04.gauge.{lightness,chroma,hue}.reading`;
  08 `08.metrics.{delta-e00,lightness,chroma,hue}.reading`; 13 `13.score.verdict`; 22
  `22.stats.pairings.{figure,detail}`, `22.stats.gaps.{figure,detail}`; 23 `23.history.{title,detail}`;
  27 `27.lens-refused.body` (only if it prints a confidence; attested).
- **Departures**, each forced and recorded in §4 E2 and in the inventory:

| figure | departure | forcing rule |
|---|---|---|
| 03 percentage | the drawn word → *Similar* | rule 11, FR-7, claims gate (drawn.md:21–23) |
| 04 band | the drawn word removed | FR-74 (existing row) |
| 04 hue reading | the drawn parenthesis → hue band phrase | FR-74 (existing row) |
| 13 verdict | the drawn word → the coverage predicate | the claims gate's verdict class (drawn.md:30), FR-32 |
| 23 title | "Calibration" → "Profile" | rule 11, ADR-0031 §1 / FR-16 |

Not departures: words in derived slots are values (E1) — 08's phrasing becoming the shared phrase
family, and 04's 1.42 reading *Close*.

## Files to touch

```
docs/adr/0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md   new
docs/adr/0125-a-delta-e00-is-described-by-one-table-of-four-bands-anchored-on-published-thresholds.md new
docs/adr/README.md · docs/PRD.md (§10) · docs/design/R9-MOCKUP-FIDELITY.md (§4 E2, §8, §11)
mockups/tools/inventory-data/{03,04,08,09,13,22,23}.mjs → mockups/inventory/*.json (regenerated)
packages/testing/fixtures/claims/near-misses.md
packages/color-difference/src/{ciede2000.ts,bands.ts,index.ts}
packages/color-difference/golden/{ciede2000-terms,deltae00-bands}.golden.json
packages/color-difference/test/golden/{ciede2000-terms,deltae00-bands}.test.ts · test/{terms,bands}.test.ts
packages/optimization/src/{coverage.ts,index.ts} · test/shopping-figures.test.ts
packages/recommendation/src/{concordance.ts,index.ts} · test/concordance.test.ts
packages/ui/src/{percent.ts,Swatch.tsx,index.ts} · test/percent.test.ts
apps/mobile/src/delta-readings.ts · src/i18n/{en,ja}.ts · src/screens/Lens.tsx
apps/mobile/test/{delta-readings,confidence-format}.test.ts · test/screens.test.tsx
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf (only if test:content reports new codepoints)
.harness/state/{feature_list.json,effects.json,progress.md} · .harness/memory/effects/*.md
```

## Anticipated effects

1. **E-003 (critical), `ciede2000.ts#deltaE00`, is refactored.** Guard: gate color-golden (34 pairs,
   two decoys, canonical and raw identity digests unchanged); a new `Object.is` identity property; the
   new terms golden set; gate cvd; `bench` for the hot path. Add `bands.ts` to E-003's `to`.
2. **New E-175 (high): `bands.ts#DELTA_E00_BANDS`** → `delta-readings.ts`, the catalogues,
   `ProximityHeadline`/`DeltaBars`/`ReadoutTable` (through F-245/F-249), inventories 04/08, R9 §8.
   Guard: the band-edge golden set; the typed total key maps plus the no-match test; the i18n pins.
3. **New E-176 (medium): ADR-0124's figure definitions** → inventories 03/13/22/23; F-244, F-257,
   F-258, F-260; and the shared predicate `countsAsOutfit` (13's label and `coverage()`). Guard: gate 2;
   the predicate-equality test; the claims proof over the new near-misses.
4. **New E-177 (medium): `ui/src/percent.ts#confidenceText`** → `swatchAccessibleName`, Lens.tsx,
   03's chip (F-244), 27 (F-236). Guard: the source-scan test with a planted decoy; a11y.
   `Shopping.tsx:324` prints `CompatibilityScore.confidence`, a different quantity: allowed by name,
   the exception naming F-258.
5. **E-044 (lexicon → `gaps`).** `gapsAddressedBy` keys on region because the lexicon has synonyms.
6. **E-046 (`Coverage.combinations` join).** A decoder is added inside the same module.
7. **E-053, and the ja.ts → font-coverage link.** New ja words: run `test:content`.
8. **E-128 (inventory ↔ PRD §10).** Closing OQ-9 releases seven bindings; gate 2 enforces the
   rebinding, in one commit.

`gaps()` duplicating names and mixing locales is recorded as backlog F-316, not fixed here: fixing it
changes 11's display, and which name to show is a design decision.

## Test plan

- **Golden (color-golden):** `ciede2000-terms` — for all 34 pairs, the published `SL`, `SC`, `SH`,
  `RT` (tolerance 5e-5), and `termL`/`termC`/`termH` computed **from the transcribed published
  columns by a separate script, never by running our code**, with a `derivationNote`; a transcription
  check rebuilds ΔE00 from the intermediates (decoy: one mistyped SL breaks it). `deltae00-bands`: the
  edges 0.8, 1.8, 5 as published values, exact (decoy: an edge at 2.3 fails).
- **Property:** `Object.is(deltaE00Terms(a,b).deltaE00, deltaE00(a,b))` over the identity vectors
  (decoy: the same sum in another order is not bit-identical on some sample); antisymmetry of the
  terms; bands monotone, edges belong to the upper band, non-finite or negative input throws;
  `axisReading.band === deltaE00Band(|term|)` over a grid including the edges; the direction follows
  the printed figure; −0 and 0 → `level`; `printedDeltaE00(0.7999)` → `close` (decoy: the raw value
  gives `veryClose`).
- **Constructed wardrobes (criterion 4, published lexicon):** filling one dark near-neutral region →
  1 addressed while the naive length difference is 4 (the synonym decoy); a first shoe → 1 addressed
  while `after.length > before.length` (the new-gap decoy); a vivid candidate → 0; the criterion's
  sentence as an oracle; deterministic order.
- **Pairings:** 3 trousers × 1 shoe → unlocked 3, pairings 4 (decoy: unlocked ≠ pairings); threshold
  101 → 0; the candidate never in its own list.
- **Coverage predicate:** brute force equals `coverage().valid` at thresholds 0, 60, 101, and at an
  attained overall (the inclusivity decoy: `>` fails it).
- **Concordance:** exactly 66 counts and 65 does not; empty wardrobe → null; all-zero-confidence
  profile → null, not 0%; the threshold is carried; the input is not mutated.
- **`confidencePercent`:** every published ceiling → its whole percent; 0.57 / 0.29 / 0.58 → 57 / 29
  / 58 (decoy: naive floor gives 56 / 28 / 57); 0.9999 → 99 (decoy: `Math.round` gives 100); never
  above 100·c + 1e-9; monotone; `confidenceText` in both scripts.
- **Negative:** no band or axis word in en or ja contains a match or identity word, with the
  predicate tested against decoys; the source scan finds the two old formats in planted strings and
  the real tree clean apart from the named exception; gate 2 rejects any leftover `oq:OQ-9`.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:golden
# reached by this feature's effects — run and recorded, though not in F-222's list:
pnpm build && pnpm test:cvd && pnpm test:a11y && pnpm test:content && pnpm bench
pnpm verify:claims:prove && pnpm verify:mockups:prove
```

**Evidence:** the golden pass count and both identity digests unchanged; bench before and after; the
synonym count; the claims lint's marker and near-miss totals; `verify-mockups` showing no `oq:OQ-9`.
**Not run:** `contrast` (no token changes), `e2e` (pending gate, no journey).

**Attested entry on F-222** (ADR-0038). Criterion, verbatim: *"provenance.confidence has one display
format, stated with what the number means, used in 03 and 27"*. verifiedBy: F-222 gates the format
and both existing renderings with a scan that refuses a second format; F-244's conformance sweep
asserts `03.chips.conditions` renders `confidenceText`; F-236's sweep asserts the same for any
confidence 27's refused state prints. blocks: release. status: outstanding.

## Risks and open questions

- **Citations:** ISO/TR 28642's adoption of 0.8 / 1.8 and CIE's 0–5 range are not yet verified
  against primary sources. If one cannot be read, the golden entry and the ADR say what the value
  rests on.
- **Domain transfer:** the thresholds come from dental specimens. The band describes the printed
  number, never what a person sees; the ADR says so.
- **13's label** may be read as a verdict. It is FR-42's own vocabulary, and the threshold is shown.
- **23's figure** may be read as validation of the profile. The meaning is stated; F-037 (bias
  validation) is not done.
- **Confidence:** *100% Confidence* appears for a clean daylight sRGB capture — honest by definition,
  the meaning line the mitigation; whether the ceiling should reach 1 is F-063's question.
- **Japanese words:** unreviewed (OQ-5).
- **Performance:** `deltaE00` is the hot path (bench before and after); F-258 computes `gaps()` twice
  per candidate and measures that against NFR-4.

## Out of scope

Building any of 03, 04, 08, 13, 22, 23 or 27; minting the greens (C10); the 04 seal and tolerance
pill; OQ-10, OQ-28, OQ-30, OQ-31, OQ-32, OQ-45; fixing `gaps()` synonyms and per-locale names (F-316);
hue-bearing gaps; 09's slider readings (F-250); the wording of "Retake Swatch Calibration" (F-260);
Shopping's compatibility-confidence format (F-258); localising the Swatch accessible name; changing
claims-lint patterns; bumping `DIFFERENCE_VERSION`.

## Notes for downstream features (written into `feature_list.json` in increment 1)

- **F-244 (03):** chip `confidenceText(c, t('confidence.word'), script)` with `confidence.meaning` as
  its accessibility hint; rows `floorPercent(similarityPercent(d)/100)` plus *Similar* / 類似度; element
  ids are now `.similarity`; an acceptance line discharges F-222's attested criterion 3.
- **F-245 (04):** headline `BAND_KEYS[deltaE00Band(printedDeltaE00(d))]`; rows
  `axisReading(printed, term)` with terms and the DeltaBars magnitudes from `deltaE00Terms` (ADR-0119).
- **F-249 (08):** gains F-222 in `blockedBy`; the same band and `axisReading` over `deltaE00Terms`;
  *towards &lt;hue&gt;* is B's lexicon hue term.
- **F-257 (13):** `countsAsOutfit(score.overall)`, with ADR-0124's words and threshold; no status
  colour.
- **F-258 (22):** `ShoppingCheck` gains `pairings` and `gapsAddressed`, null when `outfits` is null;
  the drawn detail words kept; the `Shopping.tsx` exception leaves the confidence guard when the screen
  is rebuilt; the two `gaps()` calls measured against NFR-4.
- **F-260 (23):** gains F-222 in `blockedBy`; title *Garment Profile History*; detail from
  `profileConcordance`, floored, with a stated null state.
- **F-236 (27):** gains F-222 in `blockedBy`; any confidence it prints goes through `confidenceText`;
  it discharges the 27 half of the attested entry.
- **F-250 (09):** the slider readings are now `derived:F-250`.
- **F-267:** the 23 title joins the departure list a person compares against.

## Amendments on adoption (the implementing session)

1. **Adopted as written**, including the four readings of the acceptance, so the one review can
   contest them.
2. **Increment 0 does not write `progress.md`** (the history records finished work, as F-230's claim
   did not).
3. **One review, then fix or record** (AGENTS.md loop step 5), after increment 8.
4. **Ids confirmed free:** ADR-0124 and ADR-0125 (the index ends at 0123), E-175 to E-177 (the graph
   ends at E-174), F-316 (the list ends at F-315).
5. **Primary sources before citation.** In increment 1 the implementer reads the threshold sources
   and Sharma–Wu–Dalal's published table where they are reachable, and the ADR and the golden entries
   state exactly what each value rests on — a published value, a restatement, or a published formula.
   No golden value is computed by running our code.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | `8305d13` | Claimed; this plan (the planner subagent's, adopted with five amendments). |
| 1 | `3d426eb` | **OQ-9 decided; ADR-0124 and ADR-0125.** PRD §10 and R9 §11 record the closure, R9 §8 binds each figure to its computation (a 09 row → F-250 added), R9 §4 E2 gains the 23 title row and points 03, 04 and 13 at the ADRs. Inventories 03, 04, 08, 09, 13, 22, 23 rebound and regenerated: 03's leaves are `.similarity`, 13 and 23 gain E2 departures, 09's readings are F-250's; `verify-mockups` and its proof pass with no binding to a closed question. The honest composed forms, en and ja, are in `near-misses.md`; the claims lint passes and its proof discriminates on all 41 cases. F-222 drops OQ-9 and carries its attested criterion; notes on F-236, F-244, F-245, F-249, F-250, F-257, F-258, F-260, F-267, and F-222 in `blockedBy` for F-236, F-249, F-260; backlog F-316 (gaps named once, in the reader's language). **The sources, read before citing (amendment 5):** the 2019 review's abstract gives PT 0.8 / AT 1.8 ΔE00 (ΔE*ab 1.2 / 2.7), from the 2015 multicentre study of dental ceramic; the 5 edge rests on a secondary statement of CIEDE2000's 0–5 range (Richter, BAM/TU Berlin, and CIE TC 1-63's terms of reference), and the ADR says so; **ISO/TR 28642 is not claimed** — the literature cites it for a competency test, not these values. Sharma–Wu–Dalal's Table I (with SL, SC, SH, RT and the primed coordinates) was read out of the paper's own PDF for increment 2; the extraction drops minus signs, which increment 2 recovers from the signed inputs and the published ΔE00. **Changed from the plan:** ADR-0061 does not set the display precision — it reasons about a ΔE00 printed to two decimals — so ADR-0125 says *the two decimals every screen prints*; and **F-317** records the ui conformance suite's cleanup-hook timeout, which failed the first full test run three times running (each passed alone). |
| 2 | this commit | **`deltaE00Terms`, one computation with `deltaE00`.** The CIEDE2000 body is an internal `core(a, b, weights, sink)`; `deltaE00` passes no sink (its path allocates nothing new) and `deltaE00Terms` returns the weighted terms, SL, SC, SH, RT and the total. `DIFFERENCE_VERSION` is unchanged and the cross-platform identity fixture untouched — the identity test passes against it as committed. **Golden set `ciede2000-terms`** (68 entries): for all 34 pairs, Table I's SL, SC, SH and RT as published values (5e-5), and the three terms as published formulas computed by a separate script from Table I's printed L, C′ and h′ — never by this package — each with its arithmetic and a tolerance propagated from the table's rounding (8.9e-5 to 1e-3). The extraction from the PDF drops minus glyphs: every magnitude was checked against the signed transcription in `ciede2000.golden.json`, and RT takes its sign from its definition (never positive). The transcription check rebuilds every printed ΔE00 from the terms within its propagated bound (worst at 35 % of it); decoys: a lightness/chroma swap the totals cannot see, a mistyped SL, a sign-flipped RT. **Properties:** the total is `deltaE00`'s own double over the identity fixture's 10,000 inputs and 3,000 arbitrary pairs (two weightings); decoy: the same terms summed in another order differ in the last bit on some pair, which is why nothing recomposes the total; swapping the colours negates every term away from the ±180° branch. **Evidence:** `test:golden` 224 in color-difference (identity digests unchanged), `test` 247, `test:cvd` green; `bench` unchanged within noise (score-color-batch p95 0.66 → 0.65 ms, recommend-outfit 0.58 → 0.61 ms), and a direct micro-benchmark 321 → 315–320 ns per call with an identical checksum over 1M calls. **Changed from the plan:** RT needed no sign recovery — it is never positive by definition. |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| review | | |
