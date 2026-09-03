import { describe, expect, it } from 'vitest';
import {
  CANONICAL_WHITE,
  linearSrgbToSrgb,
  linearSrgbToXyz,
  xyzToLinearSrgb,
  type Triple,
} from '@irodora/color-spaces';

import {
  MAXIMUM_REQUIRED_CORRELATION,
  MINIMUM_VERIFIABLE_PATCHES,
  requiredCorrelation,
  spearman,
  verifyCard,
} from '../src/verify.js';
import type { ReferenceCard } from '../src/card.js';
import type { Observation } from '../src/solve.js';
import { CONSTRUCTED_CARD } from './fixture.js';

/** What a camera reports for the card: darker and warmer, but the ORDER is untouched. */
function asSeen(gain: Triple = [0.62, 0.58, 0.5]): Observation[] {
  return CONSTRUCTED_CARD.patches.map((patch) => {
    const linear = xyzToLinearSrgb(patch.xyz);
    return {
      id: patch.id,
      rgb: linearSrgbToSrgb([linear[0] * gain[0], linear[1] * gain[1], linear[2] * gain[2]]),
    };
  });
}

describe('the correlation floor', () => {
  it('is 3 standard deviations of the null distribution, capped', () => {
    // 24 patches: sd = 1/sqrt(23) = 0.2085, so 3 sd = 0.626.
    expect(requiredCorrelation(24)).toBeCloseTo(3 / Math.sqrt(23), 12);
    // Few patches means a noisier statistic, so the derived floor exceeds the cap and the cap
    // is what applies — the strict direction, which is the correct one.
    expect(requiredCorrelation(6)).toBe(MAXIMUM_REQUIRED_CORRELATION);
    expect(requiredCorrelation(1)).toBe(MAXIMUM_REQUIRED_CORRELATION);
  });
});

describe('spearman', () => {
  it('is 1 for an identical ordering and -1 for a reversed one', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 12);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 12);
  });

  it('averages tied ranks rather than depending on sort order', () => {
    // Two identical values must contribute the same rank whichever way the sort put them.
    expect(spearman([1, 1, 2, 3], [5, 5, 6, 7])).toBeCloseTo(1, 12);
  });

  it('is 0 when one side has no spread — no order, no evidence', () => {
    expect(spearman([1, 2, 3], [7, 7, 7])).toBe(0);
  });
});

