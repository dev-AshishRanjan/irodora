/**
 * A theme from a seed nobody knew about at build time (F-154, ADR-0096).
 *
 * ## Why this can exist at all
 *
 * A theme derived from a platform accent **cannot be verified when the manifest is compiled** —
 * the seed does not exist until the app is running on somebody's phone. So the contrast and CVD
 * checks have to run there, against the values that will actually be painted.
 *
 * That is only possible because this package has no runtime dependencies, touches no platform
 * API, and returns bit-identical values in Node, the browser and React Native (NFR-3). The
 * property that exists so a colour is the *same* colour everywhere turns out to be the one that
 * makes a **provably accessible** dynamic theme possible.
 *
 * And it runs the gate's own functions rather than a second implementation. `checkContrast` and
 * `checkSeparation` take the palettes as an argument for exactly this: what a device checks is
 * what CI checks, not something that agrees with it until it does not.
 *
 * ## What a seed may change, which is the same as what a theme may change
 *
 * `deriveTheme` — the function `parseManifest` uses for the built-in families — does the work.
 * **Lightness is never touched, chroma never passes the manifest's ceiling, and the sample's
 * furniture and the signals are never tinted.** A runtime theme is not a relaxation of the rule;
 * it is the same rule with the hue supplied later.
 *
 * ## Three outcomes, and only one of them is a surprise
 *
 * **Applied, with corrections.** Chroma is the only lever that preserves lightness and hue, so a
 * correction is always a chroma reduction — bounded by the manifest's ceiling and by the sRGB
 * gamut at that token's own lightness. The second is the common one: at L 0.99 the gamut is a
 * sliver, so nearly every seed is corrected somewhere. Corrections are reported because a theme
 * that quietly did less than it was asked is a theme nobody can reason about.
 *
 * **Refused.** A seed with no chroma has no hue to take — a greyscale wallpaper is a real thing,
 * and the honest answer is to say so and leave the base theme alone rather than fabricate one.
 * A seed outside sRGB or carrying a non-finite number is refused for the same reason.
 *
 * **Refused by the checks.** This is the path that cannot fire today, and saying so is better
 * than pretending: the derivation preserves lightness exactly and caps chroma at 0.01, so a
 * derived theme differs from one the gate already passed by less than the check can resolve.
 * The check still runs. It is the same code, it costs a few milliseconds, and *"it cannot fail
 * today"* is a statement about today's derivation rule rather than a licence to stop asking.
 */

import { checkContrast, checkSeparation, type CheckableManifest, type Finding } from './check.js';
import { isInGamut, oklchToRgb } from './derive.js';
import { deriveTheme, type ColorToken, type ManifestOklch, type Mode } from './manifest.js';

/** The name the runtime palette is checked under. Never a member of `THEMES`. */
export const RUNTIME_THEME = 'device';

/** What one token gave up, and to which bound. */
export interface SeedCorrection {
  readonly token: string;
  readonly was: number;
  readonly now: number;
  /** `ceiling` — the manifest's near-achromatic rule. `gamut` — sRGB at that lightness. */
  readonly bound: 'ceiling' | 'gamut';
}

export type SeedOutcome =
  | {
      readonly kind: 'applied';
      readonly colors: Readonly<Record<string, ColorToken>>;
      readonly corrections: readonly SeedCorrection[];
    }
  | { readonly kind: 'refused'; readonly reason: string; readonly findings: readonly Finding[] };

/**
 * The smallest chroma a seed must carry to be a hue at all.
 *
 * Below this a colour is a grey with rounding on it, and the hue it reports is noise — taking it
 * would give somebody a theme whose colour was decided by the last bit of their wallpaper.
 * 0.002 is under the base palette's own chrome (0.003–0.008), so it refuses only what is
 * genuinely achromatic.
 */
export const MINIMUM_SEED_CHROMA = 0.002;

/**
 * Derive a theme from a seed, check it, and say what happened.
 *
 * `base` is which mode the seed themes — a device accent applies to whichever of light and dark
 * is in force, exactly as a built-in family does.
 */
export function themeFromSeed(
  manifest: CheckableManifest,
  base: Mode,
  seed: ManifestOklch,
): SeedOutcome {
  const refuse = (reason: string, findings: readonly Finding[] = []): SeedOutcome => ({
    kind: 'refused',
    reason,
    findings,
  });

  /* --- is this a colour at all ---------------------------------------------------------- */

  if (![seed.l, seed.c, seed.h].every((v) => Number.isFinite(v)))
    return refuse('the seed carries a value that is not a number');

  if (seed.l < 0 || seed.l > 1) return refuse('the seed lightness is outside 0–1');

  if (seed.c < MINIMUM_SEED_CHROMA)
    return refuse(
      'the seed is achromatic — there is no hue in it to take, and a colour picked from the ' +
        'rounding of a grey is not the device colour',
    );

  if (!isInGamut(oklchToRgb(seed)))
    return refuse('the seed is outside sRGB, so it is not a colour this device can show');

  /* --- derive, by the same rule a built-in family uses ---------------------------------- */

  const ceiling = manifest.gate.contrast.chromaCeiling.maxChroma;
  const from = manifest.color[base];
  if (from === undefined) return refuse(`the ${base} palette is not in this manifest`);
  const hue = ((seed.h % 360) + 360) % 360;

  const colors = deriveTheme(
    from,
    { entry: 'device', hue, chromaScale: 2 },
    ceiling,
    RUNTIME_THEME,
  );

  /* --- what it gave up, and to which bound ----------------------------------------------- */

  const corrections: SeedCorrection[] = [];
  for (const [name, token] of Object.entries(from)) {
    const derived = colors[name];
    if (derived === undefined || derived.oklch.c === token.oklch.c * 2) continue;
    if (derived.oklch.c === token.oklch.c) continue; // untinted by rule, not corrected
    const wanted = Math.round(token.oklch.c * 2 * 1000) / 1000;
    if (derived.oklch.c === wanted) continue;
    corrections.push({
      token: name,
      was: wanted,
      now: derived.oklch.c,
      // The ceiling is a flat cap; anything below it was the gamut at that token's lightness.
      bound: derived.oklch.c === ceiling ? 'ceiling' : 'gamut',
    });
  }

  /* --- the gate's own checks, over the derived values ------------------------------------ */

  const palettes = { [RUNTIME_THEME]: colors };
  const themes = [RUNTIME_THEME];

  const { findings: pairingFindings, results } = checkContrast(manifest, themes, palettes);
  const failed = results.filter((r) => !r.passes);
  const separations = checkSeparation(manifest, themes, palettes).filter((s) => !s.passes);

  if (pairingFindings.length > 0 || failed.length > 0 || separations.length > 0) {
    const findings: Finding[] = [
      ...pairingFindings,
      ...failed.map((r) => ({
        check: 'contrast' as const,
        detail: `${r.foreground} on ${r.background} is ${r.wcag.toFixed(2)}:1, below the ${String(r.required)} required`,
      })),
      ...separations.map((s) => ({
        check: 'cvd' as const,
        detail: `${s.a} and ${s.b} separate by ${s.score.toFixed(1)} under ${s.deficiency}, below ${String(s.required)}`,
      })),
    ];
    return refuse(
      'the theme this seed produces does not meet the contrast or separation floors, and the ' +
        'floors do not move',
      findings,
    );
  }

  return { kind: 'applied', colors, corrections };
}
