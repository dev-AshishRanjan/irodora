/**
 * Turning a token into a renderable value.
 *
 * **Every number here comes from `@irodora/color-spaces`.** Nothing in this file implements
 * colour maths; a second implementation of anything in `packages/color-*` is a defect by
 * definition (`AGENTS.md` §7), and a token pipeline is exactly where such a duplicate would
 * be easiest to justify and hardest to notice.
 *
 * Two things are worth knowing before changing anything below.
 *
 * **`xyzToSrgb` does not clamp.** That is deliberate in the engine — clamping mid-pipeline
 * hides an out-of-gamut result from the code whose job is to map it (F-009). Here it means a
 * token outside sRGB would quietly become a clipped hex that no longer matches its own
 * OKLCh. So gamut is checked explicitly, and an out-of-gamut token is an error rather than a
 * rounded-off surprise.
 *
 * **Alpha compositing happens in linear light.** Blending encoded sRGB is the same class of
 * error as averaging encoded sRGB, and it fails in the same direction — the result is too
 * dark [[averaging-non-linear-srgb-reads-too-dark]]. A 14% white hairline over a dark card
 * blended the wrong way is visibly wrong, and it is the exact value the `contrast` gate would
 * then certify.
 */

import {
  linearSrgbToSrgb,
  oklchToXyz,
  srgbToHex,
  srgbToLinearSrgb,
  type Rgb,
} from '@irodora/color-spaces';
import { xyzToSrgb } from '@irodora/color-spaces';
import type { ColorToken, ManifestOklch } from './manifest.js';

/**
 * How far outside `[0, 1]` a component may sit and still be called in-gamut.
 *
 * Not a tolerance on colour accuracy — a tolerance on the floating-point round trip through
 * XYZ. `1e-9` is far below the `1/255` a hex can express, so it cannot mask a real
 * out-of-gamut token.
 */
export const GAMUT_EPSILON = 1e-9;

export class OutOfGamutError extends Error {
  constructor(name: string, rgb: Rgb) {
    super(
      `${name} is outside sRGB: [${rgb.map((v) => v.toFixed(6)).join(', ')}]. ` +
        'Emitting it would clip to a hex that no longer matches its own OKLCh. ' +
        'Reduce chroma, or map it through F-009 gamut mapping once that exists.',
    );
    this.name = 'OutOfGamutError';
  }
}

/** The encoded sRGB a token's OKLCh resolves to. Unclamped, so a caller can test gamut. */
export function oklchToRgb(oklch: ManifestOklch): Rgb {
  return xyzToSrgb(oklchToXyz([oklch.l, oklch.c, oklch.h]));
}

export function isInGamut(rgb: Rgb): boolean {
  return rgb.every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);
}

/** The token's own colour, ignoring any alpha. Throws if it does not fit in sRGB. */
export function tokenRgb(name: string, token: ColorToken): Rgb {
  const rgb = oklchToRgb(token.oklch);
  if (!isInGamut(rgb)) throw new OutOfGamutError(name, rgb);
  return rgb;
}

/**
 * `source` over `backdrop` at `alpha`, composited in **linear light** — the physically
 * correct blend.
 *
 * Correct is not the same as *what renders*. CSS and React Native both composite in the
 * **encoded** space, so this is the mixture of light that a physically-faithful compositor
 * would produce, not the pixel the user will see. Both are computed and the gate takes the
 * worse — see `compositeEncoded` for why that matters and by how much.
 */
export function compositeOver(source: Rgb, alpha: number, backdrop: Rgb): Rgb {
  const s = srgbToLinearSrgb(source);
  const b = srgbToLinearSrgb(backdrop);
  return linearSrgbToSrgb([
    s[0] * alpha + b[0] * (1 - alpha),
    s[1] * alpha + b[1] * (1 - alpha),
    s[2] * alpha + b[2] * (1 - alpha),
  ]);
}

