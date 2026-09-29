# Plan: F-233 — Cards and the sample family are the mockups'

| | |
|---|---|
| **Feature** | F-233 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-9, NFR-8, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` · `@irodora/design-tokens` · `mockups/inventory` · `apps/mobile` (the gate-9 corpus check, and existing call sites) |
| **Author** | planner subagent (2026-09-29), adopted by the implementing session with one change: Decision 6 is raised as OQ-45, not decided (see there) |
| **Date** | 2026-09-29 |

---

## Intent

A person sees every card and every colour sample as the mockups draw them:
- cards at levels 1–3, with the drawn fill, the `border.subtle` edge and the drawn corner step;
- every sample form (hero, detail, anchor, list, strip, joined bands, split bar, pinked fabric,
  garment-photo card), each at its element's size, with its corner and its edge.

Text set on a sample is always readable at 4.5:1, and gate 9 checks that against all 120 corpus
colours in all four palettes. A sample still cannot exist without its provenance, and the
provenance chip is part of the sample family and honours `15`'s switch.

## The facts that govern this plan

These are read off the record, not chosen.

1. **Criterion 2's numbers name the forms; they are not sizes.**
   - "180px Hero", "120px Detail", "48px List" and "Strip 40px" are board `00`'s captions, which
     `00.mjs` records as `leaked-label`.
   - "100" and "72" are labels printed inside the anchor swatches (`19.mjs`, `21.mjs`); R9 §2 lists
     them as not design.
   - `00` has `dpPerPx: null`.
   - So each surface passes its element's measured `dp`, and the component defaults are recomputed
     from the inventories (E-157).
2. **The README keyline cannot keep a sample's edge on its own.** `swatch-edge.test.ts` asserts that
   the keyline alone fails. No single line colour can hold an edge against a sample of its own
   colour, which measures 1:1.
3. **A band of mid-tones fails with both inks.** Neither ink passes 4.5:1 for samples whose WCAG Y
   falls in these ranges:

   | palette | range of Y |
   |---|---|
   | Sumi | (0.1696, 0.2133) |
   | Washi | (0.1640, 0.2245) |
   | Slate | (0.1696, 0.3131) |
   | Obsidian | (0.1696, 0.2000) |

   The planner's census estimate is 7 of the 120 corpus colours on Sumi, 9 on Washi, 19 on Slate and
   6 on Obsidian. Increment 1 recounts them from the derived hex with `wcagContrast`.
4. **No screen draws a padded well around a sample.** Every drawn sample sits on a level-1 card
   (C11: `swatch.well` is `surface.1`), and the inventory box is the sample itself.
5. **No mockup draws a provenance chip ON a sample.** The chips sit beside or above the sample, in
   the same card:
   - `03.chips.provenance`: outline, 16.5 dp, no glyph;
   - `12.source.provenance`: `level2`, 18.5 dp, no glyph;
   - `24.capture.source`: `level2`, 25 dp, glyph `camera`.

## Approach

**Reused:**
- `swatchCorner` and `swatchRatio` (ADR-0103), and `elevationShadow`.
- `Sample` and `inkOnSample` (C8).
- `Chip form="badge"` and `hitArea()` (F-232).
- `useDisplaySettings().provenanceBadges` and `swatchAccessibleName` (F-239).
- `smallestLightnessMove`, `hexToOklch`, `compositeEncoded` and `isInGamut` from
  `@irodora/design-tokens`: the same E3 search the manifest moves use.
- `wcagContrast`, the conformance suite (`sampleValues`, `pair-undeclared`), the
  `mockups/tools` measurers, and `allEntries()`.

**New:**
- `packages/design-tokens/src/on-sample.ts`, which exports `moveOnSample({ base, sampleHex, floor })`.
  This is E3 applied per sample: the drawn token is moved the smallest OKLab lightness step that
  passes against this sample, with hue and chroma held. It takes the direction with fewer steps. If
  no in-gamut move exists, it falls back to ADR-0111 §5 (hue held, chroma free, smallest ΔE00).
- `packages/ui/src/sampleInk.ts`, with two functions:
  - `sampleEdge(hex, colors, drawn)`, at 3:1;
  - `sampleInk(hex, colors)`, at 4.5:1: `inkOnSample` first, and the move only where neither ink
    passes. Results are memoised per (hex, palette).
- `Text` gains `on?: Sample`.
- `FabricSwatch.tsx` (the pinked edge) and `ProvenanceChip.tsx`.
- A conformance rule, `sample-ink`, with an on-sample resolution in `tree.ts`.
- ADR-0116.

### Decision 1 — Cards (criterion 1)

**Today:**
- The fill is `nativeElevation[level]` (`surface.1/2/3`), which is correct.
- The default radius is `lg`.
- There is no resting border; the 2 dp edge is reserved for selection.
- `media` is edge to edge only.

**Drawn:**
- Every filled `ui:Card` on a scaled screen is `bg: level1`, and nearly all bind
  `border: border.subtle`. The exceptions are 25's cards, 26 (C3), `02.reading`, and one card on 24.
- The radius is `md` on most; `sm` on 05, 11, 16, 17 and 18; `lg` on 22's garment cards and
  `24.capture`. `06` records none.
- Levels 2 and 3 appear only on `00`. `00`'s level 1 is white (C5), and P3 gives it the screens'
  value.

**Delta:**
- **A resting `border` edge,** at the measured width, drawn as an inner overlay. That keeps F-176's
  reserved selection edge, the `selection-treatment` rule and E-120's inset pin untouched.
- **Levels 2 and 3** take whatever edge `00` draws, measured.
- **The default radius is `md`,** the mode of the drawn radii. A test recomputes it, with the old
  `lg` as the decoy.
- **Light.** If 25 draws no edge, then 01 and 25 contradict each other. P1 and P2 settle it: the
  structure follows 01 and the value follows 25 (light `border`). That becomes C20 in §6.
- **Media.** `mediaInset` and `mediaRadius` are added for the garment-photo cards (11, 22).

### Decision 2 — The sample forms (criterion 2)

| form | elements (dp) | built as |
|---|---|---|
| full-width hero (01 06 20) | `01.hero.sample` 285×172 · `06.swatch` 337×299 · `20.card.swatch` 243×216 | `Swatch` with `width="fill"` |
| detail (03) | `03.sample.swatch` 105 · `02.reading.sample` 66×58.5 · `24.capture.swatch` 104 | `Swatch` |
| anchor (19 21) | `19.anchor.swatch` 87.5×81 in a `text.primary` ring · `21.anchor.swatch` 76.5 in a ring | `Swatch anchor`: ring width and gap measured |
| list (64 and 48) | `19.rows`, `21.results`, `24.rows`, `01.wardrobe.tile`, `07.anchor.swatch`, `03.matches`, `04.target.swatch`, `05.card-*.swatch`, `10.palette-2.swatch-*`, `08.pair.*` | `Swatch` (rectangles) |
| strip (40) | `01.colour-card.sample` 52×40 · `17.palette.swatch-*` 58.5×41 · `16.slots.slot-*` 130.5×35 | `Swatch` |
| joined bands (10 23) | `10.palette-1.strip` (recorded `ui:Bands`) · `23.palettes.kasane-*` (`new:KasaneStrip`) | `Strip`; re-recorded as `ui:Strip` |
| split target bar (04) | `04.gauge.pair` (`new:SplitBar`) | `Strip` with two members; re-recorded |
| pinked-edge fabric (12) | `12.source.swatch` 83.5 (`new:FabricSwatch`) | new `FabricSwatch`, with tooth pitch and depth measured |
| garment-photo card (11 22) | `11.grid.garment-*` · `22.compat.garment-*` | `Card` media inset |

- Criterion 3 also needs `09.results.result-*` (the result card IS the swatch, R9 §5) and
  `17.draping.option-*.swatch`. Both are re-recorded as `ui:Swatch`.
- **The `Swatch` API** (all additive):
  - `width` / `height` beside `size`;
  - `keyline` (the default recomputed);
  - `caption?: 'name'`: every existing call site passes it, so no screen loses a name;
  - `anchor`, `bleed` and `children`;
  - no padded well;
  - the target through `hitArea()`, so small samples draw at their drawn size;
  - the default `size` recomputed from the inventories.
- **`Strip`** gains `corner`, a per-member edge, and no well padding or ring. **Its height is
  unchanged:** see OQ-45.

### Decision 3 — The keyline replaces the hairline, moved the E3 way per sample

- **(R) Replace.**
  - The README `swatch.keyline` is composited over `swatch.well` (`compositeEncoded`) and judged
    against this sample at 3:1. If it fails, it is moved the smallest lightness step that passes.
  - Where the element draws no keyline, the base is the ground, so the line appears only where the
    sample would not otherwise clear 3:1 against its card.
  - It stays one line inside `padding: 1`, which keeps E-078's literal.
- **(J) Join.** The README keyline plus the chosen hairline tone: two lines.
- **The rule, stated before the measurement.**
  - The construction must pass the blocking scan: every gamut-grid sample and every corpus colour,
    in all four palettes, at 3:1.
  - Among those that pass, E3's description wins: "the smallest lightness step that passes on the
    surface it is drawn on".
  - So R is chosen if its scan finds a move for every sample. ADR-0111 §5 is the fallback; J applies
    only where even that fails, and the ADR records it.
- **What stays:**
  - `swatch.hairline(.inverse)` stay, for the reticle (E-072) and the export card.
  - `swatch-edge.test`'s two-tone scan stays and is re-labelled as the reticle's proof.
  - `keylineTones` and `pairRingTone` are retired, with `swatch-keyline.test`. E-079 is superseded.
- **The `swatch.keyline` unreached entry** is removed in the increment where `Swatch` first reads the
  token.

### Decision 4 — Text on a sample (criterion 3)

- **`sampleInk`** keeps C8 wherever it works. Where neither ink clears 4.5:1, the ink needing fewer
  steps moves the E3 way; pure white and black give at least 4.58:1 against any colour, so a move
  always exists.
- **`Text on={sample}`** draws in that ink. `inkOnSample` and `Chip`'s tinted badge are unchanged:
  24 is F-259's (E-158).
- **A plate or scrim is rejected.** It would be an element no mockup draws: not an E3 move, and a
  person's decision.
- **Why this is E3, not a new rule.** The on-sample text elements bind `tokens: {}`, and C8 says "no
  token is fixed here". The contrast floor is a blocking gate, and E3's documented mechanism is the
  smallest lightness step that passes. ADR-0116 records it, and F-267 carries the moved values for a
  person to confirm, as it carries F-225's decision A.
- **If the review rules otherwise,** OQ-44 is the fallback:
  > *"Neither text colour reaches 4.5:1 on N of 120 corpus colours per palette. Move the ink the E3
  > way per sample, set the text on a plate no mockup draws, or something else?"*
- **Gate 9** gets `apps/mobile/test/screens-sample-ink.test.ts`, picked up by `test:contrast`. It
  runs every `allEntries()` against the four palettes:
  - `sampleInk(derived.hex).contrast ≥ 4.5`;
  - the census set, where neither ink passes, is pinned per palette. That pin is the decoy: it proves
    the move is exercised.

### Decision 5 — The provenance chip (criterion 4)

- **"Belongs to the component" means the chip is a member of the sample family.** It takes the same
  `Sample`, so its words can only be that sample's provenance. The surfaces place it beside or above
  the sample, as drawn (P1).
- **`ProvenanceChip({ sample, copy, fill, edge, icon, height })`:**
  - `copy` is exhaustive over `MeasurementSource`, by type;
  - it is built on `Chip form="badge"`;
  - it reads `provenanceBadges` and returns `null` when that is false;
  - it sits outside the sample's accessible node, so the `Swatch`'s name is identical under both
    settings (`display-settings.test`).
- **The copy keys** land with the first surface that draws a chip (F-243, F-256, F-259).
- **F-284 keeps its own criteria** and gets the evidence.
- **ADR-0005:** every new form takes a `Color`, and a bare hex does not compile.

### Decision 6 — Drawn height versus ADR-0095's floor: raised as OQ-45, not decided

- **The conflict.** `04` draws its bar at 46.5 dp, `10` at 60 and `23` at 45.5. ADR-0095 clamps a
  `Strip` to 77 dp (`pair.test`: "refuses to go under it").
- **The planner proposed ADR-0117,** amending ADR-0095 so that the drawn height governs.
- **The implementing session does not adopt it.** ADR-0095's floor is there so a sample that carries
  a ΔE00 figure is judged under the viewing conditions the figure was computed for. That is golden
  rule 11's ground ("never overstate accuracy"). Choosing between it and the drawings is choosing a
  rule over what the mockups draw, which is not in the delegation (F-226's review, OQ-13).
- **Raised as OQ-45, against F-245, F-251 and F-260:**
  > *"04, 10 and 23 draw their joined samples 46.5, 60 and 45.5 dp tall, under ADR-0095's 77 dp
  > floor for a pair that is judged. Follow the drawn height (rule 14), keep the floor (rule 11), or
  > keep it only where a figure is shown?"*
- **F-233 is unaffected.** Criterion 2 asks for each form's keyline and corner, and the `Strip` keeps
  its current height behaviour until OQ-45 is answered.

### Consumers, and what they will see (intended, as F-232's (e))

- **`Card`** (about 60 sites):
  - corners go from 16 to 10 dp;
  - a hairline `border` edge appears;
  - the four level-2 cards get `00`'s level-2 edge.
- **`Swatch`** (about 40 sites):
  - the 8 dp well padding goes;
  - the two-tone ring becomes one line, moved per sample;
  - names are unchanged, because every site passes `caption`;
  - small swatches are no longer inflated to 44 dp.
- **`Pair` / `Strip`:** no well padding; the ring becomes per-member edges. **Heights are
  unchanged.**

### Increments (each ends green)

1. **Measure and record. No product code.**
   - Sample edges (keyline present or absent, width, tone, any well frame) on 00 01 02 03 04 05 06
     08 10 12 16 17 19 20 21 23 24.
   - `00.cards.level1/2/3`; 25's card edge; 06's card radius.
   - 11's and 22's photo inset and radius; 19's and 21's ring width and gap; 17's drape corners;
     12's pinking.
   - Record `tokens.keyline` and new `raw` keys (`keylinePx`, `toothPx`, `pitchPx`, `ringPx`,
     `gapPx`), named in the schema.
   - Re-record `04.gauge.pair`, `10.palette-1.strip` and `23.palettes.kasane-*` as `ui:Strip`;
     `09.results.result-*` and `17.draping.*.swatch` as `ui:Swatch`; `12.source.swatch` as
     `ui:FabricSwatch`. Update `illustrations.test`'s `SAMPLE_COMPONENTS` in the same increment.
   - Add `mockups/tools/sample-census.mjs`, printing:
     - the corpus set that fails both inks, per palette;
     - the keyline-alone pass share;
     - R's move count and its null count.
   - Raise OQ-45 (PRD, R9 §11, F-245, F-251, F-260).
   - Gates: `generate-inventory.mjs <ids>` clean, `verify-mockups`, `test`.
2. **`on-sample.ts`.**
   - Gamut scans: 3:1 for the edge and 4.5:1 for the ink, with no null.
   - New `swatch-edge.test` cases, with decoys, and its `worstCase` model fix.
   - The manifest's roles and `uncheckedReason`s, then `generate --check`.
   - ADR-0116, and R9 §4 E3 rows (edge, ink), §5, and §6 C8.
   - A colour-scientist consult.
3. **`sampleEdge` / `sampleInk`, and `Text on`.**
   - The conformance `sample-ink` rule and the on-sample resolution, with decoys.
4. **The gate-9 corpus test** in `apps/mobile`, with the pinned census.
5. **Rebuild `Swatch`.**
   - Rectangles, `bleed`, `anchor`, `children`, explicit `caption` everywhere, `hitArea`, no well,
     and the R edge inside `padding: 1`.
   - Recompute the defaults; update `swatch-corners.test`.
   - Retire `swatch-keyline.test` and `keylineTones`.
   - Remove the `swatch.keyline` unreached entry.
6. **`Strip` / `Pair`.** `corner`, per-member R edges and no well, with subjects for 04, 10 and 23.
   **Height is unchanged (OQ-45).**
7. **`FabricSwatch`.** The measured pinked path with the R edge as its stroke, a subject, and the
   ADR-0005 type test.
8. **`Card`.**
   - The resting edge overlay; the `md` default, recomputed.
   - The level-2/3 edge and the light edge, as measured.
   - Media inset and radius.
   - Subjects for levels 1–3 × four palettes, plus media.
9. **`ProvenanceChip`.** A subject with the setting on and off, and F-284's evidence.
10. **Close-out.**
    - Effects E-160…E-163, with memory notes. Updates to E-131, E-157, E-086, E-158 and E-072;
      E-079 retired.
    - R9 §4, §5, §6 (C8, and C20 if needed), and `DESIGN-SYSTEM.md`; the ADR index.
    - Notes to F-242 through F-262 (pass each element's `dp`, corner and keyline; `Text on`), F-259,
      F-284, F-267, F-249 and F-253.
    - `progress.md`.

## Mockup fidelity

- **Governing:** `00` (P3). The screens beat it on their own surfaces: 01 02 03 04 05 06 07 08 09 10
  11 12 16 17 19 20 21 22 23 24. `25` gives the light palette (P2).
- **Bindings:** fills are `corpus:`, `store:` and `engine:` hex values (E1). Chip words come from the
  sample's own provenance.
- **Departures:**
  - E3 for the edge, and E3 for the ink.
  - E2: `00.wells2.delta.caption` (F-219) is never carried.
  - E1: the woven texture the generator drew inside samples becomes the colour, or the stored
    photograph where the binding is `photo`.
  - Not built, by rule: `26.kasane.bar` (C3), `25.hero.sample` (C7), `00.cards.level1`'s white (C5),
    and the leaked size labels (§2).
- **Deferred to a person:** the joined samples' height (OQ-45).

## Anticipated effects

- **E-131** (radius → `swatchCorner`): the well layer goes, and rectangles use their min side. Guard:
  `swatch-corners.test`.
- **E-079:** retired, superseded by E-160.
- **E-072:** unchanged; its case is re-labelled.
- **E-078:** the `padding: 1` literal survives.
- **E-086:** text over a sample is measured by `sample-ink`.
- **E-158:** unchanged; F-233 reuses it.
- **E-157:** gains `SWATCH_SIZE`, `CARD_RADIUS` and the keyline default.
- **E-120, E-132:** unchanged; their guards hold.
- **Token reach:** `swatch.keyline` is now read.
- **E-007, E-128:** as usual.
- **New links:**
  - **E-160:** `on-sample.ts` → `sampleEdge`/`sampleInk` → `Swatch`, `Strip`, `FabricSwatch`,
    `Text`.
  - **E-161:** `sample-ink` → `tree.ts` → gates a11y and contrast.
  - **E-162:** `provenanceBadges` → `ProvenanceChip` → F-243, F-256, F-259, F-284.
  - **E-163:** inventory component names → `illustrations.test`'s `SAMPLE_COMPONENTS`.

## Test plan

- **Property:** `moveOnSample` over the 0.05 gamut grid in four palettes. Every edge clears 3:1,
  every ink 4.5:1, and there is no null.
- **Decoys:**
  - the unmoved keyline fails;
  - a helper that returns its base unmoved fails the scan;
  - the unmoved two-ink choice fails on `#87795D` and on the census set;
  - `#4495A3` passes unmoved.
