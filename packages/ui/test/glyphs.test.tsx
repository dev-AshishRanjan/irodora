/**
 * The icon set (F-228): one registry, held to what the mockups draw.
 *
 * ## Read against the record, both ways
 *
 * The inventories under `mockups/inventory/` are F-220's record of every element each mockup draws,
 * and each element names its icon. So the registry is checked against THAT, in both directions: a
 * name an inventory binds with no glyph is a surface that will ask for one and get nothing; a glyph
 * no inventory binds is a design nobody made [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
 * The inventories are a declared global dependency in turbo.json, so an inventory change reruns this
 * rather than replaying a cached pass.
 *
 * ## Walked, not rendered
 *
 * `Glyph` is a plain function of its props, so its element tree is read directly — every `Path` and
 * `Circle` with the props it was given. That is what lets a test assert the stroke on every line at
 * every size, which no rendered-pixel check here could.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Circle, Path } from 'react-native-svg';
import { nativeIconStroke } from '@irodora/design-tokens';
import {
  FILLABLE_GLYPHS,
  Glyph,
  GLYPH_NAMES,
  glyphStroke,
  NAV_ICON_NAMES,
  type GlyphName,
} from '../src/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');
const INK = '#F2F2F2';

/** Every icon name any inventory binds. */
function boundNames(): ReadonlySet<string> {
  const names = new Set<string>();
  for (const file of readdirSync(INVENTORY).filter((f) => /^\d\d\.json$/u.test(f))) {
    const inv = JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as {
      elements?: readonly { icon?: string | null }[];
    };
    for (const e of inv.elements ?? []) if (typeof e.icon === 'string') names.add(e.icon);
  }
  return names;
}

/** What is in `from` and not in `into`, sorted — the one comparison both directions use. */
const missingFrom = (from: Iterable<string>, into: ReadonlySet<string>): string[] =>
  [...from].filter((x) => !into.has(x)).sort();

type Props = Record<string, unknown> & { children?: ReactNode };

/** Every drawn shape in a glyph, flattened out of its fragments. */
function shapes(name: GlyphName, size = 24, filled = false): ReactElement<Props>[] {
  const out: ReactElement<Props>[] = [];
  const visit = (node: ReactNode): void => {
    if (!isValidElement(node)) return;
    const el = node as ReactElement<Props>;
    if (el.type === Path || el.type === Circle) out.push(el);
    else Children.forEach(el.props.children, visit);
  };
  const root = Glyph({ name, color: INK, size, filled }) as ReactElement<Props>;
  Children.forEach(root.props.children, visit);
  return out;
}

/** A glyph's geometry with its ink and width left out — what a person sees as its shape. */
function silhouette(name: GlyphName, filled = false): string {
  return JSON.stringify(
    shapes(name, 24, filled).map((el) => {
      const p = el.props;
      return [
        el.type === Path ? 'path' : 'circle',
        p['d'],
        p['cx'],
        p['cy'],
        p['r'],
        p['fill'] === 'none',
      ];
    }),
  );
}

describe('the icon set is the set the mockups draw', () => {
  const bound = boundNames();

  it('reads the inventories — a scan that found nothing would agree with anything', () => {
    expect(bound.size).toBeGreaterThan(40);
  });

  it('has a glyph for every icon an inventory binds', () => {
    expect(missingFrom(bound, new Set<string>(GLYPH_NAMES))).toHaveLength(0);
  });

  it('draws no glyph that no inventory binds — a glyph nobody drew is a design nobody made', () => {
    expect(missingFrom(GLYPH_NAMES, bound)).toHaveLength(0);
  });

  it('DECOY — the comparison names a stray in either direction', () => {
    // `calendar` is the acceptance-list name no mockup draws (F-228, increment 1).
    expect(missingFrom([...GLYPH_NAMES, 'calendar'], new Set<string>(GLYPH_NAMES))).toEqual([
      'calendar',
    ]);
    const withoutShare = new Set<string>(GLYPH_NAMES.filter((g) => g !== 'share'));
    expect(missingFrom(bound, withoutShare)).toEqual(['share']);
  });

  it('lists every name once, in order', () => {
    expect(new Set(GLYPH_NAMES).size).toBe(GLYPH_NAMES.length);
    expect([...GLYPH_NAMES]).toEqual([...GLYPH_NAMES].sort());
  });

  it('holds the five tab glyphs as ordinary entries — they exist once', () => {
    expect(missingFrom(NAV_ICON_NAMES, new Set<string>(GLYPH_NAMES))).toHaveLength(0);
  });
});

