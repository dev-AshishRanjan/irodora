# Plan: F-053 — Calibrated scan and reference card

| | |
|---|---|
| **Feature** | F-053 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-16, NFR-2 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/color-calibration` (new) · `packages/store` · `apps/mobile` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

**FR-16.** With a reference card in frame, solve a correction from what the camera *observed*
to what the card's publisher says those patches *are*, apply it to the sample, and label the
result `calibrated` rather than `estimated` — with the correction matrix and its residual kept,
so the measurement can be audited after the fact.

To a person: the difference between *"this is roughly that red"* and *"this is that red, and
here is the arithmetic that says so, and here is how far off it still is."*

**Selected out of release order, deliberately.** R3's only eligible feature is F-086, whose own
notes require an artefact somebody has launched — F-085's attestation for exactly that is still
outstanding. Recorded here rather than done quietly.

## Approach

### What the decision already settled, and what it forbids

[ADR-0085](../../docs/adr/0085-the-reference-card-is-a-partner-card-and-its-values-are-cited-not-measured.md)
closed OQ-3: a **partner card**, whose values are **cited, never measured by us**. It attaches
three obligations, and two of them shape this design before a line is written:

- **The exact card, its published values and their licence must be confirmed from the vendor's
  own documentation before any value is committed.** That has not happened. **So this feature
  vendors no reference values at all.** The card is an *input*: a `ReferenceCard` the caller
  supplies, carrying its own source, publisher, illuminant, observer and licence.
- **If the licence forbids redistribution**, that is exactly what ships anyway. Obligation 3 was
  written as the fallback; building it as the *only* path costs nothing and removes the
  temptation to write plausible numbers from memory into the one dataset the accuracy claim
  rests on.

Every fixture in the tests is therefore **constructed and labelled as constructed** — the
[ADR-0089](../../docs/adr/0081-the-pattern-corpus-is-constructed-so-its-ground-truth-is-exact.md) pattern, which
is stronger here than a real card would be: a synthetic reference plus a **known** distortion
has an exactly known answer, and a real card's values would not.

### The maths, and the one place it is easy to get wrong

**The fit happens in linear light.** A least-squares 3×3 solved on encoded sRGB is fitting a
curve to a straight line and will be systematically wrong in the darks — the same error as
averaging encoded sRGB, which `packages/color-core/AGENTS.md` lists as the trap that "always
makes the result too dark". Observed and reference are both linearised, the matrix is solved
there, and the result is encoded only at the boundary.

**Detection is from the values, not from edges.** "Detects the card" does not mean writing a
quad detector: the person aligns the card to an on-screen guide, and what has to be checked is
that *a card is actually there and the right way up*. That is checkable from the patch values
themselves — the observed patches must reproduce the reference's own relative ordering, and a
card absent, upside down or occluded does not. It is a real check with a real refusal, and it
needs no image processing.

**Locating patches is a projective transform.** Four corners plus the card's documented grid
gives every patch's sampling rectangle — exact maths, exactly testable, no camera required.

**Reused:** `@irodora/color-spaces` (`srgbToLinear`/`linearToSrgb`, `xyzToLab`),
`@irodora/color-difference` (`deltaE00` for the residual), `@irodora/color-core`
(`Provenance`, `fromSpace`), `@irodora/color-sampling` (`Sample`, the rejection thresholds).
Nothing here re-implements a conversion — a second implementation of anything in
`packages/color-*` is a defect by definition.

**New:**

- `packages/color-calibration` — engine zone. Zero runtime dependencies, no platform APIs.
  - `ReferenceCard`, `ReferencePatch` — the supplied card and its provenance.
  - `patchRegions(corners, layout)` — the projective mapping.
  - `verifyCard(observed, card)` — presence and orientation, from the values.
  - `solveCorrection(observed, card)` — least-squares 3×3 in linear light, with residual.
  - `applyCorrection(correction, rgb)`.
- `apps/mobile/src/lens/calibration.ts` — a solved correction plus a reading becomes a `Color`
  with `source: 'calibrated'` and its conditions.
- `packages/store` migration **7**: a `calibration` table holding the matrix, both residuals and
  the card's identity, referenced by the saved colour.

**Increments** (each leaves the build green):

1. The package skeleton, `ReferenceCard`, and `patchRegions` with its constructed tests.
2. `solveCorrection` and `applyCorrection` — linear-light least squares, residual, and the
   constructed round-trip that recovers a known distortion.
3. `verifyCard` and its refusals.
4. The app's `calibrated` reading path and the provenance it produces.
5. The store migration and the audit record.
6. Record: `progress.md`, effects, feature status.

## Files to touch

```
packages/color-calibration/…                — new package: src, test, package.json, tsconfig
apps/mobile/src/lens/calibration.ts         — new. Reading + correction -> calibrated Color.
packages/store/src/schema.ts                — migration 7, the calibration table
packages/store/test/calibration.test.ts     — migration 7 and its constraints
apps/mobile/package.json                    — depends on @irodora/color-calibration
.harness/state/{feature_list,effects,progress}.md/.json
```

> **Changed from this plan, deliberately.** `packages/store/src/repository.ts` was listed and is
> **not** touched. A repository method that writes a correction has no caller until a live camera
> can solve one, and a method with no caller is the shape
> [[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]] warns about.
> The migration still landed here — it is forward-only and never edited afterwards, so it is
> better settled while the shape of a `Correction` is fresh than bolted on beside a screen later.
> The writer and the reader are **F-136**, filed behind **F-135**.

## Anticipated effects

| Contract | Dependents | Guard |
|---|---|---|
| **A new `@irodora/color-*` package** enters the engine zone | `verify-engine-purity.mjs` follows `@irodora/*` edges | `gate:lint` — already fails closed on a `node:*` or DOM import here |
| **The store schema gains a table** (`SCHEMA_VERSION` 6 → 7) | migrations, the repository, backup/restore, the conformance suite both drivers run | `gate:test` — the storage conformance suite; **a migration with no test is the failure mode**, so the suite must cover 6→7 |
| **A new workspace manifest** | `pnpm-lock.yaml` | **E-032** — the lockfile link; `pnpm install` is required and the lockfile is committed |
| **`Provenance` gains a live `calibrated` producer**, which until now nothing emitted | the claims lint (only `reference` and `calibrated` may appear near "measured"), the confidence ceilings | `gate:lint` (claims) + `gate:test` |

## Test plan

- **Unit / property:** a distortion of identity is recovered as identity · the solve is
  invariant to patch order · a correction applied to the reference patches reproduces them ·
  bounds — every corrected value stays finite, and out-of-gamut results are reported rather
  than clamped silently.
- **Golden:** **constructed, not cited.** A synthetic reference set, a **known** 3×3 distortion
  applied to it, and the assertion that the solver recovers a correction mapping back within a
  tight ΔE00. No published card values are committed (ADR-0085 obligation 2), and the fixture
  says so in the file.
- **Conformance:** the storage suite, run by both drivers, extended to schema 7.
- **E2E:** none. The Lens's frame processor samples one centred region; twenty-four patch
  regions is a worklet change that only a device can verify — **filed, not half-built.**
- **Negative, with decoys rather than empty fixtures:** a distortion a 3×3 **cannot** express
  (a per-channel gamma) must leave a residual that is **reported**, not hidden — the decoy is
  the case where the fit is genuinely poor and the number has to say so. `verifyCard` refuses a
  shuffled patch order, a card rotated 180°, and a frame with no card. And the fit is asserted
  to be done in **linear light** by a case whose encoded-space answer differs measurably.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm test:golden
pnpm format:check
```

`color-golden` applies and will be run. `cvd` does not — nothing here touches separation or
recommendation. `e2e` cannot run (F-091 criteria 2–4 attested). `a11y`/`contrast`: no screen.

## Risks and open questions

- **The residual is the honest part and the easy part to overstate.** NFR-2's 50 % improvement
  is `attested` on this feature and discharged by F-063; nothing here may imply it has been
  demonstrated. The API reports mean and max ΔE00 before and after, and makes no claim about
  either.
- **A 3×3 is a linear model of a system that is not exactly linear.** The architecture names
  "3×3 (or polynomial)" and this plan repeated it. **Review corrected the successor**: the term
  most worth adding is not a polynomial but an OFFSET — a black-level lift or veiling flare is
  affine, not non-linear, and a 3×4 removes it exactly. Measured on the constructed card, a 1 %
  veiling lift costs 3.6 ΔE00 on a dark patch and 0.33 on a light one, which is the error
  landing hardest on the colours this corpus is made of. The residual is what says it is needed.
- **No open questions.** OQ-3 closed today. Its obligation 2 is not an open question — it is
  work this feature deliberately does not do.

## Out of scope

- **Criterion 2** — `attested`, discharged by F-063's device matrix session.
- **Any vendored reference values.** ADR-0085 obligation 2 is unmet, and inventing values would
  be fabricated provenance in the one place it would be least forgivable.
- **Multi-region frame sampling in the worklet**, and the calibration screen that depends on it.
  `sampleFrame` reads one centred square; twenty-four patch regions changes the frame-processor
  contract and can only be verified on a device. **Filed as its own feature**, on the precedent
  of F-081 ("deliberately NOT half-built") and F-086 ("deliberately not done in F-085").
- **An offset term (3×4) or a polynomial correction.** The 3×4 is named as the successor and
  the reasoning is in `solve.ts` with the numbers behind it; the residual is what justifies it.
