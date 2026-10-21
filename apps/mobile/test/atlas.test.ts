/**
 * What the Atlas lists and what its cards say (F-246; ADR-0140, ADR-0142, ADR-0143).
 *
 * - **The search** answers names, family words and a hex. The hex branch is held to the Finder's
 *   own ranking (`find`, the oracle), and a phrase is read as words — the Finder's region is the
 *   decoy that shows the two are different.
 * - **The filters**: a season, the family chips (OR within the row, AND with the rest), the facets,
 *   and the bookmark toggle.
 * - **The words are true of every entry**: the title's 日本に着想を得た色 and the count's *Original*
 *   over all 120, era null on all 120 — each with a planted decoy.
 * - **The card**: its season line, its OKLCh line, its name; the family dot is a member of its group.
 */

import { deltaE00 } from '@irodora/color-difference';
import type { PublishedEntry } from '@irodora/corpus';
import {
  atlasCardName,
  capitalisedRomaji,
  atlasCountLabel,
  atlasMatches,
  atlasNarrowed,
  atlasOklch,
  atlasShown,
  familyDot,
  familyDotEntry,
  familyGroups,
  NO_FILTERS,
  seasonLine,
  type AtlasFilters,
} from '../src/atlas';
import { allEntries, colorFor, CORPUS_ENTRY_COUNT, groupOf } from '../src/corpus';
import { find, HEX_LIMIT, hexNearest } from '../src/finder';
import { t as message, type MessageKey } from '../src/i18n';
import { oklchLine } from '../src/notation';

const ENTRIES = allEntries();
const t = (key: MessageKey): string => message('en', key);
const tJa = (key: MessageKey): string => message('ja', key);
const slugs = (list: readonly PublishedEntry[]): readonly string[] => list.map((e) => e.entry.slug);
const filters = (over: Partial<AtlasFilters>): AtlasFilters => ({ ...NO_FILTERS, ...over });

describe('what the Atlas lists', () => {
  it('lists the whole corpus in its own order when nothing narrows it', () => {
    expect(slugs(atlasShown(ENTRIES, '', NO_FILTERS))).toStrictEqual(slugs(ENTRIES));
    expect(ENTRIES).toHaveLength(CORPUS_ENTRY_COUNT);
  });

  it('narrows by season to the entries authored with it', () => {
    const autumn = atlasShown(ENTRIES, '', filters({ season: 'autumn' }));
    expect(autumn.length).toBeGreaterThan(0);
    for (const e of autumn) expect(e.entry.taxonomy.season).toContain('autumn');
    // DECOY: an entry with no season is never listed under one.
    expect(autumn.some((e) => e.entry.taxonomy.season === null)).toBe(false);
    expect(ENTRIES.some((e) => e.entry.taxonomy.season === null)).toBe(true);
  });

  it('takes the family chips as OR within the row and AND with everything else', () => {
    const ao = atlasShown(ENTRIES, '', filters({ groups: new Set(['ao']) }));
    const aka = atlasShown(ENTRIES, '', filters({ groups: new Set(['aka']) }));
    const both = atlasShown(ENTRIES, '', filters({ groups: new Set(['ao', 'aka']) }));
    expect(both).toHaveLength(ao.length + aka.length);
    for (const e of both) expect(['ao', 'aka']).toContain(groupOf(e.entry.taxonomy.family).group);
    const withSeason = atlasShown(
      ENTRIES,
      '',
      filters({ groups: new Set(['ao', 'aka']), season: 'winter' }),
    );
    for (const e of withSeason) expect(e.entry.taxonomy.season).toContain('winter');
    expect(withSeason.length).toBeLessThan(both.length);
  });

  it('narrows by the facets the overflow holds (FR-20)', () => {
    const warm = atlasShown(ENTRIES, '', filters({ temperature: 'warm' }));
    expect(warm.length).toBeGreaterThan(0);
    expect(warm.length).toBeLessThan(ENTRIES.length);
    for (const e of warm) expect(e.entry.taxonomy.temperature).toBe('warm');
  });

  it('narrows to the bookmarked set, AND with the rest', () => {
    const first = ENTRIES[0]!;
    const marked = new Set([first.entry.slug]);
    expect(slugs(atlasShown(ENTRIES, '', NO_FILTERS, marked))).toStrictEqual([first.entry.slug]);
    // DECOY: off, the set narrows nothing.
    expect(atlasShown(ENTRIES, '', NO_FILTERS, null)).toHaveLength(ENTRIES.length);
  });
});

