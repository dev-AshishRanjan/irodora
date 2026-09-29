/**
 * The sample family, drawn as the mockups draw it (F-233, criterion 2).
 *
 * - **The defaults are the inventories', recomputed**, with the values they replaced as decoys: a
 *   square sample 60 dp (not 72), the keyline drawn, the `sm` corner.
 * - **Each form at its element's size**: a rectangle, a hero spanning its card, an anchor in its
 *   ring, a sample bled into its card, text on a sample. No padded well.
 * - **The target is the hit area** (ADR-0114): a 34 dp sample is drawn 34 dp and reaches 44.
 * - **One line, moved per sample** (ADR-0116): the README keyline where it edges the sample, and
 *   the smallest move where it would not; with no keyline drawn, the well, unless it must show.
 * - **A bare hex does not compile** (ADR-0005).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors, nativeRadius, paintedOver, type Theme } from '@irodora/design-tokens';
import {
  sampleEdge,
  STRIP_CORNER,
  STRIP_KEYLINE,
  Swatch,
  SWATCH_KEYLINE,
  SWATCH_SIZE,
  swatchCorner,
  Text,
  ThemeProvider,
} from '../src/index.js';
import { flattenStyle, tapTargetReach, type TestNode } from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');
interface Element {
  readonly id: string;
  readonly component: string | null;
  readonly dp: { readonly w: number; readonly h: number } | null;
  readonly tokens?: Readonly<Record<string, string>>;
  readonly raw?: Readonly<Record<string, number>>;
}
const inventoried: readonly Element[] = readdirSync(INVENTORY)
  .filter((f) => /^\d\d\.json$/u.test(f))
  .flatMap(
    (f) =>
      (JSON.parse(readFileSync(join(INVENTORY, f), 'utf8')) as { elements?: readonly Element[] })
        .elements ?? [],
  );
const samples = inventoried.filter((e) => e.component === 'ui:Swatch');
const strips = inventoried.filter((e) => e.component === 'ui:Strip');
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};

describe('the defaults are the inventories’, recomputed', () => {
  const scaled = samples.filter((e) => e.dp !== null);

  it('SWATCH_SIZE is the median square sample on a scaled screen — and not the 72 it replaced', () => {
    const squares = scaled.filter((e) => Math.abs((e.dp?.w ?? 0) - (e.dp?.h ?? 0)) <= 2);
    expect(squares).toHaveLength(29);
    expect(median(squares.map((e) => e.dp?.w ?? NaN))).toBe(SWATCH_SIZE);
    expect(SWATCH_SIZE).not.toBe(72);
  });

  it('SWATCH_KEYLINE is what most samples draw', () => {
    const drawn = scaled.filter((e) => e.tokens?.['keyline'] !== undefined).length;
    expect([drawn, scaled.length - drawn]).toStrictEqual([35, 29]);
    expect(SWATCH_KEYLINE).toBe(drawn > scaled.length - drawn);
  });

  it('the corner defaults to sm, the step most samples are bound to', () => {
    const sm = samples.filter((e) => e.tokens?.['radius'] === 'sm').length;
    const md = samples.filter((e) => e.tokens?.['radius'] === 'md').length;
    expect([sm, md]).toStrictEqual([44, 29]);
    const tree = draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} />);
    expect(sampleNode(tree)['borderRadius']).toBe(swatchCorner(SWATCH_SIZE, 'sm').sample);
  });
});

const COLOR = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });

function draw(node: React.JSX.Element, theme: Theme = 'dark'): TestNode {
  const rendered = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  const json = rendered.toJSON() as TestNode;
  rendered.unmount();
  return json;
}

/** Every node, depth first. */
function nodes(tree: TestNode): readonly TestNode[] {
  const out: TestNode[] = [tree];
  for (const child of tree.children ?? []) if (typeof child !== 'string') out.push(...nodes(child));
  return out;
}

