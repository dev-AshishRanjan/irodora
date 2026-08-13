---
kind: effect
id: E-008
title: Sampling lives in the engine; the platform layer only produces pixels
severity: high
guard: test:packages/color-core/src/sampling.test.ts
confidence: 0.88
created: 2026-08-13
scope: [packages/color-core, apps/web, apps/mobile]
links: [[srgb-xyz-is-the-root-of-every-derived-value]], [[averaging-non-linear-srgb-reads-too-dark]]
---

# Sampling lives in the engine

The Lens exists on two platforms with genuinely different capture mechanisms —
`getUserMedia` + canvas on web, VisionCamera frame processors on mobile.

**The split is: the platform layer produces pixels. Every decision about which pixels count
and how they combine lives in `@irodora/color-core`.**

## Why the boundary is exactly there

A mobile-only "optimisation" of the sampling maths — a cheaper outlier rejection, a
different trimming percentage, averaging before conversion instead of after — would make the
**same fabric measure differently on the two surfaces.**

That breaks NFR-3, and no single-platform test can see it. Web tests pass. Mobile tests
pass. The product is inconsistent, and the only way to find out is to measure the same shirt
twice.

## What is shared

Region handling · jittered spatial sampling · specular and shadow rejection · chromatic
outlier rejection (MAD) · **linear-light conversion before averaging** · median and trimmed
mean · variance · the confidence computation.

## What is platform-specific, legitimately

Obtaining frames · reading the capture colour space · disposing frames · threading. That is
the whole list.

## The trap on mobile

Passing a frame across the bridge instead of a numeric result. It defeats the purpose of
processing on-device, stalls the pipeline, and tempts someone to do the maths on the JS
thread with a different code path.

## What must happen on a sampling change

1. The shared sampling test suite.
2. **Both** surfaces re-verified — an engine change reaches both whether or not you touched
   their code.
3. Confidence calibration re-checked: if rejection changes, the variance changes, and the
   confidence figure means something different than it did.
