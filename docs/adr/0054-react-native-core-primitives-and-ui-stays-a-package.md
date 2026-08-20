# ADR-0054 — Component behaviour comes from React Native's own primitives, and `@irodora/ui` stays a package

## Status

Accepted

## Date

2026-08-20

## Context

[ADR-0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md) settled that we
own the token layer and take component *behaviour* from a headless primitive library.
[ADR-0034](0034-base-ui-over-radix-for-headless-primitives.md) chose Base UI over Radix.

**Base UI is a web library.** It composes DOM elements and manages ARIA attributes, roving
tabindex and focus trapping. [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
retired the web surface; `apps/mobile` is the only surface, and it has no DOM.

`packages/ui` today is a single line — `export const UI_VERSION` — under a `package.json` that
describes it as "Shared React primitives composed over Base UI". It has **zero consumers**.
F-017 is the feature that gives it contents, so the question cannot be deferred again.

The argument in ADR-0033 that decided the layering was specifically about **ARIA and focus
management**: that reimplementing `aria-activedescendant`, roving tabindex and focus trapping is
where hand-rolled component libraries fail their users. On React Native that argument does not
transfer, because **the accessibility tree is the platform's, not the framework's.**
`accessibilityRole`, `accessibilityLabel` and `accessibilityState` are read directly by VoiceOver
and TalkBack; there is no attribute layer in between for a library to get right or wrong.

The combobox case that decided ADR-0034 in Base UI's favour also evaporates. The mobile Colour
Finder (F-021) is a `TextInput` above a `FlatList` — not an `aria-activedescendant` listbox —
because that is what the platform's own search surfaces are.

NFR-8 is at stake, and so is NFR-24: this decides an enforced module boundary.

## Decision

**Component behaviour comes from React Native's core primitives.** `Pressable`, `Text`, `View`,
`Modal`, `FlatList`, `TextInput` and `Switch` already carry the platform accessibility props and
are what the screen readers read. We add no headless primitive library.

**`@irodora/ui` remains a package rather than moving into `apps/mobile/src/ui`**, and it is
`private: true` — it is not published.

Its `package.json` description is corrected: it is React Native components over the platform's
own primitives, not "composed over Base UI".

[ADR-0034](0034-base-ui-over-radix-for-headless-primitives.md) is superseded. ADR-0033's
token-layer half stands unchanged; only its primitive half is retired, and for a reason specific
to the surface rather than a reversal of its reasoning.

**The standing hazard is handled structurally.** A package with zero consumers passes every gate
and ships nothing, and this repository has already lost six increments to exactly that shape.
So: every component in `@irodora/ui` is either consumed by a real screen or registered in the
conformance registry, and the a11y scope reporter **prints any component that is neither and
fails**. The rule is a check, not an intention.

## Consequences

**Good**

- No third-party foundation dependency under the component layer at all. For a product whose
  engine is deliberately zero-dependency, the component layer inheriting the same property is
  consistent rather than austere.
- The accessibility props we set are the ones the platform reads. Nothing translates them, so
  there is no layer that can translate them wrongly.
- Keeping `ui` a package buys a **lint zone**: "no colour literal" and "no hard-coded
  user-facing string" can be total bans there rather than judgement calls, and the dependency
  direction (`apps/mobile` → `@irodora/ui` → `@irodora/design-tokens`, never back) is
  machine-enforced by the existing boundary guards.
- It gives the conformance suite a home that `apps/mobile` can import, so the app runs the *same*
  suite over its screens rather than a copy of it.

**Bad**

- **We now own behaviour we would otherwise have inherited.** Modal focus return, list keyboard
  handling for an attached hardware keyboard, and Switch Control ordering are ours to get right.
  Base UI would have carried the web equivalents; nothing carries the mobile ones for us.
- Building a component library is more work than assembling one, and the first components will
  be plainer than a mature library's.
- `packages/ui` costs a build step, and JSX must be emitted through `tsc` rather than consumed
  as source.
- If a second surface ever returns, this decision does not transfer — a web surface would need
  the ADR-0034 question reopened rather than answered.

**Neutral**

- Token naming stays shadcn/Base-UI compatible, as DESIGN-SYSTEM.md already says. That was
  always interoperability rather than adoption, and it survives this decision untouched.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **`@rn-primitives/*`** — the Radix-shaped React Native port | A familiar API for anyone coming from Radix, and it does solve real composition problems around portals and modals. But it is a small-community port of a library whose value was ARIA management, which is the part React Native does not need — so we would be taking on a dependency for the half of the argument that no longer applies. |
| **Tamagui or gluestack** | Genuinely capable, well-optimised systems with strong RN accessibility stories and far more components than we will build. They **own the token layer**, which is precisely the objection [ADR-0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md) sustained against Astryx — and here it is worse, because our manifest is the source of truth for a *contrast gate*. A system that owns tokens would either have to be fed from the manifest at build time, reintroducing the divergence the manifest exists to prevent, or become a second source of truth beside it. |
| **`@expo/ui`** — SwiftUI and Jetpack Compose components through a bridge | The best accessibility story available anywhere: real platform widgets, with everything Apple and Google have already done for VoiceOver, TalkBack, Dynamic Type and Switch Control. And the worst styling story for *this* product: our design is a token contract with a `chromaCeiling` and a mandatory `swatch.well`, and platform widgets will not honour it. For an app whose entire subject is colour, an interface we cannot control the colour of is disqualifying. Worth revisiting for genuinely chromeless surfaces. |
| **Move the components into `apps/mobile/src/ui`** | Honest about there being one consumer, and it deletes a build step. But it loses the enforced dependency direction and the total lint bans, and it gives the conformance suite no importable home. Moving a package into the app later is a mechanical change; extracting one back out after the app has grown around it is not. |

## Revisit when

A second surface is committed to (which would reopen ADR-0034 on its own terms), **or** when we
need a component whose behaviour we get measurably wrong — the first time a screen-reader
attestation fails on focus return or list ordering rather than on labelling, the "we own
behaviour" cost has come due and `@rn-primitives` or `@expo/ui` should be re-examined for that
component specifically.
