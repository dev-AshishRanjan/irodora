# A scale with no names shifts under its readers

**E-036** · from `docs/design/design-system.manifest.json#spacing.scale` · guard `gate:a11y`,
proven by `verify-spacing-scale.mjs --prove`

## What depends on what

`spacing.scale` is emitted to all four targets **positionally**:

| target | form |
|---|---|
| `tokens.css` | `--irodora-space-1 … --space-9` |
| `tokens.tailwind.css` | `--spacing-1 … --spacing-9` |
| `tokens.ts` | `SPACING[]` |
| `native.ts` | `nativeSpacing[]` |

A component writes `nativeSpacing[2]`. Nothing in that expression names 12.

## The failure mode

Add a step at the front, or remove one from the middle, and **every index above it means a
different number** — while every call site still compiles, every test still passes, and every
style prop still receives a valid `number`.

There is no type error to catch it: React Native style props take `number`, and
`nativeSpacing[2]` has literal type `12` today and would have literal type `14` tomorrow, which
is equally assignable. There is no failing test, because no test asserts a component's padding
*value* — the conformance suite resolves colours, not lengths. The symptom is a layout that is
subtly wrong everywhere, which is exactly the symptom nobody bisects.

**Compare `nativeRadius`.** It is a named record, so `nativeRadius.swatch` survives any
reordering and breaks loudly if the name goes. Spacing and radius came from the same manifest
and got different shapes, and only one of them is safe to edit.

## Why F-095 could move the scale anyway

ADR-0074 removed `14` and added `12` and `16`, renumbering every index above 1. That was safe
**precisely because nothing read the scale** — which is the defect F-092 filed and F-095 closed.

The window closed the moment it was fixed. Five components in `packages/ui` now read
`nativeSpacing` by index, so the next change to `spacing.scale` has readers to break. The
generated file says so in its own doc comment, where a component author will actually see it.

## What guards it, and what does not

`scripts/verify-spacing-scale.mjs` fails on any padding, margin or gap **literal** that is not a
step of the scale, naming the file, line, property and value. It reads the scale from the
manifest — a case in `--prove` removes a step from the manifest and asserts the verdict follows,
which is what distinguishes reading the scale from carrying a copy of it.

**It cannot see a stale index.** `nativeSpacing[2]` is not a literal; the check reads no
indices and says so. The guard against renumbering is the doc comment on the emitted binding and
the fact that only five call sites exist — both of which are the kind of protection that works
until it doesn't.

**The structural fix is names**, the way radius already has them, and it is filed as **F-103**
rather than done here: it changes the manifest schema and all four emitters, and F-095 had a
scope.

## What this does not catch either

`borderWidth`, and every other numeric style property. They are not spacing. `Swatch.tsx`
carries `borderWidth: 2`, a real decision that nothing checks — stated so the coverage of this
link is not read as wider than it is.

## Related

- [[a-token-with-no-reader-is-a-decision-nobody-applied]] — **E-029**, the link this closes one
  entry of. It found the scale had no reader; this one is about what happens now that it does.
- [[a-token-change-is-a-contrast-change-in-both-themes]] — **E-007**, the same source file, the
  colour half.
- [[a-threshold-nothing-can-cross-is-not-a-threshold]] — the other shape of a check that agrees
  with whatever it is given.
