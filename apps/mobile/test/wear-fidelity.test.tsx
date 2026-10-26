/**
 * The Wear page is mockup 07 in order, grouping and proportion (F-248, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 07's 53 elements is DRAWN. This asks the
 * rest of the first criterion, on the same rendered page:
 *
 * - **Order**: the bar, the anchor card, the occasions, the four tiles and their words, the card's
 *   rows, its rule and its pills, and the two actions come in 07's reading order.
 * - **Grouping**: what 07 draws side by side shares a row, and what it draws inside something is
 *   inside it on the tree — two tiles to a row, slot 2's Swap and Lock in their tile, each row's
 *   label and value, the pills in the card, the two actions in the bar.
 * - **Proportion**: every size, corner, step and interval the page passes is recomputed here from
 *   `mockups/inventory/07.json` through R9 §2's snap, each text's own line inset subtracted, not
 *   restated; the intervals the drawing sets tighter than the scale are named, and their cost is
 *   ADR-0153's; and every text is drawn at the step, weight and ink 07 records.
 *
 * What a tree cannot show — that it looks like 07 — is the person's capture (criterion 4).
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { ScrollView, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { nativeIconStroke, nativeSpacing, nativeType } from '@irodora/design-tokens';
import {
  ActionBar,
  AppBar,
  APP_BAR_DIVIDER_TEST_ID,
  Button,
  Card,
  ChoiceGroup,
  Chip,
  Row,
  Swatch,
  Text,
  ThemeProvider,
} from '@irodora/ui';
import type { PersonalProfile } from '@irodora/recommendation';
import { allEntries } from '../src/corpus';
import { t as message, type MessageKey } from '../src/i18n';
import { capitalised } from '../src/notation';
import { Wear } from '../src/screens/Wear';
import { rankingContext } from '../src/wardrobe/coverage';
import {
  ANCHOR,
  anchorLine,
  BACK_GLYPH,
  contrastLine,
  DIVIDER,
  EXPORT,
  fitLine,
  HARMONY_KEYS,
  LABEL_COLUMN,
  LOCK_GLYPH,
  OCCASION,
  OCCASION_KEYS,
  PILL,
  pillLabel,
  RESTING_WEAR,
  SAVE,
  separationLine,
  SLOT_TITLE_KEYS,
  slotName,
  SWAP,
  SWAP_COMPACT,
  SWAP_COMPACT_GLYPH,
  SWAP_GLYPH,
  WEAR_APP_BAR,
  WEAR_OCCASIONS,
  wearCombination,
} from '../src/wear';

// The slot sheet's mapper ticks after a render; nothing here is about a frame (F-158).
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
  readonly frame: {
    readonly screens: readonly {
      readonly dpPerPx: number;
      readonly box: { readonly x: number; readonly y: number };
    }[];
  };
  readonly elements: readonly Element[];
}
const SEVEN = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '07.json'), 'utf8'),
) as Inventory;
/** 07's scale: its frame's inner width, 564 px for 384 dp. */
const DP = SEVEN.frame.screens[0]?.dpPerPx ?? NaN;
const ORIGIN = SEVEN.frame.screens[0]?.box ?? { x: NaN, y: NaN };
/**
 * An element, its dp box recomputed from its measured pixels: the record's own dp are rounded to the
 * half, and an interval between two rounded edges can land on the other side of a snap's midpoint.
 */
