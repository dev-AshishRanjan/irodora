# Plan: F-064 — Pattern and multi-colour extraction

| | |
|---|---|
| **Feature** | F-064 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` — **`@irodora/color-sampling`**, not `color-core`; see below |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

A striped shirt is not one colour. Given the pixels of a patterned garment, return the colours
it is actually made of — ranked, each with the share of the area it occupies — so that
everything downstream can say *"mostly this navy, with about a fifth in this cream, and a
narrow red"* instead of averaging the three into a muddy brown nobody is wearing.

Done, to a user: a garment they photograph is described by several colours with proportions,
not by one.

## The two things criterion 2 names that do not exist

> *Meets **its accuracy target** on **the pattern test corpus** for stripes, checks, colour
> blocks and prints.*

**Neither is defined anywhere in this repository.** There is no accuracy target for pattern
extraction — NFR-2 is about *capture* accuracy from a physical device matrix, which is F-063 and
is blocked. And there is no pattern test corpus: nothing matching `*pattern*` exists in
`content/`, `tests/` or any package.

So this feature has to define both, and **that is an ADR, not a choice made in passing** —
golden rule 7, and golden rule 11 twice over, because an accuracy target is a claim about
accuracy. ADR-0089 is part of this feature.

**The target is derived rather than picked.** The corpus is *constructed*, so its ground truth
is exact by construction — a striped image built from two known colours in a known ratio has no
measurement error in it at all. A correct quantiser must therefore recover those colours
**essentially exactly** when the pattern has no more distinct colours than it was asked for, and
the target says so (ΔE00 ≤ 1.0, proportions within 1 percentage point) rather than allowing a
slack nobody can justify. Where the pattern has *more* colours than `k` — the print class —
exact recovery is impossible by definition and the target covers the dominant colours only.

Constructed, not photographed, and the ADR is explicit about what that does and does not prove:
**it tests the algorithm, not the camera path.** The camera path is F-063's, and it is
separately attested and blocked.

## Approach

**Where it lives is a correction, and it is recorded rather than silently followed.**
`feature_list.json` says `"package": "@irodora/color-core"`. That package's own module header
says **"Nothing here computes a colour… This package owns the *value type* and the *envelope*"**
— so a quantiser there would contradict the boundary it states. `@irodora/color-sampling` is
*"pixels to one colour, with an honest confidence"*; pattern extraction is the same domain,
generalised to several. It goes there, and the feature's `package` field is corrected.

**Reused — and the reuse is the design, not a convenience:**

| Piece | Where | Why not a new one |
|---|---|---|
| `aggregate` — the mean **in linear light** | `@irodora/color-sampling` | The one averaging implementation in the repository. Averaging encoded sRGB is systematically too dark [[averaging-non-linear-srgb-reads-too-dark]], and a second averager here is how the two surfaces drift |
| `partition` — rejecting clipped and unusable samples | same package | A pattern extractor that counted blown-out pixels would report the highlight as a colour |
| `srgbToXyz`, `xyzToOklab` | `@irodora/color-spaces` | Clustering happens in OKLab. Nothing here converts |
| `deltaE00` | `@irodora/color-difference` | For the **test's** accuracy assertion only. Never inside the clustering — see below |
| `Sample` | `@irodora/color-sampling` | The pixel type the Lens already produces |

**New:** `packages/color-sampling/src/pattern.ts`

```ts
export interface PatternColour { readonly colour: Sample; readonly proportion: number;
                                 readonly count: number }
export interface PatternExtraction { readonly colours: readonly PatternColour[];
                                     readonly usable: number; readonly rejected: number }
