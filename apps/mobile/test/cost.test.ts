/**
 * Cost per wear, and the three ways there is no such number (FR-46, F-051).
 *
 * ## What earns this file
 *
 * The requirement is *"absent data yields unknown, never an invented estimate"*, and the
 * expensive mistake is a test suite that only exercises the happy division. Every implementation
 * of this — including the wrong ones — computes `4550 / 38` correctly. What separates them is
 * what they do with the six combinations where a column is null or a count is zero.
 *
 * So the cases here are organised around the **decoys**: for each refusal there is a
 * neighbouring case that must NOT refuse, because a function that returns `unknown` for
 * everything satisfies "never an invented estimate" perfectly and is useless
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * Three of them are aimed at implementations that would pass everything else:
 *
 * | The plausible wrong code | The case that fails it, and only it |
 * |---|---|
 * | `if (!garment.costMinor)` | a garment that genuinely cost nothing |
 * | `costMinor / wearCount` with no zero check | never worn — `Infinity` is a number |
 * | an exponent of 2 for every currency | ¥15000, which would be recorded as ¥1,500,000 |
 */

import type { StoredGarment } from '@irodora/store';
import {
  costEntry,
  costPerWear,
  formatMinor,
  minorToMajor,
  minorUnitDigits,
  wearRecorded,
  type CostInputs,
} from '../src/wardrobe/cost';

/** A coat at £45.50, worn 38 times. The only case where every column is present. */
const COAT: CostInputs = { costMinor: 4550, currency: 'GBP', wearCount: 38 };

describe('cost per wear, when there is one', () => {
  it('divides the recorded cost by the recorded wears', () => {
    const answer = costPerWear(COAT);

    expect(answer.known).toBe(true);
    if (!answer.known) throw new Error('unreachable');
    expect(answer.minorPerWear).toBeCloseTo(4550 / 38, 10);
    expect(answer.currency).toBe('GBP');
  });

  it('carries its inputs back, so the number can be checked rather than believed', () => {
    const answer = costPerWear(COAT);
    if (!answer.known) throw new Error('unreachable');

    expect(answer.costMinor).toBe(4550);
    expect(answer.wearCount).toBe(38);
  });

  it('does not round — the screen decides that, not the value F-052 will read', () => {
    const answer = costPerWear({ costMinor: 1000, currency: 'GBP', wearCount: 3 });
    if (!answer.known) throw new Error('unreachable');

    expect(Number.isInteger(answer.minorPerWear)).toBe(false);
    expect(answer.minorPerWear * 3).toBeCloseTo(1000, 10);
  });

  /*
   * THE DECOY FOR `if (!garment.costMinor)`. A gift has a cost and it is zero. Falsiness
   * cannot tell that from a column nobody filled in, and every other test in this file passes
   * against an implementation that gets it wrong.
   */
  it('reports a garment that genuinely cost nothing as known, at zero', () => {
    const answer = costPerWear({ costMinor: 0, currency: 'JPY', wearCount: 12 });

    expect(answer.known).toBe(true);
    if (!answer.known) throw new Error('unreachable');
    expect(answer.minorPerWear).toBe(0);
  });
});

