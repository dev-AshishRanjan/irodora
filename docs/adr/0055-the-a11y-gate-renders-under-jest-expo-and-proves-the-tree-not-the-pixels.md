# ADR-0055 — The `a11y` gate renders under `jest-expo`, and it proves the accessibility tree, not the pixels

## Status

Accepted

## Date

2026-08-20

## Context

Gate 8 (`a11y`) has `activatesWith: "F-017"` and has been `pending` since the gate set was
defined. Its charter — [ADR-0021](0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md),
NFR-8, ACCESSIBILITY.md A1 — was written when there was a web surface, and said *axe, zero A/AA <!-- retired-ok: States what the requirement said when a web surface existed. That is the problem this ADR solves. -->
violations, every route*.

**axe cannot run.** [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) <!-- retired-ok: Names the retired tool in order to say it cannot run, which is the decision. -->
retired the web surface; there is no DOM to walk. Two further constraints narrow the field:

- CI and the primary workstation are **Windows with no device attached**, so anything requiring
  a simulator or a physical phone cannot be the gate.
- `.harness/rules/common/testing.md` bans snapshot testing outright — *"a wrong implementation
  snapshots its wrongness and defends it forever"* — which removes the obvious cheap answer of
  snapshotting accessibility props.

`gates.json` additionally describes gate 8 as *"asserted inside the app e2e run"* with
`ciStep: false`, and `verify-state.mjs` skips the CI-mirror check entirely for any gate with
`ciStep: false`. Activating gate 8 in that shape would produce a gate that reads `active`,
mirrors nothing, and never executes — the [F-072](../../.harness/state/feature_list.json) hazard
in a different costume, on the gate that carries NFR-8.

### What was actually run

Both candidate stacks were assessed against the two capabilities F-017 needs — reading the
accessibility tree, and reading resolved styles for the rendered contrast check. The chosen one
was executed on this workstation:

```
PASS spike/probe.test.tsx
  √ the accessibility tree is inspectable, and disabled state reaches it
  √ the rendered style is readable, which is what the contrast check needs
```

`getByRole('button', { name: 'Sample indigo' })` resolved, `props.accessibilityState.disabled`
came back `true`, and `props.style` exposed `{ fontSize: 13, color: '#8A8A8A' }` — which is
exactly the shape the small-text `foreground.3` check needs to see.

Two facts that constrain the version set, both found by running it rather than by reading:

- **`jest-expo@57.0.4` is built on Jest 29 internals** (`@jest/globals@^29`, `jest-snapshot@^29`,
  `babel-jest@^29`, `jest-environment-jsdom@^29`). Installing `jest@30` alongside it produces
  `jest-runtime@30` against `jest-mock@29` and dies with
  `TypeError: this._moduleMocker.clearMocksOnScope is not a function` **before running a single
  test**.
- **`@testing-library/react-native@14` peers on `test-renderer@^1.0.0`; `jest-expo@57` ships
  `react-test-renderer@19.2.3`.** They are not the same package, and RNTL 14 and jest-expo 57 are
  therefore not aligned. RNTL 13.3.3 peers on `react-test-renderer`, which is what jest-expo
  provides, and that is the combination that passed.

## Decision

**Gate 8 renders React Native components under `jest-expo` and asserts over the accessibility
tree.** The version set is pinned as a unit, because it is a unit:

```
jest@29.7.0 · jest-expo@57.0.4 · @testing-library/react-native@13.3.3 · react-test-renderer@19.2.3
```

Jest is scoped to **`packages/ui` and `apps/mobile` only**. Vitest remains the runner everywhere
else. Turbo's `test` task invokes each package's own `test` script, so a package on a different
runner is invisible to `pnpm test` — the cost is two configurations, not a divided build.

**`eslint-plugin-react-native-a11y` is added as a fast static net, and is explicitly not the
gate.** Static analysis cannot see composition: a label supplied by a parent, or an icon rendered
by a child, is invisible to it. It catches typo'd roles cheaply and is not permitted to be
counted as coverage.

**Gate 8 gets `ciStep: true` and a real step in `ci.yml`.** Its `gates.json` description is
rewritten: it is not "asserted inside the app e2e run".

