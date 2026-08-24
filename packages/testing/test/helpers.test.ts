/**
 * The helpers everything else is measured with.
 *
 * These are tested first and tested hard, because a defect here is invisible in the worst
 * way: a PRNG that is not reproducible turns a red engine test into a flake, and a digest
 * that ignores the low bits reports cross-platform identity that was never checked. A tool
 * that cannot detect a fault is indistinguishable from a passing gate.
 */

import { describe, expect, it } from 'vitest';
import {
  assertGoldenDataset,
  createPrng,
  float64Digest,
  float64ToHex,
  ulpDistance,
  hexToFloat64,
  sampleSrgb,
} from '../src/index.js';

describe('createPrng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createPrng('irodora/f-006');
    const b = createPrng('irodora/f-006');
    const first = Array.from({ length: 64 }, () => a.next());
    const second = Array.from({ length: 64 }, () => b.next());
    expect(first).toEqual(second);
  });

  it('produces a different sequence for a different seed', () => {
    const a = createPrng('seed-a');
    const b = createPrng('seed-b');
    expect(Array.from({ length: 16 }, () => a.next())).not.toEqual(
      Array.from({ length: 16 }, () => b.next()),
    );
  });

  it('stays inside [0, 1)', () => {
    const prng = createPrng('bounds');
    for (let i = 0; i < 100_000; i++) {
      const v = prng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not collapse — 100k draws fill every decile', () => {
    const prng = createPrng('distribution');
    const deciles = new Array<number>(10).fill(0);
    for (let i = 0; i < 100_000; i++) {
      const decile = Math.floor(prng.next() * 10);
      deciles[decile] = (deciles[decile] ?? 0) + 1;
    }
    for (const count of deciles) expect(count).toBeGreaterThan(5_000);
  });
});

describe('sampleSrgb', () => {
  it('is reproducible and stays in gamut', () => {
    const a = sampleSrgb('irodora/f-006', 1_000);
    const b = sampleSrgb('irodora/f-006', 1_000);
    expect(a).toEqual(b);
    for (const { rgb } of a)
      for (const component of rgb) {
        expect(component).toBeGreaterThanOrEqual(0);
        expect(component).toBeLessThanOrEqual(1);
      }
  });

  it('puts a quarter of its samples below the transfer function cutoff', () => {
    // The point of the stratification. A uniform sample of the cube would put roughly 0.02%
    // of its points here, which is why a pure-power implementation survives a uniform test.
    const samples = sampleSrgb('cutoff', 4_000);
    const nearBlack = samples.filter((s) => s.stratum === 'near-black');
    expect(nearBlack).toHaveLength(1_000);
    for (const { rgb } of nearBlack) for (const c of rgb) expect(c).toBeLessThanOrEqual(0.05);

    const belowCutoff = nearBlack.filter((s) => s.rgb.every((c) => c <= 0.04045));
    expect(belowCutoff.length).toBeGreaterThan(300);
  });

  it('covers all four strata in a fixed proportion', () => {
    const counts = new Map<string, number>();
    for (const s of sampleSrgb('strata', 10_000))
      counts.set(s.stratum, (counts.get(s.stratum) ?? 0) + 1);
    expect([...counts.values()]).toEqual([2_500, 2_500, 2_500, 2_500]);
  });
});

describe('float64ToHex', () => {
  it('round-trips every value it is given', () => {
    const values = [0, 1, -1, 0.1, Math.PI, 1e-300, 1e300, Number.MIN_VALUE, Number.MAX_VALUE];
    for (const v of values) expect(hexToFloat64(float64ToHex(v))).toBe(v);
  });

  it('distinguishes -0 from 0', () => {
    // A numeric comparison calls these equal. On a platform difference they are not, and the
    // sign of zero propagates into a hue angle.
    expect(float64ToHex(-0)).not.toBe(float64ToHex(0));
    expect(Object.is(hexToFloat64(float64ToHex(-0)), -0)).toBe(true);
  });

  it('distinguishes values that differ by one ulp', () => {
    const a = 0.1;
    const b = a + Number.EPSILON * 0.1;
    expect(a).not.toBe(b);
    expect(float64ToHex(a)).not.toBe(float64ToHex(b));
  });
});

