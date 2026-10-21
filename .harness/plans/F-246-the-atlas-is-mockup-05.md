# Plan: F-246: The Atlas is mockup 05

| | |
|---|---|
| **Feature** | F-246 ([`feature_list.json`](../state/feature_list.json)) |
| **Requirements** | FR-47, FR-23. Also applied: FR-20, FR-24, FR-25, FR-56, NFR-8, NFR-9, NFR-21 |
| **Service / package** | `apps/mobile` · `@irodora/ui` (six additive changes, no new component) |
| **Author** | The planner subagent's design (read-only; nothing was built or run), decided and edited by the implementing session — its edits are under *Implementing session's decisions* below |
| **Date** | 2026-10-21 |
| **Decisions** | ADR-0140 (closes OQ-17 and OQ-18), ADR-0141 (closes OQ-43), ADR-0142 (05's words, made true), ADR-0143 (05's controls, and what the overflow holds), ADR-0144 (the sweep and a C1-superseded element) |

---

## Intent

The Atlas is rebuilt so that a person opening the Atlas tab sees mockup 05:

- **The app bar.** The bilingual title and the overflow "…". Under it, the count pill and the three outlined pills (Compare · Finder · Palettes), then a rule.
- **The filters.** The outlined search field, with the bookmark toggle at its trailing end. The season pills (*All* chosen). The *Colour Family* label, and the family chips scrolling off the right edge.
- **The grid.** A rule, the *Atlas* heading, then a two-column grid of cards. Each card has an inset sample, the kanji with the hex at its right, the romaji, the OKLCh line, and the season line.
- **The tab bar** is 01's (C1).

It renders in Sumi and Washi, and in English and Japanese. Every value comes from the corpus or the engine. Every drawn control works: the four drawn navigations, the overflow, the search (names, family, hex, phrases), the season and family filters, and the bookmark toggle (ADR-0135).

"Done", for a person: the Atlas looks like 05 on a 384 dp phone, says only true things, and nothing it used to do has been lost.

---

## Findings from planning

All of these come from reading. Nothing was run.

1. **The current screen is far from 05.**
   - `apps/mobile/src/screens/Atlas.tsx` is a one-column `FlatList` of 180 dp samples.
   - It has a corpus/version line and a "More ways in" stack of three secondary buttons.
   - It has five `ChoiceGroup` rows (family by its 25 families, temperature, lightness, chroma, season) and a *Showing n / N · Clear* row.
   - It draws no app bar. `Screen title` sets the title at `title`.
2. **The search does not do what 05's placeholder says.**
   - `matchesQuery` reads kanji, kana, romaji, English and slug only.
   - 05 promises "kanji, romaji, family or #hex". FR-47 (a requirement of this feature) says *"a hex query returns its nearest entries"*.
   - `src/finder.ts` already owns the hex branch (`nameColor`, ΔE00) and the phrase branch (`resolvePhrase`/`matchesRegion`). A second implementation would be a defect.
3. **FR-20 names six facets, and 05 draws two.** FR-20 lists *family, season, temperature, lightness, chroma and era*; 05 draws season and family only.
   - The lexicon (`content/rules/phrase-lexicon.2026.08.1.json`) reaches lightness and chroma by words (*dark, pale, muted, vivid*, 暗い, 淡い…).
   - It has **no temperature term**.
   - So dropping the three `ChoiceGroup` rows would lose temperature filtering. That is a PRD capability, not layout (E4).
4. **Taxonomy across the 120 entries** (grep of `content/colors`):
   - `taxonomy.season` is `null` on **96** and a one-element array on **24**: six each of spring, summer, autumn and winter.
   - `taxonomy.era` is `null` on all 120.
   - Each entry's `unknowns` says why: era — *"an Irodora construction of 2026 belongs to no historical period, and claiming one would be the dishonesty ADR-0065 exists to prevent"*; season — *"assigned only in the Seasonal group, where the season is the editorial premise of the colour"*.
5. **05 itself uses the last line for a season.** Card 2 prints *Spring* where cards 1, 3 and 4 print an era. **05 also draws a card that lacks a line:** card 4 has no OKLCh, and its last line moves up into that slot.
6. **The family groups have no colour.** `content/taxonomy.json` `groups[]` carries romaji, kanji, en and families, but no hex. Yet `05.filters.family.*.dot` binds `corpus:family.<g>.hex`, which does not exist. The dot needs a defined, provenanced binding (rule 12).
7. **05's drawn type is narrower than any real face.**
   - Example: `05.title` records `raw.emDp 26`, but its box is 196 dp wide for *"Colour Atlas • "* plus **six** full-width kanji. Six kanji at 26 dp would take 156 dp alone.
   - The em readings (made from heights) and the widths disagree throughout.
   - Consequences: real text will exceed drawn widths, so every drawn row must wrap (E3). The chip, pill and placeholder steps the inventory leaves `type: null` must be **measured** (Increment 1), not guessed.
   - Estimate from widths: about 9.5–11 dp. That suggests `caption`, but F-220's height method governs.
8. **The components do not draw 05's forms yet.** P1 says a screen beats the board for how a component looks on that screen.
   - `Button`'s label is fixed at `body` with `md` padding. 05's pills are about 56 × 18.5 dp, so `Button` needs a smaller step and inset.
   - `Chip` control labels are fixed at `label`.
   - `ChoiceGroup` pills hard-code 15's tone (`surface.2` plus a `foreground` edge).
   - `SearchField` is a filled `surface.2`, 44 dp field with no glyph. **05 is the only mockup that draws `ui:SearchField`**, outlined, 26.5 dp, with a leading search glyph.
   - `AppBar` truncates every inline title (`numberOfLines={1}`), which breaks E3 for a *leading* title.
   - `AppBar` draws its rule as a `borderBottom`, so no locator can find `05.header-rule` on its own.
9. **`Screen scroll={false}` pads the frame on every side.** (Only the Atlas uses it.) 05's grid runs to the tab bar's top edge, and its family row runs off the right edge.
   - Padding the frame would leave a 16 dp ground band above the tab bar and clip the row 16 dp short.
   - Negative margins would leave strips Android cannot touch.
10. **A `Pressable` with no `onPress` still takes the touch** (Pressability claims the responder unless it is disabled).
    - `Swatch` is always a `Pressable` (F-343).
    - In today's Atlas, a tap on the sample may therefore do nothing. **Unverified**; a device check.
    - The rebuilt card must make the sample navigate as the card does.
11. **05's tab elements cannot all be found on 01's bar.**
    - `05.tabs.compass.icon` and `05.tabs.search.icon` have no counterpart under C1.
    - Worse, `05.tabs.search.icon` would be "found" as the search field's own leading glyph, a false positive.
    - The sweep (`apps/mobile/test/inventory.ts`) has no way to declare an element replaced by a §6 conflict. ADR-0144.
12. **The inventory has two stale readings.**
    - `05.finder` acts `navigate:/atlas/finder`, but the route is `/atlas/find`.
    - `05.card-N.era` binds `oq:OQ-17`. `verify-mockups` refuses an `oq:` binding to a closed question, so the rebind must land in the same commit as the closure.
