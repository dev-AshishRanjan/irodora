# Plan: F-118 — Frame processors need a package nobody had installed

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-118 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-13, FR-15                                              |
| **Service / package** | `mobile` — `apps/mobile/package.json`                     |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | none                                                      |

---

## The answer, from the device

F-117 replaced a process death with a screen that prints what failed. The screen said:

> **Cannot use Frame Processors - `react-native-vision-camera-worklets` is not installed!**

That is thrown by `VisionCameraWorkletsProxy.ts`, in
`react-native-vision-camera/src/third-party/` inside the installed dependency:

```ts
const module = require('react-native-vision-camera-worklets')
…
throw new Error('Cannot use Frame Processors - `react-native-vision-camera-worklets` is not installed!')
```

`react-native-vision-camera-worklets` is a **separate companion package** and it was installed
nowhere in this repository. It is *not* `react-native-worklets`, which was installed all along —
that one is Reanimated's worklet runtime; this one is VisionCamera's bridge onto it, and the
Lens uses `useFrameOutput`, so it is required rather than optional.

## Why nothing found this before the device did

VisionCamera declares it in **no** dependency field — not `dependencies`, not
`peerDependencies`, not `optionalDependencies`. It is loaded by a bare `require` inside a
`try`/`catch`, so:

- `pnpm install` has nothing to warn about,
- the lockfile is complete and correct without it,
- typecheck never sees it — nothing in our source imports it,
- the APK builds, because the missing piece is a JS module resolved at runtime.

**A dependency that exists only inside a `try` block is invisible to every tool that reads
dependency metadata.** The only thing that finds it is running the feature.

## The fix

Declare it, at the same version as VisionCamera, **pinned exactly**.

`react-native-worklets` and `react-native-reanimated` are already pinned exactly in this file;
VisionCamera's `^5.2.2` was the outlier. Both camera packages are now `5.2.2` with no range,
because they are generated together and a resolution that moved one and not the other would
reintroduce a mismatch nothing here would catch.

The first resolution took the bridge to **5.2.3** while the camera stayed at 5.2.2 — allowed by
the caret, and exactly the drift the pin exists to prevent.

## Files to touch

```
apps/mobile/package.json   — the dependency, and both pins
pnpm-lock.yaml             — regenerated with --lockfile-only
```

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| A new native dependency | the Android build, autolinking | `gate:artefact` (16) reads the built permission set |
| Both camera packages pinned | future resolutions | `gate:state` lockfile check |

**E-049 applies and is why gate 16 matters here.** A new native package can bring its own
manifest permissions. This one should not — it is a worklet bridge — but "should not" is the
assumption that let `RECORD_AUDIO` ship, so the release lane is where it is checked, not here.

## Test plan

- **The lockfile moves with `package.json`**, verified by diff: 22 lines, the bridge added and
  the two specifiers pinned, camera resolution unchanged.
- `verify-lockfile-proof.mjs` and gate 0's lockfile check both pass.
- Every other gate still passes — nothing in our source imports the new package, so the change
  is invisible to typecheck and tests by design.

## Verification

```
node scripts/verify-state.mjs && node scripts/verify-lockfile-proof.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:a11y && pnpm test:contrast
```

**The fix cannot be confirmed here**, for the same reason nothing found it here: it needs an
install and a device. `pnpm install` has never run on this workstation — the workspace links are
hand-made junctions — so the new package is not in `apps/mobile/node_modules` and cannot be.
CI installs from the lockfile; the device is what proves the Lens opens.

## Risks and open questions

- **This is the error the device reported, and fixing it may reveal the next one.** The screen
  F-117 added stays, so if there is another it will name itself rather than closing the app.
- **F-040's attestations remain outstanding.** Nothing here changes that, and they are the
  reason this reached a user at all.

## Out of scope

- Removing the `CameraUnavailable` screen. It is what produced this diagnosis and it is the
  behaviour a shipped app should have.
