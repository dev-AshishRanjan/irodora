# Plan: F-137 — A blocked feature has to say what is blocking it, in a field

| | |
|---|---|
| **Feature** | F-137 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` — `scripts/`, `.harness/state/` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

**A feature that is `blocked` must say so in a way a machine can check.** Today it can say it in
prose, and prose in a state file rots without anything noticing — which is exactly what happened
to F-126, whose `blockedBy` named a feature that was already done while its own note said the
real blocker was something else entirely.

To a person: the next session reads `blocked` and needs to know *what would unblock it* without
taking the note's word for it.

## Approach

### What actually went wrong, and why fixing the instance made it worse

Gate 0's blockers check fires in **one direction only** — when a feature is
`in_progress`/`done`/`in_review` and a blocker is not `done`. A feature sitting at `blocked`
while every blocker is `done` is invisible to it. F-126 sat there for as long as both facts
existed.

Correcting F-126 by emptying its `blockedBy` traded a **wrong** machine-readable reason for
**no** machine-readable reason. That is not obviously better, and it is why this is a feature
rather than a one-line edit.

### `blocked` has three causes and the schema expresses two

| cause | field | example |
|---|---|---|
| a dependency is unfinished | `blockedBy` | the ordinary case |
| a question is unanswered | `openQuestions` | F-081 on OQ-6 |
| **an attested criterion elsewhere is outstanding** | **nothing** | F-126 on F-040 |

The third is not exotic. F-126 waits on F-040 — which is `done` and owes **four** outstanding
attestations — and there are 51 outstanding attested criteria across the release. A cause the
schema cannot express is a cause that ends up in prose.

So: a new optional field **`blockedByAttestation`**, an array of feature ids, each of which must
actually own an `attested` entry whose `status` is `outstanding`. That second half matters as
much as the first — it makes the field **self-cleaning**. When F-040's attestation is finally
discharged, the reference goes stale and the gate says so, instead of F-126 sitting blocked
against a debt somebody already paid.

**Reused:** `scripts/verify-state.mjs`'s existing `blockers` check and its `fail`/`pass`
reporting; the `attested` array ADR-0038 already defines; the `--prove` idiom.

**New:**

- `blockedByAttestation` in `.harness/state/schemas/feature_list.schema.json`
  (`additionalProperties: false`, so the schema must be told).
- Two checks in `verify-state.mjs`.
- `scripts/verify-blocked-reason-proof.mjs` — mutates a real feature list in memory.

**Increments:**

1. The schema field.
2. The two gate-0 checks.
3. The proof, wired into `lint`.
4. F-126 declares `blockedByAttestation: ["F-040"]`; the record and the feature status.

## Files to touch

```
.harness/state/schemas/feature_list.schema.json — the new field
scripts/verify-state.mjs                        — two checks in the `blockers` section
scripts/verify-blocked-reason-proof.mjs         — new. The refusals, mutated.
package.json                                    — the proof joins the lint chain
.harness/state/feature_list.json                — F-126's real reason; F-137's own status
.harness/state/progress.md                      — the entry
```

## Anticipated effects

| Contract | Dependents | Guard |
|---|---|---|
| **The feature schema gains a field.** `additionalProperties: false` means every writer of this file is affected | `feature_list.json`, anything reading it | `gate:state` — the schema is validated on every run |
| **`blocked` acquires a requirement.** Any future feature set to `blocked` without a reason now fails | every session that blocks a feature | `gate:state`, and this is the point |
| **`blockedByAttestation` couples two features' records.** Discharging an attestation on F-040 makes F-126's reference stale | the referenced feature's `attested` array | `gate:state` — the staleness check is half the feature |

No effect on the app, the engine or the corpus. Nothing in `content/` moves.

## Test plan

- **Unit / property:** none — this is a gate script, and `scripts/` is in no package, which is
  why every gate script here is checked by a `*-proof.mjs` beside it rather than by a suite.
- **Golden:** none. No colour value.
- **E2E:** none.
- **Negative, with decoys rather than empty fixtures:** the proof takes the **real**
  `feature_list.json` and mutates it in memory — a `blocked` feature stripped of every reason
  must be refused; a `blockedByAttestation` naming a feature with no outstanding attestation
  must be refused; a `blockedByAttestation` naming a feature that does not exist must be
  refused. **And the unmutated list must PASS first**, or a harness that cannot evaluate its
  subject reports every mutation as caught
  [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]].
  Plus the decoys in the other direction: F-081 (`openQuestions`) and an ordinary unmet
  `blockedBy` must both still be **accepted**, or the check is simply refusing everything.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-blocked-reason-proof.mjs
pnpm lint && pnpm format:check
```

`typecheck`, `test`, `build`: no TypeScript changes, but they run anyway since the repo is one
graph. `color-golden`, `cvd`, `a11y`, `contrast`, `e2e`, `perf`: nothing they cover is touched.

## Risks and open questions

- **A new required-ish rule can be satisfied by writing anything.** `blockedByAttestation` could
  be pointed at a feature that owes *some* unrelated attestation. The check cannot tell whether
  the attestation is the one that matters — it can only tell that a debt exists. Named rather
  than pretended away.
- **The rule applies to a status, not to a moment.** A feature set to `blocked` mid-session with
  the reason added a minute later will fail gate 0 in between. That is the intended cost.
- **No open questions.**

## Out of scope

- **Auditing the other status transitions.** `todo` versus `backlog` has no machine-readable
  distinction either, and that is a separate question nobody has asked yet.
- **Unblocking anything.** F-126 stays `blocked` — this makes its reason checkable, not absent.
- **A field for "blocked on a purchase"** (OQ-6 → F-081). `openQuestions` already covers it.
