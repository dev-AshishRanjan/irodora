# Plan: F-004 — CI/CD pipeline and gate wiring

| | |
|---|---|
| **Feature** | F-004 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-14, NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | root — `.github/workflows/`, `scripts/`, `.changeset/` |
| **Author** | Claude Code (generator role) |
| **Date** | 2026-08-14 |

---

## Intent

Make the gates run where it matters and make the wiring itself checkable. `gates.json` is the
declaration; `ci.yml` is the execution; the mirror between them is what stops a gate from
being believed in while not running. F-004's real deliverable is that **the mirror check has
been watched fail**, per gate, rather than assumed to work.

## What the investigation found before any code

Two defects in the existing wiring, both found by enumerating rather than reading:

**1. The mirror check matches substrings, so it is weaker than it reads.** `verify-state.mjs`
asks `ci.includes(gate.command)`. Gate `test`'s command is `pnpm test`, which is a substring
of eight lines in `ci.yml`:

```
 4 test    command="pnpm test"
         line  73 | run: pnpm test          ← the real step
         line  77 | run: pnpm test:golden
         line  93 | run: pnpm test:e2e
         line  97 | run: pnpm test:contrast
         … and four more
```

**Deleting the actual `pnpm test` step leaves the mirror check green.** Gate `e2e` has the
same hole via `pnpm test:e2e:full`. This is precisely the failure gate 0 exists to prevent,
sitting inside gate 0.

**2. Gate 15's command does not appear in CI at all.** `security` declares
`pnpm security:secrets`; the workflow runs `gitleaks/gitleaks-action@v2`. The moment gate 15
activates — which is *this feature* — the mirror check fails. That is the check working. The
fix is to make CI run the same command a developer runs, not to special-case the gate.

## Approach

**Reused:** `scripts/verify-guards.mjs`'s philosophy and output format — write the violation,
assert the check fires, restore in a `finally`. This feature applies it to the workflow file
instead of to ESLint. `verify-state.mjs`'s existing mirror logic, corrected rather than
replaced.

**New:**

```
scripts/verify-gate-mirror.mjs   removes each active gate's step from ci.yml in turn and
                                 asserts gate 0 fails naming that gate. Restores always.
.changeset/config.json           release tooling for the publishable packages
```

**Changed:** the mirror comparison in `verify-state.mjs` (whole `run:` command, not
substring) · `ci.yml` (secret scan runs `pnpm security:secrets`; ordering comment) ·
`gates.json` (gate 15 → active, only if it has been executed).

### Increments

| # | Step | Verified by |
|---|---|---|
| 1 | Correct the mirror comparison to whole-command matching | gate 0 still green; gate `test` now matches exactly one line |
| 2 | `verify-gate-mirror.mjs` — per-gate removal proof | every active gate's removal observed to fail |
| 3 | CI runs `pnpm security:secrets` for the secret scan, so local and CI are one command | mirror check green with gate 15 active |
| 4 | Changesets for the publishable packages | `pnpm changeset status` runs |
| 5 | Activate gate 15 — **only if it has been executed and seen to pass** | see the open question below |
| 6 | Record: progress, effects, feature list | gate 0 |

## Files to touch

```
scripts/verify-state.mjs           — whole-command mirror match, not substring
scripts/verify-gate-mirror.mjs     — NEW, the per-gate removal proof
.github/workflows/ci.yml           — secret scan via pnpm security:secrets; audit level
.changeset/config.json             — NEW
package.json                       — verify:mirror script; changeset scripts
.harness/verification/gates.json   — gate 15 status, if it can be run
.harness/state/progress.md         — the entry
```

## Anticipated effects

| Effect | Dependents | Guard |
|---|---|---|
| **The mirror comparison changes.** A stricter match could newly fail a gate that was passing on a false positive. | every active gate | Gate 0 itself, run before and after. `test` and `e2e` are the two that were matching falsely; both must still resolve to their real step. |
| **Gate 15 activates** ⇒ CI gains a required job ⇒ branch protection must require it. | `.github` settings | None available — see below. |
| **`verify-state.mjs` is edited**, and it is the guard named by several effect links. | the whole effect graph | Gate 0 must pass, and `verify-gate-mirror.mjs` now proves one of its checks can fail. This feature strengthens gate 0; it must not weaken it. |

No `E-###` link has `scripts/` as its `from`. Worth noting rather than passing over: **gate 0
is the guard for other links and has no link of its own.** Recorded as an observation.

## Test plan

- **Mutation, per gate:** remove each active gate's `run:` step from `ci.yml`, assert
  `verify-state.mjs` exits non-zero AND names that gate. This is the acceptance criterion
  stated as an executable check. Restore in a `finally`, and assert the file is byte-identical
  afterwards.
- **Regression on the substring defect:** assert gate `test` resolves to exactly one step, so
  the old false positive cannot return.
- **Negative, with a decoy:** the `security` gate's command must not be considered mirrored by
  a *comment* mentioning it. A comment is the realistic near-miss here — the file is heavily
  commented and every gate is named in prose.
- `pnpm audit --audit-level high` — confirm it blocks on High and Critical, and observe what
  it reports today.

## Verification

```
node scripts/verify-state.mjs      # gate 0
node scripts/verify-gate-mirror.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm security:secrets              # gate 15 — see the open question
```

## Risks and open questions

1. **There is no git remote.** `git remote -v` is empty. Acceptance criterion 3 — *"branch
   protection requires all checks, one review, and linear history"* — is a setting on a
   GitHub repository that does not exist. It cannot be delivered here, and creating a remote
   repository is an outward-facing act that is not mine to take unasked. **Delivered as
   documented configuration; the applying is the user's.**
2. **gitleaks is not installed on this workstation.** `pnpm security:secrets` therefore
   cannot be executed locally. Activating gate 15 without having run it is exactly the
   theatre F-001 refused — it activated gates 1–4 and 6 only after seeing them pass. So gate
   15 stays `pending` unless gitleaks can be installed, and that is a question for the user
   rather than a silent `brew`/`go install`.
3. **The stricter mirror match may reveal a gate that was only ever passing falsely.**
   That is the point, but it means gate 0 could go red mid-increment. It is a finding, not a
   regression, and gets fixed rather than loosened.

## Out of scope

- Deployment workflows — F-005.
- The claims copy lint — F-025, though its gate slot exists.
- Actually publishing any package. Changesets is configured, not run.
- Creating a GitHub repository, or changing settings on one.