describe('the three ways there is no cost per wear', () => {
  it('says which half is missing when there is no cost', () => {
    const answer = costPerWear({ ...COAT, costMinor: null });

    expect(answer).toEqual({ known: false, reason: 'noCost' });
  });

  it('refuses a bare ratio when nothing says what currency it is in', () => {
    const answer = costPerWear({ ...COAT, currency: null });

    expect(answer).toEqual({ known: false, reason: 'noCurrency' });
  });

  /*
   * THE DECOY FOR THE MISSING ZERO CHECK. `4550 / 0` is `Infinity`: a number, of type number,
   * that renders as a word. A test asserting only "it returned something" passes against it.
   */
  it('refuses to divide by no wears, rather than returning Infinity', () => {
    const answer = costPerWear({ ...COAT, wearCount: 0 });

    expect(answer).toEqual({ known: false, reason: 'neverWorn' });
  });

  it('and the same garment worn once IS known — the refusals discriminate', () => {
    const answer = costPerWear({ ...COAT, wearCount: 1 });

    expect(answer.known).toBe(true);
    if (!answer.known) throw new Error('unreachable');
    expect(answer.minorPerWear).toBe(4550);
  });

  it('names the missing price before the missing wear, because that is the half to act on', () => {
    const answer = costPerWear({ costMinor: null, currency: null, wearCount: 0 });

    expect(answer).toEqual({ known: false, reason: 'noCost' });
  });

  it('never produces Infinity or NaN on any combination', () => {
    const costs = [null, 0, 4550];
    const currencies = [null, 'GBP'];
    const wears = [0, 1, 38];

    for (const costMinor of costs)
      for (const currency of currencies)
        for (const wearCount of wears) {
          const answer = costPerWear({ costMinor, currency, wearCount });
          if (!answer.known) continue;
          expect(Number.isFinite(answer.minorPerWear)).toBe(true);
        }
  });
});

describe('recording a wear', () => {
  it('is one more than the count it was given', () => {
    expect(wearRecorded({ wearCount: 37 })).toEqual({ wearCount: 38 });
  });

  it('starts an unworn garment at one', () => {
    expect(wearRecorded({ wearCount: 0 })).toEqual({ wearCount: 1 });
  });

  /*
   * A patch carrying any other key would CLEAR that column: `GarmentEnrichment` reads an
   * explicit null as "erase this". A wear that quietly deleted a price would make cost per
   * wear permanently unknown the moment somebody used the feature.
   */
  it('carries exactly one key, because every other key on a patch erases a column', () => {
    const garment = {
      wearCount: 3,
      costMinor: 4550,
      currency: 'GBP',
      brand: 'a brand',
    } as unknown as Pick<StoredGarment, 'wearCount'>;

    expect(Object.keys(wearRecorded(garment))).toEqual(['wearCount']);
  });
});

describe('a typed price becomes minor units', () => {
  it('reads a decimal amount at the currency’s own precision', () => {
    expect(costEntry('45.50', 'GBP')).toEqual({
      ok: true,
      patch: { costMinor: 4550, currency: 'GBP' },
    });
  });

  /*
   * THE DECOY FOR A FIXED EXPONENT OF 2. This is the case that fails — and only this one —
   * against a table that answers 2 for everything, and it is the currency this product's
   * corpus is about.
   */
  it('does not multiply yen by a hundred', () => {
    expect(costEntry('15000', 'JPY')).toEqual({
      ok: true,
      patch: { costMinor: 15000, currency: 'JPY' },
    });
  });

  it('reads the three-decimal currencies at three', () => {
    expect(costEntry('1.500', 'KWD')).toEqual({
      ok: true,
      patch: { costMinor: 1500, currency: 'KWD' },
    });
  });

  it('pads a short fraction rather than reading it as written', () => {
    expect(costEntry('45.5', 'GBP')).toEqual({
      ok: true,
      patch: { costMinor: 4550, currency: 'GBP' },
    });
  });

  it('is exact where floating-point multiplication is not', () => {
    // 8.15 * 100 is 814.9999999999999 in binary floating point.
    expect(costEntry('8.15', 'GBP')).toEqual({
      ok: true,
      patch: { costMinor: 815, currency: 'GBP' },
    });
  });

  it('accepts a whole amount with no point', () => {
    expect(costEntry('45', 'GBP')).toEqual({
      ok: true,
      patch: { costMinor: 4500, currency: 'GBP' },
    });
  });

  it('uppercases the code, so gbp and GBP are one currency and not two', () => {
    expect(costEntry('45.50', 'gbp')).toEqual({
      ok: true,
      patch: { costMinor: 4550, currency: 'GBP' },
    });
  });

  it('records a price of zero, because free is a price', () => {
    expect(costEntry('0', 'GBP')).toEqual({
      ok: true,
      patch: { costMinor: 0, currency: 'GBP' },
    });
  });
});

