# Plan: F-079 — Gate 15 has a disposition for an advisory with no fix

| | |
|---|---|
| **Feature** | F-079 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-14 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` · `scripts/` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-23 |

---

## Intent

Gate 15 currently exits 1 on every run and has since F-039, so **the security gate is
already off** — not by a decision, but by being permanently red, which is the state in which
people stop reading it. A release cannot be cut at all while it is red, because
`release.yml` calls `ci.yml` first.

Done looks like: the gate is **green and still able to go red**, and every advisory it is
not failing on is written down with a reason, an owner and a date it stops being accepted.

## The situation, verified rather than recalled

Two HIGH advisories, `GHSA-w3rx-r6r6-pgpr` and `GHSA-5p2g-fcmc-qvqq`, both `image-size`,
both `vulnerable_version_range: "<= 2.0.2"` with **`first_patched_version: null`**. The npm
dist-tags are `latest: 2.0.2` and `legacy: 1.2.1`. Installed is **1.2.1**, pulled by
`metro@0.84.4` and `metro@0.87.0`, both of which constrain `image-size` to `^1.0.2`.

**Every published version is affected. There is no upgrade and no override.** So the only
choices are: leave the gate red forever, turn the severity threshold down, or record a
disposition. The first two both end with nobody reading gate 15.

## Approach

**Reused.** `pnpm audit`'s own JSON output — the data stays pnpm's, only the verdict is ours.
The report shape follows the other gate scripts: findings as data, a `--prove` mode, and
"NOT CHECKED HERE" printed on every run.

**Rejected: `auditConfig.ignoreGhsas` in `package.json`.** It is pnpm's built-in mechanism and
it is one line — but it has **no expiry, no owner and no reason**. An entry added under
deadline pressure is indistinguishable from one that was thought about, and it is silent
forever. That is the failure this feature exists to prevent, so the built-in is the wrong
tool even though it is the obvious one.

**New.**

- `.harness/verification/advisories.json` — the register. Each entry: the GHSA id, package,
  severity, **reachability** (what would have to be true for this to hurt a user), the
  accountable owner, `decidedOn`, `expires`, `removeWhen`, and the ADR.
- `scripts/verify-audit.mjs` — runs `pnpm audit --json`, subtracts the register, and fails on:
  - any blocking advisory not in the register;
  - **any register entry past its `expires`** — the exception stops working by itself, which
    is the only kind of expiry that survives contact with a busy week;
  - **any register entry that no longer matches a reported advisory.** A dead exception is
    how a live one gets waved through later, so a stale entry is a failure rather than
    tidy-up.
  - It also fails if `pnpm audit` cannot run. A gate that errors is failing open
    ([[a-gate-that-errors-is-failing-open]]).
- `docs/adr/0059-…` — the decision, with the reachability analysis and what it costs.

**Increments.**

1. `verify-audit.mjs` + the register, with the register **empty** — watched failing on the
   two real advisories. A checker whose first run passes has proven nothing.
2. The two entries land; the gate goes green.
3. `--prove`: the four ways it must go red, plus a green baseline either side.
4. `pnpm security` becomes one script running both halves; gates.json and `ci.yml` follow.
5. ADR, docs, state.

## Files to touch

```
scripts/verify-audit.mjs                   — NEW: the verdict, and its proof
.harness/verification/advisories.json      — NEW: the register
package.json                               — security:audit, security; gate 15 is one command
.harness/verification/gates.json           — gate 15 command + description
.github/workflows/ci.yml                   — two security steps become one, mirrored
docs/adr/0059-...                          — NEW
docs/operations/release-process.md         — the checklist gains "no expiring exception"
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| Gate 15's command changes to `pnpm security` | the gates ↔ CI mirror | `verify-gate-mirror.mjs`; note `pnpm security` is a PREFIX of `pnpm security:secrets`, and the matcher requires a shell boundary after the command, so the two cannot be confused |
| An advisory can now be accepted | every future dependency review | the expiry, and the stale-entry check |

No new effect link: this changes a gate's verdict, not a shared contract.

## Test plan

- **Negative, with decoys —** `verify-audit.mjs --prove`, over synthetic audit reports:
  1. a HIGH advisory absent from the register → **red**;
  2. a register entry whose `expires` has passed → **red**, naming the entry;
  3. a register entry matching nothing in the report → **red** as stale;
  4. a register entry missing its reason or owner → **red**;
  5. a MODERATE advisory absent from the register → **green** (below the threshold);
  6. the register applied to the report it was written for → **green**, before and after.
- Case 1 is acceptance criterion 3 exactly: a *different* high advisory must still stop the
  build, so an entry cannot become a blanket exemption.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-gate-mirror.mjs
node scripts/verify-audit.mjs --prove
pnpm security
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

## Risks and open questions

- **`pnpm audit` needs the network.** Offline it fails, deliberately. On a runner that is
  fine; on a workstation it means the gate cannot be run before a flight, and that is the
  right trade for a check whose whole job is to know today's advisories.
- **An expiry is a promise to look again**, not a fix. If nobody looks, CI goes red on the
  expiry date — which is the intended and slightly annoying behaviour.
- **The reachability argument is mine, not a measurement.** It is written down so it can be
  disagreed with.

## Out of scope

- Changing the blocking threshold. High and Critical block; moderate and low are reported.
- SBOM-based or reachability-based scanning. A call-graph tool would answer "is this code
  reachable" properly; that is a different feature and a different budget.
- The moderate advisory. It does not block, and accepting things that are not blocking is
  how a register fills with noise.
