# Plan: F-188 — Motion is the default, not the exception

| | |
|---|---|
| **Feature** | F-188 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-25 |
| **Package** | `@irodora/ui` · `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

*"There is no animation and transistions in the app. The app feels dead and uncreative."*

The motion system has existed since F-144 — a duration scale, two easings, a live reduced-motion
subscription, a gate that refuses an animated colour — and **`Appear` reached one of seventeen
screens.** The capability was built, proven, and applied once.

## Approach

**One change, seventeen screens: `Screen` enters.**

Wrapping in `Screen` rather than in seventeen files is not only cheaper. It is the difference
between a **property of the product** and a habit somebody has to remember — the eighteenth
screen gets it without knowing this decision was made, which is what a design system is for.
It is the same argument `Screen` already makes for the title step and for the safe-area inset,
both of which moved here for the same reason.

**One `Appear` per screen, not one per child.** A screen whose every block arrived separately
would take as long to assemble as it takes to read, which is the shape that reads as slow rather
than as considered. `visual-taste` is explicit that scattered animation is one of the tells of
generated design.

**`Section` gains an optional `index`.** Where a screen genuinely has an order — Home's is the
lead colour, then the wardrobe, then whichever colour did not lead — the sections arrive in it.
**Optional, and absent means "not part of a sequence"**: a section that is the only one on its
screen has no order to arrive in, and giving it a delay would be a pause with nothing on the
other side.

The delay is derived from the index inside `Appear` and never passed as a duration — a caller
that could pass milliseconds could pass a number off the scale, and then the scale is decorative.

## What is NOT done here, and why

**The shared-axis screen transition.** The root stack already animates on one axis
(`slide_from_right`) at the manifest's `view` duration, which is the X form of a shared axis.
Making it a true Material shared axis — a slide *and* a cross-fade, with the outgoing screen
moving too — needs a custom animator on `react-native-screens`, and `animationDuration` is
already only honoured for some animation types and never on the web. That is a feature, not a
line, and claiming it here would be claiming a transition nobody built.

## Files to touch

```
packages/ui/src/layout.tsx        — Screen enters; Section takes an index
apps/mobile/src/screens/Home.tsx  — the three sections carry their order
```

## Test plan

- **`verify-motion` still passes**, which is the assertion that matters: `Appear` animates
  `opacity` and `translateY` only, and nothing here widens that.
- **The conformance suite re-renders every screen**, so a `Screen` that stopped rendering its
  children would fail thirty-odd subjects at once.
- **Reduced motion** is `Appear`'s own, already tested in `motion.test.tsx`: the element is
  present at rest with no delay, not animated faster.

## Verification

`typecheck · lint · format · test · a11y · contrast · motion · build · state`. Not run: `cvd`,
`color-golden`, `content` — no colour, no maths, no corpus.

## Risks

- **Nobody has seen it move.** Whether 180 ms and a 12 px rise read as considered or as sluggish
  is the judgement, and it is now the fourth R7 feature owing one. Attested.
- **Every screen animating on mount is a decision that is hard to unmake quietly.** It is one
  line in one file, which is also what makes it easy to revisit — and F-204's sweep is where
  somebody looks at all seventeen together.

## Out of scope

Micro-interactions (F-189), the launch sequence (F-190), illustration (F-191), and the shared
axis above.
