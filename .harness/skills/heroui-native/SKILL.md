---
name: heroui-native
description: Decide whether a component wraps HeroUI, and build it so the contrast gate can see it. Answers the question once instead of arguing it per component.
---

# Skill: heroui-native

Rules: [`heroui-wrappers.md`](../../rules/frontend/heroui-wrappers.md) ·
[ADR-0062](../../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md)

---

## 1. Decide: wrap, or build on primitives

**The test is behaviour, not provenance.** Wrap when there is something tedious to inherit —
portalling, focus return, dismissal, roving focus, gesture composition, scroll interaction,
Switch Control ordering. Do not wrap a styled box.

**Read the component's source before deciding.** The name tells you nothing. Three findings so
far, each of which the name got wrong:

| you would guess | what it actually is |
|---|---|
| `Card` — a card, wrap it | `Surface` plus six styled `View`s. **Refuse**: its Surface renders a blur |
| `Alert` — an inline status | a banner. Cannot carry ADR-0044's three channels inline |
| `Surface` — a tinted box | an optional `GlassView` blur layer |

**A blur tints what it surrounds.** That is the simultaneous-contrast hazard `swatch.well`
exists to prevent, and it is why the answer for anything that can appear beside a colour sample
is always no.

## 2. If you wrap it, collapse the compound API

HeroUI exposes `Root → Trigger → Portal → Overlay → Content → Close → Title → Description`. Two
of the ways to get that wrong are **silent**: omit the `Portal` and the overlay renders inside
the page's clipping context; put the `Title` outside the `Content` and the dialog loses its
accessible name while still looking correct.

Take one declarative shape. **The wrapper earns its place by removing ways to be wrong**, not by
re-exporting.

Take **strings, not nodes**, for anything that becomes a control's name. HeroUI wraps whatever
you pass in something pressable and puts no role or name on it, so a perfectly good `<Text>`
becomes an unnamed button. The conformance suite reports it; the API should make it impossible.

## 3. Whatever you decided, these hold

- **`background={null}` on every HeroUI overlay.** Left undefined, the active library theme
  decides the layer, and one of its choices is a blur.
- **Colour through `style`, never `className`.** Uniwind resolves className in Metro; jest never
  runs Metro; a colour routed through a class is absent from the tree the contrast gate reads.
- **`feedbackVariant="scale"` on every HeroUI pressable.** The default animates a background
  colour, and `verify-motion` rejects it.
- **Our timing, not theirs.** HeroUI's defaults are 200/150ms; neither is on the manifest's
  scale, and an overlay moving at a different speed from the screen behind it is the specific
  thing that reads as assembled from parts.
- **Declare the peer.** `@gorhom/bottom-sheet` resolved by luck for a release before F-177
  declared it. A peer that resolves by luck is not a dependency.

## 4. Before you call it done

- **A conformance subject, with every slot filled and every state reachable.** A component the
  registry does not render passes every gate and ships nothing. Fill the slots too — F-184's
  first subject rendered only the body, which would have left the header rule, the footer rule
  and the edge-to-edge media outside every contrast run.
- **A real consumer.** No wrapper without one.
- **Both tap minimums.** The suite requires `minWidth` *and* `minHeight`; WCAG asks for the
  target, not the content.
- **Every state renders differently.** A component returning the same tree for `loading` as for
  `default` has defined the state in name only, and the suite says so.
- **Selection is `selectionTone`.** Never a fourth answer.
