/**
 * A theme from a seed nobody knew about at build time (F-154; FR-70 E4 since F-225, ADR-0111).
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
 * `deriveTheme` does the tint: **chroma never passes the manifest's ceiling, and the sample's
 * furniture, the signals and the gate-forced values are never tinted** (`NEUTRAL_IN_EVERY_THEME`).
 * The tint itself preserves lightness. What it may then do is what every theme may do since F-225:
 * where a contrast floor fails in this theme, the failing token moves THE E3 WAY — the smallest
 * lightness step that passes, hue and chroma held (ADR-0107 d.4, ADR-0111) — and the move is
 * reported. ADR-0096's "a theme never moves lightness" was the recipes' rule, and it went with
 * them.
 *
 * ## Three outcomes, and only one of them is a surprise
 *
 * **Applied, with corrections.** A chroma correction is bounded by the manifest's ceiling or by
 * the sRGB gamut at that token's own lightness — at L 0.99 the gamut is a sliver, so nearly every
 * seed is corrected somewhere. A `floor` correction is a lightness move a contrast floor forced.
 * Corrections are reported because a theme that quietly did less than it was asked is a theme
 * nobody can reason about.
 *
 * **Refused.** A seed with no chroma has no hue to take — a greyscale wallpaper is a real thing,
 * and the honest answer is to say so and leave the base theme alone rather than fabricate one.
 * A seed outside sRGB or carrying a non-finite number is refused for the same reason.
 *
 * **Refused by the checks.** When a floor cannot be met by a lightness move, or a CVD pair stops
 * separating, the seed is refused with the checker's own findings. The checks are the gate's
 * functions, run over the values that would be painted.
 */

import { checkContrast, checkSeparation, type CheckableManifest, type Finding } from './check.js';
import { isInGamut, oklchToRgb } from './derive.js';
import { settleFloors } from './settle.js';
import { deriveTheme, type ColorToken, type ManifestOklch, type Mode } from './manifest.js';

/** The name the runtime palette is checked under. Never a member of `THEMES`. */
export const RUNTIME_THEME = 'device';

/** What one token gave up, and to which bound. */
export interface SeedCorrection {
  readonly token: string;
  /** Chroma for `ceiling` and `gamut`; OKLCh lightness for `floor`. */
  readonly was: number;
  readonly now: number;
  /**
   * `ceiling` — the manifest's chroma ceiling. `gamut` — sRGB at that lightness. `floor` — a
   * contrast floor the tint pushed a token under, answered the E3 way (F-225): the smallest
   * lightness move that passes, hue and chroma held, in this theme only.
   */
  readonly bound: 'ceiling' | 'gamut' | 'floor';
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

  /* --- the floors the tint broke, the E3 way (F-225) -------------------------------------- */

  // The shared settling rule (settle.ts), which the manifest's derived themes use too. A floor it
  // cannot meet is left for the checks below to refuse, with their findings.
  const floors = settleFloors(manifest, RUNTIME_THEME, colors);
  for (const move of floors ?? [])
    corrections.push({ token: move.token, was: move.from, now: move.to, bound: 'floor' });

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
