/**
 * The generators, and the gamut mapping every one of them ends with.
 *
 * ## Criterion 4 and FR-6 pull against each other, and ADR-0045 resolves it
 *
 * Criterion 4: *every generated colour passes gamut mapping before it is returned.*
 * FR-6: *each generator returns colours within the requested relationship **to a stated
 * tolerance**.*
 *
 * Those are in tension — mapping changes a colour, so it could break the relationship the
 * generator just built. It does not, and the reason is
 * [ADR-0045](../../../docs/adr/0045-gamut-mapping-is-chroma-bisection-without-minde.md):
 * `gamutMap` reduces OKLCh **chroma** and holds **L** and **h**, measured at 2.6 × 10⁻⁵ ° of
 * hue drift. So:
 *
 * - **Hue relationships survive mapping.** A complementary pair is still 180° apart after both
 *   ends are mapped. This is the load-bearing consequence and `test/harmony.test.ts` measures
 *   it rather than assuming it.
 * - **Chroma relationships do not.** `chroma-contrast` asks for a ratio, and mapping is free to
 *   reduce one end and not the other. Its tolerance is necessarily weaker, and saying so is the
 *   honest form of "stated tolerance".
 *
 * Every colour therefore reports `wasGamutMapped` and `gamutDeltaE00`. That is the same honesty
 * `deriveColor` applies in the corpus: a caller can say "less vivid" instead of silently showing
 * a different colour.
 */

import { deltaE00 } from '@irodora/color-difference';
import {
  gamutMapDetail,
  oklchToXyz,
  srgbToXyz,
  xyzToLab,
  xyzToOklch,
  type Triple,
} from '@irodora/color-spaces';
import { HarmonyError } from './errors.js';
import {
  assertOklch,
  lightnessRamp,
  NEAR_NEUTRAL_CHROMA,
  rotateHue,
  scaleChroma,
  withChroma,
  withLightness,
  type Oklch,
} from './geometry.js';
import type { HarmonyFamily, HarmonyKind } from './kinds.js';

/**
 * The warm and cool hue anchors, in OKLCh degrees.
 *
 * **A convention, not a geometric fact** — and it must be the same convention the corpus uses,
 * or the product disagrees with itself: `taxonomy.temperature` classifies every entry as
 * `warm | cool | neutral`, and a `warm-cool` harmony that pointed somewhere else would place a
 * colour the corpus calls warm on the cool side of its own palette.
 *
 * Recorded in ADR-0049 rather than chosen here. Uncalibrated: no study produced these, they are
 * the centres of the received warm (orange-red) and cool (blue-cyan) regions.
 */
export const WARM_HUE = 55;
export const COOL_HUE = 245;

export interface HarmonyColor {
  /** OKLCh **after** gamut mapping. What a caller should render. */
  readonly oklch: Oklch;
  /** Canonical XYZ (D65) of the same colour, for anything that needs the engine's currency. */
  readonly xyz: Triple;
  /** The OKLCh the generator produced, before mapping. Kept so the cost is inspectable. */
  readonly requested: Oklch;
  readonly wasGamutMapped: boolean;
  /**
   * ΔE00 between what was asked for and what will be shown. `0` when nothing moved.
   *
   * The number behind "less vivid" — without it, that phrase is a disclaimer rather than a
   * measurement (ADR-0031).
   */
  readonly gamutDeltaE00: number;
}

export interface Harmony {
  readonly family: HarmonyFamily;
  /**
   * The geometric relationship, or `null` for an editorial harmony.
   *
   * Null rather than a guess: a curator assembling a palette is not obliged to have picked a
   * triad, and labelling one afterwards would invent a claim they never made. See
   * `editorial.ts` — this corrected the plan, which had said an editorial harmony still stands
   * in some relationship.
   */
  readonly kind: HarmonyKind | null;
  /** The OKLCh the caller asked about, unmapped. */
  readonly source: Oklch;
  readonly colors: readonly HarmonyColor[];
  /**
   * Attribution. **Required for `editorial`, forbidden for `geometric`** — enforced.
   *
   * An editorial harmony with no attribution is our own curation presented as fact, which is
   * ADR-0007's central prohibition pointed at harmonies instead of at colours.
   */
  readonly provenance: { readonly paletteSlug: string; readonly corpusVersion: string } | null;
}

