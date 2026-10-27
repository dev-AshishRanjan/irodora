# Plan: F-250 — Finder is mockup 09

| | |
|---|---|
| **Feature** | F-250 ([`feature_list.json`](../state/feature_list.json), line ≈8671) |
| **Requirements** | FR-47. Also applied: FR-23 (corpus names as authored), FR-71 (the tab bar on a pushed route, C1/E4), NFR-8, NFR-21. Done criteria that must survive: F-021 c1–c3 (all forms searchable, a hex returns its nearest by ΔE00, a phrase maps deterministically to a region); F-151 c3 ("leads with its field and results arrive without a layout jump") and c4 ("every ΔE00 … tabular and complete"); F-266's Arrival/Appear (E-199); F-236's `STATES` (E-191). Screen-level designs this supersedes in part are listed under D-3 (ADR-0160) |
| **Service / package** | `apps/mobile` · `@irodora/ui` (additive only). No `packages/color-*` change, so no golden data is owed |
| **Author** | The planner subagent. It read files and did three web lookups (CSS Color 4's OKLCh reference ranges, twice; Apple's search-field Clear convention). It built, measured and ran nothing. The implementing session records its own changes under *Implementing session's decisions* |
| **Date** | 2026-10-27 |
| **Decisions** | ADR-0158 (the search model), ADR-0159 (09's figures and words), ADR-0160 (09's controls, and what leaves the Finder), ADR-0161 (09's composition, its art and its result cards). No OQ blocks this feature (Risks, item 14) |

---

## Intent

A person taps *Finder* on the Atlas (05). They land on mockup 09, top to bottom:

- **The app bar:** `← Atlas | Colour Finder • 検索 | ✕ Clear`, with no rule under it.
- **The query card:** a search field (with a circled × while it holds text), and three chips: *Natural Phrase · Colour Name · # Hex Code*. The chosen chip says which question was answered.
- **"Perceptual Dimension Slider Matrix"**, then a card with three one-row sliders: Lightness (L) as a percent, Chroma (C) to 3 dp, Hue (H) in whole degrees. Each shows its value and, in parentheses, the lexicon terms that hold it.
- **"Instantaneous nearest results ranked by ΔE00"**, then a two-column grid of result cards. Each card *is* the colour (C8), with text on it: kanji and romaji, the English name in parentheses, `hex • ΔE00 d`, and on the nearest card only, its OKLCh line.
- **The leaves** at the top right, behind the cards.
- **01's tab bar** (C1).

What the person types names a set of colours and sets a point. The sliders show that point and move it. The results are that set, ranked by ΔE00 from the point. Every value comes from the corpus, the lexicon or the engine.

"Done", for a person:

- In both themes and both languages, the page reads as 09.
- Typing `dark muted green`, `#526A6B` or `ai` sets the sliders, marks the chip of the question answered, and lists colours whose ΔE00 is measured from the point the sliders show.
- Moving a slider re-ranks the results at once.
- A card opens its colour.
- *Clear* starts over, and the field's × empties the field.
- Nothing on the page says *Moss Green*, *Medium Deep*, *Koke-iro* or a figure 09 drew.

---

## Findings from planning

Everything here comes from reading. Nothing was run.

### 1. The current screen is not 09

`apps/mobile/src/screens/Finder.tsx`:

- **Header:** the platform header. The route (`app/(tabs)/atlas/find.tsx:14`) sets `title: 'Irodora'`. The body calls `Screen title={t('finder.title')}` (line 150).
- **Body, in order:**
  - one filled `SearchField` (151);
  - a hint line (152–154);
  - the "answered as" heading line (168–170);
  - a `Surface` list of up to `LIST_LIMIT = 40` rows (84, 183–210), each a 40 dp `Swatch`, the name and hex, plus a ΔE00 on hex answers only. The rows are inside `Arrival` / `Appear` (197–208);
  - a region card with the lexicon version, for phrase answers only (225–259).
- **States:** `STATES = { absent: 'empty' }` (60).
- **Missing entirely:** sliders, chips, back, Clear, art and the grid.

### 2. `find()` has three readers. Its contract is kept

`apps/mobile/src/finder.ts`:

- **The function** (`find`, 235–263): a hex gives the nearest `HEX_LIMIT = 8` (182) through `hexNearest` (86); a phrase gives the region's entries, unranked, in slug order; anything else goes to `byName` (282), a substring match over kanji, kana, romaji, English and slug.
- **Reader 1, the Atlas** (`atlas.ts:176`): ranks the whole corpus with `hexNearest(query, entries.length)` and narrows it. E-210's guard (`atlas.test.ts`) uses `find()` as its oracle, including the phrase decoy `find('dark').kind === 'phrase'`.
- **Reader 2, Compare's chooser** (`compare-readout.ts#pickList`, 365): reads `find(query).entries` (E-229; F-249's note asks that the contract be kept "or change both together").
- **Reader 3, the Lens:** reads `nearestByOklch` (202).

So F-250 adds alongside `find()` and changes none of it.

### 3. The phrase lexicon (`content/rules/phrase-lexicon.2026.08.1.json`)

**English, 18 terms:**

| axis | terms |
|---|---|
| lightness | dark [0, 0.395] · medium [0.395, 0.725] · light [0.725, 1] |
| lightness and chroma | pale (L ≥ 0.725, C ≤ 0.06) |
| chroma | grey and neutral [0, 0.039] · muted and soft [0.02, 0.07] · vivid [0.10, 0.40] |
| hue | red, orange, brown, yellow, green, teal, blue, violet, pink. Each carries a chroma floor of 0.039; brown also needs L ≤ 0.55 |

**Japanese, 10 terms:** 暗い · 明るい · 淡い · くすんだ · 鮮やかな · 赤 · 黄 · 緑 · 青 · 紫.

**Where no term applies** (predictions from the file):

- **English chroma:** nothing holds (0.07, 0.10) — printed 0.071–0.099, 29 values.
- **Japanese lightness:** no term for medium — printed 40–72 %, 33 values.
- **Japanese chroma:** no grey or neutral, so [0, 0.02) has no term — 20 values. With the English gap, 49 values.
- **Japanese hue:** none for orange or brown, teal or pink.
- **Any hue, either language:** below C 0.039 no hue term holds.

**What 09's own readings show:**

- 09 draws `0.045 (Muted / Soft)`: the two synonyms that hold 0.045, joined by " / ". That is the drawing's own evidence for the reading rule.
- `48% (Medium Deep)`: the lexicon has *medium*; *Deep* is no term (E1).
- `142° (Moss Green)`: the term is *green*; *Moss* is sample content.

**Other facts:**

- `matchesRegion` and `inRange` are inclusive at both ends (`packages/corpus/src/lexicon.ts:257–306`).
- `resolvePhrase` reads terms of both languages.

### 4. 09.json's defects, to correct in increment 1 (F-246 to F-249 each found several)

