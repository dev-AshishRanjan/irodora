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
| 2026-08-14 | `verify-state.mjs` only checks path existence for effect nodes whose `kind` is `file`, `symbol`, `test`, `artifact` or `content`. Nodes of kind `contract`, `package`, `module`, `doc` and `decision` are never checked, so their `exists` flag is bookkeeping with no enforcement — `E-004.from.exists: true` is a claim the gate does not verify. Found while closing F-002. | gate blind spot | open |
| 2026-08-14 | **Gate 0 is the named guard for several effect links and has no link of its own.** Nothing in `effects.json` has `scripts/` as a `from`, so editing `verify-state.mjs` — which F-004 did — traces to no dependents even though every guarded link depends on it. `verify-gate-mirror.mjs` now covers one of its checks; the other twelve are unproven. | missing guard | open |
| 2026-08-14 | Branch protection (F-004 acceptance 3) is specified in `docs/operations/branch-protection.md` but **not applied** — there is no git remote. Until it is, the gates can be observed and ignored. Closes when a repository exists and the settings are applied. | not applied | open |
| 2026-08-14 | A package's `typecheck` reads its dependencies' built `.d.ts`, so the ADR-0036 identity assertions only see engine-side drift **after a rebuild**. `pnpm typecheck` is sound because turbo's task declares `dependsOn: ["^build"]`; a bare `npx tsc -p packages/contracts/tsconfig.json` is not, and passes on drift. Anyone verifying a cross-package type pin by hand needs to build first. | verification footgun | open |

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
