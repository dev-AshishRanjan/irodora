# Plan: F-232 — The controls are board 00's controls

| | |
|---|---|
| **Feature** | F-232 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 |
| **Service / package** | `@irodora/ui` · `@irodora/design-tokens` · `mockups/inventory` |
| **Author** | planner subagent (2026-09-28), adopted by the implementing session |
| **Date** | 2026-09-28 |

---

## Intent

Every control and chip looks as board `00` draws it, or as the screen that uses it draws it (P3):
- the drawn size and radius;
- the drawn tokens and glyph;
- the drawn selection mark, with no tick or edge that no mockup draws.

Every control still reaches 44 dp (iOS) or 48 dp (Android), through its hit area rather than its
drawn size (R9 §4 E3), and announces its name and state.

## The measurement fact that governs everything

`00.json` has `dpPerPx: null`: the board has no scale. So it supplies proportions, radii, tokens and
weights, but no dp. The dp come from the screens (P3), or, where no screen draws a component, from
00's ratio to the pill drawn beside it. Default heights are computed from the inventories (for
example, the median `dp.h` of the pill primaries) and recomputed by a test, as ADR-0113 did for the
caption. Surfaces pass each element's own `dp`.

## Approach

**Reused:**
- IconButton's owned-accessibility refusal, moved into a shared module.
- `selection.tsx`'s data-plus-small-component pattern.
- `Glyph`, `Text` (`face`, `numeric`), `statusPresentation` and `nativeRadius`.
- react-native-svg's `LinearGradient`.
- The conformance suite (`tap-target`, `selection-treatment`, `pair-undeclared`, the derived-theme
  block).
- `c10-exceptions.test.ts`, the `mockups/tools` measurers, and color-core's contrast function.

**New:**
- Three modules: `ownedAccessibility.ts`; `hitArea.ts`, which turns a drawn size into a `hitSlop`
  that reaches the platform target; and `inkOnSample.ts` (C8).
- A pill treatment and `SelectionDot` in `selection.tsx`.
- Static (badge) forms of `Chip`, and a `pill` form of `Status`.
- A segmented layout in `ChoiceGroup`.
- A readout form and a gradient track in `Slider`.
- A plated icon-only form of `Button`.
- In the manifest: glyph colour groups, and `size.tapTargetAndroid: 48` (additive).
- ADR-0114: the hit area, amending ADR-0055.
- ADR-0115: an icon-only control with a plate is a `Button`.

### Controls: today → drawn → delta

- **Primary pill.**
  - *Today:* `accent` on `accent.foreground`, `minHeight` 44, HeroUI's label.
  - *Drawn:* `00.buttons.primary` and `00.controls.primary`. `action.primary`→`accent`, pill, sans
    body 16 at weight 500; the height is per screen.
  - *Delta:* the label goes through `Text` (body/500); drawn height plus slop; owned accessibility
    props.
- **Secondary pill.**
  - *Today:* a `surface.2` fill with a 1 dp `border.strong` edge.
  - *Drawn:* `00.buttons.secondary` and `00.controls.secondary`: a `border.strong` outline, **no
    fill**, body/400.
  - *Delta:* drop the fill. The edge stays decorative, since a label identifies the component (E-151).
- **Square icon button.**
  - *Today:* none. IconButton draws no plate.
  - *Drawn:* `00.buttons.icon-*` on a `level2` plate, radius `sm`. Also `00.controls` row 1, and
    `13.slots.*.lock` (21 × 20.5 dp, `border.subtle`, `sm`).
  - *Delta:* Button's icon-only form, taking its plate and radius from the element.
- **Circular icon button.**
  - *Today:* none.
  - *Drawn:* `00.controls` row 2 (`icon-camera-2`, `icon-palette`, `icon-edit-2`, `icon-wheel`) on
    `level2`, pill.
  - *Delta:* the same form at pill radius. `corner.ps1` confirms which row is which.
- **Switch.**
  - *Today:* a 68 × 44 track. On is `inverse`/`inverse.foreground`; off is a `surface.3` track with a
    `surface.1` thumb.
  - *Drawn:* `15.engine.*.switch` is 35.5 × 22.5 dp. 00 draws on as a light track with a dark thumb,
    and off as a dark track with a light thumb. Both bind `tokens: {}`.
  - *Delta:* the drawn size plus slop, with measured tokens bound in `00.json` and `15.json`. The
    `marker` stays (OQ-41).