/**
 * The same blend performed on **encoded** sRGB — what a browser and React Native actually do.
 *
 * Physically wrong, and the value that will be on the screen. It is here because the two
 * readings disagree by a lot and **neither is uniformly stricter**:
 *
 * | token | linear | encoded |
 * |---|---|---|
 * | `dark.border.strong` over `background` | 3.66:1 | **1.41:1** |
 * | `light.border.strong` over `surface.3` | **1.17:1** | 1.41:1 |
 *
 * A light overlay on a dark ground reads *far* more favourably in linear — 2.2×, in the
 * direction that hides a failure — and a dark overlay on a light ground reads more
 * favourably encoded. So a gate that picks one model certifies a colour that does not
 * render, in whichever direction it happens to be wrong.
 *
 * The engine's "average in linear light" rule is about combining measurements, where you are
 * modelling a mixture of light. This is a **prediction of what the platform will draw**, and
 * the platform is not physically faithful. Conflating the two is exactly the plausible wrong
 * answer the colour rules warn about.
 */
export function compositeEncoded(source: Rgb, alpha: number, backdrop: Rgb): Rgb {
  return [
    source[0] * alpha + backdrop[0] * (1 - alpha),
    source[1] * alpha + backdrop[1] * (1 - alpha),
    source[2] * alpha + backdrop[2] * (1 - alpha),
  ];
}

/**
 * Every colour a token can present: one per declared ground if translucent, otherwise just
 * its own.
 *
 * A translucent token has no single appearance. The same 8% black hairline is nearly
 * invisible on white and clearly visible on a meter track, and checking only the ground its
 * author happened to name first is how a gate passes a border that cannot be seen where it
 * is actually used.
 */
export function resolveAll(
  name: string,
  token: ColorToken,
  lookup: (base: string) => ColorToken,
): { readonly over: string | null; readonly model: string; readonly rgb: Rgb }[] {
  const own = tokenRgb(name, token);
  const alpha = token.oklch.alpha;
  if (alpha === undefined) return [{ over: null, model: 'opaque', rgb: own }];
  const grounds = token.compositeOver;
  if (grounds === undefined || grounds.length === 0)
    throw new Error(`${name} is translucent but names no compositeOver grounds`);
  // Both compositing models, every ground. Neither model is uniformly stricter, so the
  // caller takes the worst of all of them.
  return grounds.flatMap((ground) => {
    const base = tokenRgb(ground, lookup(ground));
    return [
      { over: ground, model: 'linear', rgb: compositeOver(own, alpha, base) },
      { over: ground, model: 'encoded', rgb: compositeEncoded(own, alpha, base) },
    ];
  });
}

// There is deliberately no single-value `resolve`. It existed while `compositeOver` named
// one ground, and every caller of it would now have to choose a ground to look at — which is
// the failure the list replaced. If you want one appearance, name the ground you mean.

const channelToByte = (v: number): number => Math.round(Math.min(1, Math.max(0, v)) * 255);

/**
 * `#RRGGBB`, uppercase.
 *
 * Delegates to `srgbToHex` in `@irodora/color-spaces` rather than formatting here. It moved
 * there in F-011 because the corpus needs the same function for every derived entry hex, and
 * two implementations of sRGB byte encoding would be two answers to the same question — the
 * one question this product exists to answer consistently.
 *
 * The re-export stays so `derivedSrgb` and the emitters keep one import, and because gate 9
 * plus `test/emit.test.ts`'s byte comparison are what proved the move changed nothing.
 */
export function toHex(rgb: Rgb): string {
  return srgbToHex(rgb);
}

/** `rgba(r, g, b, a)` with integer channels — the CSS form of a translucent token. */
export function toRgbaString(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb.map(channelToByte).join(', ')}, ${String(alpha)})`;
}

/**
 * The `srgb` string a token must carry (ADR-0043).
 *
 * The generator writes this into the manifest and the `contrast` gate recomputes it and
 * compares. Those are the same function on purpose: if the two ever diverge, the check
 * becomes a check of the generator against itself.
 */
export function derivedSrgb(name: string, token: ColorToken): string {
  const rgb = tokenRgb(name, token);
  return token.oklch.alpha === undefined ? toHex(rgb) : toRgbaString(rgb, token.oklch.alpha);
}

/** `oklch(L C H)` / `oklch(L C H / A)` — the authoritative value, as CSS. */
export function toOklchString(oklch: ManifestOklch): string {
  const head = `${String(oklch.l)} ${String(oklch.c)} ${String(oklch.h)}`;
  return oklch.alpha === undefined ? `oklch(${head})` : `oklch(${head} / ${String(oklch.alpha)})`;
}
