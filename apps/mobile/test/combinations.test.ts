/**
 * What goes with a colour — the ranking, and the cost of saying so.
 *
 * The engine is tested in its own package against golden data. What is checked here is the
 * product decision on top of it: **which relationships are offered, in what order, and whether
 * the price of showing a colour the display cannot reach actually reaches the caller.**
 */

import {
  COMBINATIONS_SHOWN,
  COMBINATION_ORDER,
  combinationsFor,
  leadingCombinations,
  type Oklch,
} from '../src/combinations';
import { HARMONY_KINDS, VARIES } from '@irodora/color-harmony';

/** A mid-lightness, moderate-chroma blue-grey. Comfortably inside the display gamut. */
const CALM: Oklch = [0.55, 0.05, 240];

/**
 * A colour no display can show.
 *
 * Chroma 0.37 at mid lightness is far outside sRGB, so every generator that keeps the chroma
 * has to map — which is what makes it a decoy rather than a second happy case.
 */
const IMPOSSIBLE: Oklch = [0.55, 0.37, 30];

describe('which relationships are offered, and in what order', () => {
  it('offers every relationship the engine generates — none is dropped silently', () => {
    expect([...COMBINATION_ORDER].sort()).toEqual([...HARMONY_KINDS].sort());
  });

  it('puts the ones that change HUE first, because that is what the question means', () => {
    /*
     * A person holding a shirt is asking what OTHER colour to put beside it. A relationship
     * that only changes lightness or chroma returns a variation on the shirt — useful, and not
     * the answer to the question that was asked.
     */
    const hueCount = HARMONY_KINDS.filter((k) => VARIES[k].includes('h')).length;
    const leading = COMBINATION_ORDER.slice(0, hueCount);
    expect(leading.every((k) => VARIES[k].includes('h'))).toBe(true);
  });

  it('leads with warm-cool, the one relationship this product already reasons about', () => {
    // `pairingCoherence` in the outfit engine scores against exactly this axis, so it is the
    // relationship a person is most likely to have seen the product explain.
    expect(COMBINATION_ORDER[0]).toBe('warm-cool');
  });

  it('shows an answer rather than a menu', () => {
    expect(leadingCombinations(CALM)).toHaveLength(COMBINATIONS_SHOWN);
    expect(COMBINATIONS_SHOWN).toBeLessThan(HARMONY_KINDS.length);
  });
});

describe('the source is dropped from its own companions', () => {
  it('never lists the colour being asked about as something that goes with it', () => {
    for (const c of combinationsFor(CALM))
      expect(
        c.companions.some(
          (x) =>
            x.requested[0] === CALM[0] && x.requested[1] === CALM[1] && x.requested[2] === CALM[2],
        ),
      ).toBe(false);
  });

  it('and still returns companions for every relationship', () => {
    /*
     * The decoy for the case above. A filter that removed EVERYTHING would satisfy it and leave
     * every relationship empty, which is a screen with nothing on it and a passing test.
     */
    for (const c of combinationsFor(CALM))
      expect(`${c.kind}: ${String(c.companions.length > 0)}`).toBe(`${c.kind}: true`);
  });
});

describe('the gamut cost is a measurement, not a disclaimer', () => {
  it('reports 0 for a colour the display can show, rather than reporting nothing', () => {
    const calm = combinationsFor(CALM);
    // A value rather than an absence, so a screen can say "nothing was lost" instead of saying
    // nothing. Every one of these is a real number.
    for (const c of calm) expect(Number.isFinite(c.gamutCost)).toBe(true);
    expect(calm.every((c) => c.gamutCost >= 0)).toBe(true);
  });

  /**
   * THE DECOY THIS FILE EXISTS FOR.
   *
   * Criterion 2 is *"each proposed colour shows the gamut cost of proposing it"*. A `gamutCost`
   * that were always 0 would satisfy every other assertion here and satisfy the criterion in
   * name only — the field would be present, populated, and meaningless.
   *
   * So a source no display can reach must produce a cost that is not zero, somewhere.
   */
  it('reports a NON-ZERO cost for a colour no display can reach', () => {
    const impossible = combinationsFor(IMPOSSIBLE);
    expect(impossible.some((c) => c.gamutCost > 0)).toBe(true);
    expect(impossible.some((c) => c.wasMapped)).toBe(true);
  });

  it('reads "was it mapped" from the flag rather than inferring it from the cost', () => {
    /*
     * A colour can be mapped and land close enough that ΔE00 rounds to zero. Inferring the flag
     * from the number would report "nothing was lost" about a colour that was changed — so
     * `wasMapped` must be true at least once where the cost is not the evidence.
     */
    const mapped = combinationsFor(IMPOSSIBLE).filter((c) => c.wasMapped);
    expect(mapped.length).toBeGreaterThan(0);
    for (const c of mapped) expect(c.companions.some((x) => x.wasGamutMapped)).toBe(true);
  });
});
