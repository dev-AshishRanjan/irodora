# Plan: F-117 — A screen whose native module will not load must not close the app

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-117 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-13, NFR-8                                              |
| **Service / package** | `mobile` — `apps/mobile/app/lens.tsx`, `src/lens`          |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | none                                                      |

---

## The report, twice

> *Read a colour with the camera is not working. It stopping the app.*
> *Still we are getting the same issue — the app is closing after we click on the button.*

F-115 fixed a real defect (a worklet calling an unmarked function) and **it was not this one**.
That crash happens on the first *frame*; this one happens on the *button press*, before any
camera exists. I should have weighed that distinction before shipping the first fix, and the
second report is what made me read the timing properly.

## The mechanism, established

`react-native-vision-camera` builds its native binding at **module scope**:

```ts
export const VisionCamera = NitroModules.createHybridObject<CameraFactory>('CameraFactory')
```

So *importing* the library throws when the HybridObject is not registered. This repository has
already written down the exact error, in [`permission.ts`](../../apps/mobile/src/lens/permission.ts):

```
Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found.
```

`app/lens.tsx` imported the camera **statically**, so that throw happened while the route module
was being evaluated — *before React rendered anything*. No error boundary can catch that, and
the process goes down. Pressing the button closed the app.

## What this feature fixes, and what it does not

**It fixes the app closing.** That is a defect on its own terms and the one thing in the report I
can address without a device: one screen's native dependency must never be able to kill the
process.

**It does not fix the camera.** Why the HybridObject is unregistered in that build is still open,
and this feature deliberately does not guess at it — see below.

## Three hypotheses I eliminated, with the evidence

Recorded because the next person will otherwise re-run them, and because I was wrong twice.

| hypothesis | why it is false |
| --- | --- |
| Nitro peers are not autolinked (they are declared nowhere and, under pnpm, live only inside VisionCamera's own `node_modules`) | `expo-modules-autolinking react-native-config` — the exact command `settings.gradle` runs via `expoAutolinking.rnConfigCommand` — reports all four modules resolved. The dependency change was reverted. |
| The worklets babel plugin is missing, so `'worklet'` is inert | `babel-preset-expo@57` auto-adds it when it resolves, and `require.resolve('react-native-worklets/plugin', { paths: ['apps/mobile'] })` succeeds. |
| The autolinking output shows no Android platform data for the camera stack | It shows none for `react-native-screens` or `gesture-handler` either, and those demonstrably work. An artefact of the output mode, not a signal. |

**The tell I under-weighted for too long:** the APK builds, installs and runs. A native module
missing from the build usually fails earlier and louder than one screen closing.

## Approach

`React.lazy` around the camera, inside an error boundary.

- **`src/lens/CameraLens.tsx`** — everything that needs the native module: the permission hook,
  the viewfinder, the hand-off. Only ever loaded lazily.
- **`src/lens/CameraUnavailable.tsx`** — what the Lens shows instead. It prints the error text
  **on purpose**: this failure is structural rather than transient, no retry helps, and the only
  useful thing a person can do is say what it said. "Something went wrong" would delete the one
  fact that makes the report actionable.
- **`app/lens.tsx`** — `lazy` + `Suspense` + a small class boundary. A class because
  `componentDidCatch` has no hook equivalent, and expo-router's own `ErrorBoundary` export is for
  render errors rather than a module that will not load.

`Lens.tsx` itself is untouched, so everything gate 8 and gate 9 already assert about it still
holds unchanged.

## Files to touch

```
apps/mobile/app/lens.tsx                     — lazy + boundary
apps/mobile/src/lens/CameraLens.tsx          — NEW, the native half
apps/mobile/src/lens/CameraUnavailable.tsx   — NEW, the honest failure
apps/mobile/src/i18n/{en,ja}.ts              — three keys, both locales
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf — regenerated for the new kanji
```

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| The camera import becomes lazy | the Lens route | `gate:test`, and a device |
| New Japanese copy | the bundled font subset | `gate:content` |

**The font subset is regenerated in this change rather than after a red gate.** F-113 recorded
that forgetting it is the repository's most-repeated mistake; ten new codepoints, gate 11 green.

## Test plan

- The mobile suite still passes unchanged — `Lens.tsx` is not touched, and the route is not in
  the screen suite because it reaches a native module.
- `describe()` turns anything thrown into readable text and never `[object Object]`.
- Gate 11 is green **with the subset regenerated**, not after it goes red.
- `a11y` and `contrast` still pass: the new screen uses `Text`, `Surface` and tokens only.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:a11y && pnpm test:contrast && pnpm test:content
```

**The fix cannot be confirmed here.** It needs the device that crashes. What it changes is the
failure mode, and the next run either shows the Lens working or shows a screen naming the cause —
and either outcome is progress, where a closed app was none.

## Risks and open questions

- **This does not make the camera work.** If the HybridObject is genuinely unregistered, the
  screen will say so instead of crashing, and the message will finally identify why.
- **`Suspense fallback={null}`** — the module is in the bundle, so on a working build it resolves
  in the same tick and a spinner would only flash.

## Out of scope

- The underlying registration failure, which needs the crash log from the device. Asking for it
  is the next step, not a guess.