- **Gate 9:** every corpus colour in every palette clears 4.5:1, and the census set is pinned.
- **Conformance:**
  - `sample-ink` reports text below 4.5:1 over a declared sample;
  - it is silent for the `sampleInk` value;
  - it is silent over an unresolvable ground;
  - every new form and state is a subject in all four palettes.
- **Types:** a `@ts-expect-error` for a bare hex on every form. The decoy, with a `Color`, compiles.
- **Defaults:** recomputed from the inventories, with the counts asserted. The old `lg` and `72` are
  the decoys.
- **Chip:** drawn when the setting is on, and nothing when it is off; the sample's name is identical
  either way.

## Verification

Run each gate separately and record the printed exit code. Never grep a summary line: that lesson is
in `a-pipe-hides-the-exit-code-that-decides-the-commit`.

```
node scripts/verify-state.mjs; echo state=$?
pnpm typecheck; echo typecheck=$?
pnpm lint; echo lint=$?
pnpm format:check; echo format=$?
pnpm test; echo test=$?
pnpm build; echo build=$?
pnpm test:a11y; echo a11y=$?
pnpm test:contrast; echo contrast=$?
pnpm test:cvd; echo cvd=$?
node scripts/verify-mockups.mjs; echo mockups=$?
```

Capture the census output as evidence. There is one evaluator review at the end: its findings are
fixed, or recorded as `backlog`, and the gates are re-run.

