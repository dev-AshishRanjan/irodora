# Observations

Harness gaps noticed but not yet fixed. Captured by
[`skill-observer`](../skills/skill-observer/SKILL.md) while working.

An entry here is a debt, not a note. It should either become a fix, a `backlog` feature, or
be deleted as no longer true.

| Date | Observation | Kind | Status |
|---|---|---|---|
| 2026-08-13 | `verify-state.mjs` implements a JSON Schema **subset**. Unsupported keywords are reported as warnings rather than silently passed, so the schemas cannot quietly outgrow the validator — but constraints using them are not enforced. Once F-001 lands and dependencies exist, this should move to `ajv` against the same committed schemas. | gate blind spot | open |
| 2026-08-13 | The env-contract check (`.env.example` ↔ `IRODORA_*` reads) cannot run until `packages/config` exists. It reports as "config package not yet present" rather than passing silently — but the contract is unverified until F-001. | gate not yet active | open |
| 2026-08-13 | `E-009` (rule weights) carries `guard: "none"` with `feature: F-029`. The graph is honestly reporting a check we owe. It closes when F-029 builds publish-time weight validation. | missing guard | open |
| 2026-08-13 | The claims copy lint (NFR-21) is specified but not implemented until F-025. Until then, claims discipline in copy, comments and identifiers rests on review — which is exactly the mechanism [ADR-0031](../../docs/adr/0031-measurement-claims-policy.md) says fails under launch pressure. | gate not yet active | open |

## How to use this file

**Record when:** it would recur · it cost real time · it is fixable · the fix is durable.

**Do not record** every friction. Sometimes the task was genuinely hard, and a list that
includes those stops being read.

## The one that gets acted on immediately

> **A gate passed while something was broken.**

That is not an observation for later. It means the gate is theatre, and everything
downstream of it is unverified while appearing verified. Confirm it by constructing the
broken input and watching the gate go green, fix the gate, then **replay the original miss
through the fixed gate** to prove it now goes red.