### The boundary is printed on every run

> **This gate proves the accessibility tree. It does not prove the pixels.**

There is no Yoga layout in a JS render tree, so **text clipped at 200 %, overflow, occlusion and
measured tap-target size are invisible to it.** What it can check is that no component disables
font scaling and that every text permits a multiplier of at least 2 — a necessary condition, not
a sufficient one. The device half stays **attested** (ADR-0038) and visible on `feature_list.json`
rather than being implied by a green gate.

This sentence goes in the gate's own output, not only in this record, for the same reason gate 9
prints what it does not check.

## Consequences

**Good**

- The gate rests on the stack Expo maintains and version-locks to the SDK: `jest-expo@57.0.4`
  peers on `@react-native/jest-preset@^0.86.2`, and `apps/mobile` runs React Native 0.86.2. An
  SDK upgrade brings a matching preset rather than a compatibility investigation.
- NFR-8 stops being an intention. Accessible names, roles and states become a blocking check
  over every component and screen.
- The same rendered tree serves gate 9's two outstanding halves — the colour-only status scan and
  the small-text check — so one harness discharges three debts.
- A gate that cannot run is a gate failing open, and this one is proven to run *here*, on the
  workstation and OS that CI uses.

**Bad**

- **A second test runner.** Two configurations, two mocking APIs, and a contributor must know
  which directory they are in. This is a real ongoing tax and the strongest argument against.
- **We depend on `react-test-renderer`, which React 19 deprecated.** It works today and Expo
  ships it, but it is on a path to removal, and the migration to `test-renderer@1` is gated on
  jest-expo moving to RNTL 14 rather than on us.
- Being pinned to Jest 29 means the repository carries two major versions of test tooling, and
  Jest 29 will stop receiving fixes before Vitest does.
- Jest's install footprint is large — roughly 300 packages for `packages/ui` alone.

**Neutral**

- The `e2e` gate is untouched. Its subject is journeys, which arrive with F-018 and F-040.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **RNTL under Vitest via `vitest-native`** | The genuinely attractive option: one runner for the whole repository, no Jest, and it advertises exactly this use case with auto-configured RN mocks. Rejected on three grounds. It is **0.13.0** — pre-1.0, and [ADR-0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md) §3 already sustained the objection that a beta dependency does not belong at the foundation; here it would sit under a *blocking* gate. **RNTL declares `jest` as a peer dependency in both 13 and 14**, so running it under Vitest means running it outside its own declared contract, and a minor bump is entitled to break that. And it would pair with RNTL 14, whose `test-renderer@^1` peer is not what jest-expo provides, so we would be first to that combination rather than second. **Stated plainly: this option was not executed.** It was rejected on its published contract and on precedent, not on a failing run, and that is a weaker basis than the evidence behind the chosen path. |
| **`@srsholmes/vitest-react-native`** | The same one-runner benefit. At **0.1.5** it is earlier still, and it strips Flow types from React Native source at test time — a moving target tied to RN's internal file layout rather than to a published API. |
| **`react-test-renderer` snapshots of accessibility props** | Cheap and needs no new dependency. Banned: `testing.md` forbids snapshot testing, and the reason applies with full force here — a component with a missing label would snapshot the missing label and defend it. Deprecated in React 19 as well. |
| **`eslint-plugin-react-native-a11y` as the gate** | Fast, no runtime, catches real mistakes, and it is being adopted — as a lint rule. It cannot be the gate because it cannot see composition, and a gate that cannot see the common case would license the belief that the common case is covered. |
| **Maestro or Detox on a device** | The only thing that sees what actually matters: focus order under a real screen reader, text clipped at 200 %, and whether a person can finish the task. It needs a device, so it cannot be a gate on a Windows CI runner. It is not discarded — it is where the **attested** half of NFR-8 is verified, and it belongs with the `e2e` gate at F-018/F-040. |

## Revisit when

`vitest-native` reaches 1.0 **and** `@testing-library/react-native` drops its `jest` peer
dependency — at that point the one-runner argument costs nothing and the second runner should go.
Also revisit when `jest-expo` adopts RNTL 14 and `test-renderer@1`, which is what removes the
deprecated `react-test-renderer` from the tree.
