# The guarantee written for correctness paid for the dynamic theme

**Effect:** [E-095](../../state/effects.json) · `packages/design-tokens/src/seed.ts` →
`packages/design-tokens/src/check.ts`, `packages/ui/src/theme.tsx`,
`apps/mobile/src/appearance.tsx` · **medium**

## What happened

FR-70's last part asks for a theme seeded by the platform's own colour, and it breaks this
product's arrangement at the root: **every accessibility guarantee here rests on gate 9 and gate
10 having measured a palette before it ships**, and a seed does not exist until the app is running
on somebody's phone.

The answer is that the device runs **the same functions CI runs**. `checkContrast` and
`checkSeparation` took a `Manifest`; they now take the palettes as an argument, so the gate passes
the real manifest and a phone passes a palette it derived a millisecond ago, to the same code.

## The part worth keeping

**NFR-3 paid for this, and nobody wrote it for that.**

`@irodora/color-*` and `@irodora/design-tokens` have no runtime dependencies, no `node:*`, no DOM,
no `process`, and produce byte-identical results in Node, the browser and React Native. That rule
exists so a colour is the *same* colour everywhere — a correctness property, argued for on
correctness grounds.

It turns out to be the property that makes a **provably accessible** dynamic theme possible. Most
products cannot do this: their checking code is a build-time tool with a filesystem and a config
loader, so a device theme gets a heuristic, or a warning after the fact, or nothing.

This is the second time in three features that a constraint written for one reason answered a
question asked later — the chroma ceiling did it for
[E-093](a-rule-that-already-existed-was-the-answer-to-a-question-nobody-had-asked-it.md). Both
times the constraint gave a *better* answer than the one being invented, and both times it was
found by trying to do the thing rather than by reading the rules.

**It is also a reason not to relax NFR-3 later for convenience**, which is worth writing down
where somebody weighing that trade-off will find it.

## What the device carries, and what it does not

A trimmed manifest — the two authored palettes, the declared pairings, the contrast floors, the
CVD pairs, the salience rank, the chroma ceiling, the exceptions. **11 KB instead of 36.**

Not the type scale, the motion table, or the `role` paragraph on every token: those are decisions
explained to a reader, and there is no reader on a phone.

The type of that value is the **argument type of the checkers**, and a full `Manifest` satisfies
it. One set of functions, two callers — rather than a device implementation that agrees with CI
until it does not.

## The path that cannot fail, said out loud

A derived theme preserves lightness exactly and caps chroma at 0.01, so it differs from a palette
the gate already passed by less than the check can resolve. A 720-case sweep — every hue, both
modes — confirms that no valid seed is ever refused by the contrast or CVD checks.

**The check still runs**, and the reason is worth stating precisely: *"it cannot fail today"* is a
statement about today's derivation rule, not a licence to stop asking. If ADR-0096's rule is ever
loosened — a higher ceiling, a lightness that moves — this is the check that catches it, on the
device, before the theme is applied.

The refusals that *are* reachable are about the seed rather than the theme: a greyscale wallpaper
has no hue to take, and reading one off the rounding of a grey would give somebody a theme decided
by the last bit of their photograph.

## And the widening it forced

Three types had assumed a palette always has a name from a list written at build time:
`PairingResult.theme`, `SeparationResult.theme` and `ThemeValue.name`. All three are now `string`.

The shareable card had the same assumption one level further out — it took a `Theme` and used it
only to index a colour table. It takes the colours now, which is what it always wanted.

**A name is a fine handle for a thing somebody declared. It is the wrong handle for a thing
derived a moment ago**, and every one of those three sites was written before there was any such
thing.

Related: [[a-rule-that-already-existed-was-the-answer-to-a-question-nobody-had-asked-it]] ·
[[a-mechanism-nobody-used-is-a-mechanism-nobody-measured]]
