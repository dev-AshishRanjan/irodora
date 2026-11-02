/**
 * Building a palette is mockup 16 in order, grouping and proportion (F-251, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 16's elements is DRAWN. This asks the rest
 * of the first criterion, on the same rendered page:
 *
 * - **Order**: the bar (back, title, *Save Palette*) over its rule; the name card (the field, then the
 *   three type chips); the four slots (heading → sample → hex → name → foot); the matrix (its title,
 *   then contrast, harmony, separation); the tray (a peeking tile, a divider, ‹, seven tiles, ›, a
 *   divider, a peeking tile); and *Create & Save*.
 * - **Grouping**: the chips are in the name card; two slots share a row; each slot's foot shares one
 *   row; each matrix row's label and value share one row; the tray's parts share one row.
 * - **Proportion**: every size the page passes is recomputed here from `mockups/inventory/16.json`
 *   (half-dp, siblings by their median), and every text, corner and fill is the one 16 records.
 *
 * What a tree cannot show — that it looks like 16 — is the person's capture (criterion 4).
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
import { nativeType } from '@irodora/design-tokens';
import {
  AppBar,
  Button,
  Card,
  ChoiceGroup,
  IconButton,
  Illustration,
  Swatch,
  TextField,
  ThemeProvider,
} from '@irodora/ui';
import {
  BUILDER_APP_BAR,
  BUILDER_ART,
  CHEVRON_GLYPH,
  CREATE_AND_SAVE,
  LOCK_GLYPH_16,
  MATRIX_LABEL_COLUMN,
  NAME_FIELD,
  REPLACE_GLYPH,
  SAVE,
  SLOT_SAMPLE,
  TILE_HEIGHT,
  TILE_WIDTH,
  TRAY_INSET,
  TRAY_PEEK,
  TYPE_CHIP,
} from '../src/palette-readout';
import { SLOT_ROLES, type PaletteDraft, type PaletteStore } from '../src/palette';
import { allEntries } from '../src/corpus';
import { PaletteBuilder } from '../src/screens/PaletteBuilder';

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
const SIXTEEN = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '16.json'), 'utf8'),
) as Inventory;
const DP = SIXTEEN.frame.screens[0]?.dpPerPx ?? NaN;
/** An element, its dp recomputed from its measured pixels (F-248's lesson). */
const el = (id: string): Element => {
  const e = SIXTEEN.elements.find((x) => x.id === id);
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
const store: PaletteStore = { savePalette: ignore, listPalettes: () => [], deletePalette: ignore };
type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

/** 16 as drawn: four slots, slot 1 locked, a type, a name. */
const BUILT: PaletteDraft = {
  name: 'Kyoto Autumn Linen Capsule',
  category: 'contemporary',
  members: [
    { slug: 'soko-zumi', role: 'anchor' },
    { slug: 'usu-gami', role: 'light' },
    { slug: allEntries()[0]!.entry.slug, role: 'neutral' },
    { slug: allEntries()[1]!.entry.slug, role: 'accent' },
  ],
  locked: new Set(['anchor']),
};

const setup = (tag = DEFAULT_LANGUAGE_TAG) => {
  mockLanguageTag = tag;
  try {
    const tree = render(
      <ThemeProvider theme="dark">
        <PaletteBuilder store={store} initialDraft={BUILT} onBack={ignore} onSaved={ignore} />
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
const sharedRow = (a: Instance, b: Instance): Instance | null => {
  for (let at: Instance | null = a.parent; at !== null; at = at.parent)
    if (flat(at.props['style'])['flexDirection'] === 'row' && isAncestor(at, b)) return at;
  return null;
};
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

const slot = (role: string, part?: string): string =>
  `builder.slot.${role}${part === undefined ? '' : `.${part}`}`;

/* ----------------------------------------------------------------------------- order */

describe('order: 16 top to bottom', () => {
  it('the name card, the four slots in 16’s order, the matrix, the tray', () => {
    const { root, byId } = setup();
    const at = [
      'builder.name',
      ...SLOT_ROLES.map((r) => slot(r)),
      'builder.matrix',
      'builder.tray',
    ].map((id) => position(root, byId(id)));
    expect(at).toStrictEqual([...at].sort((a, b) => a - b));
  });

  it('the name card: the field, then the three type chips in 16’s order', () => {
    const { root, byId } = setup();
    const at = [
      'builder.name.field',
      'builder.type.contemporary',
      'builder.type.kasane',
      'builder.type.seasonal',
    ].map((id) => position(root, byId(id)));
    expect(at).toStrictEqual([...at].sort((a, b) => a - b));
  });

  it('a slot: heading → sample → hex → name → its foot (Locked, then the role; the role, then Replace)', () => {
    const { root, byId } = setup();
    for (const [role, foot] of [
      ['anchor', ['locked', 'role']],
      ['light', ['role', 'replace']],
    ] as const) {
      const at = ['heading', 'sample', 'hex', 'name', ...foot].map((p) =>
        position(root, byId(slot(role, p))),
      );
      expect(at).toStrictEqual([...at].sort((a, b) => a - b));
    }
  });

  it('the matrix: contrast, harmony, separation, each a rule then a label then its value', () => {
    const { root, byId } = setup();
    const at = ['contrast', 'harmony', 'separation'].flatMap((k) =>
      [`builder.matrix.${k}.rule`, `builder.matrix.${k}.value`].map((id) =>
        position(root, byId(id)),
      ),
    );
    expect(at).toStrictEqual([...at].sort((a, b) => a - b));
  });

  it('the tray: a peeking tile, a divider, ‹, seven tiles, ›, a divider, a peeking tile', () => {
    const { root, byId } = setup();
    const at = [
      'builder.tray.peek.left',
      'builder.tray.divider.left',
      'builder.tray.previous',
      ...Array.from({ length: 7 }, (_, i) => `builder.tray.tile.${String(i)}`),
      'builder.tray.next',
      'builder.tray.divider.right',
      'builder.tray.peek.right',
    ].map((id) => position(root, byId(id)));
    expect(at).toStrictEqual([...at].sort((a, b) => a - b));
  });
});

/* ----------------------------------------------------------------------------- grouping */

describe('grouping: what 16 draws together is together', () => {
  it('the field and the chips are in the name card', () => {
    const { byId } = setup();
    for (const id of ['builder.name.field', 'builder.type.contemporary', 'builder.type.seasonal'])
      expect(isAncestor(byId('builder.name'), byId(id))).toBe(true);
  });

  it('two slots share a row, and slots 3 and 4 the next', () => {
    const { byId } = setup();
    expect(sharedRow(byId(slot('anchor')), byId(slot('light')))).not.toBeNull();
    expect(sharedRow(byId(slot('neutral')), byId(slot('accent')))).not.toBeNull();
    expect(sharedRow(byId(slot('anchor')), byId(slot('neutral')))).toBeNull();
  });

  it('each slot’s foot shares one row; each matrix label and value share one', () => {
    const { byId } = setup();
    expect(sharedRow(byId(slot('anchor', 'locked')), byId(slot('anchor', 'role')))).not.toBeNull();
    expect(sharedRow(byId(slot('accent', 'role')), byId(slot('accent', 'replace')))).not.toBeNull();
    for (const k of ['contrast', 'harmony', 'separation'])
      expect(isAncestor(byId(`builder.matrix.${k}`), byId(`builder.matrix.${k}.value`))).toBe(true);
  });

  it('the tray’s parts share one row, inside the tray', () => {
    const { byId } = setup();
    expect(
      sharedRow(byId('builder.tray.peek.left'), byId('builder.tray.peek.right')),
    ).not.toBeNull();
    expect(isAncestor(byId('builder.tray'), byId('builder.tray.tile.6'))).toBe(true);
  });
});

/* ----------------------------------------------------------------------------- proportion */

describe('proportion: every size recomputed from 16.json', () => {
  it('the bar: to its rule; the title centred at label 600; Save’s height, corner and edge', () => {
    const { root } = setup();
    expect(BUILDER_APP_BAR).toBe(half(el('16.header-rule').dp.y));
    expect(SAVE).toBe(half(el('16.save').dp.h));
    const bar = root.find((n) => n.type === AppBar);
    expect(bar.props).toMatchObject({ height: BUILDER_APP_BAR, rule: true });
    expect(bar.props['title']).toMatchObject({
      align: 'centre',
      size: el('16.title').type?.size,
      weight: el('16.title').type?.weight,
    });
    expect(barOf(root).trailing?.button).toMatchObject({
      height: SAVE,
      radius: el('16.save').tokens['radius'],
      edge: el('16.save').tokens['border'],
      step: el('16.save').type?.size,
    });
  });

  it('the name card: the field’s height, corner, label inside; the chips’ height, corner and chosen fill', () => {
    const { root } = setup();
    expect(NAME_FIELD).toBe(half(el('16.name.field').dp.h));
    expect(TYPE_CHIP).toBe(
      half(median(['capsule', 'kasane', 'editorial'].map((k) => el(`16.name.kind.${k}`).dp.h))),
    );
    const field = root.find((n) => n.type === TextField);
    expect(field.props).toMatchObject({
      labelPlacement: 'inside',
      height: NAME_FIELD,
      radius: el('16.name.field').tokens['radius'],
      size: el('16.name.field').type?.size,
    });
    const chips = root.find((n) => n.type === ChoiceGroup);
    expect(chips.props['pills']).toMatchObject({
      height: TYPE_CHIP,
      radius: el('16.name.kind.capsule').tokens['radius'],
      size: el('16.name.kind.capsule').type?.size,
      selectedFill: 'surface.3',
    });
    expect(el('16.name.kind.capsule').tokens['bg']).toBe('level3');
  });

  it('the slots: level 1 at 16’s corner; the samples at one height, the median of the four', () => {
    const { root } = setup();
    expect(SLOT_SAMPLE).toBe(
      half(median([1, 2, 3, 4].map((n) => el(`16.slots.slot-${String(n)}.swatch`).dp.h))),
    );
    for (const role of SLOT_ROLES) {
      const card = root.find((n) => n.type === Card && n.props['testID'] === slot(role));
      expect(card.props).toMatchObject({
        level: '1',
        radius: el('16.slots.slot-1').tokens['radius'],
      });
      const sample = root.find(
        (n) => n.type === Swatch && n.props['testID'] === slot(role, 'sample'),
      );
      expect(sample.props).toMatchObject({
        height: SLOT_SAMPLE,
        corner: el('16.slots.slot-1.swatch').tokens['radius'],
      });
    }
    expect(LOCK_GLYPH_16).toBe(half(el('16.slots.slot-1.locked').dp.h));
    expect(REPLACE_GLYPH).toBe(
      half(median([2, 3, 4].map((n) => el(`16.slots.slot-${String(n)}.replace`).dp.h))),
    );
  });

  it('the matrix: at 16’s corner; its label column from 16’s label to its value', () => {
    const { root } = setup();
    expect(MATRIX_LABEL_COLUMN).toBe(
      half(el('16.matrix.contrast.value').dp.x - el('16.matrix.contrast.label').dp.x),
    );
    const matrix = root.find((n) => n.type === Card && n.props['testID'] === 'builder.matrix');
    expect(matrix.props).toMatchObject({ level: '1', radius: el('16.matrix').tokens['radius'] });
  });

  it('the tray: the tiles’ width (their median) and height, the peek, the inset, the chevrons', () => {
    const { root } = setup();
    const tiles = [2, 3, 4, 5, 6, 7, 8].map((n) => el(`16.tray.chip-${String(n)}`));
    expect(TILE_WIDTH).toBe(half(median(tiles.map((t) => t.dp.w))));
    expect(TILE_HEIGHT).toBe(half(median(tiles.map((t) => t.dp.h))));
    expect(TRAY_PEEK).toBe(half(el('16.tray.chip-1').dp.w));
    expect(TRAY_INSET).toBe(half(el('16.tray.chip-2').dp.y - el('16.tray').dp.y));
    expect(CHEVRON_GLYPH).toBe(
      half(median(['16.tray.previous', '16.tray.next'].map((id) => el(id).dp.h))),
    );
    for (let i = 0; i < 7; i += 1) {
      const tile = root.find(
        (n) => n.type === Swatch && n.props['testID'] === `builder.tray.tile.${String(i)}`,
      );
      expect(tile.props).toMatchObject({ width: TILE_WIDTH, height: TILE_HEIGHT, corner: 'sm' });
    }
    for (const chevron of root.findAll((n) => n.type === IconButton))
      if (String(chevron.props['name']).startsWith('chevron'))
        expect(chevron.props['size']).toBe(CHEVRON_GLYPH);
  });

  it('Create & Save: its height and corner, the accent fill', () => {
    const { root } = setup();
    expect(CREATE_AND_SAVE).toBe(half(el('16.create').dp.h));
    const create = root.find((n) => n.type === Button && n.props['testID'] === 'builder.create');
    expect(create.props).toMatchObject({
      height: CREATE_AND_SAVE,
      radius: el('16.create').tokens['radius'],
      glyph: 'arrow-right',
    });
    expect(create.props['variant']).toBeUndefined();
    expect(el('16.create').tokens['bg']).toBe('action.primary');
  });

  it('every text at the step 16 records', () => {
    const { byId } = setup();
    const steps: readonly (readonly [string, string])[] = [
      [slot('anchor', 'heading'), '16.slots.slot-1.heading'],
      [slot('anchor', 'hex'), '16.slots.slot-1.hex'],
      [slot('anchor', 'name'), '16.slots.slot-1.name'],
      [slot('light', 'role'), '16.slots.slot-2.role'],
      ['builder.matrix.contrast.value', '16.matrix.contrast.value'],
      ['builder.matrix.separation.value', '16.matrix.separation.value'],
    ];
    for (const [id, record] of steps) {
      const size = el(record).type?.size as keyof typeof nativeType.latin;
      expect([nativeType.latin[size].fontSize, nativeType.japanese[size].fontSize]).toContain(
        rendered(byId(id))['fontSize'],
      );
    }
  });

  it('the art: kimono left and sashiko twice right, from the page under the bar, behind everything', () => {
    const { root, byId } = setup();
    const top = el('16.header-rule').dp.y + 1;
    for (const [art, id] of [
      ['kimono', '16.art-left'],
      ['sashiko-top', '16.art-right-top'],
      ['sashiko-bottom', '16.art-right-bottom'],
    ] as const) {
      const drawn = BUILDER_ART.find((a) => a.key === art)!;
      expect(drawn.top).toBe(half(el(id).dp.y - top));
      expect(drawn.width).toBe(half(el(id).dp.w));
    }
    const names = root.findAll((n) => n.type === Illustration).map((n) => String(n.props['name']));
    expect(names).toStrictEqual(['kimono', 'sashiko', 'sashiko']);
    expect(position(root, byId('builder.art'))).toBeLessThan(position(root, byId('builder.name')));
  });
});
