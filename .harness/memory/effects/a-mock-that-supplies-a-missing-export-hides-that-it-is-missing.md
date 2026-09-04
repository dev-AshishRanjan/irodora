# E-062 — A mock that supplies a missing export hides that it is missing

**Link:** `apps/mobile`'s gesture-handler version → `packages/ui/jest.setup.js`, `overlay.tsx`,
[ADR-0089](../../../docs/adr/0089-the-gesture-stack-is-pinned-to-the-version-heroui-was-built-against.md)
**Guard:** `gate:lint` + `gesture-stack.test.tsx` **Severity:** high **Feature:** F-157

---

## The defect

`react-native-gesture-handler` 3 moved `GestureDetector` out of the package root into a `v3`
subtree and did not re-export it. `heroui-native` imports it **from the root**, in eleven places.

An `import { X }` of a missing named export yields `undefined` **silently** — no error at import,
no warning, nothing. Rendering an element whose type is `undefined` throws. So Dialog,
BottomSheet, Slider and Menu would have **crashed on render**, not degraded.

## Why nothing noticed for two releases

`packages/ui/jest.setup.js` mocked the module and stubbed
`GestureDetector: ({ children }) => children`.

The mock had a real reason — RNGH 3 calls into worklets at import time and throws under the
resolver this config uses — and its effect was that **the conformance suite was green on a tree
the device could never build**.

> A mock that stubs **behaviour** is a test decision.
> A mock that stubs **existence** is a test that has stopped describing the product.

That is the reusable sentence. The suite was not merely failing to check these components; it was
actively asserting that they worked.

## Two recorded reasons that were wrong

ADR-0062 and the mock's own comment both said *"downgrading breaks `expo-router`"*. Reading the
manifests:

| package | peer range on gesture-handler |
|---|---|
| `expo-router` | `*` |
| `react-native-drawer-layout` | `>= 2.0.0` |
| `heroui-native` | `^2.28.0` |
| `expo` | none at all |
| **ours** | **`^3.2.1`** |

Nothing in the tree wanted 3.x. **Our own `package.json` was the only thing forcing it**, and no
ADR said why. A sentence in a comment had been carried forward through at least one feature
without anyone checking it against the file it describes.

## What the fix is, and what it does not prove

Pinned to `^2.32.0`; the mock removed rather than updated. `gesture-stack.test.tsx` now asserts
the **symbol**, not the version — a range can be satisfied by a package that moved the symbol, and
a range can be violated by one that has not, and only the first breaks the app.

**The native side is unverified.** RNGH 2.32 supports the New Architecture and names no RN
version, but "supports Fabric" and "builds against RN 0.86" are different claims. This is a
JS-level fix, verified at the JS level, unproven where it runs.

## The direction the gate cannot see

`verify-peer-deps.mjs` reports **unmet** peers. When `heroui-native` widens its range to RNGH 3,
staying on 2.x becomes the stale decision — and a satisfied-but-outdated peer is silent. Whoever
upgrades HeroUI has to re-read ADR-0089; nothing will prompt them.

## A second bug, in the harness rather than the product

Registering the first **portalled** conformance subject exposed it: `checkSubject` renders each
subject in light and then dark inside one test, without unmounting. Harmless for an ordinary
component — each `render()` owns its tree. For a portal, whose content mounts into a shared host,
the light dialog was still mounted when the dark tree was captured, so the dark subject came back
carrying light-theme colours.

The suite reported three `colour-literal` findings that were a **true observation of an impossible
tree**. `draw()` now unmounts. The theme context was never at fault — a `useTheme()` probe inside
the portal returns the theme the provider was given.

## Related

- [[a-peer-that-resolves-by-luck-is-not-a-dependency]] — the gate that found the range.
- [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]] — the same shape: the harness
  disagreeing with the device, and the harness being the one that looks fine.
