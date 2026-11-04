# Plan: F-252 — What goes with this is mockup 19

| | |
|---|---|
| **Feature** | F-252 ([`feature_list.json`](../state/feature_list.json), line ≈8801; already `in_progress`, `plan` set) |
| **Requirements** | FR-73 and FR-6. Also applied: FR-23 (corpus names as authored), FR-31 (the outfit 07 builds), FR-61 (each figure names its space), FR-71 (01's tab bar on a pushed route, C1/E4), NFR-8, NFR-21. These done criteria must survive or be superseded **on `/atlas/with/[slug]` only**, by ADR: F-194 c1–c3, F-196 (curated first), F-197 c1/c3, F-198 c1–c2, F-200 (arming a generated companion), F-202 c3 (Home offers this route), F-266's Arrival (E-199), F-236's `STATES` (E-191). They stay intact on 24's two routes, which keep `Combinations.tsx` until F-259 |
| **Service / package** | `apps/mobile`, and `@irodora/ui` (additive, only where increment 1 or a rule forces it). No `packages/color-*`, `content/` or schema change, so no golden data is owed |
| **Author** | The planner subagent. It read files and ran four web lookups (Matsuda/Cohen-Or hue-template sector widths, twice; Japanese harmony terms; one PDF it could not decode). It measured, built and ran nothing |
| **Date** | 2026-11-04 |
| **Decisions** | ADR-0167 (OQ-26: heading slots are design; component nouns and *Action:* are notation), ADR-0168 (what a row is: corpus colours in hue relationships to the anchor), ADR-0169 (OQ-27: FR-73's relationship, family and gamut cost on 19), ADR-0170 (19's figures and words), ADR-0171 (what 19's controls do, the states, and what leaves this route), ADR-0172 (19's composition) |

---

## Intent

A person taps *What Goes With This →* on Home (01), or the Lens's combinations exit, and lands on mockup 19. Top to bottom:

- **App bar.** It is filled. It reads `← Atlas | What Goes With This • 調和色`, with a divider between back and title and the filter glyph at the trailing end.
- **Anchor Colour.** A heading, then a card:
  - the anchor sample with its ring;
  - `藍鼠 Ai-nezumi (Indigo Grey)`-shaped name, with the record's own kanji, romaji and English;
  - the record's `OKLCh: L • C • h°`;
  - `Anchor Garment: Top`.
- **Ranked Harmonic Relationships.** A heading, then rows. Each row has:
  - a 62 dp sample;
  - `English • 漢字`;
  - `Relationship • ΔE00: d` from the anchor;
  - an outlined *Wear*.
- **Sticky bar.** *Build Complete 4-Piece Outfit →*.
- **01's tab bar** below everything (C1, E4).

Every row is a **corpus colour** with corpus provenance. The rows are:

- the members of any curated combination holding the anchor, first;
- then, for each colour the harmony engine generates around the anchor in the five hue relationships, the corpus colour nearest it. A row is offered only where that colour's hue lies within a stated tolerance of the relationship.

Each figure is the engine's.

**"Done", for a person:**

- In both themes and both languages, the page reads as 19.
- Each row names a relationship that its two colours actually stand in, to a stated hue tolerance.
- *Wear* opens 07 with the anchor as the top and that row's colour in the trousers.
- *Build* opens 07 with the engine filling all four pieces.
- The filter narrows the rows to one relationship and says so in words.
- A near-grey colour says plainly that it has no hue to relate to.
- Nothing on the page says *Ai-nezumi*, *Amber Ochre*, *Analogous Cool*, *Hero Card*, *Action:* or a figure 19 drew.
- `/wardrobe/with/[id]` and `/atlas/with/reading/[id]` (24, F-259) look and behave exactly as they do today.

---

## Findings from planning

Everything here comes from reading. Nothing was run. Each finding is marked **read** or **inferred**.

### 1. The current screen is not 19, and it serves three routes (read)

**`apps/mobile/src/screens/Combinations.tsx`** serves:

- `/atlas/with/[slug]` with an `entry` subject (`app/(tabs)/atlas/with/[slug].tsx:38`);
- `/wardrobe/with/[id]` with a `colour` subject (`wardrobe/with/[id].tsx:43`);
- `/atlas/with/reading/[id]` with a `colour` subject, or an empty-slug entry as its miss branch (`atlas/with/reading/[id].tsx:33`).

The last two are **24's** routes (R9 §7, C16; F-259). Any change to `Combinations.tsx` changes 24's routes. So **19 is built as a new screen**, and `Combinations.tsx` is left byte-for-byte for F-259.

**What the current screen draws, for an entry:**

- the platform header (`title: 'Irodora'`) and `Screen title={t('combos.title')}`;
- `combos.what` and, without a profile, `combos.personalNone`;
- a level-2 card with the subject's swatch;
- curated combination cards, then *Wear it*;
- `COMBINATIONS_SHOWN = 5` relationship cards, then *Other relationships* and the remaining up to seven. Each card holds a kind heading (`combo.*`: *Straight across*, …), *Generated*, a CVD separation line, a personal-fit line and a gamut-cost line, plus **generated companions drawn as hex-named swatches** that arm the Lens target (F-200).

`STATES = { absent: 'empty' }`.

**What 19 draws instead:** **one colour per row**, named in English and kanji. The row's *Wear* acts per row (`navigate:/atlas/wear/[slug]`). Wear ranks the corpus for a **slug** (`Combinations.tsx:535`), so a row must be a corpus entry. A generated companion has no slug and no name (F-197, E-103). That is the core finding behind ADR-0168.

### 2. The engine generates; nothing classifies (read)

**What `@irodora/color-harmony` provides:**

- `generateHarmony(source, kind)` returns gamut-mapped companions. Hue kinds hold L and C and rotate h exactly: hue drift through mapping is 2.6 × 10⁻⁵° (`generate.ts:10–21`). Default `spread` is 30°: analogous is ±30°, split is 180 ± 30°.
- `hueDistance` (`geometry.ts:45`) and `VARIES`.
- **No function says which relationship two given colours stand in.** That is backlog **F-349** (engine, golden-tested; mockups 07 08 13).

So 19 cannot ask "is this corpus colour complementary to the anchor?" of the engine. It can ask for the engine's complementary companion, then find the corpus colour nearest it, and check the hue against a stated tolerance. ADR-0168 decides exactly that.

**Two lookups found published hue-template sectors** (secondary sources; the original 2006 appendix PDF could not be decoded here):

- Matsuda's hue templates, as Cohen-Or et al. 2006 reproduce them, draw a single-hue sector (*i*-type, and each sector of the complementary *I*-type) **18°** wide, and the V-type 93.6°. The templates are defined on the HSV wheel, and the grey *N*-type is excluded from hue matching.
- EP2947865 describes the *i*-type as under 30°, with 20° as its example.

### 3. The corpus answers the drawn row exactly (read)

- `entryBySlug`, `allEntries` and `colorFor` give the record and its provenance.
- `combinationsContaining(slug)` gives the four curated combinations (`content/combinations/*.json`; 2–4 members, `lead`/`companion`, `intent`). Most colours are in none.
- `compare(a, b).deltaE00` is `deltaE00(a.derived.lab, b.derived.lab)`, the figure 08 prints for the same pair (`compare.ts:139`).
- `nearestByOklch` / `nearestByLab` (`finder.ts:211`) is "the one ranking route" (ADR-0158). A second nearest-match loop would be a defect by its own docblock.
- `derived.inSrgbGamut` and `derived.renderDeltaE00` hold each record's gamut cost. 06 prints the one non-zero cost as `detail.nearestSrgb` (`detail.ts:193–197`, ADR-0146 D4).
- `notation.ts#oklchLine(oklch, t('coord.oklch'), ': ')` produces exactly 19's `OKLCh: 0.490 • 0.035 • 240.2°` form. `nameLine` gives `kanji Romaji`.
- `finder.ts#lexicon()` is the published phrase lexicon (2026.08.1). F-250 found that its hue terms each carry a chroma floor of **0.039**, and that below it the product names no hue (`grey`/`neutral` span [0, 0.039]).

### 4. `RankedRow`'s `harmony` form already exists (F-235), with three gaps (read)

`packages/ui/src/RankedRow.tsx:167–231` provides the level-1 card, the 62 dp `md` sample with no keyline, `Bilingual` name `body 500`, the `Relationship • ΔE00: d` line at `label`, and an outlined `sm` button. `HARMONY_ROW` holds F-235's medians of 19's five rows (height 84, swatch 62, inset 18, nameGap 11.5, action 26.5 / 10.5), recomputed by `rows.test` from `19.json` (E-157).

The gaps:

- **(a) Clipping.** The name is `numberOfLines={1}`, which clips. E3: *"a line that does not fit wraps; it is never clipped"*.
- **(b) No slot for the gamut note.** There is nowhere to put the one out-of-sRGB entry's note (rule 11, FR-73).
- **(c) No part testIDs** for the sweep's locators. Unconfirmed: `screens.test`'s derived locators were not read in full.

### 5. What else in `@irodora/ui` covers 19 (read)

- `AppBar` covers the bar:
  - `divider` is documented as 19's (`AppBar.tsx:16, 77, 181`);
  - `fill: 'surface.1'`;
  - trailing `icons` with the `filter` glyph (`Glyph.tsx:108, 585`);
  - title `layout: 'inline'` with `ja`.
- `Swatch anchor={{ ring, gap }}` (`Swatch.tsx:142–143, 386–401`), its ring in `foreground.2`.
- `Button variant="tonal" level` and `ActionBar` (`rule`, `padding`, `note`).
- `Sheet`, `ChoiceGroup` pills with a leading dot (ADR-0141), `EmptyState` (`resolvedHere`), `Arrival`/`Appear`, `figures.tsx` (`MeasureFigure`, `figureName`).

**No other ui change is foreseen.**

### 6. `19.json` carries F-220's readings, and several are guesses (read; to correct in increment 1)

| element | issue |
|---|---|
| `19.anchor.heading`, `19.rows.heading`, `19.rows.row-N.wear` | bind `oq:OQ-26` (ADR-0167 rebinds them) |
| `19.back` | binds `static:with.back`; F-246 and F-250 rebound back words to `tab.atlas` |
| `19.anchor.garment` | binds `store:anchor.garment`. Nothing is read from the store: the line states the slot 07 places the anchor in (`wear.ts#DEFAULT_SLOT`) |
| `19.rows.row-N.swatch` | binds `engine:with.N.hex`. The hex is the corpus record's |
| `19.bar.build` | acts `navigate:/wardrobe/outfit` (ADR-0171 D3 corrects it) |
| `19.header` | box is *derived* ("the frame's corner curve cuts the blob"); fill `#1C1F26` lies between ground and level 1 |
| type | `19.anchor.heading` em 18.4 and `19.rows.row-2.name` em 19.7 are the only ems read. **19.7 is nearer `title` (22) than `body` (16).** The siblings rule needs all five names read |
| corners | cards, rows and Build recorded `md`; 09's and 10's turned out `sm` on re-measure. The drawn sample corner is 11.5 dp (R9 §5), above `md` 10 |
| missing | the five `Action:` prefixes, the `Hero Card` and `Rows` nouns, and 19's two qualifiers (*Cool*, *Soft*) are not recorded as `notDesign` or departures |
| `19.screen` box | the frame's inner screen is x 70–697 (627 px); the header box starts y 62, the screen y 61 |

### 7. Old tests and records that assert the old 19 (read)

**Must change:**

- `screens.test.tsx` `LIST_SURFACES`: `{ subject: 'screens/Combinations', mockup: '19', … }` (line 7260) moves to the new subject. The 24 record (7262) stays.
- `chrome.test.ts`: `PLATFORM_HEADER['atlas/with/[slug]']` (line 119) is deleted in the same change.
- `e2e/capture/routes.json:211–219`: the anchor `combos.title` and the param `aki-batake`.
- `i18n.test.ts:414–440`: *"the two combination-shaped answers are distinguishable"* must also hold `with.title` against `contemporary.title`.
- `screen-insets.json`: the new subjects only.

**Stay green, unchanged:**

- `screens.test.tsx`'s Combinations subjects (lines 1844–1923) still render the component for 24.
- `combinations.test.ts`, `curated-combinations.test.ts`, `combination-subject.test.ts`.
- `lens-exits.test.ts`, `home-states.test.tsx` (the route path does not move).

### 8. Japanese (read and inferred)

- ja `combos.title` is この色に合う色; 19's run is **調和色**. A new key `with.title` (ja 調和色) leaves 24's title alone.
- ja `wear.open` 合わせて着る fits 19's *Wear* (wear it *with* the anchor).
- `outfit.top` is トップス; `combos.curated` is 選定; `combos.intent.*` are 対比 / 調和 / 差し色 / 濃淡.
- Relationship terms in common Japanese design usage: 補色 · 類似色 · 分割補色 (スプリット・コンプリメンタリー) · トライアド · テトラード. Sources are design sites, not a colour-theory text; F-265 carries them.
- **Inferred:** 補, 類, 似 and 割 may not be in the Noto Sans JP subset. `verify-font-coverage` decides.

### 9. Effects already reaching this route (read)

- **E-100** (color-harmony → `combinations.ts`, `Combinations.tsx`, the catalogues);
- **E-103** (`Combinations.tsx` → lens exits, the wardrobe route);
- **E-104** (`combinations.ts`'s separation);
- **E-106** (target → `Combinations.tsx`);
- **E-157** (`HARMONY_ROW`, `APP_BAR_*`, `ACTION_BAR_*`, the card and sample censuses, all read from `19.json`);
- **E-164** (chrome), **E-191** (states), **E-199** (Arrival), **E-203** / **E-211** (sweep);
- **E-221** (07's route), **E-219** (the Lab hand-off; not used by 19 after ADR-0171).

The next free id is **E-239**.

### 10. The route's reach (read)

- Home (`app/(tabs)/index.tsx:62`) and the Lens's `LENS_EXITS.combinations` (`lens/exits.ts:71`) push `/atlas/with/${slug}`.
- 06 no longer links here (ADR-0147, *"F-194's link from this page"* superseded).
- `verify-route-targets` resolves both. Neither changes.

---

## Decisions

All six rest on R9 §11's delegation of 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–14 are not reopened. No gate threshold or golden value moves. Full drafts are in Appendices A–F.

### D-1 (ADR-0167): OQ-26 — the heading slots are design; component nouns and *Action:* are notation

**The rule.** A section heading drawn at a section's head in the screen's heading style is design. Inside it, the words that name a **UI component** (*Hero Card*, *Rows*, *List*) are leaked notation, as R9 §2 already reads *Card* at the end of 07's and 08's card titles. The rest of the words ship, in en-GB.

**What ships:**

- **19's headings:**
  - *Anchor Color Hero Card* → **Anchor Colour** (基準色);
  - *Ranked Harmonic Relationship Rows* → **Ranked Harmonic Relationships** (調和の関係・順位順; unreviewed, F-265).
- **The parenthetical** *(HeroUI Card level="2")* and *100px* stay `notDesign`, as recorded.
- ***Action: Wear*** → **Wear**. *Action:* labels the control's type, which the outline already says. It is the same notation ADR-0163 D1 reads in brackets around a button's words.
- **21**: *Ranked Nearest Corpus Results List* → *Ranked Nearest Corpus Results*. F-254 applies the rule (a note on F-254).

**Why this, and not the alternatives:**

- 09's *Perceptual Dimension Slider Matrix* and 16's *Live Scientific Harmony & Contrast Engine Matrix* were kept as headings (F-250, F-251), and R9 §2 drops only the component noun in 07 and 08.
- The headings give a screen-reader user the page's two sections (A11's heading checks; WCAG 2.4.6 asks headings to describe topic or purpose, which a component name does not). This is supporting, not forcing.
- F-252's own note (written before the delegation) read both headings as not design. Under that reading the drawn space stays and is blank, and the A11 heading structure is lost.
- **⇄ the person can flip it to "not design, space kept".**

### D-2 (ADR-0168): what a row is — corpus colours that stand in a hue relationship to the anchor, to a stated tolerance

**The anchor** is the corpus entry for the slug.

**The rows, in this order:**

1. **Curated.** For each curated combination holding the anchor (`combinationsContaining`), by combination slug, each other member by its rank. FR-73's curated sets, first, as F-196 placed them.
2. **Geometric.** For the five relationships whose definition is a hue angle from the anchor (`VARIES[k]` is exactly `['h']`, excluding `warm-cool`), taken in this order:
   - **complementary** (180°);
   - **analogous** (−30°, then +30°);
   - **split** (150°, then 210°);
   - **triadic** (120°, then 240°);
   - **tetradic** (90°, then 270°; its 180° is complementary's and is realised once).

   This is 19's drawn order for the first three and the README's list (*"Complementary, Analogous, Split-Complementary, Triadic"*) for the fourth; tetradic is the one the README omits, so it comes last.

**How each companion becomes a row:**

- The companions are `generateHarmony(anchor.derived.oklch, kind)`'s colours, the source dropped by value (`combinations.ts`'s rule, extracted as `companionsOf`).
- Each companion yields **at most one row**: the first entry in `nearestByOklch(companion.oklch, CORPUS_ENTRY_COUNT)` that meets all of:
  - it is not the anchor;
  - it is not already a row;
  - its chroma is at or above the **hue floor**;
  - its hue lies within **±9°** of the companion's requested hue (`hueDistance`).
- In words: the corpus colour nearest the engine's companion inside the relationship's hue window. Because the generator holds the anchor's L and C, that is the in-window colour nearest the anchor's own lightness and chroma.

**The tolerance:**

- **±9°** of OKLCh hue is half the 18° single-hue sector of Matsuda's templates, as Cohen-Or et al. reproduce them. The five windows are disjoint, so no corpus colour can be two relationships at once.
- **⇄ the person can flip it to ±15°** (half the generator's own 30° spread). The census in increment 1 reports the row counts under both.

**The floor:**

- The **hue floor** is the published lexicon's hue-term chroma floor, read from `lexicon()`, not retyped (0.039 for 2026.08.1).
- Below it the product's own words call a colour *grey* or *neutral* and name no hue. So an anchor below the floor has **no geometric rows**: it states that in 00's caption (ADR-0171 D5), and its curated rows still show.

**What the relationship word claims:** the two colours' hue angle lies within ±9° of the relationship's angle. Nothing about lightness or chroma.

**No re-implementation:** the angles come from the generator, the measure from `hueDistance`, the ranking from the one route, and every record value from the bundle.

**Not offered on this route** (F-194 c1 superseded in part, here only):

- **The six lightness or chroma kinds.** They hold the hue and vary L or C by amounts the generator chooses, so a corpus colour realises them in two dimensions at once and no single stated tolerance exists. The old screen called them *"variations on the colour rather than companions to it"*.
- **`warm-cool`.** Its targets are absolute hues (55°, 245°), not angles from the anchor. 07 prints the warm–cool relation once a row is worn.

All seven stay reachable on 24's routes until F-259.

**No personal weighting** (F-198 c2 superseded in part, here). 19 draws no element that could say whether an order was weighted, and an order that changed silently with a profile would be an unexplained claim. The personal-fit figure is 07's, one tap away, naming whose profile (ADR-0150).

### D-3 (ADR-0169): OQ-27 — where FR-73's relationship, family, generated-or-curated mark and gamut cost appear on 19

- **Relationship:** each row's detail line, as drawn.
- **Family and generated-or-curated.** These are one axis in this product: `HarmonyFamily` is `geometric` (generated) or `editorial` (curated) (`kinds.ts`). FR-73's two words name it twice. Each row states it in its relationship words:
  - a geometric row names an FR-6 relationship, which this product only ever generates;
  - a curated row reads ***Curated ‹intent›*** (*Curated Accent* / 選定・差し色), from the existing `combos.curated` and `combos.intent.*`.

  F-194 c3's *Generated* label is superseded in part here: the relationship's name states it. **⇄** The alternative is *Generated Complementary* on every geometric line, lengthening each line 19 draws.
- **Gamut cost.** Every proposed colour is a corpus record shown at its own sRGB hex, so its cost is the record's own `renderDeltaE00`: 0 for every record in sRGB. The one record outside sRGB carries 06's note (*nearest sRGB rendering, ΔE00 x.xx*) wherever 19 draws its sample: after the anchor's OKLCh line, or after a row's ΔE00. The same helper serves 06 (extracted from `detail.ts`), and the note is forced by rule 11.

  A zero cost is not printed, because 19 draws no slot for it. F-194 c2 is superseded in part; the old *"Every colour here is one this screen can show exactly"* line was a card element 19 does not draw.

### D-4 (ADR-0170): 19's figures and words say what the corpus and the engine hold

| element | binds to |
|---|---|
| title | en `with.title` *What Goes With This* plus `japaneseRun('with.title')` → *What Goes With This • 調和色*. ja: 調和色 alone (ADR-0142 D5's OQ-48 interim, applied, not decided). `combos.title` is untouched (24) |
| back | `tab.atlas`, named `detail.backToAtlas` |
| filter | the glyph, named `with.filter` (*Filter relationships* / 関係で絞り込む) |
| anchor heading · rows heading | `with.anchorHeading` · `with.rowsHeading` (D-1) |
| anchor sample | the record (`colorFor`), its swatch named by `swatchAccessibleName` |
| anchor name | `${nameLine(entry)} (${name.en})`: kanji, capitalised romaji, English in parentheses, as 09's English line. Corpus content in both locales |
| anchor OKLCh | `oklchLine(derived.oklch, t('coord.oklch'), ': ')` at 3, 3, 1 (E1: 19's *0.490 • 0.035 • 240.2°* is sample content and does not survive checking, §4 E1). Plus D-3's note for the one out-of-sRGB record |
| anchor slot | `labelled(t('with.anchorSlot'), t('outfit.top'), script)` → *Anchor Garment: Top* / 基準の衣服：トップス. The slot is `wear.ts#DEFAULT_SLOT`, which Wear and Build place the anchor in. The colon is script-aware (`detail.ts#labelled`) |
| row name | `Bilingual text={name.en} ja={name.kanji}`, as drawn, in both locales |
| row relationship | `RELATIONSHIP_KEYS[kind]`: *Complementary · Analogous · Split-Complementary · Triadic · Tetradic* (補色 · 類似色 · 分割補色 · トライアド · テトラード), or *Curated ‹intent›* |
| row distance | `ΔE00: d`, where d = `compare(anchor, row).deltaE00` **floored to one place**, as 19 draws (*48.2*). Spoken *ΔE00 48.2, CIEDE2000* (`figureName`) |
| Wear · Build | `with.wear` *Wear* (合わせて着る), named `with.wearName` *Wear ‹row› with ‹anchor›*; `with.build` *Build Complete 4-Piece Outfit* (4点のコーディネートを組む) |

- **The precision departs from the product's usual two places.** ADR-0125 D4 says ΔE00 is printed at two decimals "every screen". 19 prints one, five times. 19 prints no band, so nothing reads its printed value; F-251 printed 10's ratio at its drawn one place. Floored, so a printed distance never exceeds the computed one.
- **⇄** The alternative is `printedDeltaE00`'s two places, as 08, 09, 21 and 24 print.
- **E2 rows:** *Analogous Cool*, *Analogous Soft* → *Analogous*. No computation produces a qualifier (ADR-0151 D4's precedent for *Analogous Tonal Kasane*). Two analogous rows are told apart by their names and samples.
- **The joiners.** ` • ` between the relationship and the figure is `BILINGUAL_SEPARATOR`, used in both scripts. `ΔE00: ` is the Latin notation run (FR-61) and keeps its Latin colon in both locales. *Curated ‹intent›* joins with a space in Latin and ・ in Japanese.

### D-5 (ADR-0171): what 19's controls do, the states, and what leaves this route

**Route.** `/atlas/with/[slug]` renders the new `GoesWith` screen with `headerShown: false`. `PLATFORM_HEADER['atlas/with/[slug]']` is deleted in the same commit. The route reads no profile and no store: 19 lists nothing a person writes, so there is nothing to re-read on focus.

**Controls:**

- **D1. Back** → `router.navigate('/atlas')`, as 06 and 09 do (ADR-0147 amendment): it returns where the Atlas is in the stack and opens it where it is not.
- **D2. A row's *Wear*** → `router.push('/atlas/wear/${anchor}?with=${row}')`.
  - 07 opens with the anchor as the top (*Anchor Garment: Top*) and the row's colour in slot 2 (the trousers, 07's slot in hand at rest), **locked**, so an occasion change cannot move it.
  - This is the founding question the old screen quotes (*"if shirt is a color, then what color could pants should be"*).
  - 07's route gains an optional `with` parameter, read by a pure `wear.ts#startWith(withSlug, anchorSlug)` into `Wear`'s existing `initial` prop. An unknown slug, or the anchor's own, is ignored and 07 opens as drawn.
  - `placeSlots` already holds a slot colour the ranking does not (rank `null`).
  - F-248's note *"19's Wear opens the rebuilt 07 at /atlas/wear/[slug]"* is kept.
- **D3. *Build Complete 4-Piece Outfit →*** → `router.push('/atlas/wear/${anchor}')`.
  - 07 is the surface that builds a complete four-piece outfit around a colour today: the colour as the top, the engine filling trousers, shoes and the outer layer. 06's *Wear It (Build Outfit)* goes there too (ADR-0147 D3).
  - The Lab (13) builds from owned garments in three slots until F-257, and draws nothing without a profile, so *Complete 4-Piece* would not be true there today.
  - `19.json`'s `navigate:/wardrobe/outfit` is corrected.
  - **⇄** The alternative is the Lab, with `offerCombination({ top: anchor })`, disabled with its reason without a profile.
- **D4. The filter (E4: 19 draws the glyph and nothing behind it).**
  - It opens 03's floating sheet holding one single choice in 05's pill form (ADR-0143's *More filters* form): *All*, then each relationship the list holds, in the list's order. *Curated* is offered where curated rows exist. No choice that would empty the list is offered.
  - The chosen pill carries its leading dot (ADR-0141).
  - While a relationship is chosen, *Showing n / N* and *Clear* sit at the trailing end of the rows heading row (05's line, ADR-0143). The state is said in words, never only by colour (rule 13).
  - The screen opens in the drawn state: all rows, no filter, nothing extra.

**States:**

- **D5. `STATES = { absent: 'empty' }`**, with two witnesses:
  - **Not in this corpus.** The app bar's back above 00's caption (ADR-0128 §6, `detail.notFound`).
  - **No geometric rows** (an anchor below the hue floor, or a chromatic anchor whose windows hold no corpus colour). The anchor card stands; in the rows' place, 00's caption, `resolvedHere`, because *Build* on the same screen still answers.
    - Below the floor: *"This colour is close to grey, so no hue stands in a relationship with it."*
    - Otherwise: *"No colour in this corpus lies in these hue relationships to it."*
    - Hint, both cases: *"Build Complete 4-Piece Outfit ranks what goes with it."*
  - A filter can never empty the list (D4).

**What leaves `/atlas/with/[slug]`** (each capability stays on 24's routes through `Combinations.tsx` until F-259; R9 §10):

| leaves | its home now |
|---|---|
| the twelve relationship cards and their generated companions (F-194 c1) | 19's rows realise the five hue relationships in corpus colours (ADR-0168); all twelve stay on 24's routes |
| *Generated* per card (F-194 c3) | the relationship's name (ADR-0169) |
| the gamut-cost line per card (F-194 c2) | each record's own cost; the one non-zero shown (ADR-0169) |
| the CVD separation per card (F-198 c1) | 07 prints the worn set's separation with its model, one tap away |
| the profile weighting and `combos.personalNone` (F-198 c2) | 07's fit figure (ADR-0150) |
| arming a generated companion as the target (F-200's path here) | 19 shows no generated colour. Corpus colours arm from 06's *Hold* (F-200 c1 still holds) |
| curated cards (F-196's form) | curated members as rows, first (ADR-0168) |
| *Wear it* (F-195) | each row's *Wear* and *Build* |
| `combos.what` | nothing on 19 states advice: no *should*, and the claims lint holds both catalogues (FR-73, NFR-21) |
| the platform header | 19's own bar |

### D-6 (ADR-0172): 19's composition

- **Intervals:** the table below, snapped by §2, at 0.6124 dp/px.
- **Insets:**
  - **page inset `sm`** (cards drawn 11.6 and 11.0 dp);
  - **headings `md`** from the screen edge (19.6 / 20.2);
  - the anchor's ring `md` inside its card.
- **The anchor card:**
  - the ring with the anchor's measured `ring` and `gap`;
  - the sample at `ANCHOR_SAMPLE` (87.5 × 81 until re-measured), no keyline (OQ-46's interim guarantee applies);
  - the words vertically centred on the ring;
  - name → OKLCh and OKLCh → slot are named intervals (`xs`).
- **The rows:** `RankedRow form="harmony"` at F-235's `HARMONY_ROW`; row gap `sm`; one `Arrival` over curated then geometric rows, each `Appear` indexed in reading order (E-199).
- **The bar:** `AppBar fill="surface.1"` (if increment 1 reads level 1), the divider at its drawn height, no rule, the title inline.
- **The action bar:** its rule; padding top `md`, side `sm`, foot `sm`; one action, `tonal` level 3, `BUILD` tall, glyph `arrow-right`.
- **No art.** 19's leaves lie outside the device frame (`notDesign`).
- **01's tab bar** under the action bar (E4 FR-71: 19 joins 16, 22 and 24 in that bullet).

---

## Implementing session's decisions on this design

**2026-11-04, increment 1 (measurement and census).**

- **The header is 78 px = 47.8 dp, filled level 1 (#1E2128)**, read at its half-height crossings, not derived. The action bar is filled level 1 too (#1D2027), so `ActionBar` takes a level-1 fill.
- **Type moved:** both headings, the OKLCh and slot lines, the details and *Wear* are `label`; the names, title, back and Build stay `body`. Row 2's 19.7 was a kanji's height; all five names read 15.9–17.6 dp — `body`, so **`RankedRow` needs no `nameSize`**. *Wear* is `label`, so the harmony row's button takes step `label` (increment 2).
- **Corners moved:** Build, *Wear*, the row samples (median 6.4 dp; R9 §5's 11.5 was unscaled px) and the anchor's sample (about 4 px) are `sm`; the cards, rows and ring stay `md`. `HARMONY_ROW`'s sample corner becomes `sm` (increment 2); `sample-family.test`'s census moves 51 → 57.
- **Glyph inks:** back 27 × 24, filter 33 × 28, Build's arrow 20 × 19.
- **The divider** inks brighter than `border.subtle` (peak #585A65). Recorded only: it is the shared `AppBar` divider, read the same on 07.
- **Row boxes are kept** as F-235 read them (`HARMONY_ROW`'s medians do not move).
- **The census** is in ADR-0168 to ADR-0170. The fixture and the capture param are both **aki-batake** (seven geometric rows, opening complementary, analogous, analogous, split, split). 45 of 120 anchors are under the floor — **F-359 filed**. Ties at the pick are not counted here: `goes-with.test` holds that none occurs (increment 3).
- **No E3 departure is recorded in `19.mjs`.** A wrap and a hit area change nothing the drawn state draws.

**2026-11-04, increments 2–5.**

- **The companion is ranked from its REQUESTED colour**, not the gamut-mapped one: D2's rationale (*the in-window colour nearest the anchor's own lightness and chroma*) holds only for the requested colour, which keeps the anchor's L and C. The census at ±9° and ±15° is unchanged by it (`goes-with.test`).
- **The figure is floored as `compare-readout.ts` floors APCA**: `Math.floor(x × 10) / 10`, the printed value never above the computed one beyond a double's last place.
- **`Button` gains `numeric`** (`@irodora/ui`, additive): *Build Complete 4-Piece Outfit* carries a figure, and the sweep refuses one in proportional digits.
- **The gamut note on the anchor's OKLCh line is set in the locale's face**: in Japanese it is Japanese words, which the platform font would draw (the sweep's F-152 check found it).
- **The card → rows heading interval is `lg`**, not the plan table's `md`: the heading is `label` now (increment 1), so its line inset is 3.85, and 24.5 − 3.85 = 20.65 dp lies nearer `lg`.
- **The ring's corner is concentric with the sample's**: Swatch draws it at the sample's corner plus the gap and the ring, 6 + 3.8 + 2.3 = 12.1 dp, where 19 draws about 9.8 dp, because the sample's own drawn 2.4 dp is under `sm`, the smallest step. An expected difference at the capture.
- **The ring's 3.8 dp gap is declared off the spacing scale** (`off-scale-spacing.json`): a drawn figure of the anchor form, as `SwatchAnchor` documents, not spacing.
- **19's `Wear` is a required handler**: a row without one would draw an action that does nothing, and the route always wires it.
- **The ring is found by a wrapper's id** (`with.anchor.ring`): its box is the swatch's outermost.

---

## Approach

### Reused (paths)

**`@irodora/ui`:**

- `Screen` (`appBar`, `actionBar`, `script`).
- `AppBar`:
  - `back` (`glyph 'back'`, `label`, `name`, `size`);
  - `divider`, `fill 'surface.1'`, `height`, `inset`, `rule={false}`;
  - `title` (`layout 'inline'`, `ja`, `size 'body'`, `weight 600`);
  - `trailing.icons` (`filter`, `targetRoom`).
- `ActionBar` (`rule`, `padding`), `Button` (`tonal`, `level`, `glyph 'arrow-right'`, `height`, `radius`).
- `Card`, `Swatch` (`anchor`, `width`, `height`, `corner`, `keyline={false}`), `swatchAccessibleName`.
- `RankedRow` (`form="harmony"`, `HARMONY_ROW`), `Bilingual`, `Text`, `figures` (`MeasureFigure`, `figureName`).
- `Sheet`, `ChoiceGroup` pills (`mark: 'dot'`), `EmptyState` (`resolvedHere`), `Arrival`/`Appear`, `Row`/`Stack`, `BILINGUAL_SEPARATOR`.

**`apps/mobile/src`:**

- `corpus/index.ts`: `entryBySlug`, `allEntries`, `colorFor`, `combinationsContaining`, `CORPUS_ENTRY_COUNT`.
- `finder.ts`: `nearestByOklch`, `nearestByLab`, `lexicon`.
- `compare.ts#compare`.
- `notation.ts`: `nameLine`, `oklchLine`, `capitalised`.
- `detail.ts`: `labelled`, and the gamut note, extracted (below).
- `wear.ts`: `DEFAULT_SLOT`, `RANKED_SLOTS`, `WearState`, `RESTING_WEAR`.
- `combinations.ts` (the drop-the-source-by-value rule, extracted).
- `i18n`: `useMessages`, `japaneseRun`, `isMessageKey`.
- `states.ts`.
- `Atlas.tsx`'s *More filters* sheet form and its `atlas.showing` / `atlas.clear` words, if they read right here (increment 3 checks).

**Packages:**

- `@irodora/color-harmony`: `generateHarmony`, `hueDistance`, `VARIES`, `HARMONY_KINDS`.
- `@irodora/color-difference`: `deltaE00`, for the tests' oracle only.

**Tests and tools:**

- `test/inventory.ts`; `screens.test.tsx` (`draw`, `ENROLLED`, `AppTabBar` wrapper, `LIST_SURFACES`).
- The F-248–F-251 fidelity helpers (`el()` from the pixels, `snap`, `belowTheScale`, `inOrder`).
- The route-source readers of `wear-states` and `compare-states`.
- `mockups/tools/*.ps1` methods (re-implemented in a scratch Node reader, as before) and `generate-inventory.mjs`.
- `generate-e2e-flows.mjs`, `verify-font-coverage.mjs`, `generate-font-subset.mjs`, `pnpm fidelity:capture`.

### New

**`apps/mobile/src/goes-with.ts`** (pure; `compare-readout.ts`'s counterpart):

- `HUE_RELATIONSHIPS`: the five kinds in ADR-0168's order, derived from `VARIES` (exactly `['h']`, less `warm-cool`) and ordered by a literal list. A test holds the list a permutation of the derived set.
- `HUE_TOLERANCE = 9` and `hueFloor()` (read from `lexicon()`).
- `goesWith(anchor)` → `{ rows: Row[], chromatic: boolean }`, where `Row = { entry, source: 'curated' | 'geometric', kind | intent, angle?, deltaE00, gamutNote? }`. Memoised by slug.
- The row's words: `relationshipWords(row, t, script)`, `distanceFigure(row)` (floored to one place), `anchorName(entry)`, `anchorSlotLine(t, script)`.
- The filter: `filterOptions(rows)`, `filterRows(rows, choice)`, `showingLine(n, N, t)`.
- `wearHref(anchor, row)`, `buildHref(anchor)`.
- Literal key maps, so the unused-key scan sees each reader: `RELATIONSHIP_KEYS`, `INTENT_KEYS` (reusing `combos.intent.*`), `EMPTY_KEYS`.
- The drawn constants, each recomputed from `19.json` by the fidelity test: `WITH_APP_BAR`, `BACK_GLYPH`, `FILTER_GLYPH`, `DIVIDER`, `ANCHOR_RING`, `ANCHOR_SAMPLE`, `BUILD`, `ARROW_GLYPH`.

**Extractions, with no behaviour change:**

- `combinations.ts#companionsOf(harmony, source)`, which `combinationsFor` calls;
- `detail.ts#renderNote(entry, t)`, which `readoutRows` calls.

**`apps/mobile/src/wear.ts#startWith(withSlug, anchorSlug)`** → `Partial<WearState> | undefined`.

**`apps/mobile/src/screens/GoesWith.tsx`** (19). It exports `STATES`. `AnchorCard`, `GoesWithRow` and `FilterSheet` are at module scope and memoised; handlers are stable (`useCallback`); a row's handlers close over its slug through the memoised row.

**`@irodora/ui`** (additive; without the new prop the old tree renders, and a decoy proves it):

| component | change | forced by |
|---|---|---|
| `RankedRow` `harmony` | the name wraps (no `numberOfLines`) | E3 (*"never clipped"*) |
| `RankedRow` `harmony` | optional `note?: string` after the figure, in the line, spoken after the figure's name | rule 11, FR-73 (ADR-0169) |
| `RankedRow` `harmony` | part testIDs (`.swatch`, `.name`, `.detail`, `.action`) if the sweep cannot locate the parts by component | enrolment |
| `RankedRow` `harmony` | `nameSize` | **only if** increment 1 finds the five names snap to `title` |

### The composition, as a sketch

```tsx
// 19 — GoesWith (route: atlas/with/[slug].tsx, headerShown: false)
<Screen scroll script={script}
  appBar={{ height: WITH_APP_BAR, fill: 'surface.1' /* Inc 1 */, rule: false, divider: DIVIDER, script,
    back: { glyph: 'back', label: t('tab.atlas'), name: t('detail.backToAtlas'), size: BACK_GLYPH, onPress: onBack },
    title: { text: t('with.title'), ...(script === 'japanese' ? {} : { ja: japaneseRun('with.title') }),
             align: 'leading', placement: 'bar', layout: 'inline', size: 'body', weight: 600 },
    trailing: { icons: [{ glyph: 'filter', label: t('with.filter'), size: FILTER_GLYPH, onPress: openFilter,
                          testID: 'with.filter' }], targetRoom: true } }}
  actionBar={{ rule: true, padding: { top: md, side: sm, bottom: sm },
    actions: [{ variant: 'tonal', level: '3', label: t('with.build'), glyph: 'arrow-right', height: BUILD,
                radius: /* Inc 1 */ 'md', onPress: onBuild, testID: 'with.build' }] }}>
  <Text testID="with.anchor.heading" size="body" weight={500} color="foreground.2" heading>{t('with.anchorHeading')}</Text>
  <AnchorCard entry={anchor} />            {/* Card level 1, edge; Row[Swatch anchor={ANCHOR_RING} width/height=ANCHOR_SAMPLE
                                              corner keyline={false}, Stack(centred)[name, oklch(+note), slot]] */}
  <Row testID="with.rows.heading.row">
    <Text heading …>{t('with.rowsHeading')}</Text>
    {choice === 'all' ? null : <ShowingAndClear n={shown.length} of={rows.length} onClear={clear} />}
  </Row>
  {rows.length === 0
    ? <EmptyState message={t(EMPTY_KEYS[chromatic ? 'none' : 'nearGrey'])} hint={t('with.emptyHint')} resolvedHere />
    : <Arrival>{shown.map((r, i) => <Appear key={r.entry.entry.slug} index={i}>
        <GoesWithRow row={r} anchor={anchor} onWear={onWear} testID={`with.row.${i}`} /></Appear>)}</Arrival>}
  <FilterSheet open={filterOpen} options={filterOptions(rows)} value={choice} onChange={setChoice} onClose={closeFilter} />
</Screen>
```

### Drawn intervals, from `19.json`, at 0.6124 dp/px (framed, §2), insets subtracted

Line insets (latin / ja), as F-249 tabulated them: title 2.2 · body 5.2 / 6.8 · label 3.85 / 5.165 · caption 2.575 / 3.51. Snap steps: xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48. A tie takes the smaller.

**Increment 1 re-reads every box to its edge, not its shadow. The fidelity test recomputes every row from the pixels, so any row may move.**

| interval | px | dp | less | built | snap |
|---|---|---|---|---|---|
| bar height (header box; **derived**, not read) | 77 | 47.2 | — | | `WITH_APP_BAR` (Inc 1; see Risk 3 on the 48 dp target) |
| back, from the screen's left edge | 27 | 16.5 | — | | `APP_BAR_INSET`, kept as F-220 read it (ADR-0161 D8, F-282) |
| back → divider · divider → title | 17 · 15 | 10.4 · 9.2 | — | | `sm` · `sm` |
| divider height | 35 | 21.4 | — | | `DIVIDER` (07's form) |
| filter → screen's right edge | 24 | 14.7 | — | | `md` |
| bar foot → anchor heading | 23 | 14.1 | 5.2 | 8.9 | `sm` |
| anchor heading → card | 12 | 7.3 | 5.2 | 2.1 | `xs`. **Within a pixel of the half-step: if Inc 1 reads under 2.0 it is named** |
| page inset (cards, left · right) | 19 · 18 | 11.6 · 11.0 | — | | `sm` (ADR-0139's rule, this screen's own) |
| heading inset (screen → words) | 32 · 33 | 19.6 · 20.2 | — | | `md` |
| card → ring: left · top · bottom | 29 · 20 · 21 | 17.8 · 12.2 · 12.9 | — | | `md` · `md` · `md` |
| ring · gap | 3.75 · 6.2 | 2.3 · 3.8 | — | | `ANCHOR_RING` (a figure's own, unsnapped; F-233) |
| anchor sample | 143 × 132 | 87.5 × 81 | — | | `ANCHOR_SAMPLE` |
| ring → words | 20 | 12.2 | — | | `md` (the JSON's rounded 12 would tie → `sm`; Inc 1 reads the ring's outer edge) |
| words against the ring | centred (words 244–339, ring 216–364) | — | | | centred |
| **name → OKLCh** | 10 | 6.1 | 10.4 | **−4.3** | **named `xs`, +8.3 dp over the drawing** |
| **OKLCh → slot line** | 13 | 8.0 | 10.4 | **−2.4** | **named `xs`, +6.4 dp** |
| card → rows heading | 40 | 24.5 | 5.2 | 19.3 | `md` |
| rows heading → row 1 | 13 | 8.0 | 5.2 | 2.8 | `xs` |
| row → row | 15 · 15 · 15 · 14 | 9.2 · 9.2 · 9.2 · 8.6 | — | | `sm` (siblings) |
| row height | 140 · 138 · 137 · 137 (row 5 cut) | 85.7 · 84.5 · 83.9 · 83.9 | — | | `HARMONY_ROW.height` 84 (rows.test) |
| row: card → sample · sample · sample → name | 29 · 99–101 · 18–20 | 17.8 · 60.6–61.9 · 11.0–12.2 | — | | `HARMONY_ROW` 18 · 62 · 11.5 (F-235's medians, a component's own) |
| **name → detail** | 13 | 8.0 | 9.05 | **−1.05** | **named `xs`, +5.05 dp per row** |
| Wear: height · → card's right edge | 42–43 · 17 | 25.7–26.3 · 10.4 | — | | `HARMONY_ROW.action` 26.5 · 10.5 |
| action bar rule → button | 22 | 13.5 | — | | `md` |
| button height · → bar foot · sides | 67 · 15 · 16 | 41.0 · 9.2 · 9.8 | — | | `BUILD` · `sm` · `sm` |

**Heights the scale makes taller than drawn.** These are estimates: a test tree has no layout. ADR-0172 states them and the capture shows them.

| region | drawn | built (estimate) | why |
|---|---|---|---|
| anchor card | 115.5 | ≈ 122.5 (ring 90.5 + 2 × `md`); more where the name wraps (Japanese, 320 dp) | the ring's insets snap up to `md` |
| a row | 84 | ≥ 84; +1 line where the name or the relationship line wraps (*Split-Complementary • ΔE00: 44.6* plus D-3's note) | E3: wrap, never clip |
| the list | 5 rows to the bar | 1–12 rows (census) | the page scrolls (§2: a render is one scroll position) |

---

## Increments

Every commit passes **Tier 1** (ADR-0132):

`pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'`

`pnpm lint` is the root lint. It includes `verify:claims`, `verify-mockups`, `mockup-inventory --check`, `verify-app-glyphs` and `verify-route-targets`. Domain gates are named under each step.

### 0. Claim and plan

- This file goes to `.harness/plans/F-252-what-goes-with-this-is-mockup-19.md`.
- F-252 is already `in_progress` with `plan` set; confirm both.
- Add `attested` (Appendix G) and `openQuestions: ["OQ-26", "OQ-27"]`. They clear when ADR-0167 and ADR-0169 land in increment 1.
- **Gates:** `node scripts/verify-state.mjs`, `pnpm format:check`.

### 1. Measure, decide, specify (no source)

**How to read the image.** As in F-248 to F-251:

- Use a scratch Node reader in the session's scratchpad. It decodes `mockups/19_what_goes_with_this.jpg` with `jpeg-js` through `createRequire(apps/mobile/package.json)`.
- It re-implements only what `measure.ps1`, `corner.ps1`, `tint.ps1` and `stem.ps1` document.
- **Every reading is converted at 0.6124 dp/px** and goes into `19.mjs`'s header with its box, background, threshold and method.
- The reader is not committed.

**Re-read every box, type, corner, fill and ink — to the edge, not the shadow:**

| region | read | lands in |
|---|---|---|
| frame | the inner screen's true extent (x 70–697?, y 61–1313?); that the ground inside is `#15171B` ± noise; **that no art lies inside the frame** | `19.screen` box; `dpPerPx` (moves only if the inner width is not 627) |
| header | its extent to the rule-less foot; its fill (`#1C1F26`: level 1 or ground?); back's arrow ink and word em; the divider's x, height and ink; the title's cap height (body 600 expected) and kanji ink; the filter glyph's ink extent | `19.header` (box from a reading, no longer derived), `19.back` (rebind `tab.atlas`), `19.title`; `WITH_APP_BAR`, `BACK_GLYPH`, `FILTER_GLYPH` (size = (ink − `size.iconStroke`) × 24 ÷ the path's extent, 06's rule), `DIVIDER` |
| headings | each one's cap height; weight 500 vs 400; ink (`text.secondary`); **crops of *Hero Card*, the parenthetical, *Rows*** | type; `notDesign` gains the component nouns |
| anchor card | corner (`md` or `sm`), edge, fill; ring width, gap, ink and outer edge; the sample's extent and corner; the three lines' ems, weights and inks | `19.anchor*`; `ANCHOR_RING`, `ANCHOR_SAMPLE`; `19.anchor.garment` rebinds to `engine:anchor.slot` |
| rows (×5) | corner, edge, fill; the sample's corner (R9 §5 read 11.5 dp); **each name's em (all five; row 2's 19.7 is nearer `title`)**; the detail's em and ink; Wear's height, corner, edge and word em; **crops of *Action:*** | `HARMONY_ROW` via `rows.test`; the names' step (siblings rule); swatches rebind `corpus:with.N.hex`; Wear rebinds `static:with.wear`, action `navigate:/atlas/wear/[slug]?with=` |
| action bar | the rule's ink and y; the button's corner, fill (`#3A414C` vs level 3 `#323742`), height, word em and the arrow's ink | `BUILD`, `ARROW_GLYPH`; action `navigate:/atlas/wear/[slug]` |

**The census.** A scratch script over the bundle, the combinations and the lexicon. Its numbers go into ADR-0168 to ADR-0170.

- **For all 120 anchors:**
  - chroma against the floor;
  - geometric rows under ±9° and under ±15°;
  - the distribution (how many anchors have 0, 1–4, 5–9 rows);
  - each companion's in-window candidate count;
  - curated rows;
  - the row count with both kinds of row.
- **The floor**, read from `lexicon()` (expected 0.039), and the count of anchors under it. Also the count under `NEAR_NEUTRAL_CHROMA` 0.02, for the ADR's alternatives.
- **A fixture anchor for the enrolled subject:**
  - first choice, the first by slug whose rows open *complementary, analogous, analogous, split, split*, as 19 draws;
  - else the first by slug with at least five geometric rows.
  - Its name and figures must differ from 19's.
- **The capture param** (`routes.json`, `aki-batake`): its row count. If it has fewer than five, choose the fixture anchor there.
- **The out-of-sRGB record:** its slug, its `renderDeltaE00`, and every anchor whose rows include it.
- **Ranges and lengths:**
  - the ΔE00-from-anchor range and the longest printed line in each language;
  - the longest en name;
  - whether any of 19's thirteen sample names happens to be a corpus name. If one is, it is not banned in the states test, and that is stated.
- **Ties:** whether any companion has two in-window candidates at equal ΔE00 (the tie rule is `nearestByOklch`'s).

**`19.mjs` edits, then regenerate `19.json`:**

- the re-measured boxes, types, corners and inks;
- the bindings and actions above;
- the headings → `static:with.anchorHeading`, `static:with.rowsHeading`.
- **`notDesign`:**
  - the five *Action:* prefixes;
  - *Hero Card* and *Rows*;
  - 19's anchor *100px* and the parenthetical (kept).
- **`departures`:**
  - **E1:** every name and figure, the OKLCh line, the rows' order and count;
  - **E2:** *Analogous Cool* and *Analogous Soft*;
  - **E3:** wraps, the targets;
  - **E4:** the filter sheet and its *Showing / Clear*, the two empty states, curated rows, the gamut note, the tab bar.
- **`conflicts`:**
  - C8 and C11, unchanged;
  - **C18** resolved (*ΔE00 from the anchor; FR-73's three by ADR-0169*).

**Records:**

- Write ADR-0167 to ADR-0172 and add their rows to `docs/adr/README.md`.
- **R9:**
  - **§2:** the component-noun bullet (*Hero Card*, *Rows*, 21's *List*, beside 07's and 08's *Card*); *Action:* beside the brackets (ADR-0167);
  - **§4 E1:** a 19 bullet;
  - **§4 E2:** the *Analogous Cool / Soft* row;
  - **§4 E4:** a 19 bullet (filter sheet, empty states, curated rows); 19 in the FR-71 bullet;
  - **§6 C18:** settled;
  - **§8:** the `19` row split out of `19 21 24` (Appendix G);
  - **§10:** F-194 c1–c3, F-198 c1–c2, F-200's companion path, F-196's card form and F-195's *Wear it* button, **on this route**;
  - **§11:** OQ-26 and OQ-27 closed.
- **PRD §10:** the OQ-26 and OQ-27 rows follow.
- **`feature_list.json`:**
  - F-252's notes; `openQuestions: []`;
  - notes on F-254 (OQ-26's rule for *…Results List*), F-259 (`Combinations`' entry branch is no longer routed; LIST_SURFACES' 19 record moved), F-265 (the ja words), F-267 (the expected differences), F-344 (*Wear* at 200 %) and F-349 (19's row rule is a pair classification over hue windows: read it through the engine when F-349 lands).
- **Conditional backlog:**
  - if the census finds more than 20 of 120 anchors with no geometric row, file **F-359** (*"A near-grey colour's What goes with this offers what an achromatic colour can stand in — a person's question"*);
  - if *Wear*'s `with` meets a 07 behaviour the session judges wrong, record it.

**Gates:** Tier 1; `type-scale.test` (E-152); the ui recompute tests through the turbo filter (`rows.test`, `app-bar.test`, `action-bar.test`, `cards.test`, `sample-family.test`, `swatch-corners.test`); `node scripts/verify-state.mjs`.

### 2. `@irodora/ui`

**What changes:** `RankedRow` harmony — the name wraps; `note`; part testIDs if needed; `nameSize` only if increment 1 forces it.

**Tests:**

- `rows.test`:
  - the name has no `numberOfLines`;
  - `note` is drawn after the figure, and spoken after `figureName`;
  - without `note`, the old tree renders (decoy);
  - `HARMONY_ROW` is still recomputed from `19.json`.
- New conformance subject: `RankedRow (harmony, with a note)`.

**Gates:** Tier 1, `pnpm test:a11y`, `pnpm test:contrast`, `pnpm test:cvd`. Build `@irodora/ui` before any app test: app tests read the package's `dist`.

### 3. Pure logic

**Code:**

- `goes-with.ts`;
- the `companionsOf` and `renderNote` extractions;
- `wear.ts#startWith`.

**Catalogue keys read through the literal maps** (en and ja): `with.relationship.*` (five), `with.anchorSlot`, and the empty-state words. Keys only the screen reads arrive in increment 4 (F-247's lesson).

**Tests:**

- `goes-with.test.ts` (new): the test plan's invariants 1–9. It states its own timeout (120 anchors × 9 rankings).
- `combinations.test.ts`, `detail.test.ts`: unchanged and green (the extractions).
- `wear.test.ts`: `startWith` over every anchor × its rows, plus decoys.

**Fonts:** run `node scripts/verify-font-coverage.mjs`. If it names glyphs (likely 補 類 似 割), run `generate-font-subset.mjs`, then `fonts.test`, then `generate-font-subset.mjs --check`.

**Gates:** Tier 1, `verify-font-coverage`, `generate-font-subset --check`.

### 4. The screen and the routes

- **New `GoesWith.tsx`**, as sketched.
- **`app/(tabs)/atlas/with/[slug].tsx`:**
  - `<Stack.Screen options={{ headerShown: false }} />`;
  - `onBack` → `router.navigate('/atlas')`;
  - `onWear(row)` → `router.push(wearHref(slug, row))`;
  - `onBuild` → `router.push(buildHref(slug))`;
  - no profile and no repository read (the old route's `activeProfile`, `ruleSet`, `useTarget` and `displayFromOklch` imports leave).
- **`app/(tabs)/atlas/wear/[slug].tsx`:** reads `with` and passes `initial={startWith(withSlug, slug)}`. Everything else is unchanged.
- **Catalogue** (en and ja): `with.title`, `with.filter`, `with.anchorHeading`, `with.anchorSlot`, `with.rowsHeading`, `with.wear`, `with.wearName`, `with.build`, `with.filterTitle`, `with.all`, the empty words and hint. **No `combos.*` key changes** (24's screen reads them).
- **`chrome.test.ts`:** delete `'atlas/with/[slug]'` (line 119). The test fails until it is deleted.
- **`screens.test.tsx`:**
  - **Subjects:**
    - `screens/GoesWith` (the fixture anchor, as drawn);
    - `(curated)` (a curated combination's lead);
    - `(filtered)` (`initialFilter` set, for the tree only; the drawn state stays unfiltered);
    - `(near grey)` (witness for `absent`: an anchor below the floor);
    - `(not in this corpus)` (witness);
    - `(outside sRGB)`, the record as the anchor or as a row, per the census;
    - `sampleValues` adds every hex these draw.
  - `STATES` map: add `GoesWith`.
  - **LIST_SURFACES:** the 19 record moves to `screens/GoesWith` (`19.rows.row-1`, `-5`). The 24 record stays on Combinations.
  - The A11 headings checks extend to the two headings.
- **`i18n.test.ts`:** *"distinguishable"* adds `with.title` ≠ `contemporary.title` and `with.wear` ≠ the contemporary control, in both languages.
- **`screen-insets.json`:** capture the new subjects only.
- **e2e:** `routes.json`'s `/atlas/with/[slug]` anchor → `with.anchorHeading` (one node, wholly in the locale's words), and the param per the census; then `node scripts/generate-e2e-flows.mjs`.

**Gates:** Tier 1, `test:a11y`, `test:contrast`, `test:cvd`, `node scripts/verify-reachability.mjs`, `verify-route-targets`, `generate-e2e-flows --check`, `verify-token-reach`, `verify-font-coverage`, `generate-font-subset --check`.

### 5. Enrolment

- **`ENROLLED` gains `19.screen`:**
  - root `with.surface`, which wraps `GoesWith` (the fixture slug, every handler wired) and `AppTabBar` (index 1);
  - `goesWithLocators()` by testID where 19 binds data or sample content (the anchor's three lines, each row's parts, Build);
  - by the keys the screen reads where 19's words are rebound (the headings, *Wear*).
- **`inventory-surfaces.json`** gains `"19.screen"`. Commit `conformance-sweep.json`.
- **Decoys**, each giving one finding naming its element:
  - the divider removed;
  - the anchor's OKLCh line removed;
  - row 3's detail removed;
  - row 5's Wear removed;
  - the rows heading's text replaced.
- 19 draws no art, so there is no art decoy to state.

**Gates:** Tier 1, `verify-mockups` (it refuses closing without the enrolment, E-203).

### 6. Criterion 1's own test

`apps/mobile/test/goes-with-fidelity.test.tsx`. **Gates:** Tier 1.

### 7. States and actions

`apps/mobile/test/goes-with-states.test.tsx`, covering the screen and both route sources. **Gates:** Tier 1.

### 8. Effects and memory

`effects.json`: the updates below, plus E-239 to E-241, each with its note in `.harness/memory/effects/`. **Gates:** Tier 1, `node scripts/verify-state.mjs`.

### 9. Verify, review, record

- Run Tier 2, then the evaluator **once**.
- Fix its findings or record them as backlog, then run Tier 2 again on the final tree.
- Update `progress.md` and `feature_list.json`; capture lessons; checkpoint.

---

## Mockup fidelity

- **Governing:** `19` for `/atlas/with/[slug]` (P1).
- **Variants:**
  - `25` for the light palette (P2);
  - no Japanese variant exists, so Japanese is the catalogue's words on 19's layout (the title under the OQ-48 interim);
  - board `00` for what 19 does not draw (P3);
  - `00` / `27` for the empty states (ADR-0128);
  - 03's sheet and 05's pills for the filter (E4).
- **Conflicts applied:** C1 (tab bar), C8 (text beside the sample), C11 (samples on tinted cards), C18 (ΔE00 from the anchor; now settled).

### Element by element (40 in `19.json`; the counts are completed after increment 1)

| ids | built as | bound to | sweep locator |
|---|---|---|---|
| `19.header` | `Screen appBar`, `fill` per Inc 1, no rule | — | derived `AppBar` |
| `19.back` | `AppBar.back`, `BACK_GLYPH` | `tab.atlas`; named `detail.backToAtlas` → `/atlas` | text `tab.atlas` |
| `19.header-divider` | `AppBar divider` | — | `APP_BAR_DIVIDER_TEST_ID` |
| `19.title` | inline title with `ja` | en `with.title • 調和色`; ja 調和色 | value, per locale |
| `19.filter` | trailing icon `filter` | named `with.filter` → the sheet (E4) | testID `with.filter` |
| `19.anchor.heading` | `Text` body 500 `foreground.2`, heading | `with.anchorHeading` | text |
| `19.anchor` · `.ring` · `.swatch` | `Card` level 1; `Swatch anchor` | the record (`colorFor`) | testIDs `with.anchor`, `.swatch` |
| `19.anchor.name` · `.oklch` · `.garment` | `Text` ×3 | `anchorName`, `oklchLine` (+ `renderNote`), `anchorSlotLine` | testIDs |
| `19.rows.heading` | `Text` heading (+ *Showing / Clear* when filtered, E4) | `with.rowsHeading` | text |
| `19.rows.row-N` (+ `.swatch`, `.name`, `.detail`, `.wear`) | `RankedRow form="harmony"` | `goesWith(anchor).rows[N−1]`; `relationshipWords`; `distanceFigure`; `with.wear` → `wearHref` | testIDs `with.row.N-1.*` |
| `19.bar` · `.build` | `ActionBar`; `tonal` level 3, `arrow-right` | `with.build` → `buildHref` | derived `ActionBar`; text |

### Bindings (§8), every one the corpus's or the engine's

| element | value | computed by |
|---|---|---|
| anchor | the record's kanji, romaji, English and OKLCh (3, 3, 1); the slot | the bundle; `wear.ts#DEFAULT_SLOT` |
| rows | curated members, then each hue relationship's companion realised in the corpus (±9°, the floor) | `combinationsContaining`; `generateHarmony` → `nearestByOklch` → `hueDistance` (ADR-0168) |
| relationship | the kind's name, or *Curated ‹intent›* | `RELATIONSHIP_KEYS`, `combos.curated` + `combos.intent.*` |
| ΔE00 | from the anchor, floored to one place | `compare(anchor, row).deltaE00` (FR-48; the same double 08 prints) |
| gamut cost | the record's own; the one non-zero noted | `derived.renderDeltaE00` via `renderNote` (ADR-0146 D4) |

### Departures, by id (nothing else)

- **E1:**
  - every name, OKLCh figure and ΔE00;
  - the rows' number and order;
  - 19's anchor (*Ai-nezumi* is not in the corpus).
- **E2:** *Analogous Cool*, *Analogous Soft* → *Analogous*.
- **E3:**
  - wraps (the anchor name, the row names, the detail line);
  - the targets: Wear at 25.5 dp; the filter at 20 dp in a bar of about 47 dp. Each target stays inside its parent.
  - Wear's fixed height clips at 200 % (F-344).
- **E4:**
  - the filter's sheet and its *Showing n / N · Clear*;
  - the two empty states;
  - curated rows (FR-73's curated half, in 19's row form);
  - the gamut note (rule 11);
  - 01's tab bar under the action bar.
- **§2, not design:**
  - *(HeroUI Card level="2")*, *100px*;
  - *Hero Card*, *Rows*, *Action:* (ADR-0167);
  - *Color* → *Colour*;
  - the bezel and the leaves outside the frame.
- **§2, tighter than the scale (named in ADR-0172):** name → OKLCh, OKLCh → slot, name → detail (and heading → card if Inc 1 reads it under the half-step).
- **Not departures from 19, but from earlier decisions** (R9 §10): F-194 c1–c3, F-198 c1–c2, F-200's companion path, F-196's card form, F-195's button — **on this route only** (ADR-0171).

If the capture shows anything else, it is fixed, or it is a question for a person.

---

## Files to touch

```
.harness/plans/F-252-what-goes-with-this-is-mockup-19.md
docs/adr/0167-…, 0168-…, 0169-…, 0170-…, 0171-…, 0172-…; docs/adr/README.md
docs/design/R9-MOCKUP-FIDELITY.md (§2, §4 E1/E2/E4, §6 C18, §8, §10, §11); docs/PRD.md §10 (OQ-26, OQ-27)
mockups/tools/inventory-data/19.mjs; mockups/inventory/19.json
packages/ui/src/RankedRow.tsx; packages/ui/test/rows.test.tsx, conformance.test.tsx
apps/mobile/src/goes-with.ts (new); combinations.ts (companionsOf, no behaviour change);
  detail.ts (renderNote, no behaviour change); wear.ts (startWith); i18n/en.ts, i18n/ja.ts
apps/mobile/src/screens/GoesWith.tsx (new) — Combinations.tsx NOT touched
apps/mobile/app/(tabs)/atlas/with/[slug].tsx; app/(tabs)/atlas/wear/[slug].tsx (reads `with`)
apps/mobile/test/goes-with.test.ts (new), goes-with-fidelity.test.tsx (new), goes-with-states.test.tsx (new),
  wear.test.ts, screens.test.tsx, chrome.test.ts, i18n.test.ts
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
| **E-100** (color-harmony → the app) | a second reader: 19's rows read `generateHarmony` and `hueDistance`; `companionsOf` is extracted | `goes-with.test`'s independent angle table; `combinations.test` unchanged; guard text updated |
| **E-103** (`Combinations.tsx`) | it no longer serves `/atlas/with/[slug]`; its entry branch is unrouted except as 24's miss state; the Lens's combinations exit now lands on `GoesWith` | `lens-exits.test` (the href is unchanged); `verify-route-targets`; a note on F-259 |
| **E-104** (`combinations.ts`) | `companionsOf` extracted, no behaviour change | `combinations.test` and `curated-combinations.test`, unchanged and green |
| **E-106** (target → `Combinations.tsx`) | 19 arms no target; arming stays on 24's routes and 06's *Hold* | `target.test` unchanged; guard text names the route change |
| **E-157** (defaults from the inventories) | `19.mjs` re-measured: `HARMONY_ROW`, `APP_BAR_*` (if 19's bar is in the median set), `ACTION_BAR_*`, the cards and sample censuses may move | the recompute tests (`rows`, `app-bar`, `action-bar`, `cards`, `sample-family`, `swatch-corners`). Risk 2's rule: keep F-220's method for a box that feeds a shared median, or move the default with an ADR |
| **E-160** (`onSample`) / OQ-46 | 19's samples bind no keyline; the guarantee line appears where needed | `screens-sample-ink.test`'s census (new hexes in `sampleValues`); gate `contrast` |
| **E-164** (chrome) | `atlas/with/[slug]` leaves `PLATFORM_HEADER` | `chrome.test`, both directions |
| **E-191 / E-199** (states; Arrival) | `GoesWith`'s `STATES` and witnesses; one Arrival over curated then geometric rows; LIST_SURFACES' 19 record moves | the declarations test; `blank-panel`, `bare-zero`; *"arrives once"* |
| **E-203 / E-211** (sweep) | `19.screen` enrolled | `verify-mockups`; `screens.test` |
| **E-221** (07's route) | 07's route reads `with` | `wear-states.test` (unchanged handlers); `goes-with-states.test` reads 07's route for `startWith(…)`; guard text updated |
| **E-215** (06's readout) | `renderNote` extracted from `readoutRows` | `detail.test` and `colour-detail-*` unchanged and green |
| **E-016 / E-089** (catalogues; Japanese claims) | `with.*` keys added; no key removed | `tsc`; `i18n.test` (including *distinguishable*); `verify:claims` |
| **E-017 / E-145** (fonts) | 調和色, 基準色, the relationship terms | `verify-font-coverage`; `generate-font-subset --check` |
| **E-128 / E-134 / E-152** (inventory → R9, PRD, features, type census) | `19.json` edited; maybe a measured name step | `verify-mockups`; `mockup-inventory --check`; `type-scale.test` |
| **E-063** (route targets) | `/atlas/wear/${a}?with=${b}` | `verify-route-targets` (query stripped since E-105) |

### New links (E-239 is the next free id)

- **E-239.** From `apps/mobile/src/goes-with.ts`. To `GoesWith.tsx`, `finder.ts#nearestByOklch`, `finder.ts#lexicon`, `@irodora/color-harmony`, `corpus#combinationsContaining`, and the fidelity, states and sweep tests.
  - **Hazard:**
    - a row labelled with a relationship its hue does not hold;
    - a near-grey colour given a hue relationship;
    - a figure over the wrong pair, or rounded up;
    - the order drifting;
    - a lexicon publish moving the floor silently;
    - F-349 landing a second definition of the relationship.
  - **Guard:**
    - `goes-with.test` over all 120 anchors with a hand-written angle table and its own wrap arithmetic (never `hueDistance`'s delegate), with decoys;
    - the floor pinned to the lexicon version it was read from;
    - a note on F-349.
- **E-240.** From `app/(tabs)/atlas/wear/[slug].tsx` (`with`) and `wear.ts#startWith`. To 19's *Wear*.
  - **Hazard:** a rebuild of 07 stops reading `with`, so *Wear* opens 07 without the row's colour, and nothing on 19 fails.
  - **Guard:**
    - `wear.test` (`startWith` both ways);
    - `goes-with-states.test` reads 07's route body for `startWith(` and `with`;
    - a decoy route without it.
- **E-241.** From `apps/mobile/src/detail.ts#renderNote`. To 06's readout and 19's anchor and rows.
  - **Hazard:** one surface states a record's gamut cost and the other does not, or the two word it differently.
  - **Guard:**
    - `detail.test` and `goes-with.test` assert the note is present if and only if `!inSrgbGamut`, through the one helper;
    - the out-of-sRGB subject in the conformance registry.

---

## Test plan

### The invariants a person checks first, over every case the data allows (F-248's lesson)

All in `apps/mobile/test/goes-with.test.ts`, pure, over all 120 anchors.

1. **Every geometric row's relationship holds.**
   - The hue angle from anchor to row, computed by the test's own `((b − a) % 360 + 360) % 360` from `derived.oklch[2]`, lies within ±9° of the relationship's angle in a **hand-written table**: complementary 180; analogous 330 and 30; split 150 and 210; triadic 120 and 240; tetradic 90 and 270.
   - Both chromas are at or above the floor.
   - **Decoys:**
     - a constructed pair at 189.5° is not complementary;
     - the ±15° row set differs from the ±9° set for some anchor (the tolerance is live).
2. **Each companion takes the nearest in-window colour.**
   - The oracle computes ΔE00 from the companion to every one of the 120 by `deltaE00(xyzToLab(oklchToXyz(requested)), entry.derived.lab)`. That is a different path from `nearestByOklch`'s index.
   - No other eligible in-window entry is nearer; ties go to the slug first.
   - A window with no eligible entry yields no row.
3. **Each colour once, in the order.**
   - The anchor never appears.
   - No entry appears twice.
   - Curated rows come first (by combination slug, then rank), then geometric rows in ADR-0168's order.
   - The 180° companion is realised once.
   - The row count equals the census's for every anchor.
4. **The near-grey anchors.**
   - Every anchor under the floor has zero geometric rows (it may have curated ones).
   - Every chromatic anchor with an eligible in-window entry has a row.
   - **Decoy:** an anchor just above the floor has one.
   - The floor is read from `lexicon()`, and equals 0.039 for 2026.08.1.
5. **The figure.**
   - The printed ΔE00 is `floor(compare(a, r).deltaE00 × 10) / 10`, and is ≤ exact.
   - `compare`'s value equals `nearestByLab(a.derived.lab, 120)`'s distance for the same entry within 1e-9 (two paths).
   - **Decoy:** a constructed 48.29 prints 48.2, never 48.3.
6. **The gamut note** is present if and only if the anchor or the row is the record outside sRGB, with its `renderDeltaE00` at two places, through `renderNote`. **Decoy:** an in-gamut row has none.
7. **The words.**
   - `RELATIONSHIP_KEYS` is total over `HUE_RELATIONSHIPS`, in both catalogues.
   - Every `with.*` value contains none of *Match*, *Safe*, *Exact*, *Perfect*, *should*, 一致, 伝統, べき. **Decoy:** a planted *Exact* is found.
   - The Japanese joiners are the script's own.
8. **The filter.**
   - `filterRows(rows, k)` keeps only `k`.
   - The options are *All* plus the kinds present, in order; none empties the list.
   - *Showing n / N* uses the filtered and whole counts.
9. **`startWith`.** For every anchor × each of its rows: trousers holds the row, locked and in hand. An unknown slug or the anchor's own gives `undefined` (decoy).

### Unit

- `wear.test` (`startWith`).
- `rows.test` (increment 2).
- `combinations.test` and `detail.test`, unchanged (the extractions).

**Golden:** none owed. There is no `packages/color-*` change. Every figure comes from golden-tested functions: `deltaE00`, `generateHarmony` (gate 5) and the corpus derivation.

### Conformance subjects (`screens.test.tsx`)

The six subjects from increment 4. `blank-panel` and `bare-zero` run on every subject.

### The inventory sweep (`ENROLLED`)

`19.screen` with its five decoys (increment 5). It joins *"the real surfaces are clean as drawn"*.

### Criterion 1's own test (`goes-with-fidelity.test.tsx`, on the rendered tree; `el()` recomputed from `19.json`)

- **Order:** back < divider < title < filter (one row) < anchor heading < anchor card (ring < name < OKLCh < slot) < rows heading < row 1 … row N < the bar's Build; within a row, sample < name < detail, with Wear trailing.
- **Grouping:** the three anchor lines in one column, centred on the ring; Wear inside its row's card; no pressable inside a sample.
- **Proportion:**
  - every interval through §2's snap at 0.6124 dp/px, with each subtracted inset written out;
  - the named intervals through `belowTheScale`, their cost asserted against ADR-0172;
  - every size constant;
  - the corners;
  - the page inset `sm`, read from the Screen's padding (F-251's lesson: a test that reads the declaration, not a literal).
- **Type and ink** against `19.json`, both themes.
- **Wrap:** no `numberOfLines` on any word.
- **Targets:** each Wear's 48 dp target lies inside its row card; the filter's inside the bar (with the bar's top inset on a device; Risk 3).

### Negative and action tests (`goes-with-states.test.tsx`)

**No 19 sample content**, in en and ja × dark and light, across every subject, in paragraphs and accessible names:

- **Names:** *Ai-nezumi*, *Indigo Grey*, 藍鼠, *Amber Ochre*, 琥珀色, *Deep Slate Teal*, 藍墨茶, *Slate Lavender*, 藤鼠, *Gold Ochre*, 黄朽葉, *Terracotta*, 樺色.
- **Figures:** `0.490`, `0.035`, `240.2`, `48.2`, `12.4`, `11.8`, `42.1`, `44.6`.
- **Words:** *Hero Card*, *HeroUI*, *100px*, *Rows*, *Action:*, *Analogous Cool*, *Analogous Soft*, *Color* (US).
- **Precondition:** the fixture's own names and figures differ from these. Any of 19's names found in the corpus by the census is unbanned and stated.
- **Decoy:** a planted *Amber Ochre* is found.

**Every drawn action, fired on the control a person touches:**

- back;
- the filter → the sheet → a relationship → *Showing / Clear* → *Clear*;
- each Wear (its handler receives the right row);
- Build.
- **Decoys:** an absent handler means an absent control; the absent and near-grey subjects draw their captions and no rows.

**Route source:**

- `with/[slug].tsx` holds:
  - `headerShown: false`;
  - `router.navigate('/atlas')`;
  - `wearHref(` with the anchor first;
  - `buildHref(`;
  - no `activeProfile`.
- `wear/[slug].tsx` reads `with` into `startWith`.
- **Decoys:** a back that only pops; a Wear with the slugs swapped; a Build to `/wardrobe/outfit`.

### E2E

- `generate-e2e-flows --check`, anchor `with.anchorHeading`.
- The capture takes `/atlas/with/[slug]` at the census's slug.
- *Wear* and *Build* landing on 07 are the device half's to attest.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#  + inc 1: type-scale.test and the ui recompute tests (via the filter); node scripts/verify-state.mjs
#  + inc 2, 4: pnpm test:a11y && pnpm test:contrast && pnpm test:cvd   (build @irodora/ui first)
#  + inc 3, 4: node scripts/verify-font-coverage.mjs && node scripts/generate-font-subset.mjs --check (+ fonts.test if regenerated)
#  + inc 4: node scripts/verify-reachability.mjs, verify-route-targets, node scripts/generate-e2e-flows.mjs --check, verify-token-reach
#  + inc 5: verify-mockups; inc 8: node scripts/verify-state.mjs
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
- the sweep's block (`19.screen` enrolled, elements asserted, renders);
- `claims.findings` 0;
- the font-coverage line;
- the screen-insets delta;
- the census numbers quoted in ADR-0168 to ADR-0170 (anchors under the floor; the row distribution at ±9° and ±15°; the fixture; the out-of-sRGB record).

Report the known reds as F-251 did: F-322 (`pnpm security`), F-350, F-317 and F-348 (timeouts under load), F-333 (the Windows write error), and the iOS half of `verify-ci` on win32.

| # | criterion | proven by |
|---|---|---|
| 1 | inventory 19 in order, grouping and proportion, asserted by the sweep | `goes-with-fidelity.test` and the sweep. **Gated** |
| 2 | bindings per §8; no mockup content | `goes-with.test` (every anchor), the sweep's values, the states test. **Gated** |
| 3 | only the listed departures | **gated** for structure; **attested** for appearance |
| 4 | the capture beside 19, compared by a person | **attested** |
| 5 | catalogues; every drawn action works; a11y, contrast, cvd | `tsc`, `i18n.test`, the states test, the three gates. **Gated**, with the device half **attested** |

---

## Attestations

Declared in increment 0 (Appendix G). All three block release.

1. **Criterion 4.**
   - A person runs `pnpm fidelity:capture -- --erase-app-data` on Android at 384 dp, with a non-debuggable build of the final commit.
   - They compare `/atlas/with/[slug]` against 19 in Sumi, in Washi (25's palette) and in Japanese, and record *matches* or each difference.
   - **Expected, not defects:**
     - the census's anchor and its rows: fewer or more than five, in ADR-0168's order, each with a corpus name;
     - *Anchor Colour* and *Ranked Harmonic Relationships*; *Wear*; *Analogous* with no qualifier;
     - the record's OKLCh and ΔE00 at one place;
     - the bar filled (if Inc 1 reads it so);
     - 調和色 alone in Japanese;
     - 01's tab bar under the action bar;
     - a line round some samples (OQ-46's interim);
     - the anchor card about 7 dp taller and each row 5 dp taller than drawn (the named intervals).
2. **Criterion 3, the appearance half.** Discharged by the same comparison. **The person is asked specifically to confirm or flip:**
   - ADR-0167 (heading words, against blank space);
   - ADR-0168's ±9° and the floor;
   - ADR-0169's not printing *Generated*;
   - ADR-0170's one-place ΔE00;
   - ADR-0171 D3 (Build → 07, against the Lab).
3. **Criterion 5, the device half.**
   - Back returns to the Atlas.
   - Each Wear opens 07 with the row's colour locked in the trousers.
   - Build opens 07 for the anchor.
   - The filter sheet chooses, and *Clear* clears.
   - A near-grey colour shows its caption and Build still works.
   - TalkBack reads each row as name, relationship and *ΔE00 …, CIEDE2000*, and Wear as *Wear ‹row› with ‹anchor›*.
   - At 200 % in en and ja nothing is cut except Wear's fixed height (F-344).
   - The generated flows pass.

---

## Risks and open questions

1. **Measurements owed in increment 1.** These are unknown until then:
   - the bar's true height and fill; the names' step (19.7 suggests `title`, which would force `RankedRow nameSize`);
   - every corner (09's and 10's moved `md` → `sm`); the Build fill;
   - the ring's outer edge; heading → card (a pixel from the half-step).
2. **Shared medians.** `HARMONY_ROW` (rows.test), and possibly `APP_BAR_*`, `ACTION_BAR_*` and the card and sample censuses, read `19.json`. **Rule (F-251's):** re-measure. Where a box feeds a shared median and the new reading moves it, either keep F-220's method for that box (ADR-0161 D8, F-282) or move the default with an ADR and check its consumers. Never move one silently.
3. **The filter's target.** A 47 dp bar cannot hold a 48 dp target. On a device the AppBar's view includes the status-bar top inset, so the target fits inside its parent; in a test tree `topInset` is 0. If Inc 1 reads 47, the fidelity test asserts the target against the bar with its inset, and the ADR states it.
4. **ADR-0168 is the decision a person is likeliest to revisit.**
   - It narrows this route from twelve generated relationships to five hue relationships realised in the corpus. Near-grey anchors (about 20–35 of 120, **inferred**; the census counts them) get no geometric row.
   - ±9° rests on secondary reproductions of Matsuda's 18° sector, which is defined on HSV hue, not OKLCh.
   - Both are stated; the ⇄ alternatives (±15°; the engine's `NEAR_NEUTRAL_CHROMA` 0.02 as the floor) are in the ADR with their census counts.
5. **F-349 overlap.** 19's window rule is a pair classification. If F-349 later puts one in the engine, 19 must read it, or the product holds two definitions (E-239's guard and a note on F-349).
6. **07's `with` parameter** is an additive change to a done feature's route (F-248). `placeSlots` already holds a colour its ranking lacks. Whether 07 reads well with a locked, unranked trouser is the device half's to see.
7. **Build → 07 rather than the Lab** reverses `19.json`'s reading. It is argued on *Complete 4-Piece* being true only there today, with ⇄ stated. When F-257 gives the Lab four rows and a profile-free state, the person may prefer the Lab.
8. **What leaves this route** (per-relationship CVD separation, personal weighting, generated companions and their arming) is kept on 24's routes only until F-259 rebuilds them. F-259 must decide for itself (a note on F-259). The capability is not lost today.
9. **Japanese words are unreviewed:** 調和色, 基準色, the relationship terms, 合わせて着る and Build's words (F-265). The design-site sources are not a colour-theory text.
10. **`screens.test` heap and time** (F-317, F-350): six subjects are added. State timeouts where the census runs.
11. **Navigation mechanics** are unverified on a device: `navigate('/atlas')` from a route pushed over Home; the `with` push. The route-source tests hold the literals; the device run attests the behaviour.
12. **No JDK or Maestro here.** The attestations are the person's.
13. **Open questions:**
    - OQ-26 closes (ADR-0167);
    - OQ-27 closes (ADR-0169);
    - OQ-48's interim is applied, not decided;
    - OQ-46 applies to 19's samples, and the shipped guarantee stands.

## Out of scope

- `Combinations.tsx` and 24's two routes (F-259); 21's screen (F-254 applies ADR-0167).
- An engine relationship classifier (F-349); any change to `@irodora/color-harmony`'s generators, `spread` or `NEAR_NEUTRAL_CHROMA`.
- Lightness or chroma relationships for near-grey colours (conditional F-359, a person's).
- 07's composition and controls beyond reading `with`; the Lab (F-257).
- New or edited curated combinations; any content or schema change.
- OQ-46; F-344's clipping; ADR-0125's band table or its two-place convention elsewhere.

## Sources

- Cohen-Or, Sorkine, Gal, Leyvand, Xu, [*Color Harmonization*, ACM TOG 25(3), 2006](https://www.microsoft.com/en-us/research/wp-content/uploads/2006/07/harmonization.pdf). Its appendix was **not read** (the PDF did not decode here).
- The 18° and 93.6° sector widths, as secondary reproductions: [arXiv 1202.2158](https://arxiv.org/pdf/1202.2158), [arXiv 2609.03918](https://arxiv.org/pdf/2609.03918). [EP2947865](https://patents.google.com/patent/EP2947865B1/de) gives an *i*-type under 30°, with 20° as its example.
- Japanese harmony terms (design sites, not a colour-theory text): [Seahawk Media, split-complementary](https://seahawkmedia.com/ja/%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3%E7%94%A8%E8%AA%9E%E9%9B%86/%E3%82%B9%E3%83%97%E3%83%AA%E3%83%83%E3%83%88%E3%82%B3%E3%83%B3%E3%83%97%E3%83%AA%E3%83%A1%E3%83%B3%E3%82%BF%E3%83%AA%E3%83%BC%E3%82%AB%E3%83%A9%E3%83%BC/), [gadgety.net, colour](https://gadgety.net/shin/design/color.html), [Seahawk Media, 配色とは](https://seahawkmedia.com/ja/デザイン用語集/配色とは何ですか？/).
- WCAG 2.2 SC 2.4.6 *Headings and Labels* (*"Headings and labels describe topic or purpose"*), cited from knowledge and **not fetched** this session.

---

# Appendix A: ADR-0167 draft

```markdown
# ADR-0167: A heading slot a mockup draws is design; the component noun inside it, and "Action:" before a button's word, are notation

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-252 |
| **Answers** | OQ-26 (19 and 21) |
| **Applies** | R9 §2 (07's and 08's *Card*; the leaked-label list), ADR-0163 (brackets), F-250 and F-251's kept headings, ADR-0142 D4 (en-GB) |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): "For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade." |

## Context
19 heads its sections *Anchor Color Hero Card (HeroUI Card level="2")* and *Ranked Harmonic Relationship Rows*,
in the screen's heading style (body 500, `text.secondary`), and labels each row's button *Action: Wear*. 21 heads
its list *Ranked Nearest Corpus Results List*. F-252's note, written before the delegation, read the headings as
not design.

## Decision
- **D1.** A heading drawn at a section's head in the screen's heading style is design. Words in it that name a UI
  component — *Hero Card*, *Rows*, *List* — are notation, as R9 §2 reads *Card* at the end of 07's and 08's titles.
  The parenthetical and *100px* stay not design.
- **D2.** 19: *Anchor Colour* (基準色); *Ranked Harmonic Relationships* (調和の関係・順位順). 21: *Ranked Nearest
  Corpus Results* (F-254 applies it).
- **D3.** *Action:* before a button's word names the control's type, which its outline already says — ADR-0163's
  notation. 19's buttons read *Wear* (合わせて着る), named *Wear ‹row› with ‹anchor›* (WCAG 2.5.3: the name holds
  the label).

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Verbatim | Component jargon shipped as copy; *Color* against the en-GB catalogue |
| Not design, space kept (F-252's note) | Two blank bands; the screen loses the two section headings a screen-reader user navigates by |
| New words chosen freely | Taste, not the drawing (rule 14) |
| *Action: Wear* verbatim | A wireframe annotation on every row |

## Evidence, and its limits
R9 §2's precedent; 09's and 16's kept headings. WCAG 2.4.6 was cited from knowledge, not re-read. ⇄ the person can
flip D1 to "not design, space kept". The Japanese is unreviewed (F-265).
```

# Appendix B: ADR-0168 draft

```markdown
# ADR-0168: What goes with a colour on 19 — corpus colours that stand in a hue relationship to it, to a stated tolerance

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-252 |
| **Supersedes in part, on `/atlas/with/[slug]` only** | F-194 c1 (all twelve relationships), F-198 c2 (profile weighting); both stand on 24's routes until F-259 |
| **Applies** | FR-6, FR-73, FR-10; ADR-0045 (hue survives mapping), ADR-0158 (one ranking route), F-196; R9 §4 E1 |
| **Decided on** | The delegation of 2026-10-05 |

## Context
19 draws one named corpus colour per row, with its relationship to the anchor and a *Wear* that needs a slug.
The harmony engine generates companions; nothing in the product classifies the relationship of two given colours
(F-349, backlog).

## Decision
- **D1. Curated rows first.** Each curated combination holding the anchor, by slug; its other members by rank.
- **D2. Geometric rows.** For complementary (180°), analogous (−30°, +30°), split (150°, 210°), triadic (120°,
  240°) and tetradic (90°, 270°; its 180° realised once), in that order: each companion `generateHarmony` produces,
  the source dropped by value, yields at most one row — the first entry by `nearestByOklch(companion)` that is not the
  anchor, not already a row, whose chroma is at least the floor and whose hue lies within ±9° of the companion's
  requested hue (`hueDistance`).
- **D3. The tolerance, ±9°.** Half the 18° single-hue sector of Matsuda's templates (Cohen-Or et al. 2006, as
  reproduced). The five windows are disjoint.
- **D4. The floor.** The published lexicon's hue-term chroma floor, read from it (0.039 for 2026.08.1). Below it the
  product calls a colour grey or neutral and names no hue, so an anchor below it has no geometric rows.
- **D5. What the word claims.** The hue angle between the two colours, within ±9° of the relationship's. Nothing
  about lightness or chroma.
- **D6. Not offered here.** The six L/C kinds (no single stated tolerance) and *warm–cool* (absolute hues). No
  personal weighting: 19 draws nothing that could say an order was weighted; 07 prints the fit.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Generated companions as rows | No name and no slug: *Wear* cannot act, and a name would be the nearest entry's (E-103's refusal) |
| The nearest entry to each companion, with no tolerance | A *Complementary* row up to any number of degrees off (rule 11) |
| ±15° (half the generator's spread) | Wider than any published single-hue sector; [census] more rows |
| `NEAR_NEUTRAL_CHROMA` (0.02) as the floor | A hue relationship stated for colours the lexicon calls grey; [census] |
| All entries in each window | A menu, not an answer (F-194) |
| Weight by the profile | An unexplained order; 19 draws no note |

## Evidence, and its limits
Census (corpus [label]): [anchors under the floor]; rows per anchor at ±9° [distribution] and at ±15°
[distribution]. The 18° sector is defined on HSV hue, not OKLCh, and was read in secondary sources only. ⇄ the
tolerance and the floor are the person's to flip.

## Revisit when
F-349 lands a classifier (19 reads it), or a person asks for relationships for near-grey colours (F-359).
```

# Appendix C: ADR-0169 draft

```markdown
# ADR-0169: FR-73's relationship, family, generated-or-curated mark and gamut cost on 19

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-252 |
| **Answers** | OQ-27 (C18's remainder) |
| **Supersedes in part, on this route** | F-194 c2 (each colour's cost shown), F-194 c3 (*Generated* label) |
| **Applies** | FR-73, FR-8; `HarmonyFamily` (`kinds.ts`); ADR-0146 D4; golden rule 11 |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Relationship:** each row's detail line, as drawn.
- **D2. Family and generated-or-curated are one axis** (`HarmonyFamily`: geometric = generated, editorial =
  curated). A geometric row names an FR-6 relationship, which the product only generates; a curated row reads
  *Curated ‹intent›* (選定・‹intent›).
- **D3. Gamut cost:** every proposed colour is a corpus record at its own sRGB hex, so its cost is the record's
  `renderDeltaE00`. The one record outside sRGB carries 06's note — *nearest sRGB rendering, ΔE00 x.xx* — after the
  anchor's OKLCh or the row's ΔE00, through the helper 06 uses. A zero is not printed; 19 draws no slot for it.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| *Generated* before each geometric relationship | Every drawn line longer; ⇄ the person's |
| A zero cost on every row | An element on every row 19 does not draw |
| The three only in accessible names | FR-73's "states" for nobody who looks |
| On 07 after *Wear* | 07 shows an outfit, not the combination's family |

## Evidence, and its limits
[census: the out-of-sRGB slug, its cost, and the anchors whose rows hold it].
```

# Appendix D: ADR-0170 draft

```markdown
# ADR-0170: 19's figures and words say what the corpus and the engine hold

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-252 |
| **Applies** | FR-48, FR-61, FR-23; R9 §4 E1/E2, §8; ADR-0125 D4, ADR-0142 D5, ADR-0151 D4, ADR-0158, ADR-0164 (floored figures) |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Title:** *What Goes With This • 調和色* (ja `with.title` = 調和色; ja shows it alone, the OQ-48 interim).
  `combos.title` is untouched.
- **D2. Anchor:** `kanji Romaji (English)`; `OKLCh: L • C • h°` at 3, 3, 1 from the record; *Anchor Garment: Top*,
  the slot `DEFAULT_SLOT` names, joined by the script's colon.
- **D3. Row:** `English • 漢字`; the relationship (*Complementary · Analogous · Split-Complementary · Triadic ·
  Tetradic* / 補色 · 類似色 · 分割補色 · トライアド · テトラード, or *Curated ‹intent›*); `ΔE00: d`, where d =
  `compare(anchor, row).deltaE00` floored to one place, as 19 prints, and spoken with CIEDE2000.
- **D4. E2:** *Analogous Cool* and *Analogous Soft* print *Analogous*; no computation produces a qualifier.
- **D5. Controls' words:** *Wear* (合わせて着る), *Build Complete 4-Piece Outfit* (4点のコーディネートを組む),
  *Filter relationships*.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| ΔE00 at two places (ADR-0125's convention) | Departs from 19's drawn precision with no forcing rule; ⇄ the person's |
| Rounded, not floored | A printed distance larger than computed |
| Re-value `combos.title` | Changes 24's routes before F-259 |
| The cool/warm side as a qualifier | A word no table defines |

## Evidence, and its limits
[census: ΔE00 range; the longest line per locale]. The Japanese is unreviewed (F-265).
```

# Appendix E: ADR-0171 draft

```markdown
# ADR-0171: What 19's controls do, its states, and what leaves `/atlas/with/[slug]`

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-252 |
| **Supersedes in part, on this route only** | F-194 c1–c3, F-196's card form, F-195's *Wear it* button, F-198 c1–c2, F-200's companion path (with ADR-0168 and ADR-0169); each stands on 24's routes until F-259 |
| **Applies** | FR-73, FR-31, FR-71; ADR-0118, ADR-0128 §6, ADR-0129, ADR-0141, ADR-0143, ADR-0147 (amendment), ADR-0150, ADR-0152 |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Route.** A new screen; `headerShown: false`; no profile and no store read. `Combinations.tsx` keeps 24's
  two routes, unchanged.
- **D2. Back** → `navigate('/atlas')`.
- **D3. A row's Wear** → `/atlas/wear/‹anchor›?with=‹row›`: 07 with the anchor as the top and the row's colour in
  the trousers, locked (`startWith`; an unknown slug or the anchor's own is ignored).
- **D4. Build** → `/atlas/wear/‹anchor›`: 07 builds a complete four-piece outfit around the colour today; the Lab has
  three slots until F-257 and needs a profile.
- **D5. Filter (E4).** 03's sheet; *All* plus the relationships the list holds, in 05's pills, the chosen one dotted;
  while one is chosen, *Showing n / N · Clear* at the rows heading's end. No choice empties the list.
- **D6. States.** `{ absent: 'empty' }`. Not in this corpus → back above 00's caption. No geometric row → the
  anchor card, then 00's caption `resolvedHere` (near grey, or no colour in these relationships), with Build as its
  hint.
- **D7. What leaves, and where it lives:** the twelve cards and generated companions (24's routes); *Generated* (the
  relationship's name); the cost lines (the record's own cost, ADR-0169); the separation (07); the weighting (07's
  fit); arming a companion (06's *Hold*, 24's routes); the curated cards (curated rows); *Wear it* (Wear, Build);
  `combos.what` (no copy advises; the claims lint holds it); the platform header.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Wear → 07 for the row's colour | The row becomes the top, against *Anchor Garment: Top* |
| Build → the Lab | *Complete 4-Piece* untrue there today; disabled without a profile; ⇄ the person's |
| Rebuild `Combinations.tsx` for 19 | 24's routes change before F-259 |
| No filter action | A drawn control that does nothing |

## Evidence, and its limits
Device behaviour (the `with` push, back from a route pushed over Home, TalkBack) is unverified here and attested.
```

# Appendix F: ADR-0172 draft

```markdown
# ADR-0172: 19's composition

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-252 |
| **Applies** | R9 §2 (framed, 0.6124 dp/px), §5, C1, C8, C11; ADR-0113, ADR-0116, ADR-0118, ADR-0121, ADR-0133, ADR-0139, ADR-0161 D8; F-233's anchor; F-235's `HARMONY_ROW` |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Intervals.** The plan's table, snapped at 0.6124 dp/px. The named intervals and their costs: name → OKLCh
  +8.3 dp, OKLCh → slot +6.4 dp, name → detail +5.05 dp per row [and heading → card if read under 2 dp].
- **D2. Insets.** Page `sm`; headings `md`; the ring `md` in its card.
- **D3. The anchor card.** The ring at `ANCHOR_RING`; the sample at `ANCHOR_SAMPLE`, no keyline; the words centred on
  the ring.
- **D4. The rows.** `RankedRow harmony` at `HARMONY_ROW`; the name wraps; gap `sm`; one Arrival in reading order.
- **D5. Chrome.** The bar [filled level 1], divider, no rule; the action bar ruled, Build tonal level 3; 01's tab bar
  below it (E4 FR-71). No art: 19's leaves lie outside its frame.
- **D6. Heights the scale adds,** estimated: the anchor card about +7 dp; rows +5 dp; more where words wrap.

## Evidence, and its limits
Increment 1's readings (in `19.mjs`'s header). A JPEG reading carries about ΔE00 2 in a fill and a pixel at an edge;
the person's comparison judges the result.
```

# Appendix G: state drafts

**F-252 `attested`:** three entries in F-251's shape, each `"blocks": "release", "status": "outstanding"`:

- **Criterion 3:** gated for structure (the fidelity test and the sweep), attested for appearance. It names ADR-0167 to ADR-0172 as the departures and asks the person to confirm or flip the five ⇄ items.
- **Criterion 4:** the capture run, with its *expected, not defects* list.
- **Criterion 5:** gated except the device half (the Attestations list, item 3).

**R9 §8, the `19` row** (split from `19 21 24`; 21 and 24 keep theirs):

| | drawn | binds to | feature |
|---|---|---|---|
| `19` | the anchor's name, OKLCh and slot; each row's colour, name, relationship and ΔE00 | the record (kanji, romaji, English; OKLCh at 3, 3, 1); `DEFAULT_SLOT`; the curated combinations holding the anchor, then each hue relationship's companion realised as the nearest corpus colour within ±9° of its hue, chroma at or above the lexicon's floor (ADR-0168); the relationship's name or *Curated ‹intent›* (ADR-0169); `compare()`'s ΔE00 from the anchor, floored to one place (ADR-0170); the record's gamut note where it has one | `F-252` |

**R9 §11:**

- OQ-26 → *Closed* (ADR-0167): heading slots are design; component nouns and *Action:* are notation; F-254 applies it to 21.
- OQ-27 → *Closed* (ADR-0169).

**Notes on other features:**

| feature | note |
|---|---|
| F-254 | OQ-26's rule: *Ranked Nearest Corpus Results* (*List* is notation); 21's filter glyph has 19's sheet as precedent (ADR-0171 D5) |
| F-259 | `Combinations.tsx` now serves only 24's routes; its entry branch is unrouted except as the miss state; LIST_SURFACES' 19 record moved; the twelve relationships, separation, weighting and arming live only there now — keep or supersede them with a reason |
| F-265 | 調和色, 基準色, 調和の関係・順位順, 補色 · 類似色 · 分割補色 · トライアド · テトラード, 合わせて着る, 4点のコーディネートを組む, 関係で絞り込む, 基準の衣服 |
| F-267 | the expected differences in Attestations, item 1 |
| F-344 | 19's Wear (25.5 dp) clips at 200 % |
| F-349 | 19 classifies a pair by hue windows (ADR-0168); when the engine names relationships, 19 reads it (E-239) |

**Conditional backlog, after the census:** F-359 (near-grey anchors), only if more than 20 of 120 have no geometric row.

---

**What I read, and what I inferred or did not check:**

- **Read:** AGENTS.md (root, mockups, apps/mobile); R9-MOCKUP-FIDELITY.md (all sections); TEMPLATE.md; plan-feature SKILL; F-252's entry and notes; mockup 19 (viewed); `19.json` and `19.mjs`; the three `with` routes; `Combinations.tsx`; `combinations.ts`; color-harmony (`kinds`, `geometry`, `generate`, `editorial`, `index`); `RankedRow.tsx`; `bilingual.tsx`; `figures.tsx`; AppBar's props; Button and ActionBar props; Swatch's anchor; `corpus/index.ts`; `finder.ts#nearestByOklch`; `compare.ts#compare`; `notation.ts`; `detail.ts`'s readout and gamut note; `wear.ts`'s state model; 07's route; `fromWear.ts`; `states.ts`; `chrome.test.ts`; parts of `screens.test.tsx` (ENROLLED, LIST_SURFACES, Combinations subjects); `i18n.test.ts`'s *distinguishable* block; `routes.json`; effects E-100 to E-106, E-157, E-219 to E-221; F-194 to F-200, F-254, F-259, F-349; ADR-0125, 0147, 0148, 0161, 0164; the F-250 and F-251 plans and the top two progress entries; PRD FR-6, FR-73 and §10.
- **Inferred or not checked:**
  - the corpus's hue and chroma distribution, and so every row count, the near-grey count and the fixture (the census owes them);
  - which glyphs the font subset lacks;
  - `screens.test`'s locator mechanics for `ui:RankedRow`;
  - whether 19's bar and action bar sit in the `APP_BAR_*` and `ACTION_BAR_*` median sets;
  - expo-router's behaviour for the `with` push;
  - the original Cohen-Or appendix and WCAG 2.4.6's text (both cited, not read here).

**Increment 1 must measure:**

- the frame's inner extent;
- the bar's height and fill;
- the divider;
- every em (all five names especially) and weight;
- every corner (cards, rows, samples, Wear, Build);
- the ring's outer edge, width and gap;
- the anchor sample;
- the Build fill;
- the glyph inks (back, filter, arrow);
- the crops of *Action:*, *Hero Card* and *Rows*;
- that no art lies inside the frame;
- then the census above.
