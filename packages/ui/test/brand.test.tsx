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
 * 5. **The lockups are 01's and 14's** (ADR-0123): the mark's ink and every interval recomputed
 *    from the inventories as ratios of the name's em, with F-226's lockup and the spacing snap as
 *    decoys; the figure's box is its ink, and it scales as one with the name.
 *
 * The rest is recorded as an attested criterion rather than pretended away.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render } from '@testing-library/react-native';
import {
  nativeColors,
  nativeFaces,
  nativeFamilies,
  nativeSpacing,
  nativeType,
} from '@irodora/design-tokens';
import {
  GELASIO,
  GOTHIC,
  LOCKUP_APP,
  LOCKUP_SPLASH,
  lockupGeometry,
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
  nameBoxFor,
  nameScaleOf,
  narrowestFeature,
  svgNumber,
  taglineScaleOf,
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

/* The lockups' readings: 01's row and 14's stack (F-230 increment 1). */
const ONE = join(__dirname, '..', '..', '..', 'mockups', 'inventory', '01.json');

interface Inventory {
  readonly frame: {
    readonly screens: readonly { readonly id: string; readonly dpPerPx: number }[];
  };
  readonly elements: readonly {
    readonly id: string;
    readonly component: string;
    readonly parent: string | null;
    readonly raw?: Readonly<Record<string, number>>;
  }[];
}
const inventory = (path: string): Inventory => JSON.parse(readFileSync(path, 'utf8')) as Inventory;
const rawOf = (from: Inventory, id: string): Readonly<Record<string, number>> => {
  const raw = from.elements.find((e) => e.id === id)?.raw;
  if (raw === undefined) throw new Error(`${id} has no readings`);
  return raw;
};
const numberOf = (raw: Readonly<Record<string, number>>, key: string): number => {
  const value = raw[key];
  if (value === undefined) throw new Error(`no reading ${key}`);
  return value;
};
const dpPerPxOf = (from: Inventory): number => {
  const [screen] = from.frame.screens;
  if (screen === undefined) throw new Error('no screen');
  return screen.dpPerPx;
};
/** A mark's ink width in px, from its fitted petals: the side petals sit at ±72° from the top. */
const markInkPx = (raw: Readonly<Record<string, number>>): number =>
  2 * (numberOf(raw, 'orbitPx') * Math.sin((2 * Math.PI) / MARK.petals) + numberOf(raw, 'petalPx'));

const one = inventory(ONE);
const fourteen = inventory(FOURTEEN);
const READ_01 = {
  dpPerPx: dpPerPxOf(one),
  mark: rawOf(one, '01.header.mark'),
  name: rawOf(one, '01.header.wordmark'),
};
const READ_14 = {
  dpPerPx: dpPerPxOf(fourteen),
  mark: rawOf(fourteen, '14.splash.mark'),
  name: rawOf(fourteen, '14.splash.wordmark'),
  tagline: rawOf(fourteen, '14.splash.tagline'),
};
/**
 * A ratio's error: the instrument's 0.3 px (twice for a width, which has two edges) over the em, plus
 * the constants' three places.
 */
const ratioTolerance = (edges: number, dpPerPx: number, em: number): number =>
  (edges * 0.3 * dpPerPx) / em + 0.0005;

describe('the lockups are 01’s and 14’s, measured (F-230, ADR-0123)', () => {
  const em01 = numberOf(READ_01.name, 'emDp');
  const em14 = numberOf(READ_14.name, 'emDp');
  const app = {
    markInk: (markInkPx(READ_01.mark) * READ_01.dpPerPx) / em01,
    gap: (numberOf(READ_01.name, 'markGapPx') * READ_01.dpPerPx) / em01,
  };
  const stack = {
    markInk: (markInkPx(READ_14.mark) * READ_14.dpPerPx) / em14,
    markGap: (numberOf(READ_14.name, 'markGapPx') * READ_14.dpPerPx) / em14,
    taglineGap: (numberOf(READ_14.tagline, 'gapAbovePx') * READ_14.dpPerPx) / em14,
  };
  const within = (value: number, reading: number, tolerance: number): boolean =>
    Math.abs(value - reading) <= tolerance;

  it('sets each name at the em its drawing measures (ADR-0121)', () => {
    expect(nativeType.latin.wordmark.fontSize).toBe(em01);
    expect(nativeType.latin.wordmarkSplash.fontSize).toBe(em14);
  });

  it('recomputes 01’s row — the mark’s ink and the interval — within the instrument’s error', () => {
    expect(within(LOCKUP_APP.markInk, app.markInk, ratioTolerance(2, READ_01.dpPerPx, em01))).toBe(
      true,
    );
    expect(within(LOCKUP_APP.interval, app.gap, ratioTolerance(1, READ_01.dpPerPx, em01))).toBe(
      true,
    );
  });

  it('recomputes 14’s stack — the mark’s ink and both intervals — within the instrument’s error', () => {
    const tolerance = ratioTolerance(1, READ_14.dpPerPx, em14);
    expect(
      within(LOCKUP_SPLASH.markInk, stack.markInk, ratioTolerance(2, READ_14.dpPerPx, em14)),
    ).toBe(true);
    expect(within(LOCKUP_SPLASH.markInterval, stack.markGap, tolerance)).toBe(true);
    expect(within(LOCKUP_SPLASH.taglineInterval, stack.taglineGap, tolerance)).toBe(true);
  });

  it('DECOY — F-226’s lockup (the mark an em wide, an eighth of one between) is not 01’s or 14’s', () => {
    expect(within(1, app.markInk, ratioTolerance(2, READ_01.dpPerPx, em01))).toBe(false);
    expect(within(1 / 8, app.gap, ratioTolerance(1, READ_01.dpPerPx, em01))).toBe(false);
    expect(within(1, stack.markInk, ratioTolerance(2, READ_14.dpPerPx, em14))).toBe(false);
  });

  it('DECOY — an interval snapped to the spacing scale is not the drawing’s, where the instrument can tell', () => {
    // 01 draws 10.0 dp, which R9 §2's snap would make `sm` (8): a fifth tighter, 4 px at 01's scale.
    expect(within(nativeSpacing.sm / em01, app.gap, ratioTolerance(1, READ_01.dpPerPx, em01))).toBe(
      false,
    );
    // 14 draws 32.5 dp over the name: `xl` (32) is 0.38 px away, outside the instrument's 0.3.
    expect(
      within(nativeSpacing.xl / em14, stack.markGap, ratioTolerance(1, READ_14.dpPerPx, em14)),
    ).toBe(false);
    // 14 draws 15.9 dp over the tagline, within the instrument of `md` (16): there the ratio and
    // the step agree, so no decoy can tell them apart and none is claimed. Asserted, so a re-reading
    // that moves it is seen.
    expect(
      within(nativeSpacing.md / em14, stack.taglineGap, ratioTolerance(1, READ_14.dpPerPx, em14)),
    ).toBe(true);
  });
});

/** The ink offsets of each member within its own box, at one scale — independent of the margins. */
function inkWithinBoxes(form: 'app' | 'splash', scale: number, taglineScale = scale) {
  const step = form === 'app' ? nativeType.latin.wordmark : nativeType.latin.wordmarkSplash;
  const em = step.fontSize * scale;
  const line = step.lineHeight * scale;
  const unit = em / GELASIO.unitsPerEm;
  const content = (GELASIO.ascender - GELASIO.descender) * unit;
  const baseline = (line - content) / 2 + GELASIO.ascender * unit;
  const box = markInkBox();
  const mark = lockupGeometry(form, scale, taglineScale).mark;
  const t = nativeType.japanese.title;
  const tEm = t.fontSize * taglineScale;
  const tLine = t.lineHeight * taglineScale;
  const tUnit = tEm / GOTHIC.unitsPerEm;
  const tBaseline =
    (tLine - (GOTHIC.ascender - GOTHIC.descender) * tUnit) / 2 + GOTHIC.ascender * tUnit;
  return {
    mark: {
      w: mark,
      h: mark,
      left: (box.left / MARK.grid) * mark,
      right: (box.right / MARK.grid) * mark,
      top: (box.top / MARK.grid) * mark,
      bottom: (box.bottom / MARK.grid) * mark,
    },
    name: {
      w: GELASIO.name.advance * unit,
      h: line,
      left: GELASIO.name.inkLeft * unit,
      right: GELASIO.name.inkRight * unit,
      top: baseline - GELASIO.name.inkTop * unit,
      bottom: baseline - GELASIO.name.inkBottom * unit,
    },
    tagline: {
      h: tLine,
      top: tBaseline - GOTHIC.faceTop * tUnit,
      bottom: tBaseline - GOTHIC.faceBottom * tUnit,
    },
  };
}

describe('the figure is its ink, and its members sit as drawn', () => {
  it('lays 01’s row out by its margins: the inks centred on one line, the interval between them', () => {
    for (const scale of [1, 1.5, 2]) {
      const g = lockupGeometry('app', scale);
      const inner = inkWithinBoxes('app', scale);
      const em = nativeType.latin.wordmark.fontSize * scale;
      // A row with alignItems flex-start: each box at its margins, left to right.
      const markX = g.markMargins.marginLeft;
      const nameX = markX + inner.mark.w + g.markMargins.marginRight + g.nameMargins.marginLeft;
      const markInk = {
        left: markX + inner.mark.left,
        right: markX + inner.mark.right,
        top: g.markMargins.marginTop + inner.mark.top,
        bottom: g.markMargins.marginTop + inner.mark.bottom,
      };
      const nameInk = {
        left: nameX + inner.name.left,
        right: nameX + inner.name.right,
        top: g.nameMargins.marginTop + inner.name.top,
        bottom: g.nameMargins.marginTop + inner.name.bottom,
      };
      expect(markInk.left).toBeCloseTo(0, 9);
      expect(markInk.right - markInk.left).toBeCloseTo(LOCKUP_APP.markInk * em, 9);
      expect(nameInk.left - markInk.right).toBeCloseTo(LOCKUP_APP.interval * em, 9);
      expect((markInk.top + markInk.bottom) / 2).toBeCloseTo((nameInk.top + nameInk.bottom) / 2, 9);
      // The row's box is the ink: as wide as mark to name, as tall as the taller ink, every member
      // the same height outside.
      const right = nameX + inner.name.w + g.nameMargins.marginRight;
      expect(right).toBeCloseTo(nameInk.right, 9);
      expect(right).toBeCloseTo(g.width, 9);
      expect(Math.min(markInk.top, nameInk.top)).toBeCloseTo(0, 9);
      expect(Math.max(markInk.bottom, nameInk.bottom)).toBeCloseTo(g.height, 9);
      for (const [margins, h] of [
        [g.markMargins, inner.mark.h],
        [g.nameMargins, inner.name.h],
      ] as const)
        expect(margins.marginTop + h + margins.marginBottom).toBeCloseTo(g.height, 9);
      // And the geometry reports what the layout produces.
      expect(g.ink.mark.top).toBeCloseTo(markInk.top, 9);
      expect(g.ink.name.left).toBeCloseTo(nameInk.left, 9);
    }
  });

  it('lays 14’s stack out by its margins: one axis, the two intervals between the inks', () => {
    for (const [scale, taglineScale] of [
      [1, 1],
      [1.76, 1.5],
    ] as const) {
      const g = lockupGeometry('splash', scale, taglineScale);
      const inner = inkWithinBoxes('splash', scale, taglineScale);
      const em = nativeType.latin.wordmarkSplash.fontSize * scale;
      // A column with alignItems centre: each member's outer box centred, top to bottom.
      let y = 0;
      const place = (
        margins: {
          marginTop: number;
          marginBottom: number;
          marginLeft?: number;
          marginRight?: number;
        },
        w: number,
        h: number,
      ) => {
        const outer = (margins.marginLeft ?? 0) + w + (margins.marginRight ?? 0);
        const x = (g.width - outer) / 2 + (margins.marginLeft ?? 0);
        const top = y + margins.marginTop;
        y = top + h + margins.marginBottom;
        return { x, top };
      };
      const markAt = place(g.markMargins, inner.mark.w, inner.mark.h);
      const nameAt = place(g.nameMargins, inner.name.w, inner.name.h);
      if (g.taglineMargins === undefined) throw new Error('the splash has a tagline');
      const taglineAt = place(g.taglineMargins, 0, inner.tagline.h);
      const markInk = {
        centre: markAt.x + (inner.mark.left + inner.mark.right) / 2,
        top: markAt.top + inner.mark.top,
        bottom: markAt.top + inner.mark.bottom,
      };
      const nameInk = {
        centre: nameAt.x + (inner.name.left + inner.name.right) / 2,
        top: nameAt.top + inner.name.top,
        bottom: nameAt.top + inner.name.bottom,
      };
      const taglineInk = {
        top: taglineAt.top + inner.tagline.top,
        bottom: taglineAt.top + inner.tagline.bottom,
      };
      expect(markInk.top).toBeCloseTo(0, 9);
      expect(markInk.centre).toBeCloseTo(g.width / 2, 9);
      expect(nameInk.centre).toBeCloseTo(g.width / 2, 9);
      expect(nameInk.top - markInk.bottom).toBeCloseTo(LOCKUP_SPLASH.markInterval * em, 9);
      expect(taglineInk.top - nameInk.bottom).toBeCloseTo(LOCKUP_SPLASH.taglineInterval * em, 9);
      // The column ends at the tagline's ink, and the geometry reports what the layout produces.
      expect(y).toBeCloseTo(taglineInk.bottom, 9);
      expect(y).toBeCloseTo(g.height, 9);
      expect(g.ink.tagline?.top).toBeCloseTo(taglineInk.top, 9);
    }
  });

  it('DECOY — a line box centred as a box is not the ink centred: the name’s ink sits high in its line', () => {
    // What `alignItems: 'center'` alone would draw. Gelasio's ascender carries the cap and the
    // ascenders; its descender a deep tail "Irodora" does not use.
    const inner = inkWithinBoxes('app', 1);
    const inkCentre = (inner.name.top + inner.name.bottom) / 2;
    expect(inner.name.h / 2 - inkCentre).toBeGreaterThan(2);
  });
});

/** Every node in a rendered tree whose props carry `key`. */
const withProp = (tree: ReturnType<typeof draw>, key: string) =>
  tree.UNSAFE_root.findAll((node) => typeof node.type === 'string' && key in node.props);

/** A style prop, flattened. */
const styleOf = (node: { props: Record<string, unknown> }): Record<string, unknown> => {
  const style: unknown = node.props['style'];
  return (
    Array.isArray(style) ? Object.assign({}, ...(style as object[])) : (style ?? {})
  ) as Record<string, unknown>;
};

const textLayout = (width: number, height: number) => ({
  nativeEvent: {
    lines: [
      { x: 0, y: 0, width, height, ascender: 0, descender: 0, capHeight: 0, xHeight: 0, text: '' },
    ],
  },
});

describe('the lockup, rendered', () => {
  it('sets each name at its measured step, in the serif, as Latin (ADR-0112, ADR-0121)', () => {
    for (const [form, step] of [
      ['app', nativeType.latin.wordmark],
      ['splash', nativeType.latin.wordmarkSplash],
    ] as const) {
      const tree =
        form === 'app'
          ? draw(<Wordmark form="app" />)
          : draw(<Wordmark form="splash" tagline="彩り・色の知性" />);
      const name = styleOf(tree.getByText('Irodora'));
      expect(name['fontSize']).toBe(step.fontSize);
      expect(name['fontFamily']).toBe(nativeFamilies.serif);
      expect(name['fontWeight']).toBe(nativeFaces.serif.fontWeight);
      expect(tree.UNSAFE_getByType(Mark).props['size']).toBeCloseTo(lockupGeometry(form).mark, 9);
    }
  });

  it('sets the splash tagline in the gothic at title, weight 400, as 14 records it', () => {
    const tree = draw(<Wordmark form="splash" tagline="彩り・色の知性" />);
    const tagline = styleOf(tree.getByText('彩り・色の知性'));
    expect(tagline['fontFamily']).toBe(nativeFamilies.jp);
    expect(tagline['fontSize']).toBe(nativeType.japanese.title.fontSize);
    expect(tagline['fontWeight']).toBe('400');
  });

  it('announces the name once, and as a heading only where asked', () => {
    // The word is real text, so the mark beside it is decorative: a labelled mark would say the
    // product name twice.
    const app = draw(<Wordmark form="app" heading />);
    expect(app.queryAllByLabelText('Irodora')).toHaveLength(0);
    expect(app.getByRole('header').props['children']).toBe('Irodora');
    const stack = draw(<Wordmark form="splash" tagline="彩り・色の知性" />);
    expect(stack.queryAllByLabelText('Irodora')).toHaveLength(0);
    expect(stack.queryAllByRole('header')).toHaveLength(0);
  });

  it('renders in both themes', () => {
    for (const theme of ['light', 'dark'] as const)
      expect(draw(<Wordmark form="app" />, theme).getByText('Irodora')).toBeTruthy();
  });

  it('scales as one figure: the mark and the intervals follow the name’s laid-out size (A7)', () => {
    const advance =
      (GELASIO.name.advance / GELASIO.unitsPerEm) * nativeType.latin.wordmark.fontSize;
    const tree = draw(<Wordmark form="app" />);
    expect(tree.UNSAFE_getByType(Mark).props['size']).toBeCloseTo(lockupGeometry('app').mark, 9);
    fireEvent(tree.getByText('Irodora'), 'textLayout', textLayout(advance * 1.5, 0));
    const scale = nameScaleOf('app', advance * 1.5);
    expect(scale).toBeCloseTo(1.5, 9);
    expect(tree.UNSAFE_getByType(Mark).props['size']).toBeCloseTo(
      lockupGeometry('app', 1.5).mark,
      9,
    );
    const nameBox = withProp(tree, 'style').find(
      (node) => styleOf(node)['marginLeft'] === lockupGeometry('app', scale).nameMargins.marginLeft,
    );
    expect(nameBox).toBeDefined();
  });

  it('DECOY — a line laid out at the drawn size moves nothing', () => {
    const advance =
      (GELASIO.name.advance / GELASIO.unitsPerEm) * nativeType.latin.wordmark.fontSize;
    const tree = draw(<Wordmark form="app" />);
    fireEvent(tree.getByText('Irodora'), 'textLayout', textLayout(advance, 0));
    expect(tree.UNSAFE_getByType(Mark).props['size']).toBeCloseTo(lockupGeometry('app').mark, 9);
  });

  it('follows the tagline’s own scale for its line, and the name’s for its interval', () => {
    const tree = draw(<Wordmark form="splash" tagline="彩り・色の知性" />);
    const height = nativeType.japanese.title.lineHeight * 1.5;
    fireEvent(tree.getByText('彩り・色の知性'), 'textLayout', textLayout(100, height));
    expect(taglineScaleOf(height)).toBeCloseTo(1.5, 9);
    const expected = lockupGeometry('splash', 1, taglineScaleOf(height)).taglineMargins;
    const box = withProp(tree, 'style').find(
      (node) => styleOf(node)['marginTop'] === expected?.marginTop,
    );
    expect(box).toBeDefined();
  });

  it('fits the width it is given: one line the platform shrinks, never breaks or clips (A7)', () => {
    for (const tree of [
      draw(<Wordmark form="app" />),
      draw(<Wordmark form="splash" tagline="彩り・色の知性" />),
    ]) {
      const name = tree.getByText('Irodora');
      expect(name.props['numberOfLines']).toBe(1);
      expect(name.props['adjustsFontSizeToFit']).toBe(true);
      // Still scaled to 200 %: the fit takes over only where the width runs out.
      expect(name.props['maxFontSizeMultiplier']).toBe(2);
    }
    // The row holds the name's box to its share of the width it is given, so the mark and the
    // interval beside it fit too.
    const tree = draw(<Wordmark form="app" />);
    const [row] = withProp(tree, 'onLayout');
    if (row === undefined) throw new Error('the row measures its width');
    fireEvent(row, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 40 } } });
    const held = withProp(tree, 'style').find((node) => 'maxWidth' in styleOf(node));
    expect(held === undefined ? undefined : styleOf(held)['maxWidth']).toBeCloseTo(
      nameBoxFor('app', 200),
      9,
    );
    const drawn = lockupGeometry('app');
    expect((nameBoxFor('app', 200) / drawn.nameBox) * drawn.width).toBeCloseTo(200, 9);
  });

  it('refuses by type what no drawing draws', () => {
    // @ts-expect-error — a lockup is one of the two drawn forms; there is no default.
    expect(() => draw(<Wordmark />)).toBeDefined();
    // @ts-expect-error — `size` is gone: each form's size is its drawing's.
    expect(() => draw(<Wordmark form="app" size="title" />)).toBeDefined();
    // @ts-expect-error — 01's row carries no tagline.
    expect(() => draw(<Wordmark form="app" tagline="彩り・色の知性" />)).toBeDefined();
    // @ts-expect-error — 14's stack carries one.
    expect(() => draw(<Wordmark form="splash" />)).toBeDefined();
    // @ts-expect-error — a splash is not a heading.
    expect(() => draw(<Wordmark form="splash" tagline="彩り・色の知性" heading />)).toBeDefined();
  });
});
