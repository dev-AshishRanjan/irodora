# Branch protection

| | |
|---|---|
| **Status** | Specified, **not applied**. The remote exists as of 2026-08-23; applying it is a decision for the maintainer |
| **Implements** | NFR-14, NFR-19 · F-004 acceptance criterion 3 |
| **Applies to** | `main` |

---

## Why this file exists rather than a green checkbox

Branch protection is a setting on a GitHub repository. The repository now exists and CI has
run against it, so the blocker is no longer technical: the rules below are the deliverable,
and **applying them is a decision for the maintainer**, because changing who can write to
`main` is not local bookkeeping.

Recorded as a specification so that the day the repository exists, the settings are not
reconstructed from memory or from what someone thinks CI is called.

## Required settings on `main`

| Setting | Value | Why |
|---|---|---|
| Require a pull request before merging | on | No direct pushes to `main` |
| Required approvals | **1** | F-004 acceptance |
| Dismiss stale approvals on new commits | on | An approval is of a diff, not of a branch |
| Require status checks to pass | on | |
| Require branches up to date before merging | on | Otherwise two independently-green branches merge into a red `main` |
| Required checks | `Verification gates` | The single job in [`ci.yml`](../../.github/workflows/ci.yml) |
| Require linear history | on | F-004 acceptance. Makes `git bisect` meaningful across the gate history |
| Require conversation resolution | on | |
| Allow force pushes | **off** | [commit-policy](../../.harness/governance/commit-policy.md): a revert is a fact in the history, a rewrite removes one |
| Allow deletions | **off** | |
| Include administrators | on | A rule that the person under deadline pressure can bypass is not a rule |

**One required check, not sixteen.** Every gate runs as a step inside the `Verification
gates` job, in `gates.json` order, stopping at the first failure. Listing individual gates as
separate required checks would mean editing branch protection every time a gate activates —
and the failure mode there is silent: a newly activated gate that nobody added to the
required list simply never blocks anything.

## Applying it

Once a remote exists, with the `gh` CLI authenticated:

```bash
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  --input docs/operations/branch-protection.json
```

The JSON payload is not committed yet, deliberately — writing it before the repository
exists means writing a file nobody can validate against a real API response.

## What is already enforced without it

Branch protection is the *enforcement*; the checks themselves exist and run:

- Gate 0 fails if an active gate is missing from CI, and
  [`verify-gate-mirror.mjs`](../../scripts/verify-gate-mirror.mjs) proves that check can
  fail, per gate.
- Secret scanning and the dependency audit run as steps in the same job.

Until protection is applied, none of that is *required* — it can be observed and ignored.
That gap is the reason this file names a status rather than a checkbox.
