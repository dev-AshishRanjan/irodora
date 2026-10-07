/**
 * A reading's confidence, in its one display format (F-222, [ADR-0124](../../../docs/adr/0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md)).
 *
 * `provenance.confidence` ∈ [0, 1] is *"a bounded quality signal from stated inputs — not a
 * probability"* (`@irodora/color-core`): the lowest of the ceilings the colour space, the light and
 * the capture's quality impose. `03` prints it *95% Confidence*. Every rendering of it goes through
 * here, and `apps/mobile/test/confidence-format.test.ts` refuses a second format anywhere in the app
 * or this package.
 *
 * ## Floored, with a guard
 *
 * The percentage is FLOORED, so it never shows more confidence than the value holds by more than the
 * guard below — 0.9999 is 99, never 100. And the floor carries a guard of 10⁻⁹, because float64 cannot
 * hold most two-decimal confidences: 0.57 × 100 is 56.99999999999999, and a bare floor would print 56
 * for a value its author wrote as 0.57. The guard rounds up only a value within 10⁻⁹ of the next whole
 * percent — far below any difference a ceiling produces, far above the error of one multiplication.
 */

import type { Script } from './layout.js';

/** The guard: one multiplication's float error is ~10⁻¹⁴ at this scale; a real difference is ≥ 10⁻². */
const FLOOR_GUARD = 1e-9;

/** A fraction in [0, 1] as a whole percentage, floored (see the header). */
export function floorPercent(fraction: number): number {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1)
    throw new RangeError(`floorPercent: expected a fraction in [0, 1], got ${String(fraction)}`);
  return Math.min(100, Math.floor(fraction * 100 + FLOOR_GUARD));
}

/** A provenance confidence as a whole percentage. */
export function confidencePercent(confidence: number): number {
  return floorPercent(confidence);
}

/**
 * A provenance confidence as printed: *95% Confidence* in Latin script, as `03` draws it, and
 * 信頼度95% in Japanese. `word` is the catalogue's (`confidence.word`), so the product's copy stays
 * in the catalogue and only the arrangement is fixed here.
 */
export function confidenceText(confidence: number, word: string, script: Script): string {
  const figure = `${String(confidencePercent(confidence))}%`;
  return script === 'japanese' ? `${word}${figure}` : `${figure} ${word}`;
}
