/**
 * The illustration set (F-229): the mockups' drawings, held to the record that names them.
 *
 * The same shape as the icon set's test, for the reason F-228's review made plain — and with the
 * part that review found missing said out loud here: **these assertions are about NAMES, tone and
 * line. None of them can tell whether a drawing looks like the element it was drawn from.** Each
 * one was compared against a magnified crop by a person; F-281 is the check that would make that
 * comparison outlive this session.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ReactElement, type ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { nativeArtOpacity, nativeArtStroke, nativeColors } from '@irodora/design-tokens';
import {
  DRAWN_ILLUSTRATIONS,
  EMPTY_STATE_ILLUSTRATIONS,
  Illustration,
  ILLUSTRATIONS,
  illustrationBox,
  ThemeProvider,
  UNBUILT_ILLUSTRATIONS,
  type IllustrationName,
} from '../src/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');

/** Every illustration name any inventory binds, and how many elements bind it. */
function bound(): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const file of readdirSync(INVENTORY).filter((f) => /^\d\d\.json$/u.test(f))) {
    const inv = JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as {
      elements?: readonly { illustration?: string | null }[];
    };
    for (const e of inv.elements ?? [])
      if (typeof e.illustration === 'string')
        counts.set(e.illustration, (counts.get(e.illustration) ?? 0) + 1);
  }
  return counts;
}

const missingFrom = (from: Iterable<string>, into: ReadonlySet<string>): string[] =>
  [...from].filter((x) => !into.has(x)).sort();

type Props = Record<string, unknown> & { children?: ReactNode };

/** The drawn shapes of one illustration, as rendered at `width`. */
function shapes(name: IllustrationName, width = 240): ReactElement<Props>[] {
  const tree = render(
    <ThemeProvider theme="dark">
      <Illustration name={name} width={width} />
    </ThemeProvider>,
  );
  return [
    ...tree.UNSAFE_queryAllByType(Path),
    ...tree.UNSAFE_queryAllByType(Circle),
    ...tree.UNSAFE_queryAllByType(Line),
  ] as unknown as ReactElement<Props>[];
}

/** A drawing's geometry, with ink and line left out — what a person sees as its shape. */
const silhouette = (name: IllustrationName): string =>
  JSON.stringify(
    shapes(name).map((el) => {
      const p = el.props;
      return [p['d'], p['cx'], p['cy'], p['r'], p['x1'], p['y1'], p['x2'], p['y2'], p['fill']];
    }),
  );

describe('the set is the set the inventories bind', () => {
  const counts = bound();

  it('reads the inventories — a scan that found nothing would agree with anything', () => {
    expect(counts.size).toBeGreaterThan(10);
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(30);
  });

  it('draws every name an inventory binds, but for the ones declared unbuilt', () => {
    const declared = new Set<string>([
      ...DRAWN_ILLUSTRATIONS,
      ...Object.keys(UNBUILT_ILLUSTRATIONS),
    ]);
    expect(missingFrom(counts.keys(), declared)).toHaveLength(0);
  });

  it('draws nothing an inventory does not bind — a drawing nobody drew is a design nobody made', () => {
    expect(missingFrom(DRAWN_ILLUSTRATIONS, new Set(counts.keys()))).toHaveLength(0);
  });

  it('DECOY — the comparison names a stray in either direction', () => {
    expect(
      missingFrom([...DRAWN_ILLUSTRATIONS, 'hanko-seal'], new Set(DRAWN_ILLUSTRATIONS)),
    ).toEqual(['hanko-seal']);
    const withoutKimono = new Set<string>(DRAWN_ILLUSTRATIONS.filter((d) => d !== 'kimono'));
    expect(missingFrom(counts.keys(), new Set([...withoutKimono, 'signature']))).toEqual([
      'kimono',
    ]);
  });

  it('keeps an unbuilt declaration only while its element still binds it', () => {
    // `signature` is 18's envelope word, and OQ-38 asks whether it is a drawing at all. The
    // declaration may not outlive the binding, and it may not quietly become a drawing either.
    for (const [name, why] of Object.entries(UNBUILT_ILLUSTRATIONS)) {
      expect(counts.get(name) ?? 0).toBeGreaterThan(0);
      expect(why).toMatch(/OQ-\d+/u);
      expect(DRAWN_ILLUSTRATIONS as readonly string[]).not.toContain(name);
    }
  });

  it("keeps R7's three outside the drawn set, where the inventories left them", () => {
    // No mockup draws them; eight screens still render them (F-236 rebuilds those surfaces).
    for (const name of EMPTY_STATE_ILLUSTRATIONS) {
      expect(counts.has(name)).toBe(false);
      expect(ILLUSTRATIONS as readonly string[]).toContain(name);
    }
  });
});

