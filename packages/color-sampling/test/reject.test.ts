/**
 * The rejection rules, each proven by the pixel it rejects.
 *
 * A rule that removes pixels which made no difference is untested however green it looks, so
 * every case here asserts that the rejected pixel WOULD HAVE CHANGED THE ANSWER
 * [[a-decoy-that-is-not-broken-proves-nothing]]. The decoy is the pixel itself.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  aggregate,
  linearLuminance,
  partition,
  type Sample,
} from '../src/index.js';

const px = (r: number, g: number, b: number, alpha = 1): Sample => ({ r, g, b, alpha });

/** A plausible mid-tone fabric region: one colour, slight sensor noise. */
const fabric = (n: number): Sample[] =>
  Array.from({ length: n }, (_, i) => {
    const jitter = ((i % 7) - 3) * 0.002;
    return px(0.32 + jitter, 0.42 + jitter, 0.43 + jitter);
  });

const reasons = (samples: readonly Sample[]): string[] =>
  partition(samples).rejected.map((r) => r.reason);

describe('each rule rejects, and the rejected pixel mattered', () => {
  it('rejects a specular highlight — and keeping it would have shifted the result', () => {
    const clean = fabric(100);
    const withGlare = [...clean, px(0.99, 0.99, 0.99)];

    expect(reasons(withGlare)).toEqual(['specular']);

    // THE HALF THAT MAKES THE RULE REAL. A highlight carries the ILLUMINANT's colour, not the
    // material's, so averaging it in pulls every reading toward the lamp.
    const kept = aggregate(partition(withGlare).kept).mean;
    const ifKept = aggregate(withGlare).mean;
    expect(linearLuminance(ifKept)).toBeGreaterThan(linearLuminance(kept));
  });

  it('rejects a deep shadow — and keeping it would have darkened the result', () => {
    const clean = fabric(100);
    const withShadow = [...clean, px(0.005, 0.005, 0.005)];

    expect(reasons(withShadow)).toEqual(['shadow']);

    const kept = aggregate(partition(withShadow).kept).mean;
    const ifKept = aggregate(withShadow).mean;
    expect(linearLuminance(ifKept)).toBeLessThan(linearLuminance(kept));
  });

  it('rejects a transparent pixel, and reports THAT rather than its brightness', () => {
    // A transparent pixel that is also dark must report 'transparent': that is the actionable
    // fact, and calling it a shadow would send someone looking for a lighting problem.
    const withHole = [...fabric(100), px(0.005, 0.005, 0.005, 0)];
    expect(reasons(withHole)).toEqual(['transparent']);
  });

  it('rejects background against the region MEDIAN, not an absolute cut', () => {
    // Fabric can legitimately be very dark or very light. An absolute cut would reject the
    // garment rather than the background whenever the garment was unusual.
    const darkFabric = Array.from({ length: 100 }, () => px(0.1, 0.1, 0.12));
    const onBrightWall = [...darkFabric, px(0.75, 0.75, 0.75)];

    expect(reasons(onBrightWall)).toEqual(['background']);
    // And the dark fabric itself is NOT rejected, which an absolute shadow cut would have done.
    expect(partition(darkFabric).rejected).toEqual([]);
  });

  it('keeps a clean region entirely — the baseline the four cases are measured against', () => {
    // Without this, every assertion above could pass on a rule that rejects everything.
    const clean = fabric(1000);
    const { kept, rejected } = partition(clean);
    expect(rejected).toEqual([]);
    expect(kept).toHaveLength(1000);
  });
});

describe('the statistics resist what the rules miss', () => {
  it('median is unmoved by an outlier that shifts the mean', () => {
    const region = [...fabric(99), px(0.5, 0.5, 0.5)];
    const a = aggregate(region);
    const clean = aggregate(fabric(99));
    // The outlier sits inside every rejection threshold, so it is KEPT — and the median is
    // what stops it mattering.
    expect(partition(region).rejected).toEqual([]);
    expect(a.median.r).toBeCloseTo(clean.median.r, 3);
    expect(a.mean.r).not.toBeCloseTo(clean.mean.r, 4);
  });

  it('variance separates one colour from two', () => {
    const oneColour = aggregate(fabric(200));
    const twoColours = aggregate([
      ...fabric(100),
      ...Array.from({ length: 100 }, () => px(0.8, 0.3, 0.3)),
    ]);
    expect(twoColours.variance).toBeGreaterThan(oneColour.variance * 10);
  });

  it('never returns black from an over-trimmed slice', () => {
    // `cut` can reach half the array at small counts, and a mean of an empty slice would
    // silently return 0 — a black colour, reported confidently.
    const tiny = aggregate([px(0.5, 0.5, 0.5), px(0.52, 0.52, 0.52)], 0.49);
    expect(tiny.trimmedMean.r).toBeGreaterThan(0.4);
  });

  it('an empty region reports a count of zero rather than a colour', () => {
    expect(aggregate([]).count).toBe(0);
  });
});

describe('the thresholds are declared data, not buried numbers', () => {
  it('states every cut point it uses', () => {
    // NFR-2: no number without a row behind it. These are stated CONVENTIONS until F-063
    // produces measured rows, and being data is what makes that swap a value change.
    expect(Object.keys(DEFAULT_THRESHOLDS).sort()).toEqual([
      'backgroundLuminanceDistance',
      'minAlpha',
      'shadowLuminance',
      'specularLuminance',
    ]);
  });
});
