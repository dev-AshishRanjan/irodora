# Command: plan

Write the plan for the claimed feature, before any source is edited.

## Procedure

1. **Confirm a feature is claimed.** If nothing is `in_progress`, run
   [`next-feature`](next-feature.md) first.

2. **Read** the feature's `requirements` in [`docs/PRD.md`](../../docs/PRD.md), its
   `acceptance` list, the ADRs it references, and the relevant architecture.

3. **Search the workspace** for what already exists. A plan whose "Reused" section is empty
   is almost always wrong.

4. **Consult [`effects.json`](../state/effects.json)** for links whose `from` this feature
   will touch.

5. **Follow [`plan-feature`](../skills/plan-feature/SKILL.md)** and write
   `.harness/plans/F-0NN-<kebab-title>.md` from
   [`TEMPLATE.md`](../plans/TEMPLATE.md).

6. **Validate:** `node scripts/verify-state.mjs` — the gate requires a plan file for any
   in-flight feature.

## Use the planner

For anything non-trivial, use the **planner** subagent and keep planning separate from
implementation. A plan written midway through implementing is a description, not a plan.

## The section that earns the plan

**Anticipated effects.** For each shared contract this might change, name the dependents and
the **guard** that will catch a violation. If there is no guard, building one is a task
inside this feature — not a note for later.
