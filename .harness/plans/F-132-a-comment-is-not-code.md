# Plan: F-132 — Two scans still read a comment as code

| | |
|---|---|
| **Feature** | F-132 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` (`scripts/`) |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-03 |

---

## Intent

Two more scans decide what a file *does* by matching its text, and both fired on **prose written
to explain the very thing they were checking**:

- **`verify-state.mjs`'s link finder** read a code span describing a call — the kind with square
  brackets and parentheses next to each other — as a markdown link whose target was an ellipsis.
  Gate 0 went red on F-127's own progress entry.
- **`verify-cache-scope.mjs`'s `join(…)` matcher** read a path-building call written **inside a
  comment** as a read. F-130's note explaining why a directory had to be derived from a file was
  the thing that failed.

Both times the fix was to reword. **Four instances, three scans, one session.**

## What F-127 got half-right, and that is the lesson

F-127 taught `verify-cache-scope.mjs` to tell a reference from a mention — **for the bare path
literal**. Its sibling matcher, the one that reads `join(BASE, '..', …)`, was left as a regular
expression over the file's text, comments included.

> A matcher narrowed in one of its two branches leaves the defect exactly where it was, and the
> passing half makes it look addressed.

That is why criterion 3 names fixtures in both directions for **both** checks rather than for the
one being changed.

## Approach

### `verify-cache-scope.mjs` — the `join` matcher joins the parse

The file already parses with the TypeScript compiler for the literal matcher (F-127). The `join`
matcher moves onto the same tree: a `CallExpression` whose callee is named `join` or `resolve`,
whose arguments are string literals and one identifier. **A comment is not in the syntax tree at
all**, so the whole class disappears rather than being narrowed.

The base-resolution logic (`baseOf`) is unchanged — it already works on strings and it is what
the six existing proof cases exercise.

### `verify-state.mjs` — code spans are removed before links are found

Markdown, not TypeScript, so there is no tree. **Fenced blocks and inline code spans are stripped
before the link pattern runs**, which is exactly what a markdown renderer does — a link inside
backticks is not a link, by the format's own rules.

Stripping is a **replacement with spaces of equal length**, not a deletion: line and column
offsets stay correct, so a real broken link is still reported at its own position.

**Order matters.** Fenced blocks first (they can contain backticks), then inline spans
longest-delimiter-first (` ``code`` ` before `` `code` ``), which is the CommonMark rule.

## Increments

| # | Step | Verified by |
|---|---|---|
| 1 | `stripCode` in `verify-state.mjs`, and its proof cases | `state` |
| 2 | the `join` matcher onto the AST in `verify-cache-scope.mjs` | `lint`, its `--prove` harness |
| 3 | Restore the two sentences that were reworded to appease them | `state`, `lint` |

**Increment 3 is the acceptance test**, exactly as it was in F-127: if either sentence still has
to be written around the check, the check is still wrong.

## Files to touch

```
scripts/verify-state.mjs                       — stripCode, and proof cases for it
scripts/verify-cache-scope.mjs                 — the join matcher onto the tree, and two cases
.harness/state/progress.md                     — F-127's sentence, restored
packages/recommendation/test/weights.test.ts   — F-130's note, restored
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-025** the cache-key link | Its guard is `verify-cache-scope.mjs`; the matcher changes, the meaning does not | its own `--prove` harness, now with two more cases |
| `gate:state` | The link finder is one of gate 0's 18 checks | its new proof cases, run on every invocation |

**No new effect link.**

## Test plan

- **`stripCode`, in memory on every run** — a link inside an inline span is not found; inside a
  fenced block is not found; **a real link on the same line as a code span still is**; a link in
  ordinary prose still is; and stripping preserves length, asserted directly.
- **The `join` matcher** — its six existing cases must pass unchanged, plus:
  - **ACCEPT**: a path-building call written in a `//` comment, and in a `/* */` comment.
  - **REJECT**: the same call in code, which the existing cases already cover and which must not
    regress.
- **Mutation, precondition first:** make `stripCode` return its input; make it strip everything;
  drop the comment-skipping from the `join` matcher. Each must go red.
- **Not applicable:** `test`, `a11y`, `contrast`, `color-golden`, `cvd`. `e2e` — gate 7, F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm lint
node scripts/verify-cache-scope.mjs --prove
pnpm typecheck && pnpm format:check && pnpm test
```

## Risks and open questions

- **No `OQ-*`.**
- **Stripping code spans could hide a real broken link** that somebody wrote inside backticks
  meaning it to be checked. That is the correct behaviour — a link in a code span is not a link —
  but it is a real reduction in what gate 0 sees, and the ACCEPT/REJECT pair is what keeps it
  honest.
- **A markdown stripper is an approximation.** Nested and unbalanced backticks exist. The cases
  cover the shapes this repository actually writes, and the limit will be printed rather than
  assumed away.

## Out of scope

- **Any other text-matching scan.** Three have now been named across F-127 and this feature; a
  sweep of the rest is separate work. If a fourth is found, it is filed, not absorbed.
