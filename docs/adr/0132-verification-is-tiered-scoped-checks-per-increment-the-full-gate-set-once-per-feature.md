# ADR-0132 — Verification is tiered: scoped checks per increment, the full gate set once per feature

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-10 |
| **Feature** | — (harness; decided during F-240) |
| **Builds on** | [ADR-0029](0029-harness-agnostic-core-thin-adapter.md) (the harness is the system of record); the one-review rule (AGENTS.md loop step 5, F-219) |
| **Applies** | Golden rules 4, 6 and 10; AGENTS.md loop steps 4 and 5; [commit-policy](../../.harness/governance/commit-policy.md) |
| **Decided on** | The person, 2026-10-10: *"We agreed for 1 plan, 1 dev, 1 review per task/feature. You are reviewing per increment. Let's review per task/feature."* |

---

## Context

The loop is one plan, one implementation and one independent review per feature. The review rule has
held: each feature had exactly one evaluator run. **The gates had not.** By F-240, every increment's
commit ran the entire suite:

- `pnpm test` across all 35 tasks;
- a11y, contrast, cvd, golden;
- `pnpm security`, and at times `verify:ci --all`.

That is 15 to 30 minutes per increment, and 10 to 13 increments per feature. In effect each
increment was verified like a finished feature.

Two lessons drove it, and both over-read what they were guarding against:

- [[an-always-gate-nobody-runs-is-red-without-anyone-knowing]] (F-219) turned `gates.json`'s
  `requiredFor: ["always"]` into "before **every commit**". In `gates.json`, `requiredFor` names the
  kinds of change a gate is required for — every feature, whatever its type. It does not mean every
  commit.
- [[an-increments-gate-list-is-a-floor-not-the-set]] (F-236) made `state`, `security` and the five
  code gates a floor under every increment.

The canonical rule never asked for that. `rules/common/git.md` and the commit policy both say:
*"the gates that apply to what you changed are green"* before a commit.

Professional practice separates the two loops:

- **The inner loop (each commit) is fast and scoped to the change.** Trunk-based CI and monorepo
  tools build and test what a change affects: Turborepo's `--filter`, Nx `affected`, Bazel's
  dependency graph.
- **The outer loop (the change set) runs the full suite once and gets one independent review.**
  That is a pull request, or a CL at Google: presubmit plus code review.

A review per increment buys little the per-feature review does not, and its cost falls on the person
waiting.

## Decision

**Two tiers.** An increment is a logical unit with its own commit, not a verification checkpoint.

### Tier 1 — every increment commit: what the change touches

Green before the commit, with the commands and exit codes in the plan's Status row:

1. `pnpm format:check`
2. `pnpm typecheck` (Turborepo's cache makes unchanged packages free)
3. `pnpm lint`. **The root command**, never a package's eslint alone: the root chain carries the
   repository checks (claims, cache scope, dead exports and the rest), which is F-223's lesson.
4. `pnpm turbo run test --filter='...[HEAD]'`: the tests of every changed package **and every
   package that depends on one**, uncommitted work included. A test that watches a directory still
   runs, because its package changed.
5. Only where the increment changes what they read:
   - `node scripts/verify-state.mjs` when `.harness/` changes;
   - the gate a domain input feeds: `test:golden` for the colour engine, `test:content` and the
     font subset for the catalogue or corpus, `test:contrast` for tokens.

Gates for the whole product are not run here: the full test suite, a11y, cvd, perf, the dependency
audit (`security`) and `verify:ci`.

### Tier 2 — once per feature, at Verify: the full set

Before the single review, and again on the final tree after the review's findings are fixed:

- every gate in the feature's `verification` list;
- the always-gates, `state` and `security`;
- `node scripts/verify-ci.mjs --all`. (Until F-295, read test, a11y and contrast by their own exit
  codes; since 2026-10-12 verify-ci reports them by their exit codes, and marks a step that could
  not run apart from a failed one.)

Each exit code is recorded in the plan and in `progress.md`. A red always-gate the feature did not
cause is recorded as a feature at once, never fixed inside this one (rule 2) and never left
unrecorded (rule 5). The re-run after the fixes is evidence for the done commit, **not a second
review** (loop step 5).

### The review stays one per feature

The evaluator runs Tier 2 itself and reviews once. Nothing in this ADR adds a review anywhere.

## Consequences

**Good.**

- An increment costs minutes, not half an hour. The full suite runs twice per feature, where it ran
  ten or more times.
- Each commit is still green on what it touched, so rule 6 holds. A bisect still lands on commits
  that build and pass their own tests.

**Bad, and the guards.**

- **A break outside the affected graph waits for Tier 2.** For example, a doc a script parses, or a
  global census. It is found once per feature rather than at the next commit. The feature does not
  close red, nothing is pushed until a person asks, and Tier 2 runs before the review.
- **A newly published advisory is noticed per feature, not per commit.** It can never be caused by a
  commit that changes no dependency, and a commit that changes `package.json` or the lockfile runs
  `security` in Tier 1, under rule 5's "what the change touches".

## Alternatives considered

- **Keep the full set per increment.** Every commit fully verified, at roughly ten times the cost.
  Rejected: it duplicates the per-feature verification, and the person has said it is too much.
- **Squash each feature into one commit.** That would leave nothing to bisect inside a feature and
  break the commit policy's "one logical change".
- **Tier 1 without dependents.** Faster, but the app's suite exists precisely to catch what a change
  in `@irodora/ui` breaks downstream.

## Revisit when

- A defect reaches a feature's done commit that Tier 1 would have caught had it run the full set.
- CI runs on every push, and the inner loop can lean on it.
