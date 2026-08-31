/**
 * Does this colour suit this person, and which four things decided that.
 *
 * > *Score garment-to-person compatibility in [0,100] with per-factor explanation. Score is a
 * > pure function of profile and colour given the rule version; explanation names temperature,
 * > lightness, chroma and contrast contributions.* — FR-29
 *
 * > *Every score carries a structured explanation of the factors that produced it. Explanation
 * > objects are data (factor, direction, magnitude), rendered by the UI and asserted in tests —
 * > never free text generated at display time.* — FR-11
 *
 * ## Not one sentence is produced here
 *
 * A `FactorContribution` carries a **message key**. This package has no catalogue, no locale
 * and no formatter, and it must never grow one: the moment scoring produces a sentence, the
 * sentence has to be translated at scoring time, and a stored recommendation becomes a stored
 * English string. `test/score.test.ts` asserts every field is a number, an enum member or a
 * dotted key, with a decoy proving that shape rejects prose.
 *
 * ## Confidence weights the contribution, and the renormalisation is the whole of it
 *
 * ```
 * effective(factor) = weight(factor) x confidence(factor),  then divided by their total
 * ```
 *
 * **Dividing is what makes the criterion mean something.** Without it, a profile that is
 * uncertain about temperature simply scores every colour lower — which reads as *"this suits
 * you less"* when the truth is *"we know less about you"*. Those are different claims and only
 * the second one is ours to make. Renormalising moves the influence onto the dimensions that do
 * carry evidence, and leaves the score answering the question it was asked.
 *
 * ## The colour arrives as a `Color`, so it cannot arrive without provenance
 *
 * ADR-0005. A garment colour estimated by a camera and one read from the corpus are different
 * claims, and the type carries which. The engine does not currently vary the score by
 * provenance — but it cannot *lose* it, and F-030 stores the score beside the colour it scored.
 *
 * ## One conversion, from the engine
 *
 * `xyzToOklch`, imported. Nothing here computes colour maths: `apps/mobile/AGENTS.md`'s rule
 * applies to every consumer of the engine, not only the app, and E-008 records why a second
 * implementation is invisible to any single test.
 */

import type { Color } from '@irodora/color-core';
import { xyzToOklch } from '@irodora/color-spaces';
import { SCORE_FACTORS, type PersonalProfile, type ScoreFactor } from './profile.js';
import type { RuleSet } from './rules.js';

/** Whether a factor helped, hurt, or did neither. */
export type ExplanationDirection = 'supports' | 'opposes' | 'neutral';

/**
 * Above this fit a factor is said to support the colour; below the lower bound, to oppose it.
 *
 * Conventions, and they exist so `direction` is derived from the fit rather than decided
 * separately — two fields that can disagree about the same number would be one field too many.
 */
export const SUPPORTS_ABOVE = 0.66;
export const OPPOSES_BELOW = 0.34;

/** What one factor did to the score, as data. FR-11: never a sentence. */
export interface FactorContribution {
  readonly factor: ScoreFactor;
  /** [0,1] — how well the colour matched on this axis, before any weighting. */
  readonly fit: number;
  /** [0,1] — this factor's share of the score after confidence and renormalisation. */
  readonly weight: number;
  /** Points this factor put on the board, out of 100. `fit x weight x 100`. */
  readonly contribution: number;
  readonly direction: ExplanationDirection;
  /** An i18n key. The engine never renders it and holds no catalogue. */
  readonly messageKey: string;
}

export interface CompatibilityScore {
  /** [0,100]. An integer, because a score is read, not computed with. */
  readonly score: number;
  /** The rule version that produced it — FR-29's "given the rule version". */
  readonly rulesVersion: string;
  /**
   * [0,1] — how much evidence the profile brought, as the weighted mean of the confidences
   * that actually applied. **Not the score's accuracy**; a number saying how much of the
   * profile was speaking.
   */
  readonly confidence: number;
  /** All four, always, in `SCORE_FACTORS` order. A missing factor is not an absent opinion. */
  readonly factors: readonly FactorContribution[];
}

/**
 * The score returned when no dimension carries any confidence.
 *
 * **50, with every contribution at zero.** Not an average of the fits, which would be an answer;
 * not a throw, which would make every caller handle a state the type already describes. It is
 * the midpoint with `confidence: 0` beside it, and the four contributions all zero — legibly
 * "nothing to go on".
 *
 * F-027 makes this reachable rather than theoretical: a photo estimate abstains on contrast at
 * confidence 0, and a profile nobody has filled in is zero across the board.
 */
export const NO_EVIDENCE_SCORE = 50;

