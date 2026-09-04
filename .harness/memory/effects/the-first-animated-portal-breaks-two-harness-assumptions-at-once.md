# The first animated portal breaks two harness assumptions at once

**Effect:** [E-069](../../state/effects.json) · `packages/ui/src/overlay.tsx` → both conformance
harnesses · **high**

## What happened

A bottom sheet is the first subject in this repository that both **animates** and **portals**.
Adding it to the conformance registries broke two assumptions that had been safe for every
component before it — and neither failure presented as what it was.

## One: the animation ticked, and the stack overflowed somewhere else

A gorhom sheet animates, so reanimated installs a mapper. When the mapper ticks, `extractInputs`
walks any **plain object** among its inputs with `Object.values`. Under this harness that walk
reaches React Native's own module namespace and trips its lazy native getters:

```
Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'DevMenu' could not be found
```

Stub `DevMenu` and `SettingsManager` arrives. Stub that and:

```
RangeError: Maximum call stack size exceeded
  at Object.values (<anonymous>)
  at extractInputs (react-native-reanimated/src/mappers.ts:189)
```

**The stack overflow is what proved the approach wrong.** Stubbing native modules one at a time
was a game with no end; the walk itself was never going to be survivable. The fix is not to
survive it but **not to take it** — and a rendered-tree check has no business advancing time in
the first place. Fake timers, never advanced.

It is a **harness artefact, not a defect in the sheet.** On a device the same code runs through
the native worklets runtime, and if the mapper's input really were the RN namespace, every app
shipping this library would overflow on first open. What differs here is the non-native worklets
build the resolver loads, which drives mappers from a mocked `requestAnimationFrame`.

### The part that made it hard to find

It throws **on a queued frame after the render returns**, so jest attributes it to whichever test
happens to be running. An unrelated F-069 assertion started failing the moment a sheet joined the
registry — and the sheet's own subject was not always the one reported.

## Two: the portal outlived the tree that mounted it

`apps/mobile`'s `draw()` rendered and never unmounted. Harmless while every subject was inline.

A sheet renders into a **shared host** that outlives its tree, so the light render was still
mounted when the dark one was captured. The dark subject reported `#F7F6F3` for its ground — the
**light palette on a dark tree**.

That reads exactly like a theme bug in the new component. It is a leak in the harness.

`packages/ui`'s `draw()` had learned this in F-143. This one had never rendered anything portalled,
so the lesson never reached it.

## What to carry forward

**A component that is the first of its kind tests the harness, not only itself.** The two
assumptions here — that nothing animates, and that nothing outlives its render — were never
written down, because nothing had contradicted them. They were invisible until a single component
contradicted both.

When adding a component whose behaviour is categorically new — it animates, it portals, it holds a
gesture, it measures itself — expect the first failures to be **about the harness and to point
somewhere else**.

Related: [[a-new-engine-can-make-an-old-gate-blind]],
[[a-fix-applied-to-one-package-is-not-applied-to-its-twin]]
