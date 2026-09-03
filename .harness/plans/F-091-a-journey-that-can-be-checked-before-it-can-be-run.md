# Plan: F-091 — The e2e harness that lets gate 7 run at all

| | |
|---|---|
| **Feature** | F-091 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-12, FR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `scripts/` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

Gate 7 has been `pending` since it was written, because **nothing in the workspace declares a
`test:e2e` task** and `e2e-scope.mjs` refuses to report coverage over an empty set. Fifteen
features have listed `e2e` in their verification and reported it *not run*.

This delivers the surface: the **Atlas journey**, authored as a Maestro flow, and a `test:e2e`
task that runs it. To a user this changes nothing today — it is the scaffolding that lets the
claim *"browsing colours works on a phone, and transmits nothing"* eventually be checked by a
machine instead of asserted by a person.

**Criteria 2, 3 and 4 are `attested`** (ADR-0038, decided 2026-09-03): they need a device or an
emulator and a CI run, and this workstation has no JDK. **Criterion 1 is what is built here.**

## Approach

The hazard is obvious and it is the one this repository keeps meeting: *a journey nothing can
run is a file nobody checks.* Declaring `test:e2e` and committing a YAML flow would satisfy the
letter of criterion 1 while creating a new place for rot — selectors naming strings the app
stopped rendering, a route that was renamed, a corpus slug that was never published. Every gate
would stay green.

So the flow is **generated from a spec, against the app's own sources**, and the generator has a
`--check` mode that fails when the committed flow no longer matches. That is the house style
already: five `generate-*.mjs --check` pairs guard the design tokens, the font subset, the
corpus bundle, the rules bundle and the taxonomy vocabulary.

**What that buys, concretely.** The spec names a **message key**, not a string. The generator
resolves it through `apps/mobile/src/i18n/en.ts` — the same module the app renders from, imported
directly under Node 24's type stripping. A key that no longer exists fails the build **here**, on
a machine with no device, at the moment the catalogue changes. The same applies to a corpus slug
resolved against the published bundle, and to a route resolved against `apps/mobile/app/`.

**Tool: Maestro.** Chosen over Detox and Appium and recorded as an ADR, because it is a
decision the release lives with. The short reasons: it is a **standalone binary, not an npm
dependency**, so nothing enters `pnpm-lock.yaml` and E-032 is not touched; it is **black-box**,
so no instrumentation build variant and no changes to the native project; and its flows are
**data**, which is the property that makes any of the checking above possible. A Detox journey
is arbitrary JavaScript, and there is no static check for arbitrary JavaScript.

**`test:e2e` refuses rather than passes when it cannot run.** After the flow check, it looks for
the Maestro binary and **exits non-zero** saying it is absent. A task that exited 0 having run no
journey is the failing-open shape `e2e-scope.mjs` was written to prevent, and it would be worse
coming from the file that is supposed to fix it.

> **Corrected after review.** This paragraph originally said *"the Maestro binary and a connected
> device"*. The runner checks only for the binary; with Maestro present and no device attached,
> Maestro's own non-zero exit stops the task. Still fail-closed — but the plan claimed a check
> that was never written, and ADR-0086 inherited the same sentence. Both are fixed.

**Reused:** `apps/mobile/src/i18n/en.ts` (the catalogue and `MESSAGE_KEYS`), the published corpus
version under `content/versions/`, `apps/mobile/app/` as the route table, `scripts/e2e-scope.mjs`
(unchanged except for one honesty sentence), the `--prove` idiom from
`verify-motion.mjs`/`verify-token-reach.mjs`, and the root `lint` chain where the static scans
already live.

**New:**

- `apps/mobile/e2e/journeys/atlas.journey.json` — the spec. Steps naming keys, slugs and routes.
- `apps/mobile/e2e/atlas.yaml` — the generated Maestro flow. Committed, never hand-edited.
- `scripts/generate-e2e-flows.mjs` — generator, `--check` and `--prove`.
- `scripts/e2e-run.mjs` — what `apps/mobile`'s `test:e2e` invokes: check, then run or refuse.
- `docs/adr/0086-…` — Maestro, and why the journey is generated from a spec.

**Increments** (each leaves the build green):

1. The ADR. The tool choice is a decision, and it is made before anything depends on it.
2. `generate-e2e-flows.mjs` plus the spec, generating nothing yet — resolution of keys, slugs
   and routes, with its failures. Wired into `lint` as `--check`.
3. The `--prove` mode: three mutations, each refused, and a PASS on unmutated input **first**.
4. The Atlas journey spec and its generated flow.
5. `e2e-run.mjs` and `apps/mobile`'s `test:e2e`; `e2e-scope.mjs` gains its one sentence.
6. Record: `progress.md`, feature status, effects.

## Files to touch

