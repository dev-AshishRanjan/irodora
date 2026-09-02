/**
 * Colorimeter entry and the ΔE00 table (FR-28, FR-61, F-055).
 *
 * > *Accepts colorimeter values and marks the resulting profile `reference`.*
 * > *Numeric values are shown by default rather than only swatches, with the space each was
 * > computed in named beside it.*
 *
 * ## A typed L\*a\*b\* triple is already a first-class colour here
 *
 * `fromSpace('lab', [l, a, b], …)` routes through `labToXyz` and records `originSpace: 'lab'`.
 * So the whole of FR-28 is one engine call with a validated input, and everything in this file
 * is either that validation or the table it feeds.
 *
 * ## Why `reference` and not `declared`
 *
 * The claims lint binds language to provenance: **only `reference` and `calibrated` may appear
 * near the word "measured"** (F-025, NFR-21, ADR-0031). FR-28 names `reference` for this path,
 * and it earns it — an instrument produced the number, which is a different kind of fact from
 * a hex somebody liked the look of. `unsafeFromHex` — the unchecked path in
 * `@irodora/color-core` — still records `declared`, and is not called from here.
 *
 * That is also why the parse is strict. A `reference` value is the one thing in this product
 * allowed to be called a measurement, so a typo must not become one.
 *
 * ## No tolerance, no pass/fail, no verdict
 *
 * A calibration table with green and red rows needs a threshold, and any threshold here would
 * be **ours** rather than the standard the person is working to. The table reports ΔE00 and
 * orders by it. The judgement is theirs — the same reason the shopping check refuses to say
 * *buy it*.
 */

import { deltaE00 } from '@irodora/color-difference';
import { fromSpace, type Color } from '@irodora/color-core';
import { xyzToLab, xyzToLch, type Triple } from '@irodora/color-spaces';

/** The two spaces an instrument reports in. Both are CIE, both are D65 here. */
export const ENTRY_SPACES = ['lab', 'lch'] as const;
export type EntrySpace = (typeof ENTRY_SPACES)[number];

/** Why a typed measurement was refused. */
export type MeasurementProblem = 'blank' | 'notANumber' | 'outOfRange';

/** Which of the three fields the problem is in. */
export type FieldIndex = 0 | 1 | 2;

export type ParsedMeasurement =
  | {
      readonly ok: true;
      readonly color: Color;
      readonly components: Triple;
      readonly space: EntrySpace;
    }
  | { readonly ok: false; readonly problem: MeasurementProblem; readonly field: FieldIndex };

/**
 * The bounds each field is checked against.
 *
 * **L\* is defined on [0, 100] and the bound is the definition.** The rest are sanity bounds
 * and are named as such: a\* and b\* have no formal limit — the gamut of real surfaces reaches
 * roughly ±128 and the encoding conventions use that — so a value outside is a typo rather than
 * a colour. Chroma cannot be negative; hue is an angle and 360 is 0.
 *
 * Inclusive at both ends. An exclusive comparison here is the off-by-one that rejects white and
 * black, which are the two values a professional is most likely to measure first.
 */
export const FIELD_BOUNDS: Readonly<Record<EntrySpace, readonly (readonly [number, number])[]>> = {
  lab: [
    [0, 100],
    [-128, 128],
    [-128, 128],
  ],
  lch: [
    [0, 100],
    [0, 200],
    [0, 360],
  ],
};

/**
 * A typed triple as a colour, or the reason it is not one.
 *
 * The refusal names **which field**, because "invalid input" on a three-field form is the
 * message that makes somebody retype all three to find out which one it meant.
 */
export function parseMeasurement(
  space: EntrySpace,
  fields: readonly [string, string, string],
): ParsedMeasurement {
  const bounds = FIELD_BOUNDS[space];
  const values: number[] = [];

  for (let i = 0; i < 3; i += 1) {
    const field = i as FieldIndex;
    const raw = (fields[i] ?? '').trim();
    if (raw === '') return { ok: false, problem: 'blank', field };

    /*
     * `Number(raw)` and not `parseFloat`: parseFloat('12abc') is 12, which would accept a typo
     * silently and mark the result a MEASUREMENT. Number('12abc') is NaN. The strictness is the
     * point — see the header.
     */
    const value = Number(raw);
    if (!Number.isFinite(value)) return { ok: false, problem: 'notANumber', field };

    const [low, high] = bounds[i] ?? [0, 0];
    if (value < low || value > high) return { ok: false, problem: 'outOfRange', field };
    values.push(value);
  }

  const components: Triple = [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0];

  return {
    ok: true,
    space,
    components,
    color: fromSpace(space, components, {
      // FR-28's word. An instrument produced this; the claims lint permits "measured" beside it.
      source: 'reference',
      // Not a probability, and not a claim about the instrument. A typed reference value is
      // exactly what the person said it was — the same reasoning `readManual` gives.
      confidence: 1,
    }),
  };
}

/** One colour in a batch, with whatever the caller calls it. */
export interface BatchSample {
  readonly id: string;
  readonly name: string;
  readonly color: Color;
}

/** One row of the table. Every number carries the space it was computed in. */
export interface BatchRow {
  readonly id: string;
  readonly name: string;
  /** CIELAB (D65). The ranking authority, and it is defined there and nowhere else. */
  readonly deltaE00: number;
  /** The sample's own Lab, computed now from its canonical XYZ. */
  readonly lab: Triple;
  /** The sample's own LCh. */
  readonly lch: Triple;
  /**
   * The space this sample ARRIVED in — the sample's own, never the reference's.
   *
   * A corpus entry arrives in `oklch` and a colorimeter reading in `lab`. Showing the
   * reference's space against every row would label a published value as something it is not,
   * which is precisely what FR-61's *"named beside it"* exists to prevent.
   */
  readonly originSpace: Color['provenance']['originSpace'];
  readonly source: Color['provenance']['source'];
}

/**
 * Every sample against one reference, ordered by difference.
 *
 * **Ties break on id.** `sort` is stable, so without it two identical differences come back in
 * the order the caller happened to build the array — which changes the day somebody adds a
 * patch, and makes a table that is supposed to be a measurement look like it moved.
 */
export function batchCompare(
  reference: Color,
  samples: readonly BatchSample[],
): readonly BatchRow[] {
  const referenceLab = xyzToLab(reference.xyz);

  return samples
    .map((sample): BatchRow => {
      const lab = xyzToLab(sample.color.xyz);
      return {
        id: sample.id,
        name: sample.name,
        deltaE00: deltaE00(referenceLab, lab),
        lab,
        lch: xyzToLch(sample.color.xyz),
        originSpace: sample.color.provenance.originSpace,
        source: sample.color.provenance.source,
      };
    })
    .sort((x, y) => x.deltaE00 - y.deltaE00 || x.id.localeCompare(y.id));
}
