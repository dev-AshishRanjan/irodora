# E-223 — A segment sized by its words scrolls before it clips

**Link:** `ChoiceGroup`'s `Segmented.fit` (`packages/ui/src/ChoiceGroup.tsx`) → `07`'s occasion control
**Guard:** `forms-07.test` (segments grow from their words and never shrink, in a row that scrolls; the
group spans the measured room and asks no share of a height; decoy: the default shares the row equally);
`screens.test`'s broken-flex-chain check over `07`'s subjects; the 200 % text check on a device
(attested) **Severity:** low **Feature:** F-248

---

## Why B changes when A does

`07` sizes its occasion segments by their words (ADR-0153 D6). Equal segments would clip
*Japanese-inspired* at 384 dp; words-sized segments can together be wider than a 320 dp phone, or than
384 dp at 200 % text. So the segments never shrink below their words, and the row scrolls sideways where
they do not fit.

Where they do fit, the group spans the room it was laid out in — **measured**, not grown into: a
scroller's content has no width to grow into, and React Native's test mock draws its content without the
row that would let the broken-flex-chain check see it is one. That check found the first form.

## What it does not guard

- **What a person sees at 200 %.** A tree has no layout; the device check is the person's.

Related: [[a-static-reading-catches-the-shape-not-the-layout]].
