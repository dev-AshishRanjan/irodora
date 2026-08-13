---
name: clean-finish
description: End a session so the next one starts from a known-good state — build green, state recorded, no scaffolding left behind.
---

# Skill: clean-finish

Implements [clean-state](../../protocols/clean-state.md).

> A session is complete when task verification passes **and** the clean-state checks pass.
> Either alone is not completion.

## Steps

### 1. Verify

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Green — **including the tests that were passing before you started.** A regression you
introduced and did not notice is worse than a feature you did not finish.

### 2. Record progress

```
## YYYY-MM-DD — F-0NN <title>

Done:       <complete>
In flight:  <half-finished, and how far>
Gates:      <ran: … / NOT run: …>
Decisions:  <what, and why>
Next:       <the single next concrete action>
```

### 3. Update state

`feature_list.json` status. Effects traced if a shared contract moved. Lessons captured.

### 4. Remove the scaffolding

- Debug logging.
- Commented-out code — git remembers; the file should not.
- Stray `TODO` without a tracked feature.
- Temporary files, scratch scripts, `.bak`.
- `@ts-expect-error` or lint suppression without a reason and a follow-up.

**Why now and not later:** the next session cannot distinguish deliberate code from
temporary scaffolding. Faced with an unfamiliar `console.log`, removing it risks breaking
something load-bearing, so it stays — and then the session adds its own. Entropy has a
positive feedback loop, and the loop closes within about three sessions.

### 5. Check git

Clean, or **intentionally** staged with the intent recorded in `progress.md`. Commit
verified increments ([`commit-policy`](../../governance/commit-policy.md)). **Never push
without being asked.**

### 6. Confirm the start path

The documented start still works from a clean clone. If you changed setup, you changed
[`local.md`](../../../docs/operations/deployment/local.md) too.

## If you cannot reach a clean state

Sometimes you cannot — mid-refactor, out of context. Then **describe the mess precisely**:

```
## Handoff — YYYY-MM-DD  ⚠ NOT CLEAN

State:     packages/color-spaces mid-refactor; xyz.ts converted, lab.ts NOT
Broken:    pnpm test fails — 4 tests in lab.test.ts, expected during transition
Next:      convert lab.ts to the same signature, then re-run
Do NOT:    revert xyz.ts — the new signature is correct, effects.json is updated
```

**An honestly-described mess is recoverable. A silently-broken tree is not.** The thing
this protocol most wants to prevent is not untidiness — it is the next session burning half
its context reconstructing what happened.

## Checklist

```
[ ] verify-state green          [ ] progress.md updated
[ ] typecheck, lint green       [ ] feature status current
[ ] tests green, no regression  [ ] effects traced if needed
[ ] build green                 [ ] lessons captured
[ ] no debug code               [ ] git clean or intentional
[ ] no stray TODO               [ ] start path works
```
