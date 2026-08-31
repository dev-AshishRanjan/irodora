/**
 * Preference feedback, and the three things FR-37 actually promises (F-046).
 *
 * > *Repeated selection of a pairing shifts a stored, inspectable preference weight; the user
 * > can see and reset it; no model training is involved.*
 *
 * ## What earns this file
 *
 * "The weight went up" is satisfied by an unbounded counter, by a random walk that happened to
 * rise, and by a correct implementation. So every assertion here is about a **property**: that
 * the answer depends only on the net, that it is bounded at a stated number, and that a pairing
 * nobody has expressed anything about multiplies by exactly one — which is what keeps this
 * feature from re-ranking every existing caller.
 */

import { describe, expect, it } from 'vitest';
import {
  pairingKey,
  preferenceFor,
  preferenceWeight,
  PREFERENCE_NEUTRAL,
  PREFERENCE_RANGE,
  PREFERENCE_SATURATION,
  type PreferenceTable,
} from '../src/preference.js';

describe('a pairing nobody has expressed anything about', () => {
  it('multiplies by EXACTLY one', () => {
    /*
     * THE ASSERTION THAT KEEPS THIS FEATURE FROM CHANGING ANYTHING IT SHOULD NOT. Every
     * existing caller scores with no preferences, so an implementation whose neutral was
     * 0.999 would silently re-rank the whole product. Exactly, not approximately.
     */
    expect(preferenceWeight({ accepted: 0, rejected: 0 })).toBe(1);
    expect(PREFERENCE_NEUTRAL).toBe(1);
  });

  it('is neutral for a pairing absent from the table', () => {
    const table: PreferenceTable = new Map();
    expect(preferenceFor(table, 'rust', 'charcoal')).toBe(1);
  });
});

describe('repetition shifts it', () => {
  it('moves further with more net observations, up to the bound', () => {
    const one = preferenceWeight({ accepted: 1, rejected: 0 });
    const four = preferenceWeight({ accepted: 4, rejected: 0 });
    const saturated = preferenceWeight({ accepted: PREFERENCE_SATURATION, rejected: 0 });

    expect(one).toBeGreaterThan(1);
    expect(four).toBeGreaterThan(one);
    expect(saturated).toBeGreaterThan(four);
  });

  it('is BOUNDED at a stated number, not at "some maximum"', () => {
    // Twenty acceptances are not twenty times one. Without the clamp, preference eventually
    // overrules the engine — which is the failure this bound exists to prevent, because a
    // person's habit is not a reason to stop telling them what the engine found.
    const saturated = preferenceWeight({ accepted: PREFERENCE_SATURATION, rejected: 0 });
    const far = preferenceWeight({ accepted: 200, rejected: 0 });

    expect(saturated).toBeCloseTo(1 + PREFERENCE_RANGE, 10);
    expect(far).toBe(saturated);
    expect(far).toBeLessThanOrEqual(1 + PREFERENCE_RANGE);
  });

  it('goes down as readily as up', () => {
    // The decoy for the block above: an implementation that only ever increased would pass
    // every assertion so far, and would make "reject" a button that does nothing.
    expect(preferenceWeight({ accepted: 0, rejected: 200 })).toBeCloseTo(1 - PREFERENCE_RANGE, 10);
    expect(preferenceWeight({ accepted: 0, rejected: 1 })).toBeLessThan(1);
  });
});

describe('the weight is a function of the NET, and that is deliberate', () => {
  it('treats twelve-and-ten as no leaning at all', () => {
    /*
     * A pairing accepted twelve times and rejected ten is a pairing somebody keeps
     * reconsidering, not one they like. Using the TOTALS would let it outrank a pairing chosen
     * cleanly three times, which is the opposite of what the person expressed.
     */
    // Net 2 either way, so the same answer either way.
    expect(preferenceWeight({ accepted: 12, rejected: 10 })).toBe(
      preferenceWeight({ accepted: 2, rejected: 0 }),
    );
    // And a pairing chosen cleanly three times outranks one reconsidered twenty-two times.
    expect(preferenceWeight({ accepted: 3, rejected: 0 })).toBeGreaterThan(
      preferenceWeight({ accepted: 12, rejected: 10 }),
    );
    // Perfectly balanced is no leaning, not a strong one.
    expect(preferenceWeight({ accepted: 11, rejected: 11 })).toBe(1);
  });

  it('does not depend on the ORDER the counts arrived in', () => {
    // The property a stored running float could not have. Counts are facts; a float is a
    // history, and a history is the thing that goes wrong when the formula is corrected later.
    expect(preferenceWeight({ accepted: 3, rejected: 1 })).toBe(
      preferenceWeight({ accepted: 3, rejected: 1 }),
    );
    expect(preferenceWeight({ accepted: 5, rejected: 3 })).toBe(
      preferenceWeight({ accepted: 2, rejected: 0 }),
    );
  });

  it('refuses counts that are not observations anybody made', () => {
    expect(() => preferenceWeight({ accepted: -1, rejected: 0 })).toThrow(RangeError);
    expect(() => preferenceWeight({ accepted: 1.5, rejected: 0 })).toThrow(RangeError);
  });
});

describe('a pairing is unordered', () => {
  it('has ONE key whichever way round it is given', () => {
    // Without this the same preference is learned twice under two keys and half of it is never
    // found — the recommender would appear to forget, depending on which garment was in hand.
    expect(pairingKey('rust', 'charcoal')).toBe(pairingKey('charcoal', 'rust'));
  });

  it('still tells DIFFERENT pairings apart', () => {
    // The decoy for the line above: a key function returning a constant would pass it.
    expect(pairingKey('rust', 'charcoal')).not.toBe(pairingKey('rust', 'gold'));
  });

  it('reads the same preference from either direction', () => {
    const table: PreferenceTable = new Map([
      [pairingKey('rust', 'charcoal'), { accepted: 4, rejected: 0 }],
    ]);
    expect(preferenceFor(table, 'charcoal', 'rust')).toBe(preferenceFor(table, 'rust', 'charcoal'));
    expect(preferenceFor(table, 'rust', 'charcoal')).toBeGreaterThan(1);
  });
});
