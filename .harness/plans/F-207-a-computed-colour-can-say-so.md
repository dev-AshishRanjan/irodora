# Plan: F-207 — A computed colour can say it was computed

| | |
|---|---|
| **Feature** | F-207 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-2, NFR-21 |
| **Service** | `packages` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The claim being made

`declared` means **a human asserted this value**. A harmony companion, a lexicon region centre
and the swatch the Atlas draws are none of them asserted by anyone — they are coordinates an
engine computed from another colour. Filing them as `declared` is not a naming problem: it is
the product saying a person vouched for a number no person has seen.

So the union gains a fifth member, `derived`, and it is **untracked** — `UntrackedSource` is
`Exclude<MeasurementSource, CapturedSource>`, so it picks `derived` up without an edit, which
is the right answer twice over: a computed colour owes no capture conditions, and it must never
be constructible as a `CapturedProvenance`.

## The call-site review, which is the actual work

Criterion 2 says a mechanical rename is not the change. Every site that writes a source, decided
one at a time:

| site | today | after | why |
|---|---|---|---|
| `color-core/src/color.ts` · `UNSAFE_HEX_PROVENANCE` | `declared` | **`declared`** | a hex string is exactly *"somebody typed it"*. This is the definition of the word, not a casualty of it. |
| `optimization/src/coverage.ts` · `representativeOf` | `declared` | **`derived`** | the centre of a lexicon region, solved from two term constraints. Nobody declared it; the file's own comment already says the hue is *"arbitrary"*. |
| `apps/mobile/src/engine.ts` · `displayFromOklch` | `declared` | **`derived`** | it takes a bare OKLCh triple — a coordinate with no provenance — and returns a `Color`. Every caller is a colour the engine computed. |
| `apps/mobile/src/wardrobe.ts` · `colourFromReading` | `estimated` | **`estimated`** | criterion 4. The camera is untouched. It uses `display.hex` only; the source it writes is its own. |
| `store/src/testing/index.ts` fixtures | `declared` | **`declared`** | a fixture is a value the test author typed, which is the word working correctly. |
| the corpus (`reference`) and the profile | — | untouched | criterion 4. |

### `displayFromOklch` is the one worth arguing about

It is called by the Lens on a **capture**. Flipping it to `derived` does not reclassify that
measurement, and criterion 4 survives, for a reason worth writing down: the measurement is the
row `colourFromReading` writes — `estimated`, with the four conditions ADR-0005 requires.
`display.color` is a *rendering* of the reading's coordinate, and it currently claims
`declared, confidence 1`, which is a stronger and falser claim than `derived`.

Nothing branches on it: the only reader of `source` in the repository is `isCaptured`, and
`differenceFrom` takes capture quality as a separate argument precisely so it never infers one
from a colour (F-201).

## Where the type has to be widened

```
color-core/src/provenance.ts   MeasurementSource, and assertProvenance's runtime list
contracts/src/color.ts         measurementSourceSchema, untrackedProvenanceSchema
contracts/src/color.test.ts    the ADR-0036 pin — per member, plus the member COUNT
.harness/verification/claims.json  provenanceLanguage.table gains a `derived` row
docs/adr/0100-…                amends ADR-0005
```

`claims.json` is unenforced today (`"enforced": false`, activates with F-040) and the table is
still a call site: a union member with no row is a source whose permitted language nobody has
decided. `derived` **may** say computed/generated; it **never** says measured, detected or
sampled — nothing observed it.

## The store is reviewed and deliberately NOT migrated

`saved_color.source` is `TEXT NOT NULL CHECK (source IN ('declared','reference','calibrated',
'estimated','unknown'))`. It does not list `derived`, and it will not:

- **No path can write one.** `saveColor` has no callers in the app; the two writers are the
  wardrobe (`estimated`) and the corpus (`reference`). A migration for a value nothing produces
  is speculative work against a table that holds user data, and SQLite cannot alter a `CHECK`
  without rebuilding the table.
- The CHECK already admits `unknown`, which is **not** in the union — so the two sets already
  disagree, and the read path already handles it by name.

What makes this deliberate rather than forgotten: **a test pins the disagreement**, discovering
the allowed set from the exported `MIGRATIONS` SQL rather than restating it
[[a-proof-that-names-a-file-rots-when-the-file-is-not-the-only-one]]. It asserts every source
the store accepts, names `derived` as the one the union has and the column does not, and says in
its message that the day a screen saves a computed colour, the migration is the work — so that
arrives as a named test rather than a runtime constraint error.

## Test plan

- **The union gained one member and only one** — asserted by count in the contracts pin, which
  is what caught the discriminated-union hole before.
- **A derived provenance cannot carry conditions** — `assertProvenance` refuses, and the type
  refuses at compile time. Watched refusing.
- **`displayFromOklch` reports `derived`**, and `UNSAFE_HEX_PROVENANCE` still reports
  `declared` — the decoy that stops this being a global find-and-replace.
- **The wardrobe still writes `estimated` with its four conditions** — criterion 4, asserted
  rather than assumed.
- **The store CHECK set**, discovered from `MIGRATIONS` and compared against the union.
- **`claims.json` has a row for every member of the union** — a new source with no language
  decision fails.

## Verification

`state · typecheck · lint · test · color-golden · content`, plus `format` and `build`.

## Risks

- **`derived` is a wider word than it looks.** Every colour in a colour engine is derived from
  something; the line drawn here is *derived from another colour by this engine*, as against
  *observed* (`calibrated`, `estimated`), *published* (`reference`) and *asserted by a person*
  (`declared`). The ADR must say that, or the next author files a capture under it.
- **A widened union is a widened wire.** `measurementSourceSchema` accepting `derived` means a
  payload can carry it; that is the intent, and the untracked/captured split still refuses a
  derived value that claims conditions.

## Out of scope

The store migration, per the review above. Enforcing `provenanceLanguage` — that is F-040's
activation and unchanged here.
