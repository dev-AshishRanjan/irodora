/**
 * What the render harness needs before it can see a HeroUI tree (ADR-0062, F-087, F-157, F-158).
 *
 * ## The mock that used to be here, and why it is gone
 *
 * This file carried a `react-native-gesture-handler` mock — the twin of the one F-157 removed
 * from `packages/ui/jest.setup.js`. F-157 fixed the version and the other file; this one was
 * left behind, and by F-158 its docblock asserted two things that were no longer true:
 *
 * - *"this tree resolves 3.2.1, via `expo-router`"* — it resolves **2.32.0** at every site, which
 *   `pnpm ls react-native-gesture-handler -r` reports directly.
 * - *"downgrading breaks `expo-router`"* — `expo-router`'s peer range is `*`. Nothing in the tree
 *   required 3.x except our own `package.json`, which is what ADR-0089 pinned.
 *
 * **It was also stubbing existence rather than behaviour**, which is the line F-157 drew: it
 * supplied `GestureDetector`, the very symbol RNGH 3 had moved out of the package root, so the
 * suite was green on a tree the device could never build.
 *
 * ## What made it stop being merely stale
 *
 * F-158 put a bottom sheet on the Lens. Rendering it here failed with:
 *
 * ```
 * TypeError: Cannot read properties of undefined (reading 'UNDETERMINED')
 * ```
 *
 * `State.UNDETERMINED`. The mock spread `jestSetup.js` — a SETUP SCRIPT, not the module — so the
 * package's real exports were never there. Every consumer that reached past `GestureDetector`
 * got `undefined`, and gorhom reaches a long way past it.
 *
 * That is the same failure shape as before, one layer down: a mock that supplies some of a
 * module's surface hides that it is supplying none of the rest
 * [[a-mock-that-supplies-a-missing-export-hides-the-fact-that-it-is-missing]].
 *
 * ## What replaces it
 *
 * Nothing. On 2.32.0 the real module loads under this harness, so these tests render what a
 * device would render rather than a shape this file invented.
 *
 * **If a mock is ever needed here again, it must not supply a symbol the real package lacks.**
 * Stubbing behaviour is a test decision; stubbing existence is a test that has stopped describing
 * the product.
 */

export {};
