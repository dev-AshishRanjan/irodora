/**
 * The two things rounding a swatch makes possible that a square one could not do wrong.
 *
 * **Corners that are not concentric.** The keyline is a 1px-inset parent around the sample. Two
 * rounded rectangles nested that way are only concentric when the outer radius exceeds the inner
 * by the inset — with equal radii the outer arc is TIGHTER than the inner one and a sliver of
 * ground shows through each corner.
 *
 * **A corner that outgrows the shape.** ADR-0090 made the corner a ratio, which is right at the
 * bottom of the range and wrong at the top: at 0.25 the hero on a colour page takes an 85px
 * corner, which is a curve rather than a corner. ADR-0103 makes the corner a SCALE STEP and keeps
 * ADR-0094 bound as its ceiling, so there are two things to get wrong in two directions each —
 * the step at ordinary sizes, and the ceiling below about 24px where a step would take more than
 * a quarter of the side.
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

  it('lets the well keep growing past the step the SAMPLE stops at', () => {
    /*
     * The step exists so a sample stays a field rather than becoming a curve at hero sizes. A
     * container following its own content outward is the correct direction — and holding the well
     * while the keyline kept growing is precisely the sliver the rule above forbids.
     */
    const { sample, well } = swatchCorner(1000);
    expect(sample).toBe(nativeRadius.sm);
    expect(well).toBeGreaterThan(nativeRadius.sm);
  });

  it('takes its step at every size the product draws it at (ADR-0103)', () => {
    // The corners F-220 measured are lengths, not fractions: 4 to 11.5 dp across 28 images, bound
    // per element as `sm` or `md`. Above the ceiling's reach the step is simply the corner.
    for (const size of REAL_SIZES) {
      expect(`${String(size)} sm: ${String(swatchCorner(size).sample)}`).toBe(
        `${String(size)} sm: ${String(nativeRadius.sm)}`,
      );
      expect(`${String(size)} md: ${String(swatchCorner(size, 'md').sample)}`).toBe(
        `${String(size)} md: ${String(Math.min(nativeRadius.md, Math.floor(size * nativeRadius.swatchRatio)))}`,
      );
    }
  });

  it('does not grow with the sample: a hero and a card take the same corner', () => {
    /*
     * A pure ratio gives the hero an 85px corner. The mockups draw 6.75 dp on `01`'s hero and
     * 5.75 on the card sample beneath it — the same step, which is what this asserts.
     */
    expect(swatchCorner(140).sample).toBe(nativeRadius.sm);
    expect(swatchCorner(340).sample).toBe(nativeRadius.sm);
    expect(swatchCorner(1000).sample).toBe(nativeRadius.sm);
  });

  it('DECOY — the ceiling really binds below the size a step fits in', () => {
    /*
     * Without this, `swatchCorner` could return its step unconditionally and every case above
     * would pass [[a-decoy-that-is-not-broken-proves-nothing]]. At 16px a quarter of the side is
     * 4, which is below both steps, so both must come back at 4 — and the two steps must differ
     * where both fit, or the parameter is decoration.
     */
    expect(swatchCorner(16).sample).toBe(4);
    expect(swatchCorner(16, 'md').sample).toBe(4);
    expect(swatchCorner(44, 'md').sample).toBe(nativeRadius.md);
    expect(swatchCorner(44).sample).toBeLessThan(swatchCorner(44, 'md').sample);
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