**Criterion → proof:**
- **1:** `cards.test` and the recompute tests.
- **2:** `sample-family.test`, `swatch-corners`, `pair`, and the conformance subjects.
- **3:** `on-sample.test` and gate 9's corpus test.
- **4:** typecheck and `provenance-chip.test`.

## Risks and open questions

- **A latent defect in `swatch-edge.test`.** `worstCase` takes the max over both compositing models,
  where its comment says "the worse". It is fixed in increment 2, and the decoys are re-verified.
- **OQ-44** is the fallback if Decision 4's reading is rejected.
- **OQ-45 (raised):** the joined samples' height against ADR-0095. F-245, F-251 and F-260 wait on
  it.
- **`08` draws its compare samples apart,** where ADR-0095 says they touch. That is F-249's question;
  it gets a note.
- **The edge is composited over `swatch.well`.** A sample on a level-2 or level-3 ground is slightly
  off. C11 says samples sit on level 1, and a test holds that assumption.
- **The move search can take up to 1000 steps.** It is memoised per (hex, palette).
- **Device palettes** are guaranteed by construction; the gate checks the four manifest palettes.
- **The export card** keeps the two-tone ring. That goes to F-253 and F-263.
- **A photo has no single colour to move against:** a drawn photo keyline is the token, unmoved.
- **JPEG readings** carry ΔE00 ≈ 2 and ±0.5 dp.

