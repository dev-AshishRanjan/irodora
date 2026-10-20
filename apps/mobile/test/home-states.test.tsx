/**
 * Home as `01` draws it, in each data condition it can reach (F-242; F-146, F-236).
 *
 * ## Why this is here and not in the conformance registry
 *
 * The conformance kinds are a fixed vocabulary: `static` requires one state, `data` requires
 * default, loading, error and empty. Home has **an empty wardrobe and a populated one**, and no
 * loading and no error — `deviceRepository()` opens SQLite synchronously and `listGarments()` is a
 * synchronous read. So the kind stays `static`, and the distinction that IS real is asserted here.
 *
 * ## What it holds
 *
 * - **The hero and the colour card are the day's corpus colour**, every printed value from the
 *   entry or the engine (R9 §8), none from `01`'s drawing (E1).
 * - **No stored colour is presented as a reading** (F-337, as amended by ADR-0138): Home reads
 *   garments and nothing else. The decoy is a palette's colour saved after a Lens reading — the
 *   newest colour row in the store — which must appear nowhere.
 * - **The texture badge is drawn exactly where a material is recorded** (ADR-0137).
 * - **Every drawn action works**, and is absent rather than inert where nothing is wired.
 */

import { fireEvent, render, within } from '@testing-library/react-native';
import { STATE_TEST_IDS, Swatch, TextureBadge, ThemeProvider } from '@irodora/ui';
import type { SavedColorRow, StoredGarment } from '@irodora/store';
import { colourOfTheDay, heroName, oklchLine, wardrobeCountLabel } from '../src/home';
import { Home, type HomeStore } from '../src/screens/Home';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import { t as message, type MessageKey } from '../src/i18n';

/** A date the corpus rotation is fixed at, so the day's colour cannot change under the test. */
const FIXED = Date.UTC(2026, 8, 3, 12);
const TODAY = colourOfTheDay(FIXED);
if (TODAY === null) throw new Error('the corpus is empty');

/** A colour row as the repository returns it. `source` decides what it claims to be. */
const row = (
  id: string,
  created: number,
  hex: string,
  name: string,
  source: 'reference' | 'estimated',
): SavedColorRow => ({
  id,
  created_at: created,
  updated_at: created,
  deleted_at: null,
  name,
  xyz_x: 0.1712,
  xyz_y: 0.1699,
  xyz_z: 0.2381,
  lab_l: 48.2,
  lab_a: -1.1,
  lab_b: -6.4,
  oklch_l: 0.52,
  oklch_c: 0.03,
  oklch_h: 264,
  hex,
  source,
  confidence: source === 'estimated' ? 0.81 : 1,
  corpus_slug: null,
  capture_illuminant: source === 'estimated' ? 'daylight' : null,
  capture_quality: source === 'estimated' ? 'good' : null,
  capture_samples: source === 'estimated' ? 12 : null,
  capture_variance: source === 'estimated' ? 0.4 : null,
});

const garment = (
  id: string,
  created: number,
  color: SavedColorRow,
  material: string | null = null,
): StoredGarment =>
  ({
    id,
    createdAt: created,
    updatedAt: created,
    deletedAt: null,
    type: 'shirt',
    name: null,
    material,
    color,
  }) as unknown as StoredGarment;

/** A Lens reading kept as a garment's colour — the only way a reading is persisted. */
const MEASURED = garment('g-read', 100, row('c-read', 100, '#5A6470', 'Kachi-read', 'estimated'));
/** A palette's colour, written AFTER the reading: the newest colour row in the store. */
const PALETTE = row('c-palette', 900, '#ABCDEF', 'Palette colour', 'reference');

/** A store that also answers `listColors`, so the test can prove Home never asks. */
const storeOf = (garments: readonly StoredGarment[]) => {
  const listColors = jest.fn(() => [PALETTE, MEASURED.color]);
  const store: HomeStore & { listColors: typeof listColors } = {
    listGarments: () => garments,
    listColors,
  };
  return store;
};

const draw = (
  garments: readonly StoredGarment[],
  extra: Partial<React.ComponentProps<typeof Home>> = {},
  theme: 'light' | 'dark' = 'light',
) => {
  const store = storeOf(garments);
  const tree = render(
    <ThemeProvider theme={theme}>
      <Home store={store} now={() => FIXED} {...extra} />
    </ThemeProvider>,
  );
  return { tree, store };
};

/** Every paragraph and every accessible name in a rendered tree. */
function readable(node: unknown, out: string[] = []): string[] {
  const n = node as { props?: Record<string, unknown>; children?: unknown[] } | null;
  const label = n?.props?.['accessibilityLabel'];
  if (typeof label === 'string') out.push(label);
  for (const child of n?.children ?? []) {
    if (typeof child === 'string') out.push(child);
    else readable(child, out);
  }
  return out;
}

