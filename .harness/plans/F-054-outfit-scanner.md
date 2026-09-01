# Plan: F-054 — Outfit scanner

| | |
|---|---|
| **Feature** | F-054 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-36 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

Point the camera at a whole outfit rather than one garment, and get a colour per garment —
each with its own confidence — plus the six-component score for the outfit they make together.

Done, to a user: three readings and a score set, with a sentence saying which garment each
reading came from and how sure it is. And when the picture is not three stacked garments — a
plain wall, a close-up, a person against a background the same colour as their coat — **it
says so instead of returning three confident colours it invented.**

## Approach

**The scan is one region walk turned into three, and every judgement in it is an engine
call.** A worn outfit photographed head to toe is vertically stratified: a top above trousers
above shoes. So the classical-CV question is *where are the two horizontal boundaries*, and it
is answered by measuring the colour of each row band and looking for the two largest
perceptual jumps between adjacent bands.

That is 1-D edge detection over a row profile — classical, deterministic, explainable, and
**no new colour arithmetic**: the row colours come from `aggregate` (which averages in linear
light) and the jumps from `differenceOklch` (which routes OKLCh through Lab, because ΔE00 is
defined there). What this file adds is an `argmax` over numbers the engine produced — the same
line `builder.ts` holds, and the reason both stayed mobile features rather than engine changes
(E-008).

**Reused:**

| Piece | The call that already does it | Where |
|---|---|---|
| Row colour, averaged in linear light | `aggregate(samples).trimmedMean` | `@irodora/color-sampling` |
| Perceptual jump between two rows | `differenceOklch` | `apps/mobile/src/engine.ts` |
| A region → a reading with its confidence | `read('garment-scan', { region, space })` | `apps/mobile/src/lens/modes.ts` |
| Rejecting unusable pixels | `partition` — inside `read` | `@irodora/color-sampling` |
| Reading → OKLCh, honouring the capture space | `readingOklch` | `apps/mobile/src/profile/photo.ts` |
| The six-component score | `scoreOutfit` | `@irodora/recommendation` |
| Slot vocabulary | `OUTFIT_SLOTS` | `@irodora/recommendation` |

**New:**

`apps/mobile/src/lens/outfit-scan.ts`:

```ts
export interface ScanFrame { readonly samples: readonly Sample[]; readonly width: number;
                             readonly height: number; readonly space: CaptureSpace }
export type Band = { readonly slot: OutfitSlot; readonly top: number; readonly bottom: number };

export const BOUNDARY_DELTA_E: number;        // below this, a boundary is not a boundary
export function proposeBands(frame: ScanFrame): BandProposal;   // classical CV
export function scanOutfit(frame: ScanFrame, bands: readonly Band[], context): OutfitScan;
```

Five decisions, each of which could have gone the invented-answer way:

1. **`scanOutfit` takes bands; it does not find them.** *"Manual region override always
   available"* is criterion 2, and making the override the **only** input path is the strongest
   form of it — the API cannot not have it. `proposeBands` is a separate function whose output
   is one legal argument among many.
2. **A weak boundary is refused, not accepted quietly.** Two "largest" jumps always exist, even
   in a photograph of a wall. `BOUNDARY_DELTA_E` is the strength below which a jump is not a
   garment edge; below it `proposeBands` returns a refusal naming the measured value. A number
   chosen by us, exported and argued for, exactly as `COVERAGE_THRESHOLD` is.
3. **A band with too few usable pixels yields a refusal, not a colour.** `partition` already
   discards clipped and out-of-range samples; a band left with a handful is not a measurement.
   The per-garment result is therefore `reading | refusal`, never a `LensReading` with a low
   number attached.
4. **The score set is `null` unless every slot produced a reading.** `scoreOutfit` scores a
   composed outfit; feeding it two garments and a guess would return a number describing an
   outfit nobody is wearing. Two readings and no score is the honest result.
