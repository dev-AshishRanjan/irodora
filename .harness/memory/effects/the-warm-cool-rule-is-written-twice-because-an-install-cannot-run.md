---
kind: effect
title: The warm/cool rule is written twice, and the reason is a toolchain, not a decision
category: contract
confidence: 0.9
created: 2026-08-26
scope: [packages/recommendation, apps/mobile]
links: [[sampling-lives-in-the-engine-not-the-platform]], [[the-capture-ceiling-is-now-a-profile-confidence]], [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
---

# E-032 — two implementations of one colour rule, carried deliberately and visibly

**`packages/recommendation/src/score.ts#hueBias` → `apps/mobile/src/profile/photo.ts`**

## What is duplicated

How warm a hue is, as a signed value in [-1, +1] measured between two reference poles:

| | |
|---|---|
| `hueBias(hue, poles)` | the engine's, poles supplied by the **rule set** |
| `biasFromHue(hue)` | the app's, poles as module constants `60` and `240` |

Same maths, same constants, written two features apart (F-027, then F-028) by the same
reasoning. **Both pass their own tests.**

## Why this is the shape E-008 exists to prevent

[[sampling-lives-in-the-engine-not-the-platform]] states it exactly: a second implementation
makes the same input measure differently on two surfaces, and **no single-platform test can see
it**. The app's tests assert the app's answer; the package's tests assert the package's. Nothing
compares them, and nothing will, because there is no place both are in scope.

Here the drift has a predictable direction, which is worth writing down: the engine's poles are
a **rule-set field**, so they are content and F-029 will version them. The app's are literals.
The first time an editor moves the warm pole, the app will not move with it — and the profile a
person builds from a photograph will disagree with the score the engine gives them, with every
gate green.

## Why the guard is `none` rather than something that looks like one

The fix is one line — the app imports the engine — and **it cannot be written**:
`apps/mobile/node_modules/@irodora/` has no `recommendation` link, and `pnpm install` refuses on
this workstation (Node 22.16.0 against engines demanding 24.19.0).

Two guards were considered and rejected, both for the same reason:

- **A cross-package agreement test.** The app's file imports the corpus bundle, so a package
  test importing it would pull app dependencies across a layering boundary to check two numbers.
- **Scraping the constants out of the source.** It would compare two literals while the
  *algorithms* drifted — the half that actually matters — and would report green while doing it.

A check whose model is wrong is worse than an absent one, and the graph exists to carry the
checks we owe rather than the ones we can fake. `guard: none` is what gate 0 warns on, and the
warning is the point.

## What closes it

**F-099**, the day the app can depend on `@irodora/recommendation`. That is downstream of the
Node upgrade, like most things here.
