---
kind: effect
title: Chroma a mockup draws before its token exists is declared by element
category: contract
confidence: 0.85
created: 2026-09-25
scope: [mockups, packages/design-tokens]
links: [[the-mockups-readme-is-the-palette-now]], [[a-mechanism-nobody-used-is-a-mechanism-nobody-measured]]
---

# E-149 — the inventories' C10 elements → the manifest's exceptions

**`mockups/inventory/*.json` → `design-system.manifest.json` `exceptions` ·
`c10-exceptions.test.ts` · `checkChromaCeiling`**

## What changed

C10 follows chroma the mockups draw where the brief said none: `02`'s gold HUD, `04` and `12`'s green
verdicts, `27`'s tinted state art. ADR-0110 extends C10 to the icons drawn in colour. None of these
has a token yet: the feature that builds each surface mints one. Until then, the chroma ceiling's
exception count would be blind to exactly the chroma the product is about to ship. ADR-0044 exists
to make that count real.

So an exception may now name **elements** instead of a token. Each such exception carries its
`kind` (tint, tints, gradient, spectrum, multi or sample), the tints read off the image, and
`mintedBy`. The census, with every hex, is in R9-MOCKUP-FIDELITY §6.

## The guard

`c10-exceptions.test.ts` walks every inventory. It gathers every C10 element and every element
binding one of ADR-0110's glyphs, and requires each to be covered exactly once. It also requires
that no exception names an element no inventory draws. `23`'s three greyscale tracks measure
achromatic, and they are named in the test, so leaving them out is on record rather than an
omission. `checkChromaCeiling` reports an element exception whose every measured tint is under the
ceiling.

## How to apply

When an inventory adds or renames a C10 element, the manifest follows in the same change. When a
feature mints the token (its `mintedBy`), it replaces the element exception with a token
exception, or with nothing if the token sits under the ceiling. It must not leave both.