/** The style of the node painted in the sample's own colour. */
function sampleNode(tree: TestNode, hex = '#526A6B'): Record<string, unknown> {
  const found = nodes(tree)
    .map((n) => flattenStyle(n.props['style']))
    .find((s) => s['backgroundColor'] === hex);
  if (found === undefined) throw new Error(`nothing painted ${hex}`);
  return found;
}

/** The style of the node that carries the line: the sample's parent, one dp inset. */
function lineNode(tree: TestNode): Record<string, unknown> {
  const found = nodes(tree)
    .map((n) => flattenStyle(n.props['style']))
    .find((s) => s['padding'] === 1);
  if (found === undefined) throw new Error('no line');
  return found;
}

/** The pressable root. */
function root(tree: TestNode): TestNode {
  const found = nodes(tree).find((n) => n.props['accessibilityRole'] === 'button');
  if (found === undefined) throw new Error('no button');
  return found;
}

describe('each form at its element’s size', () => {
  it('draws a rectangle at its width and height, cornered from its shorter side', () => {
    const tree = draw(
      <Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} width={66} height={58.5} corner="md" />,
    );
    expect(lineNode(tree)).toMatchObject({ width: 66, height: 58.5 });
    expect(sampleNode(tree)['borderRadius']).toBe(swatchCorner(58.5, 'md').sample);
  });

  it('spans its container at width="fill", its height as drawn', () => {
    const tree = draw(
      <Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} width="fill" height={172} />,
    );
    expect(lineNode(tree)).toMatchObject({ width: '100%', height: 172 });
    expect(flattenStyle(root(tree).props['style'])['alignSelf']).toBe('stretch');
  });

  it('rings an anchor in foreground.2 at the width and gap drawn, concentric with its line', () => {
    const tree = draw(
      <Swatch
        name="Ai-nezumi"
        hex="#526A6B"
        color={COLOR}
        size={76.5}
        corner="md"
        anchor={{ ring: 1.3, gap: 3.1 }}
      />,
    );
    const ring = nodes(tree)
      .map((n) => flattenStyle(n.props['style']))
      .find((s) => s['borderWidth'] === 1.3);
    const line = lineNode(tree);
    // 19's ring reads #9FA8AF–#A0A9B0: foreground.2, not foreground (#F7F8FA), the DECOY.
    expect(ring).toMatchObject({
      borderColor: nativeColors.dark['foreground.2'],
      padding: 3.1,
      borderRadius: Number(line['borderRadius']) + 3.1 + 1.3,
    });
  });

  it('draws a bled sample’s selection edge inside it, over it, where the card cannot clip it', () => {
    const tree = draw(
      <Swatch
        name="Ai-nezumi"
        hex="#526A6B"
        color={COLOR}
        height={88}
        bleed
        keyline={false}
        selected
      />,
    );
    const frames = nodes(tree)
      .map((n) => flattenStyle(n.props['style']))
      .filter(
        (st) => st['position'] === 'absolute' && st['borderColor'] === nativeColors.dark.accent,
      );
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ top: 0, left: 0, right: 0, bottom: 0 });
    expect(frames[0]?.['backgroundColor']).toBeUndefined();
    // DECOY: an ordinary sample's frame sits outside it.
    const outside = nodes(draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} selected />))
      .map((n) => flattenStyle(n.props['style']))
      .find(
        (st) => st['position'] === 'absolute' && st['borderColor'] === nativeColors.dark.accent,
      );
    expect(Number(outside?.['top'])).toBeLessThan(0);
  });

  it('bleeds into its card: no corner of its own, spanning the card', () => {
    // A pale sample keeps its edge unaided, so the sample itself is the box.
    const tree = draw(
      <Swatch name="Pale" hex="#F0EDE6" color={COLOR} height={88} bleed keyline={false} />,
    );
    expect(sampleNode(tree, '#F0EDE6')).toMatchObject({ width: '100%', borderRadius: 0 });
    // And where a line must show, it is square too.
    const near = draw(
      <Swatch name="Near" hex="#2A2D34" color={COLOR} height={88} bleed keyline={false} />,
    );
    expect(lineNode(near)).toMatchObject({ width: '100%', borderRadius: 0 });
  });

  it('draws what it is given ON the sample', () => {
    const tree = draw(
      <Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} width="fill" height={172}>
        <Text size="label" on={{ hex: '#526A6B', color: COLOR }}>
          Ai-nezumi
        </Text>
      </Swatch>,
    );
    const sample = nodes(tree).find(
      (n) => flattenStyle(n.props['style'])['backgroundColor'] === '#526A6B',
    );
    expect(JSON.stringify(sample)).toContain('Ai-nezumi');
  });

  it('prints its name only where asked — the accessible name carries it everywhere', () => {
    const bare = JSON.stringify(draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} />));
    const captioned = JSON.stringify(
      draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} caption="name" />),
    );
    const texts = (json: string): number => (json.match(/"type":"Text"/gu) ?? []).length;
    expect(texts(bare)).toBe(0);
    expect(texts(captioned)).toBe(1);
    expect(bare).toContain('"accessibilityLabel":"Ai-nezumi.');
  });

  it('draws no well: nothing around the sample but its line (DECOY: the old 8 dp padding)', () => {
    const tree = draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} size={48} />);
    const pads = nodes(tree)
      .map((n) => flattenStyle(n.props['style'])['padding'])
      .filter((p) => p !== undefined);
    expect(pads).toStrictEqual([1]);
    expect(
      nodes(tree).some(
        (n) =>
          flattenStyle(n.props['style'])['backgroundColor'] === nativeColors.dark['swatch.well'],
      ),
    ).toBe(false);
  });
});

