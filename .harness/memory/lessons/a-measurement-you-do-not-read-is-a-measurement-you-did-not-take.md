# A measurement you do not read is a measurement you did not take

**From F-229 (2026-09-21).** The feature measured every illustration the mockups draw — line width
and ink — wrote the numbers into the contract, declared two tokens from them, and then drew `18`'s
document **solid** while its own table recorded a 3–4 px stroke over a fifth of the box inked. A
stroke width and a fifth of a box are an outline. The number was in the record, in the commit
message, and in the manifest note, and the drawing contradicted all three.

The review found it by looking at the picture. Nothing else could: every gate was green, the
registry matched the inventories both ways, and the digest blessed whatever was drawn.

## What to do instead

- **Check the artefact against the measurement, not only against the eye.** A reading like
  "stroke 3 px, coverage 0.2" predicts what the drawing must be. If the drawing disagrees, one of
  them is wrong and it is usually the drawing.
- **A crop at the wrong zoom lies.** The first pass read `18`'s page as solid from a 96 px cell,
  where a thick light stroke on a dark card fills in. The magnification the review used showed the
  card's own ground inside the page outline.
- **Two reviews in one release found the same class of error in opposite directions** — an outline
  where the mockups fill (F-228), a fill where they stroke (F-229). Outline-versus-solid is the axis
  this product's house style keeps sliding along, because both directions look tasteful in isolation.
  [[a-name-check-in-both-directions-says-nothing-about-the-drawing]]
- **Say which reading a number is.** The same ink measured 0.15 as a 90th percentile, 0.13 as a
  median, and 0.036 in linear light. A figure that moves fourfold with the space it is read in has to
  carry the space with it, or it is not reproducible from the record.

Related: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
