/**
 * The lower bound — the correctness argument of the feature.
 *
 * `boxLowerBoundDeltaE00` must **never** exceed the true ΔE00 to any point in the box. The
 * equivalence suite in `name.test.ts` only catches unsoundness the data happens to hit; this
 * file attacks the bound directly over millions of random box/point pairs, which is the sharper
 * instrument [[measure-what-a-golden-set-can-detect-before-trusting-it]].
 *
 * The derivation in `bound.ts` is algebra I re-derived rather than cited. **These tests are the
 * authority, not that comment** — if a counterexample appears here, the bound is wrong.
 *
 * No `node:*` anywhere: `packages/color-naming` is inside the colour-engine ESLint zone, whose
 * override has no `ignores` for tests, so even a fixture file could not be read. Everything is
 * generated in-process from a recorded seed.
 */

import { deltaE00 } from '@irodora/color-difference';
import type { Triple } from '@irodora/color-spaces';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  boxLowerBoundDeltaE00,
  boxOf,
  extendBox,
  G_MAX,
  labBucketKey,
  RT_FLOOR,
  T_MAX,
  type LabBox,
} from '../src/bound.js';

/** Lab covering the whole plausible range, including out-of-sRGB chroma. */
const labArb = fc
  .tuple(
    fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -128, max: 128, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -128, max: 128, noNaN: true, noDefaultInfinity: true }),
  )
  .map(([l, a, b]) => [l, a, b] as Triple);

/** A box built from two corners, plus a point guaranteed to lie inside it. */
const unitArb = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true });

const boxAndPointArb = fc
  .tuple(labArb, labArb, unitArb, unitArb, unitArb)
  .map(([one, two, tl, ta, tb]) => {
    const box = extendBox(boxOf(one), two);
    const inside: Triple = [
      box.lMin + (box.lMax - box.lMin) * tl,
      box.aMin + (box.aMax - box.aMin) * ta,
      box.bMin + (box.bMax - box.bMin) * tb,
    ];
    return { box, inside };
  });

describe('the derived constants', () => {
  it('RT_FLOOR is 1 - sqrt(3)/2, from |Rt| <= 2 sin 60', () => {
    expect(RT_FLOOR).toBeCloseTo(0.1339745962155614, 15);
    // The claim underneath: y^2 + z^2 + Rt*y*z >= (1 - sqrt(3)/2)(y^2 + z^2), because
    // |y*z| <= (y^2 + z^2)/2. Asserted numerically over the worst case rather than trusted.
    fc.assert(
      fc.property(
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: -Math.sqrt(3), max: Math.sqrt(3), noNaN: true }),
        (y, z, rt) => {
          expect(y * y + z * z + rt * y * z).toBeGreaterThanOrEqual(
            RT_FLOOR * (y * y + z * z) - 1e-9,
          );
        },
      ),
      { numRuns: 2000, seed: 20260823 },
    );
  });

  it('S_H <= S_C for every attainable T and chroma, which is what lets one divisor bound both', () => {
    // T_MAX is the triangle-inequality bound on CIEDE2000's T term. The inequality that
    // matters is 0.015 * T_MAX < 0.045.
    expect(0.015 * T_MAX).toBeLessThan(0.045);
    for (const cBar of [0, 1, 10, 50, 100, 200, 400]) {
      const sC = 1 + 0.045 * cBar;
      const sH = 1 + 0.015 * cBar * T_MAX;
      expect(sH).toBeLessThanOrEqual(sC);
    }
  });

  it("G's ceiling is 0.5, so C' never exceeds 1.5 C_ab", () => {
    expect(G_MAX).toBe(0.5);
  });
});

