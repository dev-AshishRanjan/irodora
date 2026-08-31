# Plan: F-108 — A captured wardrobe colour is stored without the conditions its source requires

| | |
|---|---|
| **Feature** | F-108 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-56, NFR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` · `@irodora/store` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |

---

## Intent

A colour captured with the Lens and saved to the wardrobe can be read back out as a `Color`,
with the provenance ADR-0005 requires — because right now it cannot be read back at all, and
F-045 is blocked on that.

## The defect, stated exactly

`colourFromReading` (F-042) writes `source: 'estimated'` onto a `saved_color` row. The row
carries `source` and `confidence` and nothing else about the capture.

But `'estimated'` is a **`CapturedSource`**, and ADR-0005's union makes `conditions` **required**
for those — `illuminant`, `quality`, `sampleCount`, `variance`. There is therefore no honest
provenance to hand `fromXyz`, and **inventing the four values would be fabricating measurement
facts**, which is the single thing this codebase exists to prevent.

The `LensReading` had all four. F-042 simply did not persist them:

| `LensReading` | `CaptureConditions` |
|---|---|
| `illumination` | `illuminant` |
| `quality` | `quality` |
| `usableSamples` | `sampleCount` |
| `variance` | `variance` |

**Why F-042's tests were green.** They wrote rows and asserted columns. Nothing ever read a
colour back out *as a `Color`*, and a column holding the string `'estimated'` looks correct
until something asks the type for a provenance. Same shape as
[`a-tested-module-nobody-wired-up-passes-every-test-it-has`](../memory/lessons/a-tested-module-nobody-wired-up-passes-every-test-it-has.md):
the write path was covered end to end and the read path did not exist yet.

## Approach

**Migration 5, forward-only.** Four columns on `saved_color`, **nullable with no `DEFAULT`** —
the convention migration 2 set, and for its reason: a default here would be a measurement
nobody took, wearing the shape of one somebody did.

```
capture_illuminant  TEXT      CHECK-less (ALTER TABLE cannot carry one; the reader enforces)
capture_quality     TEXT
capture_samples     INTEGER
capture_variance    REAL
```

**A new type in the store, not a leak of the engine's.** `packages/store` has no runtime
dependency on `@irodora/color-core` and will not gain one for this — the columns are the four
scalars, and the *assembly* into a `CapturedProvenance` happens in the app, which already
imports both. What the store owns is that the four move together.

**The read path refuses, by name.** A row with `source: 'estimated'` and no conditions was
written before this migration. It is refused with a message naming the row and the columns —
never reconstructed with substituted values, and never silently downgraded to `'reference'`,
which would be worse: it would relabel a camera estimate as a published value.

**All four or none.** `source: 'estimated'` with three of four columns present is a row nobody
should be able to write, so the write takes them as one object and the read checks all four.

**Increments:**

1. Migration 5 and the row/type changes; the conformance suite covers the new columns.
2. `colourFromReading` writes them; the read path assembles or refuses.
3. F-045's `pieceColor` becomes possible — asserted here as the round-trip, so the fix is
   proven by the thing that needed it rather than by its own shape.

## Files to touch

```
packages/store/src/schema.ts          — migration 5, SCHEMA_VERSION 5
packages/store/src/repository.ts      — SavedColorRow columns, NewSavedColor, CaptureConditions
packages/store/src/createRepository.ts— write and read the four
packages/store/src/index.ts           — export the type
apps/mobile/src/wardrobe.ts           — colourFromReading writes the conditions
apps/mobile/src/…                     — the assembly into a CapturedProvenance
packages/store/test/*.test.ts         — the round trip, and the refusal
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| Migration 5 | **E-023**: `createRepository`, `archive.ts` (`SELECT *`), the conformance suite, `apps/mobile/src/store`, `data-model.md` | `gate:test` — the link names every one of them, and it named `apps/mobile/src/store` correctly last time |
| `NewSavedColor` gains fields | every writer — `savePalette`, `createGarment`, the app's colour paths | `gate:typecheck` — a required field breaks every call site, which is the point |
| The archive format | the canonical digest | E-023 again; the archive test asserts the new columns travel |

**No new link is expected.** E-023 already governs "a migration reaches further than the tables
it names", and this is an instance of it, not a new dependency — the same judgement F-042 made
about the archive.

## Test plan

- **The round trip, which is the whole feature:** a reading → `colourFromReading` → stored →
  read back → `fromXyz` with a `CapturedProvenance` that type-checks. It could not be written
  before this change, which is the strongest form of "watched failing".
- **Refusal, by name:** a row with `source: 'estimated'` and null conditions throws a
  `StoreError` naming the row and the columns. **Planted by writing the row directly**, because
  the writer can no longer produce one.
- **Never downgraded:** the refusal is asserted to *throw*, not to return a `'reference'`
  colour. That decoy matters — relabelling an estimate as a published value is the failure this
  feature exists to prevent, and it would make every other assertion here pass.
- **A reference colour still needs nothing:** a corpus-sourced row round-trips with the four
  columns null, and is not refused. Without this the fix would break the working path.
- **All four or none:** three of four present is refused.
- **Conformance:** both drivers.

## Verification

Commands read from [`gates.json`](../verification/gates.json), not typed from memory.

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm security
```

Not applicable: `color-golden` (no engine maths), `cvd`, `content`, `contrast`, `a11y`, `perf`,
`artifact`. `e2e` remains pending on F-091.

## Risks and open questions

- **Every existing `NewSavedColor` call site changes** if the field is required. It is
  deliberately *optional at the type level* and *conditionally required at the write*: a
  `reference` colour has no conditions and must not be forced to invent an empty object.
- No `OQ-*` bears on this.

## Out of scope

- `device` on `CaptureConditions` — optional in the type, and the reference device matrix is
  F-063's. Recording a device id nobody calibrated would be a fact with no meaning.
- Backfilling existing rows. There are none — nothing has shipped — and a backfill would be
  exactly the substitution this feature refuses.
- F-045 itself, which resumes after this.
