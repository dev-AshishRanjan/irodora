# Workflow

The loop, in operational detail. The summary is in [`../../AGENTS.md` §2](../../AGENTS.md).

```
initialize → select → plan → implement → verify → trace effects → record → clean
```

---

## 1. Initialize

[`protocols/initialization.md`](../protocols/initialization.md). Never skip it, and never
substitute "I remember this project" — you do not, and the state may have moved.

## 2. Select

One feature. The lowest-id eligible item for the current release with every `blockedBy`
`done`.

```bash
# /next-feature
```

Set `status: "in_progress"`. **If something is already `in_progress`, finish it.** The WIP
limit is 1 and the `state` gate enforces it.

**Why WIP=1 is a hard limit and not a preference.** Context capacity split across `k`
simultaneous tasks gives each `C/k`. Below a threshold, none of them completes. "Do less
but finish" measurably outperforms "do more and leave half-done" — and the failure mode of
the alternative is a repository full of nearly-working code that nobody can verify.

## 3. Plan

[`skills/plan-feature`](../skills/plan-feature/SKILL.md), from
[`plans/TEMPLATE.md`](../plans/TEMPLATE.md).

A plan states: intent · approach · what is **reused** · files to touch · **anticipated
effects** · test plan · gates to run · risks.

Use the **planner** subagent for anything non-trivial, and keep planning separate from
implementation. A plan written by the agent midway through implementing is a description,
not a plan.

## 4. Implement

Small, verifiable increments. Rules in [`rules/`](../rules/), plus the scoped `AGENTS.md`
for whatever you are touching.

- **Search before you write.** The utility probably exists. Reuse beats re-implementation,
  and a second implementation of anything in `packages/color-*` is a defect by definition.
- **Tests alongside or first.**
- **Keep typecheck, lint and tests green between increments** — not only at the end. A
  green build is a place you can return to; a red one is not.
- **No unrelated refactors.** Note them, and move on. "While I'm here" is how a
  three-file change becomes a thirty-file review nobody can assess.

## 5. Verify

[`skills/verify-gate`](../skills/verify-gate/SKILL.md). Gates in order, stop at the first
failure.

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

Prefer the **evaluator** subagent. A model grading its own work is systematically generous;
the separation costs one invocation.

**On failure: fix the root cause.** Never skip a test, lower a threshold, weaken a gate, or
mark `done` on red. A gate that is genuinely wrong is changed deliberately with an ADR.

## 6. Trace effects

[`skills/effect-trace`](../skills/effect-trace/SKILL.md). Required whenever a shared
contract changed: a port, an exported type, a package's public API, a database schema, an
HTTP contract, a config schema, or anything in `content/`.

Update **both** [`effects.json`](../state/effects.json) and its paired note in
[`memory/effects/`](../memory/effects/). Every link names its guard.

## 7. Record

- `progress.md` — what changed, which gates ran, what the evidence was, what was decided.
- `feature_list.json` — `done` or `in_review`.
- Lessons — [`skills/continuous-learning`](../skills/continuous-learning/SKILL.md), if
  reusable and non-obvious.
- Docs and ADRs — if a decision was made or a contract changed.

## 8. Clean

[`protocols/clean-state.md`](../protocols/clean-state.md). The next session — which may be
a different agent, or you with no memory of this one — must be able to start from files
alone.

---

## Working notes

**Read state rather than guessing.** `feature_list.json`, `progress.md` and `effects.json`
are current. Your recollection is not.

**Ask when the answer changes what you build.** Not for choices with an obvious default —
make those, state them, and move on.

**Say what you did not verify.** A report that lists five gates when four ran is worse than
one that lists four and says the fifth was skipped. This is golden rule 11 applied to your
own output.

**When a session is running long**, use
[`skills/strategic-compact`](../skills/strategic-compact/SKILL.md) — write state to files
*before* context pressure forces a rushed finish, not after.
