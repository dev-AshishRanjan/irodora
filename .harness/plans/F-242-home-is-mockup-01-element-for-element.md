# Plan: F-242 — Home is mockup 01, element for element

| | |
|---|---|
| **Feature** | F-242 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, FR-73. Also applied: FR-23, FR-24, FR-42, NFR-8, NFR-9, NFR-21, NFR-25 |
| **Service / package** | `apps/mobile` · `@irodora/ui` (one new component, two small additive changes) |
| **Author** | The planner subagent's design (read-only; nothing was built or run), decided and edited by the implementing session — its edits are under *Implementing session's decisions* below |
| **Date** | 2026-10-20 |
| **Decisions** | ADR-0137 (closes OQ-11), ADR-0138 (Home's bindings; amends F-337), ADR-0139 (closes OQ-14) |

---

## Intent

Home is rebuilt so that a person opening Irodora sees mockup 01. That means:

- 01's lockup and three proposition lines, with the on-device pill;
- the day's corpus colour at size, its names and coordinates set on the sample, and *What Goes With This →*;
- the Wardrobe Preview: a count pill and the five newest garments, each with its texture badge where a material is recorded;
- the day's colour card, with its real classification and provenance;
- 01's tab bar.

It renders in Sumi and Washi (25's palette), in English and Japanese. Nothing is copied from the drawing: every value comes from the corpus, the store or the engine.

"Done" for a person: Home looks like 01 on a 384 dp phone, says only true things, and every drawn control works.

---

## Findings from planning

All of these come from reading the code. None was run.

1. **01 draws no "last reading".** Both its hero and its colour card bind the corpus:
   - `01.hero.sample*` binds `corpus:entry.*`. The `01.mjs` comment says the hero is "a corpus colour, its names and its coordinates on the sample".
   - `01.colour-card.*` also binds `corpus:entry.*`, under *"Today's … Color Card"*.
   - 25 binds the same hero to `corpus:today.*`.
   - R9 §8 row 01 binds the hero OKLCh to "corpus derivation".
   - The sample in 01's colour card is the hero's colour.
2. **The only stored readings are garment colours.**
   - `apps/mobile/test/provenance.test.ts:110–114`: *"`saveColor` has no callers in the app, and the two writers are the wardrobe (`estimated`) and the corpus (`reference`)"*.
   - `colourFromReading` (`apps/mobile/src/wardrobe.ts:171`) is reached only through `createGarment`.
   - `savePalette` writes corpus `reference` rows.
   - So F-337's "newest row" is either a Lens-read garment colour or a palette/garment corpus colour. The reading sources are `CAPTURED_SOURCES` (`'calibrated' | 'estimated'`, `@irodora/color-core`). Only `estimated` is ever written.
3. **`/atlas/with/reading/[id]` has exactly one way in: Home** (`app/(tabs)/index.tsx:54`). The drawn way in is 03's *Wear It* (`03.actions.wear`, `navigate:/atlas/with/reading/[id]`), which is F-244's. `verify-reachability` fails on an undeclared orphan (`scripts/verify-reachability.mjs:255–277`).
4. **The inventory's keys and routes do not all exist.**
   - `static:tabs.*`: the catalogue has `tab.*`.
   - `static:home.tagline`, `home.wardrobePreview` and `home.colourCard` do not exist.
   - `home.whatGoesWithThis` exists as `home.whatGoesWith`.
   - `navigate:/wardrobe/[id]` (the tiles) names no route; `mockups/index.json` has none. The only route keyed by a garment id is `/wardrobe/with/[id]` (24).
   - A derived `static:` locator whose key is missing would throw in `count()` (`apps/mobile/test/inventory.ts`), so those elements need explicit locators.
5. **Closing OQ-11 forces a rebind.** `verify-mockups` refuses an `oq:` binding that names a closed question (its proof case "a binding waiting on a question nobody asked"). 01's five badges and 25's three bind `oq:OQ-11`, so they must be rebound in the same change.
6. **`Screen`'s `gap` separates nothing on any screen.** `layout.tsx:466–471` wraps the whole content in ONE `<Appear>`, and `motion.tsx:350`'s `Animated.View` carries no gap. The content container's `gap` therefore separates a single child. This is a latent defect across all screens, out of scope here, and must be recorded (rule 5) as F-342 (draft in Appendix D). Home composes its own rhythm with `Stack`.
7. **The e2e anchors would break.** `apps/mobile/e2e/capture/routes.json` (`/` anchor) and `e2e/journeys/atlas.journey.json` step 2 assert `home.what1`.
   - Maestro text selectors match the element's **whole** text (docs below).
   - 01's tagline is one element of three lines, so line 1 alone would not match. `generate-e2e-flows.mjs:437–441` also refuses a selector containing a line break.
   - So the anchor moves to `home.onDevice`.
8. **A cleared-app capture would not show 01's wardrobe.** `fidelity:capture --erase-app-data` would show Home's first run (27's card), so the person could not compare the tiles, badges or count. The `/` capture spec needs steps that populate it (the DSL supports steps, as `/wardrobe/with/[id]`'s spec does).
9. **Tests that read Home today:**
   - `screens.test.tsx:3340–3353` uses first-run Home as the "no tabular figures" decoy. The rebuilt first run prints OKLCh, so the decoy must move.
   - `screens.test.tsx:1081–1145`: the Home subjects. Their fixture rows are `source: 'declared'`, which is F-337's defect inside the fixture.
   - `:3003` (A11 headings) and `:2727` (device-accent subjects).
   - `.harness/verification/screen-insets.json` pins Home's paddings.
   - `apps/mobile/test/home.test.ts` and `home-states.test.tsx` test `lastReading`, `homeLead` and `isFirstRun`.
10. **`Illustration` cannot draw the backdrop in `foreground`.** Its type (`Illustration.tsx:601–606`) admits only `foreground.2 | .3`. But R9 §5 says the backdrop art is "the `foreground` token at a declared opacity" (0.15), and the component's own docblock says `foreground` is allowed as a backdrop. Home is the first backdrop consumer.
11. **Two `Chip` badge problems.** `Chip`'s badge sets `alignSelf: 'flex-start'` (`Chip.tsx:223`), so in a row it must be wrapped to align. At its default `label` (14) the text of 01's pills would overflow their drawn widths: 160 dp for 32 characters, 143.5 for 30. The pills are drawn at the caption step.
12. **Five 52 dp tiles do not fit narrow phones.** With 01's insets they overflow 360 and 320 dp (`verify-viewport.mjs` supports 320).
13. **`material` and `pattern` are free text** (`StoredGarment`; the Wardrobe editor's hint is *Wool, cotton, linen*). F-256 builds 12's chips: Linen, Cotton, Wool, Silk, Denim (`static:garment.material.*`).
14. **OQ-14 (page inset) is still open.** Its R9 §11 row names F-227, which is done. F-242 needs it, and F-230's note already places the lockup "on the 36.5 dp gutter".
15. **Do not record the pills' em as `raw.emDp`.** `type-scale.test` recomputes the `caption` step as the median of every `raw.emDp` below 12 dp. Adding the two pills' ems there could move the median, which is a token change.
16. **Home's three `Appear index` wrappers** (F-188) are motion 01 does not imply (ADR-0133 D1). F-266 left Home out of scope.
17. **A stale sentence in the docs.** `docs/architecture/data-model.md:282–283` says Home reads the newest `saved_color` row as the last reading.
18. **F-146 has an outstanding, release-blocking attestation** that names "what was read" (criterion 2). F-164 and F-202 have outstanding attestations about Home's composition too.

---

## Decisions

Every one is taken under R9 §11's 2026-10-05 delegation: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–13 are not reopened. The full ADR drafts are in the appendices.

### D-1 — OQ-11: the texture badge means "a material is recorded" (ADR-0137)

**Recommendation.**
- `TextureBadge` is a new `@irodora/ui` component, because the inventory names `new:TextureBadge` and the sweep finds `new:`/`ui:` components among the library's exports.
- It is drawn as 01 draws it: one uniform woven-check mark, 14 dp (the median of the five drawn boxes), at the tile's bottom-right, inset `xs`.
- Its single ink is the one text on that sample takes (`sampleInk`, ADR-0116), so it clears 4.5:1 against the sample, above WCAG 1.4.11's 3:1 for a graphic.
- It is present if and only if the garment's `material`, trimmed, is non-empty. Otherwise it is absent: no placeholder, no "unknown".
- It is decorative to assistive technology. Its meaning is in words: the tile's accessible name carries *Material \<value\>* (`browse.material`).
- 01's and 25's badges are rebound to `store:garments.N.material`.

**Why.**
- The README calls them "fabric weave indicators", and 25's callout says "Woven texture badge".
- `material` is the fabric fact the product actually holds, and E2 says a drawn element keeps its shape and takes a defined value.

**Alternatives.** Leaving it out, per-material weaves, a photograph mark, a provenance mark, and a pattern mark were all rejected. The costs are in ADR-0137.

**Limits.**
- A sighted person learns that a material is recorded, not which one; 01 prints no word.
- Most of today's garments have no material until F-256 lands.

### D-2 — Home leads with the day's corpus colour and draws no reading (ADR-0138)

**Recommendation.**
- **The hero is always `colourOfTheDay(now)`.** Kanji, kana, the name line and OKLCh are set on the sample through `Text on`. *What Goes With This →* opens `/atlas/with/[slug]`.
- **Home draws no "Last reading" block.**
  - `lastReading` and `homeLead` are deleted.
  - `HomeStore` is narrowed to `listGarments()`, so Home reads no `saved_color` row except a garment's own colour.
  - A Lens-read colour stays on Home as its garment's tile, announced with its stored provenance ("estimated, N percent confidence"). Its tile opens `/wardrobe/with/[id]`, 24's route for the same colour, where "Estimated from a capture" is that route's case (C16).
- `/atlas/with/reading/[id]` is declared in `.harness/verification/unreachable-routes.json` with `closedBy: "F-244"`.

**Why this reading of an ambiguous record.** F-242's notes (from F-236 and F-237) presume a reading block survives. The binding facts do not allow one:
- Acceptance 2 requires §8's binding, and §8 binds the hero's OKLCh to the corpus derivation.
- A reading has no kanji, kana or name (`colourFromReading` names it by its hex). Putting it in the hero would empty three of four drawn texts, a departure in no §4 category (§1: "There is no discretionary category").
- A separate reading card is an undrawn block (acceptance 3). ADR-0135 and ADR-0136 both rejected sections on Home as "the most-seen, fully drawn screen".

**Alternatives and costs** are tabulated in ADR-0138. In short:
- reading in the hero: criterion 2 fails and copy structure departs;
- an added card: criterion 3 fails;
- the reading in the colour card: its bindings and heading are the corpus's.

**The cost of the chosen reading.**
- The "last reading" shortcut leaves Home.
- The reading route is unreachable until F-244.
- F-164's "a reading leads" is superseded.

### D-3 — The absences (ADR-0138 D3)

- Home has one absent condition: the wardrobe panel's. `STATES` stays `{ absent: 'empty' }`.
- An empty wardrobe draws 27's card where Home is given the Lens (*Scan First Garment* opens the Lens), and 00's caption (`home.wardrobeEmpty`, `resolvedHere`) otherwise. Either takes `01.wardrobe`'s slot, between the hero and the colour card.
- With no reading panel there is no "no readings" condition (ADR-0129 D1: a condition belongs to a panel), so `home.noReadings*` and `home.takeReading` go.
- The `onAddGarment` middle branch goes too. F-236's note names only the two forms, and the route always passes the Lens.

### D-4 — The colour card (ADR-0138 D4)

- **Heading (E1, FR-23):**
  - en `home.colourCard` = **"Today's Japanese-Inspired Colour"** (32 characters against the drawn 30).
  - ja = **「日本に着想を得た今日の色」**.
  - "Card" is dropped so the heading keeps the drawn length, the constraint E1 states. The 37-character alternative wraps at `body` 500 in the ≈ 216–224 dp the row leaves.
  - A test holds the static heading true: every published entry's `classification` is `japanese-inspired`. Its decoy is a planted `traditional` entry, which makes the test fail.
- **Note:** `corpus:entry.provenance.note` resolves to the entry's own `provenance.source`, verbatim, set in Latin in both locales. It is a citation, printed raw just as ColourDetail prints `prov.source`. For all 120 entries it is "Irodora editorial curation — seed corpus, 2026" (checked), and it fits the drawn two lines.
- **Sample:** 52 × 40, `sm`, with the keyline.
- **No action**, because the inventory records none.

### D-5 — The tiles (ADR-0138 D5)

- Up to five live garments, newest first (`wardrobeSummary`).
- Each tile is `Swatch size={tile}` with `colorOf(g.color)`, which carries its provenance.
- Its accessible name is `garmentTileName(g)`: the garment's name or type, its colour's name, and *Material \<value\>* where recorded.
- Its action is `onOpenGarment(g.id)` → `/wardrobe/with/[id]`. The tiles' inventory `action` in `01.mjs` and `25.mjs` is corrected to `navigate:/wardrobe/with/[id]`.
- **Tile side:**
  - `wardrobeTileSize(windowWidth) = min(52, floorHalf((width − 2·xl − 2·md − 4·xs)/5))`.
  - That gives 52 at 384 dp, 49.5 at 360 and 41.5 at 320, so the drawn single row of five survives every supported width.
  - With five tiles the row is `justify="between"`, which gives 7 dp gaps at 384 against 6.25 drawn. With fewer than five it is `gap="sm"`, left to right.

### D-6 — The count pill (ADR-0138 D6)

- Text: `N Garments • M Valid Outfits`, with `M = coverage(placeable, context).valid`, counted at `COVERAGE_THRESHOLD`.
- The threshold goes into the badge's accessible `name` (`… shopping.countedAt 60`).
- English singular forms take their own keys, so a person never reads "1 Garments".
- With no stored profile, `coverage()` has nothing to count against, so the pill prints **the garment count alone**. That is a new E2 row: "a figure the product cannot compute in this condition; none is invented".
- The route computes the coverage through one shared helper, `apps/mobile/src/wardrobe/coverage.ts#wardrobeCoverage`, which the Wardrobe route switches to as well, so there is no third copy of the context assembly.
- It is coverage, not the lookbook (ADR-0136).

### D-7 — Header copy (ADR-0138 D7)

- **The tagline uses 01's words:** "What colour is this. / What goes with it. / Does it suit me."
  - `home.what3` changes from "Whether it suits you." The ja keeps 「自分に似合うか。」.
  - It is ONE `Text`: `body`, `face="serif"`, `heading`, the three keys joined with `'\n'` children. Japanese resolves to the gothic (C6).
- **The pill reads "100% On-Device Engine • Offline"**, ja 「100%端末内エンジン • オフライン」, as drawn.
  - It is true under ADR-0051: no server, no API.
  - It is the same claim the shipped splash subline makes ("100% On-Device & Offline"), and it is no E2 row.
  - The claims lint has nothing on it: `near-misses.md` already keeps "100%オフラインなので安全" and "Data is 100% safe on your device". Both new lines are added to `near-misses.md` as a guard.
- **The CTA:** en "What Goes With This", ja keeps 「この色に合う色」. That matches the destination's own title, `combos.title`; 25's Japanese line is not governing (P2: palette only).

### D-8 — OQ-14: page inset (ADR-0139)

- Each screen's page inset is its own governing mockup's, snapped like every interval (§2).
- 01's 36.5–37 dp snaps to `xl` (32; 48 is 11.5 away), so Home uses `Screen padding="xl"`.
- Other screens apply theirs when their own features rebuild them (18 → `md`; 20 → `md` on the tie rule).
- `Screen`'s default (`lg`) is not changed here.
- Cost: content is 320 dp wide at 384 against the drawn 310.5–311 (3 %), and the lockup's ink sits 4.5 dp left of 01's.

### D-9 — Motion

- Home's three `Appear index` wrappers are not rebuilt. ADR-0133 D1 admits motion only where a drawing implies it, and 01 implies none.
- `Screen`'s own entrance is untouched.
- No new ADR: this applies ADR-0133.

### D-10 — F-337: the cleanest honest split

- **F-242 writes all of the code.** The block is rebuilt here, and removing it removes the defect.
  - Removing the block: `lastReading` is deleted and `HomeStore` reads garments only.
  - F-242 also carries the decoy tests: `home-states.test.tsx › 'no stored colour is presented as a reading (F-337)'` and `› 'with no garment at all, no colour but the day's (F-337)'`.
- **ADR-0138 amends F-337's acceptance in the open**, as ADR-0135 and ADR-0136 amended F-237's and F-238's criteria. The new text is in Appendix D.
- **F-337 is kept `todo` with `blockedBy: ["F-242"]`.** When the loop claims it, its plan is verification only: run its gates (state, typecheck, lint, format, test, a11y, contrast), cite the tests and the commit, and close it `done`.
- F-242 never marks F-337 done (rule 2).

---

## Implementing session's decisions on this design

Checked against the code before adoption (2026-10-20): `layout.tsx` wraps `{header}{children}` in one `<Appear>` (F-342's cause, confirmed by reading); `saveColor` has no caller under `apps/mobile/src` or `app/`; the Wardrobe route returns no coverage without a stored profile; the splash already ships *"100% On-Device & Offline"* (`brand.splashSubline`). Adopted as written, with two edits:

1. **The shared coverage helper is a context, not a result.** The Wardrobe route needs the same context for `gaps()` as for `coverage()`, so `src/wardrobe/coverage.ts` exports `placeableGarments(garments)` and `coverageContext(stored)` (`undefined` without a profile). Both routes call them: Home's route calls `coverage(placeableGarments(…), ctx)`, and the Wardrobe route keeps its `coverage` and `gaps` calls over the shared context. E-208's guard reads that neither route assembles a context of its own (no `engineProfile(` or `referenceSet(` in either route file). `shopping.tsx` is left as it is (out of scope).
2. **The Japanese count is composed without a space.** `wardrobeCountLabel` joins a figure to its counter with no space in Japanese (「14点 • 38通りの有効なコーディネート」 as built — 点, the general counter, since the review's M3: 着 does not count shoes or trousers) and with one in English, through the `script` the screen already has; the tests cover both.

Everything else — D-1 … D-10, the increments, the tests and the attestations — is the design below.

---

## Approach

### Reused

**`@irodora/ui`:**
- `Screen` (`padding="xl"`), `Stack`, `Row`;
- `Card` (`level="1"`, `testID`);
- `Swatch` (`width="fill"`, `height`, `size`, `keylineWidth`, `corner`, `children`, `onPress`);
- `Text` (`on`, `face="serif"`, `weight`, `numeric`, `heading`, `script`);
- `Chip` (`form="badge"`, `height`, `size="caption"`, `numeric`, `name`, `testID`);
- `Button` (`glyph="arrow-right"`, `height`, `radius="pill"`);
- `Wordmark form="app" heading` (F-230);
- `Illustration name="plum-branch" tone="backdrop"`;
- `EmptyState` (both forms);
- `sampleInk` (ADR-0116), `nativeSpacing` and `nativeRadius`;
- `TabBar` through `apps/mobile/src/tabBar.tsx#AppTabBar` and `src/tabs.ts#TABS`;
- `STATE_TEST_IDS`.

**`apps/mobile/src`:**
- `home.ts` (`colourOfTheDay`, `entrySwatch`, `wardrobeSummary`, adapted);
- `wardrobe.ts#colorOf`;
- `corpus` (`allEntries`, `colorFor`, `PublishedEntry`);
- `outfit/builder` (`slotFor`, `engineProfile`);
- `profile/store` (`activeProfile`, `toWorking`);
- `rules#ruleSet`, `rules/generated/weights#WEIGHTS_TEXT`, `wardrobe/reference#referenceSet`;
- `i18n/useMessages`.

**Other packages:** `@irodora/optimization#coverage` and `COVERAGE_THRESHOLD`; `@irodora/recommendation` (`outfitWeights`, `parseWeightContent`); `@irodora/color-core#CAPTURED_SOURCES` (in tests only, to classify a swatch as a reading).

**Catalogue keys kept:**
- `home.what1–3`, `home.onDevice` (new value), `home.wardrobeEmpty`;
- `wardrobe.empty.*`;
- `browse.material`, `shopping.countedAt`, `coord.oklch`;
- `tab.*`.

**Tests and tools:**
- `apps/mobile/test/inventory.ts` (`elementFindings`, `Locator`);
- `screens.test.tsx` (`draw`, `drawLive`, `ENROLLED`, the decoy helpers, the screen-insets pin);
- `@irodora/ui/testing` (`renderedTexts`, `drawsSomething`);
- `mockups/tools/generate-inventory.mjs`, `scripts/generate-e2e-flows.mjs`, `scripts/generate-font-subset.mjs` (only if needed), `pnpm fidelity:capture`.

### New

- **`packages/ui/src/TextureBadge.tsx`**:
  - exports `TextureBadge`, `TEXTURE_BADGE` (14) and `TextureBadgeProps { on: Sample; size?: number; testID?: string }`;
  - draws an SVG woven checker in one ink, `paint(sampleInk(on.hex, source).hex)`;
  - corner `min(nativeRadius.sm, floor(0.25·size))`;
  - is hidden from accessibility, with `pointerEvents="none"`.
- **`packages/ui/src/TabBar.tsx`**: `export const TAB_INDICATOR_TEST_ID = 'tab-bar.indicator'`, set on the **active** item's indicator `View` only. This is the one way `01.tabs.indicator` (no component, no binding) can be located.
- **`packages/ui/src/Illustration.tsx`**: a backdrop may take `color: 'foreground'`. It stays refused for a figure, which a `@ts-expect-error` test holds.
- **`apps/mobile/src/home.ts`**, new pure functions:
  - `recordedMaterial(g)`, `heroName(entry)` (capitalised romaji, then the English in brackets);
  - `oklchLine(oklch, unit)` = `` `${unit} ${L.toFixed(3)} • ${C.toFixed(3)} • ${h.toFixed(1)}°` ``;
  - `wardrobeCountLabel(count, coverage, t)`, `garmentTileName(g, t)`, `wardrobeTileSize(width)`;
  - the constants `HOME_TILE = 52`, `HOME_HERO = 172` and `HOME_ART`, the three art placements in frame dp;
  - `homeContent(garments, now)`, which no longer takes colour rows.
- **`apps/mobile/src/wardrobe/coverage.ts#wardrobeCoverage(garments, stored): Coverage | undefined`**.
- **Catalogue keys**, en / ja:

| key | en | ja |
|---|---|---|
| `home.whatGoesWithThis` (renames `home.whatGoesWith`) | What Goes With This | この色に合う色 |
| `home.wardrobePreview` | Wardrobe Preview | 衣装のプレビュー |
| `home.colourCard` | Today's Japanese-Inspired Colour | 日本に着想を得た今日の色 |
| `home.countGarment` | Garment | 着 |
| `home.countGarments` | Garments | 着 |
| `home.countOutfit` | Valid Outfit | 通りの有効なコーデ |
| `home.countOutfits` | Valid Outfits | 通りの有効なコーデ |

- **Catalogue values changed:**
  - `home.onDevice`: en "100% On-Device Engine • Offline", ja 「100%端末内エンジン • オフライン」;
  - `home.what3`: en "Does it suit me."
- **Catalogue keys removed**, from both catalogues: `home.lastReading`, `home.noReadings`, `home.noReadingsTitle`, `home.noReadingsBody`, `home.takeReading`, `home.wardrobe`, `home.wardrobeCount`, `home.addGarment`, `home.today`, `home.todayNote`, `home.whatGoesWith`.
- **ADR-0137, ADR-0138 and ADR-0139.** The next free number is 0137; `docs/adr` ends at 0136.

### The composition, as a sketch

```tsx
<Screen padding="xl" script={script}>
  <ArtLayer />  {/* absolute top/left/right = -xl, bottom 0, overflow hidden; pointerEvents none; 3 × Illustration plum-branch backdrop at HOME_ART boxes (frame dp; right-side ones anchored by `right`) */}
  <Stack gap="md">
    <Stack gap="md">                       {/* 21.5 dp ink gap less the serif line box's top inset ≈ md (ADR-0128 D2 method) */}
      <Wordmark form="app" heading />
      <Row align="end" gap="md" wrap>
        <Text size="body" face="serif" color="foreground" script={script} heading>{what1}{'\n'}{what2}{'\n'}{what3}</Text>
        <View><Chip form="badge" label={t('home.onDevice')} height={20} size="caption" script={script} testID="home.onDevice" /></View>
      </Row>
    </Stack>
    <Stack gap="xs">                       {/* card gaps 7.5 and 5.5 dp: siblings drawn alike, a tie, so the smaller (§2) */}
      {today && <Card level="1" testID="home.hero">
        <Stack gap="sm">
          <Swatch width="fill" height={172} keylineWidth={2.5} name={today.entry.name.en} {...entrySwatch(today)}>
            <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: md, paddingBottom: sm }}>
              <Text size="title" on={s} script="japanese" weight={400}>{kanji}</Text>
              <Text size="label" on={s} script="japanese">{kana}</Text>
              <Text size="label" on={s} weight={500}>{heroName(entry)}</Text>
              <Text size="label" on={s} numeric>{oklchLine(entry.derived.oklch, t('coord.oklch'))}</Text>
            </View>
          </Swatch>
          {onOpenCombinations && <Button label={t('home.whatGoesWithThis')} glyph="arrow-right" height={35.5} radius="pill" script={script} onPress={() => onOpenCombinations(today.entry.slug)} />}
        </Stack>
      </Card>}
      {wardrobe.count === 0 ? <EmptyState …27 card or 00 caption… /> :
       <Card level="1" testID="home.wardrobe">
         <Stack gap="md">
           <Row justify="between">
             <Text size="body" weight={500} color="foreground" heading script={script}>{t('home.wardrobePreview')}</Text>
             <View><Chip form="badge" height={18} size="caption" numeric script={script} label={…} name={…} /></View>
           </Row>
           <Row {...(n === 5 ? { justify: 'between' } : { gap: 'sm' })}>
             {garments.map(g => <Swatch key size={tile} name={garmentTileName(g, t)} hex color onPress>
                {recordedMaterial(g) && <View style={{ position: 'absolute', right: xs, bottom: xs }}><TextureBadge on={{hex, color}} /></View>}
             </Swatch>)}
           </Row>
         </Stack>
       </Card>}
      {today && <Card level="1" testID="home.colourCard">
        <Row align="start" gap="md">
          <View style={{ flex: 1 }}>
            <Text size="body" weight={500} color="foreground" heading script={script}>{t('home.colourCard')}</Text>
            <Text size="label" color="foreground.2" script="latin">{today.entry.provenance.source}</Text>
          </View>
          <Swatch width={52} height={40} name hex color />
        </Row>
      </Card>}
    </Stack>
  </Stack>
</Screen>
```

**Interval readings behind the sketch** (§2's snap; ink gaps less the text box's own inset, as in ADR-0128 D2):
- card padding `md`, from the 12.5–13 dp box insets;
- sample to CTA: 11.5 → `sm`;
- CTA to the card's foot: 17 → `md`;
- header to hero: 16.5 → `md`;
- title row to tiles: 13–15.5 → `md`;
- tagline to pill: 18 → `md`;
- the on-sample block's left 14 → `md`, and its bottom 14.5 less the label line box ≈ 8 → `sm`.

`home-fidelity.test` recomputes each from `01.json`, with the inset it subtracts written out.

### Increments

Each increment's commit passes Tier 1 (ADR-0132): `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, and `pnpm turbo run test --filter='...[HEAD]'`, plus the domain gates listed against it.

0. **Claim.**
   - Write this plan to `.harness/plans/F-242-home-is-mockup-01-element-for-element.md`.
   - Set F-242 to `in_progress`, set `"plan"`, and declare the two `attested` entries (Appendix D).
   - Gates: `node scripts/verify-state.mjs`, format.
1. **Decisions and the specification.**
   - Write ADR-0137, 0138 and 0139.
   - PRD §10: remove the OQ-11 and OQ-14 rows and add their closing paragraphs.
   - R9 §11: move OQ-11 and OQ-14 to *Closed*.
   - R9 §4 E2: add the new row (the count without a profile).
   - R9 §2 "Not design": add the scroll cut (see Mockup fidelity).
   - In `mockups/tools/inventory-data/01.mjs` and `25.mjs`:
     - badges: `binding: store:garments.N.material`;
     - 01's badges: `raw: { cells… }`, read off the five 28 px crops;
     - tiles: `action: navigate:/wardrobe/with/[id]`;
     - `01.header.chip` and `01.wardrobe.count`: `type: text('sans', 'caption')`, with **no `raw.emDp`** (the census, finding 15); the measured em goes in a comment.
   - Regenerate `01.json` and `25.json`.
   - `feature_list.json`:
     - F-242's notes: add the E2 departure, and record that the scroll cut is §2's;
     - F-337: new acceptance, `blockedBy ["F-242"]`, a note;
     - notes on F-244, F-255, F-256, F-259, F-146, F-164 and F-202;
     - add F-342 to backlog.
   - Gates: Tier 1. `verify-mockups`, `verify-state` and the inventory `--check` run in lint. `type-scale.test` and the tab-bar tests read `01.json`.
2. **`@irodora/ui`.**
   - Add `TextureBadge`, its export, two conformance subjects (on `#F0EDE6` and `#87795D`, as `FabricSwatch`'s) and `texture-badge.test.tsx`.
   - Add `TAB_INDICATOR_TEST_ID`, with a case in `packages/ui/test/tab-bar.test.tsx`.
   - Let a backdrop take `foreground`, with a case in `illustrations.test.tsx`.
   - Gates: Tier 1, `pnpm test:a11y`, `pnpm test:contrast`.
3. **Pure logic, with no screen change yet.**
   - Add the new `home.ts` functions alongside the old ones.
   - Add `src/wardrobe/coverage.ts` and switch `app/(tabs)/wardrobe/index.tsx` to it. Keep the two `lookbook=` lines `lookbook.test` asserts from source.
   - Add the new catalogue keys and their ja values.
   - Run `node scripts/verify-font-coverage.mjs`. If it names missing codepoints (効, 着, 想 and 得 are likely), re-cut with `node scripts/generate-font-subset.mjs` and re-run `fonts.test`, as F-222 and F-231 did.
   - Add the `home.test.ts` additions and `wardrobe-coverage.test.ts`.
   - Gates: Tier 1 and `verify-font-coverage`.
4. **The screen.**
   - Rebuild `Home.tsx`.
   - Route `app/(tabs)/index.tsx`: `coverage`, `onOpenCombinations(slug)`, `onOpenGarment(id)`, `onOpenLens`; `onOpenColour` and `onAddGarment` go.
   - Delete the old `home.ts` exports and the removed keys.
   - Rewrite `home-states.test.tsx`, including the F-337 decoys.
   - `screens.test.tsx`:
     - the Home subjects take the new fixture (below), plus a new subject `screens/Home (a wardrobe, no profile)`;
     - the figures decoy moves to `screens/Wardrobe (nothing in it)` (assert first that it renders text);
     - the A11 test is updated.
   - Re-capture only Home's entries in `screen-insets.json` through its own `capture()`, with a `$comment` sentence.
   - e2e: change the `/` anchor and journey step 2 to `home.onDevice`, then run `node scripts/generate-e2e-flows.mjs`.
   - Add the `unreachable-routes.json` entry.
   - Add the two `near-misses.md` lines.
   - Update the `data-model.md` sentence.
   - Gates: Tier 1, a11y, contrast, `verify-reachability`, `verify-route-targets`, `generate-e2e-flows --check`, `verify:claims`.
5. **Enrolment.**
   - `inventory-surfaces.json`: add `"01.screen"` to `enrolled`, and make `25.screen`'s reason past tense ("its layout is 01's, swept in Washi as 01.screen (F-242)").
   - Add the `ENROLLED` entry with 17 explicit locators (see Test plan) and the F-242 decoys.
   - Commit the regenerated `conformance-sweep.json`.
   - Gates: Tier 1 and `verify-mockups`.
6. **Criterion 1's own assertion.** Add `apps/mobile/test/home-fidelity.test.tsx`, which checks order, grouping and proportion from `01.json`. Gates: Tier 1.
7. **Capture spec, effects and memory.**
   - `routes.json` `/` gains steps: five garments added through `/wardrobe/add` by the Atlas pick path (as `/wardrobe/with/[id]`'s steps do), three given a material through the Wardrobe editor, then `openRoute (tabs)/index.tsx`, the anchor and the screenshot. Regenerate the flows.
   - `effects.json` and `memory/effects`: the updates and new links (below).
   - Gates: Tier 1, `verify-state`, `generate-e2e-flows --check`.
8. **Verify, review and record.**
   - Run Tier 2, then the evaluator once.
   - Fix its findings or record them as backlog features, then run Tier 2 again on the final tree.
   - Record `progress.md` and `feature_list.json`: F-242 `done`, its attestations `outstanding`.
   - Capture the lessons and checkpoint.

---

## Mockup fidelity

- **Governing:** `01` (P1).
- **Variants:** `25` for the light palette only (P2, C2; its caps lockup, circle sample, photo tiles, page dots and header rule are not adopted), and `27` for state content (P2: the empty wardrobe).
- **Conflicts applied:** C1 (01's tab bar, *Lens*), C2, C4 (01's lockup), C6 (sans kanji; the ja tagline in the gothic), C7 (rounded square), C8 (text on the sample), C11 (samples on tinted cards), C20 (the README keyline, 2.5 dp on the hero).

### Inventory, element by element

The locator column says how the sweep finds the element: "derived" means `derivedLocator`'s own reading of the record; "explicit" means a locator given in `ENROLLED`.

| # | element | built as | bound to | sweep locator |
|---|---|---|---|---|
| 1 | `01.header.line-art` | `Illustration plum-branch tone="backdrop" color="foreground"`, width 148.5, `right:0 top:7.5` in the art layer | — | derived: illustration ×3 |
| 2 | `01.header.lockup` | `<Wordmark form="app" heading />`, first child of the header column (E-173) | — | derived: Wordmark |
| 3 | `01.header.mark` | inside the Wordmark | — | derived: Mark |
| 4 | `01.header.wordmark` | inside the Wordmark | — | explicit value `'Irodora'` |
| 5 | `01.header.tagline` | one `Text body serif heading`, three lines | `home.what1–3` | explicit value: the three joined |
| 6 | `01.header.chip` | `Chip badge h20 caption`, wrapped, row aligned `end` | `home.onDevice` | derived text |
| 7 | `01.side-art-right` | plum-branch backdrop, 120 wide, `right:-84 top:140` (clipped) | — | derived (shared) |
| 8 | `01.hero` | `Card level 1`, padding `md`, `testID home.hero` | — | explicit testID |
| 9 | `01.hero.sample` | `Swatch width fill height 172 keylineWidth 2.5 corner sm` | today: `derived.hex`, `colorFor` | derived Swatch ×7 |
| 10 | `.kanji` | `Text title gothic 400 on={s}` | `name.kanji` | explicit value |
| 11 | `.kana` | `Text label gothic on={s}` | `name.kana` | explicit value |
| 12 | `.name` | `Text label 500 on={s}` | `heroName`: romaji (English) | explicit value |
| 13 | `.oklch` | `Text label numeric on={s}` | `oklchLine(derived.oklch)` | explicit value |
| 14 | `01.hero.cta` | `Button primary h35.5 pill glyph arrow-right` | `home.whatGoesWithThis` → `/atlas/with/[slug]` | derived text |
| 15 | `01.side-art` | plum-branch backdrop, 218 wide, `left:-182 top:421` | — | derived (shared) |
| 16 | `01.wardrobe` | `Card level 1`, `testID home.wardrobe` (or 27's card when empty) | — | explicit testID |
| 17 | `.title` | `Text body 500 heading` | `home.wardrobePreview` | derived text |
| 18 | `.count` | `Chip badge h18 caption numeric`, wrapped | count + `coverage().valid` | explicit value: `wardrobeCountLabel` |
| 19–23 | `.tile-1…5` | `Swatch size {tile} corner sm keyline`, `onPress` → id | `garments[N].color` | derived Swatch (shared) |
| 24–28 | `.tile-N.badge` | `TextureBadge on={tile}`, 14, inset `xs` bottom-right | `garments[N].material` | derived TextureBadge ×5 |
| 29 | `01.colour-card` | `Card level 1`, `testID home.colourCard` | — | explicit testID |
| 30 | `.title` | `Text body 500 heading` | `home.colourCard` | derived text |
| 31 | `.sample` | `Swatch 52×40 sm keyline` | today | derived Swatch (shared) |
| 32 | `.note` | `Text label foreground.2 latin` | `provenance.source` | explicit value |
| 33 | `01.tabs` | `AppTabBar` → `TabBar` | — | derived TabBar |
| 34 | `.indicator` | the active indicator, `TAB_INDICATOR_TEST_ID` | — | explicit testID |
| 35–39 | `.{tab}.icon` | `NavIcon` → `Glyph` (home filled) | — | derived glyph |
| 40–44 | `.{tab}.label` | `Text caption 500` | `tab.home`…`tab.profile` | explicit text keys |

### Bindings and departures

**Bindings** are exactly as the table states. No string from 01 reaches the build, and a test scans for 01's sample content (see Test plan).

**Departures:**
- **E1, three listed:**
  - `01.hero.sample.oklch`: the engine's conversion;
  - `01.colour-card.title`: the classification-true words;
  - `01.colour-card.note`: the entry's own provenance.
- **E2, new row, owed by this feature:** `01.wardrobe.count` without a stored profile prints the garment count alone.
- **"Content never clipped by the tab bar the way the render clips it"** is 01's scroll position, not a departure. It is recorded in R9 §2's *Not design* list ("a page cut off by the tab bar where it scrolls on — `01`'s colour card; the page scrolls and nothing is cut"), and F-242's notes say so.
- **Nothing else.** If the capture shows another difference, it is fixed, or it is a question for the person and is not built.

---

## Files to touch

```
.harness/plans/F-242-home-is-mockup-01-element-for-element.md   — this plan
docs/adr/0137-…texture-badge….md, 0138-…home….md, 0139-…page-inset….md — the three decisions
docs/PRD.md                                  — §10: OQ-11 and OQ-14 closed (rows out, paragraphs in)
docs/design/R9-MOCKUP-FIDELITY.md            — §2 not-design line; §4 E2 row; §11 OQ-11 and OQ-14 to Closed
docs/architecture/data-model.md              — l.282–283: Home no longer reads saved_color rows (ADR-0138)
mockups/tools/inventory-data/01.mjs, 25.mjs  — badge bindings, tile actions, chip type, badge raw
mockups/inventory/01.json, 25.json           — regenerated
packages/ui/src/TextureBadge.tsx (new), index.ts, TabBar.tsx, Illustration.tsx
packages/ui/test/texture-badge.test.tsx (new), tab-bar.test.tsx, illustrations.test.tsx, conformance.test.tsx
apps/mobile/src/home.ts                      — new pure functions; reading selection deleted
apps/mobile/src/screens/Home.tsx             — rebuilt to 01
apps/mobile/app/(tabs)/index.tsx             — coverage, slug, garment id, Lens; two callbacks removed
apps/mobile/src/wardrobe/coverage.ts (new)   — one coverage context for Home and the Wardrobe
apps/mobile/app/(tabs)/wardrobe/index.tsx    — uses wardrobeCoverage (lookbook lines untouched)
apps/mobile/src/i18n/en.ts, ja.ts            — keys added, changed and removed (above)
apps/mobile/test/home.test.ts, home-states.test.tsx, screens.test.tsx
apps/mobile/test/home-fidelity.test.tsx (new), wardrobe-coverage.test.ts (new)
apps/mobile/e2e/capture/routes.json, e2e/journeys/atlas.journey.json (+ regenerated flows)
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf (+ its pins) — only if verify-font-coverage asks
packages/testing/fixtures/claims/near-misses.md — the two on-device lines
.harness/verification/inventory-surfaces.json, unreachable-routes.json, screen-insets.json, conformance-sweep.json
.harness/state/feature_list.json, progress.md, effects.json; .harness/memory/effects/*.md
```

---

## Anticipated effects

### Existing links whose `from` this touches

| link | change | guard |
|---|---|---|
| **E-016** (`en.ts` → ja, Home, `i18n.test`, the atlas journey, …) | keys added, changed and removed; journey key `home.what1` → `home.onDevice` | `tsc`; `i18n.test` (unused, undeclared, Japanese script); `generate-e2e-flows --check` in lint |
| **E-017 / E-174** (corpus → ja subset; fonts → lockup metrics) | new ja codepoints, only if re-cut | `verify-font-coverage`; `fonts.test` re-reads GOTHIC |
| **E-108** (`Home.tsx` → route, `atlas/with/reading/[id]`, `home-states.test`, route targets) | rewritten: Home no longer reaches the reading route; add `unreachable-routes.json` and `/wardrobe/with/[id]` to `to` | `verify-reachability` fails if the declaration is dead, or if F-244 closes without reaching the route; `home-states` action tests |
| **E-165** (`tabBar.tsx` → `TabBar.tsx`, …) | the active indicator carries `TAB_INDICATOR_TEST_ID` | `packages/ui/test/tab-bar.test` (id on the active item only; decoy: no inactive item carries it); the sweep's `01.tabs.indicator` |
| **E-167** (`01.json` → `tabs.ts`, tab-bar tests) | `01.json` edited (badges, tiles, chip type); tab elements untouched | tab-bar tests read `01.json`; `verify-mockups`; the inventory generator `--check` |
| **E-173** (`WordmarkProps` → Home, F-242) | call unchanged, still in a column | `tsc`; `brand.test`; the sweep finds Wordmark, Mark and "Irodora" on `01.screen` |
| **E-191** (`states.ts` → screens, `screens.test`, F-242) | `STATES` kept; subjects' `shows` updated; new subject | the declarations test; `blank-and-zero` (`bare-zero` runs on Home's subjects: the pill never reads "0 Garments") |
| **E-203** (feature list → `verify-mockups`, `inventory-surfaces.json`, `screens.test`) | `01.screen` enrolled | `verify-mockups` (lint); `screens.test` both directions |
| **E-120 / E-122's pin** (`screen-insets.json`) | Home's entries re-captured | the pin itself; `$comment` records why |

### New links

Ids are E-207 onward; check the maximum at write time. Each needs its memory note.

- **E-207**
  - From: `apps/mobile/src/home.ts#recordedMaterial`, the badge's binding (ADR-0137).
  - To: `packages/ui/src/TextureBadge.tsx`, `Home.tsx`, the Wardrobe editor (`screens/Wardrobe.tsx`, which writes `material`), `.harness/state/feature_list.json#F-256` (12's chips will write it), and `mockups/inventory/01.json` and `25.json`.
  - Hazard: whatever writes `material` decides when the badge shows and what the tile announces. A writer that stores a code (`linen`) or an empty string changes both silently.
  - Guard: `home.test` (blank is no material; decoy); `home-states` (badge if and only if material; the name carries it); the sweep (five badges on the enrolled surface).
- **E-208**
  - From: `apps/mobile/src/wardrobe/coverage.ts#wardrobeCoverage`.
  - To: `app/(tabs)/index.tsx`, `app/(tabs)/wardrobe/index.tsx`, the Home count pill, the Wardrobe's dial.
  - Hazard: one context for two screens; a route that assembles its own again lets 01's pill and 11's dial disagree.
  - Guard: `wardrobe-coverage.test` (equal to `coverage()` over the inline context, as oracle; `undefined` without a profile; both routes call `wardrobeCoverage` and neither calls `coverage(` or assembles a context, read from source; decoy: `shopping.tsx`, a different context, is not required).
- **E-209**
  - From: `packages/ui/src/Illustration.tsx#IllustrationProps`, backdrop admits `foreground`.
  - To: Home's art layer, every future backdrop (F-243 onward).
  - Guard: `illustrations.test` (a backdrop in `foreground` inks at `nativeArtOpacity`; a figure in `foreground` does not compile).

---

## Test plan

### Unit and property

`apps/mobile/test/home.test.ts`, rewritten:
- `wardrobeSummary`: live garments only, newest five first. Decoy: a deleted garment is neither counted nor shown.
- `colourOfTheDay`: the existing cases, kept.
- `recordedMaterial`: `'Linen'` is the binding. Decoys: `''`, `'  '` and `null` are no material.
- `heroName`: "Kumori-garasu (Frosted Glass)".
- `oklchLine`: prints `derived.oklch` at 3, 3 and 1 decimals with `coord.oklch` and "•".
- `wardrobeCountLabel`:
  - (14, 38) gives "14 Garments • 38 Valid Outfits";
  - (1, 1) gives "1 Garment • 1 Valid Outfit";
  - decoy: (5, undefined) gives "5 Garments", with no "•" and no uncomputed zero.
- `garmentTileName`: names the garment, the colour and the material. Decoy: no material segment without one.
- `wardrobeTileSize`: 384 gives 52, 360 gives 49.5, 320 gives 41.5. Decoy: 1000 gives 52, never above.
- `the colour card's heading states every published entry's classification`. Decoy: a planted `traditional` entry fails it.

`wardrobe-coverage.test.ts`: as described under E-208.

`packages/ui/test/texture-badge.test.tsx`:
- the default 14 is recomputed from `01.json` (median of the five boxes);
- the ink equals `sampleInk(hex, palette).hex` on a light and a mid-tone sample (decoy: `foreground` on the light sample is under 3:1);
- hidden from assistive technology, not pressable;
- draws the recorded cell count.

### Golden

- **Check:** `oklchLine` over all 120 entries against each entry's own derivation sentence ("Specified in OKLCh as L …, C …, h …°").
  - L and C must equal the printed digits.
  - h must agree to within 0.1°, only where C ≥ 0.02, because hue is ill-conditioned at low chroma.
- **Source:** `content/colors/*.json` `provenance.derivation` (ADR-0065).
- **If a digit differs** because of the six-decimal XYZ rounding, the test lists the entries and why. Neither value changes: §8 prints the derivation, and a golden change needs an ADR.

### Conformance and the inventory sweep

`screens.test.tsx` `ENROLLED`:

```
surface '01.screen', root 'home.surface'
render: a View testID 'home.surface' holding
  <Home {...HOME_POPULATED} />
  <AppTabBar state={{ index: 0, routes: TABS.map(t => ({ key: t.name, name: t.name })) }}
             navigation={{ emit: () => ({ type: 'tabPress' }), navigate: () => undefined }}
             insets={{ bottom: 0 }} />
```

- **The fixture** (shared with the `screens/Home` subject):
  - five garments; four corpus colours (`reference`) and one Lens-read (`estimated`, confidence 0.81, all four `capture_*` columns);
  - all five with a material;
  - `coverage { valid: 38, threshold: 60 }`;
  - `now = Date.UTC(2026, 8, 3, 12)`, which gives 曇りガラス `#C5CFD4`;
  - `sampleValues`: that hex plus the five garment hexes.
- **The 17 explicit locators** are as in the table, each computed by the screen's own function: `heroName`, `oklchLine`, `wardrobeCountLabel`, `provenance.source`, and the tagline joined with spaces.
- **Decoys added to F-221's DECOYS block:**
  - one `TextureBadge` removed from `live` → exactly one finding naming the five badge ids, "found 4, needed 5";
  - `withoutText(json, 'Atlas')` → `01.tabs.atlas.label: not drawn`;
  - the kanji paragraph removed → `01.hero.sample.kanji`;
  - `'01.screen'` added to "the real surfaces are clean as drawn".

### Order, grouping and proportion: `home-fidelity.test.tsx` (criterion 1)

- **Order:**
  - top-level blocks in tree order: Wordmark < tagline < chip < `home.hero` < `home.wardrobe` < `home.colourCard`;
  - inside the hero: sample < CTA; kanji < kana < name < oklch;
  - inventory rows (tops within 4 dp chain) share a `flexDirection: 'row'` ancestor, left to right: tagline | chip, title | count, the text column | the colour-card sample;
  - tiles newest first (`garments.0` = tile-1).
- **Grouping:** every element with an inventory `parent` is a descendant of its parent's node: the texts in the hero Swatch, each badge in its tile, the tab parts in TabBar.
- **Proportion:** declared props recomputed from `01.json` through §2's snap:
  - the hero: height 172, keylineWidth 2.5, corner `sm`, fill;
  - tiles 52; card sample 52 × 40; badge 14;
  - CTA: 35.5, pill, `arrow-right`; chips 20 and 18, caption;
  - Screen padding `xl`; card padding `md`; the intervals listed under Approach, with the inset subtracted written out;
  - type steps and faces (tagline `body` serif; kanji `title` gothic 400; kana `label`; name `label` 500; oklch `label` numeric; titles `body` 500);
  - tokens (`foreground`, `foreground.2` on the note; badges outlined in `border`; the CTA `accent`);
  - the art boxes against `HOME_ART`.
- **First run:** the `state.empty` root sits in the wardrobe slot (hero < `state.empty` < colour card).
- **Departure:** the Screen scrolls (`scroll` is not false). The tab bar is laid out below the scene, which is unchanged.

### Negative tests, each with a decoy (`home-states.test.tsx`)

- **F-337 (a):** a store with a Lens-read garment (created 100) and `listColors` returning a palette row (created 900, `#ABCDEF`, "Palette colour").
  - `listColors` is called 0 times.
  - "#ABCDEF" and "Palette colour" appear in no paragraph and no accessible name.
  - The hero's Swatch name is today's, with `reference`.
  - The only Swatch announced `estimated` is the measured garment's tile, with its confidence.
  - Decoy: the same tree shows the palette's colour if it is passed as a garment's colour, which proves the scan can see it.
- **F-337 (b):** no garments, palette rows present: one `state.empty` root, exactly two Swatches, both today's entry, and `listColors` not called.
- **The badge** (decoys built into these cases):
  - a garment without a material shows no `TextureBadge`, and its name lacks *Material*;
  - a garment with one shows exactly one.
- **Actions:**
  - the CTA calls `onOpenCombinations(today.slug)`; the tile calls `onOpenGarment(id)`; 27's *Scan First Garment* calls `onOpenLens`;
  - decoys: the CTA is absent with no handler; a tile is inert with no handler.
- **No 01 sample content**, in both locales and both themes: no paragraph or name contains "Ai-nezumi", "藍鼠", "あいねずみ", "Indigo Grey", "0.49", "240°", "Heian", "Traditional", "14 Garments", "38 Valid Outfits" or "Lens Camera". Decoy: a planted "Ai-nezumi" is found.
- **Different trees:** first run and populated render differently.

### E2E

`/`'s capture flow is regenerated: `generate-e2e-flows --check`. The device run is attested.

### Claims

- The sweep reads every rendered tree, which now includes the header row's line and the count.
- `verify:claims` over `near-misses.md` with the two new lines.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#   + per increment: pnpm test:a11y, pnpm test:contrast (inc 2, 4); node scripts/verify-font-coverage.mjs (inc 3);
#     node scripts/verify-reachability.mjs, verify-route-targets, generate-e2e-flows --check, verify-claims (inc 4, 7);
#     node scripts/verify-mockups.mjs (inc 1, 5) — most of these run inside `pnpm lint`
# Tier 2, once at Verify and again after the review's fixes
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
pnpm security
node scripts/verify-ci.mjs --all
```

Evidence to paste into `progress.md`:
- each gate's summary line;
- `conformance-sweep.json`'s `inventory` block (`enrolled` includes `01.screen`, `elementsAsserted` +44, `renders` +4) and its `claims.findings` 0;
- the `verify-reachability` listing with the one declaration;
- the `screen-insets.json` delta for Home's subjects.

**What each criterion is proven by:**

| # | criterion | proven by |
|---|---|---|
| 1 | elements in order, grouping and proportion; the sweep asserts the inventory | `pnpm test` (`home-fidelity.test` and the sweep). Gated |
| 2 | bindings | `home.test`, `home-states` (no sample content; F-337 decoys) and the sweep's value locators. Gated |
| 3 | only listed departures | gated for structure; attested for appearance (below) |
| 4 | capture compared by a person | attested |
| 5 | catalogues, actions, gates | `tsc` + `i18n.test`; the action tests; `pnpm test:a11y`, `pnpm test:contrast`, `pnpm test:cvd`. Gated |

---

## Attestations

Declared now in F-242's `attested` array. The JSON is in Appendix D.

- **Criterion 4.**
  - A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator, with a non-debuggable build of the final commit (`pnpm --filter @irodora/mobile exec expo run:android --variant release`), and Maestro and adb on the PATH.
  - `record.md` must show `/` captured in Sumi/Washi × en/ja at 384 dp, composed beside 01 (and 25 for Washi) under `.harness/verification/evidence/fidelity/<UTC>/compose/`.
  - The person compares the four pages element by element and records "matches" or each difference in `progress.md`.
  - The whole run fails while `/atlas/with/reading/[id]` is declared (F-221's attestation). That does not block this one. Blocks release.
- **Criterion 3 (appearance half).** Discharged by the same comparison. Every difference is either a named departure, or fixed and recaptured, or recorded as a feature. Blocks release.

---

## Risks and open questions

1. **The ambiguous record, the main risk.**
   - F-236's and F-237's notes, and F-337's text, presume a reading block. ADR-0138 chooses 01's binding and says so. The person can overrule it at F-267.
   - The cost is real: Home no longer shows "what was read" (F-146 criterion 2, outstanding), and F-164's reading-first order is superseded.
   - F-146, F-164 and F-202 get "SUPERSEDED IN PART BY F-242 (ADR-0138)" notes. Their attestation statuses stay for a person.
2. **`/atlas/with/reading/[id]` is unreachable in the app** until F-244 wires 03's *Wear It* (declared, gated).
3. **Coverage on the front door** is t × r × s `scoreOutfit` calls. It is memoised on the profile and a garment key (`id:updatedAt`) but not measured on a device. F-268 and perf own that.
4. **Unverified:** whether Home re-renders when it regains focus after a garment is added in another tab. This is pre-existing and not changed here. If it is stale, record a backlog feature.
5. **The tagline runs about 14 % taller than drawn.** `body`'s line height is 26.4 against a drawn pitch of about 21.6 dp. That is the token's, not a departure; F-267 judges it.
6. **Text-inset arithmetic is approximate.** The intervals to text ink use estimated box insets (SF/Roboto means, Gelasio's metrics). The test pins whatever is computed, and the capture checks it.
7. **The font subset may need a re-cut** (E-017, E-174).
8. **The capture flow gains about 40 steps.** Selectors resolve (`--check`), but the device run is the person's. The materials typed are corpus names standing in for words (the DSL types only catalogue or corpus text). They are invisible on Home, which shows only the badge.
9. **The badge's checks are read off a 28 px JPEG crop.**
10. **The art orientation is unverified.** `Illustration` has one `plum-branch` drawing and no transform. Whether 01's three placements match it in orientation is unverified; a mismatch is a finding for F-267, not something built here.
11. **The Japanese heading** (12 characters) fits about 192 dp, but large text wraps it. Wrapping is allowed; truncation is not.
12. **jest's window width** is assumed ≥ 384 (RN's mock gives about 750), so tiles render at 52 in tests.
13. **The golden OKLCh check** may surface round-trip digit differences. They are documented, not "fixed".
14. **Hero keyline direction (OQ-46, open).** On light samples the 2.5 dp keyline moves dark (ADR-0116); 01 draws it light. It is not blocking, and the shipped guarantee stands.
15. **`Swatch` announces as a button even without `onPress`** (the hero and colour-card samples). This is existing component behaviour, and the a11y gate passes today. Flag it for the evaluator; do not change it here.
16. **Singular and plural keys** go a step past ADR-0056's "prefer copy that does not inflect". It is forced by 01's drawn "Garments", and recorded in ADR-0138.
17. **No OQ blocks this feature** once ADR-0137 and ADR-0139 land. OQ-46, OQ-47 and OQ-49 stay open and are untouched.

---

## Out of scope

- The Wardrobe (11) rebuild and its own tiles' action (F-255).
- 12's material chips (F-256).
- The Lens sheet's way into `/atlas/with/reading/[id]` (F-244) and its capture reach (F-259).
- Fixing `Screen`'s gap (F-342, backlog).
- Other screens' page insets, and `Screen`'s default.
- Any new route (no `/wardrobe/[id]`).
- The shopping route's coverage context.
- OQ-46, OQ-47, OQ-48 and OQ-49.
- 25's caps lockup, circle, photo tiles, page dots and header rule.
- A competent-speaker review of the Japanese (F-017 / OQ-5).
- Changing F-146, F-164 or F-202 attestation statuses.
- Refreshing Home on focus (unless found broken, then recorded).

---

## Record step: what each record says

| record | what it says |
|---|---|
| **F-242** | `done`; plan path; evidence; both attestations `outstanding`; notes: ADR-0137/0138/0139, the E2 row, §2's scroll line |
| **F-337** | `todo`, `blockedBy ["F-242"]`, amended acceptance (Appendix D). Note: "AMENDED BY ADR-0138 (F-242) in the open, as F-237's and F-238's were. 01 draws no reading block; the cause (the newest `saved_color` row of any source) was deleted with it. Proven by `home-states.test › 'no stored colour is presented as a reading (F-337)'` and `› 'with no garment at all…'`. Claim it, run its gates, record, close; it writes no code." |
| **F-244** | note: reach `/atlas/with/reading/[id]` from `03.actions.wear` and remove the `unreachable-routes.json` declaration; `verify-reachability` fails the day F-244 is done without it |
| **F-259** | note: the capture reach it owes now needs F-244's in-app path |
| **F-255** | note: `/wardrobe/[id]` is no route; 01's tiles open `/wardrobe/with/[id]` (ADR-0138 D5); `TextureBadge` exists if 11 draws the badge |
| **F-256** | note: Home's badge and tile name read `material`. If the chips store a code, map it through `garment.material.*` (E-207) |
| **F-146, F-164, F-202** | "SUPERSEDED IN PART BY F-242 (ADR-0138)…" |
| **F-342** | new backlog entry (Appendix D) |
| **`progress.md`** | gates, evidence, the reading decision, the two findings (Screen gap; the e2e anchor) |
| **Lesson candidates** | "a prop on a wrapper's only child does nothing" (Screen gap); "an inventory route string is a reading of the drawing, not a route" |

---

## Sources

**Repository** (all read; nothing run):
- `AGENTS.md`, `mockups/AGENTS.md`, `apps/mobile/AGENTS.md`, `docs/design/R9-MOCKUP-FIDELITY.md`, `docs/PRD.md` (§FR-23/24/71/73, §10), `mockups/README.md`, `mockups/index.json`;
- `mockups/inventory/01.json`, `25.json`, `03.json`, `06.json`, `12.json`; `mockups/tools/inventory-data/01.mjs`; images 01, 12, 25, 27;
- `apps/mobile/src/screens/Home.tsx`, `src/home.ts`, `app/(tabs)/index.tsx`, `_layout.tsx`, `wardrobe/index.tsx`, `atlas/with/reading/[id].tsx`;
- `src/tabBar.tsx`, `src/tabs.ts`, `src/wardrobe.ts`, `src/engine.ts`, `src/i18n/*`;
- `test/inventory.ts`, `test/screens.test.tsx`, `test/home-states.test.tsx`, `test/provenance.test.ts`, `test/i18n.test.ts`, `test/lookbook.test.tsx`;
- `packages/ui/src/{Swatch,Card,Chip,Button,Text,TabBar,Illustration,layout,motion,inkOnSample,sampleInk,index}.ts(x)`;
- `packages/store/src/{repository,createRepository}.ts`, `packages/color-core/src/provenance.ts`, `packages/optimization/src/coverage.ts`;
- `content/colors/kumori-garasu.json` (and the source and derivation counts across all 120);
- `scripts/{verify-mockups,verify-reachability,generate-e2e-flows,fidelity-capture,verify-viewport}.mjs`;
- `.harness/verification/{inventory-surfaces,unreachable-routes,screen-insets,off-scale-spacing}.json`, `.harness/state/effects.json` (E-016, E-108, E-165, E-167, E-173, E-174, E-191, E-203, E-205), `packages/testing/fixtures/claims/{drawn,near-misses}.md`;
- ADR-0128, 0129, 0133, 0136, 0117 (excerpts); `packages/design-tokens/test/type-scale.test.ts`.

**Web:**
- [Maestro selectors](https://docs.maestro.dev/api-reference/selectors): a text selector is a regex matched against the element's whole text.
- [Maestro assertVisible](https://docs.maestro.dev/reference/commands-available/assertvisible).

---

# Appendix A — ADR-0137 draft

```markdown
# ADR-0137 — The texture badge marks a garment whose material is recorded, and is absent where none is

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-20 |
| **Feature** | F-242 |
| **Closes** | OQ-11 |
| **Builds on** | [ADR-0116](0116-text-on-a-sample-and-a-samples-edge-move-the-e3-way-per-sample.md) (the ink on a sample); [ADR-0005](0005-measurement-provenance-is-a-type.md) (provenance is a type) |
| **Applies** | R9-MOCKUP-FIDELITY §3 P1 and P2, §4 E1 and E2, §6 C2 and C8; golden rules 11, 13 and 14; NFR-9; WCAG 2.2 SC 1.4.11 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

`01` draws a small mark in the bottom-right corner of each of its five wardrobe tiles (`01.wardrobe.tile-N.badge`, 13.5–15 × 12.5–16 dp, `new:TextureBadge`, bound `oq:OQ-11`):

- a checkered weave;
- light on the dark tiles and dark on the cream one;
- the same mark on every tile.

`25` draws the same element as a 30 dp circle of cloth beside a garment photograph. Its callout calls it a *"Woven texture badge"*, and the README describes `01` as having *"fabric weave indicators"*. PRD §10 asked: fabric texture, a material, a sample photograph, or a capture-quality mark?

What the product holds about a garment's fabric:

- **`material`**: free text, set in the Wardrobe editor (hint *Wool, cotton, linen*). `12` draws it as five chips (*Linen · Cotton · Wool · Silk · Denim*), which F-256 builds.
- **`pattern`**: free text (*Plain, striped, checked*).
- **A photograph** (`garment_image`).
- **Its colour's provenance.**

Nothing measures a weave. R9 §4 E1 already refuses to draw a weave *inside* a sample (`FabricSwatch` draws the colour).

## Decision

**D1 — The badge says that the garment's material is recorded.**
- It is drawn when `material`, trimmed, is not empty, and not otherwise.
- There is no placeholder and no "unknown" mark: an absent badge is an absent fact.

**D2 — It is drawn as `01` draws it, one mark for every material.**
- `TextureBadge` (`@irodora/ui`), 14 dp (the median of the five drawn boxes).
- At the tile's bottom-right, inset `xs` (the drawn 5–5.5 dp, snapped).
- A woven check whose cells are read off `01` and recorded in its inventory.
- One ink: the one text on that sample takes (`sampleInk`, ADR-0116). It clears 4.5:1 against the sample, above the 3:1 SC 1.4.11 asks of a graphic.
- `25`'s circle is not adopted (C2: `25` governs the palette).

**D3 — Its meaning is in words.**
- The badge is hidden from assistive technology.
- The tile's accessible name carries *Material \<value\>* (`browse.material`).
- It is a shape, never a colour, so golden rule 13 holds.

**D4 — The inventories bind it.** `01` and `25`'s badges bind `store:garments.N.material`. The `oq:` binding is retired with the question.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **Leave it out** | `01` draws it on every tile, and F-242's first criterion asks for every element. No §4 category forces its removal: E2 keeps a drawn element and gives it a defined value |
| **A weave per material** (plain for linen, twill for denim, …) | Five drawings no mockup makes (rule 14). A material does not fix a weave: wool is knitted or woven, and the product records no construction, so the mark would claim a fact it does not hold (rule 11) |
| **A photograph mark** (a crop of the garment's photograph, or "has a photo") | `01`'s mark is one uniform monochrome weave and reads as cloth, not as a picture. A crop of the cloth on a tile of the same colour would all but vanish, and a texture over a sample is what E1 refuses. Home would also read image metadata for every tile |
| **A provenance mark** (shown where the colour was read by the Lens) | Provenance is already in every tile's accessible name. A cloth mark meaning "camera estimate" would be read by sighted people as "fabric", and could suggest a camera colour is the authentic one (rule 11) |
| **A pattern mark** | `pattern` is free text, and a checker read as *checked* would mislabel every plain garment that has one recorded |

## Evidence, and its limits

- **It rests on:** the README row for `01`, `25`'s callout, PRD §10's own candidate list, `StoredGarment`'s fields, `12`'s material chips, and WCAG 2.2 SC 1.4.11.
- **The mark's cells are read off a JPEG** at 28 px per badge.
- **A sighted person learns that a material is recorded, not which.** `01` prints no word, and none is added.
- **Today most garments have no material**, so most tiles show none until F-256's chips make it a one-tap choice.
- **It was not tested with people.**

## Consequences

- `TextureBadge` joins `@irodora/ui`, with conformance subjects and its own test.
- `01.json` and `25.json` rebind their badges.
- R9 §11 and PRD §10 close OQ-11.
- F-256 carries a note: Home reads `material`, and a chip that stores a code must be mapped back to its words (E-207).

## Revisit when

- A mockup draws the badge with a word, or a different mark per material.
- F-256's chips make `material` a closed list.
- A person reports reading the mark as something else.
```

---

# Appendix B — ADR-0138 draft

```markdown
# ADR-0138 — Home leads with the day's corpus colour as 01 binds it, and draws no reading

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-20 |
| **Feature** | F-242 |
| **Amends** | F-337's acceptance (in the open, as ADR-0135 and ADR-0136 amended F-237's and F-238's) |
| **Builds on** | [ADR-0124](0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) D3; [ADR-0129](0129-a-screen-declares-its-data-conditions-and-the-state-each-shows.md) D1; [ADR-0133](0133-motion-is-the-change-a-drawn-binding-defines-and-a-length-may-move-where-a-colour-may-not.md) D1; [ADR-0135](0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md); [ADR-0136](0136-the-lookbook-is-read-back-on-the-wardrobe-through-a-garments-lookbook-choice-and-a-saved-outfit-is-never-rescored.md); [ADR-0065](0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md); [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) |
| **Applies** | R9-MOCKUP-FIDELITY §1, §3 P1 and P2, §4 E1 and E2, §8 row 01; golden rules 11–14; FR-23, FR-24, FR-42, FR-71, FR-73 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

**What `01` draws.** A hero card with a corpus colour (kanji, kana, *Romaji (English)* and OKLCh on the sample, then *What Goes With This →*); a Wardrobe Preview with a count pill and five tiles; and *"Today's Traditional Color Card"*, whose sample is the hero's colour. The bindings:

- `01.hero.sample*` and `01.colour-card.*` bind `corpus:entry.*`;
- `25` binds the same hero `corpus:today.*`;
- R9 §8 binds the hero's OKLCh to the corpus derivation.

`01` draws no "last reading".

**What Home did.**
- It led with the newest live `saved_color` row, labelled *Last reading* (F-164), else with today's colour.
- That row was of any source, so a palette's corpus colour saved after a reading was shown as one (F-337, rule 11).
- F-236's and F-237's notes to F-242 presumed the block would be rebuilt.

**Where readings live.**
- `saveColor` has no callers in the app (`provenance.test.ts`).
- The Lens persists a reading only as a garment's colour (`colourFromReading`, source `estimated`, with its conditions).
- So "the last reading" was always a garment's measured colour, which `01`'s Wardrobe Preview already draws.

**What reaches the reading route.** Only Home pushes `/atlas/with/reading/[id]`. `03`'s *Wear It* draws the other way in (F-244).

## Decision

**D1 — The hero is the day's corpus colour, always.**
- `colourOfTheDay(now)`: the sample at full width and 172 dp, with `01`'s 2.5 dp keyline.
- Its kanji, kana and name set on the sample through `Text on`. The name line takes `01`'s form: the romaji, capitalised, with the English in brackets.
- The OKLCh line: `coord.oklch` and the entry's derivation at 3, 3 and 1 decimals (the precision the corpus is authored at), separated by `•`.
- *What Goes With This →* opens `/atlas/with/[slug]`. It is absent when nothing is wired (F-202).

**D2 — Home draws no reading block.**
- Home reads no `saved_color` row except a garment's own colour (`HomeStore` is `listGarments()`).
- A measured colour appears as its garment's tile, announced with its stored provenance and confidence. The tile opens `/wardrobe/with/[id]`, where `24` prints *"Estimated from a capture"* (C16).
- `/atlas/with/reading/[id]` is declared unreachable, with `closedBy: F-244`, until `03`'s *Wear It* reaches it.

**D3 — One absence.**
- The wardrobe panel's: `27`'s card where Home is given the Lens, `00`'s caption otherwise, in `01.wardrobe`'s place.
- There is no reading panel, so there is no "no readings" condition (ADR-0129 D1).

**D4 — The colour card.**
- Heading: *"Today's Japanese-Inspired Colour"*, ja 「日本に着想を得た今日の色」.
  - It keeps the drawn place and about the drawn length (32 characters against 30), and states the real classification (E1, FR-23).
  - "Card" is dropped to hold the length.
  - A test holds the heading true against every published entry.
- Note: the entry's own `provenance.source`, verbatim, set in Latin in both locales. It is a citation, printed raw as the colour page prints it.
- Sample: 52 × 40 dp.
- No action: `01` records none.

**D5 — The tiles.**
- The five newest live garments, each in its own colour with its provenance.
- Each named for the garment, its colour and, where recorded, its material.
- Each opens `/wardrobe/with/[id]`, the only route keyed by a garment id. The inventory's `/wardrobe/[id]` names no route, and `01`'s and `25`'s records are corrected.
- 52 dp at 384 dp; shrinking, to keep `01`'s single row of five, on narrower phones.

**D6 — The count pill.**
- *N Garments • M Valid Outfits*, where M is `coverage().valid`, the count FR-42 defines at the threshold it carries.
- The threshold is in its accessible name.
- English singular forms have their own keys.
- It is coverage, not the lookbook (ADR-0136).
- With no stored profile, `coverage()` has nothing to count against, so the pill prints the garment count alone and invents no figure: a new §4 E2 row.
- The coverage context is assembled once, for Home and the Wardrobe (`wardrobeCoverage`).

**D7 — The header's words are `01`'s.**
- *What colour is this. / What goes with it. / Does it suit me.*: one heading, in the serif at `body`, and in the gothic in Japanese (C6).
- *"100% On-Device Engine • Offline"*, as drawn. It is true by ADR-0051, and it is the claim the splash already ships.

**D8 — No motion.** Home's per-section entrance stagger is not rebuilt: `01` implies none (ADR-0133 D1).

**D9 — F-337 is amended, in the open:**
1. *"Home presents no stored colour as a reading: it reads no saved_color row but a garment's own colour, drawn on that garment's tile with its stored provenance — shown by a test with a Lens-read garment and a palette saved after it (the decoys: the palette's colour is the newest row and appears nowhere on Home, and the measured colour appears only on its tile, announced as estimated with its confidence)."*
2. *"With no garment at all, Home draws 27's empty-wardrobe card (00's caption without the Lens) and no colour but the day's corpus colour, whatever palettes exist."*

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **The hero leads with the newest Lens reading** (today's behaviour, sources fixed) | The hero's values would no longer be bound as §8 states (F-242 criterion 2). A reading has no kanji, kana or name, so three of four drawn texts would be empty or invented, and no §4 category covers the departure (§1). A reading set where a corpus name stands risks being read as a corpus colour (rule 11) |
| **A "Last reading" card added to `01`'s column** | An undrawn block (criterion 3, rule 14). ADR-0135 and ADR-0136 rejected sections on Home as "the most-seen, fully drawn screen" |
| **The colour card shows the reading** | Its heading and every binding are today's corpus entry; rebinding it is a departure nothing forces |
| **The hero shows the reading, with "Last reading" in the kanji slot** | The same as the first, with copy `01` does not draw, in a script it does not draw there |

## Evidence, and its limits

- **It rests on:** `01.json` and `25.json`'s bindings, R9 §8, the `01.mjs` record ("a corpus colour"), `provenance.test.ts`, `wardrobe.ts`, `createRepository.ts`'s writers, and `verify-reachability`.
- **The cost is a real loss, and stated.** Home stops showing "what was read" (F-146 criterion 2, F-164's order), and the reading route has no way in until F-244.
- **No information is lost.** The measured colour stays one tap from its combinations, through its tile.
- **It was not tested with people.**

## Consequences

- `lastReading` and `homeLead` are deleted.
- The `home.noReadings*`, `home.lastReading`, `home.today*` and `home.takeReading` keys go.
- `unreachable-routes.json` carries one entry.
- R9 §4 E2 gains the count row, and R9 §2 lists `01`'s scroll cut as not design.
- `data-model.md`'s sentence is corrected.
- F-146, F-164 and F-202 carry "SUPERSEDED IN PART BY F-242" notes.
- F-337 is amended and waits on F-242. F-244, F-255, F-256 and F-259 carry notes.

## Revisit when

- A mockup draws a reading on Home.
- F-244 reaches the reading route.
- F-267's comparison, or a person, reports missing the last reading.
```

---

# Appendix C — ADR-0139 draft

```markdown
# ADR-0139 — Each screen's page inset is its own mockup's, snapped; Home's is xl

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-20 |
| **Feature** | F-242 |
| **Closes** | OQ-14 |
| **Builds on** | [ADR-0103](0103-…) (the spacing scale); [ADR-0117](0117-the-tab-bar-is-01s-drawn-by-our-own-component-and-its-words-return.md) (the tab bar's measured side inset); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) D2 (intervals and the snap) |
| **Applies** | R9-MOCKUP-FIDELITY §2 (the snap; siblings; the tie takes the smaller), §3 P1; golden rule 14 |
| **Decided on** | The delegation of 2026-09-24 (*"a measured size, an inset"*) as widened on 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

- `01` insets its content 36.5–37 dp: the lockup, the tagline and the three cards at x 36.5–37, and the cards' right edges 37 dp from the frame.
- Most other screens measure 18–20 dp.
- The spacing scale is 4, 8, 16, 24, 32 and 48. `Screen`'s default is `lg` (24).
- OQ-14 asked whether `01`'s inset is deliberate. Its R9 row names F-227, which is done, so F-242, the first screen to need it, closes it.

## Decision

- **P1.** A screen's primary mockup governs its layout, including its page inset.
- **The snap.** The measured inset snaps to the scale like every interval (§2):
  - `01`'s 36.5 → **`xl` (32)**: 4.5 away, against 11.5 to 48;
  - 18 → `md`;
  - 20 → `md`: equidistant from 16 and 24, so the smaller.
- **Home** sets `Screen padding="xl"`. Its lockup's ink sits on that inset (F-230).
- **Every other screen** takes its own inset when its surface feature rebuilds it. `Screen`'s default is not changed here, because changing it would move every unrebuilt screen at once without its mockup being read.
- **The tab bar keeps its 37.3 dp.** That is component geometry pitched by glyph centres (ADR-0117), not a page interval.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **One inset everywhere** (16 or 24) | It contradicts `01`, the most-seen screen, which is drawn wider; Home's cards would be 25–40 dp wider than drawn |
| **36.5 as a named constant** | It bypasses the spacing scale through a constant `verify-spacing-scale` cannot read (it reads literals) — a loophole in the rule F-227 made |
| **`xl` + `xs` = 36, composed** | Two intervals where the drawing has one. ADR-0128 composed an inset only where two distinct intervals exist |

## Evidence, and its limits

- **Measured from `01.json`'s boxes at 2 px per dp.**
- **The snap costs 4.5 dp a side.** Content is 320 dp wide at 384 against the drawn 310.5–311 (3 %), and the lockup's ink sits 4.5 dp left of `01`'s.
- **F-267's comparison judges it by eye.**

## Consequences

- Home's inset is `xl`.
- R9 §11 and PRD §10 close OQ-14.
- Each R9 surface feature reads its own mockup's inset.
```

---

# Appendix D — State drafts

## F-242 `attested`

```json
[
  {
    "criterion": "The only departures from mockup 01 are the ones this feature’s notes name, each from R9-MOCKUP-FIDELITY §4 or §6 — nothing is simplified, reordered, restyled or left out beyond them",
    "verifiedBy": "GATED FOR STRUCTURE, ATTESTED FOR APPEARANCE. pnpm test runs home-fidelity.test (every 01 element in its drawn order and grouping; each size, corner, keyline width, type step and token recomputed from mockups/inventory/01.json through §2's snap) and the inventory sweep (01.screen, both themes, both languages). What no tree can show — that nothing is restyled — is the person's comparison recorded under the fidelity criterion: each difference they see is a departure the notes name (E1 ×3, the E2 count without a profile, §2's scroll cut), or is fixed and the capture repeated, or is recorded as a feature.",
    "blocks": "release",
    "status": "outstanding"
  },
  {
    "criterion": "The fidelity harness captures the route beside mockup 01 in both themes and both locales, and a person has compared each pair and recorded the result",
    "verifiedBy": "A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator over adb, with a non-debuggable build of F-242's final commit installed (`pnpm --filter @irodora/mobile exec expo run:android --variant release`), Maestro and adb on the PATH. The `/` flow first adds five garments from the Atlas and records a material on three, so 01's wardrobe preview is captured with badges present and absent. record.md must list `/` captured in all four conditions (Sumi and Washi, en and ja) at 384 dp, each composed beside 01 (and 25 for Washi) under .harness/verification/evidence/fidelity/<UTC>/compose/. The person opens the four pages, compares element by element against 01's inventory, and records per pair 'matches' or each difference, in progress.md under F-242, with record.md's summary line. The whole run fails while /atlas/with/reading/[id] is declared unreachable (F-221's attestation); that does not block this one, which concerns `/` only. Expected and not defects: the hero shows the day's corpus colour, not 01's sample; the count reads 'N Garments' alone while no profile is stored (E2). Everything but the device is gated: the flow by generate-e2e-flows --check, the structure by the sweep and home-fidelity.test.",
    "blocks": "release",
    "status": "outstanding"
  }
]
```

## F-337 amended `acceptance`

Also set `"blockedBy": ["F-242"]`.

```json
[
  "Home presents no stored colour as a reading: it reads no saved_color row but a garment’s own colour, drawn on that garment’s tile with its stored provenance — shown by a test with a Lens-read garment and a palette saved after it (the decoys: the palette’s colour is the newest row and appears nowhere on Home, and the measured colour appears only on its tile, announced as estimated with its confidence)",
  "With no garment at all, Home draws 27’s empty-wardrobe card (00’s caption without the Lens) and no colour but the day’s corpus colour, whatever palettes exist"
]
```

## `unreachable-routes.json` entry

The script reads `url` and `closedBy`. The `why` field is assumed; match the shape of the earlier entries in git history.

```json
{ "url": "/atlas/with/reading/[id]", "closedBy": "F-244", "why": "Home leads with the day's corpus colour (01, ADR-0138 D2), so its reading path is gone; 03's Wear It (03.actions.wear) draws this navigation, and F-244 builds it." }
```

## F-342, new backlog entry

| field | value |
|---|---|
| title | A Screen’s `gap` separates none of its blocks, because one `Appear` wraps them all |
| requirements | NFR-25 |
| service | packages (`@irodora/ui`) |
| release | R9 |
| priority | should |
| status | backlog |
| blockedBy | — |

**Acceptance:**
1. A screen's top-level children are separated by the `gap` it passes (default `xl`), asserted on the rendered tree: the entrance wrapper carries the column and the gap. A decoy shows a wrapper without it failing.
2. Every subject's spacing capture records the change, and each screen whose blocks moved is named in progress.md.

**Notes:** FOUND WHILE PLANNING F-242, by reading, not on a device:
- `packages/ui/src/layout.tsx:466–471` puts `{header}{children}` inside one `<Appear>`.
- `contentContainerStyle` holds `padding` and `gap` (`:530–533, :566`).
- `motion.tsx:350`'s `Animated.View` has no gap.

So the container's gap separates a single child, and every screen relying on `Screen gap` draws its blocks touching unless its children space themselves. Since F-188. F-242 composes Home's rhythm with `Stack` and does not depend on it. Surface features F-243 onward should not rely on `Screen gap` until this lands.

---

## Review (once, 2026-10-20): FAIL as delivered — 1 blocking, 7 significant, 8 minor

The evaluator re-ran state, typecheck, lint, format, `turbo run test --force`, build, test:a11y,
test:contrast, test:cvd, test:content and `verify:mockups:prove`, all green on `098260f`; it did not
run e2e (no device), fidelity:capture (attested), security or `verify-ci --all`. Each finding is fixed
in the feature or recorded:

| # | finding | resolution |
|---|---|---|
| B1 | the hero kanji rendered at the Japanese title step's 600; 01 records 400 | **fixed**: `weight={400}` on the kanji and kana; home-fidelity now asserts every element's RENDERED weight against 01.json, with the 600 step as its decoy |
| S1 | the Wardrobe Preview row could not wrap, so the count pill was clipped in Japanese, at 360/320 dp and at 200 % | **fixed**: the row wraps; R9 §4 E3 names "a line that does not fit wraps, never clips" (WCAG 1.4.4) |
| S2 | home-fidelity read only 01.json for the inset, intervals and tokens; the attestation claimed more | **fixed**: it asserts Screen's padding, every Stack gap, the text inks, the cards' level and edge, the pills' outline and the primary action against 01's values; the attestation's text says exactly what runs |
| S3 | the colour card's static heading had no all-entries guard | **fixed**: `home.test` asserts every published entry is japanese-inspired, with a planted traditional entry as the decoy |
| S4 | the hero's printed names and OKLCh were not heard; a Swatch without an action is announced as a button | **fixed for Home**: the hero's name carries every printed line (`heroSpoken`, tested); **recorded** the component-wide role as **F-343** (backlog) |
| S5 | E-208's guard read only the Wardrobe route | **fixed**: `wardrobe-coverage.test` reads Home's route too |
| S6 | 200 % text never checked on the rebuilt surface (A7 is e2e) | **recorded**: the capture attestation now includes the person's 200 % check in both languages, with a profile stored; S1's wrap is the structural fix |
| S7 | Home did not re-read the store when its tab came back into view | **fixed**: the route re-renders on focus (`useFocusEffect`), read from source by `wardrobe-coverage.test` |
| M1 | the colour card's heading probably wraps | **named**: E3's wrap row lists it |
| M2 | in Japanese the on-device pill wraps under the tagline | **named**: E3's wrap row lists it |
| M3 | 着 does not count shoes or trousers | **fixed**: 点 |
| M4 | a test title claimed both languages; the inert-tile decoy was missing | **fixed**: the title says English; the decoy is added |
| M5 | the fill exemption is not tied to its sample | **recorded**: E-086's guard and note state the limit (as M10 did for text) |
| M6 | E-165, E-017/E-174 and E-203 not annotated | **fixed**: each link's guard names F-242's change |
| M7 | the route's coverage memo recomputed every render; unmeasured on launch | **fixed**: keyed on the profile's and each garment's last write; **recorded** the launch-time cost on F-268 |
| M8 | 01.json bound the name line to `name.en`; F-146's attestation reads against a Home with no reading | **fixed**: the binding is `corpus:entry.name.romaji+en`; F-146 carries a note |
