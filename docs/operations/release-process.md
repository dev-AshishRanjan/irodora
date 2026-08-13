# Release Process

| | |
|---|---|
| **Status** | Baseline · pipeline lands with F-004 |
| **Decision** | [ADR-0024](../adr/0024-ci-cd-github-actions-trunk-based.md) |

---

## Branching

Trunk-based on `main`. Short-lived branches, small merges, `main` always releasable.

Branch protection: all required checks green · at least one review · linear history · no
force-push.

Conventional Commits. Changesets for versioning publishable packages.

---

## The gates

Run in order, stop at the first failure. Defined in
[`.harness/verification/gates.json`](../../.harness/verification/gates.json) and mirrored
by `.github/workflows/ci.yml` — **the mirror is machine-checked by the `state` gate**, so a
gate cannot exist in one file and not the other.

```
0  state          harness integrity
1  typecheck      2  lint           3  format
4  test           5  color-golden   6  build
7  e2e            8  a11y           9  contrast
10 cvd            11 content        12 perf
13 web-perf       14 e2e-full       15 security
```

> **Never disable a failing gate to unblock a merge.** A gate that is genuinely wrong is
> changed deliberately, with an ADR. A gate that is flaky is fixed, or quarantined with a
> tracked feature. It is never silently deleted — that is how a gate becomes theatre.

---

## Release

```
tag vX.Y.Z
   ↓  full gate run
   ↓  build multi-arch images, pinned base digests, non-root
   ↓  scan images
   ↓  generate SBOM
   ↓  push to registry
   ↓  deploy STAGING
   ↓  automated verification against staging
   ↓  DEPLOY TO A REAL VPS via Coolify or Dokploy      ← required, every release
   ↓  manual release checklist
   ↓  deploy PRODUCTION (required reviewer)
   ↓  post-deploy verification
```

**The VPS step is not optional and not a smoke test.** A container-portable deployment
story that is only ever exercised in cloud CI stops being true within a few releases — an
AWS-only assumption creeps in, and nobody notices until a self-hosted customer cannot boot
it. Deploying every release on a real VPS is what keeps NFR-18 an actual property.

---

## Release checklist

Before production:

- [ ] All gates green, evidence recorded in [`progress.md`](../../.harness/state/progress.md)
- [ ] Migrations reviewed — **expand/contract**, backward-compatible with the previous
      release
- [ ] Rollback verified: the previous image runs against the new schema
- [ ] Any new `IRODORA_*` variable is in `.env.example` (the `state` gate checks this)
- [ ] Corpus and rule versions pinned, or intentionally latest with the reason recorded
- [ ] Effect graph updated; no critical link without a guard
- [ ] Screen-reader pass: VoiceOver, TalkBack, NVDA
- [ ] Both locales rendered on the changed surfaces
- [ ] Threat model reviewed if a trust boundary changed
- [ ] Sub-processor list current if a dependency was added
- [ ] Status page ready; rollback command to hand

**Major releases additionally:**

- [ ] Real CVD user testing completed (A10)
- [ ] Device colour lab results updated if capture changed
- [ ] Bias validation re-run if the profile engine changed (NFR-23)

---

## Post-deploy

Within 15 minutes: error rate normal · p95 latency within budget · `/readyz` green on every
instance · corpus checksum verified · a synthetic run of journeys J1 and J4.

**Rollback triggers, decided in advance so nobody has to decide during:**

| Trigger | Action |
|---|---|
| 5xx rate > 2 % | Roll back immediately |
| p95 above budget for 10 min | Roll back |
| Corpus checksum mismatch | Roll back **and** open a SEV1 |
| Any auth or tenancy failure | Roll back immediately |
| A journey fails synthetically | Roll back |

Deciding these before the deploy is the point. Deciding them at 2 a.m. while a graph climbs
produces worse decisions and slower ones.

---

## Versioning

| Artefact | Scheme |
|---|---|
| Applications | `vMAJOR.MINOR.PATCH` |
| Published packages | Semver via Changesets |
| API surface | `/v1`, additive only; a break mints `/v2` with a ≥ 12-month sunset |
| Corpus | `YYYY.MM.N`, immutable |
| Rules | `YYYY.MM.N`, immutable |

The colour engine's version is part of every reproducibility envelope (FR-10). **A change
that alters engine output is a MAJOR version**, even if the API is unchanged — because
downstream, an envelope that no longer reproduces is a broken contract regardless of what
the types say.
