/**
 * Behavioural properties of the transfer function, as distinct from its published values.
 *
 * The golden set says "this input produces that number". These say "whatever the numbers,
 * these relationships hold" — which is what catches a change that is self-consistent and
 * wrong, the failure mode a snapshot test cannot see.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { sampleSrgb } from '@irodora/testing';
import { linearToSrgb, srgbToLinear, SRGB_EOTF_CUTOFF, SRGB_JOIN_GAP } from '../src/index.js';

const component = (): fc.Arbitrary<number> =>
  fc.double({ min: -1.5, max: 1.5, noNaN: true, noDefaultInfinity: true });

/** The published standard's own artefact — see SRGB_JOIN_GAP. Everywhere else: 1e-12. */
const roundTripBound = (v: number): number => {
  const magnitude = Math.abs(v);
  return magnitude > SRGB_JOIN_GAP.from && magnitude <= SRGB_JOIN_GAP.to
    ? SRGB_JOIN_GAP.worstRoundTripError
    : 1e-12;
};

describe('srgbToLinear / linearToSrgb', () => {
  it('round-trips every sampled component', () => {
    fc.assert(
      fc.property(component(), (v) => {
        expect(Math.abs(linearToSrgb(srgbToLinear(v)) - v)).toBeLessThanOrEqual(roundTripBound(v));
      }),
      { numRuns: 5_000 },
    );
  });

  it('round-trips the stratified sample, near-black included', () => {
    for (const { rgb, stratum, index } of sampleSrgb('transfer-round-trip', 10_000))
      for (const v of rgb)
        expect(
          Math.abs(linearToSrgb(srgbToLinear(v)) - v),
          `sample ${String(index)} (${stratum})`,
        ).toBeLessThanOrEqual(roundTripBound(v));
  });

  it('is non-decreasing everywhere and strictly increasing above the subnormal floor', () => {
    // Strict monotonicity is false in float64 and it is not our doing: -4e-323 and -3.5e-323
    // are adjacent subnormals whose quotients by 12.92 both flush to -5e-324. Asserting
    // strictness everywhere would be asserting something about IEEE-754 that is not true.
    // The colour-relevant claim — strictly increasing across every value a colour can hold —
    // is the second half, and it is the half that would catch a real regression.
    fc.assert(
      fc.property(component(), component(), (a, b) => {
        fc.pre(a < b);
        expect(srgbToLinear(a)).toBeLessThanOrEqual(srgbToLinear(b));
      }),
      { numRuns: 2_000 },
    );

    // The ordered pair is constructed rather than filtered. `fc.pre(a < b)` with a minimum
    // separation rejects almost every draw, because fc.double spends most of its budget on
    // subnormals — and a property that skipped 200 000 of 200 467 candidates would be
    // reported as passing while having tested almost nothing.
    fc.assert(
      fc.property(
        component(),
        fc.double({ min: 1e-6, max: 1, noNaN: true, noDefaultInfinity: true }),
        (a, separation) => {
          expect(srgbToLinear(a)).toBeLessThan(srgbToLinear(a + separation));
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('is odd — f(-v) = -f(v) — so an out-of-gamut component survives', () => {
    // Without this, Math.pow of a negative base returns NaN, every round trip through an
    // out-of-gamut colour silently produces NaN, and NaN compares false against every
    // tolerance a test could apply. The failure would look like a passing suite.
    fc.assert(
      fc.property(component(), (v) => {
        expect(srgbToLinear(-v)).toBe(-srgbToLinear(v));
        expect(linearToSrgb(-v)).toBe(-linearToSrgb(v));
      }),
      { numRuns: 1_000 },
    );
  });

  it('never returns NaN for a finite input', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }), (v) => {
        expect(Number.isFinite(srgbToLinear(v))).toBe(true);
        expect(Number.isFinite(linearToSrgb(v))).toBe(true);
      }),
      { numRuns: 1_000 },
    );
  });

  it('carries the sign of zero, so it is odd at zero too', () => {
    // `value < 0 ? -1 : 1` turns -0 into +0 and the function stops being odd at exactly one
    // point. Invisible to every numeric comparison; loud in the identity digest, which
    // compares IEEE-754 bytes (NFR-3).
    expect(Object.is(srgbToLinear(-0), -0)).toBe(true);
    expect(Object.is(srgbToLinear(0), 0)).toBe(true);
    expect(Object.is(linearToSrgb(-0), -0)).toBe(true);
  });

  it('pins the endpoints', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBe(1);
    // Documented, not fixed: 1.055 * 1 - 0.055 is not exactly 1 in float64. Special-casing
    // the endpoint would mean this function is no longer the published formula.
    expect(linearToSrgb(1)).toBe(0.9999999999999999);
    expect(linearToSrgb(0)).toBe(0);
  });

  it('uses the linear branch below the cutoff and the power branch above it', () => {
    const below = SRGB_EOTF_CUTOFF - 1e-6;
    expect(srgbToLinear(below)).toBe(below / 12.92);

    const above = SRGB_EOTF_CUTOFF + 1e-6;
    expect(srgbToLinear(above)).not.toBe(above / 12.92);
  });
});
