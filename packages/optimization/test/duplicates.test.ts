/**
 * Duplicate detection (FR-44, F-049).
 *
 * ## What earns this file
 *
 * The criterion has two halves — *"flags items within ΔE00 5 in the same category"* and
 * *"showing the measured difference"* — and the second is the one a plausible implementation
 * drops. So the difference is asserted against `deltaE00` **recomputed independently here**,
 * not against a number the function also produced.
 *
 * The boundary is asserted at exactly 5, because *"within 5"* is ambiguous and *"< 5"* is what
 * the PRD says. A test that only checked a pair at 0.5 would pass either reading.
 */

import { describe, expect, it } from 'vitest';
import { deltaE00 } from '@irodora/color-difference';
import { xyzToLab, oklchToXyz } from '@irodora/color-spaces';
import { fromXyz, type Color } from '@irodora/color-core';
import { DUPLICATE_DELTA_E, findDuplicates, type DuplicateCandidate } from '../src/duplicates.js';

/** A colour from OKLCh, through the engine — no hand-typed XYZ anywhere in this file. */
const at = (l: number, c: number, h: number): Color =>
  fromXyz(oklchToXyz([l, c, h]), { source: 'reference', confidence: 1, originSpace: 'oklch' });

const item = (id: string, category: string, color: Color): DuplicateCandidate => ({
  id,
  category,
  color,
});

const NAVY = at(0.42, 0.09, 264);
/** Nudged until the pair sits just inside the threshold; the test asserts where it landed. */
const NEAR_NAVY = at(0.435, 0.088, 262);
const RUST = at(0.55, 0.13, 45);

const distance = (a: Color, b: Color): number => deltaE00(xyzToLab(a.xyz), xyzToLab(b.xyz));

describe('the fixtures are what the tests assume', () => {
  it('has a near pair inside the threshold and a far pair outside it', () => {
    /*
     * ASSERTED, NOT ASSUMED. Every test below rests on these two distances, and a fixture that
     * drifted — because a conversion changed, or because I nudged a number — would make the
     * whole file pass while testing nothing. This is the same failure `a-decoy-written-against-
     * old-values-quietly-stops-discriminating` records.
     */
    expect(distance(NAVY, NEAR_NAVY)).toBeLessThan(DUPLICATE_DELTA_E);
    expect(distance(NAVY, RUST)).toBeGreaterThan(DUPLICATE_DELTA_E);
  });
});

describe('what gets flagged', () => {
  it('flags a near pair in the same category, with the measured difference', () => {
    const pairs = findDuplicates([item('a', 'jumper', NAVY), item('b', 'jumper', NEAR_NAVY)]);

    expect(pairs).toHaveLength(1);
    // Recomputed INDEPENDENTLY. Comparing against a number the function also produced would
    // assert that it is self-consistent, which it would be even if it were wrong.
    expect(pairs[0]?.difference).toBeCloseTo(distance(NAVY, NEAR_NAVY), 10);
  });

  it('does NOT flag a far pair', () => {
    expect(findDuplicates([item('a', 'jumper', NAVY), item('b', 'jumper', RUST)])).toHaveLength(0);
  });

  it('does NOT flag across categories', () => {
    /*
     * THE DECOY FOR "IN THE SAME CATEGORY". The two colours are identical, so a comparison that
     * ignored the category would flag them — and would tell somebody their navy jumper
     * duplicates their navy trousers, which is the one thing FR-44's wording rules out.
     */
    const pairs = findDuplicates([item('a', 'jumper', NAVY), item('b', 'trousers', NAVY)]);
    expect(pairs).toHaveLength(0);
  });

  it('treats a category typed differently as the same category', () => {
    // The type is free text (FR-39 asks for two fields, not a taxonomy), so it is whatever
    // somebody typed. "Jumper" and " jumper " are one category.
    const pairs = findDuplicates([item('a', 'Jumper', NAVY), item('b', '  jumper ', NEAR_NAVY)]);
    expect(pairs).toHaveLength(1);
  });
});

describe('the boundary is exact, and strict', () => {
  it('excludes a pair at exactly the threshold', () => {
    /*
     * The acceptance says "within ΔE00 5" and the PRD says "< 5". Strict, per the PRD — and
     * asserted at the boundary so the choice is visible rather than incidental. Driven through
     * the threshold parameter, because constructing two colours at exactly 5.000000 ΔE00 apart
     * would be a fixture nobody could maintain.
     */
    const exact = distance(NAVY, NEAR_NAVY);
    expect(
      findDuplicates([item('a', 'jumper', NAVY), item('b', 'jumper', NEAR_NAVY)], exact),
    ).toHaveLength(0);
    // And just above it, the same pair is a duplicate — so the exclusion is the boundary and
    // not a function that flags nothing.
    expect(
      findDuplicates([item('a', 'jumper', NAVY), item('b', 'jumper', NEAR_NAVY)], exact + 1e-9),
    ).toHaveLength(1);
  });
});

describe('each unordered pair appears once', () => {
  it('gives three pairs for three identical items, not six', () => {
    // Reporting (a,b) and (b,a) is one relationship counted twice — the defect F-046's
    // pairingKey exists to prevent — and it would tell somebody they own six duplicates.
    const pairs = findDuplicates([
      item('a', 'jumper', NAVY),
      item('b', 'jumper', NAVY),
      item('c', 'jumper', NAVY),
    ]);
    expect(pairs).toHaveLength(3);
  });

  it('never pairs an item with itself', () => {
    expect(findDuplicates([item('a', 'jumper', NAVY)])).toHaveLength(0);
  });
});

describe('ordering', () => {
  it('is closest first and total', () => {
    const items = [
      item('a', 'jumper', NAVY),
      item('b', 'jumper', NAVY),
      item('c', 'jumper', NEAR_NAVY),
    ];
    const forward = findDuplicates(items);
    const reversed = findDuplicates([...items].reverse());

    for (let i = 1; i < forward.length; i += 1)
      expect(forward[i - 1]!.difference).toBeLessThanOrEqual(forward[i]!.difference);

    // Same set whichever order the wardrobe arrives in. Without the id tie-break, `sort`'s
    // stability would leave the order following the input — which changes when a garment is
    // added, exactly as F-045 found.
    expect(reversed.map((p) => p.difference)).toEqual(forward.map((p) => p.difference));
  });
});

describe('nothing to compare', () => {
  it('returns nothing rather than throwing', () => {
    expect(findDuplicates([])).toHaveLength(0);
  });
});
