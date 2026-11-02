# Plan: F-251 — Palette Studio is mockup 10, and building a palette is mockup 16

| | |
|---|---|
| **Feature** | F-251 ([`feature_list.json`](../state/feature_list.json), line ≈8733) |
| **Requirements** | FR-49, FR-22, FR-3, FR-5. Also applied: FR-23 (classification displayed, never inspired-as-historical), FR-6 (harmony words), FR-35 (CVD flag and swap, whose only surface today is this Studio), FR-51 (export), FR-71 (tab bar, C1/E4), NFR-8, NFR-21. These done criteria and decisions must survive or be superseded by an ADR: F-151 c1 (*"Palettes are composed at a size where the relationships between colours can actually be judged"*), ADR-0067 (a device palette never shows *Irodora original*), F-032/FR-35's flag, F-152's delete on its own line, F-266's Arrival (E-199), F-236's `STATES` (E-191), E-227 (`colours` from 08) |
| **Service / package** | `apps/mobile` · `@irodora/ui` (additive only) · `apps/mobile/src/export` (one additive parameter). No `packages/color-*`, `content/` or schema change, so no golden data is owed |
| **Author** | The planner subagent. It read files and did four web lookups (bracket conventions; small-field tritanopia; the CIE 2° observer's stated domain; WCAG 2.2 Understanding 3.3.2). It measured, built and ran nothing |
| **Date** | 2026-11-02 |
| **Decisions** | ADR-0162 (OQ-45 for 10 and 16), ADR-0163 (OQ-23: brackets are notation), ADR-0164 (10's and 16's figures and words), ADR-0165 (what the controls do, the route states, and what leaves), ADR-0166 (the composition, the art and the tray) |

---

## Intent

**10, the catalogue.** A person taps *Palettes* on the Atlas (05) and sees, top to bottom:

- **App bar:** `← Atlas`, and an outlined `+ Create New Palette` at the trailing end.
- **Title**, on its own row: *Palette Studio • 配色工房*.
- **Segmented choice:** *Curated Systems · My Custom Palettes*. The chosen segment carries its leading dot.
- **Palette cards**, in two forms:
  - **Form 1** (a palette system): the two-script title; a classification line; a provenance line; the palette as one joined band at its members' weights; under the band, each member's role, hex, kanji, romaji and English; *Intelligence Badges* (a floored WCAG ratio with its threshold, and a floored separation with its model); *Apply to Outfit Lab* and *Export Tokens*.
  - **Form 2** (a kasane): *Curated Palette*; the title; the layers as separate samples with the hex on each; two tags, *Kasane-inspired Layering* and the palette's classification.
- **Sticky bar:** *Export Selected as ASE / CSS / JSON / PDF*.
- **01's tab bar** below everything (C1/E4).

**16, the draft.** *+ Create New Palette*, or 08's *Add Pair to Palette Studio*, opens 16 on the same route:

- **App bar:** `← Palettes | Create Custom Palette | Save Palette`, with a rule under it.
- **Name card:** the name field, and three type chips (*Wardrobe Capsule · Seasonal Kasane · Seasonal*).
- **Four role slots**, two by two. Each has its heading, a bar sample, the hex, the name, the role, and *Locked* or *Replace*.
- **The live matrix:**
  - contrast of slot 1 against slot 2, printed as a WCAG ratio and an APCA Lc;
  - the colours' warm–cool relation in 07's words;
  - the floored separation with its model.
- **Corpus drawer:** horizontal tiles, each the colour with its kanji set vertically, paged by chevrons.
- **Action:** *Create & Save Palette →*.
- **Art:** the kimono line-art and the sashiko or asanoha pattern in the margins.

"Done", for a person:

- In both themes and both languages, the catalogue reads as 10 and the draft reads as 16.
- Every name, figure and provenance line is the corpus's, the store's or the engine's. Nothing printed is 10's or 16's sample text.
- Every drawn control works.
- A palette built in 16 validates against the corpus schema (FR-49), shows under *My Custom Palettes*, exports, and can be applied to the Outfit Lab.
- 08's *Add Pair* still opens a draft holding the pair.

---

## Findings from planning

Everything here comes from reading. Nothing was run.

### 1. The current Studio is neither 10 nor 16

**`apps/mobile/src/screens/PaletteStudio.tsx`** is one form-and-list page:

- the platform header (route `app/(tabs)/atlas/palettes.tsx:32`, `title: 'Irodora'`) and `Screen title={t('studio.title')}` (line 319);
- `studio.origin`;
- a name `TextField` with its visible label;
- a member card: a `Strip` at the judgeable floor (367–369), then per member a 48 dp swatch, four role chips, *Move up* and *Move down*, and *Remove*;
- an add card (`SearchField` and up to 8 matches, 111–126);
- *Save* with its reason (`draftProblem`);
- the FR-35 CVD card (`findSeparationProblems`, 175–186 and 476–542);
- the saved palettes with *Open*, *Delete* and *Start a new palette*, inside `Arrival`/`Appear` (560–605).

Other facts:

- `STATES = { absent: 'empty' }` (90).
- **`Member` is a component type defined inside the render** (226). That is the F-250 S3 lesson: it remounts its subtree on every keystroke. The rebuild must not repeat it.
- The screen shows **no corpus palette at all**. FR-22's curated palettes are not reachable from it.

### 2. The palette model the rebuild sits on

**`apps/mobile/src/palette.ts`:**

- A draft is `{ name, members: {slug, role}[] }`.
- `addMember` makes the first member the anchor and the rest neutrals (78–90).
- `draftOf(slugs)` builds 08's draft (97–100; E-227).
- `deriveWeights` is the rank ladder, 1 then 0.9 → 0.6 (153).
- `toCorpusRecord` **hard-codes `category: 'contemporary'`** (202). `toStoreWrite` does the same (346).
- `draftProblem` is the schema's verdict in words: `empty | noAnchor | noName | other` (276).
- `draftFrom` reopens a stored palette (353).
- The `PaletteStore` port has save, list and delete (49–53).

**`packages/corpus/src/palette.ts`:**

- Roles are `anchor, neutral, light, accent` (53).
- Categories are `contemporary, traditional, seasonal, kasane` (62).
- `checkKasane` (311–328) requires our-own classification and **at least 2 layers**. The ΔE00 > 5 layer floor is gate 11's corpus check (`kasaneEdges`), not `parsePalette`'s.

**The store** (`packages/store/src/repository.ts:230`): `StoredPalette` keeps `category`, `classification`, `versionId`, `createdAt`, and members in rank order with their colour rows. **No migration is needed** to store a category.

### 3. The corpus has 13 palettes, in two shapes

- **Five systems:** `quiet-neutrals`, `indigo-studies`, `forest-and-mineral` and `earth-and-clay` (contemporary, 7 members each), and `seasonal` (8 members). Every one has an anchor at rank 1 and at least one `light`.
- **Eight kasanes**, 3–4 layers each. `kasane-kinshu` and `kasane-mebuki` hold no `light`.
- All 13 are `japanese-inspired`, editorial source, reviewed by their own author.
- **10's two sample palettes exist by name.** *Quiet Neutrals* (ja 静かな中間色; 10 prints 静寂のニュートラル) and *Autumn Dew* 秋の露 (F-224 adopted 10's name, `kasane-aki-no-tsuyu.json:50`).
- The schema holds **no description field**. 10's *"Contemporary Japanese minimalist wardrobe palette."* has nothing to bind to.

### 4. What exists to compute 10's and 16's figures — none of it is re-implemented

| need | existing | where |
|---|---|---|
| WCAG ratio and APCA Lc of a pair | `compare(a, b).contrast` | `src/compare.ts:123` |
| 07's two-figure contrast words, floored | `contrastLine` | `src/wear.ts:620` |
| WCAG threshold words, floored ratio (08) | `flooredRatio`, `thresholdKey` | `src/compare-readout.ts:82, 92` |
| the worst separation of a pair over three deficiencies at severity 1 (E-005) | `worstSeparation` | `src/outfit/cvd.ts:112` |
| 07's separation words with the model | `separationLine` | `src/wear.ts:608` |
| warm–cool relation of a set, in 07's words | `warmCoolRelation` (E-226), `HARMONY_KEYS` | `recommendation/src/outfit-score.ts:198`, `src/temperature.ts:14` |
| FR-35 flag and swap | `findSeparationProblems`, `proposeAlternative` | `src/outfit/cvd.ts:173` |
| classification, source type and review words | `CLASSIFICATION_KEYS`, `SOURCE_TYPE_KEYS`, `reviewLine` | `src/detail.ts:54, 62, 278` |
| the Lab hand-off, top locked | `offerCombination`, `labDraftFrom` (E-219) | `src/outfit/fromWear.ts:34, 55` |
| export a corpus colour set or a stored palette | `combinationSubject`, `paletteSubject`, `exportSubjectFor` | `src/export/subject.ts:61, 105, 151` |

**Note.** 07 prints `componentOf(score,'cvdAccessibility').score`, which `componentScore` **rounds** (`outfit-score.ts:151`), so 99.5 prints 100. R9's E2 row for `00 10 15 16` requires *"prints 100 only when it is 100"*, so 10 and 16 **floor**. The session checks whether 07's rounding can print 100 for a non-100 score, and records it as a backlog feature if so. F-251 does not change 07.

### 5. The UI kit covers most of 10 and 16, and falls short in five places

**Already there:**

- `AppBar` has `title.placement: 'below'`, which is 10's own case (`AppBar.tsx:85`). It also has `back.ink: 'foreground.2'` and a labelled trailing `button`.
- `ActionBar` has a `note` line, 07's disabled-reason form (`ActionBar.tsx:69`).
- `ChoiceGroup segmented mark: 'dot'`.
- `Swatch`: `width`/`height="fill"`, `children`, `group={false}`, `corner`, `keyline`.
- `SelectionFrame` (E4's chosen sample), `Sheet` (03's floating sheet), `Illustration` with `kimono`, `leaves` and `sashiko`, `EmptyState`, `Arrival` and `Appear`.

**Short:**

- **`Strip`** forces `max(height, 77)` (`Pair.tsx:151`). 10's band is drawn 60 dp. This is OQ-45.
- **`Button`** cannot fill in `border.strong`. `tonal` takes level 2 or 3 (`Button.tsx:257–266`), and 10's export button reads `#464F58` (F-234). In Washi `border.strong` is `#1A1B1E`, the ink colour.
- **`ChoiceGroup` pills** take `radius 'md' | 'pill'` (`ChoiceGroup.tsx:167`). 16's type chips are drawn `sm`.
- **`TextField`** always draws a visible label above the field (`TextField.tsx:85–88`). 16 draws the field with no label.
- **Vertical (tategaki) text:** nothing exists. React Native has no vertical writing mode.

### 6. Old tests and records that assert the old Studio

**`apps/mobile/test/screens.test.tsx`:**

- the import (128);
- subjects `screens/PaletteStudio`, `(with a draft)` and `(CVD flag)` (2624–2673);
- the STATES map (3199);
- the FR-49 describe (3961–4071);
- the A11 headings describe (4074–4090);
- the route-source check (4129);
- the FR-35 describe (4702–4767);
- **the F-151 describe *"the Studio shows the palette as one thing"*** (5514–5567, including *"draws the strip at the judgeable height"* at 5564);
- the Arrival test (7052–7066);
- the LIST_SURFACES record `10.palette-1/-2` (7130).

**Elsewhere:**

- `chrome.test.ts`: `PLATFORM_HEADER['atlas/palettes']` (119), and the decoy at 178–185, which **uses `atlas/palettes`**.
- `compare-states.test.tsx:326–387`: reads the route's literal `draftOf(colours.split(COLOURS_SEPARATOR))`.
- `e2e/capture/routes.json:176–178`: anchor `studio.title`.
- `screen-insets.json:814–850`.
- `palette.test.ts`, `export-subject.test.ts`, `cvd-mode.test.ts`: kept and extended.

### 7. The inventories carry F-220's readings, and some are wrong or missing

**10.json:**

- `10.title` is `title 600` from a 34 px box. F-250 found 09's equivalent was `body`, so this is suspect.
- `10.back` binds `static:atlas.back`; F-246 and F-250 rebound it to `tab.atlas`.
- `10.create` acts `navigate:/atlas/palettes/new`, a route that does not exist.
- `10.palette-1.apply` acts `navigate:/wardrobe/lab`; the route is `/wardrobe/outfit`.
- `10.source.selected` reads `#343940`, nearer level 3 (F-232).
- **Missing:** the bullet separators drawn between the two badges and between the two tags.
- `10.art` could not be measured (R9 §5).

**16.json:**

- the tray's tile widths vary from 60 to 81 px (siblings, so one width);
- `16.next-card` is the 6.5 dp top of a card whose content no image draws;
- `16.art-right-bottom` is bound `sashiko`, but the brief says asanoha; the drawing looks circular. Increment 1 reads it.

**Both feed shared medians.** `SEGMENTED_HEIGHT` reads 10's segmented control, `ACTION_BAR_*` reads 10's bar, `APP_BAR_HEIGHT` reads 16's rule and `SELECTION_DOT` reads 16's dot (E-157). Re-measuring can move defaults on every screen (Risk 2).

### 8. Japanese

- ja `studio.title` is 配色スタジオ (`ja.ts:175`); 10's Japanese run is 配色工房.
- 05's chip `atlas.palettes` is 配色. That is a prefix of 配色工房, so it is kept; this differs from F-250, which re-valued 05's chip.
- The ja role words exist: 基準 · 中間 · 明色 · 差し色 (138–141).
- Palette names in ja are already in the font coverage (E-145).

### 9. OQ-45's evidence, gathered here

These figures use ADR-0095's own arithmetic: 1 dp = 0.15875 mm, viewing distance 350 mm, θ = 2·atan(s/2d).

| field | dp | angle |
|---|---|---|
| ADR-0095 floor | 77 | 2.00° |
| 10's band, drawn | 60 | **1.56°** |
| 16's slot sample | 35 | 0.91° |
| narrowest Quiet Neutrals segment at its weights, on a band about 320 dp wide | about 34 | **0.89°** |
| the CIE's lower bound of the 2° observer's domain | 38.5 | 1.00° |

