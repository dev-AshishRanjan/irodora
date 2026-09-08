# Plan: F-184 — Card, and an elevation vocabulary the product can compose with

| | |
|---|---|
| **Feature** | F-184 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-25 |
| **Package** | `@irodora/ui` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

*"All the card ui/ux and design system is also not good, very unprofessional."*

Measured: **`<Surface>` appears 48 times across the screens, every single one at `level="1"`.**
One tint, one radius, one padding, everywhere. There is no vocabulary to be unprofessional
*with* — a card that is the subject of a page and a card that is one of its several answers are
drawn identically.

## Approach

**Not a HeroUI wrapper, and the rule decided it rather than taste.** HeroUI ships a `Card` and
it is **`Surface` plus six styled `View`s** — trivial layout, no behaviour. And `Surface` is the
component [`heroui-wrappers.md`](../rules/frontend/heroui-wrappers.md) names outright: it renders
an optional `GlassView` blur, and a blur tints what it surrounds. Ours already refuses it.

**Slots, not children alone.** A card whose header is *"the first child"* cannot guarantee
anything about it, and the rule separating header from body has nowhere to live.

**`media` is the slot that earns the component.** It is edge to edge, so it must escape the
padding — and that is the one thing a padded box cannot express. It is why 48 surfaces never
became cards: a photograph inside `Surface` is inset by 16 px, which is a thumbnail with a frame.

**Depth by tint, never shadow.** `level` is the existing elevation scale. Spending it is the
point: nothing had.

**A pressable card is ONE target.** Not a card containing a button — nested pressables are
announced twice and the outer one usually wins the touch.

**Selection is F-176's**, and the conformance rule reads it out of the rendered tree.

### The consumer

`Contemporary` — the screen the report named separately (*"The ui/ux of the contemporary is not
professional"*). Three of its boxes become three different shapes:

| | was | is |
|---|---|---|
| the subject | `Surface` level 1 | **Card level 2**, name in the header |
| a computed equivalent | `Surface`, pair inside the padding | **Card with the pair as `media`** |
| an editorial equivalent | four `Text`s in a stack | **Card**: kind in the header, judgement in the body, provenance in the footer |

The computed one is the sharpest. F-151 established that this screen answers *how close is this*
**at the boundary** — then put the pair inside a padded surface, so the two colours meeting each
other sat 16 px in, framed. **The frame is the thing F-151 was removing**, one level out.

**Two boxes deliberately stay `Surface`.** The membership list and the nothing-near state are
notes: no media, no provenance to foot, nothing to separate. Converting every box would recreate
the sameness this feature exists to end, one component along.

## Files to touch

```
packages/ui/src/Card.tsx                  — new
packages/ui/src/index.ts                  — export
packages/ui/test/conformance.test.tsx     — two subjects: every slot filled, and pressable
apps/mobile/src/screens/Contemporary.tsx  — three shapes where there was one box
.harness/skills/heroui-native/            — new skill; .claude mirrors it
```

## Test plan

- **Conformance, both subjects.** The static one fills **every slot** — a subject rendering only
  the body would leave the header rule, the footer rule and the media outside every contrast
  run, and the media slot is the whole argument. The pressable one is `interactive` and
  `selectable`, so the suite asks for all five states and `selection-treatment` holds it to
  F-176's.
- **Negative:** carried by the existing rules rather than new ones. `tap-target` caught a missing
  `minWidth`; `state-not-announced` caught an unhandled `loading`. Both were real, and both were
  found by rules written for other components — which is the argument for a shared suite.

## Verification

`typecheck · lint · format · test · a11y · contrast · build`. Not run: `cvd`, `color-golden`,
`content` — no colour value, no maths, no corpus.

## Risks

- **Nobody has looked at it.** Whether level 2 reads as *above* level 1 on a phone is exactly the
  judgement ADR-0099's compressed ramp put at risk, and this is the **first surface in the
  product to spend the level-2 step**. If it does not read, the ramp is the thing to revisit
  rather than the card. Attested.
- **45 surfaces are still level 1.** This converts three and states the rule; F-203's sweep is
  where the rest are looked at. Converting them here would be work nobody reviewed against a
  requirement.

## Out of scope

The other 45 surfaces, `Skeleton`/`Toast`/`Alert` (F-185), and the choosers (F-186).
