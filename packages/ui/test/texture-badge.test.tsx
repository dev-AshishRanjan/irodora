/**
 * `01`'s texture badge (F-242, ADR-0137).
 *
 * - **Its size and cells are the drawing's**, recomputed from inventory 01's five badges.
 * - **It is a checker**: half the cells, alternating, the top-left one inked. The decoy is a solid
 *   square, which the cell count tells apart.
 * - **Its ink is the one text on that sample takes** (ADR-0116), so it clears 4.5:1 against the
 *   sample. The decoy is `foreground` on a pale sample, which does not clear even 3:1.
 * - **It says nothing and takes no touch**: its meaning is in the tile's name.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { wcagContrast } from '@irodora/color-difference';
import { nativeColors, nativeRadius } from '@irodora/design-tokens';
import {
  checkerPath,
  sampleInk,
  TEXTURE_BADGE,
  TEXTURE_BADGE_CELLS,
  TextureBadge,
  textureBadgeCorner,
  ThemeProvider,
} from '../src/index.js';
import type { TestNode } from '../src/testing/index.js';

const COLOR = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });

interface Element {
  readonly id: string;
  readonly component: string | null;
  readonly binding: string | null;
  readonly dp: { readonly w: number; readonly h: number } | null;
  readonly raw?: Readonly<Record<string, number>>;
}
const one = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '01.json'), 'utf8'),
) as { readonly elements: readonly Element[] };
const badges = one.elements.filter((e) => /^01\.wardrobe\.tile-\d\.badge$/u.test(e.id));
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[mid] ?? NaN) : ((s[mid - 1] ?? NaN) + (s[mid] ?? NaN)) / 2;
};
const rgb = (hex: string): readonly [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16) / 255,
  Number.parseInt(hex.slice(3, 5), 16) / 255,
  Number.parseInt(hex.slice(5, 7), 16) / 255,
];

describe('its size and cells are the drawing’s, recomputed', () => {
  it('is recorded five times, bound to the garment’s material (ADR-0137 D4)', () => {
    expect(badges.map((b) => b.component)).toStrictEqual(Array(5).fill('new:TextureBadge'));
    expect(badges.map((b) => b.binding)).toStrictEqual(
      [0, 1, 2, 3, 4].map((i) => `store:garments.${String(i)}.material`),
    );
  });

  it('takes the median of the ten drawn sides, and the cells each badge records', () => {
    const sides = badges.flatMap((b) => [b.dp?.w ?? NaN, b.dp?.h ?? NaN]);
    expect(TEXTURE_BADGE).toBe(median(sides));
    for (const b of badges) expect(b.raw?.['cells']).toBe(TEXTURE_BADGE_CELLS);
  });

  it('takes sm for its corner, bounded by a quarter of its side', () => {
    expect(textureBadgeCorner(TEXTURE_BADGE)).toBe(Math.min(nativeRadius.sm, 3));
    // DECOY: a large badge takes the step itself, so the bound is not the only thing tested.
    expect(textureBadgeCorner(80)).toBe(nativeRadius.sm);
  });
});

describe('it is a checker', () => {
  const squares = (d: string): number => (d.match(/M/gu) ?? []).length;

  it('inks half the cells, the top-left one first', () => {
    const d = checkerPath(TEXTURE_BADGE);
    expect(squares(d)).toBe((TEXTURE_BADGE_CELLS * TEXTURE_BADGE_CELLS) / 2);
    expect(d.startsWith('M0 0h')).toBe(true);
    // The second row starts one cell in.
    const cell = Math.round((TEXTURE_BADGE / TEXTURE_BADGE_CELLS) * 1000) / 1000;
    expect(d).toContain(`M${String(cell)} ${String(cell)}h`);
  });

  it('DECOY: one cell a side is one square, so the count above can fail', () => {
    expect(squares(checkerPath(TEXTURE_BADGE, 1))).toBe(1);
  });
});

describe('drawn on a sample', () => {
  const drawn = (hex: string, theme: 'dark' | 'light' = 'dark'): TestNode => {
    const rendered = render(
      <ThemeProvider theme={theme}>
        <TextureBadge on={{ hex, color: COLOR }} testID="badge" />
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
  const fill = (node: TestNode | undefined): string => {
    const v = node?.props['fill'] as { payload?: number } | undefined;
    return `#${((v?.payload ?? 0) >>> 0).toString(16).padStart(8, '0').slice(2).toUpperCase()}`;
  };

  it('inks its cells in the text ink of that sample, in both palettes (ADR-0116)', () => {
    for (const theme of ['dark', 'light'] as const)
      for (const hex of ['#F0EDE6', '#87795D', '#5B6B78']) {
        const ink = sampleInk(hex, nativeColors[theme]);
        expect(fill(find(drawn(hex, theme), 'RNSVGPath'))).toBe(ink.hex.toUpperCase());
        expect(wcagContrast(rgb(hex), rgb(ink.hex))).toBeGreaterThanOrEqual(4.5);
      }
  });

  it('DECOY: foreground on a pale sample would not clear even 3:1', () => {
    expect(wcagContrast(rgb('#F0EDE6'), rgb(nativeColors.dark.foreground))).toBeLessThan(3);
  });

  it('is hidden from assistive technology and takes no touch', () => {
    const byId = (tree: TestNode): TestNode | undefined => {
      if (tree.props['testID'] === 'badge') return tree;
      for (const child of tree.children ?? [])
        if (typeof child !== 'string') {
          const hit = byId(child);
          if (hit !== undefined) return hit;
        }
      return undefined;
    };
    const root = byId(drawn('#87795D'));
    if (root === undefined) throw new Error('the badge is not drawn');
    expect(root.props['accessibilityElementsHidden']).toBe(true);
    expect(root.props['importantForAccessibility']).toBe('no-hide-descendants');
    expect(root.props['pointerEvents']).toBe('none');
    expect(root.props['accessibilityLabel']).toBeUndefined();
  });

  it('refuses a bare hex where the sample goes (ADR-0005)', () => {
    const bare = (
      // @ts-expect-error — a sample without provenance does not compile
      <TextureBadge on={{ hex: '#87795D', color: '#87795D' }} />
    );
    const typed = <TextureBadge on={{ hex: '#87795D', color: COLOR }} />;
    expect([bare, typed]).toHaveLength(2);
  });
});
