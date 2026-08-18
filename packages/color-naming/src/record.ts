/**
 * What the naming engine indexes, and the shape it reads a published corpus through.
 */

import type { Triple } from '@irodora/color-spaces';

/**
 * One indexable record: an identifier and its CIELAB coordinates.
 *
 * **`id`, not a name.** Joining an id back to an entry's kanji, kana and English name is the
 * API's wire projection (F-016). Putting `EntryName` in here would drag the corpus schema into
 * a package that must produce byte-identical output in Node, the browser and React Native
 * (NFR-3), for no gain — and the ranking does not depend on any of it.
 */
export interface NamingRecord {
  readonly id: string;
  /** CIELAB (D65), as published. See `namingRecordsFrom` for why it is not re-derived. */
  readonly lab: Triple;
}

/**
 * The shape of a published corpus bundle this package reads.
 *
 * **Declared structurally so `@irodora/color-naming` has no dependency on `@irodora/corpus`** —
 * not at runtime, and not in its emitted `.d.ts`. A real `VersionBundle` is assignable to it,
 * which `test/corpus.test.ts` asserts, so a corpus schema change that removed `derived.lab`
 * fails `typecheck` here.
 *
 * F-011 anticipated the opposite — that this package would import the corpus — and gave
 * `packages/corpus/src` a platform-API override plus boundary guard #11 in advance. That
 * mitigation is real and still holds. Declining to create the edge at all is strictly better:
 * `verify-engine-purity.mjs` does not follow `@irodora/*` dependency edges (F-073), so an
 * engine package importing a non-engine one is unguarded, and the safest version of an
 * unguarded edge is one that does not exist.
 */
export interface PublishedLabSource {
  readonly label: string;
  readonly entries: readonly {
    readonly entry: { readonly slug: string };
    readonly derived: { readonly lab: Triple };
  }[];
}
