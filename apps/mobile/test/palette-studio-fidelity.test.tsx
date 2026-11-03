/**
 * The Palette Studio is mockup 10 in order, grouping and proportion (F-251, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 10's elements is DRAWN. This asks the rest
 * of the first criterion, on the same rendered page:
 *
 * - **Order**: the bar (back, then *Create New Palette*), the title below it, the Curated / Custom
 *   choice, the first card (title, description, provenance, band, columns, badges, actions), the first
 *   kasane (kind, title, layers, tags), and the export bar — in 10's reading order.
 * - **Grouping**: the columns sit under the band inside their card; the badges share a row with the
 *   bullet between them; the two actions share a row; a kasane's layers share a row.
 * - **Proportion**: every size the page passes is recomputed here from `mockups/inventory/10.json`
 *   (half-dp, siblings by their median), and every text, corner and fill is the one 10 records.
 *
 * What a tree cannot show — that it looks like 10 — is the person's capture (criterion 4).
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { nativeSpacing, nativeType } from '@irodora/design-tokens';
import {
  AppBar,
  Button,
  Card,
  Chip,
  ChoiceGroup,
  Illustration,
  Screen,
  Strip,
  Swatch,
  ThemeProvider,
} from '@irodora/ui';
import {
  BADGE,
  BAND_HEIGHT,
  CARD_ACTION,
  CREATE,
  EXPORT_SELECTED,
  LAYER_HEIGHT,
  SOURCE_HEIGHT,
  STUDIO_APP_BAR,
  STUDIO_ART,
} from '../src/palette-readout';
import type { PaletteStore } from '../src/palette';
import { allPalettes } from '../src/corpus';
import { PaletteStudio } from '../src/screens/PaletteStudio';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/* ----------------------------------------------------------------------------- the record */

