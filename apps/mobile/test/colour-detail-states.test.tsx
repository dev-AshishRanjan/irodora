/**
 * The colour page says only true things, and every action 06 draws works (F-247, criteria 2 and 5).
 *
 * - **No sample content.** 06 and 26 print a colour, a period, a manuscript, a verification and three
 *   garments that are not this person's or this corpus's. None of it reaches the page, in either
 *   language or theme (R9 §4 E1).
 * - **Every drawn action, by the control a person touches**: each fires its handler with the colour
 *   (or the garment), and an absent handler is an absent control.
 * - **No figure on the garments**: the order is the engine's, and no score, factor or word of fit is
 *   printed beside it (ADR-0148 D2, E-101).
 * - **The two empty states** in the combinations' place (ADR-0148 D4), each with its way out.
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { StoredGarment } from '@irodora/store';
import { nativeColors } from '@irodora/design-tokens';
import { Glyph, ThemeProvider } from '@irodora/ui';
import type { TestNode } from '@irodora/ui/testing';
import * as corpus from '../src/corpus';
import { allEntries, type PublishedEntry } from '../src/corpus';
import { combinationName, SEAL_GLYPH, wearableCombinations } from '../src/detail';
import { t as message } from '../src/i18n';
import { ColourDetail, type ColourDetailProps } from '../src/screens/ColourDetail';
import { rankingContext } from '../src/wardrobe/coverage';

const DETAIL = allEntries().find((e) => (e.entry.taxonomy.season ?? []).includes('autumn'))!;
const garment = (
  id: string,
  type: string,
  n: number,
  name: string | null = null,
): StoredGarment => {
  const e = allEntries()[n]!;
  return {
    id,
    type,
    name,
    color: {
      id: `c-${id}`,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      name: e.entry.name.en,
      xyz_x: e.entry.color.xyz[0],
      xyz_y: e.entry.color.xyz[1],
      xyz_z: e.entry.color.xyz[2],
      lab_l: e.derived.lab[0],
      lab_a: e.derived.lab[1],
      lab_b: e.derived.lab[2],
      oklch_l: e.derived.oklch[0],
      oklch_c: e.derived.oklch[1],
      oklch_h: e.derived.oklch[2],
      hex: e.derived.hex,
      source: 'reference',
      confidence: 1,
      corpus_slug: e.entry.slug,
      capture_illuminant: null,
      capture_quality: null,
      capture_samples: null,
      capture_variance: null,
    },
    pattern: null,
    material: null,
    formality: null,
    brand: null,
    size: null,
    purchaseDate: null,
    costMinor: null,
    currency: null,
    wearCount: 0,
    seasons: [],
    colors: [],
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  };
};
const WARDROBE: readonly StoredGarment[] = [
  garment('d-1', 'trousers', 3, 'Wool trousers'),
  garment('d-2', 'shoes', 4),
  garment('d-3', 'skirt', 5),
];
const RANKING = rankingContext(null);

/** Every handler a jest mock, so a test reads what was called and with what. */
const handlers = () => ({
  onBookmark: jest.fn(),
  onBack: jest.fn(),
  onShareCard: jest.fn(),
  onExport: jest.fn(),
  onWearIt: jest.fn(),
  onHoldAsTarget: jest.fn(),
  onOpenGarment: jest.fn(),
  onScanGarment: jest.fn(),
  onAddGarment: jest.fn(),
});

