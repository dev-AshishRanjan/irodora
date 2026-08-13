---
kind: lesson
title: CVD support is a scoring problem, not a rendering one
category: user-correction
confidence: 0.95
created: 2026-08-13
scope: [packages/cvd-engine, packages/recommendation, apps/web]
links: [[one-separation-definition-for-ui-and-engine]]
---

# CVD support is scoring, not rendering

The industry default is a **display filter**: a toggle that simulates colour-vision
deficiency on screen so a designer can check their work.

That helps designers. It does close to nothing for the person the feature is nominally for.

## What a CVD user actually needs

Someone with deuteranomaly choosing trousers does not want to see what their outfit looks
like **to someone else**.

They want to know whether the outfit **works** — whether the shirt and jacket are
distinguishable, whether the combination reads as intended, and if not, what to wear
instead.

That is not a rendering question. It is a scoring question, and scoring happens in the
engine.

## The second failure of the filter approach

If CVD lives only in the UI, the recommendation engine generates candidates **with no
knowledge of separation**, and the UI filters afterwards.

Two consequences, both bad:

- A highly-ranked recommendation disappears with no explanation.
- The ranking never learns to prefer separable combinations, so the same poor candidate is
  generated every time.

## What we do

Separation is a **weighted factor in every outfit score**, from the same definition the UI
uses ([ADR-0009](../../../docs/adr/0009-cvd-is-an-engine-concern-not-a-ui-filter.md)).
Recommendations are generated with separation in mind, not filtered after.

The `cvd` gate asserts it, so a regression that makes recommendations less accessible fails
the build rather than reaching a user.

## Two details that are easy to get wrong

**Lightness is part of separation.** Two colours a dichromat cannot separate by hue may be
perfectly separable by value. A hue-only score flags working outfits as failures — which is
its own accessibility failure.

**Anomalous trichromacy is the common case.** Protanomaly and deuteranomaly are far more
prevalent than the -opias. A dichromat-only model mishandles most CVD users, which is why
the Machado severity model is there alongside Brettel–Viénot.

## And it is never paywalled

Charging a disabled user for the feature that addresses their disability contradicts the
product's stated purpose ([ADR-0027](../../../docs/adr/0027-monetisation-tiers.md)).
