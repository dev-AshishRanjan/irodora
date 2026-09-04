# One setting, three mechanisms, and only one is asserted

**Effect:** [E-068](../../state/effects.json) · `packages/ui/src/motion.tsx` →
`apps/mobile/app/_layout.tsx`, `packages/ui/src/overlay.tsx` · **medium**

## What happened

Reduced motion is one user setting. F-144 obeys it in three different places, because the three
layers own different things.

| Where                | Mechanism                                              | Asserted?          |
| -------------------- | ------------------------------------------------------ | ------------------ |
| `useMotion()`        | subscribes to `AccessibilityInfo`, returns 0            | **Yes**            |
| `overlayKeyframes`   | carries `ReduceMotion.System`; reanimated decides       | No — cannot be     |
| screen transitions   | the native stack; the OS decides                        | No — not ours      |

Each is the correct owner for its layer. A `Keyframe` is a value rather than a hook, so it cannot
consult anything itself. A screen transition is animated by the platform at a level no JavaScript
sees.

## The hazard

**All three look alike from the outside.** Three places that "handle reduced motion", one of them
checked. A reader who assumes uniform coverage will trust the other two more than the evidence
allows — and there is nothing in the code that signals which is which, because correct code and
unverified code look the same.

Written down here so the asymmetry is a recorded fact rather than something the next reader has to
rediscover by going looking for a test and not finding one.

## The frame this costs, and why it is not closed

`AccessibilityInfo.isReduceMotionEnabled()` is **asynchronous on both platforms**. No component can
know the answer at mount. `Appear` therefore starts hidden and reaches rest on the frame after it
learns — roughly 16ms of invisibility for a user who explicitly asked for no motion.

Reanimated's `useReducedMotion()` is synchronous and would close the window. It is deliberately not
used: its answer is module state cached at import, which under jest is always `false`. Seeding from
it would add a line **no test could observe**.

An unverified line that removes 16ms is a worse trade than a verified one that does not. If this
ever needs closing, the thing to build first is a way to drive reanimated's cached answer — not the
seed.

## The general shape

When one user-facing setting is honoured at several layers, say **per layer** what is checked. The
temptation is to write "reduced motion is supported", which is true and tells a reader nothing about
which third of it has a test behind it.

Related: [[the-page-inset-is-what-stops-a-colour-bleeding]],
[[a-new-engine-can-make-an-old-gate-blind]]
