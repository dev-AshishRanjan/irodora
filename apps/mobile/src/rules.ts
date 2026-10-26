/**
 * The published rule set, verified, as the app reads it.
 *
 * ## Why the app carries this at all
 *
 * The warm/cool **poles** live in the published weight set, and until F-099 the app carried its
 * own copy of them — `WARM_HUE = 60`, `COOL_HUE = 240`, beside a second implementation of the
 * bias function itself. Two definitions of one colour rule is
 * [E-008](../../../.harness/state/effects.json)'s failure exactly: both sides pass their own
 * tests, and they diverge silently the first time an editor publishes a new pole. The engine's
 * poles are a rule-set field and will be versioned as content; the app's were literals, so the
 * drift had a **known direction** before it happened.
 *
 * ## The digest comes from the ledger, never from the file
 *
 * The same arrangement as [`finder.ts`](./finder.ts)'s `lexicon()`, and for the same reason: the
 * **text** comes from the generated module and the **expected digest** comes from the ledger —
 * two exports that came from two files, which is the only arrangement in which comparing them
 * means anything (ADR-0046, ADR-0066). A record checked against a checksum it carries verifies
 * itself and nothing else.
 *
 * A mismatch throws and caches nothing, so a later call retries rather than handing back
 * something nobody checked.
 *
 * ## Nothing here parses
 *
 * `parseWeightContent` is the engine's, and it wraps `parseRuleSet` — the function that enforces
 * the weights summing to 1. A reader written here would agree with the file on the day it was
 * written and never again
 * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].
 */

import {
  parseWeightContent,
  rationaleCount,
  ruleSetFor,
  parseSeasonalRules,
  seasonalCellCount,
  type Occasion,
  type RuleSet,
  type SeasonalRules,
} from '@irodora/recommendation';
import { canonicalize } from '@irodora/corpus';
import { sha256 } from './corpus';
import {
  WEIGHTS_DIGEST,
  WEIGHTS_LABEL,
  WEIGHTS_RATIONALE_COUNT,
  WEIGHTS_TEXT,
} from './rules/generated/weights';
import {
  SEASONAL_CELL_COUNT,
  SEASONAL_DIGEST,
  SEASONAL_LABEL,
  SEASONAL_TEXT,
} from './rules/generated/seasonal';

/**
 * The occasion the app reads.
 *
 * `default`, for every question that does not vary by occasion. Naming it here rather than
 * threading it through meant the day something did, the change was visible as a change rather
 * than as a parameter that was always there: that day was F-248, and `07`'s occasion control
 * reads {@link occasionRuleSet} beside this, which is unchanged.
 *
 * **Exported for the lookbook (F-238).** A rules version holds one weighting per occasion, so a
 * saved outfit's envelope names the occasion its score was weighted for — the day a second one is
 * used, two weightings under one version would otherwise be indistinguishable.
 */
export const RULES_OCCASION = 'default' as const;

let cached: RuleSet | null = null;
let cachedContent: ReturnType<typeof parseWeightContent> | null = null;

/**
 * The published rule set, digest-verified.
 *
 * Built once. The poles, the falloff and the four weights all come from the same file the
 * engine scores with, so a photo estimate and the score the engine gives that colour cannot
 * disagree about what "warm" means.
 */
export function ruleSet(): RuleSet {
  if (cached !== null) return cached;
  cached = ruleSetFor(verifiedWeights(), RULES_OCCASION);
  return cached;
}

const byOccasion = new Map<Occasion, RuleSet>();

/**
 * The rule set for one of FR-34's published occasions (F-248): `07`'s occasion control ranks under
 * it. The SAME verified file as {@link ruleSet} — one digest check, one count check — read for
 * another weighting. `ruleSetFor` throws, naming the occasion, when the published weights lack it:
 * a silent fallback would make "the office weighting" and "the weighting nobody configured"
 * indistinguishable on screen. `ruleSet()` and {@link RULES_OCCASION} are unchanged.
 */
export function occasionRuleSet(occasion: Occasion): RuleSet {
  const known = byOccasion.get(occasion);
  if (known !== undefined) return known;
  const rules = ruleSetFor(verifiedWeights(), occasion);
  byOccasion.set(occasion, rules);
  return rules;
}

/** The published weights, digest- and count-verified once, as both readers above need them. */
function verifiedWeights(): ReturnType<typeof parseWeightContent> {
  if (cachedContent !== null) return cachedContent;

  const actual = sha256(canonicalize(JSON.parse(WEIGHTS_TEXT)));
  if (actual !== WEIGHTS_DIGEST)
    throw new Error(
      `weights: digest ${actual} does not match the ledger's ${WEIGHTS_DIGEST}. Published rule ` +
        'content is immutable, so there is no benign explanation for this.',
    );

  const content = parseWeightContent(JSON.parse(WEIGHTS_TEXT), `weights.${WEIGHTS_LABEL}.json`);

  /*
   * The count is checked as well as the digest, and they catch different things. The digest
   * catches an edited file; this catches the generated module and the ledger row having come
   * from two different generations — the module would then verify perfectly against its own
   * stale digest.
   */
  /*
   * `rationaleCount` IS THE ENGINE'S, NOT A SUM WRITTEN HERE (F-065).
   *
   * This file used to add the occasion factors to the outfit block itself. That is a second
   * implementation of one rule, and it drifted the moment the engine learned to count a third
   * block: the generator wrote 50 and this recomputed 26, and every screen suite that reaches
   * `ruleSet()` failed at once. The generator and this check now ask the same function, so
   * "the two came from different generations" is the only thing this can catch — which is what
   * it is for.
   */
  const rationales = rationaleCount(content);
  if (rationales !== WEIGHTS_RATIONALE_COUNT)
    throw new Error(
      `weights: the generated module records ${String(WEIGHTS_RATIONALE_COUNT)} rationale(s) ` +
        `and the file carries ${String(rationales)}. The two came from different ` +
        'generations — run `node scripts/generate-rules-bundle.mjs`.',
    );

  cachedContent = content;
  return content;
}

let cachedSeasonal: SeasonalRules | null = null;

/**
 * The published seasonal-summary rule (F-223, ADR-0102), checked the way `ruleSet()` checks the
 * weights: the digest against the ledger's, then the engine's own parser, then the cell count the
 * generated module recorded. Any mismatch is a build that bundled two generations, and throws.
 */
export function seasonalRules(): SeasonalRules {
  if (cachedSeasonal !== null) return cachedSeasonal;
  const actual = sha256(canonicalize(JSON.parse(SEASONAL_TEXT)));
  if (actual !== SEASONAL_DIGEST)
    throw new Error(
      `seasonal summary: digest ${actual} does not match the ledger's ${SEASONAL_DIGEST}. ` +
        'Published rule content is immutable, so there is no benign explanation for this.',
    );
  const rules = parseSeasonalRules(
    JSON.parse(SEASONAL_TEXT),
    `seasonal-summary.${SEASONAL_LABEL}.json`,
  );
  if (seasonalCellCount(rules) !== SEASONAL_CELL_COUNT)
    throw new Error(
      `seasonal summary: the generated module records ${String(SEASONAL_CELL_COUNT)} cell(s) ` +
        `and the file carries ${String(seasonalCellCount(rules))}. The two came from different ` +
        'generations — run `node scripts/generate-rules-bundle.mjs`.',
    );
  cachedSeasonal = rules;
  return cachedSeasonal;
}
