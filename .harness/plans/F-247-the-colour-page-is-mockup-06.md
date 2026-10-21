# Plan: F-247 — The colour page is mockup 06, and its Japanese is mockup 26

| | |
|---|---|
| **Feature** | F-247 ([`feature_list.json`](../state/feature_list.json)) |
| **Requirements** | FR-24, FR-23, FR-61. Also applied: FR-21, FR-25, FR-56, FR-71, NFR-8, NFR-21; ADR-0065, ADR-0060 (F-084), ADR-0135 (F-237) |
| **Service / package** | `apps/mobile` · `@irodora/ui` (four additive changes, no new component) · `@irodora/design-tokens` (two measured type steps, one opacity, one minted tint) |
| **Author** | The planner subagent, read-only. Nothing was built or run. The implementing session records its edits under *Implementing session's decisions* |
| **Date** | 2026-10-21 |
| **Decisions** | ADR-0145 (closes OQ-19), ADR-0146 (06's words, and 26's Japanese, made true), ADR-0147 (what leaves the page, and where each drawn action goes), ADR-0148 (Wearable Combinations), ADR-0149 (06's two drawn inks) |

---

## Intent

A person who opens a colour from the Atlas sees mockup 06, top to bottom:

- **The app bar:** *← Atlas*, then bookmark, share-card and export at the trailing end, then a rule.
- **The sample**, wide, with its 6.9 dp keyline and its offset second layer.
- **The names:** the kanji at display size; the kana over *Romaji • English* beside it.
- **The *Family • Era • Season* pill.**
- **The readout card:** Hex, OKLCh, CIELAB, and sRGB with Display-P3 on the same row.
- **The provenance card:** its prose, the review line with its seal, and the plum-branch line art.
- ***Wearable Combinations*:** three numbered round thumbnails of the person's own garments, each with its name and hex.
- **The pinned action bar:** *Wear It (Build Outfit) →* and the outlined *Hold as Target in Lens*.

In Japanese the screen is the same layout. It takes 26's three headings and 26's Japanese typography (P2).

Every value comes from the corpus, the engine or the store. Every drawn action works, and nothing on the page states something the record does not hold.

"Done", for a person:

- The page looks like 06 on a 384 dp phone in English, and like 06 in 26's words in Japanese.
- It says only true things.
- Everything FR-23 and FR-24 require of this surface is still on it, now in the slots 06 draws.

---

## Findings from planning

All of these come from reading. Nothing was run.

1. **The current screen is not 06.**
   - `apps/mobile/src/screens/ColourDetail.tsx` draws, in order: a full-width square sample; four name lines; the classification; an `Accordion` (description, coordinates, taxonomy); a 15-row provenance card; a `Tabs` set (palettes, colour vision, relations); then four stacked secondary buttons (*See its card*, *Compare against this*, *What goes with this*, *Compare with*).
   - It is still on the platform header (`app/(tabs)/atlas/[slug].tsx` → `Stack.Screen options.headerRight = <ColourBookmark/>`).
   - `PLATFORM_HEADER` in `apps/mobile/test/chrome.test.ts` lists `'atlas/[slug]': 'F-247 (06)'`.
2. **OQ-19 blocks this feature.** R9 §11 lists it against F-247.
   - 06's upper panel is 474 px wide: `06.screen`, 0.8101 dp/px.
   - The provenance card, the combinations card and the action bar are drawn 667 px wide, into the callout column. `06.json` records them as `overhangs` waiting on OQ-19.
   - `scripts/mockup-inventory.mjs` refuses an overhang whose question is closed. So the inventory must follow the answer in the same commit that closes it.
3. **06 binds three things the corpus does not hold.**
   - `06.provenance.body` binds `corpus:entry.provenance.note`, and `06.provenance.review` binds `corpus:entry.review`. Neither field exists.
   - The record has `provenance.{source, sourceType, sourceLicence, verifiedBy, verifiedAt, reviewIndependence, …}`.
   - All 120 entries are `japanese-inspired`. Every one has `taxonomy.era: null` with a recorded reason, and 96 have `season: null`.
4. **Display-P3 is not in the bundle.**
   - `packages/corpus/src/derive.ts#DerivedColor` carries `lab, lch, oklch, rgb, hex, inSrgbGamut, renderDeltaE00, lightnessOutOfRange`, and nothing for P3.
   - R9 §8 says *"P3 is a real conversion … exists"*. The conversion exists (`@irodora/color-spaces#xyzToDisplayP3`, golden-tested in `packages/color-spaces/test/golden/rgb-xyz.test.ts`). The screen value does not.
   - `eslint.config.mjs` forbids `xyzToDisplayP3` in `src/screens/**` and `src/corpus/**`. `apps/mobile/src/engine.ts` is "the app's single import site for the colour engine".
   - **One entry of 120 is outside sRGB**: `"inSrgbGamut":false` on the `#005884` entry in `content/versions/2026.09.3.json`. Its hex is an approximation (rule 11).
5. **06's action targets are partly wrong in the inventory.**
   - `06.actions.wear` → `navigate:/atlas/with/[slug]`. That is the route string 07 prints under its title, which §2 says is not design. R9 §7 maps 07 (*Wear It / Combinations*) to `/atlas/wear/[slug]`.
   - `06.actions.hold` → `navigate:/lens/against`. No such route exists; the Lens shows 04 when a target is armed (F-200).
   - `06.combinations.item-n.photo` → `navigate:/wardrobe/[id]`. No such route exists; Home opens a garment at `/wardrobe/with/[id]`.
   - `06.share` → `share:colourCard`. 26 binds the same share to `navigate:/atlas/card/[slug]`, the only way into the card route today.
   - `06.export` → `/profile/export`. That route exports the *latest saved palette* (`app/(tabs)/profile/export.tsx`), so a colour's export glyph would export something else.
6. **The type census owes two rows to F-247** (`.harness/verification/type-census.json`): `06.kanji` (53 dp) and `26.hero.kanji` (40.4 dp).
   - `type-scale.test.ts` binds each measured step's `type.size` to its name, sets it at its elements' median em, and requires weight 400 and tracking `'0'`. Its first test pins the measured set to `['wordmark','wordmarkSplash']`, and that pin must move.
   - `verify-token-reach.mjs` allows a measured step to be read only by `MEASURED_STEP_READERS` (`['packages/ui/src/brand.tsx']`).
   - 26's kanji is recorded `title 600`. That is the step's default, not a reading. NotoSansJP ships one 400 cut.
7. **The C10 census has an exception owed by F-247.** The manifest declares `06.provenance.review` (the green seal, `#4B9D61`) with `mintedBy: "F-247"`.
8. **06's card art is drawn twice as strong as the backdrop opacity.** The manifest's `opacity` note says *"06's card art (0.31) … recorded as read; the surfaces that draw them settle that"*. `Illustration` offers `figure` (1) or `backdrop` (0.15) only.
9. **Moving the bookmark would undo F-237's Android target.**
   - `ColourBookmark` sits in a `platformTapTarget()` box because a header slot clips touches on Android (F-237 S3; `bookmarks.test` asserts the box on iOS and Android).
   - `AppBar`'s trailing row is as tall as its icons, so its slop is clipped there too.
   - 06 draws the three icons at a ~33 dp pitch, so a full 44/48 dp target each cannot exist without overlap. F-305 holds this case.
10. **`Chip`'s badge cannot wrap.** It has a fixed `height` and `numberOfLines={1}` (`packages/ui/src/Chip.tsx` lines 222 and 253). 06's pill text (~300 dp) exceeds a 320 dp phone's room, and E3 says it wraps and is never clipped.
11. **A ja readout grid would break the sweep.**
    - `ReadoutTable` has `form="grid"` for 26 (F-235). R9 C3 leaves *"which form 06's Japanese screen uses"* to F-247.
    - `inventory-surfaces.json` records `26.screen` as notWhole: *"its layout is 06's, built and enrolled by F-247"*. The sweep therefore asserts **06's** elements in Japanese.
    - In Japanese, a grid would leave `06.readout.table.srgb.separator` undrawn.
12. **Old tests assume the old screen.**
    - `screens.test` *"colour detail shows what the record carries (F-018 criterion 4)"* asserts XYZ, CIELCh, `sourceId`, `derivation`, `authoredBy`, relations, palettes and the CVD block.
    - `family-locale.test.tsx` asserts `familyLabel(…, 'ja')` on the page.
    - `chrome.test` asserts `ColourDetail` is the one importer of `Tabs`.
    - `atlas.journey.json` asserts `prov.source` and `detail.coordinates`, and `routes.json` anchors on `detail.provenance`.
13. **Screen rules the new screen must meet.**
    - `Screen` pads its own scroller on every side. The Atlas bled through `scroll={false} bleed` with its own `FlatList` (F-246).
    - 06 needs two horizontal insets: the hero/names at 16 dp, and the cards at ~1 dp (drawn).
    - The E-076 lint refuses numeric `width/height/size` over 264 in a screen. The 299 dp hero height must be a named constant, as F-246's `ATLAS_SAMPLE` was.
14. **Effect links already name F-247.**
    - E-024 notes that the palettes section now lists kasane rows and leaves its fate to F-247.
    - F-326 notes *"06's vision block is F-247's"*.
15. **No Swatch is round** (`SwatchCornerStep = 'sm' | 'md'`; C7, ADR-0103). 06's thumbnails are round photographs (`app:GarmentPhoto`), and no such component exists.
    - Garments may hold a photo (`garment_image`). `src/wardrobe/gallery.ts#galleryImages` gives a cached `data:` URI or `null`.

---

## Decisions

All five rest on R9 §11's widened delegation of 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–14 are not reopened. Full drafts are in Appendices A–E.

### D-1: OQ-19. The screen is 06's upper panel, and what is drawn wider is fitted to it (ADR-0145)

- **The screen** is `06.screen` (x 53–527 px, 0.8101 dp/px). It is the frame that holds the app bar and the top of the scroll. The three lower regions were drawn into the callout margin.
- **Every element keeps its drawn scale:** type, heights, vertical intervals and insets. Each lower region takes the screen's width.
- **The cards are fitted like the readout card**, edge to edge. The drawn 0.8 dp edge interval is under half of `xs`, so it takes the floor, `xs`, and that is named (§2).
- **The provenance art keeps its drawn size** (187 dp) and its corner (top `xs`, trailing `sm`).
  - It becomes the card's backdrop behind the text, clipped by the card.
  - It now overlaps the right of the body text. That is the named cost.
- **The action bar's two buttons share the fitted width** (`ActionBar`'s row). Their heights, corners and the gap are kept.
- **The combinations keep their drawn size and pitch from the leading edge** (C19: the card spans the row).
- **The inventory follows the answer.**
  - `overhangs` is removed.
  - The three regions and their children are recorded at their fitted boxes, with the drawn boxes kept in comments.
  - The table of intervals tighter than the scale, and what each adds, goes in the ADR.

### D-2: 06's words, and 26's Japanese, made true (ADR-0146)

- **The back control.**
  - en: *Atlas*, the Atlas tab's word (`tab.atlas`), named *Back to Atlas*.
  - ja: 色図鑑. 26's 伝統色一覧 is classification-false (E1, FR-23).
