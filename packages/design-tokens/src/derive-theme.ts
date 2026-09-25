/**
 * Two themes `15` draws as one swatch each, and the smallest move a gate forces (F-225).
 *
 * ## The rule, once
 *
 * ADR-0107: Slate Graphite and Obsidian Noir are **Sumi Charcoal's drawn steps re-anchored at
 * their own drawn grounds**. Each re-anchored token sits Sumi's OKLab lightness step above the
 * new ground, with Sumi's chroma and hue for that token; every other token is Sumi's value. F-289
 * wrote this arithmetic in an authoring tool (`mockups/tools/derive-theme.mjs`) to measure it;
 * it lives here now so the manifest, the gate and the tool run one implementation rather than
 * three that agree on the day they were written.
 *
 * ## The move, once
 *
 * R9-MOCKUP-FIDELITY §4 E3: where a blocking gate refuses a drawn value, the value moves by **the
 * smallest lightness step that passes, hue and chroma held**. §4's own rows were computed in CIE
 * L* (hue and chroma in CIELAB held); ADR-0107's in OKLab. Both are offered, the space is stated
 * with every move, and the search never judges a candidate itself — the caller passes the real
 * checker, so what "passes" means is decided in exactly one place.
 */

import {
  labToLch,
  lchToLab,
  labToXyz,
  oklchToXyz,
  srgbToXyz,
  xyzToLab,
  xyzToOklch,
} from '@irodora/color-spaces';
import { derivedSrgb, isInGamut, oklchToRgb } from './derive.js';
import type { ColorToken, ManifestOklch } from './manifest.js';

/**
 * The OKLCh of an sRGB hex, at full precision.
 *
 * How a README value enters the manifest EXACTLY: stored at this precision, `derivedSrgb` gives
 * the same hex back, so ADR-0043's check holds over a value nobody rounded by hand.
 */
export function hexToOklch(hex: string): ManifestOklch {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu.exec(hex);
  if (m === null) throw new TypeError(`hexToOklch: expected #RRGGBB, got ${JSON.stringify(hex)}`);
  const [, r, g, b] = m;
  const rgb = [r, g, b].map((x) => parseInt(x ?? '0', 16) / 255) as [number, number, number];
  const [l, c, h] = xyzToOklch(srgbToXyz(rgb));
  /*
   * WHITE COMES BACK AS L 1.0000000000000002 and a hue-less grey as C 1e-8 at an arbitrary hue:
   * float noise from the matrices, not colour. Clamped and snapped, so the stored value is the
   * colour the hex names — and the manifest's own [0, 1] check does not refuse the README's white.
   */
  const achromatic = c < 1e-6;
  return {
    l: Math.min(1, Math.max(0, l)),
    c: achromatic ? 0 : c,
    h: achromatic ? 0 : h,
  };
}

/** A token at a new OKLCh, its `srgb` derived from it, everything else as it was. */
export function withOklch(token: ColorToken, oklch: ManifestOklch, where: string): ColorToken {
  const moved: ColorToken = { ...token, oklch, srgb: '' };
  return { ...moved, srgb: derivedSrgb(where, moved) };
}

/**
 * One theme by ADR-0107's rule.
 *
 * `background` becomes the drawn ground exactly. Each token in `reanchor` keeps its lightness
 * STEP above the base's background, measured in OKLab L, and its own chroma and hue. Every other
 * token is the base's, untouched — which is what makes the result a derivation and not a design.
 */
export function reanchorTheme(
  base: Readonly<Record<string, ColorToken>>,
  ground: ManifestOklch,
  reanchor: readonly string[],
  where: string,
): Record<string, ColorToken> {
  const baseGround = base['background'];
  if (baseGround === undefined) throw new TypeError(`${where}: the base has no background`);

  const out: Record<string, ColorToken> = { ...base };
  out['background'] = withOklch(baseGround, ground, `${where}.background`);
  for (const name of reanchor) {
    if (name === 'background') continue;
    const token = base[name];
    if (token === undefined) throw new TypeError(`${where}: cannot re-anchor unknown "${name}"`);
    const l = ground.l + (token.oklch.l - baseGround.oklch.l);
    out[name] = withOklch(token, { ...token.oklch, l }, `${where}.${name}`);
  }
  return out;
}

/** The space a move is measured in — stated with every move, because §4 and ADR-0107 differ. */
export type MoveSpace = 'oklab' | 'cielab';

export interface MoveSearch {
  readonly token: ColorToken;
  readonly direction: 'lighter' | 'darker';
  readonly space: MoveSpace;
  /** The real checker, applied to a candidate. The search never decides "passes" itself. */
  readonly passes: (candidate: ColorToken) => boolean;
  readonly where: string;
}

/** OKLCh L in thousandths; CIE L* in tenths — each the grid its source measured on. */
const STEP: Readonly<Record<MoveSpace, number>> = { oklab: 0.001, cielab: 0.1 };

/** A whole lightness axis in either grid: 1000 thousandths of L, or 100 L* in tenths. */
const MAX_UNITS = 1000;

/** The candidate `step` grid units from the token, hue and chroma held in the chosen space. */
function candidateAt(token: ColorToken, space: MoveSpace, units: number): ManifestOklch | null {
  if (space === 'oklab') {
    const l = token.oklch.l + units * STEP.oklab;
    if (l < 0 || l > 1) return null;
    return { ...token.oklch, l };
  }
  const lch = labToLch(xyzToLab(oklchToXyz([token.oklch.l, token.oklch.c, token.oklch.h])));
  const lStar = lch[0] + units * STEP.cielab;
  if (lStar < 0 || lStar > 100) return null;
  const [l, c, h] = xyzToOklch(labToXyz(lchToLab([lStar, lch[1], lch[2]])));
  return { ...token.oklch, l, c, h };
}

/**
 * The smallest lightness move that passes, or `null` if none does before the gamut or the scale
 * runs out. A candidate outside sRGB is skipped, not clipped: a clipped colour is not the one the
 * rule said to move to.
 */
export function smallestLightnessMove(search: MoveSearch): ColorToken | null {
  const sign = search.direction === 'lighter' ? 1 : -1;
  for (let units = 1; units <= MAX_UNITS; units += 1) {
    const oklch = candidateAt(search.token, search.space, sign * units);
    if (oklch === null) return null;
    if (!isInGamut(oklchToRgb(oklch))) continue;
    const candidate = withOklch(search.token, oklch, search.where);
    if (search.passes(candidate)) return candidate;
  }
  return null;
}
