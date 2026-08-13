# Plans

One plan per feature, written **before** any source is edited. The `state` gate refuses to
let a feature be `in_progress` without one.

```
F-0NN-<kebab-title>.md
```

From [`TEMPLATE.md`](TEMPLATE.md), via
[`plan-feature`](../skills/plan-feature/SKILL.md).

## Why plans are committed

A plan is the record of **what was intended**, which is the one thing the code cannot tell
you afterwards. Six months later, the difference between "this was designed this way" and
"this is what we ended up with" is the difference between a decision and an accident.

## Revising

Plans are revised as understanding improves — that is normal and expected.

**Record what changed and why, in the plan file.** A plan silently rewritten to match what
was built is not a plan; it is a description with a misleading filename, and it destroys the
only artefact that says what was intended.

## The section that earns it

**Anticipated effects.** Naming, before you start, which shared contracts a change might
touch — and the guard that will catch a violation — is what turns
[effect-link](../protocols/effect-link.md) from a post-hoc chore into something the design
already accounts for.
