# Plan: F-110 — Coverage and gap analysis belongs in `@irodora/optimization`

|                       |                                                                       |
| --------------------- | --------------------------------------------------------------------- |
| **Feature**           | F-110 — [`feature_list.json`](../state/feature_list.json)              |
| **Requirements**      | FR-43 — [`docs/PRD.md`](../../docs/PRD.md)                             |
| **Service / package** | `packages` · `@irodora/optimization`                                   |
| **Author**            | Claude Code (generator)                                                |
| **Date**              | 2026-08-31                                                             |
| **Blockers**          | none                                                                   |
| **Blocks**            | F-050 — the capsule optimiser needs `coverage()` from inside its own package |

---

## Intent

F-048 built coverage and gap analysis in `@irodora/recommendation`. Its row said
`@irodora/optimization`. This moves it, and **adds no behaviour at all** — every assertion in
`coverage.test.ts` must still hold, unchanged, at the end.

The reason to do it now rather than later is F-050. The capsule optimiser lives in
`optimization` and is a solver over `coverage()`. Built against today's layout it would import
`recommendation` for the one symbol that should already have been beside it, and F-110 would
then have to rewrite F-050 as well as move a file.

## What makes this more than a `git mv`

`coverage.ts` imports **six things from inside `recommendation`**:

```
NEUTRAL_CHROMA                          ./score.js
OUTFIT_SLOTS, OutfitSlot                ./slots.js
scoreOutfit, OutfitComponent, OutfitPiece   ./outfit-score.js
Candidate                               ./outfit.js
PersonalProfile                         ./profile.js
RuleSet                                 ./rules.js
```

Every one is already exported from `recommendation`'s public index, so they become one
`@irodora/recommendation` import. That is the whole point of the boundary: **a solver consuming
a scoring function is the direction the dependency should run.**

### The direction is the thing to get right

[`ARCHITECTURE.md`](../../docs/architecture/ARCHITECTURE.md) says *"dependency direction is
strictly one-way"* and names `color-spaces`, `color-core`, `recommendation` and `store` — it
**does not name `optimization`**. So this establishes an edge rather than following a documented
one, and the edge is:

```
optimization  →  recommendation        (a solver optimises over a score)
recommendation → optimization          NEVER
```

That is not a cycle, and `lint` fails on cycles, so the guard already exists. The reverse edge
is the one that would be wrong, and nothing needs it.

**No ADR.** This documents no deviation — it moves a file to the package the feature list
already named, in the direction the architecture's own ordering implies. The architecture doc
gains `optimization`'s edge in its dependency sentence, because a rule that goes unstated is
the one somebody reverses.

## Approach

**Moved, unchanged in substance:** `coverage.ts`, `coverage.test.ts`. The test's imports split
in two — coverage symbols from the local index, `outfitWeights` / `parseWeightContent` /
`ruleSetFor` / `Candidate` / `PersonalProfile` / `RuleSet` from `@irodora/recommendation`.

**`@irodora/optimization` gains** `@irodora/corpus` (for `LexiconTerm`) and
`@irodora/recommendation`. It already has `color-core`, `color-difference` and `color-spaces`
from F-049. Workspace links by **`mklink /J`, never `ln -s`** — `ln -s` silently leaves empty
directories here, which cost a cycle in F-049.

**`@irodora/optimization`'s `tsconfig.json` gains `"types": ["node"]`.** The coverage test reads
the published weights off disk with `readFileSync` and `__dirname`. `recommendation` has this;
`optimization` does not, and without it the moved test does not compile.

**`@irodora/recommendation` drops `@irodora/corpus`** — after `coverage.ts` leaves, `LexiconTerm`
is its only importer, and criterion 4 asks for it. To be re-checked against the source rather
than assumed, because a dependency removed while something still needs it is a red build.

**The bench follows the code.** [`tests/bench/src/bench.mjs`](../../tests/bench/src/bench.mjs)
imports `coverage` and `applyChange` from `@irodora/recommendation` in one block with six other
symbols; those two move to `@irodora/optimization` and the rest stay. `tests/bench` gains the
dependency and the link.

