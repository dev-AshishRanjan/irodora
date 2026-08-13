# ADR-0024 — GitHub Actions on trunk-based `main`, mirroring `gates.json` exactly

## Status

Accepted

## Date

2026-08-13

## Context

The harness defines an ordered set of verification gates in
[`.harness/verification/gates.json`](../../.harness/verification/gates.json). CI must run
exactly those gates, in that order.

The failure mode this decision exists to prevent is **drift between the local gate
definition and the CI workflow**. A gate is added to `gates.json` and not to `ci.yml`, or a
CI step is quietly disabled after a flake. Both files continue to look correct. The gate is
now theatre — declared, believed in, and never run.

Branching model matters less, but it interacts: long-lived branches mean long-lived
divergence in a repository whose whole point is that the engine is one artefact at one
version.

## Decision

**GitHub Actions, trunk-based development on `main`, with the gate mirror machine-checked.**

1. **`ci.yml` runs the gates from `gates.json`, in order, stopping at the first failure.**
2. **The mirror is verified by the `state` gate.** `verify-state.mjs` parses both files and
   fails if an active gate has no CI step, or a CI step corresponds to no gate. A gate
   deliberately covered inside another step (`a11y` runs inside the web e2e run) declares
   `ciStep: false`, so the exemption is explicit and reviewable rather than an omission.
3. **Trunk-based on `main`.** Short-lived branches, small merges, `main` always releasable.
4. **Branch protection:** all required checks green, at least one review, linear history,
   no force-push.
5. **Conventional Commits** and Changesets for versioning the publishable packages.
6. **Caching:** pnpm store and Turborepo remote cache. CI wall time on an incremental
   change is budgeted at ≤ 15 minutes; exceeding it is a tracked work item, not an accepted
   fact.
7. **Release:** tag → build multi-arch images → push to registry → deploy staging →
   automated verification → deploy production. Every release is exercised on a real VPS
   through Coolify or Dokploy before it ships (roadmap R0 exit).
8. **Secrets** come from GitHub environments with required reviewers on production. No
   secret is ever echoed, and `gitleaks` runs on every push.

**Never done:** disabling a failing gate to unblock a merge. A gate that is genuinely wrong
is changed deliberately, with an ADR, and the change is recorded. A gate that is flaky is
fixed or quarantined with a tracked feature — never silently deleted.

## Consequences

**Good.** The gates that are declared are the gates that run, provably. Trunk-based
development keeps divergence small, which matters when the engine must stay one artefact.
Turborepo caching keeps incremental CI fast. Release is reproducible and the VPS path is
verified rather than assumed.

**Bad.** Coupling to GitHub Actions — migrating to another CI system means rewriting the
workflow and the mirror check. Trunk-based development requires discipline and good test
coverage; without them it means broken `main`. Multi-arch image builds are slow. Required
reviewers on production deploys add latency to a hotfix, which is the intended trade but
still a cost.

**Neutral.** The mirror check is ~40 lines in `verify-state.mjs`, and it is the difference
between a gate list and a gate list that is true.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **GitLab CI / CircleCI / Buildkite** | Each has genuine strengths. The repository is on GitHub, and Actions removes an integration; no capability we need is missing |
| **GitFlow** | Structured releases, familiar to many teams. Long-lived branches cause exactly the divergence a shared-engine monorepo cannot tolerate |
| **Release branches** | Would allow patching an old version. Not needed until there are customers on pinned versions; revisit at the Studio tier |
| **CI as the only gate definition** | One file instead of two. But the gates must be runnable locally and by an agent before a push — a gate you can only run in CI is a gate you find out about too late |

## Revisit when

- CI wall time exceeds the 15-minute budget on incremental changes.
- Customers require pinned versions with backported fixes, which is where release branches
  earn their cost.