- **Segmented ChoiceGroup.**
  - *Today:* a wrapping row with the chooser tone.
  - *Drawn:* 00 draws a dark container with the selected segment in `accent`. The screens (12, 02,
    07, 10, 24) draw a `border.subtle` container with dividers and the selected segment in `level2`
    with a dot.
  - *Delta:* `layout: 'segmented'`, with container tokens from the element and a mark of `fill` (00)
    or `dot` (the screens).
- **Slider.**
  - *Today:* a 10 dp `surface.3` track, an `inverse` fill, and a 24 dp `surface.1` disc with a
    `border.strong` edge.
  - *Drawn:* 00 draws a thin track with a white fill and thumb. `17.radar.*.range` is readout-only;
    `23.profile.*.range` is a readout with a gradient.
  - *Delta:* measured track and thumb sizes. The fill and thumb become `foreground`, with **no edge**:
    the thumb is identified by its fill, so the `border.indicator` branch in F-225's note does not
    arise. Add a readout form and a gradient track.

### Chips (criterion 2)

- **Filter chip, with a colour dot and two scripts:** `05.filters.family.*`, 20 dp, pill,
  `border.subtle`, a dot and "Ao 青".
  - Build: the pill tone, and `dot: Color`, a provenanced colour (ADR-0005). The kanji run is set in
    the JP face.
- **Choice pill, with a leading dot:** `12.form.*`, `15.cvd.*` and `17.draping.option-*.select`.
  - Build: `SelectionDot`, with no visible ✓ and no corner badge. `17`'s options are re-recorded as
    `ui:Chip`.
- **Provenance chip, with an icon:** `03.chips.conditions`, and `24.capture.source` (`level2`, 25 dp).
  - Build: a static chip with an optional glyph.
  - `03.chips.provenance` and `12.source.provenance` draw no icon, and the drawing wins.
- **Count pill:** `01.wardrobe.count` and `05.count`.
  - Build: a static chip with `numeric` text.
  - `11.coverage.counts` is text, not a pill, and the drawing wins.
