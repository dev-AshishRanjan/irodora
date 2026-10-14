# Plan: F-238, An outfit can be saved to a lookbook

| | |
|---|---|
| **Feature** | F-238, in [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-33 and FR-56. FR-10 (the envelope), FR-32 (every component is shown) and FR-58 (backup) also apply. Closes OQ-40 |
| **Service / package** | `@irodora/store` · `apps/mobile`. No change to `@irodora/ui` |
| **Author** | The planner subagent's design (read-only), decided and edited by the implementing session |
| **Date** | 2026-10-14 |
| **Decisions** | [ADR-0136](../../docs/adr/0136-the-lookbook-is-read-back-on-the-wardrobe-through-a-garments-lookbook-choice-and-a-saved-outfit-is-never-rescored.md), D1–D7. OQ-40 is decided by D1 |


---

## Intent

- **In the Outfit Lab (13):**
  - Once every slot holds a garment, *Save Outfit to Lookbook* is enabled and the outfit's score is shown beside it.
  - Tapping it keeps that outfit. The button then disables and a line says the outfit is in the lookbook.
- **On the Wardrobe (11):**
  - A two-segment choice, *Garments · Lookbook*, sits directly above the garment grid.
  - *Lookbook* lists every saved outfit, newest first. Each entry shows:
    - its slots: the colour sample, hex, garment name, and *Locked* where a slot was locked;
    - its overall score and all six components;
    - the versions that scored it, and the words *not recomputed*;
    - *Remove from lookbook*.
- **Over time:** an entry looks the same tomorrow and after a restart, even if the profile, rules, corpus or garments change in between.
- **Backup:** a backup carries the lookbook, and a restore brings it back.

## Findings from planning (they shape the design)

1. **The current Lab has no save control and never shows the score of the outfit as composed.**
   - `OutfitBuilder.tsx` shows only each slot proposal's `best.score`. That number is `scoreOutfit(locked pieces + one candidate)`, which leaves out unlocked placed pieces.
   - "Its scores" therefore needs one engine call over the whole draft. A new pure function, `scoreDraft`, makes it, and F-257's score card must call the same function.
   - The draft's score is shown beside Save, so what is stored is what the person saw.
2. **A pointer to the garment cannot re-render the colour that was scored.**
   - Garment colours live in shared `saved_color` rows: `reusableColorId` shares one row per slug.
   - `upsertColor` overwrites those rows in place when a later palette or garment write reuses the slug. Under a new corpus version the values change.
   - `deleteGarment` tombstones the garment.
   - So each slot keeps a pointer to its garment and also a copy of the colour that was scored, with its provenance.
3. **The profile is updated in place.**
   - `saveProfile` UPDATEs the row and keeps no history. An identity-and-revision string (color-engine.md §11) cannot be resolved once the profile changes.
   - So the score is stored, never recomputed, and the copy says it was scored *against your profile as it was then*.
   - FR-10 replay is possible only while that profile revision is current. That limit is stated, not hidden.
4. **A new route is expensive here.**
   - `verify-mockups.mjs` refuses a route with no governing mockup unless an open question names it, and closing OQ-40 removes that escape.
   - The fidelity capture fails on a route a cleared app cannot reach (R9 §12).
   - So the read-back belongs on an existing route.
5. **The engine has three slots and 13 draws four.** That is F-257's question. The store keeps `slot` as opaque text so that neither count is built into the schema.
6. **The Lab route renders nothing without a profile** (`outfit.tsx`, `context.profile === null ? null`). A lookbook reachable only from the Lab would become unreachable, and impossible to clear, after the profile is deleted.

## OQ-40: the recommendation

**D1. The lookbook is read back on the Wardrobe (11), through a *Garments · Lookbook* segmented choice placed directly above its grid, in `10.source`'s form.**

The form, copied from `10.source`:
- a pill-shaped `ChoiceGroup` with `segmented: { mark: 'dot' }`, 345 × 33 dp, edged in `border.subtle`;
- the chosen segment filled (`10.source.selected`, recorded as `level2`) with a 9 dp leading dot (`10.source.selected.dot`).

How it behaves:
- It switches only the region below it: the garment grid, or the lookbook list.
- Title, actions, coverage and gap stay where 11 draws them.
- It is screen state, defaulting to *Garments*. It is not stored, for ADR-0135 D4's reason.

### Why this

- **The mockups already answer the same question for palettes.**
  - `10` draws *Curated Systems · My Custom Palettes*: the published list and the person's own, switched by one segmented choice directly over the list.
  - That is the mockups' own component and vocabulary for "what you made, beside what is published", which is what the 2026-10-05 delegation requires (R9 §11, *Widened*).
- **13 supplies the noun.** Its button says *Lookbook*, so the place is named with that word, not with a glyph.
- **11 is the outfit hub.**
  - It holds the *Outfit Lab* button (`11.actions.lab`), and its coverage card counts outfits.
  - Saved outfits sit beside the garments they are made of.
- **Platform convention.**
  - Android's Compose guidance for segmented buttons: they "help people select options, switch views, or sort elements".
  - Apple's segmented control is for switching closely related views. The HIG page was not machine-readable here; this is stated from general knowledge.
- **No new route.** The capture spec, `mockups/index.json` and R9 §7 are untouched.
- **Rule 13.** The chosen segment shows a dot (a shape) and a fill, and announces *selected*.

### Consistent with ADR-0135, and why outfits differ

The one rule both decisions follow: **what a person saves is read back on the list screen of its domain, by a control directly over that list. Never on Home, never in the profile, never on a route of its own.**

- **Colours** are a *subset* of a list that already exists (the Atlas lists every corpus entry). So ADR-0135 narrows that list with a filter toggle.
- **Outfits** have no list. They are a *kind of their own* beside garments, so they need a view switch. The mockups draw a view switch as a segment (`10`).
- That gives three cases, each with a control over the list:
  - palettes: segment (`10`);
  - colours: toggle (`05`);
  - outfits: segment (`11`).
- ADR-0135's "Revisit" trigger has now fired. Add one line to ADR-0135: *"Revisited 2026-10-14 by ADR-0136: kept. Colours are a subset of the Atlas; outfits are a list of their own."*

### Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| **ADR-0135's bookmark toggle in 11's app bar trailing slot** (06's position) | It adds no row and reuses the glyph. But a toggle that swaps one *kind* for another is not a filter. It sits exactly where 06's bookmark means "save this". The word *Lookbook* never appears, and a 24 dp glyph is the least discoverable choice (ADR-0135 says so of its own) |
| **A Lookbook section after 11's grid** (past the drawn edge, like ADR-0108's chips) | Nothing drawn moves. But it sits below every garment: with 14 garments that is about 840 dp of scrolling, which is not reachable in practice |
| **A section on the Lab (13) below the capsule card** (PaletteStudio's *Palettes you have saved*) | It reads back where outfits are saved. But 13's composition ends at the capsule card. The Lab renders nothing without a profile, so a person who deletes their profile could no longer see or remove their outfits (finding 6) |
| **A new route `/wardrobe/lookbook`** (entered by a fourth button in 11's action row, or from 13's header) | A whole undrawn surface plus an entry point. It needs a governing mockup (verify-mockups) and a reach in the fidelity capture (finding 4). It changes 11's drawn row of three, and 13's trailing slot already holds *Capsule Solver* |
| **A section on Home (01) / an entry in the profile (17/23)** | Rejected for ADR-0135's reasons: Home is the most-seen, fully drawn screen, and a list in the profile implies something about personal fit that nothing computed says (rule 11) |

### Evidence, and its limits

- **It rests on:**
  - the inventories `10.source*`, `11.*`, `13.actions.save`, `13.slots.*` and `13.score*`;
  - the Compose segmented-button guidance;
  - the general pattern in wardrobe apps (Acloset, Whering, Indyx, Stylebook) of keeping saved outfits inside the wardrobe or closet domain.
- **Not verified:** the exact tab layouts of those apps. No screenshots were inspected.
- **Not tested with people.**
- **Measured from the inventory:**
  - 11 leaves 24.5 dp between `11.gap` (bottom at 330 dp) and `11.grid` (top at 354.5 dp);
  - the control adds 33 dp plus a gap, so the grid moves down about 57 dp;
  - the control stays inside the first screen at 384 dp.
- **Not measured:** whether the segment labels fit at 200 % text (A7). This must be checked on `ChoiceGroup` segmented.
- **Encryption:** the lookbook lives in the same database file as everything else. That file is very likely not encrypted today (F-336), and nothing here claims otherwise.

### D2–D7 (rest of ADR-0136)

- **D2. An entry is composed from 13's vocabulary and is read-only.**
  - Each slot is a row in stored order: sample, hex, garment label, and 13's *Locked* badge (`Chip form="badge"`, glyph `lock`, word *Locked*) on a slot that was locked. There are no Swap or lock controls.
  - Then the stored overall with all six component lines (FR-32), *Scored when it was saved, against your profile as it was then. Not recomputed.*, the versions line, and *Remove from lookbook — {labels}* on its own line (PaletteStudio's delete pattern).
  - The slot word is not printed, because 13 prints none. The accessible name carries the slot.
- **D3. An empty lookbook is 00's caption (`EmptyState resolvedHere`, ADR-0128 D3).**
  - The way to fill it, *Build an outfit* (`11.actions.lab`), is on the same screen. 27 draws no lookbook card.
  - The segment is drawn whenever the route supplies a lookbook and there is at least one garment **or** one saved outfit. So the lookbook stays reachable with an empty wardrobe.
- **D4. On the Lab, *Save Outfit to Lookbook* is enabled only when:**
  - every slot in `OUTFIT_SLOTS` holds a garment (an outfit is one garment per slot: `coverage()`'s combinations, FR-42), **and**
  - that slot-to-garment composition is not already a live lookbook entry.
  - Otherwise it is disabled, with a reason line under it, as *I wore this* is today. The reason line is announced once when it changes.
- **D5. A saved outfit is a snapshot, rendered from storage only.**
  - It holds the slots (a garment pointer plus a copy of the scored colour with its provenance, and the label shown), the locks, the score (overall; per component: score, direction, weight, contribution), the coverage threshold, and the envelope (engine, scorer, corpus, rules, occasion, profile revision).
  - It is never rescored.
- **D6. Storage is three tables, in both `SYNC_TABLES` and `ARCHIVE_TABLES`.**
  - Removal tombstones all three.
  - A removed entry is never revived: each save is its own record, with its own scores and versions.
  - Saving a composition that is already live writes nothing.
- **D7. Placement on today's screens:**
  - the Save, its reason line and the draft's score lines go in the Lab's existing controls `Surface`, beside *I wore this*;
  - the segment goes in today's Wardrobe, directly above the garment list.
  - F-257 moves the save into 13's `ActionBar` as `13.actions.save`, and composes 13's score card over `scoreDraft`. F-255 builds the segment into 11. **Both keep them.**

### R9 §4 E4 entry (exact text)

> - **The lookbook, read back** (FR-33, FR-56; `F-238`, [ADR-0136](../../docs/adr/0136-the-lookbook-is-read-back-on-the-wardrobe-through-a-garments-lookbook-choice-and-a-saved-outfit-is-never-rescored.md)). `13` draws *Save Outfit to Lookbook* (`13.actions.save`, `submit:lookbook.save`), and no mockup draws the lookbook (OQ-40). The Wardrobe (`11`) reads it back through a segmented choice, *Garments · Lookbook*, directly above its grid, in `10.source`'s form: a pill `ChoiceGroup`, the chosen segment filled with its leading dot (a shape and an announced selection, rule 13). *Lookbook* lists the saved outfits, newest first, each a full-width card in `13`'s vocabulary: its slots (sample, hex, garment name, `13`'s *Locked* badge where a slot was locked), its stored overall with all six components (FR-32), the versions that scored it with the words *not recomputed* (rule 11), and *Remove from lookbook*. Each sample is the colour that was scored, with its stored provenance (rule 12). Nothing above the grid moves; there is no route, and no section on Home or in the profile. An empty lookbook is `00`'s caption (ADR-0128 D3): the Outfit Lab button is on the same screen. On the Lab, *Save Outfit to Lookbook* is disabled, with its reason on a line beneath it, until every slot holds a garment and while the outfit is already saved. F-255 and F-257 keep both.

### Inventory elements added or touched

- **Built here (behaviour):**
  - `13.actions.save` (binding `static:lab.saveToLookbook`, action `submit:lookbook.save`). Its drawn place in the ActionBar is F-257's.
- **Template reused:**
  - `10.source`, `10.source.selected`, `10.source.selected.dot`.
- **Vocabulary reused in the entry (13 itself is not built here):**
  - `13.slots.slot-N.{hex,name}`;
  - `13.slots.slot-1.locked` (binding `static:lab.locked`);
  - `13.score.figure`, `13.score.factors`.
- **Touched:**
  - `11.grid`: the region the segment switches;
  - `11.gap`: the control follows it, and the card is unchanged.
- **Added, undrawn (listed in E4 only; inventories describe drawings and stay pinned to their images):**
  - `11.view` with `.garments` and `.lookbook`;
  - `11.lookbook.entry-N` (slots, score lines, scored-when-saved line, versions line, remove);
  - `11.lookbook.empty`;
  - `13.actions.save.reason`.

## How the criteria are read

- **Criterion 1, "re-renders identically later":** an entry is a pure function of its stored record, so it renders the same tree after any later change to the profile, rules, corpus, garment rows or garment deletion. "Identically" is anchored to the Lab: at save time the entry's score lines equal the Lab's score lines for the same draft.
- **Criterion 2:** amend it in the open, as F-237's was amended, to read: *"Saved outfits are listed on the Wardrobe (11), under the Lookbook choice of the segmented control ADR-0136 places directly above its grid (OQ-40), can be removed, and are covered by backup and restore."*

## Approach

### Store: migration 11 (`SCHEMA_VERSION` 10 → 11)

```sql
CREATE TABLE outfit (
  ${SYNC_COLUMNS},
  overall           INTEGER NOT NULL CHECK (overall >= 0 AND overall <= 100),
  counts_threshold  INTEGER NOT NULL CHECK (counts_threshold >= 0 AND counts_threshold <= 100),
  envelope_engine   TEXT NOT NULL CHECK (envelope_engine   <> ''),
  envelope_scorer   TEXT NOT NULL CHECK (envelope_scorer   <> ''),
  envelope_corpus   TEXT NOT NULL CHECK (envelope_corpus   <> ''),
  envelope_rules    TEXT NOT NULL CHECK (envelope_rules    <> ''),
  envelope_occasion TEXT NOT NULL CHECK (envelope_occasion <> ''),
  envelope_profile  TEXT NOT NULL CHECK (envelope_profile  <> '')
) STRICT;
CREATE INDEX outfit_live   ON outfit (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX outfit_rules  ON outfit (envelope_rules);
CREATE INDEX outfit_corpus ON outfit (envelope_corpus);

CREATE TABLE outfit_item (
  ${SYNC_COLUMNS},
  outfit_id     TEXT    NOT NULL REFERENCES outfit (id) ON DELETE CASCADE,
  slot          TEXT    NOT NULL CHECK (slot <> ''),
  position      INTEGER NOT NULL CHECK (position >= 0),
  garment_id    TEXT    NOT NULL REFERENCES garment (id),
  garment_label TEXT    NOT NULL CHECK (garment_label <> ''),
  locked        INTEGER NOT NULL CHECK (locked IN (0, 1)),
  name TEXT NOT NULL,
  xyz_x REAL NOT NULL, xyz_y REAL NOT NULL, xyz_z REAL NOT NULL,
  lab_l REAL NOT NULL, lab_a REAL NOT NULL, lab_b REAL NOT NULL,
  oklch_l REAL NOT NULL, oklch_c REAL NOT NULL, oklch_h REAL NOT NULL,
  hex TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('declared','reference','calibrated','estimated','unknown')),
  confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  corpus_slug TEXT,
  capture_illuminant TEXT, capture_quality TEXT, capture_samples INTEGER, capture_variance REAL,
  CHECK ((capture_illuminant IS NULL) = (capture_quality IS NULL)
     AND (capture_quality    IS NULL) = (capture_samples IS NULL)
     AND (capture_samples    IS NULL) = (capture_variance IS NULL)),
  CHECK ((source IN ('estimated','calibrated')) = (capture_illuminant IS NOT NULL)),
  UNIQUE (outfit_id, slot),
  UNIQUE (outfit_id, position)
) STRICT;
CREATE INDEX outfit_item_garment ON outfit_item (garment_id);

CREATE TABLE outfit_component (
  ${SYNC_COLUMNS},
  outfit_id    TEXT    NOT NULL REFERENCES outfit (id) ON DELETE CASCADE,
  component    TEXT    NOT NULL CHECK (component <> ''),
  position     INTEGER NOT NULL CHECK (position >= 0),
  score        REAL    NOT NULL CHECK (score >= 0.0 AND score <= 100.0),
  direction    TEXT    NOT NULL CHECK (direction IN ('supports','opposes','neutral')),
  weight       REAL    NOT NULL CHECK (weight >= 0.0 AND weight <= 1.0),
  contribution REAL    NOT NULL CHECK (contribution >= 0.0 AND contribution <= 100.0),
  UNIQUE (outfit_id, component),
  UNIQUE (outfit_id, position)
) STRICT;
```

Why each choice:

- **The colour snapshot is `Omit<NewSavedColor,'id'>` column for column.** No new colour type is introduced, and the values are stored as the engine wrote them (E-001).
  - Unlike migration 5's `ALTER`, a new table *can* carry table CHECKs. Two are added:
    - the four capture columns are all present or all absent;
    - they are present exactly when the source is a capture.
  - So a captured colour without its conditions cannot be written at all. This is rule 12 enforced by the database.
- **`slot` and `component` are opaque text.**
  - The store depends on nothing and keeps no copy of the engine's vocabulary (migration 2's rule).
  - A fourth slot (F-257) or a seventh component needs no migration.
  - The app validates them against `OUTFIT_SLOTS` and `OUTFIT_COMPONENTS` on the way in.
- **`envelope_scorer` is `RECOMMENDATION_VERSION` (`'0.5.0'`, `@irodora/recommendation`).**
  - The six formulas live there, not in `ENGINE_VERSION`.
  - A formula change that kept `ENGINE_VERSION` would otherwise make two different scores carry identical versions (rule 11).
  - `envelope_engine` is `ENGINE_VERSION`, as `paletteSubject` already records it.
- **`envelope_occasion` is the occasion `ruleSet()` resolves (`'default'`).**
  - A rules version holds one weighting per occasion. Recording the version alone would make two weightings indistinguishable the day a second occasion is used.
  - data-model §5's sketch already lists `occasion`.
- **`counts_threshold` is `COVERAGE_THRESHOLD`.** It is stored so that 13's verdict (F-257, ADR-0124) re-renders identically if the constant ever moves.
- **Evidence is not stored.**
  - No surface renders it, and FR-10 can reproduce it from the stored inputs.
  - 13's row notes (APCA, separation, harmony relationship) are F-257's to bind (see Risks).
- **Ids:**
  - `outfit.id` is a UUIDv7 minted in the repository at `now`, as `bookmarkColor` mints one;
  - item ids are `${outfitId}:${slot}` and component ids `${outfitId}:${component}`, derived as `palette_member`'s are.
- **`garment_id` is a foreign key to `garment` with no ON DELETE action.**
  - Garments are only ever tombstoned, so the referenced row persists.
  - The only hard delete is erasure, which walks `SYNC_TABLES` in reverse and removes items first.
- **Both lists:**
  - append `'outfit','outfit_item','outfit_component'` to both `SYNC_TABLES` and `ARCHIVE_TABLES`, in that order;
  - import runs forward (garment, then outfit, then its children), which the foreign keys require;
  - erasure runs in reverse (children, then outfit, then … garment).

### Repository (`repository.ts`, `createRepository.ts`), each method one `driver.transaction`

```ts
saveOutfit(outfit: NewOutfit, now: Millis): { readonly id: string; readonly written: boolean };
listOutfits(): readonly StoredOutfit[];   // live, created_at DESC, id DESC; items and components by position
removeOutfit(id: string, now: Millis): void;
```

- **`saveOutfit`:**
  - Throws `StoreError` on no items, a duplicate slot, or a duplicate component.
  - Reads the live outfits' `(slot, garment_id)` sets. If one equals the new composition, it returns `{id: existing, written: false}` and writes nothing, so nothing is logged.
  - Otherwise it INSERTs the outfit, then each item, then each component, logging `insert` for every row.
- **`removeOutfit`:** for a live outfit, tombstones the outfit and every live item and component explicitly (a cascade fires only on DELETE; this is an UPDATE, as `deletePalette` notes) and logs one `delete` per row. An unknown or already-removed id writes nothing.
- **`StoredOutfitItem.color`:** a `SavedColorRow` built from the item's own sync columns. The app's `colorOf` and `captureConditionsOf` then read it unchanged.

### App: domain (`apps/mobile/src/outfit/lookbook.ts`, new and pure)

- **`scoreDraft(draft, context)`:** `scoreOutfit(draft.map(pieceOf), reference, engineProfile(profile), rules, outfitWeights(weights))`. Every placed piece is scored, and there is no preferences argument, which matches `regenerate`. It is exported for F-257.
- **`isComplete(draft)`:** true when every slot in `OUTFIT_SLOTS` is placed.
- **`compositionKey(items)`:** canonical, sorted `slot=garmentId` pairs.
- **`outfitEnvelope(stored: StoredPersonalProfile, rules)`:**
  - assembles `ENGINE_VERSION`, `RECOMMENDATION_VERSION`, `CORPUS_LABEL`, `rules.versionId`, `RULES_OCCASION` (newly exported from `rules.ts`) and the profile as `${id}:${updatedAt}` (color-engine.md §11, "identity and revision");
  - runs `assertEnvelope` from `@irodora/color-core` on it, so no second validator is written.
- **`outfitRecord(draft, context, envelope)`:** builds the `NewOutfit`.
  - Items in `OUTFIT_SLOTS` order, with the label `garment.name ?? garment.type`.
  - The colour copied from `placed.garment.color`, not recomputed.
  - Components from `score.components`, with weight and contribution from `score.factors`.
  - The threshold `COVERAGE_THRESHOLD`.
- **`shownScoreOf(stored)` and `componentMessageKey(component, direction)`:** the stored score as the renderer's `ShownScore`. The key format is pinned to the engine's `OUTFIT_MESSAGE_KEYS` by a test.

### App: shared state (`apps/mobile/src/lookbook.tsx`, new; F-237's `bookmarks.tsx` shape)

- `LookbookStore = Pick<Repository,'saveOutfit'|'listOutfits'|'removeOutfit'>`.
- `LookbookProvider` reads once at mount, writes first, then reads back. A throwing write leaves the list as it was.
- `useLookbook()` throws outside its provider.
- It is mounted in `app/_layout.tsx` beside `BookmarksProvider`, with `deviceRepository()`.
- Routes read the hook and hand plain props down, so screens stay renderable in jest.

### App: screens

- **`OutfitBuilder`:**
  - New optional prop `lookbook?: { envelope; saved: ReadonlySet<string>; onSave(record) }`. When it is absent, no save control is drawn and today's subjects are unchanged.
  - The score lines are extracted to a shared `ScoreLines({ score: ShownScore })`, used by the Lab's proposals, the Lab's draft and the lookbook entry. One renderer means one way a score looks, and F-257 rebuilds all three at once.
  - With a complete draft, the controls `Surface` shows the draft's `ScoreLines`, then *Save Outfit to Lookbook*, then a reason line:
    - `lookbook.needsEverySlot` while the draft is incomplete;
    - `lookbook.alreadySaved` while the composition is live in the lookbook, including straight after a save.
- **`Wardrobe`:**
  - New optional props `lookbook?: { outfits; onRemove(id) }` and `initialView?: 'garments' | 'lookbook'`.
  - The segment follows D1 and D3.
  - The Lookbook view is one `Arrival` holding entries with `Appear index` 0…n−1 (E-199).
  - Entries render `Swatch` from `colorOf(item.color)`. Garment photographs are never read (E-073).
- **Routes:**
  - `wardrobe/outfit.tsx` passes `envelope: outfitEnvelope(stored, context.rules)`, `saved` (composition keys of `useLookbook().outfits`), and `onSave: lookbook.save`.
  - `wardrobe/index.tsx` passes `outfits` and `onRemove`.

### Copy keys (en / ja; proposed, the session settles register and the claims lint)

| key | en | ja |
|---|---|---|
| `lab.saveToLookbook` | Save Outfit to Lookbook | コーデをルックブックに保存 |
| `lab.locked` | Locked | 固定 |
| `lookbook.needsEverySlot` | Put a garment in every slot to save this outfit. | すべての枠に服を入れると保存できます。 |
| `lookbook.alreadySaved` | In your lookbook, on the Wardrobe under Lookbook. | ルックブックにあります（ワードローブの「ルックブック」）。 |
| `wardrobe.view` (the group's name) | Show | 表示 |
| `wardrobe.view.garments` | Garments | 服 |
| `wardrobe.view.lookbook` | Lookbook | ルックブック |
| `lookbook.empty` | No outfits in your lookbook yet. | ルックブックにはまだコーデがありません。 |
| `lookbook.emptyHint` | Build an outfit, then save it here. | コーディネートを組んで保存できます。 |
| `lookbook.scoredWhenSaved` | Scored when it was saved, against your profile as it was then. Not recomputed. | 保存したときの採点です。その時点のプロフィールに対するもので、再計算していません。 |
| `lookbook.versions` | Versions | バージョン |
| `lookbook.remove` | Remove from lookbook | ルックブックから外す |

- The versions line reads `${t('lookbook.versions')}: rules ${rules} · corpus ${corpus} · engine ${engine} · scorer ${scorer}`. Give each label its own key so no version is a bare number.
- Component lines reuse `outfit.overall` and `outfit.<component>.<direction>`.
- Regenerate the Japanese subset: `node scripts/generate-font-subset.mjs`.

### Reused

- **store:** `SYNC_COLUMNS`, `MIGRATIONS`, `migrate`, `log()`, `uuidv7`, `NewSavedColor`, `captureConditionsOf`, `archive.ts` (export/import/erase/`digest`), `backup.ts`, `checkStore`, and the force-quit harness (`test/fixtures/replay-and-die.ts`).
- **engine:** `scoreOutfit`, `outfitWeights`, `OUTFIT_SLOTS`, `OUTFIT_COMPONENTS`, `OUTFIT_MESSAGE_KEYS`, `RECOMMENDATION_VERSION`, `ENGINE_VERSION`, `assertEnvelope`, `COVERAGE_THRESHOLD`.
- **app:** `colorOf`, `pieceOf`/`engineProfile`, `ruleSet()`, `CORPUS_LABEL`, `activeProfile`, `useMessages`, `isMessageKey`, `STATES`/`showing`, and the `screens.test` registry, sweeps and inset pin.
- **ui:** `ChoiceGroup segmented` (F-232, mark `'dot'`), `Chip form="badge"`, `Swatch`, `Card`, `EmptyState resolvedHere`, `Arrival`/`Appear`, `Button`.
- **patterns:** `bookmarks.tsx` (provider), PaletteStudio's delete line, the *I wore this* disabled-with-reason pattern.

### New

- the three tables, the three repository methods and their types;
- two conformance checks;
- `outfit-force-quit.test.ts`;
- `src/outfit/lookbook.ts`, `src/lookbook.tsx` and `ScoreLines`;
- ADR-0136, E-205 and E-206.

## Increments (Tier 1 on every commit, ADR-0132)

Tier 1 on each commit is `pnpm format:check && pnpm typecheck && pnpm lint` (the root lint) plus `pnpm turbo run test --filter='...[HEAD]'`. Domain gates run only where their inputs changed.

| # | What | Verified by (beyond Tier 1) |
|---|---|---|
| 0 | Claim F-238 (`in_progress`, `openQuestions: []`). Write ADR-0136 (D1–D7) and add the revisit line to ADR-0135. Amend criterion 2. Add `attested[0]`. Add `a11y, contrast, cvd, content` to F-238's `verification` (a visible UI and font change). Edit R9 §4 E4 and §11 (OQ-40 to Closed), and PRD §10. Make F-255 blocked by F-238. Add notes to F-255, F-257, F-248, F-242 and F-263. Commit this plan | `node scripts/verify-state.mjs`, `node scripts/verify-mockups.mjs` |
| 1 | Store: migration 11, the types, the three methods, `outfit.test.ts`, the exports | store tests and their dependants' |
| 2 | Add `outfit-durability` and `outfit-atomicity` to `checkStore`. Floor goes 14 → 16. Add the decoy to `conformance.test.ts` | the same |
| 3 | Move the bookmark force-quit helpers to `test/fixtures/force-quit.ts`, with the bookmark cases unchanged. Add `outfit-force-quit.test.ts` with a named, measured budget | the same, and the bookmark force-quit cases still green |
| 4 | App domain: `outfit/lookbook.ts`, `RULES_OCCASION`, `lookbook-record.test.ts` | mobile tests |
| 5 | Provider: `lookbook.tsx`, mounted in `_layout`, the provider and route-source tests | mobile tests |
| 6 | Lab: `ScoreLines` extracted (no visible change; today's subjects and inset rows are untouched), then the Save, the reason line and the draft's score lines. Keys, font subset, subjects, inset rows | `test:a11y`, `test:contrast`, `test:cvd`, `test:content` |
| 7 | Wardrobe: the segment, the Lookbook list, the entry, removal, the empty caption, the route. Keys, font subset, subjects, the arrival list, inset rows | the same |
| 8 | Records: data-model §5 and §6, the effects and their memory notes, lessons | `verify-state` |
| 9 | Tier 2, then the evaluator once, then the fixes, then Tier 2 again on the final tree. Ask the person for the device run | everything below |

## Mockup fidelity

- **Governing mockups:**
  - `13` (the save) and `11` (the read-back), with `25` (light) as a variant;
  - `10.source` is the template for the control. No variant draws a lookbook.
- **Inventory:** as listed under OQ-40 above.
- **Bindings:**
  - the save binds `scoreDraft` and the store;
  - every entry value binds the stored record, versions included;
  - no mockup content reaches the build. The sample hexes in 13 and 11 are E1 sample content.
- **Departures:** exactly one E4 entry (text above), added under the 2026-10-05 delegation. **Any other departure the session finds is an open question, not a plan item.**

## Files to touch

```
packages/store/src/schema.ts                 migration 11; SCHEMA_VERSION 11; SYNC_TABLES += 3
packages/store/src/archive.ts                ARCHIVE_TABLES += 3 (after garment)
packages/store/src/repository.ts             NewOutfit, NewOutfitItem, NewOutfitComponent, OutfitEnvelopeRow,
                                             StoredOutfit, StoredOutfitItem, OUTFIT_DIRECTIONS; 3 methods
packages/store/src/createRepository.ts       saveOutfit, listOutfits, removeOutfit
packages/store/src/index.ts                  exports
packages/store/src/testing/index.ts          outfit-durability, outfit-atomicity
packages/store/test/outfit.test.ts           new
packages/store/test/outfit-force-quit.test.ts  new
packages/store/test/fixtures/force-quit.ts   new (helpers moved from bookmark-force-quit.test.ts)
packages/store/test/bookmark-force-quit.test.ts  imports the helpers; cases unchanged
packages/store/test/conformance.test.ts      floor 16; decoy
apps/mobile/src/outfit/lookbook.ts           new
apps/mobile/src/rules.ts                     export RULES_OCCASION
apps/mobile/src/lookbook.tsx                 new
apps/mobile/src/screens/ScoreLines.tsx       new (extracted)
apps/mobile/src/screens/OutfitBuilder.tsx    lookbook prop; save; reason; draft score
apps/mobile/src/screens/Wardrobe.tsx         lookbook prop; initialView; segment; list; entry; empty caption
apps/mobile/app/_layout.tsx                  LookbookProvider
apps/mobile/app/(tabs)/wardrobe/outfit.tsx   lookbook wiring
apps/mobile/app/(tabs)/wardrobe/index.tsx    lookbook wiring
apps/mobile/src/i18n/en.ts, ja.ts            keys
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf  regenerated
apps/mobile/test/lookbook.test.tsx           new (provider, routes, Lab and Wardrobe behaviour)
apps/mobile/test/lookbook-record.test.ts     new (pure functions, FR-10 replay)
apps/mobile/test/screens.test.tsx            subjects; "every list surface arrives once" list
.harness/verification/screen-insets.json     new subjects' rows only
docs/adr/0136-the-lookbook-is-read-back-on-the-wardrobe-through-a-garments-lookbook-choice-and-a-saved-outfit-is-never-rescored.md
docs/adr/0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md                           revisit line
docs/design/R9-MOCKUP-FIDELITY.md            §4 E4, §9 ✓, §11
docs/PRD.md                                  §10
docs/architecture/data-model.md              §5 (the built tables replace the sketch), §6 (replay indexes)
.harness/state/feature_list.json, effects.json, progress.md; .harness/memory/effects/*, lessons
```

## Anticipated effects

| Link | Change | Guard |
|---|---|---|
| **E-023** (`MIGRATIONS` → repository, archive, testing, device store, data-model) | Migration 11, three tables | `outfit.test` migrate-from-v10 case; `outfit-durability` and `outfit-atomicity` on node:sqlite (the device run is F-338's); the archive round trip; the force-quit test. Extend its rationale and its note |
| **E-139** (SYNC vs ARCHIVE) | Both lists grow by three | `profile-avatar.test`'s length relation (ARCHIVE = SYNC − 1); `outfit.test` asserts each table is in both lists and that erase empties all three |
| **E-001 / the Color type** | A second table now holds colour values | The values are copied as written and never recomputed; the database CHECKs on the capture columns; `colorOf` reads the snapshot through the same refusal |
| **E-053** (`OUTFIT_MESSAGE_KEYS` → catalogues, OutfitBuilder) | A third reader rebuilds keys from stored directions | The pin: `componentMessageKey` equals the engine's `messageKey` for every component × direction, and its output ⊆ `OUTFIT_MESSAGE_KEYS` |
| **E-199** (`Arrival`) | A new list surface | The lookbook subject is added to "every list surface arrives once". Its stated limit (a new list without an Arrival is not detected) is why it is added by hand |
| **E-073** (the gallery reads no blobs it doesn't show) | Lookbook mode | The lookbook subject's store counts zero `getGarmentImage` calls |
| **E-204** (bookmark provider; the root layout) | The layout mounts two providers | `bookmarks.test`'s route-source assertions still pass; the new route tests mirror them |
| **E-016 / E-066 / E-089** + font subset | New keys | `i18n.test`, the claims lint, `test:content` (`generate-font-subset --check`) |
| **E-045** | Reads `RECOMMENDATION_VERSION` (already public) | typecheck |
| **New E-205** `apps/mobile/src/lookbook.tsx#LookbookProvider` → `_layout`, `wardrobe/outfit.tsx`, `wardrobe/index.tsx`, `OutfitBuilder.tsx`, `Wardrobe.tsx`, the outfit tables, F-255, F-257, R9 E4, ADR-0136 | Written on 13, read on 11. A rebuild that drops either control breaks the feature silently | `lookbook.test.tsx` route-source assertions with a decoy route; the subjects; the store tests. Not guarded: layout on a device, encryption (F-336). Paired note `memory/effects/the-lookbook-is-written-on-13-and-read-on-11.md` |
| **New E-206** `packages/recommendation/src/outfit-score.ts#OutfitScore` (shape, `OUTFIT_COMPONENTS`, message-key format, `RECOMMENDATION_VERSION`) → `outfit_component`, `outfit/lookbook.ts`, `ScoreLines` | A stored score outlives the engine that made it. A new component, a renamed one or a new key format must still render old entries as stored | A *historical* literal `StoredOutfit` fixture (scorer `0.4.0`, rules `2026.07.1`) rendered by every build; the key pin. Paired note |
| **Not affected** | E-203 (F-238 builds neither 11 nor 13, so nothing is enrolled); the capture spec and `mockups/index.json` (no route added); `chrome.test` `PLATFORM_HEADER` (unchanged) | n/a |

## Test plan

Every negative claim has a decoy.

### Store, `outfit.test.ts` (vitest, node:sqlite)

- **Migration:**
  - a v10 database (a bookmark and three garments) migrates and keeps its rows.
- **`saveOutfit`:**
  - writes 1 + 3 + 6 rows and logs 10 `insert`s;
  - the id is a UUIDv7 at `now`;
  - `listOutfits` returns it with items and components in position order and every column exact. A captured colour's four conditions come back exact.
- **Idempotence:**
  - the same slot→garment composition while live returns the existing id and writes nothing;
  - different locks still count as the same composition;
  - **decoy:** one slot's garment changed makes a second outfit.
- **`removeOutfit`:**
  - tombstones the outfit, its items and its components;
  - logs 10 `delete`s;
  - a second remove writes nothing;
  - the raw rows still exist.
  - Saving the same composition afterwards gives a **new** id, and the old row stays tombstoned.
- **Snapshot independence:**
  - after `savePalette` upserts the garment's shared `saved_color` row with other values, and after `deleteGarment`, `listOutfits` deep-equals its earlier value;
  - **decoy:** `getGarment` shows that the colour changed and that the garment is tombstoned.
- **Constraints refuse:**
  - overall 101; score −1; direction `'great'`; source `'made-up'`; confidence 2; locked 2; an empty slot; a duplicate slot; an unknown `garment_id` (foreign key);
  - `source 'estimated'` with no conditions, and three of the four conditions.
  - Each is refused in its own rolled-back write.
- **No stray writes:**
  - nothing is written to `saved_color`, `garment` or `palette`;
  - **decoy:** `createGarment` does write `saved_color`.
- **Archive:**
  - the serialised round trip gives an identical `digest`, tombstones included;
  - **decoy:** a tampered component score changes the digest;
  - a schema-10 archive restores with no outfits and its other rows;
  - a hand-edited archive whose item names a missing garment rolls back whole;
  - erase empties all three tables.

### Conformance

- `outfit-durability`: save, reopen, listed exactly; remove, reopen, gone; save again, reopen, a new id.
- `outfit-atomicity`: the change-log INSERT for `outfit_component` is refused, and after a reopen `outfit` and `outfit_item` are empty.
- **Decoy:** a driver whose `transaction` has no BEGIN/COMMIT is reported as `outfit-atomicity`.

### Force-quit, `outfit-force-quit.test.ts`

- **Fixture:** a 2-item, 2-component outfit, the smallest that crosses all three tables and repeats a row in each.
- **Recording:** the real `saveOutfit` and `removeOutfit`, BEGIN and COMMIT included (12 statements each). The child is killed at **every** boundary (13 cuts each).
- **At each cut:**
  - before COMMIT: exactly the before-state;
  - after COMMIT: exactly the after-state;
  - always `integrity_check` = ok, and the repository reopens the file.
- **Decoys:**
  - the save split into two transactions after the outfit row, cut between them, leaves an outfit with no items, and the per-cut assertion sees it;
  - a kill after COMMIT keeps the outfit (the everyCut tail).
- **Budget:** measure it and name it (expect ~26 + 1 children). A process kill is not power loss; say so.

### App domain, `lookbook-record.test.ts` (jest)

- **`scoreDraft`:**
  - equals `scoreOutfit` over every placed piece;
  - **decoy:** with an unlocked placed piece, `regenerate`'s best score for a slot differs from `scoreDraft`.
- **`isComplete`:**
  - false at 0, 1 and 2 of 3 slots, true at 3.
- **`compositionKey`:**
  - does not depend on order;
  - **decoy:** the same garments in swapped slots give a different key.
- **`outfitRecord`:**
  - the colour is the garment row's values, by identity of the numbers;
  - the label is `name ?? type` (**decoy:** a named garment);
  - the components carry `factors`' weight and contribution;
  - the threshold is `COVERAGE_THRESHOLD`;
  - the envelope is read from its inputs (**decoy:** a fixture rule set `2099.01.1` appears in the record);
  - the profile part is `${id}:${updatedAt}`.
- **FR-10 replay sweep (no new dependency):**
  - for every complete combination of the fixture wardrobe, under each lock pattern: record, then a simulated read, then rescore from the snapshot through `colorOf`. Overall, scores, directions, weights and contributions are byte-identical.
  - **Decoy:** a different profile changes at least one combination.
- **Message keys:**
  - `componentMessageKey` equals the engine's `messageKey` across the sweep, and for every component × direction is ⊆ `OUTFIT_MESSAGE_KEYS`.
- **Rule 12:**
  - `colorOf` on a captured snapshot with its conditions removed throws by name;
  - **decoy:** with the conditions present it yields `source: 'estimated'`.

### App behaviour, `lookbook.test.tsx`

- **Provider:**
  - reads once;
  - saves, then shows what was written;
  - a save of a live composition writes nothing (**decoy:** a new composition writes);
  - remove, then shows the list without it;
  - **decoy:** a throwing store leaves the list as it was;
  - throws outside its provider.
- **Routes, asserted from source:**
  - `_layout` mounts `LookbookProvider` with `deviceRepository()`;
  - `wardrobe/outfit.tsx` passes the envelope, the saved set and `onSave`;
  - `wardrobe/index.tsx` passes the outfits and `onRemove`;
  - **decoy:** `shopping.tsx` reads no lookbook.
- **Lab:**
  - Save is disabled with `needsEverySlot` until every slot is placed (**decoy:** complete, it is enabled);
  - a press calls `onSave` once with `outfitRecord(draft, context, envelope)`;
  - once saved it is disabled with `alreadySaved` (**decoy:** changing one slot re-enables it);
  - no `lookbook` prop means no control.
- **Re-renders identically:**
  - render the Lab with a complete draft, save, then render the entry. The entry's score-line text equals the Lab's.
  - Then render the entry again under a changed profile, rules fixture and corpus label: the tree `toStrictEqual`s the earlier one.
  - **Decoy:** the Lab's lines for the same garments under the changed profile differ.
- **Wardrobe:**
  - the segment switches only the region below it, and coverage and gap stay;
  - entries are newest first;
  - each slot shows its stored hex and label in stored order;
  - *Locked* appears on the locked slot only (**decoy:** the unlocked slots have none);
  - all six component lines are present;
  - the versions line prints the **stored** versions (**decoy:** the historical fixture prints `0.4.0` / `2026.07.1`, not the build's constants);
  - Remove calls `onRemove(id)`, and its name lists the garment labels;
  - with none saved, 00's caption shows (**decoy:** with entries there is no caption);
  - the lookbook is reachable with zero garments and one outfit;
  - **decoy:** with neither, the segment is absent and the screen is today's empty wardrobe.

### `screens.test` subjects

All are `static`, with `shows` matching `STATES`, swept in both themes, both locales, and with and without reduced motion.

- `screens/OutfitBuilder (every slot filled)`;
- `screens/OutfitBuilder (in your lookbook)`;
- the main `screens/Wardrobe` subject gains `lookbook` (segment drawn, *Garments* chosen);
- `screens/Wardrobe (lookbook)`: a historical entry, a locked slot and an estimated colour;
- `screens/Wardrobe (lookbook, none saved)` (`'empty'`);
- `screens/Wardrobe (nothing in it, a lookbook)`.

**Inset procedure (F-237's):** a new subject's row is written into `.harness/verification/screen-insets.json` from the pin's own `capture()` for that subject, never by hand. The commit says the rows are new subjects. **An existing subject's row that changes is a finding, not a re-capture.** That matters especially for the `ScoreLines` extraction in increment 6, which must change no tree.

### Golden

None. The engine does not change.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-mockups.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm turbo run test --force
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:content && pnpm security
node scripts/verify-ci.mjs --all
```

- **Known reds to recount, not to fix here:**
  - `pnpm security` exits 1 on F-322's nine advisories;
  - `verify-ci --all` has three recorded reds (the iOS config half on win32, F-324, F-322).
- **Not runnable here:** the device run of `checkStore` (F-338); SQLCipher (F-336); a real swipe-away kill; TalkBack and VoiceOver; e2e (no JDK); layout at 200 % text on a device.

## Attestations (ADR-0038)

`attested[0]` quotes criterion 1 verbatim. It blocks the release and has status `outstanding`. The person verifies it on an Android debug build and pastes each output into `progress.md`:

1. With a profile and one garment per slot: open *Build an outfit*, fill every slot, lock one, tap *Save Outfit to Lookbook*. The button disables, the line says the outfit is in the lookbook, and TalkBack reads it.
2. On the Wardrobe, choose *Lookbook*; TalkBack says *selected*. The entry shows each slot (sample, hex, name), *Locked* on the locked slot only, the overall and six components, the versions line and *not recomputed*. Take a screenshot.
3. Run `adb shell am force-stop com.irodora.app` and relaunch. The entry is identical to the screenshot.
4. Ten times: compose a different outfit, Save, force-stop within about a second, relaunch. The app opens every time, and every entry is whole (all slots, all six components) or absent, never partial.
5. Edit or retake the profile and relaunch. The saved entry's figures are unchanged, while the Lab shows different figures for the same garments.
6. Remove an entry, force-stop and relaunch: it is gone. Remove the rest: the caption shows.

Backup and restore on a device is F-263's UI. Criterion 2's backup half is gated in CI by the archive round trip.

## Risks and open questions

- **OQ-40:** decided by ADR-0136 under the 2026-10-05 delegation, which the ADR quotes.
- **F-339:** golden rule 14's last sentence still says an undrawn surface waits for a person, and R9 §11 *Widened* disagrees. That is a person's call, not this feature's. Expect the evaluator to raise it. The design keeps the agent-designed surface to one control plus entries made from drawn vocabulary.
- **What F-238 must not decide, and does not:**
  - **OQ-30** (13's fourth row note): all six components are stored, and how 13's five rows map to them is F-257's.
  - **OQ-32** (the seasonal label beside fit):
    - nothing seasonal is stored or shown here;
    - **note on F-257:** a label for a *saved* outfit cannot be re-derived after the profile changes, because only the revision id is stored (finding 3). F-257 must show it only while the revision is current, or add a snapshot (a migration).
  - **OQ-23** (square brackets in 13): the catalogue's words are used without brackets, and the brackets are F-257's.
  - **The fourth slot:** the store is vocabulary-free, and old entries render the slots they have.
  - **13's score card, its row notes (APCA, separation and its model, harmony relationship) and the verdict glyph:** F-257's. The stored colours and the envelope are what it reads.
  - **07's *Save Outfit to Lab*:** F-248's. 07's slots are corpus colours, not garments, so they are not lookbook entries (note on F-248).
  - **Home's *Garments • Valid Outfits*:** that is coverage, not the lookbook (note on F-242).
- **Readings the session chooses, stated so they can be overruled:**
  - an outfit is one garment per slot (D4);
  - a composition is identified by slot→garment, and locks are not part of the identity;
  - no revival after removal;
  - no profile snapshot.
- **Encryption:** the lookbook is in the same database file, which is very likely plain until F-336. Nothing here claims otherwise, and no attestation step asks about it.
- **Restore and erase:** the provider reads once. An in-app restore or erase (F-263) must make it read again (note on F-263). The same applies to a garment-delete UI when one exists: entries keep their snapshot by design.
- **The lookbook list is not virtualised.** It holds no blobs, and its size is bounded by what a person saves. F-255 may virtualise it.
- **Force-quit runtime:** about 27 child processes. Measure and name the budget, as F-237 had to after Tier 2 timeouts.
- **The profile revision string is assembled in the app** (`${id}:${updatedAt}`), against `subject.ts`'s "nothing here formats a version". It follows color-engine.md §11's definition, and there is no published profile version to read.
- **Segment labels at 200 % text** are unmeasured. Check `ChoiceGroup` segmented's behaviour, and the ja label width in the subject.

## Out of scope

- A route, a Home section or a profile entry for the lookbook.
- Naming, tagging, reordering, sharing or exporting outfits.
- Opening a saved outfit in the Lab, editing it, or recording a wear from it.
- Rescoring a saved outfit; storing a profile snapshot or evidence.
- 13's rebuild (F-257), 11's rebuild (F-255), 07's save (F-248), Home (F-242).
- The backup UI (F-263), SQLCipher (F-336), sync.
- A haptic on save (ADR-0104 lists its moments).
- A garment-delete UI.
- Keeping the *Lookbook* choice across launches.

## Sources

- [Android Developers, Segmented button (Compose)](https://developer.android.com/develop/ui/compose/components/segmented-button?authuser=1)
- [Compose Material3 SegmentedButton API](https://kotlinlang.org/api/compose-multiplatform/material3/androidx.compose.material3/-segmented-button.html)
- [Indyx, Acloset vs. Whering](https://www.myindyx.com/versus/acloset-vs-whering)
- [Indyx, Whering vs. Indyx](https://myindyx.com/versus/whering-vs-indyx)
- [Indyx, Stylebook vs. Indyx](https://myindyx.com/versus/indyx-vs-stylebook)
- [Good On You, wardrobe organising apps](https://goodonyou.eco/wardrobe-organising-apps/)
- Apple HIG, Segmented controls (https://developer.apple.com/design/human-interface-guidelines/segmented-controls): the page could not be read here, and the guidance above is stated from general knowledge.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claim; ADR-0136 (D1–D7; OQ-40 closed by D1) adopted as the planner recommended, its facts checked against the code first (`10.source`; the Lab has no save; three engine slots; the Lab renders nothing without a profile; `RECOMMENDATION_VERSION`; `COVERAGE_THRESHOLD`); ADR-0135's revisit line; criterion 2 amended; `attested[0]`; R9 §4 E4 and §11; PRD §10; F-255 blocked by F-238; notes on F-255, F-257, F-248, F-242 and F-263. |
| 1 | `fc60f92` | Migration 11 (three tables, both lists, two table CHECKs on the capture columns), `saveOutfit`, `listOutfits`, `removeOutfit`. `outfit.test`: 32 cases. **Tier 1:** all 0. |
| 2 | `614d581` | `outfit-durability` and `outfit-atomicity` in `checkStore` (floor 14 → 16), with three decoy cases. **Tier 1:** all 0. |
| 3 | `995eadc` | The force-quit helpers moved to `test/fixtures/force-quit.ts`, with the bookmark cases unchanged. `outfit-force-quit`: a save and a removal, each killed at all thirteen boundaries, plus a split-transaction decoy. Budget 120 s, measured at about 0.12 s a child. **Tier 1:** all 0. |
| 4 | `993490a` | `src/outfit/lookbook.ts`: `scoreDraft`, `isComplete`, `compositionKey`, `outfitEnvelope`, `outfitRecord`, `shownScoreOf`. `RULES_OCCASION` and `pieceOf` exported. `lookbook-record.test`: 18 cases, including the FR-10 replay over every complete outfit. **Changed from the plan:** `outfitRecord` takes the score that was shown, not the context, so the record cannot differ from what the person saw. **Tier 1:** all 0; the test run was cut off with the session and re-run alone. |
| 5 | `e578485` | `src/lookbook.tsx`, mounted in `_layout` inside `BookmarksProvider`. `lookbook.test`: the provider, and the layout's mount from source. **Tier 1:** all 0. |
| 6 | `7e3a092` | `ScoreLines` extracted unchanged, then the Lab's save, its reason line, and the whole outfit's score under "The whole outfit". The route builds the envelope. Two subjects. **Changed from the plan:** `ScoreLines` lives in `src/`, not `src/screens/`, because every file there must declare its data conditions as a screen; a heading key, `lookbook.wholeOutfit`, labels the draft's score, so it is not read as a proposal's. **Tier 1:** all 0; content, a11y, contrast and cvd 0. |
| 7 | `6cf28af` | The Wardrobe's choice, list, entry, removal and empty caption; the route; four subjects and a lookbook arrival case. The new 1.5 inset is `ChoiceGroup`'s segmented inset, recorded in the pin's comment. **Changed from the plan:** the main `screens/Wardrobe` subject is unchanged, and a new subject draws the choice, so no existing row moved. While inserting tests, a replacement string pasted half the test file into itself; it was restored from the commit and redone (lesson). **Tier 1:** all 0; content, a11y, contrast and cvd 0. |
| 8 | this commit | Records: E-205 and E-206 with their notes; E-023, E-139, E-053, E-199, E-073 and E-204 extended, with their notes; data-model §5 (the built tables replace the sketch) and §6 (replay indexes); a lesson; the memory index. Also the E-073 test: no photograph is read with Lookbook chosen (decoy: the gallery asks). |
