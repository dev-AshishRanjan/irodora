# Plan: F-104 — The app crashes on every screen that writes, and the home screen does not scroll

| | |
|---|---|
| **Feature** | F-104 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-3, NFR-13, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/store` · `apps/mobile` · `eslint.config.mjs` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-27 |

---

> **Filed from a field report, not selected through `next-feature`.** Three defects were
> reported together — the app closing on two buttons, the home screen not scrolling, and a red
> CI job — and they are fixed together because they were found in one investigation. The plan
> was written before any source was edited.

## What was reported

1. *"When we click on Build a palette or Build your colour profile, it closes the app. And says
   'Irodora keeps stopping'."*
2. *"We are also not able to scroll the main page… below buttons are not accessible."*
3. *"The CI job is failing."*

## Root cause, found before deciding anything

### 1. The crash — a global that exists in Node and not in Hermes

`/palettes` and `/profile` are **the only two routes that call `deviceRepository()`**, and the
only two screens that call `uuidv7()` in a `useState` initialiser — which runs on first render.
Both paths reach `crypto.getRandomValues` in `packages/store`.

**React Native has no `crypto` global.** Verified by reading
`expo/src/winter/runtime.native.ts` — it installs `TextDecoder`, `URL`, `DOMException` and four
others, and no crypto — and by grepping React Native, `expo-modules-core`, `expo-secure-store`
and `expo-sqlite` for `getRandomValues`, which returns nothing.

So: `undefined.getRandomValues(...)`, an unhandled `TypeError` during render, which Android
reports as *"Irodora keeps stopping"*. Every other route works because no other route generates
randomness. The correlation is exact.

**Why seventeen gates missed it** is the part that matters: the package's tests run under Node,
where the global is real; `tsc` sees `lib.dom`'s declaration; and `no-restricted-globals` existed
but covered `packages/color-*` only.

### 2. The scroll — a fixed `View` where every other screen has a `ScrollView`

`Home.tsx` was `<View style={{ flex: 1, … }}>`. Content past the bottom of the screen was
unreachable, with no scroll and no indicator. F-097 added a sixth button, which is what made it
visible.

Nothing could have caught this either: a react-test-renderer tree has no viewport and no Yoga
pass, so *rendered* and *reachable* are the same thing there and different things on a phone
[[a-gate-must-model-what-renders-not-what-is-physically-correct]].

### 3. CI — three suites, all mine, all committed without being run

The app's jest suite could not run on this workstation all session (`@babel/runtime` missing
from a partial install). Linking it from the pnpm store made it run, and it named three
failures:

| suite | cause | feature |
|---|---|---|
| `lens.test.ts` | imports `viewfinder.tsx` → VisionCamera → native TurboModule **at module load** | F-097 |
| `profile.test.ts` | the 180° sweep's bound stopped one degree short of the warm pole | F-099 |
| `screens.test.tsx` | the Lens paints an untokenised colour and declares `accessible` with no role | F-097 |

F-097's own comment claimed *"jest-expo resolves the module, so importing it costs nothing
here"*. That claim was never run, and it was wrong.

## Approach

**The crash is fixed architecturally, not with a polyfill.**
[ADR-0077](../../docs/adr/0077-the-random-source-is-a-port-and-the-app-installs-it.md): a
`RandomBytes` port in `packages/store`, resolving to an installed source, then
`globalThis.crypto`, then **a refusal that names the fix**. Never `Math.random()` — this value
keys the database, and a weak key works.

`apps/mobile` installs `expo-crypto` at module scope in the root layout, and the install draws a
probe and refuses a wrong length or an all-zero buffer.

**The recurrence is prevented by a lint, not by care.** `crypto` joins `no-restricted-globals`
across `packages/**` and `apps/mobile/src/**`, with the engine zone kept on its own list because
a later flat-config object replaces a rule rather than merging it.

**The scroll** becomes a `ScrollView` with the padding and gap on `contentContainerStyle` — on
`style` they pad the scroller and clip the last child by exactly the bottom padding, which is
the same bug one step smaller.

**`permissionState` moves out of the native-importing file** into `src/lens/permission.ts`. The
boundary belongs where the pure logic ends, not where it happened to be written.

## Files to touch

```
packages/store/src/random.ts          — NEW. The port
packages/store/src/{id,key,index}.ts  — through the port; exported
packages/store/test/key.test.ts       — the port, and the refusal, watched
apps/mobile/src/store/random.ts       — NEW. expo-crypto, with a probe
apps/mobile/app/_layout.tsx           — installs it at module scope
apps/mobile/package.json              — expo-crypto
apps/mobile/src/screens/Home.tsx      — ScrollView
apps/mobile/src/lens/permission.ts    — NEW. The pure mapping
apps/mobile/src/lens/viewfinder.tsx   — imports it
apps/mobile/src/screens/Lens.tsx      — the viewfinder region declares its role
apps/mobile/test/{lens,profile,screens}.test.* — the three CI fixes
eslint.config.mjs                     — `crypto` banned in every shipped zone
```

## Test plan

- **The refusal is watched**, with `globalThis.crypto` deleted — which is what Hermes is here.
- **The installed source takes precedence**, or React Native would silently use the fallback.
- **The lint is watched catching the original line**, by reintroducing it and restoring.
- The three CI suites go green, and the whole app suite with them.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:a11y
```

**Gate 0 will fail on the lockfile until `pnpm install --lockfile-only` runs on the pinned
toolchain**, and that is correct: a registry dependency needs an integrity hash and a
peer-resolution key that cannot be hand-written safely. E-032 is the same rule.

**Not verifiable here:** that the app starts on a device. `expo-crypto` is not installed, so
three `no-unsafe-*` lint errors in the adapter stand until it is, and the fix is reported as
**not yet confirmed on hardware**.

## Risks and open questions

- **The crash fix cannot be confirmed without a device.** The mechanism is proven — the refusal
  branch is exercised by deleting the global — but "the app opens Palette Studio" is a device
  observation and is recorded as one.
- **`expo-crypto`'s API was verified from the published 57.0.2 tarball**, not from memory:
  `getRandomValues<T>(typedArray: T): T`. The version was wrong on the first attempt (`^15.0.7`,
  the pre-SDK-57 scheme) and was corrected against the resolved `expo-*` family.
- **The scroll fix has no automated guard**, and honestly cannot have one in this suite. Stated
  rather than papered over.

## Out of scope

A viewport-aware layout gate · replacing the module-level source with injection at every call
site · the two remaining blocked R3 features.
