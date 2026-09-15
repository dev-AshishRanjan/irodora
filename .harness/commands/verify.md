# Command: verify

Run the verification gates and capture the evidence.

## Procedure

1. **Determine which gates apply** — from
   [`gates.json`](../verification/gates.json) and the feature's `verification` list.

2. **Run in order. Stop at the first failure.**

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
# plus, as applicable:
pnpm test:golden      # colour engine changed
pnpm test:cvd         # recommendation or separation changed
pnpm test:content     # content/ changed
pnpm test:e2e         # user-facing
pnpm test:a11y && pnpm test:contrast   # web
```

3. **Capture the evidence** into [`progress.md`](../state/progress.md):

```
Gates run:  state ✓ · typecheck ✓ · lint ✓ · format ✓ · test ✓ (142 passed) · build ✓
NOT run:    e2e (no user-facing change) · color-golden (engine untouched)
Command:    <exactly what was run>
Result:     green, 2m14s
```

4. **On failure — fix the root cause.** Never skip a test, lower a threshold, weaken a gate,
   or mark `done` on red.

## Use the evaluator — once

Use the **evaluator** subagent so the checker is not the implementer, and **use it once per
feature**. Its brief asks for every finding in that one pass, classified blocking, significant and
minor. After it reports, the implementer fixes each finding inside the feature or records it as a
`backlog` feature, re-runs the gates, and records the evidence. **There is no second review round** —
a loop of review, fix, review has no exit, and it cost F-219 six rounds before the user ruled it out
(2026-09-15). A finding that can be neither fixed nor recorded stops the loop for the user.

## Reporting

**Say what did not run.** It is the line a reviewer cannot reconstruct, and the one most
likely to be assumed away.

**A gate that errors is failing open.** An execution failure is red, not an absence of
information.