const WARDROBE = [
  MEASURED,
  garment('g-2', 200, row('c-2', 200, '#E8E4DA', 'Kinari', 'reference'), 'Linen'),
  garment('g-3', 300, row('c-3', 300, '#5E7A5A', 'Koke', 'reference'), 'Wool'),
];

describe('the hero and the colour card are the day’s corpus colour', () => {
  it('sets its kanji, kana, name and OKLCh on the sample, from the entry and the engine', () => {
    const { tree } = draw(WARDROBE);
    const hero = within(tree.getByTestId('home.hero'));
    expect(hero.getByText(TODAY.entry.name.kanji)).toBeTruthy();
    expect(hero.getByText(TODAY.entry.name.kana)).toBeTruthy();
    expect(hero.getByText(heroName(TODAY.entry.name))).toBeTruthy();
    expect(hero.getByText(oklchLine(TODAY.derived.oklch, en['coord.oklch']))).toBeTruthy();
  });

  it('heads the colour card with the real classification, and prints the entry’s own provenance', () => {
    const { tree } = draw(WARDROBE);
    const card = within(tree.getByTestId('home.colourCard'));
    expect(card.getByText(en['home.colourCard'])).toBeTruthy();
    expect(card.getByText(TODAY.entry.provenance.source)).toBeTruthy();
    // The heading is true of the entry it heads (FR-23).
    expect(TODAY.entry.classification).toBe('japanese-inspired');
  });

  it('DECOY — no value from 01’s drawing reaches the screen, in either language or palette', () => {
    const SAMPLE_CONTENT = [
      'Ai-nezumi',
      '藍鼠',
      'あいねずみ',
      'Indigo Grey',
      '0.49 •',
      '240°',
      'Heian',
      'Traditional',
      '14 Garments',
      '38 Valid Outfits',
      'Lens Camera',
    ];
    for (const theme of ['light', 'dark'] as const) {
      const { tree } = draw(WARDROBE, { coverage: { valid: 3, threshold: 60 } }, theme);
      const text = readable(tree.toJSON()).join('\n');
      for (const drawn of SAMPLE_CONTENT)
        expect(`${theme}: ${drawn}: ${String(text.includes(drawn))}`).toBe(
          `${theme}: ${drawn}: false`,
        );
    }
    // The scan can see a planted value, so the absences above are not a blind read.
    const planted = draw([garment('g-x', 1, row('c-x', 1, '#445566', 'Ai-nezumi', 'reference'))]);
    expect(readable(planted.tree.toJSON()).join('\n')).toContain('Ai-nezumi');
  });
});

describe('no stored colour is presented as a reading (F-337, as amended by ADR-0138)', () => {
  it('reads no colour row, and the palette saved after the reading appears nowhere', () => {
    const { tree, store } = draw([MEASURED], { onOpenGarment: () => undefined });
    expect(store.listColors).not.toHaveBeenCalled();
    const text = readable(tree.toJSON()).join('\n');
    expect(text).not.toContain('#ABCDEF');
    expect(text).not.toContain('ABCDEF');
    expect(text).not.toContain('Palette colour');
  });

  it('shows the measured colour only as its garment’s tile, announced as estimated', () => {
    const { tree } = draw([MEASURED], { onOpenGarment: () => undefined });
    const estimated = tree
      .UNSAFE_queryAllByType(Swatch)
      .filter(
        (s) =>
          (s.props as { color: { provenance: { source: string } } }).color.provenance.source ===
          'estimated',
      );
    expect(estimated).toHaveLength(1);
    expect((estimated[0]?.props as { hex: string }).hex).toBe('#5A6470');
    // Its name says what it is: the garment, its colour, and the provenance with its confidence.
    const named = readable(tree.toJSON()).filter((s) => s.includes('estimated'));
    expect(named).toHaveLength(1);
    expect(named[0]).toContain('81 percent confidence');
    // The hero is the corpus's, announced as a reference.
    const hero = tree.UNSAFE_queryAllByType(Swatch)[0];
    expect(
      (hero?.props as { color: { provenance: { source: string } } }).color.provenance.source,
    ).toBe('reference');
  });

  it('DECOY — the same scan finds the palette’s colour when it IS a garment’s colour', () => {
    const { tree } = draw([garment('g-p', 1, PALETTE)]);
    expect(readable(tree.toJSON()).join('\n')).toContain('Palette colour');
  });

  it('with no garment at all draws 27’s card and no colour but the day’s, whatever palettes exist', () => {
    const { tree, store } = draw([], { onOpenLens: () => undefined });
    expect(store.listColors).not.toHaveBeenCalled();
    expect(tree.getAllByTestId(STATE_TEST_IDS.empty)).toHaveLength(1);
    const swatches = tree.UNSAFE_queryAllByType(Swatch);
    expect(swatches).toHaveLength(2);
    for (const s of swatches) expect((s.props as { hex: string }).hex).toBe(TODAY.derived.hex);
  });
});

