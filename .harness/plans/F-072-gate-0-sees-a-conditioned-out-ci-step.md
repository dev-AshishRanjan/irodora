# Plan: F-072 — Gate 0 sees a CI step that is conditioned out

| | |
|---|---|
| **Feature** | F-072 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `tests` — `scripts/verify-state.mjs`, `scripts/verify-gate-mirror.mjs` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-19 |

---

## Intent

Gate 0's CI-mirror check compares whole `run:` commands and **never reads `if:`**. So a gate can
read `active` in `gates.json`, have a step in `ci.yml`, pass the mirror check, and never once
execute.

This nearly shipped in F-011: gate 11's step carried `if: hashFiles('content/colors') != ''`,
and `content/colors/` is empty until F-012 — the gate would have been skipped on every push for
the rest of R1 with nothing saying so.

Done means: a blocking gate cannot be silently disabled by a condition, and the check that
enforces that has itself been watched to fail.

## What is wrong today — measured, not assumed

**Seven of eleven active gates carry an `if:`:**

| gate | condition | why it is wrong |
|---|---|---|
| `cvd` | `hashFiles('packages/cvd-engine/dist')` | **A BUILD OUTPUT.** If the build did not run, or produced nothing, the gate silently skips. This is the worst one in the list |
| `typecheck` `lint` `format` `test` `build` | `hashFiles('pnpm-lock.yaml')` | Vestigial from the pre-code era. Six blocking gates vanish together if the lockfile is ever absent — and a missing lockfile is a reason to FAIL, not to skip |
| `color-golden` | `hashFiles('packages/color-spaces/package.json')` | Same shape. The package exists; the hazard is that nothing notices if it stops existing |

None of these is currently skipping. That is exactly why it needs a gate: they are all one
rename away from skipping, and nothing would report it.

## Approach

**Reused:** the mirror check in `verify-state.mjs` already parses `ci.yml` into steps and
matches `run:` commands. It needs to carry the `if:` it is already walking past, not a new
parser.

**New:** an optional `ciCondition` field in `gates.json` — the escape hatch, with a reason.
A conditional step is not always wrong: a gate that genuinely only applies to some events (a
scheduled audit, a push-only benchmark) has a legitimate condition. What is wrong is a condition
nobody declared. So:

> An active gate whose CI step carries an `if:` **fails gate 0**, unless `gates.json` declares
> `ciCondition` with a matching condition and a reason.

The reason is required and must be non-trivial, for the same argument as the `claims-ok` marker
in F-025: an exemption nobody had to justify is a way to turn the check off.

### Increments

1. Teach the mirror check to capture each step's `if:` and fail for an active gate that has one
   and no declared `ciCondition`. **This makes gate 0 red** — that is the finding, not a
   regression.
2. Fix the seven. Every one becomes unconditional: `pnpm install --frozen-lockfile` already
   fails the job if the lockfile is missing, so the `hashFiles` guards protect nothing that is
   not already protected, and the `dist` guard actively hides a broken build.
3. Extend `verify-gate-mirror.mjs` with the new proof: add an `if:` to a real step, watch gate 0
   go red **naming that gate**, restore, and assert the baseline green either side.
4. `perf` is `pending` and its step is push-only-conditional. Pending gates are out of scope by
   definition — the check applies to `active` only, and the plan says so rather than leaving
   someone to wonder.

## Files to touch

```
scripts/verify-state.mjs             the mirror check gains if:-awareness
scripts/verify-gate-mirror.mjs       the proof for the new check
.github/workflows/ci.yml             7 conditions removed
.harness/verification/gates.json     ciCondition field; gate 0 description
.harness/state/schemas/*             no change — gates.json has no committed schema
```

## Anticipated effects

**No source is touched, so no engine behaviour changes and no effect link fires.**

The real effect is on CI: seven steps become unconditional. On a runner where `pnpm install`
fails, six gates that previously skipped will now fail instead. **That is the intent** — a gate
that cannot run is failing open, and this repository has answered that the same way four times
already.

Guard: increment 3. A check nobody has watched fail is configuration that parses.

## Test plan

- **Proof:** `verify-gate-mirror.mjs` adds `if: false` to a real active gate's step, asserts
  gate 0 exits non-zero **and names that gate**, restores, and asserts green either side.
- **Negative control:** a gate with a declared `ciCondition` whose reason is present must stay
  green; one whose declared condition does not match the file must go red, because a stale
  declaration is worse than none.
- **Scope control:** a `pending` gate with a conditional step must NOT fail, or the check would
  block every future gate from being staged.

## Gates

`state`

Gate 0 is both the subject and the check. That is unavoidable here and is why the proof mutates
`ci.yml` and watches gate 0 itself go red, rather than asserting on the checker's internals.
