/**
 * The boundary decisions of calibrated mode (F-053, FR-16).
 *
 * The maths is `@irodora/color-calibration` and is tested there. What is asserted here is what
 * the APP is allowed to say: the provenance it writes, the confidence it does **not** raise
 * ([ADR-0087](../../../docs/adr/0087-a-calibrated-reading-does-not-get-a-higher-confidence-until-it-is-measured.md)),
 * and the two cases it refuses.
 */

import {
  linearSrgbToSrgb,
  srgbToXyz,
  xyzToLinearSrgb,
  CANONICAL_WHITE,
  type Triple,
} from '@irodora/color-spaces';
import {
  applyMatrix,
  solveCorrection,
  type Matrix3,
  type ReferenceCard,
} from '@irodora/color-calibration';
import { isCaptured } from '@irodora/color-core';

import { calibrate, observedSpace } from '../src/lens/calibration';
import type { LensReading } from '../src/lens/reading';

/** Constructed, not cited — the same reasoning as the engine package's fixture (ADR-0085). */
const SWATCHES: readonly Triple[] = [
  [0.75, 0.28, 0.24],
  [0.28, 0.55, 0.78],
  [0.32, 0.66, 0.36],
  [0.86, 0.72, 0.22],
  [0.55, 0.31, 0.62],
  [0.24, 0.62, 0.68],
  [0.9, 0.9, 0.89],
  [0.14, 0.14, 0.14],
];

const CARD: ReferenceCard = {
  id: 'constructed-8',
  columns: 4,
  rows: 2,
  white: CANONICAL_WHITE,
  inset: 0.25,
  patches: SWATCHES.map((rgb, index) => ({
    id: `p${String(index)}`,
    xyz: srgbToXyz(rgb),
    at: [index % 4, Math.floor(index / 4)] as const,
  })),
  provenance: {
    source: 'Constructed for tests. NOT a published card and NOT a measurement.',
    publisher: 'Irodora test fixture',
    illuminant: 'D65',
    observer: '2deg',
    licence: 'Not applicable — these values are invented, not licensed.',
  },
};

const DISTORTION: Matrix3 = [
  [0.88, 0.09, 0.03],
  [0.05, 0.93, 0.04],
  [0.02, 0.07, 1.1],
];

function correctionFor(space: 'srgb' | 'display-p3' = 'srgb') {
  return solveCorrection(
    CARD.patches.map((patch) => ({
      id: patch.id,
      rgb: linearSrgbToSrgb(applyMatrix(DISTORTION, xyzToLinearSrgb(patch.xyz))),
    })),
    CARD,
    space,
  );
}

function reading(overrides: Partial<LensReading> = {}): LensReading {
  return {
    rgb: [0.42, 0.31, 0.27],
    space: 'srgb',
    usableSamples: 1400,
    variance: 0.004,
    illumination: 'daylight',
    quality: 'good',
    confidence: 0.71,
    instruction: '',
    ...overrides,
  };
}

describe('observedSpace', () => {
  it('names the two spaces a correction can be applied in, and refuses the third', () => {
    expect(observedSpace('srgb')).toBe('srgb');
    expect(observedSpace('display-p3')).toBe('display-p3');
    expect(observedSpace('unknown')).toBeNull();
  });
});

describe('calibrate', () => {
  it('labels the result `calibrated` and carries the conditions the source owes', () => {
    const result = calibrate(reading(), correctionFor());
    if (!result.ok) throw new Error(`refused: ${result.why}`);

    expect(result.color.provenance.source).toBe('calibrated');
    // `calibrated` is a CapturedSource, so ADR-0005 makes `conditions` structurally required.
    // Asserting through the narrowing helper rather than the field means this fails if the
    // source ever changes to one that does not owe them.
    expect(isCaptured(result.color.provenance)).toBe(true);
    if (!isCaptured(result.color.provenance)) throw new Error('unreachable');
    expect(result.color.provenance.conditions.illuminant).toBe('daylight');
    expect(result.color.provenance.conditions.sampleCount).toBe(1400);
  });

  it('DOES NOT raise the confidence — ADR-0087', () => {
    /*
     * The decoy for the claim this feature was most likely to make by accident. A correction
     * that is essentially perfect (residual near zero) is the strongest case for raising the
     * number, and it must still come out unchanged: the improvement is NFR-2, which is
     * attested and undischarged, and a confidence that rises because the code path changed is
     * a measurement nobody took.
     */
    const correction = correctionFor();
    expect(correction.after.mean).toBeLessThan(1e-9);

    for (const confidence of [0.2, 0.5, 0.71, 0.93]) {
      const result = calibrate(reading({ confidence }), correction);
      if (!result.ok) throw new Error(`refused: ${result.why}`);
      expect(result.color.provenance.confidence).toBe(confidence);
    }
  });

  it('records the origin space the correction actually produced', () => {
    const result = calibrate(reading(), correctionFor());
    if (!result.ok) throw new Error(`refused: ${result.why}`);
    expect(result.color.provenance.originSpace).toBe('linear-srgb');
  });

  it('refuses a camera that will not say which space it captures in', () => {
    const result = calibrate(reading({ space: 'unknown' }), correctionFor());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.why).toBe('unknownSpace');
    expect(result.instruction).toMatch(/uncalibrated/u);
  });

  it('refuses a correction solved in a different space from the reading', () => {
    const result = calibrate(reading({ space: 'display-p3' }), correctionFor('srgb'));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.why).toBe('spaceMismatch');
  });

  it('actually corrects — the corrected value differs from the uncorrected one', () => {
    // Without this the tests above would all pass for a `calibrate` that ignored the matrix.
    const result = calibrate(reading(), correctionFor());
    if (!result.ok) throw new Error(`refused: ${result.why}`);

    const uncorrected = srgbToXyz([0.42, 0.31, 0.27]);
    const moved = result.color.xyz.some(
      (component, index) => Math.abs(component - (uncorrected[index] ?? 0)) > 1e-4,
    );
    expect(moved).toBe(true);
  });
});