describe('the search answers names, family words and a hex (ADR-0143 D1)', () => {
  it('ranks a hex by ΔE00 exactly as the Finder does, when nothing else narrows it', () => {
    const shown = atlasShown(ENTRIES, '#C5CFD4', NO_FILTERS);
    expect(shown).toHaveLength(HEX_LIMIT);
    expect(slugs(shown)).toStrictEqual(slugs(find('#C5CFD4').entries));
  });

  it('ranks the whole corpus, then narrows it, then takes the nearest few', () => {
    const shown = atlasShown(ENTRIES, '#C5CFD4', filters({ temperature: 'warm' }));
    const whole = hexNearest('#C5CFD4', ENTRIES.length) ?? [];
    const expected = whole
      .map((n) => n.entry)
      .filter((e) => e.entry.taxonomy.temperature === 'warm')
      .slice(0, HEX_LIMIT);
    expect(slugs(shown)).toStrictEqual(slugs(expected));
    // DECOY: the Finder's own eight, narrowed afterwards, would be fewer or different.
    const narrowedLate = find('#C5CFD4').entries.filter(
      (e) => e.entry.taxonomy.temperature === 'warm',
    );
    expect(slugs(shown)).not.toStrictEqual(slugs(narrowedLate));
  });

  it('finds a family by its chip’s words: every member of the group, in either script', () => {
    const ao = ENTRIES.filter((e) => groupOf(e.entry.taxonomy.family).group === 'ao');
    expect(ao.length).toBeGreaterThan(1);
    for (const q of ['Ao', '青', 'ao']) {
      const listed = new Set(slugs(atlasShown(ENTRIES, q, NO_FILTERS)));
      expect({
        [q]: ao.filter((e) => !listed.has(e.entry.slug)).map((e) => e.entry.slug),
      }).toStrictEqual({
        [q]: [],
      });
    }
    // DECOY: a group's word lists that group's members and not every entry.
    expect(atlasShown(ENTRIES, '青', NO_FILTERS).length).toBeLessThan(ENTRIES.length);
  });

  it('reads part of a hex as a substring, not as a hex to rank', () => {
    expect(hexNearest('#5B', 8)).toBeNull();
    const expected = ENTRIES.filter((e) => e.derived.hex.toLowerCase().includes('#5b')).map(
      (e) => e.entry.slug,
    );
    expect(slugs(atlasShown(ENTRIES, '#5B', NO_FILTERS))).toStrictEqual(expected);
  });

  it('DECOY — a phrase is read as words here, where the Finder answers a region', () => {
    const atlas = atlasShown(ENTRIES, 'dark', NO_FILTERS);
    const finder = find('dark');
    expect(finder.kind).toBe('phrase');
    for (const e of atlas) expect(atlasMatches(e, 'dark')).toBe(true);
    expect(slugs(atlas)).not.toStrictEqual(slugs(finder.entries));
  });

  it('DECOY — six letters with no hash and no digit are a word, not a hex', () => {
    expect(hexNearest('beaded', 8)).toBeNull();
    expect(atlasShown(ENTRIES, 'beaded', NO_FILTERS)).toHaveLength(0);
  });

  it('says when anything narrows the list', () => {
    expect(atlasNarrowed('', NO_FILTERS, false)).toBe(false);
    expect(atlasNarrowed(' ', NO_FILTERS, false)).toBe(false);
    expect(atlasNarrowed('ao', NO_FILTERS, false)).toBe(true);
    expect(atlasNarrowed('', NO_FILTERS, true)).toBe(true);
    expect(atlasNarrowed('', filters({ groups: new Set(['ki']) }), false)).toBe(true);
    expect(atlasNarrowed('', filters({ chroma: 'low' }), false)).toBe(true);
  });
});

