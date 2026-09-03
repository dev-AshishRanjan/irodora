# E-059 — The icon is generated from the mark, not exported beside it

**Link:** `packages/ui/src/brand.tsx#MARK` → `markSvg`, `Mark`, and F-142's icon, adaptive icon
and splash **Guard:** `gate:test` **Severity:** medium **Feature:** F-141

---

## What the link is

`MARK` is the mark as data — grid, interval, field size, origin — and **two renderers read it
and neither carries its own numbers**. `Mark` draws two `View`s for the app; `markSvg` emits the
same two rectangles as a string, because F-142 needs a *file* and an icon pipeline cannot render
a React component into one.

`brand.test.tsx` asserts the two agree, rectangle by rectangle. That assertion is the whole
reason this link is recorded: **it is what stops the icon on the home screen drifting from the
mark inside the app.**

## Why this is worth a link rather than a convention

The usual way an app gets an icon is that somebody exports a PNG from a drawing tool and commits
it. That file then has no relationship to the code at all — the mark can be adjusted, the
component updated, and the icon stays whatever it was on the day it was exported. Nobody
notices, because an app icon is the one asset you stop seeing after a week.

Deriving the icon from the same constant makes that failure impossible rather than unlikely.
It also makes the reverse true and worth saying out loud: **changing `MARK` changes the shipped
icon**, so an edit that looks like a component tweak is a change to the thing on the user's home
screen and to the store listing.

## The interval equality is the mark's identity, and it is asserted

The gap between the two fields and the vertical offset between them are the same number. Two
rectangles that merely sit near each other are adjacent; two whose separation and displacement
are the same measured quantity are *arranged*, which is what
[`BRAND.md` §7](../../../docs/design/BRAND.md#7-the-mark) asks for.

A later edit that nudged one field "to look better" would leave something that still reads as a
mark and has stopped being this one. The test fails on it, which is unusual for a design object
and is only possible because the design reduces to one equality.

## The false reach the gate caught, which is the part worth remembering

`WordmarkSize` first listed `'display.1'` — a wordmark is the obvious home for the largest type
step. `verify-token-reach.mjs` immediately reported `display.1` as **reached**, because the
string appears in that union and the check reads string literals.

It was right to complain and wrong about the fact. **A type literal is not a painted pixel.**
Nothing rendered at 72 px; a union member only says something *could*. Leaving it would have
closed F-146's exemption with a promise instead of a surface — which is exactly the laundering
[ADR-0080](../../../docs/adr/0080-an-unreached-design-token-is-unfinished-work-not-a-declared-exemption.md)
exists to prevent, arriving from a direction that ADR does not anticipate.

The union was narrowed instead. **A token can be "reached" by a type that offers it and by
nothing that draws it, and this check cannot tell the difference** — worth knowing before the
next feature widens a union and wonders why an exemption went stale.

## Related

- [[an-exemption-that-names-no-owner-turns-unfinished-into-passing]] — the ADR this qualifies.
- [[spacing-is-a-step-name-so-a-number-cannot-reach-a-screen]] — the same one-source-two-readers
  shape, for spacing.
