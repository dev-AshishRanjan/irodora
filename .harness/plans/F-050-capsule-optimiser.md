# Plan: F-050 — Capsule optimiser

|                       |                                                                   |
| --------------------- | ----------------------------------------------------------------- |
| **Feature**           | F-050 — [`feature_list.json`](../state/feature_list.json)          |
| **Requirements**      | FR-45, NFR-4 — [`docs/PRD.md`](../../docs/PRD.md)                  |
| **Service / package** | `packages` · `@irodora/optimization`                               |
| **Author**            | Claude Code (generator)                                            |
| **Date**              | 2026-08-31                                                         |
| **Blockers**          | F-048 (done) · F-110 (done)                                        |

---

## Intent

> *Capsule optimisation — smallest subset producing the most valid outfits. Solves "≥ N outfits
> from ≤ M garments" for a 40-item wardrobe within NFR-4; solution is deterministic and
> reproducible.*

**N and M are the question, not constants I choose.** A person asks *"can I get 20 outfits out
of 12 things?"* and the answer is a specific set of garments, or an honest no.

## The two criteria contradict each other, and resolving that is the feature

- Criterion 2: *"branch-and-bound with a heuristic seed and **a hard time budget**"*
- Criterion 3: *"returns best-so-far on expiry; the result is **deterministic and reproducible**"*

A wall-clock deadline plus best-so-far is **not reproducible**. A faster machine explores more
nodes in 3 s and returns a better subset; the same wardrobe answers differently on a phone than
on this workstation, and differently again when something else is running. Taken literally,
satisfying criterion 2 breaks criterion 3.

**Resolution — two limits, and the result says which one stopped it:**

| Limit | Kind | Role |
| --- | --- | --- |
| `nodeBudget` | deterministic work count | **Primary.** Same input → same nodes → same answer, on any machine |
| `deadlineMs` | wall clock | **Backstop.** NFR-4's 3 s. Should never bind on the reference machine |

The result carries `stoppedBy: 'proved' | 'nodes' | 'deadline'`, and **the answer is
reproducible exactly when `stoppedBy !== 'deadline'`**. When the clock does fire, the caller is
told, rather than being handed a machine-dependent answer that claims to be reproducible. That
is golden rule 11 applied to a solver: report what the number actually is.

The node budget is sized so the deadline is a genuine safety net and not the normal path. If it
turns out the deadline binds routinely at 40 items, that is a finding about the algorithm and it
goes in the record — **not a reason to quietly raise the ceiling**, which
[`budgets.json`](../../tests/bench/budgets.json) already forbids in as many words: the 3 s was
*"committed before the feature exists rather than chosen to fit whatever it turns out to cost."*

## The problem is combinatorial, and coverage already did the colour part

`coverage()` returns `combinations: ReadonlySet<string>` — every valid outfit as a sorted
garment-id triple, already scored against `COVERAGE_THRESHOLD`. So the optimiser **never scores
an outfit**. It never touches a colour. The problem reduces to:

> Given a set of triples over 40 garments, find the smallest subset **S** with
> `|{t ∈ triples : t ⊆ S}| ≥ N`, subject to `|S| ≤ M`.

That is maximum-coverage-shaped and **NP-hard**, which is why the criterion names
branch-and-bound rather than leaving the choice open. It is also why this had to wait for F-110:
`coverage()` is now in this package, so the solver reads it directly instead of importing the
package it was misfiled into.

**No colour maths, no ΔE00, no scoring.** `color-golden` will not apply.

## Approach

**New:** `packages/optimization/src/capsule.ts`

- `solveCapsule(coverage, { targetOutfits, maxGarments, nodeBudget, deadlineMs })`
- **Greedy seed:** repeatedly take the garment adding the most not-yet-covered triples. Gives a
  strong incumbent immediately, which is what makes the bound prune anything at all.
- **Branch-and-bound:** garments ordered by a deterministic key (greedy contribution, then id),
  branch include/exclude, prune when an optimistic upper bound on what the remaining garments
  could still add cannot beat the incumbent.
- **Deterministic throughout:** no `Math.random`, no `Date.now` in the search *decision* path —
  the clock is read only to test the backstop, never to choose a branch. Ties break on id, the
  same discipline F-045 and F-049 needed.

