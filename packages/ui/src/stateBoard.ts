/**
 * Board `27`'s scale, and the dimensions F-236 builds its four states from (ADR-0128 §1–§3).
 *
 * `27` is a board: it draws four cards at no screen's scale (`dpPerPx: null`). F-236 found its
 * scale in the drawing itself — **0.973 dp per px**, the median of its 13 text elements' ems against
 * their roles' steps — and every drawn dimension here is the inventory's reading times that scale:
 *
 * - a SIZE (a ring, a plate, a line) snapped to the half dp, as `BUTTON_HEIGHT` and `BADGE_HEIGHT`
 *   are;
 * - an INTERVAL (a padding, a gap) snapped to the R9 spacing scale (§2), and named here by its step.
 *
 * Type is not here: it takes its role's step (P3). The numbers are written out, not computed, so a
 * reader sees what ships; `progress-ring.test` and `states.test` recompute each one from
 * `mockups/inventory/27.json`, so a re-read of the board that moves one fails until this moves too.
 */

import type { SpacingStep } from './layout.js';

/** dp per px on board 27 (ADR-0128 §1). */
export const STATE_BOARD_K = 0.973;

/**
 * The working ring (`27.lens-working.progress`): its outer diameter and its stroke, in dp —
 * `(2 · radiusPx + strokePx) · k` and `strokePx · k`, each to the half dp.
 */
export const STATE_RING = { size: 132.5, stroke: 7 } as const;

/**
 * A state card's intervals, as steps of the R9 scale (ADR-0128 §2). The card is padded on every
 * side alike; its picture sits `pictureTop` below that; the steps `stepsTop` under the ring and
 * `stepGap` apart; the title `titleTop` under what is above it and the body `bodyTop` under the
 * title; and the action at the foot, over a spacer of at least `actionMin`.
 */
export const STATE_LAYOUT = {
  padding: 'md',
  pictureTop: 'xxl',
  stepsTop: 'xl',
  stepGap: 'sm',
  titleTop: 'xl',
  bodyTop: 'md',
  actionMin: 'xxl',
} as const satisfies Readonly<Record<string, SpacingStep>>;

/** Each state's picture and its parts, in dp (ADR-0128 §3). */
export const STATE_PICTURES = {
  /** `27.wardrobe-empty.art`: the hanger's width, and its line. */
  hanger: { width: 168.5, stroke: 2 },
  /** `27.lens-working.mark`: the blossom's grid, twice its reach. */
  mark: { size: 51 },
  /**
   * `27.lens-working.glow`: a disc of `radius` at `alpha` of the mark's ink, blurred by `sigma`
   * (`glow-fit.mjs --radial`), drawn out to `reach`, where it falls under one level.
   */
  glow: { alpha: 0.296, radius: 29.5, sigma: 7.86, reach: 44.5 },
  /** `27.lens-working.step-1` and `-2`: the chips' height. */
  step: { height: 28 },
  /** `27.lens-refused.icon`: the plate, its edge, and the glyph inside it with its line. */
  plate: { size: 95, edge: 3, radius: 'lg', glyph: 67, stroke: 2.5 },
  /** `27.lens-permission.icon`: the camera glyph's box and its line. */
  camera: { size: 121.5, stroke: 3.5 },
  /** The action's drawn height (`27.*.scan`, `.retry`, `.settings`). */
  action: { height: 45 },
} as const;

/** exp(−x) · I0(x) for x ≥ 0 (Abramowitz and Stegun 9.8.1 and 9.8.2; |error| < 2e-7). */
function besselI0e(x: number): number {
  if (x <= 3.75) {
    const t = (x / 3.75) ** 2;
    return (
      (1 +
        t *
          (3.5156229 +
            t *
              (3.0899424 + t * (1.2067492 + t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))))) *
      Math.exp(-x)
    );
  }
  const t = 3.75 / x;
  return (
    (0.39894228 +
      t *
        (0.01328592 +
          t *
            (0.00225319 +
              t *
                (-0.00157565 +
                  t *
                    (0.00916281 +
                      t *
                        (-0.02057706 + t * (0.02635537 + t * (-0.01647633 + t * 0.00392377)))))))) /
    Math.sqrt(x)
  );
}

/**
 * The share of a Gaussian kernel of deviation `sigma`, centred `r` from a disc's centre, that falls
 * inside a disc of `radius` — the glow's profile, as `glow-fit.mjs --radial` models and fits it.
 */
export function blurredDisc(r: number, radius: number, sigma: number): number {
  if (radius <= 0) return 0;
  const steps = 240;
  const h = radius / steps;
  const s2 = sigma * sigma;
  let sum = 0;
  for (let i = 0; i <= steps; i += 1) {
    const rho = i * h;
    const w = i === 0 || i === steps ? 0.5 : 1;
    sum += w * (rho / s2) * Math.exp(-((r - rho) ** 2) / (2 * s2)) * besselI0e((r * rho) / s2);
  }
  return sum * h;
}

/** The glow's opacity at `r` dp from its centre: the disc, blurred, at its strength. */
export function glowAt(
  r: number,
  glow: {
    readonly alpha: number;
    readonly radius: number;
    readonly sigma: number;
  } = STATE_PICTURES.glow,
): number {
  return glow.alpha * blurredDisc(r, glow.radius, glow.sigma);
}

/** One of the glow's discs: its radius, and the fill opacity it is drawn at. */
export interface GlowDisc {
  readonly r: number;
  readonly opacity: number;
}

/**
 * The glow as concentric discs of the mark's tint, each at a FILL OPACITY, outermost first.
 *
 * Not a gradient with translucent stops: a stop's opacity is folded into its colour, and a
 * translucent colour is not the token it was mixed from (F-232's review, M6) — so a gradient would
 * paint colours no token holds. A disc at a fill opacity paints the token itself, at an opacity
 * stated beside it, which is how every other translucent fill here is drawn. Each disc's opacity is
 * solved so the discs over a point compose to the glow's own opacity there, band by band: at
 * `step` = 0.5 dp a band moves the card by about one level of the mark's ink.
 */
export function glowDiscs(
  glow: {
    readonly alpha: number;
    readonly radius: number;
    readonly sigma: number;
    readonly reach: number;
  } = STATE_PICTURES.glow,
  step = 0.5,
): readonly GlowDisc[] {
  const out: GlowDisc[] = [];
  let below = 0;
  for (let r = glow.reach; r > 0; r -= step) {
    // The band inside this disc and outside the next is read at its middle.
    const target = glowAt(Math.max(0, r - step / 2), glow);
    const opacity = 1 - (1 - target) / (1 - below);
    out.push({ r, opacity: Math.round(opacity * 1e6) / 1e6 });
    below = target;
  }
  return out;
}
