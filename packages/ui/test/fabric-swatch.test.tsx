/**
 * `12`'s pinked fabric sample (F-233, criterion 2).
 *
 * - **The teeth are the drawing's**, recomputed from inventory 12's `raw` readings.
 * - **The outline is pinked on all four sides**: whole teeth, centred, tips on the box's edge and
 *   valleys a tooth in. The decoy is a plain square, which has no tips at all.
 * - **Its line is the sample's** (ADR-0116), and the sample is named as a swatch is (ADR-0005).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors } from '@irodora/design-tokens';
import {
  FABRIC_KEYLINE,
  FABRIC_PITCH,
  FABRIC_SIZE,
  FABRIC_TOOTH,
  FabricSwatch,
  pinkedOutline,
  sampleEdge,
  swatchAccessibleName,
  ThemeProvider,
} from '../src/index.js';
import type { TestNode } from '../src/testing/index.js';

const COLOR = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });
const half = (v: number): number => Math.round(v * 2) / 2;

interface Element {
  readonly id: string;
  readonly component: string | null;
  readonly dp: { readonly w: number; readonly h: number } | null;
  readonly tokens?: Readonly<Record<string, string>>;
  readonly raw?: Readonly<Record<string, number>>;
}
const twelve = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '12.json'), 'utf8'),
) as { readonly elements: readonly Element[]; readonly frame: { dpPerPx?: number } };
const fabric = twelve.elements.find((e) => e.id === '12.source.swatch');

describe('the teeth are the drawing’s, recomputed', () => {
  it('is recorded as the one pinked sample, with its readings', () => {
    expect(fabric?.component).toBe('ui:FabricSwatch');
    expect(fabric?.raw).toMatchObject({ toothPx: 5.3, pitchPx: 12.7 });
  });

  it('takes its size, pitch, depth and keyline from 12 (2 px per dp)', () => {
    const toDp = (px: number): number => px / 2;
    expect(half(fabric?.dp?.w ?? NaN)).toBe(FABRIC_SIZE);
    expect(half(toDp(fabric?.raw?.['pitchPx'] ?? NaN))).toBe(FABRIC_PITCH);
    expect(half(toDp(fabric?.raw?.['toothPx'] ?? NaN))).toBe(FABRIC_TOOTH);
    expect(FABRIC_KEYLINE).toBe(fabric?.tokens?.['keyline'] !== undefined);
  });
});

describe('the outline is pinked on all four sides', () => {
  const { points } = pinkedOutline(FABRIC_SIZE);
  const lo = 0.5;
  const hi = FABRIC_SIZE - 0.5;
  const tips = points.filter((p) => p.tip);
  const valleys = points.filter((p) => !p.tip);
  const perSide = Math.floor((hi - lo) / FABRIC_PITCH);

  it('carries whole teeth, the same number on each side', () => {
    expect(perSide).toBe(12);
    expect(tips).toHaveLength(4 * perSide);
    expect(tips.filter((p) => p.y === lo)).toHaveLength(perSide);
    expect(tips.filter((p) => p.x === hi)).toHaveLength(perSide);
    expect(tips.filter((p) => p.y === hi)).toHaveLength(perSide);
    expect(tips.filter((p) => p.x === lo)).toHaveLength(perSide);
  });

  it('puts every tip on the box’s edge and every valley a tooth in', () => {
    for (const p of tips) expect([p.x, p.y].some((v) => v === lo || v === hi)).toBe(true);
    // A tooth in from its own side: at a corner a valley can sit nearer the side it meets.
    const inward = [lo + FABRIC_TOOTH, hi - FABRIC_TOOTH];
    for (const p of valleys)
      expect([p.x, p.y].some((v) => inward.some((w) => Math.abs(v - w) < 1e-9))).toBe(true);
  });

  it('spaces the tips at the pitch, centred on each side', () => {
    const top = tips.filter((p) => p.y === lo).map((p) => p.x);
    const gaps = top.slice(1).map((x, i) => x - (top[i] ?? 0));
    for (const g of gaps) expect(g).toBeCloseTo(FABRIC_PITCH, 9);
    expect((top[0] ?? 0) - lo).toBeCloseTo(hi - (top.at(-1) ?? 0), 9);
  });

  it('DECOY: a plain square has no tips, so the checks above can fail', () => {
    const square = pinkedOutline(FABRIC_SIZE, FABRIC_SIZE * 2, 0);
    expect(square.points.filter((p) => p.tip)).toHaveLength(4);
    expect(square.points.filter((p) => p.tip).length).not.toBe(4 * perSide);
  });
});

describe('drawn as a sample', () => {
  const drawn = (hex: string, theme: 'dark' | 'light' = 'dark'): TestNode => {
    const rendered = render(
      <ThemeProvider theme={theme}>
        <FabricSwatch name="Kuri-iro" hex={hex} color={COLOR} />
      </ThemeProvider>,
    );
    const json = rendered.toJSON() as TestNode;
    rendered.unmount();
    return json;
  };
  const find = (tree: TestNode, type: string): TestNode | undefined => {
    if (tree.type === type) return tree;
    for (const child of tree.children ?? [])
      if (typeof child !== 'string') {
        const hit = find(child, type);
        if (hit !== undefined) return hit;
      }
    return undefined;
  };

  it('outlines the pinked path in the sample’s line, moved per sample (ADR-0116)', () => {
    const json = JSON.stringify(drawn('#8C5A3C'));
    expect(json).toContain(pinkedOutline(FABRIC_SIZE).d);
    // The stroke's colour, as react-native-svg carries it, is the sample's line.
    const argb = (node: TestNode | undefined, prop: string): string => {
      const v = node?.props[prop] as { payload?: number } | undefined;
      return `#${((v?.payload ?? 0) >>> 0).toString(16).padStart(8, '0').slice(2).toUpperCase()}`;
    };
    for (const hex of ['#8C5A3C', '#F0EDE6']) {
      const path = find(drawn(hex), 'RNSVGPath');
      expect(path?.props['strokeWidth']).toBe(1);
      expect(argb(path, 'fill')).toBe(hex);
      expect(argb(path, 'stroke')).toBe(sampleEdge(hex, nativeColors.dark, FABRIC_KEYLINE).hex);
    }
  });

  it('is one image, named with the colour’s name, value and provenance', () => {
    const tree = drawn('#8C5A3C');
    const image = [tree, ...(tree.children ?? [])].find(
      (n): n is TestNode => typeof n !== 'string' && n.props['accessibilityRole'] === 'image',
    );
    expect(image?.props['accessibilityLabel']).toBe(
      swatchAccessibleName('Kuri-iro', '#8C5A3C', COLOR),
    );
  });

  it('refuses a bare hex where the Color goes (ADR-0005)', () => {
    const bare = (
      // @ts-expect-error — a sample without provenance does not compile
      <FabricSwatch name="Kuri-iro" hex="#8C5A3C" color="#8C5A3C" />
    );
    const typed = <FabricSwatch name="Kuri-iro" hex="#8C5A3C" color={COLOR} />;
    expect([bare, typed]).toHaveLength(2);
  });
});