**Reused:** `Coverage` and `COVERAGE_THRESHOLD` from `./coverage.js`. Nothing else.

## Files to touch

```
packages/optimization/src/capsule.ts        — NEW
packages/optimization/src/index.ts          — exports
packages/optimization/test/capsule.test.ts  — NEW
tests/bench/src/bench.mjs                   — a node-reference budget for the solve
tests/bench/budgets.json                    — its entry
```

The device-scoped `capsule-solve-p95` (3 s, NFR-4) **stays exactly as it is** and stays not-run.
A workstation is not the slowest supported device, and a green run here would say nothing about
a phone. The new budget is `node-reference` scoped, like `coverage-apply-change-p95`.

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| A new entry point on `@irodora/optimization` | `apps/mobile` when it renders this | `gate:typecheck` |
| A second reader of `Coverage.combinations` | `coverage.ts` | `gate:test` |

**One link likely owed.** `Coverage.combinations` was documented as existing so `applyChange`
could subtract without recomputing. It now has a second consumer with a different need — the
solver reads it as *the problem instance*. Changing its shape or its meaning breaks the solver
in a way `applyChange`'s own tests would not notice. Decided at the effect trace, not asserted
here.

## Test plan

The risk with a solver is that it returns something plausible and wrong, and every test agrees
with it.

- **Optimality against brute force.** On a small wardrobe, the branch-and-bound answer equals an
  exhaustive search over every subset. This is the only assertion that can catch a bound that
  prunes too aggressively, and it is the centre of the file.
- **Greedy is beaten.** An instance constructed so the greedy seed is *strictly* suboptimal, and
  the search finds the better answer. **Without this, a solver that returned the seed and never
  searched would pass everything else.** This is the decoy for the whole feature.
- **Determinism, twice over:** the same input returns an identical result, and a **shuffled**
  garment order returns the identical set — the stronger claim, and the one that fails if any
  tie is broken by input position.
- **Best-so-far on expiry.** With `nodeBudget` set to a handful, the result is still a *valid*
  subset with a *correctly counted* outfit total, flagged `stoppedBy: 'nodes'` and not proven
  optimal. A solver that returned an unreachable count would pass a weaker test.
- **The count is real.** The reported outfit total is recomputed independently from the returned
  set and the triples — never trusted from the search's own accumulator, which is the number
  most likely to drift.
- **`maxGarments` is honoured**, and an infeasible target reports that honestly rather than
  returning a subset that misses it.
- **Degenerate inputs:** an empty wardrobe, a target of zero, `M` larger than the wardrobe.

Two mutations to watch failing: weaken the bound so it over-prunes (optimality test fails), and
return the greedy seed without searching (the greedy-is-beaten test fails).

## Verification

Commands from [`gates.json`](../verification/gates.json), run **one at a time**.

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm bench
```

`perf` applies — a `node-reference` budget is added and measured. `color-golden` does **not**:
no colour maths is added, changed, or called. Also not applicable: `cvd`, `contrast`, `a11y`,
`content`, `security`, `artifact`, `e2e`.

## Risks and open questions

- **The deadline may bind at 40 items.** If it does, the honest record is that the search does
  not prove optimality at that size in 3 s on this machine, reported through `stoppedBy`. The
  ceiling does not move.
- **A wrong upper bound is the dangerous defect**, because it makes the solver faster and
  quietly wrong, and only the brute-force comparison can see it. That test is not optional.
- **40 items is the requirement's size, and this workstation is not the device.** A green
  node-reference budget says the algorithm is not the problem; it says nothing about a phone,
  and the entry will say so.
- No `OQ-*` bears on this.

## Out of scope

- **The surface.** `service: packages`, no `a11y` in the verification list — nothing renders a
  capsule. The fourth feature in a row owing this; still filed, still not counted as met.
- **Which garments a person should buy.** That is gap analysis (F-043/FR-43), already built.
- **Any change to what makes an outfit valid.** `COVERAGE_THRESHOLD` and `scoreOutfit` are
  F-048's and F-045's decisions and are not reopened here.
