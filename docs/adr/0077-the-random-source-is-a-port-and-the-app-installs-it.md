# ADR-0077 — The random source is a port, and the app installs it

## Status

**Accepted.**

## Date

2026-08-27

## Context

`packages/store` called the ambient `crypto.getRandomValues` in two places:

- `src/key.ts` — the 256-bit key that encrypts the database (NFR-13, FR-56)
- `src/id.ts` — every `uuidv7()`

**There is no `crypto` global in React Native.** Verified rather than assumed:
`expo/src/winter/runtime.native.ts` installs `TextDecoder`, `TextDecoderStream`,
`TextEncoderStream`, `URL`, `URLSearchParams` and `DOMException`, and patches `AbortSignal` and
`FormData`. No crypto. Nor does React Native 0.86, `expo-modules-core`, `expo-secure-store` or
`expo-sqlite` — a grep for `getRandomValues` across all of them returns nothing.

So on a device the call was `undefined.getRandomValues(...)`: an unhandled `TypeError` thrown
during render, which Android reports as **"Irodora keeps stopping"**.

### Why every gate was green

This is the part worth recording, because the defect is not "somebody forgot a polyfill".

| | |
|---|---|
| the package's tests | run under **Node**, where `globalThis.crypto` is real since Node 18 |
| `tsc` | sees `lib.dom`'s `crypto` declaration and is satisfied |
| `no-restricted-globals` | existed, and covered `packages/color-*` only |
| the conformance suite | renders screens in Node, so the call succeeded there too |

Seventeen gates, 68 assertions in that package alone, and none of them could see it. The
symptom was perfectly correlated with the two routes that call `deviceRepository()` —
`/palettes` and `/profile` — because they are the only two that generate randomness. Every
other screen worked.

### Why it is not a missing polyfill

`apps/mobile/src/store/index.ts` already states the rule this broke:

> This lives in the app rather than in `@irodora/store` on purpose. The package stays
> platform-neutral so its tests run anywhere; **the platform bindings live at the one place
> that has a platform.**

`SecureKeyStore` is that rule applied to the keystore — an interface the package declares and
the app implements with `expo-secure-store`. The CSPRNG is the same kind of thing, and it was
reached for as an ambient global instead. **The bug is architectural**, and a polyfill would
leave it in place.

## Decision

**`packages/store` takes its randomness through a port.**

```ts
export type RandomBytes = (byteLength: number) => Uint8Array;
export function setRandomBytes(source: RandomBytes): void;
export function randomBytes(byteLength: number): Uint8Array;
```

`randomBytes` resolves in this order:

1. the **installed** source, if the platform supplied one;
2. `globalThis.crypto.getRandomValues`, if this runtime has it;
3. **a refusal** — an error naming `setRandomBytes` and the file that should call it.

`apps/mobile` installs `expo-crypto`'s `getRandomValues` at module scope in `app/_layout.tsx`,
which loads before any screen renders.

### Three things this deliberately does

**A settable source rather than a threaded parameter.** `getOrCreateDatabaseKey` already takes
its keystore as an argument and that is the better shape, but `uuidv7()` is called from two
render bodies and from `toStoreWrite`; threading a generator through those would put a security
primitive into component props.

**A `globalThis` fallback rather than mandatory installation.** It is what keeps Node, the
browser and the package's own 68 assertions working with no configuration — the port did not
have to be threaded through 300 existing tests to be adopted.

**No `Math.random()` fallback, ever.** This value keys the database. A weak key *works* — it
opens the database exactly as well as a strong one — so nothing downstream can distinguish it,
and a person would never find out. A loud failure at startup is strictly better than a silent
one at rest.

### The install asserts

`installRandomSource()` draws 32 bytes and refuses a wrong length or an all-zero buffer. Zero
bytes is what a native module that failed to link looks like from JavaScript; it is also a legal
draw with probability 2⁻²⁵⁶, which is not a number that happens. Refusing costs nothing and
turns a linking failure into a sentence at startup.

## Consequences

**Good.** The platform-neutral package no longer touches a platform API. The failure mode when
somebody forgets is an error that names the fix rather than `undefined is not an object`. Node,
the browser and the device all work, and only one of them needs configuration.

**Bad — and this is a real cost.** `expo-crypto` is a new dependency with native code, so it
needs `pnpm install` and a rebuild. Until `pnpm-lock.yaml` is regenerated on the pinned
toolchain, **gate 0 fails on the lockfile check** — correctly, and by the same rule E-032
records: a manifest and the lockfile must move together, and only the toolchain that can install
can produce the entry. A registry package needs an integrity hash and a peer-resolution key that
cannot be hand-written safely.

**Also bad.** Module-level mutable state, with an initialisation-order hazard: a screen that
somehow rendered before the root layout would take the refusal branch. Mitigated by installing
at module scope rather than in an effect, and by the refusal being loud.

**Neutral.** `crypto` is now banned by `no-restricted-globals` across `packages/**` and
`apps/mobile/src/**`, with the engine zone kept on its own list because a later flat-config
object replaces a rule rather than merging it. `globalThis.crypto` is deliberately not flagged —
reading it defensively is how a port asks whether a platform has one.

## Alternatives considered

**Polyfill the global** with `react-native-get-random-values` and a side-effect import. One
line, and it is what most projects do. Rejected: it leaves a platform-neutral package depending
on an ambient global, so the next runtime that lacks one fails the same way — and the failure
would again be invisible to every gate. It also makes the dependency an import nobody reads.

**Derive key material from `expo-modules-core`'s native `uuid.v4()`**, which is already
installed and backed by `SecureRandom` / `SecRandomCopyBytes`. Tempting, because it needs no new
dependency. Rejected: it means hand-rolling a security primitive — stripping version and variant
nibbles from three UUIDs and concatenating them to reach 256 bits. The construction is probably
correct, and "probably correct" is the wrong standard for the key that encrypts everything a
person has stored.

**`getRandomBytes` instead of `getRandomValues`.** Both exist in `expo-crypto` (verified by
reading the published 57.0.2 tarball, not from memory). `getRandomValues` is the Web Crypto
shape, so the adapter and the port's own Node fallback are the same function under two names —
one behaviour to reason about instead of two.
