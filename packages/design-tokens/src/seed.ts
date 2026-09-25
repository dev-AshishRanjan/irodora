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
import { smallestLightnessMove } from './derive-theme.js';
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

/**
 * Where "lighter" stops being the direction that gains contrast: WCAG's crossover at relative
 * luminance ≈ 0.179, which is OKLCh L ≈ 0.564 — not 0.5 (F-289's review measured it).
 */
const CONTRAST_CROSSOVER_L = 0.564;

/**
 * Settle every contrast floor the tint broke, the E3 way (F-225, ADR-0107 d.4, ADR-0111).
 *
 * WHY THIS EXISTS. The manifest's own gate-forced values — tertiary text on cards, the focus ring
 * — sit exactly at their floors, because §4 E3 moves a drawn value by the SMALLEST step that
 * passes. A tint moves a surface's luminance a little even at the same OKLab L, and a value with no
 * margin falls under. Refusing would lose the device colour on a third of all hues; the rule the
 * manifest already follows says a pairing that fails in a theme moves the E3 way in that theme,
 * and the device theme is a theme. So each failing token moves by the smallest lightness step that
 * passes, and the move is REPORTED, like every other correction. Returns `null` when a floor
 * cannot be met that way — the checks below then refuse the seed, with their findings.
 */
function settleFloors(
  manifest: CheckableManifest,
  colors: Record<string, ColorToken>,
): SeedCorrection[] | null {
  const moves: SeedCorrection[] = [];
  const failing = (palette: Record<string, ColorToken>) =>
    checkContrast(manifest, [RUNTIME_THEME], { [RUNTIME_THEME]: palette }).results.filter(
      (r) => !r.passes,
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
      where: `${RUNTIME_THEME}.${name}`,
    });
    if (moved === null) return null;
    moves.push({ token: name, was: token.oklch.l, now: moved.oklch.l, bound: 'floor' });
    colors[name] = moved;
  }
  return null;
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

  const floors = settleFloors(manifest, colors);
  if (floors !== null) corrections.push(...floors);

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
