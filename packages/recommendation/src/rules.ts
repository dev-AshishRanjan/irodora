/**
 * The rule set: what a score weighs, and how far off an axis a colour may sit before it stops
 * counting.
 *
 * ## Nothing here ships a default, and that is the point
 *
 * `scoreColor` **requires** a `RuleSet`. There is no `DEFAULT_RULES` export and there must not
 * be one, because FR-67 says weights are content:
 *
 * > *Changing a weight changes rankings without a code change; every change creates a version.*
 *
 * A default in this file would be a weight living in code, in the one place F-029 would have to
 * find it, and [E-009](../../../.harness/state/effects.json) — *"rule weights change every
 * answer without a deploy"* — would be false the day it was written. The tests build their own
 * fixture; F-029 will build one from `content/rules`.
 *
 * ## `parseRuleSet` is what makes the score's range a property
 *
 * The score is `100 × Σ(weight × fit)` with every fit in [0,1]. **If the weights sum to 1 that
 * is in [0,100] by construction** — no clamp, no `Math.min(100, …)`. A clamp would turn a
 * defect in the weights into a plausible number at the boundary, which is the same failure as
 * an accuracy claim with nothing behind it. So the validator refuses anything else, and the
 * range in FR-29 becomes a consequence rather than an assertion.
 */

import { SCORE_FACTORS, type ScoreFactor } from './profile.js';

export class RuleError extends Error {
  constructor(detail: string) {
    super(`rules: ${detail}`);
    this.name = 'RuleError';
  }
}

/**
 * How far outside a profile's range a colour can sit before its fit reaches zero.
 *
 * In OKLCh units on each axis. **Conventions, not measurements** (NFR-2) — they say how quickly
 * "outside your range" becomes "not for you", and nobody has measured that. They are in the
 * rule set rather than in code so F-029 can version them with the weights they travel with.
 */
export interface Falloff {
  readonly lightness: number;
  readonly chroma: number;
}

/**
 * The reference hues for warm and cool, in OKLCh degrees.
 *
 * **A product convention, not colour science.** There is no published boundary at which a hue
 * becomes warm; these are the two poles the temperature axis is measured between, and a colour
 * equidistant from both scores as neither. Versioned with the rules for exactly that reason —
 * a claim nobody can cite should at least be one somebody can change without a deploy.
 */
export interface TemperaturePoles {
  readonly warm: number;
  readonly cool: number;
}

export interface RuleSet {
  /** The version this rule set was published as. Recorded in every score it produces. */
  readonly versionId: string;
  /** One weight per factor. **They sum to 1**, and `parseRuleSet` is what enforces it. */
  readonly weights: Readonly<Record<ScoreFactor, number>>;
  readonly falloff: Falloff;
  readonly poles: TemperaturePoles;
}

/** `2026.08.1` and nothing looser. A version that does not sort is not a version. */
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

/**
 * How far the weights may sum from 1 before the set is refused.
 *
 * Not zero: `0.4 + 0.3 + 0.2 + 0.1` is `0.9999999999999999` in binary floating point, and a
 * validator that demanded exact equality would reject the most obvious weight set anybody would
 * write. The tolerance is small enough that no editorial mistake fits inside it — a weight typed
 * as `0.35` instead of `0.3` is off by 350 times this.
 */
export const WEIGHT_TOLERANCE = 1e-9;

/**
 * Validate a rule set, or throw naming the field.
 *
 * Returns the value so a caller cannot hold an unvalidated one by accident — the same move
 * `parsePalette` makes, and for the same reason: *"was this checked?"* should not be a question
 * anybody has to ask.
 */
export function parseRuleSet(value: unknown, where: string): RuleSet {
  if (typeof value !== 'object' || value === null)
    throw new RuleError(`${where}: expected an object`);
  const o = value as Record<string, unknown>;

  const versionId = o['versionId'];
  if (typeof versionId !== 'string' || !VERSION.test(versionId))
    throw new RuleError(
      `${where}: versionId must be a dotted version; got ${JSON.stringify(versionId)}`,
    );

  const weights = o['weights'];
  if (typeof weights !== 'object' || weights === null)
    throw new RuleError(`${where}: weights must be an object`);
  const w = weights as Record<string, unknown>;

  // Unknown keys are REFUSED rather than ignored. A weight for a factor the engine does not
  // score is a decision somebody made that has no effect, and silently dropping it would make
  // an editor's change appear to do nothing with no way to find out why.
  for (const key of Object.keys(w))
    if (!(SCORE_FACTORS as readonly string[]).includes(key))
      throw new RuleError(
        `${where}: weights.${key} is not a factor this engine scores ` +
          `(${SCORE_FACTORS.join(', ')})`,
      );

  let total = 0;
  const resolved: Record<string, number> = {};
  for (const factor of SCORE_FACTORS) {
    const weight = w[factor];
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1)
      throw new RuleError(
        `${where}: weights.${factor} must be a number in [0,1]; got ${JSON.stringify(weight)}`,
      );
    resolved[factor] = weight;
    total += weight;
  }
  if (Math.abs(total - 1) > WEIGHT_TOLERANCE)
    throw new RuleError(
      `${where}: weights sum to ${String(total)}, not 1. A score is 100 x the weighted sum of ` +
        'fits in [0,1], so weights that do not sum to 1 do not produce a score in [0,100] — ' +
        'and clamping would hide that rather than fix it.',
    );

  const falloffRaw = requireObject(o['falloff'], `${where}: falloff`);
  const polesRaw = requireObject(o['poles'], `${where}: poles`);

  return {
    versionId,
    weights: resolved as Record<ScoreFactor, number>,
    falloff: {
      lightness: positive(falloffRaw['lightness'], `${where}: falloff.lightness`),
      chroma: positive(falloffRaw['chroma'], `${where}: falloff.chroma`),
    },
    poles: {
      warm: angle(polesRaw['warm'], `${where}: poles.warm`),
      cool: angle(polesRaw['cool'], `${where}: poles.cool`),
    },
  };
}

/** Exported for `weights.ts`, which parses the same shapes. Not re-exported from the index. */
export function requireObject(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) throw new RuleError(`${where}: expected object`);
  return value as Record<string, unknown>;
}

/**
 * A positive number.
 *
 * Zero is refused, not defaulted: a falloff of zero divides, and it would make every colour one
 * step outside a range score exactly 0 — a cliff nobody chose, produced by a field somebody
 * left blank.
 */
function positive(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw new RuleError(`${where} must be a positive number; got ${JSON.stringify(value)}`);
  return value;
}

/** An angle in [0,360). */
function angle(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 360)
    throw new RuleError(`${where} must be an angle in [0,360); got ${JSON.stringify(value)}`);
  return value;
}
