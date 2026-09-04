# F-161 — The register becomes soft minimal, and roundness reaches the sample

**Status:** in_progress · **Release:** R6 · **Blocked by:** nothing

---

## The register was chosen again, deliberately

The first pick was **editorial fashion** (SSENSE/COS/Aesop/Muji), and F-146 to F-150 were built
against it. The reporter has now twice asked for something cute and warm *alongside*
enterprise-grade, and chose **soft minimal — Muji/Ghibli** over both an overtly kawaii direction
and staying austere.

Keep the restraint, add warmth. That is mostly roundness, and roundness is mostly one component.

## Most of the product is already rounded

Twelve `borderRadius` declarations in `packages/ui` already read from `nativeRadius`, and the
scale is *"Material-3-scaled and generous"* — 6, 10, 14, 20, 28. Cards, cells, sheets and fields
have corners.

**The square thing is the swatch**, and it is square everywhere, in every size, on every screen.
That is what reads as hard.

---

## The decision that has to be made rather than edited

`radius.swatch` is `0`, and the manifest **parser throws** if it is anything else:

```ts
if (radius['swatch'] !== 0)
  throw new ManifestError(
    'radius.swatch',
    'the swatch radius is 0 and does not change. A corner radius removes sampled area ' +
      'from exactly the region the eye uses to judge a flat colour.',
  );
```

That reasoning is **correct**, and the manifest note adds the part that resolves it:

> *"the effect grows as the swatch shrinks"*

Which is to say the objection is about **area lost as a proportion of the sample**, and that is a
function of radius *relative to size* — not of radius. A rounded square of side `s` and corner
radius `r` loses `(4 − π)·r²`, so the fraction lost is `0.8584 · (r/s)²`:

| `r/s` | area lost |
| --- | --- |
| 0.100 | 0.86 % |
| **0.125** | **1.34 %** |
| 0.250 | 5.4 % |

**A fixed pixel radius is what cannot work.** 12px is 37 % of a 32px chip and 3 % of a 380px hero
— unusable at one end and invisible at the other. A *ratio* is right at every size, which is
exactly what the original objection implies once it is taken seriously rather than as a veto.

### So the manifest states the limit, not the value

`radius.swatchRatio: 0.125`, and the parser enforces a **maximum sampled area a corner may
remove**. The guard does not go away; it becomes a guard about the thing it was always about.

The reporter authorised the reversal — *"I don't care if we have to change ADR"* — and it needs
one, because a parse-time throw with a written reason is a decision, not a default.

---

## What gets built

**The manifest and its parser.** `swatch: 0` becomes `swatchRatio: 0.125` with
`maxSampledAreaLoss: 0.02`; the parser computes the loss and refuses a ratio that exceeds it.

**`Swatch` computes its own corners.** `Math.round(size × ratio)` for the sample, and **one more
pixel for the layer outside it** — the keyline is a 1px-inset parent, so equal radii would leave
the outer corner tighter than the inner and show a sliver of ground through it. The current
comment says the two must match; at radius 0 that was the same statement.

**The keyline itself does not change.** F-068 measured a single hairline at **1.00 against its own
colour** — no edge at all — and the two-tone opaque pair is what fixes it. Roundness was asked
for; giving up a contrast guarantee was not. The tones are unchanged, so
`swatch-edge.test.ts` still holds: it scans the gamut for contrast, and contrast is per-pixel and
indifferent to geometry.

**What is new geometrically is concentricity**, and that gets a test — the failure it prevents is
a visible notch at each corner, which no existing check would see.

---

## Risks

**The area argument is arithmetic, not perception.** 1.34 % is small, and *small* is a judgement
about how a person reads a colour, which nobody here has tested. The number bounds the change
honestly; it does not prove the change is imperceptible.

**Every swatch in the product changes at once.** The Atlas, the colour page, the wardrobe cells,
the Lens result, the palette pickers. That is correct — a design system that rounds some samples
and not others is worse than either — but it means one commit changes every colour surface, and
the only verification that matters is a person looking at it.

**`emit.test.ts` asserts `nativeRadius.swatch === 0`.** It has to change with the decision; a test
that pinned the old value while the ADR reversed it would be a check disagreeing with the thing
it checks.

---

## Definition of done

- [ ] `radius.swatchRatio` is emitted, and the parser enforces the area bound rather than a value
- [ ] `Swatch` rounds proportionally, with concentric corners, at every size
- [ ] The two-tone keyline is unchanged and `swatch-edge.test.ts` still passes
- [ ] A test fails a non-concentric corner
- [ ] An ADR records the reversal, the arithmetic, and what replaced the old guard
- [ ] `pnpm verify:ci` green
- [ ] The perceptual half attested rather than claimed
