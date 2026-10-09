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

  /**
   * THE GLYPHS WITH NO LINE AT ALL, and the element that draws each one that way. The first draft
   * made every glyph an outline, which the mockups do not (the F-228 review); the list is held in
   * both directions, so a solid glyph cannot quietly become an outline and an outline cannot quietly
   * lose its line.
   */
  const SOLID: Readonly<Partial<Record<GlyphName, string>>> = {
    bulb: '11.gap.icon',
    camera: '00.buttons.icon-camera',
    'close-circle': '09.search.clear',
    'colour-wheel': '00.controls.icon-wheel',
    edit: '00.controls.icon-edit',
    'hue-ring': '03.chips.gamut',
    'lock-solid': '15.security.badge',
    more: '05.more',
    'palette-solid': '00.buttons.icon-palette',
    'score-cvd': '13.score.cvd.icon',
    'score-fit': '13.score.fit.icon',
    'seal-check': '06.provenance.review',
    sparkle: '13.capsule.icon',
  };
  const lined = (name: GlyphName): boolean =>
    shapes(name).some((el) => el.props['stroke'] !== undefined);

  it('draws a line in every glyph its mockup draws with one', () => {
    expect(GLYPH_NAMES.filter((name) => SOLID[name] === undefined && !lined(name))).toHaveLength(0);
  });

  it('draws no line in a glyph its mockup draws solid', () => {
    const named = Object.keys(SOLID) as GlyphName[];
    expect(named.length).toBeGreaterThan(10);
    expect(named.filter(lined)).toHaveLength(0);
  });
});

