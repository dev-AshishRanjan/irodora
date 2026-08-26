/**
 * Camera permission, as the surface needs to know it — and nothing else.
 *
 * ## Why this is its own file
 *
 * It used to live in [`viewfinder.tsx`](./viewfinder.tsx), which imports
 * `react-native-vision-camera`. That import reaches `react-native-nitro-modules`, which touches
 * the native TurboModule **at module load**, so any test importing the file failed before a
 * single assertion ran:
 *
 * ```
 * Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found.
 * ```
 *
 * F-097's own comment claimed the opposite — *"jest-expo resolves the module, so importing it
 * costs nothing here"* — and that claim was never run. It was wrong, and it broke CI.
 *
 * The lesson is the one this repository keeps relearning at a different level:
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]] has a sibling — a module wired to
 * a native import cannot be tested at all, and the boundary has to be drawn where the pure logic
 * ends rather than where it happens to have been written.
 */

/**
 * Whether the camera may be used, as the surface needs to know it.
 *
 * Three states, not a boolean. `undetermined` and `denied` need completely different copy — one
 * asks, the other explains that asking again will not help — and a boolean would collapse them
 * into the same screen.
 */
export type LensPermission = 'granted' | 'denied' | 'undetermined';

/**
 * Map VisionCamera's two booleans onto the screen's three states.
 *
 * Pure, and deliberately so: this is the whole of the decision, and it is now testable without
 * a camera, a native module, or a device.
 */
export function permissionState(
  hasPermission: boolean,
  canRequestPermission: boolean,
): LensPermission {
  if (hasPermission) return 'granted';
  return canRequestPermission ? 'undetermined' : 'denied';
}