const drawPage = (
  props: Partial<ColourDetailProps> = {},
  { tag = DEFAULT_LANGUAGE_TAG, theme = 'dark' }: { tag?: string; theme?: 'dark' | 'light' } = {},
) => {
  mockLanguageTag = tag;
  try {
    return render(
      <ThemeProvider theme={theme}>
        <ColourDetail
          slug={DETAIL.entry.slug}
          wardrobe={WARDROBE}
          ranking={RANKING}
          photoOf={() => null}
          {...props}
        />
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
const words = (tree: ReturnType<typeof render>): string =>
  wordsOf(tree.toJSON() as TestNode | null).join('\u0000');

/* ----------------------------------------------------------------------------- sample content */

/**
 * What 06 and 26 print that is theirs and not this corpus's: the sample colour's names, hex and
 * figures, the period and manuscript, the verification, and the three garments (R9 §4 E1).
 */
const SAMPLE = [
  'Ai-nezumi',
  '藍鼠',
  'あいねずみ',
  'Indigo Grey',
  '#5B6B78',
  '0.490',
  '240.2',
  '45.2',
  '0.357',
  '0.420',
  '0.471',
  'Edo',
  '1842',
  'Heritage',
  'Historical Provenance',
  'Verified',
  '承認済み',
  '伝統',
  'v1.2',
  'Ecru Trousers',
  'Charcoal Derby',
  'Ochre Scarf',
  '#D1C7BD',
  '#1C2024',
  '#6B4513',
  '江戸',
];
const leaks = (text: string): readonly string[] => SAMPLE.filter((s) => text.includes(s));

describe('no sample content from 06 or 26 reaches the page (§4 E1)', () => {
  it.each([
    ['en-GB', 'dark'],
    ['en-GB', 'light'],
    ['ja-JP', 'dark'],
    ['ja-JP', 'light'],
  ] as const)('in %s, %s', (tag, theme) => {
    expect(leaks(words(drawPage(handlers(), { tag, theme })))).toStrictEqual([]);
  });

  it('DECOY: a planted sample name is found', () => {
    expect(leaks(`${words(drawPage(handlers()))}\u0000Ai-nezumi`)).toStrictEqual(['Ai-nezumi']);
  });
});

/* ----------------------------------------------------------------------------- the actions */

describe('every action 06 draws works, by the control a person touches (ADR-0147 D3)', () => {
  const slug = DETAIL.entry.slug;
  const button = (key: Parameters<typeof message>[1]) =>
    screen.getByRole('button', { name: message('en', key) });

  it('the bar: back, the bookmark (its opposite), share and export', () => {
    const on = handlers();
    drawPage({ ...on, bookmarked: true });
    fireEvent.press(button('detail.backToAtlas'));
    fireEvent.press(button('detail.bookmark'));
    fireEvent.press(button('detail.shareCard'));
    fireEvent.press(button('detail.export'));
    expect(on.onBack).toHaveBeenCalledTimes(1);
    expect(on.onBookmark).toHaveBeenCalledWith(false);
    expect(on.onShareCard).toHaveBeenCalledWith(slug);
    expect(on.onExport).toHaveBeenCalledWith(slug);
  });

  it('the action bar: Wear It and Hold as Target', () => {
    const on = handlers();
    drawPage(on);
    fireEvent.press(button('detail.wearIt'));
    fireEvent.press(button('detail.holdAsTarget'));
    expect(on.onWearIt).toHaveBeenCalledWith(slug);
    expect(on.onHoldAsTarget).toHaveBeenCalledWith(slug);
  });

  it('a garment opens itself, wherever on it a person taps — its number included', () => {
    const on = handlers();
    drawPage(on);
    const combos = wearableCombinations(DETAIL, WARDROBE, RANKING);
    fireEvent.press(screen.getByRole('button', { name: combinationName(combos[0]!) }));
    expect(on.onOpenGarment).toHaveBeenLastCalledWith(combos[0]!.garment.id);
    // The number is drawn on the photograph: a press there is the garment's, not the number's.
    // Hidden from a screen reader, which hears the garment's name; a sighted tap lands on it all the same.
    fireEvent.press(
      screen.getByTestId('detail.combination.2.rank', { includeHiddenElements: true }),
    );
    expect(on.onOpenGarment).toHaveBeenLastCalledWith(combos[1]!.garment.id);
  });

  it('DECOY: an absent handler is an absent control', () => {
    drawPage({});
    for (const key of [
      'detail.backToAtlas',
      'detail.bookmark',
      'detail.shareCard',
      'detail.export',
      'detail.wearIt',
      'detail.holdAsTarget',
    ] as const)
      expect({
        [key]: screen.queryAllByRole('button', { name: message('en', key) }),
      }).toStrictEqual({
        [key]: [],
      });
    const combos = wearableCombinations(DETAIL, WARDROBE, RANKING);
    expect(screen.queryAllByRole('button', { name: combinationName(combos[0]!) })).toStrictEqual(
      [],
    );
  });

  it('a colour this corpus does not hold keeps the back, and draws nothing else to press', () => {
    const on = handlers();
    drawPage({ ...on, slug: 'no-such-colour' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.press(button('detail.backToAtlas'));
    expect(on.onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText(message('en', 'detail.notFound'))).toBeTruthy();
  });
});

/* ----------------------------------------------------------------------------- no figure */

describe('the garments are an order, never a score (ADR-0148 D2, E-101)', () => {
  /** What the combinations card says, its names included. */
  const cardWords = (tag: string): string => {
    drawPage(handlers(), { tag });
    const card = screen.getByTestId('detail.combinations');
    return wordsOf(card as unknown as TestNode).join('\u0000');
  };
  const figure = /%|％|score|match|スコア|一致|相性/iu;

  it.each([['en-GB'], ['ja-JP']] as const)(
    'prints no figure, score or word of fit, in %s',
    (tag) => {
      expect(cardWords(tag)).not.toMatch(figure);
    },
  );

  it('DECOY: a planted figure is found', () => {
    expect(`${cardWords('en-GB')}\u000087%`).toMatch(figure);
  });
});

/* ----------------------------------------------------------------------------- empty states */

describe('27’s card in the combinations’ place (ADR-0148 D4)', () => {
  it('an empty wardrobe: the empty wardrobe’s card, its Scan opening the Lens', () => {
    const on = handlers();
    drawPage({ ...on, wardrobe: [] });
    expect(screen.getByText(message('en', 'wardrobe.empty.title'))).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: message('en', 'wardrobe.empty.scan') }));
    expect(on.onScanGarment).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('detail.combinations')).toBeNull();
  });

  it('garments, but none that pairs with a top: the card that adds one', () => {
    const on = handlers();
    drawPage({ ...on, wardrobe: [garment('d-4', 'jumper', 6)] });
    expect(screen.getByText(message('en', 'detail.combinationsNone.title'))).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', { name: message('en', 'detail.combinationsNone.add') }),
    );
    expect(on.onAddGarment).toHaveBeenCalledTimes(1);
  });

  it('DECOY: three garments that pair draw the garments and no empty card', () => {
    drawPage(handlers());
    expect(screen.getByTestId('detail.combinations')).toBeTruthy();
    for (const key of ['wardrobe.empty.title', 'detail.combinationsNone.title'] as const)
      expect(screen.queryByText(message('en', key))).toBeNull();
  });
});