describe('told apart by shape, not by colour (NFR-9)', () => {
  it('no two drawings are the same shape, filled ones included, but for the one declared', () => {
    // A filled drawing is a shape a person sees as much as an outline is. `lens` filled IS the
    // camera — 02's active lens tab draws the camera 00 draws — and that is the only identity.
    const seen = new Map<string, string>();
    const twins: string[] = [];
    for (const name of GLYPH_NAMES)
      for (const filled of FILLABLE_GLYPHS.includes(name as never) ? [false, true] : [false]) {
        const label = filled ? `${name} (filled)` : name;
        const s = silhouette(name, filled);
        const earlier = seen.get(s);
        if (earlier !== undefined) twins.push(`${earlier} = ${label}`);
        else seen.set(s, label);
      }
    expect(twins).toEqual(['camera = lens (filled)']);
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

  it('draws every other glyph as it always is when asked for a fill it was never drawn with', () => {
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

/**
 * `27`'s two state pictures (F-236, ADR-0128 §3): drawn from 27's readings, at their own line, with
 * the tinted parts as layers a surface fills.
 */
describe('27’s state glyphs', () => {
  const TINT = '#BAA07C';
  const draw = (
    name: GlyphName,
    extra: { stroke?: number; tints?: { lock?: string; slash?: string } } = {},
    size = 24,
  ): ReactElement<Props>[] => {
    const out: ReactElement<Props>[] = [];
    const visit = (node: ReactNode): void => {
      if (!isValidElement(node)) return;
      const el = node as ReactElement<Props>;
      if (el.type === Path || el.type === Circle) out.push(el);
      else Children.forEach(el.props.children, visit);
    };
    const root = Glyph({ name, color: INK, size, ...extra }) as ReactElement<Props>;
    Children.forEach(root.props.children, visit);
    return out;
  };
  const byKey = (els: ReactElement<Props>[], key: string): ReactElement<Props> | undefined =>
    els.find((e) => e.key === key);
  const paintOf = (el: ReactElement<Props> | undefined): unknown =>
    el?.props['fill'] === 'none' ? el.props['stroke'] : el?.props['fill'];

  const board = JSON.parse(readFileSync(join(INVENTORY, '27.json'), 'utf8')) as {
    elements: readonly { id: string; raw?: Record<string, number> }[];
  };
  const raw = (id: string): Record<string, number> => {
    const e = board.elements.find((x) => x.id === id);
    if (e?.raw === undefined) throw new Error(id);
    return e.raw;
  };

  /** The extent of a path's vertices, absolute: M L H V A and their relative forms, as drawn here. */
  function extent(d: string): { minX: number; maxX: number; minY: number; maxY: number } {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/gu) ?? [];
    let [x, y, i] = [0, 0, 0];
    const xs: number[] = [];
    const ys: number[] = [];
    let cmd = '';
    const num = (): number => Number(tokens[i++]);
    while (i < tokens.length) {
      if (/[a-zA-Z]/u.test(tokens[i] ?? '')) cmd = tokens[i++] ?? '';
      const rel = cmd === cmd.toLowerCase();
      switch (cmd.toLowerCase()) {
        case 'm':
        case 'l': {
          const [dx, dy] = [num(), num()];
          [x, y] = rel ? [x + dx, y + dy] : [dx, dy];
          break;
        }
        case 'h':
          x = rel ? x + num() : num();
          break;
        case 'v':
          y = rel ? y + num() : num();
          break;
        case 'a': {
          for (let k = 0; k < 5; k += 1) num();
          const [dx, dy] = [num(), num()];
          [x, y] = rel ? [x + dx, y + dy] : [dx, dy];
          break;
        }
        case 'z':
          // A close moves nothing a box would see: the start is already counted.
          break;
        default:
          throw new Error(`extent: ${cmd}`);
      }
      xs.push(x);
      ys.push(y);
    }
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  it('draws the line its surface binds, converted into the grid at its size', () => {
    const lines = draw('camera-locked', { stroke: 3.5 }, 121.5).filter(
      (e) => e.props['fill'] === 'none',
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const el of lines) expect(el.props['strokeWidth']).toBeCloseTo((3.5 * 24) / 121.5, 10);
    // DECOY — without one, the same glyph keeps the icon line, which is far thinner here.
    for (const el of draw('camera-locked', {}, 121.5).filter((e) => e.props['fill'] === 'none'))
      expect(el.props['strokeWidth']).toBeCloseTo(glyphStroke(121.5), 10);
  });

  it('fills the padlock from its tint and the camera from its ink', () => {
    const tinted = draw('camera-locked', { tints: { lock: TINT } });
    expect(paintOf(byKey(tinted, 'lock-body'))).toBe(TINT);
    expect(paintOf(byKey(tinted, 'shackle'))).toBe(TINT);
    for (const key of ['body', 'lens', 'flash']) expect(paintOf(byKey(tinted, key))).toBe(INK);
    // DECOY — untinted, the padlock is the glyph's one ink.
    expect(paintOf(byKey(draw('camera-locked'), 'lock-body'))).toBe(INK);
  });

  it('draws the slash across the glare from its tint and the sun and rays from its ink', () => {
    const tinted = draw('glare', { tints: { slash: TINT } });
    expect(paintOf(byKey(tinted, 'slash'))).toBe(TINT);
    expect(paintOf(byKey(tinted, 'sun'))).toBe(INK);
    expect(paintOf(byKey(tinted, 'rays'))).toBe(INK);
    // DECOY — a tint for a layer the glyph does not have changes nothing.
    expect(paintOf(byKey(draw('glare', { tints: { lock: TINT } }), 'slash'))).toBe(INK);
  });

  it('draws the camera in 27’s proportions — its lens, its height, its hump, its padlock', () => {
    const r = raw('27.lens-permission.icon');
    const shapesOf = draw('camera-locked');
    const body = extent(String(byKey(shapesOf, 'body')?.props['d']));
    const width = body.maxX - body.minX;
    const lens = Number(byKey(shapesOf, 'lens')?.props['r']);
    const lock = extent(String(byKey(shapesOf, 'lock-body')?.props['d']).split(' M')[0] ?? '');
    const near = (a: number, b: number): void => {
      expect(Math.abs(a / b - 1)).toBeLessThan(0.02);
    };
    near(lens / width, (r['lensPx'] ?? NaN) / (r['bodyWidthPx'] ?? NaN));
    // The shoulders are the line at the hump's foot; the foot is the body's lowest vertex.
    near((body.maxY - 6.42) / width, (r['bodyHeightPx'] ?? NaN) / (r['bodyWidthPx'] ?? NaN));
    near((6.42 - body.minY) / width, (r['humpPx'] ?? NaN) / (r['bodyWidthPx'] ?? NaN));
    near((lock.maxX - lock.minX) / width, (r['lockWidthPx'] ?? NaN) / (r['bodyWidthPx'] ?? NaN));
    expect(byKey(shapesOf, 'flash')).toBeDefined();
    // The keyhole is cut through the padlock: three subpaths, one solid.
    expect(String(byKey(shapesOf, 'lock-body')?.props['d']).match(/M/gu)).toHaveLength(3);
  });

  it('draws the glare in 27’s proportions — its sun and its slash against its rays', () => {
    const r = raw('27.lens-refused.icon');
    const half = (r['linePx'] ?? NaN) / 2;
    const unit = ((r['rayOuterPx'] ?? NaN) - half) / 8.5;
    const shapesOf = draw('glare');
    const near = (a: number, b: number): void => {
      expect(Math.abs(a / b - 1)).toBeLessThan(0.02);
    };
    near(Number(byKey(shapesOf, 'sun')?.props['r']), (r['sunPx'] ?? NaN) / unit);
    const slash = extent(String(byKey(shapesOf, 'slash')?.props['d']));
    near(((slash.maxX - slash.minX) * Math.SQRT2) / 2, ((r['slashPx'] ?? NaN) - half) / unit);
    // DECOY — F-228's slash ran corner to corner, 15 units each way; 27's stops at the rays.
    expect(
      Math.abs((15 * Math.SQRT2) / 2 / (((r['slashPx'] ?? NaN) - half) / unit) - 1),
    ).toBeGreaterThan(0.1);
  });
});
