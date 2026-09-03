/**
 * The reference card — **supplied, never vendored.**
 *
 * [ADR-0085](../../../docs/adr/0085-the-reference-card-is-a-partner-card-and-its-values-are-cited-not-measured.md)
 * closed OQ-3 with a partner card whose values are **cited rather than measured by us**, and
 * attached an obligation this package is built around: *the exact card, its published values
 * and their licence must be confirmed from the vendor's own documentation before any value is
 * committed.*
 *
 * That confirmation has not happened. **So no reference values ship here.** A `ReferenceCard`
 * is an input, carrying its own source, publisher, illuminant, observer and licence — which is
 * also the shape ADR-0085's third obligation requires if the licence forbids redistribution.
 * Building only that path costs nothing and removes the one temptation that would be worst to
 * give in to: writing plausible numbers from memory into the dataset an accuracy claim rests on.
 *
 * ## The illuminant and observer are recorded, not assumed
 *
 * A published patch value means nothing without the conditions it was measured under. D50/2°
 * and D65/2° values for the same physical patch are different numbers, and silently treating
 * one as the other is a wrong answer that looks like a right one. They are carried on the card
 * and reported with the correction, so an audit can see which was used.
 *
 * **This package does not adapt between them.** `@irodora/color-spaces` has `adapt` and it is
 * the only place chromatic adaptation belongs; a second implementation here would be a defect
 * by definition. A caller whose card is D50 and whose pipeline is D65 adapts before calling.
 */

import type { Triple } from '@irodora/color-spaces';

/**
 * Where a card's published values came from.
 *
 * Every field is required. An optional licence is a licence somebody will omit, and the whole
 * point of ADR-0085 is that this dataset carries the same provenance every corpus entry does.
 */
export interface ReferenceProvenance {
  /** The publication the values were read from. A document, not a vibe. */
  readonly source: string;
  /** Who published them. */
  readonly publisher: string;
  /** As the publisher states it — `'D50'`, `'D65'`. Not normalised, not guessed. */
  readonly illuminant: string;
  /** As the publisher states it — `'2deg'`, `'10deg'`. */
  readonly observer: string;
  /** What the terms permit. Recorded so a redistribution question has an answer on file. */
  readonly licence: string;
}

/** One published patch. */
export interface ReferencePatch {
  readonly id: string;
  /**
   * The published value in CIE XYZ, under the card's stated illuminant and observer.
   *
   * XYZ because it is this engine's canonical space and the one every conversion routes
   * through. A vendor publishing Lab or sRGB is converted by the caller, through
   * `@irodora/color-spaces`, so the conversion is the engine's rather than a transcription.
   */
  readonly xyz: Triple;
  /** Zero-based grid position, `[column, row]`, from the card's top-left as printed. */
  readonly at: readonly [number, number];
}

/** A reference card: its grid, its patches, and where its numbers came from. */
export interface ReferenceCard {
  readonly id: string;
  readonly columns: number;
  readonly rows: number;
  readonly patches: readonly ReferencePatch[];
  readonly provenance: ReferenceProvenance;
  /**
   * The white point the patch XYZ values are relative to.
   *
   * **Stated rather than inferred from `provenance.illuminant`.** That field is the
   * publisher's own words — `'D50'`, `'D50/2°'`, `'ICC D50'` — and parsing prose into a
   * tristimulus value is how a card gets silently interpreted under the wrong white. This is
   * the number, and `solveCorrection` REFUSES a card whose white is not the engine's canonical
   * one, with a message naming `adapt` from `@irodora/color-spaces`.
   *
   * Refusing rather than adapting here is deliberate. Chromatic adaptation has a method
   * (Bradford, von Kries, XYZ scaling) and the choice changes the answer; making it silently,
   * inside a correction solver, would bury a colour-science decision where nobody would look
   * for it.
   */
  readonly white: Triple;
  /**
   * How far into each cell to sample, as a fraction of the cell, per side.
   *
   * Patches are printed with borders and a camera has perspective error, so sampling the whole
   * cell reads the gap between patches as part of the colour. `0.25` samples the middle half of
   * each cell in both axes, which is the conventional margin and is deliberately generous: a
   * patch contaminated by its neighbour is a wrong reference value, and a wrong reference value
   * corrupts the whole fit rather than one row of it.
   */
  readonly inset: number;
}

