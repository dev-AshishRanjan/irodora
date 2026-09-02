# Plan: F-127 — Two static scans read a string literal as a reference

| | |
|---|---|
| **Feature** | F-127 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` (`scripts/`) |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-02 |

---

## Intent

Two gate scripts decide **what a file does** by matching text in it:

- `verify-unsafe-call-sites.mjs` uses `source.includes('unsafeFromHex')`, so a **doc comment
  saying the function is not called** was reported as an unreviewed call site (found by F-055).
- `verify-cache-scope.mjs` matches any escaping `'../…'` literal, so a test asserting
  `slugify('../../etc/passwd')` **cannot** produce a traversal was reported as reading
  `packages/etc/passwd` (found by F-056).

Both times the fix was to **reword the source** so the literal disappeared. Both times the thing
deleted was the explanation. Done: each check distinguishes a **reference** from a **mention**,
and each carries decoys it must accept and must reject.

## Why the cost is worse than a false positive

The unsafe-call-site census exists because *"every call site is reviewed"* is a sentence about
people, and a sentence about people is not a check. **A check that cannot tell a call from a
sentence teaches people to stop writing the sentences** — and the sentence it suppressed said
which boundary was being preserved and why. The wrong fix was available both times and was
declined: adding the file to `REVIEWED` would have declared a call site that does not exist, and
pre-approved a real one at that path.

## Approach

**The TypeScript compiler API, as F-116 established.** `typescript` is already a devDependency
and resolves from `scripts/`. A regex can find `unsafeFromHex` and it can find `'../..'`; it
cannot tell a call from a property access, an identifier from a string, or an argument from a
binding — and each of those is the difference between a reference and a mention.

### `verify-unsafe-call-sites.mjs`

A file is a call site when the AST contains **either**:

| | |
|---|---|
| an **import** naming `unsafeFromHex` | `import { unsafeFromHex } from …` — including a rename |
| a **call** of it | `unsafeFromHex(…)` or `x.unsafeFromHex(…)` |

A comment, a string literal and a mention in prose are none of those. **Failing closed stays
right and is not what changes:** an unparseable file is reported, not skipped.

### `verify-cache-scope.mjs`

The escaping-literal matcher keeps its meaning with **one exclusion**: a path literal that is an
**argument to a call whose callee is not a path or filesystem function** is a mention, not a
read. `join`, `resolve`, `readFileSync`, `readdirSync` and friends are references;
`slugify('../../etc/passwd')` is data.

**The existing proof case `const P = '../../ops/x.json'` must still be caught** — a literal bound
to a variable is ambiguous and stays conservative. Only the call-argument case narrows.

**Reused:**

| Piece | Where |
|---|---|
| the compiler-API walk and its "unresolvable" honesty | `scripts/verify-worklet-reach.mjs` (F-116) |
| the plant-and-rerun proof harness | `scripts/verify-cache-scope.mjs`'s own `CASES` |
| the accept/reject decoy discipline | `scripts/verify-guards.mjs` |

**Increments:**

| # | Step | Verified by |
|---|---|---|
| 1 | `verify-unsafe-call-sites.mjs` on the AST, with its own proof cases | `lint` |
| 2 | `verify-cache-scope.mjs`'s call-argument exclusion, with new proof cases | `lint` |
| 3 | Restore the two sentences that were reworded to appease the scans | `lint` |

## Files to touch

```
scripts/verify-unsafe-call-sites.mjs   — AST, and a proof harness it did not have
scripts/verify-cache-scope.mjs         — the call-argument exclusion, and two more cases
apps/mobile/src/measure.ts             — the comment that named the function, restored
packages/export/test/export.test.ts    — the fixture assembled from parts, restored
```

## Increment 3 is the acceptance test that matters

Criterion 1 and 2 are about what the scripts report. **The proof is putting the two suppressed
literals back** and watching both gates stay green. If either sentence still has to be written
around the check, the check is still wrong and this feature has not landed.

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| `gate:lint` | Both scripts run inside `pnpm lint`; a narrowed matcher that stops matching is the risk | **their own proof harnesses**, each with accept and reject cases |
| **E-049 / ADR-0005's census** | The census's *meaning* is unchanged — it still enumerates call sites. What changes is what counts as one | the census's own proof cases, new in this feature |

**No new effect link.** No shared contract moves.

## Test plan

- **`verify-unsafe-call-sites.mjs` gains a proof harness it never had.** Plant files and require
  each verdict:
  - **REJECT** (a call site): a direct call; a call through a namespace; an import that renames.
  - **ACCEPT** (not a call site): the identifier in a **line comment**; in a **block comment**;
    in a **string literal**; a *different* identifier that contains it as a substring
    (`notUnsafeFromHexReally`).
  - The walk's existing self-checks stay: it must reach `color.ts`, scan > 50 files, and never
    enter `node_modules`.
- **`verify-cache-scope.mjs` gains two cases** beside its six:
  - **ACCEPT**: `expect(slugify('../../etc/passwd')).toBe(…)` — the real F-056 shape.
  - **REJECT**: `readFileSync('../../ops/x.json')` — an argument to a read, which must still fire.
  - The six existing cases must all still pass, unchanged.
- **Mutation, run against unmutated source first:** break each new matcher and require the proof
  harness to go red. The harness itself asserts a PASS on clean source before mutating
  [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]].
- **Not applicable:** `test`, `a11y`, `contrast`, `color-golden`, `cvd` — no product code changes
  except two restored comments. `e2e` — gate 7, F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm lint
node scripts/verify-unsafe-call-sites.mjs
node scripts/verify-cache-scope.mjs
pnpm typecheck && pnpm format:check && pnpm test
```

## Risks and open questions

- **No `OQ-*`.**
- **A narrowed matcher can stop matching.** That is the whole risk of this feature and the
  reason criterion 3 names decoys in both directions. A check that accepts everything is worse
  than the false positive it replaced, because nobody will ever see it fail.
- **The AST cannot follow everything either.** A call through a variable, a dynamic property, or
  a callback is invisible — the same limit F-116 printed on every run. It will be stated in the
  output rather than left to be assumed away.

## Out of scope

- **Any other text-matching gate.** Two are named in this feature's criteria; a sweep of the
  rest is a separate piece of work and would be scope nobody reviewed.
- **Widening the census.** `REVIEWED` stays empty, because nothing calls `unsafeFromHex`.
