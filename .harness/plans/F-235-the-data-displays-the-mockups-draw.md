# Plan: F-235 — The data displays the mockups draw

| | |
|---|---|
| **Feature** | F-235 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-61, FR-11, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` (the displays, `figures.ts`, `testing/tree.ts`) · `mockups/inventory` + schema · `apps/mobile` (two imports only: `Compare.tsx`, `test/screens.test.tsx`) |
| **Author** | planner subagent; adopted, with the amendments at the end of Approach, by the implementing session |
| **Date** | 2026-10-05 |

---

## Intent

This feature builds every data display the mockups draw, once each, in `@irodora/ui`. The screen
features F-245–F-260 then compose them:

- the readout table and its forms;
- delta rows and the proximity headline;
- the coverage dial and the radar;
- the metric tile, the ranked row and the factor row;
- the step pill, the carousel and the page dots.

To a user, done means:

- every number is set in tabular figures;
- every number says what it is (its unit) and where it was computed (its space);
- every chart is read aloud as words.

No screen changes in F-235.

**The reading chosen for criterion 4.** "Carries its unit **and space**" could mean two things:

- **(a)** FR-61's *"with the space each was computed in named beside it"*;
- **(b)** a typographic space between the number and its unit.

This plan takes **(a)**, FR-61's own words. Reading (b) contradicts every drawing: `84%` (11),
`−14.2°` (08) and `ΔE00: 48.2` (19) all print no space.

**State fix in increment 1.** Criterion 2 cites `13`, but F-235's `mockups` array omits it.
Increment 1 adds `13` and logs the change in `progress.md`.

## Approach

**Reused (verified in the tree):**

| What | Used for |
|---|---|
| `Text` (`numeric`, `script`, `on`, `align`, `weight`) | every text element |
| `Card` (level 1, edge, radius) | tiles and row surfaces |
| `Swatch` / `swatchAccessibleName` | row samples |
| `Strip` | 04's split sample (its height stays as-is, OQ-45) |
| `Chip form="badge"` (`fill`, `edge`, `tint: Sample`, `height`) | 21/24 ΔE00 badges and the step pill |
| `Button` plain/outlined with a trailing arrow (F-234) | 19/21 row actions |
| `Glyph` (`score-*`, `seal-star` exist) | factor icons, the sparkle |
| `hitArea`, `FocusRing` | carousel neighbours |
| `react-native-svg` | already a peer dependency, used by `Glyph`/`controls.tsx` |
| the conformance registry, `tree.ts` | subjects and checks |
| the E-157 recompute pattern | every drawn value |
| `generate-inventory.mjs` and the `mockups/tools` measurers | increment 1 |
| `Compare.tsx:75` `signed()` | hoisted, not copied |
| `screens.test.tsx:2647–2670`'s ragged-figure scan | moved, not copied |
| AppBar's inline `English • 日本語` construction | extracted to `bilingual.tsx`, which AppBar then imports |

**New:** `figures.ts`, `ReadoutTable.tsx`, `DeltaBars.tsx`, `ProximityHeadline.tsx`,
`CoverageDial.tsx`, `Radar.tsx`, `MetricTile.tsx`, `RankedRow.tsx`, `FactorRow.tsx`, `StepPill.tsx`,
`Carousel.tsx`, `PageDots.tsx`, `bilingual.tsx`. Also ADR-0119, OQ-50, OQ-51 and OQ-52.

Two rules apply to every family:

- **Every drawn dp is a named exported constant recomputed from the inventories.** No literal goes in
  a style.
- **No component authors copy (ADR-0056).** Every string is the caller's.

### Decision 1 — Figures (criterion 4, the foundation)

**`Figure` is a discriminated union:**

- `colour { value, places, signed?, unit, space }` — **unit and space are both required**;
- `share { fraction }` — rendered as `%`;
- `count { value, signed?, noun }`.

Empty strings are refused at render.

**Two formatters:** `figureText` is the visible string; `figureName` is the accessible string, and
**always** carries value, unit and space.

**Every figure node is `Text numeric selectable`.** `selectable` keeps FR-48 criterion 2 green when
F-249 replaces Compare's `Metric`/`AxisRow`.

**`signed()` (U+2212) moves to `figures.ts`, and `Compare` imports it.** `Preferences.tsx:193`'s
ASCII net-count formatter is a different quantity, so it is left alone and noted for F-262.

**The ragged scan becomes a conformance rule.** `carriesFigure`/`figureNodes` move into
`testing/tree.ts`, and `screens.test` imports them. A new `ragged-figure` rule runs over every
registry subject in both themes.

**Where the unit and space appear:**

- **Visibly**, wherever the governing element has a slot for them: 06's row labels, 08's notation
  sub-line (`(CIEDE2000)`, `ΔL*`), 26's cell labels, and the "ΔE00" in 19/21/24.
- **In the accessible name**, always.
- **04's delta values have no slot.** That is criterion against drawing, so it goes to a person as
  **OQ-51**. As drawn, the space ships in the accessible name only.

### Decision 2 — The readout table (criterion 1)

`ReadoutTable` takes a required `form` and
`rows: { label, notation?, value: Figure | Figure[], reading? }[]`. Each row is one accessible
element: label, then `figureName`, then the reading.

| form | governs | elements | recompute (decoy) |
|---|---|---|---|
| `table` | 06 | `06.readout.table` (re-record `new:DataTable`→`ui:ReadoutTable`); rows `.hex .oklch .cielab .srgb` (`app:ReadoutRow`→`ui:ReadoutRow`) | `READOUT_ROW` (the row pitch); `READOUT_LABEL` 70.5 = value.x − row.x (08's 66); outer edge, column divider and row rules in `border`; label `label` 500 `foreground.2`; value `label` 400 tabular `foreground` |
| `ruled` | 08 | `08.metrics` and `08.access` rows (add `ui:ReadoutRow` containers); `.label` `.value` `.formula` `.reading` `rule-n` | `READOUT_RULED_LABEL` 66 (06's 70.5); `layout: 'columns'` for metrics and `'stacked'` for access; sub-lines `caption` `foreground.2`; row pitch 38 (rule-1 to rule-2) |
| `grid` | 26 | `26.readout` (add a `ui:ReadoutTable` child and cell containers), `.divider` 1.5 dp at the card's centre, `rule-1/2` | cell inset 12.5 (spacing `sm` 8); label-to-value 21.5; two columns, so 5 values leave the sixth cell empty, as drawn; label `body` 400 `foreground.2`; value `body` 400 tabular |

Two consequences of the drawings:

- **06's sRGB row prints `91, 107, 120 | Display-P3: …` in one value.** So `value` accepts `Figure[]`
  with an inline sub-label. Increment 1 records the P3 segment as its own elements.
- **26's labels use full-width `（…）`.** 26's drawing provides that precedent (P2).

### Decision 3 — Delta rows and the proximity headline (criterion 1)

**`DeltaBars` (04).** Elements: `04.gauge.{lightness,chroma,hue}.{label,bar,value}` and
`04.gauge.axis`, grouped under a new `04.gauge.deltas` (`ui:DeltaBars`). The bars are re-recorded
from `ui:Bands`. Each `.value` splits into `.value` and `.reading` after the inks are measured.

- Bar height `DELTA_BAR` 14, the median of 14/14.5/14 (decoy: `Bands`' 10); row pitch 25.25; one
  axis, 1.5 × 78 dp in `foreground.2`, spanning all rows.
- Horizontal geometry is held as fractions of the content width: the axis at **0.499**, the value
  column from **0.641**. These are unaffected by OQ-16, because 04's gauge is drawn 400 dp wide.
- API: `rows: [{ label, delta: Figure (signed), reading, ink, scale }]`; `ink` and `scale` are
  **required, with no default**. The drawing does not define the scale (lightness and chroma about
  120 dp per unit, hue 67.5 dp per degree; asymmetric room; no clamp). That is **OQ-50**. The F-235
  subject reproduces 04's drawn lengths from its sample values, labelled as a test fixture.
- **Rule 13 holds:** sign is carried by side, by the signed figure, and by the reading.

**`ProximityHeadline` (04).** Elements: `04.gauge.distance` (`body` 600 tabular), `.band` (`body` 500),
`.sparkle` (`seal-star`, 32.5 × 33), `.pair` (`Strip`, two members, `sm`, keyline) and `.caption`
(`caption`, two lines, `foreground.2`), under a new `04.gauge.headline`.

- The band's and sparkle's ink is required and typed to existing tokens. The green is F-245's mint
  (C10 census); the subject passes `foreground` as a fixture.
- The sparkle is hidden from assistive technology; the band's words carry it.
- The reading's words are F-222's (blocked, OQ-9). The slot takes the caller's string.
- `04.gauge.caption`'s "(Neutral APCA keyline)" looks like leaked text. It is noted to F-245, not
  decided here.

### Decision 4 — The coverage dial and the radar (criterion 2)

**`CoverageDial` (11).** Elements: `11.coverage.ring` (`new:RingGauge`→`ui:CoverageDial`,
90.5 × 80 dp, `fg: text.primary`, `track: border.subtle`), parenting `.figure` (`title` 600 tabular)
and `.figure-label` (`caption`, two lines), all centred at x ≈ 193.

- The open arc comes from increment 1's raw readings (`raw.sweepDeg`, `raw.gapDeg`, `raw.strokePx`,
  cap). Decoys: 360° and 270°.
- API: `fraction` and `label`. **No `figure` prop** (`@ts-expect-error`): the dial formats its own
  `share`, so the arc and the number cannot disagree.
- Accessibility: one element with role `image`, named `label, 84%`; the SVG is hidden.

**`Radar` (17).** Elements: `17.radar.chart` (`new:RadarChart`→`ui:Radar`, 91 dp,
`track: border.subtle`), parenting the four `axis-*` labels (top, right, bottom, left; `caption`
`foreground.2`).

- Measured in increment 1: ring count, spokes, marker diameter, stroke, fill alpha, and the two vertex
  inks (blue at top/right, grey at left/bottom).
- `axes` is a 4-tuple by type (three and five are `@ts-expect-error`); each axis is
  `{ label, fraction, figure }`.
- `ink` is required and typed to existing tokens. Which colour is OQ-24 (F-260), and increment 1 adds
  the vertex-ink finding to OQ-24's text; which axes is OQ-25 (F-260).
- Accessibility: role `image`, a label composed from the data — `name: axis figure` joined by `, `
  (Latin) or `、` (Japanese), tested in both scripts.

### Decision 5 — Tile, rows and pill (criteria 2 and 3)

**`MetricTile` (22).** Elements: `22.stats.{unlocked,pairings,duplicates,gaps}`
(`ui:Card`→`ui:MetricTile`), each with `.figure`, `.label`, `.detail`.

- Drawn: 169 × 112.5, level 1, edge, `md`, centred; figure `title` 600 tabular, label `body` 500,
  basis line `label` 400 `foreground.2`.
- The figure step is `figureSize: TypeSize`, defaulting to the recorded `title` (the §2 snap). Its
  `raw.emDp` reads 45.3–47.4, which is **OQ-13**; that blocks F-258, not F-235. If OQ-13 adds a step,
  the answer is data.
- Accessibility: one element reading figure, label, basis. Tile spacing (10/10.5) is noted to F-258.

**`RankedRow`** takes a required `form`, one per screen (P1; no board draws one). Props are refused by
type where the drawing refuses them.

| form | elements | drawn values | refused by type |
|---|---|---|---|
| `harmony` (19) | `19.rows.row-n` (`new:HarmonyRow`→`ui:RankedRow`) `.swatch .name .detail .wear` | swatch 62 `md`, no keyline; name `body` 500 one line, through `bilingual`; detail `label` `foreground.2` holding the ΔE00; outlined `sm` action 81 × 25.5 (copy is OQ-26's) | `rank` |
| `nearest` (21) | `21.results.row-n` (`new:CorpusRow`→`ui:RankedRow`) `.swatch .name .distance .hex .view` | swatch 61.5; name `body` 400, two lines; ΔE00 `Chip` badge `surface.2` with edge, `sm`; hex tabular `foreground.2`; plain *View →* | `rank` |
| `fields` (24) | new `24.rows.row-n` containers over `.rank .relationship .distance .swatch .{japanese,romaji,hex}.{label,value}`, `rule-n` | rank `body` 400 figures; badge `tint: sample` (C10 sample kind, `Text on`); swatch 54.5 with keyline; labels `label` `foreground.3`; values `title` 400; 1.5 dp rules | `action` |

19 and 21 draw no rank numeral, so the order carries the rank (rule 14). Swatch sizes are recomputed
per form against `SWATCH_SIZE` 60 as the decoy.

**`FactorRow` (13).** Elements: add `13.score.{harmony,fit,contrast,balance,cvd}` containers over
`.icon .label .value .note`, with `rule-n`.

- Drawn: icon 14; label `label` 400; figure `label` 500 tabular; reason `label` 400 `foreground.2`;
  columns at fractions 0.07 · 0.73 · 0.82 of the 320 dp rule width; pitch 26.
- FR-11: the reason is the caller's rendering of `ComponentScore.messageKey`, so direction is carried
  in words. `ui` takes no `@irodora/recommendation` dependency.
- The brackets are drawn copy structure: `(…)` in Latin, `（…）` in Japanese (26's precedent).
  OQ-30 and OQ-32 are F-257's.

**`StepPill` (17).** Elements: `17.step` (`ui:Chip`→`ui:StepPill`, 220.5 × 19, pill, level 2, measured
#343C46), plus a new child `17.step.label`. It composes `Chip form="badge"` at `STEP_PILL_HEIGHT` 19
(decoy: `BADGE_HEIGHT` 21), takes `step`, `total` and `text`, and `text` must contain both figures
(refused otherwise, as F-234 does for `name`).

### Decision 6 — The carousel and the page dots (criterion 3)

**`Carousel`** takes a required `form`.

- **`centred` (20)** — `20.carousel` (`new:Carousel`→`ui:Carousel`), `.previous`, `.card`, `.next`:
  `CAROUSEL_PEEK` 39.25 and `CAROUSEL_GAP` 12.5, held in dp, the item taking `width − 2(peek + gap)`
  (280.5 at 384 dp; decoy: a peek proportional to the width). Neighbours are `Pressable`s named by
  the caller, reaching the target through `hitArea`, with `FocusRing` on focus. The container is
  `adjustable`, with increment and decrement actions.
- **`leading` (22, 23)** — `22.compat` (component `null`→`ui:Carousel`) and a new `23.palettes.row`:
  items start at the caller's inset; the gap is the median of 5/7/6.5/7 (decoy: `ACTION_BAR_GAP` 8);
  the trailing item is clipped.
- **Snapping is not drawn; it is derived (ADR-0119).** Each drawing's rest composition (centred, or
  leading) holds only if the scroll comes to rest there, so it snaps to that, and this is a device
  attestation.

**`PageDots` (25)** — `25.dots` (`new:PageDots`→`ui:PageDots`, 50 × 7.5 dp): dot diameters, the
smaller fourth dot, the gap and the inactive ink measured in increment 1; props `current`, `total`,
and a caller `label` that must contain both figures. 25 draws the active dot by ink alone (rule 13)
and the small fourth dot's meaning is undrawn: **OQ-52**. Nothing ships to a screen — C2 adopts `01`'s
layout, and `01` draws no dots — so the dots live in the registry only.

### Decision 7 — Kinds and the registry

The displays register as `static`, as `Bands`, `Strip` and `Pair` do: `data` owes
`loading`/`error`/`empty`, which `27` draws and F-236 builds. Every form gets a subject in four
palettes (light, dark, slate.dark, obsidian.dark) and both locales.

### Amendments on adoption (the implementing session)

1. **The centred carousel's kind is settled against the suite in increment 7**, not by returning
   `null` for `disabled` and `loading`: the suite reports `null` as `state-missing` (F-234 met exactly
   this and answered it with the `navigation` kind, earned by the tree). Whatever kind it takes is
   earned by what it draws, and its neighbours' targets are checked.
2. **The `ragged-figure` rule over the existing registry.** If it finds a ragged figure in a
   component F-235 does not build, that is recorded as backlog with its file and line rather than
   fixed here; the rule ships green over F-235's displays and the screens it already scanned.

### Increments (each ends green)

1. **Measure and record. No product code.**
   - Every re-record above. **Ids are never renamed** (E-149's C10 keys survive); only `component`
     and `parent` move, and containers are added.
   - Raw readings for 11, 17, 04 (bar, value and reading inks), 25 and `17.step.label`.
   - Re-measure 20's neighbour height (584 is the carousel's, not the card's 424.5), 22's 137-vs-128.5
     widths, and 23's clip edge (the strip ends at 381.5, past the card's 368.5).
   - Schema: the new `raw` keys and `ui:` names. Name-keyed tests (`badges`, `cards`,
     `sample-family`, `illustrations`) re-stated with reasons.
   - Raise OQ-50, OQ-51 and OQ-52 in PRD §10 and R9 §11, and extend OQ-24. Add `13` to F-235's
     `mockups`.
   - Gates: `generate-inventory.mjs <ids>` clean, `verify-mockups`, `test`, `state`.
2. **`figures.ts` + `bilingual.tsx`.** `signed` hoisted (Compare imports it); AppBar uses `bilingual`;
   the scan moves to `tree.ts`; the `ragged-figure` rule with its decoy.
3. **`ReadoutTable`** (three forms) + `readout.test` + subjects.
4. **`DeltaBars` + `ProximityHeadline`** + `delta.test` + subjects.
5. **`CoverageDial` + `Radar`** + `charts.test` + subjects.
6. **`MetricTile`, `RankedRow`, `FactorRow`, `StepPill`** + `rows.test` + subjects.
7. **`Carousel` + `PageDots`** + `carousel.test` + subjects.
8. **Close-out:** ADR-0119 and its index entry; R9 §6 notes on C2/C3 and §11; DESIGN-SYSTEM.md (the
   displays, and why they are `static`); effects with notes; feature notes; lessons.

## Mockup fidelity

**Governing.** Each display follows its own screen (P1), and no board draws any of them (P3 has
nothing to govern): the table forms 06, 08, 26 (P2 for Japanese type); the deltas and headline 04;
the rest 11, 17, 22, 19, 21, 24, 13, 20, 23, 25.

**Contradictions settled:**

- **19, 21 and 24 draw three different rows**, and **20 against 22/23 are two carousels**. Each
  becomes a form (P1).
- **06 against 26:** C3 gives the page 06's single column. The `grid` form is built because criterion
  1 names it. **No screen composes it unless C3 is flipped** (a note to F-247).
- **The page dots:** C2 keeps 25's dots off Home.

**Bindings.** No name, number, date or provenance line from a mockup reaches the build (§8). Mockup
values appear only as labelled test fixtures.

**Departures:** none new. E3 applies (hit areas on the row actions and the neighbours). What is not
built follows rule 14: no rank numeral on 19/21, no per-row action on 24.

**Deferred to a person:** OQ-13 (the tile figure); OQ-16 (04's width, handled by proportions); OQ-19
(06's scale); OQ-24 and OQ-25 (radar); OQ-26, OQ-28, OQ-30, OQ-32 and OQ-9 (slot content, the
caller's); OQ-45 (`Strip` height); OQ-46 (keylines on 19/21 swatches, unchanged `Swatch`); OQ-50,
OQ-51 and OQ-52.

## Files to touch

```
packages/ui/src/{figures,bilingual,ReadoutTable,DeltaBars,ProximityHeadline,CoverageDial,Radar,MetricTile,RankedRow,FactorRow,StepPill,Carousel,PageDots}.ts(x) — new
packages/ui/src/AppBar.tsx              — imports bilingual (no behaviour change)
packages/ui/src/index.ts                — exports
packages/ui/src/testing/tree.ts         — figure scan moved here
packages/ui/src/testing/conformance.ts  — `ragged-figure` rule
packages/ui/test/{figures,readout,delta,charts,rows,carousel}.test.tsx — new
packages/ui/test/conformance.test.tsx   — subjects
packages/ui/test/{badges,cards,sample-family,illustrations}.test.* — counts re-stated if they move
apps/mobile/src/screens/Compare.tsx     — import signed
apps/mobile/test/screens.test.tsx       — import the scan
mockups/inventory/{04,06,08,11,13,17,19,20,21,22,23,24,25,26}.json, mockups/inventory.schema.json
docs/PRD.md §10, docs/design/R9-MOCKUP-FIDELITY.md §6/§11, docs/design/DESIGN-SYSTEM.md, docs/adr/0119-*.md + index
.harness/state/{effects.json,feature_list.json,progress.md}, .harness/memory/effects/*.md
```

## Anticipated effects

| link | change | guard |
|---|---|---|
| E-128 | inventory re-records | `verify-mockups` (+`--prove`) |
| E-157 | gains `READOUT_*`, `DELTA_*`, `DIAL_*`, `RADAR_*`, `TILE_*`, `RANKED_*`, `FACTOR_*`, `STEP_PILL_HEIGHT`, `CAROUSEL_*`, `DOTS_*` | the recompute tests, each with a decoy |
| E-163 | component renames move the name-keyed counts | `badges`/`cards`/`sample-family`/`illustrations` tests |
| E-149 | C10 elements (`04.gauge.band/.sparkle/.chroma.bar`, `24.rows.row-*.distance`, `13.score.harmony.icon`) are re-parented, not renamed | `c10-exceptions.test` |
| E-121 | `tree.ts` gains the figure scan | `tree.test`, and the screens sweep unchanged |
| E-138 | `numeric` reaches every new figure; 15's switch governs it | the conformance tabular cases, plus the new `ragged-figure` rule |
| E-156 / E-151 | new pressables (carousel neighbours) | tap-target and focus rules |
| E-120 | tiles and rows compose `Card` | `cards.test` |

**New links:**

- **E-168:** the data displays → the screen features that compose them (F-245, F-247, F-249,
  F-252–F-255, F-257–F-260). Guard: the conformance subjects, the recompute tests, and the notes.
- **E-169:** the `Figure` contract (unit and space required) → every figure on every surface. Guard:
  type refusals, the runtime refusal, and the `ragged-figure` rule over the registry and the screens.
- **E-170:** the props an open question decides — the ink of the band, sparkle, bars and radar; the
  bar scale; the radar axes; the tile figure step. Each has no default, so an answer
  (OQ-13/24/25/50, F-245's mint) changes data, not code. Guard: `@ts-expect-error` cases for an
  omitted prop, and `c10-exceptions.test` when a token is minted.

## Test plan

- **Recompute** every constant in Decisions 2–6 from its inventory elements, each with the decoy
  named there. Counts are asserted, so a re-record is seen.
- **Property:** delta bars — for any `delta ≠ 0` the bar lies on its sign's side and length is
  monotone in `|delta|` up to `scale` (decoy: a bar on the wrong side); dial — sweep = `fraction` ×
  total sweep and the text is `round(100·fraction)%` for `fraction` in [0,1]; radar — vertex radius
  = `fraction` × the radius.
- **Criterion 4:** every subject passes `ragged-figure` (a planted `<Text>4.2</Text>` is the decoy);
  `figureName` always contains unit and space (an empty space throws); every chart is one accessible
  element whose label contains each figure (decoys: an unnamed SVG arc, a radar label missing an
  axis).
- **Type refusals** (`@ts-expect-error`): `rank` on `harmony`/`nearest`; `action` on `fields`; three
  or five radar axes; `figure` on the dial; no `form`; no `ink`/`scale`.
- **Text containment:** `StepPill`/`PageDots` text that omits a figure is refused.
- **Carousel:** the peek held in dp at 360 and 430 dp; `adjustable` actions move the index; a
  neighbour press selects.
- **Conformance:** every form in four palettes and both locales; the Radar label in both scripts.
- **Golden:** none — no colour value is computed. **E2E:** none — no screen changes.

## Verification

Run each gate separately and record its printed exit code:

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
node scripts/verify-mockups.mjs --prove; echo mockups=$?
```

One evaluator review; its findings are fixed or recorded as `backlog`, and the gates re-run.

| criterion | proof |
|---|---|
| 1 | `readout.test`, `delta.test` |
| 2 | `charts.test`, `rows.test` |
| 3 | `rows.test` (StepPill), `carousel.test` |
| 4 | `figures.test`, the `ragged-figure` rule, the text-equivalent cases |

**Owed attestations (device):** the dial's arc and caps, and the radar's rings, polygon and markers,
rendered by `react-native-svg` on iOS and Android; the carousel's snapping to its drawn rest, and its
peeks at 360/384/430 dp; 200 % text in tiles, rows, tables and the step pill, with no clipped
figures; VoiceOver and TalkBack reading the text equivalents, including "minus" for U+2212, `%`, `°`
and the Japanese separator; tabular alignment down the table columns; the neighbours' hit areas.

## Risks and open questions

**OQ-50 (raise; blocks F-245, not F-235):**

> *"04 draws three signed bars from a centre axis but no scale: lightness and chroma come to about
> 120 dp per unit, hue to 67.5 dp per degree, and the room is asymmetric (a third of the row left of
> the axis, an eighth right). At what delta does a bar reach its edge, does it clamp, and is the
> scale F-222's descriptor bands?"* — and, if increment 1 finds the three inks are not one token,
> what each bar's ink means.

**OQ-51 (raise; blocks F-245):**

> *"04's delta rows print a signed figure with no notation or space, where 08 prints ΔL\*, ΔC\* and
> ΔH under the same words, and FR-61 asks for the space named beside every value. Add 08's notation
> to 04's rows, or keep 04's drawing with the space in the accessible name only?"* The
> accessible-name-only form ships until it is answered.

**OQ-52 (raise; against F-242 and F-267):**

> *"25 marks its active page dot by ink alone (golden rule 13) and draws a smaller fourth dot with no
> stated meaning. Which second channel does the active dot take, and what does the small dot mean?
> C2 keeps the dots off Home until C2 is flipped."*

**Other risks:** scope is large (13 components), so each increment is reviewable alone; 06's dp values
depend on OQ-19, and a re-record moves `READOUT_LABEL` (the tests say so); JPEG readings carry
ΔE00 ≈ 2 and ±0.5 dp, framed images ±1 dp.

## Out of scope

- Composing any screen.
- Every slot's content: OQ-9, OQ-26, OQ-28, OQ-30, OQ-32, and F-222's bands.
- Minting the green or the blue (F-245, F-260).
- The loading, empty and error states (F-236).
- 26's hanko seal, kasane bar and peeking hero (C3, F-247).
- 08's E2 verdicts (F-249).
- The radar's adjacent range sliders (they exist).
- 22's tile grid spacing and badges (F-258).
- Any colour value, golden dataset or corpus change.

**Notes for close-out:** F-245 (OQ-50/51, ink props, the caption leak), F-247 (C3/grid, the P3
segment), F-249 (`ruled` replaces `Metric`/`AxisRow`), F-252/F-254/F-259 (row forms),
F-253/F-258/F-260 (carousel forms, OQ-13, OQ-24/25), F-255, F-257, F-242/F-267 (OQ-52), F-236
(states), F-262 (the ASCII `signed`).

## Status (implementing session)

| inc | commit | what landed |
|---|---|---|
| 0 | this commit | Claimed, and this plan. |

### Increment 1 readings taken so far (not yet recorded in the inventories)

Read with `mockups/tools/measure.ps1`, `corner.ps1` and a pixel dump fitted in Node (2026-10-05).

- **11 dial** (`11.coverage.ring`, 0.5 dp/px): centre (385.3, 306.0) px; centre-line radius 83.4 px;
  stroke about 12.4 px, round caps; the open arc runs about 276° on its centre line, with an 84° gap at
  the bottom. The fill runs about 249° (≈ 0.90 of the sweep) for a printed 84 %, so the drawing's arc
  and number disagree. Fill ink #EDF0F3 (`text.primary`); track #515860, nearer `border.strong` than
  the recorded `border.subtle`.
- **17 radar** (`17.radar.chart`, 0.5 dp/px, centre ≈ (223, 858) px): six evenly spaced rings (vertices
  at about 15, 30, 46, 61, 75 and 90 px), 1 px, #3D4247; spokes on both axes, 2 px, #2E343F; markers
  9 px; polygon edge about 2.5 px; fill #5E6675 over #1D2027. Two vertex inks: blue at Temperature and
  Depth (#94B5E0, #89ADE0), grey at Muted Tolerance and Chroma (#C2C1C5, #CDCDD1), the edge blending
  between them — this goes into OQ-24's text.
- **25 dots** (0.817 dp/px): the active dot 9 px (#242525), two inactive 8 px (≈ #BFBFB9), the small
  fourth 4 px, pitch 18 px. The active dot's extra px may be its higher contrast through the same
  threshold (±1 px).
- **04 deltas** (0.7342 dp/px): bar inks lightness #566673, chroma #5EC382, hue #89939D — three inks,
  so OQ-50 must also ask what each means. The labels (#CCCDCF) and figures (#CDCED0) are the
  headline's ink (#CED0D1, `text.primary`), not the recorded `text.secondary`; only the bracketed
  readings are `text.secondary` (#9A9CA0). Each bar's outer end has a 3 px radius, and the axis end is
  square.
- **20 carousel**: the ground is #17181C; the left neighbour's edge (x 70–83 px) runs from row 213 to
  1286, so the neighbours are outlines about 1074 px (537 dp) tall, not the carousel's 584 dp or the
  card's 424.5 dp.

**Still to read:** 22's tile widths (137 vs 128.5) and carousel gaps; 23's clip edge; `17.step.label`.
**Then:** every re-record listed under Increments, the schema, OQ-50, OQ-51 and OQ-52, and `13` in
F-235's `mockups`.
