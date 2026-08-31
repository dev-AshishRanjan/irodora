/**
 * Grouping a wardrobe by colour, the way colours actually look.
 *
 * FR-41 — *"Browse, filter and group the wardrobe by colour, family, type, season and
 * formality"* — with the criterion that decides the implementation: **"colour grouping uses
 * perceptual distance, not hex string sorting"**.
 *
 * ## Why the criterion is worth a whole module
 *
 * Sorting by hex is the obvious implementation and it is wrong in a way that looks right in a
 * screenshot. `#800000` and `#800080` differ in one digit and sort adjacently; they are maroon
 * and purple, and nobody would put them in a drawer together. `#FF0000` and `#FE0102` are far
 * apart as strings and are the same red. A hex sort is a sort by the *number* a colour happens
 * to be encoded as, and RGB's ordering has no relationship to how anything looks.
 *
 * ## The metric is imported, never re-derived
 *
 * `deltaE00` comes from `@irodora/color-difference`. Re-implementing the distance here would
 * be [E-008](../../../.harness/state/effects.json)'s exact shape — the same two garments
 * grouped differently on two surfaces, both passing their own tests, with nothing running
 * both. This package gains a dependency on the engine rather than a copy of it.
 *
 * ## Leader clustering, and its honest limit
 *
 * Each garment joins the first existing group within `threshold` of that group's leader, or
 * starts one. This is **order-dependent** — a different insertion order can produce different
 * groups — and that is stated rather than hidden: garments arrive in `created_at` order, so
 * the result is stable for a given wardrobe, and the alternative (k-means, or hierarchical
 * clustering) needs a k nobody can choose and a reproducibility story this feature has no use
 * for. The groups are a browsing aid, not a claim about the wardrobe.
 *
 * What it is NOT is a nearest-neighbour assignment: ΔE00 violates the triangle inequality
 * ([[deltae00-is-not-a-metric-and-cannot-be-indexed]]), so "the nearest group" is not a
 * well-behaved question and any spatial index over it would be subtly and silently wrong.
 */

import { deltaE00 } from '@irodora/color-difference';
import type { Lab } from '@irodora/color-spaces';
import type { SavedColorRow, StoredGarment } from './repository.js';

/**
 * The default grouping threshold, in ΔE00.
 *
 * **10 is not a round number chosen for tidiness.** ΔE00 of about 1 is the just-noticeable
 * difference under ideal conditions; 2–3 is where a careful observer is confident; and around
 * 10 is roughly where most people stop calling two samples "the same colour" and start naming
 * them separately. A drawer is a coarser judgement than a colourimeter, and grouping at 2
 * would give a wardrobe as many groups as garments — which is a list, not a grouping.
 *
 * Exported so a caller can widen or narrow it, because "how similar is similar" is a browsing
 * preference rather than a fact about colour.
 */
export const DEFAULT_GROUPING_THRESHOLD = 10;

export interface ColorGroup {
  /**
   * The garment whose colour defines this group.
   *
   * Named `leader` rather than `representative` or `centroid` because that is what it is: the
   * first garment that landed here. Calling it a centroid would imply an average nobody
   * computed, and averaging in Lab across a group is a different algorithm with a different
   * meaning.
   */
  readonly leader: SavedColorRow;
  readonly garments: readonly StoredGarment[];
}

const labOf = (color: SavedColorRow): Lab => [color.lab_l, color.lab_a, color.lab_b];

/**
 * Group garments by the perceptual distance between their primary colours.
 *
 * Deterministic for a given input order. Garments with no colour cannot occur — the column is
 * NOT NULL and `NewGarment` requires one — so there is no "ungrouped" bucket to reason about.
 */
export function groupByColor(
  garments: readonly StoredGarment[],
  threshold: number = DEFAULT_GROUPING_THRESHOLD,
): ColorGroup[] {
  if (threshold <= 0)
    throw new RangeError(
      `grouping threshold must be positive; got ${String(threshold)}. A threshold of zero ` +
        'groups nothing with anything, which is a list of garments wearing the shape of a ' +
        'grouping.',
    );

  const groups: { leader: SavedColorRow; garments: StoredGarment[] }[] = [];

  for (const garment of garments) {
    const lab = labOf(garment.color);
    const home = groups.find((group) => deltaE00(labOf(group.leader), lab) <= threshold);
    if (home === undefined) {
      groups.push({ leader: garment.color, garments: [garment] });
      continue;
    }
    home.garments.push(garment);
  }

  return groups;
}
