# E-217 — A pill is warmer than the colour beside it, or it is false

**Link:** `alternativesAround` (`packages/recommendation/src/outfit.ts`) → `recommendForSlot`'s
alternatives, `wear.ts#wearCombination`, `07`'s pills **Guard:** `outfit.test` (the no-change oracle;
every axis moves from the shown candidate, for every candidate; decoy: another shown candidate, another
answer); `wear.test` (after a Swap); `wear-alternatives.test` (the pills counted against the engine)
**Severity:** medium **Feature:** F-248

---

## Why B changes when A does

An alternative answers *"like that, but warmer"*, and the thing it is "like" is the colour on screen.
The engine's alternatives were relative to its ranking's top pick, which is what is on screen until a
person presses Swap — and from then on a pill reading *Make Warmer* could name a colour cooler than the
one beside it.

`alternativesAround` takes the shown candidate. `recommendForSlot` now asks it about its own top pick, so
its output is unchanged for every screen that read it before (the oracle holds this), and `07` asks it
about whatever the slot in hand shows.

A change to the axis predicates here moves the label on every pill, on every screen that draws one, with
the words still printed confidently.

## What it does not guard

- **Whether "warmer" looks warmer.** It is `temperatureOf`, ADR-0076's measure; a person's eye is the
  comparison's (criterion 4).
- **An axis the corpus starves.** It is omitted, never filled — the engine's own test, not this one.

Related: [[the-combination-is-the-engines-four-pieces-scored-once]].