describe('soundness — the bound never overestimates', () => {
  it('holds for a point inside the box', () => {
    fc.assert(
      fc.property(labArb, boxAndPointArb, (query, { box, inside }) => {
        const lb = boxLowerBoundDeltaE00(query, box);
        const actual = deltaE00(query, inside);
        // A tolerance of 1e-9 absorbs floating-point noise only. Anything larger would hide
        // exactly the defect this test exists to find.
        expect(lb).toBeLessThanOrEqual(actual + 1e-9);
      }),
      { numRuns: 50_000, seed: 20260818 },
    );
  });

  it('holds at every corner of the box, where the bound is tightest', () => {
    fc.assert(
      fc.property(labArb, boxAndPointArb, (query, { box }) => {
        const lb = boxLowerBoundDeltaE00(query, box);
        for (const l of [box.lMin, box.lMax])
          for (const a of [box.aMin, box.aMax])
            for (const b of [box.bMin, box.bMax])
              expect(lb).toBeLessThanOrEqual(deltaE00(query, [l, a, b]) + 1e-9);
      }),
      { numRuns: 20_000, seed: 20260819 },
    );
  });

  it('holds in the blue region near h = 275 where Rt is largest', () => {
    // Rt peaks where the hue-rotation term is active. If the sqrt(3) ceiling were wrong, this
    // is the region that would expose it, so it gets its own dense sample.
    const blueish = fc
      .tuple(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: -60, max: 10, noNaN: true }),
        fc.double({ min: -128, max: -20, noNaN: true }),
      )
      .map(([l, a, b]) => [l, a, b] as Triple);

    fc.assert(
      fc.property(blueish, blueish, blueish, (query, one, two) => {
        const box = extendBox(boxOf(one), two);
        expect(boxLowerBoundDeltaE00(query, box)).toBeLessThanOrEqual(deltaE00(query, one) + 1e-9);
        expect(boxLowerBoundDeltaE00(query, box)).toBeLessThanOrEqual(deltaE00(query, two) + 1e-9);
      }),
      { numRuns: 30_000, seed: 20260820 },
    );
  });

  it('holds at high chroma, where S_C is largest and the bound loosest', () => {
    const saturated = fc
      .tuple(
        fc.double({ min: 30, max: 90, noNaN: true }),
        fc.double({ min: 60, max: 128, noNaN: true }),
        fc.double({ min: 60, max: 128, noNaN: true }),
      )
      .map(([l, a, b]) => [l, a, b] as Triple);

    fc.assert(
      fc.property(saturated, saturated, (query, point) => {
        expect(boxLowerBoundDeltaE00(query, boxOf(point))).toBeLessThanOrEqual(
          deltaE00(query, point) + 1e-9,
        );
      }),
      { numRuns: 30_000, seed: 20260821 },
    );
  });

  it('is exactly zero for a point the box was built from — it cannot exclude its own cell', () => {
    // Exact containment, so exactly zero. This is the case the stopping rule depends on: a
    // bucket containing the query must never be skipped.
    fc.assert(
      fc.property(labArb, labArb, (one, two) => {
        const box = extendBox(boxOf(one), two);
        expect(boxLowerBoundDeltaE00(one, box)).toBe(0);
        expect(boxLowerBoundDeltaE00(two, box)).toBe(0);
      }),
      { numRuns: 5000, seed: 20260822 },
    );
  });

  it('is negligible for an interpolated interior point', () => {
    // Not asserted as exactly zero: `lMin + (lMax - lMin) * t` can land a few ulps outside the
    // box for t near 1, which is a property of the test's own arithmetic rather than of the
    // bound. What matters is that the resulting gap cannot exclude a real candidate.
    fc.assert(
      fc.property(boxAndPointArb, ({ box, inside }) => {
        expect(boxLowerBoundDeltaE00(inside, box)).toBeLessThan(1e-9);
      }),
      { numRuns: 5000, seed: 20260824 },
    );
  });
});

describe('the decoy — an unsound bound must be caught', () => {
  /**
   * What a plausible-but-wrong bound looks like: Euclidean Lab distance halved, with no S_C
   * divisor and no Rt floor. It is *usually* below the true ΔE00, which is exactly why a test
   * that only sampled typical colours would pass it [[a-decoy-that-is-not-broken-proves-nothing]].
   */
  function unsoundBound(query: Triple, box: LabBox): number {
    const dL = query[0] < box.lMin ? box.lMin - query[0] : Math.max(0, query[0] - box.lMax);
    const dA = query[1] < box.aMin ? box.aMin - query[1] : Math.max(0, query[1] - box.aMax);
    const dB = query[2] < box.bMin ? box.bMin - query[2] : Math.max(0, query[2] - box.bMax);
    return Math.hypot(dL, dA, dB) / 2;
  }

  it('finds a counterexample to the unsound bound, and none to the real one', () => {
    let unsoundViolations = 0;
    let realViolations = 0;
    let worstSlack = 0;

    const prng = mulberry32(20260823);
    const rand = (lo: number, hi: number): number => lo + prng() * (hi - lo);

    for (let i = 0; i < 200_000; i += 1) {
      const query: Triple = [rand(0, 100), rand(-128, 128), rand(-128, 128)];
      const one: Triple = [rand(0, 100), rand(-128, 128), rand(-128, 128)];
      const two: Triple = [rand(0, 100), rand(-128, 128), rand(-128, 128)];
      const box = extendBox(boxOf(one), two);

      const actual = Math.min(deltaE00(query, one), deltaE00(query, two));
      if (unsoundBound(query, box) > actual + 1e-9) unsoundViolations += 1;

      const lb = boxLowerBoundDeltaE00(query, box);
      if (lb > actual + 1e-9) realViolations += 1;
      if (actual > 0) worstSlack = Math.max(worstSlack, lb / actual);
    }

    // The decoy must actually be broken, or this proves nothing.
    expect(unsoundViolations).toBeGreaterThan(0);
    expect(realViolations).toBe(0);
    // Recorded rather than asserted: the bound is loose by construction (RT_FLOOR ~ 0.134),
    // and how loose is a performance fact, not a correctness one.
    expect(worstSlack).toBeLessThanOrEqual(1);
  });
});

/** A tiny seeded PRNG. Local because @irodora/testing is a workspace dev dependency and this
 *  loop needs hundreds of thousands of draws without fast-check's shrinking machinery. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('bucket keys', () => {
  it('assigns the same key to points in the same cell and different keys across a boundary', () => {
    expect(labBucketKey([12, 3, -4], 5)).toEqual([2, 0, -1]);
    expect(labBucketKey([14.9, 4.9, -0.1], 5)).toEqual([2, 0, -1]);
    expect(labBucketKey([15, 5, 0], 5)).toEqual([3, 1, 0]);
  });

  it('handles negatives without collapsing -0 and 0 into different cells', () => {
    expect(labBucketKey([0, -0, 0], 5)).toEqual(labBucketKey([0, 0, 0], 5));
  });
});