- **ΔE00 badge:** `21.results.row-*.distance` (not tinted) and `24.rows.row-*.distance` (tinted by
  the row's sample).
  - Build: a static badge with `tint?: Color`, whose text ink is chosen by `inkOnSample` (C8).
- **Status pill, icon + text:** `04.sheet.tolerance`.
  - Build: `Status form="pill"`, with the plate tokens supplied by the caller.

### Tokens, exceptions and open questions

- **F-232 mints only its own two exceptions:** `00.controls.icon-wheel` (spectrum) and
  `00.buttons.icon-palette` (multi).
  - The manifest gains glyph colour groups: `glyph.wheel`'s hue stops and `glyph.palette`'s wells,
    both measured off 00.
  - Each group gets a token exception carrying the elements.
  - Both element exceptions are retired in the same change (E-149).
  - `Glyph` lays the colour over the unchanged one-ink silhouette (ADR-0110 §2).
- **Not minted here:** 24's tints (F-259), 23's gradient and pill (F-260), the greens on 04 and 12
  (F-245, F-256), and 03's hue ring (F-244, which reuses the spectrum mechanism). F-232 provides the
  slots only.
- **Open questions that do not block F-232:** OQ-28 (F-258), OQ-41 (F-262), OQ-13 (none of its
  elements is a control), and OQ-23, OQ-31 and OQ-33 (copy the caller supplies).
- **A new OQ-43, against F-246:** `05` draws its selected season chip as a fill swap with no mark,
  while ACCESSIBILITY §4 asks for highlight + checkmark. Does golden rule 13 force 12's dot there? The
  chip supports both, so F-232 proceeds, and F-246 waits.
- **F-285** (the Switch's drawn size) is delivered by criterion 4 here. Its own record gets the
  evidence; it is not closed on another feature's word.

### (c) An icon button inside a plate is a `Button` (ADR-0115)

- A `ui:Button` with an `icon`, no copy (on itself or any child), and a `bg` or `border` plate token is
  Button's icon-only form. The plate is the pressable: it takes the press scale, it is where the hit
  area starts, and it gives one announcement.
- The same element with no plate token is `IconButton`.
- The rule goes into `inventory.schema.json`'s component description, and a test classifies every
  icon-only `ui:Button` element. There are **30** (15 plated, 15 plateless); this plan first said
  "71 (30 / 41)", which counted labelled buttons with an icon too. Its decoy is an element with
  `radius` alone, which must be named as ambiguous.

### (d) The Button accessibility fix

Move IconButton's `OWNED_ACCESSIBILITY` into `ownedAccessibility.ts`, and apply it to `Button` and
`Chip`:
- refuse the owned props by type;
- strip them at render;
- spread the caller's props first, before the component's own role, label and state.

### (e) Keeping every screen working

Every API change is additive. These visible changes are intended, as ADR-0103 accepted before:
- the secondary button loses its fill;
- controls shrink to their drawn size plus slop;
- the visible chip ✓ and corner badge go (the accessible-name tick stays);
- the switch shrinks;
- the slider gets thinner.

`form="badge"` is explicit, so a conditionally pressable chip stays a control.

### Increments (each ends green)

1. **Measure and record** 00, 05, 12, 15 and 17: tokens, radii, dot sizes, 17's re-record, and the
   schema rule from (c). Gates: `verify-mockups`, and `generate-inventory.mjs <ids>` reporting
   each file clean (it has no `--check` mode; it validates with the gate's own
   `inventoryProblems()`).
2. **`ownedAccessibility.ts`**, applied to Button and Chip.
3. **The hit area:** `size.tapTargetAndroid`, `hitArea()`, and a `tap-target` rule that accepts the
   drawn size plus `hitSlop`; ADR-0114. Probe whether HeroUI forwards `hitSlop`.
4. **Button:** primary, secondary, and the square and circular icon-only forms.
5. **The pill treatment and `SelectionDot`.** `selection-treatment` learns `pill`, and Chip moves to
   it.
6. **ChoiceGroup's segmented layout.**
7. **Switch:** drawn size, measured tokens, slop, and a `ring` focus overlay.
8. **Slider:** measured sizes, the readout form, the gradient track and end labels. `tree.ts`
   resolves gradient stops.
9. **Static chips and the `Status` pill.**
10. **Mint the glyph colour groups;** retire the two exceptions; `Glyph`; the c10 test.
11. **IconButton:** its layout box becomes the glyph's drawn size, with the target in the hit area.
12. **Close out:**
    - the registry covers every form and state;
    - the §6 census; ADR-0115; effects and notes;
    - OQ-43 is raised;
    - notes on F-233 (reuse `inkOnSample`), F-244, F-245, F-256, F-246, F-259, F-260 and F-285.

## Mockup fidelity

- **Governing:** `00`. The screens beat it on their own surfaces (P3): 01 03 04 05 12 15 17 21 23 24.
  `25` supplies the light palette.
- **Bindings:** labels, figures, tints and dots come from the engine, the store or the corpus (E1).
  `dot` and `tint` take `Color`.
- **Departures:** only the E3 tap-target line. Disabled, pressed, focused and loading are drawn by no
  mockup, so they keep their shipped treatments and nothing is designed.

## Anticipated effects

- **E-020** (critical): HeroUI stays behind `@irodora/ui`, with no colour animation, and colour is
  painted through `style`.
  - Guards: lint, `verify-motion`, conformance `colour-invisible`, and the derived-theme block.
- **E-007:** the manifest's size and glyph groups flow into the outputs.
  - Guards: gate contrast and `generate --check`.
- **E-151:** focus is `ring` everywhere.
  - Guard: `selection.test`'s focus cases, extended to Button, Switch, Slider and ChoiceGroup.
- **E-080 / F-176:** `selection-treatment` accepts the pill treatment.
  - Guard: decoys.
- **E-086:** new pairs: the dot on `surface.2`, and thumbs on tracks.
  - Guard: `pair-undeclared`. Text on a sample is invisible to it, so `inkOnSample` gets its own tests.
- **E-097:** `tree.ts` reads `hitSlop` and gradient stops.
  - Guard: decoys.
- **E-134:** glyph colour layers.
  - Guard: `glyphs.test`, which holds the one-ink silhouette unchanged.
- **E-149:** two exceptions are retired.
  - Guard: the c10 test.
- **E-128:** inventory edits.
  - Guard: `verify-mockups`.
- **New:** the hit area (manifest → `hitArea` → `tap-target` → every control), and `inkOnSample` →
  F-233.

## Test plan

- **Refusal:** a `@ts-expect-error` for each owned prop, with `accessibilityHint` as a decoy that
  compiles. A smuggled-props render must leave the host props unchanged.
- **Hit area:** three decoys (no slop, too little, enough). `hitArea()` gives 44 on iOS and 48 on
  Android. The drawn style equals the inventory dp, and the old 68 × 44 switch fails.
- **Pill selection:**
  - A selected pill carries the fill or edge and a dot; the decoy, a fill without a dot, is reported.
  - There is no visible ✓, and `accessibilityState.selected` is set.
- **Slider:** the readout form is not `adjustable`, while the interactive one is (the decoy). A
  literal gradient stop is reported.
- **`inkOnSample`:** it picks the ink that passes. It reports *neither* on a mid-tone (24's
  `#87795D`); its decoy is `#4495A3`, which the dark ink passes.
- **c10:** a dropped element, and an element covered twice, are both reported.
- **Classifier (c):** 30 / 41, with an ambiguous decoy.
- **Conformance:** every new form, in every state, in all four palettes.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
```

## Risks and open questions

- **Hit areas overlap on dense rows** (12's chips sit at a 26 dp pitch). React Native resolves a tap
  in the overlap by z-order, and the rule cannot see the overlap. This is a device-attestation item.
- **HeroUI may not forward `hitSlop`.** The fallback is a transparent hit layer. If a component needs
  something else, stop and report.
- **24's tint fails both inks.** The move is F-259's.
- **The glyph colour groups are the first chroma mint,** so their schema becomes the pattern for
  F-244, F-257 and F-262.
- **Dots and default heights are measured off JPEGs,** with ΔE00 ≈ 2 and about ±0.5 dp.

## Out of scope

- Composing any screen.
- Labelled buttons with a leading icon (F-234).
- 23's gradient stops and label pill; 24's tint derivation; the greens on 04 and 12; 03's hue ring.
- The size of 17's slider labels.
- Selection on Swatch, Card and Tabs.
- 00's green badge.
- `Select` and `Accordion`.

## Status (implementing session)

| inc | commit | what landed |
|---|---|---|
| 1 | `bc9dff1` | Measured and recorded 00, 05, 09, 12, 15, 17. ADR-0115 and the classifier: **30** icon-only controls, 15 plated and 15 bare (the plan's 71 had counted labelled buttons). |
| 2 | `ab68902` | `ownedAccessibility.ts`, applied to Button and Chip. |
| 3 | `d03e16f` | `size.tapTargetAndroid`, `hitArea()`, and a `tap-target` rule that reads `hitSlop`; ADR-0114. The probe shows HeroUI forwards `hitSlop`. |
| 4 | `3802c00` | Button forms, `FocusRing`, and `Text` `weight`. The defaults are recomputed from the inventories. |
| 5 | `b48aead` | The pill treatment and `SelectionDot`; `selection-treatment` learns `pill`. |
| 6 | `46c9546` | ChoiceGroup's segmented row; the rule learns `segment`. |
| 7 | `69c231c` | The Switch at 15's size, the target in the hit area. |
| 8 | `cda0f60` | The Slider at 09's size, the readout form, 23's gradient track; `tree.ts` reads gradient stops. |
| 9 | `fd1418c` | `Chip form="badge"`, 05's family chip, `inkOnSample`, `Status form="pill"`. |
| 10 | `37532f2` | `glyph.wheel` / `glyph.palette` minted as token groups; Glyph's spectrum layer; ADR-0110 amended. |
| 11 | `a65c04a` | IconButton drawn at the glyph's size. |
| 12 | `7bdbbc3` | Effects E-156–E-159, OQ-43, notes on the dependent features. |
| review | — | One evaluator review (FAIL: B1–B3, S1–S4, M1–M7). Fixed: B1, B2, B3, S2, S4, M1–M7. Recorded: S1 as F-304, S3 as F-305 with ADR-0114's amendment, and two device attestations on F-232. |

**Found while measuring, and recorded in the inventories:**
- 12's selected fills read `level3` at ΔE00 3.3–4.4, where `level2` had been recorded (6.3–7.3).
- 15's switch is a 34.5 × 18 dp track. The inventory's 35.5 × 22.5 was a padded box.
- 05's family chips are filled `level1`.
- 15's chosen CVD mode is filled `level2`.

These go to F-256, F-285, F-246 and F-262 at close-out.
