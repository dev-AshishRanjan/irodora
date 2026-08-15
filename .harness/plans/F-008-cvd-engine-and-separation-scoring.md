# Plan: F-008 — CVD engine and separation scoring

| | |
|---|---|
| **Feature** | F-008 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-4, FR-5, NFR-10 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/cvd-engine` · `@irodora/cvd-engine` |
| **Author** | Claude Code (planner role) |
| **Date** | 2026-08-15 |

---

## Intent

Irodora is explicitly built for people with colour-vision deficiency
([ADR-0021](../../docs/adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md), NFR-10).
This is the feature that makes that claim testable rather than aspirational.

**The separation score is the deliverable, not the simulation.** A CVD "mode" that recolours
the screen helps a designer look at a problem; it does not help someone choose trousers
([ADR-0009](../../docs/adr/0009-cvd-is-an-engine-concern-not-a-ui-filter.md)). What the product
needs is one number saying whether two garments stay distinguishable — used *identically* by
the UI and by the recommendation engine, because two definitions would eventually disagree and
nobody would notice ([E-005](../state/effects.json)).

**Done looks like:** a dichromat simulation that collapses a published confusion-line pair to
under ΔE00 2, anomalous trichromacy continuous across severity, one separation function in
`[0,100]`, and gate 10 active.

## Approach

### Four decisions this feature turns on

**1. `culori` has the Machado matrices on disk — and its severity interpolation is dead code.**

`culori/src/deficiency.js` carries all 33 published matrices (3 deficiencies × 11 severities),
cited to Machado, Oliveira & Fernandes (2009) and the Oliveira lab's precomputed tables. That
is an **on-disk transcription check for 297 constants**, which is the single largest risk in
this feature and exactly the failure F-006 and F-007 each produced once.

But its interpolation does not run:

```js
let i = Math.round(tt / 0.1);
let w = Math.round(tt % 0.1);   // tt % 0.1 is in [0, 0.1) — Math.round is ALWAYS 0
if (w > 0 && …)                  // never taken
```

Measured: `filterDeficiencyDeuter(0.15)` returns exactly `filterDeficiencyDeuter(0.1)`. It
snaps to the nearest tabulated step.

Acceptance criterion 1 says **severity 0 to 1**, continuously. So we interpolate and culori
does not, and **we will disagree with culori at every severity that is not a multiple of 0.1.**
That is stated here, in advance, so it cannot later be mistaken for our defect —
[[two-oracles-agreeing-against-you-is-evidence-about-you]] taught the general lesson; this is
the case where the oracle is genuinely the one that is wrong, and the way to know that is to
have said so before running the comparison.

The oracle is therefore used **only at the 11 tabulated severities**, where it is a real check,
and the interpolated values are asserted against the endpoints and against continuity instead.

**2. Brettel–Viénot dichromacy has no oracle here, so the check is a published *property*.**
Neither `culori` nor `colorjs.io` implements it. Rather than inventing reference values,
criterion 2 names the check itself: **a published confusion-line pair must collapse.**

Colours on a line through a dichromat's copunctal point are, by definition, indistinguishable
to that dichromat. The copunctal points are published in CIE xy:

| | x | y |
|---|---|---|
| protan | 0.747 | 0.253 |
| deutan | 1.400 | −0.400 |
| tritan | 0.171 | −0.003 |

So the golden data is the copunctal points, and the assertion is behavioural: two colours
constructed on a confusion line simulate to within **ΔE00 2**, while the same two colours
*unsimulated* are far apart. **Both halves are required** — a simulation that returned a
constant would pass the first and fail the second, and that is the decoy.

**3. The separation score is one function, and its shape is fixed before any weight is chosen.**
`separation(a, b, deficiency, severity) → [0, 100]`, combining post-simulation ΔE00 with the
post-simulation lightness difference. Lightness is included deliberately: two colours a
dichromat cannot tell apart by hue may be perfectly separable by value, and telling someone
their outfit fails when it does not is its own accessibility failure.

**The weights are not tuned in this feature.** They are named constants with a stated
rationale, pinned in a golden entry, and F-029 moves them into versioned content. Tuning a
score before any consumer exists produces numbers fitted to nothing.

**4. Gate 10 activates only after it has been watched fail.** Same discipline as gate 5: the
`cvd` gate runs, each dataset is watched reject a real mutation, *then* the status flips.

### Reused

- **`@irodora/color-difference`** — `deltaE00` is the separation score's core. This is E-003's
  first real consumer.
- **`@irodora/color-spaces`** — `srgbToLinearSrgb`, `linearSrgbToXyz`, `xyzToLab`, the matrix
  helpers, `D65`. The LMS conversions for Brettel–Viénot are new but compose from `applyMatrix3`.
- **`@irodora/testing`** — the golden validator, the stratified sampler, the identity runner.
- **`culori`** as the Machado oracle, at the 11 tabulated severities only.
- The colour-engine lint zone and `verify-engine-purity.mjs` already cover `packages/cvd-engine`.

### New

```
packages/cvd-engine/src/lms.ts           Hunt-Pointer-Estévez XYZ↔LMS, cited
packages/cvd-engine/src/brettel.ts       Brettel–Viénot–Mollon dichromacy
packages/cvd-engine/src/machado.ts       the 33 matrices + continuous severity
packages/cvd-engine/src/separation.ts    the one separation score (E-005)
packages/cvd-engine/src/index.ts         barrel
packages/cvd-engine/golden/              machado · confusion-lines · separation · identity
packages/cvd-engine/test/                golden · property · oracle · identity
```

### Increments

| # | Step | Verified by |
|---|---|---|
| 1 | Scaffold, `test:cvd` + `test:golden` wiring, LMS matrices pinned digit-for-digit | golden |
| 2 | Machado — 33 matrices transcribed, each checked against culori's copy, continuous severity | golden + oracle |
| 3 | Brettel–Viénot dichromacy + the confusion-line collapse, with its decoy | golden |
| 4 | `separation.ts` — one function, weights pinned, bounds and monotonicity | test |
| 5 | Identity fixture; gate 10 activated after being watched fail; E-005 traced; record | state, cvd |

## Files to touch

```
packages/cvd-engine/package.json     — deps, test:cvd + test:golden scripts
packages/cvd-engine/src/*.ts         — NEW
packages/cvd-engine/golden/*.json    — NEW, four datasets
packages/cvd-engine/test/**          — NEW
scripts/generate-identity-fixture.mjs — a third fixture
.harness/verification/gates.json     — gate 10 pending → active
.harness/state/effects.json          — E-005's `from` resolves; guard named
.harness/memory/effects/one-separation-definition-for-ui-and-engine.md
docs/adr/                            — if the Machado interpolation choice needs one
```

## Anticipated effects

| Effect | What changes | Guard |
|---|---|---|
| **E-005** — one separation definition for UI and engine | This feature *creates* it. Its `from` ref (`packages/cvd-engine/src/separation.ts#separationScore`) resolves for the first time. A second definition appearing later in `apps/web` is the failure mode. | `gate:cvd`. The consumers — F-030's recommendation scoring and F-032's CVD outfit mode — do not exist yet, so like E-001 and E-003 this starts guarded at the source end only, and the note must say so. |
| **E-003** — ΔE00 is the ranking authority | First real consumer. A ΔE00 change now moves separation scores. | `gate:color-golden` + `gate:cvd` |
| **F-003 unblocks** | `cvdPairs` asserted distinguishable at severity 1.0 needs this package. After F-008, F-003 is eligible and R0 can close. | Its own gate 9 |

## Test plan

- **Golden:** `machado` (33 matrices digit-for-digit, plus culori agreement at the 11 tabulated
  severities) · `confusion-lines` (three published copunctal points) · `lms` (Hunt–Pointer–
  Estévez matrix and its inverse) · `separation` (weights and boundary values).
- **Property:** simulation at severity 0 is the identity · severity is monotonic in the amount
  of change · separation is symmetric and in `[0,100]` · a colour against itself scores 0 ·
  simulation never returns NaN for out-of-gamut input.
- **Oracle:** `culori` at severities 0.0 … 1.0 in 0.1 steps **only**, with the interpolation
  disagreement asserted as expected rather than discovered.
- **Negative, each with a real decoy:**
  1. A simulation returning a **constant** passes the confusion-line collapse and must fail the
     "unsimulated pair is far apart" half.
  2. A simulation that is the **identity** must fail the collapse.
  3. **Swapping protan and deutan matrices** must fail — their confusion lines differ.
  4. A separation score **ignoring lightness** must disagree on a pair that is hue-confusable
     but value-separable. That pair is the entire argument for including lightness.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:golden && pnpm test:cvd && pnpm build
pnpm security:staged
node scripts/verify-gate-mirror.mjs
```

## Risks and open questions

- **297 transcribed constants is the dominant risk**, and it is the exact failure mode of the
  last two features. Mitigated by culori's on-disk copy — but note ADR-0042's lesson: that
  proves the transcription is *faithful*, not that the source is *current*. Machado 2009 is a
  fixed paper rather than a living standard, so the residual risk is lower than WCAG's was.
- **Brettel–Viénot has no independent implementation available**, so its check is a property
  rather than a value comparison. That is weaker, and the plan says so rather than implying
  otherwise.
- **Tritanopia is not well approximated by a single projection plane.** Viénot's 1999
  simplification covers protanopia and deuteranopia; tritanopia needs the full two-half-plane
  Brettel construction. Do not ship a single-plane tritan and call it Brettel–Viénot.
- **The separation weights are not tuned here** and must not be presented as if they were.

## Out of scope

- **Tuning the separation weights** — F-029 makes them versioned content.
- **The CVD outfit mode** (F-032) and **recommendation scoring** (F-030). Consumers.
- **A UI colour filter.** ADR-0009 is explicit: the engine is the deliverable.
- **CVD-aware palette generation** — F-014's, if at all.
