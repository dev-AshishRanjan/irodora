# A new engine can make an old gate blind

**Effect:** [E-067](../../state/effects.json) · `packages/ui/src/motion.tsx` →
`scripts/verify-motion.mjs` · **high**

## What happened

`verify-motion.mjs` has enforced the one rule that matters here — **motion may never animate a
colour** — since F-143. It reads `<Animated.X style={{ … }}>` and checks the style keys against
`motion.animatable`.

F-144 introduced reanimated. On the first run afterwards the gate printed:

```
106 source file(s) scanned; 0 with an Animated style literal.
No forbidden animation.
```

`motion.tsx` was in that scan, animating opacity and a transform.

Reanimated does not write a style literal. It writes `useAnimatedStyle(() => ({ opacity: … }))` —
a worklet returning an object, not a JSX attribute — and `new Keyframe({ 0: {…}, 100: {…} })`,
whose properties are the keys of the **frames** rather than of the argument. A regex for a JSX
attribute cannot see either.

## Why this shape is worse than an ordinary gap

**The gate did not fail. It did not warn.** It reported a clean scan of a codebase it could no
longer read, and the number that gives it away — zero animated elements in an app that had just
started animating — is precisely the number it had printed, truthfully, for every release before
this one. Nothing about the output changed at the moment its meaning inverted.

A gate that goes red is doing its job. A gate that goes quiet looks identical to a gate with
nothing to find.

## The general rule

**A checker's blind spot is a property of the technology it scans, not of the rule it enforces.**
`verify-motion` was correct about React Native and became silent about reanimated without a line
of it changing. Adopting a library, a framework or a file format is therefore the moment to
re-derive what the checker can still see — and nothing prompts that, because the check keeps
passing.

The question to ask on adoption is not "does the gate still pass" but **"what does this new thing
look like, and would the gate see it?"**

## What closed it

Three checks, twenty `--prove` cases, decoys in both directions. The two that carry the most
weight are the ones that must **pass**:

- `transform: [{ translateY: … }]` must be allowed — a check that read the nested key would
  reject the one animation this product is built on.
- `.duration(nativeMotion.durations.micro)` must be allowed — a check that rejected every mention
  of `duration` would ban the typed API it exists to enforce.

A gate that flags its own legitimate case gets switched off within a week, and then the rule has
no enforcement at all.

Related: [[a-mock-that-supplies-a-missing-export-hides-that-it-is-missing]],
[[an-unreached-token-is-unfinished-work]]