```
docs/adr/0086-the-journey-is-a-maestro-flow-generated-from-a-spec.md
                                          — new. The tool, and why the flow is generated.
scripts/generate-e2e-flows.mjs            — new. Generator + --check + --prove.
scripts/e2e-run.mjs                       — new. Check, then run, or refuse with a reason.
scripts/e2e-scope.mjs                     — one sentence: `covered` means a suite EXISTS.
apps/mobile/e2e/journeys/atlas.journey.json — new. The Atlas journey as data.
apps/mobile/e2e/atlas.yaml                — new, GENERATED. Committed.
apps/mobile/package.json                  — declares `test:e2e`. This is criterion 1.
package.json                              — `--check` joins the lint chain.
docs/adr/README.md                        — index row.
.harness/state/feature_list.json          — status, plan, effects.
.harness/state/progress.md                — the entry.
```

## Anticipated effects

| Contract | Dependents | Guard |
|---|---|---|
| **The message catalogue is now read by a build script, not only by the app.** A key rename previously touched the app and its tests; it now also breaks a journey. | `apps/mobile/e2e/journeys/*.json` | `generate-e2e-flows.mjs --check` in `lint`. This is the guard being built, and it is the point of the feature. Related to **E-016** (the i18n contract) and it will be added to that link. |
| **The published corpus is read by a build script.** A slug that disappears in a corpus publish breaks a journey. | the same specs | the same check. **E-001** already covers corpus regeneration; this adds a reader. |
| **`apps/mobile` declares `test:e2e`, so `turbo run test:e2e` now has a target.** The root task stops failing at `e2e-scope` and starts failing at the device step. | root `test:e2e`, gate 7 | gate 7 stays `pending` with `ciStep:false` — criterion 4 is attested. `verify-gate-mirror.mjs` enforces that pairing. |
| **A new turbo task with inputs.** | `turbo.json` | **E-025** — the cache key must cover what the task reads. `verify-cache-scope.mjs` is the guard and it fails closed on an unresolvable read. |

No `pnpm-lock.yaml` change: **Maestro is not an npm package.** E-032 is untouched, deliberately.

## Test plan

- **Unit / property:** the generator's resolution — a known key resolves to the catalogue's
  exact string; an unknown key throws naming the key; a slug resolves against the published
  bundle; a route resolves against `apps/mobile/app/`.

  > **Delivered as the proof script rather than as jest cases.** `scripts/` is in no package, so
  > `turbo run test` structurally cannot reach it — which is why every other gate script in this
  > repository is checked by a `*-proof.mjs` beside it rather than by a suite. The proof asserts
  > the positive cases (the real spec renders, the committed flow reads *up to date*) alongside
  > the refusals, so the coverage is the same shape the plan asked for in a different file.
- **Golden:** none. No colour value is computed here.
- **Conformance:** none.
- **E2E:** the Atlas journey itself — launch, browse, filter, open a colour, read its
  provenance. **It is written and validated here and RUN NOWHERE**: that is criterion 2, and it
  is attested.
- **Negative, with decoys rather than empty fixtures:** `--prove` mutates the spec three ways —
  a message key that does not exist, a corpus slug that was never published, a route that is not
  a file — and requires each to be refused. It asserts a **PASS on the unmutated spec first**,
  because a harness that cannot run its own subject reports every mutation as caught
  [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]].
  It also proves the drift check: a hand-edited byte in the generated YAML must fail `--check`.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm format:check
node scripts/generate-e2e-flows.mjs --prove
```

`e2e` itself: **not runnable here** — no JDK, no AVD. That is criteria 2–4 and they are
attested. `a11y`, `contrast`, `color-golden`, `cvd`, `perf`: no surface and no colour maths
changes, so they do not apply.

Evidence: the `--prove` transcript, and the `--check` failure on a deliberately edited flow.

## Risks and open questions

- **A generated YAML nobody has ever executed may be syntactically valid Maestro and still
  wrong.** The check proves the *selectors exist in the app*; it cannot prove the flow drives
  the app correctly. That gap is exactly criterion 2 and it is named as attested rather than
  papered over. The scope report must not say otherwise — hence the one-sentence change to
  `e2e-scope.mjs`.
- **The spec's step vocabulary is small on purpose** — launch, tap, assert-visible, type,
  back. A journey needing more is a reason to extend it deliberately, not a reason to allow
  raw YAML passthrough, which would reopen the hole.
- **No open questions.** OQ-3 closed today and does not touch this feature.

## Out of scope

- **Criteria 2, 3 and 4** — attested, not built. No device run, no offline socket assertion, no
  gate-7 activation, and `ciStep` stays `false`.
- **The other five charter items** — a11y, CVD, offline, persistence and backup journeys belong
  to F-039, F-040 and F-041 and stay `NOT COVERED` in the scope report.
- **Installing Maestro, or an AVD, or a JDK.** Environment, not repository.
- **Any change to a screen.** No `testID` is added: the journey selects by the accessible names
  the a11y gate already requires, which is the correct dependency direction — a journey that
  needs a `testID` is a journey a screen reader could not follow either.