/* ----------------------------------------------------------------------------- the route */

/*
 * WHERE EACH DRAWN ACTION GOES (ADR-0147 D3, E-215), read from the route's source: a test may not
 * import a route, and each target is a route another feature rebuilds, so its name is held here.
 */
describe('the route sends each drawn action where ADR-0147 D3 says (E-215)', () => {
  const ROUTE = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'atlas', '[slug].tsx'), 'utf8');

  /**
   * Each handler's own body, by its prop name: from its name to the next prop the screen takes. Read
   * per handler (F-247's review, M7), so a target moved to the wrong control, or one control's target
   * satisfied by another's, is seen.
   */
  const handlers = (source: string): ReadonlyMap<string, string> => {
    const out = new Map<string, string>();
    const props = [
      ...source.matchAll(/\n\s+(on[A-Z]\w+|wardrobe|photoOf|ranking|bookmarked)=\{/gu),
    ];
    props.forEach((m, i) => {
      const end = props[i + 1]?.index ?? source.length;
      out.set(m[1]!, source.slice(m.index, end));
    });
    return out;
  };

  /** What each drawn control must do: the target it pushes or navigates to. */
  const EXPECTED: readonly (readonly [string, string])[] = [
    // S1: the control is drawn *Atlas* and named *Back to Atlas*, and 06 records navigate:/atlas.
    ['onBack', "router.navigate('/atlas')"],
    ['onShareCard', 'router.push(`/atlas/card/${s}`)'],
    ['onExport', 'router.push(`/profile/export?slug=${s}`)'],
    ['onWearIt', 'router.push(`/atlas/wear/${s}`)'],
    ['onHoldAsTarget', "router.push('/lens')"],
    ['onOpenGarment', 'router.push(`/wardrobe/with/${id}`)'],
    ['onScanGarment', "router.push('/lens')"],
    ['onAddGarment', "router.push('/wardrobe/add')"],
  ];

  const sendsEveryAction = (source: string): boolean => {
    const by = handlers(source);
    const hold = by.get('onHoldAsTarget') ?? '';
    return (
      EXPECTED.every(([name, target]) => (by.get(name) ?? '').includes(target)) &&
      // Hold arms the target, then opens the Lens (E-106); Scan opens it without arming.
      hold.includes('arm({') &&
      hold.indexOf('arm({') < hold.indexOf("router.push('/lens')") &&
      !(by.get('onScanGarment') ?? '').includes('arm(')
    );
  };

  it('each control sends its own target, and Hold arms before it opens the Lens', () => {
    expect(handlers(ROUTE).size).toBeGreaterThanOrEqual(EXPECTED.length);
    expect(sendsEveryAction(ROUTE)).toBe(true);
  });

  it('DECOY: a bare export, a back that only pops, swapped targets, or the Lens before arming each fail', () => {
    expect(sendsEveryAction(ROUTE.replace('/profile/export?slug=${s}', '/profile/export'))).toBe(
      false,
    );
    expect(sendsEveryAction(ROUTE.replace("router.navigate('/atlas')", 'router.back()'))).toBe(
      false,
    );
    // Share and Wear It swap targets: every target is still in the file, and the check still fails.
    const swapped = ROUTE.replace('/atlas/card/${s}', '@@')
      .replace('/atlas/wear/${s}', '/atlas/card/${s}')
      .replace('@@', '/atlas/wear/${s}');
    expect(sendsEveryAction(swapped)).toBe(false);
    const hold = handlers(ROUTE).get('onHoldAsTarget') ?? '';
    const lensFirst = hold
      .replace("router.push('/lens');", '')
      .replace('arm({', "router.push('/lens');\n          arm({");
    expect(sendsEveryAction(ROUTE.replace(hold, lensFirst))).toBe(false);
  });
});