13. **The e2e anchors would break.**
    - `routes.json` (`/atlas` anchor `atlas.title`) and `atlas.journey.json` (steps on `atlas.title`, `atlas.filters`, `atlas.search`, and taps on the colour's `en`) all change.
    - The bilingual title is one text element ("Colour Atlas • …"), and a Maestro text selector matches the **whole** text (F-242's source).
    - The rebuilt card does not print the English name.
14. **`bookmarks.test.tsx` (E-204's guard) assumes the old screen**: the old row name `${kanji} ${romaji} ${en}`, family filters as `radio`, and a query (`'midori'`) that will now also match the *Midori* chip's group.
15. **WCAG 2.2 alone would let 05's fill swap pass.** Understanding SC 1.4.1 says *"if content is distinguished by inverting an element's foreground and background colors, this would pass"*.
    - What forces the dot is the product's stricter, binding standard: ACCESSIBILITY §4 (*"The rule is total"*), F-232's one pattern, and the `selection-treatment` conformance rule, which **reports a pill with a fill alone** (`pill-selection.test.tsx`; memory note `active-means-two-different-things.md`).
    - That rule is part of the blocking a11y gate.
16. **`verify-mockups`' proof picks the first owed surface** (`02.screen`/F-243 today), so enrolling `05.screen` does not move it. The `owed` IIFE was confirmed by reading.

---

## Decisions

All five are taken under R9 §11's widened delegation of 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–13 are not reopened. Full drafts are in Appendices A–E.

### D-1: OQ-17 and OQ-18. What every card prints (ADR-0140)

- **Every card carries the OKLCh line** (OQ-18).
  - Format: `coord.oklch`, then `: `, then L, C (three decimals) and h (one decimal), separated by `•`. This is the precision the corpus is authored at, as on Home.
  - Card 4's missing line is sample content (E1). The fourth position is filled by whatever the filters leave, so there is no rule by which "the fourth card" could omit a value every entry holds.
- **The last line is the entry's authored season** (OQ-17).
  - It is the catalogue word (`season.*`: *Spring* / 春), and several seasons are joined with ` · ` (Latin) or `・` (Japanese).
  - **Where no season is authored (96 of 120), the line is not drawn.** The card's next line does not exist, so the card ends there, as 05 draws card 4. Equal heights within a row come from stretching.
- **Era is not printed.** A test holds `taxonomy.era === null` for every published entry, with a planted era as its decoy. A corpus that gains a sourced era fails that test until its display is decided.
- **Authored eras are refused.** Rule 12, `content/AGENTS.md` rule 3, and each entry's own recorded unknown all rule them out.
- Rebind `05.card-N.era` to `corpus:entry.taxonomy.season`.

### D-2: OQ-43. The chosen season pill carries its leading dot (ADR-0141)

- The season row is a `ChoiceGroup` in pill form, so it announces as one radio group (F-186, F-240's precedent for 15).
  - The chosen pill is filled in `accent` (05's white; the primary action), with its ink in `accent.foreground`.
  - A `SelectionDot` leads its label, in that ink.
- The cost: the chosen pill is about 10.5 dp wider than drawn.
- Forced by rule 13 as ACCESSIBILITY §4 binds it, and by the blocking `selection-treatment` rule. Recorded as an **E3** departure on `05.filters.season.all`.
- The same treatment applies in the overflow sheet's groups.

### D-3: 05's words, made true (ADR-0142)

- **Title** (one heading, `AppBar` inline title, leading):
  - en: *Colour Atlas • 日本に着想を得た色* (`atlas.title` + `japaneseRun('atlas.titleJa')`).
  - ja: *色図鑑 • 日本に着想を得た色*.
  - 日本の伝統色 becomes 日本に着想を得た色, the same words Home's colour card uses (E1, FR-23).
  - A test holds every published entry `japanese-inspired`, with a planted `traditional` entry as the decoy.
- **Count pill.**
  - Text: *120 Original Colours*; ja 「120のオリジナル色」.
  - "Sourced" becomes *Original*, the catalogue's own word for both classifications the corpus holds (`classification.japanese-inspired` *"Irodora original, Japanese-inspired"*, `classification.editorial` *"Irodora original"*). E1.
  - Bound to `CORPUS_ENTRY_COUNT`, the pinned bundle's count.
  - A test holds every entry's classification within those two, with a planted `traditional` entry as the decoy.
  - The badge's accessible name adds the corpus version (`atlas.corpus` + `CORPUS_LABEL`), keeping FR-25's fact one swipe from the root without drawing it.
- **The three pills** read *Compare*, *Finder* and *Palettes*, with no brackets.
  - The outline already marks each as a button. A bracket inside an outlined pill is a second delimiter, the wireframe convention for "label goes here". 06's bracketed action names are already `notDesign`.
  - Recorded as `notDesign: garbled-text` on 05, and added to R9 §2.
  - This decides 05 only. OQ-23 (13 16 17 18: headings and roles too) stays open, and its four features get a note.
- ***Colour Family***, not *Color Family*. The en catalogue is en-GB, and 05's own title and pill spell *Colour*. Treated as §2's misspelling bullet.
- **The Japanese runs (OQ-48's interim, F-234, applied here and not decided):**
  - A drawn Japanese run beside English is the Japanese catalogue's word, read through one helper (`japaneseRun(key)` = `t('ja', key)`).
  - In Japanese, a run that would repeat the word in the same script is not drawn: season pills read 「春」, not 「春 春」.
  - Family chips are corpus content (romaji + kanji) and print both in both locales.
  - F-265 and OQ-48 may revise this.
- **Inset:** 05's 17.5 dp snaps to `md` (ADR-0139 applied; no new ADR).

### D-4: 05's controls (ADR-0143)

- **Search**, by `atlasMatches`/`atlasShown` in a new `src/atlas.ts`, built from `finder.ts`'s branches:
  1. A hex the Finder recognises (`looksLikeHex`, now exported) ranks the **whole corpus** by ΔE00 through `nearestByLab`. Filters and the bookmark toggle then apply, and the first `HEX_LIMIT` (8) are shown in ΔE00 order. FR-47.
  2. Otherwise, a phrase whose every word is a lexicon term filters by its region, as the Finder does. FR-47; FR-20's lightness and chroma.
  3. Otherwise, a case-folded substring of kanji, kana, romaji, English, slug, the hex string, the family's en/ja word, or the family group's romaji, kanji or English.
  - Recorded limit: 赤黄緑青紫 are lexicon terms, so typing 青 gives the *hue region*, as the Finder answers it. Typing *Ao* gives the *group*.
- **Season row:** a single choice with *All* (radio group).
- **Family chips:** multi-select filter chips (OR within the row, AND with everything else). These are F-232's `Chip` with `ground="surface.1"`, `dot` and `kanji`, one per group in `FAMILY_GROUPS` order, in a horizontal `ScrollView` that bleeds off the right edge.
  - **The dot is the group's medoid entry:** the member whose summed ΔE00 (`@irodora/color-difference#deltaE00` over the published `derived.lab`) to the other members is least, with ties broken by slug.
  - It is drawn with that entry's `derived.hex` and `colorFor(entry)` (source `reference`). A real corpus colour with provenance (rule 12), chosen by a stated rule.
- **The overflow** (`05.more`, glyph `more`) opens 03's floating `Sheet`, named *More filters*, holding FR-20's remaining facets: **Temperature, Lightness, Chroma**.
  - Each is a `ChoiceGroup` in 05's pill form, headed in the family label's style.
  - Era is omitted while no entry holds one.
  - E4: a required capability no mockup draws, composed from 05's own parts.
- **The count line and *Clear*** (ADR-0135 D4, kept): *Showing n / N* and a plain *Clear* sit at the trailing end of the *Atlas* heading row, **only while anything narrows the list**: query, season, family, facets or bookmarks.
  - That row is empty space in 05's drawn (unfiltered) state, so nothing drawn moves.
  - *Clear* resets everything, the bookmark toggle included.
- **The four drawn navigations:** Compare → `/atlas/compare`; Finder → `/atlas/find` (the inventory's `/atlas/finder` is corrected); Palettes → `/atlas/palettes`; a card → `/atlas/[slug]`.
- **A card is one control.**
  - `Card onPress`, with its name from `atlasCardName`: kanji, capitalised romaji, English, then `swatchAccessibleName`'s hex and provenance, then the OKLCh line and the season.
  - The sample inside it takes the same `onPress` (finding 10), wrapped in a view hidden from assistive technology (`importantForAccessibility="no-hide-descendants"`, `accessibilityElementsHidden`). So it announces once, and every tap opens the colour.

### D-5: The sweep reads a C1-superseded element as declared (ADR-0144)

- `Enrolled` gains `superseded?: Record<elementId, 'C1'>`.
- Each declared id must appear in its inventory's own `conflicts` record under that id; otherwise there is a finding.
- A declared element is excluded from the presence count, and the replacement is asserted by the surface's other locators (`05.tabs` as `TabBar`, plus the indicator, the Atlas and Profile glyphs, and the label).
- For 05: `05.tabs.compass.icon` and `05.tabs.search.icon`.

---

## Implementing session's decisions on this design

Adopted as written, with one edit:

1. **The search answers what 05's placeholder says, and no more.** *"Search kanji, romaji, family or
   #hex…"* promises names, family words and a hex, and FR-47 requires the hex branch. The lexicon's
   phrase branch (finding 2, D-4 step 2) is **not** built here: 05 draws no phrase search, and the
   overflow's facets sheet already carries FR-20's lightness and chroma beside temperature, so the
   phrase branch would be a second way to the same filters that nobody drew (rule 14) and nobody
   asked for (rule 2). `atlasMatches` is therefore: a hex `looksLikeHex` recognises ranks the whole
   corpus by ΔE00 through `nearestByLab` (then the filters and the toggle, the first `HEX_LIMIT`
   shown); otherwise a case-folded substring of the names, the slug, the hex string, the family's
   words or its group's romaji, kanji and English. E-210's oracle is `find()`'s hex branch only, and
   its decoy is a lexicon phrase (`dark`), which this field answers as a name query. ADR-0143 D1 says so.

2. **Two intervals the table marks "(expected)" come out smaller when computed.** A text's line inset
   lies INSIDE its layout box, so it is subtracted from an ink gap, never added. *Label → chips* is 5.5
   dp of ink less the caption's 2.6 below it, so 2.9: `xs`, not `sm`. *Heading → grid* is 9 less the
   label step's 3.85 below it, so 5.2: `xs`, not `md`. The screen draws both at `xs`: the label and its
   chips are one `Stack gap="xs"`, and the list header pads `xs` below. `atlas-fidelity.test` computes
   every interval from `05.json`, with the insets written out (Increment 6).

Everything else — D-1 … D-5, the increments, the tests and the attestations — is the design below.

---

## Approach

### Reused (paths)

- **`@irodora/ui`:**
  - `Screen` (`appBar`, `scroll={false}`), `AppBar` (inline title, `trailing.icons`, `below`, `rule`, `height`, `inset`, `gap`), `Bilingual` (via `AppBar`), `IconButton`;
  - `Chip` (control: `ground`, `dot`, `kanji`, `height`; badge: `fill="surface.2"`, `icon="list"`, `numeric`, `size`, `name`), `ChoiceGroup` (pills), `Button` (secondary `edge="border"`; plain), `SearchField` (`trailing`);
  - `Card` (`level`, `radius`, `padding`, `media`, `mediaInset`, `fill`, `onPress`, `label`, `testID`), `Swatch` (`width="fill"`, `height`, `corner`, `keyline`, `onPress`), `swatchAccessibleName`;
  - `Text`, `Row`, `Stack`, `EmptyState` (00's caption, `resolvedHere`), `Sheet` (`form="floating"`), `Arrival`/`Appear` (`index`, `fill`), `BILINGUAL_SEPARATOR`, `TAB_INDICATOR_TEST_ID`, `platformTapTarget`, `hitArea`.
- **`apps/mobile/src`:**
  - `corpus` (`allEntries`, `colorFor`, `familyLabel`, `CORPUS_ENTRY_COUNT`, `CORPUS_LABEL`);
  - `finder.ts` (`find`, `nearestByLab`, `HEX_LIMIT`, `lexicon`, plus `looksLikeHex`, which gets exported);
  - `home.ts#oklchLine` (moved, see New), `i18n` (`useMessages`, `t`), `bookmarks.tsx#useBookmarks` (route, unchanged), `tabBar.tsx#AppTabBar`, `tabs.ts#TABS`, `states.ts`.
- **Packages:** `@irodora/corpus` (`FAMILY_GROUPS`, `familyGroup`, `resolvePhrase`, `matchesRegion`), `@irodora/color-difference#deltaE00`.
- **Tests and tools:**
  - `apps/mobile/test/inventory.ts`, `screens.test.tsx` (`draw`, `drawLive`, `ENROLLED`, `DECOYS`, `LIST_SURFACES`, the screen-insets pin), `home-fidelity.test.tsx` (helpers copied in shape: `snap`, `snapSiblings`, `inOrder`, `sharedRow`);
  - `mockups/tools/measure.ps1`, `corner.ps1`, `generate-inventory.mjs`;
  - `scripts/generate-e2e-flows.mjs`, `generate-font-subset.mjs`, `verify-font-coverage.mjs`, `pnpm fidelity:capture`.

### New

- **`apps/mobile/src/atlas.ts`** (pure; no screen imports engine conversions):
  - Types: `AtlasFilters { season; groups: ReadonlySet<FamilyGroupId>; temperature; lightness; chroma }`; `NO_FILTERS`.
  - Search and filtering: `atlasMatches(entry, query)`, `atlasShown(entries, query, filters, bookmarkedOnly?: ReadonlySet<string>)`, `atlasNarrowed(...)`.
  - Card text: `capitalisedRomaji(romaji)`, `seasonLine(entry, t, script)` (`null` when none), `atlasOklch(oklch, unit)`, `atlasCardName(entry, t, script)`.
  - Count pill: `atlasCountLabel(count, t, script)` (joined with no space in Japanese, as `wardrobeCountLabel` does).
  - Family chips: `familyDot(group): { hex; color }` (memoised medoid).
  - Constants: `ATLAS_SAMPLE = 103`, `ATLAS_MEDIA_INSET = 5`, and the drawn heights (`SEASON_PILL = 21`, `FAMILY_CHIP = 20`, `COUNT_PILL = 21`, `NAV_PILL = 18.5`, `SEARCH_FIELD = 26.5`, `APP_BAR = 69.5`).
  - Every constant is recomputed by `atlas-fidelity.test` from `05.json`.
- **`apps/mobile/src/notation.ts`:** `oklchLine(oklch, unit, after = ' ')` moves here; `home.ts` re-exports it, so Home and its tests are untouched. `atlasOklch` calls it with `': '`.
- **`apps/mobile/src/corpus/index.ts`:** export `familyGroups()` and `groupOf(family)`, over the verified vocabulary.
- **`apps/mobile/src/i18n/index.ts`:** `japaneseRun(key)` = `t('ja', key)`, documented as OQ-48's interim (ADR-0142 D5).
- **`apps/mobile/src/finder.ts`:** `export` on `looksLikeHex` (no behaviour change).
- **`@irodora/ui`.** Each change is additive; with the new prop absent, the old tree renders, and a test asserts that, decoy included.

| component | change | forced by |
|---|---|---|
| `layout.tsx#Screen` | `bleed?: boolean`, typed only with `scroll: false`: the frame takes no padding, and the screen's scroller pads its own content | finding 9: 05's grid reaches the tab bar and the family row reaches the right edge |
| `AppBar.tsx` | (a) the rule becomes a child `View` (1 dp, `border`) with `APP_BAR_RULE_TEST_ID = 'app-bar.rule'`, exported; (b) a **leading** inline title drops `numberOfLines`, so it wraps (centred titles keep truncation; OQ-49's question) | the sweep must locate `05.header-rule`; E3 "never clips" |
| `SearchField.tsx` | the drawn form: `height?`, `icon?: GlyphName` (leading glyph), `outlined?: boolean` (1 dp `border`, no fill), `size?: 'body' \| 'label' \| 'caption'`; with `height`, the **touch container** is `max(platformTapTarget(), height)` tall, centred on the drawn box by negative vertical margins (layout stays at the drawn height); the `TextInput` fills the container, the outline and glyph draw under it with `pointerEvents="none"`, and the trailing toggle box stays the container's full height | 05 is the only mockup that draws it (P1); F-237's note on the 26.5 dp target |
| `Chip.tsx` (control) | `size?: 'label' \| 'caption'` (the badge already has it); the `dot` view carries `${testID}.dot` when a `testID` is given | 05's chip text step (measured in Increment 1); the dot locator |
| `ChoiceGroup.tsx` | `Pills` gains `selectedFill?: PillFill` (default `surface.2`), `selectedEdge?` (default `true`, 15's), `size?` (default `label`), `gap?: SpacingStep` (default `xs`); `Choice` gains `kanji?` (a Japanese run after the label, part of the name) | 05's season pills; 15 renders unchanged |
| `Button.tsx` (labelled) | `step?: 'body' \| 'label' \| 'caption'` (default `body`), `inset?: 'sm' \| 'md'` (default `md`) | 05's 56 × 18.5 dp pills |

- **Catalogue (en / ja):**

| key | en | ja | note |
|---|---|---|---|
| `atlas.title` | Colour Atlas | 色図鑑 | ja value changes (was 色の一覧) |
| `atlas.titleJa` | Japanese-Inspired Colours | 日本に着想を得た色 | the run; en is its gloss |
| `atlas.countNoun` | Original Colours | のオリジナル色 | joined with no space in ja |
| `atlas.compare` | Compare | くらべる | |
| `atlas.finder` | Finder | 色さがし | |
| `atlas.palettes` | Palettes | 配色 | en value changes (was *palettes*) |
| `atlas.searchPlaceholder` | Search kanji, romaji, family or #hex… | 漢字・ローマ字・系統・#16進数で探す… | the field's label and placeholder |
| `atlas.family` | Colour Family | 色の系統 | |
| `atlas.heading` | Atlas | 色図鑑 | |
| `atlas.moreFilters` | More filters | その他の絞り込み | the overflow's name, the sheet's title |

  - **Removed:** `atlas.more`, `atlas.openFinder`, `atlas.openCompare`, `atlas.openPalettes`, `atlas.filters`, `atlas.colours`.
  - **Kept:** `atlas.search` (PaletteStudio uses it), `atlas.all`, `atlas.clear`, `atlas.showing`, `atlas.empty*`, `atlas.bookmarked*`, `atlas.corpus`, `filter.*`, `season.*`, `temperature.*`, `band.*`, `chroma.*`, `coord.oklch`.
  - The sheet's close and handle labels reuse whatever keys the Lens sheet uses. The implementer greps for `handleLabel=`; if none are generic, add `sheet.close` and `sheet.handle*`.
- **The composition, as a sketch:**

```tsx
<Screen scroll={false} bleed script={script}
  appBar={{ height: APP_BAR, inset: nativeSpacing.md, gap: nativeSpacing.xs, rule: true, script,
    title: { text: t('atlas.title'), ja: japaneseRun('atlas.titleJa'), layout: 'inline',
             align: 'leading', placement: 'bar', size: 'title' /* verify, Inc. 1 */, weight: 600 },
    trailing: { icons: [{ glyph: 'more', label: t('atlas.moreFilters'), size: MORE_GLYPH, onPress: openFacets }] },
    below: (
      <Row justify="between" align="center" wrap gap="xs">
        <View><Chip form="badge" fill="surface.2" icon="list" numeric size="caption" height={COUNT_PILL}
                 label={atlasCountLabel(CORPUS_ENTRY_COUNT, t, script)} name={…+version} testID="atlas.count" /></View>
        <Row gap="xs" wrap>{compare}{finder}{palettes}</Row>   {/* Button variant="secondary" edge="border" height={NAV_PILL} step={…} inset="sm" */}
      </Row>) }}>
  <Arrival>
    <FlatList data={shown} numColumns={2} keyExtractor={slug}
      ListHeaderComponent={header} ListEmptyComponent={emptyCaption /* padded md */}
      contentContainerStyle={{ paddingTop: nativeSpacing.xl, paddingBottom: nativeSpacing.md }}
      columnWrapperStyle={{ paddingHorizontal: nativeSpacing.md }}
      ItemSeparatorComponent={() => <View style={{ height: nativeSpacing.sm }} />}
      renderItem={({ item, index }) => (
        <View style={{ width: '50%', ...(index % 2 === 0 ? { paddingRight: nativeSpacing.xs } : { paddingLeft: nativeSpacing.xs }) }}>
          <Appear index={index} fill><AtlasCard … /></Appear>
        </View>)}
      initialNumToRender={6} windowSize={10} removeClippedSubviews style={{ flex: 1 }} />
  </Arrival>
  <Sheet form="floating" open={facetsOpen} title={t('atlas.moreFilters')} …>{three ChoiceGroups}</Sheet>
</Screen>

header = <Stack gap="sm">   {/* intervals per the table below; md horizontal padding on each block but the family row */}
  <View style={{ paddingHorizontal: md }}><SearchField label={t('atlas.searchPlaceholder')} height={SEARCH_FIELD} icon="search" outlined size={…}
       value onChangeText trailing={bookmark toggle, ADR-0135} /></View>
  <View style={{ paddingHorizontal: md }}><ChoiceGroup label={t('filter.season')} clearLabel={t('atlas.all')}
       pills={{ height: SEASON_PILL, selectedFill: 'accent', selectedEdge: false, size: …, gap: 'xs' }}
       options={SEASONS.map(s => ({ value: s, label: t(SEASON_KEYS[s]), ...(script === 'latin' ? { kanji: japaneseRun(SEASON_KEYS[s]) } : {}) }))} /></View>
  <Text size="caption" weight={500} color="foreground" script={script} /* padded md */>{t('atlas.family')}</Text>
  <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: md, gap: xs }} showsHorizontalScrollIndicator={false}>
    {familyGroups().map(g => <Chip ground="surface.1" height={FAMILY_CHIP} size={…} label={g.romaji} kanji={g.kanji}
        dot={familyDot(g)} selected={filters.groups.has(g.group)} onPress={toggle(g.group)} testID={`atlas.family.${g.group}`} />)}
  </ScrollView>
  <View testID="atlas.filters.rule" style={{ height: 1, marginHorizontal: md, backgroundColor: colors.border }} />
  <Row justify="between" align="center" wrap /* padded md */>
    <Text size="body" weight={600} color="foreground" heading script={script}>{t('atlas.heading')}</Text>
    {narrowed && <Row gap="sm"><Text size="caption" numeric color="foreground.2">{`${t('atlas.showing')} ${n} / ${N}`}</Text>
                  <Button variant="plain" step="caption" label={t('atlas.clear')} onPress={clearAll} /></Row>}
  </Row>
</Stack>

AtlasCard = <Card level="1" radius="sm" padding="sm" fill mediaInset={ATLAS_MEDIA_INSET} testID={`atlas.card.${index}`}
     {...(onSelect ? { onPress, label: atlasCardName(item, t, script) } : {})}
     media={<View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Swatch width="fill" height={ATLAS_SAMPLE} corner="sm" keyline name={en} hex={derived.hex} color={colorFor(entry)} {...(onPress ? { onPress } : {})} /></View>}>
  <Stack gap="xs">
    <Row justify="between" align="start" wrap>
      <Text size="body" face="gothic" weight={400} color="foreground" script="japanese">{kanji}</Text>
      <Text size="caption" numeric color="foreground.2">{derived.hex}</Text></Row>
    <Text size="label" weight={500} color="foreground" script="latin">{capitalisedRomaji(romaji)}</Text>
    <Text size="caption" numeric color="foreground.2">{atlasOklch(derived.oklch, t('coord.oklch'))}</Text>
    {season !== null && <Text size="caption" color="foreground.3.card" script={script}>{season}</Text>}
  </Stack>
</Card>
```

- **Intervals behind the sketch** (§2's snap; ink gaps from `05.json`, less each text box's own line inset as in ADR-0128 D2). `atlas-fidelity` writes out each inset it subtracts.

| interval | drawn | step |
|---|---|---|
| page inset | 17.5 | `md` |
| rule → search | 31.5 (the leaked label is not drawn; the search keeps its drawn place) | `xl` |
| search → season | 9.5 | `sm` |
| season → family label | 11.5 less the label's top inset | `sm` (expected) |
| label → chips | 5.5 plus the bottom inset | `sm` (expected) |
| chips → rule | 10 | `sm` |
| rule → heading | 12.5 less the inset | `sm` (expected) |
| heading → grid | 9 plus the inset | `md` (expected) |
| card gap, columns and rows | 10 | `sm` (2 × `xs` and the separator) |
| card padding | 10–10.5 | `sm` |
| card text lines | 7, 8, 7 less insets | `xs` (expected) |
| pill and chip gaps | 3–5 | `xs` |
| media inset | 5 | as drawn (F-233 note) |

- **Drawn sizes:**
  - Heights: season 21 (siblings 21, 21, 21, 21, 22), family 20, count 21, pills 18.5 (siblings 20, 18.5, 18.5), search 26.5, sample 103 (siblings 103, 103, 106, 106.5).
  - Corners: card `sm` (13.25 px), sample `sm` (9 px), search `md` (21 px), pills `pill`.

### Increments

Each commit passes Tier 1 (ADR-0132): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'`, plus the domain gates named.

0. **Claim.**
   - Write this plan to `.harness/plans/F-246-the-atlas-is-mockup-05.md`.
   - Set F-246 `in_progress`, set `plan`, and add `attested` (Appendix F).
   - Gates: `node scripts/verify-state.mjs`, format.
1. **Measure, decide, specify.**
   - Measure with `mockups/tools/measure.ps1` (F-220's method: em from the line box by glyph class):
     - the chip label ems (season, family), the count pill text, the three pills' text, and the search placeholder;
     - the `search` and `more` glyph boxes;
     - **re-measure `05.title`**: is 26 dp right, against a 196 dp box?
   - Record in `mockups/tools/inventory-data/05.mjs`:
     - `type` on those elements, at the step each snaps to. **Do not add `raw.emDp` below 12 dp** (the caption census, F-242 finding 15); put the reading in a comment. If the title's em moves, `type-scale.test` re-runs.
     - `05.card-N.era` → `binding: 'corpus:entry.taxonomy.season'`.
     - `05.finder` → `action: 'navigate:/atlas/find'`.
     - `05.more` → `action: 'open:atlas.facets'`.
     - `departures` added: E1 on `05.count`, `05.card-4` (OQ-18), and `05.card-1/3/4.era`; E3 on `05.filters.season.all` (OQ-43).
     - `notDesign` added: `garbled-text` boxes for the brackets on `05.compare`, `05.finder` and `05.palettes`, and for "Color" in `05.filters.family-label`.
   - Regenerate `05.json`.
   - Write ADR-0140 … 0144.
   - PRD §10: remove the OQ-17, OQ-18 and OQ-43 rows and add their closing paragraphs.
   - R9 updates:
     - §2 (two bullets);
     - §4 E1 (*Sourced*, the era line), E3 (the chosen-pill dot), E4 (the overflow's facets; *Clear*'s place);
     - §8 (a `05` row);
     - §11 (OQ-17, OQ-18, OQ-43 → Closed).
   - `feature_list.json` (Appendix F):
     - F-246's notes and `openQuestions: []`;
     - notes on F-251, F-257, F-260 and F-263 (OQ-23), F-343, F-265, F-250, F-267, and the C1 surfaces' features F-243, F-250, F-254, F-255, F-262 and F-263.
   - Gates: Tier 1. `verify-mockups` (refuses the closed `oq:` if it is not rebound), `type-scale.test`, and the inventory `--check` all run in lint.
2. **`@irodora/ui`.**
   - The six changes, each with a test that the default tree is unchanged (a decoy: the old tree passes, the new prop changes it).
   - New conformance subjects: SearchField (drawn, with and without the toggle); Chip (caption); ChoiceGroup (pills, 05: accent with the dot); Button (secondary, caption, `sm`); AppBar (leading title with `rule`).
   - Gates: Tier 1, `pnpm test:a11y`, `pnpm test:contrast`, `pnpm test:cvd`.
3. **Pure logic.**
   - `src/atlas.ts`, `src/notation.ts` (with the `home.ts` re-export), the `corpus` exports, `japaneseRun`, and the `finder.ts` export.
   - Add the new keys (old ones stay until 4).
   - Add `apps/mobile/test/atlas.test.ts`.
   - Run `node scripts/verify-font-coverage.mjs`. If codepoints are missing (likely: 漢, 統, 絞, 込, 他, オ, リ, ジ, ナ, ル, 進, 数, 探), run `node scripts/generate-font-subset.mjs` and re-run `fonts.test`.
   - Gates: Tier 1, `verify-font-coverage`.
4. **The screen.**
   - Rebuild `Atlas.tsx`. Props: `onSelect`, `onOpenFinder/Compare/Palettes`, `initialQuery`, `bookmarked`, `initialBookmarkedOnly`, plus new `initialSeason` and `initialFacetsOpen` (render-only witnesses, as `initialQuery`).
   - The route is unchanged: `useBookmarks`, `bookmarked={bookmarked}`, the three pushes. bookmarks.test asserts this from source.
   - Delete the dead keys.
   - `screens.test.tsx`:
     - the Atlas subjects are updated;
     - new subjects `screens/Atlas (a season chosen)` and `screens/Atlas (more filters open)`;
     - the A11 heading test;
     - re-capture **only** the Atlas entries in `screen-insets.json`, with a `$comment`.
   - Adapt `bookmarks.test.tsx` (finding 14):
     - label → `atlasCardName`;
     - the family filter → the group chip button;
     - `QUERY = 'kage'`, plus an assertion that it is neither a group word nor a lexicon term nor a hex.
     - Every decoy is kept.
   - e2e:
     - `routes.json` `/atlas` anchor → `atlas.family`;
     - `atlas.journey.json`: steps 4 and 14 → `atlas.family`; step 5 → `atlas.compare`; the search tap → `atlas.searchPlaceholder`; assert/tap the colour by `field: "kanji"`;
     - then `node scripts/generate-e2e-flows.mjs`.
   - Gates: Tier 1, a11y, contrast, cvd, `verify-reachability`, `verify-route-targets`, `generate-e2e-flows --check`, `verify:claims`.
5. **Enrolment.**
   - `inventory.ts`: `Inventory.conflicts?` and `supersededFindings(inventory, superseded)`.
   - `screens.test.tsx`: `Enrolled.superseded`; the `05.screen` entry and its locators (Test plan); the decoys.
   - `inventory-surfaces.json`: add `"05.screen"`.
   - Commit `conformance-sweep.json`.
   - Gates: Tier 1, `verify-mockups`.
6. **Criterion 1's own test:** `apps/mobile/test/atlas-fidelity.test.tsx`. Gates: Tier 1.
7. **Effects and memory.** `effects.json` updates and new links E-210 … E-212, with their notes. Gates: Tier 1, `verify-state`.
8. **Verify, review, record.**
   - Run Tier 2, then the evaluator once.
   - Fix its findings or record them, then run Tier 2 again on the final tree.
   - Update `progress.md` and `feature_list.json`; capture lessons; checkpoint.

---

## Mockup fidelity

- **Governing:** `05` (P1). **Variants:** `25` for the palette only (P2), and `27` (none applies: the Atlas's absence is 00's caption, ADR-0128 D3). **Board:** `00` for parts 05 does not show (P3).
- **Conflicts applied:**
  - C1 (01's tab bar, Atlas active);
  - C6 (sans kanji);
  - C8 (text beside the sample);
  - C11 (samples on tinted cards);
  - C13 / ADR-0108 (nine chips, the six drawn first);
  - C20 (README keyline at 1 dp, moved per sample).

### Element by element

The locator column says how the sweep finds each element: "derived" is the record's own reading; "explicit" is given in `ENROLLED`.

| # | element | built as | bound to | sweep locator |
|---|---|---|---|---|
| 1 | `05.header` | `Screen appBar`, height 69.5, inset `md`, `rule` | — | derived: `AppBar` |
| 2 | `05.title` | inline leading title, `title` 600, wraps | `atlas.title` + `japaneseRun('atlas.titleJa')` | explicit value: the joined title |
| 3 | `05.more` | `trailing.icons[0]`, glyph `more` | opens the facets sheet (ADR-0143) | derived: glyph `more` |
| 4 | `05.count` | `Chip form="badge"`, `surface.2`, `icon="list"`, `numeric`, h 21, measured step | `atlasCountLabel(CORPUS_ENTRY_COUNT)` | derived: glyph `list` |
| 5–7 | `05.compare` / `05.finder` / `05.palettes` | `Button secondary edge="border"`, h 18.5, measured step, `inset="sm"` | → `/atlas/compare`, `/atlas/find`, `/atlas/palettes` | derived: text keys |
| 8 | `05.header-rule` | `AppBar` rule node | — | explicit: testID `APP_BAR_RULE_TEST_ID` |
| 9 | `05.search` | `SearchField` drawn form, h 26.5, `search` glyph, outlined `md`, toggle (ADR-0135) | `atlas.searchPlaceholder`; `atlasShown` | derived: text (the accessible name) |
| 10–14 | `05.filters.season.*` | `ChoiceGroup` pills, accent plus dot when chosen, h 21, gap `xs`, wraps | `atlas.all`, `season.*` (+ `japaneseRun` kanji in en) | explicit text keys `atlas.all`, `season.*` |
| 15 | `05.filters.family-label` | `Text caption 500 foreground` | `atlas.family` | derived: text |
| 16–21 | `05.filters.family.{ao…kuro}` | `Chip ground="surface.1" dot kanji` h 20 (then ki, shiro, nezumi past the edge) | `familyGroups()`; toggles `filters.groups` | explicit: testID `atlas.family.<g>` |
| 22–27 | `….dot` | `Chip`'s dot, 6 dp | `familyDot(g)` (medoid, `reference`) | explicit: testID `atlas.family.<g>.dot` |
| 28 | `05.filters-rule` | `View` 1 dp `border`, inset `md` | — | explicit: testID `atlas.filters.rule` |
| 29 | `05.heading` | `Text body 600 heading` (+ count line when narrowed) | `atlas.heading` | derived: text (shares "Atlas" / 色図鑑 with the tab label: needed 2) |
| 30, 31, 44, 45 | `05.card-1…4` | `Card level 1, sm, padding sm, fill, mediaInset 5`, one control | → `/atlas/[slug]` | explicit: testID `atlas.card.0…3` |
| 32, 33, 46, 47 | `….swatch` | `Swatch width fill h 103 sm keyline`, hidden from AT, same `onPress` | `derived.hex`, `colorFor` | derived: `Swatch` ×4 |
| 34–37, 48–51 | `….kanji` / `….hex` | `body gothic 400` / `caption tabular foreground.2` | `name.kanji` / `derived.hex` | explicit values |
| 38, 39, 52, 53 | `….romaji` | `label 500 foreground` | `capitalisedRomaji(name.romaji)` | explicit values |
| 40, 41, 54 | `….oklch` | `caption tabular foreground.2`, on **every** card | `atlasOklch(derived.oklch)` | explicit values |
| 42, 43, 55, 57 | `….era` | `caption foreground.3.card`, only where a season is authored | `seasonLine(entry)` | explicit values (fixture: autumn) |
| 56 | `05.tabs` | `AppTabBar` → `TabBar`, Atlas active (C1) | — | derived: `TabBar` |
| 58 | `05.tabs.indicator` | the active indicator | — | explicit: testID `TAB_INDICATOR_TEST_ID` |
| 59, 62 | `….atlas.icon`, `….profile.icon` | 01's `atlas` and `profile` glyphs, the same tabs (C1) | — | derived: glyph |
| 60, 61 | `….compass.icon`, `….search.icon` | none: no tab under C1 | — | **superseded: C1** (ADR-0144) |
| 63 | `05.tabs.atlas.label` | the tab's word | `tab.atlas` | explicit text key `tab.atlas` |

### Departures, by id (nothing else)

- **E1:**
  - `05.title`: 日本の伝統色 → 日本に着想を得た色.
  - `05.count`: *Sourced* → *Original*.
  - `05.card-1/2/3.oklch`: the engine's figures.
  - `05.card-4.swatch`: the entry's own hex.
  - `05.card-4`: every card prints OKLCh (OQ-18).
  - `05.card-1/3/4.era`: no entry holds an era; the line is the authored season, or nothing (OQ-17).
- **E3:**
  - `05.filters.season.all`: the chosen pill carries its leading dot (OQ-43).
  - Rows wrap and never clip: the title, the count/pills row, the season row, a card's kanji/hex row, and the heading row.
- **E4:**
  - The bookmark toggle in `05.search` (ADR-0135, kept).
  - The overflow's facets sheet (FR-20).
  - The count line and *Clear* on the heading row, only while narrowed (ADR-0135 D4's placement).
- **§2, not design:**
  - *Search & Faceted Filter Section* (the leaked label; the search keeps its drawn place).
  - The brackets in the three pills.
  - *Color* for *Colour*.
  - Card 3 and 4 cut by the tab bar: the scroll position, as F-242's §2 line.
- **C1:** 05's four-item bar becomes 01's five.

If the capture shows anything else, it is fixed, or it is a question for a person.

---

## Files to touch

```
.harness/plans/F-246-the-atlas-is-mockup-05.md       — this plan
docs/adr/0140-…, 0141-…, 0142-…, 0143-…, 0144-…      — the five decisions (Appendices A–E)
docs/PRD.md                                          — §10: OQ-17, OQ-18, OQ-43 closed
docs/design/R9-MOCKUP-FIDELITY.md                    — §2, §4 E1/E3/E4, §8, §11
mockups/tools/inventory-data/05.mjs, mockups/inventory/05.json — measured types, rebinds, the action, departures, notDesign
packages/ui/src/layout.tsx, AppBar.tsx, SearchField.tsx, Chip.tsx, ChoiceGroup.tsx, Button.tsx, index.ts, testing/conformance.ts
packages/ui/test/app-bar.test.tsx, search-field.test.tsx, pill-selection.test.tsx, badges.test.tsx (or the chip test), button-forms.test.tsx, conformance.test.tsx (+ a layout/Screen test)
apps/mobile/src/atlas.ts (new), notation.ts (new), home.ts (re-export), finder.ts (export), corpus/index.ts (exports), i18n/index.ts (japaneseRun), i18n/en.ts, ja.ts
apps/mobile/src/screens/Atlas.tsx                    — rebuilt to 05
apps/mobile/test/atlas.test.ts (new), atlas-fidelity.test.tsx (new), screens.test.tsx, bookmarks.test.tsx, inventory.ts
apps/mobile/e2e/capture/routes.json, e2e/journeys/atlas.journey.json (+ regenerated flows)
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf (+ pins)   — only if verify-font-coverage asks
.harness/verification/inventory-surfaces.json, screen-insets.json, conformance-sweep.json
.harness/state/feature_list.json, progress.md, effects.json; .harness/memory/effects/*.md (incl. active-means-two-different-things.md: OQ-43 closed)
packages/testing/fixtures/claims/near-misses.md      — only if a pattern comes near "Original"
```

`apps/mobile/app/(tabs)/atlas/index.tsx` needs **no change** (asserted by bookmarks.test).

---

## Anticipated effects

### Existing links whose `from` this touches

| link | change | guard |
|---|---|---|
| **E-016 / E-066** (`en.ts`) | ten keys added, six removed, two re-valued; journey keys move | `tsc`; `i18n.test` (unused, Japanese script, not copied); `generate-e2e-flows --check` |
| **E-017 / E-028 / E-174** (corpus and taxonomy → ja subset; families → Atlas) | the group kanji are still printed; new ja codepoints; the Atlas reads `groups` through `familyGroups()` and the medoid | `verify-font-coverage`; `generate-font-subset --check`; `taxonomy.test`; `atlas.test` (the dot is a member of its group; decoy) |
| **E-064** (`Atlas.tsx` → `screens.test`) | `numColumns={2}`; `data` is still the whole corpus under no filter | the F-018 tests (list `data` has 120 slugs; every rendered kanji has its hex) |
| **E-089** (ja → claims) | new ja copy | `verify:claims` in lint |
| **E-128 / E-152** (inventory → R9, PRD, features; type census) | `05.json` edited; the title's em may move | `verify-mockups`; `type-scale.test` (the census, both ways); the inventory `--check` |
| **E-140 / E-164** (`Screen`, `AppBar`) | `bleed`; the rule node; a leading title wraps | `app-bar.test` (rule node with id; a leading title has no `numberOfLines`, a centred one keeps it; decoy); a Screen test (`bleed` drops the frame padding only with `scroll={false}`; does not compile with `scroll`); `chrome.test`; the screen-insets pin |
| **E-151 / E-156 / E-157** (tokens → SearchField; hit area; inventory defaults) | the drawn SearchField; Chip and Button steps | `search-field.test`: the container reaches `platformTapTarget()` on iOS and Android at h 26.5 (decoy: a 26.5 container fails); the toggle box is unchanged; focus is a `ring`; the default tree is unchanged. `button-forms`/chip tests: steps; no default moves (the defaults' recompute tests stay green) |
| **E-196** (`ChoiceGroupProps`) | the Pills options and `Choice.kanji` | `pill-selection.test` (15's defaults unchanged, as the decoy; 05's form draws accent plus dot; a fill without a dot is still reported) |
| **E-199** (Arrival) | the grid: one `Arrival`, `Appear index` 0…n−1 in reading order | `screens.test` "every list surface arrives once" (the `screens/Atlas` entry kept) |
| **E-203** (feature list → `verify-mockups`, table, sweep) | `05.screen` enrolled | `verify-mockups` (lint), with the proof unaffected (finding 16); `screens.test` both directions |
| **E-204** (bookmarks) | the toggle kept in the drawn field; *Clear* moved to the heading row | `bookmarks.test`, adapted, every decoy kept |
| **E-191** (`states.ts`) | `STATES` kept; two new witness subjects | the declarations test; `blank-and-zero` |

### New links

Check the maximum id at write time; E-209 is the last today. Each gets a memory note.

- **E-210.**
  - From `apps/mobile/src/atlas.ts#atlasShown`.
  - To `screens/Atlas.tsx`, `src/finder.ts` (the shared hex and phrase branches), `content/rules/phrase-lexicon.*`, `bookmarks.test`, `atlas.journey.json`, and F-250.
  - **Hazard:** a change to the Finder's classification (hex shape, lexicon) silently changes what the Atlas field answers.
  - **Guard:** `atlas.test` uses the Finder as its oracle: hex results equal `find(q).entries` ranked over the corpus; a phrase gives the same region set; a decoy (`beaded`) is a name query.
- **E-211.**
  - From `apps/mobile/test/inventory.ts#supersededFindings`.
  - To `screens.test.tsx` (`ENROLLED`) and the features that enroll a C1 surface: F-243 (02), F-250 (09), F-254 (21), F-255 (11), F-262 (15), F-263 (18).
  - **Hazard:** a declaration that hides an element the conflict does not replace.
  - **Guard:** the declared id must be in the inventory's own `conflicts[C1].elements` (decoy: declaring `05.search`); a superseded element is never also located (decoy).
- **E-212.**
  - From `apps/mobile/src/atlas.ts#familyDot`.
  - To `packages/ui/src/Chip.tsx` (dot), `content/taxonomy.json` (`groups`), `content/colors`.
  - **Hazard:** a publish that moves a group's members moves its dot.
  - **Guard:** `atlas.test` (medoid by ΔE00 over `derived.lab`; deterministic on ties; always a member; provenance `reference`; decoy: a non-member colour fails).

---

## Test plan

### Unit and property (`apps/mobile/test/atlas.test.ts`)

- **`atlasShown`:**
  - With no query and no filters, all 120 in slug order.
  - Season `autumn` gives the six autumn slugs. Decoy: a null-season entry never appears.
  - Groups `{ao, aka}` give the union; with `autumn` as well, the intersection.
  - Facets `temperature: 'warm'` narrows (FR-20).
  - Bookmarks AND everything.
  - Hex `#C5CFD4`: at most `HEX_LIMIT`, in ΔE00 order, equal to `nearestByLab` over the whole corpus, then filtered. Oracle: `find()` when no filter is set.
  - Decoy: `beaded` is a name query. `dark` and `淡い` are phrases (region-equal to `find`). `Ao`, `青鼠`, `Blue-grey` and `#5B` are words or substrings.
- **The headings and words:**
  - The title's run is true of every entry (all `japanese-inspired`); decoy: a planted `traditional` entry.
  - *Original* is true of every entry (classification ∈ {japanese-inspired, editorial}); decoy: the same plant.
  - `taxonomy.era` is null for all 120; decoy: a planted era.
  - `CORPUS_ENTRY_COUNT > 1` (no singular is needed).
- **`seasonLine`:** *Autumn* / 秋; two seasons are joined by ` · ` and `・`; `null` without a season.
- **`atlasOklch`:** equals `oklchLine` with `': '`. Home's golden over the 120 derivations covers the digits; the `home.test` case stays.
- **`atlasCardName`:** contains kanji, capitalised romaji, English, hex, *reference, 100 percent confidence*, the OKLCh line, and the season when there is one. Decoy: no season segment without one.
- **`familyDot`:** a member of its group, deterministic, with `reference` provenance. Decoy: a planted foreign colour fails the membership assertion.
- **`atlasCountLabel`:** en *120 Original Colours*; ja 「120のオリジナル色」.

### Conformance and the inventory sweep (`screens.test.tsx`)

The `ENROLLED` entry:

```
surface '05.screen', root 'atlas.surface',
render: <View testID="atlas.surface">
          <Atlas bookmarked={BOOKMARKED} initialSeason="autumn" onSelect onOpenFinder onOpenCompare onOpenPalettes />
          <AppTabBar state={{ index: 1, routes: TABS… }} navigation={…} insets={{ bottom: 0 }} />
        </View>
superseded: { '05.tabs.compass.icon': 'C1', '05.tabs.search.icon': 'C1' }
```

- **Why autumn.** It is a reachable state in which every card draws its last line, as F-242's fixture gave every garment a material. The four cards are the first four of `atlasShown(…, {season:'autumn'})`, computed, never named.
- **The locators** are as in the table, computed by the screen's own functions. The season lines share their words with the *Autumn* pill: the signature needs 5 and finds 5, in both locales.
- **Decoys:**
  - one card's season line gone → one finding naming the line and the pill that share its words ("found 4, needed 5");
  - the header rule node gone → `05.header-rule`;
  - a family dot gone → `05.filters.family.ao.dot`;
  - declaring `05.search` superseded → the supersession finding;
  - `'05.screen'` added to "the real surfaces are clean as drawn".

### Criterion 1's own test (`atlas-fidelity.test.tsx`; reads the RENDERED tree)

- **Order:**
  - the bar: title < more < count < compare < finder < palettes < rule;
  - the header: search < All…Winter < family label < ao…kuro < ki, shiro, nezumi < filters rule < heading;
  - the cards in data order;
  - inside a card: swatch < kanji < hex < romaji < oklch < season.
- **Grouping:**
  - each chained row in `05.json` (tops within 4 dp) shares a `flexDirection: 'row'` ancestor: title|more, count|pills, season pills, family chips, kanji|hex, card-1|card-2;
  - each part is a descendant of its parent's node;
  - the family row is a `ScrollView horizontal` whose content pads `md` at both ends;
  - the grid's first row reaches the frame (Screen `bleed`; no frame padding).
- **Proportion, from the props passed, each recomputed from `05.json` through §2's snap with the subtracted insets written out:**
  - Screen `bleed`; FlatList `paddingTop` = `xl`; `columnWrapperStyle.paddingHorizontal` = `md`; separator `sm`; cells `width: '50%'` ± `xs`;
  - AppBar `height` 69.5, `inset` = `nativeSpacing.md`, `gap`, `rule`;
  - every Stack and Row gap in the header and card;
  - heights 21, 20, 21, 18.5 and 26.5; sample 103; `mediaInset` 5; corners;
  - the keyline at 1;
  - **every text element's rendered `fontSize`, `fontWeight` and ink token**, against `type.size`, `type.weight` and `tokens.fg`. Decoy: the Japanese `body` step's own weight would differ from 400 (F-242 B1);
  - the season *All* chosen: `accent` fill plus a `SelectionDot`, the others outlined;
  - pills' `edge="border"`; the count badge `surface.2` with `list`.
- **Wrap:** each of the five rows carries `flexWrap: 'wrap'`, and the leading title has no `numberOfLines`.

### Negative tests, each with a decoy (`atlas.test.ts` and an `atlas-states` block)

- **No 05 sample content**, in both locales and both themes, in paragraphs and names: *Ai-nezumi, 藍鼠, Moegi, 萌黄, Toki-iro, 鴇色, Jinza-momi, 甚三紅, #5B6B78, #7BA23F, #F4A7B9, #EB6EA5, 0.49, 240°, Heian, Edo, 伝統, Traditional, Sourced, [Compare], Color Family*. Decoy: a planted *Ai-nezumi* is found.
- **One control:**
  - the card is the only accessible element per entry (the sample is hidden);
  - pressing the card's text calls `onSelect(slug)`, and pressing the sample (`fireEvent.press` on the Swatch) calls it too;
  - decoy: without `onSelect`, no card carries `accessibilityRole="button"`.
- **The overflow:**
  - pressing `more` opens the sheet;
  - choosing *Warm* narrows the list and shows the count line;
  - *Clear* resets season, groups, query, facets and the bookmark toggle;
  - decoy: before any narrowing there is no count line.
- **Actions:** compare, finder and palettes call their handlers; decoy: an absent handler means an absent pill.

### E2E

- `generate-e2e-flows --check` covers the journey and the `/atlas` capture flow.
- Device runs are attested.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#  + inc 2, 4: pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
#  + inc 3: node scripts/verify-font-coverage.mjs (and generate-font-subset if asked)
#  + inc 1, 5: verify-mockups (in lint); inc 4: verify-reachability, verify-route-targets, generate-e2e-flows --check, verify:claims (in lint)
# Tier 2, at Verify and again after the review's fixes
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm turbo run test --force
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:content
pnpm security
node scripts/verify-ci.mjs --all
```

**Evidence for `progress.md`:**

- each gate's summary line;
- `conformance-sweep.json`'s `inventory` block: `enrolled` includes `05.screen`, `elementsAsserted` +61 (63 less 2 superseded), `renders` +4, and a `superseded: 2` count;
- `claims.findings` 0;
- the screen-insets delta for the Atlas subjects;
- the font-coverage line.

| # | criterion | proven by |
|---|---|---|
| 1 | every 05 element in order, grouping and proportion; the sweep asserts the inventory | `atlas-fidelity.test` and the sweep. **Gated** |
| 2 | bindings per §8; no mockup content | `atlas.test` (headings true over all entries; era null; no sample content) and the sweep's value locators. **Gated** |
| 3 | only the listed departures | gated for structure; **attested** for appearance |
| 4 | capture beside 05, compared by a person | **attested** |
| 5 | catalogues, every drawn action works, a11y/contrast/cvd pass | `tsc`, `i18n.test`, the action tests, the three gates. **Gated**, with the touch-on-device half **attested** |

---

## Attestations

Declared now in F-246's `attested` array (Appendix F):

1. **Criterion 4, the capture compared.**
   - A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator at 384 dp, with a release build of the final commit.
   - They compare the four `/atlas` pages under `.harness/verification/evidence/fidelity/<UTC>/compose/` against 05 (25 for Washi), element by element.
   - They record "matches" or each difference in `progress.md`.
2. **Criterion 3, the appearance half.** Discharged by the same comparison. Every difference is a listed departure, or is fixed and recaptured, or is recorded as a feature.
3. **Criterion 5, the device half.** On the same device, the person checks:
   - a tap anywhere in the 26.5 dp field's drawn box focuses it;
   - the bookmark toggle takes its tap;
   - the season pills below take theirs (finding: hit areas overlap, E-156);
   - the family row scrolls to *Nezumi*;
   - tapping a card's sample opens the colour;
   - TalkBack reads a card as one control, with its name;
   - at 200 % text in both languages the five rows wrap and nothing clips;
   - the journey `atlas.yaml` passes.

All three block release.

---

## Risks and open questions

1. **Measurements owed in Increment 1:** the chip, pill, placeholder and count steps, and the title's em. The plan's working estimate (`caption` for the small text) comes from widths, and widths are unreliable on this render (finding 7). If the title's em changes, `type-scale.test` re-runs (E-152).
2. **Unverified mechanics:**
   - whether `renderedTexts` reads a nested `Text` run as one paragraph. If not, locate the title's Latin run by value and assert the Japanese run in `atlas-fidelity`;
   - whether gorhom's `Sheet` renders under jest in a screen subject (the Lens's subjects suggest yes);
   - Maestro's hierarchy inside an accessible card when the journey taps the kanji (device);
   - Android hit testing where the field's container overhangs the pills' slop (device).
3. **Lexicon precedence:** typing 青 answers the hue region, not the 青 chip (ADR-0143 states this).
4. **The medoid dot for 紫** is greyish: the group is violet-greys (taxonomy.json's own stated cost; F-299).
5. **Japanese runs** follow OQ-48's interim. F-265 may change the season pills and the title in ja.
6. **The `Screen bleed` change** reaches only `scroll={false}` (only the Atlas uses it), but the screen-insets pin moves for the Atlas subjects.
7. **The corpus version** leaves the visible root (05 draws none). It stays in the count's accessible name and in every envelope (FR-25).
8. **No OQ blocks this feature** once ADR-0140 and ADR-0141 land. OQ-23, OQ-46, OQ-47, OQ-48 and OQ-49 stay open and untouched.

---

## Out of scope

- Every other route's rebuild: 06 (F-247), 09 (F-250) and the Finder's own search semantics, among others.
- OQ-23 for 13 16 17 18.
- F-343's component fix (a Swatch with no action stops being a button).
- F-342 (Screen's gap; the Atlas composes its own rhythm).
- Any change to the corpus, the taxonomy file or the lexicon. No era facet.
- Sorting.
- Any new route.
- Changing `Screen`'s default inset.
- A competent-speaker review of the Japanese (OQ-5).

---

## Sources

**Repository (read; nothing run):**

- Manuals and specs: `AGENTS.md`, `CLAUDE.md`, `mockups/AGENTS.md`, `apps/mobile/AGENTS.md`, `docs/design/R9-MOCKUP-FIDELITY.md` (in full), `docs/design/ACCESSIBILITY.md` §2–5, `docs/PRD.md` (FR-20, 23, 24, 25, 47; §10).
- Mockup 05: `mockups/05_atlas_library_catalog.jpg`, `mockups/inventory/05.json`, `mockups/tools/inventory-data/05.mjs`, `mockups/inventory.schema.json`, `mockups/inventory/09.json` (search element).
- F-242: `.harness/plans/F-242-…md` (incl. its Review table), `.harness/plans/F-232-…md`, `.harness/plans/TEMPLATE.md`, `.harness/skills/plan-feature/SKILL.md`, the top of `.harness/state/progress.md`.
- State: the F-246, F-265, F-342 and F-343 entries of `feature_list.json`; `.harness/state/effects.json` (E-016, 028, 064, 066, 089, 128, 140, 151, 152, 156, 157, 164, 196, 199, 203, 204); `.harness/verification/inventory-surfaces.json`.
- Decisions: ADR-0108, ADR-0135, `memory/effects/active-means-two-different-things.md`.
- App source: `apps/mobile/src/screens/Atlas.tsx`, `app/(tabs)/atlas/index.tsx`, `_layout.tsx`, `src/corpus/index.ts`, `src/finder.ts`, `src/home.ts`, `src/tabs.ts`, `src/i18n/en.ts`, `ja.ts`, `index.ts` (signatures).
- App tests: `test/screens.test.tsx` (the Atlas subjects, F-018 tests, `ENROLLED`, decoys, `LIST_SURFACES`), `test/inventory.ts`, `test/bookmarks.test.tsx`, `test/home-fidelity.test.tsx` (head), `test/i18n.test.ts`, `test/chrome.test.ts`.
- UI source: `packages/ui/src/{Chip,selection,ChoiceGroup,SearchField,AppBar,bilingual,layout,motion,Card,Swatch,Button,overlay,NavIcon,Text}.tsx`, `packages/corpus/src/taxonomy.ts`.
- Content: `content/taxonomy.json` (`groups`), `content/colors/*.json` (season/era census), `content/rules/phrase-lexicon.2026.08.1.json` (terms).
- Scripts: `scripts/verify-mockups.mjs` (`sweptSurfaces`, the proof's `owed`), `scripts/mockup-inventory.mjs`, `scripts/generate-e2e-flows.mjs` (FIELDS); `apps/mobile/e2e/capture/routes.json`, `e2e/journeys/atlas.journey.json`.

**Web:**

- [WCAG 2.2 Understanding SC 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): inversion of foreground and background "would pass"; a lightness difference of 3:1 "counts as an additional visual distinction".
- Material 3 filter chips (secondary sources; the official page did not render): [Compose FilterChip](https://composables.com/jetpack-compose/androidx.compose.material3/material3/components/FilterChip.md), [Kotlin FilterChip API](https://kotlinlang.org/api/compose-multiplatform/material3/androidx.compose.material3/-filter-chip.html), [Firefox Acorn chips](https://acorn.firefox.com/latest/mobile/components/chips/android-ZX1gImzt). They say multi-select, the checkmark as the leading icon, and "don't use in place of buttons".
- Maestro whole-text selectors: as cited in F-242's plan.

---

# Appendix A: ADR-0140 draft

```markdown
# ADR-0140: Every Atlas card prints its OKLCh line, ends in the season it was authored with, and prints no era

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Closes** | OQ-17, OQ-18 |
| **Builds on** | [ADR-0065](0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md); [ADR-0005](0005-measurement-provenance-is-a-type.md); [ADR-0138](0138-home-leads-with-the-days-corpus-colour-as-01-binds-it-and-draws-no-reading.md) D1 (the OKLCh precision) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (siblings), §4 E1, §8; golden rules 11, 12 and 14; FR-20, FR-23, FR-24; ACCESSIBILITY A3 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`05` draws four cards. Each has a sample, then the kanji with the hex at its right, the romaji, an OKLCh line, and a last line in `text.tertiary`.

- **The last line** reads *Heian Era*, *Spring*, *Heian* (cut) and *Edo Era*. The drawing uses one slot for an era **or** a season (`05.card-N.era`, bound `oq:OQ-17`).
- **Card 4 has no OKLCh line.** Its last line sits where the OKLCh would be.

**What the corpus holds** (all 120 entries, read):

| field | entries holding it | why the others do not, in each entry's own `unknowns` |
|---|---|---|
| `taxonomy.era` | 0 | *"an Irodora construction of 2026 belongs to no historical period, and claiming one would be the dishonesty ADR-0065 exists to prevent"* |
| `taxonomy.season` | 24 (six per season, one each) | *"assigned only in the Seasonal group, where the season is the editorial premise of the colour"* |
| `derived.oklch` | 120 | — |

## Decision

**D1: Every card prints the OKLCh line (OQ-18).**
- Form: `OKLCh: L • C • h°`, from the entry's frozen `derived.oklch`, at 3, 3 and 1 decimals (the precision the corpus is authored at, as on Home).
- Card 4's omission is sample content (E1). The fourth position is filled by whatever the query and filters leave, so "the fourth card has none" cannot be a rule. No entry lacks the value.

**D2: The last line is the entry's authored season (OQ-17).**
- The words are the catalogue's (`season.*`: *Autumn*, 秋). Several seasons are joined by ` · ` in Latin and `・` in Japanese.
- **Where no season is authored, the line is not drawn**, as `05` draws card 4 ending a line early. Cards in a row keep one height by stretching.

**D3: No era is printed.**
- No entry holds one, and none is authored: rule 12 and `content/AGENTS.md` rule 3 forbid an era with no source, and each entry's recorded unknown says why.
- A test holds `taxonomy.era` null for every published entry, with a planted era as its decoy. A corpus that gains a sourced era fails it until its display is decided.

**D4: The inventory rebinds** `05.card-N.era` to `corpus:entry.taxonomy.season`, and records the E1 departures (`05.card-4`; `05.card-1/3/4.era`).

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Authored eras** | A historical claim with no source, on colours the corpus says belong to no period (rule 12, ADR-0065, FR-23) |
| **A line on every card** (*No season*, *—*, *Year-round*) | A negative or invented fact on 96 of 120 cards. *Year-round* (通年) claims a usage the corpus never authored |
| **The classification in the slot when there is no season** | One slot with two meanings: a reader would infer that *Spring* entries are not *Japanese-inspired* |
| **OKLCh on some cards only** | Needs a rule nothing defines; it removes a drawn element from three cards in four. A3 asks every swatch for its numeric value |

## Evidence, and its limits

- **It rests on:** `05.json`; the 120 `content/colors` records (season and era census, `unknowns`); 05's own card 2 (a season in the slot) and card 4 (a line missing, the next moving up).
- **The limits:**
  - 96 cards end one line shorter than drawn; the person's comparison (F-246 criterion 4) judges it.
  - It was not tested with people.

## Consequences

- `src/atlas.ts` gains `seasonLine` and `atlasOklch`.
- `atlas.test` holds era null and the season line present if and only if a season is authored, each with a decoy.
- R9 §4 E1 and §8 gain the `05` lines. PRD §10 and R9 §11 close OQ-17 and OQ-18.

## Revisit when

- A cleared source gives an entry an era (the test fails first).
- A mockup draws the slot empty or filled differently.
- The person's comparison finds the short cards wrong.
```

# Appendix B: ADR-0141 draft

```markdown
# ADR-0141: The chosen season pill on 05 carries its leading dot

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Closes** | OQ-43 |
| **Builds on** | F-232's pill treatment (`pillTone`, `SelectionDot`); [ADR-0131](0131-the-cvd-preview-is-machado-at-full-severity-on-every-token-and-sample-and-is-never-stored.md) §6 (15's pills as one radio group) |
| **Applies** | Golden rules 13 and 14; ACCESSIBILITY §2 A2 and §4; R9-MOCKUP-FIDELITY §4 E3; WCAG 2.2 SC 1.4.1, 4.1.2 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

- **What `05` draws.** The chosen season pill (*All*) is a fill swap: white, with dark text, where the others are outlined. There is no mark.
- **What the rest of the product draws.** `12`, `15` and `17` mark a chosen pill with a filled dot before its label. F-232 made that the product's one pill treatment, after a person reported *"follow one single pattern everywhere"*.
- **The conformance rule `selection-treatment`** (part of the blocking a11y gate) reports a pill whose chosen state is a fill alone (`pill-selection.test`).
- **WCAG.** Understanding SC 1.4.1 lets an inversion pass (*"if content is distinguished by inverting an element's foreground and background colors, this would pass"*), and counts a 3:1 lightness difference as an additional distinction. So WCAG alone would not force a mark.
- **ACCESSIBILITY §4 is stricter, and binding.** *"The rule is total"*; a highlighted selection is a highlight **and** a mark, and a stated state.

## Decision

**D1: The season row is one radio group** (`ChoiceGroup`, pill form), so it announces its name, the choice and its position.

**D2: The chosen pill is drawn as `05` draws it, plus the dot.**
- Fill: `accent` (05's white primary).
- Ink: `accent.foreground`.
- Mark: a `SelectionDot` in that ink, leading the label.
- Resting pills: outlined in `border`.

**D3: The same treatment holds wherever this screen offers a single choice** (the overflow sheet's facets).

**D4: The departure is recorded as E3** on `05.filters.season.all`. A blocking gate and rule 13 force it, not a taste.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **The fill swap alone, as drawn** | Passes WCAG 1.4.1 by its inversion note, but fails the product's own standard (ACCESSIBILITY §4, a binding A2 commitment) and the blocking `selection-treatment` rule; one more pattern for "chosen" after F-232 removed them |
| **A tick (✓) or a corner badge** | Not drawn on any pill in the set; F-232 removed both from pills |
| **Change the rule to accept a fill alone on 05** | Lowers a blocking gate for one screen, which E3 forbids |

## Evidence, and its limits

- **It rests on:** WCAG 2.2 Understanding 1.4.1 (read 2026-10-21); ACCESSIBILITY §2 and §4; F-232's measurements of 12, 15 and 17; `pill-selection.test`.
- **The cost:** the chosen pill is about 10.5 dp wider than drawn (dot 6.5, gap 4). The row still fits 384 dp in English. In Japanese or at 200 % it wraps (E3).
- **It was not tested with people.**

## Consequences

- `ChoiceGroup`'s pill form takes `selectedFill`, `selectedEdge`, `size` and `gap`; 15 is unchanged.
- `pill-selection.test`'s decoy note no longer names 05.
- R9 §4 E3 gains the row; R9 §11 and PRD §10 close OQ-43.

## Revisit when

- A mockup draws a chosen pill without a mark *and* the product's accessibility standard changes.
- A person reports the dot misread.
```

# Appendix C: ADR-0142 draft

```markdown
# ADR-0142: The Atlas says what 05 says, made true

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Builds on** | [ADR-0138](0138-home-leads-with-the-days-corpus-colour-as-01-binds-it-and-draws-no-reading.md) D4 (日本に着想を得た), [ADR-0139](0139-each-screens-page-inset-is-its-own-mockups-snapped-and-homes-is-xl.md), [ADR-0117](0117-the-tab-bar-is-01s-drawn-by-our-own-component-and-its-words-return.md) and F-234 (OQ-48's interim), [ADR-0056](0056-the-message-catalogue-is-enumerated-typescript-not-a-runtime-i18n-framework.md) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (not design), §4 E1, E3; golden rules 11, 12 and 14; FR-23, FR-25 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`05`'s words include four the product cannot ship as drawn:

- the title *Colour Atlas • 日本の伝統色* ("traditional colour"; R9 §4 E1 names it);
- the count *120 Sourced Colours* (a provenance claim);
- the pills *[Compare] [Finder] [Palettes]* (square brackets inside outlined pills);
- *Color Family* beside the screen's own *Colour*.

No open question covers 05's brackets: OQ-23 asks about 13, 16, 17 and 18. The Japanese locale's form of an "English • 日本語" title is OQ-48's. It is still open, with an interim: each title shows the catalogue's words for the locale (F-234).

## Decision

**D1: The title.**
- en: *Colour Atlas • 日本に着想を得た色*; ja: *色図鑑 • 日本に着想を得た色*.
- The run 日本に着想を得た色 replaces 日本の伝統色: the real classification, in Home's words (ADR-0138).
- It is one heading, leading, and it wraps (E3).
- A test holds every published entry `japanese-inspired`, with a planted `traditional` entry as its decoy.

**D2: The count.**
- *120 Original Colours*; ja 「120のオリジナル色」.
- "Original" is the catalogue's word for both classifications the corpus holds (*Irodora original*).
- The figure is the pinned bundle's entry count.
- A test holds every entry's classification within those two (decoy: a planted `traditional` entry).
- The accessible name adds the corpus version (FR-25).

**D3: The three pills read *Compare*, *Finder* and *Palettes*.**
- The brackets are notation, not copy. The outline already says "button", and a bracket inside it is a second delimiter: the wireframe convention for a label placeholder, as 06's bracketed names already are.
- This decides `05` only. OQ-23 stays open for headings and roles on 13, 16, 17 and 18.

**D4: *Colour Family*.** The en catalogue is en-GB, and `05` spells *Colour* twice. *Color* is §2's misspelling bullet.

**D5: The Japanese runs (OQ-48's interim, applied, not decided).**
- A Japanese run drawn beside English is read from the Japanese catalogue (`japaneseRun`), so it is written once.
- In Japanese, a run that would repeat the word in the same script is not drawn: season pills read 「春」.
- Corpus content (the family chips' romaji and kanji) prints as authored in both locales.

**D6: The page inset** is 05's 17.5 dp, which snaps to `md` (ADR-0139 applied).

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Keep 日本の伝統色 / *Sourced*** | FR-23 and E1: presents an inspired corpus as traditional and sourced |
| ***120 Japanese-Inspired Colours*** | Classification-true, but 28 characters against 19 drawn, repeating the title |
| ***120 Curated Colours*** | True of today's provenance (*editorial curation*), but not a classification word |
| **Keep the brackets as copy** | No platform convention brackets a button label; it doubles the outline's job |
| **Keep *Color*** | Two spellings on one screen in an en-GB catalogue |
| **Decide OQ-48 here** | It blocks F-265 and covers nine mockups; F-246 needs only the interim |

## Evidence, and its limits

- **It rests on:** `05.json`; the catalogue's classification words; all 120 records' `classification`; 06's not-design record; DEFAULT_LANGUAGE_TAG `en-GB`.
- **The limits:** the Japanese copy awaits OQ-5's competent-speaker review; it was not tested with people.

## Consequences

- New and changed keys, in both catalogues; a font-subset re-cut if coverage asks.
- 05's inventory records the brackets and *Color* as not design.
- OQ-23's four features get a note. F-265 inherits D5.

## Revisit when

- OQ-48 or OQ-23 is answered.
- The corpus gains a classification other than the two.
- A reviewer of the Japanese objects.
```

# Appendix D: ADR-0143 draft

```markdown
# ADR-0143: The Atlas's controls do what 05 draws, and its overflow holds the facets 05 does not draw

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Amends** | [ADR-0135](0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md) D4 (where the count line and *Clear* sit) |
| **Builds on** | ADR-0108 (nine chips), ADR-0114 (the hit area), ADR-0128 D3 (00's caption), ADR-0118 (sheet forms) |
| **Applies** | R9-MOCKUP-FIDELITY §4 E1, E4; golden rules 12–14; FR-20, FR-47, FR-56; NFR-8 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

- `05` draws a search field promising *kanji, romaji, family or #hex*, season pills, family chips with a colour dot, an overflow "…" (`05.more`; ADR-0135 left its contents to F-246), three navigations, and cards.
- FR-20 filters by *family, season, temperature, lightness, chroma and era*. `05` draws two of those.
- FR-47: *"a hex query returns its nearest entries; a phrase query maps to a lightness/chroma/hue region deterministically."*
- The lexicon carries lightness and chroma words, and no temperature word.
- A family group has no colour in `content/taxonomy.json`, yet `05` draws a dot per chip.

## Decision

**D1: Search.** One field, read in order:
1. A hex (the Finder's `looksLikeHex`) ranks the whole corpus by ΔE00 through the Finder's own index. The filters and the bookmark toggle then apply, and the first eight are shown, nearest first.
2. Otherwise, a phrase whose every word is a lexicon term filters by its region.
3. Otherwise, a substring of the names, the slug, the hex, the family's words, or its chip's words.

No second nearest-match or phrase implementation exists.

**D2: Season** is a single choice with *All* (ADR-0141).

**D3: Family chips** are filter chips: any number on, OR within the row, AND with everything else. They follow ADR-0108's order, in a row that scrolls off the right edge.

**D4: The dot is the group's medoid**, a real corpus colour shown with its provenance (rule 12):
- the member entry whose summed CIEDE2000 to the others, over each entry's published `derived.lab`, is least, ties broken by slug;
- drawn in that entry's own hex with `reference` provenance;
- decorative to a screen reader (the chip's name is its words).

**D5: The overflow opens *More filters***: 03's floating sheet holding FR-20's remaining facets (Temperature, Lightness, Chroma), each a single choice in D2's form.
- No era facet while no entry holds an era.
- E4: a required capability no mockup draws, composed from 05's own parts.

**D6: *Showing n / N* and *Clear* sit at the trailing end of the *Atlas* heading row, only while anything narrows the list.**
- *Clear* resets the query, season, families, facets and the bookmark toggle.
- This amends where ADR-0135 D4's line sits, not what it does. The row is empty space in 05's drawn state.

**D7: The four drawn navigations** go to `/atlas/compare`, `/atlas/find` (the inventory's `/atlas/finder` corrected), `/atlas/palettes` and `/atlas/[slug]`.

**D8: A card is one control.**
- Its name carries everything it prints: kanji, romaji, English, hex, provenance, the OKLCh line and the season.
- The sample inside takes the same action, so a tap on it is not swallowed by its own pressable, and it is hidden from assistive technology so the card announces once.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Drop temperature, lightness and chroma** | Removes a PRD capability (FR-20); a PRD change, not a layout one |
| **Draw three more chip rows** | Changes 05's drawn structure on its default state |
| **Put the facets under the search as a disclosure** | An undrawn row in the drawn state |
| **The overflow as a menu of actions** (Clear, About the corpus) | Holds no capability the person lacks elsewhere; *Clear* already appears where narrowing shows |
| **Single-choice family chips** | Toggle buttons pretending to be radios; M3 filter chips are multi-select |
| **The dot as the group's first entry, or an authored hex** | Arbitrary, or a content-schema change with no source; the medoid is a stated rule over published values |
| **Hex by exact match only** | FR-47 asks for nearest entries |
| **The sample alone as the card's target** | 05 binds the action to the card |

## Evidence, and its limits

- **It rests on:** FR-20 and FR-47; the lexicon's terms (read); `finder.ts`; Material 3 filter-chip guidance (secondary sources: multi-select, a leading mark when chosen, "don't use in place of buttons"); `Pressable`'s responder behaviour (finding 10, to be confirmed on a device).
- **The limits:**
  - 赤黄緑青紫 are lexicon words, so typing 青 answers the hue region, not the chip.
  - The 紫 dot is greyish, since its group is violet-greys (taxonomy.json's own cost).
  - It was not tested with people.

## Consequences

- `src/atlas.ts`.
- `finder.ts` exports `looksLikeHex`.
- E-210 and E-212.
- `bookmarks.test` adapts with its decoys kept.
- R9 §4 E4 lists the facets sheet and the count line's place.

## Revisit when

- A mockup draws the overflow's contents or a chosen family chip.
- The lexicon gains temperature words.
- The corpus gains an era.
- F-299 re-examines the violet-greys.
```

# Appendix E: ADR-0144 draft

```markdown
# ADR-0144: The sweep reads an element a conflict replaces as declared, against the inventory's own record

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-246 |
| **Amends** | [ADR-0134](0134-fidelity-is-captured-from-the-running-app-beside-its-mockup-and-the-device-run-is-a-persons.md) D7 (the inventory sweep) |
| **Applies** | R9-MOCKUP-FIDELITY §6 C1, §12; golden rule 14 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

The sweep finds every element of an enrolled surface by what it draws. `05`'s four-item tab bar is replaced by `01`'s five (C1), and its inventory says so in `conflicts`.

- Five of its seven tab elements have a counterpart on `01`'s bar: the bar, the indicator, the Atlas and Profile glyphs, and the Atlas label.
- Two do not: *compass* and *search*.
- Worse, `05.tabs.search.icon` would be "found" as the search field's own glyph.

`02 09 11 15 18 21` meet the same.

## Decision

**D1:** An enrolled surface may declare elements **superseded**, each naming the §6 conflict that replaces it.

**D2:** A declaration counts only if the element is listed under that conflict in the surface's own inventory `conflicts`; anything else is a finding. A superseded element is not counted.

**D3:** What replaces it is still asserted, by the surface's other elements: `05.tabs` as `TabBar`, plus the indicator and the counterpart glyphs and label.

**D4:** For 05: `05.tabs.compass.icon` and `05.tabs.search.icon`, by C1.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Map compass and search onto two of 01's tabs** | Invents a correspondence the conflict never made |
| **Render 05's own bar for the sweep** | Draws something the product does not ship |
| **Leave them unlocated** | The sweep fails, or the surface is never enrolled (E-203) |

## Evidence, and its limits

- **It rests on:** `05.json`'s `conflicts`; F-228's rule that a superseded element never sets a shape.
- **The limit:** the person's capture judges the tab bar against 01, not 05.

## Consequences

- `apps/mobile/test/inventory.ts` gains `supersededFindings`.
- E-211.
- The C1 surfaces' features get a note.
```

# Appendix F: State drafts

**F-246 `attested`:**

```json
[
  {
    "criterion": "The only departures from mockup 05 are the ones this feature’s notes name, each from R9-MOCKUP-FIDELITY §4 or §6 — nothing is simplified, reordered, restyled or left out beyond them",
    "verifiedBy": "GATED FOR STRUCTURE, ATTESTED FOR APPEARANCE. pnpm test runs atlas-fidelity.test (order, grouping, and every size, corner, gap, type step, rendered weight and ink the screen passes, recomputed from mockups/inventory/05.json through §2's snap) and the inventory sweep (05.screen, both themes and languages; two C1-superseded tab elements declared). What no tree shows is the person's comparison under the capture criterion: each difference is a named departure (E1 title, count, OKLCh, swatch, card 4, era lines; E3 the chosen-pill dot and the wraps; E4 the bookmark toggle, the facets sheet, the count line; §2 the leaked label, the brackets, Color, the scroll cut; C1), or is fixed and recaptured, or recorded as a feature.",
    "blocks": "release",
    "status": "outstanding"
  },
  {
    "criterion": "The fidelity harness captures the route beside mockup 05 in both themes and both locales, and a person has compared each pair and recorded the result",
    "verifiedBy": "A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator at 384 dp, with a non-debuggable build of F-246's final commit and Maestro and adb on the PATH. record.md lists /atlas captured in Sumi/Washi × en/ja (anchor atlas.family), composed beside 05 (25 for Washi) under .harness/verification/evidence/fidelity/<UTC>/compose/. The person compares element by element against 05's inventory and records per pair 'matches' or each difference in progress.md under F-246. Expected and not defects: the cards are the corpus's first entries, not 05's samples; 96 of 120 cards end without a season line; the chosen pill carries a dot; the title and count say Japanese-inspired and Original.",
    "blocks": "release",
    "status": "outstanding"
  },
  {
    "criterion": "Every string is in both catalogues, every drawn action works, and the a11y, contrast and cvd gates pass on the rebuilt surface",
    "verifiedBy": "GATED except the device half: tsc + i18n.test, the action tests (atlas.test, bookmarks.test), pnpm test:a11y, test:contrast, test:cvd. ATTESTED on the capture's device: a tap anywhere in the 26.5 dp field focuses it and the bookmark toggle takes its tap, with the season pills below still taking theirs; the family row scrolls to Nezumi; a tap on a card's sample opens the colour; TalkBack reads a card as one control with its full name; at 200 % text in en and ja the title, the count/pills row, the season row, a card's kanji/hex row and the heading row wrap and nothing clips; the generated atlas.yaml journey passes. Recorded in progress.md under F-246.",
    "blocks": "release",
    "status": "outstanding"
  }
]
```

**F-246 `notes`, appended:**

> DECIDED (2026-10-21): ADR-0140 (OQ-17, OQ-18), ADR-0141 (OQ-43), ADR-0142, ADR-0143, ADR-0144. Departures as listed in the first attested entry.

**F-246 `openQuestions`:** `[]`.

**Notes on other features:**

- **F-251, F-257, F-260, F-263:** "F-246 read 05's bracketed pill labels as notation (ADR-0142 D3); OQ-23 asks the same of headings and roles here — a different answer should say why."
- **F-343:** "The Atlas card passes its own onPress to its sample, hidden from AT, because a Swatch without onPress still takes the touch (ADR-0143 D8); when this lands the Atlas may drop it."
- **F-265:** "05's Japanese runs follow OQ-48's interim as ADR-0142 D5 applies it."
- **F-250:** "The Atlas search reads hex and phrases through finder.ts (E-210)."
- **F-243, F-250, F-254, F-255, F-262, F-263:** "Declare your C1-superseded tab elements in ENROLLED's `superseded` (ADR-0144, E-211)."
- **F-267:** "05's chosen pill dot (ADR-0141) and the season line's absence on 96 cards are for the person's eye."

**PRD §10 closing paragraphs**, in the shape of OQ-14's: one each for OQ-17 and OQ-18 (ADR-0140) and OQ-43 (ADR-0141), and their table rows removed.

**R9 §11 Closed rows:**
- OQ-17 / OQ-18: *"Every card prints its OKLCh line; the last line is the season the entry was authored with, absent where none is; no era is printed"*, ADR-0140.
- OQ-43: *"The chosen pill carries its leading dot, as 12, 15 and 17 draw a choice"*, ADR-0141.

**Files a reader will want:**
- `E:\JCFIP\apps\mobile\src\screens\Atlas.tsx`
- `E:\JCFIP\mockups\inventory\05.json`
- `E:\JCFIP\mockups\tools\inventory-data\05.mjs`
- `E:\JCFIP\apps\mobile\test\screens.test.tsx`
- `E:\JCFIP\apps\mobile\test\inventory.ts`
- `E:\JCFIP\apps\mobile\test\bookmarks.test.tsx`
- `E:\JCFIP\apps\mobile\src\finder.ts`
- `E:\JCFIP\packages\ui\src\{SearchField,AppBar,Chip,ChoiceGroup,Button,layout}.tsx`
- `E:\JCFIP\content\taxonomy.json`
- `E:\JCFIP\.harness\verification\inventory-surfaces.json`
- `E:\JCFIP\apps\mobile\e2e\capture\routes.json`
- `E:\JCFIP\apps\mobile\e2e\journeys\atlas.journey.json`

---

## Review (once, 2026-10-21): FAIL as delivered — every finding fixed or recorded

| id | finding | outcome |
|---|---|---|
| B1 | A card's vertical rhythm departed from 05, and a negative interval was rounded up without a word | **Fixed.** `Card mediaGap` sets the kanji `xs` under the sample. The fidelity test refuses to snap a negative interval, names 05's card lines as tighter than the type's line boxes, and computes the cost: 18.7 dp taller than drawn (ADR-0140's amendment; R9 §2; criterion 4's expected list) |
| S1 | The medoid rule was never tested; the dot cache ignored its list | **Fixed.** Every member's summed ΔE00 is computed and the least is asserted, with decoys (not first-by-slug; a planted foreign colour); the cache is keyed on the list |
| S2 | The sample's own action and its hiding were asserted by checks that could not fail | **Fixed.** The sample's `onPress` is called directly, the wrapper's two props are asserted, and its own name is absent unless hidden elements are counted; a decoy shows a fired press bubbles regardless |
| S3 | A supersession could hide an element its conflict keeps | **Fixed.** Only `REPLACING_CONFLICTS` (C1) may be named, in the type and the check (decoy: C11); the stray-locator finding is reworded |
| S4 | Drawn-height pills, chips and badges clip at 200 % text | **Recorded as F-344**: a component defect across 01, 05 and 15; the attestation names it |
| S5 | Android tap targets are cut by rows smaller than the target | **Recorded on F-305**, with 05's chip row, season row, nav row and *Clear*; the device attestation asks for an edge tap |
| M1 | `find()` kept its own copy of the hex branch | **Fixed.** `find()` goes through `hexNearest` (ADR-0143, E-210) |
| M2 | `MORE_GLYPH` came from a reading the inventory contradicts | **Fixed.** 19 dp from 05.json's 12 dp; the test recomputes it exactly |
| M3 | `families()` had no caller; the F-181 comment headed the wrong keys | **Fixed.** Removed; reworded |
| M4 | Copy-pasted inventory comments; the heading's re-measure unrecorded | **Fixed.** Comments corrected; ADR-0142 D1 records the heading |
| M5 | Season and tab-label bindings named keys that do not exist | **Fixed.** Rebound in 05.mjs; the sweep derives them and the explicit locators went |
| M6 | Weak assertions in atlas.test and family-locale.test | **Fixed.** A planted entry for *Original*; every ao member found by 青, Ao, ao; the whole capitalised romaji; `#5B`; the test title |
| M7 | The drawn field tested only at iOS's 44 | **Fixed.** iOS and Android both |
| M8 | `bleed` was a runtime throw, not a type | **Fixed.** `ScreenScroll` types it beside `scroll={false}`; `@ts-expect-error` holds it |
| M9 | A card's Japanese name embeds English | **Recorded as F-345** (`swatchAccessibleName` is English-only product-wide) |
| M10 | The header claimed every dot is frozen | **Fixed.** Which entry is the dot is a runtime choice among frozen values, and it says so |
| M11 | Criterion 5 named the wrong action tests | **Fixed.** atlas-states.test and bookmarks.test |
