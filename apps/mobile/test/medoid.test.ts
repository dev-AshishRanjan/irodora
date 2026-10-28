/**
 * The medoid (F-250, E-231): one definition read by `05`'s family dots and `09`'s search point.
 *
 * The oracle is the loop `atlas.ts#familyDotEntry` carried before F-250 moved it here, written out
 * again as the test's own statement of the rule — least summed ΔE00 over published Lab, the earlier
 * slug on a tie — and checked over every family group and the whole corpus.
 */

import { deltaE00 } from '@irodora/color-difference';
import { familyDotEntry } from '../src/atlas';
import { allEntries, familyGroups, type PublishedEntry } from '../src/corpus';
import { medoid } from '../src/medoid';

const ENTRIES = allEntries();
/** A corpus-wide sum of ΔE00 is heavy under a full run (F-249's `8d6a0b7`; F-348, F-350). */
const CORPUS_WIDE = 120_000;

/** The rule, stated: every member's summed ΔE00 to the others; the least, the earlier slug on a tie. */
function expected(members: readonly PublishedEntry[]): string {
  const sums = members.map((m) => ({
    slug: m.entry.slug,
    sum: members.reduce((n, o) => (o === m ? n : n + deltaE00(m.derived.lab, o.derived.lab)), 0),
  }));
  const least = Math.min(...sums.map((s) => s.sum));
  return sums
    .filter((s) => s.sum === least)
    .map((s) => s.slug)
    .sort()[0]!;
}

describe('the medoid', () => {
  it(
    'is the member whose summed ΔE00 to the others is least, over every family group',
    () => {
      for (const group of familyGroups()) {
        const members = ENTRIES.filter((e) => group.families.includes(e.entry.taxonomy.family));
        expect({ [group.group]: medoid(members).entry.slug }).toStrictEqual({
          [group.group]: expected(members),
        });
        // 05's dots read it.
        expect(familyDotEntry(group, ENTRIES)).toBe(medoid(members));
      }
    },
    CORPUS_WIDE,
  );

  it(
    'of the whole corpus is hai-suna, the Finder’s start point (ADR-0158 D2)',
    () => {
      expect(medoid(ENTRIES).entry.slug).toBe(expected(ENTRIES));
      expect(medoid(ENTRIES).entry.slug).toBe('hai-suna');
    },
    CORPUS_WIDE,
  );

  it(
    'does not depend on the order it is given',
    () => {
      expect(medoid([...ENTRIES].reverse())).toBe(medoid(ENTRIES));
    },
    CORPUS_WIDE,
  );

  it('takes the earlier slug on a tie: two members are each other’s whole sum', () => {
    const [a, b] = [ENTRIES[7], ENTRIES[3]] as [PublishedEntry, PublishedEntry];
    const earlier = [a, b].sort((x, y) => x.entry.slug.localeCompare(y.entry.slug))[0];
    expect(medoid([a, b])).toBe(earlier);
    expect(medoid([b, a])).toBe(earlier);
  });

  it('DECOY — is not the first member by slug', () => {
    expect(medoid(ENTRIES).entry.slug).not.toBe(ENTRIES.map((e) => e.entry.slug).sort()[0]);
  });

  it('refuses an empty set, which has none', () => {
    expect(() => medoid([])).toThrow(/empty set/u);
  });
});
