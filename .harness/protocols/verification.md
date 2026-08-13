# Protocol: Verification

**Trigger:** before declaring anything done.

> **Verification is the proof. Not prompting, not confidence, not reading the diff.**

Agents declare victory early, systematically. It is not carelessness — it is that
completion is judged from local signals (the code compiles, the unit test passes) while the
failures that matter are global (interfaces mismatched, state not propagating, the thing
never actually ran).

This protocol exists to move the completion judgement out of the agent and into the harness.

---

## The gates

Defined in [`../verification/gates.json`](../verification/gates.json). **Run in order. Stop
at the first failure.**

| # | Gate | Command | Required for |
|---|---|---|---|
| 0 | `state` | `node scripts/verify-state.mjs` | **always** |
| 1 | `typecheck` | `pnpm typecheck` | any code |
| 2 | `lint` | `pnpm lint` | any code |
| 3 | `format` | `pnpm format:check` | any code |
| 4 | `test` | `pnpm test` | any code |
| 5 | `color-golden` | `pnpm test:golden` | colour engine |
| 6 | `build` | `pnpm build` | any code |
| 7 | `e2e` | `pnpm test:e2e` | user-facing |
| 8 | `a11y` | `pnpm test:a11y` | web |
| 9 | `contrast` | `pnpm test:contrast` | web, tokens |
| 10 | `cvd` | `pnpm test:cvd` | engine, recommendations |
| 11 | `content` | `pnpm test:content` | corpus changes |
| 12 | `perf` | `pnpm bench` | release |
| 13 | `web-perf` | `pnpm test:perf` | web |
| 14 | `e2e-full` | `pnpm test:e2e:full` | release |
| 15 | `security` | secret scan, dependency audit | always |

Gates activate with the feature that makes them meaningful — never earlier (a gate that
cannot fail teaches nothing) and never later (a gate added after the fact finds a backlog
instead of a regression). Activation is recorded in `gates.json`.

---

## Three layers, and why unit tests are not enough

**Layer 1 — static.** Typecheck, lint, format. The minimum. Proves the code is well-formed
and nothing else.

**Layer 2 — runtime.** Tests, golden datasets, build. Proves the code runs and produces the
expected values.

**Layer 3 — system.** e2e, e2e-full, a11y, perf. Proves the assembled thing works.

> **Passing unit tests ≠ task complete.** Mocked dependencies hide exactly the failures
> that matter: schema mismatches, interface drift, configuration that is wrong only in a
> real environment. Slice tests agree with each other's mocks, not with reality.

---

## Evidence

Recorded against the feature and in [`../state/progress.md`](../state/progress.md):

```
Gates run:  state ✓ · typecheck ✓ · lint ✓ · format ✓ · test ✓ (142 passed) · build ✓
Not run:    e2e (no user-facing change) · color-golden (engine untouched)
Command:    pnpm typecheck && pnpm lint && pnpm test && pnpm build
Result:     green, 2m14s
```

**"Not run" is as important as "run."** It is what a reviewer cannot reconstruct, and it is
what golden rule 11 requires of your own reporting. A report listing six green gates when
four ran is a false claim about verification, which is the same category of dishonesty as a
false claim about accuracy.

**No evidence ⇒ not done.**

---

## On failure

**Fix the root cause.** Never:

- skip or delete a test;
- lower a threshold;
- weaken or disable a gate;
- mark `done` on red;
- add an allowlist entry to make a scan pass.

A gate that is genuinely wrong is changed **deliberately**, with an ADR, and the change is
recorded. A flaky gate is fixed or quarantined with a tracked feature — never silently
removed.

> **A gate that errors is failing open.** If a gate cannot run, it is not passing. Treat an
> execution failure as a red result, not as an absence of information.

---

## Independence

**Prefer the evaluator subagent** ([`../../.claude/agents/evaluator.md`](../../.claude/agents/evaluator.md)).

A model evaluating its own work is systematically generous — it knows what it intended, and
reads the code as the intention rather than as the behaviour. The separation costs one
invocation and is the highest-value guardrail in this harness.

---

## Anti-patterns

| Looks like verification | Is not, because |
|---|---|
| "It compiles" | Layer 1 only |
| "The tests pass" | Which tests? Do they exercise the change? |
| "I reviewed the diff" | Reading is not running |
| "It worked when I tried it once" | Not reproducible, not recorded |
| "The gate is flaky, I re-ran it" | Flakiness is a defect, not weather |
| "Coverage is 95%" | Coverage measures execution, not assertion |
| A green assertion that cannot go red | Prove it fails against a broken input |
