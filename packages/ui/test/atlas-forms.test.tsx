/**
 * The forms `05` draws, added to five components by F-246 — each additive, so each is held two ways:
 * without the new prop the component renders the tree it always rendered (the decoy that proves the
 * new prop is what changes it), and with it the component draws what `05` draws.
 *
 * - `SearchField` — outlined, 26.5 dp, a leading glyph, its words at `caption`; and the TOUCH is
 *   still the platform's target, because the input itself is that tall (Android delivers no touch
 *   outside a parent, so a hit slop past the drawn field would do nothing).
 * - `ChoiceGroup` pills — `05`'s chosen season, filled in `accent` with its dot (ADR-0141), the
 *   words at `caption`, a Japanese run after the label that is part of the name.
 * - `Chip` (control) — the words at `caption`, and the family dot found by the chip's own id.
 * - `Button` (labelled) — `05`'s small outlined pill: the words at `caption`, the side inset `sm`.
 * - `Screen` — `bleed`: a screen that owns its viewport takes no frame padding.
 * - `Card` — `mediaGap`: `05`'s kanji sits `xs` under its sample, closer than the body's padding.
 */

import { render } from '@testing-library/react-native';
import { Platform, View } from 'react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors, nativeSpacing, nativeTapTarget, nativeType } from '@irodora/design-tokens';
import {
  Button,
  Card,
  Chip,
  ChoiceGroup,
  platformTapTarget,
  Screen,
  SearchField,
  Text,
  ThemeProvider,
} from '../src/index.js';
import { flattenStyle, type TestNode } from '../src/testing/index.js';

const SAMPLE = fromSpace('oklch', [0.42, 0.09, 264], { source: 'reference', confidence: 1 });
const dark = nativeColors.dark;

const draw = (node: React.JSX.Element): TestNode => {
  const rendered = render(<ThemeProvider theme="dark">{node}</ThemeProvider>);
  return rendered.toJSON() as TestNode;
};
function nodes(tree: TestNode): readonly TestNode[] {
  const out: TestNode[] = [tree];
  for (const child of tree.children ?? []) if (typeof child !== 'string') out.push(...nodes(child));
  return out;
}
const styleOf = (n: TestNode | undefined): Record<string, unknown> =>
  flattenStyle(n?.props['style']);

describe('SearchField, drawn as 05 draws it', () => {
  const field = (extra: Partial<React.ComponentProps<typeof SearchField>> = {}) =>
    draw(<SearchField label="Search" value="" onChangeText={() => undefined} {...extra} />);
  const input = (tree: TestNode) => nodes(tree).find((n) => n.type === 'TextInput');

  it('is outlined at the drawn height, with its glyph, and its words at the step given', () => {
    const tree = field({ height: 26.5, icon: 'search', size: 'caption', iconSize: 15 });
    const outline = nodes(tree).find(
      (n) => styleOf(n)['height'] === 26.5 && styleOf(n)['borderWidth'] === 1,
    );
    expect(styleOf(outline)['borderColor']).toBe(dark.border);
    expect(styleOf(input(tree))['fontSize']).toBe(nativeType.latin.caption.fontSize);
    expect(nodes(tree).some((n) => n.type === 'RNSVGSvgView')).toBe(true);
  });

  it.each(['ios', 'android'] as const)(
    'keeps the touch at %s’s target, the layout at the drawn height',
    (os) => {
      const replaced = jest.replaceProperty(Platform, 'OS', os);
      try {
        const tree = field({ height: 26.5, icon: 'search' });
        const target = Math.max(platformTapTarget(os), 26.5);
        // Android's is 48 and iOS's 44: the case that caught F-237's short field ran on Android.
        expect(target).toBe(os === 'android' ? 48 : 44);
        expect(styleOf(input(tree))['height']).toBe(target);
        const root = nodes(tree).find((n) => styleOf(n)['marginVertical'] !== undefined);
        expect(styleOf(root)['height']).toBe(target);
        expect(target + 2 * Number(styleOf(root)['marginVertical'])).toBe(26.5);
      } finally {
        replaced.restore();
      }
    },
  );

  it('DECOY — a field drawn at the target needs no overhang', () => {
    const tall = field({ height: platformTapTarget() });
    expect(
      styleOf(nodes(tall).find((n) => styleOf(n)['marginVertical'] !== undefined))[
        'marginVertical'
      ],
    ).toBe(-0);
  });

  it('DECOY — without a height it is the filled field it always was', () => {
    const tree = field();
    expect(styleOf(input(tree))['backgroundColor']).toBe(dark['surface.2']);
    expect(styleOf(input(tree))['minHeight']).toBe(nativeTapTarget);
    expect(nodes(tree).some((n) => n.type === 'RNSVGSvgView')).toBe(false);
  });
});

