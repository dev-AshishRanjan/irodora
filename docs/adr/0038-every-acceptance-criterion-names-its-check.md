# ADR-0038 — Every acceptance criterion names its check; external verification is attested, not gated

## Status

Accepted

## Date

2026-08-14

## Context

Three consecutive features hit the same wall.

- **F-003** — the contrast gate needed WCAG and CVD maths that only R1 owns.
- **F-004** — *"branch protection requires all checks, one review, and linear history"* is a
  setting on a GitHub repository that does not exist.
- **F-005** — *"the stack is deployed and verified on a real VPS through Coolify AND through
  Dokploy"* needs a VPS, and both platforms deploy *from* a git remote there also isn't one.

Each was discovered mid-implementation, and each cost a decision that should have been made
when the criterion was written. A sweep of the feature list found **nine features** with at
least one criterion of this kind, spanning every release from R0 to R5:

```
F-004  branch protection                     F-043  median add time, measured on device
F-005  deployed on a real VPS                F-053  ΔE00 improvement on the device matrix
F-005  terraform remote state configured     F-056  ASE round-trips through Adobe tooling
F-012  a named reviewer per corpus entry     F-063  the device colour lab measurement table
F-037  per-band accuracy published internally
```

This is not bad luck. The feature list was authored pre-code, and its criteria were written
as **goals** rather than as **checks** — which is the natural way to write them and produces
a list that cannot be mechanically judged.

**The criteria are not wrong.** F-037's per-band bias validation blocking release is exactly
right, and deleting it to make a feature closeable would be the worst available outcome. The
defect is that obligations verified outside this repository sit in the same list, in the same
shape, as obligations a gate can run — so the two get conflated in both directions: a feature
cannot close on something no code change can fix, and a genuinely blocking obligation looks
satisfied once the feature is marked done.

## Decision

**Every acceptance criterion is one of two kinds, and the kind is recorded in the data.**

| Kind | Proven by | Blocks |
|---|---|---|
| **Gated** (default) | a gate in `gates.json`, or a named script | the **feature** |
| **Attested** | a named activity outside this repository | the **release** |

1. **Attested criteria are declared** in a new `attested` array on the feature, each naming
   the criterion verbatim, the activity that verifies it, and what it blocks:

   ```jsonc
   "attested": [
     {
       "criterion": "The stack is deployed and verified on a real VPS through Coolify AND through Dokploy",
       "verifiedBy": "A deployment to a real VPS, recorded in docs/operations/release-process.md",
       "blocks": "release",
       "status": "outstanding"
     }
   ]
   ```

2. **The state gate checks the declaration.** Each `criterion` string must appear **verbatim**
   in that feature's `acceptance` array. A criterion cannot be quietly reworded into
   something easier once it is attested, and an attested entry cannot drift away from the
   criterion it excuses.

3. **A feature may be `done` with outstanding attested criteria. A release may not.** That is
   the whole point of the split: feature completion measures the work in this repository,
   release readiness measures the obligations. Both stay visible.

4. **Attestation is not an escape hatch.** A criterion may be attested only when no check in
   this repository *could* prove it. "It would be difficult to test" is not the bar —
   "verifying it requires a system we do not control" is. Where a **part** is checkable, that
   part stays gated: F-005 keeps a static portability check on the compose file, so
   *"consumed unmodified by both Coolify and Dokploy"* is not deferred wholesale just because
   the deployment is.

5. **New criteria name their check when written.** Added to
   [definition-of-done](../../.harness/protocols/definition-of-done.md) and to
   [plan-feature](../../.harness/skills/plan-feature/SKILL.md).

## Consequences

**Good.** The feature list becomes mechanically judgeable — the thing it was always presented
as. Obligations that genuinely block a release stay recorded and visible instead of being
deleted to unblock a feature, or silently satisfied when the feature closes. The verbatim
check means attestation cannot be used to soften a criterion. And the discovery moves to
where it is cheap: when a criterion is written, not three features later.

**Bad.** A second concept where there was one, and `done` now means "done, with attested
items outstanding" — which is precisely the ambiguity F-005's re-order note warned about for
"R0 complete". Anyone reading the release list as a checklist still needs to look at the
attested entries. There is also a real risk of drift the gate cannot catch: `verifiedBy`
saying "a deployment to a real VPS" is only as good as the person who eventually records it,
and nothing here proves the activity happened well.

**Neutral.** Nine features change shape. None of their obligations change.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Delete the unverifiable criteria** | Would have deleted F-037's ITA-band bias validation — a stated release blocker on an ethical guarantee. The single worst outcome available |
| **Leave them and let features stay open** | R0 never closes. Worse, the list stops being trusted, and a list nobody trusts stops being read |
| **Substitute a weaker local proxy** ("boots in Docker" for "deployed on a VPS") | Downgrades a compatibility claim into a liveness claim while keeping the original wording. This is the measurement-claims failure (ADR-0031) applied to our own process |
| **A `blocked` status per criterion** | Same information, but status is about the feature, and a criterion-level status would need the same new field anyway — without the `verifiedBy` and `blocks` that make it actionable |

## Revisit when

- An attested criterion has been outstanding across two releases. That is the signal it is
  either not real or nobody owns it, and both are worth surfacing.
- A gate becomes able to prove something currently attested — a compose file deployed to a
  containerised Coolify, for instance. It moves back to gated, and the attested entry goes.
