# Plan: F-237 — A colour can be bookmarked

| | |
|---|---|
| **Feature** | F-237 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-56, NFR-13 — [`docs/PRD.md`](../../docs/PRD.md); closes OQ-39 |
| **Service / package** | `@irodora/store` · `@irodora/ui` · `apps/mobile` |
| **Author** | The planner subagent's design (read-only), decided and edited by the implementing session |
| **Date** | 2026-10-13 |
| **Decisions** | [ADR-0135](../../docs/adr/0135-the-bookmarked-colours-are-read-back-on-the-atlas-through-a-toggle-in-its-search-field.md), D1–D6 (OQ-39 is D1) |

---

## Intent

- **On a colour's page (06)**, the bookmark at the trailing end of the header fills in when tapped,
  and announces *selected*. It stays filled after the app is closed, killed, or the phone restarts.
- **On the Atlas (05)**, the same glyph at the trailing end of the search field narrows the list to
  bookmarked colours, together with whatever is typed and filtered.
- **When nothing is bookmarked**, a caption says so, and says how to bookmark one. The list is never
  left blank.
- **Bookmarks are in every backup**, and come back on restore.

## Three findings from planning

1. **SQLCipher is not linked into the build** (F-336, recorded 2026-10-13).
   - expo-sqlite links it only when its config plugin is given `useSQLCipher: true`, and
     `app.config.ts` does not pass it.
   - So the "encrypted store" half of criterion 1 rests on F-336. The bookmark is in the same file
     as every other row and is protected exactly when that file is.
   - Turning the flag on here would break every existing install, so it is not done here (rule 2).
   - The attestation's step 5 is expected to fail until F-336 lands, and is recorded as it is.
2. **A bookmark cannot be a `saved_color` row**, for four reasons (ADR-0135, Context). So it gets its
   own pointer table. One of those reasons is a defect already shipped: Home's *Last reading* is the
   newest live `saved_color` row whatever its source, so a palette's corpus colour already shows as a
   reading. That is recorded as F-337 (rule 5), out of scope here.
3. **No test has ever killed a process mid-write.**
   - FR-56's force-quit clause rests today on `CONNECTION_PRAGMAS` (WAL, `synchronous = FULL`), on
     thrown-error rollbacks, and on F-041's outstanding device attestation.
   - This feature adds the first test that kills a process mid-write.

## How the criteria are read

- **Criterion 1, "persists in the encrypted store":** written to the one database file the
  encryption is meant to cover. Whether that file is encrypted is F-336's to prove, not this
  feature's. This feature claims nothing about it.
- **Criterion 1, "a force-quit mid-write":** three levels of evidence, each named:
  - a child process killed between the statements of `bookmarkColor`'s transaction, in CI;
  - `bookmark-atomicity` on both drivers;
  - the person's device run.

  A process kill is not power loss. `synchronous = FULL` is the guard for power loss, and nothing
  here can test it.
- **Criterion 2:** amended in the open (ADR-0135, Consequences). It now reads *"The saved set is
  reachable from the Atlas (05), through the bookmark toggle in its search field that ADR-0135
  places there (OQ-39), and is covered by backup and restore"*.

## Approach

**Store.** Migration 10 creates `color_bookmark`:

```sql
CREATE TABLE color_bookmark (
  ${SYNC_COLUMNS},
  corpus_slug TEXT NOT NULL UNIQUE CHECK (corpus_slug <> '')
) STRICT;
CREATE INDEX color_bookmark_live ON color_bookmark (deleted_at) WHERE deleted_at IS NULL;
```

- `SCHEMA_VERSION` goes from 9 to 10.
- The table is appended to `SYNC_TABLES` and `ARCHIVE_TABLES`. It has no foreign key, so ordering
  does not matter.

Repository methods, each in one `driver.transaction`:

- `bookmarkColor(slug, now)`:
  - no row: INSERT with a UUIDv7 id, and log `insert`;
  - a tombstoned row: revive it on the same id, and log `update`;
  - a live row: no write, no log.
- `unbookmarkColor(slug, now)`: a live row is tombstoned and logged `delete` once; otherwise it does
  nothing.
- `listBookmarks()`: the live slugs, in slug order.

**Shared state.** `apps/mobile/src/bookmarks.tsx` holds:

- the `BookmarkStore` port;
- `BookmarksProvider`, which reads the set once, then writes through and reads it again;
- `useBookmarks()`;
- `ColourBookmark`.

Routes read the hook and pass values down as props, so screens stay renderable in jest. If a write
throws, the set is left as it was.

