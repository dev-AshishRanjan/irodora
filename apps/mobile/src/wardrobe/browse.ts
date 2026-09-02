/**
 * The wardrobe, grouped by colour (FR-41, F-122).
 *
 * > *Colour grouping uses perceptual distance, not hex string sorting.*
 *
 * ## The group is the nearest published entry's family
 *
 * `nearestByLab` already owns the route from a colour to a ranking — it is the Finder's and the
 * Lens's, and the conversion lives inside it precisely so a screen never does one. Each published
 * entry carries `taxonomy.family`, so a garment's group is **the family of the entry it is
 * perceptually nearest to**: published vocabulary, published distance, and no colour maths here.
 *
 * That also settles the camera case for free. A garment whose colour came from the Lens has no
 * `corpus_slug`, so grouping by slug would leave every captured garment ungrouped — and a fixture
 * built only from corpus picks would rate the two implementations identically. Distance works on
 * any colour, which is the whole reason the criterion names it.
 *
 * ## The distance decides the grouping and then stops being interesting
 *
 * It is not returned to the screen. A garment is *in* a group; showing "4.2 from ai-iro" beside a
 * jumper would present a measurement as a property of the garment, and FR-13's rule about naming
 * a capture applies to the same instinct one level along.
 *
 * ## Both orders are total, and that is not fussiness
 *
 * `sort` is stable, so a comparison that can tie leaves the order as the wardrobe's insertion
 * order — and a browse screen that reshuffles when somebody adds a jumper is one nobody trusts.
 * Groups order by size then family name; garments within a group order by **lightness**, which is
 * the criterion's own distinction from a hex sort, then by id.
 */

import { MINIMUM_CANDIDATES } from '@irodora/color-naming';
import type { StoredGarment } from '@irodora/store';
import { nearestByLab } from '../finder';

/** One colour family, and the garments nearest to it. */
export interface WardrobeGroup {
  /** The published family key. `familyLabel` turns it into a word; this module holds no copy. */
  readonly family: string;
  readonly garments: readonly StoredGarment[];
}

/**
 * The family a garment belongs to.
 *
 * ## Why this asks for three candidates and reads one
 *
 * `nameColor` **refuses** a limit below `MINIMUM_CANDIDATES`, and its refusal says why: *a single
 * answer is an identification, and this product does not assert that a colour IS a corpus entry*
 * (FR-7, ADR-0031). The first draft here asked for one and was rejected — correctly.
 *
 * Reading the nearest of three is not that floor worked around, because **a family is not an
 * entry**. Several published entries share one; the group heading is a family word, not a slug;
 * and nothing on the screen says this jumper *is* ai-iro. The claim a group makes — *these are the
 * blues* — is strictly weaker than the naming surface's, which is the one the floor guards.
 *
 * The alternative considered and rejected was a vote across the three. It breaks the property that
 * matters most: a garment saved **as** a published colour would be outvoted out of its own family
 * whenever its two runners-up happened to agree with each other, and a wardrobe that files ai-iro
 * under something else is wrong in the way a reader can see.
 *
 * The limit is imported rather than written as `3`, so the day the floor moves this follows it.
 *
 * `null` when the corpus offers no entry at all — which cannot happen with a published bundle and
 * is not treated as impossible: a caller that assumed a family would put every garment in a group
 * called `undefined` the day the bundle was empty.
 */
export function familyOf(garment: StoredGarment): string | null {
  const nearest = nearestByLab(
    [garment.color.lab_l, garment.color.lab_a, garment.color.lab_b],
    MINIMUM_CANDIDATES,
  );
  return nearest[0]?.entry.entry.taxonomy.family ?? null;
}

/**
 * The wardrobe as colour groups.
 *
 * Garments with no family — see `familyOf` — are collected under `UNGROUPED` rather than dropped.
 * A browse screen that silently showed fewer garments than the wardrobe holds is the failure this
 * avoids, and it is worse than an odd-looking group because nothing about it looks wrong.
 *
 * **This branch is unreachable with a published bundle, and therefore untested.** `familyOf`
 * returns `null` only for an empty corpus, so a mutation that dropped these garments instead of
 * collecting them passes the whole suite. It is kept so an empty bundle degrades visibly rather
 * than crashing; `browse.test.ts` records the gap rather than pretending to cover it.
 */
export const UNGROUPED = 'ungrouped';

export function groupByColour(garments: readonly StoredGarment[]): readonly WardrobeGroup[] {
  const byFamily = new Map<string, StoredGarment[]>();

  for (const garment of garments) {
    const family = familyOf(garment) ?? UNGROUPED;
    const bucket = byFamily.get(family);
    if (bucket === undefined) byFamily.set(family, [garment]);
    else bucket.push(garment);
  }

  return [...byFamily.entries()]
    .map(([family, members]) => ({
      family,
      // Light to dark. `lab_l` is the published lightness, read rather than recomputed — the
      // stored row carries it, and deriving it again would be today's engine answering for a
      // value written under a pinned version (E-001).
      garments: [...members].sort(
        (a, b) => b.color.lab_l - a.color.lab_l || a.id.localeCompare(b.id),
      ),
    }))
    .sort((a, b) => b.garments.length - a.garments.length || a.family.localeCompare(b.family));
}

/**
 * An enrichment patch from an edited field, with an emptied one **clearing** rather than storing
 * an empty string.
 *
 * `GarmentEnrichment` reads `undefined` as *leave it* and an explicit `null` as *erase it*, and
 * that distinction is load-bearing: an editor that wrote `''` for a field somebody cleared would
 * store an empty brand where they meant to remove one, and every reader downstream would then
 * have to decide whether `''` counts.
 */
export function textPatch<K extends string>(field: K, value: string): Record<K, string | null> {
  const trimmed = value.trim();
  return { [field]: trimmed === '' ? null : trimmed } as Record<K, string | null>;
}