describe('a typed price that cannot be recorded says why', () => {
  it('refuses an empty amount', () => {
    expect(costEntry('', 'GBP')).toEqual({ ok: false, problem: 'noAmount' });
    expect(costEntry('   ', 'GBP')).toEqual({ ok: false, problem: 'noAmount' });
  });

  it('refuses an amount with no currency, because cost_minor does not record its own scale', () => {
    expect(costEntry('45.50', '')).toEqual({ ok: false, problem: 'badCurrency' });
    expect(costEntry('45.50', 'GB')).toEqual({ ok: false, problem: 'badCurrency' });
    expect(costEntry('45.50', 'GBPP')).toEqual({ ok: false, problem: 'badCurrency' });
    expect(costEntry('45.50', '£')).toEqual({ ok: false, problem: 'badCurrency' });
  });

  it('refuses a comma rather than guessing which separator it is', () => {
    expect(costEntry('1,500', 'GBP')).toEqual({ ok: false, problem: 'badAmount' });
  });

  it('refuses anything that is not a plain decimal', () => {
    for (const bad of ['-45.50', '45.50p', '£45.50', 'forty', '4 5', '45.', '.50'])
      expect(costEntry(bad, 'GBP')).toEqual({ ok: false, problem: 'badAmount' });
  });

  /*
   * Refused rather than rounded. Turning 1500.75 JPY into 1501 is a small invented number,
   * and the requirement is about exactly that.
   */
  it('refuses more precision than the currency has, rather than rounding it away', () => {
    expect(costEntry('1500.75', 'JPY')).toEqual({ ok: false, problem: 'tooPrecise' });
    expect(costEntry('45.505', 'GBP')).toEqual({ ok: false, problem: 'tooPrecise' });
  });

  it('refuses an amount too large to be an exact integer', () => {
    expect(costEntry('99999999999999999999', 'GBP')).toEqual({ ok: false, problem: 'badAmount' });
  });
});

describe('the minor-unit table', () => {
  it('answers two for a currency it does not list, which is the standard’s own default', () => {
    expect(minorUnitDigits('GBP')).toBe(2);
    expect(minorUnitDigits('EUR')).toBe(2);
    // Not a currency. The table makes no membership claim; costEntry refuses by shape.
    expect(minorUnitDigits('ZZZ')).toBe(2);
  });

  /*
   * THE WHOLE TABLE, BY VALUE — this is E-052's guard and it is why it is exhaustive.
   *
   * `cost_minor` is written at the scale this table gives and read back at the scale this
   * table gives, and the row records neither. So an edit here silently reinterprets every
   * price already stored for that currency, in the plausible direction, with no error
   * anywhere. A test over a handful of examples would let a change to CLP or IQD through.
   *
   * This cannot migrate data that is already on somebody's phone. What it can do is make the
   * edit impossible to make quietly, so the migration question is asked while there is still
   * somebody there to ask it.
   */
  it('pins every entry, because an edit here reinterprets prices already stored (E-052)', () => {
    const table = {
      BIF: 0,
      CLP: 0,
      DJF: 0,
      GNF: 0,
      ISK: 0,
      JPY: 0,
      KMF: 0,
      KRW: 0,
      PYG: 0,
      RWF: 0,
      UGX: 0,
      UYI: 0,
      VND: 0,
      VUV: 0,
      XAF: 0,
      XOF: 0,
      XPF: 0,
      BHD: 3,
      IQD: 3,
      JOD: 3,
      KWD: 3,
      LYD: 3,
      OMR: 3,
      TND: 3,
      CLF: 4,
      UYW: 4,
    };

    for (const [code, digits] of Object.entries(table))
      expect(`${code}=${String(minorUnitDigits(code))}`).toBe(`${code}=${String(digits)}`);
  });
});

