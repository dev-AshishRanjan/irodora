/**
 * The randomness port.
 *
 * ## Why this file exists
 *
 * `key.ts` and `id.ts` called `crypto.getRandomValues` directly — an **ambient global**. It
 * exists in Node, so every test passed; it does not exist in Hermes, so the app died the first
 * time a person opened Palette Studio or profile setup. Not a redbox: an unhandled `TypeError`
 * during render, which Android reports as *"Irodora keeps stopping"*.
 *
 * Nothing could have caught it. The package's tests run under Node, the typecheck sees
 * `lib.dom`'s `crypto` declaration and is satisfied, and no lint forbids a global that is
 * perfectly real in two of the three runtimes this code has to work in.
 *
 * **This is [E-008](../../../.harness/state/effects.json)'s shape from the other direction.**
 * That link is about the app re-implementing engine arithmetic; this is a platform-neutral
 * package reaching for a platform API. `src/index.ts` in the app already states the rule the
 * store had quietly broken: *"the package stays platform-neutral so its tests run anywhere; the
 * platform bindings live at the one place that has a platform."* `SecureKeyStore` is that rule
 * applied to the keystore. This is the same rule applied to the CSPRNG.
 *
 * ## Why a settable source and not a threaded parameter
 *
 * `getOrCreateDatabaseKey` already takes its keystore as an argument, and that is the better
 * shape. `uuidv7()` cannot: it is called from render bodies in two screens and from
 * `toStoreWrite`, and threading a generator through every one of them would put a security
 * primitive in the props of a component.
 *
 * So: one process-wide source, installed once at startup, with a default that works wherever
 * the platform actually provides a CSPRNG.
 *
 * ## What it will never do
 *
 * **Fall back to `Math.random()`.** This produces the key that encrypts the database (NFR-13).
 * A weak key that works is far worse than a loud failure, because nothing downstream can tell
 * the difference. When there is no CSPRNG the call throws, and the message says exactly which
 * call to make.
 */

/** A source of cryptographically secure random bytes. */
export type RandomBytes = (byteLength: number) => Uint8Array;

let installed: RandomBytes | null = null;

/**
 * Install the platform's CSPRNG. Call once, at startup, before anything writes.
 *
 * React Native has no `crypto` global, so the app must supply one — `apps/mobile` does it in
 * the root layout, which loads before any screen renders.
 *
 * Idempotent in effect but not silent about it: installing twice is a mistake worth seeing,
 * because the second call is usually a second startup path nobody knew about.
 */
export function setRandomBytes(source: RandomBytes): void {
  installed = source;
}

/**
 * The installed source, or the platform's own, or a refusal.
 *
 * The `globalThis.crypto` branch is what keeps Node, the browser and any React Native build
 * carrying a polyfill working without configuration — including this package's own test suite,
 * which is why the port did not need to be threaded through 300 assertions.
 */
export function randomBytes(byteLength: number): Uint8Array {
  if (!Number.isInteger(byteLength) || byteLength <= 0)
    throw new RangeError(
      `randomBytes: byteLength must be a positive integer, got ${String(byteLength)}`,
    );

  if (installed !== null) return installed(byteLength);

  const platform = (globalThis as { crypto?: { getRandomValues?: <T>(array: T) => T } }).crypto;
  if (typeof platform?.getRandomValues === 'function')
    return platform.getRandomValues(new Uint8Array(byteLength));

  throw new Error(
    'No cryptographically secure random source is available. This runtime has no ' +
      '`crypto.getRandomValues` — React Native and Hermes do not provide one — and nothing has ' +
      'called `setRandomBytes()`. Install the platform source at startup; `apps/mobile` does it ' +
      'in app/_layout.tsx. There is deliberately no Math.random() fallback: this value keys the ' +
      'database (NFR-13), and a weak key that works is worse than a failure that is visible.',
  );
}

/**
 * Forget the installed source. **Tests only.**
 *
 * Exported so the refusal above can be exercised — a guard nobody has watched refuse is a
 * comment [[a-decoy-that-is-not-broken-proves-nothing]].
 */
export function resetRandomBytes(): void {
  installed = null;
}
