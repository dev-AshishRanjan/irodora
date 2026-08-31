# Plan: F-046 — Preference feedback loop

| | |
|---|---|
| **Feature** | F-046 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-37 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` · `@irodora/store` + `@irodora/recommendation` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |
| **Blockers** | F-031 (done) |

---

## Intent

Picking the same kind of pairing repeatedly should make the recommender offer it more readily —
by a rule anyone can read, from numbers anyone can see, on this device only.

"Done" to a user: they keep choosing rust with charcoal, the recommender starts putting rust
nearer the top for charcoal, and they can look at exactly why and delete it.

## The three decisions this turns on

### 1. Families, not individual colours — otherwise nothing ever learns

FR-37 says *"repeated selection of a pairing"*. If a pairing is two **individual colours**, the
space is 120 × 120 and a person would have to pick the same two published entries repeatedly
for anything to move. That never happens in a real wardrobe, so the loop would be correct and
inert.

The corpus carries a `taxonomy.family` — **25 families over 120 entries**, counted rather than
assumed. A pairing is an unordered pair of families, which is 325 distinct cells and
generalises across a wardrobe: choosing *this* rust with *that* charcoal informs the next rust
and the next charcoal.

**Unordered, canonically sorted.** `(rust, charcoal)` and `(charcoal, rust)` are one row, or
the same preference would be learned twice and half of it would never be found.

### 2. Store the COUNTS, derive the weight — never store the weight

This is the decision the rest depends on.

A running float — "nudge the weight by 0.02 each time" — makes the stored value depend on the
**order** of the updates and on the **history of the update function**. Change the step later
and every stored weight silently means something else, with nothing to detect it.

So the table stores `accepted` and `rejected` **counts**, which are facts about what the person
did, and `preferenceWeight(accepted, rejected)` is a pure function in the engine. Three things
follow for free:

- *"Deterministic"* is true by construction, not by discipline.
- *"Inspectable"* is real: the counts are the evidence and the weight is reproducible from them.
- The formula can be corrected in a later release **without corrupting stored state**, because
  the state is not the formula's output.

### 3. Bounded, and it multiplies the pairing term only

The weight is clamped around a neutral **1.0**. Preference nudges the order the engine already
produced; it cannot promote a pairing the engine scored badly, and it never touches personal
fit, contrast or CVD accessibility — a person's habit is not evidence about whether two colours
are separable for a deutan.

`scoreOutfit` gains an **optional** `preferences` argument. Absent, the behaviour must be
**byte-identical to today**, and that is asserted rather than assumed — otherwise this feature
silently re-ranks every existing caller.

## Approach

**Reused:** the store's migration ladder, sync columns and change-log discipline; `pairingFit`
and the component structure in `@irodora/recommendation`; the corpus taxonomy for families.

**New:**

- `packages/store` — migration 6, a `pairing_preference` table, and repository methods to
  record, list and reset.
- `packages/recommendation` — `preferenceWeight`, a `PreferenceTable` input, and the optional
  argument on `scoreOutfit`.

**Increments:**

1. `preferenceWeight` and its bounds, in the engine. Pure, tested alone.
2. Migration 6 and the store methods.
3. The optional wiring into `scoreOutfit`, with the identical-without-preferences assertion.

## Files to touch

```
packages/recommendation/src/preference.ts  — NEW: the weight function and its bounds
packages/recommendation/src/outfit-score.ts— the optional argument
packages/recommendation/src/index.ts       — exports
packages/store/src/schema.ts               — migration 6, SCHEMA_VERSION 6
packages/store/src/repository.ts           — the row, the input, the methods
packages/store/src/createRepository.ts     — record / list / reset
packages/store/test/preference.test.ts     — NEW
packages/recommendation/test/preference.test.ts — NEW
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| Migration 6 | **E-023**: `createRepository`, `archive.ts` (`SELECT *`), the conformance suite, `apps/mobile/src/store`, `data-model.md` | `gate:test` — and E-023 has named a real dependent on each of the last two migrations |
| `scoreOutfit` signature | F-045's `builder.ts`, F-031's tests | `gate:typecheck`, and the optional argument is what keeps every existing call site correct |
| A new `SYNC_TABLES` entry | the archive format and its digest | E-023 again; asserted deliberately, as F-042 did for images |

**A new link is owed** for the one thing E-023 does not cover: that a preference must never
reach the published rule content. That is not a migration consequence, it is a boundary — and
criterion 3 is the whole reason the feature exists in this shape.

## Test plan

- **Repetition shifts it, and the shift is bounded:** one acceptance moves the weight; twenty
  do not move it twenty times as far. The cap is asserted at a number, not "some maximum".
- **Symmetry:** recording `(rust, charcoal)` and then `(charcoal, rust)` produces **one** row
  with two observations, not two rows with one each.
- **Determinism from counts:** the weight is a pure function of `(accepted, rejected)` — the
  same pair of counts always gives the same weight, regardless of the order they arrived in.
  That is the assertion a stored float could not pass.
- **Reset:** after `resetPreferences`, the weights are neutral and the rows are gone.
- **Criterion 3, three ways:** the published `RuleSet` is byte-identical after feedback;
  `scoreOutfit` **without** preferences returns exactly what it returns today; and a
  preference cannot move a score outside the engine's own range.
- **Never touches the protected components:** feeding a preference does not change the CVD
  accessibility or contrast component of a score. Asserted per-component, because "the overall
  moved" would pass for an implementation that moved the wrong one.
- **Conformance:** both drivers, over the new table.

## Verification

Commands read from [`gates.json`](../verification/gates.json).

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

This feature's own list is `state` and `test`. `security` and `content` are run anyway because
a new table and a new engine input touch both; `color-golden` is **not** applicable — no
existing colour maths changes, and the preference multiplies a component rather than deriving
a colour.

Not applicable: `cvd`, `contrast`, `a11y`, `perf`, `artifact`, `e2e`.

## Risks and open questions

- **Criterion 2 says "the user can see and reset it", and no screen will exist.** The feature is
  `service: packages` with no `a11y` in its verification, so a surface is not claimed. The data
  becomes inspectable and resettable; **nothing displays it**, and that half is filed rather
  than quietly counted as met — the same shape as F-031's six scores waiting for F-045.
- No `OQ-*` bears on this.

## Out of scope

- The screen that shows the weights (filed).
- Applying preference to anything but the pairing term. It must not touch CVD separation or
  contrast: a habit is not evidence about legibility.
- Any cross-user or aggregated signal. There is no server, and criterion 3 forbids it anyway.
