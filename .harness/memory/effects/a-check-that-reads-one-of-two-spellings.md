# A check that reads one of two spellings

**Effect:** [E-097](../../state/effects.json) · `packages/ui/src/testing/tree.ts` →
the conformance suite, every wrapper, `scripts/verify-motion.mjs` · **high**

## What happened

F-156 wrapped four HeroUI controls. Three checks that had never been wrong were wrong about all
four, and each for the same reason: **the check knew a vocabulary, and the vocabulary was
complete on the day it was written.**

### One of two role props

`pressableNodes` read `props.accessibilityRole`. **Every HeroUI primitive sets `role`** —
`role="switch"` on the Switch, `role="slider"` on the Slider thumb, `role="button"` on the
Accordion trigger. React Native accepts both and routes them to the same platform attribute, so
those components are correct on a device and the suite would have reported all four as
`no-role`.

**The trap is in the obvious correction.** The two are not the same list:

| | `AccessibilityRole` | `Role` |
|---|---|---|
| a draggable value | `adjustable` | `slider` |
| a section heading | `header` | `heading` |
| a search field | `search` | `searchbox` |

and `AccessibilityRole` ends in `| string`. So `accessibilityRole="slider"` compiles, satisfies
the rule, and announces nothing — a wrapper "fixed" to please the checker would have been
strictly worse than the one that failed it.

Both props are now carried as **separate fields**, because translating between them is not
something this file can do honestly: in React Native 0.86 the mapping lives in the native layer,
not in any JavaScript table we could cite. And a pressable declaring `none` or `presentation` is
now its own finding — a declared non-role satisfied "has a role" while removing the control from
the accessibility tree.

### One of two ways to respond

The same function defined interactive as `onPress` / `onClick` / `onResponderRelease` /
`onChangeText` / `accessible`. **F-018 had already widened it once**, with the note *"a text
field is not pressable"*.

A slider thumb is dragged through a `GestureDetector` and carries none of them. The suite
reported *"declares kind interactive but nothing in the tree responds"* — which was it saying,
accurately, that it had checked no accessibility rule on the control at all.

`accessibilityValue` is the declaration itself: a node reporting a value in a range is a thing a
person sets. The decoy is that a plain View with a number on it is still not a control.

### One of two ways to animate a colour

`verify-motion.mjs` named `highlightAnimation` and `rippleAnimation`. HeroUI's `Switch` takes
neither — it takes `animation`, whose default interpolates the track `backgroundColor` over
175 ms. Same shape as [[a-table-driven-check-is-only-as-complete-as-its-table]], one table along.

## The part worth keeping

**A widening is only an improvement if it still refuses what it refused before.** Each of the
three came with the refusal beside it: a pressable with neither role is still reported, a View
with a number is still not a control, and `animation` is still allowed — it is how our durations
reach HeroUI at all — while a colour named inside one is not.

## And a fourth, found by probing rather than by reading

**An anchored overlay's portal never mounts under jest.** HeroUI's Popover and Select return
`null` from their portal until `triggerPosition` is set, and that is filled by a `measure()`
callback the native layer fires. react-test-renderer has no native layer.

So the `Popover` conformance subject — registered **open**, with a comment saying it exists so
the gates can see *"the scrim painting `backdrop` … and the panel's own ground against the text
on it"* — renders **four nodes and no panel**. Dialog and Sheet mount, because their portals need
no trigger geometry.

That is why F-156's `Select` is a `dialog` presentation rather than a dropdown: **a list whose
accessibility no check in this repository can see is a list nobody has looked at.** Rendered as a
dialog, the suite immediately found four real things in it — an undeclared text pair on the
chosen row, an unnamed-target scrim, and a disabled select rendering a live list.

`Popover` still has the gap. It is recorded rather than closed, because closing it means either
a harness that fakes `measure()` or a subject that fakes a trigger position, and both are
decisions about what the suite is allowed to invent.

Related: [[a-table-driven-check-is-only-as-complete-as-its-table]] ·
[[a-component-reached-through-another-is-only-tested-in-its-parents-shape]] ·
[[a-decoy-that-is-not-broken-proves-nothing]]
