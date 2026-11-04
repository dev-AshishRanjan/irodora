/**
 * What 19's controls do, its states, and that none of 19's sample content ships (F-252, ADR-0171).
 *
 * - **No sample content.** 19 prints an anchor and five rows of names and figures that are sample
 *   content (E1), *Analogous Cool / Soft* (E2) and the wireframe's own labels (ADR-0167). None of them
 *   reaches the page, in either language or theme, in any state, as words or as accessible names.
 * - **Every drawn action works, on the control a person touches**: back, the filter's sheet and its
 *   choice, *Showing n / N* and *Clear*, each row's Wear with its own row, and Build.
 * - **The states**: a colour this corpus does not hold, and a colour close to grey, each say so.
 * - **The routes** send each action where ADR-0171 says, read from their source.
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import type { TestNode } from '@irodora/ui/testing';
import { allCombinations, allEntries, entryBySlug } from '../src/corpus';
import { goesWith, relationshipWords, wearName, type FilterChoice } from '../src/goes-with';
import { t as message, type MessageKey } from '../src/i18n';
import { GoesWith, type GoesWithProps } from '../src/screens/GoesWith';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const say = (key: MessageKey): string => message('en', key);
const SLUG = 'aki-batake';
const ANCHOR = entryBySlug(SLUG)!;
const ROWS = goesWith(ANCHOR).rows;
const NEAR_GREY = allEntries().find((e) => !goesWith(e).chromatic)!;
const CURATED_LEAD =
  allCombinations()[0]?.combination.colors.find((c) => c.role === 'lead')?.slug ?? '';
const OUTSIDE = allEntries().find((e) => !e.derived.inSrgbGamut)!;
const HOLDS_OUTSIDE = allEntries().find((e) =>
  goesWith(e).rows.some((r) => !r.entry.derived.inSrgbGamut),
)!;

const handlers = () => ({ onBack: jest.fn(), onWear: jest.fn(), onBuild: jest.fn() });

const drawPage = (
  props: Partial<GoesWithProps> = {},
  { tag = DEFAULT_LANGUAGE_TAG, theme = 'dark' }: { tag?: string; theme?: 'dark' | 'light' } = {},
) => {
  mockLanguageTag = tag;
  try {
    return render(
      <ThemeProvider theme={theme}>
        <GoesWith slug={SLUG} {...handlers()} {...props} />
      </ThemeProvider>,
    );
  } finally {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  }
};

/** Every paragraph and every accessible name on a tree. */
function wordsOf(node: TestNode | null, out: string[] = []): string[] {
  if (node === null) return out;
  for (const child of node.children ?? []) {
    if (typeof child === 'string') out.push(child);
    else wordsOf(child, out);
  }
  const label: unknown = node.props['accessibilityLabel'];
  if (typeof label === 'string') out.push(label);
  return out;
}
/** A node's words, its nested runs included. */
type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;
const textOf = (node: Instance): string =>
  node.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');
const words = (tree: ReturnType<typeof render>): string =>
  wordsOf(tree.toJSON() as TestNode | null).join('\u0000');

/* ----------------------------------------------------------------------------- sample content */

/** 19's sample content and the wireframe's labels (E1, E2, ADR-0167). */
const SAMPLE = {
  names: [
    'Ai-nezumi',
    'Indigo Grey',
    '藍鼠',
    'Amber Ochre',
    '琥珀色',
    'Deep Slate Teal',
    '藍墨茶',
    'Slate Lavender',
    '藤鼠',
    'Gold Ochre',
    '黄朽葉',
    'Terracotta',
    '樺色',
  ],
  figures: ['0.490', '0.035', '240.2', '48.2', '12.4', '11.8', '42.1', '44.6'],
  words: [
    'Hero Card',
    'HeroUI',
    '100px',
    'Rows',
    'Ranked',
    'Action:',
    'Analogous Cool',
    'Analogous Soft',
  ],
} as const;
const leaks = (text: string): string[] => {
  const found: string[] = [];
  for (const s of [...SAMPLE.names, ...SAMPLE.figures, ...SAMPLE.words])
    if (text.includes(s)) found.push(s);
  // *Color*, US spelling, as a word: the catalogue is en-GB.
  if (/\bColor\b/u.test(text)) found.push('Color');
  return found;
};