/* ----------------------------------------------------------------------------- the seal */

/*
 * THE SEAL IS AN INDEPENDENT CHECK'S (F-247's review, S3). Every published entry is self-reviewed,
 * so the page is drawn here over a planted copy of the sweep's entry whose check is independent:
 * the seal appears at its drawn size, in its minted green, beside the words that carry the status.
 */
describe('the review seal is drawn for an independent check, and only then', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const seals = () =>
    screen.UNSAFE_queryAllByType(Glyph).filter((g) => g.props['name'] === 'seal-check');

  it('draws none for a self-reviewed entry — every one today', () => {
    drawPage(handlers());
    expect(seals()).toHaveLength(0);
    expect(screen.getByText(/Checked by its own author/u)).toBeTruthy();
  });

  it('draws one, at its drawn size and in its green, for an independent check', () => {
    const real = corpus.entryBySlug(DETAIL.entry.slug)!;
    const independent = {
      ...real,
      entry: {
        ...real.entry,
        provenance: { ...real.entry.provenance, reviewIndependence: 'independent' },
      },
    } as PublishedEntry;
    jest.spyOn(corpus, 'entryBySlug').mockReturnValue(independent);
    drawPage(handlers());
    const [seal] = seals();
    expect(seal?.props['size']).toBe(SEAL_GLYPH);
    expect(seal?.props['color']).toBe(nativeColors.dark['glyph.seal']);
  });
});