describe('verifyCard', () => {
  it('accepts a card read through a strong colour cast, because it compares ORDER', () => {
    const verification = verifyCard(asSeen(), CONSTRUCTED_CARD, 'srgb');

    expect(verification.ok).toBe(true);
    expect(verification.orientation).toBe('upright');
    expect(verification.correlation).toBeGreaterThan(verification.required);
    expect(verification.instruction).toBe('');
  });

  it('survives a 10:1 per-channel gain, which is what the module claims and not a mild cast', () => {
    /*
     * [0.62, 0.58, 0.5] — the case above — has a max/min ratio of 1.24 and is mostly a common
     * scale factor, which rank correlation is invariant to EXACTLY. The interesting claim is
     * about per-channel gains, where the invariance is only approximate: luminance mixes
     * channels at 0.2126/0.7152/0.0722, so a white balance shift CAN reorder two chromatic
     * patches of similar Y. This is the case the doc's wording has to earn.
     */
    const verification = verifyCard(asSeen([3, 1, 0.3]), CONSTRUCTED_CARD, 'srgb');

    expect(verification.ok).toBe(true);
    expect(verification.orientation).toBe('upright');
    expect(verification.correlation).toBeGreaterThan(0.9);
  });

  it('is invariant EXACTLY to a common monotone map, which is the half that is guaranteed', () => {
    for (const scale of [0.25, 0.5, 2]) {
      const verification = verifyCard(asSeen([scale, scale, scale]), CONSTRUCTED_CARD, 'srgb');
      expect(verification.correlation).toBeCloseTo(1, 12);
    }
  });

  it('drops a duplicated patch rather than letting it inflate the correlation', () => {
    const seen = asSeen();
    const first = seen[0];
    if (first === undefined) throw new Error('no fixture');
    // A repeat adds a perfectly concordant pair. Counting it would raise ρ on evidence that
    // was already used — solveCorrection throws on this; a reporter has to not count it.
    const withDuplicate = verifyCard([...seen, first], CONSTRUCTED_CARD, 'srgb');
    expect(withDuplicate.correlation).toBeCloseTo(
      verifyCard(seen, CONSTRUCTED_CARD, 'srgb').correlation,
      12,
    );
  });

  it('drops a non-finite reading rather than deriving a number from garbage', () => {
    const seen = asSeen();
    const broken = seen.map((observation, index) =>
      index < 3 ? { id: observation.id, rgb: [Number.NaN, 0, 0] as Triple } : observation,
    );
    const verification = verifyCard(broken, CONSTRUCTED_CARD, 'srgb');

    // 21 usable patches, and the ordering of those is untouched — so this still verifies,
    // rather than producing a correlation computed from NaN that happens to fall below a floor.
    expect(verification.ok).toBe(true);
    expect(verification.correlation).toBeCloseTo(1, 12);
  });

  it('says the card is upside down rather than merely absent', () => {
    /*
     * The 180° case, built by giving each patch the reading its diagonally-opposite cell
     * should have had — which is exactly what a camera sees when the card is turned round.
     * A decoy rather than noise: it must NOT be reported as "absent", because the two need
     * different instructions and telling somebody to check for shadows is useless advice
     * when the fix is to turn the card over.
     */
    const seen = asSeen();
    const byCell = new Map(
      CONSTRUCTED_CARD.patches.map((patch, index) => [
        `${String(patch.at[0])},${String(patch.at[1])}`,
        seen[index],
      ]),
    );

    const rotated: Observation[] = CONSTRUCTED_CARD.patches.map((patch) => {
      const opposite = `${String(CONSTRUCTED_CARD.columns - 1 - patch.at[0])},${String(CONSTRUCTED_CARD.rows - 1 - patch.at[1])}`;
      return { id: patch.id, rgb: byCell.get(opposite)?.rgb ?? [0, 0, 0] };
    });

    const verification = verifyCard(rotated, CONSTRUCTED_CARD, 'srgb');
    expect(verification.ok).toBe(false);
    expect(verification.orientation).toBe('rotated');
    expect(verification.instruction).toMatch(/upside down/u);
  });

  it('refuses a frame that does not read like the card', () => {
    // A wall: near-uniform, with a little sensor noise. Not empty — an empty fixture would
    // prove nothing about a check whose whole job is to reject plausible-looking input.
    const wall: Observation[] = CONSTRUCTED_CARD.patches.map((patch, index) => ({
      id: patch.id,
      rgb: [0.55 + (index % 3) * 0.002, 0.54 + (index % 2) * 0.002, 0.52],
    }));

    const verification = verifyCard(wall, CONSTRUCTED_CARD, 'srgb');
    expect(verification.ok).toBe(false);
    expect(verification.orientation).toBe('unrecognised');
    expect(verification.instruction).toMatch(/shadow/u);
  });

  it('reports how many patches were read when too few were', () => {
    const verification = verifyCard(
      asSeen().slice(0, MINIMUM_VERIFIABLE_PATCHES - 1),
      CONSTRUCTED_CARD,
      'srgb',
    );

    expect(verification.ok).toBe(false);
    expect(verification.orientation).toBe('unrecognised');
    expect(verification.instruction).toMatch(/inside the guide/u);
  });

  it('prefers the ROTATED reading when it fits better, even though upright also clears', () => {
    /*
     * A1, found in review, and this is the case that exposed it.
     *
     * The first draft tested `correlation >= required` FIRST and never compared it with the
     * rotated one. So whenever BOTH cleared the floor — which a nearly-symmetric card read
     * upside down does — it returned `upright`, paired every patch with the wrong published
     * value, and handed `solveCorrection` a matrix built from the mismatch. A silent wrong
     * correction produced by the module whose stated purpose is to prevent them.
     *
     * The fixture is a card symmetric in luminance except for ONE pair, so `assertCard` admits
     * it, read exactly upside down. Identity fits at ρ ≈ 0.98 and rotation at ρ = 1: both far
     * above the 0.9 floor for eight patches, and only the comparison tells them apart.
     */
    const grey = (v: number): Triple => linearSrgbToSrgb([v, v, v]);
    const trueY = [0.1, 0.3, 0.5, 0.7, 0.7, 0.5, 0.3, 0.15];

    const nearlySymmetric: ReferenceCard = {
      id: 'nearly-symmetric-8',
      columns: 4,
      rows: 2,
      white: CANONICAL_WHITE,
      inset: 0.25,
      patches: trueY.map((y, index) => ({
        id: `q${String(index)}`,
        xyz: linearSrgbToXyz([y, y, y]),
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

    // Read upside down: the patch printed at cell X shows what is really at mirror(X).
    const mirrored = (index: number) => {
      const column = 3 - (index % 4);
      const row = 1 - Math.floor(index / 4);
      return row * 4 + column;
    };
    const upsideDown: Observation[] = trueY.map((_, index) => ({
      id: `q${String(index)}`,
      rgb: grey(trueY[mirrored(index)] ?? 0),
    }));

    const verification = verifyCard(upsideDown, nearlySymmetric, 'srgb');

    expect(verification.correlation).toBeGreaterThan(verification.required);
    expect(verification.rotatedCorrelation).toBeGreaterThan(verification.correlation);
    expect(verification.ok).toBe(false);
    expect(verification.orientation).toBe('rotated');
  });

  it('and the DECOY: read the right way up, the same card verifies', () => {
    // Without this, the case above could be passing because that card never verifies at all.
    const trueY = [0.1, 0.3, 0.5, 0.7, 0.7, 0.5, 0.3, 0.15];
    const nearlySymmetric: ReferenceCard = {
      id: 'nearly-symmetric-8',
      columns: 4,
      rows: 2,
      white: CANONICAL_WHITE,
      inset: 0.25,
      patches: trueY.map((y, index) => ({
        id: `q${String(index)}`,
        xyz: linearSrgbToXyz([y, y, y]),
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

    const upright: Observation[] = trueY.map((y, index) => ({
      id: `q${String(index)}`,
      rgb: linearSrgbToSrgb([y * 0.6, y * 0.6, y * 0.6]),
    }));

    const verification = verifyCard(upright, nearlySymmetric, 'srgb');
    expect(verification.ok).toBe(true);
    expect(verification.orientation).toBe('upright');
  });

  it('reports rather than throws, because no card in frame is the ordinary state', () => {
    expect(() => verifyCard([], CONSTRUCTED_CARD, 'srgb')).not.toThrow();
    expect(verifyCard([], CONSTRUCTED_CARD, 'srgb').ok).toBe(false);
  });
});