- **ADR-0095 says the floor applies to the smaller dimension.** The corpus's systems have 7–8 members, so on 10's band the binding dimension is a segment's width, not the band's height. A 77 dp band would therefore not deliver 2° on 10.
- **The CIE's guidance** (as reported by Konica Minolta and X-Rite) gives the 2° observer's domain as **1°–4°**. ADR-0095 took 2° as a floor, which is stricter than that domain's lower edge.
- **Small-field tritanopia** is a central-foveal effect. Its zone reaches up to about 1° in some observers (Williams et al. 1981; Davies & Morland).
- **CIEDE2000's reference conditions** are a hairline-divided pair over more than 4° (ADR-0154, citing arXiv 1904.11293). Neither 60 dp nor 77 dp is that condition.

---

## Decisions

All five rest on R9 §11's delegation of 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–14 are not reopened. Full drafts are in Appendices A–E.

### D-1 (ADR-0162): OQ-45 for 10 and 16 — a catalogue shows a palette, a pair is judged; the floor stays where a difference is judged

- **The rule.** ADR-0095's floor binds a sample **presented for a person to judge a colour difference by eye beside the figure that measures it**: Compare (08), Contemporary's `Pair`, and 04's target bar (F-245 applies the rule).
- **It does not bind** a sample that **shows a palette for choosing or building**, whose figures are computed from the values and name their quantity and model.
- **10's band is drawn at its drawn height**, `BAND_HEIGHT` (60 dp; increment 1 confirms it). **16's slot samples are drawn at 35 dp.**
- **`Strip` gains `judged?: boolean`**, default `true` (the floor, unchanged). `judged={false}` honours the given height and must be set explicitly. `pair.test` keeps *"refuses to go under"* for the default, with a decoy.
- **No threshold moves:**
  - `size.judgeable` stays 77 dp, derived from `observerDegrees` 2, `viewingDistanceMm` 350 and `dpPerInch` 160 in the manifest;
  - `manifest.test` is unchanged;
  - Compare's `≥ floor at 320 dp` assertion is unchanged.
- **Supersedes in part:** F-151 c1 for 10 and 16 (R9 §10), and screens.test's *"draws the strip at the judgeable height"*. The replacement asserts the declaration: 10's band is `judged={false}` at `BAND_HEIGHT`, and every judging surface stays at or above the floor.
- **Not acted on, and recorded for the person.** The CIE's 1°–4° domain suggests ADR-0095's 2° floor is stricter than the standard requires. Changing `observerDegrees` would move a derived floor that every judging surface reads, so it is **a person's decision**, and F-251 does not need it.
- **⇄ the person can flip it:** *keep the floor on 10*. That draws the band 77 dp tall, 17 dp more than drawn on every form-1 card. On 16 it raises each slot sample to 77, adding about 42 dp per slot row.
- **OQ-45's seam half** (04's seam and one-sided outline) is untouched: 10 draws no seam. F-245 and F-260 apply the scope rule to 04 and 23 or revisit it, with a note on each.

### D-2 (ADR-0163): OQ-23 — square brackets around a label, heading, role or button text are notation

**Evidence:**

