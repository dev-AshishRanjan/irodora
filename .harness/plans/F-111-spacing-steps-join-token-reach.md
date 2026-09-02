# Plan: F-111 — The spacing steps join the token-reach check

| | |
|---|---|
| **Feature** | F-111 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` (the check is repository-level; the readers are the app and `packages/ui`) |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

`nativeSpacing` has named steps as of F-103, so the token-reach check *can* answer for it at leaf
level the way it already does for radius. It does not, and the script says so in its own header.
This closes that — and the interesting half is not the group, it is what the four unreached steps
are made to say about themselves.

Done: `verify-token-reach.mjs` reports nine spacing steps, five reached and four declared, and a
planted unreached step fails the gate.

## What is already true, measured rather than assumed

| Step | Readers in `packages/ui` + `apps/mobile` |
|---|---|
| `xs` | 5 |
| `sm` | 7 |
| `md` | 4 |
| `lg` | 2 |
| `xl` | 2 |
| `xl2` … `xl5` | **0** |

Exactly what F-103's note predicted: the scale reaches components, and the four rhythm steps
have found no surface.

## Approach

**Reused — this feature adds no mechanism.** The group list, the reader-zone scan, the
declaration file and the proof harness all exist; `radius step` is the shape to follow, and the
script's header already names F-111 as the feature that would do it.

| Piece | Where |
|---|---|
| `namesOf` — the group list | `scripts/verify-token-reach.mjs` |
| The both-directions rule — an unread name must be declared, **and a declared name must not be read** | same file |
| The declaration format (`group`, `tokens`, `cites`, `why`) | `.harness/verification/unreached-tokens.json` |
| `--prove` — plant, run, assert, restore | same file, `prove()` |

**New:** one group entry, four declarations, and one proof case.

Three decisions:

1. **`props: ['gap', 'padding', 'margin']` is deliberately NOT how the group is read.** Spacing
   is consumed as `nativeSpacing.md`, a property access on the binding — not as a string literal
   in a prop the way `size="xs"` or `radius="md"` are. The group is therefore `kind: 'identifier'`
   scoped to its owner, and getting that wrong would report all nine as unreached and invite four
   more declarations that are lies.
2. **The declaration says *rhythm*, not *unused*.** Criterion 3, and the reason it is a criterion:
   *"not used yet"* is a note that rots into a deletion the first time somebody tidies. *"The
   rhythm of a layout tier that does not exist"* is the manifest's own argument, and it survives
   the tidying.
3. **Four steps, one entry — or four?** One. `radius step` groups its three unreached steps into
   a single entry because they share a reason, and these four share a stronger one. Four entries
   repeating the same sentence would be four places for it to drift.

**Increments:**

| # | Step | Verified by |
|---|---|---|
| 1 | The `spacing step` group; the check now reports four unreached | `node scripts/verify-token-reach.mjs` — expected to FAIL first, which is the point |
| 2 | The declaration, and the script header corrected | the same command, green |
| 3 | A proof case: a planted unreached spacing step is named | `--prove` |

## Files to touch

```
scripts/verify-token-reach.mjs               — the group, the header, the proof case
.harness/verification/unreached-tokens.json  — the rhythm declaration
.harness/state/feature_list.json             — status, notes
.harness/state/progress.md                   — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **Gate 8** (`test:a11y` runs `verify-token-reach.mjs`) | A new group means more names checked. If the group is read wrongly, the gate goes red on nine steps rather than four — loudly, which is the right failure | **the gate itself**, run before and after |
| `docs/design/design-system.manifest.json` | **Not touched.** No token is added, removed or renamed; what changes is what the check can *see* | — |
| The declaration file's both-directions rule | A declared step that a component *does* read must fail. Adding `xl2`..`xl5` is safe only because they measurably have no readers | the check's own stale-declaration path, and the `--prove` case for it that already exists |

**No effect link is warranted.** Nothing shared moves.

## Test plan

- **The check itself is the test**, and it is run in three states: before the group (green, nine
  steps invisible), after the group and before the declaration (**red**, four steps named), and
  after the declaration (green, four declared).
  Watching the middle state is what makes the declaration mean something — a declaration added
  in the same edit as the group would never have been observed doing anything.
- **`--prove` gains a spacing case**: remove the only reader of a step that has exactly one, and
  assert the check names it. The decoy is a step with several readers, one removed, which must
  **not** fire.
  `lg` and `xl` have two readers each — so removing one leaves a reader and is the decoy;
  removing both is the positive case.
- **The reverse direction is already proven** by the existing planted-stale-declaration case, and
  a spacing declaration for a step that IS read would fail through the same path. Asserted by
  planting `md` — which has four readers — into the declaration and watching it fail.

## Verification

```
node scripts/verify-token-reach.mjs
node scripts/verify-token-reach.mjs --prove
node scripts/verify-state.mjs
pnpm test:a11y && pnpm lint && pnpm format:check
```

**Will not run:** `e2e`, `color-golden`, `cvd`, `content`, `perf` — nothing here touches colour,
content or a journey. `test` and `build` are run because the repository is one workspace, not
because this changes either.

## Risks and open questions

- **No `OQ-*`.**
- **The group could be read wrongly and still look right.** If the owner scoping is wrong the
  check reports nine unreached instead of four, which is loud. The dangerous direction is the
  opposite — a group that matches too eagerly and reports *zero* — and the `--prove` case is
  what rules that out, because a check that names nothing is exactly what the plant catches.
- **`xs` is a spacing step, a radius step and a type step.** The script already documents this
  hazard and keys reads by group rather than by name; the new group inherits that and the proof
  case is chosen so it cannot be satisfied by another group's reads.

## Out of scope

- **Using `xl2`..`xl5`.** Finding them a surface is a design decision about a layout tier that
  does not exist, and inventing one to satisfy a check is the tail wagging the dog.
- **The 69 hand-written spacing values F-095 was filed for.** That is a different feature and it
  is done; what remains here is only the reach check.
- **Any other unnamed scale.** If one exists, it is not this feature's.
