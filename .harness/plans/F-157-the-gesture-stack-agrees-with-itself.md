# Plan: F-157 — The gesture stack agrees with itself, so a sheet can be adopted

| | |
|---|---|
| **Feature** | F-157 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-24 |
| **Service / package** | `apps/mobile` · `@irodora/ui` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

F-143's peer gate found `react-native-gesture-handler` 3.2.1 installed against
`heroui-native@1.0.8`'s declared `^2.28.0`. This establishes whether that is a stale range or a
real break, and resolves it — so Dialog, Sheet, Slider and Menu stop being blocked.

## What was established, before deciding anything

**It is a real break, not a stale range.** Measured:

| fact | evidence |
|---|---|
| HeroUI imports `Gesture` **and `GestureDetector`** from the package root | 11 import sites in `lib/module` |
| RNGH 3.2.1 exports `Gesture` from the root | `export { GestureObjects as Gesture }` |
| RNGH 3.2.1 **does not export `GestureDetector` from the root** | absent from `src/index.ts` and from the built index |
| It moved to a v3 subtree | `lib/module/v3/detectors/GestureDetector.js`, re-exported from `lib/module/v3` |

So `GestureDetector` is `undefined` at every HeroUI call site, and rendering an element whose
type is `undefined` throws. **Dialog, BottomSheet, Slider and Menu crash on render** — not
degrade, crash. F-143's decision to ship only Popover and Tabs was right for a better reason than
the one it gave.

**There is no upstream fix.** `heroui-native@1.0.9` is the latest published and still declares
`^2.28.0`.

**And the constraint graph is one-sided:**

| package | wants |
|---|---|
| `expo-router` | `*` |
| `react-native-drawer-layout` | `>= 2.0.0` |
| `heroui-native` | `^2.28.0` |
| `expo` itself | **no constraint at all** |
| **`apps/mobile` (ours)** | **`^3.2.1`** |

Nothing in the tree requires 3.x. **Our own declaration is the only thing forcing it.**

## Approach

**Pin to `^2.32.0`** — the latest 2.x, which declares `react: *` and `react-native: *`, so it
imposes no RN constraint of its own. That satisfies every consumer above and restores
`GestureDetector` to the root export where HeroUI looks for it.

Rejected, with reasons:

| alternative | why not |
|---|---|
| Alias HeroUI's import to the v3 subtree | Rewriting a dependency's imports through a bundler alias, against a subpath the package does not export publicly. It would break on any RNGH patch and the failure would be a crash in a file we do not own |
| Wait for HeroUI | 1.0.9 is latest and unchanged. Waiting is a decision to ship without a sheet, and it should be taken deliberately rather than by default |
| Drop HeroUI for gestures and hand-roll on Reanimated | Exactly what ADR-0062 chose HeroUI to avoid. It is the fallback if the pin fails on device, not the first move |

**Reused:** the peer gate from F-143 is the acceptance test for criterion 1 — it fails on an
acceptance that matches nothing, so removing the entry *is* the proof.

**Increments:** pin, install, verify the resolution, wire `Dialog` and `Sheet`, record the ADR.

## Files to touch

```
apps/mobile/package.json                     — ^3.2.1 -> ^2.32.0
pnpm-lock.yaml                               — regenerated
.harness/verification/unsatisfied-peers.json — the acceptance is REMOVED, not reworded
docs/adr/0081-…                              — the pin, and what it costs
packages/ui/src/overlay.tsx                  — Dialog and Sheet, if the pin holds
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| A native module's major version changes | every native build ⇒ `expo prebuild --clean` must re-run | `build`; and this is the effect worth recording |
| `GestureDetector` becomes defined | HeroUI's Dialog, Sheet, Slider, Menu | the peer gate + the conformance registry |
| The acceptance is removed | `verify-peer-deps.mjs` | it fails on a dead acceptance, so removal is checked |

## Test plan

- **The resolution itself:** `pnpm peers check` reports no gesture-handler issue, and the gate
  fails if the acceptance is left behind.
- **The import that was broken:** a test that `GestureDetector` is a defined export of the
  package root. That is the actual defect, stated as an assertion rather than inferred from a
  version number — a range can be satisfied by a package that still moved the symbol.
- **Conformance:** `Dialog` registered and rendered open, with its scrim and its accessible name.

## Risks and open questions

**The native side cannot be verified here, and this is a native module.** RNGH 2.32 supports the
New Architecture, and its peers name no RN version — but "supports Fabric" and "builds against RN
0.86" are different claims, and only a device build settles the second. **This is the single
largest risk in the release so far**: a JS-level fix that is verified at the JS level and unproven
where it actually runs.

**Moving backwards on a native module is unusual and worth flagging.** The reason it is
defensible here is that nothing else asked for 3.x — so this is not "downgrade to accommodate
HeroUI", it is "we were ahead of every constraint in the tree for no stated reason".

**If the pin fails on device**, the fallback is hand-rolling the sheet on Reanimated, which is
ADR-0062's cost coming due. That should be a new feature with its own ADR, not a scramble.

## Out of scope

Slider and Menu. They unblock with this, but each needs its own wrapper, consumer and conformance
subject — F-156 owns the form controls, and Menu has no consumer yet.