- ADR-0142 D3 already read 06's bracketed names (text, not pills) as notation, and R9 §2 reads them so in 05, 08 and 09.
- No platform guideline brackets a UI label.
- The one convention found brackets **UI labels inside documentation prose**, to mark them as labels (Rockwell Automation's conventions). That is a notation, which is the reading taken here.

**On 16:**

| drawn | becomes | why |
|---|---|---|
| *Slot 1 [Anchor / Dark Base]* | *Slot 1: Anchor / Dark Base* | the colon is 16's own label–value joiner, as in *[Role: Anchor]* |
| *[Role: Anchor]* | *Role: Anchor* | |
| *[Replace ↺]* | *Replace* and the `refresh` glyph | |
| *• [🔒 Locked]* | *• 🔒 Locked* | the dot stays: it is the on-state mark (ADR-0141's form) |

**On 10:** *[Anchor]* becomes *Anchor*.

**Scope.** OQ-23 closes as a rule. F-257, F-260 and F-263 apply it to 13, 17 and 18, and record any bracket they read as copy, with the reason.

### D-3 (ADR-0164): 10's and 16's figures and words say what the corpus, the store and the engine hold

**Card form, by category.** `kasane` → form 2 (layers drawn apart, outermost first, the hex on each, C8). Every other category → form 1. This holds for curated and personal palettes alike.

**Order.**

- *Curated Systems*: the 13 corpus palettes by `PALETTE_CATEGORIES` order, then slug. The first card is *Earth and Clay*; 10's *Quiet Neutrals* first is sample content (E1).
- *My Custom Palettes*: the store's order, newest first.

**Form 1:**

| element | binds to |
|---|---|
| title | `name.en • name.ja` (a personal palette has one name, printed once) |
| description (FR-23's displayed classification) | `‹category word› palette. ‹CLASSIFICATION_KEYS label›.` for a corpus palette; `studio.origin` for a personal palette (ADR-0067) |
| provenance line | *Provenance: ‹source-type word›, ‹reviewLine›* — 10's *Editorial verified* made true (F-084, F-247's words). A personal palette prints *Provenance: built on this device from corpus ‹versionId›* |
| band | every member, in rank order, at the record's weights (F-151's *order is proportion*, kept), `judged={false}` |
| columns beneath | four equal columns per row in rank order. Each holds the role word, the hex, `‹kanji› ‹Romaji›` and `(‹English›)` on two lines. With 7–8 members the columns run to a second row: they cannot align with the segments at readable sizes (E1/E3; the census states the sizes) |
| contrast badge | *WCAG ‹08's threshold words› ‹floored ratio›:1*, over the **contrast pair**: the anchor against the first `light` member by rank. With no `light` member there is no badge |
| separation badge | *CVD ‹n›% Separation (Machado 2009)*, adding *, approximate* when the worst deficiency is tritan (ADR-0131/0155 D4). n = `floor(min over pairs of worstSeparation)`. There is no badge under two members |

**Form 2:**

| element | binds to |
|---|---|
| kind label | *Curated Palette* for a corpus palette; *Your Palette* for a personal one |
| title | as form 1 |
| *Kasane no Irome:* prefix | dropped: it presents our curation as the Heian system (FR-23, C14). The record's name is *Autumn Dew* |
| layering tag | *Kasane-inspired Layering* (ja: the session writes it under ADR-0138 D4's 着想を得た form; no 伝統, no 平安) |
| provenance tag | the classification label for a corpus palette; *Made by you, on this device* for a personal one (ADR-0067) |

**Role words.** Each surface prints what it draws, from three literal maps over the schema's roles:

| map | anchor | light | neutral | accent |
|---|---|---|---|---|
| 10's column | Anchor | Light Ground | Mid Tone | Subtle Accent |
| 16's heading | Anchor / Dark Base | Light Ground | Mid Tone | Subtle Accent |
| 16's role, and `role.*` | Anchor | Light Ground | Mid Tone | Accent |

They are role names, an editorial statement of intent the schema records, not measurements. A test holds each map total over `PALETTE_ROLES`.

**16's matrix:**

| row | label | value |
|---|---|---|
| contrast | *Contrast Ratio (Slot 1 vs 2)* | `contrastLine`, *‹ratio›:1 · Lc ‹n›* — two figures (E2 row 07 16) |
| harmony | *Colour Harmony* (§2's en-GB bullet) | `HARMONY_KEYS[warmCoolRelation(colours).direction]` (07's words; *Tonal Kasane Complement* names a relation no engine computes and claims a tradition) |
| separation | *CVD Distinction* (07's label, without its colon) | `separationLine(floor(worst))` |

Under two colours a row prints *Choose two colours* (E4), not an invented figure.

**Type chips** map to categories:

- *Wardrobe Capsule* → `contemporary`;
- *Seasonal Kasane* → `kasane`;
- *Editorial* → *Seasonal*, `seasonal`. This is **an E2 row**: *Editorial* is the classification every device palette already holds, and its words present a person's palette as editorial work (ADR-0067). `traditional` is never offered: a person's palette is not traditional (FR-23).

**Titles:**

- the ja `studio.title` becomes **配色工房**, 10's run. The en title is *Palette Studio • 配色工房*; in Japanese it is 配色工房 alone (ADR-0142 D5's OQ-48 interim, applied, not decided);
- 16's title is *Create Custom Palette*, or *Edit Custom Palette* when editing (E4);
- the leaked route string is not design (already recorded).

### D-4 (ADR-0165): what the controls do, the route states, and what leaves

**Route states.** `/atlas/palettes` stays one route; 16 is its draft state (R9 §7; the README; `index.json` `variantFor`):

| URL | shows |
|---|---|
| `/atlas/palettes` | 10, *Curated Systems* |
| `?view=custom` | 10, *My Custom Palettes* |
| `?draft=new` | 16, an empty draft |
| `?draft=‹stored id›` | 16, editing that palette |
| `?colours=a,b` | 16 with 08's pair (E-227, kept; the route keeps the literal `draftOf(colours.split(COLOURS_SEPARATOR))`) |

The platform header leaves: `headerShown: false`, and `PLATFORM_HEADER['atlas/palettes']` is deleted in the same commit.

**10's controls:**

- **Back** → `router.navigate('/atlas')`.
- ***+ Create New Palette*** → `router.push('/atlas/palettes?draft=new')`.
- **The segmented choice** switches the view; the choice persists while the screen is open.
- ***Apply to Outfit Lab*** (form 1 only, as drawn) calls `offerCombination` (E-219), then `router.push('/wardrobe/outfit')`. The mapping:
  - top = the anchor, locked by `labDraftFrom`, unchanged;
  - trouser = the first non-accent member by rank after it;
  - shoe = the first accent, else the next unused member.

  The Lab draws nothing without a profile (`outfit.tsx:98`), so without a stored profile the button is disabled with 07's reason on a line under the card's actions (E4).
- ***Export Tokens*** → `/profile/export?palette=‹slug›&format=tokens` for a corpus palette, or `?saved=‹id›&format=tokens` for a personal one. `exportSubjectFor` gains both parameters; a parameter it cannot resolve exports nothing rather than another subject (08's M2 rule).
- ***Export Selected as ASE / CSS / JSON / PDF*** opens 03's floating sheet listing the current view's palettes, as a single-choice radio list. Choosing one opens Export with it and no format chosen (E4). The rest state stays as 10 draws it: no card is marked selected. Exporting several palettes into one file is not built (Out of scope).
- **A personal palette's card** carries 05's `more` glyph after its title (an undrawn surface composed from 05 and 03; E4). It opens 03's sheet with:
  - *Edit this palette*, which opens `?draft=‹id›`. It is disabled with its reason when the palette holds more than one colour per role, which old-Studio palettes can.
  - *Delete this palette*, on its own row, as F-152 placed it.
- **No personal palettes** shows 00's caption, resolved here: *+ Create New Palette* is on the screen.

**16's controls:**

- **Back** (*← Palettes*) returns to the catalogue.
- **The name field** is the person's text. Its placeholder carries the label's words, *Palette name*, while it is empty.
- **The type chips** form one radio group, *Type*. The chosen chip has its dot and its edge, as drawn.
- **The slots** are fixed by role in 16's order, `SLOT_ROLES = anchor, light, neutral, accent`. Rank is slot order among the filled slots, and weights come from `deriveWeights`.
- **Which slot is in hand:**
  - *Replace* puts its slot in hand;
  - on an empty draft, the first empty slot is in hand;
  - after a choice, the next empty slot comes in hand.
- **The tray's tiles:**
  - choosing a tile puts that colour in the slot in hand;
  - choosing a colour another slot holds **moves** it there; the slot it left empties. This is how FR-49's *reorder* survives;
  - choosing the in-hand slot's own (chosen) tile again empties the slot (*Remove from Slot n*, announced);
  - a locked slot refuses a move out of it.
- **Lock:**
  - 16 draws one locked slot, and *Locked* toggles it off;
  - a slot is locked when the draft arrives with a colour the person came with: 08's A, as 13 opens with the top locked (ADR-0152 D5);
  - a locked slot draws no *Replace*.
- **The tray:** the whole corpus in the Atlas's order (`allEntries()`), seven tiles a page. The chevrons step a page; the row also scrolls. The page holding the in-hand colour is shown when the draft opens.
- **The two saves.** Both submit through `toStoreWrite`, so the schema decides (FR-49):
  - ***Save Palette*** saves and stays. The id is held, so a second save updates the same record. The bar's note says *Saved to this device.*;
  - ***Create & Save Palette →*** saves and goes to `/atlas/palettes?view=custom`;
  - while the draft cannot be saved, both are disabled and the bar's note gives `draftProblem`'s sentence. That sentence gains `tooFewLayers` for a one-layer kasane, which the schema refuses.
- **FR-35 is kept (E4).** When `findSeparationProblems` reports a pair under 20, a block under the matrix's CVD row names the two slots and the proposed swap with its measured gain, and a *Replace Slot n* puts it in the slot (respecting the lock). It uses no status colour (F-069). 16's drawn state, a well-separated palette, shows nothing extra.

**Leaves the page:** the platform header; the visible name label; the member list with its role chips, *Move up*, *Move down* and *Remove*; the add card's search; *Open* and *Start a new palette*; the standalone CVD card; `studio.order`. Each capability is kept by the controls above.

### D-5 (ADR-0166): the composition, the art and the tray

- **Intervals:** the tables below, snapped per §2, with the tight ones named.
- **Page insets:** 10 is `md` (drawn 20 dp, a tie, so the smaller; ADR-0139). 16 is `xl` (drawn 38–40.5 dp; its margins hold the art).
- **Card sizes:**
  - form 2's layer cells are a quarter of the row each, read from the tree, at `LAYER_HEIGHT` (61.5). A 3-layer kasane leaves the fourth quarter empty;
  - 16's slot cells are half the content width, read from the tree.
- **10's sticky bar:** an `ActionBar` with one action filled in `border.strong`. In Washi that token is `#1A1B1E`, so the bar reads as a primary fill there (P4 applied, not taste; F-264 carries a note). The ink is declared as a gate-9 pairing per palette.
- **16's bottom chrome:** `Screen scroll={false} bleed`. The body is a scroller over the slots and matrix, then the tray fixed beneath it. `actionBar` holds *Create & Save →* with no rule, as drawn.
- **The tray:**
  - **Layout:** a peeking tile cut by the screen edge, a divider, ‹, seven tiles, ›, a divider, and a peeking tile.
  - **Tiles:**
    - each is a `Swatch` at the drawn size;
    - its kanji is set top to bottom by `Tategaki` (one upright character a line), in the sample's ink (`Text on`, ADR-0116);
    - the chosen tile takes `SelectionFrame`, which is 16's drawn frame.
  - **Targets:** the chevrons' targets stay inside the tray (the Android lesson).
- **Art:**
  - 10: one `leaves` backdrop at `opacity.art` beside the cards, behind them, its extent read in increment 1;
  - 16: `kimono` in the left margin, and on the right either `sashiko` twice or `sashiko` above a new drawing if increment 1 reads the lower one as a different pattern (asanoha or another; then a new drawing joins the set, `ILLUSTRATION_SET_VERSION` 1.2.0, F-229's method);
  - no word sits on a stroke.
- **`16.next-card`** is recorded as not design (its content is drawn nowhere). §2's cut-page bullet is extended.
- **Tab bar:** 01's, below both screens' action bars (C1, E4).

---

## Implementing session's decisions on this design

**After increment 1 (2026-11-02), where the measurement moved the plan:**

- **Every corner on both screens is `sm`** (corner fits: 10's cards 15.2 px, band 11, layers 12, buttons 9,
  Create 7.75; 16's name card 10.5, slot 1 10.25, matrix 9, samples 7.75, field 10–10.5). F-220 had `md`
  for 10's cards, band, layers and buttons and 16's matrix. The badges and tags are pills. The censuses
  move: cards 64 → 60 `md` (16's cut card leaves too: filled and edged 83/90 → 82/89), samples 47 → 51
  `sm` (10's four layers), joined samples 4 → 3 `md` (`STRIP_CORNER` stays `md`).
- **Type:** the small type on both is `caption`; 10's title body 600, its Apply and Export body, the
  export bar's button label; 16's title, field and tray kanji label, everything else caption (the hexes
  and matrix title 600).
- **Fills:** 10's chosen segment, badges and tags are level 3; 10's export button is `border.strong`.
- **Two bullets** on 10 (the badges' and tags' separators), `text.secondary`.
- **The tray's tiles are drawn whole** (the darkened lower half is not the colour; E1), one width.
- **16's lower right art** is a basket weave in a circle; `sashiko` stands for it (ADR-0166 D7).
- **16's cut card** is not design (presentation).
- **Three of 10's container boxes** (the segmented control, Create, the band) stay as F-220 read them:
  they feed shared medians read one way (ADR-0161 D8; F-282). `BAND_HEIGHT` is 60.
- **Records:** ADR-0162 to ADR-0166 written from Appendices A–E with the census; R9 §2, §4, §8, §10, §11
  and PRD §10 amended; OQ-23 closed; OQ-45 answered for 10 and 16; F-357 filed (07's separation is
  rounded where 10 and 16 floor; 16 corpus pairs lie in [99.5, 100)). The plan's quotations of 10's
  and 16's drawn safety constructions carry `claims-ok` markers.

**After increment 2 (2026-11-02):**

- **16's chosen type chip is filled level 3** (#31363A–#33373B inside, above and below its words); the
  others and the name field hold the card's ground. F-220 recorded no fill; `16.mjs` now does. So the
  chips are `pills` with `selectedFill: 'surface.3'`, the default outlined rest, `radius: 'sm'` —
  `selectedFill: 'none'` was not needed.
- **`border.strong` pairs** with `foreground` (dark) and `accent.foreground` (Washi), not
  `background`: `background` is not a text token, and in Washi `accent.foreground` is the same
  #F6F5F2, the primary's ink on the primary's fill. Its `uncheckedReason` gives way to the pairings;
  the suite's `DECLARED_PAIRINGS` reads Sumi's, and Washi's reading is already covered there.
- **`TextField`** takes `height`, `radius` and `size` as well as `labelPlacement`: 16's field is
  outlined, unfilled, 27 dp, `sm`, its words `label` — `SearchField`'s drawn form (F-246), the
  touch kept at the platform's target by negative margins.
- **`Tategaki`** advances each character by its em at the person's text size (not the Japanese line
  height, which would stack two characters 49 dp tall in a 56.5 dp tile), and exports
  `tategakiReady` for a corpus test (increment 3). It splits by a base character with its marks
  (`tategakiCharacters`), so a combining voiced mark or a variation selector stays on its line.

**After increment 3 (2026-11-02):**

- **The contrast badge prints the ratio floored to ONE place** (10 draws *8.4:1*), and the threshold
  from that printed ratio; ADR-0164's census lists two places, the precision it was computed at.
- **A personal palette's card shows the colours it holds as stored** (the row's hex and a `Color`
  from its XYZ, via the wardrobe's `colorOf`), its names from the bundle where the bundle holds the
  slug; a curated card's members come from the bundle, and a member it does not hold is a corrupt
  bundle and throws (gate 11 holds the invariant).
- **The figures compute on the bundle's derived sRGB where it holds the entry**, as 08's do, so the
  same pair prints the same ratio on 08, 10 and 16.
- **`draftOf` locks the anchor**, as an optional `locked` field on the draft; `category` is optional
  too, so every draft built before F-251 is unchanged. `reviewLineOf` takes any record's provenance,
  and `reviewLine` delegates to it.
- **The draft's 96 shapes** are judged against `parsePalette` directly; `tooFewLayers` is chosen only
  for a named, anchored, one-layer kasane.
- **Fonts:** 襲, 控 and 厳 joined the Noto Sans JP subset.

---

## Approach

### Reused (paths)

**`@irodora/ui`:**

- `Screen` (`appBar`, `actionBar`, `scroll={false} bleed`, `script`) and `AppBar`:
  - `back` with `glyph`, `label`, `name`, `size`, `ink`;
  - `title` with `placement: 'below'` (10) or `align: 'centre'` (16), and `ja`;
  - `trailing.button` (secondary, `edge`, `glyph` `plus`);
  - `rule`, `height`, `inset`.
- `ActionBar` (`note`, `rule`, `padding`).
- `Card`, `Strip`, `Swatch` (`children`, `group={false}`, `corner`, `keyline`, `width`/`height`), `swatchAccessibleName`, `Text on={sample}`.
- `ChoiceGroup` (`segmented` with `mark: 'dot'`; `pills`), `Chip`, `Button` (`glyphTint: 'glyph.lock'`, `selected`).
- `TextField`, `Sheet`, `SelectionFrame`, `SelectionDot`, `Illustration` (`leaves`, `kimono`, `sashiko`), `EmptyState` (`resolvedHere`), `Arrival` and `Appear`, `Row` and `Stack`, `BILINGUAL_SEPARATOR`.

**`apps/mobile/src`:**

- `palette.ts` (every existing function; `draftOf` unchanged).
- `corpus/index.ts`: `allPalettes`, `allEntries`, `entryBySlug`, `colorFor`, `CORPUS_LABEL`.
- `compare.ts#compare`, `compare-readout.ts#flooredRatio` and `#thresholdKey`.
- `wear.ts#contrastLine` and `#separationLine`, `temperature.ts#HARMONY_KEYS`.
- `outfit/cvd.ts#worstSeparation`, `#findSeparationProblems`, `HARD_TO_SEPARATE`.
- `detail.ts#CLASSIFICATION_KEYS`, `#SOURCE_TYPE_KEYS`, `#reviewLine`.
- `outfit/fromWear.ts#offerCombination` and `#labDraftFrom` (unchanged).
- `export/subject.ts` (`paletteSubject`, `combinationSubject`'s `corpusColour`).
- `profile/store#activeProfile`, `i18n` (`useMessages`, `japaneseRun`), `states.ts`, `notation.ts#capitalised`, `atlas.ts`'s order (`allEntries`).

**Packages:**

- `@irodora/corpus`: `PALETTE_ROLES`, `PALETTE_CATEGORIES`, `parsePalette`, `KASANE_MIN_LAYERS`.
- `@irodora/recommendation#warmCoolRelation`.

**Tests and tools:**

- `test/inventory.ts`; `screens.test.tsx` (`draw`, `ENROLLED`, `fakeStore`).
- The F-248, F-249 and F-250 fidelity helpers (`el()` from the pixels, `snap`, `belowTheScale`, `inOrder`).
- `compare-states.test`'s route-body reader.
- The `mockups/tools/*.ps1` methods and `generate-inventory.mjs`.
- `generate-e2e-flows.mjs`, `verify-font-coverage.mjs`, `generate-font-subset.mjs`; `pnpm fidelity:capture`.

### New

**`apps/mobile/src/palette.ts`** (additive; nothing removed):

- `SLOT_ROLES = ['anchor','light','neutral','accent'] as const`. A test holds it a permutation of `PALETTE_ROLES`, so a fifth role fails.
- `PaletteDraft` gains `category: 'contemporary' | 'seasonal' | 'kasane'` (default `contemporary`) and `locked: ReadonlySet<PaletteRole>`.
- Draft functions:
  - `inSlotOrder(draft)`;
  - `choose(draft, role, slug)`, which moves a colour held elsewhere and refuses out of a locked slot;
  - `clearSlot(draft, role)`, `toggleLock(draft, role)`, `setCategory(draft, c)`.
- Slot fit:
  - `fitsSlots(members)`: at most one member per role;
  - `draftFromStored(stored)`: `null` when it does not fit.
- `draftOf` gains a second, optional result: the roles it locks (A's).
- `toCorpusRecord` and `toStoreWrite` write `draft.category`.
- `DraftProblem` gains `'tooFewLayers'`.

**`apps/mobile/src/palette-readout.ts`** (pure; `compare-readout.ts`'s counterpart):

- Catalogue order and form: `curatedOrder()`, `cardForm(category)`.
- The card's words: `titleLine`, `descriptionLine`, `provenanceLine`, `columnLines`, `kindLabel`, `layeringTag`, `provenanceTag`.
- The badges' inputs: `contrastPair(members)` and `paletteSeparation(colours)`, returning `{ score, worst: Deficiency }`; the badges' words: `contrastBadge`, `separationBadge`.
- The matrix: `matrixRows(draft, t, script)`.
- The Lab hand-off: `labHandOff(members)` → `WornCombination`.
- `exportHref(palette, format?)`.
- The tray: `trayPages(entries, size = 7)`, `pageOf(slug)`.
- Literal maps, so the unused-key scan sees each reader: `CATEGORY_KEYS`, `COLUMN_ROLE_KEYS`, `SLOT_HEADING_KEYS`, `ROLE_KEYS`, `TYPE_KEYS`, `PROBLEM_KEYS`.
- The drawn constants, each recomputed from the JSON by the fidelity tests:
  - **10's:** `STUDIO_APP_BAR`, `BACK_GLYPH_10`, `CREATE`, `CREATE_GLYPH`, `SOURCE_HEIGHT`, `BAND_HEIGHT`, `BADGE`, `CARD_ACTION`, `LAYER_HEIGHT`, `EXPORT_SELECTED`, `STUDIO_ART`;
  - **16's:** `BUILDER_APP_BAR`, `BACK_GLYPH_16`, `SAVE`, `NAME_FIELD`, `TYPE_CHIP`, `SLOT_SAMPLE`, `LOCK_GLYPH_16`, `REPLACE_GLYPH`, `MATRIX_VALUE_COLUMN`, `TILE_WIDTH`, `TILE_HEIGHT`, `CHEVRON_GLYPH`, `CREATE_AND_SAVE`, `ARROW_GLYPH`, `BUILDER_ART`.

**`apps/mobile/src/export/subject.ts`** (additive): `curatedPaletteSubject(published)`, titled `name.en`. `exportSubjectFor` gains `palette?` and `saved?`, read after `pair` and before `colours`.

**`apps/mobile/src/screens/PaletteBuilder.tsx`** (new, 16) and **`PaletteStudio.tsx`** (rebuilt as 10). Each exports its `STATES`. Every inner component is at module scope and memoised (F-250 S3).

**`@irodora/ui`** (additive; without the new prop the old tree renders, and a decoy proves it):

| component | change | forced by |
|---|---|---|
| `Strip` (`Pair.tsx`) | `judged?: boolean`, default `true`. `false` honours `height` below the floor | ADR-0162 |
| `Button` | `variant: 'tonal', level: 'strong'`: fill `border.strong`, ink from a declared gate-9 pairing per palette | `10.export-bar.button`; ADR-0166 |
| `ChoiceGroup` pills | `radius: 'sm'`; and `selectedFill: 'none'` only if increment 1 reads 16's chosen chip as unfilled | `16.name.kind.*` |
| `TextField` | `labelPlacement?: 'above' \| 'inside'`. `inside` draws no label row; the label's words are the placeholder (shown while empty) and the accessible name | `16.name.field`; ADR-0165 |
| `Tategaki` (new) | a string set one upright character a line, accessible as one node (the whole string), its ink passed through (`on`) | `16.tray.chip-*` |

### The composition, as a sketch

```tsx
// 10 — PaletteStudio
<Screen scroll script={script}
  appBar={{ height: STUDIO_APP_BAR, inset: /*Inc 1*/, rule: false, script,
    back: { glyph: 'back', label: t('tab.atlas'), name: t('detail.backToAtlas'), size: BACK_GLYPH_10, onPress: onBack },
    title: { text: t('studio.title'), ...(script === 'japanese' ? {} : { ja: japaneseRun('studio.title') }),
             align: 'leading', placement: 'below', layout: 'inline', size: /*Inc 1*/, weight: 600 },
    trailing: { button: { variant: 'secondary', edge: 'border', glyph: 'plus', label: t('palettes.create'),
                          height: CREATE, radius: 'md', onPress: onCreate, testID: 'studio.create' } } }}
  actionBar={{ actions: [{ variant: 'tonal', level: 'strong', label: t('palettes.exportSelected'),
                           height: EXPORT_SELECTED, radius: 'md', onPress: openChooser }],
               padding: { top: /*Inc 1 lg*/, side: md, bottom: /*Inc 1*/ } }}>
  <ArtLayer name="leaves" frame={STUDIO_ART} />
  <ChoiceGroup segmented={{ mark: 'dot', height: SOURCE_HEIGHT, radius: 'pill', edge: 'border', selectedFill: /*Inc 1*/ }}
    label={t('palettes.view')} value={view} onChange={setView}
    options={[{ value: 'curated', label: t('palettes.curated') }, { value: 'custom', label: t('palettes.custom') }]} />
  <Arrival>{cards.map((p, i) => <Appear key={p.key} index={i}>
    {p.form === 1 ? <SystemCard palette={p} … /> : <LayerCard palette={p} … />}</Appear>)}</Arrival>
  {/* empty custom view: <EmptyState message hint resolvedHere /> */}
</Screen>

// SystemCard (module scope, memo): Card level 1 md, edge border.subtle
//   title (body 600?) · description · provenance · <Strip judged={false} height={BAND_HEIGHT} corner="md" keyline
//   members weights /> · columns (4 per row) · 'Intelligence Badges' · Row[contrastBadge • separationBadge]
//   · Row[Apply (secondary, border), Export Tokens (secondary, border)] · [note when Apply disabled]
// LayerCard: kind · title · Row[4 quarter cells: Swatch width="fill" height={LAYER_HEIGHT} corner="md" keyline
//   + Text on hex] · Row[tag • tag]

// 16 — PaletteBuilder
<Screen scroll={false} bleed script={script}
  appBar={{ height: BUILDER_APP_BAR, rule: true, inset: md,
    back: { glyph: 'back', label: t('palettes.backLabel'), name: t('palettes.backToCatalogue'), ink: 'foreground.2', size: BACK_GLYPH_16, onPress: onBack },
    title: { text: t(editing ? 'palettes.editTitle' : 'palettes.createTitle'), align: 'centre', placement: 'bar', layout: 'inline', size: 'label', weight: 600 },
    trailing: { button: { variant: 'secondary', edge: 'border.strong', label: t('palettes.save'), height: SAVE, radius: 'sm',
                          disabled: problem !== null, onPress: save, testID: 'builder.save' } } }}
  actionBar={{ rule: false, actions: [{ label: t(editing ? 'palettes.saveChanges' : 'palettes.createAndSave'),
               glyph: 'arrow-right', height: CREATE_AND_SAVE, radius: 'sm', disabled: problem !== null, onPress: saveAndGo }],
               note: problem ? t(PROBLEM_KEYS[problem]) : saved ? t('studio.saved') : undefined, padding: { side: xl, … } }}>
  <View style={{ flex: 1 }}>
    <ScrollView>{art layer}{name card}{slots 2×2}{matrix}{FR-35 block when flagged}</ScrollView>
    <Tray pages page onPage chosen={inHandSlug} onChoose />   {/* fixed above the action bar */}
  </View>
</Screen>
```

### Drawn intervals, from F-220's boxes at 0.5 dp/px, insets subtracted

Line insets as F-249 tabulated them (latin / ja): title 2.2 · body 5.2 / 6.8 · label 3.85 / 5.165 · caption 2.575 / 3.51.

**Increment 1 re-reads every box to its edge, not its shadow's foot (F-250 S1). The fidelity tests recompute every row from the pixels (F-248's lesson), so any row below may move.**

#### 10

| interval | px | dp | less | built | snap |
|---|---|---|---|---|---|
| back left · Create right | 44 · 40 | 22 · 20 | — | | `inset` from Inc 1 (see Risk 2 on `APP_BAR_INSET`) |
| Create height | 48 | 24 | — | | `CREATE` |
| bar controls → title | 30 | 15 | 5.2 (if `body`) | 9.8 | `sm` |
| title → segmented (the leaked label's space kept) | 65 | 32.5 | 5.2 | 27.3 | `lg` |
| page inset | 40 | 20 | — | | `md` (tie, so the smaller; ADR-0139) |
| segmented height · chosen inset | 66 · 9 | 33 · 4.5 | — | | `SOURCE_HEIGHT` · Inc 1 |
| segmented → card 1 | 30 | 15 | — | | `md` |
| card side padding | 31 | 15.5 | — | | `md` |
| card top → title | 35 | 17.5 | 5.2 | 12.3 | `md` |
| title → description | 19 | 9.5 | 9.05 | 0.45 | **named, `xs`** |
| description → provenance | 7 | 3.5 | 7.7 | **−4.2** | **named, `xs`** |
| provenance → band | 29 | 14.5 | 3.85 | 10.65 | `sm` |
| band height | 120 | 60 | — | | `BAND_HEIGHT` (ADR-0162) |
| band → role | 14 | 7 | 3.85 | 3.15 | `xs` |
| role → hex | 8 | 4 | 7.7 | **−3.7** | **named, `xs`** |
| hex → names | 8 | 4 | 6.425 | **−2.4** | **named, `xs`** |
| names → badges label | 26 | 13 | 6.425 | 6.6 | `sm` |
| badges label → badges | 6 | 3 | 3.85 | **−0.85** | **named, `xs`** |
| badge height | 38–39 | 19–19.5 | — | | `BADGE` (siblings across both cards: one) |
| badges → buttons | 23 | 11.5 | — | | `sm` |
| button height · gap | 55 · 12 | 27.5 · 6 | — | | `CARD_ACTION` · `xs` (tie) |
| buttons → card foot | 25 | 12.5 | — | | `md` |
| card → card | 23 | 11.5 | — | | `sm` |
| card 2 top → kind | 31 | 15.5 | 3.85 | 11.65 | `sm` |
| kind → title | 12 | 6 | 9.05 | **−3.05** | **named, `xs`** |
| title → layers | 23 | 11.5 | 5.2 | 6.3 | `sm` |
| layer cell · gap | 147–150 × 122–125 · 10–11 | 73.5 × 61.5 · 5–5.5 | — | | a quarter of the row (**from the tree**) × `LAYER_HEIGHT` · `xs` |
| hex on a layer: leading · foot | 28 · 13–14 | 14 · 6.5–7 | | | Inc 1 |
| layers → tags | 23 | 11.5 | — | | `sm` |
| tags → card foot | 16 | 8 | — | | `sm` |
| bar: rule → button · side · foot | 50 · 40 · 43 | 25 · 20 · 21.5 | — | | `lg` · `md` · `lg` |
| export button height | 58 | 29 | — | | `EXPORT_SELECTED` |

#### 16

| interval | px | dp | less | built | snap |
|---|---|---|---|---|---|
| bar height (to the rule's top) | 98 | 49 | — | | `BUILDER_APP_BAR` |
| back left · Save right · Save height | 33 · 27 · 51 | 16.5 · 13.5 · 25.5 | — | | Inc 1 · `md` · `SAVE` |
| rule → name card | 26 | 13 | — | | `md` |
| page inset | 76–81 | 38–40.5 | — | | `xl` |
| name card padding side · top | 21 · 22 | 10.5 · 11 | — | | `sm` · `sm` |
| field height | 54 | 27 | — | | `NAME_FIELD` |
| field → chips | 9 | 4.5 | — | | `xs` |
| chip height · gap | 40–42 · 11 | 20–21 · 5.5 | — | | `TYPE_CHIP` · `xs` |
| chips → card foot | 21 | 10.5 | — | | `sm` |
| name card → slots | 23 | 11.5 | — | | `sm` |
| slot column gap · row gap | 16 · 13 | 8 · 6.5 | — | | `sm` · `sm` |
| slot side · top | 19–20 · 18 | 9.5–10 · 9 | 2.575 | 6.4 | `sm` · `sm` |
| heading → sample | 9 | 4.5 | 2.575 | 1.9 | **named, `xs`** |
| sample height | 68–70 | 34–35 | — | | `SLOT_SAMPLE` (siblings) |
| sample → hex | 12 | 6 | 3.85 | 2.15 | `xs` |
| hex → name | 7 | 3.5 | 6.425 | **−2.9** | **named, `xs`** |
| name → foot row | 18 | 9 | 5.15 | 3.85 | `xs` |
| foot → slot bottom | 15 | 7.5 | 2.575 | 4.9 | `xs` |
| slots → matrix | 20 | 10 | — | | `sm` |
| matrix top → title | 20 | 10 | 3.85 | 6.15 | `sm` |
| title → rule 1 | 11 | 5.5 | 3.85 | 1.65 | **named, `xs`** |
| rule → row label | 21 | 10.5 | 3.85 | 6.65 | `sm` |
| value column (from the card's edge) | 402 − 80 | 161 | — | | `MATRIX_VALUE_COLUMN` (07's `LABEL_COLUMN` form) |
| tray height · tile height | 149 · 113 | 74.5 · 56.5 | — | | Inc 1 · `TILE_HEIGHT` |
| tile width · gap | 60–81 · 12–14 | 30–40.5 · 6–7 | — | | `TILE_WIDTH` (median; siblings) · `sm` |
| chevron | 27 × 30 | 13.5 × 15 | — | | `CHEVRON_GLYPH` |
| tray → action · action height · side | 16 · 61 · 79 | 8 · 30.5 · 39.5 | — | | `sm` · `CREATE_AND_SAVE` · `xl` |

**Heights the scale makes taller than drawn.** These are estimates: a test tree has no layout, so ADR-0166 states them and the capture shows them.

| region | drawn | built (estimate) | why |
|---|---|---|---|
| form 1 card | 296 | ≈ +45 for a second column row (7–8 members), plus +4 per named interval | the corpus's systems have 7–8 members |
| a badge or tag that wraps | 19.5 | grows (E3, F-247's wrapping badge) | *CVD ‹n›% Separation (Machado 2009)*; the classification label |
| 16's slot | 112 | ≈ 115–125 | names wrap in 128 dp at 320 |
| page | — | scrolls under the bar | §2: a render is one scroll position |

---

## Increments

Every commit passes **Tier 1** (ADR-0132):

`pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'`

`pnpm lint` is the root lint. It includes `verify:claims`, `verify-mockups`, `mockup-inventory --check`, `verify-app-glyphs` and `verify-route-targets`. Domain gates are named under each step.

### 0. Claim and plan

- This file goes to `.harness/plans/F-251-palette-studio-is-mockup-10-and-building-a-palette-is-16.md`.
- F-251 is already `in_progress` with `plan` set; confirm both. Add `attested` (Appendix F).
- `openQuestions: ["OQ-45"]` stays until increment 1's ADR closes it.
- Gates: `node scripts/verify-state.mjs`, `pnpm format:check`.

### 1. Measure, decide, specify (no source)

**How to read the image.** As in F-248 to F-250:

- PowerShell's execution-policy bypass is refused here, so use a scratch Node reader in the session's scratchpad. It decodes `mockups/10_palette_studio.jpg` and `16_palette_builder_custom.jpg` with `jpeg-js` through `createRequire(apps/mobile/package.json)`.
- It reimplements only what each `.ps1` documents: `measure.ps1`, `corner.ps1`, `tint.ps1`, `stem.ps1`, `art-measure.ps1`.
- Every reading goes into the `.mjs` header with its box, background, threshold and method.
- The reader is not committed.

**Re-read every box, type, corner, fill, edge and ink, to the edge and not the shadow:**

| region | read | lands in |
|---|---|---|
| 10 header | the bar's extent; back's em, weight, ink and arrow ink; Create's height, corner, edge and plus ink; **the title's cap height and kanji ink, and its weight** (expected `body` 600, not `title`) | `10.header`, `10.back` (rebind `static:tab.atlas`), `10.create` (action `navigate:/atlas/palettes?draft=new`), `10.title.type`; `STUDIO_APP_BAR`, `BACK_GLYPH_10`, `CREATE_GLYPH` (ink × 24 ÷ the path's extent, less `size.iconStroke`) |
| 10 segmented | container height, edge and corner; the chosen fill (`#343940` → level 3?); the dot; both labels' em and ink | `SOURCE_HEIGHT`; `selectedFill`; check `SEGMENTED_HEIGHT`'s median (Risk 2) |
| 10 card 1 | corner, edge, fill; title, description and provenance type; the band's height, corner and keyline (`raw.keylinePx`); columns' type and ink; badges' height, fill, corner and type; **the bullet between the badges**; buttons' height, corner, edge and type | add `10.palette-1.badges.sep`; `BAND_HEIGHT`, `BADGE`, `CARD_ACTION` |
| 10 card 2 | kind, title, layer cells (corner, keyline, hex type and ink, C8); tags; **the bullet between the tags**; the card's foot under the bar | add `10.palette-2.tags.sep`; `LAYER_HEIGHT` |
| 10 bar | rule, padding, fill (`#464F58`), corner, type | `EXPORT_SELECTED`; check the `ACTION_BAR_*` medians |
| 10 art | the leaves' true extent, `inkP90`/`inkP50` on the ground away from the cards | `10.art` box; `STUDIO_ART` |
| 16 header | rule top, back (ink `text.secondary`?), title type, Save's edge (`border.strong`?), corner and height | `BUILDER_APP_BAR`, `BACK_GLYPH_16`, `SAVE` |
| 16 name card | the field's edge, corner and type; chips' height, corner, **fill and edge, chosen and not**, the dot | `NAME_FIELD`, `TYPE_CHIP`, `selectedFill` |
| 16 slots | heading type and weight; the sample (130.5 × 35, `sm`, keyline width); hex 600; name; role; the lock badge (dot, glyph ink `glyph.lock`, word); Replace's glyph ink; the brackets' crops | `SLOT_SAMPLE`, `LOCK_GLYPH_16`, `REPLACE_GLYPH`; `notDesign`: the brackets |
| 16 matrix | corner, title, rules, the label and value columns' type and ink | `MATRIX_VALUE_COLUMN` |
| 16 next card | what is drawn | `notDesign` (`presentation`, *a card's top whose content no image draws*) |
| 16 tray | borders; dividers; **one tile width** (siblings); tile height and corner; **the band across a tile's lower half: a fill, an overlay, or the sample?**; tategaki em and ink; the chosen tile's frame; chevrons | `TILE_*`, `CHEVRON_GLYPH`; the tile's structure |
| 16 action | height, corner, fill, type, the arrow's ink | `CREATE_AND_SAVE`, `ARROW_GLYPH` |
| 16 art | the kimono's extent and ink; **the two right-hand drawings: both sashiko, or one asanoha (or another pattern)?** | the `16.art-*` bindings; a new drawing only if read so |

**Census.** A scratch script over the corpus and the store's schema; its numbers go into the ADRs.

- For each of the 13 palettes:
  - member count, roles, weights, category;
  - contrast pair, floored ratio and threshold;
  - floored separation and the worst deficiency;
  - the Lab hand-off it makes;
  - its narrowest band segment at 320, 360 and 384 dp, in dp and degrees.
- Whether any palette's rank 1 is not the anchor.
- The palettes with no `light` member, and so no contrast badge.
- Every corpus `name.kanji`'s characters, flagging any whose vertical form differs (ー, 〜, small kana, brackets). This decides `Tategaki`'s scope.
- The longest `kanji Romaji (English)` column, and whether it fits 78 dp in two lines.
- The tray's page count (120 / 7) and the page of every entry.
- `paletteSeparation` against `cvdAccessibility`'s worst for the same colours (one definition; they must agree before rounding).
- The light palette's ink on `border.strong`, and its ratio in all four palettes.
- The draft shapes `draftProblem` can meet: 16 slot subsets × name empty or not × 3 categories = 96.

**`10.mjs` and `16.mjs` edits, then regenerate both JSON files:**

- The re-measured boxes, types, corners and inks.
- The separators added.
- Bindings: 10's columns → `corpus:palette.colours.N.*`; badges → `engine:palette.contrast`, `engine:palette.separation`; 16's matrix rows → `engine:draft.*`; the tray → `corpus:tray.N`.
- Actions: `10.palette-1.apply` → `navigate:/wardrobe/outfit`; `10.palette-1.export` → `navigate:/profile/export?palette=`; `10.create` → `navigate:/atlas/palettes?draft=new`; `16.back` → `navigate:/atlas/palettes`.
- `notDesign`: the brackets (both images); 16's next card.
- `departures`:
  - **E1:** names, hexes, figures, provenance lines, the *Kasane no Irome:* prefix, the name field's text, the tray's tiles;
  - **E2:** the badges, the tags, the matrix's three values, the *Editorial* chip;
  - **E3:** wraps, dots, frames, hit areas;
  - **E4:** the empty draft and slot, the edit state, the export chooser, the overflow sheet, Apply disabled, FR-35's block, the tab bar.
- `conflicts`: C8 (form 2's hex; tray kanji), C11 (unchanged), C14.

**Records:**

- Write ADR-0162 to ADR-0166 and add their rows to `docs/adr/README.md`.
- R9:
  - **§2:** the bracket bullet gains *headings, roles and unoutlined buttons* (`10 16`; OQ-23's rule); *Color Harmony*; the 16 next card;
  - **§4 E1:** a 10/16 bullet;
  - **§4 E2:** the rows for 10's badges and tags, 16's *Editorial* chip and *Tonal Kasane Complement*;
  - **§4 E3:** the chosen chip and tile, wraps;
  - **§4 E4:** the bullet list in D-4;
  - **§6 C8:** 10's `palette-2.swatch-N.hex` and 16's tray;
  - **§8:** the `10` and `16` rows rewritten (Appendix F);
  - **§10:** F-151 c1 in part, the old Studio's controls;
  - **§11:** OQ-45 answered for 10 and 16 by ADR-0162 (the seam half and 04 and 23 still F-245's and F-260's); OQ-23 closed by ADR-0163.
- PRD §10: the OQ-23 and OQ-45 rows follow.
- `feature_list.json`:
  - F-251's notes; `openQuestions: []` once ADR-0162 lands;
  - notes on F-245 and F-260 (OQ-45's rule), F-257 (OQ-23's rule; FR-35's surface; 10's Lab hand-off), F-263 (OQ-23; the `palette` and `saved` parameters; *Export Selected* as single), F-264 (the export bar's light form), F-265 (配色工房; the ja role words; the ja classification label on palettes), F-267 (the expected differences) and F-344 (badges and tags at 200 %).
- **New backlog feature, only if the census confirms 07's rounding can print 100 for a non-100 score:** F-357 (Appendix F).

**Gates:** Tier 1, plus `type-scale.test` (E-152); the ui recompute tests (`segmented-choice.test`, `action-bar.test`, `app-bar.test`, `sample-family.test`, `swatch-corners.test`, the chip-height and selection-dot tests, all through the turbo filter); `node scripts/verify-state.mjs`.

### 2. `@irodora/ui`

**What changes:** `Strip judged`, `Button tonal 'strong'`, `ChoiceGroup` pills `radius 'sm'` (and `selectedFill 'none'` if read), `TextField labelPlacement`, `Tategaki`.

**The `border.strong` ink:** declare its pairing per palette in the manifest. That **adds** a gate-9 pairing and lowers none. Run `generate-design-tokens --check`.

**Tests:**

- `pair.test`:
  - `judged={false}` honours 60;
  - the default still floors 60 to 77 (decoy);
  - `Pair` is unchanged.
- `button.test`:
  - the strong fill in all four palettes, its ink at or above 4.5:1 through the declared pairing;
  - the tonal level-2 and level-3 trees unchanged (decoy).
- ChoiceGroup: the `sm` corner; the default pill unchanged.
- TextField:
  - `inside` draws no label row, and its placeholder and accessible name are the label;
  - the default unchanged (decoy).
- `tategaki.test`:
  - one node per character, in order;
  - one accessible node holding the whole string;
  - the ink passed through.
- New conformance subjects: `Strip (shown)`, `Button (tonal, strong)`, `TextField (label inside)`, `Tategaki`.

**Gates:** Tier 1, `pnpm test:a11y`, `pnpm test:contrast`, `pnpm test:cvd`, `generate-design-tokens --check` (if the manifest moved).

### 3. Pure logic

**Code:**

- the `palette.ts` additions;
- `palette-readout.ts`;
- the `export/subject.ts` additions.

**Catalogue keys read through the literal maps** (en and ja): `palettes.category.*`, the three role maps, `palettes.type.*`, `studio.problem.tooFewLayers`, the badge, tag and kind words, `palettes.provenance`, `palettes.builtFrom`, `palettes.matrix.*`, `palettes.chooseTwo`. Keys only a screen reads arrive in increment 4 (F-247's lesson).

**Tests:**

- `palette.test.ts`, extended (nothing removed): see the test plan.
- `palette-readout.test.ts` (new): see the test plan. It states its own timeout (F-249's `8d6a0b7`).
- `export-subject.test.ts`:
  - the `palette` and `saved` parameters for every corpus palette and fixture stored palette, in all six formats;
  - an unknown slug or id exports nothing;
  - `pair` still wins.
- Unchanged and green: `cvd-mode.test`, `compare-readout.test`, `wear.test`, `outfit-from-wear.test` (E-005, E-226, E-219).

**Fonts:** run `node scripts/verify-font-coverage.mjs`. If it names glyphs (likely 工, 房 and kana for カスタム and 作成), run `generate-font-subset.mjs`, then `fonts.test`, then `generate-font-subset.mjs --check`.

**Gates:** Tier 1, `verify-font-coverage`, `generate-font-subset --check`.

### 4. The screens and the route

- **Rebuild `PaletteStudio.tsx`** as 10 and **add `PaletteBuilder.tsx`** as 16, as sketched.
- **`app/(tabs)/atlas/palettes.tsx`:**
  - `<Stack.Screen options={{ headerShown: false }} />`;
  - reads `view`, `draft` and `colours` (keeping the literal `draftOf(colours.split(COLOURS_SEPARATOR))`);
  - `deviceRepository()` and `activeProfile(repo)`;
  - handlers: `onBack` → `router.navigate('/atlas')`; `onCreate` → `router.push('/atlas/palettes?draft=new')`; `onApply` → `offerCombination(labHandOff(…))` then `router.push('/wardrobe/outfit')`; `onExport` → `router.push(exportHref(…))`; 16's back → the catalogue; `onSaved` → `router.navigate('/atlas/palettes?view=custom')`.
- **`app/(tabs)/profile/export.tsx`:** reads `palette` and `saved` and passes them to `exportSubjectFor`.
- **Catalogue** (en and ja):
  - the screen's keys;
  - ja `studio.title` → 配色工房;
  - `role.*` re-valued to 16's role words, after confirming `role.*` has no other reader;
  - remove `studio.members`, `.order`, `.role`, `.moveUp`, `.moveDown`, `.remove`, `.add`, `.yours`, `.open`, `.new` and any `cvd.*` nothing reads (`cvd.title`, `cvd.none`).
- **`chrome.test.ts`:** delete `'atlas/palettes'` (119), and move the decoy (178–185) to `profile/measure` (it waits on OQ-7, so it is the longest-lived row). The test fails until both change together.
- **`screens.test.tsx`:**
  - **Subjects:**
    - `screens/PaletteStudio` (10 at rest, Curated, a stored profile so Apply is enabled);
    - `(your palettes)` (Custom: a form-1 and a form-2 personal palette);
    - `(no palettes of your own)` (the witness for `empty`);
    - `screens/PaletteBuilder` (16 as drawn: four slots filled, slot 1 locked, *Wardrobe Capsule*, a name);
    - `(an empty draft)` (witness);
    - `(a pair from Compare)`;
    - `(a hard pair)` (FR-35's block: kawaki-suna and usu-shiba);
    - `(editing)`;
    - `sampleValues` adds every hex these draw.
  - **Rewrite the FR-49 describe:** every schema role has a slot (read from `PALETTE_ROLES`); each control named by its slot and colour; the problem sentences and their decoy; ADR-0067 scoped to personal palettes and the draft (whole-node *Irodora original* absent; it is present on a curated form-2 tag, which is the decoy that the scope is right); a saved palette appears under Custom; 00's caption when none.
  - **Rewrite the FR-35 describe** on 16 (flag, names, gain, method, no reader-vision words; decoy: an easy pair shows no block).
  - **Rewrite the F-151 describe** (*"the Studio shows the palette as one thing"*) as 10's band:
    - one segment per member at the record's weights, curated and stored (`deriveWeights`);
    - the widths change when the palette does (decoy);
    - `judged={false}` at `BAND_HEIGHT`;
    - every judging surface (Compare at 320, `Pair`) at or above the floor.
    - Remove *"draws the strip at the judgeable height"* with ADR-0162's reason in the comment.
  - A11 headings: kept, over both screens.
  - Arrival: Custom with two palettes arrives once; Curated arrives once.
  - LIST_SURFACES: unchanged ids.
  - The route-source check at 4129: extended to the new handlers.
- **`compare-states.test.tsx`:** must stay green unchanged. If the route's literal moves, the E-227 guard text moves with it.
- **`screen-insets.json`:** re-capture the Studio and Builder entries only.
- **e2e:** in `routes.json`, the `/atlas/palettes` anchor becomes `palettes.curated` (one node, wholly in the locale's words). Then `node scripts/generate-e2e-flows.mjs`.

**Gates:** Tier 1, `test:a11y`, `test:contrast`, `test:cvd`, `node scripts/verify-reachability.mjs`, `verify-route-targets`, `generate-e2e-flows --check`, `verify-token-reach`, `verify-font-coverage`, `generate-font-subset --check`.

### 5. Enrolment

- `ENROLLED` gains:
  - **`10.screen`**: root `studio.surface`, which wraps `PaletteStudio` (fixture: Curated, a profile) and `AppTabBar` (index 1);
  - **`16.screen`**: root `builder.surface`, which wraps `PaletteBuilder` with 16's fixture draft and `AppTabBar`.
  - Locators: `studioLocators()` and `builderLocators()`, by testID for the `new:` components (slots, tray, tiles).
- `inventory-surfaces.json` gains `"10.screen"` and `"16.screen"`.
- Commit `conformance-sweep.json`.
- **Decoys,** each giving one finding naming its element: the contrast badge's id removed; card 2's third layer hex removed; slot 4's Replace removed; tray tile 6's frame removed; the matrix separation value removed. An art decoy is not expressible (F-249 M6), and that is stated.
- **Gates:** Tier 1, `verify-mockups` (refuses closing without both, E-203).

### 6. Criterion 1's own tests

`apps/mobile/test/palette-studio-fidelity.test.tsx` (10) and `palette-builder-fidelity.test.tsx` (16). **Gates:** Tier 1.

### 7. States and actions

`apps/mobile/test/palette-studio-states.test.tsx`, covering both screens and the route source. **Gates:** Tier 1.

### 8. Effects and memory

`effects.json`: the updates below, and E-234 to E-238, each with its note in `.harness/memory/effects/`. **Gates:** Tier 1, `node scripts/verify-state.mjs`.

### 9. Verify, review, record

- Run Tier 2, then the evaluator **once**.
- Fix its findings or record them as backlog, then run Tier 2 again on the final tree.
- Update `progress.md` and `feature_list.json`; capture lessons; checkpoint.

---

## Mockup fidelity

- **Governing:** `10` for `/atlas/palettes` (P1); `16` for its draft state (R9 §7). Variants:
  - `25` for the palette (P2). 10 and 16 are drawn dark only; the export bar's light form is ADR-0166's (F-264 notes it);
  - no Japanese variant exists, so ja is the catalogue's words on each layout (the titles under the OQ-48 interim);
  - board `00` for what neither draws (P3);
  - `00`/`27` for the empty states (ADR-0128).
- **Conflicts applied:** C1, C8, C11, C14.

### 10, element by element (the session completes the counts after increment 1)

| ids | built as | bound to | sweep locator |
|---|---|---|---|
| `10.header` | `Screen appBar`, no rule | — | derived `AppBar` |
| `10.back` | `AppBar.back`, `BACK_GLYPH_10` | `tab.atlas`; named `detail.backToAtlas` → `/atlas` | text `tab.atlas` |
| `10.create` | `trailing.button` secondary, `border`, `plus` | `palettes.create` → `?draft=new` | text |
| `10.title` | `placement: 'below'` | en `studio.title • 配色工房`; ja 配色工房 | value, per locale |
| `10.art` | `Illustration leaves backdrop` | — | illustration `leaves` |
| `10.source` · `.selected` · `.dot` · `.curated` · `.custom` | `ChoiceGroup segmented mark 'dot'` | `palettes.curated` / `.custom` | derived |
| `10.palette-1` | `SystemCard` (`Card` level 1 `md`) | the first form-1 card | testID `studio.card.0` |
| `…title` · `.description` · `.provenance` | `Text` | `titleLine`, `descriptionLine`, `provenanceLine` | testIDs |
| `…strip` | `Strip judged={false} height={BAND_HEIGHT} corner="md" keyline` | members at weights | testID |
| `…colour-N.role` · `.hex` · `.name` | the columns | `COLUMN_ROLE_KEYS`, the record | testIDs (N = 1–4: the first four members) |
| `…badges-label` · `.badge-contrast` · `.badges.sep` · `.badge-cvd` | `Text`, `Chip` badges | `contrastBadge`, `separationBadge` | testIDs |
| `…apply` · `.export` | `Button` secondary `border` | `labHandOff` → Lab; `exportHref(…, 'tokens')` | text |
| `10.palette-2` | `LayerCard` | the first form-2 card | testID |
| `…kind` · `.title` · `.swatch-N` · `.swatch-N.hex` · `.tag-layering` · `.tags.sep` · `.tag-provenance` | as D-3 | as D-3 | testIDs |
| `10.export-bar` · `.button` | `ActionBar`, `tonal` `strong` | `palettes.exportSelected` → the chooser | derived `ActionBar`; text |

### 16, element by element

| ids | built as | bound to | sweep locator |
|---|---|---|---|
| `16.header` · `.header-rule` | `appBar`, `rule` | — | `AppBar`; `APP_BAR_RULE_TEST_ID` |
| `16.back` | `back`, ink `foreground.2` | `palettes.backLabel`; named `palettes.backToCatalogue` | text |
| `16.title` | centred | `palettes.createTitle` | text |
| `16.save` | `trailing.button` secondary `border.strong` `sm` | `palettes.save` | text |
| `16.art-left` · `-right-top` · `-right-bottom` | `Illustration` | — | illustration (per increment 1) |
| `16.name` · `.field` | `Card` `sm`; `TextField labelPlacement="inside"` | `draft.name`; label `studio.name` | testID; component `TextField` |
| `16.name.kind.*` · `.capsule.selected` | `ChoiceGroup pills radius 'sm'` | `TYPE_KEYS` | text |
| `16.slots.slot-N` and its parts | `Slot` (module scope) | `SLOT_HEADING_KEYS`, the record, `ROLE_KEYS` | testIDs `builder.slot.N.*` |
| `…slot-1.locked` · `…slot-N.replace` | `Button` (`glyphTint 'glyph.lock'`, `selected`), with the dot · `Button` plain `refresh` | `palettes.locked` · `palettes.replace` | testIDs |
| `16.matrix` · `.title` · `.rule-N` · `.*.label` · `.*.value` · `.contrast.pair` | `Card` `md` | `matrixRows` | testIDs |
| `16.tray` · `.chip-N` · `.divider-*` · `.previous` · `.next` | `Tray` (module scope) | `trayPages`, `allEntries()` | testIDs |
| `16.actions` · `.create` | `ActionBar`, no rule; primary, `arrow-right` | `palettes.createAndSave` | `ActionBar`; text |

### Bindings (§8), every one the corpus's, the store's or the engine's

| element | value | computed by |
|---|---|---|
| 10 contrast badge · 16 contrast row | the WCAG ratio (floored) and its threshold (10); ratio · Lc, both floored (16) — the anchor against the first `light` member / slot 1 vs 2 | `compare()` → `flooredRatio`/`thresholdKey`; `contrastLine` (FR-3) |
| 10 separation badge · 16 CVD row | `floor(min over pairs of worstSeparation)`, with its model (*approximate* when the worst is tritan) | `outfit/cvd.ts#worstSeparation` (FR-5, E-005) |
| 16 harmony | the warm–cool direction in 07's words | `warmCoolRelation` (FR-6, E-226) |
| the band, columns, layers and tiles | the record's members, hex, kanji, romaji, English, weights | the corpus bundle; the store's rows |
| description · provenance · tags · kind | category, classification, source type, review; or the device's own words | `CLASSIFICATION_KEYS`, `SOURCE_TYPE_KEYS`, `reviewLine`; ADR-0067 |

### Departures, by id (nothing else)

- **E1:**
  - every name, hex and figure;
  - the palette order;
  - *Kasane no Irome:*;
  - 静寂のニュートラル;
  - *Contemporary Japanese minimalist wardrobe palette.*;
  - *Kyoto Autumn Linen Capsule*;
  - the tray's tiles;
  - equal band widths, where the record's weights are drawn instead;
  - four columns, where the corpus has 7–8 members.
- **E2:**
  - *WCAG AA 8.4:1* → threshold words and the floored ratio;
  - *CVD 100% Distinction* → *CVD ‹n›% Separation (Machado 2009)*; (claims-ok: quotes the drawn construction it replaces)
  - *Traditional Kasane Layering* → *Kasane-inspired Layering*;
  - *Heian Verified* → the classification label;
  - *11.4:1 (APCA Passed - AAA)* → ratio · Lc;
  - *Tonal Kasane Complement* → 07's warm–cool words;
  - *100% Distinguishable across …* → `separationLine`; (claims-ok: quotes the drawn construction it replaces)
  - *Editorial* → *Seasonal*.
- **E3:**
  - the chosen chip's and tile's marks;
  - wraps (badges, tags, columns, names);
  - fixed-height chips clip at 200 % (F-344);
  - hit areas (Create at 24, the chips at 20, Replace and Locked at about 9.5, the chevrons at 15, the tiles' width), each target inside its parent.
- **E4:**
  - the empty draft and empty slots;
  - the edit state's title and action words;
  - *Export Selected*'s chooser;
  - a personal card's overflow sheet;
  - Apply disabled with its reason;
  - the matrix's *Choose two colours*;
  - FR-35's block;
  - the save note;
  - the tab bar under both.
- **§2, not design:** the brackets; the route string; 16's next card.
- **§2, tighter than the scale (named in ADR-0166):** the eight rows marked *named* above.
- **Not departures from 10 or 16 but from earlier decisions** (R9 §10): F-151 c1 in part (ADR-0162); the old Studio's controls (ADR-0165).

If the capture shows anything else, it is fixed, or it is a question for a person.

---

## Files to touch

```
.harness/plans/F-251-palette-studio-is-mockup-10-and-building-a-palette-is-16.md
docs/adr/0162-…, 0163-…, 0164-…, 0165-…, 0166-…, docs/adr/README.md
docs/design/R9-MOCKUP-FIDELITY.md (§2, §4 E1–E4, §6 C8, §8, §10, §11); docs/PRD.md §10 (OQ-23, OQ-45 rows)
docs/design/design-system.manifest.json (+ generated) — only the border.strong ink pairing
mockups/tools/inventory-data/10.mjs, 16.mjs; mockups/inventory/10.json, 16.json
packages/ui/src/Pair.tsx, Button.tsx, ChoiceGroup.tsx, TextField.tsx, Tategaki.tsx (new), index.ts,
  (Illustration.tsx only if increment 1 reads a new drawing); packages/ui/test/{pair,button,choice-group,
  text-field,tategaki}.test.tsx, conformance.test.tsx
apps/mobile/src/palette.ts, palette-readout.ts (new), export/subject.ts, i18n/en.ts, i18n/ja.ts
apps/mobile/src/screens/PaletteStudio.tsx (rebuilt), PaletteBuilder.tsx (new)
apps/mobile/app/(tabs)/atlas/palettes.tsx, app/(tabs)/profile/export.tsx
apps/mobile/test/palette.test.ts, palette-readout.test.ts (new), export-subject.test.ts,
  palette-studio-fidelity.test.tsx (new), palette-builder-fidelity.test.tsx (new),
  palette-studio-states.test.tsx (new), screens.test.tsx, chrome.test.ts
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
| **E-024** (`parsePalette` runs on the phone; line 909) | drafts carry a category; a one-layer kasane is refused by the schema, and the sentence says so | `palette.test`: `draftProblem(d) === null` ⇔ `parsePalette` accepts, over all 96 shapes (the oracle calls `parsePalette` directly, never `draftProblem`'s delegate) |
| **E-091** (`Pair`/`Strip` → Studio; line 3513) | the Studio leaves the floor by declaration; `Strip` gains `judged` | `pair.test` both directions; the rewritten F-151 describe; guard text updated |
| **E-120** (Card insets) | the Studio's and the Builder's cards | `screen-insets.json` re-captured for these two only |
| **E-157** (controls' defaults from the inventories; line 6553) | `10.mjs` and `16.mjs` re-measured; `SEGMENTED_HEIGHT`, `ACTION_BAR_*`, `APP_BAR_HEIGHT`, `SELECTION_DOT` may move | the recompute tests; Risk 2's rule |
| **E-160** (`onSample`; line 6748) | form 2's hex and the tray's kanji on samples | `screens-sample-ink.test`'s census (new hexes in `sampleValues`); gate `contrast` |
| **E-164** (chrome) | `atlas/palettes` leaves `PLATFORM_HEADER`; the decoy moves to `profile/measure` | `chrome.test`, both directions |
| **E-191 / E-199** (states; Arrival) | two screens' `STATES`; one Arrival per catalogue view | the declarations test; `blank-panel`, `bare-zero`; *"arrives once"* |
| **E-203 / E-211** (sweep) | `10.screen` and `16.screen` enrolled | `verify-mockups`; `screens.test` |
| **E-219** (07 → the Lab hand-off; line 9555) | a **second writer**: 10's Apply | `palette-readout.test` (`labHandOff` over every palette); `outfit-from-wear.test` unchanged; guard text updated |
| **E-226** (`warmCoolRelation`'s readers; line 9842) | a new reader: 16's harmony row | `palette-readout.test`: the row's direction equals `warmCoolRelation`'s for every curated palette and every constructed draft |
| **E-227** (08 → palettes and export; line 9884) | the route keeps reading `colours`, now into 16's slots, A locked; the export reads `palette` and `saved` too | `compare-states.test` unchanged; `palette.test` (`draftOf` → slots 1 and 3, A locked); `export-subject.test` |
| **E-005** (one separation definition) | 10 and 16 read `worstSeparation` | `palette-readout.test`'s independent oracle (`separationScore` looped by hand); gate `cvd` |
| **E-016 / E-089** (catalogues, Japanese claims) | keys added, re-valued (`studio.title` ja, `role.*`) and removed | `tsc`; `i18n.test`; `verify:claims` (new honest forms added to `near-misses.md` if they pass) |
| **E-017 / E-145** (fonts) | 配色工房 and the new ja | `verify-font-coverage`; `generate-font-subset --check` |
| **E-128 / E-134 / E-152** (inventory → R9, PRD, features, type census) | both JSON files edited | `verify-mockups`; `mockup-inventory --check`; `type-scale.test` |
| **E-063** (route targets) | new literals with queries | `verify-route-targets` |

### New links (E-234 is the next free id)

- **E-234.** From `apps/mobile/src/palette-readout.ts`. To both screens, `export/subject.ts`, `outfit/fromWear.ts`, and the fidelity, states and sweep tests.
  - **Hazard:**
    - a badge computed over a different pair or set than its words name;
    - a curated palette given the device's words, or a personal one given *Irodora original* (ADR-0067);
    - a figure rounded up past its threshold;
    - the order drifting.
  - **Guard:** `palette-readout.test` over all 13 palettes and constructed drafts, with decoys.
- **E-235.** From `packages/ui/src/Pair.tsx#Strip` (`judged`). To 10's band, Compare and Contemporary.
  - **Hazard:** a judging surface opts out of the floor and nothing fails.
  - **Guard:**
    - `pair.test` (the default floors);
    - screens.test asserts every `judged={false}` site is in an allow-list naming its ADR (10 only), so a new opt-out fails until it is declared;
    - Compare stays at or above the floor at 320.
- **E-236.** From `apps/mobile/src/palette.ts` (slots, category, lock, move). To the stored `category` → 10's card form; the export; the Lab; `parsePalette`'s kasane rule.
  - **Hazard:**
    - a one-layer kasane saved;
    - an old-Studio palette opened in 16 losing members;
    - a move out of a locked slot.
  - **Guard:** `palette.test` (every shape, `fitsSlots`, the lock); the states test's Edit-refused decoy.
- **E-237.** From `apps/mobile/src/export/subject.ts#exportSubjectFor` (`palette`, `saved`). To `/profile/export` and F-263's rebuild.
  - **Hazard:** 18's rebuild stops reading a parameter, so 10's *Export Tokens* exports the latest palette instead, and nothing on 10 fails.
  - **Guard:** `export-subject.test`; `palette-studio-states.test` reads the export route's body; a note on F-263.
- **E-238.** From the `@irodora/ui` additions (`Button` tonal strong, pills `sm`, `TextField` inside, `Tategaki`). To both screens and their locators.
  - **Hazard:**
    - a refactor drops the strong fill's declared pairing, so the ink is unchecked by gate 9;
    - `Tategaki` announces character by character.
  - **Guard:** each component's test (decoys); the sweep's decoys; gate `contrast`.

---

## Test plan

### The invariants a person checks first, over every case the data allows (F-248's lesson)

All in `apps/mobile/test/palette-readout.test.ts` and `palette.test.ts`, pure.

1. **Each card says what its palette holds.** For all 13 palettes and fixture stored palettes:
   - the form is 2 if and only if the category is `kasane`;
   - the band is the members in rank order at the record's weights;
   - every column's hex, kanji, romaji and English are the record's;
   - a personal palette never yields *Irodora original*, and a curated one always shows its classification (FR-23).
   - Decoy: a curated palette passed as personal is caught.
2. **The figures are the engine's for the pair and set the words name.** For every palette:
   - the contrast pair is the anchor and the first `light` by rank, each equal to a hand-written lookup;
   - the ratio is `≤` exact, floored to 1 dp, and its threshold is from the **printed** ratio (08's rule);
   - the separation is `floor(min over pairs of min over three deficiencies of separationScore(…, 1))`, computed by an **independent loop**, not by `paletteSeparation`'s delegate (F-250's lesson);
   - it prints 100 only when exact is 100 (decoy: a constructed 99.95 → 99);
   - *approximate* only when the worst is tritan.
   - Decoy: a palette with no `light` member has no contrast badge.
3. **The Lab gets the palette.** For every palette, `labHandOff`:
   - the top is the anchor;
   - no colour sits in two slots;
   - an accent goes to the shoe where one exists;
   - every slug is a member.
   - Decoy: a palette whose rank 2 is an accent.
4. **The draft is the schema's.**
   - For all 96 shapes (16 slot subsets × name empty or not × 3 categories), `draftProblem(d) === null` if and only if `parsePalette(toCorpusRecord(d))` succeeds. The oracle calls `parsePalette` directly.
   - Every sentence is chosen correctly, and `tooFewLayers` appears only for a kasane with one layer.
   - Ranks are contiguous in slot order, and weights equal `deriveWeights(n)`.
   - `SLOT_ROLES` is a permutation of `PALETTE_ROLES`: a fifth role fails.
5. **The slot operations.** For every pair of slots × locked or not:
   - `choose` moves a held colour and refuses out of a locked slot;
   - `clearSlot` empties a slot;
   - choosing the in-hand colour again clears it;
   - the next empty slot comes in hand.
   - `draftOf([a,b])` puts A in slot 1, locked, and B in slot 3; an unknown slug gives `null` (E-227).
   - `fitsSlots` is false for a 7-member stored palette.
6. **The tray.**
   - `trayPages(allEntries())` covers every entry exactly once, in the Atlas's order, 7 a page;
   - `pageOf(slug)` holds the slug;
   - every corpus `name.kanji` is pinned free of characters needing a vertical form (or `Tategaki`'s handling is pinned for the ones the census found).
7. **Nothing claims what is not computed.** Every catalogue value these modules and screens read, in en and ja, contains none of: *Match*, *Safe*, *Verified*, *Heian*, *Traditional*, *Distinguishable*, *Distinction* beside a figure, *APCA Passed*, 一致, 伝統, 平安. Decoy: a planted *Verified* is found.

### Unit

- `palette.test` and `export-subject.test` as above.
- The ui component tests from increment 2.

**Golden:** none owed. No `packages/color-*` change, and every figure comes from golden-tested functions (`wcagContrast`, `apcaLc`, `separationScore`, the corpus derivation).

### Conformance subjects (`screens.test.tsx`)

The nine subjects from increment 4. `blank-panel` and `bare-zero` run on every subject.

### The inventory sweep (`ENROLLED`)

`10.screen` and `16.screen`, each with its five decoys (increment 5). Both join *"the real surfaces are clean as drawn"*.

### Criterion 1's own tests (on the rendered tree; `el()` recomputed from the pixels)

**10:**

- **Order:** back < Create (one row) < title < segmented < card 1 < card 2; within a form-1 card, title < description < provenance < band < columns < badges label < badges < actions; within form 2, kind < title < layers < tags.
- **Grouping:** both badges and their separator in one row; Apply and Export in one row; layers in one row; no pressable inside a band.
- **Proportion:** every interval through §2's snap, with each subtracted inset written out; the named intervals through `belowTheScale`, their cost asserted against ADR-0166; every size constant; corners (`md` cards, band and layers); the layer cell's width read from the tree at 320, 360 and 384.
- **Type and ink** against `10.json`.
- **Wrap:** no `numberOfLines` on any word.
- **Art against text** (F-247's lesson): every `Text` is in an opaque card, the bar, or passes 4.5:1 over the leaves' ink at `opacity.art` in every palette.

**16:** the same five headings, over the name card, the slots (2 × 2, slot 1 locked with its dot, *Replace* trailing on the others), the matrix's two columns and its rules, the tray (peek | divider | ‹ | 7 | › | divider | peek), the chevrons' targets inside the tray, the action bar above the tab bar, and the art in the margins only.

### Negative and action tests (`palette-studio-states.test.tsx`)

**No 10 or 16 sample content**, in en and ja × dark and light, across every subject, in paragraphs and accessible names:

- **Names:** 静寂のニュートラル, *Kasane no Irome*, *Nureba-iro*, *Jet Slate*, *Shiro-neri*, *Raw Silk*, *Gin-nezumi*, *Silver Grey*, *Kuchiba*, *Decayed Leaf Ochre*, *Ai-nezumi*, *Indigo Grey*, 濡羽色, 白練, 銀鼠, 朽葉, 藍鼠, *Kyoto Autumn Linen Capsule*.
- **Hexes:** `#1E2224`, `#E8E5DF`, `#8A929A`, `#A88468`, `#4E596B`, `#B58A63`, `#E1D9C6`, `#74323E`, `#5B6B78`.
- **Figures and words:** `8.4:1`, `11.4:1`, *100% Distinction*, *Distinguishable*, *APCA Passed*, *Heian*, *Traditional Kasane*, *Tonal Kasane Complement*, *Editorial verified*, *Color Harmony*, `'Irodora' (/atlas/palettes)`, `[`. (claims-ok: lists the drawn words a test bans)

The precondition is asserted: the fixture's own figures differ from these. *Quiet Neutrals* and *Autumn Dew* are corpus names and are **not** banned (stated). Decoy: a planted *Jet Slate* is found.

**Every drawn action, fired on the control a person touches:**

- **10:** back; Create; each segment; Apply (and disabled with its reason, no profile); Export Tokens; Export Selected → the chooser → a choice; the overflow → Edit (and refused with its reason) and Delete.
- **16:** back; Save (stays; the note); Create & Save (navigates); each type chip; Replace → a tile; a move between slots; a refused move out of a locked slot; Locked → off; the chevrons page; a tile again clears; FR-35's Replace.
- **Decoys:** absent handlers mean absent controls; an invalid draft disables both saves with the sentence.

**Route source:** the handler bodies hold `headerShown: false`, `router.navigate('/atlas')`, the `?draft=new` push, `offerCombination` before `/wardrobe/outfit`, `exportHref`, `draftOf(colours.split(COLOURS_SEPARATOR))`, and the export route reading `palette` and `saved`. Decoys: a back that only pops; an Apply that pushes without offering.

### E2E

- `generate-e2e-flows --check`, anchor `palettes.curated`.
- The capture takes 10 at rest. **16's capture:** if the capture spec can declare `/atlas/palettes?colours=‹a›,‹b›`, it is captured there (two slots filled, A locked). Otherwise the person reaches 16 on the device through *+ Create New Palette*. The attestation says which.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#  + inc 1: type-scale.test and the ui recompute tests (via the filter); node scripts/verify-state.mjs
#  + inc 2, 4: pnpm test:a11y && pnpm test:contrast && pnpm test:cvd (+ generate-design-tokens --check if the manifest moved)
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
- the sweep's block (`10.screen` and `16.screen` enrolled, elements asserted, renders);
- `claims.findings` 0;
- the font-coverage line;
- the screen-insets delta;
- the census numbers quoted in ADR-0162 and ADR-0164.

Report the known reds as F-250 did: F-322 (`pnpm security`), F-317 and F-348 (timeouts under load), F-333 (the Windows write error), and the iOS half of `verify-ci` on win32.

| # | criterion | proven by |
|---|---|---|
| 1 | inventories 10 and 16 in order, grouping and proportion, asserted by the sweep | the two fidelity tests and the sweep. **Gated** |
| 2 | bindings per §8; no mockup content | `palette-readout.test` (every case), the sweep's values, the states test. **Gated** |
| 3 | only the listed departures | **gated** for structure; **attested** for appearance |
| 4 | the capture beside 10 and 16, compared by a person | **attested** |
| 5 | catalogues; every drawn action works; a11y, contrast, cvd | `tsc`, `i18n.test`, the states test, the three gates. **Gated**, with the device half **attested** |

---

## Attestations

Declared in increment 0 (Appendix F). All three block release.

1. **Criterion 4.**
   - A person runs `pnpm fidelity:capture -- --erase-app-data` on Android at 384 dp, with a non-debuggable build of the final commit and a stored profile.
   - They compare `/atlas/palettes` against 10, and the draft against 16 (en, Sumi), 25's palette (en, Washi) and ja, and record *matches* or each difference.
   - **Expected, not defects:**
     - *Earth and Clay* first, with seven or eight band segments at their weights and two rows of columns;
     - the first kasane card is sixth;
     - the classification line and the true provenance line;
     - the badges' words and floored figures; the tags' words;
     - no brackets; *Colour Harmony*; *Seasonal* for the third chip;
     - the band at 60 dp (ADR-0162);
     - the export bar dark-filled in Washi;
     - 配色工房 alone in ja;
     - 01's tab bar under both screens;
     - the margins' art; grey lines round some samples (OQ-46's interim).
2. **Criterion 3, the appearance half.** Discharged by the same comparison. **The person is asked specifically to confirm or flip ADR-0162** (the band's height; 16's slot samples) and ADR-0165's lock model.
3. **Criterion 5, the device half.**
   - Back from both screens; *Create* opens an empty draft.
   - Filling four slots from the tray, moving a colour, clearing a slot.
   - *Locked* toggles off; the chevrons page.
   - Save stays; Create & Save lands on *My Custom Palettes*.
   - Apply opens the Lab with the anchor on the locked top.
   - Export Tokens opens Export with tokens chosen; Export Selected → the chooser → Export.
   - Edit and Delete from a personal card.
   - 08's *Add Pair* opens 16 with A locked.
   - TalkBack: the type chips as a radio group; each tile read as its whole name; the matrix rows.
   - At 200 % in en and ja nothing is cut except the fixed-height chips (F-344).
   - The generated flows pass.

---

## Risks and open questions

1. **Measurements owed in increment 1.** Every "Inc 1" number is unknown: the title step, the segmented's chosen fill, the band's keyline width, 16's chip fills, the tray tile's structure and width, both art extents, the right-hand drawings.
2. **Shared medians.** `SEGMENTED_HEIGHT` (02 07 10 12 12 24), `ACTION_BAR_*` (08 10 12 13 17), `APP_BAR_HEIGHT` (08 12 13 16 18) and `SELECTION_DOT` read 10's and 16's records, as `APP_BAR_INSET` reads the back controls' left edges. A re-read that moves a median moves every screen using the default. **Rule:** re-measure. Where a box feeds a shared median and the new reading moves it, either keep F-220's method for that box (F-250's 09.back precedent, F-282) or move the default with an ADR and check its consumers. Never move it silently.
3. **ADR-0162 is the decision a person is likeliest to revisit.** It supersedes F-151 c1 for 10 and 16 and removes one assertion that runs in the `test` and `a11y` gates. No threshold moves, but the ⇄ is stated. The CIE 1°–4° finding is recorded, not acted on: `observerDegrees` is a person's.
4. **The lock model** (locked only by hand-off, releasable, not re-lockable by a drawn control) is a reading of a single drawn state. The alternative, a *Lock* control on every slot, adds controls 16 does not draw.
5. **Export Selected is single, through a sheet.** That is two taps, and "Selected" refers to a choice made in the sheet. Multi-palette export (ASE groups, CSS prefixes, a JSON array, PDF sections) is a `@irodora/export` change and F-263's territory. File a backlog feature only if the review asks.
6. **Three role vocabularies** (10's columns, 16's headings, 16's roles), kept because each surface prints what it draws. *Dark Base* and *Subtle* read as the slot's intent, not the colour's measure. The review may ask for one vocabulary.
7. **The name field without a visible label.** WCAG 2.2 Understanding 3.3.2 requires that labels or instructions be *"presented to all users"*. The placeholder presents them while the field is empty; once a name is typed, the purpose rests on the screen's title. No gate checks it. The alternative is a label row 16 does not draw.
8. **The export bar in Washi** reads as a primary fill (`border.strong` = ink). This is P4 applied; F-264 carries a note.
9. **Old-Studio palettes** with more than one colour per role are read-only in 16 (Edit refused with its reason). They still show, apply and export from 10.
10. **Navigation mechanics** are unverified on a device: whether expo-router pushes the same route with new search params; back from 16 when no catalogue is below (08's case); `navigate` with `view=custom`. The route-source tests hold the literals, and the device run attests the behaviour.
11. **Tategaki** stacks upright characters. If the census finds a character needing a vertical form, `Tategaki` maps it or the ADR states the cost.
12. **FR-35 stays on 16 as E4.** F-257 may move it to the Lab (a note on F-257).
13. **07's rounded separation** may print 100 for a non-100 score (finding 4). It is recorded, not fixed here.
14. **The curated order** (category, then slug) puts *Earth and Clay* first; FR-22's prose order would put *Quiet Neutrals* first. Both are deterministic. The ADR names the alternative.
15. **`screens.test` heap and time** (F-317, F-350): nine subjects replace three. Watch the margins, and state timeouts where the census ranks heavily.
16. **No JDK or Maestro here.** The attestations are the person's.
17. **Open questions:**
    - OQ-45 closes for 10 and 16 (ADR-0162); its seam half, and 04 and 23, stay with F-245 and F-260.
    - OQ-23 closes as a rule (ADR-0163).
    - OQ-48's interim is applied, not decided.
    - OQ-46 applies to the layers and tiles; the shipped guarantee stands.
    - Every new choice closes in ADR-0162 to ADR-0166 under the delegation.

## Out of scope

- Any change to `size.judgeable`, `observerDegrees` or the viewing distance; any golden value or gate threshold.
- 04's and 23's joined samples and OQ-45's seam half (F-245, F-260).
- The Export screen's composition (F-263); multi-palette export files.
- The Outfit Lab's composition (F-257); FR-35's eventual home there.
- A palette `description` field in the schema; new or edited corpus palettes; kasane layer-floor checks on device drafts beyond `parsePalette`.
- The Atlas's chip word 配色 (F-246); OQ-46; F-344's clipping.
- Suggested or generated palettes; a harmony generator (F-349).

## Sources

- [W3C, Understanding SC 3.3.2 Labels or Instructions (WCAG 2.2)](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html): a label is *"presented to all users"*; a failure *"if the labels or instructions aren't presented to all users"*.
- [Konica Minolta, Learning Center: general colour terms](https://sensing.konicaminolta.us/us/learning-center/color-measurement/general-color-terms) and [X-Rite, What is meant by the term "observer angle"?](https://www.xrite.com/service-support/what_is_meant_by_the_term_observer_angle): the 2° observer for fields of 1°–4°, the 10° observer above 4°. These are secondary sources; CIE 015 was not read.
- [Williams et al. 1981, Vision Research](https://aria.cvs.rochester.edu/papers/williams-etal_VR1981b.pdf): small-field (foveal) tritanopia.
- [Davies & Morland, British Journal of Ophthalmology 87(6):742](https://bjo.bmj.com/content/87/6/742): foveal tritanopia zones up to about 1° in some subjects.
- [Rockwell Automation documentation conventions](https://www.rockwellautomation.com/en-in/docs/factorytalk-data-explorer/4-05-00/user-guide-ditamap/page/read-me-first/conventions.html): UI labels written in square brackets in documentation prose (a notation).
- [Balsamiq, annotation guidelines](https://balsamiq.com/learn/annotations/): wireframe annotations use their own delimiters. No source found brackets a shipped UI label.
- arXiv 1904.11293, as cited by ADR-0154 (CIEDE2000's hairline-pair reference conditions). It was not re-read here.

---

# Appendix A: ADR-0162 draft

```markdown
# ADR-0162: A catalogue shows a palette and a pair is judged — 10's band and 16's slots are drawn at their drawn size

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-0x |
| **Feature** | F-251 |
| **Answers** | OQ-45 for `10` (and the same question for `16`'s slot samples). Its seam half, and `04` and `23`, stay with F-245 and F-260, which apply this rule or revisit it |
| **Supersedes in part** | F-151 c1 for `10` and `16`; screens.test's "draws the strip at the judgeable height" |
| **Applies** | Golden rules 11 and 14; ADR-0095 (its own scope line: "a list ranks, a pair judges"); ADR-0154; R9 §1, §10 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): "For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade." |

## Context
`10` draws a palette as one band 60 dp tall; `Strip` raises it to ADR-0095's 77 dp. `16` draws slot samples 35 dp
tall. ADR-0095 classified the old Studio as a judging surface.

## Research, and what it shows
- ADR-0095's floor applies to the **smaller** dimension. The corpus's five systems hold 7–8 members, so on `10`'s band
  the binding dimension is a segment's width: about 34 dp (0.9°) at the record's weights. A 77 dp band does not reach
  2° on `10`, so keeping the floor buys 17 dp of height without the guarantee. [census figures per palette]
- The CIE gives the 2° observer's domain as 1°–4° (secondary sources). 60 dp is 1.56° at 350 mm, inside it.
- Small-field tritanopia is a central-foveal effect, with zones up to about 1° in some observers (Williams et al.
  1981; Davies & Morland).
- CIEDE2000 was fit on hairline pairs over more than 4° (ADR-0154). Neither 60 nor 77 dp is that condition.

## Decision
- **D1. The rule.** The floor binds a sample presented for a person to judge a colour difference by eye beside the
  figure that measures it (`08`, `Pair`, and `04` by this rule). It does not bind a sample that shows a palette for
  choosing or building, whose figures are computed from the values and name their quantity and model.
- **D2.** `10`'s band is drawn at `BAND_HEIGHT` (60) through `Strip judged={false}`. `16`'s slot samples are drawn at
  35. `Strip`'s default keeps the floor, and an opt-out is listed by ADR (E-235).
- **D3. No threshold moves.** `size.judgeable` stays 77, derived. Compare's ≥-floor assertion stands.
- **D4.** Whether ADR-0095's 2° is stricter than the standard requires is recorded, not acted on. `observerDegrees` is
  a person's.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Keep the floor on `10` (⇄, the person may flip) | 17 dp per card that nothing forces; still under 2° in width |
| Keep it wherever any figure is beside the band | `10`'s badges are palette summaries computed from values, not a difference judged by eye; the floor would still miss its purpose in width |
| Equal-width segments | Loses the weight reading (F-151's "order is proportion"); raises the narrowest segment only to 1.0° at 384 |
| Raise `16`'s slots to 77 | About 42 dp per slot row, a departure nothing forces |

## Evidence, and its limits
Secondary sources for the CIE domain; studies of printed and lab stimuli, not phones. The 350 mm viewing distance is
ADR-0095's assumption.

## Revisit when
A mockup draws a judging pair on these screens; the person flips it; or `observerDegrees` is reconsidered.
```

# Appendix B: ADR-0163 draft

```markdown
# ADR-0163: Square brackets around a label, heading, role or button are notation

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-251 |
| **Answers** | OQ-23 |
| **Applies** | ADR-0142 D3 (06's names), ADR-0155 D5, ADR-0159 D4; R9 §2 |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1.** A bracket around words in any mockup marks a label slot. It is notation, not copy.
  - 06's bracketed names were already read this way.
  - No platform convention brackets a label.
  - The documentation convention found brackets UI labels inside prose to mark them as labels.
- **D2. On `16`:**
  - *Slot n: ‹role›*, joined by the colon *Role: Anchor* already uses;
  - *Role: ‹role›*;
  - *Replace* and its glyph;
  - *• Locked*, whose dot is the on-state mark.
- **D3. On `10`:** the column role words, unbracketed.
- **D4.** F-257, F-260 and F-263 apply D1 to `13`, `17` and `18`, and record any bracket read as copy, with the reason.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Brackets as copy | Debug-looking text on every slot; no platform precedent; disagrees with four ADRs |
| Drop the separator in headings | "Slot 1 Anchor / Dark Base" runs two labels together |
| " • " as the separator | A joiner 16 does not use in this element; the colon is its own |

## Evidence, and its limits
Search results only. There is no published wireframe standard for brackets.
```

# Appendix C: ADR-0164 draft

```markdown
# ADR-0164: 10's and 16's figures and words say what the corpus, the store and the engine hold

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-251 |
| **Applies** | FR-3, FR-5, FR-6, FR-22, FR-23; R9 §4 E1/E2, §8; ADR-0067, ADR-0124, ADR-0131, ADR-0138 D4, ADR-0142 D5,
ADR-0146, ADR-0151 D4, ADR-0155 D3/D4 |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Form and order.** A kasane is form 2; every other category is form 1. Curated palettes are ordered by
  category, then slug. Personal palettes are newest first.
- **D2. Form 1's words.**
  - Title: *en • ja*.
  - Description: *‹category› palette. ‹classification label›.* (FR-23's displayed field); `studio.origin` for a
    personal palette.
  - Provenance: *Provenance: ‹source type›, ‹reviewLine›*.
  - The band at the record's weights; four columns a row.
- **D3. The badges.**
  - *WCAG ‹threshold› ‹floored ratio›:1* over the anchor and the first light member by rank (none without a light).
  - *CVD ‹n›% Separation (Machado 2009[, approximate])*, n = floor of the worst pair over three deficiencies at
    severity 1 (`worstSeparation`, E-005). It prints 100 only when it is 100.
- **D4. Form 2.**
  - *Curated Palette* / *Your Palette*.
  - The record's name; *Kasane no Irome:* dropped (FR-23, C14).
  - *Kasane-inspired Layering*.
  - The classification label, or *Made by you, on this device* (ADR-0067).
- **D5. Role words.** Three maps, each surface's own: 10's columns, 16's headings, 16's roles. They are role names,
  not measurements.
- **D6. 16's matrix.**
  - *Contrast Ratio (Slot 1 vs 2)*: `contrastLine`.
  - *Colour Harmony*: 07's warm–cool words.
  - *CVD Distinction*: `separationLine`.
  - *Choose two colours* under two.
- **D7. Type chips.** *Wardrobe Capsule* → contemporary; *Seasonal Kasane* → kasane; *Editorial* → **Seasonal**
  (seasonal), an E2 row: *Editorial* would present a person's palette as editorial work. Traditional is never offered.
- **D8. Titles.** ja `studio.title` = 配色工房 (10's run); en *Palette Studio • 配色工房*; in Japanese the run is not
  drawn (the OQ-48 interim). 16: *Create Custom Palette*, or *Edit Custom Palette* when editing.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| A schema `description` field | A content and schema change for one slot; every palette re-authored |
| The highest-contrast pair for the badge | Disagrees with 16's "Slot 1 vs 2"; two definitions for one figure |
| Round the separation, as 07 does | Can print 100 when it is not (rule 11) |
| FR-22's prose order | Content order written in code |
| Map *Editorial* to *traditional* | Presents a person's palette as traditional (FR-23) |

## Evidence, and its limits
Census [figures]. The ja words are unreviewed by a competent speaker (ADR-0060); F-265 carries them.
```

# Appendix D: ADR-0165 draft

```markdown
# ADR-0165: What 10's and 16's controls do, the route's states, and what leaves the Studio

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-251 |
| **Supersedes in part** | the old Studio's role chips, Move up/down, Remove, search, Open and Start new (their capabilities kept below); F-151 c1 (with ADR-0162) |
| **Applies** | FR-49, FR-35, FR-51, FR-71; ADR-0067, ADR-0118, ADR-0128, ADR-0136, ADR-0152 D5, ADR-0156 D5; R9 §4 E4 |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Route.** `/atlas/palettes` is 10; `?view=custom`; `?draft=new|‹id›` and `?colours=` are 16. The platform
  header leaves. Back from 10 → `/atlas`; from 16 → the catalogue.
- **D2. 10.**
  - The segmented choice switches the view.
  - Create → `?draft=new`.
  - Apply → `offerCombination` (top the anchor, trouser the first non-accent, shoe the first accent) →
    `/wardrobe/outfit`; disabled with its reason without a profile.
  - Export Tokens → `/profile/export?palette|saved=…&format=tokens`.
  - Export Selected → 03's sheet, a single choice → Export.
  - A personal card's overflow → Edit (refused with its reason when it does not fit the slots) and Delete.
  - No personal palettes → 00's caption.
- **D3. 16's slots.**
  - Fixed by role (anchor, light, neutral, accent); rank is slot order; weights come from `deriveWeights`.
  - *Replace* puts a slot in hand.
  - A tile fills the slot in hand; choosing a colour another slot holds **moves** it (FR-49's reorder); the in-hand
    colour chosen again clears the slot.
  - A colour the person came with (08's A) arrives locked; *Locked* toggles off; a locked slot cannot be replaced or
    moved out of.
- **D4. The tray.** The corpus in the Atlas's order, seven a page, the chevrons paging.
- **D5. The saves.**
  - *Save Palette* saves and stays (the same id).
  - *Create & Save →* saves and goes to *My Custom Palettes*.
  - Both are disabled with `draftProblem`'s sentence in the bar's note; the note says *Saved to this device.* after a
    save.
  - Both go through `toStoreWrite`, so the schema decides.
- **D6. FR-35 (E4).** Under a separation of 20, a block under the matrix names the pair and the swap with its gain;
  *Replace Slot n* applies it. No status colour.
- **D7. The name field.** No visible label, as drawn. The label's words are the placeholder and the accessible name.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| 16 as its own route | A route no index row names (E-126); 08's `colours` link breaks |
| Card selection for Export Selected | Marks a card in 10's rest state, which 10 does not draw |
| A Lock control on every slot | Three controls 16 does not draw |
| Refuse a held colour | No way to reorder (FR-49) |
| Drop FR-35 here | Its only surface disappears |
| A visible name label | A row 16 does not draw (3.3.2 risk recorded) |

## Evidence, and its limits
Device behaviour (expo-router search-param pushes, back, TalkBack) is unverified and attested.
```

# Appendix E: ADR-0166 draft

```markdown
# ADR-0166: 10's and 16's composition, their art and the tray

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-0x · **Feature** F-251 |
| **Applies** | R9 §2, §5, C1, C8, C11; ADR-0110, ADR-0113, ADR-0116, ADR-0118, ADR-0121, ADR-0139, ADR-0153 (glyph.lock); the lessons on ink gaps, card edges, rounded dp, sizes from the tree, text over art and targets inside parents |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Intervals.** The plan's tables, snapped. The eight named intervals and their costs.
- **D2. Insets.** 10 is `md`; 16 is `xl`.
- **D3. Sizes from the tree.** 10's layer cells are a quarter of the row each; 16's slots are half the content width;
  both are read from the tree at 320, 360 and 384.
- **D4. 10's bar.** One `tonal`/`strong` action. In Washi `border.strong` is the ink colour (P4); its ink is a declared
  gate-9 pairing.
- **D5. 16's bottom chrome.** `scroll={false} bleed`; the tray fixed above the action bar; the action bar with no rule.
- **D6. The tray.** Peek | divider | ‹ | seven | › | divider | peek. Tiles are `Swatch`es with `Tategaki` kanji in the
  sample's ink; the chosen tile takes `SelectionFrame`; the chevrons' targets lie inside the tray.
- **D7. Art.** 10: `leaves` at `opacity.art`, behind the cards. 16: `kimono` left and [sashiko ×2 | sashiko and
  ‹new drawing›] right. No word sits on a stroke.
- **D8.** 16's next card is not design. 01's tab bar sits under both screens (E4).

## Evidence, and its limits
Increment 1's readings; a JPEG reading carries ΔE00 ≈ 2. The person's comparison judges the result.
```

# Appendix F: state drafts

**F-251 `attested`:** three entries in F-250's shape, each `"blocks": "release", "status": "outstanding"`:

- **Criterion 3:** gated for structure, attested for appearance. It cites both fidelity tests and the sweep, with ADR-0162 to ADR-0166 as the named departures, and asks the person to confirm or flip ADR-0162 and the lock model.
- **Criterion 4:** the capture run, with its *expected, not defects* list.
- **Criterion 5:** gated except the device half.

**R9 §8, the `10` and `16` rows (replacing `10 16 | contrast ratio; CVD separation | FR-3; FR-5 per palette | exists`):**

| | drawn | binds to | feature |
|---|---|---|---|
| `10` | each card's description, provenance, band and columns; *WCAG* and *CVD* badges; the tags | the record's category and classification (FR-23), source type and review (`reviewLine`); members at the record's weights; the floored WCAG ratio and its threshold over the anchor and the first light member; `floor` of the worst `worstSeparation` with its model; the classification label or the device's words (ADR-0164) | `F-251` |
| `16` | the slots; *Contrast Ratio (Slot 1 vs 2)*; *Colour Harmony*; *CVD Distinction* | the draft's slots (the corpus record); `contrastLine` over slots 1 and 2 (FR-3); 07's warm–cool words (FR-6, E-226); `separationLine` of the floored worst separation (FR-5, E-005) | `F-251` |

**R9 §11:**

- OQ-45 moves under *Closed* for 10 and 16 (ADR-0162), with the remainder (the seam half; 04 and 23) left open on F-245 and F-260.
- OQ-23 → *Closed* (ADR-0163).

**Notes on other features:**

| feature | note |
|---|---|
| F-245, F-260 | OQ-45's rule (ADR-0162): a judged pair keeps the floor; apply it to 04 and 23 or revisit with a reason. The seam half is still open |
| F-257 | OQ-23's rule; 10's Apply is a second writer of the Lab hand-off (E-219); FR-35's block lives on 16 (ADR-0165 D6) until the Lab takes it |
| F-263 | OQ-23's rule; the export route reads `palette` and `saved` (E-237); *Export Selected* exports one palette |
| F-264 | 10's export bar in Washi is `border.strong` (the ink colour) with its declared ink (ADR-0166 D4) |
| F-265 | 配色工房; the ja role, type and tag words; the ja classification label on palettes reads 当社の色 |
| F-267 | the expected differences in Attestations, item 1 |
| F-344 | 10's badges and tags, and 16's chips, clip at 200 % where fixed-height |

**New backlog feature, only if the census confirms it — F-357:** *"07's separation figure is floored, so it prints 100 only when it is 100"*.

- **Acceptance:** `separationLine`'s figure on 07 is the floor of the exact `cvdAccessibility` worst, never `componentScore`'s rounding. A test holds every corpus outfit's printed figure at or below exact.
- **Requirements:** FR-5, NFR-21. **Mockups:** 07.
- **Note:** FROM F-251.

---

**Not checked by the planner:**

- I did not read `10.json`, `16.json`, the capture spec's format, the `selection-treatment` rule, `screens.test`'s `ENROLLED` block, the manifest's pairing format, or the Outfit Builder's own CVD surface.
- I did not verify the corpus kanji for vertical forms, or compute any badge figure, segment width or Washi ink: the census owes those.
- I did not verify expo-router's same-route push behaviour.
- The CIE's 1°–4° domain is cited from secondary sources (Konica Minolta, X-Rite); CIE 015 and CIE 116 were not read.