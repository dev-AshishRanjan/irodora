---
name: build-ui
description: Build a UI surface that meets the accessibility gates, respects colour perception, and works in both themes and both locales.
---

# Skill: build-ui

Rules: [`frontend.md`](../../rules/frontend/frontend.md) ·
[`contrast.md`](../../rules/frontend/contrast.md) ·
[`motion.md`](../../rules/frontend/motion.md) ·
Design: [`DESIGN-SYSTEM.md`](../../../docs/design/DESIGN-SYSTEM.md).

## Before

**Is there an approved design?** UI is designed first
([`DESIGN-BRIEF.md`](../../../docs/design/DESIGN-BRIEF.md)), then implemented. Building
ahead of the design means building twice.

**Does the component exist** in `@irodora/ui`? Extend rather than duplicate.

**Which tokens?** If a value is not a token, it does not go in — that is a token nobody
defined.

## Building

### Server first

Server Components unless interaction requires otherwise. `'use client'` has a bundle cost,
and a misplaced one pulls the colour engine into a page that should ship none.

**The Atlas ships no engine code.** That is what the route-level budget checks.

### Radix for interaction semantics

Style them; **do not reimplement** their focus management, keyboard handling or ARIA.
Reimplementation is how accessibility regressions get introduced.

### Every state

default · hover · **focus-visible** · active · disabled · loading · error · empty.

An empty state is a design surface, not a blank div. So is an error.

### Colour rendering — the part specific to this product

- **A neutral separator between a colour sample and any adjacent coloured element.**
  Simultaneous contrast is not a subtlety here; it is the difference between a correct and
  an incorrect reading.
- **No gradient, glow or shadow on or near a swatch.** They alter the perceived colour of
  what they surround.
- **`radius.swatch` is 0.** A rounded swatch changes perceived area, and therefore perceived
  colour.
- **No cross-fade between swatches.** Motion must never alter a colour mid-transition.
- **Provenance renders with the colour**, always — never behind a tap.
- **A colour under examination is data**, rendered from a `Color` value. Never a hard-coded
  string.

### Both locales, from the start

Every string is a message key. Design for both text lengths — Japanese and English differ in
both directions. Japanese needs its own line-height scale.

**Never localise a colour value.**

## Verifying

```bash
pnpm test:a11y && pnpm test:contrast && pnpm test:e2e && pnpm test:perf
```

Plus, by hand:

- [ ] Keyboard completes the task, including the Lens
- [ ] Screen reader announces meaningfully — **every swatch has a name and a value**
- [ ] 200 % text scaling loses nothing
- [ ] `prefers-reduced-motion` honoured
- [ ] Both themes
- [ ] Both locales
- [ ] Simulated CVD — task still completable
- [ ] **A real garment colour on screen: can you judge it accurately?**

That last one is the test that matters. If the chrome interferes, the surface has failed at
the one thing this product exists to do.

## Never

A colour literal · a hard-coded string · an interactive element without a focus indicator ·
a meaning carried only by colour · an animation that changes a colour · a swatch without a
name.