describe('no sample content from 19 reaches the page (§4 E1, E2; ADR-0167)', () => {
  it('the fixture’s own names and figures are not 19’s, so the check below can fail', () => {
    const own = [ANCHOR, ...ROWS.map((r) => r.entry)].flatMap((e) => [
      e.entry.name.en,
      e.entry.name.kanji,
    ]);
    expect(leaks(own.join('\u0000'))).toStrictEqual([]);
    // None of 19's thirteen names is a corpus name (the census).
    const corpus = allEntries().flatMap((e) => [e.entry.name.en, e.entry.name.kanji]);
    expect(SAMPLE.names.filter((n) => corpus.includes(n))).toStrictEqual([]);
  });

  it.each([
    ['en-GB', 'dark'],
    ['en-GB', 'light'],
    ['ja-JP', 'dark'],
    ['ja-JP', 'light'],
  ] as const)('in %s, %s, in every state', (tag, theme) => {
    for (const props of [
      {},
      { slug: CURATED_LEAD },
      { initialFilter: 'analogous' as FilterChoice },
      { initialSheet: true },
      { slug: NEAR_GREY.entry.slug },
      { slug: 'no-such-colour' },
      { slug: OUTSIDE.entry.slug },
      { slug: HOLDS_OUTSIDE.entry.slug },
    ])
      expect({ props, leaks: leaks(words(drawPage(props, { tag, theme }))) }).toStrictEqual({
        props,
        leaks: [],
      });
  });

  it('DECOY: a planted sample name and a planted label are found', () => {
    expect(leaks(`${words(drawPage())}\u0000Amber Ochre\u0000Action: Wear`)).toStrictEqual([
      'Amber Ochre',
      'Action:',
    ]);
  });
});

/* ----------------------------------------------------------------------------- the words */

describe('the page says what goes-with.ts computes', () => {
  it('each row reads its relationship and its floored ΔE00; its Wear names both colours', () => {
    drawPage();
    ROWS.forEach((row, i) => {
      const detail = screen.getByTestId(`with.row.${String(i)}.detail`);
      const figure = Math.floor(row.deltaE00 * 10) / 10;
      expect(detail.props['accessibilityLabel']).toBe(
        `${relationshipWords(row, say, 'latin')}, ΔE00 ${figure.toFixed(1)}, CIEDE2000`,
      );
      expect(
        screen.getByRole('button', { name: wearName(row.entry, ANCHOR, say, 'latin') }),
      ).toBeTruthy();
    });
  });

  it('the record outside sRGB carries its note: after the anchor’s OKLCh, and after a row’s figure', () => {
    drawPage({ slug: OUTSIDE.entry.slug });
    expect(textOf(screen.getByTestId('with.anchor.oklch'))).toContain(say('detail.nearestSrgb'));
    drawPage({ slug: HOLDS_OUTSIDE.entry.slug });
    const at = goesWith(HOLDS_OUTSIDE).rows.findIndex((r) => !r.entry.derived.inSrgbGamut);
    expect(
      screen.getByTestId(`with.row.${String(at)}.detail`).props['accessibilityLabel'],
    ).toContain(say('detail.nearestSrgb'));
    // DECOY: the anchor of that page is in sRGB, so its OKLCh line has no note.
    expect(textOf(screen.getByTestId('with.anchor.oklch'))).not.toContain(
      say('detail.nearestSrgb'),
    );
  });
});

/* ----------------------------------------------------------------------------- the actions */

describe('every action 19 draws works, by the control a person touches (ADR-0171)', () => {
  it('Back goes to the Atlas', () => {
    const on = handlers();
    drawPage(on);
    fireEvent.press(screen.getByRole('button', { name: say('detail.backToAtlas') }));
    expect(on.onBack).toHaveBeenCalledTimes(1);
  });

  it('each Wear hands over its own row, and Build the anchor', () => {
    const on = handlers();
    drawPage(on);
    ROWS.forEach((row, i) => {
      fireEvent.press(screen.getByTestId(`with.row.${String(i)}.action`));
      expect(on.onWear).toHaveBeenLastCalledWith(row.entry.entry.slug);
    });
    expect(on.onWear).toHaveBeenCalledTimes(ROWS.length);
    fireEvent.press(screen.getByTestId('with.build'));
    expect(on.onBuild).toHaveBeenCalledTimes(1);
    // DECOY: the rows are distinct, so the last-called check above saw each one.
    expect(new Set(ROWS.map((r) => r.entry.entry.slug)).size).toBe(ROWS.length);
  });

  it('the filter: the sheet, a relationship, Showing n / N, then Clear', () => {
    drawPage();
    expect(screen.queryByTestId('with.showing')).toBeNull();
    fireEvent.press(screen.getByTestId('with.filter'));
    fireEvent.press(screen.getByRole('radio', { name: say('with.relationship.analogous') }));
    const analogous = ROWS.filter((r) => r.source === 'geometric' && r.kind === 'analogous');
    expect(screen.getByTestId('with.showing').props['children']).toBe(
      `${say('atlas.showing')} ${String(analogous.length)} / ${String(ROWS.length)}`,
    );
    expect(screen.queryAllByTestId(/^with\.row\.\d+$/u)).toHaveLength(analogous.length);
    fireEvent.press(screen.getByTestId('with.clear'));
    expect(screen.queryByTestId('with.showing')).toBeNull();
    expect(screen.queryAllByTestId(/^with\.row\.\d+$/u)).toHaveLength(ROWS.length);
  });

  it('opens as drawn: every row, no filter, nothing extra', () => {
    drawPage();
    expect(screen.queryAllByTestId(/^with\.row\.\d+$/u)).toHaveLength(ROWS.length);
    expect(screen.queryByTestId('with.showing')).toBeNull();
    expect(screen.queryByTestId('with.clear')).toBeNull();
  });
});