describe('minor units, on the way back out', () => {
  it('renders at the currency’s own precision', () => {
    expect(formatMinor(4550 / 38, 'GBP')).toBe('119.74');
    expect(formatMinor(15000 / 12, 'JPY')).toBe('1250');
    expect(formatMinor(1500 / 4, 'KWD')).toBe('375.000');
  });

  it('rounds only at the display boundary — the stored value stayed exact', () => {
    const answer = costPerWear({ costMinor: 1000, currency: 'GBP', wearCount: 3 });
    if (!answer.known) throw new Error('unreachable');

    expect(answer.minorPerWear).not.toBe(Number(formatMinor(answer.minorPerWear, 'GBP')));
    expect(formatMinor(answer.minorPerWear, 'GBP')).toBe('333.33');
  });
});

/**
 * `minorToMajor` — a stored price back into an editable field (F-122).
 *
 * The round-trip is the assertion, not the string. A rendering that is merely *plausible* still
 * multiplies somebody's coat by a hundred every time they open the screen, and the only claim
 * worth making is that what comes out goes back in unchanged.
 */
describe('a stored price, back into the field it was typed into', () => {
  it('round-trips through costEntry for every exponent the table has', () => {
    const cases: readonly (readonly [number, string])[] = [
      [4550, 'GBP'], // 2 — the default
      [15000, 'JPY'], // 0 — no minor unit at all
      [1500, 'KWD'], // 3 — the deep one
      [5, 'GBP'], // under one major unit: must render 0.05, not .05
      [0, 'GBP'],
      [0, 'JPY'],
      [1, 'KWD'],
      [999999999, 'GBP'],
    ];

    for (const [minor, code] of cases) {
      const back = costEntry(minorToMajor(minor, code), code);
      if (!back.ok) throw new Error(`${code} ${String(minor)} did not parse back`);
      expect(
        `${code} ${String(minor)} -> ${minorToMajor(minor, code)} -> ${String(back.patch.costMinor)}`,
      ).toBe(`${code} ${String(minor)} -> ${minorToMajor(minor, code)} -> ${String(minor)}`);
    }
  });

  /*
   * THE DECOY, and it is the whole reason this function exists rather than a call to
   * `formatMinor`. Both return a string, both take the same two arguments, and both are
   * "the price at the currency's precision" in English. They differ by the currency's own
   * scale — and a screen that used the wrong one would look right until somebody saved.
   */
  it('is NOT formatMinor — they differ by exactly the currency’s scale', () => {
    expect(formatMinor(4550, 'GBP')).toBe('4550.00');
    expect(minorToMajor(4550, 'GBP')).toBe('45.50');

    // And where the currency has no minor unit they agree, which is why one test case could
    // never have told them apart.
    expect(formatMinor(15000, 'JPY')).toBe(minorToMajor(15000, 'JPY'));
  });

  /*
   * THE CASE THAT MAKES "STRING SLICING" A CLAIM RATHER THAN A PREFERENCE.
   *
   * `(7302712423236351 / 100).toFixed(2)` is `73027124232363.52` — off by one minor unit,
   * because the quotient is not representable. Nobody's coat costs this, and that is not the
   * point: without this case the doc comment's reason for not dividing is asserted by the
   * comment alone, and the four other cases here pass against a division either way.
   */
  it('is exact where dividing is not, at the top of the safe range', () => {
    expect(minorToMajor(7302712423236351, 'GBP')).toBe('73027124232363.51');
    expect((7302712423236351 / 100).toFixed(2)).toBe('73027124232363.52');

    const back = costEntry(minorToMajor(7302712423236351, 'GBP'), 'GBP');
    expect(back.ok && back.patch.costMinor).toBe(7302712423236351);
  });

  it('pads to a whole digit, so a value under one major unit is editable', () => {
    // '.05' is what slicing without the pad produces, and costEntry refuses it — the field
    // would open holding text it would not accept back.
    expect(minorToMajor(5, 'GBP')).toBe('0.05');
    expect(costEntry('.05', 'GBP').ok).toBe(false);
  });

  it('renders nothing for a value it could not have produced', () => {
    // The column is INTEGER, so this is the branch that should be unreachable — which is why
    // it is asserted rather than assumed.
    expect(minorToMajor(45.5, 'GBP')).toBe('');
    expect(minorToMajor(Number.NaN, 'GBP')).toBe('');
  });
});