describe('the target is the hit area, not the drawing (ADR-0114)', () => {
  it('draws a 34 dp sample at 34 dp, and reaches the 44 dp target', () => {
    const tree = draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} size={34} />);
    expect(lineNode(tree)).toMatchObject({ width: 34, height: 34 });
    const button = root(tree);
    const reach = tapTargetReach(
      flattenStyle(button.props['style']),
      button.props['hitSlop'] as Readonly<Record<string, number>> | undefined,
    );
    expect(reach.width).toBeGreaterThanOrEqual(44);
    expect(reach.height).toBeGreaterThanOrEqual(44);
  });

  it('declares no more than the target for a filled width, so a tall hero cannot overflow a phone', () => {
    // 06's hero is 337 × 299 dp; declaring its height as a minimum width would overflow the 273 dp
    // a 320 pt phone leaves (F-233's review).
    const tree = draw(
      <Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} width="fill" height={299} />,
    );
    const minWidth = flattenStyle(root(tree).props['style'])['minWidth'];
    expect(minWidth).toBeLessThanOrEqual(48);
    expect(minWidth).toBeGreaterThanOrEqual(44);
  });

  it('DECOY: the drawing is not inflated to the target', () => {
    const tree = draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} size={34} />);
    expect(flattenStyle(root(tree).props['style'])['minWidth']).toBe(34);
  });
});

