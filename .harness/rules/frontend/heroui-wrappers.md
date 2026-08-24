# When a component sits on HeroUI, and when it does not

Decided in [ADR-0062](../../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md);
this is the rule that applies it per component, so the question is answered once rather than
argued each time.

---

## The test

> **Wrap HeroUI when there is BEHAVIOUR to inherit. Do not wrap it for provenance.**

Behaviour means: press and focus states, focus return, dismissal, portalling, list keyboard
handling, gesture composition, scroll interaction, Switch Control ordering. The things that are
tedious to get right, easy to get subtly wrong, and invisible to a sighted developer with a
mouse.

A component that is a `<Text>` or a `<View>` with tokens on it has none of that. Wrapping it
adds a dependency edge and buys nothing.

| Wrap it | Do not wrap it |
|---|---|
| Dialog, BottomSheet, Popover, Menu, Select | Text, Icon, Surface, and anything that is a styled box |
| Tabs, Toast, Slider, SearchField, InputOTP | Status, and anything composed only of our own components |
| Button and the pressables | **Swatch, and everything carrying provenance or confidence** |

---

## Three specific findings, so they are not re-derived

**HeroUI ships no icon primitive.** It expects `react-native-svg` and your own glyphs. Ours are
drawn as `View`s on purpose — an icon font reintroduces the tofu failure ADR-0057 exists to
prevent, and NFR-9 needs the *shapes* to differ, not only the colours.

**HeroUI's `Alert` is a banner, not an inline status.** It cannot carry
[ADR-0044](../../../docs/adr/0044-status-tokens-corrected-and-status-colour-is-text.md)'s three
channels — colour on the words, an icon whose shape differs, and a visible text label — in the
inline form the product uses. `statusPresentation()` is what enforces that, and it stays ours
either way.

**HeroUI's `Surface` renders an optional blur layer**, through `ThemeBackground` and
`GlassView`. This is the one that matters: **a blur tints what it surrounds**, and that is
precisely the simultaneous-contrast hazard `swatch.well` exists to prevent. Adopting it would
mean permanently carrying a code path that must never run beside a colour sample. Do not.

---

## Never, for anything that carries a colour sample

`Swatch`, and every component rendering provenance or confidence, stays on React Native
primitives. `radius: 0` at every size, the mandatory `swatch.well`, and the two-tone opaque
keyline are product rules a general-purpose library has no reason to honour — and the
component's argument is a `Color`, which cannot exist without provenance
([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)).

---

## Whatever the answer, these hold

- **Colour reaches a component through `style`, never `className`.** Uniwind resolves
  `className` in Metro; jest never runs Metro; a colour routed through a class is absent from
  the tree the contrast gate reads
  [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]]. Lint enforces it; the
  conformance suite's `colour-invisible` rule is the backstop.
- **`feedbackVariant="scale"` on every HeroUI pressable.** The default, `scale-highlight`,
  animates `backgroundColor`, and `motion.animatable` is `opacity` and `transform` only.
  `verify-motion.mjs` rejects a component that allows it.
- **`apps/mobile` never imports HeroUI.** Only `@irodora/ui` does, and the boundary guard
  fails on a screen that tries.
- **No wrapper without a consumer.** A component reachable from no screen and absent from the
  conformance registry passes every gate and ships nothing, and the a11y scope reporter fails
  it [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].

---

## When the answer changes

Re-read this when a HeroUI release adds a component we hand-rolled, or when one of ours starts
needing behaviour — the first time a screen-reader attestation fails on focus return or list
ordering rather than on labelling, the "we own behaviour" cost has come due and that component
should be re-examined specifically.