5. **Provenance is `estimated` with its capture conditions, and the two paths are pinned to
   each other rather than merged.** `wardrobe.ts` already turns a reading into a *stored row*;
   this needs a `Color`. They are different functions that share one decision — source,
   confidence, and the four conditions — so a test asserts the two agree, instead of a refactor
   extracting a helper with one caller. See the revision below.

**Increments** — each leaves typecheck, lint and test green:

| # | Step | Verified by |
|---|---|---|
| 1 | `readingOklch` widened, so a row colour can be converted without a fabricated reading | `typecheck` |
| 2 | `proposeBands` + its refusals, with tests over synthetic frames | `test` |
| 3 | `scanOutfit`, the per-slot refusals and the score set | `test` |
| 4 | The test pinning this file's provenance to `wardrobe.ts`'s | `test` |

## Files to touch

```
apps/mobile/src/lens/outfit-scan.ts    — NEW. Band proposal, per-band readings, the score set
apps/mobile/test/outfit-scan.test.ts   — NEW. Synthetic frames, with decoys
apps/mobile/src/profile/photo.ts       — readingOklch's parameter widened
.harness/state/feature_list.json       — status, notes, and the surface filed
.harness/state/progress.md             — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-008** *the engine is imported, never ported* | This is the file most at risk of it: a band-finder is exactly where somebody inlines an average or a distance. Every colour value here comes from `aggregate`, `differenceOklch` or `read` | **`lint`** — `verify-guards.mjs` and `verify-engine-purity.mjs`; plus the tests assert row colours equal `aggregate`'s answer rather than a recomputation |
| **ADR-0005** *provenance is part of the value* | `colorFromReading` produces `source: 'estimated'` with the four capture conditions. Moving that decision must not change it | **`typecheck`** (the union refuses a capture without conditions) and `wardrobe.test.ts`, unchanged, over the same path |
| `readingOklch`'s signature | Widened, not narrowed — every existing argument still satisfies `Pick<…>` | **`typecheck`** |
| `wardrobe.ts`'s stored colour | Same values by a shorter route. A drift here would change what is written for every camera-captured garment | **`test`** — `wardrobe.test.ts` asserts the stored row's values and is not being edited |
| **No effect link is warranted.** Nothing here is a shared contract: one new mobile module, one extraction inside the app, one widened parameter. If the band proposal ever moves into a package, that is when it becomes one | — |

## Test plan

- **Synthetic frames, because a real one cannot be had here.** A frame is `{samples, width,
  height}`, so a fixture is three stacked blocks of known colour — which is also the only
  input shape a test could have, since jest has no camera.
- **Unit:**
  - a three-band frame proposes boundaries at the block edges, within a row of tolerance;
  - the proposed bands are contiguous, ordered, and cover the frame with no overlap;
  - `scanOutfit` over manual bands returns one reading per slot with a confidence ≤ the
    `garment-scan` ceiling, and the full six-component score set;
  - the row colours equal `aggregate`'s answer for those rows — asserted against the engine
    call, not against a literal, so a re-implementation here fails.
- **Negative, with decoys rather than empty fixtures:**
  - **A uniform frame is refused**, naming the measured boundary strength. The decoy is the
    three-block frame, which must still be accepted — a proposer that refused everything would
    satisfy the refusal test alone.
  - **A two-block frame** (a top and trousers, no shoes in view) refuses rather than inventing
    a third boundary in the middle of the trousers.
  - **A band whose pixels are all clipped** yields a refusal for that slot, and the other two
    still return readings. The decoy is the same frame with that band unclipped.
  - **The score set is `null`** when any slot refused — with the decoy that a fully-read frame
    returns all six components.
  - A frame too short to hold three bands refuses on size rather than dividing by zero.
- **Golden / color-golden / cvd:** not applicable, and the reason is the design: no new colour
  maths exists to check. Every value is `aggregate`'s, `differenceOklch`'s or `read`'s, and each
  of those has its own golden coverage already.
- **E2E:** in this feature's verification list and **cannot run** — gate 7 is pending on F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm build
pnpm test:a11y && pnpm test:contrast     # no screen changes, but they run over everything
```

