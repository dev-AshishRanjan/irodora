# Plan: F-192 — The mark is a mark

| | |
|---|---|
| **Feature** | F-192 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The premise changed, and that is the first thing to say

This feature was written when **two marks had been rejected** at the one step no gate here can
discharge — somebody looking at it — and F-165's third had not been seen. Its criterion 1 asked
for a mark that *"says something about colour that a ring of discs does not"*, which is a
request to replace the disc mark.

**The third mark has now been approved**: *"The icon on home screen looks good."*

So drawing a fourth would be the opposite of what this feature is for. Criterion 1 becomes
**keeping** it, and its other halves are **verified rather than rebuilt** —
[`brand.test.tsx`](../../packages/ui/test/brand.test.tsx) already covers 16px and all three CVD
simulations, and says the CVD check *"changed shape with the mark, and got stronger"*.

## What is genuinely undone

```
apps/mobile/assets/brand/
  icon.png              iOS and the store, opaque, in colour
  adaptive-icon.png     Android foreground, transparent
  splash-icon-light.png monochrome
  splash-icon-dark.png  monochrome
                        ← no monochrome icon
```

`app.config.ts` sets `adaptiveIcon.foregroundImage` and `backgroundColor` and **no
`monochromeImage`**. On Android 13+ with themed icons switched on, the launcher then derives its
own silhouette from an icon this product designed deliberately — which is the same class of
defect as the icon that predated F-141: *"an app icon is the one asset you stop seeing after a
week, so nobody notices."*

## The layer is the geometry that already exists

`assets()` already builds `monoLight` and `monoDark` ink schemes for the splashes. The themed
layer is the **adaptive** geometry — `ADAPTIVE_GRID`, so it survives the launcher's mask — drawn
with a single ink on a transparent ground.

**The colour is not the point and the plan says so.** Android tints the monochrome drawable
itself; what it consumes is the **alpha silhouette**. The ink is `lightInk` because that is the
one the splash already uses and one source is better than a new decision, and the choice is
recorded as not mattering rather than left to look deliberate.

## What stays attested

**Gate 16 reads the mark out of a built APK, and no APK can be built here.** That is F-165's
second outstanding attestation and it carries forward unchanged — the mark's proportions survive
a resize by construction, which is why the check is written as proportions, but that is a
property of the design rather than an observation until gate 16 runs.

## Files to touch

```
scripts/generate-brand-assets.mjs   — the fifth asset
apps/mobile/assets/brand/           — monochrome-icon.png, generated
apps/mobile/app.config.ts           — adaptiveIcon.monochromeImage
packages/ui/test/brand.test.tsx     — the layer is a silhouette, not a picture
```

## Test plan

- **The generator produces five assets**, and `--check` fails on a stale one — it already does,
  so the assertion is that the count moved with the list rather than being written down twice.
- **The monochrome layer is a silhouette:** every painted pixel is one ink, and the ground is
  transparent. A layer that kept the five petal colours would look correct in a preview and be
  wrong the moment a launcher tinted it.
- **The signature still resolves** at the adaptive grid, so the mark in the themed layer is the
  same mark and not a redraw.

## Verification

`state · typecheck · lint · format · test · build · cvd`.

## Risks

- **Nobody can see a themed icon here.** It needs Android 13+, themed icons switched on, and a
  build. Attested, and it is the same gap that made this feature wait for a person in the first
  place.

## Out of scope

Redrawing the mark, and gate 16 — the first is refused on the evidence, the second needs an APK.
