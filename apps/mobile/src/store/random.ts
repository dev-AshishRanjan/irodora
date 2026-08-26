/**
 * The platform CSPRNG, installed into `@irodora/store` at startup (F-104).
 *
 * ## Why the app has to do this
 *
 * **React Native has no `crypto` global.** Not Hermes, not React Native 0.86, not Expo 57 —
 * `expo/src/winter/runtime.native.ts` installs `TextDecoder`, `URL`, `DOMException` and
 * `AbortSignal`, and no crypto. Verified by reading it rather than assumed, because the whole
 * defect this fixes came from assuming the opposite.
 *
 * `packages/store` used the ambient global directly. Under Node that global is real, so the
 * package's 68 assertions passed and CI was green; under Hermes it is `undefined`, so
 * `uuidv7()` threw a `TypeError` during the first render of Palette Studio and profile setup —
 * the only two screens that generate an id — and Android reported *"Irodora keeps stopping"*.
 *
 * This module is the platform binding, in the one place that has a platform. It is the same
 * arrangement as [`./index.ts`](./index.ts), which holds `expo-sqlite` and `expo-secure-store`
 * for the same reason and states the rule the store had quietly broken.
 *
 * ## Why `expo-crypto`
 *
 * It is the first-party Expo module for exactly this, and it is backed by the platform's own
 * secure generator — `SecRandomCopyBytes` on iOS, `SecureRandom` on Android. The alternatives
 * were considered and rejected in
 * [ADR-0077](../../../../docs/adr/0077-the-random-source-is-a-port-and-the-app-installs-it.md):
 * a `react-native-get-random-values` polyfill leaves the package depending on an ambient global,
 * and deriving key material from `expo-modules-core`'s native UUIDs is hand-rolled construction
 * of a security primitive.
 *
 * ## The install asserts, and that is not defensive dressing
 *
 * This value keys the database (NFR-13). A source that returns the wrong length, or a buffer
 * that is all zeroes because a native module failed to link, must fail **at startup with a
 * sentence** rather than at first write with a key nobody can reproduce. So the install runs a
 * probe and refuses on anything it cannot explain.
 */

import * as Crypto from 'expo-crypto';
import { setRandomBytes } from '@irodora/store';

/** Long enough that an all-zero buffer is not a plausible coincidence. */
const PROBE_BYTES = 32;

/**
 * Read `byteLength` secure bytes from the platform.
 *
 * `getRandomValues` rather than `getRandomBytes`: it is the Web Crypto shape, so the adapter
 * and the port's own Node fallback are the same function under two names — one behaviour to
 * reason about instead of two.
 */
function platformRandomBytes(byteLength: number): Uint8Array {
  return Crypto.getRandomValues(new Uint8Array(byteLength));
}

/**
 * Install the platform source. Call once, at module scope in the root layout.
 *
 * Not inside a component: a screen that renders before the effect runs would take the port's
 * refusal branch, and the failure would look intermittent — which is the worst way for a
 * security primitive to fail.
 */
export function installRandomSource(): void {
  const probe = platformRandomBytes(PROBE_BYTES);

  if (!(probe instanceof Uint8Array) || probe.length !== PROBE_BYTES)
    throw new Error(
      `expo-crypto returned ${String(probe.length)} byte(s) of ${probe.constructor.name} ` +
        `instead of ${String(PROBE_BYTES)} bytes of Uint8Array. The database key comes from this ` +
        'source (NFR-13), so it is refused rather than used.',
    );

  // An all-zero buffer is what a native module that failed to link looks like from JS. It is
  // also, technically, a legal draw — with probability 2^-256, which is not a number that
  // happens. Refusing it costs nothing and catches the linking failure at startup.
  if (probe.every((b) => b === 0))
    throw new Error(
      'expo-crypto returned 32 zero bytes. That is either a native module that did not link or ' +
        'an event with probability 2^-256; both are refused. Run `npx expo prebuild --clean` and ' +
        'rebuild.',
    );

  setRandomBytes(platformRandomBytes);
}