## Files to touch

```
packages/optimization/src/coverage.ts        — MOVED from recommendation
packages/optimization/test/coverage.test.ts  — MOVED; imports split
packages/optimization/src/index.ts           — exports the coverage surface
packages/optimization/package.json           — + corpus, + recommendation
packages/optimization/tsconfig.json          — + types: ["node"]
packages/recommendation/src/index.ts         — drops the coverage export block
packages/recommendation/package.json         — − corpus, if truly unused
tests/bench/src/bench.mjs                    — two symbols change origin
tests/bench/package.json                     — + optimization
docs/architecture/ARCHITECTURE.md            — names optimization's dependency edge
pnpm-lock.yaml                               — follows the manifests
```

## Anticipated effects

| Change                                       | Dependents                    | Guard            |
| -------------------------------------------- | ----------------------------- | ---------------- |
| `coverage` moves package                      | `tests/bench`, future F-050   | `gate:typecheck`, `gate:build` |
| A new package edge, `optimization → recommendation` | anything importing either | `gate:lint` (cycles) |
| `recommendation` drops `corpus`               | `recommendation`'s own build  | `gate:build`     |

**No new effect link expected.** Nothing outside the repository's own packages consumes this
yet — the app does not render coverage, which is F-048's own recorded gap. If the effect trace
finds a dependent I have not listed, the link is owed then.

## Test plan

**The tests do not change what they assert.** That is the criterion: a move that alters a test
is not a move. Specifically:

- `coverage.test.ts` moves with **every assertion identical**; only the two import sources
  differ. The diff is reviewed for exactly that and nothing else.
- **The fixture path still resolves.** The test reads
  `content/rules/weights.2026.08.2.json` through `__dirname` and three `..` segments.
  `packages/optimization/test/` sits at the same depth as `packages/recommendation/test/`, so it
  should — and *should* is not *does*, so the run is the check, and a wrong path throws rather
  than passing quietly.
- **The perf budget measures the moved code** (criterion 3). `coverage-apply-change-p95` runs
  through the bench against the new import and stays under its 60 ms ceiling. Its rationale text
  needs no change — the number was measured through this harness over the same fixture, and
  moving a file does not move the number.
- **Nothing is left importing the old path**: `recommendation`'s index no longer exports
  `coverage`, and a stale import is a typecheck failure rather than a silent resolution to
  `dist/`.

## Verification

Commands from [`gates.json`](../verification/gates.json), run **one at a time**.

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm bench
```

`perf` **is** applicable here and was not for F-049 — the budget exists and must still measure
the code after it moves.

Not applicable: `color-golden`, `cvd`, `contrast`, `a11y`, `content`, `security`, `artifact`,
`e2e`. **No colour maths is added, changed or moved between spaces** — `coverage.ts` arrives
byte-identical apart from its import block.

## Risks and open questions

- **The stale `dist/`.** `packages/recommendation/dist/index.d.ts` still declares the coverage
  exports. A build refreshes it, but until then a bare-specifier import could resolve against
  the old surface and typecheck against a lie. The build gate runs after the move for exactly
  this reason, and `verify-app-imports.mjs` already records that it does not judge bare
  specifiers because they resolve through `dist/`.
- **Dropping `corpus` from `recommendation` is the one step that can break something the move
  did not touch.** Verified by grep against source before the edit and by `build` after it. If
  anything still needs it, the dependency stays and criterion 4 is met by saying so.
- **`verify-cache-scope.mjs` tracks test reads past a package boundary.** The coverage test
  reads `content/` from a new package, so turbo's cache key for `optimization:test` may need the
  same global dependency `recommendation:test` already has. The gate fails closed on an
  unresolvable ascent, so it will say.
- No `OQ-*` bears on this.

## Out of scope

- **Any change to what coverage computes.** The threshold, the gap vocabulary, the neutral-chroma
  restriction and the incremental path are F-048's decisions and are not reopened.
- **The surface.** Still nothing renders coverage; still `service: packages` with no `a11y` in
  the verification list. That gap is F-048's and is not closed by moving the file.
- **F-050.** Unblocked by this, not started in it.
