# Plan: F-236 — Empty, working, refused and denied are mockup 27

| | |
|---|---|
| **Feature** | F-236 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-9, NFR-8 (and FR-18, FR-15, FR-17 touched through the Lens's refusal and steps) — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/ui` · `@irodora/design-tokens` · `@irodora/color-sampling` (one additive field) |
| **Author** | The planner subagent, adopted with the amendments below by the implementing session |
| **Date** | 2026-10-08 |

---

## Intent

Today the product shows these states as an R7 picture with a grey sentence, a skeleton, a sentence
about the camera with no way to settings, or nothing at all. After this feature, every place with
nothing to show draws one of four designed states, as mockup 27 draws them:

- **empty:** the hanger with its blossom, a heading, a body and a way to fill it;
- **working:** the ring with the mark, two monospace steps, a heading and a body;
- **refused:** the amber glare tile, a heading, the reason with its threshold, and retry;
- **denied:** the camera and lock, a heading, a body, and Open Device Settings.

Every screen declares which of the four it shows in each data condition, and a test holds it to that.

For a person: an empty wardrobe says so and offers the Lens; a capture in flight says what the
pipeline is doing, with the real step and D65 at its real temperature; a capture too poor to read
says why, against the engine's own threshold; a denied camera offers the settings page. No screen
shows a blank box or a 0 standing in for "nothing".

## Approach

### Readings chosen (decided here, recorded in ADR-0128 and ADR-0129)

| # | ambiguity | reading chosen | why | alternatives (in the ADR) |
|---|---|---|---|---|
| D1 | When does the Lens refuse? | A held capture (still or photo) whose `quality === 'poor'`. FR-18: *"Poor quality blocks a confident claim and returns a specific, actionable instruction."* The reason shown is the engine's first failed check, in its own fix-first order. | The engine's own classification, so no new threshold is invented; it gives the bottom class the distinct outcome 27 draws. | Refuse only when `!worthOffering` (too narrow: only total rejection). Keep showing poor readings (then the refused state is never reached). |
| D2 | Which picture does each state draw? | Fixed per component, as criterion 1 names them: empty (27 form) = `hanger` with its blossom; refused = the glare tile; denied = `camera-locked`; working = ring + mark. | Criterion 1 is the contract, and the pictures are decorative: the words carry the state (Illustration rule 3, golden rule 13). | Art or glyph keyed by what is missing or why it refused: undrawn variants chosen by an agent. |
| D3 | An empty whose fix is on the same screen (`resolvedHere`): 27 draws an action button. | `EmptyState`'s union picks the drawn form: `action` gives 27's card (art, heading, body, primary); `resolvedHere` gives board 00's empty (`00.empty`: `no-results` art and a caption message). Both inventories name `ui:EmptyState` (P3). | Keeps F-139's rule (no second control for an on-screen fix) without leaving out a drawn element. | 27's card minus its button (a departure no rule forces). |
| D4 | The working ring's value | `done / steps.length` over the capture pipeline's two steps, which are also the two chips. It renders 0 in practice. | Never an invented percentage. F-231's precedent: 14's ~80 % fill is sample content (§8 row 14, E1). | Elapsed / `CAPTURE_TIMEOUT_MS`; an indeterminate arc. |
| D5 | What the two chips say (criterion 3) | Chip 1 is the step under way: camera *"Waiting for a camera frame…"*, photo *"Decoding the photo…"*. Chip 2 is the step that follows: *"Converting to OKLCh under D65 (6504 K)"* — D65 from `CANONICAL_WHITE`, 6504 K the published CCT, cross-checked by McCamy from the engine's D65 chromaticity. | 27's two slots: an ellipsis on the current step, a fact on the second. Real steps and the real reference illuminant. The pipeline calibrates nothing (FR-17 classifies). | — |
| D6 | Permission `undetermined` (27 draws only denied) | The same 27 card with *Allow Camera Access* in place of *Open Device Settings*. A new §4 E4 bullet: the platform forces an in-context request before any camera use. | A capability no mockup draws, composed from 27's own card. | — |
| D7 | What is a "data condition" | A state of the data a panel exists to show: absent (empty), pending (working), refused by the pipeline (refused), not permitted (denied). Feedback about an action just taken (Lens `failed`, AddGarment's refused file, Export saved/failed) is not one of the four; `CameraUnavailable` (F-117's error boundary for a build defect) is a fault and is excluded, with the reason. | F-152 found store reads synchronous, so loading exists only where time is real. | — |
| D8 | 27's tints in Washi | The same values in all four palettes (F-232's glyph-group precedent), decoration with `uncheckedReason`. | No gate forces a move, and 27 draws only Sumi. | Re-anchor per theme. F-267 compares. |
| D9 | Spelling | Catalogue English: *"Analysing Fabric Colour…"*. | 27 contradicts itself in one card (*"Colour Lens"* / *"Fabric Color"*); the catalogue's spelling resolves it. | — |
| D10 | Confidence on the refused state (F-222's note) | None is printed: 27 draws none. The sweep asserts no refused subject prints a confidence in any format, in both locales. | Discharges the 27 half of F-222's attested criterion. | — |

### Reused

- **`EmptyState`** (`packages/ui/src/EmptyState.tsx`): its union is rebuilt. **`Illustration`**: `hanger`, `no-results`, figure/backdrop tone, `color` (widened).
- **`Mark`, `MARK_INKS`, `markInkBox`** (`brand.tsx`). **`Glyph`**: `camera-locked`, `glare`, the `SPECTRUM_GLYPHS`/`glyphSpectrum` colour-layer pattern for the padlock.
- **`Card`** (level 1, edge, `md`), **`Button`** (primary pill, `height`), **`Chip` `form="badge"`**, **`Text`**, **`hitArea`**, **`useTheme`**.
- **`dialArc`** (`CoverageDial.tsx`) for the ring; **`ProgressBar`**'s doctrine (a progress a person must be told about is a `progressbar` with a label and a value).
- **`confidenceText` / `secondConfidenceFormats`** (`percent.ts`, `testing/confidence.ts`).
- The conformance suite, the ui registry and the app registry `SCREENS` with its `ja` pass.
- **Engine:** `assessQuality` and `QUALITY_THRESHOLDS` (`color-sampling/src/quality.ts`); `read`/`readManual` (`lens/modes.ts`); `CANONICAL_WHITE`/`D65` (`color-spaces/src/whitepoints.ts`); `nextCapture` and `CAPTURE_TIMEOUT_MS` (`lens/capture.ts`); `permissionState` (`lens/permission.ts`).
- **Mockup tools:** `measure.ps1`, `corner.ps1`, `tint.ps1`, `mark.ps1` + `mark-fit.mjs`, `glow-fit.mjs`, `serif-weight.mjs --em`; the F-231 glow generator only if D11 finds a halo.

### New

- **`packages/ui/src/ProgressRing.tsx`** (`new:ProgressRing`): a full-circle track in `border` and a fill arc in `foreground`, clockwise from 12 o'clock, drawn with `dialArc`; `value` ∈ [0, 1] (RangeError otherwise), `label`, `valueText`, `size`, `stroke`, `children` (the mark); `accessibilityRole="progressbar"`, `accessibilityValue {min, max, now, text}`, `accessibilityState {busy: true}`; static (F-266 owns any motion).
- **`WorkingState.tsx`, `RefusedState.tsx`, `DeniedState.tsx`**, plus the rebuilt **`EmptyState.tsx`**: copy from the caller (ADR-0056); each root a fixed `testID` (`state.empty`, `state.working`, `state.refused`, `state.denied`), parts `state.<kind>.<part>`; `StateKind` and `STATE_TEST_IDS` exported.
- **`packages/ui/src/stateBoard.ts`**: 27's board scale `k` (dp/px) and each drawn dimension as `px × k`, snapped, recomputed by test from `mockups/inventory/27.json`.
- **`Text` face `'mono'`** (iOS `Menlo`, Android `monospace`, Latin only; Japanese resolves to the gothic, C6); `Chip` badge `mono`.
- **`Illustration` `tint`** (hanger body only, typed); a tinted padlock on `Glyph` `camera-locked`; **`MARK_INKS`** gains `state.mark`.
- **Tokens** (dark + light, decoration, `uncheckedReason`, `pairsWith: []`), measured in increment 1, as one C10 **token group** minted by F-236: `state.hanger`, `state.mark`, `state.refused.plate`, `state.refused.edge`, `state.refused.glyph`, `state.lock`. A token whose measured chroma is ≤ 0.026 is dropped from the group and the nearest neutral token used.
- **Engine (additive, no value moves):** `QualityCheck`, a `QUALITY_CHECKS` ordered tuple (fix-first), `QualityAssessment.failures`; `LensReading.qualityFailures` set by `read()` (`readManual` sets `[]`).
- **`apps/mobile/src/lens/pipeline.ts`** (pure): `D65_CCT_K = 6504` with citation; `captureSteps({ source, awaiting, opening })`; `convertStepText`.
- **`apps/mobile/src/lens/refusal.ts`** (pure): `refusalOf(reading)`, `refusalText(check, t, script)` — heading, and body from the quantity, comparator and threshold in `QUALITY_THRESHOLDS`, then the check's instruction.
- **`apps/mobile/src/states.ts`**: `DataCondition`, `ScreenStates`; every module in `src/screens/` exports `STATES` (possibly `{}`).
- **Conformance rules:** `blank-panel` (a surface-painted node or `Card` with no text, name or image beneath it), and the app-side zero rule (no bare zero figure in a subject that declares a condition).
- **ADR-0128** (the four states, their drawings, their bindings) and **ADR-0129** (a screen declares its data conditions and the state each shows).

### Increments (each green; one commit each)

0. **Claim and plan.** `F-236` → `in_progress`; add `color-golden` to its verification and `00` to its mockups, with the reason; this plan. Gate: `state`.
1. **Measure, then decide.** Over `27_states_board.jpg` (and `00.empty`): k (dp/px) from the drawn em of every text element against its role's step, median (expected ~0.9–1.0); the insets and gaps; the ring (diameter, stroke, cap, start, direction); the mark (`mark-fit.mjs`, `tint.ps1`); **D11, the halo** (`glow-fit.mjs`: if drawn, `27.lens-working.glow` joins the inventory and C10); the chips (height, em, ink, padding, gap, corner); the tile (size, corner, fill, edge, glyph); `camera-locked`'s stroke against `size.iconStroke`; the hanger's body and sprig inks. Then ADR-0128 and ADR-0129, R9 §5 (27's scale) and §4 E4 (D6). Gates: `state`, `verify-mockups` (if the inventory changed), `format`.
2. **Mint the tints** in the manifest as a C10 token group replacing the element exception; regenerate; `c10-exceptions`, `cvd/mark`, §6's C10 row. Gates: `typecheck`, `test`, `contrast`, `cvd`.
3. **The mono face** (`Text`, `Chip` badge) with `text-face.test` (platform family; ja → gothic; a decoy). Gates: `typecheck`, `lint`, `test`, `a11y`.
4. **`ProgressRing`** with its test (arc length = value × 360°, nothing else moves with the value; tokens in both themes; RangeError; progressbar semantics). Gates: `typecheck`, `lint`, `test`, `a11y`, `contrast`.
5. **The tints reach their three drawings**: the hanger's `tint`, the padlock layer, `MARK_INKS` + `state.mark`; a single-consumer scan with a decoy; `mark-census` still one excepted mark. Gates: `typecheck`, `test`, `contrast`, `cvd`.
6. **`WorkingState`, `RefusedState`, `DeniedState`** and `states.test.tsx` — the 27 sweep (presence, order, tokens, k-sizes, centring) and accessibility (one announcement on mount, none on re-render; progressbar; decorative parts hidden; headings; hit areas). Gates: `typecheck`, `lint`, `test`, `a11y`, `contrast`, `cvd`.
7. **`EmptyState` rebuilt, with every call site** (two forms, `art` removed; the Wardrobe's 27 copy → `/lens`; R7's three drawings retired). Gates: `typecheck`, `lint`, `test`, `a11y`, `contrast`, `build`.
8. **The engine names its failures** (`QualityCheck`, `QUALITY_CHECKS`, `failures`; `LensReading.qualityFailures`) with property tests. Gates: `typecheck`, `test`, `color-golden`, `build`.
9. **The pipeline and the refusal, as pure modules**, with `lens-pipeline.test` (McCamy within 2 K of 6504; 27's 5500 K and D55 as decoys) and `lens-refusal.test` (fair/good/excellent decoys; a `Record` over every check; thresholds read, not retyped). Gates: `typecheck`, `lint`, `test`.
10. **The Lens wears the three states** (denied/undetermined, working, refused with the sheet shut; retry per source); catalogue keys; the POOR test becomes "a poor capture is refused", with no confidence printed. Gates: `typecheck`, `lint`, `test`, `a11y`, `contrast`, `cvd`.
11. **The inline absences become `EmptyState`**: Home's two (27 form), and 00's form on Atlas, Finder, PaletteStudio, Combinations, Contemporary, ColourDetail, Compare, ColourCard and Wear. Gates: `typecheck`, `lint`, `test`, `a11y`, `contrast`.
12. **Every screen declares** (`STATES` everywhere; `ScreenSubject.shows` typed from them; `checkBlankPanels`; the zero rule). Gates: all.
13. **Close-out**: effects E-185…, documents (R9 §6 C10, §8 row 27, §4 E4; DESIGN-SYSTEM.md; ACCESSIBILITY.md §6), F-222's attested entry, F-236's attestation, downstream notes, `progress.md`. Then the evaluator, once.

## Mockup fidelity

- **Governing:** `27` (P2: state content) for the Wardrobe's empty and the Lens's working, refused and permission states; `00` (P3) for `EmptyState`'s `resolvedHere` form; `26` for Japanese copy and typography. `25` is not used: 27 draws no light state (D8).
- **Scale:** board, `dpPerPx: null`. Type takes its role's step; all other geometry is inventory px × k, snapped, held by test.

| element | drawn (px) | built | tokens | binding / copy |
|---|---|---|---|---|
| 27.wardrobe-empty | card 297×544, corner 10.5 | `EmptyState` action form: `Card` level 1, edge, `md` | surface.1, border | — |
| .art | 175×127, centred, 69 below top | `Illustration hanger`, figure, `tint="state.hanger"` on the body | state.hanger + neutral | — |
| .title | 2 lines, centred | `Text title 600 heading` | foreground | `wardrobe.empty.title` *Your Wardrobe is Empty* |
| .body | 4 lines, centred | `Text body` | foreground.2 | `wardrobe.empty.body` (27's sentence) |
| .scan | pill 255×46, inset 21 | `Button` primary, stretched | accent | `wardrobe.empty.scan` *Scan First Garment* → `/lens` |
| 27.lens-working | card 298×543 | `WorkingState` | surface.1, border | — |
| .progress | ring 138 | `ProgressRing`, value = done/2 (D4) | foreground / border | `engine:lens.progress` → `captureSteps` |
| .mark | ink 78 | `Mark color="state.mark"`; halo per D11 | state.mark | — |
| .step-1 | chip 241×30 | `Chip badge mono`, `sm` | surface.2 + measured ink | `engine:lens.pipeline.0` → the step under way (D5) |
| .step-2 | chip 254×29, 7 below | as above | as above | `engine:lens.pipeline.1` → *Converting to OKLCh under D65 (6504 K)* (E2) |
| .title | 2 lines | title 600 heading | foreground | `lens.working.title` *Analysing Fabric Colour…* (D9) |
| .body | 2 lines | body | foreground.2 | `lens.working.body` (27's sentence) |
| 27.lens-refused | card 298×518 | `RefusedState` | surface.1, border | — |
| .icon | tile 99, `md`, amber edge | plate, edge and `Glyph glare` in the three tints; hidden | the three tints | — |
| .title | 3 lines | title 600 heading | foreground | `lens.refused.title` *Reading Refused* + `: ` + the check's name (E2: never "measurement") |
| .body | 3 lines | body | foreground.2 | `engine:lens.refusal.reason` → quantity, comparator and threshold from `QUALITY_THRESHOLDS`, then the instruction (§8 row 27) |
| .retry | pill 256×46 | `Button` primary | accent | `lens.refused.retry` *Retry Capture* → shutter (camera) / dismiss (photo) |
| 27.lens-permission | card 297×518 | `DeniedState` | surface.1, border | — |
| .icon | 105×89 | `Glyph camera-locked`: camera in foreground, padlock in state.lock; hidden | foreground, state.lock | — |
| .title | 2 lines | title 600 heading | foreground | `lens.permission.title` *Camera Access Needed* |
| .body | 3 lines | body | foreground.2 | `lens.permission.body` (27's sentence — true: no server, no INTERNET permission, gate 16) |
| .settings | pill 255×46 | `Button` primary, `accessibilityHint` | accent | `lens.permission.openSettings` → `Linking.openSettings()`; ask form `lens.permission.allow` (D6, E4) |
| 00.empty / .art / .message | 81×83; art 55×42; 2-line caption | `EmptyState` resolvedHere form | foreground.2 | the caller's message (+ hint) |

- **Japanese copy** (authored, gothic): 読み取り, never 測定 (E-089). New kanji pass `verify-font-coverage` or the subset is regenerated.
- **Departures**, each listed in the spec: `27.lens-refused.title` (§4 E2 row "02 27"); `.step-1` and `.step-2` (§4 E2 row "27"); the refused body's *"deterministic accuracy threshold"* (no accuracy claim; §8 row 27 binds the engine's reason); the undetermined-permission ask (D6 → a new §4 E4 bullet). Spelling (D9) is recorded in ADR-0128. **No other departure; if increment 1 finds one the spec does not list, stop.**
- **Nothing 27 draws lacks a capability** once D4 and D5 bind the ring and the chips. The drawn fill (E1), the spectrum and 5500 K (E2) do not reach the build.

## Files to touch

```
packages/color-sampling/src/quality.ts, index.ts + test       — QualityCheck, QUALITY_CHECKS, failures (no value moves)
docs/design/design-system.manifest.json + generated tokens    — state.* tokens; the C10 token group
packages/design-tokens/test/c10-exceptions.test.ts, cvd/mark.test.ts
packages/ui/src/ProgressRing.tsx, WorkingState.tsx, RefusedState.tsx, DeniedState.tsx, stateBoard.ts (new)
packages/ui/src/EmptyState.tsx, Illustration.tsx, Glyph.tsx, brand.tsx, Text.tsx, Chip.tsx, index.ts, testing/conformance.ts
packages/ui/test/states.test.tsx, progress-ring.test.tsx (new); conformance, illustrations, glyphs, brand, text-face, badges tests
apps/mobile/src/lens/pipeline.ts, refusal.ts (new), reading.ts, modes.ts, CameraLens.tsx
apps/mobile/src/states.ts (new); src/screens/*.tsx; app/(tabs)/wardrobe/index.tsx; src/i18n/en.ts, ja.ts
apps/mobile/test/screens.test.tsx, home-states.test.tsx, lens*.test.ts, wardrobe.test.ts, lens-pipeline.test.ts, lens-refusal.test.ts
mockups/tools/inventory-data/27.mjs, mockups/inventory/27.json — only if D11 finds a halo
docs/adr/0128-*.md, 0129-*.md, README.md; docs/design/R9-MOCKUP-FIDELITY.md, DESIGN-SYSTEM.md, ACCESSIBILITY.md
.harness/state/*, .harness/memory/effects/*
```

## Anticipated effects (new ids from E-185)

| id | from → to | guard |
|---|---|---|
| **E-185** (high) | `color-sampling#QualityAssessment.failures` → `LensReading.qualityFailures`, `lens/modes.ts`, `lens/refusal.ts`, every `LensReading` literal | the quality test (order, instruction, count; decoy); `typecheck`; `color-golden` |
| **E-186** (high) | `lens/refusal.ts#refusalOf` (poor → refused) → the Lens sheet, the profile and wardrobe hand-offs, ProfileSetup's photo estimate, F-244, F-222's Lens fixture | `lens-refusal.test` (decoys); the Lens screen tests; `lens-capture.test` |
| **E-187** (high) | `ui/EmptyState#EmptyStateProps` (two forms, no `art`) → every call site; R7's three drawings deleted | `typecheck`; the states sweep; the declarations test; `illustrations.test`. Update **E-137** |
| **E-188** (medium) | the `state.*` token group → `MARK_INKS`, the hanger tint, the padlock, `RefusedState`; c10, census, cvd, brand tests | those tests; gate 9; the single-consumer scan. Update **E-172** |
| **E-189** (low) | `ui/Text#Face` + `'mono'` → `Chip` badge, `WorkingState` | `text-face.test` |
| **E-190** (medium) | `lens/pipeline.ts` (steps, ring value, `D65_CCT_K`) → `WorkingState`, F-243, F-266 | `lens-pipeline.test` |
| **E-191** (high) | `states.ts` + every screen's `STATES` + the blank-panel and zero rules → every subject and every future screen feature (F-242–F-263) | the declarations test, both directions, with decoys |
| **E-192** (low, only if D11) | `generate-brand-assets.mjs` → `working-glow.png` → `WorkingState` | `--check`, `--prove` |

Also update **E-177**: the 27 half of the confidence criterion is discharged because 27's refused state prints none, asserted.

## Test plan

- **Golden:** D65's CCT by McCamy from color-spaces' `D65` (6505.1 K against the published 6504 K); decoys 27's 5500 K and D55 (~5503 K). No engine golden value changes; `color-golden` run as evidence.
- **Property:** for random regions, `failures` ordered by `QUALITY_CHECKS`, `quality` from `failures.length`, `instruction` from `failures[0]`.
- **Conformance:** every new component in both themes; both `EmptyState` forms; the 27 sweep plus `00.empty`; the app registry in en and ja.
- **Negative, each with a decoy:** a `fair` capture is not refused; a subject declaring `empty` that renders a bare `<Text>` is refused; a planted "0%" / "0 pieces" / "0件" in a declared subject is refused, while "Showing 0 / 120" and "#20232A" pass; a planted empty `<Card>` is a blank panel and a `Surface` holding a labelled `Swatch` is not; a screen module without `STATES` is named, and so is a declared condition with no subject; a second `state.mark` consumer is named; `Mark color="status.ok"` and a tint on `kimono` are type errors; working and refused announce once, and a re-render does not re-announce; the refused subjects print no confidence in any format.
- **E2E:** not runnable here.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck · pnpm lint · pnpm format:check · pnpm test · pnpm build
pnpm test:a11y · pnpm test:contrast · pnpm test:cvd · pnpm test:golden
node scripts/generate-design-tokens.mjs --check
node scripts/verify-mockups.mjs (if 27 changes) · node scripts/verify-font-coverage.mjs
node scripts/generate-brand-assets.mjs --check (only if D11)
```

**Not runnable here, and said so:** pixels beside 27 (F-221 is blocked); VoiceOver and TalkBack speaking the announcements; `Linking.openSettings()` landing on Irodora's page; 200 % text layout; e2e.

## Attestations

- **F-236, criterion 1** (quoted verbatim): the 27 sweep asserts structure, order, tokens, k-sizes and accessibility; the pixels beside 27, the spoken announcements and the settings deep link need a device. `blocks: release`, `outstanding`.
- Criteria 2 and 3 are gated (the declarations test; the pipeline and refusal tests).
- **F-222's** attested entry: the 27 half discharged (none printed, asserted); it stays outstanding for 03 (F-244).

## Risks and open questions

1. **R1, D1 (largest):** a poor capture is no longer shown at a capped confidence; FR-18's *poor* band leaves the readout, and poor readings cannot be handed off. A person may prefer the old behaviour; flagged to F-267.
2. **R2, R3:** fixed pictures — a glare tile on a blur refusal; hangers on Home's no-readings, Export and Preferences; Home's first run gains up to two 27 cards (F-242 composes).
3. **R4:** the ring renders at 0 in practice (E1, §8 row 14's precedent).
4. **R5, R9:** k is an estimate; 27's icon line may exceed `iconStroke` — both measured in increment 1.
5. **R6, D8:** a lilac mark on a white Washi card is faint.
6. **R7, D11:** the halo's existence and its asset plumbing.
7. **R8:** a data condition with no subject is invisible to the declaration test (ADR-0129 states the limit).
8. **R10:** the engine zone — run `color-golden` and read `packages/color-core/AGENTS.md` before increment 8.
9. **R11:** new kanji may need a subset regeneration (E-017, E-174).
10. **Pre-existing, not this feature's:** the Lens readout prints the engine's English `instruction` in Japanese too — check the backlog; record it if absent.

## Out of scope

Motion of the ring or the mark (F-266); the states inside 01/02/11's compositions beyond replacing today's branches (F-242, F-243, F-255); OQ-8's states (F-243); per-reason refusal pictures and per-absence empty art (D2); refusing live readings; Export, AddGarment and Lens-failure feedback (D7); `CameraUnavailable`; captures beside mockups (F-221) and the person's comparison (F-267); translating the engine's instruction strings.

## Notes for downstream (written into each feature's notes at close-out)

- **F-242:** Home's two absences are 27 cards; compose them in 01 and keep `STATES` current.
- **F-243:** place `WorkingState`, `RefusedState` and `DeniedState` in 02's layout; retry per source; `state.mark` is 27's only.
- **F-244:** the sheet opens only when `refusalOf` returns null; the confidence chip goes through `confidenceText`.
- **F-246 … F-263:** compose `EmptyState`'s two forms; never a bare absence; keep `STATES` and each subject's `shows` in step.
- **F-255:** 27's empty is the Wardrobe's (*Scan First Garment* → `/lens`).
- **F-266:** the ring's arc length is not a transform; animating it needs a decision against `motion.animatable`.
- **F-267:** compare D1, D2, D4, D8, D9 and the k-scaled sizes by eye; each is ⇄ in ADR-0128.

## Amendments on adoption (the implementing session)

1. **Adopted as written**, readings D1–D10 included, so the one review can contest them. D1 was checked against the PRD before adoption: FR-18 says *"Poor quality blocks a confident claim and returns a specific, actionable instruction"*, and R9 §8's row for 27 already binds the refusal to *"the Lens's own refusal reasons and thresholds"* — so the trigger is the engine's own class, not a threshold this feature invents.
2. **Increment 0 does not write `progress.md`**; the history records finished work.
3. **One review, then fix or record**, after increment 13 (AGENTS.md loop step 5).
4. **Ids confirmed free:** ADR-0128 and ADR-0129 (the index ends at 0127); E-185 onwards (the graph ends at E-184); F-322 onwards for any backlog (the list ends at F-321).
5. **Scope is large; increments may split** where one would not end green — each split is recorded in its Status row, never folded silently.
6. **A measured reading that contradicts this plan wins** (as in F-231): if increment 1 moves a value or finds a drawn element no row above names, the later increments take the reading, and a drawn element the spec does not list stops the feature for a decision recorded in ADR-0128.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claimed; this plan (the planner subagent's, adopted with six amendments). |
| 1 | this commit | **27 re-read; eight readings move the plan (amendment 6).** (1) **k = 0.973 dp/px**, the median of the 13 text elements' ems (ascender height over 0.73) against their steps: titles 0.845–0.918, bodies 0.973–1.062, buttons 0.973, steps 1.022; corners agree. (2) **The bodies are white** (luma 245–247 at p95, out of `foreground.2`'s reach): `foreground`, not `foreground.2`. (3) **The steps sit on `level3`** (ΔE00 1.40; level2 2.56) in `foreground`, 28 dp, `sm`, and their text is a **narrow monospace**: 0.49 em advance, where the platform monos are 0.60 and the second step would overflow its card at label 14 — increment 3 reads the face off the drawing (an ADR there). (4) **The ring's track is `level3`** (1.71; border.subtle 2.71), the ring 132.5 dp, stroke 7. (5) **The refusal plate's corner is `lg`** (14.0–14.5 px), the plate 95 dp, its edge 3 dp, its slash in the edge's amber. (6) **D11: the halo is drawn and RADIAL** — `glow-fit.mjs --radial` (new, calibrated: three profiles within 0.002 beyond the ink, 14's blurred mark read as mark-shaped at 0.90) reads modulation 0.037 and a blurred disc (radius 30.5 px, σ 8.08, alpha 0.296): an SVG radial gradient, so **E-192 and the generator are not needed**; `27.lens-working.glow` joins the inventory, C10 and the manifest's 27 exception. (7) **The pictures' lines are 27's own** (hanger 2 dp, glare 2.5, camera 3.5): `Illustration` and `Glyph` gain a bound `stroke` (increments 5–6); the hanger's lines are `foreground`. (8) **`camera-locked` differs from 27** (squarer, smaller lens, no flash dot or keyhole): increment 5 redraws it from the recorded geometry. Also: the mark is 27's fifth drawing (an outline), C4 builds 14's blossom at 51 dp; the cards' boxes are their fills (F-220's ran into the shadow); the composition is padding `md` + picture `xxl` + `xl` + `md` + a spacer of at least `xxl`. The schema gains the `mono` face and F-236's raw fields. ADR-0128 and ADR-0129; R9 §4 E4 (D6), §5 (27's scale), §6 C4, C10 and the exceptions table. Gates: state, verify-mockups, format, lint; design-tokens vitest (397) and the ui suites that read inventories (299). |
| 2 | this commit | **27's six tints minted** as one C10 token group (`state.hanger`, `state.mark`, `state.refused.plate`, `state.refused.edge`, `state.refused.glyph`, `state.lock`), OKLCh from increment 1's core readings, decoration with an `uncheckedReason`, the same in Sumi and Washi (Slate and Obsidian take Sumi's: none is re-anchored). The group carries 27's five elements and retires their element exception in its place (the C10 census asserts both). **The tinted mark's ground is now a CVD pair**: `state.mark` on `surface.1` is declared, and `cvd/mark.test` reads 27's mark with its minted ink rather than skipping it — it separates in all four palettes under every deficiency. The six tokens are exempt from token reach until increment 5 gives each its reader (`closedBy: F-236`). R9 §6's exceptions row records the minting. Gates: design-tokens vitest (410), typecheck, contrast, cvd, token reach, format, state, test (35/35). |
| 3 | this commit | **The mono is a bundled face, not the platform's (amendment 6; ADR-0130).** Re-read: 27 advances 6.77 px (the comb fitting each line's character cells) against a 9.79 px cap (median of ten capitals and figures) — 0.69 of the cap, where SF Mono, Menlo, Roboto Mono and their kind advance 0.84–0.86 and the second step's real copy would overflow its card. Shape cannot name a face at a 10 px cap (34 open-licence monos from google/fonts, 161 instances, top twelve within 0.04 by `serif-match.ps1`); proportion can, and **Inconsolata's width axis reaches it: width 83 (advance 0.432, cap 0.623 → 0.693), weight 600** (`stem.ps1` against rendered instances reads 554–650 across both lines and both spaces). Its em is then 15.3 dp, so the steps are **`body`, not `label`**. Cut static by `generate-font-subset.mjs` from a source pinned in `font-sources.json` (the same commit as Gelasio; name rebuilt, record 3 names both axes; the serif's and mincho's bytes unchanged), held by `verify-font-coverage` (Latin requirement, weight 600), named `mono` in the manifest (own line 1.05), loaded by `fonts.ts`. `Text` takes `face="mono"` at body only (another step, weight or `numeric` is a type error; Japanese → the gothic); the `Chip` badge takes `mono` and a `surface.3` fill. Tests: `text-face` (family, weight, tracking, ja → gothic, three type refusals), `badges` (mono on surface.3 at 16, a sans decoy at 14, two refusals), `fonts` (four faces), `typography` (the emitted faces now serif and mono in Latin). 27's inventory records the steps as mono · body · 600 with their readings; NOTICE.md, ADR-0130, ADR-0128 §5 pointed at it, R9 §5. **Also fixed: a lint error increment 2 committed** in `cvd/mark.test` (a ternary `prefer-nullish-coalescing` refuses) — increment 2's gates did not include lint, so the tree was red on lint between `be0d4d3` and this commit. Gates, each exit 0: format, font-subset `--check`, font coverage, tokens `--check`, mockups, state, typecheck, lint, test (35/35, after the typography test was updated — the first run failed it), a11y (21/21). |
| 4 | this commit | **`ProgressRing`** (`@irodora/ui`): a full circle in `surface.3` (27's track is `level3`, increment 1) and a fill arc in `foreground`, clockwise from 12 o'clock with round caps, drawn by `dialArc`; a full value draws the whole circle (an SVG arc cannot), an empty one draws no fill (a zero-length round cap would paint a dot). `value` outside [0, 1] or not finite is a RangeError. One `progressbar` with its label, `{min 0, max 100, now, text}` and `busy` until full; its centre (the mark, later) is hidden. Static: F-266 owns motion. **`stateBoard.ts`** starts here with `STATE_BOARD_K` 0.973 and `STATE_RING` (132.5 dp, stroke 7), recomputed by `progress-ring.test` from 27's `radiusPx` and `strokePx` (F-220's 138 px box as the decoy). Tests: `progress-ring` (10: 27's size and stroke and tokens, both themes, arc = value × 360°, full and empty, nothing else moves with the value — with a decoy that the paths do differ —, the RangeErrors, the progressbar semantics, the hidden centre); conformance gains the ring in en and ja. Gates, each exit 0: format, typecheck, lint, contrast, a11y (21/21), test (35/35). |
| 5 | this commit | **The drawings can take 27's tints and lines.** `Glyph` gains `stroke` (a picture binds its drawn line, converted into the grid at its size; icons keep `size.iconStroke`) and named tint LAYERS (`lock`, `slash`) a surface fills from its tokens — not ADR-0110's spectrum, which a control applies to an icon everywhere. **`camera-locked` and `glare` are re-drawn from 27** (amendment 6): the camera's body, hump, lens, flash dot and keyhole from `27.lens-permission.icon`'s readings (the lock re-read edge to edge: 32 px, 6.14 units), its line stopping short of the lock; the glare's sun 4.15 and its slash stopping at the rays' tips (new raw `sunPx`, `rayInnerPx`, `rayOuterPx`, `slashPx`; the plate's glyph is 67.5 dp, not 69 — ADR-0128 §3 corrected). `Illustration` gains `stroke` and 27's hanger form, typed: `name: "hanger", color: "foreground", tint: "state.hanger"` — the body tinted, hook and sprigs white; a tint elsewhere, foreground without the tint, or another tint is a type error. `MARK_TINT` (`state.mark`) sits beside `MARK_INKS`, which stay the neutral inks the brand test holds achromatic; `Mark` takes either. Token reach now reads `state.hanger` and `state.mark`, so the exemption narrows to the four increment 6 reads. **Moved to increment 6:** the single-consumer scan (no surface reads a tint until the states exist). Tests: `glyphs` (+5: the bound line and its decoy, both tint layers and their decoys, the camera's and the glare's proportions against 27's readings within 2 %, with F-228's slash as a decoy), `brand` (+1: the tint, and a decoy that it is chromatic), `illustrations` (+3: the hanger form, an untinted decoy, three type refusals). Gates, each exit 0: format, typecheck, lint (two arrow helpers braced after its first run), mockups, test (35/35), contrast, cvd, token reach. |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |
| review | | |
