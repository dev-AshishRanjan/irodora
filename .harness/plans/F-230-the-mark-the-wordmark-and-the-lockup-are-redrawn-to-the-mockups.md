# Plan: F-230 — The mark, the wordmark and the lockup are redrawn to the mockups

| | |
|---|---|
| **Feature** | F-230 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 — [`docs/PRD.md`](../../docs/PRD.md). It runs under the NFR-8 (a11y, contrast) and NFR-10 (cvd) gates |
| **Service / package** | `@irodora/ui` (`brand.tsx`) · `@irodora/design-tokens` (the manifest's type scale and `cvdPairs`, and their tests) · `scripts/` (`generate-brand-assets.mjs`, `png.mjs`) · `apps/mobile` (one call in `Home.tsx`, the generated brand assets) · `mockups/` (inventories `01` and `14`, the schema, two measuring tools) |
| **Author** | planner subagent; adopted by the implementing session |
| **Date** | 2026-10-06 |

---

## Intent

What a person will see when this is done:

1. **The mark is mockup 14's blossom on every surface.** That means Home's header, the native splash and the launch overlay, the avatar fallback, 15's and 22's app bars, 20's card and the app icon. The blossom is five overlapping round petals, a ring cut around a centre disc, and stamen lines cut outward from the ring. F-165's six discs are gone.
2. **It is one ink everywhere, the icon included.** The icon's five corpus colours go, and ADR-0093 is superseded. The ring and the stamens are *holes*, so the surface under the mark shows through and no second colour is ever painted. 27's purple loading mark stays the one declared exception. F-236 builds it.
3. **Home's header lockup is 01's.** That is the filled mark, then "Irodora" in Gelasio Regular at the size 01 draws it. That size is about 32 dp, not today's 72 and not `title` 22. The mark and the name are centred on each other, 9.5 dp apart. **The splash lockup is 14's:** the mark over the name over 彩り・色の知性. It is built to 14's proportions, and F-231 places it.

OQ-13 closes too, by a rule (ADR-0121), because the wordmark's size cannot be set without one.

**Readings chosen where the criteria are ambiguous.** Each reading is stated so a reviewer can contest it.

- **(a) "The splash lockup is 14's"** means the mark, the name and 彩り・色の知性 in one component, which is how C4 itself lists 14's lockup. Four things stay with F-231's third criterion: the glow, the subline, the wave, the progress line, and placing the lockup in the launch overlay. If a reviewer reads the lockup as the mark and the name only, the tagline slot is the one thing to remove.
- **(b) "The icon included"** means every generated asset is one ink.
  - The ink is 14's icon ink: `14.icon.tile.mark` binds `text.secondary`, which is dark `foreground.2`.
  - The ground is the dark `background` the adaptive layer already composes over.
  - 14's tile (its gradient and squircle) is F-231's first criterion and is not built here.
  - Keeping today's light ground is not an option. A one-ink adaptive foreground would be dark ink on its dark `backgroundColor`, which is invisible.
- **(c) "Recognisable at 16 px"** means 16 *pixels*. That is the brief's unit (BRAND §7) and stricter than 16 dp. It is asserted on the silhouette. The cuts are sub-pixel at that size, and nothing is claimed about them there.
- **(d) "Under protan, deutan and tritan simulation."** A monochrome mark has one channel: its ink against its ground. So the check is that figure–ground pair under simulation, scored by the same `separationScore` the product ranks with (E-005). It runs for every ink/surface pair any governing mockup draws a mark on. Simulating the ink alone would map one colour to one colour, which is the "theatre" `brand.test.tsx` rightly rejects today.

## Approach

**Reused (verified in the tree):**

| What | Path | Used for |
|---|---|---|
| `MARK`, `Mark`, `markSvg`, `Wordmark`, `svgNumber`, `MARK_MIN_SIZE` | `packages/ui/src/brand.tsx` | evolved in place. Criterion 1 names `MARK` in this file, so it stays declared here |
| the narrowed `MARK` parse, the supersampled rasteriser, `--check`, `--prove`, `ADAPTIVE_SAFE_FRACTION` | `scripts/generate-brand-assets.mjs` | the icon, adaptive, themed and splash assets (E-116, E-085) |
| `encodePng`, `decodePng`, `rowSignature`, `carriesMark` | `scripts/png.mjs` | the artefact signature (`verify-apk.mjs` imports `expectedSignature` unchanged) |
| `Text` (`face="serif"`, `heading`, steps, `dynamicTypeRamp`, `maxFontSizeMultiplier`) | `packages/ui/src/Text.tsx` | the name and the splash tagline |
| `typography.scale`, `faces.serif.steps`, `cvdPairs`, the C10 `exceptions` | `docs/design/design-system.manifest.json` | measured steps, the mark's CVD pairs, the 27 exception |
| `generate-design-tokens.mjs` (`--check`), `dynamicTypeRampFor`, `nativeLargeTextSizes` | `scripts/`, `packages/design-tokens/src/typography.ts` | the new steps flow through the existing emitter |
| `type-scale.test.ts` (ADR-0113's recompute-from-inventories pattern) | `packages/design-tokens/test/` | measured steps, recomputed the way `caption` is |
| `checkSeparation`, `CVD_SEVERITIES`, both models, `manifest-pairs.test.ts` | `packages/design-tokens/src/check.ts`, `test/cvd/` | gate 10 over the mark's pairs |
| the role → token mapping (`SURFACE`, `textToken`) | `packages/design-tokens/test/inventory-pairings.test.ts` | **hoisted** into a shared test helper and imported, not copied |
| `c10-exceptions.test.ts` and the manifest row for `27.lens-working.mark` (F-225, `mintedBy: F-236`) | `packages/design-tokens/test/` | "the one declared exception" |
| sRGB → OKLCh conversion | `@irodora/color-core` (already a `ui` dependency) | proving `MARK_INKS` are achromatic in four palettes |
| `measure.ps1`, `stem.ps1` (ink box at 50 % crossings; `-render` for calibration), `serif-weight.mjs` (HarfBuzz outlines of Gelasio), `generate-inventory.mjs`, `art-measure.ps1` as a model | `mockups/tools/` | increment 1 |
| the committed cut `Gelasio-Regular.ttf` | `apps/mobile/assets/fonts/` | ems from the face's own outlines |
| the conformance registry and its four palettes; the E-157 recompute pattern (`rows.test`, `carousel.test`) | `packages/ui/test/` | subjects and drawn constants |
| `unreached-tokens.json` and `verify-token-reach.mjs` | `.harness/verification/`, `scripts/` | the new steps while unread; `display1` afterwards |

**New:**

- `mockups/tools/mark.ps1` measures a drawn mark: radial and angular profiles plus circle fits, with `-calibrate`.
- An `--em` mode in `serif-weight.mjs`, or a sibling `serif-em.mjs`. It gives the ink box of a drawn word per em, from the face's outlines, with a calibration run.
- Two **measured type steps** in the manifest scale, proposed names `wordmark` and `wordmarkSplash` (ADR-0121).
- In `brand.tsx`:
  - the new `MARK` fields;
  - the pure functions `markShapes()`, `markCovers(u, v)`, `markInkBox()`, `markReach()`;
  - `MARK_INKS`;
  - `Wordmark` with a required `form: 'app' | 'splash'`;
  - the `LOCKUP_APP_*` and `LOCKUP_SPLASH_*` constants.
- `apps/mobile/assets/brand/mark-geometry.json`, generated and byte-compared.
- Tests: `packages/design-tokens/test/cvd/mark.test.ts`, `packages/design-tokens/test/mark-census.test.ts`, and a shared inventory-mapping helper.
- **ADR-0121** closes OQ-13. **ADR-0122** records 14's mark in one ink and supersedes ADR-0093. The next free ADR number is 0121 (README's last row is 0120).
- New effect links **E-171, E-172, E-173**. The last link is E-170.

### Decision 1 — The mark's geometry is measured off 14, and recomputed

**`MARK` stays in `brand.tsx` as one flat block of scalars, on the 24-unit grid.** It stays flat because the generator reads it by pattern (E-116). It holds:

- `grid`;
- `petals` (5);
- `orbit` (how far a petal's centre sits from the mark's centre);
- `petal` (the petal radius, larger than `orbit·sin 36°`, so neighbours overlap into one silhouette);
- `ringOuter` and `ringInner` (the cut annulus);
- `eye` (the centre disc; dropped if the reading shows the disc fills the ring's inside);
- `stamens` (count) and `stamenPhase` (degrees from straight up; 0 means pointing at a petal);
- `stamenInner`, `stamenOuter`, `stamenWidth`;
- `anther` (the radius of a dot at a stamen's tip; 0 if 14 draws none).

**Every value is 14's reading, converted to grid units through the mark's reach.** F-165's "two numbers, both radii solved from the interval" goes, and `brand.tsx`'s header essay is rewritten to say so. The proportions are now the drawing's, not derived from 間.

**How the geometry is measured (increment 1): `mark.ps1`**, built on System.Drawing as `art-measure.ps1` is.

- **Centre:** the ink centroid, refined by symmetry.
- **Edges:** each edge is read at the 50 % crossing between the local ground and the ink. 14's splash mark has a glow, so its local ground is read from an annulus just outside the reach.
- **Petals:** an angular profile at several radii gives the petal count, the phase (petal 1 points up) and the notch depth. The outer contour radius against angle is fitted lobe by lobe to circles, which gives `orbit` and `petal`.
- **Ring and eye:** a radial profile along the bisectors that miss the stamens gives `eye`, `ringInner` and `ringOuter`.
- **Stamens:** an angular profile at radii between the ring and the petal tips gives the count, phase, width, inner and outer radius, and any anther dots.

**The instrument's decoy is `-calibrate`.** It renders a synthetic mark of known geometry with the same point test, at each crop's pixel size, and saves it as JPEG q85, as ADR-0112's weight calibration did. It must recover each parameter within a stated error; the target is ±0.5 px. Three decoy syntheses must read as what they are: four petals, six petals, and no ring.

**Which crops:**

- `14.splash.mark` — box (503, 534, 111 × 108) px at 1.3521 dp/px = 150 × 146 dp. This is the governing reading: the largest crop, at the highest contrast.
- `14.icon.tile.mark` — (157, 617, 109 × 109) px. A second, independent render, at lower contrast on a gradient.
- `01.header.mark` — (73, 80, 78 × 77) px. Read as a cross-check only; C4 takes the geometry from 14. Where 01 differs (01 may draw anther dots), 14 wins.

**If the two 14 readings disagree** (decided on the 2026-10-05 delegation and recorded in ADR-0122):

- Where they agree within the calibrated error, `MARK` takes their mean.
- Where they do not, the splash reading governs. It is the mark itself, larger and at higher contrast, while the icon draws it on a tile. The icon's reading is recorded beside it.

**Cross-check against the drawn aspect.** The mark's ink-box aspect computed from the geometry must match the drawn one: about (1.809·orbit + 2·petal) / (1.902·orbit + 2·petal), with petal 1 up, against 108/111 = 0.973. The blossom is not vertically symmetric.

**What is recorded.** These go in `raw` on both 14 elements, in px: `petals`, `orbitPx`, `petalPx`, `ringOuterPx`, `ringInnerPx`, `eyePx`, `stamens`, `stamenPhaseDeg`, `stamenInnerPx`, `stamenOuterPx`, `stamenPx`, `antherPx`, `reachPx`. The schema's `raw` description names them.

**The recompute (`brand.test.tsx`).** Each `MARK` field must equal its reading within the calibrated tolerance. The decoys must be refused:

- F-165's current `MARK` (six discs, no ring);
- four petals;
- six petals;
- stamens rotated by half a period;
- a geometry with no ring.

### Decision 2 — The cuts are holes, so the mark is one ink on any surface

**Petals and eye are filled in one ink; the ring and stamens are clipped out.** The clip is a `ClipPath` whose path uses `clipRule="evenodd"`. Its subpaths are the viewBox rectangle, the ring's outer and inner circles, and each stamen rectangle and anther dot. So the surface shows through the cuts wherever the mark sits: the ground, a card, the avatar circle, 14's gradient tile, the splash glow.

**Painting the cuts in the ground colour is rejected.** That would be a second ink, and it would be wrong on any surface that is not flat.

**The constraint evenodd imposes.** No two cuts may overlap; a stamen starts at or outside `ringOuter`. The structure test asserts this.

**Fallback.** If a device shows `react-native-svg` mishandling `clipRule`, the fallback is one evenodd `Path` built from the petals' union outline (arcs between neighbours' intersections). It is the same point set, and the change is recorded as a plan revision.

**Pure functions both renderers read:**

- `markShapes()`: the circles, the ring and the stamens.
- `markCovers(u, v)`: the point test — inside a petal or the eye, and in no cut.
- `markInkBox()`: the extents in grid units. The blossom is not vertically symmetric, and the lockups lay out against the ink, not the viewBox square.
- `markReach()`.
- `narrowestFeature(size)`, redefined as the narrowest cut the mark's identity rests on at that size.
- `MARK_INKS`.

`Mark` renders the shapes. `markSvg(ink, size)` emits the same document: one ink, with the array form refused by type. Both read `markShapes()`.

**The generator keeps reading `MARK` by pattern**, still scoped to the block, and still refusing two declarations or none. The pattern widens to decimals (`[\d.]+`) and to the new fields. Its point test is derived from the same scalars.

**The generator also emits `mark-geometry.json`.** This is `apps/mobile/assets/brand/mark-geometry.json`: the derived shapes, rounded through `svgNumber`'s rule. `--check` byte-compares it. `brand.test.tsx` asserts `markShapes()` equals it. That closes E-116's "WHAT IS NOT GUARDED": the two derivations are compared through a file both sides can read. Because `@irodora/ui`'s tests now read a file outside the package, it is added to turbo's inputs the way `verify-cache-scope.mjs` requires.

**`Mark size` keeps its meaning** (the viewBox edge), so `Launch`, `AppBar`, `Avatar` and `launch.test.tsx`'s `MARK.grid` viewBox assertion are unaffected.

### Decision 3 — Monochrome everywhere, the icon included (ADR-0122 supersedes ADR-0093)

**The component.** `Mark`'s `color` is one of `MARK_INKS`: `foreground`, `foreground.2`, `foreground.3`, `inverse.foreground`, as today. A tinted token does not compile.

**The generated assets:**

- `icon.png`: the mark in dark `foreground.2` on dark `background`.
- `adaptive-icon.png`: the same ink on a transparent ground, composed by Android over `nativeColors.dark.background`. iOS and Android therefore show one image, which is E-060's stated intent and is false today (`icon.png` has the light ground).
- Splashes: unchanged inks (each theme's `foreground`, on a transparent ground).
- Themed icon: one ink.
- `PETALS`, `corpusHexes()` and the corpus-pin case in `--prove` are removed.

**`--prove` asserts every asset is one ink, by decoding its bytes.**

- A transparent asset paints exactly one RGB among its painted pixels.
- An opaque asset has every pixel on the segment between ground and ink, within ±1 per channel for antialiasing.
- The decoy: ADR-0093's five-colour icon, rendered in memory, must be refused.

**`--prove` joins the `lint` chain**, after `--check`. Today it runs only by hand, so the icon half of criterion 3 would otherwise rest on a proof no gate runs. This makes a gate stricter and lowers nothing.

**The one exception is `27.lens-working.mark`.** F-225 already declared it in the manifest's C10 exceptions (`mintedBy: F-236`). F-236 adds its minted token to `MARK_INKS`. Increment 7's census makes "the one" checkable.

**ADR-0122** is written in increment 4. It covers:

- **Decision:** the geometry, measured from 14 and recomputed; the cuts are holes; one ink everywhere, the icon included; the one exception; the icon's flat dark ground until F-231 builds 14's tile.
- **Alternatives:** keep ADR-0093's coloured icon; paint the cuts; draw a small-size variant without stamens, which no mockup draws; trace 14 as a bitmap, which breaks "drawn from code" and E-116.
- **What is lost:** ADR-0093's answer to *"a colour product whose icon has no colour"*. That is now answered by the person's 2026-09-10 decision (*"no deviation from the mockups"*) and by C4, both quoted.
- **Revisit when.**

If the ADR names a kamon variant (the drawing has stamens, which plain 梅鉢 does not), it cites a source. Otherwise it describes the drawing (BRAND §4 warns against borrowed shorthand).

### Decision 4 — OQ-13: type a screen draws off the scale (ADR-0121)

**Recommendation: answer the rule in general, and apply it in F-230 only to F-230's own elements** — the two wordmarks and the splash tagline.

**Why general and not wordmark-only:**

1. OQ-13 *is* a rule question: *"The screens' sizes (P3), or §5's steps?"* Any per-element answer implies a rule. §1 says a default here must be "a rule applied, not a taste exercised".
2. Five features are blocked on it (F-230, F-242, F-247, F-253, F-258). Answering one element leaves four sessions to decide the same rule separately, and a scale decided four times is how a scale stops being one.
3. The evidence is already gathered across every element: ADR-0113's list of off-scale elements.
4. "When a feature needs it, not in a batch" is still respected. Only the rule is decided now. Each other element's measurement, size and recompute test stay with the feature that builds it.

**The rule:**

1. Below 12 dp, type is `caption` (ADR-0113, unchanged; OQ-12 stays answered).
2. Within 4 dp of a board step, type takes that step (§2's snap and its tie rule, unchanged inside the band).
3. More than 4 dp from every board step, type is set at its **drawn size, as a measured step**:
   - It is declared in `typography.scale`, bound to the inventory elements that draw it (`elements: [...]`).
   - Its size is the median of their `raw.emDp`, to a tenth. Siblings drawn alike (§2) share one step.
   - Its leading is the nearest board step's: a single-line element draws no leading to measure.
   - Its tracking and weight are its face's (ADR-0112).
   - Where the face is bundled, `raw.emDp` is read from the face's own outlines.
4. `25` and `00` set nothing (P2, P3). The board keeps `display1` and `title`.
5. A census in `type-scale.test.ts` lists every governing element drawn more than 4 dp from every step. Each must be bound to a measured step or owed by a named feature that is not `done`. The owed rows fail once their owner is done, the same pattern as `closedBy`.

**Why 4 dp.** It is ADR-0113's own listing threshold. It exceeds the instrument's observed disagreement: the box method gives 01's wordmark 34, against about 32 expected from outlines, and 01's tagline 18.5, against about 16 from ADR-0112's ink heights of 24–31 px. After increment 1, the implementer computes and states the interval of thresholds over which no element's outcome changes; about 3.5–8 dp is expected.

**Alternatives** (the ADR states each cost):

| | rule | cost |
|---|---|---|
| A | Snap everything (§2 as written) | The wordmark comes out about 31–35 % smaller and the splash wordmark about 18 % larger. 06's kanji goes 53 → 72 (+36 %), 20's kanji 32 → 22 (−32 %), 22's figures −53 % or +55 %. These are visible departures with no §4 category forcing them, against P3 and the person's *"no deviation"*. §2's snap sentence was agent-written on 2026-09-14 (see the lesson *check who approved a rule*) |
| B | The drawn size everywhere | Instrument noise becomes product (an error of about 15 % at body sizes). Elements drawn alike on different screens get different sizes. OQ-12 reopens: 92 readings from 8.6 to 11.9 dp would become 92 sizes |
| **C** | **Within 4 dp, the step; beyond it, a measured step bound to its elements** | The scale grows by at most about six measured steps, each tied to its elements. `display1` is drawn by no screen. The threshold is a parameter, shown to be insensitive. Per-element steps need guards (a census and a source scan) |
| D | Measured steps shared across roles, by clustering | Fewer steps, but it couples unrelated roles: a wordmark and a card's kanji would share a size because the instrument cannot tell them apart, so remeasuring one moves the other |
| E | The wordmark only, sized as a logo by its lockup | Narrow and defensible for a logo. But it leaves four features to re-decide the rule, and the inventories record the wordmark as type |

**Evidence, with sources the implementer confirms on the published pages:**

- The person: *"no deviation from the mockups — we strictly need to materialise the mockup in our code"* (2026-09-10).
- P3: a screen beats the board for how a component looks on that screen.
- The 2026-10-05 delegation, quoted verbatim: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* It explicitly covers "a rule weighed against a drawing", which the 2026-09-24 delegation did not (ADR-0113's withdrawal).
- Apple HIG Dynamic Type: Large Title 34 pt. `typography.ts` already cites the ramp.
- Material 3 type scale: display 57 / 45 / 36, headline 32 / 28 / 24. Both systems keep a display tier between 22 and 72; board 00 jumps straight from 22 to 72, and the screens fill the gap repeatedly.
- WCAG 2.2: no minimum or maximum size. 1.4.4 (resize text) applies to the name, so the lockup scales as one figure (Decision 5).

**Limits, stated in the ADR:**

- The readings come off JPEG renders.
- The census sees only elements whose `raw.emDp` is recorded. `14.splash.wordmark` had none; increment 1 adds it. Others may be missing, which is F-273's work.
- `display1` becomes drawn by no screen.

**Where the rule lands in F-230** (re-read in increment 1):

| element | drawn | outcome |
|---|---|---|
| `01.header.wordmark` | `raw.emDp` 34 (box method). Its ink height is 48.9 px at 2 px/dp (ADR-0112); from Gelasio's outlines about 31–34 dp is expected | measured step `wordmark` |
| `14.splash.wordmark` | ink height 34.2 px × 1.3521; about 58–64 dp expected; no `emDp` recorded today | measured step `wordmarkSplash` |
| `14.splash.tagline` | box 115 × 17 px, seven full-width glyphs, so about 22 dp by width. It is recorded as `body` | re-read; `title` expected (gothic, 400) |

**Consequences for other features** (notes in `feature_list.json`, nothing built here):

- `01.header.tagline` → `body` (F-242).
- 17's slider labels (about 9 dp) → `caption` (F-260).
- 22's figures (45.3–47.4 dp) → one measured step (F-258); `MetricTile`'s figure step changes, as E-170 anticipated.
- `06.kanji` (53) and `26.hero.kanji` (40.4) → measured steps (F-247).
- `20.card.kanji` (32.2) → a measured step (F-253).
- `25.tagline` and `25.hero.kanji` → nothing (P2).

**Naming.** The steps are named by role, `wordmark` and `wordmarkSplash`; the implementer confirms the emitter's naming. A measured step is its elements' size, not a step a screen may pick. Two tests guard that:

- a source scan in `type-scale.test.ts`: only `brand.tsx` reads these steps, with a planted decoy;
- an inventory check: only their bound elements carry them as `type.size`.

**How the em is measured.**

- `stem.ps1` reads the ink box (height and width) at the 50 % crossings.
- `serif-weight.mjs`'s HarfBuzz path reads the ink box of "Irodora" per em from the committed `Gelasio-Regular.ttf`.
- em = ink ÷ inkPerEm × dpPerPx, computed from the height and from the width separately. The two must agree within the calibrated error; the width includes ADR-0112's tracking of ±0.006 em.
- Calibration: Gelasio is set at known ems at each crop's scale, saved as JPEG q85, and the em is recovered.

### Decision 5 — The two lockups

`Wordmark` takes a **required** `form`. Every dp below is a named constant, recomputed from the inventories as a ratio to the word's em (E-157):

- **`app` (01).** One row, mark then name.
  - The mark's ink width is 39 / em₀₁ × em (01 draws the mark 39 × 38.5 dp).
  - The gap, ink to ink, is 9.5 / em₀₁ × em (19 px), less Gelasio's left side bearing of "I", read from the font.
  - The mark's ink box is centred on the name's ink box. In 01 both centres sit at y = 59.25 dp.
  - `heading` stays optional.
- **`splash` (14).** Mark, name and tagline stacked on one axis. All three centres sit at x ≈ 558.5 px.
  - The mark's ink width is 150 / em₁₄ × em.
  - From the mark's ink bottom to the name's ink top is 31.1 dp (23 px). From the name's ink bottom to the tagline's ink top is 14.9 dp (11 px). Both are re-read on the ink in increment 1.
  - The tagline is `tagline: string`, the caller's copy (ADR-0056), set as Japanese gothic at its re-read step.
- **Refused by type:** `size`; `tagline` on `app`; a `splash` without `tagline`.
- **Recompute decoys:** F-226's lockup (mark = em, gap = em/8 ≈ 4 dp) is refused, and a stack gap on a spacing step is refused.

**Vertical alignment.** A Text's line box is not its ink box. The offset is derived from Gelasio's own metrics — unitsPerEm, the hhea ascender and descender, and the ink extent of "Irodora" — read with harfbuzzjs (the tool records the derivation) and kept as named constants. Where React Native puts the line box on each platform (iOS line-height distribution, Android `includeFontPadding`) is a device attestation; the jest tree has no layout.

**Text scaling (A7).** The name scales with Dynamic Type, so the mark and the gaps follow the name's rendered size.

- The name's own layout event (`onLayout`/`onTextLayout`) gives the scale. The first frame uses the unscaled values, which are exact at the default text size, so nothing moves unless a person has enlarged text.
- No mockup draws 200 % text. This is the drawing scaled, which is the reading every Text in the product already takes.
- At 200 %, the splash form's name (199 dp drawn) would exceed a 384 dp screen. Its scaling is capped so the lockup fits the width it is given; the cap is computed from the drawn width.

**Callers and the inventory.**

- Home's call becomes `<Wordmark form="app" heading />`. Its header lockup drops from 72 to about 32 dp, which is criterion 2; F-242 rebuilds the rest of Home.
- Inventory containers are added: `01.header.lockup` (73, 80, 309 × 77) and `14.splash.lockup` (485, 534, 147 × 194), both `ui:Wordmark`, over the existing ids.
- `01.header.wordmark` and `14.splash.wordmark` are re-recorded as `ui:Text`, serif, at their measured step. 01's `type` and `copy` are recorded as 14's are. **No id is renamed.**

### Decision 6 — Recognisable at 16 px, and under CVD

**At 16 px.** `brand.test.tsx` rasterises `markCovers` at 16 × 16 px, with 8 × 8 supersampling and box-averaging per pixel.

- On a circle between the notch radius and the tip radius (both derived from the geometry), coverage alternates five times, with maxima ≥ 0.6 and minima ≤ 0.4. The thresholds are documented from first principles.
- Decoys: a solid disc of the same reach gives no minima; six petals give six. That keeps the thresholds from being vacuous.
- The ring's cut is asserted at 16 px only if it is at least 1 px wide there. The stamens are reported as sub-pixel, and nothing is claimed about them.

**Under CVD.**

- `cvdPairs` gains every (ink, surface) pair a governing mockup draws a `ui:Mark` on: 01, 14, 15, 20 and 22. Its `_note` names the mark.
- `cvd/mark.test.ts` derives those pairs from the inventories through the hoisted role → token mapping. It requires each pair to be in `cvdPairs`, so a new placement cannot escape gate 10.
- `manifest-pairs.test.ts` already scores each pair over three deficiencies, eleven severities and both models. The implementer confirms it reaches all four palettes, Slate and Obsidian included. If `THEMES` is light and dark only, `mark.test.ts` passes the derived palettes through `checkSeparation`'s `themes`/`palettes` parameters.
- **The decoy:** ADR-0093's red and green petals (#AC473E, #4E8164) as a pair collapse under deutan. So the check can fail for a coloured mark.
- `02.capture.mark` (fg `ground` on a level-1 parent) is listed as owed by F-243 if its pair does not map: the inventory does not record the button's inner fill.

### Decision 7 — The registry

`Brand` becomes three `static` subjects:

- the `app` lockup;
- the `splash` lockup, with a fixture tagline labelled as a fixture;
- a standalone `Mark` at 16, labelled.

Each runs in four palettes and both locales. The name is Latin in both (ADR-0112). The splash tagline is Japanese in both and declares its language.

### Amendments on adoption (the implementing session)

1. **The four readings in Intent, (a) to (d), are adopted as written.** Each is a reading of the
   criterion text, stated so the one review can contest it.
2. **Increment 0 does not write `progress.md`.** The history records finished work (F-235's claim did
   not write there either); the claim is the feature's `in_progress` status, its `plan` field and its
   `attested` entries.
3. **One review, then fix or record** (AGENTS.md loop step 5): the evaluator reviews F-230 once, after
   increment 8, and its findings are fixed or recorded as `backlog` features before the done record.
4. **The ids are confirmed free:** ADR-0121 and ADR-0122 (the index ends at 0120), and E-171 to E-173
   (the graph ends at E-170).

### Increments (each ends green, one commit each)

0. **Claim and plan.**
   - Save this plan and set F-230's `plan`.
   - Declare the three `attested` entries (see Verification).
   - Add a line to `progress.md`.
   - Gate: `state`.
1. **Measure and record. No product code.**
   - Add `mark.ps1` with its calibration and decoys, and the em-from-outlines mode with its calibration.
   - Record the readings in `inventory-data/14.mjs`: `raw` for both 14 marks, `raw.emDp`/`inkHeightPx`/`inkWidthPx` for the wordmark, the tagline re-read, and the gaps.
   - Record readings in `inventory-data/01.mjs`: the wordmark's `raw.emDp` re-read (the old value of 34 noted), and the gap and centring readings.
   - Name the new `raw` keys in the schema.
   - Document both tools in `mockups/tools/README.md`.
   - Re-record `14.splash.tagline`'s `type.size` if the reading moves it to `title`.
   - Regenerate inventories `01` and `14`.
   - Gates: `generate-inventory.mjs 01 14` clean, `verify-mockups` (+`--prove`), `test`, `state`.
2. **OQ-13 → ADR-0121.**
   - Manifest: the two measured steps (`elements`, size, leading, weight), and `faces.serif.steps` gains them.
   - The schema's `type.size` enum gains them.
   - Regenerate tokens.
   - Extend `type-scale.test.ts`: recompute each step, the census with its owed rows (F-242/F-247/F-253/F-258/F-260), and the source scan, each with a decoy.
   - Re-record the inventories' `type.size` for `01.header.wordmark` and `14.splash.wordmark`.
   - Add `unreached-tokens.json` entries for the two steps, `closedBy: F-230`.
   - Close OQ-13 in PRD §10; update R9 §2 (the snap sentence, for type), §5 and the §11 closed table.
   - Amend ADR-0113's status line ("OQ-13 closed by ADR-0121"); add the README index row; update DESIGN-SYSTEM's type line.
   - `feature_list.json`: remove OQ-13 from F-230/F-242/F-247/F-253/F-258 `openQuestions`, and add a note on each saying how the rule applies.
   - Gates: all, plus `generate-design-tokens --check`.
3. **The generator, refactored, with byte-identical assets.**
   - A point-test coverage rasteriser (4 × 4 samples, the same rounding).
   - `expectedSignature`/`carriesMark` derived from the geometry *at the image's size*, so a cut thinner than a pixel is expected to be absent at that size rather than demanded.
   - `--prove` gains density cases (48, 72, 96, 144, 192 px downscales of each asset).
   - `--prove` joins `lint`.
   - **Proof that it is a pure refactor:** `--check` stays green *without regenerating anything*.
   - Gates: `lint`, `--prove`, `verify-apk.mjs --prove`.
4. **Monochrome everywhere, on the old geometry; ADR-0122.**
   - One-ink schemes: `icon.png` and adaptive in dark `foreground.2` on dark `background`.
   - Remove `PETALS`, the corpus pin and its proof case.
   - `--prove` gains the one-ink-per-asset case with the five-colour decoy.
   - `markSvg` takes one ink; the array form is refused by type. `MARK_INKS` is added.
   - `brand.test.tsx`'s five-colour silhouette case is replaced by one-ink cases, each with a decoy.
   - Regenerate the assets.
   - ADR-0093's status becomes Superseded by ADR-0122; add the README row.
   - Gates: all.
5. **14's geometry.**
   - `MARK` from increment 1's readings.
   - `markShapes`/`markCovers`/`markInkBox`.
   - `Mark` with the clip-path cuts, and `markSvg` emitting the same.
   - Rewrite `brand.test.tsx`: the recompute with decoys, the structure (five-fold symmetry with a 36° decoy, petal 1 up, cuts disjoint, inside the grid, the drawn aspect), holes rather than paint, SVG ≡ component ≡ `mark-geometry.json`, 16 px, type refusals.
   - Generator: the parse (decimals, new fields, the three refusals still refusing), its point test, `mark-geometry.json`, and `ADAPTIVE_GRID` re-derived (the largest multiple of 24 whose whole unit keeps the reach within 312.9 px).
   - Correct the arithmetic in the `app.config.ts` comment.
   - Regenerate the assets.
   - Gates: all, plus `--prove` and `verify-apk.mjs --prove`.
6. **The lockups.**
   - `Wordmark` `form`s, the `LOCKUP_*` constants and their recompute, the Gelasio alignment constants, and text-scale following.
   - Home's call.
   - The conformance subjects.
   - Remove the two `closedBy: F-230` exemptions.
   - Add a `display1` entry (`closedBy: null`, `permanentBecause`: board 00 declares it, F-226's criterion 3 names it, and no screen draws type within 4 dp of 72 under ADR-0121; re-read when one does).
   - Inventory containers.
   - Gates: all.
7. **Census and CVD.**
   - The mark's `cvdPairs`.
   - `cvd/mark.test.ts` (pair census and the red/green decoy).
   - `mark-census.test.ts`:
     - every governing `ui:Mark` binds a role that is achromatic in all four palettes;
     - exactly one `ui:Mark` element is in the manifest's chroma exceptions, `27.lens-working.mark`;
     - `00.mark` and `25.mark` are exempt by C4;
     - a planted chromatic mark is refused.
   - A `ui` test that `MARK_INKS` are achromatic (C ≤ 0.026) in four palettes, with `status.ok` as the decoy.
   - Hoist the mapping helper.
   - Gates: all, especially `cvd` and `contrast`.
8. **Close-out.**
   - Effects: update E-059, E-060, E-085, E-115, E-116, E-149, E-152, E-157, E-170; add E-171–E-173; write their notes and update `memory/index.md`.
   - Rewrite BRAND §7: what is drawn, monochrome everywhere, the exception, ADR-0122. Fix its empty-text link to `brand.tsx`.
   - DESIGN-SYSTEM: "The mark — in-product, or app icon only" becomes settled.
   - R9 §6 C4 (what F-230 built) and §10.
   - Feature notes for F-231, F-236, F-242, F-243, F-247, F-253, F-258, F-260, F-267.
   - Lessons and `progress.md`.

## Mockup fidelity

**Governing, per element:**

| element(s) | governs | rule |
|---|---|---|
| The mark's geometry, everywhere | `14` (`14.splash.mark`, with `14.icon.tile.mark` as a second reading) | C4. P2 (`14` governs icon and splash) |
| Each placed mark's size and ink | its own screen: `01.header.mark` `text.primary`, `15.mark`, `20.card.mark` and `20.card.footer-mark` `text.tertiary`, `22.mark` `text.tertiary`, `02.capture.mark`, `14.*` | P1, with token values per P4. Their builds are F-242/F-262/F-253/F-258/F-243/F-231; they take the new geometry automatically |
| The in-app lockup | `01.header.mark` + `01.header.wordmark` | C4. P5 (drawn four ways with no primary; the variant on Home 01) |
| The splash lockup | `14.splash.mark`, `14.splash.wordmark`, `14.splash.tagline` | C4, P2. Its light appearance (C17 ⇄) is F-231's, and the conformance sweep renders the lockup in 25's palette |
| The icon's ink | `14.icon.tile.mark` (`text.secondary`) | P2. The tile is F-231's |
| Not used | `00.mark` and `00.wordmark` (coral outline); `25.mark` and `25.wordmark` (IRODORA 彩度) | C4 |
| The one tinted mark | `27.lens-working.mark` (measured #E2B5EC; manifest #926C9A) | C10. Built by F-236 |

**Inventory built, top to bottom:** `01.header.lockup` (new container) › `01.header.mark`, `01.header.wordmark`; `14.splash.lockup` (new container) › `14.splash.mark`, `14.splash.wordmark`, `14.splash.tagline`; and `14.icon.tile.mark` (ink only).

**Bindings.**

- "Irodora" is the product's name: static, Latin in both locales (ADR-0112).
- 彩り・色の知性 is the caller's copy (`brand.taglineJa`, `14.splash.tagline`'s binding). F-231 adds the catalogue key when it renders it.
- No colour value from any mockup reaches the build. Every ink is a manifest token.

**Departures:** none new. Three notes keep this honest:

- At 16 px the stamens are sub-pixel; that is the physics of the size, and the mark is still drawn exactly.
- At enlarged text the lockup keeps its drawn proportions, under a condition no mockup draws.
- The icon's flat dark ground is not a departure. It is F-231's unbuilt first criterion.

**Decided here on the 2026-10-05 delegation, each by an ADR:** OQ-13 (ADR-0121), and which of 14's two mark renders governs if they disagree (ADR-0122).

## Files to touch

```
packages/ui/src/brand.tsx                    — MARK (14's), markShapes/markCovers/markInkBox, Mark (clip-path cuts),
                                               markSvg (one ink), MARK_INKS, Wordmark forms, LOCKUP_* constants
packages/ui/src/index.ts                     — exports in: markShapes, markCovers, markInkBox, MARK_INKS, LOCKUP_*;
                                               exports out: markDiscs, EYE_RADIUS, PETAL_RADIUS, WordmarkSize
packages/ui/test/brand.test.tsx              — rewritten (Decisions 1, 2, 3, 5, 6)
packages/ui/test/conformance.test.tsx        — the Brand subjects
turbo.json (or @irodora/ui's test inputs)    — mark-geometry.json as an input (verify-cache-scope)
docs/design/design-system.manifest.json      — two measured steps; faces.serif.steps; cvdPairs and its _note
packages/design-tokens/src/generated/*       — regenerated
packages/design-tokens/test/type-scale.test.ts           — measured steps, census, source scan
packages/design-tokens/test/mark-census.test.ts          — new
packages/design-tokens/test/cvd/mark.test.ts             — new
packages/design-tokens/test/inventory-pairings.test.ts   — imports the hoisted mapping
packages/design-tokens/test/<helper>.ts                  — new, the hoisted role → token mapping
scripts/generate-brand-assets.mjs            — rasteriser, parse, one-ink schemes, proofs, densities,
                                               mark-geometry.json, ADAPTIVE_GRID
scripts/png.mjs                              — the signature derived at the image's size
package.json                                 — lint runs generate-brand-assets.mjs --prove
apps/mobile/assets/brand/{icon,adaptive-icon,monochrome-icon,splash-icon-light,splash-icon-dark}.png,
  mark-geometry.json                         — regenerated / new
apps/mobile/app.config.ts                    — comment arithmetic only
apps/mobile/src/screens/Home.tsx             — <Wordmark form="app" heading />
mockups/tools/mark.ps1                       — new
mockups/tools/serif-weight.mjs               — --em (or a new serif-em.mjs)
mockups/tools/README.md
mockups/tools/inventory-data/{01,14}.mjs, mockups/inventory/{01,14}.json, mockups/inventory.schema.json
.harness/verification/unreached-tokens.json
docs/adr/0121-*.md, docs/adr/0122-*.md (new); docs/adr/0093-*.md, 0113-*.md (status); docs/adr/README.md
docs/PRD.md §10; docs/design/R9-MOCKUP-FIDELITY.md §2 §5 §6 (C4) §10 §11; docs/design/BRAND.md §7;
  docs/design/DESIGN-SYSTEM.md
.harness/state/{feature_list.json, effects.json, progress.md}; .harness/memory/effects/*.md; .harness/memory/index.md
```

## Anticipated effects

| link | what changes | guard |
|---|---|---|
| **E-059** `brand.tsx#MARK` → `brand.tsx`, `brand.test`, gate test, the icon | The geometry becomes 14's. The stale `to` path `apps/mobile/assets/icon.png` is fixed to `assets/brand/icon.png`. The guard text (a one-fill count, rectangles) is out of date | the recompute against 14 with decoys; one ink and holes; SVG ≡ component ≡ `mark-geometry.json` |
| **E-085** (high) `brand.tsx` → generator, `png.mjs`, `verify-apk.mjs`, gate `artifact` | The signature is re-derived for 14's mark | `--prove`, now in `lint`: the mark is carried at 1024 px and at every launcher density; decoys (six discs, a solid disc, no ring, four petals) are refused; the safe zone is derived. Gate 16 itself runs only on release and cannot run here (no JDK) — attested |
| **E-115** generator → `app.config.ts`, `monochrome-icon.png`, gates `lint`/`artifact` | One ink for *every* asset, not just the themed layer | `--prove` checks one ink per asset, with the five-colour decoy |
| **E-116** `brand.tsx` → generator, `launch.tsx`, `icon.png`, `brand.test` | The parse reads decimals and the new fields, still scoped to the block | the three parse refusals in `--prove`, plus **new**: `mark-geometry.json` byte-compared and asserted in jest, which closes its "WHAT IS NOT GUARDED". `launch.test.tsx` still renders `Mark` and no bitmap |
| **E-060** design-tokens → `app.config.ts`, generator | `icon.png`'s ground becomes dark `background` and its ink dark `foreground.2` | `--check` in `lint` |
| **E-152** inventory → `typography.scale`, `type-scale.test.ts`, the schema | Measured steps are added | `type-scale.test.ts`: the recompute, the census, the source scan, each with a decoy |
| **E-149** inventory → manifest (the C10 census) | `27.lens-working.mark` stays, and is now asserted as the *one* mark exception | `c10-exceptions.test.ts` and `mark-census.test.ts` |
| **E-157** inventory → drawn constants | It gains the `MARK` fields and `LOCKUP_*` | the recompute in `brand.test.tsx` |
| **E-170** OQ answers → props without defaults | OQ-13 is answered. `MetricTile`'s figure takes a measured step in F-258 | the census owes 22's figures to F-258 |
| token reach (`unreached-tokens.json`) | Two new steps (temporarily `closedBy: F-230`); `display1` becomes unread | `verify-token-reach.mjs`, in both directions |

**New links:**

- **E-171** — ADR-0121's rule (the manifest's measured steps) → F-242, F-247, F-253, F-258, F-260 and `packages/ui/src/MetricTile.tsx`. Guard: the census's owed rows, which name open features and fail once an owner is `done` while its row is still owed.
- **E-172** — `brand.tsx#MARK_INKS` (the mark's one ink) → F-236's tint (`exists: false` until it is minted), the manifest's `cvdPairs` and its C10 exception. Guard: the type refusal, `mark-census.test.ts` (exactly one exception) and `cvd/mark.test.ts` (every drawn pair declared).
- **E-173** — `brand.tsx#WordmarkProps` → `Home.tsx`, F-231's launch overlay, F-242. Guard: typecheck (`form` required, `size` refused), the conformance subjects, `screens.test.tsx`.

**A latent defect found while planning (not F-230's; recorded on F-231).** The native splash shows a 1024 px image whose mark grid is 768 px, at `imageWidth` 160 pt, so the mark's grid is drawn at about 120 pt. `Launch` draws `Mark size={160}`, so its grid is 160 pt. The hand-over would therefore jump about 33 %. The implementer verifies this arithmetic before recording it. F-231 owns the continuity, and 14 draws the mark at 150 dp.

## Test plan

- **Recompute, each with decoys:**
  - every `MARK` field against 14's readings;
  - every `LOCKUP_*` constant against 01's and 14's readings;
  - each measured step against its elements' `raw.emDp`;
  - the splash tagline's step.

  The counts of elements read are asserted, so a re-record is seen.
- **Structure and property:**
  - five-fold symmetry: `markCovers` is unchanged by a 72° rotation on a sample grid, and a 36° rotation decoy fails;
  - petal 1 points up;
  - the cuts are disjoint;
  - every shape is inside the grid;
  - `markInkBox()` reproduces the drawn aspect, 108/111.
- **One ink, with holes:**
  - `Mark` and `markSvg` each paint exactly one fill, and the cuts live in the clip path. Decoy: a version painting the cuts in a second fill is refused.
  - Every asset is one ink (`--prove`), with ADR-0093's icon as the decoy.
- **One geometry:** `markShapes()` equals the generator's `mark-geometry.json`.
- **16 px:** five lobes resolve, with the disc and six-petal decoys (Decision 6).
- **CVD:** every drawn mark pair is in `cvdPairs`, and gate 10 scores it in four palettes. The red/green decoy collapses under deutan.
- **Census:**
  - governing `ui:Mark` roles are achromatic in all palettes;
  - exactly one mark is in the manifest's exceptions (`27.lens-working.mark`);
  - `00.mark` and `25.mark` are exempt by C4;
  - a planted chromatic mark is refused;
  - `MARK_INKS` are achromatic, with `status.ok` as the decoy.
- **Type refusals (`@ts-expect-error`):**
  - `Mark color="status.ok"` (and `accent` if it is not achromatic in every palette);
  - `markSvg([...])`;
  - `Wordmark` with `size`, with no `form`, `form="app" tagline`, and `form="splash"` without `tagline`.
- **The lockups:**
  - the name is announced once, and the mark is decorative;
  - `heading` sets the role;
  - the name is serif Regular at its measured step, Latin in both locales;
  - text-scale following: a layout event at twice the height doubles the mark, and a decoy that ignores the event fails.
- **Type scale:** the measured steps, the census with its owed rows, the source scan with a planted decoy, and the manifest steps equal to the schema enum.
- **Conformance:** three Brand subjects in four palettes and both locales. `screens.test.tsx` renders Home with the `app` lockup.
- **Inventories:** `verify-mockups --prove`, and `generate-inventory 01 14` clean.
- **Golden:** none, because no colour value is computed. **E2E:** none.

## Verification

Run each gate separately and record its printed exit code:

```
node scripts/verify-state.mjs; echo state=$?
pnpm typecheck; echo typecheck=$?
pnpm lint; echo lint=$?                       # includes generate-brand-assets --check AND --prove, verify-mockups
pnpm format:check; echo format=$?
pnpm test; echo test=$?
pnpm build; echo build=$?
pnpm test:a11y; echo a11y=$?                  # includes verify-token-reach
pnpm test:contrast; echo contrast=$?          # includes generate-design-tokens --check
pnpm test:cvd; echo cvd=$?
node scripts/generate-brand-assets.mjs --prove; echo prove=$?
node scripts/verify-apk.mjs --prove; echo apkprove=$?
node scripts/verify-mockups.mjs --prove; echo mockups=$?
node scripts/verify-token-reach.mjs --prove; echo reach=$?
```

Also record the calibration output of `mark.ps1 -calibrate` and the em tool, and state the sensitivity interval in ADR-0121. One evaluator review; its findings are fixed or recorded as `backlog`, and the gates re-run.

| criterion | what runs |
|---|---|
| 1 | `brand.test.tsx` (the recompute, structure, holes, 16 px, SVG ≡ component ≡ generator); `cvd/mark.test.ts` and gate 10; `--prove` |
| 2 | `brand.test.tsx` (the lockup recomputes, refusals, scaling); conformance; `type-scale.test.ts` (measured steps); `screens.test.tsx` |
| 3 | `--prove` (one ink per asset, the decoy); `mark-census.test.ts`; the type refusals; ADR-0122 and the README index (gate `state`) |

**Attested (ADR-0038)**, declared in F-230's `attested` array in increment 0. Each entry is `blocks: "release"`, `status: "outstanding"`, and each criterion string is quoted verbatim, curly quotes included:

1. `"The mark is mockup 14’s 梅鉢 — five petals, a centre ring, radiating stamen lines — drawn from code as today (MARK in packages/ui/src/brand.tsx), recognisable at 16 px and under protan, deutan and tritan simulation"`
   - verifiedBy: the mark rendered by react-native-svg on an iOS and an Android device at 16, 23, 25.5 and 39 dp, beside 14's drawing, and again under the platforms' colour filters (protanopia, deutanopia, tritanopia).
   - A person identifies it as 14's blossom.
   - The ring and stamens render as holes (the clip path's evenodd), not paint.
2. `"The in-app lockup is 01’s — filled mark and “Irodora” in the display serif, title case; the splash lockup is 14’s"`
   - verifiedBy: F-267's side-by-side of Home's header against 01, and of the splash lockup against 14, on both platforms. This covers the vertical alignment (line-box placement, Android font padding) and both lockups at 200 % text.
3. `"The mark is monochrome everywhere, the icon included, and an ADR supersedes ADR-0093 (C4); the tinted mark in 27’s loading state is the one declared exception"`
   - verifiedBy: gate 16 on a release artefact (every launcher density carries the one-ink mark), the iOS icon on a device, and the Android 13 themed icon tinted on a home screen.
   - This machine has no JDK.

## Risks and open questions

- **OQ-13 is decided here (ADR-0121).** No other open question blocks F-230. The splash-tagline reading (a) and the icon-ink reading (b) are stated in Intent.
- **14's two renders may disagree.** Decision 1's rule applies, and ADR-0122 records it.
- **The JPEG instrument.** The stamens are 1–2 px wide at 111 px. The calibration states what can be recovered; anything that cannot be recovered is reported, not guessed.
- **`react-native-svg` `ClipPath` with `clipRule` on devices.** The fallback is the union-outline evenodd path, and the device check is attested. The conformance colour scan might read a default fill on the clip path's `Path`; if so, set it to the ink.
- **Thin cuts at small sizes.** At mdpi launcher sizes and at 16 px the cuts vanish. The signature is derived at the image's own size, and the claims are limited to what survives.
- **The em measurement may move.** The recorded 34 is expected to become about 32, and the step follows the re-read with the old value noted. Increment 1 could also move `14.splash.tagline` from `body` to `title`.
- **`display1` is drawn by no screen.** It gets a permanent exemption with reasons. A reviewer may prefer snapping the splash wordmark (about 61 dp) to 72. That is alternative A applied to one element, and ADR-0121 rejects it.
- **`02.capture.mark`'s pair** (ink `ground` on a level-1 parent) may not map. If so it is owed by F-243, with the reason.
- **An interim icon.** It stays a flat dark ground until F-231 builds the tile. This is recorded and visible.
- **Home's header shrinks** from 72 to about 32 dp before F-242 rebuilds Home. That is criterion 2, and it is noted to F-242.
- **The census sees only recorded `raw.emDp`.** Unrecorded off-scale type is F-273's to find.
- **Size of the feature.** Nine increments. Increment 5 is the largest, but it cannot be split: the component, the generator and the assets must change in one commit or `--check` goes red.

## Out of scope

Each item names the feature that owns it.

- **F-231:**
  - 14's tile (its gradient, its squircle);
  - the adaptive icon on launcher masks beyond the existing safe-zone proof;
  - the themed icon's appearance on a device;
  - the native splash and the launch overlay composition: the glow, the subline, the wave, the progress line, `SPLASH_IMAGE_WIDTH`, and the 120 vs 160 pt hand-over;
  - C17's light splash;
  - the catalogue key for 彩り・色の知性;
  - asserting the APK and iOS artefacts.
- **F-236:** minting 27's tint and building the working state.
- **F-242:** the rest of Home, including 01's tagline at `body`.
- **Each feature that builds the element** sets these measured steps: 06's and 26's kanji (F-247), 20's card kanji (F-253), 22's figures and `MetricTile` (F-258).
- **F-243 / F-262 / F-253 / F-258:** 02's capture mark ink and the sizes of the 15, 20 and 22 marks.
- **F-266:** motion.
- **Not used (C4):** 00's and 25's lockups.
- **Not touched at all:** any colour value, golden dataset or corpus change.

## Status (implementing session)

| inc | commit | what landed |
|---|---|---|
| 0 | `3cf9d9d` | Claimed, and this plan (the planner subagent's, adopted with four amendments); the three device attestations declared. |
| 1 | `01555b4` | Measured and recorded; no product code. **The tools:** `mark.ps1` moves pixels (a crop's luminance; a grid round-tripped through a JPEG) and `mark-fit.mjs` fits a blossom — petal count and phase from the contour's harmonic, each petal's circle by a Kasa fit, and the ring, stamens and seams as integrals of missing coverage; `--calibrate` renders known geometries at 14's and 01's sizes through a JPEG at q85 and recovers every parameter within 0.3 px, and reads five decoys (four petals, six, no ring, no seams, no hub) as themselves. `serif-weight.mjs --em` reads a word's em from its ink against the face's outlines, calibrated by height within half a pixel (GDI+ lays a word out 2.5 % wider than its advances, so width is the cross-check, not the calibration). **14's mark (governing, px at 1.3521 dp/px):** five petals, the first straight up (−0.01°), orbit 36.02, radius 21.11 — tangent (0.06 px short of touching) — over a hub filled to their tangency (29.14); eye 9.79, ring cut to 11.86; a stamen along each petal to 28.16, 2.30 wide; a seam along each notch, ring to edge, 2.56 wide; no dots. Its ink aspect 0.970 against the drawn 0.973. **14's icon render** reads the same blossom with softer, wider cuts (stamens 3.81, seams 4.34, ring to 13.04); the splash governs, as the plan's rule says. **01's mark** (cross-check) is the same blossom with a smaller eye and a 3.8 px dot ending each stamen. **The words:** 01's wordmark is drawn at 31.6 dp (31.9 by width; the 34 first recorded was a box's height), 14's at 59.7 dp, 14's tagline at 22.0 dp — `title`, re-recorded from `body`. **The lockups:** 01's mark sits 10.0 dp left of the word, ink to ink, their centres 0.16 dp apart; 14 stacks the mark 32.5 dp over the word and the word 15.9 dp over the tagline, all three centred within half a pixel. The schema names the new `raw` keys; the tools README lists both tools. **Changed from the plan:** the blossom has **seams** (a cut along every notch) and a **hub** (the petals are tangent, not overlapping, and the body is filled to their tangency) — Decision 1's model gains `seamWidth` and a hub derived from the tangency, and the petal radius is the tangency's; the gaps re-read on the ink (10.0, 32.5, 15.9 dp against the plan's box readings 9.5, 31.1, 14.9). |
| 2 | this commit | **OQ-13 closed by ADR-0121**, on the 2026-10-05 delegation: within 4 dp of a board step, type takes the step; beyond, a measured step bound to its elements at their median em, with the nearest board step's leading and the face's tracking and weight. Every threshold from 4.0 to 9.6 dp gives the 85 governing readings the same outcome. The manifest gains `wordmark` 31.6 (title's leading) and `wordmarkSplash` 59.7 (display1's), each with `elements`, which the parser now reads; the serif sets both; the schema's `type.size` names them; 01's and 14's wordmarks record them. **The census** (`type-scale.test`): every governing element drawn more than 4 dp from every step is bound or owed, both ways, with a planted decoy; the owed rows live in `.harness/verification/type-census.json` (06's, 20's, 26's kanji to F-247/F-253, 22's figures to F-258), which turbo now keys on, and `verify-token-reach` fails once an owner is done while its row is owed — `closedBy`'s rule. **Only `Wordmark` may read a measured step**: `verify-token-reach` names any other reader, proven by a planted `size="wordmark"` in Home. The two steps are declared unread until increment 6 (`closedBy: F-230`). Dynamic Type maps both to Large Title, and its pin is updated with the reason. PRD §10 and R9 §2, §5 and §11 record the closure; ADR-0113's status points here; OQ-13 leaves F-230, F-242, F-247, F-253 and F-258, each with a note on how the rule applies to it. **Changed from the plan:** the owed rows are a declaration file checked by the uncached reach script, not read by the cached test from the feature list (that would key every test on every claim); and the source scan is `verify-token-reach`'s, which already reads `apps/mobile/src`, rather than a design-tokens test's, which may not. |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| review | | |