## Out of scope

- Composing any screen.
- Placing a chip on a screen, and the chip copy keys (F-284's criteria).
- Outline-only cards (F-260, F-253).
- `app:OutfitSlot` (F-248, F-257), and 24's tinted badges (F-259).
- Selection on `Swatch` and `Card`.
- `00`'s ΔE00 badge.
- `KasaneBar`, `ThemeTile`, `TextureBadge`, `PaletteSlot`, `CorpusChip`.
- The export card SVG, and the `Sheet`.
- **The joined samples' height (OQ-45).**

## Status (implementing session)

| inc | commit | what landed |
|---|---|---|
| 1 | `06550f0` | Measured and recorded: the samples, the cards, the rings; 04, 10 and 23 re-recorded as `ui:Strip`, 09 and 17 as `ui:Swatch`; `sample-census.mjs`; OQ-45 raised. |
| 2 | `a80d1c0` | `onSample` and `paintedOver`; gamut scans for the ink (4.5:1) and the edge (3:1) in four palettes, no null; `swatch-edge.test`'s `worstCase` takes the worse compositing model and 8-bit samples; ADR-0116; R9 §4 E3 (per sample), §5, §6 C8; the keyline's role. The colour-scientist consult (not a review round) found no wrong value and asked for four fixes, all made: the reach proven per luminance instead of argued from white and black; the fallback holding hue (it could drop chroma to 0), on §5's grid and E3's order, 12 ms interpreted where a ΔE00-ranked grid took 630 ms; the tie-break stated and settled by ΔE00; the edge floor called the product's guarantee at 1.4.11's ratio, not a WCAG requirement. **It also found the fallback is live**: device palettes leave a gap on 222 of 720 seeds, now each answered in `on-sample.test`. |
| 3 | `899bf52` | `sampleInk` / `sampleEdge` (memoised per palette and sample); `Text on={sample}`, a token and a sample together refused by type; the conformance rule `sample-ink` and the moved ink's exemption by value; `Text on a sample` subjects in four palettes; `swatch.keyline`'s unreached entry removed, now that it is read; F-307 recorded (the emitter pre-composites `.on.` values in linear light). |
| 4 | `88fb2d0` | Gate 9 over the corpus (`apps/mobile/test/screens-sample-ink.test.ts`, in `test:contrast`): all 120 colours, four palettes, text at 4.5:1 and the edge at 3:1 with and without the keyline, measured by `wcagContrast`; the census set pinned as the decoy (7, 9, 19, 6), and exactly those move; every drawn value digested per palette, and a 0.01 change to the edge floor shown to fail all four. |
| 5 | `e7b57df` | `Swatch` rebuilt: `width` / `height` / `width="fill"`, `keyline` (default drawn, 35 of 64), `caption="name"` (all 35 app call sites pass it), `anchor` (ring and gap per surface: 19 draws 2.3 / 3.8 dp, 21 draws 1.3 / 3.1), `bleed` (17's draping sample, which the inventory records as bled into its card), `children`; no well; the target through `hitArea`; the line is `sampleEdge` inside `padding: 1`; `SWATCH_SIZE` 60, recomputed (72 the decoy). Selection is drawn as `SelectionFrame`, outside the box like F-232's FocusRing, since the well it was painted on is gone. `swatch-corners.test` loses the well; the screens' inset pin loses exactly the 427 well paddings. **Moved to increment 6:** `keylineTones` and `swatch-keyline.test` retire with the `Pair` rebuild, which still draws the two-tone ring. |
| 6 | `68f9399` | `Strip` / `Pair`: no well, no ring; each member's outer edges carry its own line, moved against its own colour (`sampleEdge`), none where two meet; `corner` (default `md`, 4 of 5) and `keyline` (default not drawn, 3 of 5), recomputed; subjects for 04, 10 and 23 in four palettes; `halfWidth` is half. **Heights unchanged (OQ-45).** `keylineTones`, `pairRingTone` and `swatch-keyline.test` retired (from increment 5). The screens' inset pin loses the 4 strips' wells and rings, and nothing else. |
| 7 | `4fa53b6` | `FabricSwatch`: 12's pinked sample, measured by the new `mockups/tools/pinking.mjs` (12 tips across the top at 13.3 px, 13 down the left at 12.2; pooled pitch 12.7 px, depth 5.3 px, so 6.5 and 2.5 dp); whole teeth centred on each side, tips on the box edge; the outline stroked in the sample's line (`sampleEdge`); one named image; `12.source.swatch` re-recorded as `ui:FabricSwatch` with `raw.toothPx` and `raw.pitchPx`, named in the schema; `illustrations.test`'s `SAMPLE_COMPONENTS` follows. Subjects on a pale and a mid-tone sample. |
| 8 | `20852ec` | `Card`: `CARD_RADIUS` `md` (56 of 87; the old `lg` the decoy); a resting edge of one dp of `border` (`border.subtle`), measured 2 px wide on 01's hero, on level 1 only (73 of 80 filled cards bind it; board 00 draws none on levels 2 and 3), drawn over the outer edge where the state edge is reserved, and only at rest; `edge={false}` for the level-1 cards drawn without one; `mediaInset` / `mediaRadius` (11: 7.25 dp, `sm`; 22: 6.6 dp). **No C20**: 25 draws the card edge in its light `border.subtle`, as 01 does in the dark. `cards.test`; subjects for levels 1–3 and the inset media. |
| 9 | `ad0be88` | `ProvenanceChip`: takes the `Sample`, so its words are that sample's provenance, from copy exhaustive over `MeasurementSource` by type; `Chip form="badge"` at 03's, 12's and 24's forms; draws nothing when `provenanceBadges` is off; outside the sample's node, so the sample's name is identical either way (asserted on the rendered tree). Subjects: 03 outlined, 24 filled with the camera, and a sample with the chip hidden by 15's switch (F-284's criterion 3). The copy keys land with the first surface that places a chip. |
| 10 | `4859df8` | Effects E-160 (onSample → the sample family → gate 9), E-161 (sampleInk → the `sample-ink` rule and its exemption), E-162 (15's switch → ProvenanceChip → the surfaces and F-284), E-163 (inventory names → the default tests and the illustration scan), each with its note; E-079 resolved; E-072, E-078, E-086, E-131 and E-157 updated. DESIGN-SYSTEM.md (the well is the card; the line and the ink per sample; contract rule 9). Notes to F-242–F-263, F-267 (the moved values to confirm) and F-284 (its evidence). |
| review | this commit | One evaluator review: FAIL (B1, B2; S1–S5; M1–M11), every gate green. **Fixed:** B1 (the line's width measured and drawn — 01's hero 2.5 dp, 06's 6.9 — with `keylineWidth`; its light colour registered as C20, P4), S1 (the ring is 00's; corrected in ADR-0116, R9, Swatch and F-267), S3 (a chosen sample listed in E4; the frame's false claim corrected; a bled sample's frame drawn inside), S5 (a filled width declares no more than the target), M1 (stale comments and roles), M2, M3 (222; outlined against filled), M6 (the ring is `foreground.2`, re-recorded), M7 (no line where none is drawn or needed), M10 (the exemption takes the value's role), M11 (12's texture under E1). **Raised for a person:** B2 (04's seam and one-sided outline, into OQ-45) and S2 (a line where the mockup draws none, and its direction: OQ-46). **Recorded:** S4 (criterion 4's reading, on F-233), M4 (12's 13 teeth down the left, on F-267), M5 (22's photo corner, on F-258), M8 (render cost on a device, F-308). M9 is the progress entry. |

**Found on the way, and corrected where it is quoted:**
- The two-tone keyline's worst case is **4.16**, not the 4.23 quoted since F-068: the tones moved after
  it was measured and nothing held the prose to the scan. `swatch-edge.test` now pins it.
- E-072's guard named gate 9 for `swatch-edge.test`, which runs in gate 5.
