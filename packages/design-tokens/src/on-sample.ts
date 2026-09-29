/**
 * E3, applied per sample (F-233, ADR-0116).
 *
 * R9-MOCKUP-FIDELITY §4 E3 says a token that fails a blocking floor on the surface it is drawn on
 * moves the smallest lightness step that passes, with hue and chroma held. The manifest applies it
 * per THEME, because a theme's surfaces are known when the manifest is built.
 *
 * A colour sample is not known until it is drawn. It is a corpus entry, a garment or a reading, so
 * two things drawn against one need the same rule applied per sample:
 * - the text set on it, at SC 1.4.3's 4.5:1 (C8);
 * - the line around it, at SC 1.4.11's 3:1. WCAG does not require this one: 1.4.11 exempts a
 *   presentation that is essential to the information, and a sample's colour is. It is the
 *   product's own guarantee (F-068, ACCESSIBILITY.md §5), held at 1.4.11's ratio.
 *
 * Each starts from what the mockup draws:
 * - for text, the two inks `foreground` and `inverse.foreground`, the better of which is taken
 *   unmoved when it passes;
 * - for the edge, the README keyline composited over the well, or the well itself where no keyline
 *   is drawn, so the line appears only where the sample would otherwise lose its edge.
 *
 * Only when nothing drawn passes does a colour move:
 * 1. **By lightness** — the search the manifest's moves use (`smallestLightnessMove`, OKLab, 0.001
 *    steps), over every candidate and both directions. Fewest steps wins; an exact tie goes to the
 *    smaller ΔE00 from where it started, then to the candidate that contrasted better unmoved, then
 *    to lighter.
 * 2. **If no lightness move reaches, ADR-0111 §5's freedom, taken E3's way**: hue held, the
 *    candidate gives up chroma on §5's grid (fiftieths of its own, down to 0.2), and at the least
 *    it has to give up, the smallest lightness move. Each candidate is tried; fewer steps wins.
 *    §5 as the generator runs it ranks a whole grid by ΔE00 (`settleSeparation`); that costs 0.6 s
 *    per sample interpreted, which a render cannot spend, and E3's order — lightness first, the
 *    least else — is the one a per-sample move owes.
 *
 * **Whether step 1 always finds a move is a question of reach**, not of pure white and black: a
 * move holds chroma, so it cannot get to either. Every sample luminance is covered exactly when
 * √((Y_max + 0.05) / (Y_min + 0.05)) clears the floor over the colours the moves can reach.
 * `on-sample.test` asserts it for the four palettes (text 4.54–4.56, edge 4.43–4.58), so their
 * samples never need step 2. A device palette's inks carry more chroma, and on 222 of its 720 seeds
 * they reach only 4.46–4.49 for text, so step 2 is live there, and tested on every one of them.
 *
 * Pure, with no platform API: the app calls it at render and memoises by (sample, palette); the
 * gate calls it over every corpus colour.
 */

import { deltaE00, wcagContrast } from '@irodora/color-difference';
import { oklchToXyz, xyzToLab } from '@irodora/color-spaces';
import { hexToOklch, smallestLightnessMove } from './derive-theme.js';
import { compositeEncoded, isInGamut, oklchToRgb, toHex } from './derive.js';
import type { ColorToken, ManifestOklch } from './manifest.js';

/** The floors for what a sample carries: text (SC 1.4.3) and its edge (at SC 1.4.11's ratio). */
export const ON_SAMPLE_FLOOR = { text: 4.5, edge: 3 } as const;

export interface OnSample {
  /** The colour to draw, `#RRGGBB`. */
  readonly hex: string;
  /** Its WCAG contrast against the sample. */
  readonly contrast: number;
  /** Which candidate it started from (its index in `candidates`). */
  readonly from: number;
  /** Whether it was moved from that candidate. */
  readonly moved: boolean;
  /** How far its lightness moved, in 0.001 steps of OKLab L. */
  readonly steps: number;
  /**
   * The share of the candidate's chroma it kept: 1, unless no lightness move could reach and it
   * gave some up (step 2).
   */
  readonly chroma: number;
}

