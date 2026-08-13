# Mobile Rules

`apps/mobile`. Per
[ADR-0019](../../../docs/adr/0019-mobile-expo-dev-client-new-architecture.md) ·
[ADR-0006](../../../docs/adr/0006-camera-capture-vision-camera-and-getusermedia.md).

---

## Native projects are generated

`ios/` and `android/` are produced by `expo prebuild` and are **gitignored**.

**Never hand-edit them.** Native configuration goes in `app.config.ts` or a config plugin.
A hand-edited native project is a merge conflict and an upgrade blocker waiting to happen,
and the edit disappears silently on the next prebuild.

Contributors need a development build, not Expo Go — VisionCamera is a native module.

---

## The camera

- **Frame processors run on a worklet thread.** The UI thread never blocks on colour maths.
- **Prefer the `yuv` pixel format** and convert in the processor. It is ~2.6× less
  bandwidth than `rgb`, and requesting `rgb` forces an extra conversion on every frame.
- **Dispose every frame** after use. A retained frame stalls the capture pipeline within a
  second or two.
- **Read the capture colour space; never assume it.** A P3 frame interpreted as sRGB is
  wrong in exactly the saturated colours the product cares most about. When the platform
  will not say, provenance records `unknown` and confidence is capped.
- **Hand a small numeric result across the bridge**, never a frame. Passing frames defeats
  the purpose of processing on-device.
- **The frame is discarded.** Not cached, not queued, not written to a temporary file
  ([ADR-0026](../../../docs/adr/0026-privacy-on-device-by-default.md)).

---

## The engine is shared, not ported

`@irodora/color-core` is imported, not reimplemented. Sampling logic, rejection rules and
averaging live in the shared engine; the platform layer produces pixels and nothing more.

A mobile-only "optimisation" of the sampling maths breaks NFR-3 — the one guarantee that
cannot bend.

---

## Offline is the normal path

- **Every write succeeds locally first.** Sync is background reconciliation.
- SQLite (`expo-sqlite`) with the shared repository interface and its conformance suite.
- **Tokens and keys in SecureStore.** Never the app database.
- The UI shows queued state, never an error, when offline. Nothing failed.

---

## Performance

- Colour computation never on the UI thread.
- Lists virtualised. A wardrobe can hold thousands of items.
- Images: cached, downsampled for display, full-resolution only when required.
- Startup: defer everything not needed for the first screen. The Lens should be reachable
  before the wardrobe has finished loading.

---

## Permissions

- **Request in context, with a reason**, at the moment of use — never on launch.
- **Handle denial gracefully.** Manual colour entry always works without a camera.
- Never request a permission the feature does not need. Location is never requested.

---

## Accessibility

- Platform APIs: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`.
- **Dynamic Type** honoured to 200 %.
- VoiceOver and TalkBack verified per release on the reference devices.
- **Every swatch has an accessible label** including its name and value.
- Haptic confirmation on selection — a non-visual channel that costs nothing.

---

## Platform differences

Handle them explicitly, never by feature-sniffing a proxy:

```ts
// No.
if (Platform.OS === 'ios') { /* assume P3 */ }

// Yes.
const space = frame.colorSpace ?? 'unknown';
```

The platform tells you what it supports. Assumptions about what "iOS" means age badly
across four years of devices.

---

## Never

- Hand-edit `ios/` or `android/`.
- Retain a camera frame.
- Reimplement colour maths.
- Store a token outside SecureStore.
- Block a write on the network.
- Upload an image without an explicit user action.
- Log an image, a frame, or a profile dimension.
