---
kind: lesson
title: A style engine that resolves in Metro is invisible to jest, so a gate reading the rendered tree measures nothing
category: debugging-method
confidence: 1.0
created: 2026-08-24
scope: [apps/mobile, packages/ui]
links: [[a-gate-that-errors-is-failing-open]] [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# A style engine that resolves in Metro is invisible to jest

**Where a style is resolved decides whether a gate can see it.**

Found while spiking HeroUI Native (ADR-0062). HeroUI styles through `className`; Uniwind
resolves those classes in its **Metro bundler plugin**. Jest never runs Metro. So a component
that looks fully styled on a device renders, under the `a11y` harness, as a tree with no
colours in it at all:

```json
{ "className": "button__root button__root--variant-primary",
  "style": [{ "borderCurve": "continuous" }, { "transform": [{ "scale": 1 }] }] }
```

The only colour anywhere in that tree read literally:

```json
"backgroundColor": "invalid"
```

The `contrast` and `cvd` gates would have kept passing. Not because the colours were right —
because **there was nothing left to measure.** Green, over an empty set.

## Why this is worse than an ordinary blind spot

A gate that crashes is red, and someone investigates. This one stays green and gets *more*
convincing as coverage grows: every new screen adds subjects, the summary line counts them,
and not one of them asserts a colour. The failure is indistinguishable from success in the
only place anyone looks.

It is the same shape as [[a-gate-that-errors-is-failing-open]], reached from the other
direction — not "the check could not run" but "the check ran against nothing".

## The fix, and why it is a rule rather than a habit

React Native's `style` prop is resolved by React, not by the bundler, so a value passed there
is in the tree wherever the tree is rendered. `@irodora/ui` passes **resolved manifest tokens
through `style`**, and everything that is not a colour — layout, spacing, radius, weight —
through `className`, where no gate needs to see it:

```
ROOT style  = {"borderCurve":"continuous","transform":[{"scale":1}],"backgroundColor":"#F6F4F1"}
```

Stated as a habit it would decay in a month, so it is two checks instead: lint rejects a
colour-bearing utility class inside `@irodora/ui`, and the conformance suite **fails a
registered subject whose tree carries no resolved colour**. The second is the one that matters
— it fails when someone finds a new way to route colour past the gate, including a way nobody
has thought of yet.

## The general question worth asking

For any styling, theming or layout library: **at what point does a value become concrete, and
is the checker downstream of that point?**

Build-time resolution — bundler plugins, compilers, CSS extraction, atomic class generation —
buys runtime performance by moving work to where the test runner is not. That is a good
trade for the device and a silent one for the gates, and the second half is never in the
library's documentation.
