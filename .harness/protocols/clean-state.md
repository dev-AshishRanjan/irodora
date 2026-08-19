# Protocol: Clean State

**Trigger:** the end of every session, and every checkpoint.

> A session is complete when the task verification passes **and** the clean-state checks
> pass. Either alone is not completion.

---

## Why immediately, and not later

Deferred cleanup fails systematically, for a specific reason: **the next session cannot
distinguish deliberate code from temporary scaffolding.**

Faced with an unfamiliar `console.log`, a commented block, or a half-written helper, the
next session leaves all of it — the cost of removing something that turns out to be
load-bearing is higher than the cost of ignoring it. Then it adds its own. Entropy has a
positive feedback loop, and the loop closes within about three sessions.

---

## The five dimensions

### 1. Build integrity

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Green. The next session must not inherit a broken build — a session that starts red spends
its first hour deciding whether it caused the redness.

### 2. Tests

```bash
pnpm test
```

All passing, **including the ones that were passing before you started**. A regression you
introduced and did not notice is worse than a feature you did not finish.

### 3. Progress recorded

[`../state/progress.md`](../state/progress.md):

```
## YYYY-MM-DD — F-0NN <title>

Done:       <what is genuinely complete>
In flight:  <what is half-finished, and how far>
Gates:      <ran: … / NOT run: …>
Decisions:  <anything non-obvious, and why>
Next:       <the single next concrete action>
```

[`../state/feature_list.json`](../state/feature_list.json): status current.

### 4. Artefacts cleaned

- No debug logging left in.
- No commented-out code. Git remembers; the file should not.
- No stray `TODO` without a tracked feature or issue.
- No temporary files, scratch scripts, or `.bak`.
- No `@ts-expect-error` or lint suppression without a reason and a tracked follow-up.
- No secret, anywhere. `gitleaks` is the check; your memory is not.

### 5. Startup still works

The documented start path works from a clean clone. If you changed setup, you changed
the [README](../../README.md)
too.

---

## Exit checklist

```
[ ] node scripts/verify-state.mjs      green
[ ] pnpm typecheck && pnpm lint        green
[ ] pnpm test                          green, no regressions
[ ] pnpm build                         green
[ ] progress.md                        updated
[ ] feature_list.json                  status current
[ ] effects traced                     if a shared contract moved
[ ] lessons captured                   if anything reusable was learned
[ ] no debug code, no stray TODO       checked
[ ] git status                         clean, or intentionally staged with intent recorded
[ ] standard start path                works
```

---

## Git

The tree is clean, or **intentionally** staged with the intent recorded in `progress.md`.
"I left some changes uncommitted" without saying what or why is not a clean state.

Commit verified increments per
[`../governance/commit-policy.md`](../governance/commit-policy.md). **Never push without
being asked.**

---

## If you cannot reach a clean state

Sometimes you cannot — you are mid-refactor and out of context. Then **record the mess
precisely**:

```
## Handoff — YYYY-MM-DD  ⚠ NOT CLEAN

State:     packages/color-spaces mid-refactor; xyz.ts converted, lab.ts NOT
Broken:    pnpm test fails — 4 tests in lab.test.ts, expected during transition
Next:      convert lab.ts to the same signature, then re-run
Do NOT:    revert xyz.ts — the new signature is correct and effects.json is updated
```

**An honestly-described mess is recoverable. A silently-broken tree is not.** The failure
this protocol most wants to prevent is not untidiness — it is the next session spending
half its context reconstructing what happened.
