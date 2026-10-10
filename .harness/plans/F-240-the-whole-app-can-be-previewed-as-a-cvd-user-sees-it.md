# Plan: F-240 — The whole app can be previewed as a CVD user sees it

| | |
|---|---|
| **Feature** | F-240 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-10, FR-5 (FR-4's models and NFR-9 are touched) — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/ui` · `@irodora/design-tokens` (one new pure module). `@irodora/cvd-engine` is used and **not changed** |
| **Author** | The planner subagent, adopted by the implementing session (see *Amendments on adoption*) |
| **Date** | 2026-10-09 |

---

## Intent

Today the product simulates colour-vision deficiency in one place, the colour detail's vision tab, at
swatch size. After this feature, a person opens Preferences, chooses **Protanopia**, **Deuteranopia**
or **Tritanopia** in the row `15` draws under *2. Accessibility & Colour-Vision Deficiency (CVD)
Mode*, and every screen repaints through the engine's own simulation. That covers every chrome token
in whichever palette is painting (Sumi, Washi, Slate, Obsidian or the runtime device palette) and
every colour sample. While the preview is on, a strip above the tab bar says in words that a
simulation is running, which model it uses, and what it does not reach (photographs, the camera and
anything the system draws).
**Standard** turns it off. Nothing the person stores or exports changes, and the preview itself is
never stored: it is gone after a restart.

To a person, "done" means: they can check whether their wardrobe, palettes and the app's own states
stay distinguishable under each simulation, without being misled about what they are looking at.

## Approach

### Readings chosen (decided here and recorded in ADR-0131, under R9 §11's delegation of 2026-10-05)

| # | ambiguity | reading chosen | why | alternatives (in the ADR) |
|---|---|---|---|---|
| **D1** | What each chip runs | **One function for all three: `simulateAnomalous(rgb, deficiency, CVD_SEVERITY)`** (Machado 2009 at its strongest tabulated severity, 1.0), applied to encoded sRGB as the engine specifies. Protanopia uses `protan`, Deuteranopia `deutan`, Tritanopia `tritan`. `simulateDichromacy` is never called, so the engine's tritan refusal is never reached and never bypassed. | (a) Criterion 1 asks for *one simulation, the engine's*. (b) The model's authors define 1.0 as the dichromacy case for protan and deutan, and per DaltonLens they tuned it to match Brettel 1997. (c) Chrome DevTools and Firefox ship these matrices under these words: Chrome's published deuteranopia matrix is Machado's deutan at 1.0 to its printed three decimals (held by a test in increment 2), and Firefox moved to Machado 1.0 for its "-opia" modes in Bug 1655053. (d) **The deciding constraint is specific to React Native.** RN has no whole-screen filter, so the preview simulates each token and sample and lets the platform composite them. A matrix applied to encoded sRGB is linear in encoded values, so it commutes with encoded alpha compositing (exact up to clipping and 8-bit rounding). Simulating each translucent token, shadow or dimmed control therefore equals simulating the composited pixel. Viénot is a projection in linear light and does not commute, so a token-layer Viénot preview would misstate every translucent paint. | Viénot for protan/deutan with Machado for tritan (two simulations, non-commuting). Tritanopia disabled (fails criterion 1 and rule 14). Implementing Brettel tritan (F-008's open decision). Severity below 1. A native or SVG `feColorMatrix` filter (the renderer's arithmetic, a second implementation). |
| **D2** | What each chip is called | `15`'s words, **Standard · Protanopia · Deuteranopia · Tritanopia**. Japanese follows the Japanese Ophthalmological Society's 2005 terms: 標準 · 1型2色覚 · 2型2色覚 · 3型2色覚. These are medical terms, not proper names, so NFR-11 applies. The strip (D7) says *simulated* and names the model and severity. **For Tritanopia it says "approximate" and why:** the model's authors did not validate tritanopia. No on-screen copy claims to show what a person sees. | Rule 11, held without departing from the drawn copy. The qualification is carried by the undrawn strip, not by changing the chip. | Relabel as "-anomaly" or "red-weak" (departs from `15`). Unqualified "-opia" (overstates tritan). **Consequence:** the colour detail's block calls the same output *Red-weak (protan)*: two names for one simulation, recorded as **F-326**. |
| **D3** | Where the transform lives | `@irodora/design-tokens/src/preview.ts`: `PREVIEW_MODES`, `simulatePaint(css, mode)` and `simulatePalette(colors, mode)`. Pure; it reuses the package's own token-format parsing (`#RRGGBB`, `#RRGGBBAA`, `rgba()`), `CVD_SEVERITY` and `DEFICIENCIES`, and its only arithmetic is the engine's. `@irodora/ui` applies it in `ThemeProvider`. | design-tokens already depends on cvd-engine, owns the formats it parses, and runs the same code on a device as in CI (E-095). | In cvd-engine (the strictest zone would parse UI formats). In ui (a second parser). A native filter (none exists). |
| **D4** | Simulate the render, or render the simulation? | **simulate(render).** Every value derived from colours (the ink on a sample, a sample's edge, a badge's ink) is derived from the palette **as declared** (`ThemeValue.source`) and then painted. Printed values (hex text, accessible names, figures) never change. | The other order shows an app that has re-solved its ADR-0116 moves for simulated colours — a screen that never exists, which would overstate legibility (rule 11). | Derive on the painted palette. |
| **D5** | What "every token and every sample" covers | **Covered:** the token layer (`useTheme().colors` in every component and screen, the native header's colours, the launch tint), the sample family (`Swatch`, `Pair`/`Strip`, `FabricSwatch`, `Chip` dot and tint, `Text on`, and `RankedRow` through `Swatch`), and the colour card's **display**. **Outside, and the strip says so:** photographs (`Avatar`, wardrobe photos, the Lens's held photo), the camera viewfinder, and OS-drawn surfaces (status bar, keyboard, alerts, permission prompts, share sheet, photo picker, native splash). | None of the outside items is painted from a token or a sample; an image can only be filtered by the renderer's arithmetic, which is not the engine's (criterion 1). Increment 1 audits HeroUI's generated stylesheet for any colour our wrappers do not override. | Simulate images through an SVG `feColorMatrix` (excluded by D1). |
| **D6** | Persisted or session-only? | **Session-only.** The mode is held in memory at the root and never written. It is not a display setting. | The strongest reading of criterion 2: no write path exists at all. A preview is a check, not a preference. A stored preview would relaunch simulated behind a native splash that cannot be simulated. | Persist beside F-239's switches. Persist with an expiry. |
| **D7** | "Labelled on screen while it is on" is an undrawn surface (E4) | A **strip directly above the tab bar**, rendered by `AppTabBar` whenever the mode is not Standard, in `15`'s own badge vocabulary: `Chip form="badge"`, `surface.2`, pill, the `contrast` glyph in one ink. The badge names the mode in words; one caption line gives the model and severity, the tritan approximation where it applies, and the photo/camera exclusion. Not interactive: the way back is section 2. | The tab bar is on every route (FR-71, E4, F-145's ownership test), so the strip reaches every screen through an invariant already tested. It sits in flow, so it never covers content. The words carry the mode (rule 13). | A top bar in root chrome (doubles the top inset; collides with F-234's app bars). One per `AppBar`. A toast (not "while it is on"). **Limit:** a sheet or dialog covers the strip while open. |
| **D8** | The control | `ChoiceGroup` gains `15`'s **pill form**, keeping radio-group semantics. The chosen pill uses `pillTone(…, 'surface.2', edge)` with the leading `SelectionDot`; unchosen pills are an outline in `border`, in a wrapping row. Built in today's interim `Preferences` after the appearance card, its heading with the ordinal **"2."**. **`15.cvd.badge` is F-262's.** | One control, one announcement; four `Chip`s would announce as unrelated buttons. | `Chip` × 4. Segmented. |
| **D9** | Do gates 9 and 10 measure the simulated palettes? | **No new gate and no threshold.** Both keep measuring the declared palettes. A **census** runs `checkContrast` over the 4 declared palettes × 3 modes through the same palette argument the device uses (E-095), pinned in the `cvd` suite, findings recorded. | A failure in a model's output could only be fixed by moving a declared token, the gates' own subject; a threshold is a person's decision. | Gate simulated legibility. Skip measuring it. |
| **D10** | Is a simulated mode swept? | The conformance sweep stays Standard. A new **parallel preview sweep** renders each registered subject in Standard and in each mode, and asserts every painted value is `simulatePaint(standard value)` and every non-colour prop is identical. | The guard that makes criterion 1 checkable. | Sweep conformance in a simulated palette. |
| **D11** | Performance | The painted palette is memoised per source-palette object (WeakMap) and per mode. Samples are simulated per paint (a 3×3 multiply). A mode switch re-renders once with no animation. | — | Cache every sample. |
| **D12** | Haptic on choosing a mode | None. | Not a commit under F-206 and ADR-0104. | — |

### Reused

- **Engine (unchanged):** `simulateAnomalous` and `Deficiency` from `@irodora/cvd-engine`.
  `simulateDichromacy`, `hasDichromacySupport` and `machadoMatrix` only in tests, as decoys and
  oracles. `srgbToHex` from `@irodora/color-spaces`. The golden test already holds the tritan refusal.
- **design-tokens:** `CVD_SEVERITY` and `DEFICIENCIES` (`check.ts`); the token-format parsing and
  `compositeEncoded` (`on-sample.ts`); `checkContrast`; `themeFromSeed` and `runtimeManifest`;
  `nativeColors`.
- **ui:** `ThemeProvider`, `useTheme`; the default-outside-provider pattern of `useDisplaySettings`;
  `sampleInk`, `sampleEdge`, `inkOnSample` (called with `source`); `ChoiceGroup`, `pillTone`,
  `SelectionDot`; the `Chip` badge and `Glyph contrast`; `Card`, `Text`; `@irodora/ui/testing`; both
  conformance registries.
- **app:** the `AppearanceProvider` and `DisplayProvider` patterns; `AppTabBar`; `TargetBar` (the
  precedent for a root-chrome reminder); `Preferences` and its route; `card.ts`; `Export`'s
  `FileSink`; the catalogue and the font-subset tooling; the `screens.test` registry; the
  every-route-owns-a-tab test.
- **Tools:** `measure.ps1` and `corner.ps1` for `15`'s section 2.

### New

- `packages/design-tokens/src/preview.ts`: `PREVIEW_MODES` (`standard`, `protanopia`, `deuteranopia`,
  `tritanopia`, matching `15`'s `select:cvd.*`); `PREVIEW_DEFICIENCY`; `simulatePaint(css, mode)`,
  preserving the input's format and alpha and throwing a `TypeError` on a format it cannot read;
  `simulatePalette(colors, mode)`, returning the same object for Standard.
- `packages/ui/src/vision.tsx`: `VisionPreviewProvider` and `useVisionPreview()` (Standard outside a
  provider). `ThemeValue` gains `source` (the palette as declared), `vision`, and `paint(css)` (the
  identity for Standard). Nested `ThemeProvider`s inherit the vision; the runtime `palette` is
  simulated like any other.
- The `ChoiceGroup` pill form.
- `@irodora/ui/testing`: `colourValues(tree)` (extracted from `paintedColors`) and
  `previewMismatches(standard, preview, mode)`.
- `apps/mobile/src/vision.tsx`: `VisionProvider` (session-only, no store) and `useVision()`.
- `apps/mobile/src/VisionStrip.tsx`.
- `paintedCard(svg, paint)` in `card.ts`: rewrites `fill="…"` and `stroke="…"` values only, never text.
- Catalogue keys (en and ja). ADR-0131.

### Increments (each green; one commit each)

0. **Claim and plan.** Add `content` to F-240's verification (the Japanese copy needs font coverage).
   Gate: `state`.
1. **Measure, audit, decide.** Re-read `15`'s section 2 (chip heights, gaps, card padding, dot size,
   label ink and step, the heading ordinal; raw readings into `15.json` only if new). **The paint
   audit:** every way the app paints a colour (tokens, samples, `SvgXml`, `Image`, `Camera`, OS
   surfaces, HeroUI's generated stylesheet); any visible chrome colour that bypasses tokens is routed
   through `style` or recorded. ADR-0131 and its README row. R9 §4: an E2 row (*Tritanopia*) and an E4
   bullet (the strip). `ACCESSIBILITY.md`'s CVD table (it claims tritanopia via Brettel–Viénot, which
   the engine refuses). `color-engine.md` §7. Gates: `state`, `format`, `verify-mockups` (if `15`
   changes).
2. **The transform** (`preview.ts`), with `preview.test` and the census
   `test/cvd/preview-palettes.test.ts`. Gates: `typecheck`, `test`, `cvd`, `color-golden`, `build`.
3. **The provider**: `VisionPreviewProvider`, the `ThemeValue` additions, `ThemeProvider` applying the
   transform; `vision.test`. Nothing mounts it yet. Gates: `test`, `a11y`, `contrast`, `build`.
4. **The sample family paints, deriving on `source`:** `Swatch`, `Pair`/`Strip`, `FabricSwatch`, `Chip`
   (dot and tint), `Text on`. `previewMismatches` and the **ui preview sweep** with its decoys. Gates:
   `test`, `a11y`, `contrast`, `cvd`, `build`.
5. **`ChoiceGroup`'s pill form**: a conformance subject (treatment `pill`) and a height recompute from
   `15` with a decoy. Gates: `test`, `a11y`, `contrast`.
6. **The app state and the label.** `VisionProvider` mounted in `_layout.tsx`, outside `Themed`; the
   strip in `AppTabBar` with its catalogue keys, registered as `screens/VisionStrip`. Tests: no write
   (with a decoy), the strip present exactly when on. Nothing can turn the preview on yet. Gates:
   `test`, `a11y`, `contrast`, `content`, `build`.
7. **The card.** The document is built from `source`; the display goes through `paintedCard`. Gates:
   `test`, `a11y`, `contrast`.
8. **The app preview sweep and "never stored, never exported"**: every `SCREENS` subject × 3 modes plus
   a device-palette subset; export bytes identical across modes for every format; a stored row
   identical across modes; two boundary scans, each with a planted decoy. Gates: all.
9. **The control, last**, so the capability is never exposed half-built: section 2 in `Preferences`
   (heading with its ordinal, level-1 card, the four pills in `15`'s order), route wiring, catalogue.
   Gates: `test`, `a11y`, `contrast`, `content`, `build`.
10. **Close-out.** Effects E-192…E-196 with notes; update E-158, E-160 and E-095. `DESIGN-SYSTEM.md`
    (`colors` against `source`) and R9 §9 (F-240 ✓). Downstream notes; **F-326**; F-327 only if the
    census finds something a person should see. The attestation; `progress.md`. Then the evaluator,
    **once**.

## Mockup fidelity

- **Governing:** `15`, section 2 (P1). `26` governs Japanese copy and typography (P2).
- **Scale:** full-bleed, 2 px = 1 dp. Every size snapped and held by a recompute test.

| element | drawn | built | tokens | binding / copy |
|---|---|---|---|---|
| `15.section-2.heading` | body 500, a heading, above the card | `Text body` weight 500 `heading`, above the card, its line box meeting the card's edge (review S2; F-239's header form was the first build) | foreground | *2. Accessibility & Colour-Vision Deficiency (CVD) Mode* |
| `15.section-2` | card 355.5 × 69.5 dp; the pills inset 10–12 dp | `Card level="1" padding="sm"`: the four insets' median, 11, snapped (`VISION_CARD_PADDING`, review S2) | surface.1, border | — |
| `15.cvd.standard` | pill, level 2, text.primary edge | chosen pill: `pillTone(…, 'surface.2', true)` | surface.2, foreground | *Standard* / 標準 |
| `15.cvd.standard.dot` | 6.5 dp | `SelectionDot` | foreground | — |
| `15.cvd.protanopia` · `.deuteranopia` · `.tritanopia` | pills 23 dp, outline | unchosen pills | border | *Protanopia* / *Deuteranopia* / *Tritanopia* (1型2色覚 / 2型2色覚 / 3型2色覚), Machado at 1.0 (D1) |
| `15.cvd.badge` | level-2 pill, `contrast` | **not built here: F-262** | — | — |
| (E4) the strip | — | `VisionStrip`: `15`'s badge form plus a caption | surface.2, foreground, foreground.2 | `vision.strip.*` (D7) |

- **Departures:** §4 E2 (the *Tritanopia* row), §4 E4 (the strip). Nothing else. **If increment 1
  finds a drawn element no row names, stop and record it in ADR-0131.**

## Files to touch

```
docs/adr/0131-*.md, docs/adr/README.md
docs/design/R9-MOCKUP-FIDELITY.md (§4 E2, §4 E4, §9) · ACCESSIBILITY.md · DESIGN-SYSTEM.md · docs/architecture/color-engine.md §7
mockups/inventory/15.json (+ tools/inventory-data/15.mjs)       only if increment 1 adds readings
packages/design-tokens/src/preview.ts (new), src/index.ts; test/preview.test.ts, test/cvd/preview-palettes.test.ts (new)
packages/ui/src/vision.tsx (new), theme.tsx, Swatch.tsx, Pair.tsx, FabricSwatch.tsx, Chip.tsx, Text.tsx, ChoiceGroup.tsx, index.ts
packages/ui/src/testing/tree.ts, preview.ts (new), index.ts
packages/ui/test/vision.test.tsx (new), conformance.test.tsx (preview sweep, pills subject), the pill recompute test
apps/mobile/src/vision.tsx, VisionStrip.tsx (new); tabBar.tsx; card.ts; screens/ColourCard.tsx; screens/Preferences.tsx
apps/mobile/app/_layout.tsx, app/(tabs)/profile/preferences.tsx
apps/mobile/src/i18n/en.ts, ja.ts (+ the font subset if new kanji)
apps/mobile/test/vision.test.tsx, preview-boundary.test.ts (new); tab-bar, screens, card, export-screen, add-garment/wardrobe tests
.harness/state/*, .harness/memory/effects/*
```

## Anticipated effects (new ids from E-192)

| id | from → to | guard |
|---|---|---|
| **E-192** (high) | `cvd-engine#simulateAnomalous` → `design-tokens/preview.ts` → `ThemeProvider`, the strip's model wording, ADR-0131 | `preview.test`: equals the engine for every token; Chrome's deuteranopia oracle with a 0.9 decoy; the commutation property with a Viénot decoy. `gate:color-golden`. |
| **E-193** (high) | `ui/theme.tsx#ThemeValue` (painted `colors`, `source`, `paint`, `vision`) → every `useTheme()` reader, the derivation sites, `ColourCard`, `elevationShadow` | both preview sweeps and their decoys; the Standard identity test; `typecheck` |
| **E-194** (high) | `apps/mobile/src/vision.tsx` (session-only) → settings, exports, archive, the card document, stored rows | the no-write test (decoy: a display setting writes exactly one row); export bytes and stored-row identity; the boundary scan with a planted decoy |
| **E-195** (medium) | `tabBar.tsx#AppTabBar` (the strip) → every route; the layout comparisons in F-262, F-264, F-265, F-267 | the strip present exactly when on (decoys); F-145's tab-ownership test; the `screens/VisionStrip` subject |
| **E-196** (medium) | `ChoiceGroup` pill form → `Preferences` section 2 → F-262 | the conformance subject; the height recompute with its decoy |

Also update **E-158** and **E-160** (derivations use `source`) and **E-095** (the device palette is
simulated too).

## Test plan

- **Unit and property** (`preview.test`): Standard returns the same object; every token of the 4
  palettes × 3 modes equals `simulateAnomalous(…, 1)` channel by channel; `rgba` alpha and every
  format preserved; `'red'`, `'#FFF'` and `hsl()` throw; greys fixed within one level; totality over
  seeded colours × 3 modes; the commutation property `composite(sim a, sim b, α) ≈ sim(composite)`
  within 1/255 where nothing clips, with the **decoy** that the same property fails under
  `simulateDichromacy` for a stated share of samples.
- **Golden and oracle:** the preview's deutan matrix equals Chrome's published *deuteranopia* matrix to
  three decimals, decoy severity 0.9; protan/deutan outputs differ from `simulateDichromacy` (decoy);
  no engine golden value moves; `color-golden` run as evidence.
- **Census** (gate 10): `checkContrast` over the simulated palettes, pinned. **Decoy:** a constructed
  red-on-green pairing that passes in Standard and fails under protan.
- **Preview sweeps** (ui: every subject and state in Sumi, the sample family in all four palettes; app:
  every `SCREENS` subject plus a seeded device palette). **Decoys, each reported:** a planted component
  painting a raw `hex`; one deriving an edge from the painted palette (on a mid-tone where they differ,
  non-vacuity asserted); one painting with Viénot; one changing a printed hex.
- **Negative:** never stored (cycling all four modes writes nothing; decoy: a display setting writes
  one row); never exported (`Export`'s bytes identical across modes; decoy: the painted ground
  differs); the card document byte-identical across modes (decoy: its displayed XML differs, the
  printed hex untouched, a naive global replace shown to fail); a saved garment row identical across
  modes; a boundary scan (no preview API under `packages/export`, `packages/store`,
  `apps/mobile/src/{export,store}` or the card's document builder; planted decoy); a Machado scan (no
  Machado coefficient outside `packages/cvd-engine/src`; planted decoy); tritan (no
  `simulateDichromacy`, `VIENOT_1999` or `hasDichromacySupport` in the preview modules; planted decoy;
  the engine still throws for tritan); the strip (absent in Standard, present in each mode; the tritan
  qualifier only for Tritanopia, en and ja; its copy passes the claims lint).
- **E2E:** not runnable here.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck · pnpm lint · pnpm format:check · pnpm test · pnpm build
pnpm test:a11y · pnpm test:contrast · pnpm test:cvd · pnpm test:golden · pnpm test:content
node scripts/verify-mockups.mjs        # only if 15's inventory changes
pnpm security                          # Tier 2; exits 1 today on F-322's nine advisories
node scripts/verify-ci.mjs --all       # at close-out
```

**Tiered, from increment 4 on ([ADR-0132](../../docs/adr/0132-verification-is-tiered-scoped-checks-per-increment-the-full-gate-set-once-per-feature.md), the person, 2026-10-10).** Each increment's commit runs Tier 1: `format:check`, `typecheck`, the root `lint`, `pnpm turbo run test --filter='...[HEAD]'`, and a domain gate or `state` only where the increment changes what it reads. Everything in the block above runs once, at Verify (Tier 2), and again on the final tree after the review's fixes. Increments 0 to 3 ran the full set per commit, under the earlier reading.

**Not runnable here, and said so:** pixels on a device (no JDK); the native stack header and
HeroUI-internal paint in RN's compositor; `e2e`; `artifact`.

## Attestations

- **F-240, criterion 1** (quoted verbatim at close-out). The RN tree is gated by both sweeps. A person
  must still run each mode on a device, in all four palettes and the device palette where a seed
  exists, and confirm that nothing stays unsimulated beyond what the strip names; the same run checks
  criterion 2's strip (visible at 200 % text, covered only while a sheet is open). `blocks: release`,
  `outstanding`.
- Criterion 2's never-stored and never-exported half is fully gated.

## Risks and open questions

**No `OQ-*` blocks this feature.** The decisions are closed by ADR-0131 under the delegation.

1. **R1, D2:** two names for one simulation (the detail block's *Red-weak*): F-326.
2. **R2:** tritan is an approximation, labelled; Brettel tritan remains F-008's decision, and even a
   verified Brettel would not commute (D1d).
3. **R3, D4:** a missed derivation site would show a corrected app; the mid-tone decoy is the guard.
4. **R4:** HeroUI's stylesheet may paint chrome outside the tokens; audited in increment 1.
5. **R5:** the `ThemeValue` change ripples through typecheck.
6. **R6:** a sheet covers the strip while open.
7. **R7:** the detail block's simulated swatches are simulated again — correct for "what this screen
   shows", not idempotent; document it.
8. **R8:** sweep runtime and F-295's buffer; split by mode if needed.
9. **R9:** census findings are recorded, not fixed here.
10. **R10:** the Japanese terms are from secondary sources; F-265 confirms them; new kanji need a subset.

## Out of scope

A severity control and the "-omaly" modes; achromatopsia and greyscale; Brettel tritan; simulating
photographs, the camera or OS surfaces; daltonisation; `15.cvd.badge` and section order (F-262);
persisting the mode; renaming the detail block (F-326); simulated-CVD e2e journeys.

## Notes for downstream (written into each feature's notes at close-out)

- **F-262:** section 2 exists; compose it in `15`'s order; build `15.cvd.badge` with its split-disc
  mint; keep the `vision` and `onChooseVision` props; the strip sits above the tab bar while a mode
  is on.
- **F-264:** Washi is simulated like every palette; compare by eye.
- **F-265:** confirm 標準, 1型2色覚, 2型2色覚, 3型2色覚 and the strip's Japanese.
- **F-266:** a mode switch is instantaneous; never animate it.
- **F-267:** D1, D2 and D7 are readings for a person to confirm.
- **F-247:** the vision block's names, through F-326.
- **F-241, F-243, F-255, F-256:** photos and the camera are not simulated, and the strip says so.
- **The NFR-10 e2e owner:** the preview can drive a simulated-CVD journey.

**Read for this plan (the planner's list):** `AGENTS.md`, `mockups/AGENTS.md`, R9 §2–§11; `15.json` and
`15_settings_preferences.jpg`; cvd-engine's `index`, `brettel`, `machado`; ADR-0009; `theme.tsx`,
`displaySettings` (ui and app), `Swatch`, `Chip`, `Text`, `sampleInk`, `inkOnSample`, `elevation`,
`ChoiceGroup`, the conformance suite and `tree.ts`; `_layout.tsx`, `appearance.tsx`, `tabBar.tsx`,
`TargetBar`, `card.ts`, `ColourCard`, `ColourDetail`, `Preferences`; design-tokens' `check.ts` and
`on-sample.ts`; `effects.json` (E-005, E-093, E-095, E-158, E-160); `gates.json`; `color-engine.md`
§7, `ACCESSIBILITY.md`, `apps/mobile/AGENTS.md`; the plans for F-236 and F-239; the notes on F-262.

**External sources (the planner's):** Chrome, *Simulating CVD in Blink*
(developer.chrome.com/docs/chromium/cvd); Firefox's colour-vision simulation docs and Bug 1655053;
Machado et al.'s CVD simulation page (inf.ufrgs.br/~oliveira); the DaltonLens review of open-source
CVD simulations; AOSP's Daltonizer; Apple's Color Filters; React Native's view style props; Kotobank
on 色覚異常 (the 2005 terms). **Limits:** the full Machado paper was not read, and its tritan statement
is quoted through DaltonLens; Chrome applies its filter in linearRGB where the engine applies Machado
to encoded sRGB (`machado.ts` records that fork); the link from Android's menu to the Daltonizer was
not confirmed. Increment 1 re-checks what an ADR quotes before it is written.

## Amendments on adoption (the implementing session)

1. **Adopted as written**, D1–D12 included, so the one review can contest them.
2. **Checked before adoption:** `@irodora/design-tokens` depends on `@irodora/cvd-engine`
   (`package.json`); `CVD_SEVERITY = 1` and `DEFICIENCIES` are exported from `check.ts`;
   `simulateAnomalous` applies Machado's matrices to encoded sRGB (`machado.ts`), which D1d rests on.
3. **The Chrome oracle is a reading, not a target.** If increment 2 finds the published matrix does not
   equal Machado's deutan at 1.0 to three decimals, the test records what it does equal, and D1's
   wording follows the reading; nothing is weakened to pass.
4. **A source an ADR quotes is read before the ADR quotes it** (increment 1). A claim only available
   second-hand is stated as such.
5. **Ids confirmed free:** ADR-0131, E-192, F-326.
6. **One review, then fix or record** (AGENTS.md loop step 5).

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claimed; this plan (the planner subagent's, adopted with six amendments); `content` added to F-240's verification. |
| 1 | this commit | **Measured, audited, decided; no reading moves the plan.** Gates, each exit 0: state, format, lint (claims included); `security` exits 1 (F-322). **15 re-read:** section 2 is the inventory's boxes (the heading `15.section-2.heading`, body 500, `static:settings.accessibility`; the card 355.5 × 69.5 dp; the chosen pill 25.5 dp, the others 23 dp, 5.5–6 dp apart; the dot 6.5 dp), and the pills' tone, type and dot are F-232's choice pill (its plan names `15.cvd.*`), so no raw reading is added and `15.json` is unchanged. The heading's copy does not exist yet (F-239 wrote section 3's only): increment 9 adds `settings.accessibility`. **The paint audit:** HeroUI's component stylesheets declare colour in 71 rules across the components `@irodora/ui` wraps, and a probe rendered every component-registry subject in every state and listed each HeroUI class reaching the tree with the colours its `style` sets — every colour-declaring class that renders is overridden by `style` or declares only `transparent`, the three shadow variables are transparent, and the toast is a custom component on our tokens that HeroUI renders as given. So no Uniwind variable needs simulating (ADR-0131 §4); the probe was removed. **Sources read before quoting (amendment 4):** Chrome's *Simulating CVD in Blink* gives only its deuteranopia matrix, sourced to Machado, and it equals the engine's `MACHADO_DEUTAN` at 1.0 to Chrome's three decimals in every row; Chrome states no severity or colour space. The authors' page: severity 1.0 *"represents the highest severity or a case of dichromacy"*, tritanomaly in the table, no tritan validation described. DaltonLens: Machado tuned to Brettel 1997 for dichromacy; the authors did no validation with tritanopes; the paper's *"only as an approximation"* — quoted second-hand, and the ADR says so. The Japanese terms: Kotobank's table of current ophthalmological terms; an MLIT document cites the JOS 2005 material, which was not read. Firefox's bug number is not cited (only DaltonLens's statement that Mozilla uses Machado). **Written:** ADR-0131 and its index row; R9 §4 E2 (*Tritanopia*) and E4 (the strip); ACCESSIBILITY.md's CVD table (it claimed tritanopia via Brettel–Viénot, which the engine refuses) and the preview bullet; color-engine.md §7. |
| 2 | this commit | **The transform.** `design-tokens/src/preview.ts`: `PREVIEW_MODES` (15's order), `PREVIEW_DEFICIENCY`, `simulatePaint` (`#RRGGBB`, `#RRGGBBAA`, `rgba()`; format and the alpha string kept; `transparent` untouched; any other format a `TypeError`) and `simulatePalette` (the same object for Standard; one memoised object per source palette and mode). Its only arithmetic is `simulateAnomalous` at `CVD_SEVERITY` (1). **`preview.test` (20):** equal to the engine for every token of the 4 palettes × 3 modes; Chrome's published deuteranopia matrix equals the matrix the preview applies, read back through the engine, to Chrome's three decimals, and the engine's own `machadoMatrix` likewise (decoy: severity 0.9 does not); Viénot differs (decoy); the commutation property within 1/255 on 400 seeded blends wherever nothing clips, in each mode, with Viénot as the decoy: 46.5 % of the same blends more than a level apart and the worst over 10 levels (the plan guessed "a stated share"; the threshold is the measured share, 0.4); formats, refusals, greys within a level, and totality over 720 seeded colours. **The census** (`test/cvd/preview-palettes.test.ts`, gate 10): every declared pairing passes as declared; under simulation 11 fall below their requirement, pinned — protanopia: Sumi and Slate `status.warn` on `surface.2`, Washi `foreground.3.card` on `surface.3`; deuteranopia: Sumi and Slate `foreground.3` on `background` and `status.ok` on `surface.2`; tritanopia: Washi `foreground.3.card` on `surface.3`, Slate `foreground.3` on `background`, `status.ok` and `status.warn` on `surface.2`. They go to F-327 at close-out for a person to read (D9: a census, not a gate). Decoy: red on black clears the body floor as declared and falls through it under protanopia. Gates, each exit 0: format, typecheck, lint, build, test (35/35), cvd, color-golden (no engine value moved), state. `security` exits 1 (F-322). |
| 3 | this commit | **The provider.** `ui/src/vision.tsx`: `VisionPreviewProvider`, `useVisionPreview` (Standard outside a provider) and `VISION_MODES`. `ThemeValue` gains `source` (the palette as declared), `vision` and `paint` (the identity in Standard), and `colors` becomes the painted palette: `ThemeProvider` applies `simulatePalette` once, to whichever palette paints (declared, derived or the runtime device palette), and a nested provider inherits the mode from its own context. **`vision.test` (8):** Standard is the identity object for object; each mode paints through the engine with `source` the declared palette and `paint` the same simulation (decoys: a chromatic token and a sample both move); a nested provider inherits; a seeded device palette is simulated. Nothing mounts the provider yet, so nothing visible changes; the app typechecks against the new `ThemeValue` unchanged. **Gate 8's scope** named `VisionPreviewProvider` unreached: it is registered as `VisionPreviewProvider (Standard)` in the component registry, a subject the conformance rules can read because Standard paints the declared palette (the simulated modes are D10's separate sweep, increment 4). **A load timeout, not a finding:** the first `pnpm test` failed on one cleanup hook exceeding 5 s in the ui conformance suite after 123 s under turbo's parallel load (941 of 942 passed); re-run, 35/35. Gates, each exit 0: format, typecheck, lint, build, test (35/35), a11y (scope 86/86), contrast, state. `security` exits 1 (F-322). |
| 4 | this commit | **The sample family paints through the preview, deriving on the declared palette.** `Swatch`, `FabricSwatch`, `Pair`, `Chip` (the badge's tint and ink, the pill's dot) and `Text on` solve their edge or ink on `source` and paint the sample and the result through `paint` (D4). **`colourValues(node)`** is extracted from `paintedColors` (one reader of style, SVG props and gradient stops; every comment kept) and **`previewMismatches`** walks a Standard tree and a preview tree together: each painted value — style, SVG, gradient stops, any `…Color` prop, the colours inside `boxShadow` — must be `simulatePaint` of the Standard one, and every other prop, string and the structure identical, with generated ids compared by where they point (`useId` makes them anew per render). **The ui preview sweep** (in the component registry): every subject in every state in Sumi, the subjects that paint samples in Washi, Slate and Obsidian too — 188 tests pass. What it found on the way, and fixed: three subjects rendered themselves outside `draw` (DeltaBars ×2, the Carousel) and now carry the preview; four fixtures painted literals (Card's media ×2, Text on a sample's ground, NavIcon's ink) and now paint through `paint` via a `Painted` fixture — the identity in Standard, so every conformance result is unchanged; Washi's light card shadow carries a colour, which is now simulated rather than read as layout. **Decoys, each named:** a raw hex past `paint`; another deficiency's model; an edge solved on the painted palette (a witness searched over greys and asserted to exist); a printed value the preview changed; and a component done right, which passes. **Tier 1 (ADR-0132, from this increment on):** format 0, typecheck 0, lint 0, `turbo run test --filter=...[HEAD]` 0 (18 tasks; ui 1131, mobile 1188). |
| 5 | this commit | **`ChoiceGroup`'s pill form.** `pills` lays the options out as 15's pills — F-232's choice pill as radio items: the chosen one `pillTone(…, 'surface.2', edge)` with the leading `SelectionDot`, the rest outlined in `border`, one edge width in every state, the hit area to the target (ADR-0114), a wrapping row at `xs`, no caption. `ChoiceGroupProps` makes `segmented` and `pills` exclusive by type. **Recomputed from 15** (`pill-selection.test`): the three unchosen pills median 23 dp, the height the screen passes; the gaps 5.5, 6 and 6 dp, median 6, a tie between `xs` and `sm` that R9 §2 breaks to the smaller (ADR-0103) — `xs`; decoy: the chosen box's 25.5 dp is its edge's extent, not a height; every rendered pill at 23 dp with a 1 dp edge, the chosen one filled and edged. Registered as `ChoiceGroup (pills, 15)` (interactive, selectable, treatment `pill`), so the conformance suite and the preview sweep both hold it. **Tier 1:** format 0, typecheck 0, lint 0, affected tests 0 (18 tasks; ui 1137, mobile 1188). |
| 6 | this commit | **The app holds the preview, and labels it.** `src/vision.tsx`: `VisionProvider` keeps the mode in memory, takes no store, and hands it to `VisionPreviewProvider`; `useVision` throws outside it. Mounted in `_layout.tsx` outside `Themed`, so every theme below — the person's, a nested one, the launch overlay — paints through it. `src/VisionStrip.tsx`: nothing in Standard; in a mode, 15's badge vocabulary (`Chip` badge, `surface.2`, the `contrast` glyph) naming the mode in words with the script's own colon, and one caption line — the model and severity, the photo and camera exclusion, and for Tritanopia alone its qualification. It takes the mode as a prop, so the registry renders it in the declared palette (`screens/VisionStrip`, Tritanopia, its longest form) and the preview sweep can render it simulated. `AppTabBar` draws it above the bar, in flow. Catalogue: `vision.mode.*` (the three -opias; Standard arrives with the control, increment 9, as the unused-key test requires) and `vision.strip.*`, en and ja; subset regenerated. **`vision.test` (14):** cycling every mode writes nothing (decoy: a display setting changed the same way writes one row); Standard at every launch; the hook refuses to be read outside its provider; the strip absent in Standard and naming each mode, the model and the exclusion; the tritan qualification only for Tritanopia (protan and deutan the decoys), and in Japanese with its separator; above the tab bar while on, absent from it in Standard. Census: `screens/VisionStrip` recorded as first captured (no `padding`; it pads horizontally and vertically). Nothing can turn the preview on yet. **Tier 1:** format 0, typecheck 0, lint 0, content 0, affected tests 0 (mobile 1203). |
| 7 | this commit | **The card: its display is painted, its document is not.** The screen built the card from `colors` — since increment 3 the painted palette — so under a preview the document itself (what a person shares) would have been simulated, and the sample's own fill left raw. Now `cardSvg` takes `source`, and the screen shows `paintedCard(svg, paint)`: every `fill` and `stroke` attribute through the engine, `none` untouched, the printed hex text left as it is. **`card.test`:** the identity in Standard; in each mode every paint attribute is the engine's simulation of the document's and everything else is byte-identical, the printed hex intact; decoy: a global replace of hex values rewrites the printed hex too (on an entry chosen so its sample moves in every mode). **`vision.test`:** the screen in protanopia shows exactly its Standard document, painted; decoy: a document built from the painted palette would leave the sample's fill raw, and the screen shows it simulated. **Tier 1:** format 0, typecheck 0, lint 0, affected tests 0 (mobile 1209). |
| 8 | this commit | **The app preview sweep, and never stored, never exported.** **The sweep** (`screens.test`): every one of the 82 subjects, in every state, in Sumi, and four (Home, Wardrobe, ColourDetail, the strip) again on a palette seeded from a device accent, each Standard against each mode through `previewMismatches`; the app's `draw` renders under the mode and, for the device pass, the seeded palette. It found two shapes the comparison had to learn, neither a defect: a React element handed over as a prop (the Atlas list's header), whose output is compared node by node, and `SvgXml's` `xml` (the card), whose `fill`, `stroke` and `stop-color` attributes are now simulated like `boxShadow's` colours. **Never exported** (`export-screen.test`): every format — CSV, JSON, CSS, design tokens, ASE, PDF — writes the same filename and bytes in every mode; decoy: the screen itself is drawn differently, so the mode was on. **Never stored** (`add-garment-offer.test`): the same garment saved in every mode writes the same row, its fresh ids aside; decoy as above (the save shows a confirmation, so the test takes the safe-area library's own jest mock). **The boundary** (`scripts/verify-preview-boundary.mjs`, in the root lint chain): no preview API or `useTheme` in the store, the export writers, the app's export and store adapters or `cardSvg's` body; no Machado coefficient — read from the engine's own tables, the full-severity rows — in any source outside `packages/cvd-engine/src`; no `simulateDichromacy`, `VIENOT_1999` or `hasDichromacySupport` in the preview's five modules; comments stripped first (the preview module names the refusal to explain it); and every run proves itself on three planted breaks. **Tier 1:** format 0, typecheck 0, lint 0 (the new check included), affected tests 0 (18 tasks; ui 1137, mobile 1301). |
| 9 | this commit | **The control, last.** `Preferences` gains `15`'s section 2: a level-1 card under the numbered heading `settings.accessibility` ("2. Accessibility & Colour-Vision Deficiency (CVD) Mode" / 「2. アクセシビリティと色覚異常（CVD）モード」), holding one `ChoiceGroup` in the pill form, labelled `vision.label`, with the four modes in `15`'s order: Standard, Protanopia, Deuteranopia, Tritanopia. The pills are `VISION_PILL_HEIGHT` = 23 dp, the median of `15`'s three unchosen CVD pills (the chosen box is taller by its edge). The mode and its chooser arrive as props, as `appearance` does, because `useVision()` throws outside its provider and the conformance suite renders the screen without one; the route reads the hook. There is no haptic, because choosing a preview is not a commit (ADR-0104). The catalogue gains three keys in en and ja; font coverage holds (668 Japanese codepoints) with no regeneration. **`preferences-vision.test` (8):** 23 dp recomputed from `15.json`, with the chosen box as decoy; the heading; the four radios in `15`'s order; the chosen pill follows `vision`, with every other pill unchosen as decoy; presses choose Deuteranopia then Tritanopia; the route passes `useVision`'s mode and chooser. **A leak, found by `a11y`, and fixed at its root.** `a11y` died out of memory in `screens.test` (V8 heap limit at 2 GB). A heap probe after a forced collection per test showed retained heap climbing across the whole file, from 254 MB to 2,105 MB. Snapshot diffs traced it to mock records nothing cleared:
- React Native's jest setup mocks `performance.now`, called about 550 times per render, and every call kept an args array and a result;
- the `AccessibilityInfo` listener mock kept each render's bound `setState`, so every unmounted fiber, with React's debug stacks, stayed reachable.

`apps/mobile/jest.config.mjs` now sets `clearMocks: true`, which clears each mock's record before every test and keeps every implementation. A 100-render probe went from +29 MB to +1 MB. `screens.test` now retains 257–344 MB across the file (peak 1,001 MB, inside the single F-204 evidence test) and runs in 195 s instead of 286 s. F-240's preview sweep (increment 8) added the renders that crossed the limit; the leak itself predates the feature. `packages/ui`'s conformance file retains 317 → 511 MB, well inside its heap, so its config is unchanged. **Seen in passing, recorded at close-out:** `OutfitBuilder` maps its slot `Card`s without a `key` (React's warning, pre-existing). **Tier 1, each exit 0:**
- format, typecheck, lint;
- affected tests: 17 tasks, mobile 1309, a cache miss;
- content;
- a11y (after the fix): ui 409, mobile 344, scope 86/86;
- contrast: ui 385, mobile 344. |
| 10 | this commit | **Close-out.** **Effects:** E-192 to E-196, each with its note and index line:
- E-192: the engine's simulation, one copy;
- E-193: `colors` is painted, and a derivation reads `source`;
- E-194: never stored or exported;
- E-195: the strip rides on the tab bar;
- E-196: 15's section 2 is ChoiceGroup's pill form.

E-095 (the device palette is simulated too, with a `to` on `simulatePalette`), E-158 and E-160 (chosen on `source`, then painted) are updated, each with a section in its note. **Documents:** DESIGN-SYSTEM.md gains component rule 10 (derive on `source`, paint through `paint`) and a section on the preview; R9 §9 marks F-240 ✓. **Recorded, not fixed:**
- F-326: one simulation, one name;
- F-327: whether the census's 11 simulated pairings below their floor stand or move;
- F-328: OutfitBuilder's slot cards without keys. Mockup 13 governs that screen; gate 0 refuses an R9 UI feature without a mockup.

**Downstream notes** on F-262, F-264, F-265, F-266, F-267, F-247, F-241, F-243, F-255 and F-256. No feature owns a simulated-CVD e2e journey (NFR-10); F-240's notes say so. **The attestation:** criterion 1 quoted verbatim, `blocks: release`, `outstanding`: the tree half is gated, and a device run in every palette is what remains, which this workstation cannot make. **Tier 1, each exit 0:** format, lint, state (19 checks, 177 warnings, the new one F-240's attestation). Nothing executable changed, so typecheck and tests are not re-run here; Tier 2 follows. |
| review | this commit | **The one review** (the evaluator subagent, 2026-10-10). A usage limit cut it off; it was resumed, so it is still one review. **FAIL**: 1 blocking, 3 significant and 11 minor findings. Criterion 1, and criterion 2's never-stored and never-exported half, held in the code. Every finding is fixed or recorded:
- **B1, fixed: a flaky `test`.** The ui conformance file's cleanup hook passed jest's 5 s limit once under turbo's load, and the re-run passed. The cause was increment 9's leak, with `clearMocks` set only in the app's config. `packages/ui/jest.config.mjs` now sets it too: retained heap ≤ 317 MB, ending at 232 MB, where it had peaked at 511 MB. Two consecutive uncached `pnpm turbo run test --force` runs under full parallel load were green, 35/35 each.
- **S1, fixed: the strip claimed less than ADR-0131 §4 said it did.** It said only "photographs and the camera", so a status bar or keyboard read as simulated. It now says *Photographs, the camera and anything the system draws are not simulated* (ja: 写真、カメラ、システムが表示する部分は対象外です). `vision.test` asserts all three in both languages. The ADR, R9 §4 E4, DESIGN-SYSTEM.md, the plan's intent and the attestation now say the same.
- **S2, fixed: section 2 departed from 15.**
  - The heading is now above the card at 500, its line box meeting the card's edge.
  - The card is padded `sm`, as `VISION_CARD_PADDING`: 15's insets 11.5, 10, 12 and 10.5 dp, median 11.
  - `preferences-vision.test` recomputes the padding, with a decoy, and checks the heading's place and weight.
  - The fidelity table above is corrected. The inset census re-records six Preferences subjects, each gaining only 8.
  - F-239's section 3 keeps its header form; F-262's notes carry its measurements.
- **S3, fixed: the a11y mutation proof read a passing suite as red.** The suite now prints 1.6 MB; `execSync`'s 1 MiB buffer threw ENOBUFS, and the proof reported "baseline is already red". The proof now has a 64 MiB buffer, and when the suite could not run or be read it names the error instead. In verify-ci the baseline is green, five of six cases plant, and only F-324's case fails, as recorded.
- **Minors.**
  1. Pill hit areas overlap their neighbours: **F-329**. It is systemic across Chip, the segments and Button through ADR-0114.
  2. Fixed: E-196's wording.
  3. Fixed: the docs said a shadow is derived on `source`. A shadow reads the painted palette, and commutation makes that correct; both texts now say so.
  4. Fixed: `RenderedPair`'s comment, restored.
  5. Fixed: `previewMismatches` now names colours painted only in the preview and checks object colours. A colour as a number or boolean is named. An SVG document is compared exactly except its paint values, its CSS paints included.
  6. Fixed: the boundary scan reads every severity. A copy is three or more values of one matrix, because a corpus XYZ equals a deutan coefficient by chance, and a decoy plants one. E-192 states the three-decimal limit.
  7. Fixed: `vision.test`'s console spy is restored.
  8. Fixed: the stale ordinal comment.
  9. Fixed: criterion 2 is attested on its own, verbatim.
  10. Fixed with tests: `simulatePaint` refuses a channel above 255 and an alpha above 1, and writes a lowercase alpha suffix in toHex's case. The store-boundary half is **F-330**.
  11. The `progress.md` entry is in this commit, and the lesson [[a-mock-records-every-call-until-something-clears-it]] is written.

**Tier 2 on the final tree:**
- Each exit 0:
  - `state`, `typecheck`, `lint`, `format:check`, `build`;
  - `test` twice, uncached (ui 1137, mobile 1313);
  - `test:golden`, `test:a11y`, `test:contrast`, `test:cvd`, `test:content`.
- `security` exits 1 on F-322's nine advisories.
- `verify-ci --all`: 32 of 38 steps green. The six red are F-295's buffer (test, a11y and contrast, each exit 0 alone), the iOS half on win32, F-324 and F-322. The tree was clean after it, but its plant journal was not. The next `lint` failed on a stale journal naming the two workflow files, which matched HEAD. `plant.mjs --recover` rewrote identical bytes, and `lint` passed again: **F-331**, pre-existing. |
