# Plan: F-038 — Performance budgets and gates

| | |
|---|---|
| **Feature** | F-038 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-4 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `tests/bench` · `.harness/verification/` · `.github/workflows/` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

Gate 12 stops being `pending`. The engine's cost is measured against **absolute committed
thresholds** over the pinned corpus, the bench **self-tests its own arithmetic** every run, and
the part that needs a device is reported as **not run** rather than quietly counted as passing.

## Approach

### Thresholds are content-shaped: committed, absolute, with a rationale each

`tests/bench/budgets.json` — one entry per measurement, each carrying its **absolute** ceiling,
its **runtime scope**, and why the number is what it is. Never a delta against a previous run:
the gate's own description says a delta gate flakes until somebody disables it.

**`scope` is the field that keeps this honest.** Two values:

| scope | meaning |
|---|---|
| `node-reference` | measurable here; the gate runs it and fails on a miss |
| `device` | NFR-4's actual claim, on the slowest supported phone. **Reported as NOT RUN** |

NFR-4 says *"measured on the slowest device in the support matrix rather than the fastest"*. A
CI runner is neither. So the gate measures what it can, prints what it cannot, and the device
budgets stay attested on the features that own them.

### The engine budget is not NFR-4's budget, and says so

`recommendOutfit` p95 on this workstation is **0.87 ms** against NFR-4's 200 ms — two hundred
times under. Asserting 200 ms here would pass trivially and read like coverage.

So the `node-reference` entries carry their **own, much tighter** ceilings, declared as *engine
budgets*: what the pure computation may cost on reference hardware, leaving the rest of NFR-4's
budget for the platform. The relationship between the two is stated and **not** dressed up as a
derivation — nobody has measured the ratio between this desktop and a four-year-old Android.

### Each gate self-tests its arithmetic every run

Criterion 4, and it is the interesting one. The bench computes a p95; a p95 computed wrongly
produces a plausible number and a green gate for ever.

So before measuring anything, the percentile function runs against a **known array with a known
answer**, and against a deliberately wrong expectation that must fail. The bench refuses to
report if the self-test did not execute — a count is printed, and zero is a failure.

### Gate 12 activates, and the `if:` comes off

`gates.json` `perf` → `active`. And the CI step is currently:

```yaml
if: github.event_name == 'push' && hashFiles('tests/bench/package.json') != ''
```

[[a-ci-step-guarded-by-an-if-is-invisible-to-the-mirror-check]]: gate 0 compares `run:` and never
reads `if:`, so an active gate with a conditioned-out step **passes every check and runs
nowhere**. The guard comes off in the same commit that flips the status — that is the whole
point of the lesson.

**Reused:** the published corpus and weights, `@irodora/recommendation`, `scoreColor`,
`recommendOutfit`, `scoreOutfit`. **New:** `budgets.json`, the bench, its self-test.

## Files to touch

```
tests/bench/budgets.json         — NEW. Absolute ceilings, scope, rationale
tests/bench/src/bench.mjs        — NEW. The bench and its self-test
tests/bench/src/bench-proof.mjs  — NEW. Ten planted cases; nine red, one green
tests/bench/src/index.ts         — the Budget type; was `PLACEHOLDER = true`
tests/bench/package.json         — the dependencies, and `bench` script
pnpm-lock.yaml                   — the matching importer entries
eslint.config.mjs                — `scripts/**/*.mjs` widened to cover the bench
.harness/verification/gates.json — perf: pending → active
.github/workflows/ci.yml         — the `if:` guard comes off; the proof gets a step
package.json                     — `pnpm bench` runs it; `pnpm bench:prove` proves it
```

### Two departures from this plan, and why

**The bench is `.mjs`, not `src/index.ts`.** It imports the **built** `@irodora/*` packages, so
it cannot be part of the build that has to finish before the thing it measures exists — the same
reason every gate script under `scripts/` is `.mjs`. `index.ts` stays, carrying the `Budget`
type, so `tsc -p tsconfig.build.json` has an input.

**`pnpm bench` runs `node tests/bench/src/bench.mjs`, not a workspace filter.** The previous
value was `pnpm --filter @irodora/bench test`, which resolves to `vitest --passWithNoTests` — a
gate command that could never fail. A direct `node` invocation also runs on a workstation that
cannot run `pnpm` at all, which is where this gate had to be proven.

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| Gate 12 activates | every push; a slow change now fails a gate rather than a review | `gate:state` (gates + ci-mirror) |
| **The `if:` guard comes off** | the gate actually runs, which it never has | The lesson's own subject; verified by reading the workflow |
| New workspace dependencies | the lockfile | **gate 0's lockfile check** (F-098) — watched failing before it is fixed |
| A budget file | the bench, and any future budget | `gate:perf` refuses a malformed one |

## Test plan

- **Self-test, both directions:** the percentile function is asserted against a known array, and
  a deliberately wrong expectation is asserted to fail — so "the self-test ran" is
  distinguishable from "the self-test always passes".
- **The bench refuses to report over nothing:** zero measurements, or zero self-tests, exits
  non-zero.
- **A malformed budget is refused:** a missing ceiling, a non-absolute entry, an unknown scope.
- **`device`-scope budgets are printed as NOT RUN**, and the count is in the output.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm build && pnpm bench
```

**Known red and pre-existing:** `test` on `color-difference` and `color-spaces` (Node-22 ULP).

## Risks and open questions

- **Criterion 3 describes a surface that does not exist.** *"Frontend measured over the wire,
  gzipped, at the load event, under prefers-reduced-motion with CPU throttling, median of 3"* is
  NFR-5 — **withdrawn by [ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)**,
  and the PRD's own withdrawal table says *"There is no web surface"*. Nothing is served over a
  wire and there is no load event. Recorded as **not applicable, with the reason**, exactly as
  F-032 recorded the free tier and F-029 recorded "no deployment".
- **Activating a gate that cannot prove NFR-4 is the risk to manage.** The mitigation is that
  the gate says what it measured and what it did not, on every run, and the device budgets stay
  attested rather than being quietly satisfied by a desktop number.
- **The engine budgets are chosen, not derived.** Stated as such.

## Out of scope

A device lab (F-063) · web performance, which has no surface · the capsule solver (R4) ·
changing any engine to hit a number.
