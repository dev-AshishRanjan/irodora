/**
 * The illustration set (F-229): the mockups' drawings, held to the record that names them.
 *
 * The same shape as the icon set's test, for the reason F-228's review made plain — and with the
 * part that review found missing said out loud here: **these assertions are about NAMES, tone and
 * line. None of them can tell whether a drawing looks like the element it was drawn from.** Each
 * one was compared against a magnified crop by a person; F-281 is the check that would make that
 * comparison outlive this session.
 */

import { createHash } from 'node:crypto';
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
  ILLUSTRATION_SET_VERSION,
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

describe('one versioned set', () => {
  /**
   * The digest of every drawing's path data, against the version that names it.
   *
   * *One versioned, vector set* is the acceptance's phrase, and a version nobody can fail is a
   * number in a file. This is the half a check can hold: change a line and the digest moves, so
   * the change has to be recorded here — with the version bumped — rather than landing silently.
   */
  const DIGESTS: Readonly<Record<string, string>> = {
    '1.0.0': '798289fb3a6b7de1',
  };

  const digest = (): string =>
    createHash('sha256')
      .update(DRAWN_ILLUSTRATIONS.map((name) => `${name}:${silhouette(name)}`).join('\n'))
      .digest('hex')
      .slice(0, 16);

  it('carries the digest recorded for its version', () => {
    expect(Object.keys(DIGESTS)).toContain(ILLUSTRATION_SET_VERSION);
    expect(digest()).toBe(DIGESTS[ILLUSTRATION_SET_VERSION]);
  });

  it('DECOY — the digest moves when a drawing does', () => {
    // Without this the assertion above would pass for a digest of nothing.
    const withOneChanged = createHash('sha256')
      .update(
        DRAWN_ILLUSTRATIONS.map((name) =>
          name === 'kimono' ? `${name}:moved` : `${name}:${silhouette(name)}`,
        ).join('\n'),
      )
      .digest('hex')
      .slice(0, 16);
    expect(withOneChanged).not.toBe(digest());
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

describe('never over a sample (the rule the well exists for)', () => {
  /**
   * Read off the RECORD's own geometry, which is where the evidence is.
   *
   * Simultaneous contrast is why a sample sits in a neutral well: whatever touches a colour
   * changes how it reads, and a drawing behind one would tint it exactly as a status chip beside
   * one does (F-069). The mockups never do it, and this asserts that over every box F-220
   * measured rather than over a component that happens to be registered — a surface built from an
   * inventory inherits the property.
   *
   * NOT CHECKED HERE: a screen that places art over a sample the inventory does not draw. The
   * surface features' own inventory sweeps are what hold that, and the conformance subject below
   * puts the drawings under the colour rules in both themes.
   */
  interface Box {
    readonly id: string;
    readonly kind: 'art' | 'sample';
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  }

  /** Every drawn illustration and every drawn sample, per mockup. */
  function boxes(): ReadonlyMap<string, Box[]> {
    const byMockup = new Map<string, Box[]>();
    for (const file of readdirSync(INVENTORY).filter((f) => /^\d\d\.json$/u.test(f))) {
      const inv = JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as {
        mockup: string;
        elements?: readonly {
          id: string;
          component?: string | null;
          illustration?: string | null;
          box: { x: number; y: number; w: number; h: number };
        }[];
      };
      const list: Box[] = [];
      for (const e of inv.elements ?? []) {
        const kind =
          typeof e.illustration === 'string'
            ? 'art'
            : (e.component ?? '').endsWith('Swatch')
              ? 'sample'
              : null;
        if (kind !== null) list.push({ id: e.id, kind, ...e.box });
      }
      byMockup.set(inv.mockup, list);
    }
    return byMockup;
  }

  /** Where a drawing's box and a sample's box overlap — the pairs, named. */
  const overlaps = (list: readonly Box[]): string[] => {
    const found: string[] = [];
    for (const a of list.filter((b) => b.kind === 'art'))
      for (const s of list.filter((b) => b.kind === 'sample'))
        if (a.x < s.x + s.w && s.x < a.x + a.w && a.y < s.y + s.h && s.y < a.y + a.h)
          found.push(`${a.id} over ${s.id}`);
    return found;
  };

  const drawn = boxes();

  it('finds both kinds to compare — a scan with no samples would agree with anything', () => {
    const all = [...drawn.values()].flat();
    expect(all.filter((b) => b.kind === 'art').length).toBeGreaterThan(30);
    expect(all.filter((b) => b.kind === 'sample').length).toBeGreaterThan(30);
  });

  /**
   * The one pair the boxes report and the IMAGE does not, with the feature that will fix it.
   *
   * `10.art`'s box is a scan blob that reaches into the card column — the leaves are drawn beside
   * the palette card, not over its sample, which the crop shows plainly. The box is wrong, not the
   * mockup, and F-282 re-measures the seven boxes of that kind. Declared rather than filtered out
   * silently, and held to still overlapping, so it cannot outlive the fix.
   */
  const BLOB_BOXES: Readonly<Record<string, string>> = {
    '10.art over 10.palette-2.swatch-4':
      'F-282 — 10.art is a scan blob; the image draws the leaves beside the card',
  };

  it('no mockup draws an illustration over a colour sample', () => {
    const found = [...drawn.entries()].flatMap(([mockup, list]) =>
      overlaps(list)
        .filter((pair) => BLOB_BOXES[pair] === undefined)
        .map((pair) => `${mockup}: ${pair}`),
    );
    expect(found).toHaveLength(0);
  });

  it('keeps the blob-box exception only while the boxes still overlap', () => {
    const all = new Set([...drawn.values()].flatMap((list) => overlaps(list)));
    for (const [pair, why] of Object.entries(BLOB_BOXES)) {
      expect(all.has(pair)).toBe(true);
      expect(why).toMatch(/F-\d+/u);
    }
  });

  it('DECOY — the comparison does report an overlap', () => {
    // Without this the case above passes for a comparison that never fires.
    const planted: Box[] = [
      { id: 'art', kind: 'art', x: 10, y: 10, w: 40, h: 40 },
      { id: 'sample', kind: 'sample', x: 30, y: 30, w: 40, h: 40 },
      { id: 'elsewhere', kind: 'sample', x: 400, y: 400, w: 20, h: 20 },
    ];
    expect(overlaps(planted)).toEqual(['art over sample']);
  });
});
