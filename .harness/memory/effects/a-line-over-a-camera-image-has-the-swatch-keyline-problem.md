# A line over a camera image has the swatch keyline problem

**Effect:** [E-072](../../state/effects.json) · `apps/mobile/src/lens/viewfinder.tsx` →
`packages/ui/src/Swatch.tsx` · **medium**

## What happened

The Lens reticle was a single 2px rule in `border.strong`, closed on all four sides around the
sampled region. Both halves were wrong, and neither had been noticed **because a reticle is not a
swatch**.

## One: a single tone cannot survive an arbitrary background

`border.strong` is a UI border token, chosen for drawing edges on our own surfaces — where the
other side of the line is a ground we picked.

Over a live camera image the other side is **an arbitrary colour**. That is exactly the case F-068
proved a single tone cannot handle: a single hairline measured **1.00 against its own colour**,
which the Swatch comment calls *"not a weak edge but NO EDGE AT ALL"*. On the one surface where
the marker must always be findable, it was nearly invisible over a pale garment.

The fix was not to invent a tone. `swatch.hairline` and `swatch.hairline.inverse` already exist
and are scanned across the whole sRGB gamut by `swatch-edge.test.ts`: the better tone reaches
**4.23** against the worst possible sample, and the two differ from each other by **~18:1**
whatever sits behind them. A new pair would have carried no such evidence — and nothing would have
measured it, because **the camera image is not a token** and no contrast gate can see it.

## Two: a closed border changes the colour it encloses

Simultaneous contrast is the entire reason `swatch.well` exists. A hard 2px rule on all four sides
of the sample is that same hazard, applied to the **live subject somebody is judging** — the
product framing the thing it is asking you to look at.

Corner marks say where the sample is taken without enclosing it, so what surrounds the colour is
the scene rather than our rule.

## The general shape

**A contrast rule attaches to the situation, not to the component.**

The situation here is *"a line whose other side we do not control"*. It occurs wherever the product
draws over content it did not choose — a reticle today, a crop handle, a magnifier, an overlay on a
photograph tomorrow. The tokens for it already existed and were already verified; what was missing
was recognising that this was the same problem wearing different clothes.

When drawing over content: ask what the worst possible background is, and whether anything has
been measured against it.

## A smaller thing worth keeping

The old overlay hard-coded `left: '45%'` and `width: '10%'` beside a `REGION_FRACTION` of `0.1` —
**two statements of one fact**. The marks would have gone on pointing at the old area the moment
the sampled region moved. A reticle that lies about where the colour is read is worse than none:
it is an instruction to aim somewhere the engine is not looking.

Related: [[an-exemption-can-name-the-feature-that-widens-it]]
