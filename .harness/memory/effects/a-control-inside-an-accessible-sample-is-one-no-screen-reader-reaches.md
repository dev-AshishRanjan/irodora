# E-224 — A control inside an accessible sample is one no screen reader reaches

**Link:** `Swatch`'s `group` and filled `height` (`packages/ui/src/Swatch.tsx`) → `07`'s slot tiles
**Guard:** `forms-07.test` (apart, the sample is an image beside its children and the only button is the
child's; decoy: grouped, the sample is one button holding them; a filled height grows and never
collapses); `wear-fidelity.test` (every tile's sample apart, no control inside an image node); the
conformance suite's tile subject in every palette **Severity:** medium **Feature:** F-248

---

## Why B changes when A does

`Swatch` is an accessible pressable, and an accessible element groups what it holds into one node: a
screen reader announces the sample's name and cannot reach anything inside it. `07` draws each slot's
words, its Swap, its Lock and a press target on the sample, so a tile built as a grouping `Swatch` would
have hidden every control on it — with every render test green, because a test renderer finds the nodes
whatever a screen reader would.

`group={false}` keeps the sample's name on a node laid over the sample that holds nothing, so its
children are each reached on their own; `height: 'fill'` lets the words set the tile's height and a row's
taller tile stretch its sibling. The words stay the sample's children, so every check that finds a text's
ground by its ancestors judges them against the sample (ADR-0153 D8).

## One stop, not two (F-248's review, S4)

Apart from its children, the sample first named itself as an image while the tile's own press target
named the colour again, so a reader heard each tile twice. With `onPress`, the sample's named node is
now the tile's press target itself, named with the slot, the colour, its hex and its provenance, and the
words drawn over it are hidden: one stop for the sample, one for each control.

## What it does not guard

- **VoiceOver and TalkBack themselves.** The attested device check reaches each control.

Related: [[a-control-on-a-sample-takes-the-samples-ink]].
