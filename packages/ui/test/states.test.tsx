/**
 * The four states `27` draws — the sweep (F-236, criterion 1; ADR-0128).
 *
 * - **Every dimension is 27's**, recomputed from `mockups/inventory/27.json` at the board's scale:
 *   a size to the half dp, an interval snapped to the R9 scale, each with a decoy.
 * - **Each state draws what 27 draws, in 27's order and tokens**: the picture, the working state's
 *   steps, the heading, the body, the action — centred, on a level-1 card with its edge.
 * - **Each is read correctly**: the heading is a heading, the pictures say nothing, the ring is a
 *   progressbar, the actions keep their hit areas, and a state that appears under a person is
 *   announced once — not again when it re-renders.
 * - **Each of 27's tints is drawn by one owner** (C10, E-188): a second reader of a state tint is a
 *   state's colour leaking into a surface that never drew it.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { nativeColors, nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import {
  blurredDisc,
  DeniedState,
  glowAt,
  glowDiscs,
  RefusedState,
  STATE_BOARD_K,
  STATE_LAYOUT,
  STATE_PICTURES,
  STATE_RING,
  STATE_TEST_IDS,
  ThemeProvider,
  WorkingState,
} from '../src/index.js';
import { flattenStyle, type TestNode } from '../src/testing/index.js';

interface Element {
  readonly id: string;
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly raw?: Readonly<Record<string, number>>;
  readonly tokens: Readonly<Record<string, string>>;
}
/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const board = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '27.json'), 'utf8'),
) as {
  readonly elements: readonly Element[];
};
const el = (id: string): Element => {
  const found = board.elements.find((e) => e.id === id);
  if (found === undefined) throw new Error(id);
  return found;
};
const raw = (id: string, key: string): number => el(id).raw?.[key] ?? NaN;
const k = STATE_BOARD_K;
const half = (v: number): number => Math.round(v * 2) / 2;
/** §2's snap: the nearest step of the spacing scale, the smaller on a tie. */
const snap = (dp: number): string => {
  const steps = Object.entries(nativeSpacing).sort((a, b) => a[1] - b[1]);
  let best = steps[0];
  for (const s of steps)
    if (best === undefined || Math.abs(s[1] - dp) < Math.abs(best[1] - dp)) best = s;
  return best?.[0] ?? '';
};
/**
 * What a text box carries beyond its ink, in dp — its half-leading and its ascender over the cap
 * above, its line below the baseline — from SF Pro's and Roboto's metrics at title 22 on 26.4 and
 * body 16 on 26.4 (F-231's method; ADR-0128 §2). An ink gap less these is the gap between boxes.
 */
const TITLE_ABOVE_INK = 5.3;
const TITLE_BELOW_BASELINE = 5.5;
const BODY_ABOVE_INK = 7.1;

const dark = nativeColors.dark;
const paint = (v: unknown): string | undefined => {
  const p = v as { readonly payload?: unknown } | undefined;
  return typeof p?.payload === 'number'
    ? `#${(p.payload & 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`
    : typeof v === 'string'
      ? v
      : undefined;
};
const nodes = (n: TestNode): readonly TestNode[] => [
  n,
  ...(n.children ?? []).flatMap((c) => (typeof c === 'string' ? [] : nodes(c))),
];
const styleOf = (testID: string): Record<string, unknown> =>
  flattenStyle(screen.getByTestId(testID, { includeHiddenElements: true }).props['style']);

const noop = (): void => undefined;
const WORKING = (
  <WorkingState
    title="Analysing Fabric Colour…"
    body="Hold steady. The reading is being computed on this device."
    steps={['Waiting for a camera frame…', 'Converting to OKLCh: D65 (6504K)']}
    progress={{ value: 0, text: 'Step 1 of 2' }}
  />
);
const REFUSED = (
  body = 'Glare covers 31 % of the region, above the 20 % the reading allows. Move out of direct light.',
) => (
  <RefusedState
    title="Reading Refused: Glare"
    body={body}
    retry={{ label: 'Retry Capture', onPress: noop }}
  />
);
const DENIED = (
  <DeniedState
    title="Camera Access Needed"
    body="Irodora reads colour on this device and sends nothing anywhere."
    action={{ label: 'Open Device Settings', onPress: noop, hint: 'Opens the Settings app' }}
  />
);
const draw = (node: React.JSX.Element, theme: 'dark' | 'light' = 'dark') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