Evidence: state-gate check count, mobile test count before and after, and every decoy observed
failing the mutation it was written for.

**Will not run:** `e2e` (gate 7, F-091), `perf`, `color-golden`, `cvd`, `content` (no copy
changes), `artifact`.

## Risks and open questions

- **No `OQ-*` is attached to F-054.**
- **Vertical stratification is an assumption about photographs, and it is stated rather than
  hidden.** A dress is one garment across two bands; somebody sitting down is not stratified at
  all. That is precisely why the boundary strength is measured and reported rather than assumed,
  and why the manual override is the primary input path rather than a fallback.
- **The band proposal is O(width × height) over samples.** No `perf` gate applies and no budget
  is claimed. It is one pass to bucket samples into rows and one pass over the row profile.
- **`BOUNDARY_DELTA_E` is a judgement.** It is ours, not a published value, so it is exported
  and named — a caller reporting "three garments found" without it is reporting a measurement
  with no units.

## Revisions

**2026-09-01, before increment 1 — the extraction in step 5 was a refactor with one caller, and
it is not being done.** The plan said `colorFromReading` would be extracted to
`lens/reading.ts` and used by both this file and `wardrobe.ts`. Reading the code properly:
`wardrobe.ts` builds a **`NewSavedColor` row** (hex, lab, oklch, xyz, plus provenance) and this
file needs a **`Color`**. They are not the same function. What they share is one *decision* —
`source: 'estimated'`, the reading's own confidence, and the four capture conditions ADR-0005
requires — and extracting a helper that only one of them could call would be a refactor
justified by a duplication that does not exist yet.

Two further reasons not to: `lens/reading.ts` would have needed `readingOklch` from
`profile/photo.ts`, which imports `LensReading` back from it, and the honest home for the
helper is therefore not obvious; and F-042 refused exactly this shape twice in one migration —
build it when the second caller arrives.

**What replaces it is a test, which is the stronger thing anyway.** `colorFromReading` is
exported from `outfit-scan.ts` and a case asserts its provenance is identical to what
`colorOf(toStoreWrite(…).color)` produces for the same reading. That pins the two paths
together where a shared helper would only have made them the same line — and it fails if either
drifts, which a helper with one caller could never do.

**A correctness finding from the same reading.** `aggregate([])` returns **black at full
confidence**: `mean([])` is `0`, so an empty band produces `rgb: [0,0,0]` with a quality
assessment attached. That is not a low-confidence measurement, it is no measurement, and it is
why zero usable pixels is a refusal in this file rather than a threshold somebody picked. The
decoy for it is the same frame with that band unclipped.

## Out of scope

- **The camera surface.** Nothing in this feature walks a frame buffer or renders a viewfinder.
  `sampleFrame` reads **one centre region**, and extending it to three bands would put a second
  unproven path on top of one that is currently under active investigation — F-040's first
  attestation is outstanding, and F-117 through F-121 exist because **no reading has yet been
  observed reaching the app on a device**. Filed as its own feature, blocked on that
  attestation. This is F-031's shape exactly: the scoring shipped, and the surface arrived in
  F-045 once there was something to render it on.
- **Segmenting anything but three vertical bands.** No background removal, no person
  detection, no shape analysis. Those are the parts of "outfit scanning" that quietly become
  machine learning, and criterion 2 says classical CV only.
- **More than the three `OUTFIT_SLOTS`.** A scarf, a bag and a coat over a jumper are all real
  and none of them is a slot the scoring engine has.
- **Storing a scan.** Nothing is written. The frame is discarded — that is the rule in
  `apps/mobile/AGENTS.md` and it does not bend for a longer region.
