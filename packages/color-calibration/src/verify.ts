/**
 * Is a card actually there, and is it the right way up? — answered from the VALUES.
 *
 * ## Why not edge detection
 *
 * FR-16 says *detect the card*. The obvious reading is a quad detector, and it is the wrong
 * tool for the risk: a mis-detected card still produces a **correction**, and a wrong
 * correction is then applied silently to every reading taken with it. The person aligns the
 * card to an on-screen guide, which supplies four corners **without the failure mode a detector
 * has** — nobody here has measured one against the other, and the claim being made is about the
 * shape of the failure rather than about accuracy. What remains is to establish that a card is
 * in that rectangle at all.
 *
 * That is answerable from the patches themselves. A reference card's whole purpose is that its
 * patches have **known relative values** — so if what was read reproduces the publisher's own
 * ordering, something card-shaped and card-coloured is there. A hand, a table, a wall or a
 * frame of noise does not, and neither does a card upside down.
 *
 * ## The threshold is stated in standard deviations, not chosen by taste
 *
 * Spearman's ρ between two independent random orderings of `n` items has variance exactly
 * `1/(n−1)`. The floor here is **3σ of that null distribution**, capped at 0.9 — so a 24-patch
 * card must clear ρ ≈ 0.6255. Simulated over 200 000 pure-noise frames against a 24-patch card,
 * that admits **0.072 %** of them, so the normal approximation is slightly conservative here.
 *
 * **THE CAP RAISES ρ AND LOWERS THE EVIDENCE**, and an earlier draft of this comment claimed the
 * opposite. ρ = 0.9 at n = 6 is 0.9·√5 = **2.0σ**; ρ = 0.6255 at n = 24 is 3σ. So a small card is
 * admitted on roughly 25× weaker evidence, not stronger — the cap exists because the derived
 * floor exceeds 1 below n = 10 and the check would otherwise be unsatisfiable, and
 * `MINIMUM_VERIFIABLE_PATCHES` is what actually bounds the damage. Stated plainly because "fewer
 * patches means a stricter bar" is exactly the sort of sentence that later justifies relaxing a
 * threshold.
 *
 * A number with a derivation can be argued with. `0.8 because it felt right` cannot
 * ([ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md) is the same instinct applied
 * to copy).
 *
 * ## This is a PER-DECISION bar, and a viewfinder polls
 *
 * 3σ is the right threshold for one judgement. At 30 fps a 0.072 % per-frame false-accept rate
 * is a **6.3 % chance within three seconds** of pointing at noise. Whatever wires this to a live
 * preview owes an N-consecutive-frames rule or an equivalent adjustment — that is **F-135**, and
 * it is written down here because the number that makes it necessary is here.
 *
 * ## Rank, not distance
 *
 * The comparison is of **order**, not of magnitude — because the uncorrected camera response is
 * exactly what has not been solved for yet, and comparing luminances directly would fail every
 * card that needs correcting, which is all of them.
 *
 * **The invariance is exact for a COMMON monotone map** — exposure, gamma, a tone curve. It is
 * NOT exact for per-channel gains: luminance mixes channels at 0.2126/0.7152/0.0722, so a white
 * balance shift can in principle reorder two chromatic patches of similar Y. Measured against
 * the constructed card, it survives far more than the theory guarantees — a 10:1 red-to-blue
 * gain still gives ρ = 0.91 against a floor of 0.6255 — but "untouched" was too strong and is
 * now the thing `verify.test.ts` tests at that ratio rather than at a mild cast.
 */

import {
  displayP3ToLinearP3,
  linearP3ToXyz,
  linearSrgbToXyz,
  srgbToLinearSrgb,
  type Triple,
} from '@irodora/color-spaces';

import { assertCard, type ReferenceCard } from './card.js';
import type { Observation, ObservedSpace } from './solve.js';

/** Below this many patches the rank statistic says too little to be worth reporting. */
export const MINIMUM_VERIFIABLE_PATCHES = 6;

/** The cap on the derived floor. See the note above on why it is a cap and not a constant. */
export const MAXIMUM_REQUIRED_CORRELATION = 0.9;

/** What the values say about the card. */
export interface CardVerification {
  readonly ok: boolean;
  /**
   * `upright` · `rotated` (180° round) · `ambiguous` (both fit equally — see below) ·
   * `unrecognised` (nothing card-like was read).
   */
  readonly orientation: 'upright' | 'rotated' | 'ambiguous' | 'unrecognised';
  /** Spearman ρ for the card as given. */
  readonly correlation: number;
  /** Spearman ρ if the card were turned 180°. */
  readonly rotatedCorrelation: number;
  /** The floor this card had to clear, derived from its patch count. */
  readonly required: number;
  /** What to do about it — empty when `ok`. */
  readonly instruction: string;
}

/** The floor for `n` patches: 3σ of the null distribution, capped. */
export function requiredCorrelation(patchCount: number): number {
  if (patchCount < 2) return MAXIMUM_REQUIRED_CORRELATION;
  return Math.min(MAXIMUM_REQUIRED_CORRELATION, 3 / Math.sqrt(patchCount - 1));
}

/** Fractional ranks, ties averaged. */
function ranks(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index }));
  order.sort((a, b) => a.value - b.value);

  const result = new Array<number>(values.length).fill(0);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1]?.value === order[start]?.value) end += 1;
    // Ties share the average of the ranks they span. Without this a card with two identical
    // greys would get an arbitrary order between them and a correlation that depends on sort
    // stability rather than on the data.
    const shared = (start + end) / 2 + 1;
    for (let i = start; i <= end; i += 1) {
      const entry = order[i];
      if (entry !== undefined) result[entry.index] = shared;
    }
    start = end + 1;
  }
  return result;
}

