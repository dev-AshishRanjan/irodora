/**
 * The app's corpus — loaded once, verified before anything reads it, and never recomputed.
 *
 * ## Verification happens here or it does not happen
 *
 * `loadPublishedVersion` takes the expected root digest as an argument and throws on mismatch.
 * There is no warn mode, so the only way to get a `VersionBundle` is to have verified one. This
 * module is the single call site: the bundle text comes from the generated module and the
 * expected digest comes from the ledger, which is the separation that makes the comparison mean
 * anything — a file checked against a checksum it carries verifies itself
 * ([ADR-0046](../../../../docs/adr/0046-published-corpus-is-an-immutable-generated-bundle.md)).
 *
 * **A mismatch is a SEV1**, with no threshold and no grace period. There is no benign
 * explanation for immutable content differing from its recorded checksum, so nothing here
 * catches and continues.
 *
 * ## Why the hasher is checked before it is used
 *
 * `@noble/hashes` is audited and it is still not trusted on arrival: `assertSha256` runs it
 * against published vectors — including one non-ASCII case that catches a hasher encoding
 * UTF-16 rather than UTF-8, which is exactly the mistake that would survive an ASCII test and
 * then fail on this corpus. See
 * [ADR-0066](../../../../docs/adr/0066-the-app-verifies-the-corpus-with-noble-hashes-and-ships-the-bundle-as-generated-text.md).
 *
 * ## What may never happen in this file
 *
 * **No derived value is recomputed.** `hex`, `lab`, `lch`, `oklch` and `rgb` are in the bundle,
 * computed by the engine at publish time and frozen there. Recomputing one from `xyz` at render
 * time would look identical, pass every test, and silently return *today's* engine's answer for
 * a published version — the failure FR-10 exists to prevent, and the one `load.ts` explicitly
 * refuses to commit on its own read path. `verify-guards.mjs` enforces it from outside; this
 * paragraph is why.
 *
 * A `Color` for a `Swatch` is built with `fromXyz` from the entry's **authored** `color.xyz`,
 * so even that path converts nothing.
 */

import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { fromXyz, type Color } from '@irodora/color-core';
import {
  assertSha256,
  loadPublishedVersion,
  type CorpusEntry,
  type CorpusPalette,
  type PublishedEntry,
  type PublishedPalette,
  type VersionBundle,
  familyWord,
  parseTaxonomyVocabulary,
  type TaxonomyVocabulary,
} from '@irodora/corpus';
import {
  CORPUS_BUNDLE_TEXT,
  CORPUS_ENTRY_COUNT,
  CORPUS_LABEL,
  CORPUS_PALETTE_COUNT,
  CORPUS_ROOT_DIGEST,
} from './generated/bundle';
import { VOCABULARY_FAMILY_COUNT, VOCABULARY_TEXT } from '../taxonomy/generated/vocabulary';

/** SHA-256 over UTF-8, the shape the corpus digest seam expects. */
export const sha256 = (text: string): string => bytesToHex(nobleSha256(utf8ToBytes(text)));

let cached: VersionBundle | null = null;

/**
 * The verified bundle.
 *
 * Memoised because the work is a 450 KB parse plus 125 digests, and because verifying twice
 * proves nothing the first pass did not. The memo holds the **result of a successful
 * verification** — a failure throws and caches nothing, so a subsequent call retries rather
 * than returning a bundle nobody checked.
 */
export function corpus(): VersionBundle {
  if (cached !== null) return cached;

  assertSha256(sha256);
  const bundle = loadPublishedVersion(
    CORPUS_BUNDLE_TEXT,
    CORPUS_ROOT_DIGEST,
    sha256,
    `${CORPUS_LABEL}.json`,
  );

  // The generated module records what was published; the bundle says what arrived. They can
  // only disagree if the module was edited by hand, and a count is the cheapest place to
  // notice that the two halves of this pair came from different generations.
  if (
    bundle.entries.length !== CORPUS_ENTRY_COUNT ||
    bundle.palettes.length !== CORPUS_PALETTE_COUNT
  )
    throw new Error(
      `corpus: the generated module records ${String(CORPUS_ENTRY_COUNT)} entries and ` +
        `${String(CORPUS_PALETTE_COUNT)} palettes, the bundle carries ` +
        `${String(bundle.entries.length)} and ${String(bundle.palettes.length)}. The two came ` +
        'from different generations — run `node scripts/generate-corpus-bundle.mjs`.',
    );

  cached = bundle;
  return bundle;
}

/** Every published entry, in slug order so the Atlas is stable between renders. */
export function allEntries(): readonly PublishedEntry[] {
  return [...corpus().entries].sort((a, b) => a.entry.slug.localeCompare(b.entry.slug));
}

/** Every published palette, in slug order. */
export function allPalettes(): readonly PublishedPalette[] {
  return [...corpus().palettes].sort((a, b) => a.palette.slug.localeCompare(b.palette.slug));
}

