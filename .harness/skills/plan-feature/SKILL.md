---
name: plan-feature
description: Write the plan for a feature before any source is edited — approach, reuse, anticipated effects, test plan, gates.
---

# Skill: plan-feature

Plan before code is a golden rule and a gate condition. A feature cannot be `in_progress`
without a plan file.

## Why it is separate from implementing

A plan written while implementing is a **description**, not a plan. Its job is to be wrong
early and cheaply — the value is in discovering, before you have written anything, that the
approach touches a contract you did not expect.

Use the **planner** subagent for non-trivial work. A different role carries a different
bias, and the planner's bias is toward finding the problem rather than toward finishing.

## Steps

### 1. Read

The feature's `requirements` in [`docs/PRD.md`](../../../docs/PRD.md), its `acceptance`
list, the ADRs it references, and the relevant architecture.

### 2. Find what already exists

**Search the workspace before designing anything new.** Which package, port or utility
already does part of this?

A plan whose "Reused" section is empty is almost always wrong — and in `packages/color-*` a
second implementation of anything is a defect by definition.

### 3. Design the increments

A sequence of small, independently verifiable steps, each leaving the build green.

If a step cannot be verified on its own, it is too large — split it until each one can.

### 4. Anticipate the effects

**This is the section that earns the plan.**

What shared contracts might this change? Consult
[`effects.json`](../../state/effects.json) for existing links whose `from` you are about to
touch.

For each anticipated effect, name the **guard** — the gate, test or lint rule that will
catch a violation. If there is no guard, that is a task inside this feature, not a note for
later.

### 5. Plan the tests

Which method answers which question
([testing rules](../../rules/common/testing.md)):

- correctness against reality → **golden dataset**, with its citation;
- consistency everywhere → **property test**;
- interchangeability → **conformance suite**;
- does the assembled thing work → **e2e**.

Include the **negative** tests — and remember a negative test needs a decoy, not an empty
fixture.

### 6. Name the gates

Exactly which gates apply, and what evidence you will capture.

### 7. Write it

From [`TEMPLATE.md`](../../plans/TEMPLATE.md), to
`.harness/plans/F-0NN-<kebab-title>.md`.

## Quality

| A weak plan | A useful plan |
|---|---|
| "Implement the colour conversion functions" | Names the transforms, the golden sources, and the near-black cutoff case |
| "Anticipated effects: none" | Names the contracts, their dependents, and the guard for each |
| "Test it thoroughly" | Names the method per question, and the negative case |
| "Reuse: n/a" | Names the package, port or utility, with its path |

## Revising

Plans are revised as understanding improves. **Record what changed and why** in the plan
file — a plan silently rewritten to match what was built is not a plan, and it destroys the
one artefact that says what was intended.