/* ----------------------------------------------------------------------------- the states */

describe('the states (ADR-0171 D6)', () => {
  it('a colour this corpus does not hold: the back above 00’s caption, and nothing else', () => {
    const on = handlers();
    drawPage({ ...on, slug: 'no-such-colour' });
    expect(screen.getByText(say('detail.notFound'), { exact: false })).toBeTruthy();
    expect(screen.queryByTestId('with.anchor')).toBeNull();
    expect(screen.queryByTestId('with.build')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: say('detail.backToAtlas') }));
    expect(on.onBack).toHaveBeenCalledTimes(1);
  });

  it('a colour close to grey: its card, 00’s caption with Build as the hint, and Build', () => {
    drawPage({ slug: NEAR_GREY.entry.slug });
    expect(screen.getByTestId('with.anchor')).toBeTruthy();
    expect(screen.getByText(say('with.empty.nearGrey'), { exact: false })).toBeTruthy();
    expect(screen.getByText(say('with.emptyHint'), { exact: false })).toBeTruthy();
    expect(screen.getByTestId('with.build')).toBeTruthy();
    // DECOY: a chromatic colour shows no caption.
    drawPage();
    expect(screen.queryByText(say('with.empty.nearGrey'), { exact: false })).toBeNull();
    expect(screen.queryByText(say('with.empty.none'), { exact: false })).toBeNull();
  });
});

/* ----------------------------------------------------------------------------- the routes */

/*
 * WHERE EACH DRAWN ACTION GOES (ADR-0171 D2–D4, E-240), read from the routes' source: a test may not
 * import a route, and 07 is a route another feature rebuilds, so its name is held here.
 */
describe('the routes send each action where ADR-0171 says (E-240)', () => {
  const APP = join(__dirname, '..', 'app', '(tabs)', 'atlas');
  const WITH = readFileSync(join(APP, 'with', '[slug].tsx'), 'utf8');
  const WEAR = readFileSync(join(APP, 'wear', '[slug].tsx'), 'utf8');

  const sendsEveryAction = (source: string): boolean =>
    source.includes('<Stack.Screen options={{ headerShown: false }} />') &&
    source.includes("router.navigate('/atlas')") &&
    !source.includes('router.back()') &&
    source.includes('router.push(wearHref(slug, row))') &&
    source.includes('router.push(buildHref(slug))') &&
    !source.includes('/wardrobe/outfit') &&
    !source.includes('activeProfile');

  it('19’s route: its own bar, Back to the Atlas, Wear with both slugs, Build to 07, no profile read', () => {
    expect(sendsEveryAction(WITH)).toBe(true);
  });

  it('DECOY: a back that only pops, swapped slugs, Build to the Lab, a profile read each fail', () => {
    expect(sendsEveryAction(WITH.replace("router.navigate('/atlas')", 'router.back()'))).toBe(
      false,
    );
    expect(
      sendsEveryAction(
        WITH.replace('router.push(wearHref(slug, row))', 'router.push(wearHref(row, slug))'),
      ),
    ).toBe(false);
    expect(
      sendsEveryAction(
        WITH.replace('router.push(buildHref(slug))', "router.push('/wardrobe/outfit')"),
      ),
    ).toBe(false);
    expect(sendsEveryAction(`${WITH}\n// activeProfile(repo)`)).toBe(false);
  });

  const readsWith = (source: string): boolean =>
    source.includes('with?: string | string[]') &&
    source.includes('startWith(withSlug, slug)') &&
    source.includes('{ initial }');

  it('07’s route reads `with` into startWith and hands it to the page (E-240)', () => {
    expect(readsWith(WEAR)).toBe(true);
    // DECOY: a rebuild of 07 that drops it fails.
    expect(readsWith(WEAR.replace('startWith(withSlug, slug)', 'undefined'))).toBe(false);
  });
});
