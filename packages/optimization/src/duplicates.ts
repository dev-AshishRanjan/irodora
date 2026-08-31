/**
 * Duplicate detection (FR-44, F-049).
 *
 * > *Flags items within ΔE00 5 in the same category, showing the measured difference.*
 *
 * ## Pairwise, and the optimisation somebody will reach for is wrong
 *
 * The obvious speed-up is a spatial index over the colours. **It cannot be correct:** ΔE00
 * violates the triangle inequality, so any structure that prunes by "this is far from the
 * centroid, therefore far from everything inside" ranks subtly and silently wrong
 * ([[deltae00-is-not-a-metric-and-cannot-be-indexed]]).
 *
 * A wardrobe has tens of garments and a category has fewer. O(n²) within a category is nothing,
 * and the alternative is not faster-but-approximate — it is **wrong**.
 *
 * ## The difference is returned, never a boolean
 *
 * *"Showing the measured difference"* is half the criterion, and a `boolean` would satisfy the
 * first half while making the second unimplementable one layer up. The same reason F-045 ranks
 * on the score object and F-048 carries its threshold: report the measurement, not the verdict
 * drawn from it.
 */

import { deltaE00 } from '@irodora/color-difference';
import { xyzToLab } from '@irodora/color-spaces';
import type { Color } from '@irodora/color-core';

/**
 * The distance below which two items in one category are the same thing (FR-44).
 *
 * **The requirement's number, not a judgement.** Unlike F-048's `COVERAGE_THRESHOLD`, which had
 * to be chosen and argued for, this comes straight from FR-44 — so it is named and exported to
 * stop it being mistaken for a knob.
 *
 * **Strict.** FR-44 says *"within ΔE00 < 5"*; the acceptance criterion says *"within ΔE00 5"*,
 * which is ambiguous, and the PRD is the tie-break. Exactly 5 is NOT a duplicate, and a test
 * asserts the boundary so the choice is visible rather than incidental.
 */
export const DUPLICATE_DELTA_E = 5;

/** One item as duplicate detection sees it. */
export interface DuplicateCandidate {
  readonly id: string;
  /**
   * The garment's own type — *"jumper"*, not *"top"*.
   *
   * FR-44 says *"the same category"*, and a slot is too coarse: a jumper and a coat are both
   * `top` and are plainly not duplicates. This is free text because FR-39 asks for two fields
   * and not a taxonomy, so it is compared trimmed and case-insensitively.
   */
  readonly category: string;
  readonly color: Color;
}

export interface DuplicatePair {
  readonly a: DuplicateCandidate;
  readonly b: DuplicateCandidate;
  /** The measured ΔE00 between them. The half of the criterion a boolean would lose. */
  readonly difference: number;
}

const normalise = (category: string): string => category.trim().toLowerCase();

/**
 * Every pair in the same category closer than `DUPLICATE_DELTA_E`.
 *
 * Each unordered pair appears **once**. Reporting `(a, b)` and `(b, a)` would be the same
 * defect F-046's `pairingKey` exists to prevent — one relationship counted twice, and a person
 * told they own four duplicates when they own two.
 *
 * Closest first, ties broken by the ids so the ordering is total: `sort` is stable, so without
 * a tie-break the order would follow the input, and the input order is the wardrobe's.
 */
export function findDuplicates(
  items: readonly DuplicateCandidate[],
  threshold: number = DUPLICATE_DELTA_E,
): readonly DuplicatePair[] {
  const found: DuplicatePair[] = [];

  for (let i = 0; i < items.length; i += 1)
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (a === undefined || b === undefined) continue;
      if (normalise(a.category) !== normalise(b.category)) continue;

      // The ENGINE's distance, on Lab, which is where ΔE00 is defined. Handing it OKLCh would
      // type-check and return a plausible number that means nothing.
      const difference = deltaE00(xyzToLab(a.color.xyz), xyzToLab(b.color.xyz));
      if (difference >= threshold) continue;

      found.push({ a, b, difference });
    }

  return found.sort(
    (p, q) =>
      p.difference - q.difference || `${p.a.id}|${p.b.id}`.localeCompare(`${q.a.id}|${q.b.id}`),
  );
}
