# Plan: F-249 — Compare is mockup 08

| | |
|---|---|
| **Feature** | F-249 ([`feature_list.json`](../state/feature_list.json)) |
| **Requirements** | FR-48, FR-3, FR-5. Also applied: FR-6 (the pair's relation), FR-61 (notation on a professional surface), FR-47 (the chooser reuses the Finder's query), FR-49 (*Add Pair*), FR-51 and FR-65 (the export and its ΔE table), FR-71 (the tab bar under the action bar), NFR-8, NFR-21. Done criteria that must survive or are superseded in part by an ADR (golden rule 6): F-019 c1–c2, F-151 c2 and c4, F-156 (the Slider's screen consumer), F-181 c1 |
| **Service / package** | `apps/mobile` · `@irodora/ui` (additive) · `@irodora/recommendation` (one additive export) |
| **Author** | The planner subagent. It read files and ran two web searches. It built, measured and ran nothing. The implementing session records its own changes under *Implementing session's decisions* |
| **Date** | 2026-10-26 |
| **Decisions** | ADR-0154 (the samples are drawn apart), ADR-0155 (08's figures and words), ADR-0156 (08's controls, and what leaves Compare), ADR-0157 (08's composition, art and seam). No OQ blocks this feature (see Risks, item 14) |

---

## Intent

Someone taps *Compare* on the Atlas (05). They land on mockup 08, top to bottom:

- **The app bar:** `← Atlas | Colour Compare • 比較 | ⤓`, with a rule under it.
- **The pair card:** two colour samples drawn apart, with a neutral seam between them. Under each sample: its kanji and romaji, its hex and OKLCh, and *Change A* / *Change B*.
- **Two cards side by side:**
  - the distance table: ΔE00 (CIEDE2000) with its band, ΔEok, and ΔL\*, ΔC\* and ΔH, each with its reading;
  - the contrast and colour-vision table: the WCAG ratio with the threshold it reaches and the pair's warm–cool relation, APCA Lc under it, then three separation rows.
- **The pinned bar:** *Export Precision Delta PDF*, and the outlined *Add Pair to Palette Studio*.
- **The plum-branch line-art** behind the page.

Every value comes from the corpus or the engine. Every drawn control works. Nothing on the page says *Safe*, *Harmonious*, *B is lighter*, or a figure the engine did not compute.

"Done", for a person:

- In both themes and both languages, the page reads as 08.
- The two samples are the two colours named under them, and they are always two different colours.
- Every number describes this pair. Every word agrees with the number beside it.
- *Change A* changes A and only A. Both exports and *Add Pair* carry the pair that is on screen.

---

## Findings from planning

These come from reading only. Nothing was run.

1. **The current screen is not 08.**
   - `apps/mobile/src/screens/Compare.tsx` draws, in order:
     - `Pair` (two samples touching, ADR-0095);
     - a *same entry* line;
     - a ΔE00 card;
     - a per-axis card (CIELAB L\*/a\*/b\* and OKLCh L/C/h, each with both values and the delta);
     - a separation card: a severity `Slider`, then per deficiency the score /100, the simulated ΔE00 and the lightness difference, and two notes;
     - a contrast card: WCAG, both APCA directions, and the note that APCA is directional;
     - two picker cards at the end (search field plus up to 8 rows).
   - It is on the platform header. `app/(tabs)/atlas/compare.tsx` sets `title: 'Irodora'`.
   - `apps/mobile/test/chrome.test.ts` lists `'atlas/compare': 'F-249 (08)'` at line 118. Its decoy at lines 180–187 also uses `atlas/compare`, so the decoy must move to another listed route in the same change.
2. **08 draws the samples apart; ADR-0095 and F-151 make them touch.**
   - What 08 draws:
     - `08.pair.a.swatch` is at x 58–361 px and `08.pair.b.swatch` at x 407–710 px, so they are 23 dp apart;
     - each is 151.5 dp and binds `keyline`;
     - a 1 dp `08.seam` sits between them.
   - What ADR-0095 says:
     - "`Pair` and `Strip` draw no keyline and no corner where two samples meet";
     - F-151 c2: "Compare puts two colours edge to edge".
   - Research (ADR-0154):
     - CIEDE2000's visual data were taken on hairline-divided pairs, not on gapless ones;
     - separation measurably changes perceived difference.
     - So neither arrangement is the formula's reference condition, and no golden rule forces either. Rule 14 governs.
   - The size half of ADR-0095 (77 dp) is about the observer and holds: 151.5 dp at 384 dp, and about 127 dp at 320 dp.
3. **`compare()` does not return what 08 prints** (`apps/mobile/src/compare.ts`).
   - It has CIELAB L\*/a\*/b\* and OKLCh axis deltas, both APCA directions, and severity-parameterised separations.
   - It lacks four things 08 needs:
     - ΔEok;
     - the CIELAB LCh axes (ΔC\*ab, Δh_ab);
     - the CIEDE2000 weighted terms that ADR-0125's readings need (`deltaE00Terms`);
     - the pair's warm–cool relation.
   - `wear.ts#wearCombination` reads `compare().contrast` (E-218), so `contrast` must not change.
4. **The readings exist; the hue composition does not.**
   - `apps/mobile/src/delta-readings.ts` (`bandKey`, `axisKey`) and `@irodora/color-difference#axisReading` are ready.
   - *"towards ‹hue›"* is F-249's composition (F-222's note). It must come from the published phrase lexicon (`content/rules/phrase-lexicon.2026.08.1.json`, read through `finder.ts#lexicon()`).
   - The two languages differ in coverage:
     - en has nine hue terms: red, orange, brown, yellow, green, teal, blue, violet, pink;
     - **ja has five**: 赤, 黄, 緑, 青, 紫. A Japanese reading can therefore name fewer hues.
5. **ΔH's notation.**
   - 08 prints `ΔH` with a degree sign (`−14.2°`). In CIE notation ΔH\*ab is the metric hue difference and carries no degrees; Δh_ab is the hue-angle difference.
   - The degree sign says which quantity this is, so the drawn label can stay (ADR-0155 D1).
6. **08's contrast cell is an E2 row.**
   - 08 draws *"1.48:1 • Non-Text / Harmonious Pairing"* with *"(APCA Lc: 16.2)"*. (claims-ok: quotes the drawn construction this line resolves)
   - R9 §4 E2: "the figures stay — the ratio, the Lc and the threshold they pass; the one-word verdict after them does not … and a pair shows its harmony relationship (FR-6) where it has one".
   - F-349 (backlog) names a geometric relation. Its own acceptance says 08 prints "the warm–cool relation otherwise".
   - The warm–cool relation is private inside `packages/recommendation/src/outfit-score.ts#harmony`.
7. **The separation rows.**
   - E2 says *Safe* does not ship, and the figure carries "the model it was computed under".
   - F-249's note offers "bound to the defined separation floor or dropped". The only floor is `apps/mobile/src/outfit/cvd.ts#HARD_TO_SEPARATE = 20`, which is "a convention, not a measured threshold". `separation.ts` says "Nothing here should be read as a calibrated threshold."
   - So a floor-bound verdict would be a claim the engine cannot demonstrate. The model parenthetical replaces *(Safe)*.
   - Tritanopia at severity 1 is not validated with tritanopes (ADR-0131; `vision.strip.tritan`).
8. **08.json's defects, to correct in increment 1.**
   - `08.title` `raw.emDp: 20.5` is likely too large. The 30 px box runs from the *C*'s cap to the *p*'s descender and the kanji, about 0.94 em, so about 16 dp, which is body. This is the same suspicion F-248 had about 07.
   - `08.header-rule` is a 7 px band (93–100). The line's own rows decide the bar → card interval, which sits within a quarter step of the `xl`/`xxl` midpoint.
   - The swatches bind `radius: md`, but R9 §5 records 08's sample corner as 5.0 dp, which is nearer `sm`.
   - `08.seam` runs from 186 to 710 px, past the card's foot at 693. The part below the card is very likely the leader to the leaked *"Divid seam/ neutral keyline"* caption, which §2 says is not design.
   - `08.access.wcag.value` binds `text.secondary`, but the drawing sets *"Non-Text / Harmonious Pairing"* white and heavy, like the figure. *"92%"* is white while *"Separation (Safe)"* is grey. (claims-ok: quotes the drawn construction this line resolves)
   - The `ok` in `ΔEok` is drawn lowered and smaller. It is not recorded.
   - *"…Accessibility Matrix **Card**"* is a component word (07's *Card* is notDesign since F-248). It is not in notDesign.
   - `[Change A]`/`[Change B]` are brackets inside an outlined button: §2 notation, as 05's (ADR-0142 D3). Unrecorded.
   - `08.export` and `08.actions.pdf` both bind `share:comparePdf`. 06 and 07 bind exports as `navigate:/profile/export`.
   - `08.metrics.*.reading` `raw.emDp: 10.3` is the caption step itself, which looks written rather than read.
   - `08.back` records no type. The Change buttons and the two actions record no type and no corner.
   - The two action buttons differ in height: 63 px against 60 px.
9. **`ReadoutTable form="ruled"`** (F-235, `packages/ui/src/ReadoutTable.tsx`) is 08's own form, but it falls short in four ways:
   - its parts carry no ids, so the sweep cannot find `08.metrics.*.label` and the rest;
   - its rules are each row's `borderTop`, where the inventory records `08.metrics.rule-1…5` and `08.access.rule-1…4` as elements;
   - it draws no subscript;
   - in the stacked layout a reading is always `foreground.2`, at 400 weight.
10. **Export and Palette Studio already take what 08 needs.**
    - `ExportSubject.deltas` (FR-65's ΔE table) exists and `toPdf` writes it.
    - `Export` takes `initialFormat`.
    - `exportSubjectFor` reads `slug` and `colours` but no pair.
    - `PaletteStudio` takes `initialDraft`, and `palette.ts#addMember` makes the first member the anchor. The route `app/(tabs)/atlas/palettes.tsx` passes nothing.
11. **What a literal rebuild would break, and how each is handled.**
    - F-019 c1, "each with its units and computation space": 08 names the notation (CIEDE2000, ΔEok, ΔL\*, ΔC\*, ΔH, WCAG 2.2, APCA Lc, Machado 2009). Each row's accessible name names the space, as ADR-0119 §3 did for 04.
    - F-019 c2, tabular and copyable: holds.
    - F-151 c2: superseded in part by ADR-0154 (apart). "Numbers beneath" holds.
    - F-151 c4: holds.
    - F-156: Compare was the Slider's only screen consumer; recorded on F-346.
    - F-181 c1: the route keeps reading `?a`.
12. **`figures.tsx#signed` prints `−0.00` for a small negative** (F-245's note): it takes the sign from the unrounded value. 08's three signed rows need the fix at the source, not a second helper.
13. **Old tests assume the old screen** (`apps/mobile/test/screens.test.tsx`):
    - the subjects `screens/Compare` (line ≈1739) and `(not in this corpus)` (≈2869);
    - the FR-48 describe (≈3480–3558: both spaces' axes, both APCA directions, *"strongest tabulated severity"*, *"APCA is directional"*);
    - the tabular describe (≈3566: `> 20` numeric nodes);
    - the F-151 describe (≈5220: `borderRightWidth 0`, `height === nativeJudgeableSample`).
    - `compare.test.ts` stays (the pinned 89.73, symmetry, the severity parameter). The `atlas/compare` capture anchor `compare.title` must move.
14. **Dead after the rebuild:**
    - `SEVERITY_STEP`;
    - Compare's private `matches()` (the Finder's `find()` replaces it);
    - the keys listed under the catalogue;
    - `Slider`'s screen use.
    - `Pair` keeps a consumer, `Contemporary.tsx:133`.
15. **The honest words are longer than the drawn ones.** *(Machado 2009)* replaces *(Safe)*, and the scale sets 08's small type up a step (ADR-0113). So in a 153 dp column the access rows wrap and the cards build taller than drawn. ADR-0157 states it; the capture shows it.

---

## Decisions

All four rest on R9 §11's delegation of 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–14 are not reopened. Full drafts are in Appendices A–D.

### D-1 (ADR-0154): the samples are drawn apart, as 08 draws them

- Two `Swatch`es, each in its half of `08.pair`, with `08.seam` (1 dp) between. Each binds its keyline at the measured width (C20; ADR-0116 moves it per sample).
- Each is square, sized by its half: `pairSampleSize(width)`, which is 159.5 dp at 384 after the snapped paddings. It is never under `nativeJudgeableSample` (77) on a supported width; at 320 dp it is 127.5.
- The figures stay beneath the pair (F-151 c2's second half).
- ADR-0095 is amended for Compare. F-151 c2's *edge to edge* is superseded in part. R9 §10 lists both.

### D-2 (ADR-0155): 08's figures and words say what the engine computes

**The figures** (each the engine's, at the precision named):

| row | prints |
|---|---|
| ΔE00 | `printedDeltaE00`, 2 dp (ADR-0125) |
| ΔEok | `deltaEok(oklchToOklab(A), oklchToOklab(B))`, 3 dp |
| ΔL\* | L\*B − L\*A, signed, 1 dp |
| ΔC\* | C\*ab B − A, signed, 1 dp |
| ΔH | `hueDelta(h_ab A, h_ab B)`, signed, 1 dp, with `°` — the hue-angle difference, under the drawn label |
| WCAG | the ratio **floored** to 2 dp, as drawn (ADR-0151 D4's floor) |
| Lc | the **smaller** \|Lc\| of the two directions, floored to 1 dp |
| separations | `floor(score)` % at severity 1 |
| meta | `‹hex› • OKLCh ‹L, 3 dp› • ‹h, 1 dp›°`. Two figures, as drawn; C is not printed |

**The readings** (F-222's review):

- The total: ADR-0125's band of the printed value.
- ΔL\* and ΔC\*: `axisReading(printed figure, weighted term)`, mapped by `delta-readings.ts`. The words are 04's: *Slightly Lighter*, *Noticeably Richer*, *Very Close in Lightness*.
- ΔH: the hue band phrase. It is followed by *towards ‹B's hue term›* only when all three hold:
  - the band is `slight` or `perceptible`;
  - B lies in a lexicon hue term of the locale's language;
  - A does not lie in that term.
- B's term is chosen deterministically: most axes constrained, then the narrowest hue arc, then file order.

**The contrast cell** reads `‹ratio›:1 • ‹threshold› / ‹relation›`:

- The threshold is the highest WCAG 2.2 threshold the floored ratio reaches:
  - *Text AAA* (≥ 7);
  - *Text AA* (≥ 4.5);
  - *Non-Text* (≥ 3; 08's own word; SC 1.4.11, and AA large text);
  - *Under 3:1*.
- The relation is the pair's warm–cool relation (`warmCoolRelation`, newly exported): *Shared Temperature / Mixed Temperature / Warm Against Cool*, 07's words. F-349 replaces it with a geometric name where one applies.
- The note is *(APCA Lc: ‹n›)*. Its accessible name says it is the smaller of the two directions.

**The separation rows:**

- Labels: *Protanopia · Deuteranopia · Tritanopia* (`vision.mode.*`). At severity 1 each is the dichromacy case, which is what *-anopia* names.
- Value: `‹n›% Separation (Machado 2009)`. Tritanopia reads `(Machado 2009, approximate)`.

**Copy:**

- *Card* in the access title is a §2 component word. *Table* stays, as 06's *Readout Table* did (ADR-0146).
- The brackets on *Change A/B* are notation (ADR-0142 D3's reasoning, applied to 08).
- The title is `Colour Compare • 比較` (ADR-0142 D5's OQ-48 interim, applied, not decided).
- *Export Precision Delta PDF* keeps its words. It names a document holding the pair's published values and its ΔE00 to the engine's precision. No measurement is involved, so it says nothing about how accurately anything was measured. It is added to `near-misses.md`.

### D-3 (ADR-0156): what 08's controls do, and what leaves Compare

- **The pair.**
  - A is `?a` if the corpus holds it, else the first entry. B is the last entry, or the first when A is the last.
  - **A ≠ B always.**
  - An unknown `?a` is the absent state: the app bar's back over `00`'s caption (R9 §4 E4, ADR-0128 §6).
- **Change A / Change B** (E4): each opens `03`'s floating `Sheet`.
  - It holds `05`'s `SearchField`, read through the Finder's own `find()` (a name, a phrase or a hex).
  - With the field empty it lists every entry.
  - The other slot's colour is left out. The slot's own colour is marked chosen (`SelectionFrame`, announced as selected).
  - A query that finds nothing shows `00`'s caption (`resolvedHere`).
  - Choosing changes that slot only and closes the sheet.
- **The header's download glyph** goes to `/profile/export?pair=A,B`: the pair subject (`pairSubject`, with its ΔE00 row), every format, as 06's export glyph does for a colour.
- ***Export Precision Delta PDF*** goes to the same route plus `&format=pdf` (`Export initialFormat`). F-263 builds the document's composition.
- ***Add Pair to Palette Studio*** goes to `/atlas/palettes?colours=A,B`. The Studio opens on a draft: A the anchor, B a neutral. Nothing is stored until the person names it and saves.
- **Back** navigates to `/atlas` (F-247 S1's form).
- **Leaves the page:**
  - the severity slider (08's *-anopia* is severity 1, `COMPARED_SEVERITY`);
  - the a\*/b\* and OKLCh axis rows;
  - the second APCA direction and its note;
  - the separation decomposition;
  - the *same entry* line, which A ≠ B makes unreachable;
  - the pickers at the end.
- **What this supersedes in part:** F-019 c1's on-screen form (the space moves into the notation and the accessible names, as ADR-0119 §3), F-156's Slider-on-Compare, and F-151 c2 (via ADR-0154).

### D-4 (ADR-0157): 08's composition, its art and its seam

- **Intervals.** As in the table below, snapped by §2. 08's many 12 dp paddings are a tie, so they take `sm`.
- **Named intervals** (tighter than the scale): name → meta, with the cost stated.
- **Heights.** The cards build taller than drawn (Findings 15); the estimates are stated.
- **The art.** Three `Illustration name="plum-branch" tone="backdrop"` fragments in an art layer under the cards, placed and clipped as `Home.tsx#HOME_ART` places 01's. Each is sized by the dimension 08 measures and checked against its box.
- **The seam.** 1 dp in the measured token, inside the card only. The part below the card is the leader to a leaked caption (§2).
- **ΔEok.** Drawn with its `ok` lowered, through an additive `RuledRow.subscript`.
- **Corners, type steps and weights.** Read in increment 1.

---

## Implementing session's decisions on this design

Increment 1 measured `08` (readings in `08.mjs`'s header) and changed this plan where the pixels
disagreed with it:

- **The type is a step smaller than planned.** Every text but the title, the back word and the names
  inks 8.9–11.6 dp an em — `caption` (ADR-0113), where the plan assumed `label` for the tables and
  `body` for the names. The title is `label` 500 (13.7 dp), not `body`; the names `label` 400. The
  card titles read 600, not 500. So the ruled `ReadoutTable` sets its rows at `caption` and
  `READOUT_RULED_PAD` is recomputed for a caption line (increment 2), and the cards build much less
  taller than the plan's estimates (ADR-0157 D2).
- **The samples draw no keyline.** Their edge reads only the sharpening halo every edge in `08`
  carries. They bind none (`Swatch keyline={false}`), and C20 does not apply. Risk 1's keyline width
  is moot.
- **The seam is `border.subtle`, the card's whole height.** The pair sits in the card's `media` slot
  (rendered without the card's padding), each half padded `sm`; so `pairSampleSize` is the half less
  two `sm`, and the seam meets both edges as drawn.
- **Every corner is `sm`** — the cards and the samples included, where the inventory said `md`.
- **The action bar** starts at its rule (y 1244, not 1235); both buttons are one height, 30.5 dp
  (`ACTION`, not `PDF` and `STUDIO`); its top, bottom and sides are `md`; the scroll's foot is `md`.
- **Intervals** are ADR-0157 D1's table. Title → first rule is `xs` (siblings); the cards' content
  inset is `sm` (rule ends two each side of the midpoint).
- **The census** found no pair whose component band exceeds the total's, and no near-neutral pair
  with |Δh| ≥ 20° beside *Very Close in Hue* — every corpus pair prints a perceptible ΔE00. The test
  plan's decoy for "a component band above the total's" cannot exist on this corpus; it is asserted
  absent instead, with ADR-0125's case constructed from published Lab values in the unit test.
- **The fixture pair** is `aka-tsuchi → ao-ta` (ΔE00 32.28, ratio 1.05, Lc 0.0, separations
  36/20/100, B's term *green*/緑, the relation *shared*).
- **Owed and filed:** F-353 (the Japanese lexicon names the hues the English one does: 20 entries
  lack one) and F-354 (07's separation row says *approximate* when its worst is tritan's).

---

## Approach

### Reused (paths)

- **`@irodora/ui`:**
  - `Screen` (`scroll={false}`, `bleed`, `appBar`, `actionBar`).
  - `AppBar`: `back` with `label`, `name`, `size`; `title` with `align: 'centre'`, `layout: 'inline'`, `ja`; `trailing.icons` with `targetRoom`; `rule`; `height`; `inset`. Its centred title is already "centred on the frame" for 08 (`AppBar.tsx` header).
  - `ActionBar`.
  - `Card` (`level 1`, `padding`, `radius`, `fill`).
  - `Swatch` (`size`, `corner`, `keylineWidth`) and `swatchAccessibleName`.
  - `ReadoutTable form="ruled"` (`columns`, `stacked`; `notation`, `formula`, `reading`, `note`; `READOUT_RULED_LABEL`, `READOUT_RULED_PAD`).
  - `figureText`, `signed`, `MINUS`, `Figure`.
  - `Illustration` (`plum-branch`, `tone="backdrop"`).
  - `Sheet form="floating"`, `SearchField`, `EmptyState` (`resolvedHere`), `SelectionFrame`.
  - `Button` (primary; secondary `edge="border"`), `Text`, `Row`, `Stack`, `BILINGUAL_SEPARATOR`, `hitArea`, `platformTapTarget`.
  - The `download` glyph, which exists.
- **`apps/mobile/src`:**
  - `compare.ts` (`compare`, `COMPARED_DEFICIENCIES`, `COMPARED_SEVERITY`); `delta-readings.ts` (`bandKey`, `axisKey`).
  - `finder.ts` (`find`, `lexicon`); `corpus` (`allEntries`, `entryBySlug`, `colorFor`); `notation.ts` (`capitalised`, `oklchLine`).
  - `i18n` (`useMessages`, `message`, `japaneseRun`); `rules.ts#ruleSet`; `wear.ts#HARMONY_KEYS` (moved to a shared module, below).
  - `export/subject.ts` (`corpusColour`, `envelope`, `COLOURS_SEPARATOR`, `exportSubjectFor`); `palette.ts` (`addMember`, `EMPTY_DRAFT`); `states.ts`.
  - `Home.tsx`'s art-layer pattern (`HOME_ART`).
- **Packages:**
  - `@irodora/color-difference`: `deltaE00Terms`, `deltaEok`, `printedDeltaE00`, `deltaE00Band`, `axisReading`, `wcagContrast`, `apcaLc`.
  - `@irodora/color-spaces`: `hueDelta`, `oklchToOklab`.
  - `@irodora/cvd-engine`: `separationDetail`.
  - `@irodora/corpus`: `matchesRegion`, `inRange`, `LexiconTerm`.
  - `@irodora/export`: `WRITERS`, `toPdf`, `ExportSubject.deltas`, `assertSubject`.
  - `@irodora/recommendation`: the harmony component.
- **Tests and tools:**
  - `apps/mobile/test/inventory.ts` (`elementFindings`); `screens.test.tsx` (`draw`, `drawLive`, `ENROLLED`, `without`, `withoutText`).
  - `wear-fidelity.test.tsx`'s helpers, copied in shape: `el()` recomputed from the pixels, `snap`, `belowTheScale`, `snapSiblings`, `lineInset`, `inOrder`, `sharedRow`.
  - `wear-states.test.tsx`'s `wordsOf`, `leaks`, and the route-body reader.
  - `mockups/tools/*.ps1` (the method) and `generate-inventory.mjs`.
  - `scripts/generate-e2e-flows.mjs`, `verify-font-coverage.mjs`, `generate-font-subset.mjs`; `pnpm fidelity:capture`.

### New

- **`apps/mobile/src/compare.ts`** (additive; the numbers; no colour maths written):
  - `deltaEok`;
  - `lch: { l, c, h }` axes from the record's `derived.lch`, with `h.delta = hueDelta`;
  - `terms: deltaE00Terms(A.lab, B.lab)` (its `deltaE00` is the same double as `deltaE00`; asserted with `Object.is`);
  - `temperature: warmCoolRelation([colorFor(A), colorFor(B)], ruleSet())`.
  - `lab` and `oklch` axes are removed if nothing reads them after increment 5. `contrast` is unchanged (E-218). `SEVERITY_STEP` is removed; `severity` and `COMPARED_SEVERITY` stay.
- **`apps/mobile/src/compare-readout.ts`** (new, pure; what 08 prints):
  - `pairReadout(A, B, t, script)` → `{ metrics: RuledRow[], access: RuledRow[], meta: { a, b }, names: { a, b } }`, every value a `Figure` that names its space.
  - The word maps as literals, so the unused-key scan sees their reader: `THRESHOLD_KEYS`, `CVD_MODEL_KEYS`, and the temperature-relation keys, moved out of `wear.ts` into one shared map so 07 and 08 read one set of words.
  - `thresholdOf(flooredRatio)`, `hueTerm(entry, locale)`, `towards(A, B, band, locale)`.
  - State: `initialPair(aParam?)` → `{ a, b }` with a ≠ b; `choose(state, side, slug)`, which refuses the other side's slug; `pickList(query, side, state)` = `find(query).entries` (or `allEntries()` when the query is empty) less the other side.
  - Sizes: `pairSampleSize(width)`.
  - Drawn constants, each recomputed by `compare-fidelity.test` from `08.json`: `COMPARE_APP_BAR`, `BACK_GLYPH`, `EXPORT_GLYPH`, `CHANGE`, `SEAM`, `PDF`, `STUDIO`, `COMPARE_ART`, and any corner, keyline or subscript constants increment 1 reads.
- **`apps/mobile/src/notation.ts#oklchLine`** gains `{ chroma?: false }`, so 08's two-figure line shares 05's and 06's precision and separator.
- **`apps/mobile/src/export/subject.ts`:**
  - `pairSubject(A, B)`: two corpus colours; `deltas: [{ fromId: A, toId: B, deltaE00 }]`; title in `combinationSubject`'s form.
  - `exportSubjectFor(slug, palettes, colours?, pair?)`, in the order pair > colours > slug > latest.
- **`apps/mobile/src/palette.ts#draftOf(slugs)`:** `addMember` over the slugs, or `null` if any slug is unknown.
- **`@irodora/recommendation`:** `warmCoolRelation(colors, rules) → { score, direction, widestSpread }`, exported. `outfit-score.ts#harmony` delegates to it, so `scoreOutfit` returns exactly what it returned before.
- **`@irodora/ui`.** All changes are additive; without the new prop the old tree renders, and a decoy proves it.

| component | change | forced by |
|---|---|---|
| `ReadoutTable.tsx` (ruled) | (a) With a `testID`: each row `${id}.${key}`, and its `.label`, `.value`, `.reading`, `.formula`, `.note`, `.notation`. Each rule is its own 1 dp node, `${id}.${key}.rule`, at the same pitch. (b) `RuledRow.subscript?: string`: a lowered, smaller run after the label, sized by increment 1's reading. (c) `RuledRow.readingInk?: 'figure'`, **only if** increment 1 reads 08's WCAG words in the figure's ink and weight. (d) The note is `selectable`, so a tabular value is copyable (F-019 c2) | the sweep; `08.metrics.delta-eok.label`; `08.access.wcag.value` |
| `figures.tsx#signed` | The sign is taken from the printed value. A printed zero carries none: −0.004 at 2 dp prints `0.00`. Decoy: clear positives and negatives are unchanged | F-245's trap, now 08's |

### The composition, as a sketch

```tsx
<Screen scroll={false} bleed script={script}
  appBar={{ back: { glyph: 'back', label: t('tab.atlas'), name: t('detail.backToAtlas'), size: BACK_GLYPH, onPress: onBack },
            title: { text: t('compare.title'), ja: script === 'japanese' ? undefined : japaneseRun('compare.titleJa'),
                     align: 'centre', placement: 'bar', layout: 'inline', size: /*Inc 1*/, weight: /*Inc 1*/ },
            trailing: { targetRoom: true, icons: [{ glyph: 'download', label: t('compare.export'), size: EXPORT_GLYPH,
                                                     onPress: () => onExport(a, b), testID: 'compare.export' }] },
            rule: true, height: COMPARE_APP_BAR, inset: md, script }}
  actionBar={{ rule: true, fill: /*Inc 1*/, gap: sm, padding: { top: /*Inc 1*/, bottom: /*Inc 1*/, side: md },
               actions: [ { label: t('compare.exportPdf'), height: PDF, radius: /*Inc 1*/, onPress: () => onExportPdf(a, b) },
                          { variant: 'secondary', edge: 'border', label: t('compare.addToStudio'), height: STUDIO,
                            radius: /*Inc 1*/, onPress: () => onAddToStudio(a, b) } ] }}>
  <ScrollView testID="compare.scroll" contentContainerStyle={{ paddingTop: /*Inc 1: xl or xxl*/, paddingBottom: sm }}>
    <View pointerEvents="none" testID="compare.art" style={{ position: 'absolute', …, overflow: 'hidden' }}>
      {/* COMPARE_ART.top / .right / .left — three plum-branch fragments, backdrop, under everything */}
    </View>
    <View style={{ paddingHorizontal: md }}>
      <Card level="1" padding="sm" radius={/*Inc 1*/} testID="compare.pair">
        <Row align="stretch">
          <Half side="a" />                       {/* Stack: Swatch · xs · name · xs(named) · meta · sm · Button Change A */}
          <View testID="compare.seam" importantForAccessibility="no" style={{ width: SEAM, marginHorizontal: sm, … }} />
          <Half side="b" />
        </Row>
      </Card>
    </View>
    {/* xl */}
    <Row gap="sm" align="stretch" style={{ paddingHorizontal: md }}>
      <View style={{ flex: 1 }}><Card level="1" padding="sm" fill radius testID="compare.metrics">
        <Text size="label" weight={500} heading>{t('compare.metrics')}</Text>{/* xs */}
        <ReadoutTable form="ruled" layout="columns" rows={readout.metrics} script={script} testID="compare.metrics.table" />
      </Card></View>
      <View style={{ flex: 1 }}><Card level="1" padding="sm" fill radius testID="compare.access">
        <Text size="label" weight={500} heading>{t('compare.access')}</Text>{/* xs */}
        <ReadoutTable form="ruled" layout="stacked" rows={readout.access} script={script} testID="compare.access.table" />
      </Card></View>
    </Row>
  </ScrollView>
  <Sheet form="floating" open={picking !== null} title={t(picking === 'a' ? 'compare.pickA' : 'compare.pickB')}
         closeLabel handleLabel handleHint testID="compare.pick">
    <SearchField label={t('compare.choose')} value={query} onChangeText={setQuery} />
    {list.length === 0 ? <EmptyState message={t('compare.noMatch')} resolvedHere script={script} />
                       : <FlatList data={list} renderItem={PickRow} … />}
  </Sheet>
</Screen>
```

**`Half` (one per side):**

- `Swatch size={pairSampleSize(width)} corner keylineWidth name hex color`. It has no `onPress` and no children, so no control sits inside an accessible sample (E-224's lesson).
- The name: one paragraph, `‹kanji› ‹Romaji›`, body, set as 07's `anchorLine` is. If the sweep's script check reports the kanji in a Latin face, it becomes a nested Japanese-script run (F-247's `TableRow.note` lesson).
- The meta: label, `foreground.2`, `numeric selectable`.
- `Button variant="secondary" edge="border" height={CHANGE} label={t('compare.changeA')}`. Its name is *Change A: ‹kanji› ‹Romaji›*, which contains the visible word (WCAG 2.5.3).

**`PickRow`:**

- One `Pressable` (role button, `accessibilityState.selected` for the slot's own colour).
- It is named `‹kanji› ‹English›`, then `swatchAccessibleName` (F-247 S4: a spoken colour keeps its provenance).
- Inside: a 32 dp `Swatch`, hidden from assistive technology, in a `SelectionFrame` when chosen; and the words.

**The absent colour:** `Screen appBar={{ back, rule, height }}` with `EmptyState message={t('detail.notFound')} resolvedHere`. It has no export glyph, no card and no bar. `STATES = { absent: 'empty' }` is unchanged.

### Drawn intervals, from `08.json` at 0.5 dp/px, insets subtracted

Line insets, as (lineHeight − em)/2:

| step | latin | ja |
|---|---|---|
| title | 2.2 | — |
| body | 5.2 | 6.8 |
| label | 3.85 | 5.165 |
| caption | 2.575 | 3.51 |

**The test recomputes every row from the pixels (F-248's lesson). Increment 1 may move a box.**

| interval | px | dp | less | built | snap |
|---|---|---|---|---|---|
| bar height (rule top) | 93 | 46.5 | — | 46.5 | `COMPARE_APP_BAR` (= `APP_BAR_HEIGHT`'s 08 reading; **Inc 1** reads the line's rows) |
| bar side insets: back / export | 35 / 36 | 17.5 / 18 | — | | `md` |
| rule → pair card (the leaked heading's space kept, F-246's rule) | 79 from the box foot; 84–86 from the line | 39.5–43 | — | | **Inc 1**: `xl` if under 40, `xxl` if over. Within a quarter step of the midpoint, so read it again |
| page inset, pair card | 34 / 34 | 17 / 17 | — | | `md` |
| card → sample: top / leading / trailing | 24 / 24 / 24 | 12 | — | | `sm` (a tie, so the smaller, §2). Re-read the card's edge |
| sample → seam → sample | 22 / 22 | 11 / 11 | — | | `sm` |
| sample → name | 22 | 11 | 5.2 or 6.8 (Inc 1: the line's face) | 5.8 / 4.2 | `xs` |
| name → meta | 14 | 7 | (5.2 or 6.8) + 3.85 | **−2.05 / −3.65** | **named, `xs`** (+6.05 / +7.65) |
| meta → Change | 26 | 13 | 3.85 | 9.15 | `sm` |
| Change → card foot | 24 | 12 | — | | `sm` (tie) |
| Change height | 54 | 27 | — | 27 | `CHANGE` |
| seam width | 2 | 1 | — | 1 | `SEAM` |
| pair card → the two cards (the leaked caption's space kept) | 63 | 31.5 | — | | `xl` |
| cards: leading / trailing inset | 35 / 34 | 17.5 / 17 | — | | `md` |
| card ↔ card | 22 | 11 | — | | `sm` |
| card → title, top | 27 / 27 | 13.5 | 3.85 | 9.65 | `sm` |
| card → title / table, leading (siblings) | 24, 23 / 25, 25 | 12, 11.5 / 12.5, 12.5 | — | | siblings 2:2, so the smaller: **`sm`** |
| title → first rule (siblings) | 19 / 15 | 9.5 / 7.5 | 3.85 | 5.65 / 3.65 | `xs` |
| table → card, trailing | 24 / 24 | 12 | — | | `sm` |
| last text → card foot | 28 / 26 | 14 / 13 | 2.575 / 3.85 | 11.4 / 9.15 | `sm` |
| card foot → bar rule | 16 (to 1235) | 8 | — | | `sm` (**Inc 1**: the rule's row, 1235 or 1243) |
| bar rule → buttons | 44 or 36 | 22 or 18 | — | | **Inc 1**: `lg` or `md`, near the midpoint |
| buttons → bar foot | 34 | 17 | — | | `md` (`sm` if the bar's foot is read above the home indicator; F-247 took `sm`) |
| bar sides | 32 / 33 | 16 / 16.5 | — | | `md` |
| PDF ↔ Studio | 16 | 8 | — | | `sm` |
| PDF / Studio height | 63 / 60 | 31.5 / 30 | — | | `PDF`, `STUDIO`. **Inc 1**: one height if the difference is the outline |

**Heights the scale makes taller than drawn.** These are estimates. A test tree has no layout (F-248's decision), so ADR-0157 states them and the capture shows them.

| region | drawn | built (estimate) | why |
|---|---|---|---|
| pair card | 257 | ≈ 267–270 | samples +8 (the 12 dp ties at `sm`); name → meta named |
| metrics card | 231.5 | ≈ 272–292 | label leading 21.7 against a drawn pitch of about 14; the hue reading wraps when *towards ‹term›* is appended |
| access card | 231.5 | ≈ 290–355 | *(Machado 2009)* is longer than *(Safe)*, so each row is two lines in 153 dp |
| page (cards share a row, so the taller decides) | 688 | ≈ 760–810 | the page scrolls under the pinned bar |

---

## Increments

Each commit passes Tier 1 (ADR-0132): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'`, plus the domain gates named under each step. `pnpm lint` is the root lint, which includes `verify:claims`, `verify-mockups`, `mockup-inventory --check` and `verify-app-glyphs`.

### 0. Claim and plan

- This file goes to `.harness/plans/F-249-compare-is-mockup-08.md`.
- F-249 is already `in_progress` with `plan` set; confirm both. Add `attested` (Appendix E).
- Gates: `node scripts/verify-state.mjs`, `pnpm format:check`.

### 1. Measure, decide, specify (no source)

**How to read the image.** PowerShell's execution-policy bypass is refused here, so the `.ps1` readers cannot run.

- Use a scratch Node reader in the session's scratchpad, as F-248 did. It decodes `mockups/08_color_compare_instrument.jpg` with `jpeg-js`, which `apps/mobile` already depends on (ADR-0092's precedent), loaded through `createRequire` from `apps/mobile/package.json`.
- It reimplements only the method each `.ps1` documents: `measure.ps1 blobs/edges/mean`, `corner.ps1`'s fit after the straight-side baseline, `tint.ps1`'s saturated-pixel mean, `stem.ps1`'s ink-coverage integral, and `art-measure.ps1`'s `inkP90`/`inkP50` against `foreground`.
- Every reading goes into `08.mjs` as a comment naming the box, the background, the threshold and the method, so `measure.ps1` can repeat it wherever PowerShell runs.
- Readings below 12 dp go in comments, not `raw.emDp` (F-248).
- The reader is not committed. Committing a Node port is not this feature's work.

**What `08.mjs` records today, and what must be read:**

| region | 08.mjs today | read in increment 1 | lands in |
|---|---|---|---|
| header | `08.header` 0–100; `08.header-rule` 93–100 (a 7 px band); `08.title` `raw.emDp 20.5`, title 500; `08.back` with no type; `08.export` 27 × 34 ink | the rule line's rows and thickness (`edges`); the title's em from the *C*'s cap height and the kanji's ink separately (`blobs`), and its weight against a 400 text in the same ink (`stem`: the meta or *Atlas*); *Atlas*'s em and weight; the arrow's and the download glyph's ink boxes and inks (`tint`/`mean`: `foreground` or `foreground.2`) | `08.title.type`; `08.back.type`; `BACK_GLYPH`, `EXPORT_GLYPH` (ink height × 24 ÷ the glyph's grid extent, F-247's rule); `COMPARE_APP_BAR` |
| pair card | box 34, 179, 700 × 514; `measured.bg #1E2125`; `radius md` | edges and corner (`raw.cornerPx`); whether the card draws an edge (`border.subtle`?) | `08.pair.tokens`, `raw.cornerPx` |
| samples | 303 × 303/304, `radius md`, `keyline` | the corner (§5 says 5.0 dp, which is `sm`; the inventory says `md`); the keyline's width and ink (`raw.keylinePx`, C20) | `08.pair.*.swatch.tokens.radius`, `raw.keylinePx` |
| seam | 383, 186–710, 2 px wide, `keyline` | its ink (`keyline` `#FFFFFF22` over level 1 reads ≈ `#3E4046` (C20), or `border.subtle`?); its top; **whether it stops at the card's foot** (693) and the rest is a leader to the leaked caption | `08.seam` box cut to the card; a `notDesign` row for the leader |
| names, meta | name gothic body; meta label tabular | the name's em by the kanji and by the Latin; the line's face; the meta's em | type rows |
| Change A/B | 303 × 54, `border.subtle`, `md`, no type | corner, edge ink, the label's em and weight; the brackets' crop | `raw.cornerPx`, `type`; `notDesign`: brackets as notation |
| metric cards | boxes, `radius md`, bg `#1E2126` / `#1D2025` | corners; edges; title em, weight and line pitch | type rows, corners |
| rows | ruled; labels label; values label 500; readings caption (`raw.emDp 10.3`) | each text's em; value weight 500 against label 400 (`stem`); the rule's thickness, ink and x extent; **`ΔEok`'s `ok`**: its em and baseline drop; **`08.access.wcag.value`'s ink and weight** for *"Non-Text / Harmonious Pairing"* against *"1.48:1"*; the separation lines' figure and word inks | type rows; `08.metrics.delta-eok.label` `raw.subscript`; `08.access.wcag.value.tokens` (claims-ok: quotes the drawn construction this line resolves) |
| action bar | `08.actions` 0, 1235, 768 × 141; pdf 63 px, studio 60 px; `md` | the rule's rows (1235 or 1243); the bar's fill against the ground (`mean`); both buttons' boxes, corners, the PDF's fill and ink, the Studio's edge; both labels' em and weight (F-248: the primary at board 00's 500) | `08.actions` box from its rule; `PDF`, `STUDIO`; type rows |
| art | three boxes: top 520, 100, 206 × 80; right 736, 190, 32 × 252; left 0, 880, 40 × 360 | ink (`inkP90`, `inkP50`) against R9 §5's backdrop 0.15; line width; **whether top and right are one sprig running behind the card's edge** (stroke continuity at x 726–736); each visible sprig's extent and orientation against the product's 60 × 52 `plum-branch` | `COMPARE_ART` (in `HOME_ART`'s form); `opacity.art` confirmed or a measured value (ADR-0157) |
| leaked text | three `notDesign` rows | crops of *Card* at the end of `08.access.title`; the seam leader | `notDesign` additions |

**Census (a scratch script over the corpus; it writes no source).** Its numbers go into the ADRs.

- The count of ordered pairs (120 × 119) in each WCAG threshold band, each ΔE00 band, and each relation.
- Hue terms: for how many entries en names a term and ja does not. How many pairs append *towards*, in en and in ja.
- The near-neutral case: pairs with |Δh| ≥ 20° whose hue band is `veryClose` (ADR-0155's stated limit).
- Whether every English name passes the PDF's Latin-1 writer.
- The fixture pair (Test plan), and that none of its figures equals one 08 draws.

**`08.mjs` edits, then regenerate `08.json`:**

- Re-measured types, corners, keyline width, the seam box and the action bar box.
- Bindings:
  - `08.export` → `navigate:/profile/export`;
  - `08.actions.pdf` → `navigate:/profile/export`;
  - `08.metrics.hue.reading` → `engine:axisReading.hue+lexicon`;
  - `08.access.wcag.value` → `engine:contrast+threshold+warmCool`.
- `notDesign`: *Card*; the brackets; the seam's leader.
- `departures`:
  - E1: names and figures (as today);
  - E2: the sentence-form readings → band phrases; *(Safe)* ×3 → the model; the contrast verdict → the threshold and the relation;
  - E4: the chooser sheet; the absent state.
- `conflicts`: C11 (kept), C20 (the keyline width).

**Records:**

- Write ADR-0154 to ADR-0157 and add their `docs/adr/README.md` rows. Amend ADR-0095's status line.
- R9:
  - §2: 08's brackets join the bracket bullet; *Card* at the end of 07's and 08's card titles;
  - §4: E1 (08), E2 (08's three rows rewritten), E4 (the chooser);
  - §8: the `08` row (each binding, as the table under *Mockup fidelity*);
  - §9: the PDF row;
  - §10: ADR-0095's arrangement half for Compare, and F-019's, F-151's and F-156's on-screen parts.
- PRD §10, OQ-45's row: one line that ADR-0154's research (hairline-divided reference pairs) bears on its second half. OQ-45 is **not** closed: F-249 does not need it.
- `feature_list.json`:
  - F-249's notes;
  - notes on F-245, F-250, F-251, F-263, F-346, F-349, F-267 and F-344 (Appendix E);
  - new backlog features only if the census or ADR-0155 shows them owed (Appendix E).

**Gates:** Tier 1, plus `type-scale.test` (the census, if `08.title` moves off `title`; E-152).

### 2. `@irodora/ui`

- `ReadoutTable` ruled: part ids, rule nodes, `subscript`, `readingInk` (only if increment 1 needs it), `selectable` note.
- `figures.tsx#signed`: sign from the printed value.
- Tests:
  - `readout.test`: ids present with a `testID` and absent without one (decoy); the ruled pitch unchanged; the subscript is a lowered smaller run in the label's paragraph and in its name.
  - `figures.test`: `signed(-0.004, 2) === '0.00'`, `signed(0.004, 2) === '0.00'`; decoys −1.25 and +1.25 are unchanged.
  - New conformance subjects: `ReadoutTable ruled (ids, subscript)`.
- Gates: Tier 1, `pnpm test:a11y`, `pnpm test:contrast`, `pnpm test:cvd`.

### 3. Engine: `@irodora/recommendation#warmCoolRelation`

- Additive. `harmony()` in `outfit-score.ts` delegates to it.
- Tests in `packages/recommendation/test/outfit-score.test.ts`:
  - `scoreOutfit` deep-equals its previous output over the existing fixtures (the no-change oracle);
  - `warmCoolRelation(pair).direction` equals `scoreOutfit([top A, trouser B]).components.harmony.direction` for all 120 × 119 corpus pairs;
  - decoy: a warm pair and a cool–warm pair give different directions.
- Gates: Tier 1 (recommendation, optimization, mobile).

### 4. Pure logic

- `compare.ts` additions; `compare-readout.ts`; `notation.ts#oklchLine({ chroma: false })`; `export/subject.ts#pairSubject` and the `pair` parameter; `palette.ts#draftOf`.
- The shared temperature-relation map: move it out of `wear.ts`, keeping its keys. `wear.test` and `wear-states.test` must stay green unchanged.
- The catalogue keys that `compare-readout.ts` reads as literals, in en and ja. Keys only the screen reads arrive in increment 5: the i18n unused-key scan refuses a key nothing renders (F-247's lesson).
- Tests: `compare.test.ts` extended; `compare-readout.test.ts` (new, every invariant over every pair; see the test plan); `export-subject.test` (pair); `palette` (draft).
- Add the honest composed forms to `packages/testing/fixtures/claims/near-misses.md` in en and ja: *"1.48:1 • Under 3:1 / Shared Temperature"*, *"92% Separation (Machado 2009)"*, *"Export Precision Delta PDF"*. If the lint refuses a chosen word, take ADR-0155's fallback; never widen a pattern to pass.
- Run `node scripts/verify-font-coverage.mjs`. If it names glyphs (likely candidates: 比, 較, 覚, 距, 離, 差, 指, 標, 覧, 変, 更, 選, 寄, 未, 満, 追, 加, 工, 房), run `generate-font-subset.mjs`, then `fonts.test`.
- Gates: Tier 1, `verify-font-coverage`.

### 5. The screen and its routes

- **Rebuild `Compare.tsx`.**
  - Props: `initialA?`, `initialB?` (tests), `initialPicking?: 'a' | 'b'`, `initialQuery?`, `onBack?`, `onExport?`, `onExportPdf?`, `onAddToStudio?`.
  - An absent handler means an absent control.
- **`app/(tabs)/atlas/compare.tsx`:**
  - `<Stack.Screen options={{ headerShown: false }} />`;
  - reads `?a`;
  - `onBack` → `router.navigate('/atlas')`;
  - `onExport` → `router.push(\`/profile/export?pair=${a}${COLOURS_SEPARATOR}${b}\`)`;
  - `onExportPdf` → the same with `&format=pdf`;
  - `onAddToStudio` → `router.push(\`/atlas/palettes?colours=${a}${COLOURS_SEPARATOR}${b}\`)`.
- **`app/(tabs)/profile/export.tsx`:** reads `pair` and `format`. A `format` that is not a writer's is ignored.
- **`app/(tabs)/atlas/palettes.tsx`:** reads `colours` → `draftOf` → `initialDraft`.
- **`chrome.test.ts`:** delete the `atlas/compare` row, and move the decoy at lines 180–187 to `atlas/find`.
- **`screens.test.tsx`:**
  - Subjects: `screens/Compare` (08 as drawn: the fixture pair, every handler), `(choosing A)`, `(choosing B, nothing matches)` (the witness for `empty` in the sheet), and `(not in this corpus)`, kept.
  - `sampleValues` adds the pair's and the sheet's hexes.
  - Rewrite the FR-48 describe for 08's figures and the spaces in the accessible names.
  - Rewrite the tabular describe: count 08's figures (2 metas, 5 metric values, the ratio line, the Lc, 3 separations), each listed, every one selectable.
  - Rewrite the F-151 describe: drawn apart with the seam between; both samples before every figure; at 320 dp each ≥ `nativeJudgeableSample`; the Finder decoy kept.
  - State each removal's reason (ADR-0156).
- Remove the keys and code nothing reads.
- `screen-insets.json`: re-capture the Compare entries only.
- **e2e:** in `routes.json`, the `/atlas/compare` anchor → `compare.metrics` (one node, wholly in the locale's words); then `node scripts/generate-e2e-flows.mjs`.
- Gates: Tier 1, `test:a11y`, `test:contrast`, `test:cvd`, `verify-reachability`, `verify-route-targets`, `generate-e2e-flows --check`, `verify-token-reach`, `verify-font-coverage`.

### 6. Enrolment

- `ENROLLED` gains `08.screen` (root `compare.surface`, the fixture pair, every handler, `locators: compareLocators()`), with its decoys.
- `inventory-surfaces.json` gains `"08.screen"`.
- Commit `conformance-sweep.json`.
- Gates: Tier 1, `verify-mockups`.

### 7. Criterion 1's own test

`apps/mobile/test/compare-fidelity.test.tsx`. Gates: Tier 1.

### 8. States and actions

`apps/mobile/test/compare-states.test.tsx`. Gates: Tier 1.

### 9. Effects and memory

- `effects.json`: the updates below, and E-225 to E-229, each with its note in `.harness/memory/effects/`.
- Gates: Tier 1, `node scripts/verify-state.mjs`.

### 10. Verify, review, record

- Run Tier 2, then the evaluator once.
- Fix its findings or record them as backlog, then run Tier 2 again on the final tree.
- Update `progress.md` and `feature_list.json`; capture lessons; checkpoint.

---

## Mockup fidelity

- **Governing:** `08` (P1). Variant: `25` for the palette only (P2). No Japanese variant exists, so ja is the catalogue's words on 08's layout, with the title under ADR-0142 D5's OQ-48 interim. Board `00` covers what 08 does not show (P3), and `27`/`00` the empty states (ADR-0128).
- **Conflicts applied:** C11 (the samples on the tinted card), C20 (the keyline's measured width), C1/E4 (the tab bar under the action bar).

### Element by element (69 elements; locators for `ENROLLED`)

| ids | built as | bound to | sweep locator |
|---|---|---|---|
| `08.header` | `Screen appBar`, h `COMPARE_APP_BAR` | — | derived `AppBar` |
| `08.back` | `AppBar.back`, glyph `back`, `BACK_GLYPH` | `tab.atlas`; named `detail.backToAtlas`; → `/atlas` | glyph and text |
| `08.title` | centred, inline, `ja` run | en: `compare.title` + ` • ` + `japaneseRun('compare.titleJa')`; ja: `compare.title` (the run repeats 比較, so it is not drawn; ADR-0142 D5) | value, per locale |
| `08.export` | trailing icon `download`, `EXPORT_GLYPH`, `targetRoom` | → `/profile/export?pair=` | testID `compare.export` |
| `08.header-rule` | `AppBar.rule` | — | `APP_BAR_RULE_TEST_ID` |
| `08.art-top`, `-right`, `-left` | `Illustration plum-branch backdrop` in the art layer | — | testIDs `compare.art.top/right/left` |
| `08.pair` | `Card` level 1, sm | — | testID `compare.pair` |
| `08.seam` | `View`, `SEAM` wide, measured token, hidden from assistive technology | — | testID `compare.seam` |
| `08.pair.{a,b}.swatch` | `Swatch size={pairSampleSize}`, corner and keyline per Inc 1 | `colorFor(entry)`, with provenance | testIDs `compare.{a,b}.swatch` |
| `08.pair.{a,b}.name` | `Text body` | `‹kanji› ‹Romaji›` | value `nameLine(entry)` |
| `08.pair.{a,b}.meta` | `Text label fg2 numeric` | `‹hex› • OKLCh L • h°` | value `pairMeta(entry)` |
| `08.pair.{a,b}.change` | `Button secondary edge=border`, `CHANGE` | `compare.changeA/B` → the chooser | text keys |
| `08.metrics`, `.title`, `.table` | `Card`; `Text label 500`; `ReadoutTable ruled columns` | `compare.metrics` | testIDs; text |
| `08.metrics.rule-1…5` | the ruled form's rule nodes | — | `compare.metrics.table.{delta-e00,delta-eok,lightness,chroma,hue}.rule` |
| `08.metrics.{key}` and `.label`, `.value`, `.reading`, `.formula` | `ReadoutRow` parts | `pairReadout` | `compare.metrics.table.{key}[.part]` |
| `08.access`, `.title`, `.table` | `Card`; `Text`; `ReadoutTable ruled stacked` | `compare.access` | testIDs; text |
| `08.access.rule-1…4` | rule nodes | — | `compare.access.table.{wcag,protan,deutan,tritan}.rule` |
| `08.access.{key}`, `.label`, `.value`; `08.access.wcag.apca` | row parts; the note | `pairReadout` | `compare.access.table.{key}[.part]`; `.wcag.note` |
| `08.actions`, `.pdf`, `.studio` | `ActionBar`; `Button` primary `PDF`; secondary `STUDIO` | `compare.exportPdf`; `compare.addToStudio` | derived `ActionBar`; text keys |

### Bindings (§8), every one the engine's or the corpus's

| element | value | computed by |
|---|---|---|
| samples, names, meta | the entry's colour, `‹kanji› ‹Romaji›`, `‹hex› • OKLCh ‹L› • ‹h›°` | corpus derivation (3 and 1 dp); `notation.ts` |
| ΔE00, its band, CIEDE2000 | `printedDeltaE00(d)`; `bandKey` | ADR-0125 |
| ΔEok | `deltaEok(oklchToOklab(·))`, 3 dp | `compare.ts` |
| ΔL\*, ΔC\*, ΔH and their readings | the record's LCh: b − a, signed, 1 dp (ΔH in degrees, `hueDelta`); `axisReading(printed, termL/C/H)`; ΔH plus *towards ‹B's term›* under ADR-0155 D2 | `compare.ts`, `compare-readout.ts`, `delta-readings.ts`, `finder.ts#lexicon` |
| WCAG line | floored ratio `:1` • threshold / `warmCoolRelation` | `compare.ts`, ADR-0155 D3 |
| APCA note | `(APCA Lc: floor₁(min\|Lc\|))` | `compare.ts` |
| three separations | `floor(separationDetail(·, d, 1).score)% Separation (Machado 2009[, approximate])` | FR-5 (E-005) |

### Departures, by id (nothing else)

- **E1:** names, hexes, OKLCh and every figure; the meta line's numbers (08's do not survive checking).
- **E2:**
  - *B is lighter*, *B is more chromatic* and *Shift towards teal* → the band phrases, with *towards* where ADR-0155 D2 allows it;
  - *(Safe)* ×3 → the model;
  - *Non-Text / Harmonious Pairing* → the threshold the ratio reaches, and the warm–cool relation (claims-ok: quotes the drawn construction this list resolves);
  - the Lc → the smaller direction, floored.
  - (claims-ok: quotes the drawn constructions this list resolves)
- **E3:**
  - every text wraps and none is clipped;
  - drawn-height buttons clip at 200 % (F-344);
  - tap targets through the hit area (the Change buttons are 27 dp; the header glyph has `targetRoom`).
- **E4:**
  - the chooser sheet behind *Change A/B*;
  - the absent colour (back and `00`'s caption);
  - the sheet's no-match caption;
  - the tab bar under the action bar.
- **§2, not design:** the leaked *Side-by-Side Dual Color Comparison Block*; *Divid seam/ neutral keyline* and the seam's leader; *level="2"*; *Card*; the brackets.
- **§2, tighter than the scale (named in ADR-0157):** name → meta.
- **Not departures from 08, but from earlier decisions** (R9 §10): the samples apart (ADR-0154); what leaves Compare (ADR-0156).

If the capture shows anything else, it is fixed, or it is a question for a person.

---

## Files to touch

```
.harness/plans/F-249-compare-is-mockup-08.md
docs/adr/0154-…, 0155-…, 0156-…, 0157-…, docs/adr/README.md; docs/adr/0095-… (status line)
docs/design/R9-MOCKUP-FIDELITY.md (§2, §4, §8, §9, §10); docs/PRD.md (§10, OQ-45's row: one line)
mockups/tools/inventory-data/08.mjs, mockups/inventory/08.json
packages/ui/src/ReadoutTable.tsx, figures.tsx, index.ts; packages/ui/test/readout.test.tsx, figures.test.tsx, conformance.test.tsx
packages/recommendation/src/outfit-score.ts, src/index.ts; test/outfit-score.test.ts
packages/testing/fixtures/claims/near-misses.md
apps/mobile/src/compare.ts, compare-readout.ts (new), notation.ts, wear.ts (the map moves out), export/subject.ts, palette.ts, i18n/en.ts, ja.ts
apps/mobile/src/screens/Compare.tsx
apps/mobile/app/(tabs)/atlas/compare.tsx, atlas/palettes.tsx, profile/export.tsx
apps/mobile/test/compare.test.ts, compare-readout.test.ts (new), compare-fidelity.test.tsx (new), compare-states.test.tsx (new),
  screens.test.tsx, chrome.test.ts, export-subject tests, palette tests
apps/mobile/e2e/capture/routes.json (+ regenerated flows)
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf (+ pins), only if verify-font-coverage asks
.harness/verification/inventory-surfaces.json, conformance-sweep.json, screen-insets.json
.harness/state/feature_list.json, progress.md, effects.json; .harness/memory/effects/*.md
```

---

## Anticipated effects

### Existing links whose `from` this touches

| link | change | guard |
|---|---|---|
| **E-003** (`deltaE00` → `compare.ts`) | 08 prints ΔE00 at 2 dp and its terms through `deltaE00Terms`; the pinned 89.73 stays | `compare.test` (the pin; `Object.is(terms.deltaE00, deltaE00)` over every pair); gate `color-golden` (unchanged) |
| **E-005** (one separation definition) | 08 reads `separationDetail` at severity 1, floored; no second definition | `compare-readout.test`: every row is `floor(separationDetail(...).score)`; a test that `compare-readout.ts` imports no simulation; gate `cvd` |
| **E-044** (`content/rules` lexicon → readers) | a **third reader**: 08's *towards*. A removed term makes 08's hue reading quieter, indistinguishable from "no term applies" | `compare-readout.test`: an appended term's region holds B, never A; decoy: removing `teal` from a test lexicon removes it from the pairs that used it; gate `content` |
| **E-091** (`Pair`) | Compare leaves `Pair` (ADR-0154); `Contemporary` keeps it | `pair.test` unchanged; `screens.test`'s rewritten F-151 describe (apart, seam, ≥ 77 dp at 320) |
| **E-097** (the Slider) | its only screen consumer leaves | recorded on F-346; registry subject unchanged |
| **E-109** / **E-120** (layout primitives; Card insets) | Compare rebuilt with `Row`/`Stack`/`Card` | `verify-layout-primitives` (lint); `screen-insets.json` re-captured for Compare only |
| **E-138** (tabular figures) | 08's figures | the rewritten tabular describe (every figure listed, selectable) |
| **E-164** (chrome) | `atlas/compare` leaves `PLATFORM_HEADER`; the decoy moves to `atlas/find` | `chrome.test`, both directions |
| **E-169** (`figures.tsx` → displays) | `signed` takes its sign from the printed value | `figures.test` (the −0 cases, with decoys); `ragged-figure` over every subject |
| **E-175** (bands → `delta-readings`) | 08 reads them through `compare-readout.ts` | `compare-readout.test`: the band is the printed value's, the direction is the printed sign's, over every pair |
| **E-191** (`states.ts`) | `STATES` unchanged; witnesses `(not in this corpus)` and `(choosing B, nothing matches)` | the declarations test; `blank-panel`, `bare-zero` |
| **E-203** (`verify-mockups`, sweep) | `08.screen` enrolled | `verify-mockups` in lint; `screens.test`, both directions |
| **E-215 / E-221** (export route subject) | the route also reads `pair` and `format` | `export-subject.test` (precedence; pair; decoys) |
| **E-218** (`compare#compare` → 07) | `contrast` unchanged | `wear.test` green, unchanged |
| **E-016 / E-089** (catalogues, Japanese claims) | keys added, re-valued and removed | `tsc`; `i18n.test`; `verify:claims`; `near-misses.md` |
| **E-017 / E-145** (Japanese content → font subset) | new catalogue kanji | `verify-font-coverage`; `generate-font-subset --check` |
| **E-128 / E-134 / E-152** (inventory → R9, PRD, features, type census) | `08.json` edited | `verify-mockups`; `mockup-inventory --check`; `type-scale.test` if a step moves |

### New links (E-225 is the next free id)

- **E-225.** From `apps/mobile/src/compare-readout.ts#pairReadout`. To `Compare.tsx`, `compare.ts`, `delta-readings.ts`, `finder.ts#lexicon`, and the fidelity, states and sweep tests.
  - **Hazard:** a printed figure differs from the engine's (rounded where it must be floored); a word contradicts its figure's sign or band; the threshold word overstates the floored ratio; *towards* names a region B is not in.
  - **Guard:** `compare-readout.test` holds every invariant over all 14,280 ordered pairs, with one pair worked by hand and pinned, and decoys (see the test plan).
- **E-226.** From `packages/recommendation/src/outfit-score.ts#warmCoolRelation`. To `scoreOutfit`'s harmony component (07, 13, the Lab), `compare.ts` (08's relation), and F-349.
  - **Hazard:** `scoreOutfit`'s output moves, or 08 and 07 disagree on one pair.
  - **Guard:** `outfit-score.test`'s no-change oracle, and its equality with the harmony component for every corpus pair.
- **E-227.** From `apps/mobile/app/(tabs)/atlas/compare.tsx` (08's drawn actions). To `/atlas`, `/profile/export` (`pair`, `format`), `/atlas/palettes` (`colours`), `exportSubjectFor`, `palette.ts#draftOf`, and F-251/F-263.
  - **Hazard:** a rebuild of 10, 16 or 18 renames a route or stops reading a parameter, and 08's actions break with nothing failing on 08.
  - **Guard:**
    - `compare-states.test` reads each handler's own body (decoys: a back that pops; swapped targets);
    - `export-subject.test` writes `pairSubject` for every corpus entry paired, in all six formats including the PDF (decoy: a colour twice is refused);
    - a palettes-route test: `colours` gives A as anchor and B as neutral (decoy: an unknown slug gives no draft);
    - `verify-route-targets`.
- **E-228.** From `packages/ui/src/ReadoutTable.tsx` (ruled part ids, rule nodes, `subscript`, `readingInk`). To `Compare.tsx` and the sweep's 08 locators.
  - **Hazard:** a refactor drops an id, and the sweep stops finding 08's rows, or finds rules that are borders.
  - **Guard:** `readout.test` (ids with a `testID`, none without — decoy; pitch unchanged); the sweep's `08.metrics.rule-3` decoy.
- **E-229.** From `apps/mobile/src/finder.ts#find`. To the Finder and 08's chooser.
  - **Hazard:** F-250's rebuild changes `find`'s contract (order, limit, async), and 08's chooser changes silently.
  - **Guard:** `compare-states.test`: a hex lists `hexNearest`'s entries, a phrase its region, a name `byName`, each less the other slot; `finder.test`.

---

## Test plan

### The invariants a person checks first, over every case the data allows (F-248's lesson)

All in `apps/mobile/test/compare-readout.test.ts`, pure, over all 120 × 119 ordered pairs unless stated.

1. **Two colours, and the two named.**
   - `initialPair(x)` gives a ≠ b for every corpus slug and for no parameter.
   - `choose(state, side, slug)` never makes a = b (decoy: the other side's slug is refused).
   - `pickList` never offers the other side's colour.
   - Each `Half`'s swatch colour, name and meta are the same entry's (in the states test, over every chooser pick from the fixture).
2. **Every figure equals the engine's.**
   - ΔE00 is `printedDeltaE00`.
   - ΔEok is `deltaEok` at 3 dp.
   - ΔL\*/ΔC\*/ΔH are the record's LCh differences at 1 dp; ΔH ∈ [−180, 180] (`hueDelta`).
   - The ratio is `floor(r × 100) / 100` (decoy: some corpus pair or a constructed one where rounding would cross 3, 4.5 or 7).
   - The Lc is `floor(min|Lc| × 10) / 10` (decoy: the two directions differ for some pair).
   - The separations are `floor(score)`.
   - A pinned pair, worked by hand from the bundle's values, with the arithmetic in the comment (E-003's pattern).
3. **The words agree with the numbers.**
   - The total's band is `deltaE00Band(printed)`.
   - Lightness and chroma: direction = the sign of the **printed** figure; a printed zero is `level` and prints unsigned.
   - Hue: band of |termH|.
   - The threshold word is consistent with the floored ratio.
   - *towards* appears ⇔ band ≥ slight ∧ B has a term in the locale ∧ A is not in it.
   - Decoys:
     - a pair whose unrounded ΔL\* sign differs from its printed zero exists, or is constructed;
     - pairs both with and without *towards* exist;
     - the component band above the total's exists (ADR-0125's accepted case: asserted present, not "corrected").
4. **Symmetry.**
   - Swapping A and B leaves ΔE00, ΔEok, the ratio, the floored Lc, the separations, the relation and the bands equal.
   - It negates ΔL\*, ΔC\* and ΔH (except at exactly ±180°) and flips the lightness and chroma directions.
5. **Nothing claims what is not computed.** Every catalogue value `compare-readout.ts` reads, in en and ja, contains none of: *Safe*, *Harmonious*, *Match*, *Optimal*, *Passed*, *Verified*, *Identical*, *B is*, 一致, 安全. Decoy: a planted *Safe* is found.

### Unit and engine

- `compare.test.ts`: the existing cases are kept, plus the new fields (`Object.is` for terms; ΔEok symmetric and > 0 for every pair; LCh axes are b − a).
- `outfit-score.test.ts`: E-226's guard.
- `export-subject.test`: `pairSubject` for each of the 120 entries with a fixed partner, in six formats; the PDF passes Latin-1 for every English name; the precedence pair > colours > slug > latest; a colour twice is refused (decoy).
- Palette: `draftOf([a, b])` gives the anchor then a neutral; an unknown slug gives `null`.

**Golden:** none owed. No `packages/color-*` code changes. Every figure comes from golden-tested functions (`deltaE00Terms`, the bands' edges, `hueDelta`, OKLab, `wcagContrast`, `apcaLc`, `separationDetail`).

### Conformance subjects (`screens.test.tsx`)

- `screens/Compare`: the fixture pair, every handler. The **fixture pair** is picked by what it is, not by name: the first pair in slug order whose ΔE00 is perceptible, whose lightness and chroma are not level, whose hue band is at least slight with *towards* in en, which has one separation under 100 and ratio under 3, and none of whose figures equals one 08 draws. Increment 1's census confirms one exists, or names the relaxation.
- `screens/Compare (choosing A)`.
- `screens/Compare (choosing B, nothing matches)`.
- `screens/Compare (not in this corpus)`.
- `blank-panel` and `bare-zero` run on every subject. A *0% Separation (Machado 2009)* paragraph carries words, so it is not a bare zero.

### The inventory sweep (`ENROLLED`)

- `08.screen`, root `compare.surface`.
- Decoys, each giving one finding naming its element:
  - the seam removed → `08.seam`;
  - the hue reading's id removed → `08.metrics.hue.reading`;
  - `ΔEok`'s rule node removed → `08.metrics.rule-3`;
  - *Change B*'s text removed → `08.pair.b.change`;
  - the left art fragment removed → `08.art-left`.
- `08.screen` is added to "the real surfaces are clean as drawn".

### Criterion 1's own test (`compare-fidelity.test.tsx`, on the rendered tree; `el()` recomputed from pixels)

- **Order:**
  - back < title < export < rule;
  - A swatch < name < meta < Change A, then B's four, the A column before the B column;
  - the metrics card before the access card;
  - ΔE00 < ΔEok < Lightness < Chroma < Hue, each label < value < reading, the formula under the label;
  - WCAG < Protanopia < Deuteranopia < Tritanopia, the note inside WCAG's row;
  - PDF < Studio.
- **Grouping:**
  - A's four share a column that does not hold B's; the two columns and the seam share one row inside `compare.pair`;
  - the two cards share a row;
  - each columns-row's label and value share a row; each stacked row's value is under its label;
  - the actions share the bar's row.
  - **No pressable inside either sample's node** (E-224's lesson), and each sample's name is `swatchAccessibleName`.
- **Proportion:**
  - every interval of the table, recomputed through §2's snap, each subtracted inset written out;
  - the negative interval through `belowTheScale`, its cost asserted against ADR-0157;
  - every size constant, corner and keyline width;
  - `pairSampleSize` at 384 (equal to its formula) and at 320 and 360 (≥ `nativeJudgeableSample`);
  - the `READOUT_RULED_*` constants in use;
  - the art: each `COMPARE_ART` frame intersects its inventory box at 384 dp.
- **Type:** every text's `fontSize`, `fontWeight` and ink against `08.json` in en; the ja steps by the Japanese face's insets.
- **Wrap:** no `numberOfLines` on names, meta, titles, values, readings or notes.
- **Art against text (F-247's lesson):** the art layer is the scroll content's first child, and every `Text` has an ancestor in `compare.pair`, `compare.metrics`, `compare.access`, the app bar, the action bar or the sheet. All of these are opaque, so no word sits on a stroke.

### Negative and action tests (`compare-states.test.tsx`)

- **No 08 sample content**, in en and ja × dark and light, also with the sheet open and in the absent state, in paragraphs and accessible names:
  - names and hexes: *Ai-nezumi*, 藍鼠, *Sabi-asagi*, 錆浅葱, `#5B6B78`, `#5C828C`;
  - figures: `0.490`, `0.540`, `240°`, `210°`, `3.42`, `0.038`, `+4.8`, `+5.2`, `−14.2°`/`-14.2°`, `1.48:1`, `16.2`, `92%`, `94%`, `89%`;
  - words: *Harmonious*, *Pairing*, *Safe*, *B is lighter*, *B is more chromatic*;
  - *Shift towards teal* as a **whole node** (the band phrase can legitimately contain *towards teal*);
  - leaked text: `[Change`, `level=`, *Divid*, *Side-by-Side*, *Matrix Card*.
  - The precondition is asserted: the fixture's own figures differ from these. Decoy: a planted *Ai-nezumi* is found.
- **Every drawn action, fired on the control a person touches:**
  - back → `onBack()`;
  - the glyph → `onExport(a, b)`;
  - *Change A* opens the sheet titled for A, with A marked selected and announced, and B absent from the list;
  - typing a name, a phrase or a hex filters through `find`;
  - choosing changes A only, closes the sheet, and every figure becomes the new pair's;
  - *Change B* likewise;
  - PDF → `onExportPdf(a, b)`; Studio → `onAddToStudio(a, b)`.
  - Decoys: an absent handler means an absent control; a no-match query shows `00`'s caption with nothing else in the sheet.
- **Route source:** each handler's own body holds its target, plus `headerShown: false` (decoys: a back that only pops; swapped targets; `format=pdf` on the glyph).
- **The absent colour:** the back and `00`'s caption; no card, no glyph, no bar.

### E2E

`generate-e2e-flows --check`, with the capture anchor `compare.metrics`. The device run is attested.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#  + inc 1: type-scale.test if 08.title's step moves (verify-mockups and mockup-inventory --check run in lint)
#  + inc 2, 5: pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
#  + inc 4, 5: node scripts/verify-font-coverage.mjs (and generate-font-subset + fonts.test if asked)
#  + inc 5: verify-reachability, verify-route-targets, generate-e2e-flows --check, verify-token-reach
#  + inc 6: verify-mockups; inc 9: node scripts/verify-state.mjs
# Tier 2, at Verify and again after the review's fixes
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm turbo run test --force
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:content
pnpm security
node scripts/verify-ci.mjs --all
# no color-golden owed: no packages/color-* change
```

**Evidence for `progress.md`:**

- each gate's summary line;
- the sweep's inventory block (`08.screen` enrolled, `elementsAsserted` +69, `renders` +4);
- `claims.findings` 0;
- the font-coverage line;
- the screen-insets delta for Compare;
- the census numbers quoted in ADR-0155.

Report the known reds as F-248 did: F-348, F-350, F-351, F-322 (`pnpm security`), and the iOS half of `verify-ci` on win32.

| # | criterion | proven by |
|---|---|---|
| 1 | inventory 08 in order, grouping and proportion; the sweep asserts it | `compare-fidelity.test` and the sweep. **Gated** |
| 2 | bindings per §8; no mockup content | `compare-readout.test` (every pair), the sweep's values, `compare-states.test`. **Gated** |
| 3 | only the listed departures | **gated** for structure; **attested** for appearance |
| 4 | capture beside 08, compared by a person | **attested** |
| 5 | catalogues; every drawn action works; a11y, contrast, cvd | `tsc`, `i18n.test`, `compare-states.test`, the three gates. **Gated**, with the device half **attested** |

---

## Attestations

Declared in increment 0 (Appendix E). All three block release.

1. **Criterion 4.**
   - A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator at 384 dp, with a non-debuggable build of the final commit.
   - They compare `/atlas/compare` against 08 (en, Sumi), 25's palette (en, Washi) and ja, and record *matches* or each difference.
   - **Expected, not defects:**
     - the default pair (first and last entry), not 08's;
     - the band phrases, and *towards* only where ADR-0155 allows it;
     - *(Machado 2009)*, and *approximate* on Tritanopia;
     - the threshold word and the temperature relation;
     - *Change A* without brackets;
     - no leaked heading, caption or *level="2"*;
     - samples about 8 dp larger and the cards taller than drawn (ADR-0157);
     - the hue at one decimal, and no chroma in the meta;
     - the tab bar under the action bar.
2. **Criterion 3, the appearance half.** Discharged by the same comparison.
3. **Criterion 5, the device half.**
   - Back opens the Atlas.
   - *Change A* and *Change B* open their sheet; TalkBack names each row with its provenance and announces the chosen one; choosing changes one slot.
   - The glyph opens Export with the pair. PDF opens Export with PDF chosen, and the saved PDF names both colours with the ΔE00 row.
   - *Add Pair* opens the Studio with A as anchor and B as neutral, unsaved.
   - At 200 % in en and ja nothing is cut, except the drawn-height buttons (F-344, expected).
   - The generated flows pass.

---

## Risks and open questions

1. **Measurements owed in increment 1.** The title's em (`20.5` is suspect), the rule's rows, every corner (the samples: `md` recorded, about 5 dp read), the keyline width, the seam's extent and ink, the WCAG line's ink, the subscript, the action bar's rule and fill, the buttons' heights, and the art's continuity and ink. Every number marked "Inc 1" is unknown.
2. **Intervals within a quarter step of a midpoint:** rule → card (39.5–43 dp around 40), the bar's rule → buttons (18–22 around 20), and 08's many 12 dp ties. The rule decides; a half-pixel reading decides the rule. Record each reading.
3. **The decision a person is likeliest to revisit is ADR-0154**, followed by ADR-0155's hue figure (Δh° under the drawn *ΔH*, rather than ΔH\*ab, which would need an engine function with golden data and drops the drawn `°`) and the threshold words.
4. **The cards build much taller than drawn** (Findings 15). The honest parentheticals are longer than *(Safe)*. Shortening them (*(Machado)*, a model caption once per card) is an alternative ADR-0155 names, but none is taken without the capture. The person's comparison judges it.
5. **The Japanese lexicon names five hues to the English nine**, so a Japanese hue reading omits *towards* for teal, orange, brown and pink B colours. Increment 1's census counts the pairs; extending the lexicon is content work (backlog, Appendix E).
6. **Near-neutral pairs print a large Δh beside *Very Close in Hue*.** Both are true of their own numbers (ADR-0125's accepted trap); the census counts them and ADR-0155 states it.
7. **The claims lint may refuse *Text AAA* or *Precision*.** ADR-0155 names the fallbacks (*≥ 7:1 Text*; *Export Delta PDF Report*). A pattern is never widened to pass.
8. **The Slider loses its only screen consumer.** Recorded on F-346, not deleted here.
9. **A 120-row `FlatList` inside a floating `Sheet`:** windowing, Android scroll inside the sheet, and Maestro's view of it are unverified on a device.
10. **The art.** The product's `plum-branch` is one 60 × 52 drawing. 08's fragments may not map onto it cleanly (F-247's lesson): size each by the dimension 08 measures and check it against its box.
11. **Unverified mechanics:**
    - the centred title with its Japanese run at 320 dp;
    - `Card fill` giving equal heights in a `Row`;
    - the subscript on both platforms;
    - the 27 dp Change buttons' hit area inside the card on Android (ADR-0114's `targetRoom` reasoning).
12. **Tier 2 flakiness:** F-348, F-350 and F-351 are known; `screens.test` grows with four subjects and F-350's margin shrinks.
13. **No JDK or Maestro here.** The attestations are the person's.
14. **Open questions.** **None blocks F-249.**
    - OQ-45 is informed by ADR-0154's research, not decided (it blocks F-245, F-251 and F-260, and F-249 does not need it).
    - OQ-46 (the keyline where none is drawn) does not apply: 08 binds the keyline.
    - OQ-48's interim is applied, not decided (ADR-0142 D5).
    - Every new choice here closes in ADR-0154 to ADR-0157 under the delegation.

## Out of scope

- 18's document composition and its export screen (F-263); 10 and 16 (F-251); the Finder's rebuild (F-250); the FR-6 geometric classifier (F-349).
- An engine ΔH\*ab; a severity control; a `?b` parameter; persisting a pair.
- Extending the Japanese lexicon; 07's tritan qualifier (both recorded as backlog if owed).
- The fate of `Slider`, `Accordion` and `Tabs` (F-346); deciding OQ-45.
- Any change to the corpus, a golden value, a band edge, `HARD_TO_SEPARATE` or the separation formula.
- No new route.

## Sources (web, read for ADR-0154; quote from the sources themselves before accepting it)

- [arXiv 1904.11293 — A colour-difference formula for evaluating colour pairs with no separation (ΔE_NS)](https://arxiv.org/pdf/1904.11293): "The conventional color-difference formulas are all developed based on pairs with hair-line separation."
- [IS&T CIC 26 (2018), art00021](https://library.imaging.org/cic/articles/26/1/art00021): gapless printed pairs compared with hairline data; separation affects perception.
- [CIE 116-1995, Industrial colour-difference evaluation](https://cie.co.at/publications/industrial-colour-difference-evaluation): its reference conditions, reported by third parties as hairline-divided pairs over 4° under D65. **Confirm the wording** before citing it.
- [RiuNet 10251/140937](https://riunet.upv.es/handle/10251/140937): a gap's size changes discrimination ellipses.

---

# Appendix A: ADR-0154 draft

```markdown
# ADR-0154: 08's compare samples are drawn apart, as 08 draws them, each at or above the judgeable floor

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-249 |
| **Supersedes in part** | ADR-0095 "And the samples touch", for Compare; F-151 criterion 2's "edge to edge" |
| **Applies** | Golden rules 11 and 14; R9 §1, §10; FR-48; ADR-0125 (a band describes the printed number) |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
08 draws two samples, 151.5 dp each, 23 dp apart, each with its keyline, in one card split by a 1 dp seam.
ADR-0095 (F-151) made Compare's samples touch through `Pair`, with no line and no corner where they
meet. Rule 14 builds 08 unless golden rule 11, 12 or 13, a blocking gate, two contradicting mockups or an
undrawn capability forces otherwise.

## Research, and what it shows
- CIEDE2000's visual data, and CIE 116-1995's reference conditions, are hairline-divided pairs over 4°,
  not gapless ones [quote CIE 116].
- Gapless and separated pairs are perceived differently (arXiv 1904.11293; IS&T CIC 26, 2018); a gap's size
  changes discrimination ellipses (RiuNet 10251/140937).
- So neither ADR-0095's gapless pair nor 08's 23 dp gap is the condition ΔE00 was fit under.
  ADR-0095's arrangement half is a design judgement (an induced edge at the boundary), not a standard and
  not a golden rule. Its size half rests on the 2° observer and is unaffected.

## Decision
- **D1.** The samples are drawn apart, as 08 draws them: two `Swatch`es in the pair card's halves, the
  seam between, each binding its keyline at the drawn width (C20; ADR-0116 per sample).
- **D2.** Each is square, sized by its half (`pairSampleSize`), and never under `size.judgeable` on a
  supported width (127.5 dp at 320).
- **D3.** The figures stay beneath the pair (F-151 c2's second half).
- **D4.** `Pair` stays in `@irodora/ui` (Contemporary). ADR-0095 is amended to say so; R9 §10 lists the
  supersession.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Keep `Pair` touching | A departure from 08 that no golden rule forces; and gapless is not the formula's reference condition either |
| Samples touching a hairline seam | Moves 08's 23 dp; neither drawn nor ADR-0095's rule |
| A toggle between the two arrangements | An undrawn control |

## Evidence, and its limits
The studies are on printed samples under controlled viewing, not a phone in the hand. The bands describe
the printed number (ADR-0125), never what a person sees, which keeps either arrangement honest.

## Consequences
`screens.test`'s F-151 describe is rewritten. E-091 is updated. OQ-45 gains this research as evidence
and is not closed.

## Revisit when
A mockup draws the pair touching; a colour-difference model for separated display pairs is published; or
OQ-45's seam half is answered in a way that applies here.
```

# Appendix B: ADR-0155 draft

```markdown
# ADR-0155: 08's figures and words say what the engine computes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-249 |
| **Applies** | R9 §4 E1/E2, §8; FR-3, FR-5, FR-6, FR-48, FR-61; ADR-0124 (floors), ADR-0125, ADR-0131, ADR-0142 D3/D5, ADR-0151 D4 |
| **Decided on** | The delegation of 2026-10-05 (quoted as in ADR-0154) |

## Decision
- **D1. Figures.**
  - ΔE00: `printedDeltaE00`, 2 dp.
  - ΔEok: 3 dp.
  - ΔL\*, ΔC\*: the record's CIELAB LCh, b − a, signed, 1 dp; a printed zero is unsigned.
  - ΔH: the hue-angle difference `hueDelta(h_ab)`, signed, 1 dp, with `°`, under the drawn label. The
    degree sign says which quantity it is; the accessible name says "hue angle, CIELAB (D65)".
  - WCAG: floored to 2 dp. Lc: the smaller |Lc|, floored to 1 dp. Separations: `floor(score)`.
  - Meta: `hex • OKLCh L • h°`, as drawn (no C), at the record's precision (3, 1).
- **D2. Readings.**
  - ADR-0125's band phrases replace 08's sentence form.
  - ΔH's phrase gains *towards ‹B's term›*, from the published lexicon in the locale's language, only when
    the band is at least slight, B lies in the term, and A does not.
  - B's term: the most axes constrained, then the narrowest hue arc, then file order.
  - Census: [n] pairs in en and [m] in ja append it; [k] near-neutral pairs show |Δh| ≥ 20° beside
    *Very Close in Hue*, and both are true of their own numbers.
- **D3. The contrast cell.**
  - `ratio:1 • threshold / relation`.
  - The threshold is the highest WCAG 2.2 threshold the floored ratio reaches: Text AAA ≥ 7 (SC 1.4.6),
    Text AA ≥ 4.5 (1.4.3), Non-Text ≥ 3 (1.4.11, and AA large text), else *Under 3:1*.
  - The relation is `warmCoolRelation`: *Shared Temperature / Mixed Temperature / Warm Against Cool*,
    until F-349 names a geometric relation.
  - The Lc note says it is the smaller direction.
- **D4. Separations.**
  - *Protanopia · Deuteranopia · Tritanopia*, at severity 1 (dichromacy).
  - `n% Separation (Machado 2009)`; Tritanopia reads *(Machado 2009, approximate)* (ADR-0131).
  - No floor-bound verdict: `HARD_TO_SEPARATE` is a convention and the score is uncalibrated.
- **D5. Copy.**
  - *Card* is §2 component text; *Table* stays (ADR-0146).
  - *[Change A]*'s brackets are notation (ADR-0142 D3's reasoning).
  - The title takes ADR-0142 D5's interim.
  - *Export Precision Delta PDF* is kept: it names a document of published values and their ΔE00 to the
    engine's precision. No measurement is involved; it is in `near-misses.md`.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| ΔH\*ab (metric) | An engine function with golden data; drops the drawn `°` |
| Rename the label Δh | A departure the unit already makes unnecessary |
| Round the ratio | 2.996 reads 3.00 and claims *Non-Text* (ADR-0151 S2) |
| Both Lc directions | 08 draws one; the smaller never overstates |
| *Safe* bound to `HARD_TO_SEPARATE` | A claim about people from an uncalibrated score |
| *(Machado)* alone | Shorter, but drops the model's year; revisit after the capture |
| *towards* always | *towards blue* when A is already blue says A was not |
| Three OKLCh figures in the meta | A figure 08 does not draw |

## Evidence, and its limits
WCAG 2.2 SC 1.4.3, 1.4.6 and 1.4.11; CIE 15:2004's notation; `phrase-lexicon.2026.08.1.json`;
`separation.ts`; ADR-0131. The census numbers are measured over the pinned corpus.
```

# Appendix C: ADR-0156 draft

```markdown
# ADR-0156: What 08's controls do, and what leaves Compare

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-249 |
| **Supersedes in part** | F-019 c1's on-screen form; F-156's Slider on Compare; F-151 c2 (with ADR-0154) |
| **Applies** | R9 §4 E4; ADR-0128 §6, D3; ADR-0147 (06's form); ADR-0152 D6 (07's export); FR-47, FR-49, FR-51, FR-65 |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. The pair.** A is `?a` if the corpus holds it, else the first entry. B is the last entry, or the
  first when A is last. A ≠ B always. An unknown `?a` shows the back and 00's caption.
- **D2. Change A / B** open 03's floating sheet (E4):
  - 05's search field read through `find()`; every entry when the field is empty;
  - the other slot's colour left out; the slot's own marked chosen and announced;
  - no match shows 00's caption;
  - choosing changes that slot only.
- **D3.** The download glyph → `/profile/export?pair=A,B`: `pairSubject` with its ΔE00 row, every format.
- **D4.** *Export Precision Delta PDF* → the same, with `format=pdf`. F-263 composes the document.
- **D5.** *Add Pair to Palette Studio* → `/atlas/palettes?colours=A,B`: a draft with A as anchor and B as
  neutral, saved only by the person.
- **D6.** Back → `/atlas`.
- **D7. Leaves the page:**
  - the severity slider (08's -anopia is severity 1);
  - the a\*/b\* and OKLCh axis rows;
  - the second APCA direction and its note;
  - the separation decomposition (`compare.ts` still returns it);
  - the same-entry line (A ≠ B);
  - the end pickers.
  F-019 c1's space moves into each row's notation and accessible name (ADR-0119 §3's form).

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Navigate to the Finder to pick | Changes F-250's surface and its result action |
| Write the PDF directly from Compare | An undrawn outcome line on 08; Export already says saved, cancelled or refused |
| The glyph also the PDF | Two controls, one action |
| Save the pair as a palette at once | Needs a name; FR-49's validation belongs to the Studio |

## Consequences
F-251 keeps `colours`; F-263 keeps `pair` and `format` (E-227). F-346 gains the Slider.
```

# Appendix D: ADR-0157 draft

```markdown
# ADR-0157: 08's composition, its art and its seam

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-249 |
| **Applies** | R9 §2, §5, C20; ADR-0113, ADR-0121, ADR-0139; the lessons on ink gaps, rounded dp and text over art |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Intervals** are the plan's table, snapped by §2. The 12 dp ties take `sm`; name → meta is named
  at `xs`, with its cost.
- **D2. Heights.** The built heights against the drawn ones, with the estimates stated: pair card about
  +10, metrics about +40 to +60, access about +60 to +125, the page scrolls.
- **D3. Corners, keyline and seam.**
  - Corners and the keyline width as increment 1 read them.
  - The seam is 1 dp in [token], inside the card only; its extension is the leaked caption's leader (§2).
- **D4. Type steps and weights** as increment 1 read them (the title's em re-read; the primary at board
  00's 500).
- **D5. The art.** Three plum-branch fragments in an art layer under the opaque cards, placed and clipped
  as 01's `HOME_ART`, each sized by the dimension 08 measures, inked at [opacity.art | measured]. No word
  sits on a stroke.
- **D6.** ΔEok's `ok` is drawn lowered and smaller (`RuledRow.subscript`).
- **D7. The action bar** starts at its rule; the tab bar stays under it (E4).

## Evidence, and its limits
`08.json` and increment 1's readings. A JPEG reading carries ΔE00 ≈ 2. The person's comparison judges
the result.
```

# Appendix E: State drafts

**F-249 `attested`:** three entries in F-248's shape. Each has `"blocks": "release", "status": "outstanding"`.

- **Criterion 3:** gated for structure, attested for appearance. Cites `compare-fidelity.test` and the sweep, with ADR-0154 to ADR-0157 as the named departures.
- **Criterion 4:** the capture run, as in *Attestations* item 1, with its *expected, not defects* list.
- **Criterion 5:** gated except the device half, as in *Attestations* item 3.

**Notes on other features:**

| feature | note |
|---|---|
| F-263 | `/profile/export` also reads `pair` (`pairSubject`, with deltas) and `format` (E-227): keep both. The compare PDF's composition is yours |
| F-251 | `/atlas/palettes` reads `colours` into the draft (A anchor, B neutral; E-227): keep it in 16 |
| F-250 | 08's chooser reads `find()` (E-229): keep its contract |
| F-349 | 08 prints the warm–cool relation through `warmCoolRelation` (E-226). Replace it with the geometric name where one applies |
| F-346 | `Slider` lost its only screen consumer (F-249, ADR-0156) |
| F-245 | 08's ΔH is CIELAB Δh in degrees, as ADR-0119 makes 04's. `signed()` no longer prints −0. The *towards* composition is 08's only |
| F-267 | 08's expected differences (Attestations, item 1) |
| F-344 | 08's Change buttons and action buttons clip at 200 % |
| F-245, F-251, F-260 (OQ-45) | ADR-0154's research: CIEDE2000's reference pairs are hairline-divided, not gapless |

**New backlog features**, at the next free ids (F-353 onward), only if owed:

- **The Japanese phrase lexicon names the hues the English one does.** Content work; only if increment 1's census shows ja missing terms that en has.
- **07's separation row says when its worst pair is the tritan simulation, which is approximate.** Only if ADR-0155 D4 keeps *approximate* on 08.

**PRD §10:** one line on OQ-45's row. **R9:** §2, §4, §8, §9 and §10, as increment 1 lists.
