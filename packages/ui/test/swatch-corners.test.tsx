/**
 * The one thing rounding a swatch newly makes possible: corners that are not concentric.
 *
 * The keyline is a 1px-inset parent around the sample. Two rounded rectangles nested that way are
 * only concentric when the outer radius exceeds the inner by the inset — with equal radii the
 * outer arc is TIGHTER than the inner one and a sliver of ground shows through each corner.
 *
 * At `radius.swatch: 0` this could not happen, which is why the component's old comment could say
 * the radius "must be 0 on BOTH nested views" and be complete. ADR-0090 made the corner a ratio,
 * and this is the failure that arrived with it.
 *
 * Nothing else in the system would see it. The contrast gate reads colours, the conformance suite
 * reads structure, and `swatch-edge.test.ts` scans the gamut for the two tones — none of them has
 * a geometry.
 */

import { swatchCorner } from '../src/Swatch.js';
import { nativeRadius } from '@irodora/design-tokens';

/** The area a corner removes, as a fraction of the sample. See ADR-0090. */
const areaLost = (ratio: number): number => (4 - Math.PI) * ratio * ratio;

describe('swatchCorner', () => {
  it('keeps the keyline exactly one pixel outside the sample, at every size', () => {
    // THE ASSERTION THIS FILE EXISTS FOR. One pixel is the keyline's own inset; anything else
    // shows ground through the corners or overlaps the sample.
    for (const size of [16, 24, 32, 44, 56, 80, 140, 160, 320, 380]) {
      const { sample, keyline } = swatchCorner(size);
      expect(`${String(size)}: ${String(keyline - sample)}`).toBe(`${String(size)}: 1`);
    }
  });

  it('is proportional, so the area lost does not change with size', () => {
    // The whole reason the corner is a ratio rather than a length. A fixed radius would take 37%
    // of a 32px chip and 3% of the hero; this takes the same fraction of both.
    for (const size of [32, 160, 320]) {
      const { sample } = swatchCorner(size);
      // Rounding to whole pixels means the ratio is approximate at small sizes, which is why
      // this allows a pixel of slack rather than asserting an exact quotient.
      expect(Math.abs(sample / size - nativeRadius.swatchRatio)).toBeLessThan(1 / size);
    }
  });

  it('removes a small, stated fraction of the sample', () => {
    /*
     * THE CEILING ITSELF LIVES IN THE MANIFEST AND IS NOT EMITTED — it is a parse-time
     * constraint rather than a radius anything draws with, so `manifest.test.ts` is where it is
     * enforced and this asserts the consequence: the corner this package actually ships costs
     * about 1.3% of the sample.
     */
    expect(areaLost(nativeRadius.swatchRatio)).toBeCloseTo(0.0134, 4);
  });

  it('DECOY — the arithmetic really does grow with the corner', () => {
    // Without this the assertion above would pass for a formula that returned a constant
    // [[a-decoy-that-is-not-broken-proves-nothing]].
    expect(areaLost(0.5)).toBeGreaterThan(areaLost(nativeRadius.swatchRatio) * 10);
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
