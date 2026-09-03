/**
 * `assertCard` — the checks the type cannot make.
 *
 * A `ReferenceCard` is supplied by the caller (ADR-0085), which means every one of these is a
 * check on somebody else's data rather than on our own. Each case is a decoy: a card that is
 * structurally valid TypeScript and wrong in a way that would produce a correction rather than
 * an error.
 */

import { describe, expect, it } from 'vitest';
import { CANONICAL_WHITE, D50, linearSrgbToXyz, srgbToXyz } from '@irodora/color-spaces';

import { assertCard, CardError, type ReferenceCard } from '../src/card.js';
import { CONSTRUCTED_CARD } from './fixture.js';

const base = (patches: ReferenceCard['patches'], columns = 4, rows = 2): ReferenceCard => ({
  id: 'under-test',
  columns,
  rows,
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
});

/** Eight greys whose luminance layout is NOT symmetric under a 180° turn. */
const asymmetric = [0.1, 0.3, 0.5, 0.7, 0.7, 0.5, 0.3, 0.15].map((y, index) => ({
  id: `q${String(index)}`,
  xyz: linearSrgbToXyz([y, y, y]),
  at: [index % 4, Math.floor(index / 4)] as const,
}));

describe('the card the fixture ships', () => {
  it('is accepted — the decoy for every refusal below', () => {
    // Without this, each refusal could be firing because the fixture builder is broken rather
    // than because the check under test did anything [[a-decoy-that-is-not-broken-proves-nothing]].
    expect(() => {
      assertCard(CONSTRUCTED_CARD);
    }).not.toThrow();
    expect(() => {
      assertCard(base(asymmetric));
    }).not.toThrow();
  });
});

describe('assertCard refuses', () => {
  it('a card that looks the same upside down', () => {
    /*
     * The primary half of A1, found in review. `verifyCard` establishes orientation by asking
     * whether the observations fit the card's arrangement better than its 180° rotation. On a
     * symmetric card that question has NO ANSWER — both fit — and answering it anyway pairs
     * every patch with the wrong published value and solves a correction from the mismatch.
     *
     * Refused when the card is declared rather than when it is read, because a card symmetric
     * by construction can never be used safely.
     */
    const symmetric = [0.1, 0.3, 0.5, 0.7, 0.7, 0.5, 0.3, 0.1].map((y, index) => ({
      id: `q${String(index)}`,
      xyz: linearSrgbToXyz([y, y, y]),
      at: [index % 4, Math.floor(index / 4)] as const,
    }));

    expect(() => {
      assertCard(base(symmetric));
    }).toThrow(CardError);
    expect(() => {
      assertCard(base(symmetric));
    }).toThrow(/same luminance layout upside down/u);
  });

  it('two patches claiming one cell', () => {
    const clashing = [
      { id: 'a', xyz: srgbToXyz([0.2, 0.2, 0.2]), at: [0, 0] as const },
      { id: 'b', xyz: srgbToXyz([0.8, 0.8, 0.8]), at: [0, 0] as const },
      { id: 'c', xyz: srgbToXyz([0.5, 0.4, 0.3]), at: [1, 0] as const },
    ];
    expect(() => {
      assertCard(base(clashing));
    }).toThrow(/both claim cell/u);
  });

  it('two patches sharing an id', () => {
    const duplicated = [
      { id: 'a', xyz: srgbToXyz([0.2, 0.2, 0.2]), at: [0, 0] as const },
      { id: 'a', xyz: srgbToXyz([0.8, 0.8, 0.8]), at: [1, 0] as const },
    ];
    expect(() => {
      assertCard(base(duplicated));
    }).toThrow(/share the id/u);
  });

  it('a patch outside the grid it declares', () => {
    expect(() => {
      assertCard(base([{ id: 'a', xyz: srgbToXyz([0.5, 0.5, 0.5]), at: [9, 0] }]));
    }).toThrow(/outside the grid/u);
  });

  it('negative luminance, which is a transcription error and not a dark colour', () => {
    expect(() => {
      assertCard(base([{ id: 'a', xyz: [0.2, -0.01, 0.1], at: [0, 0] }]));
    }).toThrow(/negative luminance/u);
  });

  it('an inset that leaves a patch region no area', () => {
    expect(() => {
      assertCard({ ...base(asymmetric), inset: 0.5 });
    }).toThrow(/inset must be/u);
  });

  it('a provenance field left empty — a cited value with no citation', () => {
    const uncited = base(asymmetric);
    expect(() => {
      assertCard({ ...uncited, provenance: { ...uncited.provenance, licence: '   ' } });
    }).toThrow(/ADR-0085/u);
  });

  it('a white point that is not positive', () => {
    expect(() => {
      assertCard({ ...base(asymmetric), white: [0.95, 0, 1.089] });
    }).toThrow(/white point/u);
  });
});

describe('assertCard allows', () => {
  it('a white point that is not D65 — that refusal belongs to the solver, with its reason', () => {
    // `assertCard` says whether the card is coherent; `solveCorrection` says whether it can be
    // used HERE, and names `adapt`. Splitting them keeps the adaptation decision in one place.
    expect(() => {
      assertCard({ ...base(asymmetric), white: D50 });
    }).not.toThrow();
  });
});
