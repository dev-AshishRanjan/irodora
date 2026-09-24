# An always-gate nobody runs is red without anyone knowing

**Date:** 2026-09-14 · **Found in:** F-219 (its fourth evaluation)

Gate 15 (`pnpm security` — gitleaks, the key scan, the advisory audit, the no-inference check) is
marked `requiredFor: ["always"]` in `gates.json`. Two commits of one session went in with it red:

- `56a4f5f` (the R9 re-cut) — gitleaks read feature prose, *"sample with keyline, Hex/OKLCh/CIELAB
  table"*, as a generic API key: "keyline," looked like `key =`, and the column list like its value.
- `d59bc44` (F-218) — `verify-no-inference` read the identifier `MOCKUP_AGENTS` as naming age.

Both were false positives. **That is the point, not the excuse.** Each took under a minute to see
once the gate ran, and nobody ran it: not the implementer, and not two evaluators, whose briefs
listed the gates "that apply to this change" — and a secret scan never looks as if it applies to a
change made of prose and a lint. It surfaced only because the fourth evaluator of F-219 wrote
*"security: always, not run"* in its report.

A red always-gate that nobody runs blocks every later feature from being done, and it hides a real
finding behind a false one: the next genuine secret would have landed in a gate already red.

**The rule.**

1. Before every commit, run every gate `gates.json` marks `always` — `pnpm security` included — and
   list each one, with its exit status, in the verification record.
2. An evaluator brief names the always-gates explicitly. "The gates that apply" leaves the choice to
   judgement, and judgement skips the ones that look irrelevant.
3. An evaluator's "not run" against an always-gate is a blocker to act on, not a line to note.
4. A false positive earns the narrowest exemption its tool allows, with its reason — an exact token,
   never a path — and a false positive in an identifier is fixed by renaming, not by exempting.

Links: [[a-check-must-report-its-scope-not-only-its-verdict]]

## Addendum — 2026-09-24 (F-291): the rule covers gates, and a proof is not a gate

`d59bc44`, the second commit above, broke something else as well, and rule 1 would not have
caught it. Its new section 9b re-read
the feature list and crashed gate 0 on `verify-state-id-proof.mjs`'s renamed-array plant. **No
gate's command runs that proof.** It is its own step in `ci.yml`, one of twenty-odd, so running
every always-gate stays green. CI first ran it on the next push, 2026-09-21, and stopped there
with 33 steps skipped, on that push and the one after.

`pnpm verify:ci` runs every `ci.yml` step in order, derived from the workflow, and its
gate 0 proofs finish in under a minute.

5. Before committing a change to `scripts/` or `.harness/`, run `pnpm verify:ci`, not only the
   gates. Put its result in the verification record as well.

Until **F-295** is done, `verify-ci` reports test, a11y and contrast red on a clean tree when they
run uncached: each prints about 7 MB, and its `spawnSync` stops reading at 1 MiB. Read those three
by their own exit codes.
