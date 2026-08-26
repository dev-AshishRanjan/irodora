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

export const RECOMMENDATION_VERSION = '0.1.0' as const;
