/**
 * The arc's geometry, checked against the circle rather than against itself (F-266's review, S3).
 *
 * The ring and the dial tests compare their fill with `sweepPath` and `sweepLength`, which would
 * agree with any mistake in either. Here the path `sweepPath` writes is PARSED: its start, every arc
 * command's flags and radius, and every endpoint are recomputed from the circle's own formula, and
 * the angle swept is recovered from the endpoints and summed. `sweepLength` is held to 2πr written
 * out.
 */

import { sweepLength, sweepPath } from '../src/index.js';

interface Arc {
  readonly rx: number;
  readonly ry: number;
  readonly rotation: number;
  readonly large: number;
  readonly clockwise: number;
  readonly x: number;
  readonly y: number;
}

/** `M x y A rx ry rot large sweep x y …`, as numbers. */
function parse(d: string): { readonly start: readonly [number, number]; readonly arcs: Arc[] } {
  const [move, ...rest] = d.split('A');
  const m = /^M(-?[\d.]+) (-?[\d.]+)$/u.exec(move ?? '');
  if (m === null) throw new Error(`not a move: ${String(move)}`);
  const arcs = rest.map((part) => {
    const n = part.trim().split(/\s+/u).map(Number);
    if (n.length !== 7 || n.some((v) => !Number.isFinite(v)))
      throw new Error(`not an arc: ${part}`);
    const [rx, ry, rotation, large, clockwise, x, y] = n as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    return { rx, ry, rotation, large, clockwise, x, y };
  });
  return { start: [Number(m[1]), Number(m[2])], arcs };
}

/** The angle of a point on the circle: degrees clockwise from 12 o'clock, in [0, 360). */
const angleOf = (cx: number, cy: number, x: number, y: number): number =>
  ((((Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI) % 360) + 360) % 360;

/** The angle each arc sweeps, clockwise, from its start to its end. */
function swept(cx: number, cy: number, d: string): number[] {
  const { start, arcs } = parse(d);
  let from = angleOf(cx, cy, start[0], start[1]);
  return arcs.map((a) => {
    const to = angleOf(cx, cy, a.x, a.y);
    const delta = (((to - from) % 360) + 360) % 360;
    from = to;
    return delta;
  });
}

describe('sweepPath draws the sweep it is asked for, on the circle it is asked for', () => {
  const RING = { c: 62.75 + 4, r: 62.75 };

  it('starts a ring at 12 o’clock: (c, c − r)', () => {
    const { start } = parse(sweepPath(RING.c, RING.c, RING.r, 0, 360));
    expect(start[0]).toBeCloseTo(RING.c, 3);
    expect(start[1]).toBeCloseTo(RING.c - RING.r, 3);
  });

  it('draws a whole ring as clockwise minor arcs that close where they began', () => {
    const d = sweepPath(RING.c, RING.c, RING.r, 0, 360);
    const { start, arcs } = parse(d);
    expect(arcs.length).toBeGreaterThanOrEqual(3);
    for (const a of arcs) {
      expect([a.rx, a.ry, a.rotation, a.large, a.clockwise]).toStrictEqual([
        RING.r,
        RING.r,
        0,
        0,
        1,
      ]);
      // Every endpoint is on the circle.
      expect(Math.hypot(a.x - RING.c, a.y - RING.c)).toBeCloseTo(RING.r, 2);
    }
    const end = arcs.at(-1);
    expect(end?.x).toBeCloseTo(start[0], 3);
    expect(end?.y).toBeCloseTo(start[1], 3);
    // The angles swept add up to the whole turn, and no arc is a half: the ambiguous case.
    const each = swept(RING.c, RING.c, d);
    expect(each.reduce((a, b) => a + b, 0)).toBeCloseTo(360, 1);
    for (const delta of each) expect(delta).toBeLessThan(180);
  });

  it('draws the dial’s 276° from its left end, 222°, to 138°', () => {
    const c = 41.5 + 3;
    const d = sweepPath(c, c, 41.5, 222, 276);
    const { start, arcs } = parse(d);
    expect(angleOf(c, c, start[0], start[1])).toBeCloseTo(222, 1);
    const end = arcs.at(-1);
    expect(end === undefined ? NaN : angleOf(c, c, end.x, end.y)).toBeCloseTo(138, 1);
    expect(swept(c, c, d).reduce((a, b) => a + b, 0)).toBeCloseTo(276, 1);
    // DECOY: 11's own drawn arc, 249°, is not what the path covers.
    expect(swept(c, c, d).reduce((a, b) => a + b, 0)).not.toBeCloseTo(249, 0);
  });

  it('closes a ring of any radius, with no half-arc to shorten it', () => {
    for (const r of [27.123456, 10.05, 99.999]) {
      const each = swept(r + 5, r + 5, sweepPath(r + 5, r + 5, r, 0, 360));
      expect(each.reduce((a, b) => a + b, 0)).toBeCloseTo(360, 1);
    }
  });

  it('refuses a sweep of nothing or of more than a turn, and takes a whole turn', () => {
    for (const bad of [0, -10, 360.0001, Number.NaN])
      expect(() => sweepPath(10, 10, 5, 0, bad)).toThrow(RangeError);
    expect(() => sweepPath(10, 10, 5, 0, 360)).not.toThrow();
  });
});

describe('sweepLength is the arc’s length on the circle', () => {
  it('is the circumference, 2πr, for a whole turn', () => {
    for (const r of [62.75, 41.5, 1]) expect(sweepLength(r, 360)).toBeCloseTo(2 * Math.PI * r, 9);
  });

  it('is the turn’s share of it for a part', () => {
    expect(sweepLength(41.5, 276)).toBeCloseTo((2 * Math.PI * 41.5 * 276) / 360, 9);
    // DECOY: degrees taken for radians would be 41.5 × 276.
    expect(sweepLength(41.5, 276)).not.toBeCloseTo(41.5 * 276, 0);
  });
});
