/**
 * Gate 5 — the CVD models against what can actually check them.
 *
 * Two things this file is careful about, both learned the hard way in F-006 and F-007:
 *
 * 1. **culori is the transcription source for 30 of the 33 Machado matrices**, so asserting
 *    that ours match culori's would be comparing a value against a copy of itself. The oracle
 *    block below still runs — because it checks the *application* of the matrices, the
 *    encoded-not-linear question, and the argument order — but it is not evidence that the
 *    numbers are right. The evidence for that is the three independently-reproduced
 *    severity-1.0 matrices and the luminance-preservation property.
 * 2. **culori's severity interpolation is dead code**, so the oracle is consulted only at the
 *    eleven tabulated severities. Comparing anywhere else would assert its bug.
 */

import { describe, expect, it } from 'vitest';
import { filterDeficiencyProt, filterDeficiencyDeuter, filterDeficiencyTrit } from 'culori';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/cvd.golden.json' with { type: 'json' };
import {
  COPUNCTAL_POINTS,
  LMS_TO_XYZ_HPE,
  MACHADO_STEPS,
  MACHADO_TABLES,
  simulateAnomalous,
  simulateDichromacy,
  VIENOT_1999,
  type Deficiency,
} from '../../src/index.js';
import {
  linearSrgbToSrgb,
  srgbToLinearSrgb,
  srgbToXyz,
  xyzToLab,
  type Matrix3,
  type Rgb,
} from '@irodora/color-spaces';
import { deltaE00 } from '@irodora/color-difference';

const dataset = assertGoldenDataset(raw, 'cvd');
const entry = (id: string): (typeof dataset.entries)[number] => {
  const found = dataset.entries.find((e) => e.id === id);
  if (!found) throw new Error(`golden entry "${id}" is missing`);
  return found;
};

const matrix = (value: unknown): Matrix3 => {
  if (!Array.isArray(value) || value.length !== 9) throw new Error('not a 3x3 matrix');
  return value as unknown as Matrix3;
};

const lab = (rgb: Rgb): readonly [number, number, number] => xyzToLab(srgbToXyz(rgb));

const DEFICIENCIES: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];

describe('the Machado tables', () => {
  it('severity 0 is exactly the identity in all three', () => {
    const identity = matrix(entry('machado-severity-zero-is-the-identity').expected);
    for (const deficiency of DEFICIENCIES) {
      const first = MACHADO_TABLES[deficiency][0]!;
      for (let i = 0; i < 9; i++) expect(first[i], `${deficiency}[0][${String(i)}]`).toBe(identity[i]);
    }
  });

  for (const deficiency of DEFICIENCIES)
    it(`${deficiency} at severity 1 matches the independently reproduced matrix`, () => {
      // The only entries here whose numbers are NOT sourced from culori. They were written
      // from memory before the tables were transcribed, and matched all 27.
      const published = matrix(entry(`machado-${deficiency}-severity-one`).expected);
      const stored = MACHADO_TABLES[deficiency][MACHADO_STEPS - 1]!;
      for (let i = 0; i < 9; i++) expect(stored[i], `${deficiency}[10][${String(i)}]`).toBe(published[i]);
    });

  it('every row of every matrix sums to 1 — the transforms preserve luminance', () => {
    // 99 rows. A mistyped digit almost anywhere breaks this, which is what makes it the
    // strongest check available on the thirty matrices that came from culori.
    const tolerance = entry('machado-rows-preserve-luminance').tolerance;
    for (const deficiency of DEFICIENCIES)
      for (const [step, m] of MACHADO_TABLES[deficiency].entries())
        for (let row = 0; row < 3; row++) {
          const sum = m[row * 3]! + m[row * 3 + 1]! + m[row * 3 + 2]!;
          expect(Math.abs(sum - 1), `${deficiency} step ${String(step)} row ${String(row)}`).toBeLessThanOrEqual(
            tolerance,
          );
        }
  });

  it('has 11 severities per deficiency', () => {
    for (const deficiency of DEFICIENCIES)
      expect(MACHADO_TABLES[deficiency]).toHaveLength(MACHADO_STEPS);
  });
});

