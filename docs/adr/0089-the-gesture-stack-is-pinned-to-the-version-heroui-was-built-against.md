# ADR-0089 — The gesture stack is pinned to the version HeroUI was built against

## Status

**Accepted.** Supersedes the gesture-handler note in
[ADR-0062](0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md).

## Date

2026-09-03

## Context

F-143 added a peer-dependency gate, and the first thing it reported was
`react-native-gesture-handler` **3.2.1** installed against `heroui-native@1.0.8`'s declared
`^2.28.0`.

ADR-0062 had already noticed this and accepted it, recording that *"downgrading breaks
`expo-router`"*. `packages/ui/jest.setup.js` carried the same sentence and a mock built around it.

**Both were wrong about the fact, and the mock was hiding the consequence.**

### It is a real break, not a stale range

Measured against the installed packages rather than inferred from the version numbers:

| fact | evidence |
|---|---|
| HeroUI imports `Gesture` **and `GestureDetector`** from the package root | 11 import sites in `lib/module` |
| RNGH 3.2.1 exports `Gesture` from the root | `export { GestureObjects as Gesture }` |
| RNGH 3.2.1 **does not export `GestureDetector` from the root** | absent from `src/index.ts` and from the built index |
| It moved into a v3 subtree | `lib/module/v3/detectors/GestureDetector.js`, re-exported only from `lib/module/v3` |

An `import { X }` of a missing named export yields `undefined` silently — no error at import.
Rendering an element whose type is `undefined` throws. So **Dialog, BottomSheet, Slider and Menu
would have crashed on render**, not degraded.

### The mock was supplying the missing export

`jest.setup.js` stubbed `GestureDetector: ({ children }) => children` and replaced `Gesture` with
a two-method shim. It was written for a real reason — RNGH 3 calls into worklets at import time
and throws under the resolver this config uses — but its effect was that **the suite was green on
a tree the device could never build.**

That is worse than an untested component. A mock that stubs *behaviour* is a test decision; one
that stubs *existence* is a test that has stopped describing the product.

### Nothing in the tree actually wanted 3.x

| package | wants |
|---|---|
| `expo-router` | `*` |
| `react-native-drawer-layout` | `>= 2.0.0` |
| `heroui-native` | `^2.28.0` |
| `expo` itself | **no constraint at all** |
| **`apps/mobile` (ours)** | **`^3.2.1`** |

The claim that downgrading breaks `expo-router` does not survive reading its manifest: its peer
range is `*`. **Our own declaration was the only thing forcing 3.x**, and no ADR recorded why.

## Decision

**Pin `react-native-gesture-handler` to `^2.32.0`** — the latest 2.x, which declares
`react: *` and `react-native: *` and so imposes no constraint of its own.

The mock in `packages/ui/jest.setup.js` is **removed**, not updated. On 2.32.0 the real module
loads under the harness, so the suite renders what a device would render.

`@gorhom/bottom-sheet` is installed alongside it. It is an *optional* peer of HeroUI, which is
why the peer gate never reported it — and it was absent from the store entirely, so `BottomSheet`
could never have rendered whatever the gesture-handler version had been.

## Consequences

**Moving backwards on a native module is unusual, and the framing matters.** This is not
"downgrade to accommodate HeroUI". It is "we were ahead of every constraint in the tree, for a
reason nobody wrote down, and it broke four components."

**The native side is unverified, and this is the real cost.** RNGH 2.32 supports the New
Architecture and names no RN version — but "supports Fabric" and "builds against RN 0.86" are
different claims, and only a device build settles the second. **This is the largest unverified
change in the release so far**: a JS-level fix, verified at the JS level, unproven where it runs.
The next device build is the test.

**A `prebuild --clean` is required** before any native build. The symptom of skipping it is a
crash at mount that reads like a code error.

**The pin will eventually be wrong.** When `heroui-native` widens its range to RNGH 3, staying on
2.x becomes the stale decision. The peer gate does not catch that direction — it reports *unmet*
peers, and a satisfied-but-outdated one is silent. Whoever upgrades HeroUI should re-read this.

## Alternatives considered

**Alias HeroUI's import to the v3 subtree.** Rewriting a dependency's imports through a bundler
alias, pointed at a path the package does not export publicly. It would break on any RNGH patch
and the failure would be a crash in a file we do not own.

**Wait for HeroUI.** `1.0.9` is the latest published and still declares `^2.28.0`. Waiting is a
decision to ship without a sheet or a dialog, and it should be taken deliberately rather than by
default.

**Drop HeroUI for the gesture components and hand-roll on Reanimated.** Exactly what ADR-0062
chose HeroUI to avoid. It is the fallback if the pin fails on device, not the first move — and it
would need its own ADR.

**Keep the mock and ship the components untested.** The option that was already in place. It is
what let a crash-on-render sit behind a green suite for two releases.
