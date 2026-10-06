/**
 * The mark and the wordmark (F-141, F-165, F-230).
 *
 * ## What is worth asserting about a mark, and what is not
 *
 * Most of a mark is judgement, and no test closes that. What is not judgement:
 *
 * 1. **It is mockup 14's** (C4, ADR-0122): every field of `MARK` is recomputed from
 *    `14.splash.mark`'s readings, with F-165's mark, four petals and six as decoys.
 * 2. **Its cuts are holes**, and every renderer — the component, the SVG, the asset generator —
 *    draws one geometry.
 * 3. It **does not depend on colour to be recognisable** (BRAND §7): one ink, and the same
 *    silhouette in any ink.
 * 4. It works at **16 px** — as five lobes; the cuts are sub-pixel there, and nothing is claimed
 *    about them.
 *
 * The rest is recorded as an attested criterion rather than pretended away.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { nativeColors, nativeFaces, nativeFamilies } from '@irodora/design-tokens';
import {
  Mark,
  MARK,
  MARK_HUB,
  MARK_INKS,
  MARK_MIN_SIZE,
  MARK_ORBIT,
  MARK_PETAL,
  markClipPath,
  markCovers,
  markInkBox,
  markReach,
  markShapes,
  markSvg,
  narrowestFeature,
  svgNumber,
  ThemeProvider,
  Wordmark,
} from '../src/index.js';

const draw = (node: React.JSX.Element, theme: 'light' | 'dark' = 'light') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

/** Every distinct `fill="…"` in an SVG document. */
function fills(svg: string): string[] {
  const found = [...svg.matchAll(/fill="([^"]+)"/gu)]
    .map((m) => m[1])
    .filter((v): v is string => v !== undefined);
  return [...new Set(found)];
}

/** Every disc in an SVG document, as its geometry alone — the silhouette, with no colour in it. */
function silhouette(svg: string): string[] {
  return [...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/gu)].map(
    (m) => `${String(m[1])},${String(m[2])},${String(m[3])}`,
  );
}

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const FOURTEEN = join(__dirname, '..', '..', '..', 'mockups', 'inventory', '14.json');
const GEOMETRY = join(
  __dirname,
  '..',
  '..',
  '..',
  'apps',
  'mobile',
  'assets',
  'brand',
  'mark-geometry.json',
);

interface Reading {
  readonly petals: number;
  readonly phaseDeg: number;
  readonly orbitPx: number;
  readonly petalPx: number;
  readonly hubPx: number;
  readonly eyePx: number;
  readonly ringOuterPx: number;
  readonly stamenOuterPx: number;
  readonly stamenPx: number;
  readonly seamPx: number;
}
const splash = (
  JSON.parse(readFileSync(FOURTEEN, 'utf8')) as {
    elements: readonly { id: string; raw?: Reading; dp: { w: number; h: number } }[];
  }
).elements.find((e) => e.id === '14.splash.mark');
if (splash?.raw === undefined) throw new Error('14.splash.mark has no readings');
const reading = splash.raw;
/** px to grid units: the reach is the petals' measured reach. */
const SCALE = MARK.reach / (reading.orbitPx + reading.petalPx);
/** The instrument's calibrated error (0.3 px, mark-fit.mjs) in grid units, plus the two-place rounding. */
const TOLERANCE = 0.3 * SCALE + 0.005;

