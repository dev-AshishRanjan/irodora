/**
 * Settle every contrast floor a palette fails, the E3 way (F-225, ADR-0107 d.4, ADR-0111).
 *
 * One rule, two callers. The manifest's derived themes (Slate Graphite, Obsidian Noir) are Sumi's
 * steps re-anchored at another ground, and a pairing that then fails moves by **the smallest
 * lightness step that passes, hue and chroma held, in that theme only** — computed here by the
 * generator and stored as moves the parser applies, so `--check` fails if the stored moves drift
 * from what the rule gives. The device colour (`seed.ts`) is the same situation at runtime: a tint
 * that lifts chroma can push a zero-margin value under its floor.
 *
 * Only the TEXT or non-text side ever moves; a surface is the thing the others are measured
 * against, and moving it would move every pairing at once. Tokens are settled one at a time in a
 * deterministic order, and each candidate is judged by `checkContrast` — the gate's own function.
 * Separation and salience are not searched jointly: a failure there is reported by the caller's
 * checks, never "fixed" by moving three tokens at once (E-098: the status triple is bound).
 */

import { deltaE00 } from '@irodora/color-difference';
import { oklchToXyz, xyzToLab } from '@irodora/color-spaces';
import { checkContrast, checkSalience, checkSeparation, type CheckableManifest } from './check.js';
import { isInGamut, oklchToRgb } from './derive.js';
import { smallestLightnessMove, withOklch } from './derive-theme.js';
import type { ColorToken, Manifest, ManifestOklch } from './manifest.js';

/**
 * Where "lighter" stops being the direction that gains contrast: WCAG's crossover at relative
 * luminance ≈ 0.179, which is OKLCh L ≈ 0.564 — not 0.5 (F-289's review measured it).
 */
export const CONTRAST_CROSSOVER_L = 0.564;

/** One token moved to meet a floor, and the pairing that forced it. */
export interface FloorMove {
  readonly token: string;
  readonly from: number;
  readonly to: number;
  /** The first failing pairing that forced the move, as the gate would print it. */
  readonly forcedBy: string;
}

/**
 * Move every token that fails a contrast floor in `theme`, mutating `colors`. Returns the moves in
 * the order made, or `null` when a floor cannot be met by a lightness move — the caller's checks
 * then report it.
 */
export function settleFloors(
  manifest: CheckableManifest,
  theme: string,
  colors: Record<string, ColorToken>,
): FloorMove[] | null {
  const moves: FloorMove[] = [];
  const failing = (palette: Record<string, ColorToken>) =>
    checkContrast(manifest, [theme], { [theme]: palette })
      .results.filter((r) => !r.passes)
      .sort((a, b) =>
        a.foreground === b.foreground
          ? a.background.localeCompare(b.background)
          : a.foreground.localeCompare(b.foreground),
      );
  for (let guard = Object.keys(colors).length; guard > 0; guard -= 1) {
    const [first] = failing(colors);
    if (first === undefined) return moves;
    const name = first.foreground;
    const token = colors[name];
    const ground = colors[first.background];
    if (token === undefined || ground === undefined || token.usage === 'surface') return null;
    const passes = (candidate: ColorToken): boolean =>
      !failing({ ...colors, [name]: candidate }).some(
        (r) => r.foreground === name || r.background === name,
      );
    const moved = smallestLightnessMove({
      token,
      direction: ground.oklch.l < CONTRAST_CROSSOVER_L ? 'lighter' : 'darker',
      space: 'oklab',
      passes,
      where: `${theme}.${name}`,
    });
    if (moved === null) return null;
    moves.push({
      token: name,
      from: token.oklch.l,
      to: moved.oklch.l,
      forcedBy: `${first.foreground} on ${first.background} ${first.wcag.toFixed(2)}:1 < ${String(first.required)}`,
    });
    colors[name] = moved;
  }
  return null;
}

/** A CVD separation move: lightness, and chroma only where lightness alone could not do it. */
export interface SeparationMove {
  readonly token: string;
  readonly l: number;
  readonly c: number;
  readonly forcedBy: string;
}

const lab = (o: ManifestOklch) => xyzToLab(oklchToXyz([o.l, o.c, o.h]));

/**
 * Settle every CVD pair a derived theme fails (F-225, ADR-0111).
 *
 * WHY A SECOND RULE. Slate Graphite's lighter ground leaves the status triple too little lightness:
 * lifting `status.ok` and `status.warn` to clear 4.5:1 on its levels brings them close to
 * `status.bad`, and they stop separating under protan, deutan and tritan simulation. NO lightness
 * move of any one of the three — nor of all three together, hue and chroma held — passes both
 * (measured by mockups/tools/slate-status-search.mjs: of the 256 lightness-only combinations that
 * pass contrast, none is clean). So the pair's members are tried one at a time and
 * the one that passes by the SMALLEST ΔE00 change **with its hue held** moves, lightness and chroma
 * free. Hue is the status's identity (green, amber, red); it never moves. Every candidate is judged
 * by the gate's own contrast, separation and salience checks. Only the generator calls this — a
 * device seed leaves the status triple untinted, so a runtime theme cannot reach it.
 */
export function settleSeparation(
  manifest: Manifest,
  theme: string,
  colors: Record<string, ColorToken>,
): SeparationMove[] | null {
  const moves: SeparationMove[] = [];
  const clean = (palette: Record<string, ColorToken>): boolean => {
    const palettes = { ...manifest.color, [theme]: palette };
    return (
      checkContrast(manifest, [theme], palettes).results.every((r) => r.passes) &&
      checkSeparation(manifest, [theme], palettes).every((r) => r.passes) &&
      checkSalience({ ...manifest, color: palettes }).length === 0
    );
  };
  for (let guard = 4; guard > 0; guard -= 1) {
    const [first] = checkSeparation(manifest, [theme], { [theme]: colors })
      .filter((r) => !r.passes)
      .sort((a, b) =>
        `${a.a}|${a.b}|${a.deficiency}`.localeCompare(`${b.a}|${b.b}|${b.deficiency}`),
      );
    if (first === undefined) return moves;
    let best: { name: string; token: ColorToken; d: number } | null = null;
    for (const name of [first.a, first.b].sort()) {
      const held = colors[name];
      if (held === undefined) return null;
      const origin = lab(held.oklch);
      // Candidates by ascending ΔE00 from the held value, hue fixed: the first that is clean wins.
      const candidates: { o: ManifestOklch; d: number }[] = [];
      for (let l = 0.3; l <= 0.99; l += 0.002)
        for (let k = 0.2; k <= 2.5; k += 0.02) {
          const o = { ...held.oklch, l, c: held.oklch.c * k };
          if (isInGamut(oklchToRgb(o))) candidates.push({ o, d: deltaE00(origin, lab(o)) });
        }
      candidates.sort((x, y) => x.d - y.d);
      for (const { o, d } of candidates) {
        if (best !== null && d >= best.d) break;
        const token = withOklch(held, o, `${theme}.${name}`);
        if (clean({ ...colors, [name]: token })) {
          best = { name, token, d };
          break;
        }
      }
    }
    if (best === null) return null;
    moves.push({
      token: best.name,
      l: best.token.oklch.l,
      c: best.token.oklch.c,
      forcedBy: `${first.a} / ${first.b} separate by ${first.score.toFixed(1)} under ${first.deficiency} < ${String(first.required)}`,
    });
    colors[best.name] = best.token;
  }
  return null;
}