/** Thrown when a card is structurally impossible rather than merely unusual. */
export class CardError extends Error {
  constructor(detail: string) {
    super(`reference card: ${detail}`);
    this.name = 'CardError';
  }
}

/**
 * Check what the type cannot.
 *
 * Called by everything that consumes a card, so there is no path that skips it — the same
 * arrangement `Provenance` uses in `@irodora/color-core`.
 */
export function assertCard(card: ReferenceCard): void {
  if (!Number.isInteger(card.columns) || card.columns < 1)
    throw new CardError(`columns must be a positive integer, got ${String(card.columns)}`);
  if (!Number.isInteger(card.rows) || card.rows < 1)
    throw new CardError(`rows must be a positive integer, got ${String(card.rows)}`);

  if (!(card.inset >= 0 && card.inset < 0.5))
    throw new CardError(
      `inset must be in [0, 0.5), got ${String(card.inset)} — at 0.5 a patch region has no area`,
    );

  for (const component of card.white)
    if (!Number.isFinite(component) || component <= 0)
      throw new CardError(`the white point has a non-positive or non-finite component`);

  if (card.patches.length === 0) throw new CardError('has no patches');

  const seen = new Set<string>();
  const occupied = new Set<string>();
  for (const patch of card.patches) {
    if (seen.has(patch.id)) throw new CardError(`two patches share the id "${patch.id}"`);
    seen.add(patch.id);

    const [column, row] = patch.at;
    if (!Number.isInteger(column) || column < 0 || column >= card.columns)
      throw new CardError(`patch "${patch.id}" sits at column ${String(column)}, outside the grid`);
    if (!Number.isInteger(row) || row < 0 || row >= card.rows)
      throw new CardError(`patch "${patch.id}" sits at row ${String(row)}, outside the grid`);

    const cell = `${String(column)},${String(row)}`;
    if (occupied.has(cell))
      throw new CardError(`patches "${patch.id}" and another both claim cell ${cell}`);
    occupied.add(cell);

    for (const component of patch.xyz)
      if (!Number.isFinite(component))
        throw new CardError(`patch "${patch.id}" has a non-finite XYZ component`);

    // Y is luminance relative to the white point. Negative is not a dark colour, it is a
    // transcription error — and one that would drag the least-squares fit without failing.
    if (patch.xyz[1] < 0)
      throw new CardError(
        `patch "${patch.id}" has negative luminance (Y = ${String(patch.xyz[1])})`,
      );
  }

  for (const [field, value] of Object.entries(card.provenance))
    if (typeof value !== 'string' || value.trim() === '')
      throw new CardError(
        `provenance.${field} is empty. A cited value with no citation is an uncited value ` +
          '(ADR-0085).',
      );

  assertRotationallyDistinguishable(card);
}

/**
 * A card must not look the same upside down.
 *
 * `verifyCard` establishes orientation by asking whether the observed luminances match the
 * card's own arrangement better than its 180° rotation. **If the card's luminance layout is
 * symmetric under that rotation, the question has no answer** — both fit equally, and picking
 * one pairs every patch with the wrong reference value. The correction that follows is built
 * from mismatched pairs and is applied silently to every reading taken with it, which is the
 * exact failure this whole module exists to prevent.
 *
 * `verifyCard` reports `ambiguous` when a partial read makes an asymmetric card look symmetric.
 * This is the other half, and the stronger one: a card that is symmetric **by construction**
 * can never be used safely, so it is refused when it is declared rather than when it is read.
 *
 * The comparison is of Y alone, because Y is what `verifyCard` correlates. A card whose patches
 * differ in hue but not in luminance under rotation is still refused, correctly — the check has
 * to match the evidence the verifier actually uses.
 */
function assertRotationallyDistinguishable(card: ReferenceCard): void {
  const byCell = new Map(
    card.patches.map((patch) => [`${String(patch.at[0])},${String(patch.at[1])}`, patch]),
  );

  for (const patch of card.patches) {
    const mirrored = byCell.get(
      `${String(card.columns - 1 - patch.at[0])},${String(card.rows - 1 - patch.at[1])}`,
    );
    // A cell with no counterpart is itself an asymmetry, and enough of one.
    if (mirrored === undefined) return;
    if (mirrored.xyz[1] !== patch.xyz[1]) return;
  }

  throw new CardError(
    `"${card.id}" has the same luminance layout upside down, so which way up it is facing ` +
      'cannot be established from its patches. A correction solved from it would pair every ' +
      'patch with the wrong published value.',
  );
}
