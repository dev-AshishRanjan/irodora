/**
 * A published corpus version: the immutable bundle, and the ledger that vouches for it.
 *
 * ```
 * content/colors/**          authored source entries — no derived values
 * content/palettes/**        authored palettes
 *         ↓ validate → derive → checksum          (scripts/generate-corpus.mjs)
 * content/versions/2026.08.1.json   GENERATED, immutable: entries + derived + per-entry digests
 * content/versions/index.json       append-only ledger: label → {checksum, engine, ...}
 * ```
 *
 * ## Why one bundle rather than a directory per version
 *
 * A directory holding a full copy of every entry would make immutability a property of files,
 * which is attractive. It was rejected because publishing a one-entry correction would produce
 * a two-hundred-file diff in which the real change is invisible — and a diff nobody can read
 * is a review nobody performs. One generated file plus a ledger gives the same immutability
 * with a reviewable diff (ADR-0046).
 *
 * ## Why the expected checksum is not inside the bundle
 *
 * `loadPublishedVersion` takes the root digest as an argument, from the ledger. A file checked
 * against a checksum stored inside itself is not checked — an editor changing a value and
 * re-running the generator would produce a self-consistent bundle and a green build. The
 * ledger makes it a two-file disagreement instead.
 *
 * ## What "immutable" does and does not mean here
 *
 * Enforced against accident, DETECTED against intent. A committer who edits an entry *and*
 * updates the ledger in the same commit passes; the two-file diff and review are the control,
 * and the audit-logged admin publish path arrives with F-061. Saying so is the point — the
 * word must not imply more than it delivers.
 */

import { canonicalize } from './canonical.js';
import { deriveColor, type DerivedColor } from './derive.js';
import { entryDigest, rootDigest, type DigestFn } from './digest.js';
import { serialiseEntry, type CorpusEntry } from './entry.js';
import { CorpusError } from './errors.js';
import type { CorpusPalette } from './palette.js';
import { VERSION_ID_PATTERN } from './primitives.js';
import { isPublishable } from './workflow.js';

/** One entry as it appears in a published bundle: the source record plus what was derived. */
export interface PublishedEntry {
  readonly entry: CorpusEntry;
  readonly derived: DerivedColor;
  /** Over the authored record **and** its derived block — see `publishedEntryDigest`. */
  readonly digest: string;
}

export interface PublishedPalette {
  readonly palette: CorpusPalette;
  readonly digest: string;
}

export interface VersionBundle {
  readonly label: string;
  readonly corpusSchemaVersion: string;
  /**
   * The engine semver that produced every derived value in this bundle.
   *
   * Recorded so a mismatch is legible rather than mysterious: when the gate finds a derived
   * value that no longer agrees with the current engine, this is what says which engine did
   * agree with it (E-001).
   */
  readonly engine: string;
  readonly publishedAt: string;
  readonly entries: readonly PublishedEntry[];
  readonly palettes: readonly PublishedPalette[];
}

/** One row of `content/versions/index.json`. Append-only. */
export interface LedgerRow {
  readonly label: string;
  readonly checksum: string;
  readonly engine: string;
  readonly publishedAt: string;
  readonly entryCount: number;
}

export type Ledger = readonly LedgerRow[];

/**
 * The per-entry checksum: over the authored record **and** its derived block.
 *
 * The first version covered only the authored half, on the reasoning that the derived block is
 * regenerable and the authored one is what immutability is about. A test found the hole that
 * argument leaves: a tampered `hex` in a published bundle loaded clean, and `apps/api` would
 * have served it (F-016). The derived values ARE what a consumer renders, so they are part of
 * the artefact whose integrity is being claimed.
 *
 * The consequence is intended: regenerating a bundle under a changed engine produces different
 * digests, so it is a new version rather than a quiet in-place correction — which is what
 * E-001's memory note prescribes anyway.
 */
function publishedEntryDigest(
  entry: CorpusEntry,
  derived: DerivedColor,
  digestOf: DigestFn,
): string {
  // The AUTHORING shape, so the digest covers what a reviewer reads in a diff rather than an
  // internal representation.
  return entryDigest({ entry: serialiseEntry(entry), derived }, digestOf);
}

/**
 * Build a bundle from validated records.
 *
 * Only `published` and `superseded` records go in. A `draft` in a published version would be
 * a colour nobody reviewed, served to everyone — which is what the workflow exists to prevent.
 */
export function publishVersion(
  label: string,
  entries: readonly CorpusEntry[],
  palettes: readonly CorpusPalette[],
  meta: {
    readonly engine: string;
    readonly corpusSchemaVersion: string;
    readonly publishedAt: string;
  },
  digestOf: DigestFn,
): VersionBundle {
  if (!VERSION_ID_PATTERN.test(label))
    throw new CorpusError('publishVersion', 'label', `expected YYYY.MM.N; got "${label}"`);

  return {
    label,
    corpusSchemaVersion: meta.corpusSchemaVersion,
    engine: meta.engine,
    publishedAt: meta.publishedAt,
    entries: entries
      .filter((entry) => isPublishable(entry.status))
      .map((entry) => {
        const derived = deriveColor(entry.color.xyz);
        return { entry, derived, digest: publishedEntryDigest(entry, derived, digestOf) };
      }),
    palettes: palettes
      .filter((palette) => isPublishable(palette.status))
      .map((palette) => ({ palette, digest: entryDigest(palette, digestOf) })),
  };
}

/**
 * The root digest of a bundle.
 *
 * Over the **per-entry digests**, not the whole file — so the value does not move when the
 * bundle's formatting or field order changes, and so a mismatch can be localised by comparing
 * entry digests one at a time.
 *
 * Entries and palettes are namespaced by prefix. Without it, a colour and a palette sharing a
 * slug — which is legal, they are different collections — would collide in the root.
 */
export function bundleRootDigest(bundle: VersionBundle, digestOf: DigestFn): string {
  return rootDigest(
    [
      ...bundle.entries.map(({ entry, digest }) => [`color/${entry.slug}`, digest] as const),
      ...bundle.palettes.map(({ palette, digest }) => [`palette/${palette.slug}`, digest] as const),
    ],
    digestOf,
  );
}

/**
 * The bundle as it is written to `content/versions/<label>.json`.
 *
 * Entries go out in their **authoring** shape — `color.xyz` as `{x, y, z}`, not the `Triple`
 * the engine works in. So the file a reviewer reads, the file `loadPublishedVersion` parses,
 * and the file an author wrote are all the same shape, read by the same `parseEntry`. A second
 * reader for the published form would be a second schema, free to drift from the first.
 *
 * This was found by a test rather than designed: the first version canonicalised the in-memory
 * bundle, wrote `xyz` as an array, and could not load its own output.
 */
export function serialiseBundle(bundle: VersionBundle): string {
  return `${canonicalize({
    ...bundle,
    entries: bundle.entries.map(({ entry, derived, digest }) => ({
      entry: serialiseEntry(entry),
      derived,
      digest,
    })),
  })}\n`;
}
