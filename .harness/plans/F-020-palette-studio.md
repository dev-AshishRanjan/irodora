# Plan: F-020 — Palette Studio

| | |
|---|---|
| **Feature** | F-020 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-49 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/store` · `@irodora/ui` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

A person assembles a palette from the corpus, gives each colour a role, orders it, names it,
and saves it to their own device. It survives a restart because it is in the encrypted
database, not in React state.

**Done, to a user:** open Palette Studio, search the corpus, add colours, set anchor /
neutral / light / accent, move members up and down, remove one, type a name, press Save, kill
the app, reopen it, and the palette is still there.

## Approach

### The criterion that decides the architecture

> *Palettes validate against the same schema as corpus palettes.*

This is met by **calling `parsePalette` from `@irodora/corpus`** — the same function
`content/palettes/*.json` goes through — on every draft before it is written, and again on
everything read back out of SQLite. Not by a second set of rules in the app that happens to
agree today.

That is worth doing because `parsePalette` already enforces exactly what a palette *editor*
breaks: at least one `anchor`, ranks contiguous from 1, weights in `(0, 1]`, no slug twice,
never empty. A reorder that drops a rank and a delete that leaves a gap are the two most
likely defects in this screen, and both are already someone else's failing test.

### What a user palette has to say about itself

`CorpusPalette` was designed for provenanced editorial content. A palette a person builds on
their phone is not that, and the honest fields are not obvious. This is settled in
**ADR-0067** rather than decided in passing:

| Field | Value, and why it is true |
|---|---|
| `slug` | the row's UUIDv7 — a uuid is valid kebab-case, it is unique, and it claims to be an identity rather than a name |
| `classification` | `editorial` — the only honest member of `OUR_OWN_CURATION` for work that is neither ours nor canonical. **Its label is never rendered**: the Studio shows its own origin line, because `classification.editorial` reads "Irodora original" and a user's palette is not |
| `sourceType` | `editorial` |
| `sourceId` | `USER-LOCAL`, a **reserved** id that is not in the register — guarded, see below |
| `authoredBy` | `user-local`, a reserved roster id that is not in `content/editors.json` — guarded |
| `derivation` | the real one: assembled by hand in Palette Studio from published entries of a named corpus version, nothing measured and nothing altered |
| `status` | `draft` — so `verifiedBy` / `verifiedAt` / `reviewIndependence` must be `null`, which is exactly what an unreviewed palette is |
| `versionId` | the corpus version it was built against. A real fact, and the one that matters when a later version supersedes an entry |
| `name.en` / `name.ja` | the one string the person typed, in both. We do not translate user content; there is one name and it is that one |
| `weight` | derived from rank, not authored — see below |

**The two sentinels are guarded, not trusted.** `verify-content.mjs` gains a check that no
file in `content/` uses `USER-LOCAL` or `user-local`; without it a repository content file
could adopt a device-local identity and the register cross-check would have nothing to say.
The guard needs a decoy, since a check for a string that appears nowhere passes vacuously.

**Weights are derived because the user does not author them.** Rank 1 takes `1.0`; ranks
2..n descend linearly from `0.9` to `0.6`. So reordering *means* something — order is
proportion — which is the only reason a reorder control is worth having. The seed palettes'
weights are hand-authored and this rule deliberately does **not** reproduce them; claiming it
did would be a claim about editorial judgement that a formula cannot make.

### Storage

`palette` and `palette_member` were created in F-041 and have never been written to. They
cannot hold a corpus-shaped palette: no `weight`, no Japanese name, no classification, no
category, no version, and no way to know which corpus entry a `saved_color` came from.

**Migration 2** adds exactly those, all additive:

```
saved_color    + corpus_slug     TEXT   -- nullable: a Lens capture has no slug
palette        + name_ja         TEXT
               + classification  TEXT
               + category        TEXT
               + version_id      TEXT
palette_member + weight          REAL
```

Every new column is **nullable with no default**. A `DEFAULT` here would be a value nobody
chose standing in for one somebody must; `NULL` honestly means *written before this column
existed*, and the read path refuses it by name rather than inventing a substitute. The write
path always supplies all six.

`palette.id` doubles as the corpus `slug`; `palette_member.position` is the corpus `rank`.
Neither needs a second column, and a second column is a second thing that can disagree.

**A palette member copies the corpus colour into `saved_color`.** Not duplication for its own
sake: a palette built against `2026.08.1` must still render the colour the person chose after
a corpus version supersedes that entry, and `version_id` records which version it was built
against. `corpus_slug` is what lets the row round-trip back into a palette member.

### The seam, and its honest limit

`expo-sqlite` needs a device, so nothing in CI writes a real row through the driver the app
ships. That is F-041's shape and it does not change here:

- **`@irodora/store`** owns the SQL and is tested against `node:sqlite` — real transactions,
  real foreign keys. The **round-trip through `parsePalette`** lives here, so what SQLite
  hands back is proven to re-parse.
- **the shared conformance suite** gains the palette cases, so the device driver is judged by
  the same function when F-041's device attestation is run.
- **the screen** takes a narrow `PaletteStore` port. The registry renders it with an
  in-memory fake; the **route** wires `deviceRepository()`. The screen never imports
  `expo-sqlite`, which is also what keeps jest able to render it at all.

What that leaves unproven, stated rather than discovered: the route's wiring is checked by
`typecheck` (the port types must match) and by a source assertion that the route imports the
real repository. Nothing off-device proves a row reaches SQLCipher. That is F-041's standing
attestation, not a new gap.

**Reused:** `parsePalette`, `CorpusError`, `PALETTE_ROLES`, `PALETTE_CATEGORIES`
(`@irodora/corpus`) · `allEntries`, `entryBySlug`, `colorFor`, `CORPUS_LABEL` (`src/corpus`) ·
`createRepository`, `uuidv7`, `migrate` (`@irodora/store`) · `Button`, `Chip`, `SearchField`,
`Swatch`, `Surface`, `Text`, `Status` (`@irodora/ui`) · the screen and component conformance
suites.

**New:** `TextField` in `@irodora/ui` — the palette name needs a labelled text input and
`SearchField` announces `accessibilityRole="search"`, which is a lie about a name field. It
goes in the library, not the screen, because [an interactive control inside a screen is
checked by nothing](../memory/lessons/an-interactive-control-inside-a-screen-is-checked-by-nothing.md).
No other new component: reorder and remove are `Button`s, roles are `Chip`s.

### Increments

1. `@irodora/store` — migration 2, palette rows on the `Repository` port, tests.
2. `@irodora/store/testing` — the palette cases in the shared conformance suite.
3. `packages/store` round-trip test through `parsePalette` (corpus as a devDependency).
4. `@irodora/ui` — `TextField`, registered in the conformance registry.
5. `apps/mobile/src/palette.ts` — the draft, its pure operations, `toCorpusPalette`, weights.
6. `apps/mobile/test/palette.test.ts` — the malformed-draft table, with its decoy.
7. i18n keys, en and ja.
8. `PaletteStudio.tsx` + `app/palettes.tsx` + `deviceRepository()`; Home links to it.
9. `verify-content.mjs` — the reserved-identity guard and its decoy.
10. ADR-0067, effects, docs, progress.

## Files to touch

```
packages/store/src/schema.ts                  — migration 2; SCHEMA_VERSION 2
packages/store/src/repository.ts              — PaletteRow, PaletteMemberRow, port methods
packages/store/src/createRepository.ts        — savePalette / listPalettes / getPalette / deletePalette
packages/store/src/testing/index.ts           — palette cases in the shared suite
packages/store/test/palette.test.ts           — NEW: SQL behaviour + parsePalette round-trip
packages/store/package.json                   — @irodora/corpus as a devDependency (test only)
packages/ui/src/TextField.tsx                 — NEW
packages/ui/src/index.ts                      — export it
packages/ui/test/conformance.test.tsx         — register it
apps/mobile/src/palette.ts                    — NEW: draft, operations, weights, toCorpusPalette
apps/mobile/src/store/repository.ts           — NEW: memoised device repository (route-only)
apps/mobile/src/screens/PaletteStudio.tsx     — NEW
apps/mobile/app/palettes.tsx                  — NEW route
apps/mobile/src/screens/Home.tsx              — a way in
apps/mobile/src/i18n/en.ts, ja.ts             — the copy
apps/mobile/test/palette.test.ts              — NEW
apps/mobile/test/screens.test.tsx             — register the screen; the FR-49 assertions
scripts/verify-content.mjs                    — reserved-identity guard + decoy
docs/adr/0067-…                               — NEW; plus the docs/adr/README.md index row
docs/architecture/data-model.md               — §5 gains user palettes
.harness/state/effects.json + memory/effects/ — the new links
```

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **The database schema** (`MIGRATIONS`, `SCHEMA_VERSION`) | `createRepository` · the archive digest (`SELECT *` picks new columns up) · `parseArchive` · the shared conformance suite · both drivers | `gate:test` — the `packages/store` conformance and archive tests. **New link.** |
| **The `Repository` port** | `createRepository` · the device driver · `apps/mobile` | `gate:typecheck` + `gate:test` |
| **`parsePalette` is now called at runtime**, not only by the content gate | every saved palette · the Studio's error path | `gate:test` — the round-trip test and the malformed-draft table. A **new destination end for E-013**. |
| **The message key set** (`en.ts`) | `ja.ts` · every render site · `i18n.test.ts` | `gate:typecheck` — E-016 |
| **New Japanese copy** | the bundled font subset | `script:verify-font-coverage.mjs` — E-017, which has fired on all three previous features that wrote Japanese |
| **A new `@irodora/ui` component** | the conformance registry · `a11y-scope.mjs`'s closure | `gate:a11y` |
| **Reserved identities** `USER-LOCAL` / `user-local` | `content/` · the register · `editors.json` | `script:verify-content.mjs` — **new check, with a decoy** |

## Test plan

- **Unit / property:** weight derivation for n = 1..50 — starts at 1, non-increasing, every
  value in `(0, 1]`, never 0. Draft operations: a move at either end is a no-op, a remove
  renumbers ranks contiguously, an add appends.
- **Golden:** none. No colour maths is written in this feature; members are corpus entries and
  their values come from the bundle unmodified.
- **Conformance:** `@irodora/store`'s shared suite over `node:sqlite` (the device driver stays
  attested, per F-041) · the component suite over `TextField` · the screen suite over
  `PaletteStudio`.
- **Round-trip:** save → read → `parsePalette` → deep-equal the record that was saved. That is
  criterion 2 at the storage boundary rather than only at the UI boundary.
- **E2E:** the journey is *add, role, reorder, name, save, reopen*. **Gate 7 cannot run** —
  nothing declares a `test:e2e` task and **F-091** carries it. To be reported, not claimed.
- **Negative, with decoys:**
  - a draft with no anchor / a duplicate slug / an empty member list / a rank gap must each
    throw a `CorpusError` naming its field — **decoy:** a well-formed draft must parse, or the
    table would pass against a function that always throws.
  - a `palette` row with a `NULL` in a migration-2 column must be refused by name; the row is
    planted directly through the driver, because the write path cannot produce one.
  - `verify-content.mjs`'s reserved-identity check runs against a **planted** content file
    using `USER-LOCAL` — a check for a string that appears nowhere passes vacuously.
  - the Studio must not render `classification.editorial`'s label, asserted as an exact
    text-node match rather than a substring, because "original" legitimately appears elsewhere.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y          # gate 8 — scope, then the suites
pnpm test:contrast      # gate 9 — both themes
pnpm test:content       # gate 11 — the new reserved-identity check
pnpm test:e2e           # gate 7 — EXPECTED TO BE UNAVAILABLE; report it, never claim it
```

`color-golden` is out of scope: nothing in `packages/color-*` changes and this feature is not
a destination of E-001 or E-003.

## Risks and open questions

- **`classification: "editorial"` on a user palette.** The field is honest; its *label* is
  not, for content the user made. Mitigated by never rendering the corpus classification label
  on this surface, and asserted. If a later surface renders user palettes generically this
  becomes a real defect — recorded in the ADR's consequences as the thing to watch.
- **Migration 2 against a database with rows.** There are none: nothing has ever written a
  palette. The nullable columns make the migration safe regardless, and the read path says so
  out loud rather than defaulting.
- **`saved_color` rows accumulate.** Every palette member writes one. Deleting a palette
  tombstones the palette and its members; the colours stay, because a colour saved once may be
  in two palettes. Stated rather than silently accepted.
- No `OQ-*` blocks this feature.

## Out of scope

Harmony suggestions inside the Studio (`@irodora/color-harmony` exists; FR-49 does not ask for
it) · sharing or exporting a palette as an image (**F-023**) · editing weights by hand ·
palettes built from Lens captures (**F-040**) · a palette list screen beyond what the Studio
itself needs to reopen a saved palette · translating user-entered names.
