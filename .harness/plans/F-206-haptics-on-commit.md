# Plan: F-206 — Haptics on commit, and never on a scroll

| | |
|---|---|
| **Feature** | F-206 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

Split out of F-189 rather than done badly. Its criterion asked for haptics; `expo-haptics` was
not a dependency, and *"adding one in the middle of a wave to satisfy a clause is how a
dependency arrives without a decision"*. This is the decision.

## The rule is about restraint, not about firing

**A haptic on a scroll is why people turn haptics off.** The whole value of the feature is that
it fires on the small number of moments that are *commits* — a garment saved, a reading taken, a
theme chosen — and on nothing else.

So the enforceable shape is a **port with one verb**:

```ts
commit(): void   // and there is no second function
```

A module that cannot express *"buzz on scroll"* is a module nobody can use to buzz on scroll.
That is the guarantee, and it is stronger than a rule saying not to.

## The dependency

`expo-haptics@~57.0.2`, matching Expo SDK 57. Peer range is `expo: *`, satisfied and checked by
`verify-peer-deps`. **The bundle cost is stated rather than waved at** — measured after install
and recorded in the port's docblock and in progress, because criterion 3 asks for it.

## The platform setting is honoured by not asking

Criterion 2: *"a device with haptics off feels nothing and the app does not ask"*. `expo-haptics`
delegates to the OS — iOS respects the system haptics setting, Android goes through the vibrator
with the app's permission-free path. **This app adds no preference of its own**, and that is the
decision: a second switch beside the platform's is a setting somebody has to keep in sync with a
setting they already set.

What that means for verification is stated honestly: the delegation is a property of the library
and the OS, and this workstation has no device. It is **attested**.

## Where it fires

Three commits, and they are the three the criterion names:

| | |
|---|---|
| a garment saved | `AddGarment` |
| a reading taken | the Lens capture |
| a theme chosen | `Preferences` |

Each call site is a **port passed in by the route**, like every other device seam in this app, so
the screens stay renderable by the conformance suite.

## Files to touch

```
apps/mobile/package.json                 — the dependency
apps/mobile/src/haptics.ts               — the port. One verb.
apps/mobile/src/screens/AddGarment.tsx   — on save
apps/mobile/src/screens/Preferences.tsx  — on choosing a theme
apps/mobile/src/lens/CameraLens.tsx      — on capture
apps/mobile/app/(tabs)/**                — the routes supply the real one
apps/mobile/test/haptics.test.ts         — one verb, and it fires once per commit
```

## Test plan

- **The port has one verb**, asserted over its exports — a second function is how the rule
  erodes.
- **Each commit fires exactly one**, through a fake, and a **decoy**: a re-render, a filter
  change and a scroll fire none. Without it, "fires on commit" is satisfied by firing always.
- **Nothing imports `expo-haptics` outside the port**, so the one verb cannot be bypassed. Same
  shape as the Lens's exit table (F-178).
- **The peer range is checked** by the existing gate rather than by a new one.

## Verification

`state · typecheck · lint · format · test · build`.

## Risks

- **A native module can break the build.** `pnpm build` runs `expo prebuild`; this is verified
  before anything is wired, and if it does not install cleanly the feature stops there and says
  so rather than half-landing.
- **Nobody can feel it here.** Attested — the whole feature is a physical sensation on a device.

## Out of scope

Any preference of our own for haptics, and haptics on anything that is not a commit.
