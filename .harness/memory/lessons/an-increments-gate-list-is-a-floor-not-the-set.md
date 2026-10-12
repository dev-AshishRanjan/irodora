# An increment's gate list is a floor, not the set

**Date:** 2026-10-09 · **Found in:** F-236, at its close-out

F-236's plan gave each of its increments a *Gates:* line naming what that increment affects:
`typecheck`, `lint`, `test` here, `a11y`, `contrast` and `cvd` there. The implementing
session ran each list on the root commands, captured each exit code, and committed. Each list was
a faithful account of the change, and two things still went in red:

- **Lint, once.** Increment 2's list was `typecheck`, `test`, `contrast`, `cvd`. Its change to
  `cvd/mark.test` broke `prefer-nullish-coalescing`, and that stood in a commit until increment 3
  ran lint.
- **The always-gates, eleven times.** `gates.json` marks `state` and `security` as `always`.
  `state` was named only in increment 1's list; it was run more often than that, by habit rather
  than by the plan. `security` was in no list until increment 12, the one whose list said *all*.
  When it ran, it was red: nine advisories in dependencies the feature never touched (F-322).
  Whether any of them was already published at increment 1 is not known, because nothing ran the
  gate then. So increments 1 to 11 were committed with an always-gate nobody had checked.

[[an-always-gate-nobody-runs-is-red-without-anyone-knowing]] already says: run every always-gate
before every commit. The plan is what overrode it. A per-increment list reads as the complete
instruction, and following it to the letter is how the rule got skipped.

## What to do instead

Every increment's commit runs a **floor**: `state` and `security` (always), plus `typecheck`,
`lint`, `format`, `test` and `build` whenever code changed. The increment's own list *adds* to
that floor and never replaces it. The plan template's *Verification* block now says so.

A red always-gate the feature did not cause still gets recorded at once, as F-322 was. It is not
fixed inside the feature (rule 2), and it is not left unrecorded (rule 5).

Links: [[a-package-gate-is-not-the-repository-gate]]

## And run `verify:ci` with `--all`

`pnpm verify:ci` stops at its first red step, as CI does. Until F-295 (2026-10-12) Gate 4 (test)
was red on every uncached run, so a plain run never reached the steps after it: at F-236's
close-out, `--all` found the a11y mutation proof red since F-232 (F-324). F-295 made verify-ci
report every step by its exit code. `--all` is still the only way to see every step past the first
red, and a known red always sits ahead of the rest.

## Addendum — 2026-10-10 (ADR-0132): the floor is per feature

The floor this lesson set — state, security and the five code gates under every increment — made
each increment cost a feature's verification. Corrected by the person and recorded in ADR-0132:

- **An increment's commit is Tier 1.** Format, typecheck, the root lint, and the tests of what
  changed and its dependents. A plan's per-increment list still adds to that; it never replaces it.
- **The full set, the always-gates included, is Tier 2**, run once per feature at Verify.

What this lesson caught is still caught: lint is in Tier 1, and security is in Tier 2, which the
evaluator also runs.