describe("every dimension is 27's, at the board's scale", () => {
  it('sizes each picture from its reading, to the half dp', () => {
    expect(half(el('27.wardrobe-empty.art').box.w * k)).toBe(STATE_PICTURES.hanger.width);
    expect(half(raw('27.wardrobe-empty.art', 'linePx') * k)).toBe(STATE_PICTURES.hanger.stroke);
    expect(half(2 * raw('27.lens-working.mark', 'reachPx') * k)).toBe(STATE_PICTURES.mark.size);
    expect(half(el('27.lens-working.step-1').box.h * k)).toBe(STATE_PICTURES.step.height);
    const plate = el('27.lens-refused.icon').box;
    expect(half(((plate.w + plate.h) / 2) * k)).toBe(STATE_PICTURES.plate.size);
    expect(half(raw('27.lens-refused.icon', 'edgePx') * k)).toBe(STATE_PICTURES.plate.edge);
    expect(half(raw('27.lens-refused.icon', 'linePx') * k)).toBe(STATE_PICTURES.plate.stroke);
    // The glare's grid: its rays' tips, less half its line, are 8.5 of its 24 units.
    const unit =
      (raw('27.lens-refused.icon', 'rayOuterPx') - raw('27.lens-refused.icon', 'linePx') / 2) / 8.5;
    expect(half(24 * unit * k)).toBe(STATE_PICTURES.plate.glyph);
    // The camera's grid: its body, centre line to centre line, is 18 of its 24 units.
    expect(half(((24 * raw('27.lens-permission.icon', 'bodyWidthPx')) / 18) * k)).toBe(
      STATE_PICTURES.camera.size,
    );
    expect(half(raw('27.lens-permission.icon', 'linePx') * k)).toBe(STATE_PICTURES.camera.stroke);
    expect(half(el('27.wardrobe-empty.scan').box.h * k)).toBe(STATE_PICTURES.action.height);
    expect(STATE_RING.size).toBe(
      half(
        (2 * raw('27.lens-working.progress', 'radiusPx') +
          raw('27.lens-working.progress', 'strokePx')) *
          k,
      ),
    );
  });

  it('takes the plate’s corner from its reading — lg, where F-220 recorded md', () => {
    const corner = raw('27.lens-refused.icon', 'cornerPx') * k;
    const radii = (['sm', 'md', 'lg'] as const).map((r) => [r, nativeRadius[r]] as const);
    const nearest = radii.reduce((a, b) =>
      Math.abs(b[1] - corner) < Math.abs(a[1] - corner) ? b : a,
    );
    expect(nearest[0]).toBe(STATE_PICTURES.plate.radius);
    expect(el('27.lens-refused.icon').tokens['radius']).toBe('lg');
  });

  it('draws the glow from its reading — the disc, its blur, its strength and its reach', () => {
    const glow = el('27.lens-working.glow');
    expect(STATE_PICTURES.glow.alpha).toBe(raw('27.lens-working.glow', 'alpha'));
    expect(half(raw('27.lens-working.glow', 'discPx') * k)).toBe(STATE_PICTURES.glow.radius);
    expect(Math.round(raw('27.lens-working.glow', 'sigmaPx') * k * 100) / 100).toBe(
      STATE_PICTURES.glow.sigma,
    );
    expect(half((glow.box.w / 2) * k)).toBe(STATE_PICTURES.glow.reach);
  });

  it('snaps each interval to the R9 scale (ADR-0128 §2)', () => {
    const card = '27.wardrobe-empty';
    expect(snap(raw(card, 'padPx') * k)).toBe(STATE_LAYOUT.padding);
    expect(snap(raw(card, 'topPx') * k - nativeSpacing[STATE_LAYOUT.padding])).toBe(
      STATE_LAYOUT.pictureTop,
    );
    for (const title of [
      '27.wardrobe-empty.title',
      '27.lens-refused.title',
      '27.lens-permission.title',
    ])
      expect(snap(raw(title, 'gapAbovePx') * k - TITLE_ABOVE_INK)).toBe(STATE_LAYOUT.titleTop);
    expect(snap(raw('27.lens-working.title', 'gapAbovePx') * k - TITLE_ABOVE_INK)).toBe(
      STATE_LAYOUT.titleTop,
    );
    const ring = el('27.lens-working.progress').box;
    const step1 = el('27.lens-working.step-1').box;
    const step2 = el('27.lens-working.step-2').box;
    expect(snap((step1.y - (ring.y + ring.h)) * k)).toBe(STATE_LAYOUT.stepsTop);
    expect(snap((step2.y - (step1.y + step1.h)) * k)).toBe(STATE_LAYOUT.stepGap);
    // Title to body, baseline to ink, on the two cards whose last title line has no descender.
    for (const body of ['27.lens-working.body', '27.lens-permission.body'])
      expect(snap(raw(body, 'gapAbovePx') * k - TITLE_BELOW_BASELINE - BODY_ABOVE_INK)).toBe(
        STATE_LAYOUT.bodyTop,
      );
  });

  it('DECOY — the inset taken whole, 67 dp, would snap to the scale’s top and lose the padding', () => {
    // ADR-0128 §2's rejected alternative: the card's padding is one value on every side.
    expect(snap(raw('27.wardrobe-empty', 'topPx') * k)).toBe('xxl');
    expect(nativeSpacing.xxl).toBeLessThan(
      nativeSpacing[STATE_LAYOUT.padding] + nativeSpacing[STATE_LAYOUT.pictureTop],
    );
  });
});

