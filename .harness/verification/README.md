# Verification

> Verification is the proof. Not prompting, not confidence, not reading the diff.

| File | Is |
|---|---|
| [`gates.json`](gates.json) | The gates: order, command, activation, and what each covers |
| [`checklist.md`](checklist.md) | The harness self-audit — is the harness itself working? |
| `evidence/` | Raw gate output. **Gitignored** — the *summary* of every run belongs in [`../state/progress.md`](../state/progress.md), which is committed |

Protocol: [`../protocols/verification.md`](../protocols/verification.md) ·
Skill: [`../skills/verify-gate/SKILL.md`](../skills/verify-gate/SKILL.md).

## Running

In order. Stop at the first failure.

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

Plus whichever apply: `test:golden` · `test:cvd` · `test:content` · `test:e2e` ·
`test:a11y` · `test:contrast` · `test:perf` · `bench`.

## Activation

A gate activates with the feature that makes it meaningful — **never earlier** (a gate that
cannot fail teaches nothing) and **never later** (a gate added after the fact finds a
backlog instead of a regression). Recorded per gate as `activatesWith`.

Today only gate 0 (`state`) is active. It is not a placeholder: it validates the schemas,
the effect graph, the memory index, requirement traceability, the ADR index, the CI mirror,
the env contract, and the golden-rule scan.

## Three properties every gate must have

**It can fail.** Break something deliberately and watch it go red. A green assertion that
cannot go red is worse than no test — it occupies the space where a real check would go.

**It runs the code.** A gate that passes without executing the change proves nothing.

**Its blind spots are known.** Knowing what a gate does *not* cover is part of knowing what
its green means.

## Never

Disable a gate to unblock a merge. Lower a threshold to go green. Quarantine a flaky gate
without a tracked feature. Report a gate as passing that you did not run.

A gate that is genuinely wrong is changed **deliberately**, with an ADR
([`../governance/policy-model.md`](../governance/policy-model.md)).