describe('drawn at the mockups’ weight', () => {
  it.each([16, 20, 24, 28])(
    'renders every line at the declared width when drawn at %s dp',
    (size) => {
      const wrong: string[] = [];
      for (const name of GLYPH_NAMES)
        for (const el of shapes(name, size)) {
          // A shape with no stroke draws no line; one WITH a stroke and no width would inherit
          // react-native-svg's default of 1 and pass unnoticed, so it is counted, not skipped.
          if (el.props['stroke'] === undefined) continue;
          const rendered = (Number(el.props['strokeWidth']) * size) / 24;
          if (!(Math.abs(rendered - nativeIconStroke) < 1e-9))
            wrong.push(`${name}: ${String(rendered)}`);
        }
      expect(wrong).toHaveLength(0);
    },
  );

  it('DECOY — one width in grid units would not hold across sizes', () => {
    // Were the stroke a constant on the grid, a 16 dp and a 28 dp icon would carry the same grid
    // width and different rendered lines. The widths differ here precisely so the lines do not.
    expect(Math.abs(glyphStroke(16) - glyphStroke(28))).toBeGreaterThan(0.5);
    expect((glyphStroke(16) * 16) / 24).toBeCloseTo((glyphStroke(28) * 28) / 24, 12);
  });

  it('draws at least one line in every glyph that is not solid by design', () => {
    const solidByDesign = new Set<GlyphName>(['camera', 'more']);
    const lineless = GLYPH_NAMES.filter(
      (name) =>
        !solidByDesign.has(name) &&
        !shapes(name).some((el) => el.props['strokeWidth'] !== undefined),
    );
    expect(lineless).toHaveLength(0);
  });
});

describe('told apart by shape, not by colour (NFR-9)', () => {
  it('no two glyphs draw the same shape', () => {
    const seen = new Map<string, GlyphName>();
    const twins: string[] = [];
    for (const name of GLYPH_NAMES) {
      const s = silhouette(name);
      const earlier = seen.get(s);
      if (earlier !== undefined) twins.push(`${earlier} = ${name}`);
      seen.set(s, name);
    }
    expect(twins).toHaveLength(0);
  });

  it('the five score kinds 13 draws side by side are five shapes', () => {
    const kinds = [
      'score-balance',
      'score-contrast',
      'score-cvd',
      'score-fit',
      'score-harmony',
    ] as const;
    expect(new Set(kinds.map((k) => silhouette(k))).size).toBe(5);
  });

  it('declares its fill on every shape — an omitted one would inherit the root and vanish', () => {
    const bare: string[] = [];
    for (const name of GLYPH_NAMES)
      for (const filled of [false, true])
        for (const el of shapes(name, 24, filled))
          if (el.props['fill'] === undefined) bare.push(name);
    expect(bare).toHaveLength(0);
  });

  it('paints only the ink it is given', () => {
    const stray: string[] = [];
    for (const name of GLYPH_NAMES)
      for (const filled of [false, true])
        for (const el of shapes(name, 24, filled))
          for (const key of ['stroke', 'fill'] as const) {
            const v = el.props[key];
            if (v !== undefined && v !== 'none' && v !== INK)
              stray.push(`${name}.${key}: ${JSON.stringify(v)}`);
          }
    expect(stray).toHaveLength(0);
  });
});

describe('filled, where a mockup draws the active state filled', () => {
  it.each(FILLABLE_GLYPHS)('%s has a filled drawing of its own', (name) => {
    expect(silhouette(name, true)).not.toBe(silhouette(name, false));
    // Solid throughout: 02's active lens and 01's active tab are silhouettes, not heavier lines.
    const drawn = shapes(name, 24, true);
    expect(drawn.length).toBeGreaterThan(0);
    expect(
      drawn.filter((el) => el.props['fill'] !== INK || el.props['stroke'] !== undefined),
    ).toHaveLength(0);
  });

  it('draws every other glyph as its outline when asked for a fill it was never drawn with', () => {
    const changed = GLYPH_NAMES.filter(
      (name) =>
        !(FILLABLE_GLYPHS as readonly GlyphName[]).includes(name) &&
        silhouette(name, true) !== silhouette(name, false),
    );
    expect(changed).toHaveLength(0);
  });
});

describe('decorative to a screen reader', () => {
  it('hides itself — the control around it carries the name', () => {
    const root = Glyph({ name: 'share', color: INK }) as ReactElement<Props>;
    expect(root.props['accessible']).toBe(false);
    expect(root.props['importantForAccessibility']).toBe('no-hide-descendants');
  });
});
