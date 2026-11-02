/**
 * Stored palettes as the device repository returns them, built from the pinned bundle (F-251): what
 * `10`'s *My Custom Palettes* and `16`'s editing state are tested on. Each row holds the entry's
 * PUBLISHED values, as `toStoreWrite` copies them.
 */

import type { PaletteRole } from '@irodora/corpus';
import type { SavedColorRow, StoredPalette } from '@irodora/store';
import { CORPUS_LABEL, entryBySlug } from '../src/corpus';
import { deriveWeights } from '../src/palette';

/** A colour row holding a corpus entry's published values. */
export function storedRowOf(slug: string): SavedColorRow {
  const found = entryBySlug(slug);
  if (found === null) throw new Error(`no entry ${slug}`);
  return {
    id: `c-${slug}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: found.entry.name.en,
    xyz_x: found.entry.color.xyz[0],
    xyz_y: found.entry.color.xyz[1],
    xyz_z: found.entry.color.xyz[2],
    lab_l: found.derived.lab[0],
    lab_a: found.derived.lab[1],
    lab_b: found.derived.lab[2],
    oklch_l: found.derived.oklch[0],
    oklch_c: found.derived.oklch[1],
    oklch_h: found.derived.oklch[2],
    hex: found.derived.hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: slug,
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };
}

/** A stored palette of these members, in rank order, at the weights the Studio derives. */
export function storedPalette(
  id: string,
  name: string,
  members: readonly (readonly [string, PaletteRole])[],
  category = 'contemporary',
  createdAt = 1,
): StoredPalette {
  const weights = deriveWeights(members.length);
  return {
    id,
    nameEn: name,
    nameJa: name,
    classification: 'editorial',
    category,
    versionId: CORPUS_LABEL,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    members: members.map(([slug, role], i) => ({
      colorId: `c-${slug}`,
      slug,
      role,
      rank: i + 1,
      weight: weights[i] ?? 1,
      color: storedRowOf(slug),
    })),
  };
}