export const PATTERN_TARGET_DELTA_E: number;      // the ADR's number, exported
export const PATTERN_TARGET_PROPORTION: number;
export function extractPattern(samples: readonly Sample[], k?: number): PatternExtraction;
```

Five decisions, each of which has a plausible wrong version:

1. **Median cut, not k-means.** k-means needs seeding, and a seed needs a random source — which
   this engine deliberately does not have (F-077 made randomness a port, and a port is a
   platform API). Median cut is fully deterministic with no seed at all, which is what NFR-3
   requires: byte-identical in Node, the browser and React Native.
2. **Clustering in OKLab, never on ΔE00.** ΔE00 is not a metric and cannot be indexed or used
   as a clustering distance without ranking subtly and silently wrong
   [[deltae00-is-not-a-metric-and-cannot-be-indexed]]. OKLab with Euclidean distance is what
   OKLab is *for*. ΔE00 appears only in the test, comparing an answer to the constructed truth.
3. **The bucket's colour is `aggregate`'s, in linear light.** Not the OKLab centroid, which
   would be a second averaging rule in a repository that has one. The split is perceptual; the
   representative value is the engine's existing mean.
4. **Roles are positional and the proportions are shown.** Ranked by area: first is primary,
   second secondary, the rest accents. An "accent is the high-chroma one" rule would be a
   judgement about what an accent *is*, and FR-19 asks for ranked colours with proportions —
   which lets a caller see that the accent is four per cent rather than being told it is one.
5. **Rejected pixels are counted and reported, never silently dropped.** `partition` discards
   clipped and out-of-range samples; a proportion computed over a shrinking denominator with no
   mention of it is a number that quietly means something else.

**Increments** — each leaves the build green and is committed separately:

| # | Step | Verified by |
|---|---|---|
| 1 | The constructed corpus generator — stripes, checks, blocks, print, **and a blended-edge variant** | `test` |
| 2 | `extractPattern`: median cut, proportions, ranking | `test` |
| 3 | The accuracy assertion over the corpus, at the ADR's target | `test`, `test:golden` |
| 4 | ADR-0089; the feature's `package` field corrected | `state` |

## The fixture must not be too clean, and this is where that bites

Every constructed pattern has **hard edges**, so every pixel is exactly one of the source
colours — and a quantiser that only works on exact-colour images passes the whole corpus. That
is precisely
[[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]], one day after it was
written, and a real photograph of a striped shirt has a blended pixel at every stripe boundary.

So the corpus carries a **blended-edge variant**: the same stripes with a two-pixel linear ramp
between them, in linear light. Its ground truth is still exact — the ramp pixels are a known,
small fraction — and it is the case that separates a quantiser from a colour counter.

## Files to touch

```
packages/color-sampling/src/pattern.ts        — NEW. Median cut, proportions, ranking
packages/color-sampling/src/index.ts          — the exports
packages/color-sampling/test/pattern.test.ts  — NEW. The corpus, and the accuracy assertion
packages/color-sampling/golden/patterns.md    — the corpus's construction, stated so it is re-derivable
docs/adr/0081-*.md                            — the target and the constructed corpus
docs/adr/README.md                            — the index row
.harness/state/feature_list.json              — status, the corrected package field, notes
.harness/state/progress.md                    — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **Engine purity** — `@irodora/color-sampling` is in the zone | No dependency, no `node:*`, no `process`, no platform API. A `Math.random` here would be the sharpest possible violation | **`lint`** — `verify-engine-purity.mjs`, which closes the graph over the declared zone |
| **E-008** the engine is imported, never ported | A quantiser is the second-most tempting place to inline an average, after a band-finder. Every value comes from `aggregate` or `xyzToOklab` | **`lint`**, plus a test asserting a bucket's colour equals `aggregate`'s answer for its members |
| **`color-golden`** | A new golden dataset enters the gate. It is **constructed**, not published, and the ADR says so — the derivation is stated so it is re-derivable from the sentence alone, which is the corpus's own convention | **`gate:color-golden`** |
| `@irodora/color-sampling`'s public API | Additive. Nothing existing changes shape | **`typecheck`**, `build` |

**No new effect link is warranted.** Nothing consumes this yet. When the Lens or the outfit
scanner does, the *proportions* become a contract with a surface — and that is the moment one is
owed.

## Test plan

- **The corpus, four classes plus the blended variant**, each constructed from known colours in
  known proportions, and each asserted to have the ground truth the generator claims — a
  generator that built the wrong image would otherwise make every accuracy assertion vacuous.
- **Accuracy:** for each pattern, the extracted primary, secondary and accent are within
  `PATTERN_TARGET_DELTA_E` of the constructed colours, and each proportion within
  `PATTERN_TARGET_PROPORTION`.
- **Property tests:**
  - proportions sum to 1 (over usable pixels) for every pattern;
  - a **uniform** image returns exactly one colour with proportion 1, whatever `k` is;
  - the result is **ordered by area**, descending, with a total tie-break so it does not follow
    input order;
  - **determinism**: the same samples in a different order produce the same colours and
    proportions. This is the one that catches a median cut splitting on arrival order.
- **Negative, with decoys:**
  - the blended-edge stripes still recover both stripe colours — the decoy being the hard-edge
    version, which a colour *counter* also passes;
  - clipped pixels are rejected and **reported**, not folded into a proportion. The decoy is the
    same image unclipped, whose `rejected` is zero;
  - a bucket's colour equals `aggregate`'s answer for its members, so an inlined average fails
    rather than agreeing with itself;
  - `k` larger than the number of distinct colours returns the distinct colours, not `k` of
    them with two identical entries.
- **Oracle:** none. `culori` and `colorjs.io` have no median-cut quantiser to disagree with, and
  saying so is better than inventing a comparison. The oracle here is the **construction**.

## Verification

```
node scripts/verify-state.mjs
pnpm --filter @irodora/color-sampling test
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:golden && pnpm build
```

**Will not run:** `e2e`, `a11y`, `contrast` (no screens), `cvd` (no separation change), `perf`
(no budget claimed — but the quantiser is O(n log n) in pixels and the note will say so).

## Risks and open questions

- **No `OQ-*` exists for this, and one arguably should have.** The accuracy target and the test
  corpus were named by a criterion and defined nowhere, which is the same shape as FR-52's
  *"investment signal"* (F-123) and OQ-3's reference card (F-053). The difference is that this
  one can be closed by an ADR written here, because it is a decision about **our own test
  data** rather than about a purchase or a third party's tooling.
- **Median cut is not the best quantiser, and the ADR will say so.** It is the best
  *deterministic, dependency-free, seedless* one. Better results are available from k-means++
  and from octree quantisation with dithering, and both need either a random source or
  substantially more code.
- **The print class is the weakest.** A constructed print is many small deterministic shapes,
  which is a stress case for the algorithm but is not a photograph of a floral blouse. The ADR
  states the limit rather than letting the corpus imply a coverage it does not have.

## Out of scope

- **Photographed patterns.** No sourced imagery: it is licensed content
  (`content/AGENTS.md`), and a photograph has no exact ground truth to measure against. The
  camera path's accuracy is F-063's, attested, and blocked on F-053.
- **Pattern *classification*.** Naming a pattern "striped" or "checked" is a different feature
  from extracting its colours, and FR-39 already has a free-text `pattern` field somebody fills
  in.
- **Any surface.** `service` is `packages` and the verification list has no `a11y` and no `e2e`.
- **Dithering, or a palette optimised for re-rendering the image.** This extracts what the
  garment is made of; it is not an image encoder.
