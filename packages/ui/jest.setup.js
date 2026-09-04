/**
 * What the render harness needs before it can see a HeroUI tree (ADR-0062, F-087, F-157).
 *
 * ## The mock that used to be here, and why it is gone
 *
 * This file carried a `react-native-gesture-handler` mock that stubbed `GestureDetector` and
 * replaced `Gesture` with `{ Pan: () => ({ onUpdate: () => ({}) }) }`. It was written for v3,
 * whose import-time call into worklets throws under the resolver this config uses.
 *
 * **It also hid the defect F-143 eventually found by other means.** RNGH 3 moved `GestureDetector`
 * out of the package root; HeroUI imports it from the root in eleven places, so every one of them
 * was `undefined` and Dialog, BottomSheet, Slider and Menu would have thrown on render. The mock
 * *supplied* `GestureDetector`, so the suite was green on a tree the device could never run
 * [[a-mock-that-supplies-a-missing-export-hides-the-fact-that-it-is-missing]].
 *
 * Its comment also recorded a reason that turned out not to hold: *"downgrading breaks
 * `expo-router`"*. `expo-router`'s peer range on gesture-handler is `*`, `react-native-drawer-layout`
 * asks for `>= 2.0.0`, and `expo` itself declares no constraint at all — **nothing in the tree
 * required 3.x except our own `package.json`**. That is what ADR-0081 pinned.
 *
 * ## What replaces it
 *
 * Nothing. On 2.32.0 the real module loads under this harness, `GestureDetector` is a real
 * component, and `Gesture.Pan()` returns a real builder — so the suite now renders what a device
 * would render rather than a shape this file invented.
 *
 * **If a mock is ever needed here again, it must not supply a symbol the real package lacks.**
 * Stubbing behaviour is a test decision; stubbing existence is a test that has stopped describing
 * the product.
 */

export {};
