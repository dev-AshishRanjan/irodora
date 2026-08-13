---
name: verify-gate
description: Run the verification gates in order, capture evidence, and report honestly which ran and which did not.
---

# Skill: verify-gate

Implements the [verification protocol](../../protocols/verification.md).

> Verification is the proof. Not prompting, not confidence, not reading the diff.

## Steps

### 1. Determine which gates apply

From [`gates.json`](../../verification/gates.json) and the feature's `verification` list.

| Changed | Also run |
|---|---|
| Colour engine | `color-golden`, cross-platform identity |
| Recommendation or separation | `cvd` |
| `content/` | `content` |
| Web or tokens | `a11y`, `contrast`, `web-perf` |
| A user-facing surface | `e2e` |
| An adapter | The port's conformance suite |

### 2. Run them in order. Stop at the first failure.

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

There is no value in knowing gate 6 fails when gate 1 already did — and running on past a
failure produces a confusing pile of downstream errors.

### 3. Capture the evidence

```
Gates run:  state ✓ · typecheck ✓ · lint ✓ · format ✓ · test ✓ (142 passed) · build ✓
NOT run:    e2e (no user-facing change) · color-golden (engine untouched)
Command:    pnpm typecheck && pnpm lint && pnpm test && pnpm build
Result:     green, 2m14s
```

Into [`progress.md`](../../state/progress.md).

**"NOT run" is the line that matters most.** It is the one a reviewer cannot reconstruct,
and the one most likely to be assumed away.

### 4. On failure — fix the cause

Never: skip a test · lower a threshold · weaken a gate · mark `done` on red · add an
allowlist entry to make a scan pass.

**A gate that errors is failing open.** If a gate cannot run, it is not passing. Treat an
execution failure as red, not as an absence of information.

## Independence

**Prefer the evaluator subagent.** A model evaluating its own work is systematically
generous — it knows what it intended, and reads the code as the intention rather than the
behaviour. The separation costs one invocation.

## Sanity checks on the gates themselves

Worth doing when you add or change one:

- **Can it fail?** Break the implementation deliberately and confirm it goes red. A green
  assertion that cannot go red is worse than no test.
- **Does it run the code?** A gate that passes without executing the change proves nothing.
- **Does it enumerate what it does not cover?** Knowing a gate's blind spots is part of
  knowing what it means.

## Anti-patterns

| Sounds like verification | Is not, because |
|---|---|
| "It compiles" | Layer 1 only |
| "The tests pass" | Which tests? Do they exercise this? |
| "I reviewed the diff" | Reading is not running |
| "It worked once" | Not reproducible, not recorded |
| "It's flaky, I re-ran it" | Flakiness is a defect, not weather |
| "Coverage is 95%" | Coverage measures execution, not assertion |
