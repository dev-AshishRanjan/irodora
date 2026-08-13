---
kind: lesson
title: Averaging non-linear sRGB reads too dark
category: convention
confidence: 1.0
created: 2026-08-13
scope: [packages/color-core, packages/color-spaces, apps/web, apps/mobile]
links: [[sampling-lives-in-the-engine-not-the-platform]], [[srgb-transfer-function-has-a-linear-segment]]
---

# Averaging non-linear sRGB reads too dark

**Any aggregation of pixels must happen in linear light.** Convert, average, convert back.

## Why

sRGB is gamma-encoded: the stored value is roughly the 1/2.2 power of the light intensity.
Averaging encoded values is not the same operation as averaging light.

```
Two pixels of light intensity 0.0 and 1.0
  true mean intensity                    = 0.50
  averaged in sRGB: (0 + 255)/2 = 128    → intensity 0.216
```

**The error is always in the same direction** — the result is darker than the fabric. It is
not noise; it is a systematic bias, which is why it survives averaging over a thousand
pixels and why it looks like a plausible measurement.

## Where it appears

Anywhere pixels are combined: the precision-pick average, thumbnail generation, pattern
colour extraction, any downsampling, any blur.

It is the single most common colour bug in software, and it is common precisely because the
result looks reasonable.

## How to apply

```ts
// No.
const mean = pixels.reduce((a, p) => a + p, 0) / pixels.length;

// Yes.
const linear = pixels.map(srgbToLinear);
const mean = linearToSrgb(linear.reduce((a, p) => a + p, 0) / linear.length);
```

The engine's sampling pipeline does this once, correctly, and both platforms use it
([E-008](../../state/effects.json)). A platform-side "optimisation" that averages before
conversion reintroduces the bug on one surface only.

## How it would be caught

A golden test with two known extremes and their true mean. Without one, nothing fails — the
result is simply wrong by a consistent amount that nobody has a reference for.
