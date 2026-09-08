# Plan: F-189 — Micro-interactions, on the components that already have states

| | |
|---|---|
| **Feature** | F-189 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-25 |
| **Package** | `@irodora/ui` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

*"Add micro interactions where possible."*

Measured: **exactly one component in this product responds to being pressed.** `Button` sets
HeroUI's `feedbackVariant="scale"`. `Swatch`, `Chip`, `Card` and `ChoiceGroup`'s options are all
React Native `Pressable`s with no press response at all — a tap on a colour sample does nothing
until the next screen arrives.

## Approach

**One hook, in `motion.tsx`, where the rule lives.** `usePress()` returns the two handlers and
an animated style; a component spreads them onto the `Pressable` it already has. Not a
component — wrapping every pressable would nest a second one, which is the defect `Card` and
`ChoiceGroup` were each written to avoid.

Scale only, on the `micro` step, through `useMotion` — so reduced motion collapses it to nothing
rather than to something faster, and `verify-motion` keeps holding the `opacity`/`transform`
allow-list.

## Two of the four criteria are refused, and the reasons are the feature

**The counting number is refused.** Criterion 2 asked for *"a number that changes counts to its
new value rather than replacing it"*. In this product that is the same defect the motion rule
already forbids for colour, one type along:

> The intermediate frames of a colour transition are plausible colours that never existed, so a
> user watching a swatch cross-fade reads a value the engine never produced.

A ΔE00 counting from 0.00 to 2.14 shows **seventeen values the engine never computed**, each of
them a plausible reading of a real difference. For a product whose whole claim is *this is what
colour that is*, an animated figure is a correctness defect wearing the clothes of polish. It is
refused, and the refusal is recorded in the motion rule so the next person does not re-derive it.

**Haptics are deferred, not skipped.** `expo-haptics` is not a dependency, and adding one mid-wave
to satisfy a clause is how a dependency arrives without a decision. Recorded as F-206.

## Files to touch

```
packages/ui/src/motion.tsx                 — usePress
packages/ui/src/{Swatch,Chip,Card}.tsx     — adopt it
packages/ui/src/ChoiceGroup.tsx            — adopt it
.harness/rules/frontend/motion.md          — the counting-number refusal
packages/ui/test/motion.test.tsx           — the hook, and reduced motion
```

## Test plan

- **The scale is on the micro step, and is 1 at rest.**
- **Reduced motion returns a style that never leaves 1** — not a faster press, no press.
- **`verify-motion` still passes**, which is the standing proof that nothing here animates a
  colour.

## Verification

`typecheck · lint · format · test · a11y · contrast · motion · build · state`.

## Risks

- **Nobody has felt it.** Whether 0.97 at 120 ms reads as responsive or as loose is the
  judgement, and it is the fifth R7 feature owing one.

## Out of scope

Haptics (F-206), the tab indicator's slide, and the counting number above.
