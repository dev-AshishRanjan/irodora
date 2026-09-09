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
import { allEntries } from '../src/corpus';
import { displayFromOklch } from '../src/engine';
import { ruleSet } from '../src/rules';

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

/**
 * Telling the colours apart, and who they are for (F-198).
 *
 * Nothing here computes a separation or a score. What is checked is that the product decision on
 * top of them holds: **the figure is always there, the source is in the check, and the weighting
 * reorders without removing.**
 */
describe('separation is reported for every combination, not only the poor ones', () => {
  it('reports a figure on every relationship', () => {
    for (const c of combinationsFor(CALM)) {
      expect(c.separation).not.toBeNull();
      expect(Number.isFinite(c.separation!.separation)).toBe(true);
    }
  });

  it('names the deficiency and the severity, which is what makes the number reproducible', () => {
    for (const c of combinationsFor(CALM)) {
      expect(['protan', 'deutan', 'tritan']).toContain(c.separation!.deficiency);
      expect(c.separation!.severity).toBeGreaterThan(0);
    }
  });

  /**
   * THE DECOY FOR THE FLAG.
   *
   * `close` is the convention applied to the number. A field hard-wired true — or false — would
   * satisfy every assertion above, so both values must actually occur across the corpus.
   */
  it('marks some relationships close and others not, so the flag is a measurement', () => {
    const marks = new Set<boolean>();
    for (const e of allEntries().slice(0, 40)) {
      const { oklch } = e.derived;
      for (const c of combinationsFor([oklch[0], oklch[1], oklch[2]]))
        marks.add(c.separation!.close);
    }
    expect([...marks].sort()).toEqual([false, true]);
  });

  it('includes the SOURCE in the pairs, not only the companions', () => {
    /*
     * The pair that matters most is a companion against the colour in hand, and it is exactly
     * the one a check over companions alone cannot see. Asserted by finding a relationship whose
     * reported pair contains the source's own hex.
     */
    const sourceHex = displayFromOklch([...CALM]).hex;
    const touchesSource = combinationsFor(CALM).some((c) => c.separation!.pair.includes(sourceHex));
    expect(touchesSource).toBe(true);
  });
});

describe('a profile reorders the relationships and removes none', () => {
  const SOMEBODY = {
    lightness: { min: 0.4, max: 0.75 },
    temperatureBias: 0.3,
    chroma: { min: 0.02, max: 0.14 },
    contrast: 'high' as const,
    confidence: { temperature: 0.8, lightness: 0.8, chroma: 0.7, contrast: 0.6 },
  };

  it('returns the same SET either way', () => {
    const plain = combinationsFor(CALM).map((c) => c.kind);
    const weighted = combinationsFor(CALM, { profile: SOMEBODY, rules: ruleSet() }).map(
      (c) => c.kind,
    );
    expect([...weighted].sort()).toEqual([...plain].sort());
  });

  it('carries a personal figure only when there is a person', () => {
    // `null` and a real midpoint are different facts — F-195's finding, applied here.
    for (const c of combinationsFor(CALM)) expect(c.personalFit).toBeNull();
    for (const c of combinationsFor(CALM, { profile: SOMEBODY, rules: ruleSet() }))
      expect(typeof c.personalFit).toBe('number');
  });

  it('leaves the geometric order untouched without a profile', () => {
    expect(combinationsFor(CALM).map((c) => c.kind)).toEqual([...COMBINATION_ORDER]);
  });
});

/**
 * A RELATIONSHIP THAT PROPOSES NOTHING IS NOT OFFERED (found in F-198).
 *
 * F-194 shipped a card with a heading, a "Generated" label, a gamut-cost line and no swatches,
 * for 23 corpus colours. It was invisible because the check asked ONE source whether every
 * relationship had companions, and that source had them.
 */
describe('an empty relationship is not offered', () => {
  it('never returns a relationship with no companions, for any corpus colour', () => {
    const empties: string[] = [];
    for (const e of allEntries()) {
      const { oklch } = e.derived;
      for (const c of combinationsFor([oklch[0], oklch[1], oklch[2]]))
        if (c.companions.length === 0) empties.push(`${e.entry.slug} ${c.kind}`);
    }
    // `toStrictEqual`, not `toHaveLength(0)`: the NAMES are the point — a failure should say
    // which colour and which relationship, not merely that the count was wrong.
    expect(empties).toStrictEqual([]);
  });

  it('DECOY — and the corpus really does contain the case that produced them', () => {
    /*
     * If no colour could ever empty a relationship, the assertion above would pass on an
     * implementation that never filtered anything — so the input that caused it must still be
     * present. A near-neutral colour yields fewer relationships than the full order.
     */
    const shortest = allEntries()
      .map((e) => {
        const { oklch } = e.derived;
        return combinationsFor([oklch[0], oklch[1], oklch[2]]).length;
      })
      .reduce((min, n) => Math.min(min, n), COMBINATION_ORDER.length);
    expect(shortest).toBeLessThan(COMBINATION_ORDER.length);
  });

  it('and every offered relationship can therefore be measured', () => {
    // The reason this matters for F-198: a set with one colour has no pair, so a relationship
    // with no companions could not report a separation at all.
    for (const e of allEntries().slice(0, 30)) {
      const { oklch } = e.derived;
      for (const c of combinationsFor([oklch[0], oklch[1], oklch[2]]))
        expect(`${c.kind}: ${String(c.separation !== null)}`).toBe(`${c.kind}: true`);
    }
  });
});