**ui:**

- `IconButton` gains `selected`, typed as a union so it compiles only on a fillable glyph. It sets
  both the fill and `accessibilityState.selected`.
- `bookmark` joins `FILLABLE_GLYPHS`.
- `SearchField` gains `trailing?: SearchFieldToggle`. Without it, the field renders exactly the tree
  it renders today.
- Conformance gains `treatment: 'glyph'`: in `active` the subject draws a filled shape, in `default`
  it draws none.

**06.** `ColourBookmark` goes in the route's platform `headerRight` (ADR-0135 D5).

**05.** `Atlas` gains these props:

- `bookmarked?: ReadonlySet<string>`; when it is absent, no toggle is drawn;
- `initialBookmarkedOnly?: boolean`;
- the screen-local `bookmarkedOnly`, combined with the query and filters (AND), cleared by *Clear*,
  and counted;
- an empty set shows `00`'s caption.

**Reused:**

- **store:**
  - `SYNC_COLUMNS`, `MIGRATIONS`, `migrate`;
  - `log()` and the `uuidv7` port;
  - `archive.ts`: export, import, erase, `digest`;
  - `backup.ts`: serialise and deserialise;
  - `checkStore`.
- **ui:**
  - `IconButton` with `filled` and `hitArea`;
  - `Glyph` with `solid` and `line`;
  - `EmptyState` with `resolvedHere`.
- **app:**
  - `STATES`, where `Atlas` and `ColourDetail` already declare `absent: 'empty'`;
  - the `screens.test` registry and its sweeps;
  - `useMessages`, `deviceRepository()`;
  - the `AppearanceProvider` and `TargetProvider` shapes.

## Increments (Tier 1 per commit, ADR-0132)

| # | what | verified by |
|---|---|---|
| 0 | Claim; ADR-0135; this plan; R9 §4 E4, §9 and §11; PRD §10; criterion 2 amended; F-246 `blockedBy` F-237 and notes on F-246 and F-247; F-337 recorded | state, format, lint |
| 1 | Store: migration 10, the three methods, `bookmark.test.ts` | store and dependants' tests |
| 2 | `bookmark-durability` and `bookmark-atomicity` in `checkStore` (floor 12 → 14), with a decoy | the same |
| 3 | The force-quit test and its child fixture | the same |
| 4 | ui: the glyph, `IconButton` `selected`, the `glyph` treatment, a registry subject, decoys | ui and mobile tests, a11y, contrast |
| 5 | ui: `SearchField` `trailing`, a registry subject, tests | the same |
| 6 | App, 06: `bookmarks.tsx`, the provider in `_layout`, `headerRight`, `detail.bookmark`, the font subset, `bookmarks.test.tsx`, the 06 subject | mobile tests, content |
| 7 | App, 05: `Atlas` props and behaviour, the route, three keys, the font subset, subjects and behaviour tests, the regenerated rows | mobile tests, content, a11y, contrast, cvd |
| 8 | Records: data-model §5, effects and their notes, F-263's note | state |
| 9 | Tier 2, then the evaluator once, fixes, Tier 2 again; the device run is asked of the person | — |

## Mockup fidelity

- **Governing mockups:** `06` (the toggle) and `05` (the read-back). Variants: `25` light, `26` for
  06's Japanese.
- **Inventory elements built:**
  - **`06.bookmark`:** order 4 under `06.header`, `ui:Button`, icon `bookmark`, action
    `toggle:bookmark`, drawn 14.5 × 18 dp. Glyph size 24 reproduces the drawn 18 dp height in the
    24-unit grid. Ink is `foreground`, because the element binds no token.
  - **`05.search`:** built here only by adding the trailing toggle. Its leading glyph, its edge,
    its drawn height and its copy stay F-246's.
- **Bindings:** the toggle's state binds to `color_bookmark` through the provider. The Atlas binds
  to the corpus entries that are members of that set. No mockup content reaches the build.
- **Departures:** one, added to R9 §4 E4 under the 2026-10-05 delegation (ADR-0135). It covers the
  filled bookmark, which no mockup draws, the toggle in `05`'s field, and the empty caption.

## Files to touch

