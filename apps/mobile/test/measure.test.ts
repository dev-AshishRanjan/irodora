/**
 * Colorimeter entry and the ΔE00 table (FR-28, FR-61, F-055).
 *
 * ## What earns this file
 *
 * `parseMeasurement` is the one path in this product where **a typed number becomes a value the
 * claims lint permits the word "measured" beside** (F-025, NFR-21). Everything else somebody
 * types is `declared`. So the cases that matter are not the happy ones — they are the ones
 * where a typo, a blank or an impossible number could become a measurement:
 *
 * | The plausible wrong code | What it would produce |
 * |---|---|
 * | `parseFloat` instead of `Number` | `'12abc'` accepted as 12, **marked reference** |
 * | exclusive range bounds | white and black rejected — the two a professional measures first |
 * | one refusal for all three fields | "invalid input", and three fields to retype |
 * | the reference's origin space on every row | a published value labelled as an instrument reading |
 *
 * **And the fixture has to be able to see them.** The last row above is invisible unless the
 * batch mixes a corpus entry with a typed reading, because a batch of one kind agrees with
 * itself [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
 */

import { fromSpace } from '@irodora/color-core';
import { labToXyz, xyzToLab } from '@irodora/color-spaces';
import { deltaE00 } from '@irodora/color-difference';
import { allEntries, colorFor } from '../src/corpus';
import {
  batchCompare,
  FIELD_BOUNDS,
  parseMeasurement,
  type BatchSample,
  type EntrySpace,
} from '../src/measure';

/** A mid grey-green, well inside every bound. */
const LAB: readonly [string, string, string] = ['52.31', '-8.44', '2.07'];

const parsed = (space: EntrySpace, fields: readonly [string, string, string]) =>
  parseMeasurement(space, fields);

describe('a typed measurement becomes a colour', () => {
  it('is marked reference, which is the word FR-28 uses', () => {
    const result = parsed('lab', LAB);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.color.provenance.source).toBe('reference');
  });

  it('records the space it arrived in, so a table can name it', () => {
    const lab = parsed('lab', LAB);
    const lch = parsed('lch', ['52.31', '8.69', '166.2']);

    if (!lab.ok || !lch.ok) throw new Error('unreachable');
    expect(lab.color.provenance.originSpace).toBe('lab');
    expect(lch.color.provenance.originSpace).toBe('lch');
  });

  it('converts through the engine, not through arithmetic written here', () => {
    const result = parsed('lab', LAB);
    if (!result.ok) throw new Error('unreachable');

    // Asserted against `labToXyz` itself. An inlined conversion in measure.ts fails here rather
    // than agreeing with itself.
    const expected = labToXyz([52.31, -8.44, 2.07]);
    expect(result.color.xyz[0]).toBeCloseTo(expected[0], 12);
    expect(result.color.xyz[1]).toBeCloseTo(expected[1], 12);
    expect(result.color.xyz[2]).toBeCloseTo(expected[2], 12);
  });

  it('keeps the components it was given, so the field can show what was typed', () => {
    const result = parsed('lab', LAB);
    if (!result.ok) throw new Error('unreachable');

    expect(result.components).toEqual([52.31, -8.44, 2.07]);
  });

  it('accepts a negative a* and b*, which is most of the Lab space', () => {
    expect(parsed('lab', ['40', '-60', '-45']).ok).toBe(true);
  });
});

describe('a typed measurement that is refused says which field', () => {
  it('refuses a blank field, and names it', () => {
    expect(parsed('lab', ['', '-8.44', '2.07'])).toEqual({
      ok: false,
      problem: 'blank',
      field: 0,
    });
    expect(parsed('lab', ['52.31', '  ', '2.07'])).toEqual({
      ok: false,
      problem: 'blank',
      field: 1,
    });
  });

  /*
   * THE DECOY FOR `parseFloat`. parseFloat('12abc') is 12 — accepted, and then MARKED
   * REFERENCE, which is the one provenance in this product that licenses the word "measured".
   * Number('12abc') is NaN, which is why the parse uses it.
   */
  it('refuses a number with anything else in it, rather than reading the digits off the front', () => {
    for (const bad of ['12abc', '5,2', '1.2.3', 'fifty', '--3', '', ' ']) {
      const result = parsed('lab', [bad, '0', '0']);
      expect(result.ok).toBe(false);
    }
    expect(parsed('lab', ['12abc', '0', '0'])).toEqual({
      ok: false,
      problem: 'notANumber',
      field: 0,
    });
  });

  it('refuses infinities and NaN, which are numbers that would convert', () => {
    expect(parsed('lab', ['Infinity', '0', '0']).ok).toBe(false);
    expect(parsed('lab', ['NaN', '0', '0']).ok).toBe(false);
  });

  it('refuses a value outside the bound, and names the field', () => {
    expect(parsed('lab', ['101', '0', '0'])).toEqual({
      ok: false,
      problem: 'outOfRange',
      field: 0,
    });
    expect(parsed('lab', ['50', '-200', '0'])).toEqual({
      ok: false,
      problem: 'outOfRange',
      field: 1,
    });
    expect(parsed('lch', ['50', '-1', '0'])).toEqual({
      ok: false,
      problem: 'outOfRange',
      field: 1,
    });
  });

  /*
   * THE DECOY FOR AN EXCLUSIVE BOUND. L* 0 and L* 100 are black and white — the two values a
   * professional measures first when checking an instrument. An off-by-one here rejects both,
   * and every other test in this file still passes.
   */
  it('accepts both ends of every bound, because the bounds are inclusive', () => {
    expect(parsed('lab', ['0', '0', '0']).ok).toBe(true);
    expect(parsed('lab', ['100', '0', '0']).ok).toBe(true);
    for (const [space, bounds] of Object.entries(FIELD_BOUNDS)) {
      for (let i = 0; i < 3; i += 1) {
        const [low, high] = bounds[i]!;
        const atLow: [string, string, string] = ['1', '1', '1'];
        const atHigh: [string, string, string] = ['1', '1', '1'];
        atLow[i] = String(low);
        atHigh[i] = String(high);
        expect(parseMeasurement(space as EntrySpace, atLow).ok).toBe(true);
        expect(parseMeasurement(space as EntrySpace, atHigh).ok).toBe(true);
      }
    }
  });

  it('DECOY — a valid triple still parses, so the refusals discriminate', () => {
    expect(parsed('lab', LAB).ok).toBe(true);
  });
});

