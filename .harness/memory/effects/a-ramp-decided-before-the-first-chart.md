# A ramp decided before the first chart

**Effect:** [E-074](../../state/effects.json) · `packages/ui/src/Bands.tsx` →
`unreached-tokens.json` · **medium**

## What happened

`chart.1`–`chart.5` were emitted by the manifest and read by nothing from F-048 until F-150. The
exemption said *"There is no chart in the product"* and named **F-150** as the feature that would
close it.

It did. Five tokens closed at once, and the entry was deleted rather than re-pointed at another
feature — which is the ADR-0088 discipline working as intended, for once in the ordinary direction.

## The decision that had already been made

The ramp is near-achromatic, and the manifest explains why in the reason it gives for leaving
these tokens out of the contrast pairings:

> A data series is separated from its neighbours by lightness, marker shape and a direct label,
> not by contrast against a surface — the greyscale ramp exists precisely so hue is not the
> channel.

That is golden rule 13 applied **before there was anything to apply it to**. Deciding a chart
palette with a chart half-built is how a rainbow ships; deciding it when there is nothing to plot
costs nothing and cannot be argued down by a deadline.

## What that obliged the component to do

The reason is not a note — it is a specification, and it says what the component owes:

- **A direct label on every band, and its number, as text.** The whole reading survives with the
  bars removed. That is not a fallback for a colour-blind reader; it is the primary reading, and
  everyone gets it.
- **Lightness for order.** Not hue, ever.
- **No legend.** A legend is a lookup table between colour and meaning — the exact structure that
  fails when colour is not available. Direct labels remove the need for one.

**Marker shape is deliberately unused**, and writing that down mattered more than using it. Shape
separates *series* — it tells one line from another. There is one series here and the ramp encodes
*order within it*, so a shape channel would be distinguishing things that are not different. The
moment a second series appears, shape is the channel to reach for.

## The numbers had an obligation too

`valid` is a count at a threshold **this build chose**. `wouldUnlock` is a projection from a
synthetic colour at a region's centre — **there is no such garment**. Both notes are rendered on
screen rather than kept in a comment, because golden rule 11 applies to a chart as much as to a
sentence, and a bar is more persuasive than a paragraph.

## What to carry forward

**Decide the constrained thing while it costs nothing.** The value of this ramp was not that it
was clever; it was that it existed before anyone was under pressure to ship a chart. The same
argument applies to any decision with a rule attached — motion durations, status channels, the
swatch keyline. Each was cheap early and would have been contested late.

Related: [[an-unreached-token-is-unfinished-work]],
[[a-line-over-a-camera-image-has-the-swatch-keyline-problem]]
