# Plan: F-133 — Emptiness is a length, and `toEqual([])` does not measure one

| | |
|---|---|
| **Feature** | F-133 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` (`scripts/`) and every test suite |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-03 |

---

> **This plan was written after the code, and the `state` gate is what noticed.** Golden rule 3
> says a plan exists before any source is edited; I claimed F-133 and went straight to the
> conversion. Recorded here rather than backdated, because the same slip happened in F-112 and a
> plan that pretends to predate its feature is worth less than one that admits it does not.
>
> What follows is what was built. The decisions in it were made while building, which is exactly
> the thing the rule exists to prevent, and the honest label for that is *description*.

## Intent

`expect([undefined]).toEqual([])` **passes.** `toEqual` ignores `undefined`, and that extends to
array elements and to the length difference they create.

F-129 found it the expensive way: its export screen recorded what it handed a sink and asserted
`toEqual([])` for *"nothing was written"*. A mutation removed a `return` after a format refuses,
the screen handed the sink an `undefined` file, and **the assertion stayed green**. TypeScript
would have caught the use-before-assignment; jest runs through babel, which strips the types.

Eighty-five other call sites were left, and the feature was filed to survey them.

## The decision that changed the shape: ban rather than survey

Criterion 2 offered a choice — *a check keeps it that way, **or** the survey is recorded with the
reason each remaining one is sound.*

**The survey is the weaker half and it was declined.** Most sites are sound today: a `filter` or
`map` result cannot contain `undefined`, so the hole cannot open there. But *"most were sound"* is
a fact about today's code, not a rule — and this session has spent several features learning what
an unchecked judgement is worth.

Every one of those assertions says *this collection is empty*, which is a claim about **length**.
There is a matcher that measures one. So:

- **`toEqual([])` is banned outright.** No allowlist, because the banned form is never the better
  choice.
- **`toHaveLength(0)`** where emptiness is the claim; **`toStrictEqual([])`** where the value is.
- Both were **watched rejecting `[undefined]`** in a throwaway case before either was recommended.

## What was built

| # | Step |
|---|---|
| 1 | 89 assertions converted across 34 files; the whole suite re-run |
| 2 | `scripts/verify-empty-assertions.mjs`, wired into `pnpm lint` |
| 3 | The check **parses** rather than matching text — see below |

**The check failed on its own first run**, reporting F-129's comment explaining why
`toHaveLength(0)` is used instead. **Fifth instance in one session of a note reproducing the
defect it describes** — in the feature written to close the fourth. F-132's answer applied
unchanged: a `CallExpression` whose callee is `toEqual` with one empty-array-literal argument. A
comment is not in the syntax tree.

## Files touched

```
scripts/verify-empty-assertions.mjs   — NEW. The check, with 8 proof cases
package.json                          — wired into lint, and a verify: script
34 test files across apps/ and packages/ — 89 assertions converted
```

## Effects

| Link | What this does to it | Guard |
|---|---|---|
| `gate:lint` | One more script in the chain | its own proof cases, run on every invocation |

**No new effect link.** No shared contract moves; the matcher change is behaviour-preserving
wherever the old assertion was already sound, and strictly stronger where it was not.

## Test plan

- **The check's own proof cases, in memory on every run:** the banned form and its negation are
  found; `toHaveLength(0)`, `toStrictEqual([])`, `toEqual(['a'])` and `toEqual({})` are not; **a
  comment naming the banned form is not**, and neither is a string containing it.
- **The walk's decoys:** fewer than 40 test files, or no package test, or no app test, is a
  broken walk rather than a clean repository.
- **Mutation, precondition first:** plant a real offence in a real test file; drop the matcher
  name check; drop the argument shape check; make it find nothing; narrow the walk; and revert it
  to text-matching. Each must go red.
- **Not applicable:** `a11y`, `contrast`, `color-golden`, `cvd`, `perf` — no surface, no engine.
  `e2e` — gate 7, F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm lint
pnpm typecheck && pnpm format:check && pnpm test
node scripts/verify-empty-assertions.mjs
```

## Risks

- **A ban is broader than the defect.** Most converted sites were never at risk, and the change
  to them is cosmetic. That is the cost of a rule over a judgement, and it is paid once.
- **The check is a source scan.** An emptiness claim written another way — a length compared by
  hand, a custom matcher, the call assembled from parts — is invisible. Printed on every run
  rather than assumed away.

## Out of scope

- **`toEqual({})` and other empty containers.** The hole demonstrated is the array one. A rule
  covering shapes nobody has watched fail would be a guess wearing a check.