```
packages/store/src/schema.ts            migration 10, SCHEMA_VERSION 10, SYNC_TABLES += color_bookmark
packages/store/src/archive.ts           ARCHIVE_TABLES += color_bookmark
packages/store/src/repository.ts        BookmarkRow; the three methods on Repository
packages/store/src/createRepository.ts  the three methods
packages/store/src/index.ts             export type BookmarkRow
packages/store/src/testing/index.ts     bookmark-durability, bookmark-atomicity
packages/store/test/bookmark.test.ts, bookmark-force-quit.test.ts, fixtures/replay-and-die.ts   new
packages/store/test/conformance.test.ts floor 14; the atomicity decoy
packages/ui/src/Glyph.tsx, IconButton.tsx, SearchField.tsx, testing/conformance.ts, index.ts
packages/ui/test/…                      icon-button, search-field (new), conformance, glyphs
apps/mobile/src/bookmarks.tsx           new
apps/mobile/app/_layout.tsx, app/(tabs)/atlas/[slug].tsx, app/(tabs)/atlas/index.tsx
apps/mobile/src/screens/Atlas.tsx
apps/mobile/src/i18n/en.ts, ja.ts; assets/fonts/NotoSansJP-Subset.ttf (regenerated)
apps/mobile/test/bookmarks.test.tsx (new), screens.test.tsx
.harness/verification/*.json            regenerated where a test names its procedure
docs/adr/0135-…; docs/design/R9-MOCKUP-FIDELITY.md; docs/PRD.md; docs/architecture/data-model.md
.harness/state/feature_list.json, effects.json, progress.md; .harness/memory/…
```

## Anticipated effects

- **E-023** (`MIGRATIONS` → repository, archive, testing, the device store, data-model): migration
  10.
  - Guards: `bookmark.test`'s migrate-from-v9 case; `bookmark-durability` on both drivers; the
    archive round trip.
  - Update its rationale: since F-241 a new table does not join the archive on its own.
- **E-139** (SYNC vs ARCHIVE): `profile-avatar.test`'s length relation catches a forgotten archive
  entry. Erasure reaches the table through `SYNC_TABLES`, asserted in `bookmark.test`.
- **E-134** (inventory → Glyph and IconButton): `FILLABLE_GLYPHS` gains a fill no mockup draws.
  - Guards: `glyphs.test` and the E4 entry.
- **E-086** (`conformance.ts`): the `glyph` treatment.
  - Guards: two decoys, and both registries using it.
- **E-151 / E-156** (SearchField, `hitArea`):
  - Guards: `search-field.test`'s *no trailing, same tree*; the hit area inside the field; the
    tap-target rule.
- **New E-204:** the bookmark set → 06's header, the Atlas screen and route, `SearchField.trailing`,
  F-246, F-247, R9 E4, ADR-0135.
  - Guards: the screen subjects and behaviour tests; `bookmarks.test`'s route assertions, which fail
    if a later feature drops either control.
- **E-016 / E-066 / E-089** (catalogues, claims) and the font subset: guarded by `i18n.test`, the
  claims lint and `test:content`.
- **Not affected:**
  - **E-203:** F-237 is not a builder of 05 or 06 (its `blockedBy` lacks F-221), so nothing is
    enrolled.
  - **The capture spec:** no route is added or renamed.
  - **`chrome.test`'s `PLATFORM_HEADER`:** unchanged.

## Test plan

- **Store (`bookmark.test.ts`):**
  - migration 10 brings a version-9 database up and keeps its rows;
  - bookmark, list, and one `insert` logged;
  - idempotent, with a decoy: a second slug makes two rows;
  - unbookmark tombstones, never deletes, and logs one `delete`;
  - a second unbookmark writes nothing;
  - re-bookmark revives the same id, with `deleted_at` null and an `update` logged;
  - nothing is written to `saved_color`, `palette` or `garment`, with a decoy: `saveColor` does
    change `saved_color`;
  - a palette using the same colour is untouched;
  - the database refuses an empty slug, and a second row for one slug;
  - **archive:**
    - a round trip through the serialised string gives an identical digest, tombstones included;
    - a tampered slug changes the digest (decoy);
    - a schema-9 archive restores with no bookmarks;
    - erase leaves the table empty;
  - the table is in both lists.
- **Conformance:**
  - `bookmark-durability`: bookmark, reopen, still present; unbookmark, reopen, gone; bookmark
    again, reopen, present.
  - `bookmark-atomicity`: the change-log insert throws, and no row remains after reopening.
  - Decoy: a driver whose `transaction` has no BEGIN/COMMIT is reported as `bookmark-atomicity`.
