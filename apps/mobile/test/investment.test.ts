/**
 * The investment signal (FR-52, F-123, ADR-0082).
 *
 * ## What earns this file
 *
 * The arithmetic is a division and two medians. Every implementation gets `18000 / 300` right,
 * including the wrong ones. What separates them is **which garments they count** — and a
 * wardrobe of one garment type, one currency and no unworn items rates all of them identically
 * [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
 *
 * So the wardrobe here carries three things that must be **excluded**, and each is chosen so
 * that including it **moves both medians**:
 *
 * | The plausible wrong code | What it would count | What the median becomes |
 * |---|---|---|
 * | no type filter | the jumper | 250, not 300 — and `typicalWears` 35, not 30 |
 * | no currency filter | the yen coat | 325, not 300 |
 * | reading `costMinor / wearCount` directly | the unworn coat | a division by zero |
 *
 * A decoy whose inclusion left the answer unchanged would prove nothing.
 */

import {
  investmentSignal,
  MINIMUM_COMPARABLES,
  type InvestmentGarment,
} from '../src/wardrobe/investment';

const coat = (costMinor: number, wearCount: number, currency = 'GBP'): InvestmentGarment => ({
  type: 'coat',
  costMinor,
  currency,
  wearCount,
});

/** £180, the thing being considered. */
const CANDIDATE = { type: 'coat', costMinor: 18000, currency: 'GBP' };

/*
 * Three coats, rates 350, 200, 300 — DELIBERATELY NOT IN ORDER, or the median assertion would
 * pass for a function returning the first or the last element.
 */
const THREE_COATS = [
  coat(14000, 40), // 350 per wear
  coat(6000, 30), //  200 per wear
  coat(9000, 30), //  300 per wear
];

/** The jumper is the type decoy: rate 166.67, wears 60. Both far outside the coats' middle. */
const JUMPER: InvestmentGarment = {
  type: 'jumper',
  costMinor: 10000,
  currency: 'GBP',
  wearCount: 60,
};

/** The currency decoy: ¥15000 over 10 wears is 1500 per wear, which would drag the median up. */
const YEN_COAT = coat(15000, 10, 'JPY');

/** The zero decoy: priced, never worn. `costPerWear` calls this `neverWorn`, not a rate of 0. */
const UNWORN_COAT = coat(20000, 0);

describe('the signal, when the wardrobe can produce one', () => {
  it('is the price over the median rate, and the median wears beside it', () => {
    const signal = investmentSignal(CANDIDATE, THREE_COATS);

    expect(signal.known).toBe(true);
    if (!signal.known) throw new Error('unreachable');
    // median of 350, 200, 300 is 300. 18000 / 300 = 60.
    expect(signal.medianMinorPerWear).toBe(300);
    expect(signal.breakEvenWears).toBe(60);
    // median of 40, 30, 30 is 30 — the wears of the COMPARABLES, not of the wardrobe.
    expect(signal.typicalWears).toBe(30);
  });

  it('carries its basis back, so the number can be checked rather than believed', () => {
    const signal = investmentSignal(CANDIDATE, THREE_COATS);
    if (!signal.known) throw new Error('unreachable');

    expect(signal.comparableCount).toBe(3);
    expect(signal.currency).toBe('GBP');
  });

  it('takes the mean of the two middle values on an even count', () => {
    const signal = investmentSignal(CANDIDATE, [...THREE_COATS, coat(8000, 20)]); // 400 per wear
    if (!signal.known) throw new Error('unreachable');

    // 200, 300, 350, 400 -> (300 + 350) / 2
    expect(signal.medianMinorPerWear).toBe(325);
  });

  it('does not round — the screen decides that', () => {
    const signal = investmentSignal({ ...CANDIDATE, costMinor: 18100 }, THREE_COATS);
    if (!signal.known) throw new Error('unreachable');

    expect(Number.isInteger(signal.breakEvenWears)).toBe(false);
    expect(signal.breakEvenWears).toBeCloseTo(60.333, 3);
  });

  it('is known at exactly the minimum, so the threshold is a floor and not a fence', () => {
    expect(THREE_COATS).toHaveLength(MINIMUM_COMPARABLES);
    expect(investmentSignal(CANDIDATE, THREE_COATS).known).toBe(true);
  });
});

