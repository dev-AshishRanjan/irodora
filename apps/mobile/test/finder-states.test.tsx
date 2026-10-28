/**
 * The Finder says only what is true, and every action 09 draws works (F-250, criteria 2 and 5).
 *
 * - **No sample content from 09**: none of its names, hexes, figures, readings, query or leaked words
 *   reaches the page, in either language or theme, at the start, on a phrase, on a hex or with nothing
 *   matched (E1, E2).
 * - **Every drawn action**, fired on the control a person touches: back, Clear, the field's clear,
 *   typing each kind of query, each chip, each slider, a card — and an absent handler is an absent
 *   control (ADR-0160).
 * - **The route** sends each action where ADR-0160 says, read from its own source.
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { Slider, ThemeProvider } from '@irodora/ui';
import type { TestNode } from '@irodora/ui/testing';
import { hexPoint } from '../src/finder';
import {
  answerOf,
  choose,
  resultLines,
  sliderReadings,
  start,
  typed,
  type FinderState,
} from '../src/finder-readout';
import { t as message, type MessageKey } from '../src/i18n';
import { Finder, type FinderProps } from '../src/screens/Finder';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const say = (key: MessageKey): string => message('en', key);
const PHRASE = 'muted green';

/*
 * 09'S SAMPLE CONTENT (E1, E2): its eight names, four hexes and four distances, its OKLCh line, its
 * three slider values and their words, its query, and the leaked text §2 says is not design. A distance
 * is matched with its unit, so a real figure that ends in the same digits is not taken for it.
 */
const SAMPLE = [
  '苔色',
  'Koke-iro',
  'Moss Green',
  '鶯茶',
  'Uguisu-cha',
  'Bush Warbler Olive',
  '海松色',
  'Miru-iro',
  'Sea Moss Green',
  '柳煤竹',
  'Yanagi-susutake',
  'Willow Smoked',
  '#69821B',
  '#715C1F',
  '#5B622E',
  '#5B5C43',
  'ΔE00 0.84',
  'ΔE00 1.45',
  'ΔE00 1.92',
  'ΔE00 2.30',
  'OKLCh 0.52 • 0.062 • 140°',
  'Medium Deep',
  'dark muted moss green for linen shirt',
  'HeroUI',
  'level=',
  'smooth sliders',
  '[Natural Phrase]',
  'Japanese Kanji',
] as const;
/** 09's three slider values, matched whole: *Muted / Soft* alone is the engine's own reading. */
const WHOLE = ['48% (Medium Deep)', '0.045 (Muted / Soft)', '142° (Moss Green)'] as const;
const leaks = (nodes: readonly string[]): readonly string[] => [
  ...SAMPLE.filter((s) => nodes.some((n) => n.includes(s))),
  ...WHOLE.filter((s) => nodes.includes(s)),
];

const handlers = () => ({ onBack: jest.fn(), onOpenColour: jest.fn() });