describe('float64Digest', () => {
  it('is stable for the same input', () => {
    const values = Array.from({ length: 1_000 }, (_, i) => Math.sin(i));
    expect(float64Digest(values)).toBe(float64Digest(values));
  });

  it('changes when a single bit of a single value changes', () => {
    // The decoy: the digest must be able to fail. A hash over rounded values would not.
    const values = Array.from({ length: 10_000 }, (_, i) => i / 10_000);
    const mutated = [...values];
    mutated[7_777] = mutated[7_777]! + Number.EPSILON * 0.5;
    expect(float64Digest(mutated)).not.toBe(float64Digest(values));
  });

  it('changes when two values are swapped', () => {
    const values = [1, 2, 3, 4];
    expect(float64Digest([1, 2, 4, 3])).not.toBe(float64Digest(values));
  });

  it('is 16 hex digits', () => {
    expect(float64Digest([1])).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('assertGoldenDataset', () => {
  interface RawEntry {
    id: string;
    source: string;
    derivation: string;
    derivationNote?: string;
    input: unknown;
    expected: unknown;
    tolerance: number;
  }
  interface RawDataset {
    id: string;
    description: string;
    entries: RawEntry[];
  }

  // A local clone rather than `structuredClone`: this package must stay loadable in every
  // runtime the identity check targets, and a global that exists in Node and the browser but
  // not necessarily on Hermes is exactly the kind of assumption NFR-3 is about.
  const fresh = (): RawDataset => ({
    id: 'example',
    description: 'A dataset used only to test the validator.',
    entries: [
      {
        id: 'e1',
        source: 'IEC 61966-2-1:1999',
        derivation: 'definitional',
        input: [1, 1, 1],
        expected: [1, 1, 1],
        tolerance: 0,
      },
    ],
  });

  it('accepts a complete dataset', () => {
    expect(assertGoldenDataset(fresh(), 'example').entries).toHaveLength(1);
  });

  // Each of these is a decoy: a real dataset with one real defect. An empty fixture would
  // pass the validator whether or not it works.
  it('rejects an entry with no source', () => {
    const d = fresh();
    d.entries[0]!.source = '';
    expect(() => assertGoldenDataset(d, 'example')).toThrow(/cites no source/);
  });

  it('rejects an unknown derivation', () => {
    const d = fresh();
    d.entries[0]!.derivation = 'looked-right';
    expect(() => assertGoldenDataset(d, 'example')).toThrow(/derivation/);
  });

  it('rejects a formula-derived entry that does not show its arithmetic', () => {
    const d = fresh();
    d.entries[0]!.derivation = 'published-formula';
    expect(() => assertGoldenDataset(d, 'example')).toThrow(/does not show the arithmetic/);
  });

  it('rejects an empty entry list', () => {
    const d: RawDataset = { ...fresh(), entries: [] };
    expect(() => assertGoldenDataset(d, 'example')).toThrow(/no entries/);
  });

  it('rejects duplicate entry ids', () => {
    const d = fresh();
    d.entries.push({ ...d.entries[0]! });
    expect(() => assertGoldenDataset(d, 'example')).toThrow(/two entries/);
  });

  it('rejects a negative tolerance', () => {
    const d = fresh();
    d.entries[0]!.tolerance = -1;
    expect(() => assertGoldenDataset(d, 'example')).toThrow(/no tolerance/);
  });

  it('rejects a dataset loaded under the wrong id', () => {
    expect(() => assertGoldenDataset(fresh(), 'other')).toThrow(/declares id/);
  });
});

describe('ulpDistance', () => {
  it('is zero for identical values and one for adjacent ones', () => {
    expect(ulpDistance(1, 1)).toBe(0);
    expect(ulpDistance(1, 1 + Number.EPSILON)).toBe(1);
    expect(ulpDistance(0.1, 0.1 + Number.EPSILON / 8)).toBeGreaterThanOrEqual(0);
  });

  it('is symmetric', () => {
    const a = 0.214_041_140_482_232_55;
    const b = a * (1 + Number.EPSILON);
    expect(ulpDistance(a, b)).toBe(ulpDistance(b, a));
  });

  it('counts across zero rather than treating the sign as a jump', () => {
    // The smallest positive and the smallest negative subnormal are three steps apart:
    // -min, -0, +0, +min. If this ever returns something enormous, the negative branch is
    // ordering backwards, which is the bug the reflection exists to prevent.
    expect(ulpDistance(Number.MIN_VALUE, -Number.MIN_VALUE)).toBe(3);
  });

  it('separates -0 from +0, because a sign flip across platforms is a real divergence', () => {
    expect(ulpDistance(0, -0)).toBe(1);
  });

  it('crosses a binade boundary without a discontinuity', () => {
    // 1 and the largest double below it are adjacent, even though the exponent changes.
    const justBelowOne = 1 - Number.EPSILON / 2;
    expect(ulpDistance(1, justBelowOne)).toBe(1);
  });

  it('handles subnormals, which are contiguous with the normals in this encoding', () => {
    expect(ulpDistance(Number.MIN_VALUE, Number.MIN_VALUE * 2)).toBe(1);
  });

  it('reports NaN and Infinity as NOT COMPARABLE rather than as a large number', () => {
    // Returning a big finite number would let a caller average it into a summary and report
    // a meaningless mean. These are not "far apart"; they are incomparable.
    expect(ulpDistance(Number.NaN, 1)).toBe(Number.POSITIVE_INFINITY);
    expect(ulpDistance(Number.POSITIVE_INFINITY, Number.MAX_VALUE)).toBe(Number.POSITIVE_INFINITY);
  });
});
