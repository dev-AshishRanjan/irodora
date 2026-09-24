# A second read of checked state skips the check

**E-143** · from `scripts/verify-state.mjs#featureList` · guard `gate:state`, proven by
`verify-state-id-proof.mjs` cases 4 and 6 and `verify-mockups.mjs --prove`'s override case,
**with a stated limit**

## What depends on what

Gate 0 reads `feature_list.json` through its schema check:

```js
const featureList = checkSchema('feature_list', …schema, featuresPath);
```

That one value does two jobs every section that needs a valid list relies on:

- **It is `null` when the list fails its schema.** Every such section is inside
  `if (featureList)`. A broken list is reported once, by the schema check, and everything
  downstream skips it rather than tripping over it.
- **It is read from `featuresPath`, so it honours `--features`** (F-137). That override points
  gate 0 at a mutated list in a temp directory, so a proof can drive the real gate without
  planting into the tree.

A section that parses the committed file again gets neither.

**One section reads the raw file on purpose:** 4b, the id-uniqueness table. It has to report a
space it cannot find (*"so its ids are unchecked"*) even when the schema has already failed, and
by then `featureList` is null and cannot tell it anything. It is guarded for exactly that. What it
must not do is read a different file from the one gate 0 was pointed at.

## What broke

F-218 added section 9b (golden rule 14: a UI feature names its mockups), and it did this:

```js
const listText = readText(join(HARNESS, 'state/feature_list.json'));
for (const f of JSON.parse(listText).features) {
```

- **The crash.** `verify-state-id-proof.mjs` case 4 renames `features` to `featureList` and
  expects section 4b's *"so its ids are unchecked"*. 9b threw
  `JSON.parse.features is not iterable`, and **an uncaught throw takes every finding with it**,
  including the schema finding that named the real fault. The exit code stayed non-zero, so this
  was not a pass. But the report was a stack trace about 9b rather than the fault, and the proof
  that exists to tell those apart went red. The defect was on `main` from 2026-09-14. CI first
  ran it on the next push, 2026-09-21, and has been red at step 8 on both pushes since, with 33
  steps skipped behind it (F-291).
- **The silent half, in two sections.** 9b read the committed path, not the override. So did 4b,
  from before F-218: its table resolved every space under `.harness/`. Pointing gate 0 at a list
  with an R9 `mobile` feature stripped of `mockups`, or with a duplicate feature id, gave
  **`Gate 0 passed`**, because those two sections were checking the committed file instead. The
  review found 4b's half. Nothing reported either one.

## The fix, and why it is not a guard

9b reads `featureList` inside the same `if (featureList)` as the other sections, and its second
parse is gone. 4b's table entry for the feature list carries `at: featuresPath`, so it reads the
raw file gate 0 was pointed at.

Wrapping 9b's parse in `Array.isArray` was the other option, and it is worse. It keeps two copies
of the list in one gate and fixes only the half that made noise. The override would still miss
9b.

## How to check, when adding a section

- It reads `featureList` (or `effects`). **Never `readText`/`readFileSync` on a file `checkSchema`
  already read.** If it must read raw, it reads `featuresPath`.
  `grep -n "feature_list.json" scripts/verify-state.mjs` should find only the default
  `featuresPath` is built from, the ID_SPACES entry and prose.
- Run `pnpm verify:ci`, which runs every CI step. The proofs below are not part of any gate's
  command, so running the gates does not run them. That is how F-218 shipped with case 4 red.

## The guard, and where it stops

Each of these was watched failing against the gate before F-291:

- `verify-state-id-proof.mjs` **case 4**: a renamed array must be reported, not crash the gate.
- `verify-state-id-proof.mjs` **case 6**: a duplicate id in the list `--features` names must be
  found, so 4b cannot read the committed file.
- `verify-mockups.mjs --prove`, **the override case**: a UI feature with no mockups in the list
  `--features` names must be rejected, so 9b cannot either.

`verify-blocked-reason-proof.mjs` also drives gate 0 through `--features`, but it passed 12/12
against the pre-fix gate, so it is not a guard for this.

**What none of them sees is a NEW section that re-reads the file.** It is caught only if it
crashes on case 4's plant, or if some proof happens to drive it through the override. One written
with `?? []` would do neither. The grep above is the check for that, and it is a habit, not a
gate.

Related: [[a-gate-that-errors-is-failing-open]] ·
[[a-table-driven-check-is-only-as-complete-as-its-table]] ·
[[an-always-gate-nobody-runs-is-red-without-anyone-knowing]]
