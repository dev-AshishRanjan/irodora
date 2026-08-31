# Plan: F-106 — feature_list.json and gates.json have the same unchecked primary key effects.json had

| | |
|---|---|
| **Feature** | F-106 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` — the harness state and gate 0 |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |

---

## Intent

F-102 fixed one id space and, in tracing its effects, found the same hole in two more: a
second feature numbered `F-102` and two gates sharing an id both left gate 0 **green**. This
closes them, and — because "and now the third file" is the obvious next failure — replaces the
one-off check with a **table of every id space in `.harness/`**.

"Done" to a reader: no `.harness/` data file can carry two entries under one id without gate 0
saying so, and the ones that are deliberately not keyed that way are named with the reason
rather than silently omitted.

## Approach

### Why this is worse than the defect it follows

An effect id is a **citation target**: a collision makes a reference ambiguous. A feature id is
a **control-flow input** — `blockedBy` resolves by id and `next-feature` selects the lowest
eligible id — so two features numbered `F-102` make *"every blocker is done"* a question with
two answers, and gate 0 reports whichever it reaches first. A gate id is the same: `gates.json`
resolves `activatesWith`, `requiredFor`, the CI mirror, and every feature's `verification`
list by it.

### Table-driven, because the one-off is what produced this feature

F-102's check was written for `effects.json` alone, and within the hour the same hole was found
twice more. Writing two more one-offs would schedule F-107. So gate 0 gets **one check over a
declared table**, and F-102's effects check folds into it:

| file | array | key | detail in the message |
|---|---|---|---|
| `state/feature_list.json` | `features` | `id` | `title` |
| `state/effects.json` | `links` | `id` | `from.ref` |
| `verification/gates.json` | `gates` | `id` | `command` |
| `verification/claims.json` | `banned` | `id` | `pattern` |
| `verification/discharged-claims.json` | `claims` | `name` | `pattern` |
| `verification/retired-surface.json` | `terms` | `name` | `pattern` |
| `verification/advisories.json` | `accepted` | `id` | `package` |

**The message format does not change** — `<id> is used by two different <plural>: "<a>" and
"<b>"`. That is deliberate: `verify-effect-id-proof.mjs` filters on that sentence, so F-102's
proof must pass **unchanged** through this refactor, which is the strongest available signal
that the fold-in did not break what it absorbed.

**It fails closed.** A declared file that is missing, unparseable, or whose array path is
absent is a **failure**, not a skip — otherwise renaming a file silently disables its check
([`a-gate-that-errors-is-failing-open`](../memory/lessons/a-gate-that-errors-is-failing-open.md)).

### The two that are deliberately not checked — established by experiment, not assumed

Criterion 3 asks for every *other* machine-read id space to be checked or named with its
reason. Both answers below were produced by running something, not by reading:

- **`unreached-tokens.json` → `unreached[]`.** `group` is **not** a key: 10 entries carry 5
  distinct groups, and `verify-token-reach.mjs` builds a `byToken` map from (group, token)
  pairs. A group-uniqueness check would fire on correct data on its first run — the exact
  failure mode F-102 measured when it mutated its own check to key on `from.ref`, and the way
  a real check gets deleted for being noisy.
- **`off-scale-spacing.json` → `exempt[]`.** Compound key (file, property, value), and a
  duplicate is **already caught by a different mechanism**: `verify-spacing-scale.mjs` matches
  with `findIndex`, so a second identical entry matches nothing, and a dead exemption is
  already a failure. Verified — planting a duplicate exempt entry exits 1 with *"is exempt and
  MATCHES NOTHING"*. Adding a second check would be redundant.

Also named rather than checked: `feature_list.json`'s `releases[]` and `statuses[]` are
membership sets where a repeat is inert; a feature's own `requirements[]` is reconciled against
the PRD by the existing traceability check; and the two `state/schemas/*.json` `$id`s are
distinct by construction and looked up by nobody.

**Reused:** gate 0's `fail`/`pass` reporting, its `readJson`, and F-102's message shape and
proof pattern.

**New:** the `ID_SPACES` table and one loop in `verify-state.mjs`; `verify-state-id-proof.mjs`.

**Increments:**

1. Generalise the check to the table, folding in the effects space. **`verify-effect-id-proof.mjs`
   must still pass unchanged** — run it before anything else.
2. Watch a duplicate feature id and a duplicate gate id fail, by planting each and capturing
   the output.
3. Add `verify-state-id-proof.mjs` and its CI step.

## Files to touch

```
scripts/verify-state.mjs              — ID_SPACES and the loop; the effects check folds in
scripts/verify-state-id-proof.mjs     — NEW: proves the feature/gate/claim spaces can fail
.github/workflows/ci.yml              — the proof step, beside the other gate 0 proofs
.harness/state/effects.json           — E-040: a table-driven check is only as good as its table
.harness/memory/effects/<slug>.md     — NEW, paired with E-040
.harness/memory/index.md              — the row
.harness/state/feature_list.json      — F-106 close-out
.harness/state/progress.md            — new entry (append)
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| The effects duplicate check moves into the table | `verify-effect-id-proof.mjs`, E-039 | that proof, run unchanged — this is the point of not changing the message |
| Gate 0 reads four more `.harness/` files | those files' owners | fails closed on missing file or missing array path, proven |
| **A new id space added to any `.harness/` data file** | the table | **partial, and it will be recorded as partial** — the check proves every *declared* space exists and is checked, and cannot see a space nobody declared |
| Gate 0 gains a proof step | `verify-gate-mirror.mjs` | the mirror compares **active gates**, not proofs; re-run after the CI edit |

The third row is the reason this gets its own link (**E-040**) rather than folding into E-039:
E-039 is about the effect graph's key; this is about the completeness of a table, which is a
different failure with a different tell.

## Test plan

- **Negative, with decoys:** the proof plants a duplicate into each declared space and requires
  gate 0 red *naming that id*; it also plants a **missing array path** and a **missing file** to
  prove the check fails closed rather than skipping.
- **Controls that must stay green:** an entry added with a *derived* fresh id (never a literal —
  F-102's control rotted inside one session that way), and a file reformatted without a content
  change.
- **Regression:** `verify-effect-id-proof.mjs` passes unchanged, 4/4.
- **Mutation:** the check neutered, and the check keyed on the detail field instead of the id;
  both must turn the proof red.
- **Golden / conformance / e2e:** not applicable.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-state-id-proof.mjs
node scripts/verify-effect-id-proof.mjs   # must pass UNCHANGED
node scripts/verify-gate-mirror.mjs
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm security
```

Evidence: the red gate 0 output for a planted duplicate feature id and a planted duplicate gate
id, quoted verbatim in `progress.md`.

Not applicable: `color-golden`, `cvd`, `content`, `contrast`, `a11y`, `perf`, `artifact`, `e2e`
— no colour maths, no corpus, no surface, no artefact.

## Risks and open questions

- **The refactor could weaken the check it absorbs.** Mitigated by keeping the message identical
  and requiring F-102's proof to pass with no edit.
- **The proof mutates state files gate 0 reads.** Restore in `finally`, byte-compared, with a
  `git checkout` hint on failure — as F-102's does.
- No `OQ-*` bears on this.

## Out of scope

- Renumbering anything. There are **no duplicates today** in any of these files; this is the
  check, not a cleanup.
- Checking id spaces outside `.harness/` — `content/` slugs are already gate 11's, and ADR
  numbers are already reconciled both ways.
- Making the table self-extending, or moving it into a data file — a table in a data file would
  need its own id space checked, which is the snake eating its tail.