describe('05’s words are true of every entry (ADR-0140, ADR-0142)', () => {
  const classifications = (list: readonly { entry: { classification: string } }[]) =>
    new Set(list.map((e) => e.entry.classification));

  it('the title’s 日本に着想を得た色: every published entry is japanese-inspired', () => {
    const count = (list: readonly { entry: { classification: string } }[]) =>
      list.filter((e) => e.entry.classification !== 'japanese-inspired').length;
    expect(count(ENTRIES)).toBe(0);
    // DECOY: a planted traditional entry is counted.
    expect(count([...ENTRIES, { entry: { classification: 'traditional' } }])).toBe(1);
  });

  it('the count’s Original: every classification is one of the two the catalogue calls original', () => {
    const original = new Set(['japanese-inspired', 'editorial']);
    const notOriginal = (list: readonly { entry: { classification: string } }[]) =>
      list.filter((e) => !original.has(e.entry.classification)).length;
    expect(notOriginal(ENTRIES)).toBe(0);
    // DECOY: a planted traditional entry is counted, so a corpus that gains one fails here first.
    expect(notOriginal([...ENTRIES, { entry: { classification: 'traditional' } }])).toBe(1);
    expect(classifications(ENTRIES).size).toBeGreaterThan(0);
    expect(t('classification.editorial')).toContain('original');
    expect(t('classification.japanese-inspired')).toContain('original');
  });

  it('no era is printed because no entry holds one', () => {
    const withEra = (list: readonly { entry: { taxonomy: { era: string | null } } }[]) =>
      list.filter((e) => e.entry.taxonomy.era !== null).length;
    expect(withEra(ENTRIES)).toBe(0);
    // DECOY: a planted era is counted, so a corpus that gains one fails here first.
    expect(withEra([...ENTRIES, { entry: { taxonomy: { era: 'heian' } } }])).toBe(1);
  });
});

describe('what a card says', () => {
  const autumn = ENTRIES.find((e) => e.entry.taxonomy.season?.includes('autumn'))!;
  const none = ENTRIES.find((e) => e.entry.taxonomy.season === null)!;

  it('ends in the season the entry was authored with, in each language', () => {
    expect(seasonLine(autumn, t, 'latin')).toBe(t('season.autumn'));
    expect(seasonLine(autumn, tJa, 'japanese')).toBe(tJa('season.autumn'));
    // DECOY: no season, no line — not an empty one.
    expect(seasonLine(none, t, 'latin')).toBeNull();
  });

  it('joins several seasons as each script joins a list', () => {
    const two = {
      ...autumn,
      entry: {
        ...autumn.entry,
        taxonomy: { ...autumn.entry.taxonomy, season: ['spring', 'autumn'] },
      },
    } as PublishedEntry;
    expect(seasonLine(two, t, 'latin')).toBe(`${t('season.spring')} · ${t('season.autumn')}`);
    expect(seasonLine(two, tJa, 'japanese')).toBe(
      `${tJa('season.spring')}・${tJa('season.autumn')}`,
    );
  });

  it('prints OKLCh as 05 does, with a colon after the space’s name', () => {
    const line = atlasOklch(autumn.derived.oklch, 'OKLCh');
    expect(line).toBe(oklchLine(autumn.derived.oklch, 'OKLCh', ': '));
    expect(line.startsWith('OKLCh: ')).toBe(true);
  });

  it('is named with everything it prints, and the English it does not', () => {
    const name = atlasCardName(autumn, t, 'latin');
    const { kanji, romaji, en } = autumn.entry.name;
    for (const part of [kanji, en, autumn.derived.hex.replace('#', ''), 'reference', 'OKLCh: '])
      expect(name).toContain(part);
    expect(name).toContain(capitalisedRomaji(romaji));
    expect(name).toContain(t('season.autumn'));
    // DECOY: without a season, no season words.
    expect(atlasCardName(none, t, 'latin')).not.toContain(t('season.autumn'));
  });

  it('counts the corpus as Original Colours, joined as each language joins', () => {
    expect(atlasCountLabel(120, t, 'latin')).toBe('120 Original Colours');
    expect(atlasCountLabel(120, tJa, 'japanese')).toBe('120のオリジナル色');
  });
});

