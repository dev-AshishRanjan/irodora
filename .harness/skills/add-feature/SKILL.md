---
name: add-feature
description: Build one Irodora feature end to end — claim, plan, implement, verify, trace effects, record, clean. The canonical procedure.
---

# Skill: add-feature

The one procedure for building a feature. Everything else is a step inside it.

## Preconditions

- [initialization](../../protocols/initialization.md) has run this session.
- **Nothing else is `in_progress`.** `wip_limit: 1`, enforced by the `state` gate.
- `node scripts/verify-state.mjs` is green.

## Steps

### 1. Claim

In [`feature_list.json`](../../state/feature_list.json), take the lowest-id eligible
feature for the current release with every `blockedBy` `done`. Set `status: "in_progress"`.

→ [`/next-feature`](../../commands/next-feature.md)

### 2. Understand the scope

Read the feature's `requirements` in [`docs/PRD.md`](../../../docs/PRD.md), the ADRs it
references, and the architecture sections it touches.

**The `acceptance` list is the contract. Nothing more, nothing less.** Extra scope is as
much a failure as missing scope — it is work nobody reviewed against a requirement.

### 3. Plan

[`plan-feature`](../plan-feature/SKILL.md). Use the **planner** subagent for anything
non-trivial, and keep planning separate from implementation.

The `state` gate refuses to let a feature be `in_progress` without a plan file.

### 4. Implement

Small, verifiable increments. Follow [`rules/`](../../rules/) and the scoped `AGENTS.md`
for whatever you are touching.

- **Search before you write.** The utility probably exists.
- Tests alongside, or first.
- **Green between increments**, not only at the end.
- No unrelated refactors. Note them; move on.

Colour engine work has extra obligations —
[`color-math`](../color-math/SKILL.md). Corpus work —
[`corpus-entry`](../corpus-entry/SKILL.md).

### 5. Verify

[`verify-gate`](../verify-gate/SKILL.md). Prefer the **evaluator** subagent.

Only a passing run with captured evidence counts. **Fix causes; never weaken a gate.**

### 6. Trace effects

[`effect-trace`](../effect-trace/SKILL.md). Update `effects.json` **and** its memory notes.
Every critical link names its guard.

Handle or record every dependent. **A known break is never left unrecorded.**

### 7. Record and close

- `progress.md` — what changed, gates run, **gates not run**, evidence, decisions.
- `feature_list.json` — `done` or `in_review`.
- Lessons — [`continuous-learning`](../continuous-learning/SKILL.md), if reusable and
  non-obvious.
- Docs and ADRs — if a decision was made or a contract changed.
- [`clean-finish`](../clean-finish/SKILL.md).

## Done

Only when [definition-of-done](../../protocols/definition-of-done.md) is satisfied in full.
Any failure leaves it `in_progress`.

## The two most common failures

**Declaring done on Layer 1.** It compiles and the unit tests pass, so it must work. It
does not follow — mocked dependencies hide exactly the failures that matter.

**Scope creep dressed as thoroughness.** "I also fixed…" means the review now covers two
changes, one of which nobody asked for and nobody specified acceptance criteria for.
