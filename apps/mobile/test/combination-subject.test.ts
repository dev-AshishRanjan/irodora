/**
 * What a combination can be about (F-197).
 *
 * F-194 built the screen around a corpus slug, because it had exactly one caller. A **garment**
 * cannot use that: its colour is a hex somebody captured or typed, and resolving it to the
 * nearest published colour would need the Wardrobe to print a distance it is forbidden to print
 * — or, worse, would answer about a different colour without saying so.
 *
 * So the engine takes the colour it was always able to take. What is checked here is the
 * consequence: **a free colour gets real relationships, and gets no curated ones.**
 */

import { combinationsFor } from '../src/combinations';
import { allCombinations, allEntries, combinationsContaining } from '../src/corpus';
import { displayFromOklch } from '../src/engine';

/** Two garment-ish colours that are not in the corpus. Far apart, so a difference is legible. */
const GARMENT_A: readonly [number, number, number] = [0.42, 0.09, 24];
const GARMENT_B: readonly [number, number, number] = [0.78, 0.06, 196];

describe('a colour that is not in the corpus', () => {
  it('is genuinely not in it, or the rest of this file is checking nothing', () => {
    const slugs = new Set(allEntries().map((e) => e.entry.slug));
    // A colour subject is identified by value, so what matters is that no ENTRY sits on these
    // coordinates — asserted through the same conversion the screen uses.
    const hexes = new Set(allEntries().map((e) => e.derived.hex));
    expect(hexes.has(displayFromOklch([...GARMENT_A]).hex)).toBe(false);
    expect(hexes.has(displayFromOklch([...GARMENT_B]).hex)).toBe(false);
    expect(slugs.size).toBeGreaterThan(0);
  });

  it('still gets every relationship the engine generates', () => {
    const relationships = combinationsFor(GARMENT_A);
    expect(relationships.length).toBeGreaterThan(0);
    for (const c of relationships) expect(c.companions.length).toBeGreaterThan(0);
  });

  /**
   * THE DECOY THIS FILE EXISTS FOR.
   *
   * The claim is *"the garment's own colour goes in"*. An implementation that ignored the colour
   * — resolving to a nearest entry, or falling back to some default — would satisfy every other
   * assertion here and return **the same relationships for every garment**.
   */
  it('answers about THAT colour, not about some colour', () => {
    const a = combinationsFor(GARMENT_A);
    const b = combinationsFor(GARMENT_B);
    const shape = (cs: typeof a): string =>
      cs
        .map((c) =>
          c.companions
            .map((x) => displayFromOklch([x.oklch[0], x.oklch[1], x.oklch[2]]).hex)
            .join(','),
        )
        .join(' | ');
    expect(shape(a)).not.toBe(shape(b));
  });

  it('has no curated combinations, because those are keyed to published colours', () => {
    /*
     * Not a gap — a structural fact. An editor chooses specific published colours (F-196), so a
     * colour outside the corpus has none, and the screen says so rather than leaving a section
     * silently absent.
     */
    expect(allCombinations().length).toBeGreaterThan(0);
    expect(combinationsContaining('')).toHaveLength(0);
    expect(combinationsContaining('a-colour-nobody-published')).toHaveLength(0);
  });
});

describe('a corpus colour keeps both halves', () => {
  it('gets generated relationships AND the curated ones it belongs to', () => {
    // The other side of the assertion above: if curated were dropped for everybody, the test
    // above would pass and the feature would be gone.
    const lead = allCombinations()[0]!.combination.colors.find((c) => c.role === 'lead')!;
    const entry = allEntries().find((e) => e.entry.slug === lead.slug)!;
    const { oklch } = entry.derived;

    expect(combinationsFor([oklch[0], oklch[1], oklch[2]]).length).toBeGreaterThan(0);
    expect(combinationsContaining(lead.slug).length).toBeGreaterThan(0);
  });
});
