/**
 * The Compare page says only what is true, and every action 08 draws works (F-249, criteria 2 and 5).
 *
 * - **No sample content from 08**: none of its names, hexes, figures, verdicts or leaked words reaches
 *   the page, in either language or theme, with the chooser open or in the absent state (E1, E2).
 * - **Every drawn action**, fired on the control a person touches: back, the glyph, Change A and B
 *   and the chooser behind them, the PDF and the Studio — and an absent handler is an absent control.
 * - **The route** sends each action where ADR-0156 says, read from its own source.
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionBar, Card, swatchAccessibleName, ThemeProvider, valueText } from '@irodora/ui';
import type { TestNode } from '@irodora/ui/testing';
import { colorFor, entryBySlug, type PublishedEntry } from '../src/corpus';
import { nameLine, pairMeta, pairReadout } from '../src/compare-readout';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import { find } from '../src/finder';
import { t as message, type MessageKey } from '../src/i18n';
import { Compare, type CompareProps } from '../src/screens/Compare';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const say = (key: MessageKey): string => message('en', key);
const entry = (slug: string): PublishedEntry => {
  const e = entryBySlug(slug);
  if (e === null) throw new Error(slug);
  return e;
};
/** 08's fixture pair (ADR-0155's census): none of its figures is one 08 draws. */
const A = 'aka-tsuchi';
const B = 'ao-ta';

/*
 * 08'S SAMPLE CONTENT (E1, E2): its names and hexes, every figure it prints, its verdicts, and the
 * leaked text §2 says is not design. "Shift towards teal" is matched as a whole node — the band phrase
 * may legitimately end "towards teal" for a pair whose B is teal.
 */
const SAMPLE = [
  'Ai-nezumi',
  '藍鼠',
  'Sabi-asagi',
  '錆浅葱',
  '#5B6B78',
  '#5C828C',
  '0.490',
  '0.540',
  '240°',
  '210°',
  '3.42',
  '0.038',
  '+4.8',
  '+5.2',
  '−14.2°',
  '-14.2°',
  '1.48:1',
  '16.2',
  '92%',
  '94%',
  '89%',
  'Harmonious',
  'Pairing',
  'Safe',
  'B is lighter',
  'B is more chromatic',
  '[Change',
  'level=',
  'Divid',
  'Side-by-Side',
  'Matrix Card',
] as const;
const WHOLE = ['Shift towards teal'] as const;
const leaks = (nodes: readonly string[]): readonly string[] => [
  ...SAMPLE.filter((s) => nodes.some((n) => n.includes(s))),
  ...WHOLE.filter((s) => nodes.includes(s)),
];

const handlers = () => ({
  onBack: jest.fn(),
  onExport: jest.fn(),
  onExportPdf: jest.fn(),
  onAddToStudio: jest.fn(),
});

