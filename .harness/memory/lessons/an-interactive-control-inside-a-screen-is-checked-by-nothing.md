---
kind: lesson
title: An interactive control written inside a screen is checked by nothing, because the suites meet at its edges
category: convention
confidence: 0.95
created: 2026-08-24
scope: [apps/mobile, packages/ui]
links: [[a-tested-module-nobody-wired-up-passes-every-test-it-has]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# An interactive control inside a screen is checked by nothing

The Atlas's filter chips and search box started as a `Pressable` and a `TextInput` written
directly in `Atlas.tsx`. Both worked. Both were invisible to every accessibility check in the
repository, and the reason is structural rather than an oversight:

| Suite | Covers | Misses |
|---|---|---|
| `packages/ui` conformance | registered **components** | anything not in the library |
| `apps/mobile` conformance | **screens**, as `static` subjects | the states a screen does not have |

A control that lives in a screen file falls **between** them. It has focus, active, disabled and
loading states, and no suite ever asks it to render them differently — which is precisely the
assertion that earns the conformance suite in the first place.

## The tempting fix is the wrong one

Declaring the screen `kind: 'interactive'` makes the suite check its pressables. It also demands
the *screen* render five states, which a screen does not have — so the render function ignores
the state argument, every state produces an identical tree, and the suite reports
`state-not-rendered` for a screen that is behaving correctly.

At that point the pressure is to claim `static` to make the noise stop, and the kind is the one
lever a component has over its own required states. A component that can talk its way out of its
list has no list.

## The rule

> **An interactive control belongs in the component library. A screen composed of checked
> components is `static`.**

`Chip` and `SearchField` moved into `@irodora/ui`, registered, and immediately produced two real
findings the screen had been hiding:

- **the chips declared no `minWidth`.** A chip is content-width, so "All" and "Warm" sit under
  44 px. WCAG asks for the *target*, not the text.
- **the suite's own model of "interactive" was press-only.** `SearchField` was reported as
  *"declares kind interactive but nothing in the tree responds"* — a text field responds to
  typing. Until then every interactive control in the library was a button or a swatch, so
  "responds" and "responds to a press" were the same set and nothing distinguished them.
  `pressableNodes` now counts `onChangeText`.

## The generalisable part

**When a check reports something you believe is wrong, ask whether the check is describing a
gap in its own model.** The first two findings were the screen's fault. The third was the
suite's, and the fix was to widen a definition rather than to add an exemption — which is the
difference between a check that grows with the codebase and one that accumulates escape hatches
until it stops meaning anything.
