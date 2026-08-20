/**
 * Illumination and capture quality — and, more importantly, what they REFUSE to claim.
 *
 * The failure to avoid is not a wrong classification. It is a confident one: a number that
 * says 0.95 beside a footnote saying "mixed lighting" gets read as 0.95, and the footnote is
 * not what anybody acts on (ADR-0031, NFR-21).
 */

import { describe, expect, it } from 'vitest';
import {
  assessIllumination,
  assessQuality,
  confidenceCeiling,
  ILLUMINATION_CEILING,
  QUALITY_THRESHOLDS,
  type Region,
  type Sample,
} from '../src/index.js';

const px = (r: number, g: number, b: number, alpha = 1): Sample => ({ r, g, b, alpha });

/** A region of fabric with real texture, so sharpness is not zero by construction. */
function textured(width: number, height: number, base: Sample): Region {
  const samples: Sample[] = [];
  for (let row = 0; row < height; row += 1)
    for (let col = 0; col < width; col += 1) {
      const t = ((row + col) % 2 === 0 ? 1 : -1) * 0.03;
      samples.push(px(base.r + t, base.g + t, base.b + t));
    }
  return { samples, width, height };
}

const FABRIC = px(0.32, 0.42, 0.43);

describe('illumination is read from the highlights, not the fabric', () => {
  const withHighlights = (highlight: Sample, count: number): Sample[] => [
    ...Array.from({ length: 200 }, () => FABRIC),
    ...Array.from({ length: count }, () => highlight),
  ];

  it('says UNKNOWN when there are too few highlights, rather than guessing', () => {
    // The honest answer. You cannot separate the illuminant from the material by looking at
    // the material — a blue garment under white light and a white garment under blue light
    // are the same pixels.
    const samples = withHighlights(px(0.99, 0.99, 0.99), 2);
    const a = assessIllumination(samples);
    expect(a.kind).toBe('unknown');
    // And 'unknown' must NOT read as fine.
    expect(a.confidenceCeiling).toBeLessThan(ILLUMINATION_CEILING.daylight);
  });

  it('reads a warm highlight as warm indoor, and a blue-weighted one as daylight', () => {
    // Two cases in one test on purpose: a classifier that always returned one answer would
    // pass either alone.
    const warm = withHighlights(px(1, 0.93, 0.82), 20);
    const cool = withHighlights(px(0.9, 0.96, 1), 20);
    expect(assessIllumination(warm).kind).toBe('warm-indoor');
    expect(assessIllumination(cool).kind).toBe('daylight');
  });

  it('detects MIXED light from highlights that disagree with each other', () => {
    const samples = [
      ...Array.from({ length: 200 }, () => FABRIC),
      ...Array.from({ length: 10 }, () => px(1, 0.9, 0.78)),
      ...Array.from({ length: 10 }, () => px(0.93, 0.97, 1)),
    ];
    const a = assessIllumination(samples);
    expect(a.kind).toBe('mixed');
    expect(a.confidenceCeiling).toBeLessThanOrEqual(0.5);
    expect(a.reason).toMatch(/more than one light source/u);
  });

  it('calls a dark scene LOW LIGHT before anything else', () => {
    // Low light dominates: a hue read from sensor noise is not a hue, so it must not be
    // classified as "warm" merely because the noise leaned red.
    const dark = Array.from({ length: 200 }, () => px(0.05, 0.05, 0.05));
    const a = assessIllumination(dark);
    expect(a.kind).toBe('low-light');
    expect(a.reason).toMatch(/add light/u);
  });

  it('every classification carries a ceiling, and only daylight reaches 1', () => {
    expect(ILLUMINATION_CEILING.daylight).toBe(1);
    for (const [kind, ceiling] of Object.entries(ILLUMINATION_CEILING))
      if (kind !== 'daylight') expect(ceiling, kind).toBeLessThan(1);
  });
});

describe('quality blocks a claim rather than decorating one', () => {
  it('rates a large, sharp, evenly lit region excellent', () => {
    const region = textured(40, 40, FABRIC);
    const a = assessQuality(region);
    expect(a.metrics.usableSamples).toBeGreaterThanOrEqual(QUALITY_THRESHOLDS.minSamples);
    expect(a.quality).toBe('excellent');
    expect(a.instruction).toBe('');
    expect(a.confidenceCeiling).toBe(1);
  });

  it('names the FIRST thing to fix, not the worst number', () => {
    // An instruction naming the second-most-important problem gets followed and does not help.
    const tiny = textured(10, 10, FABRIC);
    const a = assessQuality(tiny);
    expect(a.metrics.usableSamples).toBeLessThan(QUALITY_THRESHOLDS.minSamples);
    expect(a.instruction).toMatch(/move closer/u);
  });

  it('detects blur from the actual gradient, not from a parameter someone passed', () => {
    // A flat region has no gradient energy. Blur is SPATIAL, which is why the input carries
    // width and height — a function taking `blur` as an argument would be reporting a number
    // derived from nothing, and a caller that computed it wrongly would be invisible.
    const flat: Region = {
      samples: Array.from({ length: 1600 }, () => FABRIC),
      width: 40,
      height: 40,
    };
    const sharp = textured(40, 40, FABRIC);
    expect(assessQuality(flat).metrics.sharpness).toBeLessThan(
      assessQuality(sharp).metrics.sharpness,
    );
    expect(assessQuality(flat).instruction).toMatch(/focus|steadier/u);
  });

  it('detects uneven light across quadrants, not texture within them', () => {
    // Per-pixel variance cannot tell a shadow across the frame from a patterned fabric, and
    // only the first is a lighting problem.
    const width = 40;
    const height = 40;
    const samples: Sample[] = [];
    for (let row = 0; row < height; row += 1)
      for (let col = 0; col < width; col += 1) {
        const falloff = (col / width) * 0.35;
        const t = ((row + col) % 2 === 0 ? 1 : -1) * 0.03;
        samples.push(px(0.3 + falloff + t, 0.4 + falloff + t, 0.41 + falloff + t));
      }
    const uneven = assessQuality({ samples, width, height });
    const even = assessQuality(textured(40, 40, FABRIC));
    expect(uneven.metrics.unevenness).toBeGreaterThan(even.metrics.unevenness);
  });

  it('rates a region that fails three ways POOR, and caps confidence hard', () => {
    // Blown out, small, and featureless: every pixel clips, every pixel is rejected, and
    // there is no gradient. Three failures, which is what makes it poor rather than fair.
    const bad: Region = {
      samples: Array.from({ length: 400 }, () => px(1, 1, 1)),
      width: 20,
      height: 20,
    };
    const a = assessQuality(bad);
    expect(a.quality).toBe('poor');
    expect(a.confidenceCeiling).toBeLessThanOrEqual(0.3);
    expect(a.instruction.length).toBeGreaterThan(0);
  });
});

describe('the two ceilings combine as a minimum', () => {
  it('takes the lower, never a product', () => {
    // A capture that is excellent under mixed light is still under mixed light. Multiplying
    // would produce a number lower than either, which is not what either assessment said.
    expect(confidenceCeiling(0.5, 1)).toBe(0.5);
    expect(confidenceCeiling(1, 0.3)).toBe(0.3);
    expect(confidenceCeiling(0.5, 0.9)).toBe(0.5);
    expect(confidenceCeiling(0.5, 0.9)).not.toBeCloseTo(0.45, 5);
  });
});
