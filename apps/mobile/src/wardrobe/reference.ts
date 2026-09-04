/**
 * The corpus as a scoring reference set.
 *
 * ## Why this is its own module
 *
 * `coverage()`, `gaps()` and `shoppingCheck()` all need the published corpus expressed as
 * `{ id, color }` pairs, and building one means writing out a `SavedColorRow` per entry — twenty
 * fields, most of them the `null`s that say *this is a reference value, not a measurement*.
 *
 * It was written inline in `app/(tabs)/wardrobe/shopping.tsx`. The moment a second route needed
 * it, the choice was to copy twenty fields or to move them, and a copy would have been two
 * statements about what a corpus entry's provenance IS — drifting the first time a column moved.
 *
 * ## The nulls are the point
 *
 * `source: 'reference'`, `confidence: 1`, and every `capture_*` field `null`. A corpus entry was
 * not measured through a camera by us; it was published, with its own provenance, and the row
 * says so. Filling those fields with plausible values would make a reference colour
 * indistinguishable from a reading, which is the distinction ADR-0005 exists to keep.
 */

import { allEntries } from '../corpus';
import { colorOf } from '../wardrobe';
import type { Color } from '@irodora/color-core';

export interface ReferenceColor {
  readonly id: string;
  readonly color: Color;
}

/**
 * Every published entry, as a scored reference.
 *
 * Recomputed per call rather than cached at module scope: the corpus is a pinned bundle so the
 * answer never changes, but a module-level cache of 120 `Color` objects is state that outlives
 * every screen and is held whether or not anything scores. Callers memoise where it matters.
 */
export function referenceSet(): readonly ReferenceColor[] {
  return allEntries().map((e) => ({
    id: e.entry.slug,
    color: colorOf({
      id: e.entry.slug,
      created_at: 0,
      updated_at: 0,
      deleted_at: null,
      name: e.entry.name.en,
      xyz_x: e.entry.color.xyz[0],
      xyz_y: e.entry.color.xyz[1],
      xyz_z: e.entry.color.xyz[2],
      lab_l: e.derived.lab[0],
      lab_a: e.derived.lab[1],
      lab_b: e.derived.lab[2],
      oklch_l: e.derived.oklch[0],
      oklch_c: e.derived.oklch[1],
      oklch_h: e.derived.oklch[2],
      hex: e.derived.hex,
      source: 'reference',
      confidence: 1,
      corpus_slug: e.entry.slug,
      capture_illuminant: null,
      capture_quality: null,
      capture_samples: null,
      capture_variance: null,
    }),
  }));
}
