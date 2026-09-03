---
kind: lesson
title: A worklet unpacks its closure in the body, so a parameter default cannot read a captured variable
category: engineering
confidence: 1.0
created: 2026-09-03
scope: [apps/mobile]
links: [[a-worklet-may-only-call-worklets-and-jest-has-one-runtime]], [[a-decoy-that-is-not-broken-proves-nothing]], [[a-gate-that-reads-the-filesystem-answers-differently-before-install]]
---

# `max = MAX_SAMPLES_PER_FRAME` threw on every frame

The Lens showed *"the frame processor threw: Property `MAX_SAMPLES_PER_FRAME` doesn't exist"*
over a live preview. The source looked unremarkable:

```ts
export function sampleStride(regionPixels: number, max = MAX_SAMPLES_PER_FRAME): number {
  'worklet';
  …
}
```

The directive is right. The constant is captured — it really is in `__closure`. What the
`react-native-worklets` babel plugin emits is this:

```js
(function sampleStride(regionPixels, max = MAX_SAMPLES_PER_FRAME) {
  const { MAX_SAMPLES_PER_FRAME } = this.__closure;   // ← the first statement of the BODY
  …
})
```

**A parameter default is evaluated before the body runs**, in the parameter scope, which cannot
see a body-level `const`. The name resolves against the worklet runtime's global object, where
nothing of that name exists.

## The rule

**A worklet may reference a captured variable only from its body.**

```ts
export function sampleStride(regionPixels: number, max?: number): number {
  'worklet';
  const cap = max ?? MAX_SAMPLES_PER_FRAME;   // read after the closure is unpacked
  …
}
```

## Why every gate stayed green

It throws only when the default is *used*. `sampleFrame` calls `sampleStride(size * size)` with
one argument, so it fired on every frame — but every test calls it on the JS thread, where the
real module binding exists. Jest has one runtime and no worklet boundary, so both arities work
there either way. **This was only findable on a device.**

It is F-116's shape one layer in: that feature made the `'worklet'` **directive** checkable;
this is about what a correctly-marked worklet may then **reference**.

## The habit, and the thing I got wrong first

My first hypothesis was that the plugin *fails to capture* identifiers in parameter defaults.
It was wrong — `getClosure` calls `funPath.traverse`, which visits params — and I only found
that out by opening the installed plugin instead of reasoning from what I expected it to do.

**When a transform misbehaves, read what it emitted.** One `transformAsync` call against the
real plugin settled in seconds what an hour of plausible theory would not have:

```js
const appRequire = createRequire('apps/mobile/package.json');
const plugin = appRequire.resolve('react-native-worklets/plugin');
const babel = createRequire(plugin)('@babel/core');
```

That resolution path matters too — reaching into `node_modules/.pnpm/<name>@<hash>/` by literal
path is what left a dead link in a plan file and turned CI red for four pushes
[[a-gate-that-reads-the-filesystem-answers-differently-before-install]]. Ask the dependency
graph, not the directory listing.

`scripts/verify-worklet-defaults.mjs` now enforces the rule by reading the plugin's own emitted
code rather than re-deriving what it would do — the one oracle that cannot disagree with what
ships.
