/**
 * The colour page is mockup 06 in order, grouping and proportion (F-247, criterion 1) — and in
 * Japanese, 26's words and Japanese type on 06's layout (R9 C3, P2).
 *
 * The inventory sweep in `screens.test` asks whether each of 06's 52 elements is DRAWN. This asks the
 * rest of the first criterion, on the same rendered page:
 *
 * - **Order**: the bar, the sample, the names, the pill, the three cards and the action bar come in
 *   06's reading order, and each card's parts in the order 06 sets them.
 * - **Grouping**: what 06 draws side by side shares a row, and what it draws inside something is
 *   inside it on the tree — the kanji beside its two lines, the three icons, the three garments, the
 *   two actions, each number on its garment, the branch inside its card.
 * - **Proportion**: every size, corner, step and interval the page passes is recomputed here from
 *   `mockups/inventory/06.json` through R9 §2's snap, each text's own line inset subtracted, not
 *   restated; the intervals the drawing sets tighter than the scale are named, and their cost is
 *   ADR-0145's; and every text is drawn at the step, weight and ink 06 records (26 in Japanese).
 *
 * What a tree cannot show — that it looks like 06 — is the person's capture (criterion 4).
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
import { nativeIconStroke, nativeRadius, nativeSpacing, nativeType } from '@irodora/design-tokens';
import type { StoredGarment } from '@irodora/store';
import {
  ActionBar,
  AppBar,
  APP_BAR_RULE_TEST_ID,
  Card,
  Chip,
  Glyph,
  IconButton,
  Illustration,
  illustrationBox,
  ReadoutTable,
  Row,
  Stack,
  Swatch,
  Text,
  ThemeProvider,
} from '@irodora/ui';
import { allEntries } from '../src/corpus';
import {
  ART_HEIGHT,
  ART_WIDTH,
  BACK_GLYPH,
  BOOKMARK_GLYPH,
  combinationCaption,
  DETAIL_APP_BAR,
  EXPORT_GLYPH,
  HERO_HEIGHT,
  HERO_KEYLINE,
  HOLD,
  HOLD_GLYPH,
  nameLine,
  PHOTO,
  PILL,
  provenanceBody,
  provenanceLead,
  RANK,
  reviewLine,
  SEAL_GLYPH,
  SHARE_GLYPH,
  STACK_HEIGHT,
  STACK_WIDTH,
  taxonomyLine,
  WEAR,
  wearableCombinations,
} from '../src/detail';
import { t as message, type MessageKey } from '../src/i18n';
import { ColourDetail } from '../src/screens/ColourDetail';
import { rankingContext } from '../src/wardrobe/coverage';

/* ----------------------------------------------------------------------------- the records */

interface Element {
  readonly id: string;
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly dp: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly type: { readonly face: string; readonly size: string; readonly weight: number } | null;
  readonly tokens: Readonly<Record<string, string>>;
  readonly raw?: Readonly<Record<string, number>>;
}
interface Inventory {
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number }[] };
  readonly elements: readonly Element[];
}
const inventory = (n: string): Inventory =>
  JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', `${n}.json`), 'utf8'),
  ) as Inventory;
