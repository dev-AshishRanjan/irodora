/**
 * What the Atlas does, and what it never says (F-246; ADR-0140, ADR-0142, ADR-0143).
 *
 * - **No 05 sample content.** 05 draws Ai-nezumi, Moegi, Toki-iro and Jinza-momi, their figures, an
 *   era and *Sourced*; the screen draws the corpus's own, in both locales and both themes, in what
 *   it prints and in what it says. A planted name is the decoy.
 * - **One control per card** (D8): pressing its words or its sample opens that colour, and the sample
 *   is hidden from assistive technology. Without a destination the card is no button.
 * - **The overflow** (D5, D6): *More filters* opens the sheet, a facet narrows the list and shows the
 *   count, *Clear* resets everything that narrows it.
 * - **The three pills** (D7) call their destinations; an absent destination is an absent pill.
 */

let mockLanguageTag = 'en-GB';
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChoiceGroup, Sheet, Swatch, ThemeProvider } from '@irodora/ui';
import { renderedTexts, type TestNode } from '@irodora/ui/testing';
import { atlasCardName, atlasShown, NO_FILTERS } from '../src/atlas';
import { allEntries, CORPUS_ENTRY_COUNT } from '../src/corpus';
import { t, type MessageKey } from '../src/i18n';
import { Atlas } from '../src/screens/Atlas';

const en = (key: MessageKey): string => t('en', key);

