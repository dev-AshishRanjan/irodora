/**
 * What a gallery cell needs, and what it costs to get it.
 *
 * ## The split this file exists to honour
 *
 * `garment_image` keeps a photograph's bytes in their own table, deliberately: the schema's own
 * comment says the split is what *"makes the list query cheap"*. A gallery is the first surface
 * that could undo that by accident — twelve visible cells in a wardrobe of forty, and a naive
 * implementation reads forty BLOBs to draw them.
 *
 * So there are two questions and they cost different amounts:
 *
 * | question | cost | asked for |
 * | --- | --- | --- |
 * | does this garment have a photograph, and what shape is it | metadata row | every cell |
 * | what are its bytes | the BLOB, plus a base64 encode | visible cells only |
 *
 * ## Why the cache is bounded and keyed by id
 *
 * A `data:` URI for a photograph is a large string, and React Native's `<Image>` re-reads it on
 * every render. Recomputing it per scroll frame would be the same mistake twice; holding every
 * one forever would grow without limit in a wardrobe somebody actually uses.
 *
 * The bound is small on purpose. It holds roughly a screen of cells, which is what a scroll
 * needs, and evicts in insertion order — the oldest entry is the one furthest from the viewport
 * in the common case of scrolling one way.
 */

import { base64FromBytes } from './source';
import type { GarmentImageInfo } from '@irodora/store';

/**
 * The two methods this needs, and nothing else.
 *
 * NARROWER THAN `WardrobeStore` ON PURPOSE. The Wardrobe screen takes a `BrowseStore` — two
 * methods, because browsing does not create garments — and asking it for the full write-capable
 * interface to read a photograph would have widened a screen's dependency to satisfy a helper's
 * convenience. A function that declares its minimum can be given anything that meets it,
 * including a test double with two properties.
 */
export interface GarmentImageStore {
  getGarmentImageInfo(garmentId: string): GarmentImageInfo | undefined;
  getGarmentImage(garmentId: string): Uint8Array | undefined;
}

/**
 * How many encoded photographs to keep.
 *
 * A screen of a two-column grid is about six cells; twice that covers a fast scroll in either
 * direction without holding a wardrobe's worth of base64 in memory.
 */
export const IMAGE_CACHE_LIMIT = 12;

/** A `data:` URI, or `null` for a garment with no photograph. */
export type GarmentImageUri = string | null;

export interface GalleryImages {
  /** Whether this garment has a photograph at all. Metadata only — no BLOB is read. */
  has: (garmentId: string) => boolean;
  /**
   * The photograph as a `data:` URI, reading and encoding it on first ask.
   *
   * `null` when there is no image, and `null` when the read fails — a cell that cannot show a
   * photograph shows the colour instead, which is a complete presentation rather than a
   * degraded one.
   */
  uri: (garmentId: string) => GarmentImageUri;
}

/**
 * The image accessor for a gallery.
 *
 * A closure rather than a hook so it can be tested without rendering, and so the cache belongs
 * to one screen's lifetime rather than to a module. A module-level cache would outlive the
 * wardrobe it describes and hand a stale photograph to a garment whose picture had changed.
 */
export function galleryImages(store: GarmentImageStore): GalleryImages {
  const cache = new Map<string, GarmentImageUri>();

  return {
    has: (garmentId) => store.getGarmentImageInfo(garmentId) !== undefined,

    uri: (garmentId) => {
      const cached = cache.get(garmentId);
      // `has` rather than `!== undefined`: a cached `null` is an answer — this garment has no
      // photograph — and re-asking the database for it on every frame is the exact cost this
      // cache exists to avoid.
      if (cache.has(garmentId)) return cached ?? null;

      const info = store.getGarmentImageInfo(garmentId);
      const bytes = info === undefined ? undefined : store.getGarmentImage(garmentId);
      const uri =
        info === undefined || bytes === undefined
          ? null
          : `data:image/${info.format};base64,${base64FromBytes(bytes)}`;

      if (cache.size >= IMAGE_CACHE_LIMIT) {
        // Insertion order, which `Map` guarantees. The oldest entry is the furthest from the
        // viewport whenever the scroll has been going one way, which is the common case.
        const oldest = cache.keys().next();
        if (!oldest.done) cache.delete(oldest.value);
      }
      cache.set(garmentId, uri);
      return uri;
    },
  };
}
