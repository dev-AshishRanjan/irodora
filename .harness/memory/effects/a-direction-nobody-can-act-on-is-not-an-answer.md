# A direction nobody can act on is not an answer

**Effect:** [E-107](../../state/effects.json) · **Feature:** F-201 · **Date:** 2026-09-09

The criterion asked that a reading held against a target say *which way it is off*, decomposed
into lightness, chroma and hue, **in words as well as numbers**.

Lightness and chroma are easy: signed deltas, and *lighter* / *darker* / *more vivid* / *less
vivid* are words anybody can act on.

**Hue is not.** The obvious output is the signed arc — *"+40°"* — and it is correct, reproducible
and useless: nobody looks at a jumper and thinks in degrees. The next idea is worse: *clockwise*
means nothing at all outside a diagram the person cannot see.

## What the product already had

`temperatureOf` — the outfit engine's, scoring against **published** poles in `content/rules`.
Warm and cool is the one hue-direction vocabulary this product has a defined, reviewed meaning
for, and reusing it means there is still exactly one definition of warm in the system (E-005).

So the panel says *warmer* or *cooler*, **and prints the arc beside it as a number**. The word
never replaces the measurement; it makes the measurement usable.

## The related refusal

`similarityPercent` exists in `@irodora/color-naming` and was not used. A percentage invites
*"96% match"* — a claim about identity that a distance does not make, and the criterion said the
reading is never called a match.

Same shape as the hue problem, opposite direction: there, a true number was unusable; here, a
usable number would have been untrue.

## And the ordering one

*"A poor capture says so before it says a number"* is a requirement about **layout**, not
content. A warning under a figure is a warning most people read second. So `poorCapture` is read
off the capture quality — never inferred from the distance — and rendered above the figure.

The test is the case it exists for: **a reading landing exactly on the target with a poor capture
is still flagged.** A good number and a bad one look identical.

## The lesson

**When a measurement cannot be acted on, look for a vocabulary the product has already defined
rather than inventing one or shipping the raw number alone.** And check whether a criterion is
about content or about *order* — the second kind is invisible in a diff and easy to satisfy in
name only.

[[a-measurement-that-fires-half-the-time-is-not-a-warning]]
