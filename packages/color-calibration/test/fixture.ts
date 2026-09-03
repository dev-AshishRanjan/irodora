/**
 * A **constructed** reference card. Every number here was invented for this test file.
 *
 * ## It is not a real card, and that is deliberate
 *
 * [ADR-0085](../../../docs/adr/0085-the-reference-card-is-a-partner-card-and-its-values-are-cited-not-measured.md)
 * obligation 2: *the exact card, its published values and their licence must be confirmed from
 * the vendor's own documentation before any value is committed.* That has not happened, and
 * writing plausible ColorChecker values from memory into a file called `fixture.ts` would be
 * fabricated provenance wearing a test's clothes — the numbers would leak into a snapshot, a
 * doc example, and eventually a claim.
 *
 * ## Constructed is also the STRONGER fixture here
 *
 * A real card's published values would let a test assert that the solver produces *some*
 * matrix. A constructed reference plus a **known** distortion has an exactly known answer:
 * the correction must be the distortion's inverse, to machine precision, and any deviation is
 * a defect rather than a tolerance to widen. That is
 * [ADR-0081](../../../docs/adr/0081-the-pattern-corpus-is-constructed-so-its-ground-truth-is-exact.md)'s
 * argument applied one package over.
 *
 * The provenance strings say so in words a reader cannot mistake for a citation.
 */

import { CANONICAL_WHITE, displayP3ToXyz, srgbToXyz, type Triple } from '@irodora/color-spaces';

import type { ReferenceCard, ReferencePatch } from '../src/card.js';

const COLUMNS = 6;
const ROWS = 4;

/**
 * Twenty-four sRGB values spanning the cube, plus a neutral ramp on the last row.
 *
 * Chosen for numerical spread rather than realism: the fit needs observations that span three
 * dimensions, and a set clustered near grey would make every test pass for the wrong reason.
 */
const SWATCHES: readonly Triple[] = [
  [0.75, 0.28, 0.24],
  [0.28, 0.55, 0.78],
  [0.32, 0.66, 0.36],
  [0.86, 0.72, 0.22],
  [0.55, 0.31, 0.62],
  [0.24, 0.62, 0.68],

  [0.9, 0.48, 0.18],
  [0.2, 0.34, 0.7],
  [0.8, 0.35, 0.45],
  [0.4, 0.22, 0.5],
  [0.66, 0.78, 0.24],
  [0.92, 0.62, 0.2],

  [0.15, 0.25, 0.6],
  [0.28, 0.58, 0.32],
  [0.7, 0.2, 0.24],
  [0.94, 0.82, 0.18],
  [0.72, 0.3, 0.58],
  [0.16, 0.5, 0.62],

  [0.96, 0.96, 0.95],
  [0.79, 0.79, 0.78],
  [0.62, 0.62, 0.61],
  [0.45, 0.45, 0.44],
  [0.28, 0.28, 0.28],
  [0.12, 0.12, 0.12],
];

const patches: readonly ReferencePatch[] = SWATCHES.map((rgb, index) => ({
  id: `p${String(index).padStart(2, '0')}`,
  xyz: srgbToXyz(rgb),
  at: [index % COLUMNS, Math.floor(index / COLUMNS)] as const,
}));

/** The constructed card. Its provenance says what it is, in the field a citation would go in. */
export const CONSTRUCTED_CARD: ReferenceCard = {
  id: 'constructed-24',
  columns: COLUMNS,
  rows: ROWS,
  patches,
  white: CANONICAL_WHITE,
  inset: 0.25,
  provenance: {
    source: 'Constructed for tests. NOT a published card and NOT a measurement.',
    publisher: 'Irodora test fixture',
    illuminant: 'D65',
    observer: '2deg',
    licence: 'Not applicable — these values are invented, not licensed.',
  },
};

/** The same card with only `count` patches, for the minimum-patch cases. */
export function truncated(count: number): ReferenceCard {
  return { ...CONSTRUCTED_CARD, patches: CONSTRUCTED_CARD.patches.slice(0, count) };
}

const provenance = CONSTRUCTED_CARD.provenance;

/**
 * A card that reaches the places `SWATCHES` never does.
 *
 * Review found the original fixture's darkest encoded component was **0.12** against an sRGB
 * breakpoint of **0.04045**, and its darkest Y was **0.0134** against a Lab ε of **0.008856**.
 * So the suite exercised neither the transfer function's linear segment nor Lab's κ branch —
 * in a package whose central claim is about behaviour *in the darks*.
 *
 * Four of these eight sit below the breakpoint and three below ε. Constructed, like everything
 * else here, and asymmetric in luminance so `assertCard` admits it.
 */
export const NEAR_BLACK_CARD: ReferenceCard = {
  id: 'constructed-near-black-8',
  columns: 4,
  rows: 2,
  white: CANONICAL_WHITE,
  inset: 0.25,
  provenance,
  patches: [0.004, 0.012, 0.02, 0.035, 0.06, 0.1, 0.18, 0.5].map((value, index) => ({
    id: `d${String(index)}`,
    xyz: srgbToXyz([value, value * 0.92, value * 1.05]),
    at: [index % 4, Math.floor(index / 4)] as const,
  })),
};

/**
 * A card whose published values fall OUTSIDE the sRGB gamut.
 *
 * Every patch in `SWATCHES` is `srgbToXyz(rgb)` with `rgb ∈ [0,1]³`, so `xyzToLinearSrgb` never
 * returns a negative component and the fit never had an out-of-gamut TARGET. A real
 * ColorChecker's cyan, blue and orange are outside sRGB, so this is the ordinary case rather
 * than an exotic one — and `solve.test.ts`'s existing out-of-gamut case only covers an
 * out-of-gamut *input*.
 *
 * Built through Display P3, which is a real space rather than an invented set of numbers.
 */
export const WIDE_GAMUT_CARD: ReferenceCard = {
  id: 'constructed-wide-gamut-8',
  columns: 4,
  rows: 2,
  white: CANONICAL_WHITE,
  inset: 0.25,
  provenance,
  patches: (
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0.85, 0.2, 0.1],
      [0.1, 0.7, 0.35],
      [0.6, 0.6, 0.6],
      [0.25, 0.25, 0.3],
    ] as const
  ).map((rgb, index) => ({
    id: `w${String(index)}`,
    xyz: displayP3ToXyz(rgb),
    at: [index % 4, Math.floor(index / 4)] as const,
  })),
};