/** Every message key this engine can emit. The catalogue contract, as data. */
export const MESSAGE_KEYS: readonly string[] = SCORE_FACTORS.flatMap((factor) =>
  (['supports', 'opposes', 'neutral'] as const).map((d) => `explain.${factor}.${d}`),
);

const messageKey = (factor: ScoreFactor, direction: ExplanationDirection): string =>
  `explain.${factor}.${direction}`;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * How well a value sits inside an interval, falling off outside it.
 *
 * 1 anywhere inside; then linear to 0 over `falloff`. Linear rather than a curve because a
 * curve would be a claim about how displeasure grows with distance, and nobody has measured
 * that — a straight line is the shape that admits it is a convention.
 */
export function intervalFit(
  value: number,
  interval: { readonly min: number; readonly max: number },
  falloff: number,
): number {
  if (value >= interval.min && value <= interval.max) return 1;
  const distance = value < interval.min ? interval.min - value : value - interval.max;
  return clamp01(1 - distance / falloff);
}

/**
 * Signed distance around the hue circle, in [-180, 180].
 *
 * Circular, because 350° and 10° are 20° apart and a subtraction says 340°.
 */
function hueGap(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * Warm–cool bias in [-1, +1] for a hue: distance to the cool pole against distance to the warm.
 *
 * **A hue equidistant from both returns 0**, which a threshold comparison could never do — it
 * would return a confident answer and flip it on a single degree.
 *
 * THIS IS THE CANONICAL DEFINITION OF THE WARM/COOL RULE. `apps/mobile/src/profile/photo.ts`
 * currently carries its own copy because the app cannot yet depend on this package — recorded
 * as [E-038](../../../.harness/state/effects.json) and scheduled for deletion. Two definitions
 * of a colour rule is precisely what E-008 exists to prevent, and it is written down rather
 * than tolerated quietly.
 */
export function hueBias(
  hue: number,
  poles: { readonly warm: number; readonly cool: number },
): number {
  const toWarm = Math.abs(hueGap(hue, poles.warm));
  const toCool = Math.abs(hueGap(hue, poles.cool));
  const span = toWarm + toCool;
  if (span === 0) return 0;
  return (toCool - toWarm) / span;
}

/**
 * The chroma at or below which a colour has no temperature worth speaking of.
 *
 * **Hue is meaningless at low chroma**, and `hueBias` alone does not know that. Measured on the
 * published corpus: `hai-suna`, a warm grey at C = 0.012, returns a bias of **0.867** — *more
 * strongly warm than `mi-aka`, the most saturated red in the corpus, at 0.644*. A hue angle on a
 * near-neutral is a rounding artefact of two tiny numbers, and treating it as a claim about
 * warmth is how a grey ends up clashing with things.
 *
 * **0.039 is not invented here.** It is the published phrase lexicon's own boundary for the term
 * "grey" (`content/rules/phrase-lexicon.2026.08.1.json`), which was itself placed in the
 * measured gap between the corpus's authored chroma bands. Using the same number means "grey"
 * denotes one thing in this product — the shape [[a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy]]
 * exists to protect.
 *
 * It belongs in the rule set with the poles it works beside, and it is not there yet: adding a
 * required field would stop `weights.2026.08.1.json` parsing, and that file is published and
 * immutable. Owed to the next version that needs a new optional block anyway.
 */
export const NEUTRAL_CHROMA = 0.039;

/**
 * A colour's warm–cool temperature, **scaled by how much colour it actually has**.
 *
 * `hueBias` is the pure hue question and stays that way — it is the right function when the
 * chroma is already known to be meaningful. This is the one to use when the input is an
 * arbitrary colour, because most of a wardrobe is near-neutral.
 *
 * Ramps linearly from 0 at C = 0 to the full bias at `NEUTRAL_CHROMA`. Linear because a curve
 * would be a claim about how quickly a grey becomes a colour, and nobody has measured that.
 */
export function temperatureOf(
  chroma: number,
  hue: number,
  poles: { readonly warm: number; readonly cool: number },
): number {
  const weight = clamp01(chroma / NEUTRAL_CHROMA);
  return hueBias(hue, poles) * weight;
}

/** How much lightness separation each contrast preference is asking for, in OKLCh L. */
const CONTRAST_TARGET: Readonly<Record<PersonalProfile['contrast'], number>> = {
  low: 0.12,
  medium: 0.3,
  high: 0.5,
};

/**
 * Score a colour against a profile.
 *
 * Pure: the same three arguments always produce the same result, which is what FR-29 requires
 * and what makes a stored recommendation reproducible from its versions alone.
 */
export function scoreColor(
  profile: PersonalProfile,
  color: Color,
  rules: RuleSet,
): CompatibilityScore {
  const [l, c, h] = xyzToOklch(color.xyz);

  const fits: Record<ScoreFactor, number> = {
    lightness: intervalFit(l, profile.lightness, rules.falloff.lightness),
    chroma: intervalFit(c, profile.chroma, rules.falloff.chroma),
    /*
     * Agreement between the colour's own warmth and the profile's. The two biases span [-1,1],
     * so their distance spans [0,2] and halving it puts the fit back in [0,1].
     *
     * `temperatureOf`, NOT `hueBias` (ADR-0076). The subject here is an ARBITRARY garment, and
     * 45 of the 120 published entries sit below NEUTRAL_CHROMA. Under the raw hue question,
     * `usu-gami` (Thin Paper, C = 0.006) and `usu-shimo` (Thin Frost, C = 0.005) — two
     * off-whites 0.027 apart in lightness — came back at +0.644 and -0.933, and a strongly warm
     * profile scored two pale greys 33 points apart out of 100. Nothing a person can see
     * justifies that.
     */
    temperature: clamp01(
      1 - Math.abs(temperatureOf(c, h, rules.poles) - profile.temperatureBias) / 2,
    ),
    // How close the colour sits to the separation this person prefers, measured from the middle
    // of their own lightness range — the contrast that matters is between the garment and them.
    contrast: contrastFit(l, profile),
  };

  const raw: Record<ScoreFactor, number> = {
    temperature: rules.weights.temperature * clamp01(profile.confidence.temperature),
    lightness: rules.weights.lightness * clamp01(profile.confidence.lightness),
    chroma: rules.weights.chroma * clamp01(profile.confidence.chroma),
    contrast: rules.weights.contrast * clamp01(profile.confidence.contrast),
  };
  const total = SCORE_FACTORS.reduce((sum, f) => sum + raw[f], 0);

  if (total === 0)
    return {
      score: NO_EVIDENCE_SCORE,
      rulesVersion: rules.versionId,
      confidence: 0,
      factors: SCORE_FACTORS.map((factor) => ({
        factor,
        fit: fits[factor],
        weight: 0,
        contribution: 0,
        // `neutral` rather than a direction derived from the fit: this factor did not move the
        // score, and saying it "supported" a score it contributed nothing to would be false.
        direction: 'neutral' as const,
        messageKey: messageKey(factor, 'neutral'),
      })),
    };

  const factors: FactorContribution[] = SCORE_FACTORS.map((factor) => {
    const weight = raw[factor] / total;
    const fit = fits[factor];
    const direction: ExplanationDirection =
      weight === 0
        ? 'neutral'
        : fit >= SUPPORTS_ABOVE
          ? 'supports'
          : fit <= OPPOSES_BELOW
            ? 'opposes'
            : 'neutral';
    return {
      factor,
      fit,
      weight,
      contribution: fit * weight * 100,
      direction,
      messageKey: messageKey(factor, direction),
    };
  });

  /*
   * Rounded once, at the end. Rounding each contribution first and summing would produce a
   * total that does not equal the sum of the numbers shown beside it — which is the arithmetic
   * a person checks first when they disagree with a score.
   */
  const score = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0));

  return {
    score,
    rulesVersion: rules.versionId,
    // The weighted mean of the confidences that applied — the profile's own weights, not the
    // rule set's, because this describes the PROFILE rather than the ranking.
    confidence: SCORE_FACTORS.reduce(
      (sum, f) => sum + clamp01(profile.confidence[f]) * (raw[f] / total),
      0,
    ),
    factors,
  };
}

/**
 * How well a colour's lightness matches the separation this person prefers.
 *
 * Measured from the **middle of their own lightness range**, because a contrast preference is
 * about the gap between the garment and the wearer. `CONTRAST_TARGET` says how big a gap each
 * preference asks for, and the fit falls off with the distance from it in either direction —
 * too little separation and too much are both misses, which a one-sided comparison would not
 * express.
 */
function contrastFit(lightness: number, profile: PersonalProfile): number {
  const middle = (profile.lightness.min + profile.lightness.max) / 2;
  const separation = Math.abs(lightness - middle);
  const target = CONTRAST_TARGET[profile.contrast];
  // Normalised by the widest miss possible on the axis, so the fit is in [0,1] without a clamp
  // doing the work — L is a proportion, so no separation can be further than 1 from a target.
  return clamp01(1 - Math.abs(separation - target));
}

export { CONTRAST_TARGET };
