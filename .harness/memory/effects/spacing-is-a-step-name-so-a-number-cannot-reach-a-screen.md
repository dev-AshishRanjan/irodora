# E-057 — Spacing is a step name, so a number cannot reach a screen

**Link:** `packages/ui/src/layout.tsx#SpacingStep` → `Surface.tsx`, every screen, `layout.test.tsx`,
[ADR-0080](../../../docs/adr/0080-an-unreached-design-token-is-unfinished-work-not-a-declared-exemption.md)
**Guard:** `gate:typecheck` **Severity:** medium **Feature:** F-140

---

## What the link is

Every spacing prop on `Screen`, `Section`, `Stack`, `Row` and — since F-140 — `Surface` is typed
`SpacingStep`, which is `keyof typeof nativeSpacing`. Not a number, and not a hand-written union.

So the manifest and the screens are now joined by the type system. Renaming `xl2` or removing it
is a compile error at every surface that wanted it, rather than a silently different number.
That is what ADR-0074 bought when the scale stopped being a positional array, extended one layer
out from the token module to the product.

## Why this was needed when the values were already correct

`verify-spacing-scale.mjs` confirmed that all 147 spacing literals in the screens landed on the
scale. They were not wrong. But they agreed with the manifest **by inspection rather than by
reference** — nothing connected the number `8` to the decision named `sm`, and nothing stopped
the next one drifting.

The stronger reason is what the literal cannot say. `gap: 28` records a number somebody chose.
`gap="xl2"` records the step the manifest argues for, and the manifest's argument for that step
is a paragraph about 間 (*ma*) being a design element. The first spelling loses the argument.

## The cost, stated

**There is deliberately no `style` escape hatch**, so a layout that needs `flex`, `flexShrink` or
`paddingVertical` cannot use the primitives. A passthrough would re-admit every literal the types
exist to refuse, in the one place nobody greps.

44 such sites keep a plain `View` and reference `nativeSpacing.<step>`. That is the same
guarantee by a weaker mechanism: the value follows the manifest, but nothing *stops* the next one
being written as a number. Closing that gap means either widening the primitives or accepting the
weaker form, and F-140 accepted it rather than adding an escape hatch to buy tidiness.

## What would break this link

Adding `style` to any primitive. Widening `SpacingStep` to `number`. Both are caught: the four
`@ts-expect-error` cases in `layout.test.tsx` become TS2578 "unused directive" errors the moment
the type admits a number, which was run and observed rather than assumed.

## Related

- [[an-exemption-that-names-no-owner-turns-unfinished-into-passing]] — the other half of F-140.
- ADR-0074 — the scale as a named object, which this depends on entirely.
