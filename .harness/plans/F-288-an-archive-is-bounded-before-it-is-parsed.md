# Plan: F-288 — An archive is bounded before it is parsed

| | |
|---|---|
| **Feature** | F-288 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-58, NFR-14 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/store` |
| **Author** | implementing session |
| **Date** | 2026-09-22 |

---

## Intent

The threat model's boundary-③ table says *"Import bomb — a huge or deeply nested file | Hard limits
on bytes and record count before parsing | test"*. **There is no such limit.** `F-286`'s review
found it, `F-286` marked the row honestly as `none yet`, and this builds the control the row was
describing all along.

It matters more since `F-286`: the import path now base64-decodes every image payload into memory,
so an archive is the largest untrusted input this product accepts.

## Approach

**The bound has to act on the string, and today nothing does.** `parseArchive` takes `unknown` — by
the time it runs, `JSON.parse` has already allocated whatever the file asked for, and a
`RangeError` from a deeply nested one is not an `ArchiveError`. `serialiseArchive` writes the
string and has no counterpart.

**New.** `deserialiseArchive(text, limits?)` beside `serialiseArchive`, which is the missing half:

1. **Bytes, before `JSON.parse`.** The only place a size limit can do anything.
2. **Depth, before `JSON.parse`** — a linear bracket scan. An archive is six levels deep; a file
   that is four hundred is not one, and `JSON.parse` answers it with a stack overflow.
   (Five, not six — see *What the review changed*.)
3. `JSON.parse`, then **rows**, before any insert.

`importArchive` gains the row bound too, because it takes `unknown` and can be called directly.

**Reused.** `ImageLimits`'s shape and its reasoning: a declared record with a default, passable per
call, so a limit is a value a reader can find rather than a number in a condition.

### The numbers, and the arithmetic behind them

A cap that refuses a legitimate backup is worse than no cap, so these are derived rather than
picked:

- **`maxBytes: 256 MiB`.** A photograph arrives through the picker at `quality: 0.8` — one to three
  megabytes — and base64 costs 4/3. So 256 MiB is roughly **a hundred garments with photographs**,
  and `DEFAULT_IMAGE_LIMITS.maxBytes` (12 MiB) bounds the worst single one. A phone cannot hold a
  string much past this anyway, which is the honest reason the number is not larger.
- **`maxRows: 200_000`.** A wardrobe of five hundred garments with their seasons, colours and
  preferences is a few thousand rows; this is two orders of magnitude above a real archive and
  still bounds the insert loop.
- **`maxDepth: 32`.** The archive's own shape is six. *(Five — see below.)*

Each is stated with that arithmetic where it is declared, because a limit whose derivation nobody
wrote down is one nobody can raise safely.

### Increments

1. **Record**: the claim, this plan.
2. **The bound**: `DEFAULT_ARCHIVE_LIMITS`, `deserialiseArchive`, the row check in `importArchive`, tests.
3. **The record**: the threat model's row names its guard; the effect link.

## Mockup fidelity

Not applicable. Nothing here is a surface.

## Files to touch

```
packages/store/src/backup.ts      deserialiseArchive, DEFAULT_ARCHIVE_LIMITS
packages/store/src/archive.ts     the row bound in importArchive
packages/store/src/index.ts       exports
packages/store/test/archive-limits.test.ts (new)
docs/architecture/security/threat-model.md   the row names its guard
.harness/state/*, .harness/memory/effects/*
```

## Anticipated effects

1. **A new door into the archive** → anything that reads a backup file. Nothing does yet
   (`backup.ts` is reached by no app surface), which is why now is the time. Guard: the tests, and
   `serialiseArchive`/`deserialiseArchive` asserted as a round trip so the two cannot drift.
2. **A refusal a legitimate archive could hit** → a person with a very large wardrobe. Guard: the
   limits are arguments with declared defaults, and a test asserts a realistic archive is nowhere
   near them — a cap nobody has measured against real data is a cap that fires on the wrong file.
3. **The threat model's row changes from `none yet`** → the document's own rule that every control
   maps to a test or a gate. Guard: the row names the test.

## Test plan

- **Each bound refuses, by name**: a string past `maxBytes`; a nesting past `maxDepth`; an archive
  past `maxRows` — each an `ArchiveError` whose message names the limit and the actual value.
- **Each bound is watched NOT firing on a realistic archive**: a database with garments, colours and
  a photograph serialises well inside all three, asserted with the actual numbers rather than a
  "does not throw" — because a limit that fires on real data is the failure this must not have.
- **The depth scan is not fooled by a string**: `{"a":"[[[[["}` is depth 1, and the scan must count
  brackets outside strings, with escapes handled. Planted both ways.
- **The round trip still holds**: `deserialiseArchive(serialiseArchive(a))` equals `a`, including an
  image, so the new door and the old one agree.
- **`importArchive` refuses too much data even when handed a parsed object**, since it takes
  `unknown` and the string bound cannot help it.
- **Gates**: state, typecheck, lint, format, test, security.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm security
```

## What the review changed

The numbers and their names, mostly. `maxBytes` counted UTF-16 code units and the message said
"bytes", so it is `maxChars` now with the arithmetic restated; the two limits were sized against
two different wardrobes, so they are sized against one and the row cap is described as what it is
— a backstop against a row-count bomb inside a small file, not a second limit on how much a person
may own. The archive is **five** levels deep, not six. And the export side is unbounded, which is
`F-290`: a reader's limit with no writer's limit is a product that can make a file it cannot open.

## Risks and open questions

- **No open question blocks this.**
- **The numbers are judgement, and they are stated as judgement.** 256 MiB is derived from the
  picker's quality setting and base64's overhead, not measured against a real large wardrobe —
  nobody here has one. The arithmetic is written down so raising it is a decision rather than an
  edit.
- **A depth scan is a second parser**, which is the shape this repository distrusts. It is kept to
  one loop over one string, counts only brackets outside strings, and is planted both ways —
  because the alternative is letting `JSON.parse` answer a hostile file with a stack overflow.

## Out of scope

Any export or import surface. Streaming or chunked parsing — a phone holds the file in memory
either way, and the bound is what makes that safe rather than an architecture change.