beforeEach(() => {
  mockLanguageTag = 'en-GB';
  // The sheet's mapper ticks after a render; nothing here is about a frame (F-158).
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const ENTRIES = allEntries();
const FIRST = ENTRIES[0]!;
const count = (n: number): string =>
  `${en('atlas.showing')} ${String(n)} / ${String(CORPUS_ENTRY_COUNT)}`;

/* ------------------------------------------------------------------ 05's content, never drawn */

/**
 * What 05 prints that is not ours: its four colours' names, hexes and figures, its era and its
 * claims, and its two typos (§2, not design). Matched as whole words, so a corpus OKLCh line that
 * happens to contain 0.49 in 0.498 is not mistaken for 05's figure.
 */
const SAMPLE = [
  'Ai-nezumi',
  '藍鼠',
  'Moegi',
  '萌黄',
  'Toki-iro',
  '鴇色',
  'Jinza-momi',
  '甚三紅',
  '#5B6B78',
  '#7BA23F',
  '#F4A7B9',
  '#EB6EA5',
  '0.49',
  '240°',
  'Heian',
  'Edo',
  '伝統',
  'Traditional',
  'Sourced',
  '[Compare]',
  'Color Family',
] as const;
const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
/** A sample word as a whole: not inside a longer word or figure. */
const asWord = (s: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}.])${escaped(s)}(?![\\p{L}\\p{N}])`, 'u');

const drawn = (node: React.JSX.Element, theme: 'light' | 'dark'): TestNode => {
  const json = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>).toJSON();
  if (json === null || Array.isArray(json)) throw new Error('expected one root');
  return json;
};
const found = (tree: TestNode): readonly string[] => {
  const texts = renderedTexts(tree).map((r) => r.text);
  return SAMPLE.filter((s) => texts.some((text) => asWord(s).test(text)));
};

describe('none of 05’s sample content is drawn or said', () => {
  it.each([
    ['en-GB', 'light'],
    ['en-GB', 'dark'],
    ['ja-JP', 'light'],
    ['ja-JP', 'dark'],
  ] as const)('in %s, %s: nothing of 05’s, as drawn and with Autumn chosen', (tag, theme) => {
    mockLanguageTag = tag;
    expect(
      found(drawn(<Atlas onSelect={() => undefined} bookmarked={new Set()} />, theme)),
    ).toStrictEqual([]);
    expect(
      found(drawn(<Atlas initialSeason="autumn" onSelect={() => undefined} />, theme)),
    ).toStrictEqual([]);
  });

  it('DECOY — a planted name, and a planted figure, are found', () => {
    const planted: TestNode = {
      type: 'View',
      props: {},
      children: [
        { type: 'Text', props: {}, children: ['Ai-nezumi'] },
        { type: 'Text', props: {}, children: ['OKLCh: 0.49 • 0.02 • 240°'] },
      ],
    };
    expect(found(planted)).toStrictEqual(['Ai-nezumi', '0.49', '240°']);
    // DECOY of the decoy: a corpus figure that merely contains 0.49 is not 05's.
    const corpus: TestNode = {
      type: 'View',
      props: {},
      children: [{ type: 'Text', props: {}, children: ['OKLCh: 0.498 • 0.040 • 244.0°'] }],
    };
    expect(found(corpus)).toStrictEqual([]);
  });
});

/* ------------------------------------------------------------------ one control per card */

describe('a card is one control (ADR-0143 D8)', () => {
  it('opens its colour from its words and from its sample, and is heard once', () => {
    const onSelect = jest.fn();
    render(
      <ThemeProvider theme="dark">
        <Atlas onSelect={onSelect} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByText(FIRST.entry.name.kanji));
    expect(onSelect).toHaveBeenLastCalledWith(FIRST.entry.slug);
    const sample = screen.UNSAFE_getAllByType(Swatch)[0]!;
    fireEvent.press(sample);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(FIRST.entry.slug);
    // Heard once: the card by its full name, and the sample not at all.
    const name = atlasCardName(FIRST, en, 'latin');
    expect(screen.getAllByRole('button', { name })).toHaveLength(1);
    expect(screen.queryByLabelText(FIRST.entry.name.en)).toBeNull();
  });

  it('DECOY — without a destination no card is a button', () => {
    render(
      <ThemeProvider theme="dark">
        <Atlas />
      </ThemeProvider>,
    );
    const cards = screen.root.findAll(
      (n) => typeof n.props['testID'] === 'string' && /^atlas\.card\.\d+$/u.test(n.props['testID']),
    );
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((n) => n.props['accessibilityRole'] === 'button')).toBe(false);
    expect(screen.queryByRole('button', { name: atlasCardName(FIRST, en, 'latin') })).toBeNull();
  });
});

/* ------------------------------------------------------------------ the overflow and Clear */

describe('More filters, the count and Clear (ADR-0143 D5, D6)', () => {
  const facet = (label: MessageKey) =>
    screen.UNSAFE_getAllByType(ChoiceGroup).find((g) => g.props['label'] === en(label))!;

  it('opens the sheet, narrows by a facet, and shows how many', () => {
    render(
      <ThemeProvider theme="dark">
        <Atlas />
      </ThemeProvider>,
    );
    // DECOY: before anything narrows the list there is no count line.
    expect(screen.queryByText(count(ENTRIES.length), { exact: false })).toBeNull();
    expect(screen.UNSAFE_getByType(Sheet).props['open']).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: en('atlas.moreFilters') }));
    expect(screen.UNSAFE_getByType(Sheet).props['open']).toBe(true);
    fireEvent.press(screen.getByRole('radio', { name: en('temperature.warm') }));
    const warm = atlasShown(ENTRIES, '', { ...NO_FILTERS, temperature: 'warm' });
    expect(warm.length).toBeLessThan(ENTRIES.length);
    expect(screen.getByText(count(warm.length))).toBeTruthy();
    expect(facet('filter.temperature').props['value']).toBe('warm');
  });

  it('Clear resets the query, the season, the families, the facets and the bookmark toggle', () => {
    render(
      <ThemeProvider theme="dark">
        <Atlas bookmarked={new Set([FIRST.entry.slug])} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('radio', { name: `${en('season.autumn')} 秋` }));
    fireEvent.press(screen.getByTestId('atlas.family.aka'));
    fireEvent.press(screen.getByRole('radio', { name: en('band.dark') }));
    fireEvent.press(screen.getByRole('button', { name: en('atlas.bookmarkedOnly') }));
    fireEvent.changeText(screen.getByLabelText(en('atlas.searchPlaceholder')), 'zz');
    expect(
      screen.getByText(`${en('atlas.showing')} 0 / ${String(CORPUS_ENTRY_COUNT)}`),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: en('atlas.clear') }));
    expect(facet('filter.season').props['value']).toBeNull();
    expect(facet('filter.lightness').props['value']).toBeNull();
    expect(screen.getByTestId('atlas.family.aka').props['accessibilityState']).toMatchObject({
      selected: false,
    });
    expect(
      screen.getByRole('button', { name: en('atlas.bookmarkedOnly') }).props['accessibilityState'],
    ).toMatchObject({ selected: false });
    expect(screen.getByLabelText(en('atlas.searchPlaceholder')).props['value']).toBe('');
    // Nothing narrows the list, so the count line and Clear are gone with it.
    expect(screen.queryByRole('button', { name: en('atlas.clear') })).toBeNull();
  });
});

/* ------------------------------------------------------------------ the three pills */

describe('Compare, Finder and Palettes go where they say (ADR-0143 D7)', () => {
  it('each calls its own destination', () => {
    const calls: string[] = [];
    render(
      <ThemeProvider theme="dark">
        <Atlas
          onOpenCompare={() => calls.push('compare')}
          onOpenFinder={() => calls.push('finder')}
          onOpenPalettes={() => calls.push('palettes')}
        />
      </ThemeProvider>,
    );
    for (const key of ['atlas.compare', 'atlas.finder', 'atlas.palettes'] as const)
      fireEvent.press(screen.getByRole('button', { name: en(key) }));
    expect(calls).toStrictEqual(['compare', 'finder', 'palettes']);
  });

  it('DECOY — an absent destination is an absent pill', () => {
    render(
      <ThemeProvider theme="dark">
        <Atlas onOpenFinder={() => undefined} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: en('atlas.finder') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en('atlas.compare') })).toBeNull();
    expect(screen.queryByRole('button', { name: en('atlas.palettes') })).toBeNull();
  });
});
