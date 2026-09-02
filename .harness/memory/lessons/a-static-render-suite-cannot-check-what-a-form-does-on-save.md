---
kind: lesson
title: A static render suite cannot check what a form does on save, and every screen suite here was static
category: engineering
confidence: 0.95
created: 2026-09-02
scope: [apps/mobile]
links: [[a-tested-module-nobody-wired-up-passes-every-test-it-has]], [[a-decoy-that-is-not-broken-proves-nothing]], [[a-gate-must-model-what-renders-not-what-is-physically-correct]]
---

# A static render suite cannot check what a form does on save

Until F-122, **every screen test in `apps/mobile` rendered a tree and looked at it.** The
conformance registry draws each screen in both themes and checks contrast, tap targets, headings
and token use; the behavioural describes read text out of the rendered output. Not one of them
pressed a button.

That is exactly right for what those suites are for. Contrast and accessibility are properties
of a rendered tree, and rendering it twice is the honest way to check them.

It is **wrong for a form**, whose entire contract is what it does when somebody changes a field
and presses save — and by F-122 the app had four screens that write to the store.

## The defect it leaves room for

`browse.test.ts` proves `textPatch('brand', '')` returns `{ brand: null }`, which matters because
`GarmentEnrichment` reads `undefined` as *leave it* and `null` as *erase it*. A form that wrote
`text[field.key]` directly would store `''` where somebody meant *remove this*.

**Every assertion in `browse.test.ts` stays green against that form.** The unit is correct; the
screen simply does not call it. That is
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]] one level down — not an unwired
module, but a **wired module nothing checks the wiring of**.

The conformance registry cannot see it either: the patch handed to the store is produced by a tap
the static suite never performs.

## What closed it

`test/wardrobe-screen.test.tsx` — the first interaction test in this app. `fireEvent.changeText`,
`fireEvent.press`, and a fake store that records the patches it is handed. Five mutations of the
screen were run against it and all five failed the suite, including the two that matter most:
assigning raw text instead of `textPatch`, and seeding the price field with `formatMinor` instead
of `minorToMajor`.

`@testing-library/react-native` was already a dependency and `render` was already imported. **The
machinery was there; the habit was not.**

## The generalisation worth keeping

> A suite that only renders can prove what a screen *looks like*. It cannot prove what a screen
> *does*. Any screen that writes needs a test that drives it.

The two suites are separate files on purpose: the conformance registry stays static and cheap,
and the interaction tests live beside it without being dragged through both themes for no reason.
`--testPathPattern screens` picks up the registry only, which is what the a11y and contrast gates
want.

## How to check it

```bash
node --run test --workspace @irodora/mobile
```

And the real check, which is not a gate: mutate the screen's save handler and confirm the suite
goes red. A test that passes against a form writing `''` is measuring the renderer.
