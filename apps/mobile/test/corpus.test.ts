/**
 * The corpus reaches the app verified, or it does not reach it.
 *
 * ## What these assertions are for
 *
 * `loadPublishedVersion` has no warn mode, so "the app verifies the bundle" is true by
 * construction — provided the app actually calls it, with a digest that came from somewhere
 * else. Both halves are checkable and both are checked here, because a call site that passed
 * the bundle's own digest would compile, run, and verify nothing
 * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
 *
 * The mutations run over the **real** pinned bundle rather than a fixture. A fixture would
 * prove the corpus package's rules, which its own suite already does; what is unproven until
 * here is that *this* text and *this* digest are wired to each other.
 */

import {
  allEntries,
  allPalettes,
  colorFor,
  corpus,
  entryBySlug,
  families,
  palettesContaining,
  resolveSlugs,
  sha256,
  SEED_ORIGIN_SPACE,
  CORPUS_ENTRY_COUNT,
  CORPUS_LABEL,
  CORPUS_PALETTE_COUNT,
} from '../src/corpus';
import { CORPUS_BUNDLE_TEXT, CORPUS_ROOT_DIGEST } from '../src/corpus/generated/bundle';
import { assertSha256, loadPublishedVersion, SHA256_VECTORS } from '@irodora/corpus';

describe('the hasher is checked before it is trusted', () => {
  it('reproduces every published vector', () => {
    for (const [input, expected] of SHA256_VECTORS) expect(sha256(input)).toBe(expected);
  });

  it('passes assertSha256, which is what the publish path uses', () => {
    expect(() => {
      assertSha256(sha256);
    }).not.toThrow();
  });

  /*
   * The vector that matters most for this product. A hasher encoding UTF-16 rather than UTF-8
   * agrees on every ASCII input and disagrees on the corpus, whose content is Japanese.
   */
  it('hashes UTF-8 bytes, not UTF-16 code units', () => {
    expect(sha256('藍鼠')).toBe('2e4f11086a73e790e15a5ad94911828c116dd78cd9bbec7da72bf043c538655a');
  });
});

describe('the pinned bundle loads', () => {
  it('is the version the generated module names', () => {
    expect(corpus().label).toBe(CORPUS_LABEL);
  });

  it('carries the entries and palettes the module recorded', () => {
    expect(corpus().entries).toHaveLength(CORPUS_ENTRY_COUNT);
    expect(corpus().palettes).toHaveLength(CORPUS_PALETTE_COUNT);
  });

  it('holds the seed corpus, not an empty set', () => {
    expect(CORPUS_ENTRY_COUNT).toBeGreaterThanOrEqual(120);
    expect(CORPUS_PALETTE_COUNT).toBe(5);
  });
});

describe('verification binds — each mutation is refused', () => {
  /** The baseline. A proof where everything throws cannot tell a working check from a broken one. */
  it('DECOY — the unmutated pair loads', () => {
    expect(() =>
      loadPublishedVersion(CORPUS_BUNDLE_TEXT, CORPUS_ROOT_DIGEST, sha256),
    ).not.toThrow();
  });

  it('refuses a bundle whose entry was edited', () => {
    const parsed = JSON.parse(CORPUS_BUNDLE_TEXT) as {
      entries: { entry: { name: { en: string } } }[];
    };
    parsed.entries[0]!.entry.name.en = 'Tampered';
    expect(() => loadPublishedVersion(JSON.stringify(parsed), CORPUS_ROOT_DIGEST, sha256)).toThrow(
      /checksum mismatch/iu,
    );
  });

  it('refuses a bundle whose DERIVED value was edited', () => {
    const parsed = JSON.parse(CORPUS_BUNDLE_TEXT) as {
      entries: { derived: { hex: string } }[];
    };
    parsed.entries[0]!.derived.hex = '#000000';
    expect(() => loadPublishedVersion(JSON.stringify(parsed), CORPUS_ROOT_DIGEST, sha256)).toThrow(
      /checksum mismatch/iu,
    );
  });

  it('refuses a bundle an entry was removed from, where every survivor still hashes', () => {
    const parsed = JSON.parse(CORPUS_BUNDLE_TEXT) as { entries: unknown[] };
    parsed.entries.pop();
    expect(() => loadPublishedVersion(JSON.stringify(parsed), CORPUS_ROOT_DIGEST, sha256)).toThrow(
      /root checksum mismatch/iu,
    );
  });

  it('refuses the right bundle against the wrong expected digest', () => {
    const wrong = `${CORPUS_ROOT_DIGEST.slice(0, -1)}${CORPUS_ROOT_DIGEST.endsWith('a') ? 'b' : 'a'}`;
    expect(() => loadPublishedVersion(CORPUS_BUNDLE_TEXT, wrong, sha256)).toThrow(
      /root checksum mismatch/iu,
    );
  });

  /*
   * The failure this design exists to prevent, stated as a test rather than as a comment: a
   * bundle checked against a digest it carries verifies itself. There is no such digest INSIDE
   * the bundle to pass, which is the point — the expected value can only come from the ledger.
   */
  it('carries no self-describing root digest that could be used as its own expectation', () => {
    const parsed = JSON.parse(CORPUS_BUNDLE_TEXT) as Record<string, unknown>;
    expect(Object.keys(parsed)).not.toContain('checksum');
    expect(Object.keys(parsed)).not.toContain('rootDigest');
  });
});

