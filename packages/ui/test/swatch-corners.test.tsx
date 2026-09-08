/**
 * The two things rounding a swatch makes possible that a square one could not do wrong.
 *
 * **Corners that are not concentric.** The keyline is a 1px-inset parent around the sample. Two
 * rounded rectangles nested that way are only concentric when the outer radius exceeds the inner
 * by the inset — with equal radii the outer arc is TIGHTER than the inner one and a sliver of
 * ground shows through each corner.
 *
 * **A corner that outgrows the shape.** ADR-0090 made the corner a ratio, which is right in the
 * middle of the range and wrong at the top: at 0.25 the hero on a colour page would take an 85px
 * corner, which is a curve rather than a corner. ADR-0094 caps it, and a cap is a second thing
 * that can be wrong in two directions.
 *
 * Nothing else in the system would see either. The contrast gate reads colours, the conformance
 * suite reads structure, and `swatch-edge.test.ts` scans the gamut for the two tones — none of
 * them has a geometry.
 */

import { swatchCorner } from '../src/Swatch.js';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';

/**
 * The straight run left on each edge, as a fraction of the side.
 *
 * **This is what bounds a swatch corner, as of ADR-0094**, and it replaced the sampled area a
 * corner removes. Area was the wrong measure: colour appearance does depend on it and needs an
 * order-of-magnitude change to matter, so the difference between losing 1.3% and 5.4% of a swatch
 * is not something anybody can see. What degrades a sample is the corner growing until the shape
 * stops being a field — at ratio 0.5 a square is a circle.
 */
const straightEdge = (ratio: number): number => 1 - 2 * ratio;

/** The sizes the product actually draws a sample at. Named, so a change fails against reality. */
const REAL_SIZES = [32, 44, 56, 80, 140, 320] as const;

describe('swatchCorner', () => {
  it('keeps the keyline exactly one pixel outside the sample, at every size', () => {
    // THE ASSERTION THIS FILE EXISTS FOR. One pixel is the keyline's own inset; anything else
    // shows ground through the corners or overlaps the sample. It has to hold ACROSS the cap
    // too, which is the new way it could break: both radii clamp, so the difference survives.
    for (const size of [16, 24, 32, 44, 56, 80, 140, 160, 320, 380]) {
      const { sample, keyline } = swatchCorner(size);
      expect(`${String(size)}: ${String(keyline - sample)}`).toBe(`${String(size)}: 1`);
    }
  });

  it('keeps the well exactly one inset outside the keyline, at every size (F-187)', () => {
    /*
     * THE SAME ASSERTION AS THE ONE ABOVE, ONE LEVEL OUT.
     *
     * The well was a RECTANGLE while the sample inside it was rounded — reported as *"The bg of
     * color div, which is grey color, is still square/rectangle shaped"*. ADR-0090 rounded the
     * sample and F-161 called the roundness done; the ground it sits on was never touched.
     *
     * Nesting a third rounded rectangle brings back the concentricity failure the keyline
     * already had to solve: equal radii make the outer arc TIGHTER than the inner one, and a
     * sliver of ground shows through each corner. The gap has to be the padding, exactly.
     */
    for (const size of [16, 24, 32, 44, 56, 80, 140, 160, 320, 380]) {
      const { keyline, well } = swatchCorner(size);
      expect(`${String(size)}: ${String(well - keyline)}`).toBe(
        `${String(size)}: ${String(nativeSpacing.sm)}`,
      );
    }
  });

  it('lets the well keep growing past the cap the SAMPLE stops at', () => {
    /*
     * The cap exists so a sample does not become a curve at hero sizes. A container following
     * its own content past it is the correct direction — and capping the well while the keyline
     * kept growing is precisely the sliver the rule above forbids.
     */
    const { sample, well } = swatchCorner(1000);
    expect(sample).toBe(nativeRadius.xl);
    expect(well).toBeGreaterThan(nativeRadius.xl);
  });

  it('is proportional below the cap, so a chip and a card round alike', () => {
    // The reason the corner is a ratio rather than a length. A fixed radius would take 37% of a
    // 32px chip and 3% of a card; this takes the same fraction of both.
    for (const size of [32, 44, 56, 80]) {
      const { sample } = swatchCorner(size);
      // Rounding to whole pixels makes the ratio approximate at small sizes, which is why this
      // allows a pixel of slack rather than asserting an exact quotient.
      expect(Math.abs(sample / size - nativeRadius.swatchRatio)).toBeLessThan(1 / size);
    }
  });

  it('stops growing at the largest corner the system draws (ADR-0094)', () => {
    /*
     * A pure ratio gives the hero an 85px corner. `radius.xl` is the biggest corner anything in
     * this product takes, and a sample rounder than every container around it is a statement
     * nobody made.
     */
    expect(swatchCorner(340).sample).toBe(nativeRadius.xl);
    expect(swatchCorner(1000).sample).toBe(nativeRadius.xl);
  });

  it('DECOY — the cap is not simply the answer at every size', () => {
    // Without this, `swatchCorner` could return `radius.xl` unconditionally and the case above
    // would pass [[a-decoy-that-is-not-broken-proves-nothing]].
    expect(swatchCorner(44).sample).toBeLessThan(nativeRadius.xl);
    expect(swatchCorner(44).sample).toBeGreaterThan(0);
  });

  it('leaves at least half of every edge straight, at every size drawn', () => {
    /*
     * THE BOUND ITSELF LIVES IN THE MANIFEST AND IS NOT EMITTED — it is a parse-time constraint
     * rather than a radius anything draws with, so `manifest.test.ts` enforces it and this
     * asserts the consequence at the sizes that exist. The cap only ever makes this MORE true,
     * which is worth having stated rather than assumed.
     */
    for (const size of REAL_SIZES) {
      const { sample } = swatchCorner(size);
      expect(`${String(size)}: ${String(size - 2 * sample >= size / 2)}`).toBe(
        `${String(size)}: true`,
      );
    }
  });

  it('DECOY — the straight-edge arithmetic really does close as the corner grows', () => {
    // A formula that returned a constant would satisfy the case above.
    expect(straightEdge(nativeRadius.swatchRatio)).toBeCloseTo(0.5, 10);
    expect(straightEdge(0.5)).toBeCloseTo(0, 10);
    expect(straightEdge(0.05)).toBeGreaterThan(straightEdge(0.25));
  });

  it('never rounds a sample away entirely', () => {
    // A 1px sample is not something the product draws, and a component that produced a negative
    // or oversized radius for one would be a component nobody had thought about at the edges.
    for (const size of [0, 1, 2]) {
      const { sample } = swatchCorner(size);
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample * 2).toBeLessThanOrEqual(Math.max(size, 0) + 1);
    }
  });
});