const drawPage = (
  props: Partial<CompareProps> = {},
  { tag = DEFAULT_LANGUAGE_TAG, theme = 'dark' }: { tag?: string; theme?: 'dark' | 'light' } = {},
) => {
  mockLanguageTag = tag;
  try {
    return render(
      <ThemeProvider theme={theme}>
        <Compare initialA={A} initialB={B} {...props} />
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
const words = (tree: ReturnType<typeof render>): readonly string[] =>
  wordsOf(tree.toJSON() as TestNode | null);
/** The colours a chooser lists, by its rows' ids. */
const listed = (): readonly string[] =>
  screen
    .queryAllByTestId(/^compare\.pick\./u)
    .map((n) => String(n.props['testID']).slice('compare.pick.'.length))
    .filter((s) => entryBySlug(s) !== null);

/* ----------------------------------------------------------------------------- sample content */

describe('no sample content from 08 reaches the page (§4 E1, E2)', () => {
  it('the fixture’s own figures are not 08’s, so a leak cannot hide behind a coincidence', () => {
    const r = pairReadout(entry(A), entry(B), say, 'en', 'latin');
    const figures = [...r.metrics, ...r.access].map((x) => valueText(x.value));
    expect(leaks([...figures, r.meta.a, r.meta.b, r.access[0]?.note ?? ''])).toStrictEqual([]);
  });

  it.each([
    ['en-GB', 'dark'],
    ['en-GB', 'light'],
    ['ja-JP', 'dark'],
    ['ja-JP', 'light'],
  ] as const)('in %s, %s', (tag, theme) => {
    expect(leaks(words(drawPage(handlers(), { tag, theme })))).toStrictEqual([]);
  });

  it('nor with the chooser open, nor in the absent state', () => {
    expect(leaks(words(drawPage({ ...handlers(), initialPicking: 'a' })))).toStrictEqual([]);
    expect(leaks(words(drawPage({ ...handlers(), initialA: 'no-such-colour' })))).toStrictEqual([]);
  });

  it('DECOY: a planted sample name, and 08’s whole hue sentence, are found', () => {
    const page = words(drawPage(handlers()));
    expect(leaks([...page, 'Ai-nezumi'])).toStrictEqual(['Ai-nezumi']);
    expect(leaks([...page, 'Shift towards teal'])).toStrictEqual(['Shift towards teal']);
    // Whole-node only: a band phrase that ends "towards teal" is not 08's sentence.
    expect(leaks(['Slight Hue Shift towards teal'])).toStrictEqual([]);
  });
});

/* ----------------------------------------------------------------------------- the actions */

describe('every action 08 draws works, by the control a person touches (ADR-0156)', () => {
  it('back, the glyph, the PDF and the Studio each carry the pair on screen', () => {
    const h = handlers();
    drawPage(h);
    fireEvent.press(screen.getByLabelText(say('detail.backToAtlas')));
    expect(h.onBack).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('compare.export'));
    expect(h.onExport).toHaveBeenCalledWith(A, B);
    fireEvent.press(screen.getByText(say('compare.exportPdf')));
    expect(h.onExportPdf).toHaveBeenCalledWith(A, B);
    fireEvent.press(screen.getByText(say('compare.addToStudio')));
    expect(h.onAddToStudio).toHaveBeenCalledWith(A, B);
  });

  it('Change A opens the sheet for A: A marked chosen, B never offered; choosing changes A only', () => {
    const h = handlers();
    drawPage(h);
    fireEvent.press(screen.getByText(say('compare.changeA')));
    // The sheet is named for its slot, as a screen reader announces it.
    expect(screen.getByLabelText(say('compare.pickA'))).toBeTruthy();
    expect(listed()).not.toContain(B);
    expect(listed()).toContain(A);
    expect(screen.getByTestId(`compare.pick.${A}`).props['accessibilityState']).toMatchObject({
      selected: true,
    });
    const next = listed().find((s) => s !== A)!;
    fireEvent.press(screen.getByTestId(`compare.pick.${next}`));
    // The sheet closes, and every figure is the new pair's.
    fireEvent.press(screen.getByTestId('compare.export'));
    expect(h.onExport).toHaveBeenLastCalledWith(next, B);
    const r = pairReadout(entry(next), entry(B), say, 'en', 'latin');
    for (const row of r.metrics)
      expect(screen.getAllByText(valueText(row.value), { exact: false }).length).toBeGreaterThan(0);
  });

  it('Change B likewise, for B', () => {
    const h = handlers();
    drawPage(h);
    fireEvent.press(screen.getByText(say('compare.changeB')));
    // The sheet is named for its slot, as a screen reader announces it.
    expect(screen.getByLabelText(say('compare.pickB'))).toBeTruthy();
    expect(listed()).not.toContain(A);
    const next = listed().find((s) => s !== B)!;
    fireEvent.press(screen.getByTestId(`compare.pick.${next}`));
    fireEvent.press(screen.getByTestId('compare.export'));
    expect(h.onExport).toHaveBeenLastCalledWith(A, next);
  });

  it('the field reads through the Finder: a name, a phrase and a hex, less the other slot', () => {
    for (const query of ['aka', 'dark blue', '#336699']) {
      const tree = drawPage({ ...handlers(), initialPicking: 'a', initialQuery: query });
      const want = find(query)
        .entries.map((e) => e.entry.slug)
        .filter((s) => s !== B);
      expect(want.length).toBeGreaterThan(0);
      expect([query, listed()]).toStrictEqual([query, want]);
      tree.unmount();
    }
  });

  it('a query that finds nothing shows 00’s caption, and nothing else in the sheet', () => {
    drawPage({ ...handlers(), initialPicking: 'b', initialQuery: 'zzzz' });
    expect(screen.getByText(say('compare.noMatch'))).toBeTruthy();
    expect(listed()).toStrictEqual([]);
  });

  it('DECOY: an absent handler is an absent control', () => {
    drawPage({});
    expect(screen.queryByTestId('compare.export')).toBeNull();
    expect(screen.queryByText(say('compare.exportPdf'))).toBeNull();
    expect(screen.queryByText(say('compare.addToStudio'))).toBeNull();
    expect(screen.UNSAFE_queryAllByType(ActionBar)).toHaveLength(0);
  });
});

describe('two colours, and the two named — each half is one entry, on its own side (review, S7a)', () => {
  /** What one half shows: its sample's name and hex, its name line, its meta line. */
  const half = (side: 'a' | 'b') => {
    const sample = screen.getAllByTestId(`compare.${side}.swatch`, {
      includeHiddenElements: true,
    })[0]!;
    return {
      // The sample's own node is named with its colour, hex and provenance (S5's image).
      sample: String(sample.props['accessibilityLabel'] ?? ''),
      name: String(screen.getByTestId(`compare.${side}.name`).props['children']),
      meta: String(screen.getByTestId(`compare.${side}.meta`).props['children']),
    };
  };
  const expected = (e: PublishedEntry) => ({
    sample: swatchAccessibleName(e.entry.name.en, e.derived.hex, colorFor(e.entry)),
    name: nameLine(e),
    meta: pairMeta(e),
  });

  it('A’s sample, name and meta are A’s; B’s are B’s — and after a choice, the new colour’s, still on its side', () => {
    drawPage(handlers());
    expect(half('a')).toStrictEqual(expected(entry(A)));
    expect(half('b')).toStrictEqual(expected(entry(B)));
    fireEvent.press(screen.getByText(say('compare.changeB')));
    const next = listed().find((x) => x !== B && x !== A)!;
    fireEvent.press(screen.getByTestId(`compare.pick.${next}`));
    expect(half('a')).toStrictEqual(expected(entry(A)));
    expect(half('b')).toStrictEqual(expected(entry(next)));
  });

  it('DECOY: the two halves are different entries, so a swap of sides would be seen', () => {
    drawPage(handlers());
    expect(half('a')).not.toStrictEqual(half('b'));
  });
});

describe('the chooser closes on a choice, and names each row as the card does (review, M14, M9, M16)', () => {
  it('choosing closes the sheet: its rows leave the page', () => {
    drawPage({ ...handlers(), initialPicking: 'a' });
    expect(listed().length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId(`compare.pick.${listed().find((x) => x !== A)!}`));
    expect(listed()).toStrictEqual([]);
  });

  it('each row shows the card’s kanji and romaji, and says its English name once, with its provenance', () => {
    drawPage({ ...handlers(), initialPicking: 'a', initialQuery: 'aka' });
    const slug = listed()[0]!;
    const e = entry(slug);
    const row = screen.getByTestId(`compare.pick.${slug}`);
    expect(row.props['accessibilityLabel']).toBe(
      `${nameLine(e)}, ${swatchAccessibleName(e.entry.name.en, e.derived.hex, colorFor(e.entry))}`,
    );
    expect(screen.getAllByText(nameLine(e)).length).toBeGreaterThan(0);
  });
});

describe('the Studio is named by its own name, in both languages (review, S4)', () => {
  it('Add Pair to Palette Studio’s words hold the Studio’s title', () => {
    expect(en['compare.addToStudio']).toContain(en['studio.title']);
    expect(ja['compare.addToStudio']).toContain(ja['studio.title']);
    // DECOY: the name the first draft used is no screen’s.
    expect(ja['compare.addToStudio']).not.toContain('パレット工房');
  });
});

describe('a colour this corpus does not hold (F-236, E4)', () => {
  it('draws the back and 00’s caption, and no card, glyph or bar', () => {
    const tree = drawPage({ ...handlers(), initialA: 'no-such-colour' });
    expect(screen.getByLabelText(say('detail.backToAtlas'))).toBeTruthy();
    expect(screen.getByText(say('detail.notFound'))).toBeTruthy();
    expect(tree.UNSAFE_queryAllByType(Card)).toHaveLength(0);
    expect(screen.queryByTestId('compare.export')).toBeNull();
    expect(tree.UNSAFE_queryAllByType(ActionBar)).toHaveLength(0);
  });
});

/* ----------------------------------------------------------------------------- the route */

describe('the route sends each drawn action where ADR-0156 says (E-227)', () => {
  const APP = join(__dirname, '..', 'app', '(tabs)');
  const ROUTE = readFileSync(join(APP, 'atlas', 'compare.tsx'), 'utf8');
  const EXPORT = readFileSync(join(APP, 'profile', 'export.tsx'), 'utf8');
  const STUDIO = readFileSync(join(APP, 'atlas', 'palettes.tsx'), 'utf8');

  /** Each handler's own body, by its prop name: from its name to the next prop the screen takes. */
  const bodies = (source: string): ReadonlyMap<string, string> => {
    const out = new Map<string, string>();
    const props = [...source.matchAll(/\n\s+(on[A-Z]\w+)=\{/gu)];
    props.forEach((m, i) => {
      const end = props[i + 1]?.index ?? source.indexOf('/>', m.index);
      out.set(m[1]!, source.slice(m.index, end));
    });
    return out;
  };
  const EXPECTED: readonly (readonly [string, string])[] = [
    ['onBack', "router.navigate('/atlas')"],
    ['onExport', 'router.push(`/profile/export?pair=${first}${COLOURS_SEPARATOR}${second}`)'],
    [
      'onExportPdf',
      'router.push(`/profile/export?pair=${first}${COLOURS_SEPARATOR}${second}&format=pdf`)',
    ],
    [
      'onAddToStudio',
      'router.push(`/atlas/palettes?colours=${first}${COLOURS_SEPARATOR}${second}`)',
    ],
  ];
  const sendsEveryAction = (source: string): boolean => {
    const by = bodies(source);
    return (
      EXPECTED.every(([name, target]) => (by.get(name) ?? '').includes(target)) &&
      // The glyph is every format: it never chooses the PDF.
      !(by.get('onExport') ?? '').includes('format=')
    );
  };

  it('each control sends its own target, and the stack’s header is off', () => {
    expect(sendsEveryAction(ROUTE)).toBe(true);
    expect(ROUTE).toContain('<Stack.Screen options={{ headerShown: false }} />');
  });

  it('DECOY: a back that only pops, swapped targets, or the PDF on the glyph each fail', () => {
    const back = bodies(ROUTE).get('onBack') ?? '';
    expect(
      sendsEveryAction(
        ROUTE.replace(back, '\n        onBack={() => {\n          router.back();\n        }}\n'),
      ),
    ).toBe(false);
    const swapped = ROUTE.replace('/profile/export?pair=', '@@')
      .replace('/atlas/palettes?colours=', '/profile/export?pair=')
      .replace('@@', '/atlas/palettes?colours=');
    expect(sendsEveryAction(swapped)).toBe(false);
    const glyph = bodies(ROUTE).get('onExport') ?? '';
    expect(
      sendsEveryAction(ROUTE.replace(glyph, glyph.replace('${second}`', '${second}&format=pdf`'))),
    ).toBe(false);
  });

  it('the export reads the pair and a writer’s own format; the Studio reads the colours as a draft', () => {
    expect(EXPORT).toContain(
      'exportSubjectFor(slug, deviceRepository().listPalettes(), colours, pair, palette, saved)',
    );
    expect(EXPORT).toContain('WRITERS.find((w) => w.format === first(params.format))?.format');
    expect(EXPORT).toContain('{...(format === undefined ? {} : { initialFormat: format })}');
    expect(STUDIO).toContain('draftOf(colours.split(COLOURS_SEPARATOR))');
    expect(STUDIO).toContain('{...(initialDraft === null ? {} : { initialDraft })}');
  });
});
