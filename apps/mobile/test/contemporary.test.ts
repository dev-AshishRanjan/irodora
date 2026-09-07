/**
 * Contemporary equivalents (F-155, FR-72).
 *
 * ## What is actually being proven
 *
 * The arithmetic is the easy half. What matters is that **the two kinds cannot be confused** —
 * a computed neighbour presented as editorial judgement is a claim nobody made — and that an
 * entry which is itself in a palette says so rather than reporting a distance of zero to itself.
 *
 * Criterion 3 is discharged by `tsc` rather than by an assertion: the refusals below are
 * compile-time claims about the TYPE, asserted in both directions so a union carrying neither
 * field would fail too.
 */

import {
  equivalentsFor,
  EQUIVALENT_CEILING,
  EQUIVALENT_LIMIT,
  type Equivalent,
} from '../src/contemporary';
import { allEntries, allPalettes, entryBySlug } from '../src/corpus';
import { deltaE00 } from '@irodora/color-difference';

/** Every entry that appears in a palette whose category is `contemporary`. */
const referenceSlugs = new Set(
  allPalettes()
    .filter(({ palette }) => palette.category === 'contemporary')
    .flatMap(({ palette }) => palette.colors.map((c) => c.slug)),
);

const subject = allEntries()[0]!;

describe('what counts as a contemporary reference', () => {
  it('is the curated contemporary palettes, and nothing else', () => {
    /*
     * The only set here that is both contemporary and editorially signed off. An external
     * reference — Pantone, RAL, a retailer's range — is licensed and absent, and inventing one
     * would be the unsourced claim the content rules exist to prevent.
     */
    expect(referenceSlugs.size).toBeGreaterThan(0);
    for (const slug of referenceSlugs) expect(entryBySlug(slug)).not.toBeNull();
  });

  it('excludes the seasonal palette, which answers a different question', () => {
    // Curated and signed off, and it groups by time of year. Answering "what could I buy in
    // this" with a summer palette would be answering something nobody asked.
    const seasonal = allPalettes().find(({ palette }) => palette.category === 'seasonal');
    expect(seasonal).toBeDefined();

    const onlySeasonal = (seasonal?.palette.colors ?? [])
      .map((c) => c.slug)
      .filter((slug) => !referenceSlugs.has(slug));
    expect(onlySeasonal.length).toBeGreaterThan(0);
  });
});

describe('the computed equivalents', () => {
  it('are the nearest references by ΔE00, and the delta is the engine’s own', () => {
    const { computed } = equivalentsFor(subject);
    for (const item of computed) {
      if (item.kind !== 'computed') throw new Error('computed list holds an editorial item');
      // Not a recomputation with a tolerance — the same function, so a second implementation
      // would show up as an exact mismatch rather than as drift nobody notices.
      expect(item.deltaE00).toBe(deltaE00(subject.derived.lab, item.entry.derived.lab));
      expect(referenceSlugs.has(item.entry.entry.slug)).toBe(true);
    }
  });

  it('are ordered, capped, and never the subject itself', () => {
    for (const entry of allEntries().slice(0, 12)) {
      const { computed } = equivalentsFor(entry);
      expect(computed.length).toBeLessThanOrEqual(EQUIVALENT_LIMIT);

      const deltas = computed.map((c) => (c.kind === 'computed' ? c.deltaE00 : Number.NaN));
      expect([...deltas].sort((a, b) => a - b)).toEqual(deltas);
      for (const c of computed) expect(c.entry?.entry.slug).not.toBe(entry.entry.slug);
    }
  });

  it('are deterministic — the same entry gives the same answer', () => {
    // A ranking broken by directory order is a ranking that changes between machines. Ties are
    // broken by slug for exactly that reason.
    const once = equivalentsFor(subject).computed.map((c) => c.entry?.entry.slug);
    const twice = equivalentsFor(subject).computed.map((c) => c.entry?.entry.slug);
    expect(twice).toEqual(once);
  });

  it('offers nothing rather than something far away', () => {
    /*
     * The reference set is 28 entries wide, so a colour can genuinely have no near neighbour in
     * it. Offering the least distant thing and letting the number carry a disclaimer nobody
     * reads is how a product ends up asserting a correspondence it cannot stand behind.
     */
    for (const entry of allEntries()) {
      const { computed, nothingNear } = equivalentsFor(entry);
      for (const c of computed)
        if (c.kind === 'computed') expect(c.deltaE00).toBeLessThanOrEqual(EQUIVALENT_CEILING);
      expect(nothingNear).toBe(computed.length === 0);
    }
  });

  it('DECOY — some entry actually has one, so the ceiling is not refusing everything', () => {
    // Without this, a ceiling of 0 would satisfy every assertion above.
    const withAny = allEntries().filter((e) => equivalentsFor(e).computed.length > 0);
    expect(withAny.length).toBeGreaterThan(0);
  });
});

