import { describe, expect, it } from 'vitest';

import { CardError } from '../src/card.js';
import { patchRegions, projection, type Corners } from '../src/locate.js';
import { CONSTRUCTED_CARD } from './fixture.js';

/** A square, seen face-on. */
const SQUARE: Corners = [
  { x: 0, y: 0 },
  { x: 600, y: 0 },
  { x: 600, y: 400 },
  { x: 0, y: 400 },
];

/** The same card seen at an angle: the right-hand edge is further away and so shorter. */
const TRAPEZOID: Corners = [
  { x: 100, y: 100 },
  { x: 700, y: 180 },
  { x: 700, y: 420 },
  { x: 100, y: 500 },
];

/** A genuinely perspective view — the far edge is both shorter AND converging. */
const PERSPECTIVE: Corners = [
  { x: 0, y: 0 },
  { x: 600, y: 150 },
  { x: 600, y: 250 },
  { x: 0, y: 400 },
];

describe('the projective map', () => {
  it('is exact at all four corners, which is what a projection guarantees', () => {
    const project = projection(PERSPECTIVE);
    const at = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ] as const;

    for (const [index, [u, v]] of at.entries()) {
      const expected = PERSPECTIVE[index];
      const actual = project(u, v);
      expect(actual.x).toBeCloseTo(expected?.x ?? 0, 9);
      expect(actual.y).toBeCloseTo(expected?.y ?? 0, 9);
    }
  });

  it('degenerates to the affine case for a parallelogram, without a special caller', () => {
    const project = projection(SQUARE);
    // Halfway along in both axes is the centre, exactly, when there is no perspective.
    expect(project(0.5, 0.5).x).toBeCloseTo(300, 9);
    expect(project(0.5, 0.5).y).toBeCloseTo(200, 9);
  });

  it('DIFFERS from bilinear interpolation, which is the whole reason it exists', () => {
    /*
     * The decoy. Bilinear interpolation of the four corners is the obvious implementation and
     * agrees with the projection at the corners, so a test that only checked corners would
     * pass for both. It disagrees in the MIDDLE, which is where the patches are.
     */
    const project = projection(PERSPECTIVE);
    const bilinear = (u: number, v: number) => {
      const top = { x: (1 - u) * 0 + u * 600, y: (1 - u) * 0 + u * 150 };
      const bottom = { x: (1 - u) * 0 + u * 600, y: (1 - u) * 400 + u * 250 };
      return { x: (1 - v) * top.x + v * bottom.x, y: (1 - v) * top.y + v * bottom.y };
    };

    const centre = project(0.5, 0.5);
    const naive = bilinear(0.5, 0.5);
    const drift = Math.hypot(centre.x - naive.x, centre.y - naive.y);

    // Tens of pixels on a 600-pixel card: the difference between sampling a patch and
    // sampling the border beside it.
    expect(drift).toBeGreaterThan(10);
  });

  it('refuses corners that are collinear', () => {
    const flat: Corners = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 300, y: 0 },
    ];
    expect(() => projection(flat)).toThrow(CardError);
  });

  it('refuses a degenerate quad that reaches the AFFINE branch', () => {
    /*
     * A2, found in review. The projective branch has a collinearity refusal; the affine branch
     * had none, and `Σx = Σy = 0` is satisfiable by degenerate corner lists — four identical
     * points, or four on a line arranged to cancel. Those were accepted, and `patchRegions`
     * then returned 24 identical regions. It was caught downstream by accident, when the
     * solver found no three dimensions in 24 reads of the same pixel — several layers from the
     * module that has an opinion about degeneracy.
     */
    const collapsed: Corners = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    expect(() => projection(collapsed)).toThrow(/enclose no area/u);

    const cancelling: Corners = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
    ];
    expect(() => projection(cancelling)).toThrow(CardError);
  });

  it('refuses a corner list that crosses over', () => {
    /*
     * A3, found in review. `Corners` order is part of the contract, and a bow-tie is what a
     * wrong order describes. The `w === 0` guard catches some of them; this one it did not,
     * and it mapped the card's CENTRE to (300, 1200) on a card 400 pixels tall — patch regions
     * confidently outside the card, sampled from whatever the camera saw there.
     */
    const bowTie: Corners = [
      { x: 0, y: 0 },
      { x: 600, y: 0 },
      { x: 100, y: 400 },
      { x: 500, y: 400 },
    ];
    expect(() => projection(bowTie)).toThrow(/cross over/u);
  });

  it('and the DECOY: every well-formed quad in this file is still accepted', () => {
    // Without this the two refusals above could be passing because the winding check rejects
    // everything, which would be a far worse bug than the one it fixes.
    for (const corners of [SQUARE, TRAPEZOID, PERSPECTIVE])
      expect(() => projection(corners)).not.toThrow();
  });

  it('refuses a corner that is not a finite point', () => {
    const broken: Corners = [
      { x: Number.NaN, y: 0 },
      { x: 600, y: 0 },
      { x: 600, y: 400 },
      { x: 0, y: 400 },
    ];
    expect(() => projection(broken)).toThrow(/finite/u);
  });
});

describe('patch regions', () => {
  it('gives one region per patch, inset inside its own cell', () => {
    const regions = patchRegions(CONSTRUCTED_CARD, SQUARE);
    expect(regions).toHaveLength(24);

    const first = regions[0];
    if (first === undefined) throw new Error('no regions');

    // Cell 0 spans x in [0, 100] and y in [0, 100] on a 600x400 card with a 6x4 grid.
    // An inset of 0.25 samples the middle half: x in [25, 75], y in [25, 75].
    expect(first.corners[0].x).toBeCloseTo(25, 9);
    expect(first.corners[0].y).toBeCloseTo(25, 9);
    expect(first.corners[2].x).toBeCloseTo(75, 9);
    expect(first.corners[2].y).toBeCloseTo(75, 9);
    expect(first.centre.x).toBeCloseTo(50, 9);
    expect(first.centre.y).toBeCloseTo(50, 9);
  });

  it('keeps every region inside the card, even under perspective', () => {
    const regions = patchRegions(CONSTRUCTED_CARD, TRAPEZOID);
    for (const region of regions)
      for (const corner of region.corners) {
        expect(corner.x).toBeGreaterThanOrEqual(100);
        expect(corner.x).toBeLessThanOrEqual(700);
        expect(corner.y).toBeGreaterThanOrEqual(100);
        expect(corner.y).toBeLessThanOrEqual(500);
      }
  });

  it('orders regions as the card orders its patches', () => {
    const regions = patchRegions(CONSTRUCTED_CARD, SQUARE);
    expect(regions.map((region) => region.id)).toEqual(
      CONSTRUCTED_CARD.patches.map((patch) => patch.id),
    );
  });
});
