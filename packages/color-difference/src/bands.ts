/**
 * The words beside a ΔE00 — one table (F-222, [ADR-0125](../../../docs/adr/0125-a-delta-e00-is-described-by-one-table-of-four-bands-anchored-on-published-thresholds.md)).
 *
 * `04` and `08` print a word beside a ΔE00 and beside its lightness, chroma and hue components. This
 * is the one table every such word comes from, and it holds bands, not words: the words live in
 * the app's catalogues, in both languages, keyed by these ids.
 *
 * ## The edges, and exactly what each rests on
 *
 * - **0.8 and 1.8** are the 50:50 % perceptibility and acceptability thresholds in ΔE00 that
 *   Paravina, Pérez & Ghinea's 2019 review reports (J Esthet Restor Dent 31(2):103–112), measured on
 *   dental ceramic by 175 observers under simulated clinical conditions.
 * - **5** is the top of the range CIEDE2000 was built for (0–5 CIELAB units), a secondary statement
 *   of the formula's reference range — not a threshold of perception.
 *
 * So a band describes the PRINTED NUMBER, never what a given person will see, and never a garment's
 * true distance: a camera estimate carries its own uncertainty.
 *
 * ## A value belongs to the highest band whose lower edge it reaches
 *
 * Each edge belongs to the band above it, and a total is banded as it is PRINTED
 * ({@link printedDeltaE00}), so the figure and the word beside it can never disagree — a ΔE00 shown
 * as 0.80 is never described as below 0.8.
 */

/** The four bands, lowest first. */
export type DeltaE00Band = 'veryClose' | 'close' | 'perceptible' | 'clear';

/** Each band and the ΔE00 it starts at. The table ADR-0125 states; `deltae00-bands.golden.json` holds the edges. */
export const DELTA_E00_BANDS = [
  { band: 'veryClose', from: 0 },
  { band: 'close', from: 0.8 },
  { band: 'perceptible', from: 1.8 },
  { band: 'clear', from: 5 },
] as const satisfies readonly { readonly band: DeltaE00Band; readonly from: number }[];

/** The decimals every screen prints a ΔE00 at. */
export const DELTA_E00_DISPLAY_DECIMALS = 2;

/** A ΔE00 must be a finite, non-negative number: anything else is a defect upstream, not a band. */
function requireMagnitude(value: number, what: string): void {
  if (!Number.isFinite(value) || value < 0)
    throw new TypeError(`${what}: expected a finite ΔE00 ≥ 0, got ${String(value)}`);
}

/** A ΔE00 as the screen prints it: rounded to {@link DELTA_E00_DISPLAY_DECIMALS}. */
export function printedDeltaE00(value: number): number {
  requireMagnitude(value, 'printedDeltaE00');
  return Number(value.toFixed(DELTA_E00_DISPLAY_DECIMALS));
}

/**
 * The band a ΔE00 magnitude is in. Band a printed total, `deltaE00Band(printedDeltaE00(d))`; a
 * component is banded on the magnitude of its weighted term ({@link axisReading}).
 */
export function deltaE00Band(magnitude: number): DeltaE00Band {
  requireMagnitude(magnitude, 'deltaE00Band');
  let band: DeltaE00Band = DELTA_E00_BANDS[0].band;
  for (const edge of DELTA_E00_BANDS) if (magnitude >= edge.from) band = edge.band;
  return band;
}

/** Which way a component moved: up, down, or not at all as printed. */
export type AxisDirection = 'more' | 'less' | 'level';

/** A component's reading: its band, and its direction. */
export interface AxisReading {
  readonly band: DeltaE00Band;
  readonly direction: AxisDirection;
}

/**
 * The reading beside one component — lightness, chroma or hue.
 *
 * - The **band** is the magnitude of the component's weighted CIEDE2000 term (`deltaE00Terms`), which
 *   is in ΔE00's own unit, so the component uses the same table as the total. Banding a raw ΔL\* or a
 *   hue angle against ΔE00 edges would be one table over three units.
 * - The **direction** follows the sign of the FIGURE PRINTED beside it (ADR-0119): ΔC′ and ΔC\* can
 *   disagree in sign near neutral, and the word must not contradict the figure. A printed zero,
 *   either sign, is `level`.
 */
export function axisReading(printedFigure: number, weightedTerm: number): AxisReading {
  if (!Number.isFinite(printedFigure))
    throw new TypeError(`axisReading: expected a finite figure, got ${String(printedFigure)}`);
  if (!Number.isFinite(weightedTerm))
    throw new TypeError(`axisReading: expected a finite term, got ${String(weightedTerm)}`);
  const direction: AxisDirection =
    printedFigure > 0 ? 'more' : printedFigure < 0 ? 'less' : 'level';
  return { band: deltaE00Band(Math.abs(weightedTerm)), direction };
}