describe('drawn at the measured line and tone (R9-MOCKUP-FIDELITY §5)', () => {
  it.each([48, 96, 240])(
    'renders every line at the declared width when drawn at %s dp',
    (width) => {
      const wrong: string[] = [];
      for (const name of DRAWN_ILLUSTRATIONS) {
        const [boxWidth] = illustrationBox(name);
        for (const el of shapes(name, width)) {
          if (el.props['stroke'] === undefined) continue;
          const rendered = (Number(el.props['strokeWidth']) * width) / boxWidth;
          if (!(Math.abs(rendered - nativeArtStroke) < 1e-9))
            wrong.push(`${name} at ${String(width)}: ${String(rendered)}`);
        }
      }
      expect(wrong).toHaveLength(0);
    },
  );

  it('DECOY — one width in grid units would not hold across the grids', () => {
    // `silk-wave` is drawn on a 96-unit grid and `waves` on a 24-unit one. A line fixed in grid
    // units would be four times heavier on one than the other at the same rendered size.
    const strokeOf = (name: IllustrationName): number =>
      Number(shapes(name, 120)[0]?.props['strokeWidth']);
    expect(strokeOf('silk-wave')).not.toBeCloseTo(strokeOf('waves'), 3);
  });

  it('inks a backdrop at the declared opacity and a figure at full strength', () => {
    const opacityOf = (tone: 'figure' | 'backdrop'): unknown =>
      render(
        <ThemeProvider theme="dark">
          <Illustration name="plum-branch" tone={tone} />
        </ThemeProvider>,
      ).UNSAFE_getByType(Svg).props['opacity'];
    expect(opacityOf('backdrop')).toBe(nativeArtOpacity);
    expect(opacityOf('figure')).toBe(1);
    // DECOY — the two are not the same number, so the assertion above is not vacuous.
    expect(nativeArtOpacity).toBeLessThan(1);
  });

  it('paints only the theme token it is given', () => {
    const allowed = new Set([
      nativeColors.dark['foreground.3'],
      nativeColors.dark['foreground.2'],
      'none',
      undefined,
    ]);
    const stray: string[] = [];
    for (const name of ILLUSTRATIONS)
      for (const el of shapes(name))
        for (const key of ['stroke', 'fill'] as const)
          if (!allowed.has(el.props[key] as string | undefined))
            stray.push(`${name}.${key}: ${JSON.stringify(el.props[key])}`);
    expect(stray).toHaveLength(0);
  });
});

describe('told apart by shape (NFR-9), and hidden from a screen reader', () => {
  it('no two drawings are the same shape', () => {
    const seen = new Map<string, string>();
    const twins: string[] = [];
    for (const name of ILLUSTRATIONS) {
      const s = silhouette(name);
      const earlier = seen.get(s);
      if (earlier !== undefined) twins.push(`${earlier} = ${name}`);
      else seen.set(s, name);
    }
    expect(twins).toHaveLength(0);
  });

  it('renders at its own aspect, not squared off', () => {
    // A 96-unit strip of leaves squeezed into a square is a different drawing.
    const wrong: string[] = [];
    for (const name of ILLUSTRATIONS) {
      const [bw, bh] = illustrationBox(name);
      const tree = render(
        <ThemeProvider theme="dark">
          <Illustration name={name} width={120} testID="art" />
        </ThemeProvider>,
      );
      const style = tree.getByTestId('art', { includeHiddenElements: true }).props['style'] as {
        width: number;
        height: number;
      };
      if (Math.abs(style.height - (120 * bh) / bw) > 1e-9) wrong.push(name);
    }
    expect(wrong).toHaveLength(0);
    // DECOY — the aspects are not all one, so the check above says something.
    expect(new Set(ILLUSTRATIONS.map((n) => illustrationBox(n).join(':'))).size).toBeGreaterThan(5);
  });

  it('says nothing to a screen reader — the text beside it is the whole content', () => {
    for (const name of ILLUSTRATIONS) {
      const tree = render(
        <ThemeProvider theme="dark">
          <Illustration name={name} testID="art" />
        </ThemeProvider>,
      );
      // `includeHiddenElements` IS the assertion's other half: every query in this suite has to
      // ask for hidden elements to see a drawing at all, which is what rule 3 wanted.
      const host = tree.getByTestId('art', { includeHiddenElements: true });
      expect(host.props['accessible']).toBe(false);
      expect(host.props['accessibilityElementsHidden']).toBe(true);
      expect(host.props['importantForAccessibility']).toBe('no-hide-descendants');
      expect(host.props['accessibilityLabel']).toBeUndefined();
    }
  });
});
