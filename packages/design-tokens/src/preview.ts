/**
 * The app-wide colour-vision preview's arithmetic (F-240, ADR-0131). Pure.
 *
 * Mockup `15` draws four modes: Standard, Protanopia, Deuteranopia, Tritanopia. React Native has
 * no whole-screen colour filter, so the preview simulates each colour where it enters the tree —
 * the token layer and the sample family — and lets the platform composite them. This module is
 * that simulation, and its only arithmetic is the engine's.
 *
 * ## One simulation: Machado at severity 1.0, for all three (ADR-0131 §1)
 *
 * `simulateAnomalous(rgb, deficiency, CVD_SEVERITY)`, never `simulateDichromacy`:
 *
 * - **Severity 1.0 is the model's dichromacy case**, in its authors' words, and the matrices
 *   Chrome publishes for its deuteranopia preview are these to three decimals (`preview.test`).
 * - **It commutes with compositing.** Machado's matrices act on encoded sRGB, so they are linear in
 *   the values the platform blends: simulating a translucent token and then compositing equals
 *   compositing and then simulating, up to clipping and 8-bit rounding. Viénot is a projection in
 *   linear light and would not commute — a token-layer Viénot preview would misstate every
 *   translucent paint. `preview.test` holds both halves.
 * - **The engine's tritan refusal is never reached.** `simulateDichromacy('tritan')` throws by
 *   design; this module does not call it, so Tritanopia is Machado's tritan, which its authors did
 *   not validate with tritanopes — the strip that labels the preview says so (ADR-0131 §2).
 *
 * ## The formats are the tokens' own
 *
 * `#RRGGBB`, `#RRGGBBAA` and `rgba(r, g, b, a)`, as the generated palettes and the samples carry
 * them. Each keeps its format and its alpha; only the colour moves. Anything else throws: a value
 * passed through unsimulated would be a colour the preview silently left alone.
 */

import { simulateAnomalous, type Deficiency } from '@irodora/cvd-engine';
import { CVD_SEVERITY } from './check.js';
import { toHex } from './derive.js';

/** The modes `15` draws, in its order. `standard` is no simulation at all. */
export const PREVIEW_MODES = ['standard', 'protanopia', 'deuteranopia', 'tritanopia'] as const;

export type PreviewMode = (typeof PREVIEW_MODES)[number];

/** Which deficiency each simulated mode runs. */
export const PREVIEW_DEFICIENCY: Readonly<Record<Exclude<PreviewMode, 'standard'>, Deficiency>> = {
  protanopia: 'protan',
  deuteranopia: 'deutan',
  tritanopia: 'tritan',
};

type Rgb = readonly [number, number, number];

const HEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/iu;
const RGBA = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([^)\s]+)\s*\)$/u;

const fromHex = (six: string): Rgb => {
  const n = Number.parseInt(six, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const byte = (v: number): number => Math.round(Math.min(1, Math.max(0, v)) * 255);

/**
 * One painted value, as the person with this deficiency would be shown it.
 *
 * `standard` returns its input untouched. `transparent` paints nothing, so it has nothing to
 * simulate. Any other format throws a `TypeError` rather than pass a colour through unsimulated.
 */
export function simulatePaint(css: string, mode: PreviewMode): string {
  if (mode === 'standard' || css === 'transparent') return css;
  const deficiency = PREVIEW_DEFICIENCY[mode];
  const simulate = (rgb: Rgb): Rgb => simulateAnomalous(rgb, deficiency, CVD_SEVERITY);

  const hex = HEX.exec(css);
  if (hex !== null) return `${toHex(simulate(fromHex(hex[1] ?? '')))}${hex[2] ?? ''}`;

  const rgba = RGBA.exec(css);
  if (rgba !== null) {
    const rgb: Rgb = [Number(rgba[1]) / 255, Number(rgba[2]) / 255, Number(rgba[3]) / 255];
    const [r, g, b] = simulate(rgb).map(byte);
    // The alpha as it was written: the preview moves the colour, never its opacity.
    return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${rgba[4] ?? ''})`;
  }

  throw new TypeError(
    `simulatePaint: "${css}" is not a format the tokens use (#RRGGBB, #RRGGBBAA, rgba()), so it ` +
      'cannot be simulated — and passing it through would leave a colour the preview claims to cover',
  );
}

/** Simulated palettes, once per source palette and mode, so identity is stable across renders. */
const CACHE = new Map<PreviewMode, WeakMap<object, Readonly<Record<string, string>>>>();

/**
 * A whole palette, simulated. `standard` returns the same object, so a reader that compares
 * identity sees nothing change; every other mode returns one memoised object per source palette.
 */
export function simulatePalette<T extends Readonly<Record<string, string>>>(
  colors: T,
  mode: PreviewMode,
): T {
  if (mode === 'standard') return colors;
  let byPalette = CACHE.get(mode);
  if (byPalette === undefined) {
    byPalette = new WeakMap();
    CACHE.set(mode, byPalette);
  }
  const cached = byPalette.get(colors);
  if (cached !== undefined) return cached as T;
  const simulated = Object.fromEntries(
    Object.entries(colors).map(([token, value]) => [token, simulatePaint(value, mode)]),
  ) as T;
  byPalette.set(colors, simulated);
  return simulated;
}