- **The headings.**

  | | en | ja |
  |---|---|---|
  | readout | *Scientific Colour Space Readout Table* (en-GB; *Color* is §2's misspelling bullet) | 測色値と表色系 |
  | combinations | *Wearable Combinations* | 着こなしの配色調和 |
  | provenance | ***Provenance & Review*** | コーパス典拠と査読 |

  - 06's *"Cultural Heritage"* presents a 2026 coinage as heritage (E1, FR-23).
  - 26's heading for the same section names the corpus source and the review, so the English says the same.
- **The pill: *Family: ‹group romaji› (‹group en›) • Era: ‹era | None› • Season: ‹seasons | Not assigned›*.**
  - ja: 系統: ‹group kanji› • 時代: ‹era | なし› • 季節: ‹seasons | 指定なし›.
  - The family is the entry's F-224 group, exactly as 06 draws *Ao (Blue)*.
  - *None* is the true era of a 2026 construction (each entry's own unknown; ADR-0065).
  - *Not assigned* is the true season where none was authored. *None* would read as "suits no season".
  - Why this differs from ADR-0140 (the Atlas omits the line): 06's segments are **labelled**.
    - A labelled segment with nothing after it is a silent blank (FR-21).
    - Dropping the Era segment would hide FR-24's era from the one surface FR-24 names.
- **The provenance card.**
  - **Bold lead = the classification** (`CLASSIFICATION_KEYS`), replacing *"Historical Provenance:"*. FR-23 is displayed. ADR-0065's point, the classification beside the claim, is kept.
  - **Body = source · source type · licence**, from FR-24.
  - **Review line = *Editorial Review: ‹independence›, ‹verifiedAt›*** with the seal where a check is recorded.
    - F-084's *Checked by its own author* still reaches a reader.
    - ja lead: 査読ステータス (26's).
  - Nothing prints *Verified*, 承認済み, *1842*, *Edo* or *v1.2*.
- **The readout.**
  - Hex: `derived.hex`.
  - OKLCh: `derived.oklch`, at 3, 3 and 1 decimals, joined by ` • `.
  - CIELAB: `L* a* b*` from `derived.lab`, 1 decimal each.
  - sRGB: the bytes of `derived.hex`.
  - Display-P3: **the engine's conversion of the record's canonical XYZ** (`entry.color.xyz`, not the gamut-mapped sRGB), at 3 decimals. It goes through a new thin `engine.ts#displayP3Of`.
  - For an entry outside sRGB (one of 120), the hex row adds *nearest sRGB rendering, ΔE00 n.nn* from `derived.renderDeltaE00` (E2, rule 11, ADR-0031).
- **Japanese (C3, P2).**
  - 06's layout throughout.
  - 26's three headings.
  - 26's Japanese typography where 26 draws the same element: the hero kanji at 26's measured step (D-2 below); the provenance lines at 26's step if Increment 1 measures them off `label`. Intervals stay 06's.
  - **The readout stays 06's table in Japanese.**
    - One layout (§6: *"a screen never has two layouts"*; `inventory-surfaces.json`: *"its layout is 06's"*).
    - Its labels are the catalogue's notation words, the same table style (`colour.hex` = 16進, `coord.oklch`, `coord.lab`, `coord.rgb`, new `coord.displayP3`).
    - 26's grid and its cell labels (OKLCh表色系 …) go with the grid, which is 26's layout.
  - **Not adopted (26-only, C3):**
    - the title 伝統色の詳細 (06 draws none, and OQ-48 is untouched);
    - the hero card with text on the photo;
    - the description;
    - the next-card peek;
    - the kasane card and bar;
    - the hanko seal;
    - 26's two actions;
    - the grid.
- **The offset second layer (`06.swatch.stack`)** is drawn in **the entry's own colour**: a second `Swatch` at the drawn 14 × 298 dp, hidden from assistive technology.
  - If Increment 1 measures 06's layer as a lighter tint, that tint is no colour the corpus holds. It would sit beside the colour being judged (rule 12; ADR-0116's surround). The departure is then recorded as E1.
- **The measured kanji steps.**
  - `kanjiHero` (bound to `06.kanji`) and `kanjiHeroJa` (bound to `26.hero.kanji`), per ADR-0121.
  - Each em is re-measured from NotoSansJP's outlines (`serif-weight.mjs --em`, gothic).
  - Each is set at weight 400, the face's one cut. 26's drawn stems are measured, and if heavier they are named, not faked (ADR-0112's rule).

### D-3: What leaves the page, and where each drawn action goes (ADR-0147)

- **The page draws 06.** The old page's material that no requirement binds to this surface leaves it:
  - description, contemporary note and fashion use;
  - XYZ and CIELCh;
  - the in-gamut line (kept only as the E2 note above);
  - the temperature, lightness and chroma bands;
  - register id, rights holder, publisher, year, URL, derivation, author id, reviewer id and editorial notes;
  - the palettes containing it;
  - relations;
  - the colour-vision block;
  - *Compare with*.
- **Where each still lives:**
  - CVD: F-240's app-wide preview, on this screen too.
  - The nearest entries: 21.
  - Palettes: 10.
  - The bands: the Atlas's *More filters* sheet (ADR-0143).
  - Compare: the Atlas's *Compare* pill.
  - The full record: the corpus and the export.
- **Kept, in drawn slots:**
  - FR-23: the provenance lead.
  - FR-24: body, pill and review line.
  - FR-61: the readout, every value with its space named.
  - F-084: the review line.
  - FR-56 / ADR-0135: the bookmark.
- **The drawn actions:**

  | control | goes to |
  |---|---|
  | back | `router.back()`, or `/atlas` when there is no history |
  | bookmark | the toggle (`selected`) |
  | share | `/atlas/card/[slug]`. 26 binds it; the share action itself is F-253's |
  | export | `/profile/export?slug=…`, with a new `colourSubject(entry)` in `src/export/subject.ts` |
  | *Wear It* | `/atlas/wear/[slug]` (07) |
  | *Hold as Target* | arm (the existing `TargetColour`), then `/lens` (04's state) |
  | a combination | `/wardrobe/with/[id]` |

  Each inventory action is corrected to match.
- **A colour this corpus does not hold** keeps the app bar's back and 00's caption (E4, ADR-0128 §6).

### D-4: Wearable Combinations are the person's own garments the engine ranks best with this colour as a top (ADR-0148)

- **How they are ranked.**
  - The colour is placed in `DEFAULT_SLOT` (`top`, Wear's convention).
  - Every owned garment whose type fills another slot is scored with it by `scoreOutfit`, through **one** ranking function. `outfit/builder.ts#rankForSlot` is extracted from `regenerate`, with no behaviour change.
  - Order: highest overall first, ties by garment id. The first three are numbered 1–3.
- **The profile** is the stored one. Otherwise it is wear.ts's `NO_EVIDENCE_PROFILE`, and then **only the order is shown**: no score, no factor, no "match" (E-101).
- **Each item.**
  - Its photograph, cropped to 06's circle, where one is stored.
  - Otherwise the garment's colour as a `Swatch`, a rounded square, because no sample is round (ADR-0103, C7). This is E4: 06 draws no garment without a photo.
  - The caption is the name (or type) over the hex.
  - A tap opens the garment.
- **Empty states.**
  - No garments: 27's wardrobe card in the card's place (Home's: `wardrobe.empty.*`, *Scan* → `/lens`).
  - Garments but none rankable: 27's card with *Add a garment* → `/wardrobe/add` (ADR-0128 D3).
- The context is assembled once, in `src/wardrobe/coverage.ts#rankingContext` (E-208's module).

### D-5: 06's two drawn inks (ADR-0149)

- **`opacity.artCard` = 0.31**: F-229's `inkP90` reading of `06.provenance.art`, read through a new `Illustration tone="card"`. 15's 0.33 stays F-262's.
- **`glyph.seal` = `#4B9D61`**, the same in every palette.
  - `usage: nonText`, pairs with nothing; the words carry the status (ADR-0110 §3).
  - The manifest's `06.provenance.review` element exception is retired, and a token group carries the element (E-159's pattern).

---

## Implementing session's decisions on this design

Adopted as written. Anything the implementation changes from it is recorded here, as F-246's plan
recorded its own, with the reason.

---

## Approach

### Reused (paths)

- **`@irodora/ui`:**
  - `Screen` (`scroll={false}`, `bleed`, `appBar`, `actionBar`); `AppBar` (`back`, `trailing.icons`, `rule`, `height`, `inset`, `gap`); `ActionBar` (`fill="surface.1"`, `rule`, `padding`, `gap`);
  - `ReadoutTable form="table"` (`TableRow.also` for Display-P3), `valueText`, `valueSpoken`, `READOUT_*`;
  - `Swatch` (`width="fill"`, `height`, `keylineWidth`, `corner`), `swatchAccessibleName`; `Card` (`level`, `padding`, `radius`, `testID`);
  - `Chip form="badge"` (`fill`, `height`, `numeric`, `size`); `Button` (primary; secondary `edge="border"`; `glyph`, `glyphSize`, `height`, `radius`, `step`);
  - `IconButton` (`selected`); `Glyph`; `Illustration name="plum-branch"`; `EmptyState` (both forms); `Text`, `Row`, `Stack`; `APP_BAR_RULE_TEST_ID`, `platformTapTarget`, `hitArea`.
- **`apps/mobile/src`:**
  - `corpus` (`entryBySlug`, `colorFor`, `groupOf`/`familyGroups`);
  - `notation.ts#capitalised`, `#oklchLine`; `atlas.ts#seasonLine`; `i18n` (`useMessages`, `t`);
  - `bookmarks.tsx#useBookmarks` (the route); `target.tsx#useTarget` (the route);
  - `wear.ts#NO_EVIDENCE_PROFILE`, `DEFAULT_SLOT`; `outfit/builder.ts` (`slotFor`, `regenerate`'s inner ranking, to be extracted);
  - `wardrobe/coverage.ts` (`placeableGarments`, the context parts); `wardrobe/gallery.ts#galleryImages`; `wardrobe.ts#colorOf`; `profile/store#activeProfile`, `toWorking`;
  - `export/subject.ts` (the subject shape); `engine.ts` (the single engine import site);
  - `screens/ColourDetail.tsx#CLASSIFICATION_KEYS` (kept; `ColourCard` imports it); `states.ts`.
- **Packages:** `@irodora/color-spaces#xyzToDisplayP3` (through `engine.ts`); `@irodora/recommendation` (`scoreOutfit`, `outfitWeights`); `@irodora/optimization` (none new).
- **Tests and tools:**
  - `apps/mobile/test/inventory.ts` (`elementFindings`, locators); `screens.test.tsx` (`draw`, `drawLive`, `ENROLLED`, decoys); `atlas-fidelity.test.tsx` (helpers copied in shape: `snap`, `belowTheScale`, `snapSiblings`, `mode`, `inset`, `inOrder`, `sharedRow`);
  - `mockups/tools/measure.ps1`, `corner.ps1`, `tint.ps1`, `stem.ps1`, `serif-weight.mjs`, `generate-inventory.mjs`;
  - `scripts/generate-e2e-flows.mjs`, `generate-font-subset.mjs`, `verify-font-coverage.mjs`, `generate-design-tokens.mjs`, `pnpm fidelity:capture`.

### New

- **`apps/mobile/src/detail.ts`** (pure; every input an argument):
  - **The readout.**
    - `readoutRows(entry, t, script): TableRow[]` gives Hex, OKLCh, CIELAB, and sRGB with `also: Display-P3`.
    - Each value is a `Figure` set (space named; FR-61).
    - The hex row carries the E2 note when `!derived.inSrgbGamut`.
  - **The pill:** `taxonomyLine(entry, t, script)`.
  - **The names:** `nameLine(entry)` = `capitalised(romaji) • en`.
  - **The provenance card:** `provenanceLead(entry, t)`, `provenanceBody(entry, t)`, `reviewLine(entry, t)`, and `reviewRecorded(entry)` (the seal shows only if true).
  - **The combinations:** `wearableCombinations(entry, wardrobe, context, limit = 3): WearableCombination[]` (`{ rank, garment, hex, color, name }`), and `combinationName(c, t)`.
  - **Drawn sizes**, each recomputed by the fidelity test from `06.json`:
    - `DETAIL_APP_BAR = 57.5`, `HERO_HEIGHT = 299`, `STACK = { width: 14, height: 298 }`, `HERO_KEYLINE` (from `raw.keylinePx × dpPerPx`, rounded as F-242's `HERO_KEYLINE`);
    - `PILL = 22`, `PHOTO = 67`, `RANK = 22.5`, `WEAR = 35.5`, `HOLD = 34`, `HOLD_GLYPH = 17`, `ART_WIDTH = 187`;
    - `BACK_GLYPH`, `BOOKMARK_GLYPH`, `SHARE_GLYPH`, `EXPORT_GLYPH`: each drawn height × 24 ÷ the glyph's ink height in grid units, as F-246's `MORE_GLYPH`.
- **`apps/mobile/src/engine.ts#displayP3Of(xyz)`.** A pass-through to `xyzToDisplayP3`, documented as a derived answer the bundle does not carry, beside the CVD simulation.
- **`apps/mobile/src/outfit/builder.ts#rankForSlot(slot, locked: OutfitPiece[], wardrobe, context)`.** `regenerate` calls it, so there is one ranking and the builder tests are unchanged.
- **`apps/mobile/src/wardrobe/coverage.ts#rankingContext(stored)`.** The same profile, rules, weights and reference as `coverageContext`, with `NO_EVIDENCE_PROFILE` where none is stored.
- **`apps/mobile/src/export/subject.ts#colourSubject(entry)`.** One colour, with read-not-computed values and the same envelope as `paletteSubject`.
- **`@irodora/ui`.** Each change is additive; with the new prop absent the old tree renders, and a decoy test proves it.

| component | change | forced by |
|---|---|---|
| `AppBar.tsx` | (a) `AppBarIcon.selected?: boolean`, typed for `FillableGlyph` only, forwarded to `IconButton selected`; (b) `trailing.targetRoom?: true`: the trailing group stretches to `platformTapTarget()` tall, and its row carries `paddingHorizontal = slop`, offset by an equal negative margin. Drawn positions are unchanged, and each icon's hit area lies inside a parent on Android | F-237's note (`selected`); keeping F-237 S3's Android target (finding 9) |
| `Chip.tsx` (badge) | `wrap?: true`: `minHeight` = the drawn height in place of `height`, no `numberOfLines`, and the label shrinks and wraps | E3 (finding 10): 06's pill on a 320 dp phone |
| `Illustration.tsx` | `tone: 'card'`, allowed with `color: 'foreground'`, inked at `nativeArtCardOpacity` | D-5 |
| `ReadoutTable.tsx` | when the caller passes `testID`, each part carries `${id}.${key}.label`, `.value`, `.also.label`, `.also.value`, `.bar`, and `.divider` (the label cell that draws the column rule); `readoutRowName` is exported | the sweep must find the bar, the divider and the nested P3 run as themselves (finding 11; `drawsSomething` counts a bordered node) |

- **`@irodora/design-tokens` and the manifest:**
  - `typography.scale.kanjiHero` and `.kanjiHeroJa`: size is the median of the bound em; lineHeight is max(the nearest board step's ratio, the jp face's `ownLine` 1.45) = 1.45; weight 400; tracking `'0'`; `elements` bound.
  - `opacity.artCard: 0.31`.
  - Token `glyph.seal` (`#4B9D61`) in every palette.
  - Exceptions: the element row retired, and the token group added.
  - The inventory schema's `type.size` enum gains the two names.
- **Catalogue (en / ja):**

| key | en | ja | note |
|---|---|---|---|
| `detail.backToAtlas` | Back to Atlas | 色図鑑に戻る | the back control's name; its drawn word is `tab.atlas` |
| `detail.shareCard` | Share this colour's card | この色のカードを共有 | `06.share` |
| `detail.export` | Export this colour | この色を書き出す | `06.export` |
| `detail.era` | Era | 時代 | pill (`filter.family`, `filter.season` reused) |
| `detail.eraNone` | None | なし | pill |
| `detail.seasonNone` | Not assigned | 指定なし | pill |
| `detail.readout` | Scientific Colour Space Readout Table | 測色値と表色系 | |
| `coord.displayP3` | Display-P3 | Display P3 | notation; i18n's notation exemption |
| `detail.nearestSrgb` | nearest sRGB rendering | もっとも近いsRGB表示 | the E2 note, with `colour.differenceUnit` |
| `detail.provenance` | Provenance & Review | コーパス典拠と査読 | **value changes** |
| `detail.review` | Editorial Review | 査読ステータス | |
| `detail.combinations` | Wearable Combinations | 着こなしの配色調和 | |
| `detail.combinationsNone.title` / `.body` / `.add` | (27's card: nothing to pair yet; add a trouser or shoe) | (同) | the second empty state |
| `detail.wearIt` | Wear It (Build Outfit) | 着てみる（コーディネートを組む） | |
| `detail.holdAsTarget` | Hold as Target in Lens | レンズで比べる基準にする | |

- **Removed when the i18n unused-scan reports them:**
  - `detail.{coordinates, description, contemporary, fashionUse, taxonomy, relations, palettes, colourVision, editorialNotes, notRecorded, openCard, compareWith}`;
  - `coord.{xyz, lch, inGamut, outOfGamut, renderDifference}`;
  - `prov.*`, `rel.*`, `role.*`;
  - any `cvd.*`, `target.arm` or `combos.open` left unused.
  - Compare's `cvd.protan` and its siblings stay.
- **The composition, as a sketch:**

```tsx
<Screen scroll={false} bleed script={script}
  appBar={{ back: { glyph: 'back', label: t('tab.atlas'), name: t('detail.backToAtlas'), onPress: onBack },
            trailing: { targetRoom: true, icons: [
              { glyph: 'bookmark', label: t('detail.bookmark'), selected: bookmarked, size: BOOKMARK_GLYPH, onPress: () => onBookmark(!bookmarked) },
              { glyph: 'share', label: t('detail.shareCard'), size: SHARE_GLYPH, onPress: () => onShareCard(slug) },
              { glyph: 'export', label: t('detail.export'), size: EXPORT_GLYPH, onPress: () => onExport(slug) } ] },
            rule: true, height: DETAIL_APP_BAR, inset: nativeSpacing.md, gap: nativeSpacing.md, script }}
  actionBar={{ fill: 'surface.1', rule: true, gap: nativeSpacing.sm,
               padding: { top: nativeSpacing.md, bottom: nativeSpacing.sm, side: nativeSpacing.sm },
               actions: [ { label: t('detail.wearIt'), glyph: 'arrow-right', height: WEAR, radius: /*Inc 1*/, onPress },
                          { variant: 'secondary', edge: 'border', label: t('detail.holdAsTarget'), glyph: 'reticle',
                            glyphSize: HOLD_GLYPH, height: HOLD, radius: /*Inc 1*/, onPress } ] }}>
  <ScrollView contentContainerStyle={{ paddingTop: sm, paddingBottom: md }}>
    <Stack gap=/* per the intervals table, block by block */>
      <View style={{ paddingHorizontal: md }}>
        <Row>  {/* 06.swatch | 06.swatch.stack, abutting */}
          <View style={{ flex: 1 }}><Swatch width="fill" height={HERO_HEIGHT} keylineWidth={HERO_KEYLINE} corner="sm"
                 name={en} hex color /></View>
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID="detail.stack">
            <Swatch width={STACK.width} height={STACK.height} … same name, hex, color /></View>
        </Row>
        <View style={{ paddingLeft: sm }}>  {/* names block, indented sm (kanji 9 / pill 7.5) */}
          <Row align="center" gap="sm" wrap>
            <Text size={script === 'japanese' ? 'kanjiHeroJa' : 'kanjiHero'} face="gothic" weight={400} script="japanese" heading>{kanji}</Text>
            <Stack gap="xs">  {/* kana → name: drawn −4.5 dp after insets: floor xs, named */}
              <Text size="body" color="foreground.2" script="japanese">{kana}</Text>
              <Text size="body" color="foreground.2">{nameLine(entry)}</Text>
            </Stack>
          </Row>
          {/* kanji → pill: drawn −7.08 dp after the kanji's inset: floor xs, named */}
          <Chip form="badge" wrap fill="surface.2" height={PILL} size={/*Inc 1*/} label={taxonomyLine(…)} script={script} />
        </View>
      </View>
      <View style={{ paddingHorizontal: xs }}>  {/* cards: drawn 0.8 dp from the edge → xs, named */}
        <Card level="1" padding="md" radius={/*Inc 1*/} testID="detail.readout">
          <Stack gap="sm"><Text size="title" weight={600} heading>{t('detail.readout')}</Text>
            <ReadoutTable form="table" rows={readoutRows(…)} script={script} testID="detail.readout.table" /></Stack></Card>
        {/* md */}
        <Card level="1" padding="md" radius={…} testID="detail.provenance">
          <View pointerEvents="none" style={{ position: 'absolute', top: xs, right: sm }}>
            <Illustration name="plum-branch" color="foreground" tone="card" width={ART_WIDTH} /></View>
          <Stack gap="xs"> title · <Text size="label" color="foreground.2"><Text weight={600} color="foreground">{lead}</Text> {body}</Text>
            · <Row wrap gap="xs"><Text …>{reviewLine}</Text>{reviewRecorded && <Glyph name="seal-check" color={colors['glyph.seal']} size={…} />}</Row></Stack></Card>
        {/* sm */}
        {combos.length > 0 ? <Card level="1" padding="md" radius={…} testID="detail.combinations">
            <Stack gap="sm"> title · <Row gap="md">{combos.map(c => <CombinationItem … />)}</Row></Stack></Card>
          : <EmptyState …27's card… />}
      </View>
    </Stack>
  </ScrollView>
</Screen>
```

- **The absent colour.** `Screen` with `appBar={{ back, rule, height, inset }}` only, and `EmptyState message={t('detail.notFound')} resolvedHere`.
- **`CombinationItem`** is one `Pressable` (role button, named by `combinationName`). Inside it:
  - a 67 dp circle: an `Image` with `borderRadius: pill`, or the fallback `Swatch`;
  - the rank `Chip form="badge" numeric fill="surface.2" height={RANK}`, absolutely positioned at the circle's top-left;
  - the caption `Text` (centred, 2 lines: name, then hex) at `xs` below.
  - All of it hidden from assistive technology except the control itself.

### Drawn intervals, from `06.json`, insets subtracted

Insets are (lineHeight − em)/2 per step:

| step | inset (dp) |
|---|---|
| latin title | 2.2 |
| latin body | 5.2 |
| latin label | 3.85 |
| latin caption | 2.575 |
| ja body | 6.8 |
| ja label | 5.165 |
| `kanjiHero` at em 53 (lineHeight 53 × 1.45 × 1.85/1.65 = 86.17) | **16.58** |

Shapes have no inset. **Increment 1 may move the kanji em, and the test recomputes.**

| interval | drawn ink gap | less | built | snap |
|---|---|---|---|---|
| bar rule → swatch | 9.0 | — | 9.0 | `sm` |
| page inset (swatch x) | 16 | — | 16 | `md` |
| swatch ↔ stack | 0 (abut) | — | 0 | none: one row, no gap |
| stack right → screen edge | 17 | — | 17 | `md` (cross-check) |
| names block indent (kanji 9, pill 7.5) | | | | `sm` (siblings) |
| swatch → kanji | 19.5 | 16.58 | 2.92 | `xs` |
| kanji → kana/name column | 9–10 | — | | `sm` |
| kana → name | 7.5 | 6.8 + 5.2 | **−4.5** | **named, floor `xs`**: +8.5 dp inside the column, which is shorter than the kanji box, so the row is not taller |
| kanji → pill | 9.5 | 16.58 | **−7.08** | **named, floor `xs`**: +11.08 dp |
| pill → readout card | 16 | — | 16 | `md` |
| screen edge → card edge | 0.8 | — | 0.8 | **named, under half `xs` → `xs`**: +3.2 dp each side |
| card → title (readout, provenance, combinations) | 15.5 / 16 / 15.5 | 2.2 | 13.3–13.8 | `md` |
| card side padding | 15 / 17.5 | — | | `md` |
| readout title → table | 10 | 2.2 | 7.8 | `sm` |
| table → card bottom | 12.5 | — | 12.5 | `md` |
| readout → provenance | 13.5 | — | 13.5 | `md` |
| provenance title → body | 7.5 | 2.2 + 3.85 | **1.45** | **named, floor `xs`**: +2.55 |
| body → review | 6.5 | 3.85 + 3.85 | **−1.2** | **named, floor `xs`**: +5.2 |
| review → card bottom | 16 | 3.85 | 12.15 | `md` |
| provenance → combinations | 11 | — | 11 | `sm` |
| combinations title → photos | 12 | 2.2 | 9.8 | `sm` |
| photo pitch gaps | 16, 14 | — | | `md` (siblings) |
| photo → caption | 7.5 | 3.85 (label) or 2.575 (caption) | 3.65 / 4.9 | `xs` |
| caption → card bottom | cut by the action bar (§2 scroll position) | | | the card's own `md` |
| art: card top / trailing | 5 / 10 | — | | `xs` / `sm` |
| app bar inset | 15.5 / 14.5 | — | | `md` |
| trailing icon gaps | 19, 17.5 | — | | `md` |
| back glyph → word | 9 | — | | `sm` (asserted on `Button`'s internal gap) |
| action bar: top / bottom / side / gap | 19 / 8.9 / 12 / 8 | — | | `md` / `sm` / `sm` (tie → smaller) / `sm` |

**Heights the type scale makes taller than drawn.** The test computes and records each, and ADR-0145 states the totals.

- The kanji row: 86.2 dp box against 48 dp of ink.
- The readout card: about +9.4.
- The provenance body: 3 × 21.7 against the drawn pitch.
- The captions.

**The Japanese screen keeps 06's interval steps.** The interval is layout (P1); only the kanji's size is 26's.

### Increments

Each commit passes Tier 1 (ADR-0132): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'`, plus the domain gates named.

0. **Claim and plan.**
   - Write this plan to `.harness/plans/F-247-the-colour-page-is-mockup-06.md`.
   - F-247 is already `in_progress` (the working tree's `feature_list.json` is modified; confirm). Set `plan`, and add `attested` (Appendix F).
   - Gates: `node scripts/verify-state.mjs`, format.
1. **Measure, decide, specify** (no source).
   - **Measure:**
     - `measure.ps1`: the ems of `06.taxonomy`'s text, `06.provenance.body` (and its line pitch), `.review`, the captions (and pitch), the wear and hold labels, the rank figure, and `26.provenance.corpus`/`.review`.
     - `serif-weight.mjs --em`: add gothic crops for `06.kanji` and `26.hero.kanji` (藍鼠). Then the weight solver on 26's kanji (`stem.ps1` bands).
     - `corner.ps1`: the three cards, the pill, both buttons, and the stack.
     - `tint.ps1`: the stack's fill against `06.swatch`'s measured `#576777`; whether the stack has an edge; the provenance lead's ink.
     - Glyph boxes: already in the inventory.
     - Record readings below 12 dp as comments, not `raw.emDp` (F-242/F-246).
   - **`06.mjs`:**
     - remove `overhangs`; fit the three regions and children (D-1), drawn boxes in comments;
     - rebind `06.back.label` → `static:tab.atlas`;
     - readout labels → `static:colour.hex`, `static:coord.oklch`, `static:coord.lab`, `static:coord.rgb`, `static:coord.displayP3`;
     - `06.provenance.body` → `corpus:entry.provenance`; `.review` → `corpus:entry.provenance.verification`;
     - actions corrected (finding 5);
     - `raw.emDp` re-measured on `06.kanji`; measured `type` on the pill, captions, buttons and rank;
     - `departures` (E1, E2, E4, as listed under Mockup fidelity);
     - `notDesign`: *Color* in `06.readout.title` (garbled-text box);
     - `conflicts.C3` and `C19` resolution text updated.
   - **`26.mjs`:**
     - `26.hero.kanji` re-measured (em and weight);
     - C3's `elements` extended to the non-adopted elements (`26.title`, `26.hero`, `26.hero.photo`, `26.hero.description`, `26.next-card`, `26.readout.grid`, `26.kasane*`, `26.provenance.seal`, `26.actions.add`, `26.actions.share`);
     - an E1 departure on `26.provenance.review` (承認済み).
   - Regenerate `06.json` and `26.json`.
   - Write ADR-0145 to ADR-0149, plus `docs/adr/README.md` rows.
   - **PRD §10:** remove the OQ-19 row and add its closing paragraph (OQ-14's shape).
   - **R9:**
     - §2: the *Color* bullet's second example;
     - §4: E1 (06/26 lines), E2 (the out-of-sRGB hex row), E3 (pill and row wraps; the header icons' overlapping targets), E4 (the combinations' empty states; a garment without a photo; the absent colour keeps its back);
     - §5: `opacity.artCard`, the two measured steps;
     - §6: C3 (the Japanese readout form decided; the 26-only list), C19 (as built), and the C10 census row for `06.provenance.review` → minted;
     - §8: the `06 26` row (P3 converted at render; the combinations binding);
     - §11: OQ-19 → Closed.
   - **`feature_list.json`:** F-247's notes, plus notes on F-248, F-253, F-262, F-263, F-265, F-267, F-305, F-326, F-343, F-344 and F-345 (Appendix F).
   - Gates: Tier 1. Lint runs `verify-mockups`, which refuses the closed OQ-19 if any overhang remains, plus `mockup-inventory --check`. Also `type-scale.test` (the census still owes both rows).
2. **Tokens.**
   - The manifest's `kanjiHero` and `kanjiHeroJa` (`elements` bound; size = the median em, re-measured), `opacity.artCard`, and `glyph.seal`.
   - The schema enum, and `06.kanji`/`26.hero.kanji` `type.size` → the step names (regenerate both JSONs).
   - Remove the two owed rows from `type-census.json`.
   - `type-scale.test`: the measured set adds both names, and the face check reads `FACE_OF` (jp's `steps: "all"`).
   - `generate-design-tokens.mjs`; `DESIGN-SYSTEM.md`.
   - **Temporary** `unreached-tokens.json` rows (closedBy F-247) for the two steps and `glyph.seal` (removed in 5) and for `opacity.artCard` (removed in 3).
   - `c10-exceptions.test`: the element exception retired and the token group added.
   - Gates: Tier 1, `generate-design-tokens --check`, `verify-token-reach` (and `--prove`), `pnpm test:contrast`, `pnpm test:cvd`.
3. **`@irodora/ui`.**
   - The four changes, each with a test that the default tree is unchanged (a decoy: the old tree passes, the new prop changes it).
   - `app-bar.test`:
     - `selected` announces and fills;
     - `@ts-expect-error` on `selected` for `share`;
     - `targetRoom` as iOS and as Android: the trailing group is `platformTapTarget()` tall, and each icon's size plus slop lies inside its parent, `jest.replaceProperty(Platform,'OS',…)`;
     - decoy: without `targetRoom` the group is as tall as its icons.
   - `badges.test`: `wrap` puts `minHeight` and no `numberOfLines`; decoy: the default keeps `height` and one line.
   - `illustrations.test`: `tone="card"` inks at 0.31; decoy: backdrop stays 0.15.
   - `readout.test`: the part ids with a `testID`, none without; `readoutRowName` equals the rendered row name.
   - New conformance subjects: `AppBar 06 (bookmark on)`, `Chip badge (wrapped)`, `Illustration (card tone)`.
   - Remove the `opacity.artCard` declaration.
   - Gates: Tier 1, `pnpm test:a11y`, `test:contrast`, `test:cvd`, `verify-token-reach`.
4. **Pure logic.**
   - `src/detail.ts`, `engine.ts#displayP3Of`, `builder.ts#rankForSlot` (extraction), `wardrobe/coverage.ts#rankingContext`, `export/subject.ts#colourSubject`, and the new keys in en and ja (the old ones stay until 5).
   - Tests: `apps/mobile/test/detail.test.ts` (see the test plan), `export-subject` cases, `wardrobe-coverage.test` (the `rankingContext` oracle), and `builder.test` unchanged.
   - Run `node scripts/verify-font-coverage.mjs`. If it names glyphs (likely: 時, 査, 読, 典, 拠, 測, 着, 調, 和, 戻, 基, 準, 組, 書, 指), run `generate-font-subset.mjs`, then `fonts.test`.
   - Gates: Tier 1, `verify-font-coverage`.
5. **The screen and its routes.**
   - **Rebuild `ColourDetail.tsx`.**
     - Props: `slug`, `bookmarked?`, `onBookmark?`, `onBack?`, `onShareCard?`, `onExport?`, `onWearIt?`, `onHoldAsTarget?`, `wardrobe?`, `photoOf?`, `ranking?`, `onOpenGarment?`, `onScanGarment?`, `onAddGarment?`.
     - A handler that is absent means an absent control.
     - `STATES` is unchanged.
   - **`[slug].tsx`:**
     - `<Stack.Screen options={{ headerShown: false }} />`; no `headerRight`;
     - `useBookmarks()`, `useTarget()`, `deviceRepository()`, `galleryImages(repo)`, `rankingContext(activeProfile(repo))`;
     - the wardrobe re-read on focus (Home's F-242 S5);
     - the pushes of D-3.
   - **`profile/export.tsx`:** an optional `slug` param, `colourSubject` when it resolves (else the latest palette, as now).
   - Delete `ColourBookmark`.
   - `chrome.test`: delete the `PLATFORM_HEADER` row; `Tabs` importers → `[]` with the reason.
   - **`bookmarks.test`:** *"06's bookmark"* → `ColourDetail`'s app-bar icon (name, `selected`, opposite on press, none for a missing slug). The route assertions:
     - `[slug].tsx` reads `useBookmarks()`;
     - it passes `bookmarked={bookmarked.has(slug)}` and `onBookmark`;
     - `headerShown: false`, with no `headerRight` (decoy: a route source with `headerRight` fails).
     - The target-box test moves to `app-bar.test`'s `targetRoom`.
   - **`screens.test`:**
     - the subjects in the Test plan; remove `(sections folded)` and `(06's bookmark, on/off)`;
     - rewrite *F-018 criterion 4* as *"colour detail shows what 06 binds (F-247)"*;
     - the A11 heading test kept.
   - `family-locale.test`: the group's ja word.
   - Remove the dead keys.
   - `screen-insets.json`: re-capture only the ColourDetail entries, with a `$comment`.
   - **e2e:**
     - `routes.json` `/atlas/[slug]` anchor → `detail.readout`;
     - `atlas.journey.json` steps 11–12 → `detail.readout`, `detail.wearIt` (the action bar is pinned and visible);
     - then `node scripts/generate-e2e-flows.mjs`.
   - `MEASURED_STEP_READERS` += `'apps/mobile/src/screens/ColourDetail.tsx'`; remove the two step declarations and the `glyph.seal` declaration.
   - Gates: Tier 1, a11y, contrast, cvd, `verify-reachability`, `verify-route-targets`, `generate-e2e-flows --check`, `verify-token-reach`, `verify-font-coverage`; `verify:claims` and `verify-app-glyphs` run in lint.
6. **Enrolment.**
   - `screens.test` `ENROLLED` `06.screen`, with its decoys.
   - `inventory-surfaces.json` adds `"06.screen"`; the `26.screen` notWhole text becomes *"Japanese over 06 (P2): built by F-247 and swept as 06.screen in Japanese; 26's three headings are the ja catalogue's words"*.
   - Commit `conformance-sweep.json`.
   - Gates: Tier 1, `verify-mockups`.
7. **Criterion 1's own test:** `apps/mobile/test/colour-detail-fidelity.test.tsx`. Gates: Tier 1.
8. **Negative and action tests:** `apps/mobile/test/colour-detail-states.test.tsx`. Gates: Tier 1.
9. **Effects and memory.** `effects.json` (the updates listed, plus E-213 to E-216) and their notes. Gates: Tier 1, `verify-state`.
10. **Verify, review, record.**
    - Run Tier 2, then the evaluator once.
    - Fix its findings or record them, then run Tier 2 again on the final tree.
    - Update `progress.md` and `feature_list.json`; capture lessons; checkpoint.

---

## Mockup fidelity

- **Governing:** `06` (P1).
- **Variants:** `26` for Japanese copy and Japanese typography only (P2); `25` for the palette only.
- **Board:** `00` for parts 06 does not show (P3). No `27` state is drawn for this route; the empty combinations take 27's card (ADR-0128).
- **Conflicts applied:**
  - C3 (06's layout; 26's headings and Japanese typography; 26-only not adopted);
  - C6 (gothic kanji);
  - C8 (text beside the sample);
  - C11 (the sample on the tinted surface);
  - C19 (*Wearable Combinations* spans the row);
  - C20 (the README keyline, at 06's 6.9 dp width, moved per sample);
  - C10 / ADR-0110 (the seal's green, minted).
  - **OQ-19 closed** by ADR-0145.

### Element by element

"Derived" means the record's own reading. "Explicit" means given in `ENROLLED`.

| # | element | built as | bound to | sweep locator |
|---|---|---|---|---|
| 1 | `06.header` | `Screen appBar`, h 57.5, inset `md`, gap `md`, `rule` | — | derived: `AppBar` |
| 2–3 | `06.back.icon` / `.label` | `AppBar.back`, glyph `back`, word body 500 | `tab.atlas`; named `detail.backToAtlas`; → back | derived: glyph `back`; text `tab.atlas` (rebound) |
| 4 | `06.bookmark` | `trailing.icons[0]`, `selected` | `bookmarked`, `onBookmark` (ADR-0135) | derived: glyph `bookmark` |
| 5 | `06.share` | `trailing.icons[1]` | → `/atlas/card/[slug]` | derived: glyph `share` |
| 6 | `06.export` | `trailing.icons[2]` | → `/profile/export?slug=` | derived: glyph `export` |
| 7 | `06.header-rule` | `AppBar` rule node | — | explicit: testID `APP_BAR_RULE_TEST_ID` |
| 8 | `06.swatch` | `Swatch width="fill"`, h 299, keyline 6.9, `sm` | `derived.hex`, `colorFor` | derived: `Swatch` |
| 9 | `06.swatch.stack` | second `Swatch` 14 × 298, the entry's own colour, hidden | the same | explicit: testID `detail.stack` |
| 10 | `06.kanji` | `Text kanjiHero` (ja `kanjiHeroJa`), gothic 400, heading | `name.kanji` | explicit value |
| 11 | `06.kana` | `Text body foreground.2` ja | `name.kana` | explicit value |
| 12 | `06.name` | `Text body foreground.2` | `nameLine` | explicit value |
| 13 | `06.taxonomy` | `Chip badge wrap surface.2` h 22 | `taxonomyLine` | explicit value |
| 14–15 | `06.readout` / `.title` | `Card level 1 md`; `Text title 600` | `detail.readout` | explicit testID `detail.readout`; derived text |
| 16 | `06.readout.table` | `ReadoutTable form="table"` | `readoutRows` | derived: `ReadoutTable` |
| 17–29 | rows, labels, values, divider | table rows | `colour.hex`, `coord.*`; the engine values | rows: explicit value `readoutRowName(…)`; labels: derived text; values: testID `detail.readout.table.<key>.value`; divider: testID `.divider` |
| 30–32 | `….srgb.separator` / `.p3-label` / `.p3-value` | `also` | `coord.displayP3` + `displayP3Of(xyz)` | explicit testIDs `.bar`, `.also.label`, `.also.value` |
| 33 | `06.provenance` | `Card level 1 md` | — | explicit testID |
| 34 | `….art` | `Illustration plum-branch tone="card"` 187 dp, top-right, behind | — | derived: illustration |
| 35 | `….title` | `Text title 600` | `detail.provenance` | derived text |
| 36 | `….body` | `Text label foreground.2`, lead run 600 foreground | `provenanceLead`, `provenanceBody` | explicit value |
| 37 | `….review` | `Row`: `Text` + `Glyph seal-check` in `glyph.seal` | `reviewLine` | derived: glyph `seal-check` (the record's icon) |
| 38–39 | `06.combinations` / `.title` | `Card level 1 md`; `Text title 600` | `detail.combinations` | explicit testID; derived text |
| 40–45 | `….item-n.photo` / `.rank` | circle photo or sample 67; badge 22.5 | `wearableCombinations` | explicit testIDs `detail.combination.<n>.photo` / `.rank` |
| 46–48 | `….item-n.caption` | `Text`, centred, 2 lines | `name ?? type` + `\n` + hex | explicit value |
| 49 | `06.actions` | `Screen actionBar`, `surface.1`, rule | — | derived: `ActionBar` |
| 50 | `….wear` | `Button` primary, `arrow-right`, h 35.5 | → `/atlas/wear/[slug]` | derived text `detail.wearIt` |
| 51–52 | `….hold` / `.icon` | `Button secondary edge="border"`, `reticle` 17, h 34 | arm, then `/lens` | derived text `detail.holdAsTarget`; glyph `reticle` |

### How 26 maps onto 06 (in Japanese)

| 26 | 06 slot in ja | adopted |
|---|---|---|
| `26.back` (伝統色一覧) | `06.back.label` | words, made true: 色図鑑 (E1) |
| `26.title` | — | no (06 draws none; C3) |
| `26.share` | `06.share` | yes; 06's other two icons stay (P1) |
| `26.hero`, `.photo`, `.description`, `26.next-card` | — | no (C3: 26's hero composition) |
| `26.hero.kanji` (40.4) | `06.kanji` | **its typography**: `kanjiHeroJa` |
| `26.hero.kana` | `06.kana` | the same step (body) |
| `26.readout.title` | `06.readout.title` | words 測色値と表色系, title 600 |
| `26.readout.grid` and its labels | `06.readout.table` | no: the table stays (ADR-0146 D5) |
| `26.kasane.title` | `06.combinations.title` | words 着こなしの配色調和 |
| `26.kasane`, `.label`, `.bar` | — | no (C3, C14) |
| `26.provenance.title` | `06.provenance.title` | words コーパス典拠と査読 |
| `26.provenance.corpus` / `.review` | `06.provenance.body` / `.review` | the lead word 査読ステータス; typography if measured off `label` |
| `26.provenance.seal` (hanko) | — | no (C3) |
| `26.actions.add` / `.share` | `06.actions.*` | no: 06's two actions (P1) |

### Departures, by id (nothing else)

- **E1:**
  - `06.swatch`, `06.kanji`, `06.kana`, `06.name`: the entry's own.
  - `06.swatch.stack`: its shade, only if measured as a tint.
  - `06.taxonomy`: group, *Era: None*, season or *Not assigned*.
  - `06.readout.table.*.value`: the engine's.
  - `06.provenance.title`: *Cultural Heritage* → *Review*.
  - `06.provenance.body`: *Historical Provenance*, 1842 → the classification, source, type and licence.
  - `06.provenance.review`: *Verified* → the recorded check.
  - `06.combinations.item-n.*`: the person's garments.
  - `26.back`, `26.provenance.review`.
- **E2:** the hex row of an entry outside sRGB.
- **E3:**
  - The pill and every text row wrap and are never clipped.
  - The three header icons' hit areas overlap at the drawn pitch (E-156; F-305).
  - The drawn-height pill, rank badges and buttons clip at 200 % text: component defect F-344.
- **E4:**
  - The bookmark's on state (ADR-0135, kept).
  - The combinations' two empty states.
  - A garment without a photograph.
  - The tab bar under the action bar (FR-71, already listed).
  - The absent colour's back.
- **§2, not design:**
  - the bezel, callouts and bracketed names (recorded);
  - *Color* → *Colour*;
  - the garbled right card (C19);
  - the combinations card cut by the action bar (the scroll position).
- **§2, intervals tighter than the scale take `xs`, each named in ADR-0145:**
  - kana → name;
  - kanji → pill;
  - the card edge;
  - provenance title → body;
  - body → review.
- **OQ-19 (closed, ADR-0145):** the lower regions fitted, and the art behind the text.
- **C3:** the 26-only elements listed above.

If the capture shows anything else, it is fixed or it is a question for a person.

---

## Files to touch

```
.harness/plans/F-247-the-colour-page-is-mockup-06.md   — this plan
docs/adr/0145-…0149-…, docs/adr/README.md               — the five decisions (Appendices A–E)
docs/PRD.md                                            — §10: OQ-19 closed
docs/design/R9-MOCKUP-FIDELITY.md                      — §2, §4 E1/E2/E3/E4, §5, §6 C3/C19/C10 census, §8, §11
docs/design/design-system.manifest.json, DESIGN-SYSTEM.md — kanjiHero, kanjiHeroJa, opacity.artCard, glyph.seal, exceptions
mockups/inventory.schema.json                          — type.size enum
mockups/tools/inventory-data/06.mjs, 26.mjs; mockups/inventory/06.json, 26.json
mockups/tools/serif-weight.mjs                         — two gothic crops (06.kanji, 26.hero.kanji)
packages/design-tokens/src/generated/*, test/type-scale.test.ts, c10-exceptions.test.ts, emit tests
packages/ui/src/AppBar.tsx, Chip.tsx, Illustration.tsx, ReadoutTable.tsx, index.ts
packages/ui/test/app-bar.test.tsx, badges.test.tsx, illustrations.test.tsx, readout.test.tsx, conformance.test.tsx
apps/mobile/src/detail.ts (new), engine.ts, outfit/builder.ts, wardrobe/coverage.ts, export/subject.ts, bookmarks.tsx (ColourBookmark removed), i18n/en.ts, ja.ts
apps/mobile/src/screens/ColourDetail.tsx               — rebuilt to 06
apps/mobile/app/(tabs)/atlas/[slug].tsx, app/(tabs)/profile/export.tsx
apps/mobile/test/detail.test.ts (new), colour-detail-fidelity.test.tsx (new), colour-detail-states.test.tsx (new),
  screens.test.tsx, bookmarks.test.tsx, chrome.test.ts, family-locale.test.tsx, wardrobe-coverage.test.ts, export tests
apps/mobile/e2e/capture/routes.json, e2e/journeys/atlas.journey.json (+ regenerated flows)
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf (+ pins) — only if verify-font-coverage asks
scripts/verify-token-reach.mjs                         — MEASURED_STEP_READERS
.harness/verification/type-census.json, unreached-tokens.json (temporary rows), inventory-surfaces.json,
  screen-insets.json, conformance-sweep.json
.harness/state/feature_list.json, progress.md, effects.json; .harness/memory/effects/*.md
```

---

## Anticipated effects

### Existing links whose `from` this touches

| link | change | guard |
|---|---|---|
| **E-024** (`parsePalette` → … ColourDetail) | the palettes section leaves the page; drop ColourDetail from `to`; its rationale's kasane note is answered (ADR-0147) | `palette.test` (unchanged); the new screens test asserts no palette names on the page |
| **E-065** (`layout.tsx` → ColourDetail) | the page bleeds through `scroll={false}` and its own `ScrollView`, as the Atlas does | the fidelity test reads each block's inset; `screen-insets` pin |
| **E-076** (sizes ≤ 264) | the hero is `width="fill"`, and its 299 dp height is a named constant | lint; the fidelity test recomputes `HERO_HEIGHT` |
| **E-101** (`wear.ts` no-evidence profile) | a second reader: the combinations' order | `colour-detail-states.test`: no score, factor or "match" on the card; decoy: a planted score string is found |
| **E-106** (`target.tsx` → ColourDetail) | arming moves to the action bar, and the route navigates to `/lens` | `target.test`, unchanged; states test: *Hold* calls `onHoldAsTarget(slug)`; a route-source assertion of `arm(` then `/lens` |
| **E-136 / E-209** (opacity.art, `IllustrationProps`) | `tone="card"`, `opacity.artCard` | `illustrations.test` (0.31; decoy 0.15); emit tests; the parser's (0, 0.5] |
| **E-145 / E-017 / E-028** (Japanese content → font subset) | palette names leave the page; new catalogue kanji | `verify-font-coverage`; `generate-font-subset --check` |
| **E-149 / E-159** (C10 exceptions → manifest) | `06.provenance.review` minted as `glyph.seal`, carried by a token group | `c10-exceptions.test` (each element covered once; decoy) |
| **E-152 / E-171** (inventory → type census, ADR-0121) | two measured steps; rows discharged; `MEASURED_STEP_READERS` += ColourDetail | `type-scale.test` (census both ways; median em; lineHeight ≥ own line; decoy); `verify-token-reach` (`--prove`: a planted reader elsewhere) |
| **E-156** (hit area → `bookmarks.tsx`, …) | the bookmark box → `AppBar targetRoom` | `app-bar.test` on iOS and Android (decoy: without `targetRoom`); device attestation for the overlap (F-305) |
| **E-164** (layout → AppBar, `chrome.test`) | `atlas/[slug]` leaves `PLATFORM_HEADER`; `AppBarIcon.selected` | `chrome.test` both directions; `app-bar.test` |
| **E-169** (figures → ReadoutTable) | 06's table in use; part ids | `figures.test`, `readout.test`; ragged-figure over the new subjects |
| **E-203** (feature list → `verify-mockups`, sweep) | `06.screen` enrolled | `verify-mockups` in lint; `screens.test` both directions |
| **E-204** (`BookmarksProvider` → `[slug].tsx`, …) | the toggle moves into the app bar via props | `bookmarks.test` adapted, every decoy kept; route source asserted |
| **E-208** (`wardrobe/coverage.ts`) | `rankingContext` beside `coverageContext` | `wardrobe-coverage.test`: oracle by hand; `NO_EVIDENCE_PROFILE` only without a stored profile; decoy |
| **E-016 / E-066 / E-089** (catalogues, ja claims) | keys added, removed and re-valued; new ja copy | `tsc`; `i18n.test`; `verify:claims` |
| **E-128** (inventory → R9, PRD, features) | `06.json` and `26.json` edited; OQ-19 closed | `verify-mockups`; `mockup-inventory --check` |
| **E-191** (`states.ts`) | `STATES` unchanged; new witness subjects | the declarations test; `blank-panel`, `bare-zero` |

### New links

Check the maximum id at write time; E-212 is the last today. Each gets a memory note.

- **E-213.**
  - From `apps/mobile/src/detail.ts#readoutRows`, with `engine.ts#displayP3Of`.
  - To `ColourDetail.tsx`, `@irodora/color-spaces#xyzToDisplayP3`, the 06 sweep's values, `colour-detail-fidelity.test`.
  - **Hazard:** the P3 row is fed `derived.rgb ÷ 255` (06's own error) or the gamut-mapped XYZ, a plausible wrong triple; or the hex of the one out-of-sRGB entry is printed as the colour.
  - **Guard:** `detail.test` asserts, for all 120:
    - P3 = `displayP3Of(entry.color.xyz)` at 3 dp;
    - decoy: it is not `rgb ÷ 255`;
    - each component lies in [0, 1], or the ADR's rule applies;
    - only out-of-sRGB entries carry the E2 note (decoy: an in-gamut entry has none).
- **E-214.**
  - From `apps/mobile/src/outfit/builder.ts#rankForSlot`.
  - To `regenerate` (the Lab), `detail.ts#wearableCombinations`, ColourDetail, `wear.ts#NO_EVIDENCE_PROFILE`.
  - **Hazard:** a change to the ranking (tie-break, locks) silently re-orders both the Lab's proposals and 06's combinations.
  - **Guard:**
    - `builder.test`, unchanged (the same locks over a reordered wardrobe);
    - `detail.test`: the order equals a by-hand `scoreOutfit` oracle over a 4-garment wardrobe; ties by id; the top slot excluded (decoy: a second top never appears); no-slot types excluded.
- **E-215.**
  - From `apps/mobile/app/(tabs)/atlas/[slug].tsx` (06's drawn actions).
  - To `/atlas/wear/[slug]` (F-248), `/atlas/card/[slug]` (F-253), `/profile/export?slug=` (F-263), `/lens` (F-245), `/wardrobe/with/[id]`, `/wardrobe/add`, and `verify-reachability`.
  - **Hazard:** a later rebuild of 07, 20 or 18 drops or renames the route a drawn 06 control relies on, or the export route stops reading `slug` and exports the latest palette.
  - **Guard:**
    - `colour-detail-states.test` fires each control (decoy: an absent handler means an absent control);
    - a route-source test asserts each push target;
    - `export` tests: `colourSubject` is used when `slug` resolves (decoy: an unknown slug falls back);
    - `verify-route-targets`.
- **E-216.**
  - From `packages/ui/src/AppBar.tsx#AppBarTrailing.targetRoom`.
  - To ColourDetail, F-305, and any app bar with trailing icons (05's `more` may opt in).
  - **Hazard:** a target that reaches its size in the rule but not on Android.
  - **Guard:** `app-bar.test` (iOS and Android, decoy); the device attestation; F-305's note.

---

## Test plan

### Unit and property (`apps/mobile/test/detail.test.ts`)

- **`readoutRows`:**
  - Over all 120: hex = `derived.hex`.
  - OKLCh = `oklchLine`'s figures (3, 3, 1).
  - CIELAB at 1 dp.
  - sRGB = the hex bytes.
  - P3 = `displayP3Of(entry.color.xyz)` (E-213 guard).
  - Every value names its space (`Figure.space`).
  - The out-of-sRGB entry's hex row carries the note with `renderDeltaE00.toFixed(2)`.
- **`taxonomyLine`:**
  - The family is the entry's group (romaji and en / kanji).
  - Era: the entry's era, or *None*. Planted decoy: an era string prints itself.
  - Season: authored → the season words (`seasonLine`), else *Not assigned*. Decoy: never *None*.
- **`provenanceLead` / `provenanceBody` / `reviewLine`:**
  - The lead is `CLASSIFICATION_KEYS[classification]`; decoy: a planted `traditional` entry prints *Traditional*, so the binding is live.
  - The body contains source, the source-type word and licence (FR-24).
  - The review contains the independence words and `verifiedAt` (F-084's *Checked by its own author*).
  - A null independence gives no seal (decoy).
- **`wearableCombinations`:**
  - The E-214 oracle; at most three, ranked 1–3.
  - The empty wardrobe gives `[]`; a wardrobe of tops only gives `[]`.
  - Without a stored profile the context's profile *is* `NO_EVIDENCE_PROFILE`.
- **`colourSubject`:** title is the English name; one colour with `derived` values; the envelope is `paletteSubject`'s three versions.
- **The headings and words are true of every entry:**
  - no catalogue value contains 伝統, *Traditional*, *Heritage*, *Historical* or *Verified*;
  - decoy: a planted value containing 伝統 is found by the same check.

### Conformance subjects (`screens.test.tsx`)

- `screens/ColourDetail`: every handler; an autumn entry; three rankable garments, one with a photo.
- `(bookmarked)`.
- `(an empty wardrobe)` shows `empty`.
- `(nothing to rank)` shows `empty`.
- `(outside sRGB)`.
- `(not in this corpus)`, kept.
- `sampleValues` adds the fixture garments' hexes.
- The rewritten *"shows what 06 binds"* describe:
  - all four name forms;
  - hex, OKLCh, CIELAB, sRGB and P3;
  - the classification label, source, source type, licence, *Era*, the review words;
  - FR-23's negative (no *Historical*, *Traditional*, *Modern Japanese* node);
  - *not in this corpus version*.
- The A11 headings test.

### The inventory sweep (`ENROLLED`)

```
surface '06.screen', root 'detail.surface',
render: <View testID="detail.surface"><ColourDetail slug={DETAIL_SLUG} bookmarked onBookmark onBack onShareCard
          onExport onWearIt onHoldAsTarget onOpenGarment wardrobe={DETAIL_WARDROBE} photoOf={DETAIL_PHOTOS}
          ranking={DETAIL_RANKING} /></View>
locators: as the element table; values through detail.ts's own functions, per locale
```

No `superseded`: 06 draws no tab bar. Decoys:

- a combination caption removed → one finding naming `06.combinations.item-2.caption`;
- the readout bar's id removed → `06.readout.table.srgb.separator`;
- `detail.stack` removed → `06.swatch.stack`;
- `'06.screen'` added to "the real surfaces are clean as drawn".

### Criterion 1's own test (`colour-detail-fidelity.test.tsx`; the RENDERED tree)

- **Order:**
  - back glyph < word < bookmark < share < export < rule;
  - swatch < stack < kanji < kana < name < pill < readout title < hex < OKLCh < CIELAB < sRGB < bar < P3 < provenance title < body < review < combinations title < item 1 < item 2 < item 3 (photo < caption each);
  - wear < hold.
- **Grouping:**
  - shared `flexDirection: 'row'` ancestors: swatch|stack, kanji|(kana, name), the three trailing icons, the three items, and the two buttons inside `ActionBar`;
  - the rank inside its item; the art inside the provenance card and rendered before its text.
- **Proportion:**
  - every interval of the table recomputed from `06.json` through §2's snap, each subtracted inset written out;
  - the negative and sub-half intervals go through `belowTheScale`, with their named cost asserted against ADR-0145's table;
  - sizes: 57.5, 299, 14 × 298, keyline, 22, 67, 22.5, 35.5, 34, 17, 187, the glyph sizes;
  - corners, from Increment 1's readings;
  - `ReadoutTable form="table"` in **both** locales; decoy: no `grid` in ja.
- **Type:**
  - every text's rendered `fontSize`, `fontWeight` and ink against `06.json` in en;
  - in ja, against 26's record for the mapped elements: the kanji at `kanjiHeroJa`, the headings at title 600;
  - decoy: the kanji's step differs between the locales and equals each inventory's.
- **Wrap:** the pill carries `minHeight` and no `numberOfLines`; the names row and review row have `flexWrap: 'wrap'`.

### Negative and action tests (`colour-detail-states.test.tsx`)

- **No 06 or 26 sample content** in either locale or theme, in paragraphs and names:
  - *Ai-nezumi, 藍鼠, あいねずみ, Indigo Grey, #5B6B78, 0.490, 0.035, 240.2, 45.2, 0.357, 0.420, 0.471, Edo, 1842, Heritage, Historical Provenance, Verified, 承認済み, 伝統, v1.2, Ecru Trousers, Charcoal Derby, Ochre Scarf, #D1C7BD, #1C2024, #6B4513, 江戸*;
  - decoy: a planted *Ai-nezumi* is found.
- **Actions, each by a fired event on the control a person touches, not by reading a prop:**
  - the bookmark calls `onBookmark(!on)`;
  - share calls `onShareCard(slug)`;
  - export calls `onExport(slug)`;
  - *Wear It* calls `onWearIt(slug)`;
  - *Hold* calls `onHoldAsTarget(slug)`;
  - an item calls `onOpenGarment(id)`;
  - back calls `onBack()`.
  - Decoys: an absent handler means an absent control; a press on the rank badge bubbles to its item. The control is the item, asserted as the responder.
- **No figure on the combinations card:**
  - no `%`, no *score* or *match*, in both locales;
  - decoy: a planted figure is found.
- **The empty states:**
  - the empty wardrobe draws 27's card with *Scan*, which calls `onScanGarment`;
  - none rankable gives *Add a garment*;
  - decoy: three garments give no empty card.

### E2E

`generate-e2e-flows --check` covers the journey and the `/atlas/[slug]` capture flow. The device run is attested.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#  + inc 2: node scripts/generate-design-tokens.mjs --check && node scripts/verify-token-reach.mjs && pnpm test:contrast && pnpm test:cvd
#  + inc 3, 5: pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
#  + inc 4, 5: node scripts/verify-font-coverage.mjs (and generate-font-subset if asked)
#  + inc 5: verify-reachability, verify-route-targets, generate-e2e-flows --check, verify-token-reach
#  + inc 1, 6: verify-mockups and mockup-inventory --check (in lint)
# Tier 2, at Verify and again after the review's fixes
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm turbo run test --force
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:content
pnpm security
node scripts/verify-ci.mjs --all
# no engine change, so no color-golden run is owed; P3 comes from the golden-tested conversion
```

**Evidence for `progress.md`:**

- each gate's summary line;
- `conformance-sweep.json`'s inventory block: `06.screen` enrolled, `elementsAsserted` +52, `renders` +4;
- `claims.findings` 0;
- the token-reach line (the two steps read only by ColourDetail);
- the type census (owed rows 7 → 5);
- the font-coverage line;
- the screen-insets delta for the ColourDetail subjects.

| # | criterion | proven by |
|---|---|---|
| 1 | every 06 element (26 for ja) in order, grouping and proportion; the sweep asserts the inventory | `colour-detail-fidelity.test` and the sweep. **Gated** |
| 2 | bindings per §8; no mockup content | `detail.test`, the sweep's values, `colour-detail-states.test`. **Gated** |
| 3 | only the listed departures | gated for structure; **attested** for appearance |
| 4 | capture beside 06 (26 for ja), compared by a person | **attested** |
| 5 | catalogues, every drawn action works, a11y/contrast/cvd pass | `tsc`, `i18n.test`, `colour-detail-states.test`, `bookmarks.test`, the three gates. **Gated**, with the device half **attested** |

---

## Attestations

Declared in Increment 0 in F-247's `attested` array (Appendix F):

1. **Criterion 4, the capture compared.**
   - A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator at 384 dp, with a non-debuggable build of the final commit.
   - They compare `/atlas/[slug]` against 06 (en, Sumi), 25 (en, Washi) and 26 (ja).
   - They record "matches" or each difference in `progress.md`.
2. **Criterion 3, the appearance half.** Discharged by the same comparison. Every difference is a listed departure, or is fixed and recaptured, or is recorded as a feature.
3. **Criterion 5, the device half.** On the same device, the person checks:
   - a tap at the edge of each header icon lands on that icon (F-305 for the overlap);
   - the bookmark toggles and TalkBack announces it selected;
   - share opens the card;
   - export opens the export with this colour;
   - *Wear It* opens Wear;
   - *Hold* arms the target bar and opens the Lens;
   - a combination opens its garment;
   - the page scrolls to the combinations with the action bar pinned above the tab bar;
   - at 200 % text in en and ja the names row, the pill, the cards' text and the action labels wrap; the drawn-height pill, rank badges and buttons clip (F-344, recorded);
   - the generated `atlas.yaml` journey passes.

All three block release.

---

## Risks and open questions

1. **Measurements owed in Increment 1:**
   - the two kanji ems from outlines (the steps move with them, and E-152's test recomputes);
   - 26's kanji weight;
   - the pill, caption, button and rank steps;
   - the provenance body's pitch;
   - every corner;
   - the stack's fill and edge.

   The plan's numbers marked "Inc 1" are not known yet.
2. **The Japanese readout stays a table** (ADR-0146 D5). This is the decision a person is likeliest to revisit when comparing with 26.
   - The alternative is the grid in Japanese. It costs a second layout, and a locale-scoped supersession in the sweep (an amendment to ADR-0144) for the sRGB/P3 bar.
   - F-265 inherits the note.
3. **The page is taller than drawn.** The kanji's line box (86 dp against 48 dp of ink) and the label leading against 06's tighter pitch add tens of dp. The test computes each cost and the ADR states it.
4. **The provenance art overlaps the body text after fitting** (ADR-0145 D3). Contrast is measured on the card ground, but legibility is the person's judgement.
5. **Unverified mechanics:**
   - Android's delivery of `targetRoom`'s slop (device);
   - Maestro's view of a `Pressable` item;
   - whether `renderedTexts` reads the nested lead run as one paragraph (the body is then located by value);
   - `Image` with a `data:` URI under jest.
6. **The share icon opens a card that has no share action until F-253.** The note is recorded on F-253.
7. **The export route gains one optional param** that F-263 must keep (E-215).
8. **Combinations without a profile are ordered by the no-evidence profile** (E-101). The order is not personal, and no figure is shown.
9. **Material leaves the page** (ADR-0147). A person may want some back. Each returns only through a mockup, or as an E4 a PRD requirement forces.
10. **If any entry's P3 falls outside [0, 1]**, ADR-0146 D4 applies its rule: the value is printed as converted, with the same note form. Increment 4's test reports which entries.
11. **The Japanese copy awaits OQ-5's competent-speaker review.**
12. **OQ-19 closes here.** OQ-46 (the hero keyline moving dark), OQ-48 and OQ-5 stay open. No other OQ blocks this feature.

## Out of scope

- 07, 18, 20 and the Lens's 04 state (F-248, F-263, F-253, F-245): the routes 06 opens.
- The card's own share action.
- The Android target overlap fix (F-305).
- Drawn-height controls at 200 % (F-344).
- Japanese swatch names (F-345).
- A non-pressable Swatch (F-343).
- The CVD naming outside this page (F-326).
- `Screen`'s gap (F-342).
- Any change to the corpus, the derived bundle (no P3 field), the engine, or a golden value.
- No new route. The `Tabs`/`Accordion` components stay in `@irodora/ui`.
- 26's grid on any screen.
- OQ-48 and OQ-23.

## Sources

**Repository (read; nothing run):**

- Manuals and specs: `AGENTS.md`, `mockups/AGENTS.md`, `apps/mobile/AGENTS.md`, `docs/design/R9-MOCKUP-FIDELITY.md` (in full), `docs/PRD.md` (FR-20–25, 47–52, 61; §10).
- F-247's feature entry; F-305, F-326, F-342–F-345.
- The mockups `06_color_detail_centerpiece.jpg`, `26_color_detail_japanese.jpg`, `07_wear_outfit_combinations.jpg`.
- `mockups/inventory/06.json`, `mockups/tools/inventory-data/06.mjs`, `26.mjs`, `inventory.schema.json`; `scripts/mockup-inventory.mjs` (overhangs), `scripts/verify-mockups.mjs`.
- F-246's plan and review, `atlas-fidelity.test.tsx`, `screens.test.tsx` (`ENROLLED`, the F-018 tests), `inventory.ts`, `bookmarks.test.tsx`, `chrome.test.ts`.
- The lesson `an-ink-gap-loses-the-line-inset-and-a-negative-one-is-a-finding.md`.
- `ColourDetail.tsx`, `[slug].tsx`, `bookmarks.tsx`, the `atlas/{wear,with,card}` and `profile/export` routes.
- `wear.ts`, `outfit/builder.ts`, `wardrobe/{coverage,shopping,gallery}.ts`, `engine.ts`, `export/subject.ts`, `notation.ts`, `home.ts`, `Home.tsx`, `card.ts`, `states.ts`.
- `packages/ui/src/{AppBar,IconButton,ActionBar,ReadoutTable,Swatch,Card,Chip,Illustration,Text,layout}.tsx`, `packages/corpus/src/derive.ts`, `packages/optimization/src/coverage.ts`.
- The manifest (`typography`, `opacity`, `exceptions`), `native.ts`, `type-scale.test.ts`, `verify-token-reach.mjs`, `type-census.json`, `inventory-surfaces.json`, `unreachable-routes.json`.
- `eslint.config.mjs` (restricted imports), `verify-guards.mjs`, `verify-reachability.mjs`, `verify-dead-exports.mjs`.
- `effects.json` (E-024, 065, 076, 101, 106, 134, 136, 145, 149, 152, 156, 164, 169, 171, 203, 204, 208, 209).
- `content/colors/fuyu-umi.json`, `content/versions/2026.09.3.json` (the gamut census), ADR-0065.

---

# Appendix A: ADR-0145 draft

```markdown
# ADR-0145: 06's screen is its upper panel, and what it draws wider is fitted to it

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Closes** | OQ-19 |
| **Applies** | R9-MOCKUP-FIDELITY §2 (measurement, snap, intervals tighter than the scale), §3 P1, §6 C19; golden rule 14; ADR-0139 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
06 is a spec card. The app bar, sample, names, pill and readout sit in a framed panel 474 px wide (x 53–527).
Callouts occupy the column to its right. The provenance card, the combinations card and the action bar are drawn
667 px wide (x 51–718), extending into that column. The inventory records them as overhangs on OQ-19, and
`mockup-inventory.mjs` refuses an overhang whose question is closed. 26, the same page in Japanese, draws every
section inside one 496 px screen.

## Decision
- **D1.** The screen is `06.screen`: 474 px, 0.8101 dp/px, 384 dp.
- **D2.** Every element keeps its drawn scale: type, heights, vertical intervals and insets. The lower regions
  take the screen's width, edge to edge as the readout card. The drawn 0.8 dp edge interval is under half of
  `xs`, so it takes `xs`, which adds 3.2 dp a side.
- **D3.** The provenance art keeps its drawn width (187 dp) and its corner (top `xs`, trailing `sm`). It is the
  card's backdrop, behind the text, clipped by the card.
- **D4.** The action bar's two actions share the screen's width, with their drawn heights, corners and gap.
- **D5.** *Wearable Combinations* spans the row (C19). Its items keep their size and pitch from the leading edge.
- **D6.** The inventory follows: no overhangs; the regions are recorded at their fitted boxes, with the drawn
  boxes in comments.
- **D7.** Intervals the drawing sets tighter than the scale are named, take `xs`, and their cost is recorded:

  | interval | cost |
  |---|---|
  | kana → name | −4.5 dp → +8.5 |
  | kanji → pill | −7.08 → +11.08 |
  | provenance title → body | 1.45 → +2.55 |
  | body → review | −1.2 → +5.2 |
  | the card edges | 0.8 → +3.2 each |

  The line boxes the scale sets add further height, computed by the fidelity test.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| The screen is the lower width (667 px, 0.5757 dp/px) | The upper panel becomes 273 dp in a 384 dp screen, every upper element shrinks by 29 %, and the app bar no longer spans the screen |
| Each region at its own scale | Two type scales on one screen: a 19.2 dp heading above, a 13.6 dp one below |
| Clip the lower regions at the screen's edge | Content is lost (E3) |
| Art beside a narrowed text column | A 157 dp text column, or the art shrunk below its drawn size |

## Evidence, and its limits
- **It rests on:** `06.json`'s boxes; the bezel (notDesign) and the callouts' column; 26's single-width
  composition of the same sections; §2's snap.
- **The limits:**
  - the art now overlaps the right of the body text;
  - the page is taller than drawn;
  - the measurements of Increment 1;
  - it was not tested with people.

## Consequences
- `06.mjs` loses its overhangs.
- R9 §11 and PRD §10 close OQ-19.
- `colour-detail-fidelity.test` holds every interval and its cost.

## Revisit when
- 06 is regenerated at one width.
- The person's comparison finds the overlap or the height wrong.
```

# Appendix B: ADR-0146 draft

```markdown
# ADR-0146: The colour page says what 06 says, made true, and in Japanese takes 26's words on 06's layout

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Builds on** | ADR-0065, ADR-0060, ADR-0121, ADR-0112, ADR-0135, ADR-0140 (contrast drawn in D2), ADR-0142 D5 |
| **Applies** | R9 §2, §3 P1/P2, §4 E1/E2, §6 C3/C6/C8/C20, §8; golden rules 11–14; FR-21, FR-23, FR-24, FR-61 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
06 prints a historical provenance (*Edo period dyeworks manuscript (1842)*), *Era: Edo Period*, *Cultural
Heritage*, *Verified*, a P3 triple that is sRGB ÷ 255, and garments no person owns. The corpus holds 120
Irodora originals: `japanese-inspired`, no era, 96 with no season, every one self-reviewed. 26 draws the same
page in Japanese, in a different composition. C3 gives 06 the layout and 26 the headings and the Japanese
typography, and leaves the Japanese readout's form to F-247.

## Decision
- **D1 Words.**
  - Back: *Atlas* / 色図鑑.
  - Headings: *Scientific Colour Space Readout Table* / 測色値と表色系; *Provenance & Review* /
    コーパス典拠と査読; *Wearable Combinations* / 着こなしの配色調和.
  - Actions: *Wear It (Build Outfit)*, *Hold as Target in Lens*.
- **D2 The pill.**
  - *Family: group romaji (group en) • Era: era | None • Season: seasons | Not assigned*.
  - The segments are labelled, so an absent value is stated, not left blank (FR-21). Era stays visible on the
    surface FR-24 names.
  - ADR-0140's unlabelled Atlas line ends instead; the difference is the label.
- **D3 The provenance card.**
  - The bold lead is the classification (FR-23, ADR-0065).
  - The body is source · source type · licence (FR-24).
  - The review line is *Editorial Review / 査読ステータス: independence, verified date*, with the seal only
    where a check is recorded (F-084).
- **D4 The readout.**
  - Hex, OKLCh (3/3/1, ` • `), CIELAB (1 dp), sRGB (the hex bytes).
  - Display-P3 is the engine's conversion of the record's canonical XYZ, at 3 dp, computed at render through
    `engine.ts`; it is not in the bundle.
  - For an entry outside sRGB, the hex row says *nearest sRGB rendering, ΔE00 n.nn* (E2, rule 11).
  - A P3 component outside [0, 1] is printed as converted, with the same note form.
- **D5 Japanese.**
  - 06's layout.
  - 26's three headings.
  - 26's Japanese typography where 26 draws the same element: the kanji at `kanjiHeroJa`; the provenance lines
    at 26's step if it differs.
  - The readout stays 06's table, with the catalogue's notation labels: one layout (§6), and the sweep holds
    06's elements in Japanese. 26's grid and its cell labels belong to the grid.
  - Not adopted (C3): the title, the hero card with text on the photo, the description, the next-card peek,
    the kasane, the hanko seal, 26's actions.
- **D6 The second layer.** It is drawn in the entry's own colour, at its drawn size, hidden from assistive
  technology. A lighter tint, if measured, is a colour no source holds beside the colour being judged (rule 12),
  and is recorded as E1.
- **D7 The kanji.**
  - `kanjiHero` (06) and `kanjiHeroJa` (26), measured steps per ADR-0121.
  - Each em is read from NotoSansJP's outlines, at weight 400, the face's one cut.
  - 26's stems, if heavier, are named, not faked (ADR-0112).

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Keep *Cultural Heritage* / *Historical Provenance* / *Verified* | FR-23 and E1: an original presented as heritage; a self-review presented as verification |
| Omit Era and Season when empty | Era vanishes from the surface FR-24 names; a drawn, labelled segment is lost |
| Print the classification in the Era slot | One label, two meanings |
| P3 as sRGB ÷ 255 (as drawn) | A false conversion |
| A P3 field in the bundle | A content-schema change and a corpus rebuild (E-001), for a value the engine derives exactly |
| The grid in Japanese | Two layouts for one screen; a locale-scoped supersession in the sweep |
| 26's long labels in the table | Words broken across lines in a 70.5 dp column |
| 26's hero in Japanese | Two layouts |

## Evidence, and its limits
- **It rests on:** `06.json` and `26.json`; the 120 records and their `unknowns`; the gamut census (1 of 120);
  `derive.ts`; the golden-tested `xyzToDisplayP3`; R9 C3; `inventory-surfaces.json`.
- **The limits:** Japanese copy awaits OQ-5; the measurements of Increment 1; it was not tested with people.

## Consequences
- `src/detail.ts`, `engine.ts#displayP3Of`, the new keys, two measured steps.
- R9 §4 and §6 C3 rows updated.
- F-265 notes the table.

## Revisit when
- OQ-48 or OQ-5 is answered.
- A cleared source gives an entry an era.
- A person's comparison asks for the grid.
```

# Appendix C: ADR-0147 draft

```markdown
# ADR-0147: What leaves the colour page, and where each drawn action goes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Supersedes in part** | F-018 criterion 4's on-screen reading, F-148 and F-156's sections, F-181's *Compare with*, F-194's link from this page |
| **Applies** | Golden rule 14; R9 §4 E4; FR-21, FR-23, FR-24, FR-56, FR-61; ADR-0128 §6, ADR-0135 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
The page drew everything the record carries, behind an accordion and tabs. 06 draws a sample, the names, a pill,
a readout, a provenance card, combinations and two actions. Rule 14 builds what 06 draws. E4 keeps a capability
no mockup draws only where a requirement forces it.

## Decision
- **D1.** These leave the page:
  - description, contemporary note, fashion use;
  - XYZ, CIELCh, the gamut line (except D4's note in ADR-0146);
  - the bands;
  - register id, rights holder, publisher, year, URL, derivation, author and reviewer ids, editorial notes;
  - palettes; relations; the colour-vision block; *Compare with*.

  Where each still lives:

  | material | where |
  |---|---|
  | CVD | F-240's preview, on every route |
  | the nearest entries | 21 |
  | palettes | 10 |
  | the bands | the Atlas's *More filters* |
  | Compare | the Atlas's pill |
  | the record | the corpus and the export |
- **D2.** Kept, in 06's slots:
  - FR-23: the lead.
  - FR-24: body, pill, review.
  - FR-61: every value with its space named; LCh is the polar form of the CIELAB row, and OKLCh carries a
    polar readout.
  - F-084: the review words.
  - FR-56: the bookmark.
- **D3.** The drawn actions:

  | control | goes to |
  |---|---|
  | back | back, or `/atlas` |
  | bookmark | toggles |
  | share | `/atlas/card/[slug]` (26's binding) |
  | export | `/profile/export?slug=` (`colourSubject`) |
  | *Wear It* | `/atlas/wear/[slug]`: 07, which §7 maps there; the inventory's `/atlas/with` is 07's printed route string |
  | *Hold* | arm, then `/lens` (04's state; no `/lens/against` route exists) |
  | a combination | `/wardrobe/with/[id]` |
- **D4.** A colour this corpus does not hold keeps the app bar's back and 00's caption.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Keep the old sections below 06's | Elements no mockup draws, on a governed screen (rule 14) |
| A "More about this colour" disclosure | An undrawn control and section |
| Export the latest palette from the export glyph | The drawn action does something else |
| Share without the card | A rasterisation path F-253 owns |

## Evidence, and its limits
- **It rests on:** the PRD's requirement texts; `06.json`; the route tree; `verify-reachability`
  (every route stays reachable).
- **The limit:** a person may want something back. It returns through a mockup, or as an E4 a requirement
  forces.

## Consequences
- `screens.test`'s F-018 describe is rewritten.
- E-024's palettes note is answered.
- F-326's colour-page half lapses.
- E-215.
```

# Appendix D: ADR-0148 draft

```markdown
# ADR-0148: Wearable Combinations are the person's own garments the engine ranks best with this colour as a top

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Builds on** | FR-31, FR-32; ADR-0124 (no figure is a match); E-101 (the no-evidence profile); ADR-0103/C7 (no round sample); ADR-0128 D3 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
06 binds three round photographs to `engine:combinations.n`, numbers them 1–3, captions them from
`store:garments.n.name` with a hex, and opens `/wardrobe/[id]`. Nothing defines the ranking. `wardrobePairings`
(ADR-0124) needs a stored profile and asserts a ≥ 60 threshold. `regenerate` ranks owned garments by
`scoreOutfit` against locked pieces.

## Decision
- **D1.** This colour is placed as a top (Wear's `DEFAULT_SLOT`). Each owned garment that fills another slot is
  scored by `scoreOutfit` through the builder's one ranking (`rankForSlot`). The order is highest overall first,
  ties by id. The first three are numbered.
- **D2.** The profile is the stored one, or the no-evidence profile. Only the order is shown: no score, no
  factor, no word of fit.
- **D3.** Each item is its photograph cropped to the drawn circle, or the garment's colour as a rounded `Swatch`
  (E4). The caption is the name (or type) over the hex. A tap opens `/wardrobe/with/[id]`.
- **D4.** Empty states: no garments → 27's wardrobe card (Home's); none rankable → 27's card with *Add a garment*.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| `wardrobePairings` | Nothing without a profile, and a threshold claim on a card that prints none |
| Corpus colours | Not the store binding 06 records; a second *What goes with this* |
| One per slot (`recommendOutfit`) | Two items where 06 draws three |
| A round sample | ADR-0103's ceiling, C7 |

## Evidence, and its limits
- **It rests on:** `06.json`; `builder.ts`; `wear.ts`; E-101.
- **The limit:** without a profile the order is not personal.

## Consequences
- `rankForSlot` is extracted, with E-214.
- `rankingContext` in E-208's module.
- R9 §4 E4 lists the empty states and the photo-less garment.
```

# Appendix E: ADR-0149 draft

```markdown
# ADR-0149: 06's card art is inked at its measured 0.31, and its review seal's green is minted

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Feature** | F-247 |
| **Builds on** | F-229's art measurement (R9 §5), ADR-0110, E-159's mint pattern |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1.** `opacity.artCard` is 0.31: F-229's `inkP90` reading of `06.provenance.art`, on gamma-encoded luma as
  `opacity.art` is. It is read through `Illustration tone="card"`. 15's 0.33 is F-262's.
- **D2.** `glyph.seal` is `#4B9D61` in every palette: `usage: nonText`, paired with nothing, because the words
  beside it carry the status (ADR-0110 §3; rule 13). The element exception is retired and replaced by a token
  group carrying `06.provenance.review`.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| The 0.15 backdrop | Half the drawn ink |
| `foreground.3` at full strength | ≈ 0.58: twice the drawn ink |
| `status.ok` for the seal | A verdict colour: "pass" |
| No green | Departs from ADR-0110 |

## Evidence, and its limits
- **It rests on:** R9 §5 and the manifest's opacity note; C10's census row.
- **The limits:** a JPEG reading carries ΔE00 ≈ 2; the person's comparison judges it.
```

# Appendix F: State drafts

**F-247 `attested`:**

```json
[
  {
    "criterion": "The only departures from mockup 06 (and 26 for ja) are the ones this feature’s notes name, each from R9-MOCKUP-FIDELITY §4 or §6 — nothing is simplified, reordered, restyled or left out beyond them",
    "verifiedBy": "GATED FOR STRUCTURE, ATTESTED FOR APPEARANCE. colour-detail-fidelity.test (order, grouping, every interval, size, corner, step, weight and ink, recomputed from 06.json — and 26.json for the Japanese typography — through §2's snap, negative intervals named) and the 06.screen sweep in both themes and languages. The person's comparison: each difference is a named departure (ADR-0145 to ADR-0149; R9 §4 E1/E2/E3/E4, §6 C3/C19, OQ-19 closed), or is fixed and recaptured, or recorded as a feature.",
    "blocks": "release",
    "status": "outstanding"
  },
  {
    "criterion": "The fidelity harness captures the route beside mockup 06 (and 26 for ja) in both themes and both locales, and a person has compared each pair and recorded the result",
    "verifiedBy": "A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator at 384 dp with a non-debuggable build of the final commit. /atlas/[slug] is captured in Sumi/Washi × en/ja (anchor detail.readout) and composed beside 06 (25 for Washi, 26 for ja). Recorded in progress.md under F-247. Expected and not defects: the entry is a corpus colour, not 06's; the pill says Era: None; the provenance says the classification and the self-review; the cards are taller than drawn; the art sits behind the text's end; Japanese keeps 06's table.",
    "blocks": "release",
    "status": "outstanding"
  },
  {
    "criterion": "Every string is in both catalogues, every drawn action works, and the a11y, contrast and cvd gates pass on the rebuilt surface",
    "verifiedBy": "GATED except the device half: tsc + i18n.test, colour-detail-states.test, bookmarks.test, test:a11y, test:contrast, test:cvd. ATTESTED on the capture's device: an edge tap on each header icon (F-305 for the overlap); the bookmark toggles and is announced; share → card; export → this colour's export; Wear It → Wear; Hold arms the bar and opens the Lens; a combination opens its garment; the action bar stays pinned; at 200 % in en and ja the rows wrap and the drawn-height pill, badges and buttons clip (F-344, recorded); the atlas.yaml journey passes.",
    "blocks": "release",
    "status": "outstanding"
  }
]
```

**Notes on other features:**

| feature | note |
|---|---|
| **F-248** | 06's *Wear It* opens `/atlas/wear/[slug]` |
| **F-253** | 06's share glyph opens the card; the card's share action is yours |
| **F-263** | `/profile/export` reads an optional `slug` (`colourSubject`, E-215); keep it |
| **F-262** | 15's art reads 0.33; F-247 bound 06's 0.31 as `opacity.artCard` (ADR-0149) |
| **F-265** | 06's Japanese keeps the table; the hero kanji takes 26's step (ADR-0146 D5) |
| **F-267** | the art over the text; the page's height; the stack |
| **F-305** | 06's three header icons at a 33 dp pitch (`targetRoom`, E-216) |
| **F-326** | the colour page's vision block is gone; 15 and 08 remain |
| **F-343** | 06's hero has no action |
| **F-344** | 06's pill (`wrap` added), rank badges, action buttons |
| **F-345** | the hero's and the combinations' swatch names in Japanese |

**PRD §10:** OQ-19's row is removed, and a closing paragraph is added in OQ-14's shape.

**R9 §11 Closed row:** OQ-19: *"06's screen is its upper panel; the cards and the action bar drawn wider are fitted to it, the art behind the provenance text"*, ADR-0145.

**Files a reader will want:**

- E:\JCFIP\apps\mobile\src\screens\ColourDetail.tsx
- E:\JCFIP\apps\mobile\app\(tabs)\atlas\[slug].tsx
- E:\JCFIP\apps\mobile\app\(tabs)\profile\export.tsx
- E:\JCFIP\apps\mobile\src\bookmarks.tsx
- E:\JCFIP\mockups\inventory\06.json
- E:\JCFIP\mockups\inventory\26.json
- E:\JCFIP\mockups\tools\inventory-data\06.mjs
- E:\JCFIP\mockups\tools\inventory-data\26.mjs
- E:\JCFIP\apps\mobile\test\screens.test.tsx
- E:\JCFIP\apps\mobile\test\bookmarks.test.tsx
- E:\JCFIP\apps\mobile\test\chrome.test.ts
- E:\JCFIP\apps\mobile\test\inventory.ts
- E:\JCFIP\packages\ui\src\AppBar.tsx
- E:\JCFIP\packages\ui\src\Chip.tsx
- E:\JCFIP\packages\ui\src\Illustration.tsx
- E:\JCFIP\packages\ui\src\ReadoutTable.tsx
- E:\JCFIP\docs\design\design-system.manifest.json
- E:\JCFIP\packages\design-tokens\test\type-scale.test.ts
- E:\JCFIP\.harness\verification\type-census.json
- E:\JCFIP\scripts\verify-token-reach.mjs
- E:\JCFIP\apps\mobile\src\outfit\builder.ts
- E:\JCFIP\apps\mobile\src\wear.ts
- E:\JCFIP\apps\mobile\src\wardrobe\coverage.ts
- E:\JCFIP\apps\mobile\src\engine.ts
- E:\JCFIP\apps\mobile\src\export\subject.ts
- E:\JCFIP\.harness\verification\inventory-surfaces.json
- E:\JCFIP\apps\mobile\e2e\journeys\atlas.journey.json
- E:\JCFIP\apps\mobile\e2e\capture\routes.json