/** Pearson correlation. Returns 0 when either side has no spread — no order, no evidence. */
function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = (a[i] ?? 0) - meanA;
    const db = (b[i] ?? 0) - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }

  const denominator = Math.sqrt(varianceA * varianceB);
  return denominator === 0 ? 0 : covariance / denominator;
}

/** Spearman's ρ — Pearson on the ranks. */
export function spearman(a: readonly number[], b: readonly number[]): number {
  return pearson(ranks(a), ranks(b));
}

/** Relative luminance of an observation, in linear light. */
function luminance(rgb: Triple, space: ObservedSpace): number {
  if (space === 'display-p3') return linearP3ToXyz(displayP3ToLinearP3(rgb))[1];
  return linearSrgbToXyz(space === 'linear' ? rgb : srgbToLinearSrgb(rgb))[1];
}

/**
 * Check that the observations look like this card.
 *
 * Reports rather than throws: "no card in frame" is the ordinary state of a viewfinder, not an
 * exceptional one, and a caller polling frames should not be catching exceptions to find out.
 */
export function verifyCard(
  observations: readonly Observation[],
  card: ReferenceCard,
  space: ObservedSpace,
): CardVerification {
  assertCard(card);

  const byId = new Map(card.patches.map((patch) => [patch.id, patch]));
  const observed: number[] = [];
  const reference: number[] = [];
  const cells = new Map<string, number>();

  /*
   * A non-finite component or a repeated patch is DROPPED rather than used.
   *
   * `solveCorrection` throws on both; this one reports, so the equivalent is to not count them.
   * Neither is harmless: NaN sorts to a spec-defined position and yields a correlation derived
   * from garbage that happens to fall below the floor, and a duplicate adds a perfectly
   * concordant pair that inflates ρ. Both would be numbers about something other than the card.
   */
  const counted = new Set<string>();
  for (const observation of observations) {
    const patch = byId.get(observation.id);
    if (patch === undefined) continue;
    if (counted.has(observation.id)) continue;
    if (!observation.rgb.every((component) => Number.isFinite(component))) continue;
    counted.add(observation.id);
    cells.set(`${String(patch.at[0])},${String(patch.at[1])}`, observed.length);
    observed.push(luminance(observation.rgb, space));
    reference.push(patch.xyz[1]);
  }

  const required = requiredCorrelation(observed.length);

  if (observed.length < MINIMUM_VERIFIABLE_PATCHES)
    return {
      ok: false,
      orientation: 'unrecognised',
      correlation: 0,
      rotatedCorrelation: 0,
      required,
      instruction:
        `Only ${String(observed.length)} of the card's patches were read. Fit the whole card ` +
        'inside the guide.',
    };

  const correlation = spearman(observed, reference);

  /*
   * The same comparison with the card's grid turned 180°. A card upside down still produces a
   * strong correlation against ITS OWN rotated arrangement, which is how the two cases are
   * told apart — a low ρ alone cannot distinguish "wrong way up" from "no card at all", and
   * those need different instructions.
   */
  const rotatedObserved: number[] = [];
  const rotatedReference: number[] = [];
  for (const [position, observation] of [...counted].entries()) {
    const patch = byId.get(observation);
    if (patch === undefined) continue;
    const mirrored = `${String(card.columns - 1 - patch.at[0])},${String(card.rows - 1 - patch.at[1])}`;
    const index = cells.get(mirrored);
    /*
     * A patch whose mirrored cell was NOT read contributes to neither vector.
     *
     * The first draft substituted the patch's own reference value, which drags
     * `rotatedCorrelation` toward `correlation` on a partial read — and since the two are now
     * compared rather than tested in order, that bias could turn a half-read upright card into
     * "turn it around". Dropping the pair says less rather than something wrong.
     */
    if (index === undefined) continue;
    rotatedObserved.push(observed[position] ?? 0);
    rotatedReference.push(reference[index] ?? patch.xyz[1]);
  }
  const rotatedCorrelation =
    rotatedObserved.length < MINIMUM_VERIFIABLE_PATCHES
      ? 0
      : spearman(rotatedObserved, rotatedReference);

  /*
   * THE TWO ARE COMPARED, NOT TESTED IN ORDER — and the first draft of this function tested
   * `correlation >= required` first and never compared them at all.
   *
   * A card whose luminance layout happens to be symmetric under 180° rotation clears the floor
   * BOTH ways round. Accepting the upright reading because it was checked first pairs every
   * patch with the wrong reference value and hands `solveCorrection` a matrix built from it —
   * which is precisely the silent wrong correction this module exists to prevent, arriving
   * through the module itself. `assertCard` now refuses such a card up front; this is the
   * second line, for the case where a partial read makes an asymmetric card look symmetric.
   */
  const upright = correlation >= required;
  const upsideDown = rotatedCorrelation >= required;

  if (upright && upsideDown && correlation === rotatedCorrelation)
    return {
      ok: false,
      orientation: 'ambiguous',
      correlation,
      rotatedCorrelation,
      required,
      instruction:
        'What was read fits this card equally well either way up, so which way it is facing ' +
        'cannot be established. Check that the whole card is in the guide.',
    };

  if (upright && correlation >= rotatedCorrelation)
    return {
      ok: true,
      orientation: 'upright',
      correlation,
      rotatedCorrelation,
      required,
      instruction: '',
    };

  if (upsideDown)
    return {
      ok: false,
      orientation: 'rotated',
      correlation,
      rotatedCorrelation,
      required,
      instruction: 'The card is upside down. Turn it around.',
    };

  return {
    ok: false,
    orientation: 'unrecognised',
    correlation,
    rotatedCorrelation,
    required,
    instruction:
      'What is in the guide does not read like this card. Check that the whole card is inside ' +
      'it and that nothing is casting a shadow across it.',
  };
}