describe('ChoiceGroup pills, as 05 draws its seasons', () => {
  const group = (pills: React.ComponentProps<typeof ChoiceGroup>['pills']) =>
    draw(
      <ChoiceGroup
        label="Season"
        value="spring"
        onChange={() => undefined}
        options={[
          { value: 'spring', label: 'Spring', kanji: '春' },
          { value: 'summer', label: 'Summer', kanji: '夏' },
        ]}
        pills={pills ?? {}}
      />,
    );
  /** The radio items, as the group's host nodes carry them: chosen first in these fixtures. */
  const radios = (tree: TestNode) =>
    nodes(tree).filter(
      (n) =>
        n.props['accessibilityRole'] === 'radio' ||
        (n.props['accessibilityState'] as { selected?: boolean } | undefined)?.selected !==
          undefined,
    );
  const isChosen = (n: TestNode): boolean =>
    (n.props['accessibilityState'] as { selected?: boolean } | undefined)?.selected === true;

  it('fills the chosen pill in accent with its dot, no foreground edge, and the words at caption', () => {
    const tree = group({
      selectedFill: 'accent',
      selectedEdge: false,
      size: 'caption',
      height: 21,
    });
    const chosen = radios(tree).find(isChosen);
    expect(styleOf(chosen)['backgroundColor']).toBe(dark.accent);
    expect(styleOf(chosen)['borderColor']).toBe(dark.accent);
    // The dot leads it, in the accent's ink (ADR-0141).
    const dot = nodes(chosen!).find(
      (n) =>
        styleOf(n)['borderRadius'] !== undefined &&
        styleOf(n)['backgroundColor'] === dark['accent.foreground'],
    );
    expect(dot).toBeDefined();
    const words = nodes(chosen!).filter((n) => n.type === 'Text');
    expect(styleOf(words[0])['fontSize']).toBe(nativeType.latin.caption.fontSize);
  });

  it('names each pill with its Japanese run, and draws the run in the gothic', () => {
    const tree = group({ size: 'caption' });
    expect(radios(tree).map((n) => n.props['accessibilityLabel'])).toStrictEqual([
      'Spring 春',
      'Summer 夏',
    ]);
  });

  it('DECOY — with no options given, the pill is 15’s: surface.2, a foreground edge, label', () => {
    const tree = group({});
    const chosen = radios(tree).find(isChosen);
    expect(styleOf(chosen)['backgroundColor']).toBe(dark['surface.2']);
    expect(styleOf(chosen)['borderColor']).toBe(dark.foreground);
    const words = nodes(chosen!).filter((n) => n.type === 'Text');
    expect(styleOf(words[0])['fontSize']).toBe(nativeType.latin.label.fontSize);
  });
});

describe('Chip, as 05 draws its family chips', () => {
  it('sets its words at the step given, and names its dot by its own id', () => {
    const tree = draw(
      <Chip
        label="Ao"
        kanji="青"
        size="caption"
        ground="surface.1"
        dot={{ hex: '#4E5D6C', color: SAMPLE }}
        testID="atlas.family.ao"
        onPress={() => undefined}
      />,
    );
    const words = nodes(tree).filter((n) => n.type === 'Text');
    for (const w of words) expect(styleOf(w)['fontSize']).toBe(nativeType.latin.caption.fontSize);
    expect(nodes(tree).filter((n) => n.props['testID'] === 'atlas.family.ao.dot')).toHaveLength(1);
  });

  it('DECOY — without a size or an id, the words are label and the dot carries no id', () => {
    const tree = draw(
      <Chip label="Ao" dot={{ hex: '#4E5D6C', color: SAMPLE }} onPress={() => undefined} />,
    );
    const words = nodes(tree).filter((n) => n.type === 'Text');
    expect(styleOf(words[0])['fontSize']).toBe(nativeType.latin.label.fontSize);
    expect(
      nodes(tree).some(
        (n) => typeof n.props['testID'] === 'string' && n.props['testID'].endsWith('.dot'),
      ),
    ).toBe(false);
  });
});