describe('the queries the Atlas is built on', () => {
  it('returns every entry, in a stable order', () => {
    const slugs = allEntries().map((e) => e.entry.slug);
    expect(slugs).toHaveLength(CORPUS_ENTRY_COUNT);
    expect([...slugs].sort((a, b) => a.localeCompare(b))).toEqual(slugs);
  });

  it('finds an entry by slug and returns null rather than throwing on a miss', () => {
    const first = allEntries()[0]!;
    expect(entryBySlug(first.entry.slug)?.entry.slug).toBe(first.entry.slug);
    expect(entryBySlug('no-such-colour')).toBeNull();
  });

  it('resolves every relation in the corpus — a dangling one cannot exist', () => {
    for (const { entry } of allEntries()) {
      const targets = [
        ...entry.relations.related,
        ...entry.relations.complementary,
        ...entry.relations.historicalVariants,
      ];
      expect(resolveSlugs(targets)).toHaveLength(targets.length);
    }
  });

  it('resolves every palette member', () => {
    for (const { palette } of allPalettes())
      for (const member of palette.colors) expect(entryBySlug(member.slug)).not.toBeNull();
  });

  it('reports the palettes a colour belongs to, with its role', () => {
    const anchored = allPalettes()[0]!.palette;
    const anchor = anchored.colors.find((c) => c.role === 'anchor')!;
    const found = palettesContaining(anchor.slug);
    expect(found.some((f) => f.palette.slug === anchored.slug && f.role === 'anchor')).toBe(true);
  });

  it('counts families, and they sum to the corpus', () => {
    const total = families().reduce((sum, f) => sum + f.count, 0);
    expect(total).toBe(CORPUS_ENTRY_COUNT);
    expect(families().length).toBeGreaterThan(1);
  });
});

describe('a Color is built from the authored XYZ, and nothing is recomputed', () => {
  it('uses the entry’s own canonical XYZ verbatim', () => {
    const { entry } = allEntries()[0]!;
    expect(colorFor(entry).xyz).toEqual(entry.color.xyz);
  });

  it('records provenance, which is what makes it renderable at all', () => {
    const { entry } = allEntries()[0]!;
    expect(colorFor(entry).provenance.source).toBe('reference');
  });

  /*
   * SEED_ORIGIN_SPACE is an assumption about the DATA — ADR-0065 specifies every seed value in
   * OKLCh — and this is the assertion that turns it into something that breaks when the
   * assumption stops holding. A measured entry arrives in XYZ, which `ColorSpace` cannot
   * express, and it must fail here rather than silently claim an origin it does not have.
   */
  it('every entry really did arrive in the space colorFor records', () => {
    expect(SEED_ORIGIN_SPACE).toBe('oklch');
    for (const { entry } of allEntries()) expect(entry.provenance.derivation).toMatch(/OKLCh/u);
  });
});

describe('what the bundle says about itself is what F-012 published', () => {
  it('is every entry our own editorial work, labelled as such', () => {
    for (const { entry } of allEntries()) {
      expect(entry.provenance.sourceType).toBe('editorial');
      expect(['japanese-inspired', 'editorial']).toContain(entry.classification);
    }
  });

  /*
   * FR-23 in its negative form. The renderer switches on `classification`, and the one thing it
   * may never do is present our curation as historical. Asserted over the DATA here, and over
   * the rendered detail screen in screens.test.tsx — the field being right and the screen
   * showing it are different claims.
   */
  it('claims no history anywhere in the seed corpus', () => {
    for (const { entry } of allEntries()) {
      expect(entry.classification).not.toBe('historical');
      expect(entry.taxonomy.era).toBeNull();
      expect(entry.editorial.historicalNote_en).toBeNull();
    }
  });

  it('declares its review independence on every entry, never leaving it absent', () => {
    for (const { entry } of allEntries())
      expect(['independent', 'self']).toContain(entry.provenance.reviewIndependence);
  });
});