/** One entry, or `null`. A route parameter is user input, so a miss is a state, not a crash. */
export function entryBySlug(slug: string): PublishedEntry | null {
  return corpus().entries.find((e) => e.entry.slug === slug) ?? null;
}

/** The palettes that hold this colour, with the role it plays in each. */
export function palettesContaining(
  slug: string,
): readonly { readonly palette: CorpusPalette; readonly role: string; readonly rank: number }[] {
  const found: { palette: CorpusPalette; role: string; rank: number }[] = [];
  for (const { palette } of allPalettes()) {
    const member = palette.colors.find((c) => c.slug === slug);
    if (member !== undefined) found.push({ palette, role: member.role, rank: member.rank });
  }
  return found;
}

/** Entries a slug relates to, resolved. A dangling relation cannot exist — the gate forbids it. */
export function resolveSlugs(slugs: readonly string[]): readonly PublishedEntry[] {
  return slugs.flatMap((s) => {
    const found = entryBySlug(s);
    return found === null ? [] : [found];
  });
}

/**
 * The space every entry in the pinned bundle arrived in.
 *
 * **This is an assumption about the data, and it is checked against the data.** ADR-0065 §2
 * specifies every seed value in OKLCh and converts it to canonical XYZ, and each entry's
 * `derivation` says so in its own words. `originSpace` means *the space this value arrived in*,
 * because round-tripping is only honest back to there — so recording `oklch` is true of
 * 2026.08.1 and would be false of a measured entry, whose origin is a colorimeter reading in
 * XYZ.
 *
 * `ColorSpace` has no `xyz` member: XYZ is the hub the map converts *to*, not an arrival space.
 * So a measured entry has no honest value to put here, and that is a real edge worth failing
 * on rather than defaulting through. `corpus.test.ts` asserts every entry's derivation names
 * OKLCh, which turns this constant from a comment into something that breaks on the day the
 * assumption stops holding.
 */
export const SEED_ORIGIN_SPACE = 'oklch' as const;

/**
 * A `Color` for a swatch, from the entry's **authored** XYZ.
 *
 * `fromXyz`, not `fromSpace`: the canonical XYZ is what the editor wrote and what the publish
 * hashed, so this converts nothing at all.
 *
 * `source: 'reference'` because a published corpus entry is exactly that — a reference value
 * with a recorded origin. Confidence is 1 for the **value**, which says *this number is the one
 * that was published* and makes no claim about the world: whether the colour corresponds to a
 * dyed material is what `classification` and `derivation` carry, and for the seed corpus the
 * answer is that it does not (ADR-0065).
 */
export function colorFor(entry: CorpusEntry): Color {
  return fromXyz(entry.color.xyz, {
    source: 'reference',
    confidence: 1,
    originSpace: SEED_ORIGIN_SPACE,
  });
}

/**
 * The verified family vocabulary (F-090).
 *
 * Parsed once, by the same function gate 11 uses. There is no digest here and the generator
 * says why: a corrupted vocabulary shows wrong WORDS, not a wrong colour claim, and the
 * content gate validates the source in both directions against the authored corpus.
 */
let cachedVocabulary: TaxonomyVocabulary | null = null;

function vocabulary(): TaxonomyVocabulary {
  if (cachedVocabulary !== null) return cachedVocabulary;
  const parsed = parseTaxonomyVocabulary(JSON.parse(VOCABULARY_TEXT), 'taxonomy.json');
  if (parsed.families.length !== VOCABULARY_FAMILY_COUNT)
    throw new Error(
      `taxonomy: the generated module records ${String(VOCABULARY_FAMILY_COUNT)} families and ` +
        `the file carries ${String(parsed.families.length)}. The two came from different ` +
        'generations — run `node scripts/generate-taxonomy-bundle.mjs`.',
    );
  cachedVocabulary = parsed;
  return parsed;
}

/**
 * The word a reader sees for a family.
 *
 * **Total, or it throws.** No fallback to the authoring slug: gate 11 guarantees every family
 * a published entry uses has a row, so an unknown one means the shipped vocabulary and the
 * shipped corpus came from different generations. Returning the slug quietly is exactly the
 * behaviour ADR-0028 forbids — it makes the gap invisible, which is how it survived from F-018
 * to F-090 in the first place.
 */
export function familyLabel(family: string, locale: 'en' | 'ja'): string {
  return familyWord(vocabulary(), family, locale);
}
/** Every family in the corpus, with how many entries carry it. For the Atlas's filters. */
export function families(): readonly { readonly family: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const { entry } of corpus().entries)
    counts.set(entry.taxonomy.family, (counts.get(entry.taxonomy.family) ?? 0) + 1);
  return [...counts.entries()]
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

export { CORPUS_LABEL, CORPUS_ENTRY_COUNT, CORPUS_PALETTE_COUNT };
export type { CorpusEntry, CorpusPalette, PublishedEntry, PublishedPalette };