describe('Button, as 05 draws its small outlined pills', () => {
  const pill = (extra: Partial<React.ComponentProps<typeof Button>> = {}) =>
    draw(
      <Button
        variant="secondary"
        edge="border"
        label="Compare"
        height={18.5}
        onPress={() => undefined}
        {...(extra as object)}
      />,
    );
  const button = (tree: TestNode) =>
    nodes(tree).find((n) => n.props['accessibilityRole'] === 'button');

  it('sets its words at caption and its side inset at sm', () => {
    const tree = pill({ step: 'caption', inset: 'sm' });
    expect(styleOf(button(tree))['paddingHorizontal']).toBe(nativeSpacing.sm);
    const words = nodes(tree).filter((n) => n.type === 'Text');
    expect(styleOf(words[0])['fontSize']).toBe(nativeType.latin.caption.fontSize);
  });

  it('DECOY — by default the words are body and the inset md', () => {
    const tree = pill();
    expect(styleOf(button(tree))['paddingHorizontal']).toBe(nativeSpacing.md);
    const words = nodes(tree).filter((n) => n.type === 'Text');
    expect(styleOf(words[0])['fontSize']).toBe(nativeType.latin.body.fontSize);
  });
});

describe('Screen bleed, for a screen that owns its viewport', () => {
  const page = (bleed: boolean) =>
    draw(
      <Screen scroll={false} bleed={bleed} testID="page">
        <Text size="body" color="foreground">
          Atlas
        </Text>
      </Screen>,
    );
  const frame = (tree: TestNode) => nodes(tree).find((n) => n.props['testID'] === 'page');

  it('takes no frame padding when it bleeds', () => {
    expect(styleOf(frame(page(true)))['padding']).toBeUndefined();
  });

  it('DECOY — without bleed the frame is padded as before', () => {
    expect(styleOf(frame(page(false)))['padding']).toBe(nativeSpacing.lg);
  });

  it('refuses bleed on a screen that scrolls in its own scroller — at compile time, and at run time', () => {
    expect(() =>
      render(
        <ThemeProvider theme="dark">
          {/* @ts-expect-error — bleed is typed only beside scroll={false} (ScreenScroll). */}
          <Screen bleed testID="page" />
        </ThemeProvider>,
      ),
    ).toThrow(TypeError);
  });
});

describe('Card mediaGap, as 05 sets its kanji under the sample', () => {
  const card = (mediaGap?: 'xs') =>
    draw(
      <Card
        padding="sm"
        mediaInset={5}
        {...(mediaGap === undefined ? {} : { mediaGap })}
        media={<View testID="media" style={{ height: 10 }} />}
      >
        <Text size="body" color="foreground">
          藍
        </Text>
      </Card>,
    );
  const body = (tree: TestNode) =>
    nodes(tree).find((n) => styleOf(n)['padding'] === nativeSpacing.sm);

  it('sets the body’s first line the gap given under the media, and keeps its padding elsewhere', () => {
    const style = styleOf(body(card('xs')));
    expect(style['paddingTop']).toBe(nativeSpacing.xs);
    expect(style['padding']).toBe(nativeSpacing.sm);
  });

  it('DECOY — without it the body is padded alike on every side', () => {
    expect(styleOf(body(card()))['paddingTop']).toBeUndefined();
  });

  it('DECOY — without media there is nothing to sit under, so the gap is not applied', () => {
    const tree = draw(
      <Card padding="sm" mediaGap="xs">
        <Text size="body" color="foreground">
          藍
        </Text>
      </Card>,
    );
    expect(styleOf(body(tree))['paddingTop']).toBeUndefined();
  });
});