describe('the wardrobe preview', () => {
  it('draws a texture badge exactly where a material is recorded (ADR-0137)', () => {
    const { tree } = draw(WARDROBE);
    expect(tree.UNSAFE_queryAllByType(TextureBadge)).toHaveLength(2);
    const names = readable(tree.toJSON());
    expect(names.some((n) => n.includes('Material Linen'))).toBe(true);
    expect(names.some((n) => n.includes('Material Wool'))).toBe(true);
    // DECOY: the garment with none has no badge words, and a wardrobe with none has no badge.
    expect(names.filter((n) => n.includes('Kachi-read')).some((n) => n.includes('Material'))).toBe(
      false,
    );
    expect(draw([MEASURED]).tree.UNSAFE_queryAllByType(TextureBadge)).toHaveLength(0);
  });

  it('counts the garments and the valid outfits, with the threshold in its name', () => {
    const coverage = { valid: 3, threshold: 60 };
    const { tree } = draw(WARDROBE, { coverage });
    const label = wardrobeCountLabel(3, coverage, (k: MessageKey) => message('en', k), 'latin');
    expect(label).toBe('3 Garments • 3 Valid Outfits');
    expect(tree.getByText(label)).toBeTruthy();
    expect(tree.getByLabelText(`${label}. ${en['shopping.countedAt']}: 60`)).toBeTruthy();
  });

  it('DECOY — without a profile it says the garment count alone (R9 §4 E2)', () => {
    const { tree } = draw(WARDROBE);
    expect(tree.getByText('3 Garments')).toBeTruthy();
    expect(tree.queryByText(/Valid Outfit/u)).toBeNull();
  });

  it('shows the newest five, newest first', () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      garment(
        `g${String(i)}`,
        i,
        row(`c${String(i)}`, i, '#556677', `Colour ${String(i)}`, 'reference'),
      ),
    );
    const { tree } = draw(many);
    const tiles = tree.UNSAFE_queryAllByType(Swatch).slice(1, -1);
    expect(tiles.map((s) => (s.props as { name: string }).name)).toStrictEqual(
      [6, 5, 4, 3, 2].map((i) => `shirt — Colour ${String(i)}`),
    );
  });
});

describe('every drawn action works, and is absent where nothing is wired', () => {
  it('What Goes With This opens the day’s colour’s combinations', () => {
    const onOpenCombinations = jest.fn();
    const { tree } = draw(WARDROBE, { onOpenCombinations });
    fireEvent.press(tree.getByLabelText(en['home.whatGoesWithThis']));
    expect(onOpenCombinations).toHaveBeenCalledWith(TODAY.entry.slug);
  });

  it('DECOY — with no handler the button is not there, rather than there and inert', () => {
    const { tree } = draw(WARDROBE);
    expect(tree.queryByLabelText(en['home.whatGoesWithThis'])).toBeNull();
  });

  it('a tile opens its garment', () => {
    const onOpenGarment = jest.fn();
    const { tree } = draw(WARDROBE, { onOpenGarment });
    const tile = tree
      .UNSAFE_queryAllByType(Swatch)
      .find((s) => (s.props as { hex: string }).hex === '#E8E4DA');
    (tile?.props as { onPress?: () => void }).onPress?.();
    expect(onOpenGarment).toHaveBeenCalledWith('g-2');
  });

  it('the empty wardrobe offers to scan the first garment — 27’s card (F-236)', () => {
    const onOpenLens = jest.fn();
    const { tree } = draw([], { onOpenLens });
    expect(tree.getByText(en['wardrobe.empty.title'])).toBeTruthy();
    fireEvent.press(tree.getByLabelText(en['wardrobe.empty.scan']));
    expect(onOpenLens).toHaveBeenCalledTimes(1);
  });

  it('DECOY — with nowhere to go, it says what is empty and offers nothing (00’s caption)', () => {
    const { tree } = draw([]);
    expect(tree.getByText(en['home.wardrobeEmpty'])).toBeTruthy();
    expect(tree.queryByLabelText(en['wardrobe.empty.scan'])).toBeNull();
  });
});

describe('the front door states what the product is for', () => {
  it('leads with 01’s three questions and the on-device line, in both states and languages', () => {
    for (const garments of [[], WARDROBE]) {
      const text = readable(draw(garments).tree.toJSON()).join('\n');
      expect(text).toContain(`${en['home.what1']}\n${en['home.what2']}\n${en['home.what3']}`);
      expect(text).toContain(en['home.onDevice']);
    }
    expect(ja['home.onDevice']).not.toBe(en['home.onDevice']);
  });

  it('renders different trees for an empty wardrobe and a full one', () => {
    expect(JSON.stringify(draw([]).tree.toJSON())).not.toBe(
      JSON.stringify(draw(WARDROBE).tree.toJSON()),
    );
  });
});