describe('the three decoys — each would move the answer if it were counted', () => {
  it('ignores a garment of another type', () => {
    const signal = investmentSignal(CANDIDATE, [...THREE_COATS, JUMPER]);
    if (!signal.known) throw new Error('unreachable');

    // Counting the jumper makes the rate median 250 and the wear median 35.
    expect(signal.medianMinorPerWear).toBe(300);
    expect(signal.typicalWears).toBe(30);
    expect(signal.comparableCount).toBe(3);
  });

  it('ignores a garment priced in another currency, because there is no exchange rate', () => {
    const signal = investmentSignal(CANDIDATE, [...THREE_COATS, YEN_COAT]);
    if (!signal.known) throw new Error('unreachable');

    // Counting the yen coat makes the median 325 — a number in no currency at all.
    expect(signal.medianMinorPerWear).toBe(300);
    expect(signal.comparableCount).toBe(3);
  });

  it('ignores an unworn garment rather than dividing by its zero wears', () => {
    const signal = investmentSignal(CANDIDATE, [...THREE_COATS, UNWORN_COAT]);
    if (!signal.known) throw new Error('unreachable');

    expect(signal.comparableCount).toBe(3);
    expect(Number.isFinite(signal.breakEvenWears)).toBe(true);
  });

  it('matches a type whatever its spacing and case', () => {
    const signal = investmentSignal({ ...CANDIDATE, type: '  Coat ' }, THREE_COATS);

    expect(signal.known).toBe(true);
  });

  it('matches a currency whatever its case', () => {
    const signal = investmentSignal({ ...CANDIDATE, currency: 'gbp' }, THREE_COATS);

    expect(signal.known).toBe(true);
  });
});

describe('the ways there is no signal', () => {
  it('refuses a candidate with no price, before looking at the wardrobe at all', () => {
    expect(investmentSignal({ ...CANDIDATE, costMinor: null }, THREE_COATS)).toEqual({
      known: false,
      reason: 'noPrice',
    });
  });

  it('refuses a price with no currency — half a price is not one', () => {
    expect(investmentSignal({ ...CANDIDATE, currency: null }, THREE_COATS)).toEqual({
      known: false,
      reason: 'noPrice',
    });
  });

  it('says nothing is comparable when nothing is, rather than reaching for the wardrobe', () => {
    expect(investmentSignal(CANDIDATE, [JUMPER, YEN_COAT])).toEqual({
      known: false,
      reason: 'noComparable',
    });
  });

  it('says how many it has when it has too few, so the screen can say what is missing', () => {
    expect(investmentSignal(CANDIDATE, [...THREE_COATS.slice(0, 2), UNWORN_COAT])).toEqual({
      known: false,
      reason: 'tooFew',
      have: 2,
      need: MINIMUM_COMPARABLES,
    });
  });

  it('reports an empty wardrobe as nothing comparable, not as too few', () => {
    // `tooFew` says "you are close"; an empty wardrobe is not close, and the two sentences
    // have different things to do about them.
    expect(investmentSignal(CANDIDATE, [])).toEqual({ known: false, reason: 'noComparable' });
  });

  /*
   * THE ZERO-RATE CASE. Three coats that genuinely cost nothing have a rate of nothing, and
   * `costPerWear` reports that as KNOWN at zero — its own decoy for `if (!costMinor)`. Dividing
   * by it gives Infinity: a number, of type number, that renders as a word.
   */
  it('refuses to divide by a median rate of zero, rather than returning Infinity', () => {
    const free = [coat(0, 30), coat(0, 40), coat(0, 20)];

    expect(investmentSignal(CANDIDATE, free)).toEqual({ known: false, reason: 'noComparable' });
  });

  it('never produces Infinity or NaN on any combination', () => {
    const costs = [null, 0, 18000];
    const currencies = [null, 'GBP', 'JPY'];
    const wardrobes = [[], THREE_COATS, [...THREE_COATS, UNWORN_COAT], [UNWORN_COAT], [JUMPER]];

    for (const costMinor of costs)
      for (const currency of currencies)
        for (const wardrobe of wardrobes) {
          const signal = investmentSignal({ type: 'coat', costMinor, currency }, wardrobe);
          if (!signal.known) continue;
          expect(Number.isFinite(signal.breakEvenWears)).toBe(true);
          expect(Number.isFinite(signal.typicalWears)).toBe(true);
        }
  });
});

describe('what the signal is not', () => {
  /*
   * ADR-0082 refuses a verdict, and a type is how a refusal survives. If a field ever appears
   * here called `verdict`, `rating`, `worthIt` or `advice`, this is the test that says the
   * decision was made and then quietly reversed.
   */
  it('carries no verdict — only numbers and their basis', () => {
    const signal = investmentSignal(CANDIDATE, THREE_COATS);
    if (!signal.known) throw new Error('unreachable');

    expect(Object.keys(signal).sort()).toEqual([
      'breakEvenWears',
      'comparableCount',
      'currency',
      'known',
      'medianMinorPerWear',
      'typicalWears',
    ]);
  });

  it('does not sort the wardrobe it was given', () => {
    const wardrobe = [...THREE_COATS];
    const before = wardrobe.map((g) => g.costMinor);

    investmentSignal(CANDIDATE, wardrobe);

    expect(wardrobe.map((g) => g.costMinor)).toEqual(before);
  });
});
