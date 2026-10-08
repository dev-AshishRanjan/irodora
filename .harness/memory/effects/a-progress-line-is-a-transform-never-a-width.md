# E-182 — A progress line is a transform, never a width

**Link:** `packages/ui/src/ProgressBar.tsx` (its value drawn as a `scaleX` from the leading edge,
`PROGRESS_TRACK` 4 dp from 14) → `apps/mobile/src/launch.tsx`, F-266's motion
**Guard:** `progress-bar.test` (nothing but the scale moves with the value; one ink each in Sumi and Washi;
the thickness recomputed from 14's reading); the conformance registry; `verify-motion`
**Severity:** low **Feature:** F-231

---

## Why B changes when A does

F-266 animates the launch's progress between its steps, and the motion system may animate only transforms
and opacities. A ProgressBar that drew its value as a width would force a layout per frame and fall outside
what `verify-motion` allows; one whose ink changed with the value would animate a colour, which nothing in
this product may. The value is length — never colour — so the line is also never colour-only.

## What the value is on the splash

`launchProgress`: how much of the launch's rise and hold has elapsed, at each step (0, 0.5, 1). Nothing
loads after the first frame, so a loading percentage would be invented (ADR-0127 §6, R9 §8).