describe('each state draws what 27 draws, in its order', () => {
  /** The state's parts, in the order the tree lays them out. */
  const parts = (kind: keyof typeof STATE_TEST_IDS): string[] =>
    nodes(screen.toJSON() as TestNode)
      .map((n) => n.props['testID'])
      .filter(
        (id): id is string =>
          typeof id === 'string' && /^state\.\w+\.(picture|steps|title|body|action)$/u.test(id),
      )
      .filter((id) => id.startsWith(`${STATE_TEST_IDS[kind]}.`));

  it('working: the ring, the two steps, the heading, the body — and no action', () => {
    draw(WORKING);
    expect(screen.getByTestId(STATE_TEST_IDS.working)).toBeTruthy();
    expect(parts('working')).toStrictEqual([
      'state.working.picture',
      'state.working.steps',
      'state.working.title',
      'state.working.body',
    ]);
  });

  it('refused: the plate, the heading, the reason, and retry', () => {
    draw(REFUSED());
    expect(parts('refused')).toStrictEqual([
      'state.refused.picture',
      'state.refused.title',
      'state.refused.body',
      'state.refused.action',
    ]);
  });

  it('denied: the camera, the heading, the body, and the way to settings', () => {
    draw(DENIED);
    expect(parts('denied')).toStrictEqual([
      'state.denied.picture',
      'state.denied.title',
      'state.denied.body',
      'state.denied.action',
    ]);
  });

  it('lays each card out at 27’s intervals, its picture centred', () => {
    draw(REFUSED());
    expect(styleOf('state.refused.picture')).toMatchObject({
      marginTop: nativeSpacing[STATE_LAYOUT.pictureTop],
      height: STATE_PICTURES.plate.size,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(styleOf('state.refused.title')['marginTop']).toBe(nativeSpacing[STATE_LAYOUT.titleTop]);
    expect(styleOf('state.refused.body')['marginTop']).toBe(nativeSpacing[STATE_LAYOUT.bodyTop]);
    expect(styleOf('state.refused.action')['height']).toBe(STATE_PICTURES.action.height);
  });

  it('centres every line of the heading and the body', () => {
    draw(DENIED);
    for (const text of [
      'Camera Access Needed',
      'Irodora reads colour on this device and sends nothing anywhere.',
    ])
      expect(flattenStyle(screen.getByText(text).props['style'])['textAlign']).toBe('center');
  });
});

describe("each state is drawn in 27's tokens", () => {
  it('stands on a level-1 card with its edge, its words in foreground', () => {
    draw(REFUSED());
    expect(styleOf(STATE_TEST_IDS.refused)['backgroundColor']).toBe(dark['surface.1']);
    expect(flattenStyle(screen.getByText('Reading Refused: Glare').props['style'])['color']).toBe(
      dark.foreground,
    );
    // 27's bodies are white, not foreground.2 (increment 1).
    expect(flattenStyle(screen.getByText(/^Glare covers/u).props['style'])['color']).toBe(
      dark.foreground,
    );
  });

  it('draws the plate in the refusal’s three tints, the slash in the edge’s', () => {
    draw(REFUSED());
    expect(styleOf('state.refused.plate')).toMatchObject({
      width: STATE_PICTURES.plate.size,
      borderRadius: nativeRadius.lg,
      borderWidth: STATE_PICTURES.plate.edge,
      borderColor: dark['state.refused.edge'],
      backgroundColor: dark['state.refused.plate'],
    });
    const strokes = nodes(screen.toJSON() as TestNode)
      .map((n) => paint(n.props['stroke']))
      .filter(Boolean);
    expect(strokes).toContain(dark['state.refused.glyph']);
    expect(strokes).toContain(dark['state.refused.edge']);
  });

  it('draws the camera in foreground and its padlock in the lock’s tint', () => {
    draw(DENIED);
    const tree = nodes(screen.toJSON() as TestNode);
    expect(tree.map((n) => paint(n.props['stroke']))).toContain(dark.foreground);
    expect(tree.map((n) => paint(n.props['fill']))).toContain(dark['state.lock']);
  });

  it('draws the steps as mono badges on surface.3, and the mark in its tint', () => {
    draw(WORKING);
    expect(styleOf('state.working.step-1')).toMatchObject({
      height: STATE_PICTURES.step.height,
      backgroundColor: dark['surface.3'],
      borderRadius: nativeRadius.sm,
    });
    const fills = nodes(screen.toJSON() as TestNode).map((n) => paint(n.props['fill']));
    expect(fills).toContain(dark['state.mark']);
  });

  it('DECOY — in Washi the same parts take Washi’s surfaces and the same tints (D8)', () => {
    draw(REFUSED(), 'light');
    expect(styleOf(STATE_TEST_IDS.refused)['backgroundColor']).toBe(
      nativeColors.light['surface.1'],
    );
    expect(styleOf('state.refused.plate')['backgroundColor']).toBe(
      nativeColors.light['state.refused.plate'],
    );
    expect(nativeColors.light['state.refused.plate']).toBe(dark['state.refused.plate']);
  });
});

describe('each state is read correctly', () => {
  let announce: jest.SpyInstance<void, [string]>;
  beforeEach(() => {
    // React Native's jest setup already mocks it, and spyOn hands back that one mock: its calls
    // carry over from every earlier render in this file unless they are cleared.
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(noop);
    announce.mockClear();
  });
  afterEach(() => {
    announce.mockRestore();
  });

  it('announces the working and refused states once, and not again on a re-render', () => {
    const { rerender } = draw(REFUSED());
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce.mock.calls[0]?.[0]).toMatch(/^Reading Refused: Glare\. Glare covers/u);
    rerender(<ThemeProvider theme="dark">{REFUSED()}</ThemeProvider>);
    expect(announce).toHaveBeenCalledTimes(1);
    // A different refusal is news.
    rerender(
      <ThemeProvider theme="dark">
        {REFUSED('Blur hides the weave. Hold the phone still.')}
      </ThemeProvider>,
    );
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('DECOY — the denied state, which a person navigates to, is not announced', () => {
    draw(DENIED);
    expect(announce).not.toHaveBeenCalled();
    draw(WORKING);
    expect(announce).toHaveBeenCalledWith('Analysing Fabric Colour…');
  });

  it('makes each heading a heading', () => {
    draw(DENIED);
    expect(screen.getByRole('header', { name: 'Camera Access Needed' })).toBeTruthy();
  });

  it('hides the refused and denied pictures, and reads the working ring', () => {
    draw(REFUSED());
    expect(
      screen.getByTestId('state.refused.picture', { includeHiddenElements: true }).props[
        'accessibilityElementsHidden'
      ],
    ).toBe(true);
    screen.unmount();
    draw(WORKING);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(
      screen.getByTestId('state.working.picture').props['accessibilityElementsHidden'],
    ).toBeUndefined();
  });

  it('keeps each action’s hit area, and tells where Open Device Settings goes', () => {
    draw(DENIED);
    const action = screen.getByTestId('state.denied.action');
    expect(action.props['hitSlop']).toBeDefined();
    expect(action.props['accessibilityHint']).toBe('Opens the Settings app');
  });
});

describe('the glow is the disc 27 draws, blurred', () => {
  const { alpha, radius, sigma, reach } = STATE_PICTURES.glow;

  it('is a blurred disc: its centre is the share of the kernel inside the disc', () => {
    // The integral is a 240-step trapezoid: within 5e-5 of the closed form, far under a level.
    expect(blurredDisc(0, radius, sigma)).toBeCloseTo(
      1 - Math.exp(-(radius ** 2) / (2 * sigma ** 2)),
      4,
    );
    // DECOY — far outside the disc the kernel reaches nothing.
    expect(blurredDisc(radius + 6 * sigma, radius, sigma)).toBeLessThan(1e-6);
  });

  it('falls from the centre to nothing at its reach, under one level of the ink', () => {
    expect(glowAt(0)).toBeCloseTo(alpha * blurredDisc(0, radius, sigma), 12);
    // At its reach the glow lifts the card by no more than one level of the drawing's own span —
    // the mark's ink over the card, as glow-fit read it — which is where 27's glow was read to end.
    const luma = (hex: string): number => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
    };
    const mark = board.elements.find((e) => e.id === '27.lens-working.mark') as Element & {
      measured: Record<string, string>;
    };
    const card = board.elements.find((e) => e.id === '27.lens-working') as Element & {
      measured: Record<string, string>;
    };
    const span = luma(mark.measured['fg'] ?? '') - luma(card.measured['bg'] ?? '');
    expect(alpha * blurredDisc(reach, radius, sigma) * span).toBeLessThanOrEqual(1);
    // DECOY — half the reach is well inside the glow.
    expect(alpha * blurredDisc(reach / 2, radius, sigma) * span).toBeGreaterThan(10);
  });

  it('is drawn as discs of the tint whose fill opacities compose to it, within a level', () => {
    const discs = glowDiscs();
    expect(discs[0]?.r).toBe(reach);
    for (const d of discs) expect(d.opacity).toBeGreaterThanOrEqual(0);
    /** What the discs over a point compose to: one minus what each lets through. */
    const composed = (r: number): number =>
      1 - discs.filter((d) => d.r >= r).reduce((through, d) => through * (1 - d.opacity), 1);
    // The mark's ink over the card is about 154 levels; every band is within one of the fit.
    for (let r = 0.1; r < reach; r += 0.37)
      expect(Math.abs(composed(r) - glowAt(r)) * 154).toBeLessThan(1);
    // DECOY — summing the opacities, as if each disc were drawn alone, overshoots by far.
    const summed = discs.reduce((n, d) => n + d.opacity, 0);
    expect(summed - glowAt(0)).toBeGreaterThan(0.01);
  });

  it('paints the token itself at a stated opacity — never a colour mixed from it', () => {
    draw(WORKING);
    const glow = nodes(screen.toJSON() as TestNode).filter(
      (n) => n.props['fillOpacity'] !== undefined,
    );
    expect(glow).toHaveLength(glowDiscs().length);
    for (const n of glow) expect(paint(n.props['fill'])).toBe(dark['state.mark']);
  });

  it('is drawn twice its reach across, behind the mark', () => {
    draw(WORKING);
    expect(
      screen.getByTestId('state.working.glow', { includeHiddenElements: true }).props['width'],
    ).toBe(2 * reach);
  });
});

describe('each of 27’s tints is drawn by its one owner (E-188)', () => {
  /** Every source file of the two packages that draw, with the state tints each names. */
  function readers(
    files: readonly { readonly path: string; readonly text: string }[],
  ): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const { path, text } of files)
      for (const token of text.match(
        /'state\.(?:hanger|mark|refused\.plate|refused\.edge|refused\.glyph|lock)'/gu,
      ) ?? []) {
        const name = token.slice(1, -1);
        const list = (out[name] ??= []);
        if (!list.includes(path)) list.push(path);
      }
    for (const list of Object.values(out)) list.sort();
    return out;
  }
  function sources(dir: string, rel: string): { path: string; text: string }[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      const at = `${rel}/${name}`;
      if (statSync(full).isDirectory()) return sources(full, at);
      return /\.(ts|tsx)$/u.test(name) ? [{ path: at, text: readFileSync(full, 'utf8') }] : [];
    });
  }
  // This package's own source: every state is drawn here. The app holds itself to naming none
  // (apps/mobile/test/state-tints.test.ts), so each package reads only itself and its cache key
  // covers what its test read.
  const files = sources(join(__dirname, '..', 'src'), 'ui');

  it('names each tint in its owner and nowhere else', () => {
    expect(readers(files)).toStrictEqual({
      'state.hanger': ['ui/Illustration.tsx'],
      'state.mark': ['ui/brand.tsx'],
      'state.refused.plate': ['ui/RefusedState.tsx'],
      'state.refused.edge': ['ui/RefusedState.tsx'],
      'state.refused.glyph': ['ui/RefusedState.tsx'],
      'state.lock': ['ui/DeniedState.tsx'],
    });
  });

  it('DECOY — a second reader is named', () => {
    const planted = [...files, { path: 'ui/Planted.tsx', text: "colors['state.lock']" }];
    expect(readers(planted)['state.lock']).toStrictEqual(['ui/DeniedState.tsx', 'ui/Planted.tsx']);
  });
});
