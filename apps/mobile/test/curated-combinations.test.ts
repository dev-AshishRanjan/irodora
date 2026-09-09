/**
 * The curated combinations, as the app reads them (F-196).
 *
 * The schema is tested in `@irodora/corpus` against fixtures, and the content gate validates the
 * real records. What is checked here is the **app's** question — *which combinations is this
 * colour in, and what does it do in each* — plus the two claims the record type exists to make:
 * that every one of them is ours, and that none of them is presented as history.
 */

import { allCombinations, allEntries, combinationsContaining } from '../src/corpus';

describe('the corpus ships curated combinations', () => {
  it('has some, so every assertion below is about something', () => {
    expect(allCombinations().length).toBeGreaterThan(0);
  });

  it('exercises every intent the schema allows', () => {
    /*
     * A union member no record produces is a value nothing consumes — the shape `slots.ts`
     * refuses by name. Asserted rather than assumed, so adding an intent to the schema without
     * a record that uses it fails here.
     */
    const intents = new Set(allCombinations().map((c) => c.combination.intent));
    expect([...intents].sort()).toEqual(['accent', 'contrast', 'harmony', 'tonal']);
  });
});

describe('every combination is ours, and says so', () => {
  it('is classified as our own curation, never as history', () => {
    // The parser refuses anything else; this is the assertion that the SHIPPED records went
    // through that parser rather than being written into the bundle by another path.
    for (const { combination } of allCombinations())
      expect(`${combination.slug}: ${combination.classification}`).toMatch(
        /: (editorial|japanese-inspired)$/u,
      );
  });

  it('carries editorial provenance with a real derivation and a named reviewer', () => {
    for (const { combination } of allCombinations()) {
      const p = combination.provenance;
      expect(`${combination.slug}: ${p.sourceType}`).toBe(`${combination.slug}: editorial`);
      // `rightsHolder` is nullable in the schema — an entry can legitimately have none. For a
      // combination it may not, which is what this asserts, so the null is compared rather than
      // interpolated into a string that would read "undefined" and still fail for the wrong reason.
      expect(`${combination.slug}: ${p.rightsHolder ?? '(none)'}`).toBe(
        `${combination.slug}: Irodora`,
      );
      expect(p.verifiedBy).not.toBeNull();
      expect(p.reviewIndependence).not.toBeNull();
      // A derivation long enough to be a reason rather than a label. "Editorial" alone is a
      // classification, not a derivation a future editor could correct.
      expect(p.derivation.length).toBeGreaterThan(80);
    }
  });

  it('pairs only colours we published ourselves', () => {
    // The gate enforces this over `content/`; this asserts it of what actually SHIPPED, which
    // is a different artefact and the one the app renders.
    const known = new Set(allEntries().map((e) => e.entry.slug));
    for (const { combination } of allCombinations())
      for (const m of combination.colors)
        expect(`${combination.slug} → ${m.slug}: ${String(known.has(m.slug))}`).toBe(
          `${combination.slug} → ${m.slug}: true`,
        );
  });
});

describe('which combinations a colour is in', () => {
  it('finds a colour in the combination that leads with it', () => {
    const first = allCombinations()[0]!.combination;
    const lead = first.colors.find((c) => c.role === 'lead')!;
    const found = combinationsContaining(lead.slug);
    expect(found.map((f) => f.combination.slug)).toContain(first.slug);
    expect(found.find((f) => f.combination.slug === first.slug)?.role).toBe('lead');
  });

  it('finds a colour that is a COMPANION, not only one that leads', () => {
    /*
     * The decoy. An implementation that matched on the lead alone would satisfy the case above
     * and hide every combination a colour merely belongs to — making the answer depend on which
     * member a curator happened to write first.
     */
    const first = allCombinations()[0]!.combination;
    const companion = first.colors.find((c) => c.role === 'companion')!;
    const found = combinationsContaining(companion.slug);
    expect(found.map((f) => f.combination.slug)).toContain(first.slug);
    expect(found.find((f) => f.combination.slug === first.slug)?.role).toBe('companion');
  });

  it('returns nothing for a colour in none of them, rather than guessing', () => {
    const inSome = new Set(
      allCombinations().flatMap(({ combination }) => combination.colors.map((c) => c.slug)),
    );
    const orphan = allEntries().find((e) => !inSome.has(e.entry.slug));
    expect(orphan).toBeDefined();
    expect(combinationsContaining(orphan!.entry.slug)).toHaveLength(0);
  });

  it('returns nothing for a slug that is not a colour at all', () => {
    expect(combinationsContaining('no-such-colour')).toHaveLength(0);
  });
});