export interface HarmonyOptions {
  /** Steps for the ramp kinds (`monochromatic`, `tonal`, `value-contrast`). Default 5. */
  readonly steps?: number;
  /** Analogous and split separation in degrees. Default 30. */
  readonly spread?: number;
}

/**
 * Map one requested OKLCh into sRGB and record what that cost.
 *
 * `gamutMapDetail` hands back **encoded sRGB**, so the displayable colour goes back through
 * `srgbToXyz` to return to the engine's currency. Doing it that way rather than trusting the
 * requested XYZ when `wasInGamut` keeps one path through the code: an in-gamut colour round-trips
 * to itself, and if it ever did not, that is a conversion defect worth surfacing rather than
 * routing around.
 */
function land(requested: Oklch): HarmonyColor {
  const requestedXyz = oklchToXyz(requested);
  const mapping = gamutMapDetail(requestedXyz, 'srgb');
  const shownXyz = srgbToXyz(mapping.rgb);

  return {
    oklch: xyzToOklch(shownXyz),
    xyz: shownXyz,
    requested,
    wasGamutMapped: !mapping.wasInGamut,
    gamutDeltaE00: mapping.wasInGamut ? 0 : deltaE00(xyzToLab(requestedXyz), xyzToLab(shownXyz)),
  };
}

/**
 * Generate a geometric harmony.
 *
 * Every returned colour is gamut-mapped. The relationship holds in hue exactly and in chroma to
 * a weaker, measured tolerance — see the module comment.
 */
export function generateHarmony(
  source: Oklch,
  kind: HarmonyKind,
  options: HarmonyOptions = {},
): Harmony {
  assertOklch(source, 'generateHarmony');

  const steps = options.steps ?? 5;
  const spread = options.spread ?? 30;
  if (!Number.isInteger(steps) || steps < 1)
    throw new HarmonyError(
      'generateHarmony',
      `steps must be a positive integer; got ${String(steps)}`,
    );
  if (!Number.isFinite(spread) || spread <= 0 || spread >= 180)
    throw new HarmonyError(
      'generateHarmony',
      `spread must be in (0, 180) degrees; got ${String(spread)}. At 180 a split-complementary ` +
        'collapses onto the complement and stops being a split.',
    );

  const requested = requestedFor(source, kind, steps, spread);

  return {
    family: 'geometric',
    kind,
    source,
    colors: requested.map(land),
    provenance: null,
  };
}

function requestedFor(
  source: Oklch,
  kind: HarmonyKind,
  steps: number,
  spread: number,
): readonly Oklch[] {
  const [l, c] = source;

  switch (kind) {
    // Lightness alone — the same dye, more or less of it.
    case 'monochromatic':
      return lightnessRamp(steps, 0.15, 0.9).map((step) => withLightness(source, step));

    // Lightness AND chroma together, which is what dilution does to a dyed fibre. Chroma is
    // scaled toward the lightness step so pale steps are also less saturated.
    case 'tonal':
      return lightnessRamp(steps, 0.15, 0.9).map((step) => {
        const distance = Math.abs(step - l);
        return withChroma(withLightness(source, step), c * Math.max(0, 1 - distance));
      });

    case 'analogous':
      return [rotateHue(source, -spread), source, rotateHue(source, spread)];

    case 'complementary':
      return [source, rotateHue(source, 180)];

    case 'split':
      return [source, rotateHue(source, 180 - spread), rotateHue(source, 180 + spread)];

    case 'triadic':
      return [source, rotateHue(source, 120), rotateHue(source, 240)];

    case 'tetradic':
      return [source, rotateHue(source, 90), rotateHue(source, 180), rotateHue(source, 270)];

    case 'neutral':
      return [withChroma(source, 0), source];

    case 'near-neutral':
      return [withChroma(source, Math.min(c, NEAR_NEUTRAL_CHROMA)), source];

    case 'warm-cool':
      return [source, [l, c, WARM_HUE], [l, c, COOL_HUE]];

    // A stated step in lightness, symmetric about the source, clamped at the ends.
    case 'value-contrast':
      return lightnessRamp(steps, Math.max(0, l - 0.35), Math.min(1, l + 0.35)).map((step) =>
        withLightness(source, step),
      );

    case 'chroma-contrast':
      return [scaleChroma(source, 0.25), source, scaleChroma(source, 1.75)];
  }
}