| element | defect |
|---|---|
| `09.header` | `B(0, 0, 768, 115)` is "symmetric about its elements", and no rule is drawn. The bar's height is not read |
| `09.title` | `type: title 600` from a 33 px box. F-249 found 08's similar box was `label` 500 (13.7 dp an em). Suspect |
| `09.back`, `09.clear` | record no type. `09.back` binds `static:atlas.back`; 08's locator overrides it with `tab.atlas` (`compareLocators`, `screens.test.tsx:1043`) |
| `09.search.query` | is `ui:TextField`, so the derived locator looks for `TextField`. It is a search field: rebind to `ui:SearchField` |
| `09.search.mode-*` | `level2` fill and pill shape, no type. The brackets inside `[Natural Phrase]` and `[Japanese Kanji]` are not recorded (they are filled pills, which §2's bracket bullet does not yet name). `mode-kanji` binds `finder.mode.kanji` |
| the four result cards | are drawn as two forms. Cards 1–2 set `kanji romaji` inline; cards 3–4 put the kanji on its own line (`result-3.kanji`, `result-4.kanji`). Card 2 splits `#715C1F •` / `ΔE00 1.45` (`result-2.hex` and `.distance`), although card 1's line of the same length does not wrap. Sibling and wrap artefacts of sample content |
| result cards | `radius md` on card 1 only (`cornerPx 19.75`; R9 §5 reads 8.75 dp, which is `md`). Heights are 216 / 216 / 221 / 221 px |
| `09.results.result-1.name` | is "gothic body 500" by F-220's rule, not measured. The other lines are `label` |
| `09.art` | `B(560, 97, 208, 323)` could not be measured: R9 §5 lists `09.art` among the seven boxes that catch a neighbour. Its top (48.5 dp) is inside the bar's box (0–57.5 dp) |
| `09.sliders.*.value` | binds `derived:F-250`, and R9 §8's `09` row says this feature defines it |
| `09.sliders.hue.track` | the thumb sits at 67 % of the track for 142° (39 %). Sample content (E1) |
| `09.tabs.atlas.label` | binds `static:tabs.atlas`; the catalogue key is `tab.atlas` (F-246 rebound 05's) |
| `09.tabs.atlas.icon` | is `compass`; the product's Atlas tab draws `atlas` (`src/tabs.ts:75`). With `map` and `settings`, it is no tab's glyph under C1 |

### 5. The UI components fall short in four places

- **`Slider`** (`packages/ui/src/controls.tsx:686–814`):
  - it draws its header (label and value) **above** the track (`SliderHeader`, 691–721). 09 draws label · track · value **on one row**;
  - its parts carry no ids (only the thumb takes `testID`);
  - a value like `0.045 (Muted / Soft)` is spoken from `valueLabel`, slash and all;
  - its defaults are already 09's (`SLIDER_TRACK` 3.5, `SLIDER_THUMB` 14, `labelSize`/`valueSize` `label`; recomputed by `slider.test`, E-157);
  - it has **no app consumer** today: F-249 removed Compare's (F-346's note). F-250 gives it one.
- **`SearchField`** (`SearchField.tsx`):
  - it has a filled form and a drawn (outlined) form. 09's field is neither: it sits unoutlined inside its card;
  - its only trailing control is a selectable **toggle** (`SearchFieldToggle`, 51–60, the Atlas's bookmark). 09's circled × is a plain action, shown while the field holds text.
- **`ChoiceGroup` pills** (`ChoiceGroup.tsx:146–161`): draw unchosen pills **outlined** in `border`. 09 draws them **filled** `level2` with no edge (to measure).
- **`Swatch`** (`Swatch.tsx`): already has everything 09 needs — `width`/`height="fill"`, `children`, `group={false}` with `onPress` (F-248's tile form, `Wear.tsx:358–401`), `corner`, `keyline`.
- **`AppBar`:** already takes a trailing labelled `button` with a glyph (`AppBar.tsx:165`), which is `✕ Clear`.

### 6. Japanese title

- The ja catalogue's `finder.title` is 色さがし (`ja.ts:200`), and 05's chip `atlas.finder` is also 色さがし (`ja.ts:96`).
- 09's Japanese run is 検索.
- `japaneseRun('finder.title')` would therefore print "Colour Finder • 色さがし", which is not 09.
- Compare's pattern: the ja `compare.title` 比較 *is* 08's run, and in Japanese the run repeats and is not drawn (`Compare.tsx:279–280`, ADR-0142 D5).

### 7. "Japanese Kanji" misdescribes the search behind it

`byName` reads kanji, kana, romaji, English and slug. A chip that is marked chosen for `ai` or `Moss` would say that a romaji or English query was read as Japanese kanji.

### 8. Old tests assume the old screen

**`apps/mobile/test/screens.test.tsx`:**

- **Subjects:**
  - `screens/Finder` (1926);
  - `screens/Finder (with a phrase answer)` (1940);
  - `screens/Finder (the phrase found nothing)` (2966, with `zzqx`, which is a *name* query).
- **`FINDER_STATES`** (3151).
- **The tabular block** (3774, 3792, 3795): stays true.
- **FR-47 describe** (4164–4235): the three "answered" sentences and their decoy; "That phrase means", the axes and OKLCh; the version `2026.08.1`; "ΔE00 on a hex answer and none on a phrase answer"; "invites a query rather than listing the whole corpus"; "says nothing matched".
- **A11 headings** (4238–4253): stays.
- **F-151 thumbnail decoy** (5425–5437): `Finder initialQuery="ai"` heights must all be under `nativeJudgeableSample` (77). **09's cards are 108 dp**, so this decoy must move.
- **F-151 "results do not move"** (5495–5556): the answer line's position, and "region beneath the results".
- **`LIST_SURFACES`** (6801–6807): keeps `09.results.result-1`/`-4`.

**Elsewhere:**

- `apps/mobile/test/chrome.test.ts`: `PLATFORM_HEADER['atlas/find']` (118), and the decoy at 179–186 **uses `atlas/find`**, so it must move to another listed route (`atlas/palettes`).
- `apps/mobile/e2e/capture/routes.json:171–173`: anchor `finder.title`.
- `.harness/verification/screen-insets.json`: lines 521–522 and 970.
- `finder.test.ts`: stays as it is. It is the contract's guard.

### 9. Effects already reaching the Finder

E-026, E-044, E-091 (its guard text cites "the Finder's answer line"), E-109, E-164, E-199, E-210, E-211, E-229; E-157 (`SLIDER_TRACK`/`SLIDER_THUMB` recomputed from 09).

### 10. A medoid already exists

`atlas.ts#familyDotEntry` (272–292): least summed CIEDE2000 over published Lab, ties to the earlier slug (ADR-0143 D4). The Finder needs the same function. A second copy would be a second definition.

### 11. Catalogue keys only the old screen reads

`finder.hint`, `finder.empty`, `finder.answered.*`, `finder.region`, `finder.vocabulary`, `finder.noneHexHint` (a hex always has 8 nearest, so it is unreachable). Also check `filter.lightness`, `filter.chroma`, `axis.hue`, `space.oklch` and `atlas.showing` for other readers before removing anything.

---

## Decisions

All four rest on R9 §11's delegation of 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–14 are not reopened. Full drafts are in Appendices A–D.

### D-1 (ADR-0158): a query names a set and a point; the sliders are the point; results are the set ranked by ΔE00 from it

- **`find()` is unchanged.** `findAs(query, kind)` is added for a forced reading, and `find(q)` deep-equals `findAs(q, find(q).kind)` for every census query.
- **Set and point, by kind:**

| query | set | point (the sliders) |
|---|---|---|
| hex (detected or forced) | the whole corpus | the hex's own OKLCh, through the engine (`hexToXyz` → `xyzToOklch`, in `finder.ts`) |
| phrase | `find(q).entries` (the region's) | the set's **medoid** |
| name | `byName(q)` | the set's medoid |
| empty field | the whole corpus | `DEFAULT_POINT`, the **corpus medoid** |

- **Results:** the set ranked through the one ranking route: `nearestByOklch(point, corpus size)`, narrowed to the set (the Atlas's form, ADR-0143 D1).
  - A named set is shown whole.
  - The whole corpus is shown as its nearest `HEX_LIMIT` (8). So a hex lists exactly `find(q).entries`, with the same distances (E-210).
  - A phrase or name answer's first card is its medoid, at ΔE00 0.00.
- **Moving the point:**
  - A slider moves one axis of the point. The set stays, and the results re-rank in the same render ("Instantaneous").
  - A new answer resets the point.
  - An answer with no entries leaves the point as it was and shows 00's caption.
- **The point is held as set.** The sliders print it at their precision (D-2), and every card's ΔE00 is measured from the point as held.
- **Rule 11.** The point is a search target. It is never drawn as a colour, never called a measurement, and spoken as "the search point". No sample of it is drawn: 09 draws none, and a colour without corpus provenance would be rule 12's problem.

### D-2 (ADR-0159): 09's figures and words say what the corpus and the lexicon hold

**The sliders** follow CSS Color 4's OKLCh reference ranges: "for L: 0% = 0.0, 100% = 1.0" and "for C: 0% = 0.0 100% = 0.4"; C's maximum is "theoretically unbounded (but in practice does not exceed 0.5)".

| slider | range | step | printed |
|---|---|---|---|
| L | 0–100 % | 1 % | `Math.round(L × 100)` % |
| C | 0–0.400 | 0.001 | 3 dp |
| h | 0–359° | 1° | `Math.round(h) mod 360` (359.6 prints 0°) |

The labels are as drawn: *Lightness (L) · Chroma (C) · Hue (H)*. The accessible names say "OKLCh lightness / chroma / hue angle of the search point".

**The readings:**

- **Which terms appear:** the locale's terms whose **naming axis** is this slider's, and whose whole region holds the **printed** point (all three printed figures, as the lesson "describe the number you print" requires).
- **A term's naming axis:**
  - hue, if the term constrains hue;
  - else lightness, if it constrains lightness;
  - else chroma.
  - So *pale* and 淡い are read on lightness, *brown* on hue, and the hue terms' chroma floor and brown's lightness cap are conditions, not readings.
- **Order and joining:** file order, joined `" / "` (09's) in Latin and `"・"` in Japanese, in the script's own parentheses (ASCII in Latin, full-width in Japanese).
- **No term:** *No term* / 該当語なし.
- **Longest reading** (predicted): English chroma at 0.020–0.039 reads *Grey / Neutral / Muted / Soft*.

**The result cards** each print one form (the sibling rule; ADR-0161 records the choice):

| line | prints |
|---|---|
| name | `nameLine(entry)` (08's kanji and capitalised romaji, one paragraph that wraps) |
| English | `(${entry.entry.name.en})`, corpus content in both locales (ADR-0142 D5) |
| distance | `${hex} • ΔE00 ${printedDeltaE00(d)}` (2 dp, ADR-0125), one paragraph |
| OKLCh, nearest card only | `oklchLine(record, t('coord.oklch'))` at 3, 3, 1, the precision 05 and 06 print. 09's 2/3/0 digits are sample content |

**The chips:** *Natural Phrase · Colour Name · # Hex Code* (ja ことば · 色名 · # 16進コード).

- *Japanese Kanji* is an **E2** row: the name search reads five forms, so the drawn word would claim a kanji reading for romaji or English.
- The brackets are notation. §2's bracket bullet widens from outlined to filled pills.
- The `#` stays. It is the hex notation.

**The title:**

- The ja `finder.title` becomes **検索**, 09's word. The English title reads `Colour Finder • 検索` through `japaneseRun('finder.title')`.
- In Japanese the run repeats the title and is not drawn (ADR-0142 D5's OQ-48 interim, applied, not decided).
- `atlas.finder` (ja) follows to 検索, so the chip on 05 and the page it opens share one name.

**The headings:** *Perceptual Dimension Slider Matrix* and *Instantaneous nearest results ranked by ΔE00* are kept. Neither is a claim. *Instantaneous* is true: the results are recomputed in the render that makes the change.

### D-3 (ADR-0160): what 09's controls do, and what leaves the Finder

**The chips** are one radio group, named *Read the search as*. The chosen chip is the reading in effect:

- the person's choice if they made one;
- else, while the field holds text, the kind `find()` detected;
- else none.

So in the start state the three are drawn alike, as 09 draws them. More on the chips:

- Choosing a chip reads the field's text that way (`findAs`). It closes `finder.ts`'s stated cost: `ffffff` and `beaded` become hexes under *# Hex Code*.
- The choice persists until *Clear*.
- The chosen chip carries ADR-0141's leading dot (E3).

**The field's ⊗:**

- It empties the text. The point and the choice stay.
- It is shown only while the field holds text (Apple's search-field convention; it was hidden when empty in Cocoa).

**`✕ Clear`:**

- It resets the text, the choice and the point to `DEFAULT_POINT`.
- It is always enabled, as drawn. Pressing it at the start does nothing, because it is idempotent.

**The sliders** each move one axis of the point.

**A result card:**

- It opens `/atlas/[slug]`.
- It is one stop for a screen reader: name, English, `hex • ΔE00` (spoken "from the search point"), the OKLCh line on the first card, then its provenance (F-248's tile form: the words hidden, `swatchAccessibleName` on the press node).

**Back** navigates to `/atlas`.

**Leaves the page:**

- the "answered as" sentence (the chips say it);
- the region card and the vocabulary version (the readings name the terms, and `find()` still returns region and version);
- *Showing n / N* and `LIST_LIMIT` (a named set is shown whole);
- the hint line;
- the platform header.

**Supersedes in part:**

- the F-151 test decoy "a Finder result is still a thumbnail". 09 draws 172 × 108 cards; the decoy moves to Compare's 32 dp chooser rows;
- screens.test's "no ΔE00 on a phrase answer". The point is drawn now, so the figure has a question behind it.

**E4 (no mockup draws these):**

- the empty field (the corpus medoid, its nearest 8);
- 00's caption with the kind's hint when the set is empty;
- the forced-reading hints: *That is not a hex* and *Not every word is in the vocabulary*.

### D-4 (ADR-0161): 09's composition, its art and its result cards

- **Intervals:** the table below, snapped by §2. Three are named because they come out negative or under half a step: sliders title → card, name → English, distance → OKLCh.
- **Result cells:**
  - each fills half the row: 172 dp at 384, derived from the tree, never restated;
  - each is at least `RESULT_HEIGHT` = 108 (the drawn 108 / 110.5 are a 2:2 tie, so the smaller) and grows with its words (E3);
  - a row shares its taller card's height, as the Atlas does.
- **The slider row:** label · track (flex, a minimum width) · value. The value wraps in its column.
- **The art:** one `leaves` fragment, `tone="backdrop"`, in the list header's art layer, behind the opaque cards and clipped there (01's and 08's form). Where 09's strokes rise above the bar's foot, the clipped part is the stated cost, unless increment 1 shows it must sit at screen level.
- **Chrome:** no rule under the bar (09 draws none). 01's tab bar (C1). No action bar.
- **Read in increment 1:** corners, edges, fills, type steps and weights.

---

## Implementing session's decisions on this design

*(To be written by the implementing session after increment 1 and after the review, as F-249's plan does.)*

---

## Approach

### Reused (paths)

**`@irodora/ui`:**

- `Screen` (`scroll={false}`, `bleed`, `appBar`), and `AppBar`:
  - `back`: `label`, `name`, `size`, `weight`;
  - `title`: `align: 'centre'`, `layout: 'inline'`, `ja`;
  - `trailing.button` (plain, `glyph` `close`, `glyphSize`);
  - `height`, `inset`.
- `Card`; `Swatch`: `width`/`height="fill"`, `corner="md"`, `keyline={false}`, `group={false}`, `onPress`, children; `swatchAccessibleName`.
- `Text` (`on={sample}`, ADR-0116), `ChoiceGroup` (pills), `SearchField`, `Slider`.
- `Illustration` (`leaves`, `backdrop`), `EmptyState` (`resolvedHere`), `Arrival` / `Appear`, `Row` / `Stack`, `BILINGUAL_SEPARATOR`.

**`apps/mobile/src`:**

- `finder.ts`: `find`, `byName`, `hexNearest`, `nearestByOklch`, `lexicon`, `looksLikeHex`, `HEX_LIMIT`.
- `compare-readout.ts#nameLine`: moved to `notation.ts` and re-exported, so 08 is unchanged.
- `notation.ts`: `oklchLine`, `capitalised`.
- `corpus`: `allEntries`, `colorFor`.
- `i18n`: `useMessages`, `japaneseRun`, `message`.
- `states.ts`.
- `atlas.ts#familyDotEntry`: its loop becomes `medoid.ts`.
- `Atlas.tsx`'s grid form: `Arrival > FlatList numColumns={2}`, `ListHeaderComponent` as an **element**, cells `flex: 1, maxWidth: '50%'`.
- `Wear.tsx`'s `HIDDEN` and its tile form.
- `Compare.tsx`'s art layer.

**Packages:**

- `@irodora/color-difference`: `printedDeltaE00`, `deltaE00` (the medoid; test oracles).
- `@irodora/color-spaces`: `xyzToOklch`.
- `@irodora/corpus`: `hexToXyz`, `matchesRegion`, `resolvePhrase`, `LexiconTerm`, `LEXICON_AXES`.
- `@irodora/color-naming` through `nearestByLab`: the one ranking.

**Tests and tools:**

- `test/inventory.ts` (`Locator`, `derivedLocator`); `screens.test.tsx` (`draw`, `drawLive`, `ENROLLED`, `without`, `TAB_INDICATOR_TEST_ID`, `APP_BAR_RULE_TEST_ID`).
- `compare-fidelity.test.tsx` and `wear-fidelity.test.tsx` helpers, copied in shape: `el()` from the pixels, `snap`, `belowTheScale`, `inOrder`, `sharedRow`.
- `compare-states.test.tsx`'s `wordsOf`, `leaks` and route-body reader.
- `mockups/tools/*.ps1` (the method) and `generate-inventory.mjs`.
- `scripts/generate-e2e-flows.mjs`, `verify-font-coverage.mjs`, `generate-font-subset.mjs`; `pnpm fidelity:capture`.

### New

**`apps/mobile/src/medoid.ts`** (pure):

- `medoid(entries)`: the least summed `deltaE00` over published Lab, ties to the earlier slug. The definition is moved from `familyDotEntry`, which now delegates (filter, sort, `medoid`).

**`apps/mobile/src/finder.ts`** (additive; `find()` is unchanged):

- `type Reading = 'hex' | 'phrase' | 'name'`.
- `findAs(query, reading): FinderResult`:
  - hex reads `#`-prefixed text through `hexNearest`;
  - phrase reads through `resolvePhrase`;
  - name reads through `byName`;
  - unreadable text returns `{ kind, entries: [], unreadable: true }`.
- `FinderResult.unreadable?: true`, which `find()` never sets.
- `hexPoint(query): Triple | null`: the hex's OKLCh (`xyzToOklch(hexToXyz(normaliseHex))`).
- `rankedFrom(point, set: 'corpus' | readonly PublishedEntry[], limit)`: `nearestByOklch(point, allEntries().length)` narrowed to the set, cut at `limit` for the corpus. One ranking route.

**`apps/mobile/src/finder-readout.ts`** (pure, `compare-readout.ts`'s counterpart):

- **State:** `FinderState = { text, chosen: Reading | null, point: Triple }`; `START`; `DEFAULT_POINT()` (the corpus medoid's OKLCh, memoised).
- **Transitions:**
  - `typed(s, text)`: sets the text; the point becomes the new answer's when it has one;
  - `choose(s, reading)`;
  - `moved(s, axis, value)`: clamped; hue taken mod 360;
  - `clearedText(s)`: empties the text; point and choice kept;
  - `cleared()`: returns `START`.
- **Answers:**
  - `readingInEffect(s)`;
  - `answerOf(s)` → `{ reading | null, set, results: { entry, deltaE00 }[], unreadable?, hintKey? }`.
- **Readings:**
  - `NAMING_AXIS(term)`;
  - `printedPoint(point)`;
  - `termsHolding(axis, printed, locale)`;
  - `sliderReadings(point, locale, t)` → per axis `{ figure, terms, text, spoken }`.
- **Cards:** `resultLines(entry, d, index, t)` → `{ name, english, distance, oklch?, spoken }`.
- **Literal maps** (so the unused-key scan sees each reader): `AXIS_LABEL_KEYS`, `MODE_KEYS`, `HINT_KEYS`.
- **Drawn constants,** each recomputed from `09.json` by `finder-fidelity.test`: `FINDER_APP_BAR`, `BACK_GLYPH_09`, `CLEAR_GLYPH`, `QUERY_CLEAR_GLYPH`, `MODE_CHIP`, `RESULT_HEIGHT`, `FINDER_ART`, plus any corner or type constant increment 1 reads.
- **Slider ranges** as above.

**`@irodora/ui`:** every change is additive. Without the new prop the old tree renders, and a decoy proves it.

| component | change | forced by |
|---|---|---|
| `Slider` (`controls.tsx`) | (a) `layout?: 'row'`: label, then the track (`flex: 1`, `trackMinWidth`), then the value (wraps), in one row. Default unchanged. (b) In the row form with a `testID`: `${id}.label`, `${id}.track`, `${id}.value`; the thumb keeps `${id}`. (c) `valueName?: string`: the spoken `accessibilityValue.text` when it differs from `valueLabel` (F-249 M9's form for a slash) | 09's slider rows; the sweep's `09.sliders.*.value` |
| `SearchField` | (a) `form?: 'bare'`: no fill and no outline, the field inside its card, the touch still the platform target. (b) `clear?: { label; onPress; size?; testID? }`: an `IconButton` `close-circle`, not a toggle (no `selected`), shown only while `value !== ''`. The text stops short of it. The type refuses `clear` together with `trailing` | `09.search.query`, `09.search.clear` |
| `ChoiceGroup` pills | **only if increment 1 reads them so:** `restFill?: 'surface.2'` and `restEdge?: false` for unchosen pills (09's filled `level2`); the chosen pill keeps its dot and edge | `09.search.mode-*` |

### The composition, as a sketch

```tsx
<Screen scroll={false} bleed script={script}
  appBar={{ height: FINDER_APP_BAR, inset: md, gap: sm, script,           /* no rule: 09 draws none */
    ...(onBack && { back: { glyph: 'back', label: t('tab.atlas'), name: t('detail.backToAtlas'),
                            size: BACK_GLYPH_09, weight: /*Inc 1*/, onPress: onBack } }),
    title: { text: t('finder.title'), ...(script === 'japanese' ? {} : { ja: japaneseRun('finder.title') }),
             align: 'centre', placement: 'bar', layout: 'inline', size: /*Inc 1*/, weight: /*Inc 1*/ },
    trailing: { button: { variant: 'plain', glyph: 'close', glyphSize: CLEAR_GLYPH, label: t('finder.clear'),
                          name: t('finder.clearName'), weight: /*Inc 1*/, script, onPress: clearAll,
                          testID: 'finder.clear' } } }}>
  <Arrival>
    <FlatList data={answer.results} numColumns={2} keyExtractor={(r) => r.entry.entry.slug}
      ListHeaderComponent={header /* an ELEMENT, never a component type: the field keeps focus */}
      ListEmptyComponent={<View style={{ paddingHorizontal: md }}>
        <EmptyState message={t('finder.none')} hint={t(answer.hintKey)} resolvedHere script={script} /></View>}
      columnWrapperStyle={{ paddingHorizontal: md }} ItemSeparatorComponent={/* sm */}
      renderItem={({ item, index }) => (
        <View style={{ flex: 1, maxWidth: '50%', ...(index % 2 === 0 ? { paddingRight: xs } : { paddingLeft: xs }) }}>
          <Appear index={index} fill><ResultCard item={item} index={index} /></Appear></View>)}
      contentContainerStyle={{ paddingTop: /*Inc 1: lg*/, paddingBottom: md }} />
  </Arrival>
</Screen>

const header = (
  <View>
    <View pointerEvents="none" testID="finder.art" style={{ position: 'absolute', top: -/*paddingTop*/, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', ...FINDER_ART }}>
        <Illustration name="leaves" tone="backdrop" color="foreground" width={FINDER_ART.width} testID="finder.art.leaves" />
      </View>
    </View>
    <View style={{ paddingHorizontal: md }}>
      <Card level="1" radius="md" testID="finder.search">              {/* padding: Inc 1 */}
        <SearchField form="bare" label={t('finder.search')} value={state.text} onChangeText={(x) => set(typed(state, x))}
          size="body" testID="finder.search.query"
          clear={{ label: t('finder.queryClear'), size: QUERY_CLEAR_GLYPH, onPress: () => set(clearedText(state)), testID: 'finder.search.clear' }} />
        {/* xs */}
        <ChoiceGroup label={t('finder.readAs')} value={readingInEffect(state)} onChange={(r) => r && set(choose(state, r))}
          options={[phrase, name, hex].map(...)} pills={{ height: MODE_CHIP, gap: 'sm', size: /*Inc 1*/, /*restFill, restEdge: Inc 1*/ }}
          script={script} testID="finder.modes" />
      </Card>
      {/* md */}
      <Text size=/*Inc 1*/ weight=/*Inc 1*/ color="foreground" heading script={script} testID="finder.dimensions">{t('finder.dimensions')}</Text>
      {/* xs, named: −0.2 dp drawn */}
      <Card level="1" radius="md" testID="finder.sliders">
        <Stack gap=/*Inc 1: md*/>
          {(['lightness', 'chroma', 'hue'] as const).map((axis) => (
            <Slider key={axis} layout="row" label={t(AXIS_LABEL_KEYS[axis])} value={state.point[i]} min max step
              valueLabel={readings[axis].text} valueName={readings[axis].spoken} valueColor="foreground.2"
              onValueChange={(v) => set(moved(state, axis, v))} script={script} testID={`finder.sliders.${axis}`} />))}
        </Stack>
      </Card>
      {/* md */}
      <Text size=/*Inc 1*/ weight=/*Inc 1*/ heading script={script} testID="finder.nearest">{t('finder.nearest')}</Text>
      {/* xs */}
    </View>
  </View>
);
```

**`ResultCard`:**

- **The cell:** `View testID="finder.result.${i}" style={{ flex: 1, minHeight: RESULT_HEIGHT }}`.
- **The sample:** `Swatch name={lines.spoken} hex color width="fill" height="fill" corner="md" keyline={false} group={false} onPress testID="finder.result.${i}.open"`.
- **The words:** inside it, a `View pointerEvents="none" {...HIDDEN}` padded (Inc 1: `sm` vertical, `md` leading) holding four `Text on={sample}`:
  - `.name` (body 500, script);
  - `.english`;
  - `.distance` (`numeric selectable`);
  - and on `i === 0`, `.oklch` (`numeric selectable`).
- **An absent `onOpenColour`:** no `onPress`, so the node is an image.

**Absent handlers mean absent controls.** Props: `initialQuery?`, `initialReading?`, `onBack?`, `onOpenColour?`. *Clear*, the ⊗, the chips and the sliders belong to the screen and are always drawn.

### Drawn intervals, from the current `09.json` at 0.5 dp/px, insets subtracted

Line insets, as F-249 tabulated (latin / ja): title 2.2 · body 5.2 / 6.8 · label 3.85 / 5.165 · caption 2.575 / 3.51.

**The test recomputes every row from the pixels (F-248's lesson), and increment 1 may move any box.**

| interval | px | dp | less | built | snap |
|---|---|---|---|---|---|
| bar (no rule) | 0–115 | 57.5 | — | | `FINDER_APP_BAR`. **Inc 1:** the controls' rows; 08's bar is 46.5 to its rule |
| bar sides: back / Clear | 31 / 27 | 15.5 / 13.5 | — | | `md` |
| bar foot → query card (the leaked *HeroUI Card level="2"*'s space kept, F-246's rule) | 51 | 25.5 | — | | `lg` |
| page inset: query and sliders cards | 29 / 29 | 14.5 | — | | `md` |
| query card → field text, top | 32 | 16 | 5.2 | 10.8 | `sm` (**Inc 1**: the field box is the target's height, its words centred) |
| card → text / chips, leading | 35 | 17.5 | — | | `md` |
| ⊗ → card, trailing | 35 | 17.5 | — | | `md` |
| field → chips | 22 | 11 | 5.2 | 5.8 | `xs` |
| chip ↔ chip | 13 / 13 | 6.5 | — | | `sm` |
| chips → card foot | 41 | 20.5 | — | | `lg` (**Inc 1**: near the midpoint of 20) |
| chip height · ⊗ glyph | 48–49 · 35 | 24–24.5 · 17.5 | — | | `MODE_CHIP` · `QUERY_CLEAR_GLYPH` |
| query card → sliders title | 45 | 22.5 | 5.2 | 17.3 | `md` |
| sliders title → sliders card | 10 | 5 | 5.2 | **−0.2** | **named, `xs`** (+4.2) |
| sliders card → first row (label words) | 63 | 31.5 | 3.85 | 27.65 | `lg` (**Inc 1**) |
| row → row (label boxes; thumbs 39 / 40) | 40 / 42 | 20 / 21 | 7.7 | 12.3 / 13.3 | `md` (**Inc 1**) |
| last row → card foot | 34 | 17 | 3.85 | 13.15 | `md` |
| card → label, leading | 24 | 12 | — | | `sm` (tie) |
| label → track · track → value | 14–15 · 15–16 | 7–8 | — | | `sm` · `sm` |
| value → card, trailing | 21 | 10.5 | — | | `sm` |
| track / thumb | 6.1–6.7 / 27.4–27.5 | 3.5 / 14 | — | | `SLIDER_TRACK` / `SLIDER_THUMB` (unchanged; E-157) |
| sliders card → results heading | 47 | 23.5 | 5.2 | 18.3 | `md` |
| heading → cards | 16 | 8 | 5.2 | 2.8 | `xs` |
| grid: page inset · column gap · row gap | 28 · 24 · 23 | 14 · 12 · 11.5 | — | | `md` · `sm` (tie) · `sm` |
| card width | 344 | 172 | — | | (384 − 2·md − sm) / 2, **read from the tree** |
| card height | 216, 216, 221, 221 | 108, 110.5 | — | | `RESULT_HEIGHT` 108 (2:2 tie, so the smaller), a minimum |
| card → name, top | 30 | 15 | 5.2 / 6.8 | 9.8 / 8.2 | `sm` |
| card → words, leading | 28–31 | 14–15.5 | — | | `md` |
| name → English | 12 | 6 | 9.05 | **−3.05** | **named, `xs`** |
| English → distance | 23 | 11.5 | 7.7 | 3.8 | `xs` |
| distance → OKLCh | 16 | 8 | 6.425 | **1.575** (under half of `xs`) | **named, `xs`** |
| last line → card foot | 29 / 28 | 14.5 / 14 | 2.575 / 3.85 | 11.9 / 10.15 | `sm` |

**Heights the scale makes taller than drawn.** These are estimates: a test tree has no layout, so ADR-0161 states them and the capture shows them.

| region | drawn | built (estimate) | why |
|---|---|---|---|
| a result card, one-line name, no OKLCh | 108 | 108 (minimum; content about 94) | — |
| the nearest card (OKLCh line) | 108 | ≈ 113 | +4 + one caption line. Its row shares it |
| a card whose name or English wraps | 108–110.5 | ≈ 120–140 | real names are longer than 09's; the census counts them |
| sliders card | 132.5 | ≈ 137, +21.7 per wrapped value line | `Grey / Neutral / Muted / Soft` wraps in a column of about 115 dp |
| page | — | scrolls under the tab bar | §2: a render is one scroll position |

---

## Increments

Every commit passes **Tier 1** (ADR-0132):

`pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'`

`pnpm lint` is the root lint. It includes `verify:claims`, `verify-mockups`, `mockup-inventory --check` and `verify-app-glyphs`. Domain gates are named under each step.

### 0. Claim and plan

- This file goes to `.harness/plans/F-250-finder-is-mockup-09.md`.
- F-250 is already `in_progress` with `plan` set; confirm both. Add `attested` (Appendix E).
- Gates: `node scripts/verify-state.mjs`, `pnpm format:check`.

### 1. Measure, decide, specify (no source)

**How to read the image.** As in F-248 and F-249:

- PowerShell's execution-policy bypass is refused here, so use a scratch Node reader in the session's scratchpad. It decodes `mockups/09_semantic_finder_search.jpg` with `jpeg-js` through `createRequire(apps/mobile/package.json)`.
- It reimplements only what each `.ps1` documents: `measure.ps1` (blobs, edges, mean), `corner.ps1`, `tint.ps1`, `stem.ps1`, `art-measure.ps1`.
- Every reading goes into `09.mjs`'s header with its box, background, threshold and method, so the `.ps1` can repeat it.
- Readings below 12 dp stay in comments, not `raw.emDp`.
- The reader is not committed.

**What to read:**

| region | read | lands in |
|---|---|---|
| header | the controls' rows and the bar's extent (no rule); the title's cap height and the kanji's ink separately, and its weight (`stem`) against a 400 text; *Atlas* and *Clear*: em, weight, ink; the arrow's and the ×'s ink boxes | `09.header` box, `09.title.type`, `09.back.type`, `09.clear.type`; `FINDER_APP_BAR`, `BACK_GLYPH_09`, `CLEAR_GLYPH` (ink × 24 ÷ the path's extent, less `size.iconStroke`, 06's rule) |
| query card | corner, edge (`border.subtle`?), fill (`#1D2228` against level 1); **is the field outlined or filled?** (expected: neither); the query words' em; the ⊗'s disc and ink; the caret | `09.search.tokens`; `09.search.query` → `ui:SearchField`; `09.search.clear` glyph size; a `notDesign` row for the caret if it is the platform's |
| chips | height, corner, **fill and edge** (level 2? any outline?), label em, weight, ink; the brackets' crop; the `#` | `MODE_CHIP`; type; `notDesign`: brackets; rebind `mode-kanji` → `static:finder.mode.name` with an E2 departure |
| sliders | the title's em and weight; the card's corner, edge and fill; each label's and value's em, ink and weight (value `text.secondary`?); track and thumb (unchanged unless the reading moves: `slider.test` recomputes, E-157) | type rows; `09.sliders.*.value` → `engine:finder.point+lexicon` |
| results | each card's corner (R9 §5: 8.75 dp → `md`), keyline (none?), the text inks (`foreground` or inverse, per card); the name's em by kanji and by Latin, its face and weight; the English, distance and OKLCh ems | restructure (below); `RESULT_HEIGHT` |
| art | `inkP90`/`inkP50` against R9 §5's backdrop 0.15; line width; **the strokes' true extent: do they rise above the bar's foot (57.5 dp)? do they continue under the query card, and do they show through it?**; size and orientation against the product's `leaves` drawing (`illustrationBox('leaves')`) | `09.art` box; `FINDER_ART`; `opacity.art` confirmed or measured |
| tab bar | nothing (C1) | — |

**Census.** A scratch script over the corpus and the lexicon; its numbers go into the ADRs.

- `DEFAULT_POINT`: the corpus medoid's slug, its printed L / C / h and its readings in en and ja. Assert that none is 48 %, 0.045 or 142°.
- For each of the 28 terms: region size, medoid, and whether the reading at the printed medoid holds the term. List the empty regions (pink is expected).
- Resolvable phrases (every term; every resolvable pair and triple per language): count, non-empty count, largest set.
- `byName` set sizes over every entry's five forms. Find the largest (one letter such as `a` may approach 120).
- The printed slider values with no term, per axis and locale (predicted: en chroma 29; ja lightness 33; ja chroma 49), and the longest reading.
- Whether 09's names exist in the corpus: Koke-iro, Uguisu-cha, Miru-iro, Yanagi-susutake, Moss Green, Bush Warbler Olive, Sea Moss Green, Willow Smoked (R9 E1 names only the first two).
- The one entry outside sRGB: its hex point against its record (ΔE00).
- Name-line lengths: entries whose `nameLine` or English name is likely to wrap in about 140 dp at body or label.
- The corpus's largest chroma, to state how much of the 0–0.4 track the corpus uses.
- **The fixture phrase,** chosen by a rule and read from the data: the first of `dark muted green` (FR-47's own example), `muted green`, `green` whose region holds at least 4 entries, whose printed medoid matches none of 09's figures, and whose chroma reading has two terms (to exercise " / ").

**`09.mjs` edits, then regenerate `09.json`:**

- Re-measured boxes, types, corners and inks.
- **Results restructured** to the one form: each card `.name`, `.english`, `.distance`, and result-1 `.oklch`. `result-2.hex` folds into `.distance` and `result-3`/`-4.kanji` into `.name`, each with a comment saying where 09 broke the line. The bindings become `corpus:finder.results.N.*` and `engine:finder.results.N.deltaE00`.
- `09.tabs.atlas.label` → `static:tab.atlas`.
- `notDesign`: the brackets; the caret if it is the platform's.
- `departures`:
  - **E1:** names, figures, the slider values and readings, the query text;
  - **E2:** *Japanese Kanji* → *Colour Name*;
  - **E3:** the chosen chip's dot, wraps, hit areas;
  - **E4:** the empty field, the caption, the forced-reading hints.
- `conflicts`: C1 (unchanged); C8's elements → `result-N.name`.

**Records:**

- Write ADR-0158 to ADR-0161 and add their `docs/adr/README.md` rows.
- R9:
  - **§2:** the bracket bullet gains 09's filled pills; *"HeroUI smooth sliders"* joins the leaked labels;
  - **§4 E1:** a 09 bullet;
  - **§4 E2:** the 09 chip row;
  - **§4 E3:** 09's chosen chip;
  - **§4 E4:** 09's empty field and hints;
  - **§6 C8:** 09's element ids;
  - **§8:** the `09` row (Appendix E);
  - **§10:** F-151's thumbnail decoy, F-021's region card and vocabulary line;
  - **§11:** nothing closes.
- PRD: no change.
- `feature_list.json`:
  - F-250's notes;
  - notes on F-346, F-353, F-304, F-265, F-246, F-267 and F-344;
  - **F-356** (backlog) if the census confirms the Japanese gaps (Appendix E).

**Gates:** Tier 1, plus:

- `type-scale.test` (E-152, if a step moves);
- the ui recompute tests that read every inventory: `slider.test`, the chip-height and segmented-choice tests, `sample-family.test` / `swatch-corners.test` (E-131 counts `md` samples), all through the turbo filter;
- `node scripts/verify-state.mjs`.

### 2. `@irodora/ui`

**What changes:**

- `Slider`: `layout="row"`, part ids, `valueName`.
- `SearchField`: `form="bare"`, `clear`.
- `ChoiceGroup` pills: `restFill`/`restEdge`, only if increment 1 reads them.

**Tests:**

- `slider.test`:
  - the row form's order (label < track < value in one row);
  - ids present with a `testID` and absent without one (decoy);
  - the stacked form's tree unchanged (decoy);
  - `valueName` spoken and `valueLabel` drawn;
  - `SLIDER_TRACK`/`THUMB` unchanged.
- SearchField test:
  - `clear` is an `IconButton` with no `selected` state;
  - absent on an empty value; present with text;
  - the text stops short of it;
  - the bare form draws no fill and no border;
  - the toggle form unchanged (E-204's bookmark decoy);
  - the type refuses `clear` with `trailing`.
- ChoiceGroup (if changed): the unchosen pill's fill and edge; the chosen one keeps its dot.
- New conformance subjects: `Slider (a row)`, `SearchField (bare, with its clear)` and, if changed, `ChoiceGroup (filled pills)`.

**Gates:** Tier 1, `pnpm test:a11y`, `pnpm test:contrast`, `pnpm test:cvd`.

### 3. Pure logic

**Code:**

- `medoid.ts`, with `familyDotEntry` delegating to it.
- `finder.ts` additions (`findAs`, `hexPoint`, `rankedFrom`, `FinderResult.unreadable`).
- `nameLine` moved to `notation.ts`, re-exported by `compare-readout.ts`.
- `finder-readout.ts`.

**Catalogue keys read through `finder-readout.ts`'s literal maps** (en and ja): `finder.lightness`, `finder.chroma`, `finder.hue`, `finder.mode.phrase`, `finder.mode.name`, `finder.mode.hex`, `finder.noTerm`, `finder.fromPoint`, `finder.notHex`, `finder.notPhrase`. Keys only the screen reads arrive in increment 4 (F-247's lesson: the unused-key scan refuses a key nothing renders).

**Tests:**

- `medoid.test.ts`:
  - for every family group, `medoid` equals the old loop, kept in the test as the oracle;
  - a constructed tie goes to the earlier slug.
- `finder.test.ts`, extended and with nothing removed:
  - for every census query, `findAs(q, find(q).kind)` deep-equals `find(q)`;
  - forced hex reads `beaded`, `facade`, `decade`, `accede` and `ffffff`;
  - forced phrase on `dark sparkly green` is unreadable.
- `finder-readout.test.ts` (new): see the test plan. It states its own timeout where it ranks thousands of points (F-249's `8d6a0b7`).
- `atlas.test`, `compare-readout.test` and `compare-states.test` stay green and unchanged (E-210, E-229).

**Fonts:** run `node scripts/verify-font-coverage.mjs`. If it names glyphs (likely: 検, 索, 該, 当, 語, 軸, 知, 覚, 順, 消, 方), run `generate-font-subset.mjs`, then `fonts.test`, then `generate-font-subset.mjs --check`.

**Gates:** Tier 1, `verify-font-coverage`, `generate-font-subset --check`.

### 4. The screen and its route

- **Rebuild `Finder.tsx`** as sketched.
- **`app/(tabs)/atlas/find.tsx`:**
  - `<Stack.Screen options={{ headerShown: false }} />`;
  - `onBack` → `router.navigate('/atlas')`;
  - `onOpenColour` → `router.push(\`/atlas/${slug}\`)`.
- **Catalogue** (en and ja):
  - the screen's keys: `finder.clear`, `finder.clearName`, `finder.queryClear`, `finder.readAs`, `finder.dimensions`, `finder.nearest`;
  - ja `finder.title` → 検索, and ja `atlas.finder` → 検索;
  - remove `finder.hint`, `finder.empty`, `finder.answered.*`, `finder.region`, `finder.vocabulary` and `finder.noneHexHint`, and any of `filter.*`, `axis.hue`, `space.oklch` or `atlas.showing` that nothing else reads.
- **`chrome.test.ts`:** delete the `atlas/find` row and move the decoy (179–186) to `atlas/palettes`. It fails until both change together.
- **`screens.test.tsx`:**
  - **Subjects:**
    - `screens/Finder` (the start: the default point, the nearest 8, no chip chosen);
    - `screens/Finder (with a phrase answer)` (the fixture phrase, every handler; 09 as drawn);
    - `screens/Finder (a hex)`;
    - `screens/Finder (nothing matches)` (renamed from *the phrase found nothing*; `zzqx`, the witness for `empty`);
    - `sampleValues` adds every result hex these draw.
  - **Rewrite the FR-47 describe:**
    - the chosen chip per kind (hex, phrase, name), with only one chosen (the decoy);
    - every card prints ΔE00, on every kind;
    - the start lists the nearest 8, never the whole corpus;
    - nothing matched shows 00's caption with the kind's hint.
  - **Rewrite the F-151 describe:**
    - the results heading holds one position across the start, hex, phrase, name and nothing found, counted over nodes outside `finder.search.query`'s subtree (the ⊗ is inside it);
    - the query card's and sliders card's rows are the same in every state;
    - delete "region beneath the results".
  - **The thumbnail decoy** moves to `Compare (choosing A)`'s 32 dp rows.
  - `LIST_SURFACES`: unchanged ids.
  - State each removal's reason (ADR-0160).
- **`screen-insets.json`:** re-capture the Finder entries only.
- **e2e:** in `routes.json`, the `/atlas/find` anchor becomes `finder.dimensions` (one node, wholly in the locale's words). Then `node scripts/generate-e2e-flows.mjs`.

**Gates:** Tier 1, `test:a11y`, `test:contrast`, `test:cvd`, `node scripts/verify-reachability.mjs`, `verify-route-targets`, `generate-e2e-flows --check`, `verify-token-reach`, `verify-font-coverage`, `generate-font-subset --check`.

### 5. Enrolment

- `ENROLLED` gains `09.screen`:
  - root `finder.surface`: `<View testID="finder.surface"><Finder initialQuery={FIXTURE_PHRASE} onBack onOpenColour /><AppTabBar state={{ index: 1, … }} … /></View>`;
  - `locators: finderLocators()`;
  - `superseded: { '09.tabs.atlas.icon': 'C1', '09.tabs.map.icon': 'C1', '09.tabs.settings.icon': 'C1' }`. Confirm by running: the profile glyph and the Atlas label are found on 01's bar.
- `inventory-surfaces.json` gains `"09.screen"`.
- Commit `conformance-sweep.json`.
- **Gates:** Tier 1, `verify-mockups`.

### 6. Criterion 1's own test

`apps/mobile/test/finder-fidelity.test.tsx`. **Gates:** Tier 1.

### 7. States and actions

`apps/mobile/test/finder-states.test.tsx`. **Gates:** Tier 1.

### 8. Effects and memory

`effects.json`: the updates below, and E-230 to E-233, each with its note in `.harness/memory/effects/`. **Gates:** Tier 1, `node scripts/verify-state.mjs`.

### 9. Verify, review, record

- Run Tier 2, then the evaluator **once**.
- Fix its findings or record them as backlog, then run Tier 2 again on the final tree.
- Update `progress.md` and `feature_list.json`; capture lessons; checkpoint.

---

## Mockup fidelity

- **Governing:** `09` (P1). Variants:
  - `25` for the palette (P2);
  - no Japanese variant exists, so ja is the catalogue's words on 09's layout (the title under ADR-0142 D5's OQ-48 interim);
  - board `00` for what 09 does not show (P3);
  - `27`/`00` for the empty state (ADR-0128).
- **Conflicts applied:** C1 (01's five tabs), C8 (text on the sample, per-sample ink).

### Element by element (47 elements after increment 1's restructure; 3 superseded)

| ids | built as | bound to | sweep locator |
|---|---|---|---|
| `09.header` | `Screen appBar`, h `FINDER_APP_BAR`, no rule | — | derived `AppBar` |
| `09.back` | `AppBar.back`, `back`, `BACK_GLYPH_09` | `tab.atlas`; named `detail.backToAtlas` → `/atlas` | `text tab.atlas` (overrides `atlas.back`) |
| `09.title` | centred, inline | en `finder.title • japaneseRun('finder.title')`; ja `finder.title` | value, per locale |
| `09.clear` | `AppBar.trailing.button`, `close`, `CLEAR_GLYPH` | `finder.clear`, named `finder.clearName` → `cleared()` | derived text `finder.clear` |
| `09.art` | `Illustration leaves backdrop`, list header's art layer | — | derived illustration `leaves` |
| `09.search` | `Card` level 1 `md` | — | testID `finder.search` |
| `09.search.query` | `SearchField form="bare"` | `finder.search` as label and placeholder | derived component `SearchField` (after the rebind) |
| `09.search.clear` | `SearchField.clear`, `close-circle` | named `finder.queryClear` → `clearedText()` | derived glyph `close-circle` |
| `09.search.mode-phrase` / `-kanji` / `-hex` | `ChoiceGroup` pills | `finder.mode.phrase` / `.name` (E2) / `.hex` | derived text |
| `09.sliders.title` | `Text` heading | `finder.dimensions` | derived text |
| `09.sliders` | `Card` level 1 | — | testID `finder.sliders` |
| `09.sliders.{l,c,h}.label` | `Slider` row label | `finder.lightness` / `.chroma` / `.hue` | derived text |
| `09.sliders.{l,c,h}.track` | `Slider layout="row"` | the point's axis | derived component `Slider` (×3) |
| `09.sliders.{l,c,h}.value` | the row's value | `sliderReadings` | testID `finder.sliders.{axis}.value` |
| `09.results.heading` | `Text` heading | `finder.nearest` | derived text |
| `09.results.result-{1..4}` | `Swatch` cells | the result entries | testID `finder.result.{0..3}` |
| `…result-N.name` / `.english` / `.distance`; `result-1.oklch` | `Text on={sample}` | `resultLines` | testIDs `finder.result.{i}.name` etc. |
| `09.tabs`, `.indicator`, `.profile.icon`, `.atlas.label` | 01's `AppTabBar` | — | derived `TabBar`; `TAB_INDICATOR_TEST_ID`; glyph `profile`; text `tab.atlas` |
| `09.tabs.atlas.icon` (compass), `.map.icon`, `.settings.icon` | — (C1) | — | `superseded` |

### Bindings (§8), every one the engine's, the corpus's or the lexicon's

| element | value | computed by |
|---|---|---|
| slider values | the point printed: L %, C 3 dp, h ° | `finder-readout#printedPoint` (ADR-0159 D1) |
| slider readings | the terms whose naming axis is this one and whose region holds the printed point, in the locale's language | `termsHolding`, the lexicon through `finder.ts#lexicon` (ADR-0159 D2) |
| the point | hex: its OKLCh; phrase / name: the set's medoid; start: the corpus medoid | `finder.ts#hexPoint`, `medoid.ts` (ADR-0158) |
| result cards | the set ranked by ΔE00 from the point; colour, hex, name, English, OKLCh from the record | `rankedFrom` → `nearestByOklch` → `nameColor` (E-003, E-015); `printedDeltaE00` |

### Departures, by id (nothing else)

- **E1:**
  - the query text;
  - every name and hex;
  - the slider figures and readings (*Medium Deep*, *Moss Green*);
  - the ΔE00s;
  - the OKLCh line's digits;
  - the thumbs' positions.
- **E2:** *Japanese Kanji* → *Colour Name*.
- **E3:**
  - the chosen chip's dot (about 10.5 dp wider);
  - every text wraps and none is clipped;
  - fixed-height chips clip at 200 % (F-344);
  - targets through the hit area (the chips at 24.5 dp, the ⊗ at 17.5, the thumb at 14).
- **E4:**
  - the empty field (the default point, the nearest 8, the ⊗ hidden);
  - 00's caption with the kind's hint;
  - the forced-reading hints;
  - the tab bar.
- **§2, not design:**
  - *HeroUI Card level="2"*;
  - *HeroUI smooth sliders*;
  - the brackets;
  - the caret, if increment 1 reads it as the platform's.
- **§2, tighter than the scale (named in ADR-0161):** sliders title → card; name → English; distance → OKLCh.
- **Not departures from 09 but from earlier decisions** (R9 §10): what leaves the Finder (ADR-0160).

If the capture shows anything else, it is fixed, or it is a question for a person.

---

## Files to touch

```
.harness/plans/F-250-finder-is-mockup-09.md
docs/adr/0158-…, 0159-…, 0160-…, 0161-…, docs/adr/README.md
docs/design/R9-MOCKUP-FIDELITY.md (§2, §4 E1–E4, §6 C8, §8, §10)
mockups/tools/inventory-data/09.mjs, mockups/inventory/09.json
packages/ui/src/controls.tsx, SearchField.tsx, (ChoiceGroup.tsx), index.ts;
  packages/ui/test/slider.test.tsx, search-field tests, (choice-group tests), conformance.test.tsx
apps/mobile/src/finder.ts, finder-readout.ts (new), medoid.ts (new), atlas.ts (delegates), notation.ts,
  compare-readout.ts (re-export), i18n/en.ts, i18n/ja.ts
apps/mobile/src/screens/Finder.tsx; apps/mobile/app/(tabs)/atlas/find.tsx
apps/mobile/test/finder.test.ts, finder-readout.test.ts (new), medoid.test.ts (new), finder-fidelity.test.tsx (new),
  finder-states.test.tsx (new), screens.test.tsx, chrome.test.ts
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
| **E-003** (ΔE00 is the ranking authority) / **E-015** (two-stage equals a full scan) | the Finder ranks every kind through `nameColor` at the full-corpus limit, as the Atlas does | `finder-readout.test`: results equal `nearestByOklch(point, 120)` narrowed, for every point in the census; each distance equals `deltaE00(pointLab, entry.lab)` (an oracle that checks, not ranks); gate `color-golden` unchanged |
| **E-026 / E-044** (the lexicon's readers; the font) | a **fourth reader**: 09's slider readings. A removed term makes a reading quieter ("No term") | `finder-readout.test`: every term is read on exactly one axis and appears at a constructed point; decoy: a test lexicon without *soft* drops it from every reading; the medoid of each single-term region reads its term; the no-term counts are pinned; `verify-font-coverage` |
| **E-091** (Pair / F-151; its guard cites "the Finder's answer line") | the answer line leaves; the F-151 describe asserts the heading's position | the rewritten describe; guard text updated |
| **E-109** (layout primitives) | Finder rebuilt with `Row` / `Stack` | `verify-layout-primitives` (lint) |
| **E-120** (Card insets) | the Finder's cards | `screen-insets.json` re-captured for the Finder only |
| **E-138** (tabular figures) | slider values, ΔE00s, OKLCh | the tabular block (`ragged` = 0, `figureNodes(finder) > 0`) |
| **E-157** (the controls' drawn defaults from the inventories) | `09.mjs` edited; the Slider gains a row form | `slider.test` and the chip-height tests recompute from 09.json |
| **E-164** (chrome) | `atlas/find` leaves `PLATFORM_HEADER`; the decoy moves to `atlas/palettes` | `chrome.test`, both directions |
| **E-191** (`states.ts`) | `STATES` unchanged; witness renamed `(nothing matches)` | the declarations test; `blank-panel`, `bare-zero` |
| **E-199** (Arrival) | the grid keeps one `Arrival`, `Appear` index on each card | "every list surface arrives once" (09's records unchanged) |
| **E-203 / E-211** (sweep; superseded declarations) | `09.screen` enrolled with three C1 declarations | `verify-mockups`; `screens.test` both directions |
| **E-204** (`SearchFieldToggle` → the Atlas's bookmark) | `SearchField` gains `clear` | search-field test: the toggle unchanged (decoy) |
| **E-210** (the Atlas's hex through `finder.ts`) | `find()` unchanged; the Finder's hex results are `find(q)`'s | `atlas.test` unchanged; `finder-readout.test`: for every corpus hex, results equal `find(hex).entries` with equal distances |
| **E-229** (`find` → Compare's chooser) | `find()` unchanged; `findAs` added | `compare-states.test` and `compare-readout.test` unchanged; `finder.test`'s `findAs` ≡ `find` oracle |
| **E-016 / E-089** (catalogues, Japanese claims) | keys added, re-valued (ja `finder.title`, `atlas.finder`) and removed | `tsc`; `i18n.test` (unused keys); `verify:claims` |
| **E-017 / E-145** (font) | new catalogue kanji | `verify-font-coverage`; `generate-font-subset --check` |
| **E-128 / E-134 / E-152** (inventory → R9, PRD, features, type census) | `09.json` edited | `verify-mockups`; `mockup-inventory --check`; `type-scale.test` |

### New links (E-230 is the next free id)

- **E-230.** From `apps/mobile/src/finder-readout.ts`. To `Finder.tsx`, `finder.ts` (`find`, `findAs`, `rankedFrom`, `hexPoint`), `medoid.ts`, the lexicon, and the fidelity, states and sweep tests.
  - **Hazard:**
    - a printed figure or reading that disagrees with the point;
    - a word naming a term whose region does not hold the printed point;
    - a set member missing from the results, or a non-member present;
    - the chosen chip not the reading actually used;
    - the default point drifting to one of 09's figures.
  - **Guard:** `finder-readout.test` over every case the data allows (test plan), with decoys.
- **E-231.** From `apps/mobile/src/medoid.ts#medoid`. To `atlas.ts#familyDotEntry` (05's chip dots) and `finder-readout.ts` (09's default and set points).
  - **Hazard:** a change to the metric or the tie moves 05's dots and 09's sliders together, with nothing failing on either.
  - **Guard:** `medoid.test` (the old loop as oracle over every family group; tie decoy); the Atlas tests; `finder-readout.test`'s pinned `DEFAULT_POINT` slug.
- **E-232.** From `packages/ui/src/controls.tsx#Slider` (row form, part ids, `valueName`). To `Finder.tsx` and 09's sweep locators.
  - **Hazard:** a refactor drops an id or folds the row back into the stacked header, and the sweep stops finding `09.sliders.*.value` only where 09 is enrolled.
  - **Guard:** `slider.test` (ids with a `testID`, none without — decoy; the stacked tree unchanged); the sweep's `09.sliders.chroma.value` decoy.
- **E-233.** From `packages/ui/src/SearchField.tsx` (`form="bare"`, `clear`), and `ChoiceGroup` pills if changed. To `Finder.tsx` and 09's locators.
  - **Hazard:** the clear rendered as a toggle (a selected state that announces wrongly), or drawn on an empty field; the bare form drawing an outline.
  - **Guard:** the search-field test (decoys); the sweep's `09.search.clear` decoy.

---

## Test plan

### The invariants a person checks first, over every case the data allows (F-248's lesson)

All in `apps/mobile/test/finder-readout.test.ts`, pure.

1. **The sliders show the question's point.**
   - For every corpus entry's hex: the point is `hexPoint`. It is within rounding of the record's OKLCh, except the one out-of-sRGB entry (pinned). Results equal `find(hex).entries`, distances equal.
   - For every census phrase (both languages): a non-empty region puts the point at its set's medoid, which lies in the region. Results are exactly `find(q).entries`, re-ordered ascending by ΔE00, the first at 0.00. An empty region (pink) gives no results and an unmoved point.
   - For every entry's five name forms: results are exactly `byName(q)`, ranked, the first the set's medoid.
   - The start: `DEFAULT_POINT` and the nearest 8.
2. **One ranking.** For every corpus entry's OKLCh, the slider extremes (L 0 / 1, C 0 / 0.4, h 0 / 359) and the eight corners of the grid:
   - results equal `nearestByOklch(point, 120)` narrowed, order preserved;
   - distances are ascending, each equal to `deltaE00(lab(point), entry.lab)`.
   - Decoy: a slug-ordered list differs from it for some point.
3. **The words agree with the printed point.** For every printed L (101 values), every printed C (401 values) under several L/h contexts, and every printed h (360) under C contexts, in en and ja:
   - the reading is exactly the locale's terms on that naming axis whose region holds the printed point, in file order;
   - every term is read on exactly one axis;
   - no hue term below C 0.039 (decoy: a near-grey in the green arc reads none);
   - *pale* only at C ≤ 0.06;
   - *brown* only at L ≤ 0.55;
   - the no-term counts pinned.
   - Decoys:
     - a point whose exact C (0.0704) lies outside *muted* but whose printed C (0.070) is inside reads *Muted*, because the word describes the printed figure;
     - a test lexicon without *soft*.
4. **The figures.**
   - L `Math.round(×100)` %, C 3 dp, h `Math.round mod 360` (359.6 → 0°);
   - ΔE00 `printedDeltaE00`;
   - OKLCh 3 / 3 / 1 through `oklchLine`;
   - `nameLine` is 08's.
   - One point and one card worked by hand from the bundle's values, with the arithmetic in the comment.
5. **The state machine.**
   - Typing sets the point; a move changes its axis only.
   - `clearedText` keeps the point and the choice; `cleared()` equals `START`.
   - A choice persists across edits; a chosen reading reads the same text that way.
   - The chosen chip equals `find(text).kind` when nothing was chosen.
   - Forced hex reads `beaded`, `facade`, `decade`, `accede`, `ffffff`.
   - Forced phrase or hex on unreadable text gives its hint.
6. **Nothing claims what is not computed.** Every catalogue value this module and the screen read, in en and ja, contains none of: *Match*, *Safe*, *Verified*, *Measured*, *Japanese Kanji*, 一致. Decoy: a planted *Match* is found.

### Unit

- `medoid.test` and `finder.test` as above.
- `slider.test`, the search-field test and (if changed) the ChoiceGroup test, as in increment 2.

**Golden:** none owed. No `packages/color-*` change. Every figure comes from golden-tested functions (`deltaE00`, `nameColor`, `xyzToOklch`, the corpus derivation).

### Conformance subjects (`screens.test.tsx`)

- `screens/Finder` (the start);
- `(with a phrase answer)` (the fixture phrase, 09 as drawn);
- `(a hex)`;
- `(nothing matches)` (the witness for `empty`).

`blank-panel` and `bare-zero` run on every subject. A first card's `#… • ΔE00 0.00` carries a hex, so it is not a bare zero.

### The inventory sweep (`ENROLLED`)

- `09.screen`, root `finder.surface`, the fixture phrase, the tab bar, three `superseded`.
- Decoys, each giving one finding naming its element:
  - the chroma value's id removed → `09.sliders.chroma.value`;
  - the fourth card's id removed → `09.results.result-4`;
  - the ⊗ removed → `09.search.clear`;
  - the hex chip's words removed → `09.search.mode-hex`.
  - An art decoy is not expressible (F-249 M6), and that is stated.
- `09.screen` joins "the real surfaces are clean as drawn".

### Criterion 1's own test (`finder-fidelity.test.tsx`, on the rendered tree; `el()` recomputed from the pixels)

- **Order:**
  - back < title < Clear;
  - query card < sliders title < sliders card < results heading < cards;
  - field < ⊗ < chips (phrase < name < hex);
  - lightness < chroma < hue, each label < track < value;
  - each card's name < English < distance (< OKLCh on the first);
  - cards in reading order.
- **Grouping:**
  - the field, ⊗ and chips inside `finder.search`;
  - each slider's three parts in one row inside `finder.sliders`;
  - two cards per row;
  - **no pressable inside a card's words** (E-224's lesson);
  - each card's spoken name contains its name, English, hex, its ΔE00 "from the search point", and `swatchAccessibleName`'s provenance.
- **Proportion:**
  - every interval in the table through §2's snap, each subtracted inset written out;
  - the three named intervals through `belowTheScale`, with their cost asserted against ADR-0161;
  - every size constant; corners (`md` cards and samples, pill chips);
  - the cell width **read from the tree** at 384 (172), and at 320 and 360 (F-249's lesson);
  - `RESULT_HEIGHT` as `minHeight`;
  - the art frame intersecting `09.art`'s box at 384.
- **Type:** every text's `fontSize`, `fontWeight` and ink against `09.json` in en; the ja steps by the Japanese face's insets.
- **Wrap:** no `numberOfLines` on names, English, distances, readings, headings or chips' words.
- **Art against text** (F-247's lesson):
  - the art layer is the header's first child;
  - every `Text` has an ancestor in an opaque card, the bar or a result card, except the two headings;
  - those two pass 4.5:1 over the leaves' ink at `opacity.art`, in every palette.

### Negative and action tests (`finder-states.test.tsx`)

**No 09 sample content**, in en and ja × dark and light, in the start, the fixture, a hex and nothing-matches states, in paragraphs and accessible names:

- **Names:** 苔色, *Koke-iro*, *Moss Green*, 鶯茶, *Uguisu-cha*, *Bush Warbler Olive*, 海松色, *Miru-iro*, *Sea Moss Green*, 柳煤竹, *Yanagi-susutake*, *Willow Smoked*.
- **Hexes:** `#69821B`, `#715C1F`, `#5B622E`, `#5B5C43`.
- **Figures:** `0.84`, `1.45`, `1.92`, `2.30`; `OKLCh 0.52 • 0.062 • 140°`.
- **Slider nodes, banned whole:** `48% (Medium Deep)`, `0.045 (Muted / Soft)`, `142° (Moss Green)`. *Muted / Soft* alone is the engine's legitimate reading.
- **The query:** `dark muted moss green for linen shirt`.
- **Leaked:** `HeroUI`, `level=`, `smooth sliders`, `[Natural Phrase]`, `Japanese Kanji`.

The precondition is asserted: the fixture's own figures differ from these. Decoy: a planted *Koke-iro* is found.

**Every drawn action, fired on the control a person touches:**

- back → `onBack()`.
- *Clear* → the start (text, choice, point).
- The ⊗ → the text empties; the point and the choice stay; the ⊗ disappears.
- Typing a phrase, a hex and a name → the chosen chip, the sliders and the cards for each.
- Each chip → the same text read that way (`beaded` under *# Hex Code*).
- Each slider's `onValueChange` (through the live `Slider`'s prop, inside `act`) → its axis, its value text and its reading change, and the cards re-rank.
- A card → `onOpenColour(slug)`.
- Decoys: absent handlers mean absent controls; nothing matched shows 00's caption with the right hint and no card.

**Route source:** the handler bodies hold `headerShown: false`, `router.navigate('/atlas')` and `router.push(\`/atlas/${slug}\`)`. Decoys: a back that only pops; a card that opens `/atlas/find`.

### E2E

- `generate-e2e-flows --check`, anchor `finder.dimensions`.
- The capture takes the **start state**: the field empty, its placeholder showing, no chip chosen, no ⊗, the nearest 8. `inputText` only types a catalogue value or a colour's name, so 09's phrase cannot be typed; a romaji would give a one-card name answer.
- The device run is attested.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#  + inc 1: type-scale.test and the ui recompute tests (via the filter); node scripts/verify-state.mjs
#  + inc 2, 4: pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
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
- the sweep's block (`09.screen` enrolled, `elementsAsserted` +44, `superseded` +3, `renders` +4);
- `claims.findings` 0;
- the font-coverage line;
- the screen-insets delta for the Finder;
- the census numbers quoted in ADR-0158 and ADR-0159.

Report the known reds as F-249 did: F-348, F-350, F-351, F-322 (`pnpm security`), and the iOS half of `verify-ci` on win32.

| # | criterion | proven by |
|---|---|---|
| 1 | inventory 09 in order, grouping and proportion, asserted by the sweep | `finder-fidelity.test` and the sweep. **Gated** |
| 2 | bindings per §8; no mockup content | `finder-readout.test` (every case), the sweep's values, `finder-states.test`. **Gated** |
| 3 | only the listed departures | **gated** for structure; **attested** for appearance |
| 4 | capture beside 09, compared by a person | **attested** |
| 5 | catalogues; every drawn action works; a11y, contrast, cvd | `tsc`, `i18n.test`, `finder-states.test`, the three gates. **Gated**, with the device half **attested** |

---

## Attestations

Declared in increment 0 (Appendix E). All three block release.

1. **Criterion 4.**
   - A person runs `pnpm fidelity:capture -- --erase-app-data` on Android at 384 dp, with a non-debuggable build of the final commit.
   - They compare `/atlas/find` against 09 (en, Sumi), 25's palette (en, Washi) and ja, and record *matches* or each difference.
   - **Expected, not defects:**
     - the start state (empty field and placeholder, no ⊗, no chip chosen);
     - the corpus medoid's figures and readings, and its nearest 8;
     - *Colour Name* and no brackets;
     - the readings as lexicon terms (*Medium*, *Muted / Soft*, *Green*, or *No term*);
     - the OKLCh line at 3 / 3 / 1;
     - the first card about 5 dp taller, and taller cards where a real name wraps;
     - the title 検索 alone in ja;
     - no leaked labels;
     - 01's tab bar;
     - a grey line around some result cards (OQ-46's interim, ADR-0116);
     - the leaves clipped at the list's top (if ADR-0161 says so).
2. **Criterion 3, the appearance half.** Discharged by the same comparison.
3. **Criterion 5, the device half.**
   - Back opens the Atlas.
   - Typing FR-47's `dark muted green`, a hex and a romaji each set the sliders and mark their chip.
   - TalkBack announces the chips as a radio group with the chosen one.
   - Each slider is adjustable by swipe, announcing its value and reading.
   - Dragging a slider re-ranks the cards with no lag a person notices, on the capture's device.
   - The ⊗ and *Clear* do what ADR-0160 says.
   - A card opens its colour, and TalkBack reads its name, ΔE00 and provenance.
   - At 200 % in en and ja nothing is cut except the fixed-height chips (F-344, expected).
   - The generated flows pass.

---

## Risks and open questions

1. **Measurements owed in increment 1.** The bar's height (no rule), the title's em (`title 600` is suspect), back and Clear, the field's form, the chips' fill and edge, the slider rows, the result type steps, corners, and the art's extent, ink and layer. Every "Inc 1" number is unknown.
2. **Intervals near a midpoint:** chips → card foot (20.5 around 20), card → first slider row (27.65 around 28), row → row (12.3 to 13.3 around 12). The rule decides, and a half-pixel reading decides the rule. Record each reading.
3. **The decisions a person is likeliest to revisit:**
   - ADR-0158's model (medoid points; a named set shown whole; a slider re-ranks within the set rather than leaving it);
   - ADR-0159's *Colour Name* and 検索;
   - ADR-0160's chip semantics (detected and chosen readings look alike; the way back to automatic is *Clear*).
4. **The ja lexicon's gaps:**
   - no medium, grey, neutral or soft;
   - five hues to nine.
   Japanese readings print *該当語なし* often (predicted: 33 of 101 lightness values). F-353 covers the hues; F-356 is proposed for lightness and chroma. This is content work under `content/AGENTS.md`.
5. **The longest English reading** (*Grey / Neutral / Muted / Soft*) wraps in about 115 dp, so the sliders card grows (ADR-0161 states it).
6. **A slider inside a vertical `FlatList`'s header:**
   - Android gesture arbitration between HeroUI's `GestureDetector` and the list's scroll;
   - re-ranking up to 120 cards on every drag tick;
   - the `TextInput`'s focus across re-renders (`ListHeaderComponent` must be an element).
   All are unverified on a device and attested. If drag cost shows, ranking stays synchronous and the cards' keys are stable (no re-mount). Throttling would change "Instantaneous" and needs the ADR's amendment.
7. **Screen-reader granularity:** C's step is 0.001 over 0.4 (400 swipes). The accessibility increment may need a coarser step (1 % of the range). Decide on the device; record in ADR-0160 if changed.
8. **Large sets:** a one-letter name query can list about 120 cards. The `FlatList` windows them (`initialNumToRender`, `windowSize` as the Atlas has); E-064's proxy caution applies to tests.
9. **The art may straddle the bar.** If increment 1 finds strokes above 57.5 dp that matter, the layer moves to screen level (fixed, not scrolling). Either way no word sits on a stroke.
10. **`finder-readout.test` is heavy** (thousands of points × a 120-limit ranking). It states its own timeout (F-249 `8d6a0b7`). Watch F-350's margin in `screens.test`.
11. **Unverified mechanics:**
    - the centred title with its run at 320 dp;
    - `restFill` pills;
    - the bare field's touch target inside the card on Android (ADR-0114);
    - `Swatch height="fill"` cells sharing a row's height in a `FlatList`.
12. **Restructuring 09.json's result lines** (merging `result-2.hex`, `result-3/4.kanji`) is a judgement: siblings drawn two ways, 2 to 2. The alternative, keeping the ids and locating two elements on one paragraph, is named in ADR-0161.
13. **No JDK or Maestro here.** The attestations are the person's.
14. **Open questions — none blocks F-250.**
    - OQ-48's interim is applied (the ja title), not decided.
    - OQ-46 applies to the result cards (no keyline bound): the shipped guarantee stands and F-250 decides nothing of it.
    - OQ-23 is not touched: 09's brackets are on chips, which §2 governs.
    - Every new choice closes in ADR-0158 to ADR-0161 under the delegation.

## Out of scope

- The Atlas's field (F-246), Compare's chooser and `find()`'s contract (E-229), and the Lens.
- A new lexicon version (F-353, F-356).
- OQ-46; the Slider's pressed state (F-304); the fate of `Accordion` and `Tabs` (F-346).
- A sample of the slider point (09 draws none; rule 12).
- A count line; persisting a search; a `?q=` deep link; a new route.
- Any engine, golden, band-edge or corpus change.
- Debouncing the results.
- Supersets of 09 such as a fourth chip or a region panel.

## Sources (web; quote from the source before relying on it)

- [W3C CSS Color Module Level 4, §9.4 oklab() / oklch()](https://www.w3.org/TR/css-color-4/#specifying-oklab-oklch): "for L: 0% = 0.0, 100% = 1.0"; "for C: 0% = 0.0 100% = 0.4"; chroma's "maximum is theoretically unbounded (but in practice does not exceed 0.5)".
- [Apple HIG — Search fields](https://developer-mdn.apple.com/design/human-interface-guidelines/components/navigation-and-search/search-fields): a Clear button is recommended so people can delete their terms.
- [WWDC 2026 session 292](https://developer.apple.com/videos/play/wwdc2026/292/): the Clear button appears once text is entered.
- [Apple, Introduction to Search Fields (archived Cocoa)](https://developer-mdn.apple.com/library/archive/documentation/Cocoa/Conceptual/SearchFields/SearchFields.html): the cancel button is hidden when the field is empty.
- The medoid (least summed dissimilarity; Kaufman & Rousseeuw's PAM) is ADR-0143 D4's rule already in the repository. Cite a primary source in ADR-0158 if one is quoted.

---

# Appendix A: ADR-0158 draft

```markdown
# ADR-0158: The Finder answers a query as a set ranked by ΔE00 from a point, and the sliders are the point

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-250 |
| **Applies** | Golden rules 11, 12, 14; FR-47; R9 §4 E1/E4, §8; ADR-0143 D1 (one ranking route), D4 (the medoid); E-003, E-015, E-210, E-229 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
09 draws a query, three perceptual dimensions and "nearest results ranked by ΔE00". `find()` answers three
ways: a hex with its nearest 8; a phrase with its region, unranked; anything else with a name match. The
Atlas (E-210) and Compare's chooser (E-229) read `find()`.

## Decision
- **D1.** `find()` keeps its contract. `findAs(query, reading)` reads text as a chosen kind;
  `find(q) ≡ findAs(q, find(q).kind)`.
- **D2.** A query names a set and sets a point:
  - hex: the whole corpus, at the hex's own OKLCh (the engine's `xyzToOklch(hexToXyz)`);
  - phrase: the region's entries, at their medoid;
  - name: the matching entries, at their medoid;
  - empty: the whole corpus, at the corpus medoid.
  The medoid is ADR-0143 D4's: the least summed CIEDE2000 over published Lab, ties to the earlier slug,
  one function (`medoid.ts`).
- **D3.** Results are the set ranked through the one route (`nearestByOklch` over the corpus, narrowed).
  A named set is shown whole; the corpus as its nearest `HEX_LIMIT`. A hex therefore lists exactly
  `find(q)`'s entries.
- **D4.** A slider moves the point and the results re-rank in the same render; the set stays. A new
  answer resets the point; an empty answer leaves it and shows 00's caption.
- **D5.** The point is held as set; the sliders print it (ADR-0159); every ΔE00 is from the point as held.
- **D6.** The point is a search target: never drawn as a colour, never a measurement, spoken as "the
  search point".

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Results always the corpus's nearest N; the query only sets the point | Loses FR-47's region answer and every name match but one |
| A phrase's point at its region's centre | "dark" centres at L 0.1975, darker than any entry; an unconstrained axis has no centre |
| The region's centroid (mean OKLab) | Not a colour any entry holds; chroma collapses as hues average |
| A slider move ends the query (the whole corpus) | The field would describe results it no longer filters |
| The empty field lists nothing (the old form) | Three sliders that move nothing |
| A named set cut at 8 | Hides region members with no drawn count to say so |

## Evidence, and its limits
FR-47; CSS Color 4 §9.4; the census over corpus 2026.08.1 and lexicon 2026.08.1 ([numbers]). ΔE00 is not a
metric (the lesson): the medoid is still well defined as a least sum.

## Consequences
screens.test's "no ΔE00 on a phrase answer" is reversed, because the point is drawn. E-210's and E-229's
guards hold. E-230 and E-231 are new.

## Revisit when
A mockup draws a region or a count; the lexicon gains weights; a person asks that a slider leave the set.
```

# Appendix B: ADR-0159 draft

```markdown
# ADR-0159: 09's figures and words say what the corpus and the lexicon hold

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-250 |
| **Applies** | R9 §2, §4 E1/E2, §8; ADR-0125, ADR-0140, ADR-0142 D3/D5, ADR-0155 D2 (terms in the locale's language); the lesson "describe the number you print" |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Sliders** (CSS Color 4's reference ranges):
  - L 0–100 %, step 1 %;
  - C 0–0.400, step 0.001;
  - h 0–359°, step 1°, 360 → 0;
  - printed L %, C 3 dp, h whole degrees;
  - labels as drawn; accessible names name OKLCh and "the search point".
- **D2. Readings.**
  - The locale's terms whose naming axis is this slider's (hue if constrained, else lightness, else chroma),
    whose whole region holds the printed point.
  - In file order, joined " / " (Latin) or "・" (Japanese), in the script's parentheses.
  - None → *No term* / 該当語なし.
  - Census: [no-term counts]; [longest reading].
- **D3. Result cards**, one form:
  - `nameLine` (08's);
  - `(English)`;
  - `hex • ΔE00 ‹printedDeltaE00›`;
  - the nearest card adds `oklchLine` at 3, 3, 1.
- **D4. Chips:** *Natural Phrase · Colour Name · # Hex Code*.
  - *Japanese Kanji* is an E2 row: the name search reads kanji, kana, romaji, English and slug.
  - Brackets are notation (§2, widened to filled pills).
- **D5. Title:** ja `finder.title` = 検索; en `Colour Finder • 検索`; in Japanese the run is not drawn
  (ADR-0142 D5's interim). ja `atlas.finder` follows.
- **D6. Headings** kept as drawn. *Instantaneous* is true: the results are recomputed in the change's render.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| A term read on every axis it constrains | *Medium / Brown* on lightness; *Pale* on chroma |
| A reading of the exact, unprinted value | A word that contradicts the figure beside it at a boundary |
| Fall back to English terms in Japanese | Mixes languages; F-249 read the locale's own |
| Blank where no term holds | A bare absence (F-236); indistinguishable from a failure |
| *Japanese Name* | Still false for an English-name match |
| Keep 色さがし in Japanese | The Japanese screen and 09's run would name it two ways |
| OKLCh on every card | A line 09 draws on one card only |

## Evidence, and its limits
The lexicon's own rationale (the chroma floor; muted overlapping it). The Japanese terms are unreviewed by
a competent speaker (ADR-0060), and the gaps are F-353's and F-356's.
```

# Appendix C: ADR-0160 draft

```markdown
# ADR-0160: What 09's controls do, and what leaves the Finder

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-250 |
| **Supersedes in part** | F-021's screen-level region card and vocabulary line; F-151's "answered" line (its c3 holds); the screens.test decoy "a Finder result is a thumbnail" |
| **Applies** | R9 §4 E3/E4; ADR-0128 §6, D3; ADR-0141; ADR-0114; FR-47 |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Chips** are one radio group (*Read the search as*). The chosen chip is the person's choice, else
  `find()`'s detected kind while the field holds text, else none. Choosing reads the text that way and
  persists until *Clear*. The chosen chip carries its dot.
- **D2. The field's ⊗** empties the text, shown while there is text. The point and the choice stay.
- **D3. ✕ Clear** resets the text, the choice and the point. It is always enabled, as drawn.
- **D4. Sliders** move one axis each.
- **D5. A card** opens `/atlas/[slug]`. It is one stop: name, English, hex, ΔE00 from the search point
  (and OKLCh on the first), then provenance.
- **D6. Back** → `/atlas`.
- **D7. Leaves the page:**
  - the answered sentence (the chips say it);
  - the region card and vocabulary version (the readings name the terms; `find()` still returns both);
  - *Showing n / N* and `LIST_LIMIT`;
  - the hint line;
  - the platform header.
- **D8. E4:**
  - the empty field (the corpus medoid, its nearest 8);
  - 00's caption with the kind's hint;
  - the forced-reading hints.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Chips as force-only, nothing marked when detected | The question answered is said nowhere (F-151, the `beaded` lesson) |
| Chips as non-interactive badges | 09 binds a `select` action; criterion 5 |
| One clear doing both | Two drawn controls, one action |
| Clear disabled at the start | Dims a control 09 draws in the screen's first state |
| ⊗ always shown | A control with nothing to clear |

## Consequences
The F-151 describe asserts the results heading's position. The thumbnail decoy moves to Compare's chooser.
```

# Appendix D: ADR-0161 draft

```markdown
# ADR-0161: 09's composition, its art and its result cards

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-2x |
| **Feature** | F-250 |
| **Applies** | R9 §2, §5, C1, C8; ADR-0113, ADR-0116, ADR-0121, ADR-0139, ADR-0157 (the art layer); the lessons on ink gaps, rounded dp and text over art |
| **Decided on** | The delegation of 2026-10-05 |

## Decision
- **D1. Intervals:** the plan's table, snapped by §2. Three are named: sliders title → card, name →
  English, distance → OKLCh. Their cost is stated.
- **D2. Result cells:**
  - half the row each (172 dp at 384, read from the tree);
  - at least 108 dp (2:2 tie, so the smaller);
  - grow with their words; a row shares its taller card.
  - Cards 3–4's stacked kanji and card 2's split line are where 09's sample names broke; one form is drawn.
  - Estimates: the nearest card ≈ 113; wrapped names ≈ 120–140.
- **D3. Corners, edges, fills, type steps and weights** as increment 1 read them.
- **D4. The slider row:** label · track (flex, minimum width) · value (wraps).
- **D5. The art:** one `leaves` fragment at [opacity.art | measured] in the list header's art layer, under
  the opaque cards, clipped. [The strokes above the bar's foot are clipped, at a cost of n dp | the layer is
  at screen level.] No word sits on a stroke; the two headings pass 4.5:1 over its ink in every palette.
- **D6.** No rule under the bar; 01's tab bar; no action bar.

## Evidence, and its limits
09.json and increment 1's readings; a JPEG reading carries ΔE00 ≈ 2. The person's comparison judges the
result.
```

# Appendix E: state drafts

**F-250 `attested`:** three entries in F-249's shape, each `"blocks": "release", "status": "outstanding"`:

- **Criterion 3:** gated for structure, attested for appearance. It cites `finder-fidelity.test` and the sweep, with ADR-0158 to ADR-0161 as the named departures.
- **Criterion 4:** the capture run, with its *expected, not defects* list (Attestations, item 1).
- **Criterion 5:** gated except the device half (Attestations, item 3).

**R9 §8, the `09` row:**

| 09 | three slider readings; each result's hex, ΔE00, and the nearest's OKLCh | the lexicon terms holding the printed point, each read on its naming axis, in the locale's language (ADR-0159 D2); the record's hex; ΔE00 from the point the sliders show, `printedDeltaE00` (ADR-0158); the record's OKLCh at 3, 3, 1 | F-250 |
|---|---|---|---|

**Notes on other features:**

| feature | note |
|---|---|
| F-346 | `Slider` regains a screen consumer: 09's three rows (F-250, ADR-0161 D4) |
| F-353 | 09's Japanese hue reading names five hues to nine (same census) |
| F-304 | 09's sliders are the Slider's screen consumer; its thumb's press response is F-304's |
| F-265 | 09's title in Japanese is 検索 alone (ADR-0159 D5, OQ-48's interim) |
| F-246 | `atlas.finder` (ja) is 検索, so 05's chip and the page it opens share one name |
| F-267 | 09's expected differences (Attestations, item 1) |
| F-344 | 09's chips clip at 200 % |

**New backlog feature, only if the census confirms it — F-356:** "The Japanese phrase lexicon names the lightness and chroma bands the English one does".

- **Acceptance:** a new published version carries Japanese terms for *medium*, *grey* / *neutral* and *soft*, each the same region as its English term, reviewed as ADR-0060 records. A test holds that every printed slider value with an English term on an axis has a Japanese one on that axis.
- **Requirements:** FR-47, FR-23. **Mockups:** 09.
- **Note:** FROM F-250, with the census counts.
