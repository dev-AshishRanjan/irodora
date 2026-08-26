# ADR-0075 — The frame output is requested as `rgb`, because `yuv` would mean writing a colour transform

## Status

**Accepted.** Supersedes the pixel-format half of one F-040 acceptance criterion; see below.

## Date

2026-08-26

## Context

F-040 shipped the camera seam with an acceptance criterion that reads:

> *yuv pixel format with conversion in the processor; every frame explicitly disposed and the
> pipeline does not stall*

It is attested and **outstanding** — nobody has run it, because it needs a device.

F-097 is the first feature to write the frame processor against the installed library, and the
criterion collides with two things.

**VisionCamera 5's frame output takes a `TargetVideoPixelFormat` of `native`, `yuv` or `rgb`.**
Requesting `yuv` delivers a planar buffer: `Frame.getPlanes()` returns a Y plane and chroma
planes at half resolution. Turning that into a colour means applying a YUV→RGB matrix — which
one depends on the colour range (`video` or `full`) and the primaries the session negotiated.

**`@irodora/color-*` does not provide that transform, and the app may not write one.**
`apps/mobile/AGENTS.md`: *the engine is imported, never ported*. [E-008](../../.harness/state/effects.json)
records why with a measurement behind it — a mobile-side reimplementation makes the same surface
measure differently on two platforms, and **no single-platform test can see the divergence**.
F-040's own module header names this as the forbidden third option:

> *3. **Reimplement the arithmetic in the worklet.** Forbidden.*

So the criterion, read literally, asks for the one thing the architecture forbids.

## Decision

**The frame output requests `pixelFormat: 'rgb'`.** The camera converts natively, in the
pipeline; the worklet reads bytes and computes nothing.

"Conversion in the processor" is honoured in the sense that matters — the conversion happens
inside the camera pipeline rather than on the JS thread — and is not honoured in the sense of
*us* converting a YUV buffer, which was never a thing this codebase was allowed to do.

Three supporting points:

1. **The frame is still disposed explicitly**, in a `finally`, and that half of the criterion
   stands unchanged. A retained frame stalls the pipeline within a second or two.
2. **The cost is a native conversion per frame**, which is what the `yuv` request was meant to
   avoid. Whether it costs enough to miss NFR-4's 50 ms perceived budget for live pick is a
   device question and stays attested on F-040. If it does, the answer is
   `pixelFormat: 'native'` plus a conversion **in the engine**, not one in the app.
3. **It removes a colour decision from the app.** Which YUV matrix, at which range, for which
   primaries, is exactly the kind of question that produces a plausible wrong answer nobody
   notices — and it would have been answered in a worklet, in an app, by hand.

### A second thing found by wiring the real API

`readCaptureSpace` accepted any string containing `rgb-8` as sRGB. VisionCamera 5's pixel
formats include `rgb-rgb-8-bit`, so **a pixel format would have been read as a colour space** —
a confident sRGB reading for a frame whose space nobody had stated. Nothing had ever passed such
a string in; the wiring is what put one within reach.

Any value naming a bit depth is now rejected as `unknown` before the space rules run, with
decoys in `apps/mobile/test/lens.test.ts`. **The capture space comes from the session** —
`onSessionConfigSelected` → `selectedVideoDynamicRange.colorSpace` — and is `unknown` until it
does, which caps confidence rather than defaulting to sRGB.

## Consequences

**Good.** No colour arithmetic in the app, so the purity rule holds without an exception. The
capture space now comes from the one place that reports it. A pixel format can no longer be
mistaken for a colour space.

**Bad.** A native conversion per frame that the `yuv` request was intended to avoid, unmeasured
on any device. F-040's criterion no longer describes what the code does, and this ADR is the
only thing recording that — a reader of `feature_list.json` alone would not know.

**Neutral.** `native` remains available if a device measurement says the conversion is too
expensive. That would be a change of request, not a change of architecture.

## Alternatives considered

**Request `yuv` and write the transform in the worklet.** What the criterion literally asks
for. Rejected: it is the forbidden option in `apps/mobile/AGENTS.md`, E-008 and F-040's own
header, and it would put a colour matrix in the least testable code in the repository.

**Request `yuv` and add a YUV→RGB converter to `@irodora/color-spaces`.** Architecturally
correct and a genuine option — the engine is where a transform belongs. Rejected *for now* on
scope: it is a new published conversion in the strictest package in the repository, which needs
golden data and an ADR of its own, and F-097 is a feature about a surface. Worth reopening if a
device measurement rejects the native conversion.

**Leave the criterion and implement nothing.** The path has had no producer since R2, which is
the defect F-097 exists to close.