type Rgb = readonly [number, number, number];

const rgbOf = (hex: string): Rgb => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** CIELAB of a drawn hex: ΔE00 is taken between what is drawn, not between unquantised values. */
const labOf = (hex: string): readonly [number, number, number] => {
  const o = hexToOklch(hex);
  return xyzToLab(oklchToXyz([o.l, o.c, o.h]));
};

/**
 * A colour as React Native paints it over an opaque ground: `#RRGGBB` as it is, and a translucent
 * `rgba(...)` or `#RRGGBBAA` blended in encoded sRGB (`compositeEncoded`), which is how the
 * platforms blend and what the swatch edge proof measures.
 */
export function paintedOver(colour: string, ground: string): string {
  const g = rgbOf(ground);
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/u.exec(colour);
  if (rgba !== null) {
    const src: Rgb = [Number(rgba[1]) / 255, Number(rgba[2]) / 255, Number(rgba[3]) / 255];
    return toHex(compositeEncoded(src, Number(rgba[4]), g));
  }
  if (/^#[0-9a-f]{8}$/iu.test(colour))
    return toHex(
      compositeEncoded(rgbOf(colour.slice(0, 7)), Number.parseInt(colour.slice(7), 16) / 255, g),
    );
  return colour.toUpperCase();
}

/** A bare token for the search, which moves tokens: only its colour matters here. */
function asToken(hex: string): ColorToken {
  return {
    oklch: hexToOklch(hex),
    srgb: hex.toUpperCase(),
    role: 'on-sample',
    usage: 'nonText',
    pairsWith: [],
  };
}

const stepsBetween = (a: ManifestOklch, b: ManifestOklch): number =>
  Math.round(Math.abs(a.l - b.l) * 1000);

/** Below this chroma a colour has no hue to hold, and giving up chroma cannot help it. */
const ACHROMATIC = 1e-4;

type Direction = 'lighter' | 'darker';

/**
 * The directions in which a lightness move of `token` can pass at all. The far end of the axis is
 * the most a move in that direction can do, found in a few steps back from the end rather than a
 * walk of the axis: luminance rises with OKLab L at a fixed hue and chroma, so where the end does
 * not pass, nothing short of it does.
 */
function reachable(token: ColorToken, passes: (hex: string) => boolean): readonly Direction[] {
  const { l } = token.oklch;
  const out: Direction[] = [];
  for (const [direction, end] of [
    ['lighter', Math.floor((1 - l) * 1000)],
    ['darker', -Math.floor(l * 1000)],
  ] as const) {
    const sign = Math.sign(end);
    for (let units = end; units !== 0; units -= sign) {
      const rgb = oklchToRgb({ ...token.oklch, l: l + units * 0.001 });
      if (!isInGamut(rgb)) continue;
      if (passes(toHex(rgb))) out.push(direction);
      break;
    }
  }
  return out;
}

interface Move {
  readonly hex: string;
  readonly steps: number;
  /** ΔE00 from where it started, between drawn hexes: the tie-break. */
  readonly distance: number;
}

/** Whether `a` is the smaller move: fewer steps, then the smaller ΔE00. A tie keeps the first. */
const smaller = (a: Move, b: Move | null): boolean =>
  b === null || a.steps < b.steps || (a.steps === b.steps && a.distance < b.distance);

/**
 * The smallest lightness move of `token` that passes, in whichever direction takes fewer steps
 * (lighter first on a tie), measured from `start`: the candidate as drawn, which `token` is unless
 * it gave up chroma.
 */
function smallestMove(
  token: ColorToken,
  start: ColorToken,
  passes: (hex: string) => boolean,
  where: string,
): Move | null {
  let best: Move | null = null;
  for (const direction of reachable(token, passes)) {
    const moved = smallestLightnessMove({
      token,
      direction,
      space: 'oklab',
      passes: (candidate) => passes(candidate.srgb),
      where,
    });
    if (moved === null) continue;
    const hex = moved.srgb.toUpperCase();
    const move = {
      hex,
      steps: stepsBetween(start.oklch, moved.oklch),
      distance: deltaE00(labOf(hex), labOf(start.srgb)),
    };
    if (smaller(move, best)) best = move;
  }
  return best;
}

/**
 * ADR-0111 §5's freedom, taken E3's way. Hue held; the candidate gives up chroma on §5's grid —
 * 0.98 down to 0.2 of its own, in fiftieths — and at the first share where a lightness move can
 * reach, it takes the smallest one. Less chroma is walked, not more: more chroma narrows the gamut
 * at both ends of the lightness axis, so it only shrinks what a move can reach. `null` when the
 * candidate has no hue to hold, or 0.2 of its chroma still cannot reach.
 */
function givingUpChroma(
  token: ColorToken,
  passes: (hex: string) => boolean,
  where: string,
): (Move & { readonly share: number }) | null {
  const base = token.oklch;
  if (base.c < ACHROMATIC) return null;
  for (let fiftieths = 49; fiftieths >= 10; fiftieths -= 1) {
    const share = fiftieths / 50;
    const oklch = { ...base, c: base.c * share };
    const lessChroma = { ...token, oklch, srgb: toHex(oklchToRgb(oklch)) };
    const move = smallestMove(lessChroma, token, passes, where);
    if (move !== null) return { ...move, share };
  }
  return null;
}

/**
 * What to draw against `sampleHex`: the best candidate if it clears `floor`, else the smallest move
 * that does. Candidates are opaque `#RRGGBB` (composite a translucent one first, `paintedOver`).
 */
export function onSample({
  candidates,
  sampleHex,
  floor,
}: {
  readonly candidates: readonly string[];
  readonly sampleHex: string;
  readonly floor: number;
}): OnSample {
  if (candidates.length === 0) throw new TypeError('onSample: no candidate to start from');
  const sample = rgbOf(sampleHex);
  const contrastOf = (hex: string): number => wcagContrast(rgbOf(hex), sample);
  const passes = (hex: string): boolean => contrastOf(hex) >= floor;
  const where = `on-sample against ${sampleHex}`;

  // What is drawn, unmoved, where it passes: the better of the candidates. The sort is stable, so
  // equal contrasts keep the caller's order.
  const ranked = candidates
    .map((hex, from) => ({ hex: hex.toUpperCase(), from, contrast: contrastOf(hex) }))
    .sort((a, b) => b.contrast - a.contrast);
  const top = ranked[0];
  if (top === undefined) throw new TypeError('onSample: no candidate');
  if (top.contrast >= floor) return { ...top, moved: false, steps: 0, chroma: 1 };

  // 1. The smallest lightness move, over every candidate and both directions, visited in rank
  // order so an exact tie stays with the candidate that contrasted better unmoved.
  let best: (Move & { readonly from: number }) | null = null;
  for (const { hex, from } of ranked) {
    const token = asToken(hex);
    const move = smallestMove(token, token, passes, where);
    if (move !== null && smaller(move, best)) best = { ...move, from };
  }
  if (best !== null)
    return {
      hex: best.hex,
      from: best.from,
      moved: true,
      steps: best.steps,
      chroma: 1,
      contrast: contrastOf(best.hex),
    };

  // 2. No lightness move reaches: each candidate gives up the least chroma it must (ADR-0111 §5,
  // E3's way), and the smaller of those moves is drawn.
  let fallback: (Move & { readonly from: number; readonly share: number }) | null = null;
  for (const { hex, from } of ranked) {
    const move = givingUpChroma(asToken(hex), passes, where);
    if (move !== null && smaller(move, fallback)) fallback = { ...move, from };
  }
  if (fallback === null)
    throw new RangeError(`onSample: nothing clears ${String(floor)}:1 against ${sampleHex}`);
  return {
    hex: fallback.hex,
    from: fallback.from,
    moved: true,
    steps: fallback.steps,
    chroma: fallback.share,
    contrast: contrastOf(fallback.hex),
  };
}