interface Element {
  readonly id: string;
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly dp: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly type: { readonly face: string; readonly size: string; readonly weight: number } | null;
  readonly tokens: Readonly<Record<string, string>>;
}
interface Inventory {
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number }[] };
  readonly elements: readonly Element[];
}
const TEN = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '10.json'), 'utf8'),
) as Inventory;
const DP = TEN.frame.screens[0]?.dpPerPx ?? NaN;
/** An element, its dp recomputed from its measured pixels (F-248's lesson). */
const el = (id: string): Element => {
  const e = TEN.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no ${id}`);
  return { ...e, dp: { x: e.box.x * DP, y: e.box.y * DP, w: e.box.w * DP, h: e.box.h * DP } };
};
const half = (n: number): number => Math.round(n * 2) / 2;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};

/* ----------------------------------------------------------------------------- the page */

const ignore = (): void => undefined;
const store: PaletteStore = {
  savePalette: ignore,
  listPalettes: () => [],
  deletePalette: ignore,
};
type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

const BAND = 'studio.palette.curated:earth-and-clay';
const LAYERS = 'studio.palette.curated:kasane-aki-no-tsuyu';

const setup = (tag = DEFAULT_LANGUAGE_TAG) => {
  mockLanguageTag = tag;
  try {
    const tree = render(
      <ThemeProvider theme="dark">
        <PaletteStudio
          store={store}
          hasProfile
          onBack={ignore}
          onCreate={ignore}
          onApply={ignore}
          onExport={ignore}
          onEdit={ignore}
        />
      </ThemeProvider>,
    );
    const byId = (id: string): Instance =>
      tree.UNSAFE_root.findAll((n) => n.props['testID'] === id)[0] ??
      (() => {
        throw new Error(`no ${id}`);
      })();
    return { tree, byId, root: tree.UNSAFE_root };
  } finally {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  }
};

const inOrder = (root: Instance): Instance[] => root.findAll(() => true, { deep: true });
const isAncestor = (a: Instance, b: Instance): boolean => {
  for (let at: Instance | null = b.parent; at !== null; at = at.parent) if (at === a) return true;
  return false;
};
const flat = (style: unknown): Readonly<Record<string, unknown>> =>
  ((StyleSheet.flatten(style as StyleProp<TextStyle>) as unknown) ?? {}) as Readonly<
    Record<string, unknown>
  >;
/** The nearest ancestor both share that lays its children out in a row. */
const sharedRow = (a: Instance, b: Instance): Instance | null => {
  for (let at: Instance | null = a.parent; at !== null; at = at.parent)
    if (flat(at.props['style'])['flexDirection'] === 'row' && isAncestor(at, b)) return at;
  return null;
};
/** The style a person sees: the host Text's. */
const rendered = (node: Instance): Readonly<Record<string, unknown>> => {
  const host =
    (node.type as unknown) === 'Text'
      ? node
      : node.findAll((n) => (n.type as unknown) === 'Text')[0];
  return flat(host?.props['style']);
};
const position = (root: Instance, node: Instance): number => inOrder(root).indexOf(node);
/** An app bar's props, read as the page passes them. */
interface BarProps {
  readonly title?: { readonly placement?: string };
  readonly trailing?: { readonly button?: Readonly<Record<string, unknown>> };
}
const barOf = (root: Instance): BarProps => root.find((n) => n.type === AppBar).props;

/* ----------------------------------------------------------------------------- order */

describe('order: 10 top to bottom', () => {
  it('the bar, the title below it, the choice, the first band, the first kasane', () => {
    const { root, byId } = setup();
    const ids = ['studio.create', 'studio.view', BAND, LAYERS].map(byId);
    const at = ids.map((n) => position(root, n));
    expect(at).toStrictEqual([...at].sort((a, b) => a - b));
    // The title is below the bar's controls (AppBar's `below` placement), not between them.
    expect(barOf(root).title?.placement).toBe('below');
  });

  it('a band card: title, description, provenance, band, columns, badges, actions', () => {
    const { root, byId } = setup();
    const parts = [
      `${BAND}.title`,
      `${BAND}.description`,
      `${BAND}.provenance`,
      `${BAND}.band`,
      `${BAND}.column.0`,
      `${BAND}.badge.0`,
      `${BAND}.apply`,
      `${BAND}.export`,
    ].map((id) => position(root, byId(id)));
    expect(parts).toStrictEqual([...parts].sort((a, b) => a - b));
  });

  it('a column: role → hex → kanji and romaji → English', () => {
    const { root, byId } = setup();
    const lines = ['role', 'hex', 'name'].map((l) => position(root, byId(`${BAND}.column.0.${l}`)));
    expect(lines).toStrictEqual([...lines].sort((a, b) => a - b));
  });

  it('a kasane: kind → title → its layers, outermost first → its tags', () => {
    const { root, byId } = setup();
    const parts = [
      `${LAYERS}.kind`,
      `${LAYERS}.title`,
      `${LAYERS}.layer.0`,
      `${LAYERS}.layer.1`,
      `${LAYERS}.tag.0`,
    ].map((id) => position(root, byId(id)));
    expect(parts).toStrictEqual([...parts].sort((a, b) => a - b));
  });
});

/* ----------------------------------------------------------------------------- grouping */

describe('grouping: what 10 draws together is together', () => {
  it('the columns sit in their card, four a row, under the band', () => {
    const { byId } = setup();
    const card = byId(BAND);
    for (let n = 0; n < 4; n += 1)
      expect(isAncestor(card, byId(`${BAND}.column.${String(n)}`))).toBe(true);
    expect(sharedRow(byId(`${BAND}.column.0`), byId(`${BAND}.column.3`))).not.toBeNull();
    // The fifth column starts the next row.
    expect(sharedRow(byId(`${BAND}.column.0`), byId(`${BAND}.column.4`))).toBeNull();
  });

  it('the badges share a row with the bullet between them; the two actions share a row', () => {
    const { byId } = setup();
    expect(sharedRow(byId(`${BAND}.badge.0`), byId(`${BAND}.badge.1`))).not.toBeNull();
    expect(sharedRow(byId(`${BAND}.badge.0`), byId(`${BAND}.badge.sep`))).not.toBeNull();
    expect(sharedRow(byId(`${BAND}.apply`), byId(`${BAND}.export`))).not.toBeNull();
  });

  it('a kasane’s layers share a row, and its tags another', () => {
    const { byId } = setup();
    expect(sharedRow(byId(`${LAYERS}.layer.0`), byId(`${LAYERS}.layer.3`))).not.toBeNull();
    expect(sharedRow(byId(`${LAYERS}.tag.0`), byId(`${LAYERS}.tag.1`))).not.toBeNull();
  });
});

/* ----------------------------------------------------------------------------- proportion */

describe('proportion: every size recomputed from 10.json', () => {
  it('the bar: its height, Create’s height and corner, the title at body 600', () => {
    const { root } = setup();
    expect(STUDIO_APP_BAR).toBe(half(el('10.header').dp.h));
    expect(CREATE).toBe(half(el('10.create').dp.h));
    const bar = root.find((n) => n.type === AppBar);
    expect(bar.props['height']).toBe(STUDIO_APP_BAR);
    expect(bar.props['title']).toMatchObject({ size: 'body', weight: 600 });
    expect(el('10.title').type).toMatchObject({ size: 'body', weight: 600 });
    const create = barOf(root).trailing?.button;
    expect(create).toMatchObject({
      height: CREATE,
      radius: el('10.create').tokens['radius'],
      step: 'caption',
    });
  });

  it('the choice: its height, the chosen segment in level 3 with its dot', () => {
    const { root } = setup();
    expect(SOURCE_HEIGHT).toBe(half(el('10.source').dp.h));
    const choice = root.find((n) => n.type === ChoiceGroup);
    expect(choice.props['segmented']).toMatchObject({
      height: SOURCE_HEIGHT,
      mark: 'dot',
      radius: el('10.source').tokens['radius'],
      selectedFill: 'surface.3',
    });
    expect(el('10.source.selected').tokens['bg']).toBe('level3');
  });

  it('the cards: level 1, edged, at 10’s corner, padded md', () => {
    const { root } = setup();
    for (const id of [BAND, LAYERS]) {
      const card = root.find((n) => n.type === Card && n.props['testID'] === id);
      expect(card.props).toMatchObject({
        level: '1',
        radius: el('10.palette-1').tokens['radius'],
        padding: 'md',
      });
    }
  });

  it('the band: shown at its drawn height, at its corner, with the keyline (ADR-0162)', () => {
    const { root } = setup();
    expect(BAND_HEIGHT).toBe(half(el('10.palette-1.strip').dp.h));
    const strip = root.find((n) => n.type === Strip && n.props['testID'] === `${BAND}.band`);
    expect(strip.props).toMatchObject({
      judged: false,
      height: BAND_HEIGHT,
      corner: el('10.palette-1.strip').tokens['radius'],
      keyline: true,
    });
  });

  it('the badges and tags: one height, the median of the four, level 3, pills, caption', () => {
    const { root } = setup();
    const heights = [
      '10.palette-1.badge-contrast',
      '10.palette-1.badge-cvd',
      '10.palette-2.tag-layering',
      '10.palette-2.tag-provenance',
    ].map((id) => el(id).dp.h);
    expect(BADGE).toBe(half(median(heights)));
    const chips = root.findAll((n) => n.type === Chip && n.props['form'] === 'badge');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips)
      expect(chip.props).toMatchObject({
        height: BADGE,
        fill: 'surface.3',
        radius: 'pill',
        size: 'caption',
      });
  });

  it('the actions: their height, corner and edge; the layers’ height; the export bar', () => {
    const { root } = setup();
    expect(CARD_ACTION).toBe(
      half(median(['10.palette-1.apply', '10.palette-1.export'].map((id) => el(id).dp.h))),
    );
    expect(LAYER_HEIGHT).toBe(
      half(median([1, 2, 3, 4].map((n) => el(`10.palette-2.swatch-${String(n)}`).dp.h))),
    );
    expect(EXPORT_SELECTED).toBe(half(el('10.export-bar.button').dp.h));
    const apply = root.find((n) => n.type === Button && n.props['testID'] === `${BAND}.apply`);
    expect(apply.props).toMatchObject({
      height: CARD_ACTION,
      radius: el('10.palette-1.apply').tokens['radius'],
      edge: 'border',
    });
    // Every layer of every kasane: the eight curated kasanes' 28 layers, one height, one corner.
    const layers = root.findAll((n) => n.type === Swatch && n.props['height'] === LAYER_HEIGHT);
    expect(layers.length).toBe(
      allPalettes()
        .filter((p) => p.palette.category === 'kasane')
        .reduce((n, p) => n + p.palette.colors.length, 0),
    );
    for (const layer of layers)
      expect(layer.props).toMatchObject({
        corner: el('10.palette-2.swatch-1').tokens['radius'],
        keyline: true,
      });
    const exportBar = root.find(
      (n) => n.type === Button && n.props['testID'] === 'studio.exportSelected',
    );
    expect(exportBar.props).toMatchObject({
      variant: 'tonal',
      level: 'strong',
      height: EXPORT_SELECTED,
      radius: el('10.export-bar.button').tokens['radius'],
      step: el('10.export-bar.button').type?.size,
    });
    expect(el('10.export-bar.button').tokens['bg']).toBe('border.strong');
  });

  it('every text at the step 10 records', () => {
    const { byId } = setup();
    const steps: readonly (readonly [string, string])[] = [
      [`${BAND}.title`, '10.palette-1.title'],
      [`${BAND}.description`, '10.palette-1.description'],
      [`${BAND}.provenance`, '10.palette-1.provenance'],
      [`${BAND}.column.0.role`, '10.palette-1.colour-1.role'],
      [`${BAND}.column.0.hex`, '10.palette-1.colour-1.hex'],
      [`${LAYERS}.kind`, '10.palette-2.kind'],
      [`${LAYERS}.title`, '10.palette-2.title'],
      [`${LAYERS}.layer.0.hex`, '10.palette-2.swatch-1.hex'],
    ];
    for (const [id, record] of steps) {
      const size = el(record).type?.size as keyof typeof nativeType.latin;
      const font = rendered(byId(id))['fontSize'];
      // The latin step's em; a Japanese line is the same step in the bundled face's scale.
      expect([nativeType.latin[size].fontSize, nativeType.japanese[size].fontSize]).toContain(font);
    }
  });

  it('the art: the leaves down the right edge, at 10’s width, behind the cards', () => {
    const { root, byId } = setup();
    expect(STUDIO_ART).toMatchObject({
      top: half(el('10.art').dp.y),
      width: half(el('10.art').dp.w),
    });
    const art = byId('studio.art');
    expect(flat(art.props['style'])).toMatchObject({
      position: 'absolute',
      right: 0,
      width: STUDIO_ART.width,
    });
    expect(art.props['pointerEvents']).toBe('none');
    expect(art.find((n) => n.type === Illustration).props['name']).toBe('leaves');
    // Behind: drawn before the first card.
    expect(position(root, art)).toBeLessThan(position(root, byId(BAND)));
  });

  it('the page inset is md (10 draws 20 dp, a tie, the smaller; ADR-0139)', () => {
    const { root } = setup();
    expect(half(el('10.palette-1').dp.x)).toBe(20);
    // 20 lies between md (16) and lg (24), equally: the smaller (§2).
    expect(20 - nativeSpacing.md).toBe(nativeSpacing.lg - 20);
    expect(root.find((n) => n.type === Screen).props['padding']).toBe('md');
  });
});