const el = (id: string): Element => {
  const e = SEVEN.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no ${id}`);
  return {
    ...e,
    dp: {
      x: (e.box.x - ORIGIN.x) * DP,
      y: (e.box.y - ORIGIN.y) * DP,
      w: e.box.w * DP,
      h: e.box.h * DP,
    },
  };
};
const bottom = (e: Element): number => e.dp.y + e.dp.h;
const right = (e: Element): number => e.dp.x + e.dp.w;
const SCREEN = 384;

/** R9 §2's snap: the nearest step, the smaller on a tie. A negative interval is never rounded. */
const STEPS = Object.entries(nativeSpacing) as readonly (readonly [string, number])[];
type SpacingStep = keyof typeof nativeSpacing;
const snap = (dp: number): SpacingStep => {
  if (dp < 0) throw new RangeError(`a negative interval (${String(dp)} dp) is not snapped`);
  const ranked = [...STEPS].sort(
    (a, b) => Math.abs(a[1] - dp) - Math.abs(b[1] - dp) || a[1] - b[1],
  );
  return (ranked[0]?.[0] ?? '') as SpacingStep;
};
/** Tighter than the scale can draw — negative, or under half `xs` — so the floor, `xs` (§2). */
const belowTheScale = (dp: number): 'xs' => {
  expect(dp).toBeLessThan(nativeSpacing.xs / 2);
  return 'xs';
};
/** Siblings drawn alike take one step: the one most snap to, the smaller on a tie (§2). */
const snapSiblings = (dps: readonly number[]): SpacingStep => {
  const counts = new Map<SpacingStep, number>();
  for (const d of dps) counts.set(snap(d), (counts.get(snap(d)) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const tied = [...counts.entries()].filter(([, n]) => n === best).map(([s]) => s);
  return tied.sort((a, b) => nativeSpacing[a] - nativeSpacing[b])[0] ?? 'xs';
};
const px = (step: SpacingStep): number => nativeSpacing[step];
type Step = keyof typeof nativeType.latin;
/** A text's own line inset, (lineHeight − em) / 2: the part of a drawn gap that is the text's. */
const lineInset = (step: Step): number =>
  (nativeType.latin[step].lineHeight - nativeType.latin[step].fontSize) / 2;
const half = (n: number): number => Math.round(n * 2) / 2;

/* ----------------------------------------------------------------------------- the page */

/** A colour, the first in the corpus, and somebody with a profile to score against, so the fit row has a figure. */
const SLUG = allEntries()[0]!.entry.slug;
const WEARER: PersonalProfile = {
  lightness: { min: 0.3, max: 0.8 },
  temperatureBias: -0.4,
  chroma: { min: 0.02, max: 0.12 },
  contrast: 'medium',
  confidence: { temperature: 0.8, lightness: 0.8, chroma: 0.7, contrast: 0.6 },
};
const SHOWN = wearCombination(SLUG, RESTING_WEAR, WEARER, rankingContext(null))!;
const ignore = (): void => undefined;

type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

const setup = () => {
  mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  const tree = render(
    <ThemeProvider theme="dark">
      <Wear
        slug={SLUG}
        profile={WEARER}
        onBack={ignore}
        onSaveToLab={ignore}
        onExport={ignore}
        onOpenColour={ignore}
        onShopFor={ignore}
        onAddToWardrobe={ignore}
      />
    </ThemeProvider>,
  );
  const all = () => tree.UNSAFE_getAllByType(Text);
  const text = (s: string): Instance => {
    const found = all().find((n) => textOf(n) === s);
    if (found === undefined) throw new Error(`no text "${s}"`);
    return found;
  };
  const byId = (id: string): Instance =>
    tree.UNSAFE_root.findAll((n) => n.props['testID'] === id)[0] ??
    (() => {
      throw new Error(`no ${id}`);
    })();
  return { tree, text, byId, root: tree.UNSAFE_root };
};

const inOrder = (root: Instance): Instance[] => root.findAll(() => true, { deep: true });
const textOf = (n: Instance): string => {
  const children: unknown = n.props['children'];
  return (Array.isArray(children) ? (children as unknown[]) : [children])
    .filter((c): c is string => typeof c === 'string')
    .join('');
};
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
const nearest = (node: Instance, type: unknown): Instance | null => {
  for (let at: Instance | null = node.parent; at !== null; at = at.parent)
    if (at.type === type) return at;
  return null;
};
/** The nearest ancestor whose own style sets a key: the box that pads or spaces a block. */
const styled = (node: Instance, key: string): Instance | null => {
  for (let at: Instance | null = node.parent; at !== null; at = at.parent)
    if (flat(at.props['style'])[key] !== undefined) return at;
  return null;
};
/** The style a person sees: the host node's, because a step carries its own weight. */
const rendered = (node: Instance): Readonly<Record<string, unknown>> => {
  const host = node.findAll((n) => (n.type as unknown) === 'Text')[0];
  return flat(host?.props['style']);
};
const say = (key: MessageKey): string => message('en', key);
const SLOTS = [
  ['1', 'top'],
  ['2', 'trouser'],
  ['3', 'shoe'],
  ['4', 'outer'],
] as const;

/* ----------------------------------------------------------------------------- order */

describe('order: 07 top to bottom', () => {
  it('the bar: back, its word, the divider, the title', () => {
    const { root, text, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const sequence = [
      text(capitalised(SHOWN.anchor.entry.name.romaji)),
      byId(APP_BAR_DIVIDER_TEST_ID),
      text(say('wear.title')),
    ].map(at);
    expect(sequence.every((n) => n >= 0)).toBe(true);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('the page: anchor, occasions, the four tiles and their words, the card, the actions', () => {
    const { root, text, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const sequence = [
      byId('wear.anchor'),
      text(say('outfit.top')),
      ...WEAR_OCCASIONS.map((o) => text(say(OCCASION_KEYS[o]))),
      ...SLOTS.flatMap(([, key]) => [
        byId(`wear.slot.${key}.title`),
        byId(`wear.slot.${key}.hex`),
        byId(`wear.slot.${key}.name`),
      ]),
      text(say('wear.intelligence')),
      text(say('wear.harmony')),
      text(say('wear.fit')),
      text(say('wear.cvd')),
      text(say('wear.contrast')),
      byId('wear.intelligence.rule'),
      ...SHOWN.alternatives.map((a) => byId(`wear.pill.${a.axis}`)),
      text(say('wear.saveToLab')),
      text(say('wear.exportTokens')),
    ].map(at);
    expect(sequence.every((n) => n >= 0)).toBe(true);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('slot 2 draws Swap then Lock under its name; slots 3 and 4 their Swap in the title row', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    expect(at(byId('wear.slot.trouser.name'))).toBeLessThan(at(byId('wear.slot.trouser.swap')));
    expect(at(byId('wear.slot.trouser.swap'))).toBeLessThan(at(byId('wear.slot.trouser.lock')));
    for (const key of ['shoe', 'outer'] as const) {
      expect(at(byId(`wear.slot.${key}.title`))).toBeLessThan(at(byId(`wear.slot.${key}.swap`)));
      expect(at(byId(`wear.slot.${key}.swap`))).toBeLessThan(at(byId(`wear.slot.${key}.hex`)));
    }
  });
});

/* ----------------------------------------------------------------------------- grouping */

describe('grouping: what 07 draws together is together', () => {
  it('two tiles to a row, each the height of its row; slot 2’s Swap and Lock share a row in it', () => {
    const { byId } = setup();
    const first = sharedRow(byId('wear.slot.top'), byId('wear.slot.trouser'));
    const second = sharedRow(byId('wear.slot.shoe'), byId('wear.slot.outer'));
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).not.toBe(second);
    for (const row of [first!, second!])
      expect(flat(row.props['style'])['alignItems']).toBe('stretch');
    const buttons = sharedRow(byId('wear.slot.trouser.swap'), byId('wear.slot.trouser.lock'));
    expect(buttons !== null && isAncestor(byId('wear.slot.trouser'), buttons)).toBe(true);
  });

  it('each tile’s words and controls are on its sample, and none inside the sample’s own node', () => {
    const { root, byId } = setup();
    for (const [, key] of SLOTS) {
      const tile = byId(`wear.slot.${key}`);
      const sample = tile.findByType(Swatch);
      expect(sample.props['group']).toBe(false);
      expect(isAncestor(sample, byId(`wear.slot.${key}.name`))).toBe(true);
    }
    // The compact Swaps on slots 3 and 4 share their title's row.
    for (const key of ['shoe', 'outer'] as const)
      expect(
        sharedRow(byId(`wear.slot.${key}.title`), byId(`wear.slot.${key}.swap`)),
      ).not.toBeNull();
    /*
     * THE SAMPLE'S NODE HOLDS NONE OF ITS CONTROLS (ADR-0153 D8). Each tile's sample names itself on
     * one node — the press target on a ranked tile, an image on the colour in hand's — and its Swap and
     * Lock are on the sample but are not that node's descendants. A grouping sample would hold them.
     */
    for (const [, key] of SLOTS) {
      const named = root.findAll(
        (n) => typeof n.type === 'string' && n.props['testID'] === `wear.slot.${key}.open`,
      );
      expect({ [key]: named.length }).toStrictEqual({ [key]: 1 });
      expect(named[0]!.props['accessibilityRole']).toBe(key === 'top' ? 'image' : 'button');
      const sample = byId(`wear.slot.${key}`).findByType(Swatch);
      const controls = sample.findAll((n) => n.type === Button);
      expect(controls.length).toBe(key === 'top' ? 0 : key === 'trouser' ? 2 : 1);
      for (const control of controls) expect(isAncestor(named[0]!, control)).toBe(false);
    }
  });

  it('each card row is its label beside its value; the pills and the rule are in the card', () => {
    const { text, byId } = setup();
    for (const key of ['harmony', 'fit', 'cvd', 'contrast'] as const)
      expect(
        sharedRow(
          text(say(`wear.${key}`)),
          byId(`wear.intelligence.${key}`).findAllByType(Text)[1]!,
        ),
      ).not.toBeNull();
    const card = byId('wear.intelligence');
    expect(isAncestor(card, byId('wear.intelligence.rule'))).toBe(true);
    const [first, ...rest] = SHOWN.alternatives;
    for (const a of rest)
      expect(
        sharedRow(byId(`wear.pill.${first!.axis}`), byId(`wear.pill.${a.axis}`)),
      ).not.toBeNull();
    expect(isAncestor(card, byId(`wear.pill.${first!.axis}`))).toBe(true);
  });

  it('the two actions share the bar’s row', () => {
    const { root, text } = setup();
    const bar = root.findByType(ActionBar);
    const actions = sharedRow(text(say('wear.saveToLab')), text(say('wear.exportTokens')));
    expect(actions !== null && isAncestor(bar, actions)).toBe(true);
  });
});

/* ----------------------------------------------------------------------------- proportion */

describe('proportion: every size and interval from 07.json', () => {
  it('the drawn sizes are 07’s', () => {
    expect(WEAR_APP_BAR).toBe(half(el('07.header').box.h * DP));
    expect(DIVIDER).toBe(half(el('07.divider').box.h * DP));
    expect(ANCHOR).toBe(half(el('07.anchor.swatch').box.h * DP));
    expect(OCCASION).toBe(half(el('07.occasion').box.h * DP));
    // Slot 2's Swap and Lock are siblings drawn alike: one height, their mean's.
    expect(SWAP).toBe(
      half(((el('07.slots.slot-2.swap').box.h + el('07.slots.slot-2.lock').box.h) / 2) * DP),
    );
    expect(SWAP_COMPACT).toBe(half(el('07.slots.slot-3.swap').box.h * DP));
    expect(el('07.slots.slot-4.swap').box.h).toBe(el('07.slots.slot-3.swap').box.h);
    expect(PILL).toBe(half(el('07.substitutions.warmer').box.h * DP));
    expect(SAVE).toBe(half(el('07.actions.save').box.h * DP));
    expect(EXPORT).toBe(half(el('07.actions.export').box.h * DP));
    // The values' column starts this far past the four labels' mean start.
    const labels = (['harmony', 'fit', 'cvd', 'contrast'] as const).map(
      (r) => el(`07.intelligence.${r}.label`).box.x,
    );
    const labelX = labels.reduce((n, x) => n + x, 0) / labels.length;
    expect(LABEL_COLUMN).toBe(half((el('07.intelligence.fit.value').box.x - labelX) * DP));
  });

  /*
   * A line glyph inks its path's extent on the 24-unit grid, scaled to its size, plus the line, whose
   * width is fixed on screen: so size = (ink − line) × 24 ÷ extent, to the half dp. The extents are
   * Glyph.tsx's (back: y 6–18, 12 units; the turn: its circle, 17); the padlock is a solid drawing, so
   * no line, over 17.7 units. The inks are ADR-0153 D9's readings, in pixels, at 07's scale.
   */
  it('each glyph is drawn at the size that inks what 07 draws', () => {
    const line = (inkPx: number, extent: number): number =>
      half(((inkPx * DP - nativeIconStroke) * 24) / extent);
    expect(BACK_GLYPH).toBe(line(el('07.back').box.h, 12));
    expect(SWAP_GLYPH).toBe(line(18, 17));
    expect(SWAP_COMPACT_GLYPH).toBe(line(15, 17));
    expect(LOCK_GLYPH).toBe(half((22 * DP * 24) / 17.7));

    const { byId } = setup();
    const glyphOf = (id: string) =>
      byId(id).findAll((n) => n.type === Button)[0]?.props ?? byId(id).props;
    expect([
      glyphOf('wear.slot.trouser.swap')['glyphSize'],
      glyphOf('wear.slot.trouser.lock')['glyphSize'],
    ]).toStrictEqual([SWAP_GLYPH, LOCK_GLYPH]);
    expect(glyphOf('wear.slot.shoe.swap')['glyphSize']).toBe(SWAP_COMPACT_GLYPH);
  });

  it('the app bar: 07’s height, its inset, its gap, the divider, and no rule', () => {
    const { root } = setup();
    const bar = root.findByType(AppBar).props as Record<string, unknown>;
    expect(bar['height']).toBe(WEAR_APP_BAR);
    expect(bar['rule']).toBeUndefined();
    expect(bar['inset']).toBe(px(snap(el('07.back').dp.x)));
    expect(bar['gap']).toBe(
      px(
        snapSiblings([
          el('07.divider').dp.x - right(el('07.back.label')),
          el('07.title').dp.x - right(el('07.divider')),
        ]),
      ),
    );
    expect(bar['divider']).toBe(DIVIDER);
    expect((bar['back'] as { size: number; weight: number }).size).toBe(BACK_GLYPH);
    expect((bar['back'] as { size: number; weight: number }).weight).toBe(
      el('07.back.label').type?.weight,
    );
  });

  it('the anchor card: below the bar at the page inset, padded, its sample and its two lines', () => {
    const { root, text, byId } = setup();
    const anchor = el('07.anchor');
    const scroll = root.find((n) => n.type === ScrollView && n.props['testID'] === 'wear.scroll');
    expect(flat(scroll.props['contentContainerStyle'])['paddingTop']).toBe(
      px(snap(anchor.dp.y - bottom(el('07.header')))),
    );
    const inset = snapSiblings([anchor.dp.x, SCREEN - right(anchor)]);
    expect(
      flat(styled(byId('wear.anchor'), 'paddingHorizontal')?.props['style'])['paddingHorizontal'],
    ).toBe(px(inset));
    const card = root.find((n) => n.type === Card && n.props['testID'] === 'wear.anchor');
    const swatch = el('07.anchor.swatch');
    const padding = snapSiblings([swatch.dp.x - anchor.dp.x, swatch.dp.y - anchor.dp.y]);
    expect([card.props['padding'], card.props['radius'], card.props['level']]).toStrictEqual([
      padding,
      anchor.tokens['radius'],
      '1',
    ]);
    const sample = card.findByType(Swatch);
    expect([sample.props['size'], sample.props['corner']]).toStrictEqual([
      ANCHOR,
      swatch.tokens['radius'],
    ]);
    const line = text(anchorLine(SHOWN.anchor).slice(SHOWN.anchor.entry.name.kanji.length));
    // The sample and the name's line share the card's row, at 07's interval between them.
    const row = sharedRow(sample, line);
    expect(row).not.toBeNull();
    expect(nearest(sample, Row)?.props['gap']).toBe(
      snap(el('07.anchor.name').dp.x - right(swatch)),
    );
    // Name → category: tighter than the scale, named (ADR-0153 D1).
    const nameToCategory =
      el('07.anchor.category').dp.y -
      bottom(el('07.anchor.name')) -
      lineInset('body') -
      lineInset('label');
    expect(flat(styled(text(say('outfit.top')), 'gap')?.props['style'])['gap']).toBe(
      px(belowTheScale(nameToCategory)),
    );
  });

  it('the occasions: below the anchor, inset as drawn, at 07’s height and corner, sized by their words', () => {
    const { root } = setup();
    const occasion = el('07.occasion');
    const group = root.findByType(ChoiceGroup);
    const block = flat(group.parent?.props['style']);
    expect(block['marginTop']).toBe(px(snap(occasion.dp.y - bottom(el('07.anchor')))));
    expect([block['paddingLeft'], block['paddingRight']]).toStrictEqual([
      px(snap(occasion.dp.x)),
      px(snap(SCREEN - right(occasion))),
    ]);
    const segmented = group.props['segmented'] as Record<string, unknown>;
    expect([
      segmented['height'],
      segmented['radius'],
      segmented['fit'],
      segmented['mark'],
    ]).toStrictEqual([OCCASION, occasion.tokens['radius'], 'content', 'dot']);
    expect(group.props['value']).toBe('office');
  });

  it('the tiles: below the occasions, inset, spaced, padded, and their words at the floor', () => {
    const { byId } = setup();
    const [s1, s2, s3, s4] = SLOTS.map(([n]) => el(`07.slots.slot-${n}`)) as [
      Element,
      Element,
      Element,
      Element,
    ];
    const block = styled(byId('wear.slot.top'), 'paddingHorizontal')!;
    const style = flat(block.props['style']);
    expect(style['marginTop']).toBe(px(snap(s1.dp.y - bottom(el('07.occasion')))));
    expect(style['paddingHorizontal']).toBe(px(snapSiblings([s1.dp.x, SCREEN - right(s2)])));
    expect(style['gap']).toBe(px(snap(s3.dp.y - bottom(s1))));
    // The two rows' gaps are siblings drawn alike: one step.
    const between = px(snapSiblings([s2.dp.x - right(s1), s4.dp.x - right(s3)]));
    expect(
      sharedRow(byId('wear.slot.top'), byId('wear.slot.trouser'))?.props['style'],
    ).toMatchObject({ gap: between });
    expect(
      sharedRow(byId('wear.slot.shoe'), byId('wear.slot.outer'))?.props['style'],
    ).toMatchObject({ gap: between });
    // The tile's padding: tile → title, its line inset less; tile → its words, leading.
    const pad = snapSiblings([
      el('07.slots.slot-1.title').dp.y - s1.dp.y - lineInset('label'),
      el('07.slots.slot-1.title').dp.x - s1.dp.x,
      el('07.slots.slot-2.title').dp.x - s2.dp.x,
    ]);
    const content = styled(byId('wear.slot.trouser.title'), 'padding')!;
    expect(flat(content.props['style'])['padding']).toBe(px(pad));
    // title → hex: siblings, three at the floor's step — one drawn wider, slot 1's, named (D1).
    const titleToHex = SLOTS.map(
      ([n]) =>
        el(`07.slots.slot-${n}.hex`).dp.y -
        bottom(el(`07.slots.slot-${n}.title`)) -
        2 * lineInset('label'),
    );
    expect(snapSiblings(titleToHex.slice(1).map((d) => Math.max(d, 0)))).toBe('xs');
    // hex → name, and name → slot 2's buttons: tighter than the scale.
    for (const [n] of SLOTS) {
      const hexToName =
        el(`07.slots.slot-${n}.name`).dp.y -
        bottom(el(`07.slots.slot-${n}.hex`)) -
        lineInset('label') -
        lineInset('body');
      expect(belowTheScale(hexToName)).toBe('xs');
    }
    const words = styled(byId('wear.slot.trouser.hex'), 'gap')!;
    expect(flat(words.props['style'])).toMatchObject({ gap: px('xs'), marginTop: px('xs') });
    const nameToButtons =
      el('07.slots.slot-2.swap').dp.y - bottom(el('07.slots.slot-2.name')) - lineInset('body');
    expect(belowTheScale(nameToButtons)).toBe('xs');
    // Swap ↔ Lock.
    expect(
      sharedRow(byId('wear.slot.trouser.swap'), byId('wear.slot.trouser.lock'))?.props['style'],
    ).toMatchObject({
      gap: px(snap(el('07.slots.slot-2.lock').dp.x - right(el('07.slots.slot-2.swap')))),
    });
  });

  it('the buttons on the tiles: 07’s heights, corners, steps and forms', () => {
    const { byId } = setup();
    const props = (id: string): Record<string, unknown> =>
      (byId(id).findAll((n) => n.type === Button)[0] ?? nearest(byId(id), Button)!).props;
    const big = props('wear.slot.trouser.swap');
    const lock = props('wear.slot.trouser.lock');
    expect([big['variant'], big['level'], big['height'], big['radius'], big['step']]).toStrictEqual(
      [
        'tonal',
        3,
        SWAP,
        el('07.slots.slot-2.swap').tokens['radius'],
        el('07.slots.slot-2.swap').type?.size,
      ],
    );
    expect([lock['variant'], lock['glyph'], lock['glyphTint'], lock['selected']]).toStrictEqual([
      'tonal',
      'lock-solid',
      'glyph.lock',
      false,
    ]);
    const compact = props('wear.slot.shoe.swap');
    expect([
      compact['variant'],
      compact['height'],
      compact['radius'],
      compact['step'],
    ]).toStrictEqual([
      'secondary',
      SWAP_COMPACT,
      el('07.slots.slot-3.swap').tokens['radius'],
      el('07.slots.slot-3.swap').type?.size,
    ]);
    expect((compact['on'] as { hex: string }).hex).toBe(
      SHOWN.slots.find((s) => s.key === 'shoe')!.entry!.derived.hex,
    );
  });

  it('the card: inset as drawn, padded, its title, rows, rule and pills at 07’s intervals', () => {
    const { root, text, byId } = setup();
    const card = el('07.intelligence');
    const node = root.find((n) => n.type === Card && n.props['testID'] === 'wear.intelligence');
    const block = flat(node.parent?.props['style']);
    expect(block['marginTop']).toBe(px(snap(card.dp.y - bottom(el('07.slots.slot-3')))));
    expect(block['paddingLeft']).toBe(px(snap(card.dp.x)));
    expect(block['paddingRight']).toBe(px(belowTheScale(SCREEN - right(card))));
    const padding = snapSiblings([
      el('07.intelligence.title').dp.y - card.dp.y - lineInset('body'),
      el('07.intelligence.title').dp.x - card.dp.x,
    ]);
    expect([node.props['padding'], node.props['radius'], node.props['level']]).toStrictEqual([
      padding,
      card.tokens['radius'],
      '1',
    ]);
    const rows = styled(byId('wear.intelligence.harmony'), 'gap')!;
    expect(flat(rows.props['style'])['marginTop']).toBe(
      px(
        snap(
          el('07.intelligence.harmony.label').dp.y -
            bottom(el('07.intelligence.title')) -
            lineInset('body') -
            lineInset('label'),
        ),
      ),
    );
    const rowToRow =
      el('07.intelligence.fit.label').dp.y -
      bottom(el('07.intelligence.harmony.label')) -
      2 * lineInset('label');
    expect(flat(rows.props['style'])['gap']).toBe(px(belowTheScale(rowToRow)));
    const label =
      nearest(text(say('wear.harmony')), Row) !== null ? text(say('wear.harmony')).parent : null;
    expect(flat(label?.props['style'])['width']).toBe(LABEL_COLUMN);
    const rule = flat(byId('wear.intelligence.rule').props['style']);
    expect(rule['marginTop']).toBe(
      px(
        snap(
          el('07.intelligence.rule').dp.y -
            bottom(el('07.intelligence.contrast.label')) -
            lineInset('label'),
        ),
      ),
    );
    expect(rule['marginRight']).toBe(
      -(px(padding) - px(snap(right(card) - right(el('07.intelligence.rule'))))),
    );
    const pills = styled(byId(`wear.pill.${SHOWN.alternatives[0]!.axis}`), 'marginTop')!;
    expect(flat(pills.props['style'])['marginTop']).toBe(
      px(snap(el('07.substitutions.warmer').dp.y - bottom(el('07.intelligence.rule')))),
    );
    const pill = root
      .findAllByType(Chip)
      .find((c) => c.props['testID'] === `wear.pill.${SHOWN.alternatives[0]!.axis}`)!;
    expect([pill.props['height'], pill.props['radius'], pill.props['size']]).toStrictEqual([
      PILL,
      el('07.substitutions.warmer').tokens['radius'],
      el('07.substitutions.warmer').type?.size,
    ]);
    expect(nearest(pill, Row)?.props['gap']).toBe(
      snapSiblings([
        el('07.substitutions.contrast').dp.x - right(el('07.substitutions.warmer')),
        el('07.substitutions.monochrome').dp.y - bottom(el('07.substitutions.warmer')),
      ]),
    );
    // The card → the scroller's end.
    const scroll = root.find((n) => n.type === ScrollView && n.props['testID'] === 'wear.scroll');
    expect(flat(scroll.props['contentContainerStyle'])['paddingBottom']).toBe(
      px(snap(el('07.actions').dp.y - bottom(card))),
    );
  });

  it('the action bar: its rule, insets and gap, and each action at its drawn height and corner', () => {
    const { root } = setup();
    const bar = root.findByType(ActionBar).props as {
      rule: boolean;
      gap: number;
      padding: { top: number; bottom: number; side: number };
      actions: readonly {
        height: number;
        radius: string;
        step: string;
        variant?: string;
        edge?: string;
      }[];
    };
    const actions = el('07.actions');
    const save = el('07.actions.save');
    const exporter = el('07.actions.export');
    // The bar's box starts at its 2 px rule (ADR-0153 D9): the buttons' interval is below it.
    const ruleDp = 2 * DP;
    expect(bar.padding).toStrictEqual({
      top: px(snap(save.dp.y - actions.dp.y - ruleDp)),
      bottom: px(snap(bottom(actions) - bottom(save))),
      side: px(snapSiblings([save.dp.x - actions.dp.x, right(actions) - right(exporter)])),
    });
    expect(bar.gap).toBe(px(snap(exporter.dp.x - right(save))));
    expect(bar.rule).toBe(true);
    expect(bar.actions.map((a) => [a.height, a.radius, a.step])).toStrictEqual([
      [SAVE, save.tokens['radius'], save.type?.size],
      [EXPORT, exporter.tokens['radius'], exporter.type?.size],
    ]);
    expect([bar.actions[1]?.variant, bar.actions[1]?.edge]).toStrictEqual(['secondary', 'border']);
  });
});

/* ----------------------------------------------------------------------------- the snap's cost */

describe('the snap’s cost: what the floor adds over 07 (ADR-0153 D1)', () => {
  it('name → category, hex → name, name → buttons, row → row and the card’s trailing edge', () => {
    const cost = (drawn: number): number => Math.round((nativeSpacing.xs - drawn) * 100) / 100;
    const nameToCategory =
      el('07.anchor.category').dp.y -
      bottom(el('07.anchor.name')) -
      lineInset('body') -
      lineInset('label');
    const hexToName =
      el('07.slots.slot-1.name').dp.y -
      bottom(el('07.slots.slot-1.hex')) -
      lineInset('label') -
      lineInset('body');
    const nameToButtons =
      el('07.slots.slot-2.swap').dp.y - bottom(el('07.slots.slot-2.name')) - lineInset('body');
    const rowToRow =
      el('07.intelligence.fit.label').dp.y -
      bottom(el('07.intelligence.harmony.label')) -
      2 * lineInset('label');
    const trailing = SCREEN - right(el('07.intelligence'));
    const drawn = [nameToCategory, hexToName, nameToButtons, rowToRow, trailing];
    for (const d of drawn) expect(d).toBeLessThan(nativeSpacing.xs / 2);
    // Each costs at most 9 dp over 07, and none of them is a gap a person reads as a different layout.
    for (const d of drawn) expect(cost(d)).toBeLessThanOrEqual(9);
  });
});

/* ----------------------------------------------------------------------------- type */

describe('type: every text at the step, weight and ink 07 records', () => {
  const TOKEN: Readonly<Record<string, string>> = {
    'text.primary': 'foreground',
    'text.secondary': 'foreground.2',
  };

  it('in English, each against 07', () => {
    const { text, byId } = setup();
    const { intelligence } = SHOWN;
    const cases: readonly (readonly [string, Instance])[] = [
      ['07.back.label', text(capitalised(SHOWN.anchor.entry.name.romaji))],
      ['07.title', text(say('wear.title'))],
      ['07.anchor.category', text(say('outfit.top'))],
      ['07.occasion.casual', text(say('wear.occasion.casual'))],
      ['07.occasion.office', text(say('wear.occasion.office'))],
      ['07.slots.slot-1.title', byId('wear.slot.top.title')],
      ['07.slots.slot-2.title', byId('wear.slot.trouser.title')],
      ['07.slots.slot-2.hex', byId('wear.slot.trouser.hex')],
      ['07.slots.slot-2.name', byId('wear.slot.trouser.name')],
      ['07.intelligence.title', text(say('wear.intelligence'))],
      ['07.intelligence.harmony.label', text(say('wear.harmony'))],
      ['07.intelligence.harmony.value', text(say(HARMONY_KEYS[intelligence.harmony]))],
      ['07.intelligence.fit.value', text(fitLine(intelligence.fit, say, 'latin'))],
      ['07.intelligence.cvd.value', text(separationLine(intelligence.separation, say, 'latin'))],
      ['07.intelligence.contrast.value', text(contrastLine(intelligence.contrast)!)],
      ['07.actions.save', text(say('wear.saveToLab'))],
      ['07.actions.export', text(say('wear.exportTokens'))],
    ];
    for (const [id, node] of cases) {
      const e = el(id);
      const step = e.type?.size as Step;
      expect({ [id]: node.props['size'] as unknown }).toStrictEqual({ [id]: e.type?.size });
      expect({ [id]: (rendered(node)['fontWeight'] as string | undefined) ?? '400' }).toStrictEqual(
        { [id]: String(e.type?.weight) },
      );
      expect({ [id]: rendered(node)['fontSize'] }).toStrictEqual({
        [id]: nativeType.latin[step].fontSize,
      });
      const fg = e.tokens['fg'];
      if (fg !== undefined && TOKEN[fg] !== undefined)
        expect({ [id]: node.props['color'] as unknown }).toStrictEqual({ [id]: TOKEN[fg] });
    }
    // The two Swap sizes and the pills, by their words.
    const words = (s: string) => text(s).props['size'] as unknown;
    expect(words(pillLabel(SHOWN.alternatives[0]!, 'trouser', say))).toBe(
      el('07.substitutions.warmer').type?.size,
    );
    expect(slotName(SHOWN.slots[0]!.entry!, false)).toBe(textOf(byId('wear.slot.trouser.name')));
    expect(say(SLOT_TITLE_KEYS.trouser)).toBe(textOf(byId('wear.slot.trouser.title')));
  });
});
