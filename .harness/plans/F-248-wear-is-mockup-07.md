# Plan: F-248 — Wear is mockup 07

| | |
|---|---|
| **Feature** | F-248 ([`feature_list.json`](../state/feature_list.json)) |
| **Requirements** | FR-73, FR-31, FR-38, FR-29. Also applied: FR-34 (07's occasion control), FR-32/FR-11 (the card's figures), FR-3, FR-5, FR-33 (Lock), NFR-8, NFR-21, NFR-22; done criteria that must survive: F-195 c1–c3, F-199 c1–c2, F-208 c1–c3 (golden rule 6) |
| **Service / package** | `apps/mobile` · `@irodora/ui` (additive) · `@irodora/recommendation` (one additive export) · `@irodora/design-tokens` (one minted tint) |
| **Author** | The planner subagent. It only read files. Nothing was built, measured or run. The implementing session records its own changes under *Implementing session's decisions* |
| **Date** | 2026-10-22 |
| **Decisions** | ADR-0150 (closes **OQ-32**), ADR-0151 (07's words, slots and figures made true), ADR-0152 (what 07's controls do, and what it keeps that it does not draw), ADR-0153 (07's composition, its inks, and the kimono) |

---

## Intent

Someone taps *Wear It* on a colour page (06) or a combination (19). They land on mockup 07, top to bottom:

- **The app bar:** `← ‹Romaji› | Wear It • Outfit Combinations`.
- **The anchor card:** the colour's sample with its keyline, `‹kanji› ‹Romaji› (‹hex›)`, and its slot.
- **The occasion control:** four segments, one chosen with a leading dot.
- **The 2 × 2 slot canvas.** Each tile is filled with its colour, and its slot name, hex and name sit on that colour. The slot in hand has *Swap* and *Lock*; the other two have a compact *Swap*.
- **The intelligence card:** harmony, personal fit, CVD separation and contrast, then a rule, then the substitution pills.
- **The pinned bar:** *Save to Outfit Lab* and the outlined *Export Palette Tokens*.

Every value comes from the corpus or the engine. Every drawn control works. Nothing on the page claims more than the engine computes. In particular there is no *Match*, no *Safe*, no *APCA Passed* and no seasonal type.

"Done", for a person:

- In both themes and both languages, the page reads as 07.
- It tells them what goes with this colour, slot by slot, under the occasion they choose. It says how the set holds together.
- It lets them step through each slot's ranking, see why a candidate ranks there, and take it on to the shop check, the wardrobe or the Outfit Lab.

---

## Findings from planning

These come from reading only. Nothing was run.

1. **The current screen is not 07.**
   - `apps/mobile/src/screens/Wear.tsx` draws: a disclaimer line (`wear.what`); a level-2 card with the source swatch and a slot `ChoiceGroup` (top / trouser / shoe); a no-profile card with *Build a profile*; then, per other slot, up to six ranked candidate cards. Each card has its score and four factor lines, plus *Open this colour / Shop for this / Add to wardrobe*. Each slot also has a stack of alternative cards.
   - It is still on the platform header: `[slug].tsx` sets `Stack.Screen options={{ title: 'Irodora' }}`, and `chrome.test.ts` line 122 lists `'atlas/wear/[slug]': 'F-248 (07)'` in `PLATFORM_HEADER`.
2. **07 draws four slots, and the engine has three.**
   - `packages/recommendation/src/slots.ts`: `OUTFIT_SLOTS = ['top','trouser','shoe']`.
   - `recommendOutfit` refuses to recommend a second top.
   - `packages/optimization/src/coverage.ts` builds every valid outfit as one garment per `OUTFIT_SLOTS` entry. A fourth engine slot would therefore make every wardrobe without a coat count zero valid outfits. Home's pill, the shopping check, `profileConcordance`'s neighbours and the Lab would all move.
   - The builder's `SLOT_WORDS` already files `jacket, coat, cardigan` under `top`.
   - The store is vocabulary-free for slots (ADR-0136 D6), and 13 also draws an *Outerwear* row (F-257).
3. **07's occasions are not FR-34's.**
   - 07 draws *Casual · Minimalist Office · Japanese Classic · Evening*.
   - FR-34 and `OCCASIONS` (`weights.ts`) publish `casual, office, minimal, japanese-inspired, formal, date, …` and no `evening`. The newest weights (`2026.08.4`, `occasionCount` 10) carry all ten.
   - `ruleSetFor` documents that a silent fallback would make "the office weighting" and "the weighting nobody configured" indistinguishable on screen.
   - The app reads only `RULES_OCCASION = 'default'` (`src/rules.ts`). A screen that chooses an occasion needs a new reader.
4. **07's intelligence card binds four things, and §8 binds three.**
   - **Harmony.** `engine:harmony.relationship` has no implementation. `scoreOutfit` classifies no relationship (ADR-0124's alternatives row; `outfit-score.ts` 174–180), and `@irodora/color-harmony` only generates. §8's `07` row lists fit, separation and contrast and says *exists*; it does not bind the harmony value.
   - **Fit.** "94% Match (Cool-Muted profile)" is OQ-32 plus E2. (claims-ok: quotes the drawn construction this line resolves)
   - **Separation.** "98% Separation (Protan/Deutan Safe)" is E2: the figure is `cvdAccessibility`, the worst pair over three deficiencies at severity 1. (claims-ok: quotes the drawn construction this line resolves)
   - **Contrast.** "6.2:1 (APCA Passed)" is E2. Nothing defines which pair; `compare.ts#compare(a, b)` gives `wcagRatio`, `apcaBOnA` and `apcaAOnB` for two entries.
5. **Done criteria the rebuild would break if 07 were read literally.**
   - F-195 c1: ranked trouser and shoe candidates *with the reason for each*. c3: someone with no profile is told which half is missing.
   - F-199: one interaction to the shopping check, carrying the slot; add to the wardrobe with nothing stored until the person saves. Only Wear carries these (`onShopFor` and `onAddToWardrobe` occur in Wear and its route only).
   - F-208 c1: *each ranking offers its alternatives*, each labelled with its axis.
   - 07 draws none of these per candidate. They are required capabilities 07 does not draw, so E4 applies: they are preserved, built from the mockups' own components.
6. **The engine's alternatives are relative to each slot's top pick** (`alternativesFor`, private). After a *Swap*, a pill reading *Make Warmer* could point at a colour cooler than the one shown, which is a false statement on the page. Fixing this needs an additive engine export.
7. **The 07 inventory has defects to correct in increment 1.**
   - `07.title` binds `corpus:entry.name.romaji` but its box (443 px) spans `‹Romaji› | Wear It • Outfit Combinations`. The back word, the divider and the title are three elements, and AppBar already draws a `divider` (19's).
   - Its `raw.emDp: 26` is very likely px, not dp. By 02.mjs's rule, 28 px / 0.93 × 0.6809 ≈ 20.5 dp; by advance ≈ 17.7 dp. It is recorded `title`. Re-measure; the type census and the step move with it.
   - The chosen segment's word (*Minimalist Office*) has no element; only its pill and dot are recorded.
   - `07.slots.slot-4.swap` is 65 × 18 px. That is the ink only: its sibling on slot 3 is 82 × 34 with an outline, and 07 draws both alike.
   - Slot bindings are `store:outfit.slot.n.*`. The slots are engine-ranked corpus colours (ADR-0136's consequence line).
   - Slots 2–4 end their name with a stray `•`. It is unrecorded; read it as garbled text (§2) unless the crop shows otherwise.
   - *Harmony **Badge**:* and *…Accessibility **Card*** print component names, and the title spells *Color*. These are §2 leaked text and §2's en-GB bullet.
   - The kimono is recorded as `outside-art` (notDesign), while F-248's note lists it as an element. §2 and the inventory govern; the note is stale.
8. **The drawn horizontal composition is irregular, and is built as drawn.**
   - Anchor card: 17.7 dp each side.
   - Occasion control: 17.7 dp leading, 3.4 dp trailing.
   - Slots: 8.9 / 11.6 dp.
   - Intelligence card: 9.5 dp leading, **0.7 dp trailing**, under half of `xs`.
   - Action bar: 14.3 / 11.6 dp.
9. **`ChoiceGroup` segmented gives every segment `flex: 1` and one line.** 07's segments are sized to their words: 57 / 126 / 116 / 61 dp. At equal widths (≈ 75 dp of label room each), *Minimalist Office* would truncate, and truncation is E3's clipping.
10. **What `@irodora/ui` cannot draw yet.**
    - A `Button` on a colour sample. Slot 2's *Swap/Lock* are filled dark on a light sample; slots 3 and 4 draw an outline on dark samples.
    - A tinted button glyph: the gold padlock, a C10 exception declared `mintedBy: "F-248"` (manifest line ≈ 1991, `#C8A145`, covering `07.slots.slot-2.lock`, `15.security.badge` and `16.slots.slot-1.locked`).
    - A toggle `Button` with an announced state.
    - An action bar line that says why an action is disabled.
    - Possibly a `Swatch` whose height follows its row (tiles in a row are drawn equal).
11. **The Lab renders nothing without a profile.** `app/(tabs)/wardrobe/outfit.tsx` returns `null` when `context.profile === null`, and the Wardrobe already hides its Lab button for that reason. A save that opens the Lab must not land on that blank screen.
12. **The type scale makes the page taller than drawn.**
    - Body leading is 26.4 dp. A two-line slot name is drawn at a 17.7 dp pitch, so it builds 52.8 dp against a drawn 31.3.
    - Label rows build 21.7 dp against a drawn 22.1 dp pitch, with sub-half gaps.
    - Increment 8's test computes the totals: the canvas is about 46 dp taller and the card about 8 dp taller. ADR-0153 states them.
13. **Old tests assume the old screen.**
    - `wear-alternatives.test.tsx` counts every slot's alternatives on one tree.
    - `screens.test` registers five Wear subjects: plain, `(no profile)`, `(trouser)`, `(with destinations)` and `(not in this corpus)`.
    - `e2e/capture/routes.json` anchors `/atlas/wear/[slug]` on `wear.title`.
    - `wear.test.ts` holds `wearWith` and stays valid.

---

## Decisions

All four rest on R9 §11's widened delegation of 2026-10-05: *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* Golden rules 11–14 are not reopened. Full drafts are in Appendices A–D.

### D-1 (ADR-0150): OQ-32. The fit note names the profile the figure was computed against, never a type

- **The drawn note stays, as a note.** `07.intelligence.fit.value` prints `‹n›% (your profile)` (ja `‹n›%（あなたのプロフィール）`).
  - *Match* goes (E2, already listed).
  - *Cool-Muted* goes. It is a seasonal type (C12), and a type beside a score says the score derives from it. `scoreColor` never sees the label (ADR-0102 §6), so that would be false.
- **The figure** is the outfit's `personalFit` component (FR-32's area-weighted FR-29), from `scoreOutfit` over the four pieces under the chosen occasion's rules.
- **With no stored profile there is no figure.** The value reads *No profile yet* (E-101; F-195 c3 holds).
- **It binds 13 (F-257).**
  - 13's *(Cool-Muted Match)* becomes *(your profile)*.
  - A saved lookbook figure whose envelope's profile revision is no longer the current one reads *(an earlier profile)*. F-257 adds that key when it renders it. This is computable from the stored envelope with no migration, which resolves F-257's note about replaying a profile that keeps no history.
  - A seasonal label appears only on 23, beside its ranges (ADR-0102 and F-223 unchanged).

### D-2 (ADR-0151): 07's words, slots and figures, made true

- **Occasions** are FR-34's published weightings, each named by its own word. `WEAR_OCCASIONS = ['casual','office','japanese-inspired','formal']`, in drawn order.
  - *Casual* is kept.
  - *Minimalist Office* → **Office**: FR-34 publishes `office` and `minimal` separately.
  - *Japanese Classic* → **Japanese-inspired**: no "classic" weighting exists, and FR-23 says never present inspired as traditional.
  - *Evening* → **Formal**: no evening weighting exists; formal is the published profile for "narrow and dark" palettes.
  - All three are listed as E2 rows.
  - The control **rests on Office**, as drawn (ADR-0120's rule: a control rests where it is drawn).
  - Rankings read `occasionRuleSet(occasion)`. Outfit weights stay the published `outfit` block.
- **The slots.**
  - Slot 1 is the colour, as a top (`DEFAULT_SLOT`, as ADR-0148 placed it). The slot chooser leaves; F-195 c1, "a colour resolves into a slot", still holds.
  - Slots 2–3 are FR-31's ranked trousers and shoes (`recommendOutfit`).
  - Slot 4, *Outerwear*, is ranked by `recommendForSlot` **with the engine's `top` slot**, because the builder files coats under top. `OUTFIT_SLOTS`, coverage, the Lab and the lookbook keep three slots. An engine fourth slot is F-257's to raise, with its coverage consequence.
- **Slot words.**
  - Titles: *Slot 1 (Top - Anchor) · Slot 2 (Trousers) · Slot 3 (Shoes) · Slot 4 (Outerwear)*.
  - Names, following each drawn structure: slot 1 `‹Romaji› ‹English›`; slots 2–4 `‹Romaji› (‹English›)`.
  - Garment and material words (*Linen Shirt*, *Wool Slacks*, *Derby*, *Trench*) are E1 sample content.
  - The anchor's line is `‹kanji› ‹Romaji› (‹hex›)`. The category is the slot word, *Top*; the brackets are notation (ADR-0142 D3) and *Shirt* is E1.
- **The card's four values.**
  - **Harmony.** The warm–cool relationship (FR-6's `warm-cool`, the axis the outfit's `harmony` component measures), in words from its direction: *Shared Warmth / Mixed Warmth / Warm Against Cool* (ja 温度感が揃う / 温度感が混在 / 暖色と寒色が対立). A named FR-6 geometric kind for a set needs an engine classifier: backlog **F-349**, which 08 and 13 also want.
  - **Fit.** As D-1.
  - **CVD.** `‹worst›% Separation (Protan/Deutan/Tritan · Machado 2009)`, from `cvdAccessibility`, which runs at severity 1. *Safe* goes (E2).
  - **Contrast.** `‹ratio›:1 · Lc ‹|Lc|›` between the anchor and the trousers, the outfit's two largest areas (`SLOT_AREA`). The ratio is at 1 decimal. Lc is the **smaller** magnitude of the two directions, so it never overstates (rule 11); the accessible name says which pair. Both come through `compare()`. *APCA Passed* goes (E2: APCA has no ratio).
- **Copy.**
  - Labels: *Harmony:* (the component word *Badge* is §2 leaked text), *Personal Fit Score:*, *CVD Distinction:*, *Contrast Ratio:*.
  - Card title: *Deterministic Colour Intelligence & Accessibility*. *Color* is §2's en-GB bullet, and *Card* is a leaked component word.
  - Title: *Wear It • Outfit Combinations*. Back word: the colour's romaji; name *Back to ‹Romaji›*.

### D-3 (ADR-0152): What 07's controls do, and what it keeps that it does not draw

- **The slot in hand.**
  - One of slots 2–4 is in hand. It rests on slot 2, as drawn.
  - It draws 07's slot-2 treatment: *Swap* and *Lock* under its name. The others draw the slot-3/4 treatment: a compact *Swap* in the title row.
  - Tapping a tile's text puts that slot in hand and opens its sheet (below).
  - The anchor has no controls, as drawn.
- **Swap** steps to the next candidate in that slot's engine ranking and wraps at its end. It is disabled while the slot is locked.
- **Lock** is a toggle.
  - Its label reads *Lock* or *Locked*, and its state is announced as selected (rule 13).
  - A locked slot keeps its colour (by id) across Swap, the pills and an occasion change.
  - A locked slot that is not in hand shows 13's *Locked* badge in place of its compact Swap. This is an E4 state 07 does not draw.
- **The pills** are the in-hand slot's alternatives (FR-38, F-208 c1).
  - There are as many as the engine returns (2–4); the drawn three is a count, which is E1.
  - Each is `‹axis›: + ‹English name› ‹slot word›`, relative to **the colour the slot shows**, through a new additive `alternativesAround` in `@irodora/recommendation`.
  - `alt.*` is re-valued to the drawn phrasing: *Make Warmer, Make Cooler, Make Lighter, Higher Contrast*. *Monochrome* is no engine axis (E2).
  - Selecting a pill puts that candidate in the slot. Pills are disabled for a locked slot.
- **The slot sheet** (E4, 03's floating `Sheet`).
  - Its content: the candidate's sample and names; *‹n› of ‹N› for ‹slot›, with ‹anchor›*; FR-31's figures, through `shownScore` and `shownFactors` (with a profile: overall, *With this colour*, *Suits you*, and the four factor sentences; without one: the pairing figure and `wear.noProfile`); and `wear.what`.
  - Its footer: *Open this colour · Shop for this · Add to wardrobe* (F-199).
  - This preserves F-195 c1/c3, F-199, FR-73's "reason for each" and FR-11's explanation of every shown candidate score.
- **Save to Outfit Lab** hands the combination to the Lab and opens it. This is the mockups' own story: 13 opens with the same four colours and slot 1 locked, and 13's own save is the one that persists, to the lookbook.
  - `offerCombination` is a one-shot mailbox, like `lens/handoff`.
  - The Lab route builds `initialDraft` with `labDraftFrom`: for each Lab slot, the owned garment of that slot nearest the combination's colour by ΔE00 (the engine's), with the top locked. A slot with no owned garment stays empty. The outer layer waits for 13's fourth row (F-257).
  - **Without a profile the button is disabled**, with its reason on a line in the bar (ADR-0136 D4's form; finding 11). This is E4.
- **Export Palette Tokens** opens `/profile/export?colours=a,b,c,d`. `exportSubjectFor` gains a `colours` parameter and `combinationSubject(entries)`. The design-tokens format is among the export's six.
- **Back** navigates (it does not pop) to `/atlas/[slug]`, as `07.json` records and as F-247's review (S1) settled for 06.
- **What leaves the page.**
  - The slot chooser; the per-slot lists of six; the alternative cards; the page-level `wear.what` (it moves into the sheet); *Build a profile* (the fit row says what is missing, and the Profile tab is one interaction away, FR-71).
  - Each capability is kept above or in the sheet.

### D-4 (ADR-0153): 07's composition, its inks, and the kimono

- **Intervals.** As in the table below, snapped by §2. Intervals tighter than the scale take `xs` and are named, with their cost. The heights the type scale adds are stated.
- **Inks.**
  - **C8 extended to a control on a sample:** `Button on={sample}` takes `sampleInk`'s choice.
    - Where the dark ink wins (slot 2 as drawn), the button is filled with it and labelled in the other ink.
    - Where the light ink wins (slots 3 and 4), the button is outlined and labelled in it.
    - Label ≥ 4.5:1 on its fill; fill or edge ≥ 3:1 against the sample. Identical in every theme, because the sample decides.
  - **`glyph.lock` = `#C8A145`** in every palette: `usage: nonText`, paired with nothing (the word carries the state). It is minted as a token group carrying 07, 15 and 16's padlocks, retiring the element exception (E-159's pattern).
- **The kimono is outside the frame** (§2, `07.json` notDesign) and is not built.
  - Increment 1 masks `x 590–667, y 137–730` for strokes inside `07.screen`.
  - **If any lie inside**, the in-frame part is built as 11's kimono backdrop at `opacity.art`, sized by its drawn height (690 px × 0.6809 = 469.8 dp) against the kimono grid's own aspect, clipped by the screen. Then the lesson applies: every text it crosses is checked at the art's ink in all four palettes, and text under 4.5:1 keeps clear of the strokes.
  - F-248's note is corrected either way.

---

## Implementing session's decisions on this design

Each change from this plan, with its reason.

- **Slot 2's Swap and Lock are the tonal level-3 button**, not `Button on` filled: 07 fills them
  `#31363E`, `surface.3`'s own value, with light words on their fill (ADR-0153 D2). Only the compact
  Swaps sit on the sample, so only they take its ink.
- **The occasion control, its segments and the pills are `sm`**, not `md` and `pill`: increment 1's
  corner readings (ADR-0153 D3).
- **Type steps, read in increment 6** (ADR-0153 D9): slot 2's buttons `label`, the compact Swaps and
  pills `caption`, the actions `label`, the save at board 00's primary 500 (D10).
- **The action bar** starts at its rule, its sides one step (`sm`), the card → bar `lg` (D10): the
  fidelity test found the box measured from the leaked label above it.
- **Locked**: the toggle has a word of its own, `wear.locked` (固定中), so the Japanese state shows;
  13's badge keeps `lab.locked`. The plan's `wear.locked` stands; the first build reused `lab.locked`,
  which reads 固定 for both states in Japanese (review, S3).
- **The tile** is a `Swatch` of a filled height, apart from its children (`group={false}`), its own
  named node the press target — `Swatch` gained both forms (ADR-0153 D8). The plan's separate press
  target named the colour a second time (review, S4).
- **Placement** (ADR-0151 D2 amended): the plan ranked each slot and showed its first, which put one
  colour in all three slots for every colour; `placeSlots` places them once (review, S1).
- **Contrast floored, harmony in temperature's words** (ADR-0151 D4 amended; review, S2, S7).
- **The sheet holds no sample of its own**: its colour is the tile it opened from, drawn above it.
- **Not built, with why**: the built-over-drawn height totals (a test tree has no layout, so the totals
  would be arithmetic restating the constants); the 120 × 4 Button contrast as a render (the ink is
  `sampleInk`'s, which `screens-sample-ink.test` measures over the corpus in every palette).
- **Shopping from a slot** takes two interactions (ADR-0152 D4 amended; F-199's note; review, S5).

---

## Approach

### Reused (paths)

- **`@irodora/ui`:**
  - `Screen` (`scroll={false}`, `bleed`, `appBar`, `actionBar`); `AppBar` (`back` with `label`, `size`, `name`; `divider`; leading `title`; `height`; `inset`; `gap`); `ActionBar`.
  - `Card` (`level 1`, `padding`, `radius`, `testID`).
  - `Swatch` (`size`, `corner`, `keylineWidth`, `width="fill"`, `children`), `swatchAccessibleName`; `Text` (`on={sample}`, `numeric`, `heading`).
  - `ChoiceGroup` segmented (`mark: 'dot'`, `selectedFill: 'accent'`, `radius: 'md'`, `height`).
  - `Chip` (control, `height`, `radius: 'pill'`); `Chip form="badge"` (13's *Locked*); `Button` (primary; secondary `edge="border"`; `glyph`, `glyphAt`, `height`, `radius`, `step`).
  - `Sheet form="floating"`; `EmptyState`; `Row`, `Stack`; `sampleInk`/`sampleEdge`; `hitArea`, `platformTapTarget`.
- **`apps/mobile/src`:**
  - `wear.ts`: `wearWith`, `NO_EVIDENCE_PROFILE`, `DEFAULT_SLOT`, `shownScore`, `shownFactors`, `ALTERNATIVE_MESSAGE_KEYS`. All are kept, and their tests stay.
  - `outfit/builder.ts` (`slotFor`, `engineProfile`, `pieceOf`, `Placement`); `wardrobe/coverage.ts#rankingContext` (weights and reference; rules swapped for the occasion's); `compare.ts#compare` (ratio and both Lc); `corpus` (`entryBySlug`, `colorFor`, `allEntries`); `notation.ts#capitalised`.
  - `lens/handoff.ts` (`offerCorpusColour`, the mailbox pattern); `export/subject.ts`; `rules.ts`; `states.ts`; `i18n`.
- **Packages:**
  - `@irodora/recommendation`: `recommendOutfit`, `recommendForSlot`, `scoreOutfit`, `outfitWeights`, `parseWeightContent`, `ruleSetFor`, `OCCASIONS`, `ALTERNATIVE_AXES`, `SLOT_AREA`.
  - `@irodora/color-difference`, through `compare`. `@irodora/cvd-engine`, through `scoreOutfit`.
- **Tests and tools:**
  - `apps/mobile/test/inventory.ts` (`elementFindings`); `screens.test.tsx` (`draw`, `drawLive`, `ENROLLED`, decoys).
  - `colour-detail-fidelity.test.tsx` and `atlas-fidelity.test.tsx` helpers, copied in shape: `snap`, `belowTheScale`, `snapSiblings`, `inOrder`, `sharedRow`.
  - `mockups/tools/measure.ps1`, `corner.ps1`, `tint.ps1`, `stem.ps1`, `mask.ps1`, `art-measure.ps1`, `serif-weight.mjs`, `generate-inventory.mjs`.
  - `scripts/generate-design-tokens.mjs`, `verify-token-reach.mjs`, `verify-font-coverage.mjs`, `generate-font-subset.mjs`, `generate-e2e-flows.mjs`; `pnpm fidelity:capture`.

### New

- **`apps/mobile/src/wear.ts`** (additions; pure, every input an argument):
  - **Constants and types.**
    - `WEAR_OCCASIONS`, `RESTING_OCCASION = 'office'`.
    - `WEAR_SLOTS`: `[{key:'top', engine:'top', anchor:true}, {key:'trouser'}, {key:'shoe'}, {key:'outer', engine:'top'}]`.
    - `WearState`: `{ occasion, inHand, shown: Record<slot, id|null>, locked: Record<slot, boolean> }`.
  - **The combination.** `wearCombination(slug, state, stored: StoredPersonalProfile | null, context) → { anchor, slots: { key, entry, rank, of, locked }[], alternatives, intelligence: { harmony, fit: number | null, separation: { score, deficiency }, contrast: { ratio, lc } } } | null`.
  - **Reducers:** `swap`, `toggleLock`, `substitute`, `chooseOccasion` (locked ids kept), `putInHand`.
  - **Words:** `slotName(entry, slotIndex)`, `anchorLine(entry)`, `pillLabel(alt, slot, t, script)`, `harmonyWords(direction, t)`, `fitLine`, `separationLine`, `contrastLine`, `backName(romaji, t, script)`.
  - **Drawn sizes,** each recomputed by the fidelity test from `07.json`:
    - `WEAR_APP_BAR 37`, `ANCHOR 51.5`, `ANCHOR_KEYLINE` (Inc 1), `OCCASION 29.5`, `SWAP 27.5`, `SWAP_COMPACT 23`, `PILL 22.5`, `SAVE 37`, `EXPORT 34`, `LABEL_COLUMN 121`.
    - `BACK_GLYPH`, `SWAP_GLYPH`, `LOCK_GLYPH`: each drawn height × 24 ÷ the glyph's ink height in grid units.
    - `DIVIDER` (Inc 1).
- **`apps/mobile/src/rules.ts#occasionRuleSet(occasion)`.** Same digest and count checks, cached per occasion. `ruleSet()` and `RULES_OCCASION` are unchanged.
- **`apps/mobile/src/outfit/fromWear.ts`:** `offerCombination`, `takeCombination` (one-shot), and `labDraftFrom(combination, wardrobe): OutfitDraft`. Nearest is by `deltaE00` through `engine.ts`; ties go by garment id; the top is locked; no fourth slot.
- **`apps/mobile/src/export/subject.ts`:** `combinationSubject(entries)`, and `exportSubjectFor(slug, palettes, colours?)`.
- **`@irodora/recommendation`:** `alternativesAround(input, shown, ranked, candidates, rules)` is exported. `alternativesFor` becomes `alternativesAround(…, ranked[0], …)`, so `recommendForSlot` returns exactly what it returned before.
- **`@irodora/ui`.** All changes are additive; without the new prop the old tree renders, and a decoy test proves it.

| component | change | forced by |
|---|---|---|
| `ChoiceGroup.tsx` | `Segmented.fit?: 'equal' \| 'content'`. `content` sets segments to `flexGrow: 1, flexBasis: 'auto'`, so leftover space is shared equally | finding 9 (E3: no clipped word at 384 dp) |
| `Button.tsx` | (a) `on?: Sample`: C8's ink pair, filled or outlined per `sampleInk`. (b) `glyphTint?: 'glyph.lock'`. (c) `selected?: boolean`: a toggle, announced, no visual change of its own | D-4, D-3 (Lock), finding 10 |
| `ActionBar.tsx` | `note?: string`: one caption line under the actions in `foreground.2`, a polite live region | D-3 (save disabled without a profile) |
| `Swatch.tsx` | **only if Increment 5 shows it is needed**: `height: 'fill'`, so a sample stretches to its row with children (two tiles per row drawn equal) | the canvas rows |

- **`@irodora/design-tokens`:** `glyph.lock` `#C8A145` in every palette, as a token group (ADR-0153). The element exception at manifest ≈ L1991 is retired.
- **Catalogue (en / ja), new or re-valued.** ja is a first draft for OQ-5's reader.

| key | en | ja |
|---|---|---|
| `wear.title` (**re-valued**) | Wear It • Outfit Combinations | 着てみる • コーディネートの組み合わせ |
| `wear.back` | Back to | に戻る (order by script) |
| `wear.occasion` | Occasion | 場面 |
| `wear.occasion.casual` / `.office` / `.japaneseInspired` / `.formal` | Casual / Office / Japanese-inspired / Formal | カジュアル / オフィス / 和風 / フォーマル |
| `wear.slot.1`–`.4` | Slot 1 (Top - Anchor) … Slot 4 (Outerwear) | スロット1（トップス・基準）… スロット4（アウター） |
| `wear.slotWord.outer` | Outerwear | アウター |
| `wear.swap` / `wear.lock` / `wear.locked` | Swap / Lock / Locked | 入れ替え / 固定 / 固定中 |
| `wear.intelligence` | Deterministic Colour Intelligence & Accessibility | 決定論的な色分析とアクセシビリティ |
| `wear.harmony` / `wear.fit` / `wear.cvd` / `wear.contrast` | Harmony: / Personal Fit Score: / CVD Distinction: / Contrast Ratio: | 調和： / パーソナル適合度： / 色覚での識別： / コントラスト比： |
| `wear.harmony.supports` / `.neutral` / `.opposes` | Shared Warmth / Mixed Warmth / Warm Against Cool | 温度感が揃う / 温度感が混在 / 暖色と寒色が対立 |
| `wear.fit.yours` / `wear.fit.none` | (your profile) / No profile yet | （あなたのプロフィール）/ プロフィール未作成 |
| `wear.separation` / `wear.cvdModel` | Separation / Protan/Deutan/Tritan · Machado 2009 | 分離度 / P型・D型・T型・Machado 2009 |
| `wear.rankOf` and the sheet labels | (the rank line; close and handle labels) | (同) |
| `alt.warmer` / `.cooler` / `.lighter` / `.higherContrast` (**re-valued**) | Make Warmer / Make Cooler / Make Lighter / Higher Contrast | 暖かく / 涼しく / 明るく / コントラストを強く |
| `wear.saveToLab` / `wear.saveNeedsProfile` / `wear.exportTokens` | Save to Outfit Lab / Build a profile to use the Outfit Lab. / Export Palette Tokens | アウトフィットラボに保存 / … / パレットトークンを書き出す |
| **kept** | `wear.overall`, `wear.pairing`, `wear.noProfile`, `wear.what`, `wear.openColour`, `wear.shopFor`, `wear.addToWardrobe`, `wear.none` (in the sheet; `none` is an empty tile) | |
| **removed when unused** | `wear.slot`, `wear.alternatives`, `wear.buildProfile`, `wear.open` (if unread) | |

### The composition, as a sketch

```tsx
<Screen scroll={false} bleed script={script}
  appBar={{ back: { glyph: 'back', label: romaji, name: backName(romaji), size: BACK_GLYPH, onPress: onBack },
            divider: DIVIDER,
            title: { text: t('wear.title'), align: 'leading', placement: 'bar', layout: 'inline', size: /*Inc 1*/, weight: 500 },
            height: WEAR_APP_BAR, inset: md, gap: /*Inc 1*/, script }}
  actionBar={{ rule: true, gap: sm, padding: { top: /*Inc 1*/, bottom: sm, side: /*Inc 1*/ },
               note: profileKnown ? undefined : t('wear.saveNeedsProfile'),
               actions: [ { label: t('wear.saveToLab'), height: SAVE, radius: 'pill', disabled: !profileKnown, onPress: onSaveToLab },
                          { variant: 'secondary', edge: 'border', label: t('wear.exportTokens'), height: EXPORT, radius: 'pill', onPress: onExport } ] }}>
  <ScrollView testID="wear.scroll" contentContainerStyle={{ paddingTop: xl, paddingBottom: md }}>
    <View style={{ paddingHorizontal: md }}>
      <Card level="1" padding="sm" radius={/*Inc 1*/} testID="wear.anchor">
        <Row gap="sm" align="center">
          <Swatch size={ANCHOR} corner="sm" keylineWidth={ANCHOR_KEYLINE} name hex color />
          <Stack gap="xs">{/* drawn −4.95 dp → xs, named */}
            <Text size="body" weight={500}>{anchorLine}</Text>
            <Text size="label" color="foreground.2">{t('outfit.top')}</Text>
          </Stack></Row></Card>
    </View>
    {/* xl */}
    <View style={{ paddingLeft: md, paddingRight: xs }}>
      <ChoiceGroup label={t('wear.occasion')} options={occasions} value={state.occasion} onChange={…}
        segmented={{ mark: 'dot', selectedFill: 'accent', radius: 'md', height: OCCASION, fit: 'content' }} testID="wear.occasion" />
    </View>
    {/* xl */}
    <View style={{ paddingHorizontal: sm, gap: sm }}>
      <Row gap="sm" align="stretch"><SlotTile slot="top" anchor /><SlotTile slot="trouser" /></Row>
      <Row gap="sm" align="stretch"><SlotTile slot="shoe" /><SlotTile slot="outer" /></Row>
    </View>
    {/* md */}
    <View style={{ paddingLeft: sm, paddingRight: xs }}>{/* trailing 0.7 dp → xs, named */}
      <Card level="1" padding="sm" radius={/*Inc 1*/} testID="wear.intelligence">
        <Text size="body" weight={600} heading>{t('wear.intelligence')}</Text>
        {/* lg */}
        <Stack gap="xs">{/* sub-half → xs, named */}{rows.map(r =>
          <Row><Text size="label" color="foreground.2" style={{ width: LABEL_COLUMN }}>{r.label}</Text>
               <Text size="label" style={{ flex: 1 }}>{r.value}</Text></Row>)}</Stack>
        {/* sm */}<View testID="wear.intelligence.rule" style={{ height: 1, backgroundColor: border, marginRight: -(sm - xs) }} />
        {/* xl */}<Row wrap gap="xs">{alternatives.map(a =>
          <Chip label={pillLabel(a)} height={PILL} radius="pill" disabled={locked} onPress={…} testID={`wear.pill.${a.axis}`} />)}</Row>
      </Card>
    </View>
  </ScrollView>
  <Sheet form="floating" open={sheet !== null} title={…} closeLabel handleLabel handleHint footer={<SheetActions />}>…</Sheet>
</Screen>
```

**`SlotTile`** is a `Swatch` (no `onPress`, `corner` per Inc 1, `keyline={false}`), with its children:

- A `Pressable` (`wear.slot.<key>.open`) that holds the title, hex and name, all `Text on={sample}`. It puts the slot in hand and opens its sheet; the anchor's is not pressable.
- The title row, which ends in a compact `Button on={sample} glyph="refresh" glyphAt="end" height={SWAP_COMPACT}`, or 13's *Locked* badge when the slot is out of hand and locked.
- When the slot is in hand, a `Row gap="xs"` holding `Button on Swap` and `Button on Lock`, with `glyph="lock-solid" glyphTint="glyph.lock" selected={locked}`.

The controls are siblings of the `Pressable`, never nested in it. If `Swatch` groups its children into one accessible node, that is a defect to fix in Inc 4 (see Risks).

**The absent colour** is `Screen appBar={{ back, height }}` with `EmptyState message={t('detail.notFound')} resolvedHere` (E4, ADR-0128 §6). `STATES = { absent: 'empty' }` is unchanged.

### Drawn intervals, from `07.json` at 0.6809 dp/px, insets subtracted

Line insets, as (lineHeight − em)/2: latin body 5.2, label 3.85, title 2.2. Shapes have none. **Increment 1 may move an em, and the test recomputes.**

| interval | px | ink dp | less | built | snap |
|---|---|---|---|---|---|
| bar height (`07.header`) | 54 | 36.8 | — | 37 | constant |
| back glyph inset | 29 | 19.7 | — | | `md` |
| bar → anchor card (leaked label's space kept, F-246's rule) | 46 | 31.3 | — | 31.3 | `xl` |
| page inset, anchor card (both sides) | 26 / 26 | 17.7 | — | | `md` |
| card → swatch: top / bottom / leading | 14 / 14 / 17 | 9.5 / 9.5 / 11.6 | — | | `sm` |
| swatch → name column | 17 | 11.6 | — | | `sm` |
| name → category | 6 | 4.1 | 5.2 + 3.85 | **−4.95** | **named, `xs`** (+8.95) |
| anchor → occasion | 56 | 38.1 | — | | `xl` |
| occasion inset: leading / trailing | 26 / 5 | 17.7 / 3.4 | — | | `md` / `xs` |
| occasion height; segment inset | 43; 3 / 4 | 29.3; 2.0 / 2.7 | — | 29.5; 2.5 | `OCCASION`; `SEGMENT_INSET` |
| occasion → slots | 55 | 37.5 | — | | `xl` |
| slots: leading / trailing / h gap / v gap | 13 / 17 / 14 / 15 | 8.9 / 11.6 / 9.5 / 10.2 | — | | `sm` |
| tile → title (s1–s4) | 20 / 20 / 20 / 19 | 13.6 / 13.6 / 13.6 / 12.9 | 3.85 | 9.8 / 9.8 / 9.8 / 9.1 | `sm` |
| tile → text, leading | 17–18 | 11.6–12.3 | — | | `sm` |
| title → hex (s1–s4) | 30 / 12 / 16 / 16 | 20.4 / 8.2 / 10.9 / 10.9 | 7.7 | 12.7 / **0.5** / 3.2 / 3.2 | siblings → **`xs`**: s2 named sub-half (+3.5); s1 named as a sibling (−8.7) |
| hex → name (s1–s4) | 9 / 9 / 8 / 8 | 6.1 / 6.1 / 5.4 / 5.4 | 3.85 + 5.2 | **−2.9 / −2.9 / −3.6 / −3.6** | **named, `xs`** (+6.9 / +7.6) |
| name → in-hand buttons | 9 | 6.1 | 5.2 | **0.9** | **named, `xs`** (+3.1) |
| buttons → tile bottom | 12 | 8.2 | — | | `sm` |
| name → tile bottom (s3, s4) | 18 / 19 | 12.3 / 12.9 | 5.2 | 7.1 / 7.7 | `sm` |
| compact Swap: top / trailing | 14 / 15 | 9.5 / 10.2 | — | | `sm` |
| Swap ↔ Lock | 7 | 4.8 | — | | `xs` |
| slots → card | 26 | 17.7 | — | | `md` |
| card inset: leading / trailing | 14 / 1 | 9.5 / **0.7** | — | | `sm` / **named, `xs`** (+3.3) |
| card → title; card → text | 22; 17 | 15.0; 11.6 | 5.2; — | 9.8 | `sm`; `sm` |
| title → first row (leaked label's space kept) | 45 | 30.6 | 5.2 + 3.85 | 21.6 | `lg` |
| row → row | 12 / 13 / 12 | 8.2 / 8.9 / 8.2 | 7.7 | **0.5 / 1.2 / 0.5** | **named, `xs`** (+3.5 / +2.8 / +3.5) |
| label → value column | 178 | 121.2 | — | | `LABEL_COLUMN` |
| last row → rule | 17 | 11.6 | 3.85 | 7.7 | `sm` |
| rule end → card edge | 4 | 2.7 | — | | `xs` (the rule runs `sm − xs` past the padding) |
| rule → pills (leaked label's space kept) | 50 | 34.0 | — | | `xl` |
| pill gaps: h / v | 8 / 7 | 5.4 / 4.8 | — | | `xs` |
| pills → card bottom; pill end → card edge | 17; 19 | 11.6; 12.9 | — | | `sm` |
| card → scroll end | 20 | 13.6 | — | | `md` |
| bar rule → buttons | 30, or 16 if the rule is at the leaked strip's foot | 20.4 / 10.9 | — | | `lg` / `sm`: **Inc 1** |
| buttons → bar bottom | 16 | 10.9 | — | | `sm` |
| bar sides: leading / trailing | 21 / 17 | 14.3 / 11.6 | — | | `md` / `sm`; one value if `ActionBar` takes one (mean 12.95 → `md`, trailing named +4.4) |
| save ↔ export | 14 | 9.5 | — | | `sm` |

**Heights the scale makes taller than drawn** (the test computes them; ADR-0153 states them):

| region | built | drawn | difference |
|---|---|---|---|
| anchor card | ≈68.1 | 70.8 | −2.7 |
| canvas row 1 (slot 2 in hand) | ≈151.7 | 125.3 | +26.4 |
| canvas row 2 | ≈121.5 | 99.4 | +22.1 |
| intelligence card | ≈255 | 247.2 | +8 |

---

## Increments

Each commit passes Tier 1 (ADR-0132): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'`, plus the domain gates named under each step.

### 0. Claim and plan

- This file goes to `.harness/plans/F-248-wear-is-mockup-07.md`.
- Set F-248 to `in_progress`, set `plan`, and add `attested` (Appendix E).
- Gates: `node scripts/verify-state.mjs`, format.

### 1. Measure, decide, specify (no source)

**Measure:**

- `measure.ps1` / `serif-weight.mjs --em`:
  - the header line's em, with the back word, divider and title split into three boxes;
  - the anchor name (mixed script); the pills' label; the *Swap*/*Lock* labels, big and compact; the two action labels; the slot-name line pitch.
- `stem.ps1`: the header's weight (500?) and the button labels' weight. If they cannot be read apart from 400, use board 00's form, as F-247's M1.
- `corner.ps1`: the anchor card, the occasion container and chosen segment, the slot tiles, the big and compact buttons, the intelligence card, the pills, the action buttons. The anchor swatch is 5.4, so `sm`.
- `tint.ps1`:
  - slot 2's *Swap/Lock* fill and ink; slots 3/4's *Swap* edge and ink;
  - the action bar's fill and where its top rule actually is (the leaked strip, 1249–1263);
  - whether the anchor and intelligence cards draw an edge.
- The anchor swatch's keyline width (`raw.keylinePx`).
- `slot-4.swap`'s outlined box.
- `mask.ps1` / `art-measure.ps1`: kimono ink inside `07.screen` (D-4).
- A crop of the trailing `•` on names 2–4.
- Readings below 12 dp go in comments, not `raw.emDp`.

**`07.mjs`:**

- Elements:
  - add `07.back.label` (`static` → the colour's romaji, `corpus:entry.name.romaji`) and `07.divider`;
  - rebind `07.title` → `static:wear.title`, with its measured type;
  - add `07.occasion.office` (the chosen word);
  - occasion bindings → `.office`, `.japaneseInspired`, `.formal`;
  - slot hex and name → `engine:wear.slot.n.*`;
  - `07.anchor.category` → `static:outfit.top`;
  - `07.actions.save` → `navigate:/wardrobe/outfit`; `07.actions.export` stays.
- `departures`:
  - E1: names, garment words, anchor category.
  - E2: occasion words; harmony value; fit (OQ-32 closed); cvd; contrast; pill axes (*Monochrome*).
  - E4: the slot sheet; *Locked* out of hand; the disabled save and its note; the no-profile fit text.
- `notDesign`: *Badge*, *Card*, *Color*; the trailing bullets; the kimono kept as outside-art (or recorded as built, per the mask).
- `conflicts`: C8 widened to the buttons on a sample; C12 resolution → "OQ-32 closed by ADR-0150"; a C10 note that the lock is minted.
- Regenerate `07.json`.

**Records:**

- Write ADR-0150 to ADR-0153 and add their `docs/adr/README.md` rows.
- PRD §10: remove OQ-32's row and add its closing paragraph.
- R9:
  - §2: component words in copy are leaked text;
  - §4 E1, E2 (07's rows rewritten), E4 (the sheet, *Locked*, the save note, the absent colour);
  - §6: C8 (controls on a sample), C10 census row 07 → minted `glyph.lock`, C12 (OQ-32);
  - §8: the `07` row (harmony, fit, separation, contrast pair, occasions, slots);
  - §11: OQ-32 → Closed.
- `feature_list.json`:
  - F-248's notes (the kimono note corrected; F-248's `openQuestions` → []);
  - notes on F-257, F-263, F-249, F-251, F-252, F-262, F-267, F-344;
  - new backlog F-349: *"The engine names the FR-6 relationship a set of colours stands in"* (needed by 07, 08, 13).

Gates: Tier 1, including `verify-mockups` and `mockup-inventory --check` in lint, and `type-scale.test` (the census, if the header's em moves).

### 2. Tokens

- `glyph.lock` in every palette, as a token group carrying `07.slots.slot-2.lock`, `15.security.badge` and `16.slots.slot-1.locked`; the element exception is retired.
- `c10-exceptions.test`; `generate-design-tokens.mjs`; `DESIGN-SYSTEM.md`.
- A temporary `unreached-tokens.json` row (`closedBy` F-248), removed in 4, where `Button`'s `glyphTint` first reads the token (the a11y gate's token-reach check refuses a declared-unreached token that has a reader).
- If the header's em is more than 4 dp from every step: a measured step per ADR-0121, with census and `MEASURED_STEP_READERS`.
- Gates: Tier 1, `generate-design-tokens --check`, `verify-token-reach` (and `--prove`), `pnpm test:contrast`, `pnpm test:cvd`.

### 3. Engine: `@irodora/recommendation#alternativesAround`

- Additive, with `alternativesFor` delegating to it.
- Tests in `packages/recommendation/test/outfit.test.ts` (see the test plan).
- Gates: Tier 1 (the package and its dependents: optimization, mobile).

### 4. `@irodora/ui`

- The changes in the table, each with a default-unchanged decoy.
- `segmented-choice.test`: `fit: 'content'` sizes segments by their words; the default stays `flex: 1`.
- `button.test`: `on`, over the 120 corpus colours in four palettes:
  - label ≥ 4.5 on its fill;
  - fill or edge ≥ 3 against the sample;
  - a light sample gives a filled button and a dark sample an outlined one;
  - decoy: without `on` the tree is unchanged.
  - Also: `glyphTint` draws in the token; `selected` announces and the label is the caller's.
- `action-bar.test`: `note` is a polite live region, absent when unset.
- `Swatch` `height: 'fill'`, only if needed, with its decoy.
- New conformance subjects: `Button on a sample (light, dark)`, `ChoiceGroup segmented (content)`, `ActionBar (note)`.
- Gates: Tier 1, `pnpm test:a11y`, `test:contrast`, `test:cvd`.

### 5. Pure logic

- `rules.ts#occasionRuleSet`; the `wear.ts` additions; `outfit/fromWear.ts`; `export/subject.ts`; the catalogue keys in en and ja (old keys stay until 6).
- Tests: `wear.test.ts` extended, `outfit-from-wear.test.ts`, `export-subject` cases, the rules test.
- Run `verify-font-coverage`. If it names glyphs (likely: 揃, 混, 在, 対, 寒, 暖, 識, 適, 析, 換, 固, 定, 面, 涼), run `generate-font-subset.mjs` and then `fonts.test`.
- Gates: Tier 1, `verify-font-coverage`.

### 6. The screen and its routes

- **Rebuild `Wear.tsx`.**
  - Props: `slug`, `stored?`, `wardrobeKnown?`, `onBack?`, `onSaveToLab?`, `onExport?`, `onOpenColour?`, `onShopFor?`, `onAddToWardrobe?`, `initial?: Partial<WearState>`.
  - An absent handler means an absent control.
- **`atlas/wear/[slug].tsx`:**
  - `<Stack.Screen options={{ headerShown: false }} />`;
  - `activeProfile(repo)` → `stored`;
  - `onBack` → `router.navigate('/atlas/' + slug)`;
  - save → `offerCombination(…)` then `/wardrobe/outfit`;
  - export → `/profile/export?colours=…`;
  - shop and add as today.
- **`wardrobe/outfit.tsx`:** `takeCombination()` once on mount, then `labDraftFrom` → `initialDraft`.
- **`profile/export.tsx`:** reads `colours`.
- `chrome.test`: delete the `atlas/wear/[slug]` row.
- **`screens.test`:**
  - the Wear subjects become `screens/Wear` (07 as drawn), `(no profile)`, `(slot 4 in hand, slot 2 locked)`, `(the slot sheet open)`, `(not in this corpus)`;
  - `(trouser)` and `(with destinations)` are removed, with the reason.
- `wear-alternatives.test.tsx` is rewritten: the in-hand slot's pills equal `alternativesAround`, counted.
- Remove dead keys.
- `screen-insets.json`: re-capture the Wear entries only.
- **e2e:** `routes.json` anchor → `wear.intelligence`; `node scripts/generate-e2e-flows.mjs`.
- `MEASURED_STEP_READERS`, only if a step was added. Remove the temporary token row.
- Gates: Tier 1, a11y, contrast, cvd, `verify-reachability`, `verify-route-targets`, `generate-e2e-flows --check`, `verify-token-reach`, `verify-font-coverage`. `verify:claims` and `verify-app-glyphs` run in lint.

### 7. Enrolment

- `ENROLLED` gains `07.screen` (root `wear.surface`) with its decoys.
- `inventory-surfaces.json` gains `"07.screen"`.
- Commit `conformance-sweep.json`.
- Gates: Tier 1, `verify-mockups`.

### 8. Criterion 1's own test

`apps/mobile/test/wear-fidelity.test.tsx`. Gates: Tier 1.

### 9. States and actions

`apps/mobile/test/wear-states.test.tsx`. Gates: Tier 1.

### 10. Effects and memory

- `effects.json`: the updates below, and E-217 to E-223, each with its note.
- Gates: Tier 1, `verify-state`.

### 11. Verify, review, record

- Run Tier 2, then the evaluator once.
- Fix its findings or record them, then run Tier 2 again on the final tree.
- Update `progress.md` and `feature_list.json`; capture lessons; checkpoint.

---

## Mockup fidelity

- **Governing:** `07` (P1). Variant: `25` for the palette only (P2). No `26`-style Japanese variant exists, so ja is the catalogue's words. Board `00` covers parts 07 does not show (P3), and `27` the absent state (ADR-0128).
- **Conflicts applied:**
  - C8 (text on the samples; widened to the controls on them);
  - C10 / ADR-0110 (the padlock's gold, minted);
  - C11 (the samples on the ground);
  - C12 (OQ-32 closed by ADR-0150);
  - C20 (the anchor's keyline at its measured width).
- **Element by element.** "Explicit" means a locator given in `ENROLLED`.

| # | element | built as | bound to | sweep locator |
|---|---|---|---|---|
| 1 | `07.header` | `Screen appBar`, h 37, no rule | — | derived: `AppBar` |
| 2 | `07.back` (+ `.label`, new) | `AppBar.back`, glyph `back`, `BACK_GLYPH` | romaji; named *Back to ‹Romaji›*; → `/atlas/[slug]` | glyph `back`; value `capitalised(romaji)` |
| 3 | `07.divider` (new) | `AppBar.divider` | — | explicit testID |
| 4 | `07.title` | leading title | `wear.title` | text |
| 5–7 | `07.anchor`, `.swatch`, `.name`, `.category` | `Card` sm; `Swatch` 51.5 sm keyline; `Text body 500`; `Text label fg2` | the entry; `anchorLine`; `outfit.top` | testID `wear.anchor`; derived `Swatch`; values |
| 8–13 | `07.occasion`, `.selected`, `.selected.dot`, the four words | `ChoiceGroup` segmented, dot, accent, `md`, 29.5, `fit: 'content'` | `WEAR_OCCASIONS`, rests on office | derived; texts |
| 14–33 | the four slots: tile, title, hex, name; slot 2's *Swap*/*Lock*; 3/4's *Swap* | `Swatch` tiles with `Text on`; `Button on` | `wearCombination` | testIDs `wear.slot.<key>`, `.swap`, `.lock`; values |
| 34–43 | `07.intelligence`, `.title`, four labels and four values | `Card` sm; `Text body 600`; rows | `wear.*`, the four lines | testID; texts; values through `wear.ts` |
| 44 | `07.intelligence.rule` | `View` | — | testID |
| 45–47 | `07.substitutions.*` | `Chip`, 22.5, pill | `alternativesAround` of the slot in hand | testIDs `wear.pill.<axis>`. The three inventory keys map to the first three pills in engine order; the mapping is stated in `ENROLLED` |
| 48–50 | `07.actions`, `.save`, `.export` | `ActionBar`; `Button` 37 pill; `Button secondary` 34 pill | handoff; `/profile/export?colours` | derived `ActionBar`; texts |

**Departures, by id (nothing else):**

- **E1:** the colour and slot names; garment and material words; the anchor's *Shirt*; the pill and slot counts; all figures.
- **E2:** *Match* (fit); *Cool-Muted* (OQ-32, ADR-0150); *Safe* (CVD); *APCA Passed* → ratio and Lc; harmony → the warm–cool relation; *Minimalist Office*, *Japanese Classic*, *Evening* → the weightings' words; *Monochrome* → the engine's axes.
- **E3:**
  - Every text row wraps and is never clipped.
  - Drawn-height chips and buttons clip at 200 %: F-344.
  - Segments sized by their words.
  - The buttons on a sample take C8's inks.
- **E4:**
  - the slot sheet (reasons, open, shop, add);
  - *Locked* out of hand (13's badge);
  - the disabled save and its note;
  - no fit figure without a profile;
  - the absent colour's back and `00`'s caption;
  - the tab bar under the action bar (already listed).
- **§2, not design:** the bezel; the board title and route string; the five leaked labels; *Badge*, *Card*, *Color*; the stray prime; the trailing bullets; the kimono outside the frame.
- **§2, tighter than the scale (named in ADR-0153):** name → category; title → hex (slot 2); hex → name (×4); name → buttons; card trailing; row → row (×3); slot 1's title → hex as a sibling.

If the capture shows anything else, it is fixed or it is a question for a person.

---

## Files to touch

```
.harness/plans/F-248-wear-is-mockup-07.md
docs/adr/0150-…0153-…, docs/adr/README.md
docs/PRD.md (§10), docs/design/R9-MOCKUP-FIDELITY.md (§2, §4, §6, §8, §11)
docs/design/design-system.manifest.json, DESIGN-SYSTEM.md            — glyph.lock, exception retired
mockups/tools/inventory-data/07.mjs, mockups/inventory/07.json
packages/design-tokens/src/generated/*, test/c10-exceptions.test.ts (+ type-scale/census only if a step)
packages/recommendation/src/outfit.ts, src/index.ts, test/outfit.test.ts
packages/ui/src/ChoiceGroup.tsx, Button.tsx, ActionBar.tsx, (Swatch.tsx), index.ts
packages/ui/test/segmented-choice.test.tsx, button tests, action-bar.test.tsx, conformance.test.tsx
apps/mobile/src/wear.ts, rules.ts, outfit/fromWear.ts (new), export/subject.ts, i18n/en.ts, ja.ts
apps/mobile/src/screens/Wear.tsx
apps/mobile/app/(tabs)/atlas/wear/[slug].tsx, app/(tabs)/wardrobe/outfit.tsx, app/(tabs)/profile/export.tsx
apps/mobile/test/wear.test.ts, wear-alternatives.test.tsx, wear-fidelity.test.tsx (new), wear-states.test.tsx (new),
  outfit-from-wear.test.ts (new), screens.test.tsx, chrome.test.ts, export tests, rules test
apps/mobile/e2e/capture/routes.json (+ regenerated flows)
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf (+ pins), only if verify-font-coverage asks
.harness/verification/inventory-surfaces.json, conformance-sweep.json, screen-insets.json, unreached-tokens.json (temporary)
.harness/state/feature_list.json, progress.md, effects.json; .harness/memory/effects/*.md
```

---

## Anticipated effects

### Existing links whose `from` this touches

| link | change | guard |
|---|---|---|
| **E-101** (`wear.ts` no-evidence profile) | the fit row, the sheet's figures and the disabled save read `personalKnown` | `wear-states.test`: no profile → no `%` in the fit row, no factor, save disabled with its note; decoy: a planted profile shows the figure |
| **E-208** (`wardrobe/coverage.ts`) | `rankingContext`'s weights and reference reused, rules swapped per occasion | `wear.test`: the context equals `rankingContext` but for `rules` (four parts written out) |
| **E-215** (06's actions → `/atlas/wear/[slug]`) | the route is rebuilt, its path kept | `colour-detail-states` route test, unchanged; `verify-route-targets` |
| **E-164** (layout → AppBar, `chrome.test`) | `atlas/wear/[slug]` leaves `PLATFORM_HEADER` | `chrome.test`, both directions |
| **E-203** (`verify-mockups`, sweep) | `07.screen` enrolled | `verify-mockups` in lint; `screens.test`, both directions |
| **E-149 / E-159** (C10 → manifest, `glyph.*`) | `glyph.lock` minted; 07/15/16 carried by a token group | `c10-exceptions.test` (each element covered once; decoy) |
| **E-161** (`sampleInk`) | a second consumer: `Button on` | `button.test` over 120 × 4 palettes |
| **E-016 / E-066 / E-089** (catalogues, ja claims) | keys added, re-valued and removed | `tsc`; `i18n.test`; `verify:claims` |
| **E-128 / E-134** (inventory → R9, PRD, features) | `07.json` edited; OQ-32 closed | `verify-mockups`; `mockup-inventory --check` |
| **E-145 / E-017** (Japanese content → font subset) | new catalogue kanji | `verify-font-coverage`; `generate-font-subset --check` |
| **E-191** (`states.ts`) | `STATES` unchanged; a new witness for the absent colour kept | the declarations test; `blank-panel`, `bare-zero` |
| **E-076 / E-065** (sizes; `Screen` bleed) | named constants; `scroll={false} bleed` | lint; the fidelity test |
| **E-152** (inventory → type census) | only if the header's em is off the scale | `type-scale.test` |

### New links (E-217 is the next free id)

- **E-217.** From `packages/recommendation/src/outfit.ts#alternativesAround`. To `recommendForSlot`'s `alternatives`, `wear.ts`, `Wear.tsx`, and F-208's guard.
  - **Hazard:** a pill says *Make Warmer* for a colour not warmer than the one shown, or `recommendForSlot`'s output moves.
  - **Guard:**
    - `outfit.test`: `alternativesAround(ranked[0])` deep-equals `alternatives` (the no-change oracle);
    - for the shown candidate `s`, every `warmer` alternative's `temperatureOf` exceeds `s`'s, and likewise for the other axes;
    - one candidate per axis;
    - decoy: a planted `shown` changes the answer.
- **E-218.** From `apps/mobile/src/wear.ts#wearCombination`. To `Wear.tsx`, `scoreOutfit`, `compare`, `recommendForSlot('top')` for the outer layer, and the fidelity and states tests.
  - **Hazard:** fit shown without a profile; the outer layer ranked through `recommendOutfit` (which refuses a second top, so the slot comes back empty); the contrast pair silently changing.
  - **Guard:** `wear.test`:
    - slot 4 is non-empty for all 120 entries;
    - the outer ranking equals `recommendForSlot(top, 'top', …)`;
    - the contrast equals `compare(anchor, trousers)` with the smaller |Lc| (decoy: the larger);
    - fit is `null` without a profile.
- **E-219.** From `apps/mobile/src/outfit/fromWear.ts`. To `app/(tabs)/wardrobe/outfit.tsx`, `OutfitBuilder initialDraft`, and F-257.
  - **Hazard:** 13's rebuild drops the hand-off, and 07's save then opens an empty Lab with nothing failing.
  - **Guard:**
    - `outfit-from-wear.test`: nearest by ΔE00, ties by id, the top locked, an empty slot left empty, taken once (decoy: a second take is null);
    - a route-source test in `wear-states.test` that the Lab route calls `takeCombination`;
    - the note on F-257.
- **E-220.** From `apps/mobile/src/rules.ts#occasionRuleSet`. To `Wear.tsx` and `wear.ts`; `RULES_OCCASION` and the lookbook unchanged.
  - **Hazard:** a weights publish lacking one of `WEAR_OCCASIONS` makes `ruleSetFor` throw on the page.
  - **Guard:**
    - a rules test: every `WEAR_OCCASIONS` member resolves in the newest version (decoy: a version lacking `formal` throws naming it);
    - gate 11's newest-version completeness;
    - FR-34: office and casual give different slot-2 picks for at least one entry (decoy: the same occasion twice gives the same).
- **E-221.** From `apps/mobile/app/(tabs)/atlas/wear/[slug].tsx` (07's drawn actions). To `/atlas/[slug]`, `/wardrobe/outfit`, `/profile/export?colours=`, `/wardrobe/shopping`, `/wardrobe/add`.
  - **Hazard:** a later rebuild of 18, 13 or 12 renames a route or stops reading `colours`.
  - **Guard:** `wear-states.test` reads each handler's own body (decoys: a back that pops, swapped targets); `export-subject.test` for `colours` (decoy: an unknown slug falls back); `verify-route-targets`.
- **E-222.** From `packages/ui/src/Button.tsx#ButtonProps.on`. To `Wear.tsx` and `sampleInk`.
  - **Hazard:** a button on a mid-tone sample whose label or edge fails.
  - **Guard:** `button.test`, 120 × 4 palettes, with the default-tree decoy.
- **E-223.** From `packages/ui/src/ChoiceGroup.tsx#Segmented.fit`. To `Wear.tsx`.
  - **Hazard:** content-sized segments overflow at 320 dp, or at 200 %, and a word clips.
  - **Guard:** `segmented-choice.test` (a width sum within the container at 384 dp in en and ja; decoy: the default stays equal); the 200 % device check (attested; F-344 for drawn heights).

---

## Test plan

**Unit and property** (`wear.test.ts` extended; the existing cases kept):

- **Occasions and slots.**
  - `WEAR_OCCASIONS` ⊂ `OCCASIONS`; the resting occasion is `office`.
  - The four slots resolve for all 120 entries.
  - The anchor is never a candidate.
  - FR-31's counts hold under every occasion.
- **Reducers.**
  - Swap wraps.
  - A locked slot keeps its id across swap, substitute and an occasion change (decoy: an unlocked slot moves).
  - The same actions give the same state (determinism).
- **The card's lines.**
  - `fitLine`: `(your profile)` with a profile, *No profile yet* without one.
  - `harmonyWords` follows the component's direction.
  - `separationLine` is the `cvdAccessibility` score.
  - `contrastLine` matches `compare`.
  - Decoy for every catalogue value: none contains *Match*, *Safe*, *Passed*, *Kasane*, *Evening*, *Classic* or a season word (a planted `Match` is found).
- **Names.** `slotName` takes the structure per slot. `pillLabel` uses the axis, the English name and the slot word.

**Engine:** see E-217. **Rules:** see E-220. **Hand-off:** see E-219. **Export:** `combinationSubject` gives four colours with the bundle's derivation and the envelope.

**Conformance subjects** (`screens.test.tsx`):

- `screens/Wear` (07 as drawn: office, slot 2 in hand, every handler);
- `(no profile)`;
- `(slot 4 in hand, slot 2 locked)`, which shows *Locked* out of hand;
- `(the slot sheet open)`;
- `(not in this corpus)`.

`sampleValues` adds the ranked hexes. `blank-panel` and `bare-zero` run on every subject.

**The inventory sweep (`ENROLLED`):**

- `07.screen`, root `wear.surface`, rendered `<Wear slug={WEAR_SLUG} stored={WEARER_STORED} …all handlers />`.
- Decoys:
  - the slot-4 Swap's id removed → one finding naming `07.slots.slot-4.swap`;
  - the divider removed → `07.divider`;
  - a pill removed → `07.substitutions.contrast`;
  - `07.screen` added to "the real surfaces are clean as drawn".

**Criterion 1's own test** (`wear-fidelity.test.tsx`, on the rendered tree):

- **Order:**
  - back < word < divider < title;
  - anchor swatch < name < category < occasion (casual < office < japanese-inspired < formal);
  - slot 1 < slot 2 < slot 3 < slot 4, each title < hex < name; Swap < Lock in slot 2;
  - card title < harmony < fit < cvd < contrast < rule < pills;
  - save < export.
- **Grouping:** shared `row` ancestors for the two tiles per row, slot 2's buttons, each card row's label|value, and the pills; Swap/Lock inside their tile; pills inside the card.
- **Proportion:**
  - every interval of the table recomputed from `07.json` through §2's snap, each subtracted inset written out;
  - negative and sub-half intervals go through `belowTheScale`, with the costs asserted against ADR-0153;
  - every size constant and every corner;
  - the built-over-drawn heights computed and compared with ADR-0153.
- **Type:** every text's `fontSize`, `fontWeight` and ink against `07.json` in en; the ja steps by the jp face's insets.
- **Wrap:** the card's value `Text`s and slot names have no `numberOfLines`; the segmented row uses `fit: 'content'`.

**Negative and action tests** (`wear-states.test.tsx`):

- **No 07 sample content** in either locale or theme, in paragraphs or names:
  - *Ai-nezumi, 藍鼠, #5B6B78, Rikyu-shira-cha, #D1C7BD, Kuro-tetsu, #1C2024, Shinshu-sabi, #343D46, Linen, Wool Slacks, Derby, Trench, Ochre Cardigan, Off-White, Slate Trousers, Analogous Tonal Kasane, 94%, 98%, 6.2:1, Cool-Muted, Match, Safe, APCA Passed, Minimalist, Japanese Classic, Evening, Monochrome*;
  - decoy: a planted *Ai-nezumi* is found.
- **Actions, each fired on the control a person touches:**
  - each occasion segment re-ranks an unlocked slot;
  - each Swap advances its slot;
  - Lock toggles, is announced selected, and the word reads *Locked*;
  - a pill substitutes;
  - a tile opens the sheet and puts the slot in hand;
  - the sheet's three actions call `onOpenColour(id)`, `onShopFor(id, slot)` and `onAddToWardrobe(id)`;
  - save calls `onSaveToLab(combination)`;
  - export calls `onExport(slugs)`;
  - back calls `onBack()`.
  - Decoys: an absent handler means an absent control; a locked slot's Swap and pills are disabled; save is disabled without a profile and its note is present (decoy: with a profile, no note).
- **Route source:** each handler's body holds its target (see E-221).
- **The absent colour:** the back plus `00`'s caption; no card, no bar.

**E2E:** `generate-e2e-flows --check`, with the capture anchor `wear.intelligence`. The device run is attested.

**Golden:** none owed. No `packages/color-*` code changes; contrast and separation come from golden-tested functions.

---

## Verification

```
# Tier 1, each increment (ADR-0132)
pnpm format:check && pnpm typecheck && pnpm lint && pnpm turbo run test --filter='...[HEAD]'
#  + inc 2: node scripts/generate-design-tokens.mjs --check && node scripts/verify-token-reach.mjs && pnpm test:contrast && pnpm test:cvd
#  + inc 4, 6: pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
#  + inc 5, 6: node scripts/verify-font-coverage.mjs (and generate-font-subset if asked)
#  + inc 6: verify-reachability, verify-route-targets, generate-e2e-flows --check, verify-token-reach
#  + inc 1, 7: verify-mockups and mockup-inventory --check (in lint)
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
- the sweep's inventory block (`07.screen` enrolled, `elementsAsserted` +≈53, `renders` +4);
- `claims.findings` 0;
- the token-reach line (`glyph.lock` read);
- the font-coverage line;
- the screen-insets delta for the Wear subjects.

| # | criterion | proven by |
|---|---|---|
| 1 | inventory 07, in order, grouping and proportion; the sweep asserts it | `wear-fidelity.test` and the sweep. **Gated** |
| 2 | bindings per §8; no mockup content | `wear.test`, the sweep's values, `wear-states.test`. **Gated** |
| 3 | only the listed departures | **gated** for structure; **attested** for appearance |
| 4 | capture beside 07, compared by a person | **attested** |
| 5 | catalogues; every drawn action works; a11y, contrast and cvd pass | `tsc`, `i18n.test`, `wear-states.test`, the three gates. **Gated**, with the device half **attested** |

---

## Attestations

Declared in Increment 0 (Appendix E). All three block release.

1. **Criterion 4.**
   - A person runs `pnpm fidelity:capture -- --erase-app-data` on an Android device or emulator at 384 dp, with a non-debuggable build of the final commit.
   - They compare `/atlas/wear/[slug]` against 07 (en, Sumi), 25's palette (en, Washi) and ja.
   - They record *matches* or each difference.
   - **Expected, not defects:** a corpus colour in place of 07's; the occasion words; *(your profile)*; ratio · Lc; *Shared Warmth* and its siblings; the canvas and card taller than drawn; the asymmetric trailing insets, as drawn.
2. **Criterion 3, the appearance half.** Discharged by the same comparison.
3. **Criterion 5, the device half.**
   - Each occasion re-ranks.
   - Swap steps; Lock is announced by TalkBack.
   - A pill substitutes; a tile opens its sheet; *Shop for this* carries the slot; *Add to wardrobe* stores nothing until saved.
   - *Save to Outfit Lab* opens the Lab with the nearest owned garments and the top locked, and with no profile is disabled with its line.
   - *Export* lists the four colours.
   - Back opens the colour page.
   - At 200 % in en and ja, rows, names and segments wrap or fit and nothing is cut; the drawn-height chips and buttons clip (F-344, recorded).
   - The generated flows pass.

---

## Risks and open questions

1. **Measurements owed in Increment 1:** the header's em and weight (`raw.emDp` 26 is suspect), every corner, the button inks, the bar's rule position and side insets, the keyline width, slot 4's Swap, and the kimono mask. Numbers marked "Inc 1" are not known yet.
2. **The decision a person is likeliest to revisit is D-3's save.**
   - It hands off and does not persist; the Lab draft is lost on leaving, as every Lab draft is today.
   - Nearest-by-ΔE00 may place a garment far from the combination's colour. The Lab shows the garment itself, so nothing claims a match.
   - The alternatives, each with its cost:
     - persist a corpus-colour composition (store change plus a read-back surface);
     - relabel the button (E2) as a hand-off;
     - make 13's Lab hold colour-in-slot pieces (F-257).
3. **Occasion words change three of four drawn labels** (D-2). The alternative is the drawn words mapped silently, which `ruleSetFor`'s own rationale rejects. *Evening → formal* rests on the published rationales, and *date* is the other candidate.
4. **The outer layer is ranked as a top.** `isLargeArea` applies the two-large-areas chroma penalty, which is right for a coat over a shirt. A real engine slot is F-257's question, with coverage's consequence.
5. **Harmony prints the warm–cool relation, not a geometric kind.** F-349 is the classifier. Until it lands, 07, 08 and 13 cannot name *Analogous* honestly.
6. **The slot in hand is an interpretation** of why 07 draws Lock on slot 2 alone. The alternative (Lock on slot 2 only) leaves F-208 c1 unmet for shoes and outerwear. The resting state is identical either way.
7. **Unverified mechanics:**
   - `Swatch` with children and no `onPress` may group its controls into one accessible node; Increment 4 checks, and fixes it in `Swatch` if so.
   - Row-stretch tile heights.
   - Android's delivery of compact Swap targets inside a tile (the hit area must stay inside the tile; ADR-0114's `targetRoom` reasoning).
   - Maestro's view of the floating sheet.
8. **The page is about 55 dp taller than drawn** because of the scale's leading (ADR-0153 states it).
9. **The Lab's blank screen without a profile** (finding 11) is a Lab defect. F-248 avoids reaching it; it is not fixed here. A note goes on F-257.
10. **The Japanese copy awaits OQ-5's competent-speaker review.**
11. **OQ-32 closes here.** OQ-46 (the anchor's keyline), OQ-48 and OQ-5 stay open. No other OQ blocks this feature.

## Out of scope

- 13's Lab rebuild, its fourth slot and its lookbook (F-257); 18's export screen (F-263); 19 (F-252).
- A fourth engine slot; the FR-6 classifier (F-349); persisting a Lab draft.
- FR-34's other five occasions on any surface; the app's `RULES_OCCASION`.
- Any change to the corpus, a golden value, the coverage threshold or the seasonal rule.
- The Lab's no-profile blank; drawn-height controls at 200 % (F-344).
- No new route.

---

# Appendix A: ADR-0150 draft

```markdown
# ADR-0150: The personal-fit note names the profile the figure was computed against, never a type

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 (binds F-257) |
| **Closes** | OQ-32 |
| **Applies** | R9 §4 E2, §6 C12; ADR-0102; F-223 c3; E-101; golden rules 11, 14; NFR-22 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
07 prints *"94% Match (Cool-Muted profile)"*; 13 prints *"92% (Cool-Muted Match)"*. E2 already removes *Match*. OQ-32 asks (claims-ok: quotes the drawn construction this line resolves)
about the note: the seasonal label beside the score, something else, or nothing. F-223 c3 requires the label beside the
ranges it summarises.

## Decision
- **D1.** The note is kept as a note: *(your profile)* (ja （あなたのプロフィール）). No seasonal label, modifier pair or
  type is printed beside a fit figure anywhere.
- **D2.** The figure is the outfit's FR-32 `personalFit` component, built from FR-29 per piece. With no stored profile
  there is no figure: *No profile yet* (E-101).
- **D3.** On 13, a stored figure whose envelope's profile revision is not the current one reads *(an earlier profile)*.
  F-257 adds the key when it renders it. No snapshot or migration is needed.
- **D4.** The seasonal label stays where ADR-0102 puts it: on 23, beside its ranges.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| The seasonal label in the note | Contradicts ADR-0102 (never drawn without its ranges) and F-223 c3. Implies the score derives from the label, which `scoreColor` never reads. Absent for 3,136 of 4,096 guided profiles (OQ-33). Its rule is unsettled (OQ-34). Cannot be replayed for a saved outfit (ADR-0136) |
| The profile screen's band words (*Cool · Muted*) | Two of the four dimensions the figure reads. Reads as the modifier pair C12 calls a type. *Leans cool* does not compose |
| Nothing | Drops a drawn slot a true value fits (ADR-0124's rule) |

## Evidence, and its limits
- **It rests on:** ADR-0102 §§5–7 and its consequence counts; F-223 c3; ADR-0136's replay limit; the drawn copy
  structure of 07 and 13.
- **The limit:** the note carries less than the drawing. It says whose figure this is, not what the profile is like.
```

# Appendix B: ADR-0151 draft

```markdown
# ADR-0151: 07's occasions, slots and figures say what the engine computes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 |
| **Applies** | R9 §4 E1/E2, §8; FR-3, FR-5, FR-6, FR-29, FR-31, FR-32, FR-34, FR-23; ADR-0124; ADR-0148 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1. Occasions.** Casual · Office · Japanese-inspired · Formal map to FR-34's `casual`, `office`, `japanese-inspired`
  and `formal`. The control rests on Office, as drawn. Each word names its weighting:
  - *Minimalist Office*: `office` and `minimal` are two published profiles;
  - *Japanese Classic*: no "classic" weighting exists, and FR-23 applies;
  - *Evening*: no evening weighting is published (E2).
- **D2. Slots.**
  - The colour is the top.
  - Trousers and shoes are FR-31's rankings.
  - Outerwear is ranked by `recommendForSlot` as a top, since the builder files coats under top.
  - `OUTFIT_SLOTS`, coverage, the Lab and the lookbook keep three.
- **D3. Names.**
  - Slot 1 is `‹Romaji› ‹English›`; slots 2–4 are `‹Romaji› (‹English›)`.
  - The anchor is `‹kanji› ‹Romaji› (‹hex›)` with the slot word.
  - Garment and material words are E1.
- **D4. The card's values.**
  - **Harmony:** the warm–cool relation the harmony component measures (*Shared Warmth / Mixed Warmth / Warm Against
    Cool*).
  - **Fit:** ADR-0150.
  - **CVD:** `cvdAccessibility`, with *Protan/Deutan/Tritan · Machado 2009*.
  - **Contrast:** the WCAG ratio and the smaller |Lc| between the top and the trousers, from `compare()`.
- **D5. Copy.** *Harmony:* and *…Accessibility* drop the component words *Badge* and *Card* (§2), and *Colour* is
  en-GB. The pill axes are the engine's four, phrased as drawn.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Drawn occasion words mapped silently | A weighting nobody published is named on screen (`ruleSetFor`'s refusal) |
| An engine fourth slot | Zero valid outfits for any wardrobe without a coat; Home, shopping and the Lab move |
| A geometric relationship name | No engine classifier exists (ADR-0124); F-349 builds one |
| Contrast on the worst pair | Mostly the shoe, a small area; the drawn figure reads as the outfit's top against its bottom |

## Evidence, and its limits
`weights.2026.08.4.json`'s rationales; `slots.ts`; `coverage.ts`; `builder.ts`'s `SLOT_WORDS`; `outfit-score.ts`. The
harmony row is weaker than the drawing until F-349 lands.
```

# Appendix C: ADR-0152 draft

```markdown
# ADR-0152: What 07's controls do, and what it keeps that it does not draw

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 |
| **Applies** | R9 §4 E4; F-195, F-199, F-208 (done criteria, golden rule 6); FR-11, FR-31, FR-33, FR-38, FR-73; ADR-0136 D4; ADR-0128 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1. The slot in hand** rests on slot 2. It draws Swap and Lock under its name; the others draw the compact Swap.
  Tapping a tile's text puts it in hand.
- **D2. Swap** steps the slot's ranking and wraps. **Lock** toggles (*Lock / Locked*, announced selected) and keeps the
  colour across swap, the pills and an occasion change. A locked slot out of hand shows 13's *Locked* badge (E4).
- **D3. The pills** are the slot in hand's alternatives, relative to the colour it shows (`alternativesAround`), as many
  as the engine returns.
- **D4. The slot sheet** (03's floating sheet, E4): rank, the candidate's figures and factors (or the pairing figure
  and the missing half), `wear.what`, and *Open this colour · Shop for this · Add to wardrobe*.
- **D5. Save to Outfit Lab** hands the combination to the Lab (one-shot), which drafts the nearest owned garment per
  slot with the top locked. Without a profile it is disabled, with its reason line (E4).
- **D6.** Export opens `/profile/export?colours=`. Back navigates to `/atlas/[slug]`.
- **D7. Leaves the page:** the slot chooser, the lists of six, the alternative cards, *Build a profile*. Each
  capability is kept by D1–D5.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Lock on slot 2 only | Shoes and outerwear offer no alternatives (F-208 c1) and cannot be locked |
| All alternatives of all slots as pills | Up to 12 pills in a card drawn with two rows |
| Persist a corpus-colour outfit | A store change and an undrawn read-back; ADR-0136 keeps the lookbook to garments |
| Drop F-199's actions | Breaks done criteria |

## Evidence, and its limits
- **It rests on:** 07 and 13's shared sample outfit (07's save leads to 13, with slot 1 locked); the done criteria
  quoted; `overlay.tsx`'s `Sheet`.
- **Not tested with people:** the sheet's discoverability, and the Lab draft's nearest mapping.
```

# Appendix D: ADR-0153 draft

```markdown
# ADR-0153: 07's composition, its inks, and its kimono

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 |
| **Applies** | R9 §2, §4 E3, §6 C8/C10; ADR-0110; ADR-0116; ADR-0121; the lesson "an ink gap loses the line inset" |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1. Intervals** are the plan's table, snapped by §2. The named intervals and their costs, written out. Built heights
  against drawn: canvas +≈46, card +≈8, anchor card −≈3.
- **D2. A control on a sample** takes C8's inks (`Button on`):
  - filled with the dark ink on a light sample, outlined in the light ink on a dark one;
  - label ≥ 4.5:1; fill or edge ≥ 3:1 against the sample; the same in every theme.
- **D3. `glyph.lock` `#C8A145`**, in every palette, `nonText`, paired with nothing. It is a token group carrying
  07, 15 and 16's padlocks.
- **D4. Segments sized by their words** (`fit: 'content'`), as 07 draws them.
- **D5. The kimono** is outside the frame (§2) and is not built. [Or, per Increment 1's mask: its in-frame strokes are
  11's backdrop at `opacity.art`, sized by drawn height against the grid's aspect, clipped, and every text it crosses
  checked at its ink in four palettes.]

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| A theme token for the buttons | Invisible on a light sample in Washi |
| `status.warn` for the lock | A verdict colour |
| Equal segments | *Minimalist Office* or *Japanese-inspired* clipped |

## Evidence, and its limits
`07.json`; the Inc 1 readings. A JPEG reading carries ΔE00 ≈ 2, and the person's comparison judges the result.
```

# Appendix E: State drafts

**F-248 `attested`:** three entries, in F-247's shape:

- **Criterion 3:** gated for structure, attested for appearance. Cites `wear-fidelity.test` and the sweep, with ADR-0150 to ADR-0153 as the named departures.
- **Criterion 4:** the capture run, as in *Attestations* item 1, with its *expected, not defects* list.
- **Criterion 5:** gated except the device half, as in *Attestations* item 3.

Each has `"blocks": "release", "status": "outstanding"`.

**Notes on other features:**

| feature | note |
|---|---|
| **F-257** | OQ-32 closed (ADR-0150): 13's fit note reads *(your profile)*, or *(an earlier profile)* for a stored figure whose profile revision is not current. 07's save hands the combination to the Lab (`takeCombination` in `wardrobe/outfit.tsx`, E-219): keep it, and 13's fourth row receives the outer layer. The Lab renders nothing without a profile |
| **F-263** | `/profile/export` also reads `colours` (`combinationSubject`, E-221): keep it |
| **F-249** | Harmony relationship names wait on F-349; 07 prints the warm–cool relation |
| **F-262 / F-251** | `glyph.lock` is minted (ADR-0153). `15.security.badge` and `16.slots.slot-1.locked` read it |
| **F-252** | 19's *Wear* opens the rebuilt 07 |
| **F-267** | The canvas and card are taller than drawn; the trailing insets are as drawn |
| **F-344** | 07's pills, the compact Swap and the action buttons clip at 200 % |
| **F-349 (new, backlog)** | *"The engine names the FR-6 relationship a set of colours stands in"*: 07's harmony row, 08's pair, 13's *(Analogous …)* |

**PRD §10:** remove OQ-32's row and add its closing paragraph in OQ-14's shape. **R9 §11 Closed:** OQ-32 → ADR-0150.