describe("the mark is 14's, measured (F-230, ADR-0122)", () => {
  it('takes every cut from the splash reading, within the instrument’s error', () => {
    const cases: readonly (readonly [string, number, number])[] = [
      ['eye', MARK.eye, reading.eyePx],
      ['ringOuter', MARK.ringOuter, reading.ringOuterPx],
      ['stamenOuter', MARK.stamenOuter, reading.stamenOuterPx],
      ['stamenWidth', MARK.stamenWidth, reading.stamenPx],
      ['seamWidth', MARK.seamWidth, reading.seamPx],
    ];
    for (const [name, value, px] of cases)
      expect({ name, off: Math.abs(value - px * SCALE) <= TOLERANCE }).toStrictEqual({
        name,
        off: true,
      });
    expect(MARK.petals).toBe(reading.petals);
  });

  it('draws the petals tangent and the hub to their tangency, as 14 does', () => {
    const half = Math.PI / MARK.petals;
    // The drawing: 0.06 px from touching, within the instrument's error.
    expect(Math.abs(reading.petalPx - reading.orbitPx * Math.sin(half))).toBeLessThanOrEqual(0.3);
    expect(MARK_PETAL).toBeCloseTo(MARK_ORBIT * Math.sin(half), 10);
    expect(MARK_ORBIT + MARK_PETAL).toBeCloseTo(MARK.reach, 10);
    expect(MARK_HUB).toBeCloseTo(MARK_ORBIT * Math.cos(half), 10);
    expect(Math.abs(MARK_HUB - reading.hubPx * SCALE)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(MARK_ORBIT - reading.orbitPx * SCALE)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('points its first petal straight up, as 14 does', () => {
    expect(Math.abs(reading.phaseDeg)).toBeLessThanOrEqual(1);
    const [first] = markShapes().petals;
    expect(first?.cx).toBeCloseTo(MARK.grid / 2, 10);
    expect(first?.cy).toBeCloseTo(MARK.grid / 2 - MARK_ORBIT, 10);
  });

  it('keeps 14’s ink aspect: taller above its centre than below', () => {
    const box = markInkBox();
    const aspect = (box.bottom - box.top) / (box.right - box.left);
    expect(Math.abs(aspect - splash.dp.h / splash.dp.w)).toBeLessThanOrEqual(0.01);
    expect(MARK.grid / 2 - box.top).toBeGreaterThan(box.bottom - MARK.grid / 2);
  });

  it('DECOY — F-165’s six discs, four petals and six are not 14’s', () => {
    // F-165's mark: orbit 8 and an interval of 3 gave a petal of 3.2 and an eye of 1.8.
    expect(Math.abs(1.8 - reading.eyePx * SCALE)).toBeGreaterThan(TOLERANCE);
    expect(Math.abs(3.2 - reading.petalPx * SCALE)).toBeGreaterThan(TOLERANCE);
    expect([4, 6]).not.toContain(reading.petals);
  });
});

describe('its cuts are holes, and every renderer draws one geometry', () => {
  const C = MARK.grid / 2;
  const at = (deg: number, r: number): readonly [number, number] => [
    C + r * Math.sin((deg * Math.PI) / 180),
    C - r * Math.cos((deg * Math.PI) / 180),
  ];

  it('is ink in the eye, the hub and the petals, and ground in every cut', () => {
    expect(markCovers(C, C)).toBe(true);
    expect(markCovers(...at(18, (MARK.ringOuter + MARK_HUB) / 2))).toBe(true);
    expect(markCovers(...at(0, MARK.reach - 0.5))).toBe(true);
    expect(markCovers(...at(18, (MARK.eye + MARK.ringOuter) / 2))).toBe(false);
    expect(markCovers(...at(72, (MARK.ringOuter + MARK.stamenOuter) / 2))).toBe(false);
    expect(markCovers(...at(108, MARK_HUB - 0.5))).toBe(false);
    // DECOY: just past a stamen's end it is ink again; a seam runs on to the edge.
    expect(markCovers(...at(72, MARK.stamenOuter + 0.3))).toBe(true);
    expect(markCovers(...at(108, MARK.reach - 2))).toBe(false);
  });

  it('is five-fold: the same after a fifth of a turn, and not after a tenth', () => {
    const turn = (u: number, v: number, deg: number): readonly [number, number] => {
      const a = (deg * Math.PI) / 180;
      const [x, y] = [u - C, v - C];
      return [C + x * Math.cos(a) - y * Math.sin(a), C + x * Math.sin(a) + y * Math.cos(a)];
    };
    let fifth = 0;
    let tenth = 0;
    for (let u = 0.25; u < MARK.grid; u += 0.5)
      for (let v = 0.25; v < MARK.grid; v += 0.5) {
        if (markCovers(u, v) !== markCovers(...turn(u, v, 72))) fifth += 1;
        if (markCovers(u, v) !== markCovers(...turn(u, v, 36))) tenth += 1;
      }
    // A sample on a cut's edge may fall either side after the rotation's rounding.
    expect(fifth).toBeLessThan(20);
    // DECOY: a tenth of a turn swaps stamens and seams.
    expect(tenth).toBeGreaterThan(200);
  });

  it('keeps every cut apart, so evenodd removes each exactly once', () => {
    const { stamens, seams, ringOuter } = markShapes();
    const halfAngle = (w: number): number => (Math.asin(w / 2 / ringOuter) * 180) / Math.PI;
    const widest = Math.max(halfAngle(MARK.stamenWidth), halfAngle(MARK.seamWidth));
    const angles = [...stamens, ...seams].map((c) => c.angle).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i += 1)
      expect((angles[i] ?? 0) - (angles[i - 1] ?? 0)).toBeGreaterThan(2 * widest);
    const box = markInkBox();
    expect([box.left, box.top]).toStrictEqual([expect.any(Number), expect.any(Number)]);
    expect(Math.min(box.left, box.top)).toBeGreaterThanOrEqual(0);
    expect(Math.max(box.right, box.bottom)).toBeLessThanOrEqual(MARK.grid);
    expect(markReach()).toBe(MARK.reach);
  });

  it('draws one ink, clipped by the cuts, in the component and the SVG alike', () => {
    const tree = draw(<Mark size={48} label="Irodora" />, 'dark');
    const circles = tree.UNSAFE_queryAllByType('RNSVGCircle' as never);
    expect(circles).toHaveLength(MARK.petals + 1);
    expect(new Set(circles.map((n) => JSON.stringify(n.props['fill']))).size).toBe(1);
    const clips = tree.UNSAFE_queryAllByType('RNSVGClipPath' as never);
    expect(clips).toHaveLength(1);
    const svg = markSvg('#000000');
    expect(fills(svg)).toEqual(['#000000']);
    expect(svg).toContain(`<path d="${markClipPath()}" clip-rule="evenodd"/>`);
    const drawn = circles.map(
      (n) => `${String(n.props['cx'])},${String(n.props['cy'])},${String(n.props['r'])}`,
    );
    expect(drawn.sort()).toStrictEqual(silhouette(svg).sort());
    // DECOY: painting the cuts instead would be a second fill.
    expect(
      fills(svg.replace('</g>', '<circle cx="12" cy="12" r="2" fill="#FFFFFF"/></g>')),
    ).toHaveLength(2);
  });

  it('draws the geometry the asset generator derived (E-116)', () => {
    const generated = JSON.parse(readFileSync(GEOMETRY, 'utf8')) as Record<string, number>;
    const mine = {
      grid: MARK.grid,
      petals: MARK.petals,
      reach: Number(svgNumber(MARK.reach)),
      orbit: Number(svgNumber(MARK_ORBIT)),
      petal: Number(svgNumber(MARK_PETAL)),
      hub: Number(svgNumber(MARK_HUB)),
      eye: Number(svgNumber(MARK.eye)),
      ringOuter: Number(svgNumber(MARK.ringOuter)),
      stamenOuter: Number(svgNumber(MARK.stamenOuter)),
      stamenWidth: Number(svgNumber(MARK.stamenWidth)),
      seamWidth: Number(svgNumber(MARK.seamWidth)),
    };
    // The file's own note is not geometry.
    const derived = Object.fromEntries(Object.entries(generated).filter(([k]) => k !== '$comment'));
    expect(derived).toStrictEqual(mine);
    // DECOY: a generator that read one field differently is seen.
    expect({ ...derived, seamWidth: (derived['seamWidth'] ?? 0) + 0.01 }).not.toStrictEqual(mine);
  });
});

describe('it does not depend on colour to be recognisable', () => {
  it('draws the same silhouette in any ink', () => {
    const dark = markSvg('#131110');
    const light = markSvg('#F6F4F1');
    expect(silhouette(light)).toEqual(silhouette(dark));
    // And the inks really did differ, or the comparison above would be trivially true.
    expect(fills(light)).not.toEqual(fills(dark));
  });

  it('draws in ONE ink — a list of colours does not compile (ADR-0122)', () => {
    expect(fills(markSvg('#131110'))).toEqual(['#131110']);
    // @ts-expect-error — ADR-0093's five-colour icon is superseded: the mark takes one ink.
    expect(() => markSvg(['#AC473E', '#9F7850'])).toBeDefined();
    expect(() => markSvg(' ')).toThrow(/needs a colour/u);
  });

  it('takes only the neutral inks, by type', () => {
    expect([...MARK_INKS]).toStrictEqual([
      'foreground',
      'foreground.2',
      'foreground.3',
      'inverse.foreground',
    ]);
    // @ts-expect-error — a hue is not an ink the mark takes; 27's tint is F-236's declared exception.
    expect(draw(<Mark color="status.ok" />)).toBeDefined();
  });

  it('hard-codes no colour of its own', () => {
    for (const theme of ['light', 'dark'] as const) {
      const token = nativeColors[theme].foreground;
      expect(fills(markSvg(token))).toEqual([token]);
    }
  });
});

describe('it works at 16 px — as five lobes', () => {
  /**
   * Coverage of a 16 × 16 px render of a point test, 8 × 8 samples a pixel, read around a circle
   * between the notches and the tips: five lobes resolve as five maxima and five minima.
   */
  function lobes(covers: (u: number, v: number) => boolean): number {
    const px = 16;
    const unit = MARK.grid / px;
    const coverage: number[][] = [];
    for (let y = 0; y < px; y += 1) {
      const row: number[] = [];
      for (let x = 0; x < px; x += 1) {
        let hit = 0;
        for (let sy = 0; sy < 8; sy += 1)
          for (let sx = 0; sx < 8; sx += 1)
            if (covers((x + (sx + 0.5) / 8) * unit, (y + (sy + 0.5) / 8) * unit)) hit += 1;
        row.push(hit / 64);
      }
      coverage.push(row);
    }
    // Between the hub (where the notches stop) and the tips, in px.
    const radius = ((MARK_HUB + MARK.reach) / 2 / MARK.grid) * px;
    const around: number[] = [];
    for (let deg = 0; deg < 360; deg += 2) {
      const x = px / 2 + radius * Math.sin((deg * Math.PI) / 180);
      const y = px / 2 - radius * Math.cos((deg * Math.PI) / 180);
      around.push(coverage[Math.floor(y)]?.[Math.floor(x)] ?? 0);
    }
    // Count each rise above 0.6 after a fall below 0.4, around the circle.
    let state: 'high' | 'low' | null = null;
    let count = 0;
    for (const c of [...around, ...around]) {
      if (c >= 0.6 && state === 'low') count += 1;
      if (c >= 0.6) state = 'high';
      else if (c <= 0.4) state = 'low';
    }
    return count / 2;
  }

  it('resolves five lobes at the smallest size the brief allows', () => {
    expect(lobes(markCovers)).toBe(5);
    // DECOYS: a solid disc of the same reach resolves none, and six petals six.
    const C = MARK.grid / 2;
    expect(lobes((u, v) => Math.hypot(u - C, v - C) <= MARK.reach)).toBe(0);
    const six = (u: number, v: number): boolean =>
      Array.from({ length: 6 }, (_, k) => (k * Math.PI) / 3).some(
        (a) => Math.hypot(u - (C + 7.6 * Math.sin(a)), v - (C - 7.6 * Math.cos(a))) <= 3.8,
      );
    expect(lobes(six)).toBe(6);
  });

  it('says its cuts are sub-pixel there, and draws the mark anyway', () => {
    // Nothing is claimed about the ring, the stamens or the seams at 16 px.
    expect(narrowestFeature(MARK_MIN_SIZE)).toBeLessThan(1);
    const tree = draw(<Mark size={MARK_MIN_SIZE} label="Irodora" />);
    expect(tree.getByRole('image', { name: 'Irodora' })).toBeTruthy();
    expect(tree.UNSAFE_queryAllByType('RNSVGCircle' as never)).toHaveLength(MARK.petals + 1);
  });
});

describe('the lockup', () => {
  it('sets the name beside the mark', () => {
    const tree = draw(<Wordmark />);
    expect(tree.getByText('Irodora')).toBeTruthy();
  });

  it('announces the name once, not twice', () => {
    // The word is real text, so the mark beside it is decorative. A labelled mark in a lockup
    // makes a screen reader say the product name twice.
    const tree = draw(<Wordmark />);
    expect(tree.queryAllByLabelText('Irodora')).toHaveLength(0);
  });

  it('renders in both themes', () => {
    for (const theme of ['light', 'dark'] as const)
      expect(draw(<Wordmark />, theme).getByText('Irodora')).toBeTruthy();
  });

  it('sets the name in the serif, as Latin, at the measured weight (ADR-0112)', () => {
    // The wordmark 01 and 14 draw is Gelasio-shaped; the name is Latin in both locales, so it is
    // never routed to the gothic the way a page's Japanese text is.
    const style: unknown = draw(<Wordmark />).getByText('Irodora').props['style'];
    const flat = (
      Array.isArray(style) ? Object.assign({}, ...(style as object[])) : style
    ) as Record<string, unknown>;
    expect(flat['fontFamily']).toBe(nativeFamilies.serif);
    expect(flat['fontWeight']).toBe(nativeFaces.serif.fontWeight);
  });
});
