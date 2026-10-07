/**
 * How much of what a person owns sits in the band their profile supports (F-222, `23`'s garment
 * history, [ADR-0124](../../../docs/adr/0124-every-printed-figure-is-a-defined-computation-and-none-of-them-is-a-match.md)).
 *
 * ## What it is, and the words it may carry
 *
 * Each owned garment's colour is scored against the profile by FR-29's `scoreColor`, and counts as
 * CONCORDANT when it scores at or above {@link COMPONENT_SUPPORTS_ABOVE} — the score at which an
 * outfit's personal-fit component already reads *supports*. So no new number is introduced: the
 * figure is a share of garments the product already says the profile supports.
 *
 * It is NOT a validation of the profile, and not a calibration: nothing about garments tests whether
 * the profile is right about the person (that is F-037's question), and *calibrated* is a provenance
 * level in this product (FR-16). `23` draws *Calibration* in the title; it ships as *Profile*.
 *
 * ## No answer is not 0 %
 *
 * An empty wardrobe has no share. A profile that brings no evidence — every weighted confidence 0 —
 * scores every colour `NO_EVIDENCE_SCORE` (50), which is under the bar, and would read as *0 %
 * concordance*: a statement about the wardrobe that is really the absence of a profile. Both are
 * `null`, a refusal the screen states.
 */

import type { Color } from '@irodora/color-core';
import { COMPONENT_SUPPORTS_ABOVE } from './outfit-score.js';
import type { PersonalProfile } from './profile.js';
import type { RuleSet } from './rules.js';
import { scoreColor } from './score.js';

export interface ProfileConcordance {
  /** How many garments were scored. */
  readonly garments: number;
  /** How many scored at or above the threshold. */
  readonly concordant: number;
  /** `concordant / garments`, in [0, 1]. A screen prints it floored. */
  readonly share: number;
  /** The score a garment had to reach: carried, so the figure is reported with its basis. */
  readonly threshold: number;
  /** The rule version the scores came from (FR-29). */
  readonly rulesVersion: string;
}

/** The share of owned garments the profile supports, or `null` where there is no answer. */
export function profileConcordance(
  profile: PersonalProfile,
  colors: readonly Color[],
  rules: RuleSet,
): ProfileConcordance | null {
  if (colors.length === 0) return null;
  const scores = colors.map((color) => scoreColor(profile, color, rules));
  if (scores.every((score) => score.confidence === 0)) return null;
  const concordant = scores.filter((score) => score.score >= COMPONENT_SUPPORTS_ABOVE).length;
  return {
    garments: colors.length,
    concordant,
    share: concordant / colors.length,
    threshold: COMPONENT_SUPPORTS_ABOVE,
    rulesVersion: rules.versionId,
  };
}
