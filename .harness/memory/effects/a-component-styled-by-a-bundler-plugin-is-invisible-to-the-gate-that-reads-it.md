---
kind: effect
title: A component styled by a bundler plugin is invisible to the gate that reads its rendered tree
category: convention
confidence: 1.0
created: 2026-08-24
scope: [packages/ui, apps/mobile]
links: [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]] [[a-gate-that-errors-is-failing-open]]
---

# E-020 — `@irodora/ui` is built on HeroUI, and HeroUI styles where the gate cannot look

**The link:** `packages/ui` → the lint zone in `eslint.config.mjs`, the decoys in
`verify-guards.mjs`, the `colour-invisible` rule in `conformance.ts`, and the prop scan in
`verify-motion.mjs`.

## What happens without the guards

[ADR-0062](../../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md)
put `heroui-native` under `@irodora/ui`. HeroUI styles through `className`; Uniwind resolves
`className` in its **Metro plugin**; jest never runs Metro.

So a component that routes colour through a class renders in the `a11y` harness like this:

```json
{ "className": "button__root button__root--variant-primary",
  "style": [{ "borderCurve": "continuous" }, { "transform": [{ "scale": 1 }] }] }
```

No colours. Every colour check in the conformance suite iterates over an empty list. It reports
nothing, prints as a pass, and is **indistinguishable from a component whose every colour
resolved**. The only colour anywhere in that tree read literally `"backgroundColor": "invalid"`.

Measured, not feared — that is the tree a real `heroui-native` `Button` produced under this
repository's own harness.

## The general shape, which is the reusable part

**Build-time style resolution buys runtime performance by moving work to where the test runner
is not.** Bundler plugins, compilers, CSS extraction, atomic class generation — all of them do
this, and the second half of the trade is never in the library's documentation.

For any styling, theming or layout library, the question to ask is: *at what point does a value
become concrete, and is the checker downstream of that point?*

## The guards, and they are proven

| Guard | Catches | Decoy |
|---|---|---|
| `no-restricted-syntax` in `packages/ui/src` | a colour utility class, or an arbitrary colour value, inside a `className` | two entries in `verify-guards.mjs` |
| `colour-invisible` in the conformance suite | a registered subject whose tree carries **no** resolved colour | the exact HeroUI tree, plus a control that passes |
| `verify-motion.mjs` prop scan | `highlightAnimation` / `rippleAnimation` left on — they animate `backgroundColor` inside a dependency the style scan cannot read | four `--prove` cases, both polarities |

The controls matter as much as the decoys. A rule that rejected every `className`, or every
mention of an animation prop, would ban the correct usage too and be switched off within a
week.

## Not covered

- **A component that paints SOME colours through `style` and routes others through a class.**
  The tree is non-empty, so `colour-invisible` does not fire. Lint is the only defence, and it
  only sees literal class strings in our own source.
- **A class name assembled at runtime.**
- **HeroUI's own internal classes**, which are theirs. The generated `global.css` is what themes
  them, and [E-019](the-stylesheet-is-generated-and-a-colour-function-in-it-hands-the-conversion-away.md)
  is the link that covers it.
