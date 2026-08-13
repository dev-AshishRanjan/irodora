# AGENTS.md — `apps/mobile`

> **Scoped harness. Extends [`../../AGENTS.md`](../../AGENTS.md), which still applies in
> full.** Stricter, never looser.

Expo SDK 57 (RN 0.86) with a **development client** — not Expo Go, because VisionCamera is a
native module.

---

## Native projects are generated

`ios/` and `android/` come from `expo prebuild` and are **gitignored**.

**Never hand-edit them.** Native configuration lives in `app.config.ts` and config plugins. A
hand-edited native project is a merge conflict and an upgrade blocker, and the edit
disappears silently on the next prebuild.

## The camera

- **Frame processors run on a worklet thread.** The UI thread never blocks on colour maths.
- **Prefer `yuv`** and convert in the processor — roughly 2.6× less bandwidth than `rgb`,
  which forces an extra conversion on every frame.
- **Dispose every frame.** A retained frame stalls the pipeline within a second or two.
- **Read the capture colour space; never assume it.** A P3 frame interpreted as sRGB is wrong
  in exactly the saturated colours the product cares most about. When the platform will not
  say, provenance records `unknown` and confidence is capped.
- **Only a small numeric result crosses the bridge.** Passing frames defeats the purpose.
- **The frame is discarded** — not cached, not queued, not written to a temporary file.

## The engine is imported, never ported

`@irodora/color-core` is the same package the web imports. Sampling logic, rejection rules
and averaging live there; the platform layer produces pixels and nothing more.

A mobile-only "optimisation" of the sampling maths makes the same fabric measure differently
on the two surfaces — and **no single-platform test can see it**
([E-008](../../.harness/state/effects.json)).

## Offline is the normal path

**Every write succeeds locally first.** Sync is background reconciliation.

SQLite via `expo-sqlite` behind the shared repository interface with its conformance suite.
Tokens and keys in **SecureStore**, never the app database.

The UI shows queued state, never an error, when offline. Nothing failed.

## Permissions

Requested **in context, with a reason**, at the moment of use — never on launch. Denial is
handled gracefully: manual colour entry always works without a camera.

Location is never requested.

## Accessibility

`accessibilityLabel`, `accessibilityRole`, `accessibilityHint` · Dynamic Type to 200 % ·
VoiceOver and TalkBack verified per release · **every swatch labelled with its name and
value** · haptic confirmation on selection, a non-visual channel that costs nothing.

## Platform differences, handled explicitly

```ts
// No — an assumption about what "iOS" means, which ages badly.
if (Platform.OS === 'ios') { /* assume P3 */ }

// Yes.
const space = frame.colorSpace ?? 'unknown';
```

## Never

Hand-edit `ios/` or `android/` · retain a frame · reimplement colour maths · store a token
outside SecureStore · block a write on the network · upload an image without an explicit
user action · log an image, a frame, or a profile dimension.

## Before you start

[`.harness/rules/mobile/mobile.md`](../../.harness/rules/mobile/mobile.md) ·
[ADR-0006](../../docs/adr/0006-camera-capture-vision-camera-and-getusermedia.md) ·
[ADR-0019](../../docs/adr/0019-mobile-expo-dev-client-new-architecture.md).
