# Plan: F-071 — The property-test gates are deterministic

| | |
|---|---|
| **Feature** | F-071 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `tests` · every package carrying a fast-check property |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-19 |

---

## Intent

Gate 4 (`test`) and gate 5 (`color-golden`) are **blocking**. Both can currently go red for a
reason unrelated to the change under test, and both can go green by luck. A blocking gate
that flakes teaches people to re-run it until it passes, which is how a real regression gets
waved through — that is the whole reason this feature exists, and it is not tidiness.

Done means: a red run names a real defect, a green run is evidence, and a failure can be
reproduced from what the run printed.

## What is actually wrong — measured, not assumed

Three defects, of which only the first two were recorded:

**1. 41 of 48 `fc.assert` calls run unseeded**, across 8 files:

```
color-difference/test/properties.test.ts   13 asserts,  0 seeded
color-spaces/test/lab.test.ts               6 asserts,  0 seeded
color-spaces/test/oklab.test.ts             5 asserts,  0 seeded
color-spaces/test/rgb.test.ts               5 asserts,  0 seeded
color-spaces/test/transfer.test.ts          5 asserts,  0 seeded
color-spaces/test/adaptation.test.ts        1 assert,   0 seeded
corpus/test/canonical.test.ts               4 asserts,  0 seeded
cvd-engine/test/cvd/separation.test.ts      2 asserts,  0 seeded
```

An unseeded generator samples a different region every run. A red is not reproducible and a
green is not evidence — the run that passed and the run that failed tested different things,
and nothing says so. `color-naming/test/bound.test.ts` is the counter-example: 8 of its
properties are seeded, and it is the only file where a failure can be replayed.

**2. 30 heavy properties run on vitest's default 5000 ms timeout.** Observed failing under
the parallel turbo run and passing in isolation:

| Test | Under `turbo run test` | Isolated |
|---|---|---|
| `testing` — `stays inside [0, 1)` | 7061 ms ✗ (also 6863, 5299) | 2384 ms ✓ |
| `color-naming` — `holds at every corner of the box` | 5052 ms ✗ | 59/59 pass ✓ |

Both are CPU-bound loops competing with 24 other tasks for cores. The work is correct; the
timeout is arbitrary.

**3. `color-spaces/test/oklab.test.ts` — the tolerance is within 25 % of the observed worst
case.** Recorded in F-071's notes: `1.2477e-12` measured against a `1e-12` bound, unseeded,
so it will recur and cannot be replayed when it does. This is acceptance criterion 3, and it
is the only one of the three that is a claim about the maths rather than about the harness.

## Approach

**Reused:** `fast-check` and `vitest`, both already present. `@irodora/testing` already owns
the seeded-PRNG and sampling helpers — the seeds here belong to fast-check, not to it, so
nothing new goes in that package.

**New:** one shared vitest base config at the repository root. Packages currently run bare
`vitest run` with no config file, so there is no single place to state a timeout. That
absence is the root cause of defect 2, and adding 30 per-test timeouts would leave the same
absence in place for the 31st test.

**Not doing:** reducing `numRuns`. The counts are deliberate — `bound.test.ts` runs 50,000
cases because it is proving a lower bound holds at the tightest corners of the box, and a
bound proven over fewer samples is a weaker claim. The tests are not too slow; the timeout is
too short.

### Increments

Each leaves the build green and is independently verifiable.

1. **`vitest.shared.ts` at the root**, with `testTimeout` raised and the reason stated in the
   file. Every package that carries a property test gets a three-line `vitest.config.ts`
   extending it. The two golden configs and the cvd config extend it too — they run the same
   heavy properties under the same contention.
2. **Seed every unseeded `fc.assert`.** One distinct, recorded seed per property. A seed is
   only useful if it is *stable*, so they are literals in the source, never derived from a
   date or a counter.
3. **State the margin in `oklab.test.ts`**: measure the true worst case over the seeded run,
   record it in a comment beside the tolerance, and widen the tolerance only if the measured
   margin justifies it — noting that widening a tolerance to make a test pass is the thing
   this repository most consistently refuses.
4. **Prove it.** Run the full suite repeatedly and show the flakes are gone; then prove the
   seeds discriminate by mutating an engine constant and watching the seeded properties go
   red at a *named, reproducible* case.

## Files to touch

```
vitest.shared.ts                                  — NEW. testTimeout + why
packages/color-difference/vitest.config.ts        — NEW, extends shared
packages/color-naming/vitest.config.ts            — NEW, extends shared
packages/color-spaces/vitest.config.ts            — NEW, extends shared
packages/corpus/vitest.config.ts                  — NEW, extends shared
packages/cvd-engine/vitest.config.ts              — NEW, extends shared
packages/testing/vitest.config.ts                 — NEW, extends shared
packages/*/vitest.golden.config.ts                — extend shared
packages/cvd-engine/vitest.cvd.config.ts          — extend shared
packages/design-tokens/vitest.cvd.config.ts       — extend shared

packages/color-difference/test/properties.test.ts — 13 seeds
packages/color-spaces/test/{lab,oklab,rgb,transfer,adaptation}.test.ts — 22 seeds
packages/corpus/test/canonical.test.ts            — 4 seeds
packages/cvd-engine/test/cvd/separation.test.ts   — 2 seeds
packages/color-spaces/test/oklab.test.ts          — the stated margin
```

## Anticipated effects

**This touches no `src/`.** Nothing shipped changes, so no effect link fires and no corpus
value moves. That is the property that makes this safe to do now, before Node 24 is the
default runtime everywhere.

The one real risk is the opposite of a break: **a seed that happens to avoid the region where
a defect lives**. Seeding narrows what each run explores from "a different slice every time"
to "this slice, always". That is the correct trade — reproducibility beats accidental
coverage — but it is only safe if the seeds are proven to discriminate, which is increment 4.

Guard: increment 4 is the guard. A seeded property that cannot be watched to fail is not
evidence, and this repository already has three recorded cases of a decoy that proved
nothing.

## Test plan

- **Property:** unchanged in substance — same generators, same assertions, same run counts.
- **Golden:** unchanged. Gate 5 must stay green throughout; if it moves, something in `src/`
  was touched and that is a defect in this feature.
- **Flake proof:** the full suite run 5 times consecutively under `turbo run test --force`
  with no filter, so every task competes as it does in CI. Zero failures across all five, or
  this feature is not done.
- **Discrimination proof:** perturb one OKLab matrix element, run the seeded properties, and
  record which go red and at which case. A seed that does not catch a real engine change is a
  seed that has narrowed coverage to nothing.

## Gates

`state` · `test` · `color-golden`

`test` and `color-golden` are the subject. `state` because the feature record and this plan
must stay consistent.

## Runtime note

**Node 24.19.0 is required and is already installed** at
`C:\Users\ASUS\AppData\Roaming\nvm\v24.19.0` — it is simply not the active version, which is
22.16.0. On Node 22, five engine tests fail for a genuine `Math.pow`/`Math.cbrt` ULP
difference that has nothing to do with this feature. All verification here runs on 24.
