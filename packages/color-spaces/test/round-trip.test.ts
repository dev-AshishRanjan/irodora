/**
 * Acceptance criterion 4: round trip through every ordered pair of spaces, within ΔE00 0.01,
 * across 10 000 sampled colours.
 *
 * **ΔE00 comes from `culori`, and that is deliberate.** CIEDE2000 ships in
 * `@irodora/color-difference` (F-007), which this feature blocks. Implementing it here would
 * be scope creep; implementing a throwaway copy would be a second implementation of colour
 * maths, which `packages/color-core/AGENTS.md` calls a defect by definition. ADR-0004 already
 * sanctions `culori` as a dev-only oracle, and a tolerance instrument is exactly what an
 * oracle is for.
 *
 * **The mode tag is the whole trick, and getting it wrong costs 10%.** `culori`'s
 * `differenceCiede2000` normalises its inputs with `converter('lab65')`. Our Lab is
 * D65-referenced, so it must be tagged `lab65`. Tagging it `lab` — culori's D50 mode, and the
 * obvious choice if you think of `lab` as "raw coordinates" — makes culori chromatically
 * adapt the values before measuring them, and every Sharma–Wu–Dalal reference pair then comes
 * out 9–13% low. That is small enough to look like a tolerance problem and get absorbed. The
 * first test in this file pins it.
 */

import { describe, expect, it } from 'vitest';
import { differenceCiede2000 } from 'culori';
import { sampleSrgb } from '@irodora/testing';
import {
  convert,
  CONVERTIBLE_SPACES,
  fromXyz,
  srgbToXyz,
  toXyz,
  type Triple,
} from '../src/index.js';

const rawDeltaE00 = differenceCiede2000();

/** ΔE00 between two D65 Lab triples. `lab65`, never `lab` — see the header. */
const deltaE00 = (a: Triple, b: Triple): number =>
  rawDeltaE00(
    { mode: 'lab65', l: a[0], a: a[1], b: a[2] },
    { mode: 'lab65', l: b[0], a: b[1], b: b[2] },
  );

const ROUND_TRIP_TOLERANCE = 0.01;

describe('the oracle is being used correctly', () => {
  // Sharma, Wu & Dalal (2005), supplementary test data. Not a test of our code — a test that
  // the instrument our acceptance criterion is measured with reads correctly.
  const SHARMA: readonly (readonly [Triple, Triple, number])[] = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
    [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
    [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[63.0109, -31.0961, -5.8663], [62.8187, -29.7946, -4.0864], 1.263],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ];

  it('reproduces eight Sharma–Wu–Dalal reference pairs to four decimal places', () => {
    for (const [a, b, expected] of SHARMA)
      expect(deltaE00(a, b), JSON.stringify([a, b])).toBeCloseTo(expected, 4);
  });

  it('and the WRONG mode tag would be 9% low — the mistake this pins', () => {
    // The decoy. If tagging the values `lab` produced the same answer, the test above would
    // be proving nothing about the tag and the header's warning would be folklore.
    const [a, b, expected] = SHARMA[0]!;
    const misTagged = rawDeltaE00(
      { mode: 'lab', l: a[0], a: a[1], b: a[2] },
      { mode: 'lab', l: b[0], a: b[1], b: b[2] },
    );
    expect(misTagged).toBeLessThan(expected * 0.95);
    expect(misTagged).toBeGreaterThan(expected * 0.85);
  });

  it('is zero for identical colours and symmetric', () => {
    for (const [a, b] of SHARMA) {
      expect(deltaE00(a, a)).toBe(0);
      expect(deltaE00(a, b)).toBeCloseTo(deltaE00(b, a), 12);
    }
  });
});

describe('round trip through every ordered pair of spaces', () => {
  const samples = sampleSrgb('f-006-round-trip', 10_000);

  it('covers all 56 ordered pairs', () => {
    const pairs = CONVERTIBLE_SPACES.length * (CONVERTIBLE_SPACES.length - 1);
    expect(CONVERTIBLE_SPACES).toHaveLength(8);
    expect(pairs).toBe(56);
  });

  for (const from of CONVERTIBLE_SPACES)
    for (const to of CONVERTIBLE_SPACES) {
      if (from === to) continue;

      it(`${from} → ${to} → ${from} stays within ΔE00 ${String(ROUND_TRIP_TOLERANCE)}`, () => {
        let worst = 0;
        let worstIndex = -1;
        let worstStratum = '';

        for (const { rgb, stratum, index } of samples) {
          const xyz = srgbToXyz(rgb);
          const start = fromXyz(xyz, from);
          const returned = convert(convert(start, from, to), to, from);

          // Measured in Lab, always. Comparing components in the space itself would mean a
          // different tolerance per space and no way to state one number in the criterion.
          const delta = deltaE00(
            fromXyz(toXyz(start, from), 'lab'),
            fromXyz(toXyz(returned, from), 'lab'),
          );

          if (delta > worst) {
            worst = delta;
            worstIndex = index;
            worstStratum = stratum;
          }
        }

        expect(
          worst,
          `worst at sample ${String(worstIndex)} (${worstStratum})`,
        ).toBeLessThanOrEqual(ROUND_TRIP_TOLERANCE);
      });
    }
});

describe('the round trip is far tighter than the criterion, and that is worth pinning', () => {
  it('every pair round-trips within ΔE00 1e-9, not merely within 0.01', () => {
    // The acceptance criterion is 0.01. The actual worst case is orders of magnitude below
    // it, and pinning the real number is what makes a regression visible: a change that
    // degraded every round trip to 0.009 would pass the criterion silently.
    let worst = 0;
    let worstPair = '';

    const samples = sampleSrgb('f-006-round-trip-tight', 2_000);

    for (const from of CONVERTIBLE_SPACES)
      for (const to of CONVERTIBLE_SPACES) {
        if (from === to) continue;
        for (const { rgb } of samples) {
          const start = fromXyz(srgbToXyz(rgb), from);
          const returned = convert(convert(start, from, to), to, from);
          const delta = deltaE00(
            fromXyz(toXyz(start, from), 'lab'),
            fromXyz(toXyz(returned, from), 'lab'),
          );
          if (delta > worst) {
            worst = delta;
            worstPair = `${from} → ${to}`;
          }
        }
      }

    expect(worst, `worst pair: ${worstPair}`).toBeLessThan(1e-9);
  });
});

describe('convert', () => {
  it('is the identity for the same space, without a detour through XYZ', () => {
    const value: Triple = [0.2, 0.4, 0.6];
    for (const space of CONVERTIBLE_SPACES) expect(convert(value, space, space)).toBe(value);
  });

  it('agrees with the direct function for every pair through XYZ', () => {
    const xyz = srgbToXyz([0.3, 0.6, 0.45]);
    for (const from of CONVERTIBLE_SPACES)
      for (const to of CONVERTIBLE_SPACES) {
        if (from === to) continue;
        const start = fromXyz(xyz, from);
        expect(convert(start, from, to)).toEqual(fromXyz(toXyz(start, from), to));
      }
  });
});