describe('a family chip’s dot is its group’s medoid (ADR-0143 D4)', () => {
  it('is a member of its group, drawn with that entry’s own hex and provenance', () => {
    for (const group of familyGroups()) {
      const entry = familyDotEntry(group, ENTRIES);
      expect(group.families).toContain(entry.entry.taxonomy.family);
      const dot = familyDot(group, ENTRIES);
      expect(dot.hex).toBe(entry.derived.hex);
      expect(dot.color.provenance.source).toBe(colorFor(entry.entry).provenance.source);
    }
  });

  /** Each member's summed ΔE00 to the others, over the published Lab: the rule ADR-0143 D4 states. */
  const sums = (members: readonly PublishedEntry[]) =>
    members.map((m) => ({
      slug: m.entry.slug,
      sum: members.reduce((n, o) => (o === m ? n : n + deltaE00(m.derived.lab, o.derived.lab)), 0),
    }));
  const membersOf = (group: ReturnType<typeof familyGroups>[number], list = ENTRIES) =>
    list.filter((e) => group.families.includes(e.entry.taxonomy.family));

  it('is the member whose summed ΔE00 to the others is least, the earlier slug on a tie', () => {
    for (const group of familyGroups()) {
      const all = sums(membersOf(group));
      const least = Math.min(...all.map((m) => m.sum));
      const expected = all
        .filter((m) => m.sum === least)
        .map((m) => m.slug)
        .sort()[0];
      expect({ [group.group]: familyDotEntry(group, ENTRIES).entry.slug }).toStrictEqual({
        [group.group]: expected,
      });
    }
  });

  it('DECOY — the medoid is not the first member by slug, so the rule above is not that one', () => {
    const differs = familyGroups().filter((group) => {
      const first = membersOf(group)
        .map((e) => e.entry.slug)
        .sort()[0];
      return familyDotEntry(group, ENTRIES).entry.slug !== first;
    });
    expect(differs.length).toBeGreaterThan(0);
  });

  it('DECOY — a colour outside the group is never its dot, even at the group’s centre', () => {
    const group = familyGroups()[0]!;
    const members = membersOf(group);
    const medoid = familyDotEntry(group, ENTRIES);
    // A foreign entry planted at the medoid's own Lab would tie it on every distance.
    const foreign = ENTRIES.find((e) => !group.families.includes(e.entry.taxonomy.family))!;
    const planted = { ...foreign, derived: { ...foreign.derived, lab: medoid.derived.lab } };
    const chosen = familyDotEntry(group, [planted, ...members]);
    expect(group.families).toContain(chosen.entry.taxonomy.family);
  });

  it('is worked out over the list it is given, not remembered from another', () => {
    const group = familyGroups()[0]!;
    const medoid = familyDotEntry(group, ENTRIES);
    const without = ENTRIES.filter((e) => e !== medoid);
    expect(familyDot(group, ENTRIES).hex).toBe(medoid.derived.hex);
    // DECOY: a list without that medoid has another dot — the cache answered the first list until S1.
    expect(familyDot(group, without).hex).toBe(familyDotEntry(group, without).derived.hex);
    expect(familyDotEntry(group, without).entry.slug).not.toBe(medoid.entry.slug);
  });

  it('is the same member every time, whatever order the entries come in', () => {
    const group = familyGroups()[0]!;
    expect(familyDotEntry(group, [...ENTRIES].reverse()).entry.slug).toBe(
      familyDotEntry(group, ENTRIES).entry.slug,
    );
  });

  it('DECOY — a group with no members has no dot to draw', () => {
    const group = familyGroups()[0]!;
    const foreign = ENTRIES.filter((e) => !group.families.includes(e.entry.taxonomy.family));
    expect(() => familyDotEntry(group, foreign)).toThrow();
  });
});
