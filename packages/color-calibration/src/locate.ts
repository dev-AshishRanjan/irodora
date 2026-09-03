/**
 * Where each patch is in the frame — a projective transform, not an interpolation.
 *
 * ## Why this is not "detect the card"
 *
 * FR-16 says *detect the card, locate patches*. Detecting a quadrilateral in an arbitrary
 * photograph is image processing, and doing it badly is worse than not doing it: a
 * mis-detected card produces a **correction**, and a wrong correction is applied silently to
 * every subsequent reading. The design instead has the person align the card to an on-screen
 * guide, which gives four corners for free and to better accuracy than a detector would.
 *
 * What then has to be established is that a card is really there and the right way up. That is
 * `verify.ts`, and it works from the patch VALUES rather than from edges — a check with a real
 * refusal that needs no image processing at all.
 *
 * ## Bilinear interpolation of the corners is the wrong answer, and it looks right
 *
 * A card photographed at an angle is a **perspective** projection: parallel lines converge, and
 * cells further from the camera are smaller on the sensor. Interpolating linearly between the
 * corners spaces the cells evenly, so the far cells land progressively off-centre — sampling
 * partly the patch and partly its border. The error is zero at the corners and largest in the
 * middle, which is exactly where nobody looks for it, and the result is a plausible wrong
 * colour rather than an obvious failure.
 *
 * So this is the closed-form unit-square-to-quadrilateral homography (Heckbert). It is exact
 * at the four corners by construction and correct in between, and it degenerates to the affine
 * case on its own when the quad is a parallelogram.
 */

import { CardError, assertCard, type ReferenceCard } from './card.js';

/** A point in frame pixel coordinates. Origin top-left, x right, y down. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * The card's four corners in the frame, **in printed order**: top-left, top-right,
 * bottom-right, bottom-left, as the card reads when it is the right way up.
 *
 * Order is part of the contract rather than something inferred. A corner list sorted by
 * position cannot tell a card rotated 180° from one the right way up — both give the same four
 * points — and guessing here would silently transpose every patch.
 */
export type Corners = readonly [Point, Point, Point, Point];

/** Where one patch is, and the region to sample for it. */
export interface PatchRegion {
  readonly id: string;
  /** The centre of the patch, for a sampler that wants one point. */
  readonly centre: Point;
  /** The inset region's four corners, same order as the card's. */
  readonly corners: Corners;
}

/**
 * The projective map from the unit square to a quadrilateral.
 *
 * `(0,0) → corners[0]`, `(1,0) → corners[1]`, `(1,1) → corners[2]`, `(0,1) → corners[3]`.
 * Returned as a closure because callers map many points through one card, and recomputing the
 * coefficients per patch would be arithmetic nobody asked for.
 */
export function projection(corners: Corners): (u: number, v: number) => Point {
  const [p0, p1, p2, p3] = corners;

  for (const point of corners)
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
      throw new CardError('a corner is not a finite point');

  /*
   * THE QUAD MUST BE SIMPLE AND CONSISTENTLY WOUND.
   *
   * The order of `Corners` is part of the contract rather than something inferred, and a list
   * given in the wrong order describes a bow-tie rather than a card. Some of those are caught
   * by the singularity check below; `[TL, TR, BL, BR]` is not, and it maps the card's centre to
   * `(300, 1200)` on a card 400 pixels tall — regions confidently outside the card, sampled
   * from whatever the camera happened to see there.
   *
   * A simple quadrilateral has all four edge cross-products of the same sign. Checking that is
   * three multiplications and it turns a plausible wrong answer into a refusal.
   */
  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const current = corners[i] ?? p0;
    const next = corners[(i + 1) % 4] ?? p0;
    const after = corners[(i + 2) % 4] ?? p0;
    const cross =
      (next.x - current.x) * (after.y - next.y) - (next.y - current.y) * (after.x - next.x);
    if (cross === 0) continue;
    const direction = cross > 0 ? 1 : -1;
    if (sign === 0) sign = direction;
    else if (sign !== direction)
      throw new CardError(
        'the four corners are not a simple quadrilateral — they cross over. They must be given ' +
          'in printed order: top-left, top-right, bottom-right, bottom-left.',
      );
  }

  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;

  let a: number;
  let b: number;
  let d: number;
  let e: number;
  let g: number;
  let h: number;

  if (sx === 0 && sy === 0) {
    /*
     * A parallelogram: `g` and `h` are zero and the map is affine.
     *
     * This branch is an OPTIMISATION, not a necessity — an earlier comment here claimed the
     * general formula "divides by a determinant that is zero", which is false. That determinant
     * is the cross product of two edge vectors and is −240000 for the square fixture; the
     * projective branch would compute g = h = 0 and give the identical answer. Saying so
     * matters, because a reader told the branch is load-bearing will not delete it when it
     * should be, and will not check it as carefully as a branch that computes an answer.
     */
    a = p1.x - p0.x;
    b = p3.x - p0.x;
    d = p1.y - p0.y;
    e = p3.y - p0.y;
    g = 0;
    h = 0;

    // The projective branch refuses a degenerate quad and this one must too. `Σx = Σy = 0` is
    // satisfiable by four collinear or four identical points, and without this they are
    // accepted — mapping all 24 patch regions onto the same spot, which is then caught only by
    // accident, several layers away, when the solver finds no three dimensions to fit.
    if (a * e - b * d === 0) throw new CardError('the four corners enclose no area');
  } else {
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const determinant = dx1 * dy2 - dx2 * dy1;

    // Zero means three corners are collinear — a degenerate quad, which is a card seen exactly
    // edge-on or a corner list somebody built wrong. There is no correct answer to return.
    if (determinant === 0) throw new CardError('the four corners are degenerate (collinear)');

    g = (sx * dy2 - dx2 * sy) / determinant;
    h = (dx1 * sy - sx * dy1) / determinant;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
  }

  const c = p0.x;
  const f = p0.y;

  return (u, v) => {
    const w = g * u + h * v + 1;
    // A point on the horizon line of the projection. Inside the unit square this cannot happen
    // for a quad a camera actually saw, so it means the corners describe an impossible view.
    if (w === 0) throw new CardError(`the projection is singular at (${String(u)}, ${String(v)})`);
    return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w };
  };
}

/**
 * Every patch's sampling region, in frame coordinates.
 *
 * The card's grid is walked in the unit square and each cell is mapped through the projection,
 * so the perspective is applied once, to the geometry, rather than approximated per patch.
 */
export function patchRegions(card: ReferenceCard, corners: Corners): readonly PatchRegion[] {
  assertCard(card);
  const project = projection(corners);

  return card.patches.map((patch) => {
    const [column, row] = patch.at;
    const left = (column + card.inset) / card.columns;
    const right = (column + 1 - card.inset) / card.columns;
    const top = (row + card.inset) / card.rows;
    const bottom = (row + 1 - card.inset) / card.rows;

    return {
      id: patch.id,
      centre: project((column + 0.5) / card.columns, (row + 0.5) / card.rows),
      corners: [
        project(left, top),
        project(right, top),
        project(right, bottom),
        project(left, bottom),
      ] as const,
    };
  });
}