- **Force-quit:**
  - **Setup:** the real `bookmarkColor` and `unbookmarkColor` run on a scratch database under a
    recording driver. A child process replays the recorded statements on a copy, prints `CUT`, and
    kills itself with SIGKILL.
  - **Cases:**
    - killed after the row and before the log;
    - killed after both and before COMMIT;
    - an unbookmark killed before COMMIT.

    In each, nothing survives (or the bookmark stays live), the database is `integrity_check` ok,
    and the repository reopens it.
  - **Decoy:** killed after COMMIT, the bookmark is there.
- **ui:**
  - `@ts-expect-error` for `selected` on a glyph with no fill, and for `filled` with `selected`;
  - one prop announces the selected state and draws the fill;
  - the decoy: without `selected`, no selected state is announced;
  - `SearchField`: without `trailing` the tree is the same; the toggle is named, announces its
    state, is inert when the field is, and its hit area lies inside the field;
  - treatment decoys: an outline in `active` is reported; a fill in `default` is reported.
- **App:**
  - **The provider (`bookmarks.test.tsx`):**
    - it reads the store once;
    - it writes, then shows what was written;
    - setting the same state twice is one write;
    - decoy: a store that throws leaves the set as it was;
    - it throws outside its provider;
    - `ColourBookmark` renders nothing for a slug this corpus lacks;
    - the route sources mount and read the provider, with a decoy route that does not.
  - **`screens.test` subjects:**
    - Atlas with the toggle;
    - Atlas, bookmarked only;
    - Atlas, bookmarked only with none bookmarked;
    - 06's toggle.
  - **Behaviour:**
    - it lists only bookmarked colours, in corpus order;
    - it combines with the query and a filter, with a decoy: toggle off, same query;
    - with none bookmarked it shows the caption, never an empty list;
    - decoy: bookmarks exist but none matches, so the filters' caption shows;
    - *Clear* turns it off.
  - Every subject is swept in both themes, both locales, and with and without reduced motion.
- **Golden:** none. No engine change.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm turbo run test --force
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:content && pnpm security
node scripts/verify-ci.mjs --all
```

**Not runnable here:**

- the device run of `checkStore`;
- SQLCipher (F-336);
- a real swipe-away kill;
- TalkBack and VoiceOver;
- layout inside the native header;
- e2e.

## Attestations (ADR-0038)

`attested[0]` quotes criterion 1 verbatim. It blocks the release, and is verified by the person on an
Android debug build, pasting each output into `progress.md`:

1. Open a colour's page and tap the bookmark. The glyph fills, and TalkBack says *selected*.
2. Run `adb shell am force-stop com.irodora.app` and relaunch. The colour is still bookmarked. On
   the Atlas, the toggle lists only that colour.
3. Ten times, alternating on and off: tap, force-stop within about a second, then relaunch. The app
   opens every time, and 06 and the Atlas agree.
4. With nothing bookmarked, turning the toggle on shows the caption.
5. `adb exec-out run-as com.irodora.app cat files/SQLite/irodora.db | head -c 16` must not print
   `SQLite format 3`. **Expected to fail until F-336 lands**, and recorded as failed.

## Risks and open questions

- **OQ-39:** decided by ADR-0135.
- **The empty form:** `00`'s caption, not `27`'s card. The way out is the toggle on this screen, and
  a card's action would be the duplicate control F-139 forbids (ADR-0128 D3).
- **Restore and erase:** the provider reads the set once. No in-app restore or erase exists yet, so
  F-263 must make the provider read again. This is a note on F-263.
- **Out-of-corpus bookmarks:** a bookmark for a slug the pinned corpus lacks can come only from a
  cross-version restore. It is kept but never listed, and does not count toward *none bookmarked*.
- **A hand-edited archive with two rows for one slug:** fails `UNIQUE`, and the restore rolls back
  whole, as other constraint failures already do.
- **The force-quit child:** it depends on Node 24's type stripping, which `.nvmrc` pins.

## Out of scope

- A saved list, a route, a Home section or a profile entry.
- Ordering bookmarks by date.
- Bookmarking a Lens reading or a garment.
- A haptic on bookmark (ADR-0104 lists its moments).
- 06's `AppBar`, share and export (F-247).
- 05's rebuild (F-246).
- OQ-40 (F-238).
- SQLCipher (F-336).
- Backup UI (F-263).
- Keeping the Atlas toggle on across launches (ADR-0135 D4).
- Sync.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claim, ADR-0135 (D1–D6; OQ-39 closed by D1), criterion 2 amended, this plan, R9 §4 E4, §9 and §11, PRD §10, F-246's block and notes on F-246, F-247 and F-263. F-336 (SQLCipher) was recorded in the commit before; F-337 (Home's *Last reading*) is recorded here. |