describe('severity is continuous here, and is not in culori', () => {
  const filters = {
    protan: filterDeficiencyProt,
    deutan: filterDeficiencyDeuter,
    tritan: filterDeficiencyTrit,
  };

  const samples: readonly Rgb[] = [
    [0.8, 0.4, 0.2],
    [0.2, 0.6, 0.9],
    [0.5, 0.5, 0.5],
    [0.1, 0.9, 0.3],
  ];

  it('agrees with culori at all 11 TABULATED severities, to float64 rounding', () => {
    let worst = 0;
    for (const deficiency of DEFICIENCIES)
      for (let step = 0; step < MACHADO_STEPS; step++) {
        const severity = step / 10;
        const oracle = filters[deficiency](severity);
        for (const rgb of samples) {
          const ours = simulateAnomalous(rgb, deficiency, severity);
          const theirs = oracle({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });
          worst = Math.max(
            worst,
            Math.abs(ours[0] - theirs.r),
            Math.abs(ours[1] - theirs.g),
            Math.abs(ours[2] - theirs.b),
          );
        }
      }
    expect(worst).toBeLessThan(1e-15);
  });

  it('and DISAGREES between them, because we interpolate and culori does not', () => {
    // Stated in the plan before it was run. culori computes its interpolation weight as
    // `Math.round(t % 0.1)`, which is always 0, so it snaps to the nearest tabulated step.
    // Acceptance criterion 1 requires continuous severity, so this disagreement is ours
    // being right — and asserting it here stops it being rediscovered as a defect.
    const rgb: Rgb = [0.8, 0.4, 0.2];
    const ours = simulateAnomalous(rgb, 'deutan', 0.15);
    const theirs = filterDeficiencyDeuter(0.15)({ mode: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] });

    expect(Math.abs(ours[0] - theirs.r)).toBeGreaterThan(1e-3);

    // Ours sits strictly between the two tabulated neighbours; culori's equals one of them.
    const lower = simulateAnomalous(rgb, 'deutan', 0.1)[0];
    const upper = simulateAnomalous(rgb, 'deutan', 0.2)[0];
    expect(ours[0]).toBeLessThan(lower);
    expect(ours[0]).toBeGreaterThan(upper);
    expect(theirs.r).toBe(lower);
  });

  it('interpolates monotonically across the whole range', () => {
    const rgb: Rgb = [0.8, 0.4, 0.2];
    let previous = simulateAnomalous(rgb, 'deutan', 0)[0];
    for (let i = 1; i <= 100; i++) {
      const current = simulateAnomalous(rgb, 'deutan', i / 100)[0];
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });
});

describe('the Viénot projections', () => {
  for (const deficiency of ['protan', 'deutan'] as const)
    it(`${deficiency} matches the published matrix digit for digit`, () => {
      const published = matrix(entry(`vienot-1999-${deficiency}`).expected);
      const stored = VIENOT_1999[deficiency]!;
      for (let i = 0; i < 9; i++) expect(stored[i], `element ${String(i)}`).toBe(published[i]);
    });

  it('the first two rows are identical — it is a projection, not a distortion', () => {
    for (const deficiency of ['protan', 'deutan'] as const) {
      const m = VIENOT_1999[deficiency]!;
      expect([m[0], m[1], m[2]]).toEqual([m[3], m[4], m[5]]);
    }
  });

  it('tritan is deliberately absent and throws rather than answering', () => {
    // Viénot's single-plane simplification is not accurate for tritanopia. Returning it
    // anyway would feed the separation score and produce an accessibility claim nobody
    // could trace.
    expect(() => simulateDichromacy([0.5, 0.5, 0.5], 'tritan')).toThrow(/two-half-plane/);
    expect(VIENOT_1999.tritan).toBeUndefined();
  });
});

describe('acceptance criterion 2 — a confusion-line pair collapses', () => {
  /** Offset a colour along the kernel of the published projection, in linear light. */
  const alongConfusionLine = (base: Rgb, kernel: readonly number[], t: number): Rgb => {
    const linear = srgbToLinearSrgb(base);
    return linearSrgbToSrgb([
      linear[0] + kernel[0]! * t,
      linear[1] + kernel[1]! * t,
      linear[2] + kernel[2]! * t,
    ]);
  };

  const KERNELS: Record<'protan' | 'deutan', readonly number[]> = {
    protan: [0.88762, -0.11238, 0],
    deutan: [0.70725, -0.29275, 0],
  };

  for (const deficiency of ['protan', 'deutan'] as const)
    it(`${deficiency}: far apart before, under ΔE00 2 after`, () => {
      const golden = entry(`confusion-line-collapses-${deficiency}`);
      const input = golden.input as { base: number[]; t: number };
      const expected = golden.expected as { before: number; after: number; ceiling: number };

      const base = input.base as unknown as Rgb;
      const other = alongConfusionLine(base, KERNELS[deficiency], input.t);

      const before = deltaE00(lab(base), lab(other));
      const after = deltaE00(
        lab(simulateDichromacy(base, deficiency)),
        lab(simulateDichromacy(other, deficiency)),
      );

      expect(Math.abs(before - expected.before)).toBeLessThanOrEqual(golden.tolerance);
      expect(Math.abs(after - expected.after)).toBeLessThanOrEqual(golden.tolerance);

      // The criterion.
      expect(after).toBeLessThan(expected.ceiling);
      // And the half that stops a constant-returning simulation from passing.
      expect(before).toBeGreaterThan(10);
    });

  it('a simulation returning a CONSTANT would pass the collapse and fail the other half', () => {
    // The decoy. Without the "far apart before" assertion, `() => [0.5, 0.5, 0.5]` is a
    // perfect CVD simulation by the collapse test alone.
    const constant = (): Rgb => [0.5, 0.5, 0.5];
    const a: Rgb = [0.9, 0.1, 0.1];
    const b: Rgb = [0.1, 0.1, 0.9];

    expect(deltaE00(lab(constant()), lab(constant()))).toBe(0);
    expect(deltaE00(lab(a), lab(b))).toBeGreaterThan(10);
  });

  it('an IDENTITY simulation fails the collapse', () => {
    const base: Rgb = [0.45, 0.45, 0.3];
    const other = alongConfusionLine(base, KERNELS.protan, 0.15);
    expect(deltaE00(lab(base), lab(other))).toBeGreaterThan(2);
  });
});

