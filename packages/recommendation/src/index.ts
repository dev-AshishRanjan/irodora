/**
 * `@irodora/recommendation` — rules, weights, scoring and explanation objects.
 *
 * **No prose, no catalogue, no locale.** Scoring emits message *keys*; rendering them is the
 * app's job (FR-11). The moment a sentence is produced here it has to be translated at scoring
 * time, and a stored recommendation becomes a stored English string.
 *
 * **No default rule set.** Weights are content (FR-67), and a default in this package would be
 * a weight living in code — see [`rules.ts`](./rules.ts).
 */

export {
  SCORE_FACTORS,
  type ContrastPreference,
  type Interval,
  type PersonalProfile,
  type ScoreFactor,
} from './profile.js';

export {
  parseRuleSet,
  RuleError,
  WEIGHT_TOLERANCE,
  type Falloff,
  type RuleSet,
  type TemperaturePoles,
} from './rules.js';

export {
  CONTRAST_TARGET,
  hueBias,
  intervalFit,
  MESSAGE_KEYS,
  NO_EVIDENCE_SCORE,
  OPPOSES_BELOW,
  scoreColor,
  SUPPORTS_ABOVE,
  type CompatibilityScore,
  type ExplanationDirection,
  type FactorContribution,
} from './score.js';

export {
  MIN_RATIONALE,
  OCCASIONS,
  parseWeightContent,
  rationaleCount,
  ruleSetFor,
  type Occasion,
  type OccasionWeights,
  type WeightContent,
  type WeightedFactor,
} from './weights.js';

export { isLargeArea, OUTFIT_SLOTS, SLOT_AREA, type OutfitSlot } from './slots.js';

export {
  ALTERNATIVE_AXES,
  pairingFit,
  PAIRING_WEIGHT,
  PERSONAL_WEIGHT,
  recommendForSlot,
  recommendOutfit,
  SHORTLIST_LIMIT,
  type Alternative,
  type AlternativeAxis,
  type Candidate,
  type OutfitInput,
  type OutfitRecommendation,
  type RankedCandidate,
} from './outfit.js';

export const RECOMMENDATION_VERSION = '0.3.0' as const;