describe('the batch table', () => {
  const entries = allEntries().slice(0, 4);
  const reference = colorFor(entries[0]!.entry);

  /**
   * A batch mixing a **published entry** with a **typed reading**.
   *
   * This is the only fixture in which "each row carries its own origin space" and "every row
   * carries the reference's" are different assertions: a corpus entry arrives in `oklch` and a
   * colorimeter reading in `lab`. A batch of one kind agrees with itself and would rate both
   * implementations equally.
   */
  const typed = parsed('lab', LAB);
  if (!typed.ok) throw new Error('the fixture measurement must parse');

  const SAMPLES: readonly BatchSample[] = [
    ...entries.slice(1).map((e, i) => ({
      id: `corpus-${String(i)}`,
      name: e.entry.name.en,
      color: colorFor(e.entry),
    })),
    { id: 'instrument-1', name: 'patch 1', color: typed.color },
  ];

  it('carries every sample’s own origin space, never the reference’s', () => {
    const rows = batchCompare(reference, SAMPLES);
    const spaces = new Map(rows.map((r) => [r.id, r.originSpace]));

    expect(spaces.get('instrument-1')).toBe('lab');
    expect(spaces.get('corpus-0')).toBe('oklch');
    // And the two really are different, or the assertion above is vacuous.
    expect(spaces.get('instrument-1')).not.toBe(spaces.get('corpus-0'));
  });

  it('carries every sample’s own provenance source too', () => {
    const rows = batchCompare(reference, SAMPLES);

    for (const row of rows) expect(row.source).toBe('reference');
  });

  it('is ordered by difference, closest first', () => {
    const rows = batchCompare(reference, SAMPLES);

    for (let i = 1; i < rows.length; i += 1)
      expect(rows[i]!.deltaE00).toBeGreaterThanOrEqual(rows[i - 1]!.deltaE00);
  });

  it('breaks a tie on id, so the order does not follow the caller’s array', () => {
    const same = colorFor(entries[1]!.entry);
    const forward = batchCompare(reference, [
      { id: 'b', name: 'b', color: same },
      { id: 'a', name: 'a', color: same },
    ]);
    const reversed = batchCompare(reference, [
      { id: 'a', name: 'a', color: same },
      { id: 'b', name: 'b', color: same },
    ]);

    expect(forward.map((r) => r.id)).toEqual(['a', 'b']);
    expect(reversed.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('reports zero against itself', () => {
    const rows = batchCompare(reference, [{ id: 'self', name: 'self', color: reference }]);

    expect(rows[0]!.deltaE00).toBeCloseTo(0, 12);
  });

  it('reports the engine’s ΔE00, not a number computed here', () => {
    const rows = batchCompare(reference, SAMPLES);
    const row = rows.find((r) => r.id === 'instrument-1');

    expect(row?.deltaE00).toBeCloseTo(
      deltaE00(xyzToLab(reference.xyz), xyzToLab(typed.color.xyz)),
      12,
    );
  });

  it('returns each sample’s Lab and LCh, so a row is numeric and not only a swatch', () => {
    const rows = batchCompare(reference, SAMPLES);

    for (const row of rows) {
      expect(row.lab).toHaveLength(3);
      expect(row.lch).toHaveLength(3);
      for (const v of [...row.lab, ...row.lch]) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('returns nothing for an empty batch rather than throwing', () => {
    expect(batchCompare(reference, [])).toEqual([]);
  });
});

describe('the provenance a hex still gets is unchanged', () => {
  /*
   * The boundary this feature must not blur. A typed L*a*b* from an instrument is `reference`;
   * a colour somebody picked is not. If this ever fails, the claims lint's guarantee — that
   * "measured" may only appear near `reference` or `calibrated` — has quietly become false.
   */
  it('is declared, not reference', () => {
    const declared = fromSpace('srgb', [0.2, 0.3, 0.55], { source: 'declared', confidence: 1 });

    const measured = parsed('lab', LAB);
    if (!measured.ok) throw new Error('unreachable');

    expect(declared.provenance.source).toBe('declared');
    expect(measured.color.provenance.source).toBe('reference');
    // The two paths must not converge. If they ever do, one of them is lying about the other.
    expect(declared.provenance.source).not.toBe(measured.color.provenance.source);
  });
});
