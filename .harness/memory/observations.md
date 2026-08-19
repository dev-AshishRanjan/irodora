# Observations

Harness gaps noticed but not yet fixed. Captured by
[`skill-observer`](../skills/skill-observer/SKILL.md) while working.

An entry here is a debt, not a note. It should either become a fix, a `backlog` feature, or
be deleted as no longer true.

| Date | Observation | Kind | Status |
|---|---|---|---|
| 2026-08-13 | `verify-state.mjs` implements a JSON Schema **subset**. Unsupported keywords are reported as warnings rather than silently passed, so the schemas cannot quietly outgrow the validator — but constraints using them are not enforced. Once F-001 lands and dependencies exist, this should move to `ajv` against the same committed schemas. | gate blind spot | open |
| 2026-08-13 | The env-contract check (`.env.example` ↔ `IRODORA_*` reads) cannot run until `packages/config` exists. It reports as "config package not yet present" rather than passing silently — but the contract is unverified until F-001. | gate not yet active | **closed 2026-08-19** — `packages/config` went with the server tier (ADR-0051), which would have left this check scoped to a missing directory and passing by finding nothing. It now scans the whole workspace, so an empty result is a real result. |
| 2026-08-13 | `E-009` (rule weights) carries `guard: "none"` with `feature: F-029`. The graph is honestly reporting a check we owe. It closes when F-029 builds publish-time weight validation. | missing guard | open |
| 2026-08-13 | The claims copy lint (NFR-21) is specified but not implemented until F-025. Until then, claims discipline in copy, comments and identifiers rests on review — which is exactly the mechanism [ADR-0031](../../docs/adr/0031-measurement-claims-policy.md) says fails under launch pressure. | gate not yet active | open |
| 2026-08-14 | `verify-state.mjs` only checks path existence for effect nodes whose `kind` is `file`, `symbol`, `test`, `artifact` or `content`. Nodes of kind `contract`, `package`, `module`, `doc` and `decision` are never checked, so their `exists` flag is bookkeeping with no enforcement — `E-004.from.exists: true` is a claim the gate does not verify. Found while closing F-002. | gate blind spot | open |
| 2026-08-14 | **Gate 0 is the named guard for several effect links and has no link of its own.** Nothing in `effects.json` has `scripts/` as a `from`, so editing `verify-state.mjs` — which F-004 did — traces to no dependents even though every guarded link depends on it. `verify-gate-mirror.mjs` now covers one of its checks; the other twelve are unproven. | missing guard | open |
| 2026-08-14 | Branch protection (F-004 acceptance 3) is specified in `docs/operations/branch-protection.md` but **not applied** — there is no git remote. Until it is, the gates can be observed and ignored. Closes when a repository exists and the settings are applied. | not applied | open |
| 2026-08-14 | A package's `typecheck` reads its dependencies' built `.d.ts`, so the ADR-0036 identity assertions only see engine-side drift **after a rebuild**. `pnpm typecheck` is sound because turbo's task declares `dependsOn: ["^build"]`; a bare `npx tsc -p packages/contracts/tsconfig.json` is not, and passes on drift. Anyone verifying a cross-package type pin by hand needs to build first. | verification footgun | open |
| 2026-08-19 | **F-071 is DONE, and its own record understated the third defect by a factor of 2,000.** The notes said `oklab.test.ts` overshot its `1e-12` tolerance by "25 percent". Measured over 2,000,000 cases the worst error is `5.422e-8` — a factor of 54,000. It had been green only because 5,000 unseeded samples almost never reach the tail, which is precisely what makes a recorded flake dangerous: the number in the record came from the one failure someone happened to see, not from a measurement. Settled by [ADR-0052](../../docs/adr/0052-oklab-round-trip-tolerance-is-conditioned-on-lms.md). | wrong record | **closed 2026-08-19** |
| 2026-08-19 | The **error-code enum still carries seven codes nothing can raise**: `unauthorized`, `entitlement_required`, `idempotency_key_required`, `idempotency_key_conflict`, `invalid_cursor`, `rate_limited`, `service_unavailable`. All are HTTP concepts retired with the server tier (ADR-0051). It is deliberately NOT revised yet: the enum is closed and versioned, and the codes a local-first app actually needs (`storage_unavailable`, `import_invalid`, `corpus_digest_mismatch`, `migration_failed`) should be written by the code that raises them, not invented ahead of it. Inventing them now is the same "infrastructure before product" pattern the rehaul removed. Revise WITH the storage layer, under an ADR. | stale contract | open |
| 2026-08-19 | **The test gate could not be run green because the wrong Node was active** — not because Node 24 was missing. `node --version` reported 22.16.0 and `.nvmrc` pins 24.19.0, and I recorded that as "install Node 24". **It was already installed**, at `C:\Users\ASUS\AppData\Roaming\nvm\v24.19.0`, and nvm simply had another version selected. Five engine tests fail on 22 for a genuine `Math.pow`/`Math.cbrt` ULP difference; all five pass on 24. THE LESSON IS ABOUT THE DIAGNOSIS, NOT THE VERSION: I probed `Math.pow` and `Math.cbrt` at two inputs, found them bit-identical across both runtimes, and reported that as evidence *against* my own hypothesis — when the correct move was to run the failing test on the other runtime, which takes the same time and answers the question. A probe at inputs you chose is not a test at inputs that fail. | environment | **closed 2026-08-19** — all gates verified green on 24. Run with `PATH="$APPDATA/nvm/v24.19.0:$PATH"` or `nvm use 24.19.0` (needs elevation on Windows). |

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