describe('a finding, recorded rather than hidden', () => {
  it('the published copunctal points do not belong to the Viénot matrices', () => {
    // Constructing a confusion pair from the classic published copunctal points and
    // simulating with Viénot's matrices leaves ~5 ΔE00 — a tenfold collapse, but not the
    // under-2 the criterion asks for. The copunctal points and these matrices come from
    // different cone fundamentals. Recorded so nobody re-derives the 5 and concludes the
    // simulation is broken.
    const golden = entry('published-copunctal-points-do-not-belong-to-these-matrices');
    const expected = golden.expected as { approximateResidual: number };

    const [cx, cy] = COPUNCTAL_POINTS.protan;
    const xyYToSrgb = (x: number, y: number, luminance: number): Rgb => {
      const bigX = (x * luminance) / y;
      const bigZ = ((1 - x - y) * luminance) / y;
      const linear = [
        3.2409699419045226 * bigX - 1.537383177570094 * luminance - 0.4986107602930034 * bigZ,
        -0.9692436362808796 * bigX + 1.8759675015077202 * luminance + 0.04155505740717559 * bigZ,
        0.05563007969699366 * bigX - 0.20397695888897652 * luminance + 1.0569715142428786 * bigZ,
      ];
      return linearSrgbToSrgb(linear as unknown as Rgb);
    };

    const towards = (t: number): readonly [number, number] => [
      cx + (0.3 - cx) * t,
      cy + (0.32 - cy) * t,
    ];
    const [x1, y1] = towards(0.85);
    const [x2, y2] = towards(1.15);
    const a = xyYToSrgb(x1, y1, 0.25);
    const b = xyYToSrgb(x2, y2, 0.25);

    const after = deltaE00(lab(simulateDichromacy(a, 'protan')), lab(simulateDichromacy(b, 'protan')));

    expect(Math.abs(after - expected.approximateResidual)).toBeLessThanOrEqual(golden.tolerance);
    // Still a large collapse — the model is working, the two sources just do not match.
    expect(deltaE00(lab(a), lab(b))).toBeGreaterThan(after * 5);
  });
});

describe('which cone fundamentals — the answer the outstanding work needs', () => {
  it('HPE reproduces the tritan copunctal point and misses protan and deutan', () => {
    // A copunctal point IS the chromaticity of the missing cone's fundamental, so it is
    // derivable from column k of LMS -> XYZ. This is what identifies the fundamental set a
    // published confusion point belongs to — and it is why the two-half-plane Brettel
    // construction still owed for tritan needs Smith-Pokorny rather than this matrix.
    const golden = entry('hpe-does-not-reproduce-the-published-copunctal-points');
    const expected = golden.expected as Record<string, readonly number[]>;

    const column = (k: number): readonly [number, number, number] => [
      LMS_TO_XYZ_HPE[k]!,
      LMS_TO_XYZ_HPE[3 + k]!,
      LMS_TO_XYZ_HPE[6 + k]!,
    ];
    const chromaticity = ([x, y, z]: readonly [number, number, number]): readonly [number, number] => {
      const sum = x + y + z;
      return [x / sum, y / sum];
    };

    const keys: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];
    for (const [k, key] of keys.entries()) {
      const [x, y] = chromaticity(column(k));
      expect(Math.abs(x - expected[key]![0]!), key + ' x').toBeLessThanOrEqual(golden.tolerance);
      expect(Math.abs(y - expected[key]![1]!), key + ' y').toBeLessThanOrEqual(golden.tolerance);
    }

    // The conclusion, asserted rather than left in a comment: tritan agrees, the others do not.
    const [tx, ty] = chromaticity(column(2));
    expect(Math.hypot(tx - COPUNCTAL_POINTS.tritan[0], ty - COPUNCTAL_POINTS.tritan[1])).toBeLessThan(0.01);

    const [px, py] = chromaticity(column(0));
    expect(Math.hypot(px - COPUNCTAL_POINTS.protan[0], py - COPUNCTAL_POINTS.protan[1])).toBeGreaterThan(0.1);
  });
});