describe('an entry that is itself in a contemporary palette', () => {
  it('says so, rather than reporting a distance of zero to itself', () => {
    const member = entryBySlug([...referenceSlugs][0] ?? '');
    expect(member).not.toBeNull();
    if (member === null) return;

    const { membership, computed } = equivalentsFor(member);
    expect(membership.length).toBeGreaterThan(0);
    expect(membership[0]?.paletteName.length).toBeGreaterThan(0);
    // It is IN a palette, which is a different sentence from being near one.
    for (const c of computed) expect(c.entry?.entry.slug).not.toBe(member.entry.slug);
  });

  it('DECOY — an entry that is in none has no membership', () => {
    const outsider = allEntries().find((e) => !referenceSlugs.has(e.entry.slug));
    expect(outsider).toBeDefined();
    expect(equivalentsFor(outsider!).membership).toHaveLength(0);
  });
});

describe('the two kinds cannot be confused (criterion 3)', () => {
  /*
   * THE CRITERION, AS A COMPILE-TIME ASSERTION.
   *
   * The first draft used `@ts-expect-error` on a property read, which `tsc` accepts and lint
   * refuses — an error-typed value is an unsafe assignment however deliberate it is. These say
   * the same thing about the TYPE without touching a value: each alias resolves to `true` or
   * `false`, and assigning the wrong literal does not compile.
   *
   * Both directions, because a union that carried neither field would satisfy the refusals and
   * be worse than no union at all [[a-decoy-that-is-not-broken-proves-nothing]].
   */
  type Editorial = Extract<Equivalent, { kind: 'editorial' }>;
  type Computed = Extract<Equivalent, { kind: 'computed' }>;

  type Has<T, K extends string> = K extends keyof T ? true : false;

  it('gives an editorial equivalent no delta, and a computed one no note', () => {
    // The refusals. A renderer that read a delta off an editorial equivalent would be showing a
    // number nobody computed for a judgement somebody made.
    const editorialHasDelta: Has<Editorial, 'deltaE00'> = false;
    const computedHasNote: Has<Computed, 'note'> = false;

    // And the decoys: each kind DOES carry its own, so a union with neither would fail here.
    const editorialHasNote: Has<Editorial, 'note'> = true;
    const computedHasDelta: Has<Computed, 'deltaE00'> = true;

    expect([editorialHasDelta, computedHasNote]).toEqual([false, false]);
    expect([editorialHasNote, computedHasDelta]).toEqual([true, true]);
  });

  it('carries provenance on the editorial kind and nowhere else', () => {
    // A judgement without a name on it is the corpus's authority lent to an opinion, and a
    // computed neighbour has no name to carry.
    const editorialHasProvenance: Has<Editorial, 'provenance'> = true;
    const computedHasProvenance: Has<Computed, 'provenance'> = false;
    expect([editorialHasProvenance, computedHasProvenance]).toEqual([true, false]);
  });
});

describe('the editorial equivalents', () => {
  it('are empty on every published entry, which is editorial work rather than a gap', () => {
    /*
     * Each one needs a note, a source, and a reviewer who is not its author — all enforced by
     * the content gate, none of which a generator can supply. The path is exercised by the
     * fixture corpus, which has fixture editors; asserting it here would mean asserting that
     * somebody had done editorial work that nobody has done.
     */
    for (const entry of allEntries()) expect(equivalentsFor(entry).editorial).toHaveLength(0);
  });
});