describe('one line, moved per sample (ADR-0116)', () => {
  const dark = nativeColors.dark;
  const keyline = paintedOver(dark['swatch.keyline'], dark['swatch.well']);

  it('draws the README keyline where it edges the sample', () => {
    const tree = draw(<Swatch name="Pale" hex="#F0EDE6" color={COLOR} />);
    expect(lineNode(tree)['backgroundColor']).toBe(keyline);
  });

  it('moves it against a sample of its own lightness, to 3:1', () => {
    const tree = draw(<Swatch name="Grey" hex={keyline} color={COLOR} />);
    const drawn = lineNode(tree)['backgroundColor'];
    expect(drawn).toBe(sampleEdge(keyline, dark, true).hex);
    expect(drawn).not.toBe(keyline);
  });

  it('with no keyline drawn, draws no line — the sample fills its box — unless it must', () => {
    const pale = draw(<Swatch name="Pale" hex="#F0EDE6" color={COLOR} keyline={false} size={48} />);
    const pads = nodes(pale).filter((n) => flattenStyle(n.props['style'])['padding'] === 1);
    expect(pads).toHaveLength(0);
    expect(sampleNode(pale, '#F0EDE6')).toMatchObject({ width: 48, height: 48 });
    // DECOY: a sample near the card's own colour would lose its edge, so there the line appears.
    const near = draw(<Swatch name="Near" hex="#2A2D34" color={COLOR} keyline={false} />);
    expect(lineNode(near)['backgroundColor']).toBe(sampleEdge('#2A2D34', dark, false).hex);
    expect(lineNode(near)['backgroundColor']).not.toBe(dark['swatch.well'].toUpperCase());
  });

  it('draws the line at the width the element draws: 2.5 dp on 01’s hero', () => {
    const tree = draw(
      <Swatch
        name="Ai-nezumi"
        hex="#526A6B"
        color={COLOR}
        width="fill"
        height={172}
        keylineWidth={2.5}
      />,
    );
    const line = lineNode(tree);
    // One dp as the pinned inset, the rest as a border in the same colour; concentric corners.
    expect(line).toMatchObject({ padding: 1, borderWidth: 1.5 });
    expect(line['borderColor']).toBe(line['backgroundColor']);
    expect(line['borderRadius']).toBe(Number(sampleNode(tree)['borderRadius']) + 2.5);
    // DECOY: the default is one dp, with no border beyond the inset.
    expect(lineNode(draw(<Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} />))).toMatchObject({
      padding: 1,
      borderWidth: 0,
    });
  });
});

describe('the line is the width each screen draws (C20, P1)', () => {
  it('is recorded where it is wider than a hairline: 01’s hero 2.5 dp, 06’s 6.9', () => {
    const wide = samples.filter((e) => e.raw?.['keylinePx'] !== undefined);
    expect(wide.map((e) => e.id).sort()).toStrictEqual(['01.hero.sample', '06.swatch']);
    const dp = (id: string, dpPerPx: number): number =>
      (wide.find((e) => e.id === id)?.raw?.['keylinePx'] ?? NaN) * dpPerPx;
    expect(dp('01.hero.sample', 0.5)).toBe(2.5);
    expect(dp('06.swatch', 0.8101)).toBeCloseTo(6.9, 1);
    // DECOY: the default the rest are drawn at.
    expect(dp('01.hero.sample', 0.5)).not.toBe(1);
  });
});

describe('the joined samples’ defaults are the inventories’, recomputed', () => {
  it('STRIP_CORNER is the step most joined samples are bound to', () => {
    const md = strips.filter((e) => e.tokens?.['radius'] === 'md').length;
    const sm = strips.filter((e) => e.tokens?.['radius'] === 'sm').length;
    expect([md, sm]).toStrictEqual([4, 1]);
    expect(STRIP_CORNER).toBe(md > sm ? 'md' : 'sm');
  });

  it('STRIP_KEYLINE is what most joined samples draw', () => {
    const drawn = strips.filter((e) => e.tokens?.['keyline'] !== undefined).length;
    expect([drawn, strips.length - drawn]).toStrictEqual([2, 3]);
    expect(STRIP_KEYLINE).toBe(drawn > strips.length - drawn);
  });
});

describe('provenance is required (ADR-0005)', () => {
  it('refuses a bare hex where the Color goes', () => {
    const bare = (
      // @ts-expect-error — a sample without provenance does not compile
      <Swatch name="Ai-nezumi" hex="#526A6B" color="#526A6B" />
    );
    const typed = <Swatch name="Ai-nezumi" hex="#526A6B" color={COLOR} />;
    expect([bare, typed]).toHaveLength(2);
    expect(nativeRadius.sm).toBeGreaterThan(0);
  });
});