const SIX = inventory('06');
const TWENTY_SIX = inventory('26');
const find = (inv: Inventory, id: string): Element => {
  const e = inv.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no ${id}`);
  return e;
};
const el = (id: string): Element => find(SIX, id);
const el26 = (id: string): Element => find(TWENTY_SIX, id);
/** 06's scale: its upper panel, 474 px for 384 dp (ADR-0145 D1). */
const DP = SIX.frame.screens[0]?.dpPerPx ?? NaN;
const bottom = (e: Element): number => e.dp.y + e.dp.h;
const right = (e: Element): number => e.dp.x + e.dp.w;
const SCREEN = 384;

/**
 * R9 §2's snap: the nearest step, the smaller on a tie. A NEGATIVE interval is refused, never
 * rounded (F-246's review, B1): it goes through {@link belowTheScale}.
 */
const STEPS = Object.entries(nativeSpacing) as readonly (readonly [string, number])[];
const snap = (dp: number): string => {
  if (dp < 0) throw new RangeError(`a negative interval (${String(dp)} dp) is not snapped`);
  const ranked = [...STEPS].sort(
    (a, b) => Math.abs(a[1] - dp) - Math.abs(b[1] - dp) || a[1] - b[1],
  );
  return ranked[0]?.[0] ?? '';
};
/** Tighter than the scale can draw — negative, or under half `xs` — so the floor, `xs` (§2). */
const belowTheScale = (dp: number): 'xs' => {
  expect(dp).toBeLessThan(nativeSpacing.xs / 2);
  return 'xs';
};
/** Siblings drawn alike take one step: the one most snap to, the smaller on a tie (§2). */
const snapSiblings = (dps: readonly number[]): string => {
  const counts = new Map<string, number>();
  for (const d of dps) counts.set(snap(d), (counts.get(snap(d)) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const tied = [...counts.entries()].filter(([, n]) => n === best).map(([s]) => s);
  const size = (step: string): number => STEPS.find(([name]) => name === step)?.[1] ?? NaN;
  return tied.sort((a, b) => size(a) - size(b))[0] ?? '';
};
/** Siblings drawn alike take one size: the one most are drawn at, the smaller on a tie. */
const mode = (xs: readonly number[]): number => {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const best = Math.max(...counts.values());
  return Math.min(...[...counts.entries()].filter(([, n]) => n === best).map(([x]) => x));
};
type Step = keyof typeof nativeType.latin;
/** A text's own line inset, (lineHeight − em) / 2: the part of a drawn gap that is the text's. */
const lineInset = (step: Step, script: 'latin' | 'japanese' = 'latin'): number =>
  (nativeType[script][step].lineHeight - nativeType[script][step].fontSize) / 2;
const half = (n: number): number => Math.round(n * 2) / 2;

/* ----------------------------------------------------------------------------- the page */

/** The sweep's fixture: an entry with an authored autumn, and three garments that pair with it. */
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
const PHOTO_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
const RANKING = rankingContext(null);
const ignore = (): void => undefined;

type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

const drawPage = (tag = DEFAULT_LANGUAGE_TAG) => {
  mockLanguageTag = tag;
  try {
    return render(
      <ThemeProvider theme="dark">
        <ColourDetail
          slug={DETAIL.entry.slug}
          bookmarked={false}
          onBookmark={ignore}
          onBack={ignore}
          onShareCard={ignore}
          onExport={ignore}
          onWearIt={ignore}
          onHoldAsTarget={ignore}
          wardrobe={WARDROBE}
          photoOf={(id) => (id === 'd-1' ? PHOTO_URI : null)}
          ranking={RANKING}
          onOpenGarment={ignore}
          onScanGarment={ignore}
          onAddGarment={ignore}
        />
      </ThemeProvider>,
    );
  } finally {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  }
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
/** The nearest ancestor whose own style sets a key: the box that pads a block. */
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

const setup = (tag = DEFAULT_LANGUAGE_TAG) => {
  const tree = drawPage(tag);
  const all = () => tree.UNSAFE_getAllByType(Text);
  const text = (s: string): Instance => {
    const found = all().find((n) => textOf(n) === s);
    if (found === undefined) throw new Error(`no text "${s}"`);
    return found;
  };
  const byId = (id: string): Instance => tree.UNSAFE_root.find((n) => n.props['testID'] === id);
  return { tree, text, byId, root: tree.UNSAFE_root };
};

const say = (locale: 'en' | 'ja') => (key: MessageKey) => message(locale, key);
const COMBOS = wearableCombinations(DETAIL, WARDROBE, RANKING);

/* ----------------------------------------------------------------------------- order */

describe('order: 06 top to bottom', () => {
  it('the bar: back, its word, bookmark, share, export, then the rule', () => {
    const { root, text, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const icons = root.findAllByType(IconButton).map((i) => i.props['name'] as string);
    expect(icons).toStrictEqual(['bookmark', 'share', 'export']);
    const [bookmark, , exporter] = root.findAllByType(IconButton);
    expect(at(text(message('en', 'tab.atlas')))).toBeLessThan(at(bookmark!));
    expect(at(exporter!)).toBeLessThan(at(byId(APP_BAR_RULE_TEST_ID)));
  });

  it('the page: sample, kanji, kana, name, pill, then the three cards and their parts', () => {
    const { root, text, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const hero = root.findAllByType(Swatch).find((s) => s.props['width'] === 'fill')!;
    const sequence = [
      hero,
      text(DETAIL.entry.name.kanji),
      text(DETAIL.entry.name.kana),
      text(nameLine(DETAIL)),
      byId('detail.taxonomy'),
      text(message('en', 'detail.readout')),
      byId('detail.readout.table.hex.value'),
      byId('detail.readout.table.oklch.value'),
      byId('detail.readout.table.cielab.value'),
      byId('detail.readout.table.srgb.value'),
      byId('detail.readout.table.srgb.bar'),
      byId('detail.readout.table.srgb.also.value'),
      text(message('en', 'detail.provenance')),
      text(provenanceBody(DETAIL, say('en'))),
      text(reviewLine(DETAIL, say('en'), 'latin')),
      text(message('en', 'detail.combinations')),
      byId('detail.combination.1.photo'),
      text(combinationCaption(COMBOS[0]!)),
      byId('detail.combination.2.photo'),
      text(combinationCaption(COMBOS[1]!)),
      byId('detail.combination.3.photo'),
      text(combinationCaption(COMBOS[2]!)),
      text(message('en', 'detail.wearIt')),
      text(message('en', 'detail.holdAsTarget')),
    ].map(at);
    expect(sequence.every((n) => n >= 0)).toBe(true);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('the stacked layer is drawn first, so the sample is over it (06.swatch.stack)', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const hero = root.findAllByType(Swatch).find((s) => s.props['width'] === 'fill')!;
    expect(at(byId('detail.stack'))).toBeLessThan(at(hero));
    expect(byId('detail.stack').parent).toBe(hero.parent);
  });
});

/** The review line's seal, where one is drawn: the one `seal-check` glyph. */
function seal(root: Instance): Instance | undefined {
  return root.findAll((n) => n.type === Glyph && n.props['name'] === 'seal-check')[0];
}

/* ----------------------------------------------------------------------------- grouping */

describe('grouping: what 06 draws together is together', () => {
  it('the kanji shares a row with its two lines; the three icons, the garments and the actions each share one', () => {
    const { root, text, byId } = setup();
    expect(sharedRow(text(DETAIL.entry.name.kanji), text(DETAIL.entry.name.kana))).not.toBeNull();
    expect(sharedRow(text(DETAIL.entry.name.kanji), text(nameLine(DETAIL)))).not.toBeNull();
    const [bookmark, share, exporter] = root.findAllByType(IconButton);
    const icons = sharedRow(bookmark!, exporter!);
    expect(icons).not.toBeNull();
    expect(isAncestor(icons!, share!)).toBe(true);
    expect(
      sharedRow(byId('detail.combination.1.photo'), byId('detail.combination.3.photo')),
    ).not.toBeNull();
    const bar = root.findByType(ActionBar);
    const actions = sharedRow(
      text(message('en', 'detail.wearIt')),
      text(message('en', 'detail.holdAsTarget')),
    );
    expect(actions !== null && isAncestor(bar, actions)).toBe(true);
  });

  it('each number is on its garment, and the garment is the one control a tap reaches', () => {
    const { root, byId } = setup();
    for (const n of ['1', '2', '3']) {
      // The control: the one node carrying the item's id that a press reaches.
      const item = root.find(
        (x) =>
          x.props['testID'] === `detail.combination.${n}` &&
          typeof x.props['onPress'] === 'function',
      );
      expect(item.props['accessibilityRole']).toBe('button');
      expect(isAncestor(item, byId(`detail.combination.${n}.rank`))).toBe(true);
      expect(isAncestor(item, byId(`detail.combination.${n}.photo`))).toBe(true);
      // The rank sits at the photo's corner, inside the photo's own box.
      expect(
        isAncestor(byId(`detail.combination.${n}.photo`), byId(`detail.combination.${n}.rank`)),
      ).toBe(true);
    }
  });

  it('the plum branch is inside the provenance card, before its words, so the words are over it', () => {
    const { root, text, byId } = setup();
    const art = root.findByType(Illustration);
    expect(isAncestor(byId('detail.provenance'), art)).toBe(true);
    const at = (n: Instance) => inOrder(root).indexOf(n);
    expect(at(art)).toBeLessThan(at(text(message('en', 'detail.provenance'))));
  });
});

/* ----------------------------------------------------------------------------- proportion */

describe('proportion: every size and interval from 06.json', () => {
  it('the drawn sizes are 06’s', () => {
    expect(DETAIL_APP_BAR).toBe(el('06.header').dp.h);
    expect(HERO_HEIGHT).toBe(el('06.swatch').dp.h);
    expect(STACK_WIDTH).toBe(el('06.swatch.stack').dp.w);
    expect(STACK_HEIGHT).toBe(el('06.swatch.stack').dp.h);
    expect(HERO_KEYLINE).toBe(
      Math.round((el('06.swatch').raw?.['keylinePx'] ?? NaN) * DP * 10) / 10,
    );
    expect(PILL).toBe(el('06.taxonomy').dp.h);
    expect(PHOTO).toBe(
      mode([1, 2, 3].map((n) => el(`06.combinations.item-${String(n)}.photo`).dp.h)),
    );
    expect(RANK).toBe(
      mode([1, 2, 3].map((n) => el(`06.combinations.item-${String(n)}.rank`).dp.h)),
    );
    expect(WEAR).toBe(el('06.actions.wear').dp.h);
    expect(HOLD).toBe(el('06.actions.hold').dp.h);
    // The art at its drawn height; its width is the drawing's own aspect, never wider than drawn.
    expect(ART_HEIGHT).toBe(el('06.provenance.art').dp.h);
    const [boxW, boxH] = illustrationBox('plum-branch');
    expect(ART_WIDTH).toBe(half((ART_HEIGHT * boxW) / boxH));
    expect(ART_WIDTH).toBeLessThanOrEqual(el('06.provenance.art').dp.w);
  });

  /*
   * A line glyph inks its path's extent on the 24-unit grid, scaled to its size, plus the line, whose
   * width is fixed on screen: so size = (ink − line) × 24 ÷ extent, to the half dp. Each extent is its
   * path's in Glyph.tsx (back: y 6–18; bookmark 18; share 17.5; export 16.5; reticle 16 units); the ink
   * is the element's box, in pixels, at 06's scale.
   */
  it('each glyph is drawn at the size that inks what 06 draws', () => {
    const size = (id: string, extent: number): number =>
      half(((el(id).box.h * DP - nativeIconStroke) * 24) / extent);
    expect(BACK_GLYPH).toBe(size('06.back.icon', 12));
    expect(BOOKMARK_GLYPH).toBe(size('06.bookmark', 18));
    expect(SHARE_GLYPH).toBe(size('06.share', 17.5));
    expect(EXPORT_GLYPH).toBe(size('06.export', 16.5));
    expect(HOLD_GLYPH).toBe(size('06.actions.hold.icon', 16));
    // The seal is a solid drawing, so no line: its blob inks 15 × 16 px (measure.ps1) over a scalloped
    // ring spanning 17.8 units.
    expect(SEAL_GLYPH).toBe(half((((15 + 16) / 2) * DP * 24) / 17.8));

    const { root } = setup();
    const bar = root.findByType(AppBar).props as {
      back: { size: number };
      trailing: { icons: readonly { glyph: string; size: number }[] };
    };
    expect(bar.back.size).toBe(BACK_GLYPH);
    expect(bar.trailing.icons.map((i) => [i.glyph, i.size])).toStrictEqual([
      ['bookmark', BOOKMARK_GLYPH],
      ['share', SHARE_GLYPH],
      ['export', EXPORT_GLYPH],
    ]);
    // The sweep's entry is self-reviewed, so no seal is drawn (S3); colour-detail-states draws one.
    expect(seal(root)).toBeUndefined();
  });

  it('the app bar: 06’s height, its inset and its icons’ pitch', () => {
    const { root } = setup();
    const bar = root.findByType(AppBar).props as Record<string, unknown>;
    expect(bar['height']).toBe(el('06.header').dp.h);
    expect(bar['rule']).toBe(true);
    const insetStep = snapSiblings([el('06.back.icon').dp.x, SCREEN - right(el('06.export'))]);
    expect(bar['inset']).toBe(nativeSpacing[insetStep as keyof typeof nativeSpacing]);
    const gapStep = snapSiblings([
      el('06.share').dp.x - right(el('06.bookmark')),
      el('06.export').dp.x - right(el('06.share')),
    ]);
    expect(bar['gap']).toBe(nativeSpacing[gapStep as keyof typeof nativeSpacing]);
    expect((bar['trailing'] as { targetRoom?: true }).targetRoom).toBe(true);
  });

  it('the sample: below the rule, at the page inset, the layer showing its drawn width', () => {
    const { root, byId } = setup();
    const scroll = root.findByType(ScrollView);
    expect(flat(scroll.props['contentContainerStyle'])['paddingTop']).toBe(
      nativeSpacing[
        snap(el('06.swatch').dp.y - bottom(el('06.header'))) as keyof typeof nativeSpacing
      ],
    );
    const pageInset = snapSiblings([el('06.swatch').dp.x, SCREEN - right(el('06.swatch.stack'))]);
    const hero = root.findAllByType(Swatch).find((s) => s.props['width'] === 'fill')!;
    const block = styled(hero, 'paddingHorizontal');
    expect(flat(block?.props['style'])['paddingHorizontal']).toBe(
      nativeSpacing[pageInset as keyof typeof nativeSpacing],
    );
    expect([hero.props['height'], hero.props['keylineWidth'], hero.props['corner']]).toStrictEqual([
      HERO_HEIGHT,
      HERO_KEYLINE,
      el('06.swatch').tokens['radius'],
    ]);
    // The layer: its drawn width shows past the sample, and it runs on under the sample's corner.
    expect(flat(hero.parent?.props['style'])['paddingRight']).toBe(STACK_WIDTH);
    const layer = byId('detail.stack').findByType(Swatch);
    expect([
      layer.props['width'],
      layer.props['height'],
      layer.props['corner'],
      layer.props['keyline'],
    ]).toStrictEqual([
      STACK_WIDTH + nativeRadius.sm,
      STACK_HEIGHT,
      el('06.swatch.stack').tokens['radius'],
      false,
    ]);
    expect(flat(byId('detail.stack').props['style'])['top']).toBe(
      el('06.swatch.stack').dp.y - el('06.swatch').dp.y,
    );
    expect(byId('detail.stack').props['importantForAccessibility']).toBe('no-hide-descendants');
  });

  it('the names and the pill: indented together, each interval less its text’s own inset', () => {
    const { text, byId } = setup();
    const kanji = el('06.kanji');
    const kanjiInset = lineInset('kanjiHero', 'japanese');
    // Sample → kanji: the kanji's line box is taller than its ink by its inset.
    const heroToNames = snap(kanji.dp.y - bottom(el('06.swatch')) - kanjiInset);
    const namesBlock = nearest(text(DETAIL.entry.name.kanji), Stack)!;
    const outer = nearest(namesBlock, Stack)!;
    expect(outer.props['gap']).toBe(heroToNames);
    // The block's indent: the kanji's and the pill's, siblings.
    const indent = snapSiblings([
      kanji.dp.x - el('06.swatch').dp.x,
      el('06.taxonomy').dp.x - el('06.swatch').dp.x,
    ]);
    expect(flat(namesBlock.parent?.props['style'])['paddingLeft']).toBe(
      nativeSpacing[indent as keyof typeof nativeSpacing],
    );
    // Kanji → its two lines, side by side.
    const row = sharedRow(text(DETAIL.entry.name.kanji), text(DETAIL.entry.name.kana))!;
    expect(nearest(text(DETAIL.entry.name.kana), Row)?.props['gap']).toBe(
      snap(el('06.kana').dp.x - right(kanji)),
    );
    expect(row).not.toBeNull();
    // Kana → name, and kanji → pill: tighter than the scale (ADR-0145 D8), so the floor.
    const kanaToName =
      el('06.name').dp.y -
      bottom(el('06.kana')) -
      lineInset('body', 'japanese') -
      lineInset('body');
    expect(nearest(text(DETAIL.entry.name.kana), Stack)?.props['gap']).toBe(
      belowTheScale(kanaToName),
    );
    const kanjiToPill = el('06.taxonomy').dp.y - bottom(kanji) - kanjiInset;
    expect(namesBlock.props['gap']).toBe(belowTheScale(kanjiToPill));
    expect(isAncestor(namesBlock, byId('detail.taxonomy'))).toBe(true);
  });

  it('the cards: fitted to the screen at the floor, each padded and spaced as 06 draws them', () => {
    const { root, text, byId } = setup();
    const readout = el('06.readout');
    const cards = [byId('detail.readout'), byId('detail.provenance'), byId('detail.combinations')];
    const cardsBlock = nearest(cards[0]!, Stack)!.parent!;
    expect(flat(cardsBlock.props['style'])['paddingHorizontal']).toBe(
      nativeSpacing[belowTheScale(readout.dp.x)],
    );
    // Pill → the first card.
    const page = nearest(cardsBlock, Stack)!;
    expect(page.props['gap']).toBe(snap(readout.dp.y - bottom(el('06.taxonomy'))));
    // Every card: md padding, md corner, level 1 — 06's three, siblings.
    const padding = snapSiblings([
      el('06.readout.title').dp.x - readout.dp.x,
      el('06.readout.title').dp.y - readout.dp.y - lineInset('title'),
      el('06.provenance.title').dp.x - el('06.provenance').dp.x,
      el('06.provenance.title').dp.y - el('06.provenance').dp.y - lineInset('title'),
      el('06.combinations.title').dp.x - el('06.combinations').dp.x,
      el('06.combinations.title').dp.y - el('06.combinations').dp.y - lineInset('title'),
    ]);
    for (const [testID, id] of [
      ['detail.readout', '06.readout'],
      ['detail.provenance', '06.provenance'],
      ['detail.combinations', '06.combinations'],
    ] as const) {
      const card = root.find((n) => n.type === Card && n.props['testID'] === testID);
      expect({
        [id]: [card.props['padding'], card.props['radius'], card.props['level']],
      }).toStrictEqual({
        [id]: [padding, el(id).tokens['radius'], '1'],
      });
    }
    // The readout's title → table; readout → provenance; provenance → combinations.
    expect(nearest(text(message('en', 'detail.readout')), Stack)?.props['gap']).toBe(
      snap(el('06.readout.table').dp.y - bottom(el('06.readout.title')) - lineInset('title')),
    );
    expect(nearest(cards[0]!, Stack)?.props['gap']).toBe(
      snap(el('06.provenance').dp.y - bottom(readout)),
    );
    expect(nearest(cards[1]!, Stack)?.props['gap']).toBe(
      snap(el('06.combinations').dp.y - bottom(el('06.provenance'))),
    );
    expect(root.findByType(ReadoutTable).props['form']).toBe('table');
  });

  it('the provenance card: its lines at the floor (ADR-0145 D8), the branch at its drawn place', () => {
    const { root, text } = setup();
    const titleToBody =
      el('06.provenance.body').dp.y -
      bottom(el('06.provenance.title')) -
      lineInset('title') -
      lineInset('label');
    const bodyToReview =
      el('06.provenance.review').dp.y - bottom(el('06.provenance.body')) - 2 * lineInset('label');
    expect(belowTheScale(titleToBody)).toBe(belowTheScale(bodyToReview));
    expect(nearest(text(message('en', 'detail.provenance')), Stack)?.props['gap']).toBe(
      belowTheScale(titleToBody),
    );
    const art = root.findByType(Illustration);
    expect([art.props['width'], art.props['tone'], art.props['name']]).toStrictEqual([
      ART_WIDTH,
      'card',
      'plum-branch',
    ]);
    /*
     * THE WORDS END xs SHORT OF THE ART (F-247's review, S2): 06 draws them 2 px apart, under half the
     * scale's step, so the floor. Their block pads to the art's leading edge, less the card's own
     * inset, and is as tall as the art and its drawn xs below, so the card holds the art.
     */
    const words = styled(text(message('en', 'detail.provenance')), 'paddingRight');
    const gap = belowTheScale(2 * DP);
    expect(flat(words?.props['style'])).toMatchObject({
      paddingRight: nativeSpacing.sm + ART_WIDTH + nativeSpacing[gap] - nativeSpacing.md,
      minHeight: 2 * nativeSpacing.xs + ART_HEIGHT - 2 * nativeSpacing.md,
    });
    const place = flat(art.parent?.props['style']);
    expect(place['top']).toBe(
      nativeSpacing[
        snap(el('06.provenance.art').dp.y - el('06.provenance').dp.y) as keyof typeof nativeSpacing
      ],
    );
    expect(place['right']).toBe(
      nativeSpacing[
        snap(
          right(el('06.provenance')) - right(el('06.provenance.art')),
        ) as keyof typeof nativeSpacing
      ],
    );
  });

  it('the garments: their size, pitch and number, and each caption under its photograph', () => {
    const { text, byId } = setup();
    const title = el('06.combinations.title');
    expect(nearest(text(message('en', 'detail.combinations')), Stack)?.props['gap']).toBe(
      snap(el('06.combinations.item-1.photo').dp.y - bottom(title) - lineInset('title')),
    );
    const photos = [1, 2, 3].map((n) => el(`06.combinations.item-${String(n)}.photo`));
    const pitch = snapSiblings([
      photos[1]!.dp.x - right(photos[0]!),
      photos[2]!.dp.x - right(photos[1]!),
    ]);
    expect(
      sharedRow(byId('detail.combination.1.photo'), byId('detail.combination.3.photo'))?.props[
        'style'
      ],
    ).toMatchObject({ flexWrap: 'wrap' });
    expect(nearest(byId('detail.combination.1'), Row)?.props['gap']).toBe(pitch);
    expect(flat(byId('detail.combination.1.photo').props['style'])).toMatchObject({
      width: PHOTO,
      height: PHOTO,
    });
    // The caption runs at most half a gap past each side of its photograph, so the item is the
    // photograph's width and the pitch is 06's however long a name is (F-247's review, M4).
    const caption = styled(text(combinationCaption(COMBOS[1]!)), 'marginHorizontal');
    expect(flat(caption?.props['style'])).toMatchObject({
      width: PHOTO + nativeSpacing[pitch as keyof typeof nativeSpacing],
      marginHorizontal: -nativeSpacing[pitch as keyof typeof nativeSpacing] / 2,
    });
    expect(nearest(byId('detail.combination.1.photo'), Stack)?.props['gap']).toBe(
      snap(el('06.combinations.item-1.caption').dp.y - bottom(photos[0]!) - lineInset('caption')),
    );
    expect(
      nearest(byId('detail.combination.1.rank'), Chip)?.props['height'] ??
        byId('detail.combination.1.rank').props['height'],
    ).toBe(RANK);
  });

  it('the action bar: its insets and gap, and each action at its drawn height and corner', () => {
    const { root } = setup();
    const bar = root.findByType(ActionBar).props as {
      fill: string;
      rule: boolean;
      gap: number;
      padding: { top: number; bottom: number; side: number };
      actions: readonly {
        height: number;
        radius: string;
        glyph: string;
        glyphSize?: number;
        variant?: string;
        edge?: string;
      }[];
    };
    const actions = el('06.actions');
    const wear = el('06.actions.wear');
    const hold = el('06.actions.hold');
    const step = (s: string): number => nativeSpacing[s as keyof typeof nativeSpacing];
    expect(bar.padding).toStrictEqual({
      top: step(snap(wear.dp.y - actions.dp.y)),
      bottom: step(snap(bottom(actions) - bottom(wear))),
      side: step(snapSiblings([wear.dp.x - actions.dp.x, right(actions) - right(hold)])),
    });
    expect(bar.gap).toBe(step(snap(hold.dp.x - right(wear))));
    expect([bar.fill, bar.rule]).toStrictEqual(['surface.1', true]);
    expect(bar.actions.map((a) => [a.height, a.radius, a.glyph])).toStrictEqual([
      [WEAR, wear.tokens['radius'], 'arrow-right'],
      [HOLD, hold.tokens['radius'], 'reticle'],
    ]);
    expect([
      bar.actions[1]?.variant,
      bar.actions[1]?.edge,
      bar.actions[1]?.glyphSize,
    ]).toStrictEqual(['secondary', 'border', HOLD_GLYPH]);
  });
});

/* ----------------------------------------------------------------------------- the snap's cost */

describe('the snap’s cost: what the floor adds over 06 (ADR-0145 D8)', () => {
  it('kana → name, the provenance title → body and body → review, and the card edge', () => {
    const cost = (drawn: number): number => Math.round((nativeSpacing.xs - drawn) * 100) / 100;
    const kanaToName =
      el('06.name').dp.y -
      bottom(el('06.kana')) -
      lineInset('body', 'japanese') -
      lineInset('body');
    const titleToBody =
      el('06.provenance.body').dp.y -
      bottom(el('06.provenance.title')) -
      lineInset('title') -
      lineInset('label');
    const bodyToReview =
      el('06.provenance.review').dp.y - bottom(el('06.provenance.body')) - 2 * lineInset('label');
    // ADR-0145's table: −4.5 → +8.5; 1.45 → +2.55; −1.2 → +5.2; the edge ~0.8 → ~+3.2 (dp to the half).
    expect(
      [kanaToName, titleToBody, bodyToReview].map((d) => Math.round(d * 100) / 100),
    ).toStrictEqual([-4.5, 1.45, -1.2]);
    expect([cost(kanaToName), cost(titleToBody), cost(bodyToReview)]).toStrictEqual([
      8.5, 2.55, 5.2,
    ]);
    expect(cost(el('06.readout').dp.x)).toBeCloseTo(3, 0);
  });
});

/* ----------------------------------------------------------------------------- type */

describe('type: every text at the face, step, weight and ink its mockup records', () => {
  const TOKEN: Readonly<Record<string, string>> = {
    'text.primary': 'foreground',
    'text.secondary': 'foreground.2',
  };

  it('in English, each against 06', () => {
    const { text, byId } = setup();
    const rank = (n: string): Instance =>
      byId(`detail.combination.${n}.rank`).findAll((x) => x.type === Text && textOf(x) === n)[0]!;
    const cases: readonly (readonly [string, Instance, 'latin' | 'japanese'])[] = [
      ['06.back.label', text(message('en', 'tab.atlas')), 'latin'],
      ['06.kanji', text(DETAIL.entry.name.kanji), 'japanese'],
      ['06.kana', text(DETAIL.entry.name.kana), 'japanese'],
      ['06.name', text(nameLine(DETAIL)), 'latin'],
      ['06.taxonomy', text(taxonomyLine(DETAIL, say('en'), 'latin')), 'latin'],
      ['06.readout.title', text(message('en', 'detail.readout')), 'latin'],
      ['06.provenance.title', text(message('en', 'detail.provenance')), 'latin'],
      ['06.provenance.body', text(provenanceBody(DETAIL, say('en'))), 'latin'],
      ['06.provenance.review', text(reviewLine(DETAIL, say('en'), 'latin')), 'latin'],
      ['06.readout.table.hex.label', byId('detail.readout.table.hex.label'), 'latin'],
      ['06.readout.table.hex.value', byId('detail.readout.table.hex.value'), 'latin'],
      ['06.readout.table.srgb.p3-label', byId('detail.readout.table.srgb.also.label'), 'latin'],
      ['06.readout.table.srgb.p3-value', byId('detail.readout.table.srgb.also.value'), 'latin'],
      ['06.combinations.item-1.rank', rank('1'), 'latin'],
      ['06.combinations.title', text(message('en', 'detail.combinations')), 'latin'],
      ['06.combinations.item-1.caption', text(combinationCaption(COMBOS[0]!)), 'latin'],
      ['06.actions.wear', text(message('en', 'detail.wearIt')), 'latin'],
      ['06.actions.hold', text(message('en', 'detail.holdAsTarget')), 'latin'],
    ];
    for (const [id, node, script] of cases) {
      const e = el(id);
      const step = e.type?.size as Step;
      expect({ [id]: node.props['size'] as unknown }).toStrictEqual({ [id]: e.type?.size });
      expect({ [id]: (rendered(node)['fontWeight'] as string | undefined) ?? '400' }).toStrictEqual(
        {
          [id]: String(e.type?.weight),
        },
      );
      expect({ [id]: rendered(node)['fontSize'] }).toStrictEqual({
        [id]: nativeType[script][step].fontSize,
      });
      const face = (node.props['face'] as string | undefined) ?? 'sans';
      expect({ [id]: face }).toStrictEqual({ [id]: e.type?.face });
      const fg = e.tokens['fg'];
      if (fg !== undefined)
        expect({ [id]: node.props['color'] as unknown }).toStrictEqual({ [id]: TOKEN[fg] });
    }
  });

  it('in Japanese, the kanji, the headings and the provenance lines against 26 (C3)', () => {
    const { text } = setup('ja-JP');
    const cases: readonly (readonly [string, Instance])[] = [
      ['26.hero.kanji', text(DETAIL.entry.name.kanji)],
      ['26.readout.title', text(message('ja', 'detail.readout'))],
      ['26.kasane.title', text(message('ja', 'detail.combinations'))],
      ['26.provenance.title', text(message('ja', 'detail.provenance'))],
      // In Japanese the lead is the same line's words, one weight and one ink, as 26 sets it (M2).
      [
        '26.provenance.corpus',
        text(`${provenanceLead(DETAIL, say('ja'))}: ${provenanceBody(DETAIL, say('ja'))}`),
      ],
      [
        '26.provenance.review',
        text(`${message('ja', 'detail.review')}: ${reviewLine(DETAIL, say('ja'), 'japanese')}`),
      ],
    ];
    for (const [id, node] of cases) {
      const e = el26(id);
      expect({
        [id]: [node.props['size'], (rendered(node)['fontWeight'] as string | undefined) ?? '400'],
      }).toStrictEqual({
        [id]: [e.type?.size, String(e.type?.weight)],
      });
    }
    // DECOY: the kanji's step differs between the locales, and each is its own inventory's.
    expect(el('06.kanji').type?.size).not.toBe(el26('26.hero.kanji').type?.size);
  });

  it('one layout in both: the readout is 06’s table in Japanese too, never 26’s grid (ADR-0146 D5)', () => {
    for (const tag of ['en-GB', 'ja-JP']) {
      const { root } = setup(tag);
      expect(root.findAllByType(ReadoutTable).map((r) => r.props['form'] as unknown)).toStrictEqual(
        ['table'],
      );
    }
  });
});

/* ----------------------------------------------------------------------------- wrap */

describe('nothing 06 draws on one line is clipped (§4 E3)', () => {
  it('the pill wraps at its drawn height as a minimum; the names, the review and the garments wrap', () => {
    const { root, text, byId } = setup();
    const pill = root.findAllByType(Chip).find((c) => c.props['testID'] === 'detail.taxonomy')!;
    expect([pill.props['wrap'], pill.props['height']]).toStrictEqual([true, PILL]);
    expect(nearest(text(DETAIL.entry.name.kanji), Row)?.props['wrap']).toBe(true);
    expect(nearest(text(reviewLine(DETAIL, say('en'), 'latin')), Row)?.props['wrap']).toBe(true);
    expect(
      sharedRow(byId('detail.combination.1'), byId('detail.combination.3'))?.props['style'],
    ).toMatchObject({
      flexWrap: 'wrap',
    });
    // No word on the page is held to one line but a button's label, whose drawn height clips it at
    // 200 % text — F-344's, recorded (E3).
    const held = root
      .findAllByType(Text)
      .filter((n) => n.props['numberOfLines'] !== undefined && nearest(n, ActionBar) === null)
      .map(textOf)
      // The back word is a button's label; a garment's number is one figure, which cannot wrap.
      .filter((s) => s !== message('en', 'tab.atlas') && !/^[1-3]$/u.test(s));
    expect(held).toStrictEqual([]);
  });
});