const drawPage = (
  props: FinderProps = {},
  { tag = DEFAULT_LANGUAGE_TAG, theme = 'dark' }: { tag?: string; theme?: 'dark' | 'light' } = {},
) => {
  mockLanguageTag = tag;
  try {
    return render(
      <ThemeProvider theme={theme}>
        <Finder {...props} />
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

/** What the page prints for a state, from the readout itself. */
const printed = (s: FinderState): readonly string[] => {
  const r = sliderReadings(s.point, 'en', say);
  return [
    r.lightness.text,
    r.chroma.text,
    r.hue.text,
    ...answerOf(s).results.flatMap((x, i) => {
      const l = resultLines(x, i, say);
      return [l.name, l.english, l.distance, l.oklch ?? ''];
    }),
  ];
};
/** The value a slider draws, by its axis. */
const valueOf = (axis: 'lightness' | 'chroma' | 'hue'): string =>
  String(screen.getByTestId(`finder.sliders.${axis}.value`).props['children']);
/** The chips announced as chosen. */
const chosen = (): readonly string[] =>
  screen
    .queryAllByRole('radio')
    .filter((r) => (r.props['accessibilityState'] as { selected?: boolean }).selected === true)
    .map((r) => String(r.props['accessibilityLabel']));
/** The field's own input. */
const field = () =>
  screen.UNSAFE_getAllByType(TextInput).find((n) => n.props['testID'] === 'finder.search.query')!;

/* ----------------------------------------------------------------------------- sample content */

describe('no sample content from 09 reaches the page (§4 E1, E2)', () => {
  const STATES = [undefined, PHRASE, '#526A6B', 'zzqx'] as const;

  it('the fixtures’ own figures and words are not 09’s, so a leak cannot hide behind a coincidence', () => {
    for (const q of STATES)
      expect({
        [String(q)]: leaks(printed(q === undefined ? start() : typed(start(), q))),
      }).toStrictEqual({
        [String(q)]: [],
      });
  });

  it.each([
    ['en-GB', 'dark'],
    ['en-GB', 'light'],
    ['ja-JP', 'dark'],
    ['ja-JP', 'light'],
  ] as const)('in %s, %s, in every state', (tag, theme) => {
    for (const q of STATES) {
      const page = drawPage(
        { ...(q === undefined ? {} : { initialQuery: q }), ...handlers() },
        { tag, theme },
      );
      expect({ [String(q)]: leaks(words(page)) }).toStrictEqual({ [String(q)]: [] });
      page.unmount();
    }
  });

  it('DECOY: a planted sample name, and a whole slider value of 09’s, are found', () => {
    const page = words(drawPage(handlers()));
    expect(leaks([...page, 'Koke-iro'])).toStrictEqual(['Koke-iro']);
    expect(leaks([...page, '0.045 (Muted / Soft)'])).toStrictEqual(['0.045 (Muted / Soft)']);
    // Whole-node only: the engine's own Muted / Soft is not 09's value.
    expect(leaks(['0.050 (Muted / Soft)'])).toStrictEqual([]);
  });
});

/* ----------------------------------------------------------------------------- the actions */

describe('every action 09 draws works, by the control a person touches (ADR-0160)', () => {
  it('back opens the Atlas', () => {
    const h = handlers();
    drawPage(h);
    fireEvent.press(screen.getByLabelText(say('detail.backToAtlas')));
    expect(h.onBack).toHaveBeenCalledTimes(1);
  });

  it('typing a phrase, a hex and a name each sets the sliders, marks its chip and lists its cards', () => {
    drawPage(handlers());
    for (const [query, chip] of [
      [PHRASE, 'finder.mode.phrase'],
      ['#526A6B', 'finder.mode.hex'],
      ['ai', 'finder.mode.name'],
    ] as const) {
      fireEvent.changeText(field(), query);
      const s = typed(start(), query);
      const r = sliderReadings(s.point, 'en', say);
      expect({ [query]: [valueOf('lightness'), valueOf('chroma'), valueOf('hue')] }).toStrictEqual({
        [query]: [r.lightness.text, r.chroma.text, r.hue.text],
      });
      expect(chosen()).toStrictEqual([say(chip)]);
      const first = answerOf(s).results[0]!;
      expect(
        screen.getByTestId('finder.result.0.name', { includeHiddenElements: true }).props[
          'children'
        ],
      ).toBe(resultLines(first, 0, say).name);
    }
  });

  it('the field’s clear empties the words, keeps the point and the choice, and goes', () => {
    drawPage({ ...handlers(), initialQuery: PHRASE, initialReading: 'name' });
    const before = [valueOf('lightness'), valueOf('chroma'), valueOf('hue')];
    fireEvent.press(screen.getByTestId('finder.search.clear'));
    expect(field().props['value']).toBe('');
    expect([valueOf('lightness'), valueOf('chroma'), valueOf('hue')]).toStrictEqual(before);
    expect(chosen()).toStrictEqual([say('finder.mode.name')]);
    expect(screen.queryByTestId('finder.search.clear')).toBeNull();
  });

  it('Clear starts over: no words, no choice, the start’s point and its nearest eight', () => {
    drawPage({ ...handlers(), initialQuery: PHRASE, initialReading: 'name' });
    fireEvent.press(screen.getByLabelText(say('finder.clearName')));
    const r = sliderReadings(start().point, 'en', say);
    expect(field().props['value']).toBe('');
    expect(chosen()).toStrictEqual([]);
    expect(valueOf('chroma')).toBe(r.chroma.text);
    expect(screen.queryAllByTestId(/^finder\.result\.\d+$/u)).toHaveLength(8);
  });

  it('a chip reads the words its way: # Hex Code reads a six-letter word as a hex', () => {
    drawPage(handlers());
    fireEvent.changeText(field(), 'beaded');
    expect(chosen()).toStrictEqual([say('finder.mode.name')]);
    fireEvent.press(screen.getByRole('radio', { name: say('finder.mode.hex') }));
    expect(chosen()).toStrictEqual([say('finder.mode.hex')]);
    const s = choose(typed(start(), 'beaded'), 'hex');
    expect(s.point).toStrictEqual(hexPoint('beaded'));
    expect(valueOf('lightness')).toBe(sliderReadings(s.point, 'en', say).lightness.text);
    expect(screen.queryAllByTestId(/^finder\.result\.\d+$/u)).toHaveLength(8);
  });

  it('each slider moves its axis; its value and words change, and the cards re-rank', () => {
    drawPage({ ...handlers(), initialQuery: PHRASE });
    const firstBefore = screen.getByTestId('finder.result.0.name', { includeHiddenElements: true })
      .props['children'] as unknown;
    const sliders = screen.UNSAFE_getAllByType(Slider);
    expect(sliders).toHaveLength(3);
    act(() => {
      (sliders[2]!.props['onValueChange'] as (v: number) => void)(250);
    });
    expect(valueOf('hue')).toBe('250° (Blue)');
    act(() => {
      (sliders[0]!.props['onValueChange'] as (v: number) => void)(0.8);
    });
    expect(valueOf('lightness')).toMatch(/^80% \(Light/u);
    act(() => {
      (sliders[1]!.props['onValueChange'] as (v: number) => void)(0.12);
    });
    expect(valueOf('chroma')).toBe('0.120 (Vivid)');
    // The set stays the phrase's; its order is now from the moved point.
    expect(
      screen.getByTestId('finder.result.0.name', { includeHiddenElements: true }).props['children'],
    ).not.toBe(firstBefore);
  });

  it('a card opens its colour', () => {
    const h = handlers();
    drawPage({ ...h, initialQuery: PHRASE });
    fireEvent.press(screen.getByTestId('finder.result.0.open'));
    const first = answerOf(typed(start(), PHRASE)).results[0]!;
    expect(h.onOpenColour).toHaveBeenCalledWith(first.entry.entry.slug);
  });

  it('DECOY: absent handlers are absent controls — no back, and a card is an image', () => {
    drawPage({ initialQuery: PHRASE });
    expect(screen.queryByLabelText(say('detail.backToAtlas'))).toBeNull();
    const host = screen.getByTestId('finder.result.0.open');
    expect(host.props['accessibilityRole']).toBe('image');
  });

  it('nothing matched shows 00’s caption with the reason, and no card', () => {
    drawPage({ ...handlers(), initialQuery: 'zzqx' });
    // 00's one caption: the message, then the reason (EmptyState joins them).
    const caption = (hint: MessageKey): string => `${say('finder.none')} ${say(hint)}`;
    expect(screen.getByText(caption('finder.noneNameHint'))).toBeTruthy();
    expect(screen.queryAllByTestId(/^finder\.result\.\d+$/u)).toHaveLength(0);
    // And a chosen reading that cannot read the words says so.
    fireEvent.press(screen.getByRole('radio', { name: say('finder.mode.hex') }));
    expect(screen.getByText(caption('finder.notHex'))).toBeTruthy();
  });
});

/* ----------------------------------------------------------------------------- the route */

describe('the route sends each drawn action where ADR-0160 says', () => {
  const ROUTE = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'atlas', 'find.tsx'), 'utf8');

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
  const sendsEveryAction = (source: string): boolean => {
    const by = bodies(source);
    return (
      (by.get('onBack') ?? '').includes("router.navigate('/atlas')") &&
      (by.get('onOpenColour') ?? '').includes('router.push(`/atlas/${slug}`)')
    );
  };

  it('back navigates to the Atlas, a card opens its colour, and the stack’s header is off', () => {
    expect(sendsEveryAction(ROUTE)).toBe(true);
    expect(ROUTE).toContain('<Stack.Screen options={{ headerShown: false }} />');
  });

  it('DECOY: a back that only pops, or a card that opens the Finder again, fails', () => {
    const back = bodies(ROUTE).get('onBack') ?? '';
    expect(
      sendsEveryAction(
        ROUTE.replace(back, '\n        onBack={() => {\n          router.back();\n        }}\n'),
      ),
    ).toBe(false);
    expect(
      sendsEveryAction(
        ROUTE.replace('router.push(`/atlas/${slug}`)', "router.push('/atlas/find')"),
      ),
    ).toBe(false);
  });
});
