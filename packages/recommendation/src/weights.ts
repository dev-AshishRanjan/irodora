/**
 * Weights as published content: versioned, immutable, and carrying a reason for every number.
 *
 * > *Recommendation weights and harmony rules are editable content, not code. Changing a weight
 * > changes rankings without a code change; every change creates a version.* — FR-67
 *
 * > *Occasion context as deterministic weighting profiles. Occasion changes ranking measurably;
 * > weights are content, not code, and are versioned.* — FR-34
 *
 * ## This wraps `parseRuleSet`; it does not restate it
 *
 * *"Weights sum to 1.0, validated at publish time"* is F-029's third criterion and
 * [`rules.ts`](./rules.ts) already implements it. Writing that rule a second time — in
 * `@irodora/corpus` beside `parsePhraseLexicon`, or in the gate script — would be two
 * definitions of one constraint in two languages, which is the shape
 * [E-013](../../../.harness/state/effects.json) exists to keep to one place.
 *
 * So this module validates the **editorial envelope** and hands each occasion's block to the
 * engine's own validator. The gate and the engine therefore agree by construction rather than
 * by review.
 *
 * ## An occasion IS a weight set
 *
 * FR-34 asks for occasions as *"deterministic weighting profiles"*, so an occasion is a named
 * set of weights over the same four factors and `default` is one of them. Nothing in
 * `scoreColor` changes: choosing an occasion is choosing which `RuleSet` to pass.
 *
 * The alternative — an occasion as a modifier applied *after* scoring — would put a second set
 * of numbers between the weights and the answer, and the weights would stop being the thing
 * that decides.
 *
 * ## What "without a code change" means here, and what it does not
 *
 * [ADR-0011](../../../docs/adr/0011-recommendation-rules-are-versioned-content.md) was written
 * when there was a server and an admin application to publish through.
 * [ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
 * removed both, so new content ships in a new build and *"no deployment"* is not a claim this
 * product can make.
 *
 * **FR-67's own wording is the one that survives**: changing a weight changes rankings without
 * a *code* change. That is exactly what this module makes true, and it is what
 * `test/weights.test.ts` asserts — two occasions, one unchanged engine, different rankings.
 */

import { parseRuleSet, requireObject, RuleError, WEIGHT_TOLERANCE, type RuleSet } from './rules.js';
import { SCORE_FACTORS, type ScoreFactor } from './profile.js';

/**
 * The occasions FR-34 names, plus `default`.
 *
 * A closed set rather than free-form strings: an occasion the engine does not know is a
 * weighting profile nobody can select, and accepting it silently would let a publish add a
 * context that reaches no screen — the shape
 * [[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]] warns about,
 * arriving from the content side.
 */
export const OCCASIONS = ['default', 'office', 'casual', 'formal', 'japanese-inspired'] as const;
export type Occasion = (typeof OCCASIONS)[number];

/** One factor's weight, and the reason it is that number. */
export interface WeightedFactor {
  readonly factor: ScoreFactor;
  readonly weight: number;
  /**
   * Why this weight, in the editor's words.
   *
   * **ADR-0011 §4**: *a weight without a stated reason cannot be evaluated, defended or safely
   * changed by the next person.* Required and non-empty — a blank rationale is the same
   * absence wearing a field.
   */
  readonly rationale: string;
}

/** One occasion's complete weighting profile. */
export interface OccasionWeights {
  readonly occasion: Occasion;
  readonly factors: readonly WeightedFactor[];
}

/**
 * The six components of an outfit score, weighted. Added by F-031.
 *
 * `OutfitComponent` is not imported here — that would make this module depend on the scorer it
 * feeds. The key set is checked against the array below, and `outfit-score.ts` imports THIS
 * union, so there is one list and the compiler keeps the two in step.
 */
export const OUTFIT_WEIGHT_COMPONENTS = [
  'harmony',
  'personalFit',
  'contrast',
  'corpusAffinity',
  'versatility',
  'cvdAccessibility',
] as const;
export type OutfitWeightComponent = (typeof OUTFIT_WEIGHT_COMPONENTS)[number];

/** The published file, as the engine reads it. */
export interface WeightContent {
  readonly versionId: string;
  readonly publishedAt: string;
  /** Every occasion in `OCCASIONS`, exactly once. */
  readonly occasions: readonly OccasionWeights[];
  readonly falloff: RuleSet['falloff'];
  readonly poles: RuleSet['poles'];
  /**
   * The outfit-score weights, or `null` for a version published before F-031 existed.
   *
   * **Optional in the parser, and that is not a soft default.** `weights.2026.08.1.json` is
   * published and immutable — making this field required would stop it parsing, and gate 11
   * would go red on a file nobody is allowed to edit. `null` means exactly one thing here, the
   * same way a nullable migration-2 column does: *this version predates the feature*.
   *
   * Nothing falls back. `outfitWeights` throws naming the version rather than substituting a
   * number nobody published.
   */
  readonly outfit: Readonly<Record<OutfitWeightComponent, WeightedComponent>> | null;
}

/** One outfit component's weight, and the reason it is that number. */
export interface WeightedComponent {
  readonly weight: number;
  readonly rationale: string;
}

/** The shortest rationale that could say anything. Not a style rule — a floor under a field. */
export const MIN_RATIONALE = 20;

/**
 * Parse a published weight file, or throw naming the field.
 *
 * Every occasion's weights go through `parseRuleSet`, so the sum-to-1 constraint is checked by
 * the code the engine scores with rather than by a copy of it.
 */
export function parseWeightContent(value: unknown, where: string): WeightContent {
  if (typeof value !== 'object' || value === null)
    throw new RuleError(`${where}: expected an object`);
  const o = value as Record<string, unknown>;

  const versionId = o['versionId'];
  if (typeof versionId !== 'string' || versionId === '')
    throw new RuleError(`${where}: versionId is required`);
  const publishedAt = o['publishedAt'];
  if (typeof publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(publishedAt))
    throw new RuleError(`${where}: publishedAt must be YYYY-MM-DD; got ${String(publishedAt)}`);

  const rawOccasions = o['occasions'];
  if (!Array.isArray(rawOccasions)) throw new RuleError(`${where}: occasions must be an array`);

  const seen = new Set<string>();
  const occasions: OccasionWeights[] = rawOccasions.map((entry, index) => {
    const at = `${where}: occasions[${String(index)}]`;
    if (typeof entry !== 'object' || entry === null) throw new RuleError(`${at}: expected object`);
    const e = entry as Record<string, unknown>;

    const occasion = e['occasion'];
    if (typeof occasion !== 'string' || !(OCCASIONS as readonly string[]).includes(occasion))
      throw new RuleError(
        `${at}.occasion must be one of ${OCCASIONS.join(', ')}; got ${JSON.stringify(occasion)}`,
      );
    if (seen.has(occasion))
      throw new RuleError(
        `${at}.occasion "${occasion}" appears twice. Two weighting profiles under one name is a ` +
          'question with two right answers, and which one wins would depend on file order.',
      );
    seen.add(occasion);

    const rawFactors = e['factors'];
    if (!Array.isArray(rawFactors)) throw new RuleError(`${at}.factors must be an array`);

    const factors: WeightedFactor[] = rawFactors.map((f, i) => {
      const fAt = `${at}.factors[${String(i)}]`;
      if (typeof f !== 'object' || f === null) throw new RuleError(`${fAt}: expected object`);
      const record = f as Record<string, unknown>;
      const factor = record['factor'];
      if (typeof factor !== 'string' || !(SCORE_FACTORS as readonly string[]).includes(factor))
        throw new RuleError(
          `${fAt}.factor must be one of ${SCORE_FACTORS.join(', ')}; got ${JSON.stringify(factor)}`,
        );
      const weight = record['weight'];
      if (typeof weight !== 'number')
        throw new RuleError(`${fAt}.weight must be a number; got ${JSON.stringify(weight)}`);
      const rationale = record['rationale'];
      if (typeof rationale !== 'string' || rationale.trim().length < MIN_RATIONALE)
        throw new RuleError(
          `${fAt}.rationale is required and must say something (at least ` +
            `${String(MIN_RATIONALE)} characters). ADR-0011 section 4: a weight without a ` +
            'stated reason cannot be evaluated, defended or safely changed by the next person.',
        );
      return { factor: factor as ScoreFactor, weight, rationale };
    });

    /*
     * Every factor exactly once, before the sum is checked — otherwise a file with `chroma`
     * twice and `contrast` missing could still sum to 1 and pass.
     *
     * EVERY mismatch is reported, not the first. The realistic edit produces two at once — a
     * factor retyped as another one duplicates that one AND loses this one — and a message
     * naming only the duplicate sends the reader to fix half of it.
     */
    const named = factors.map((f) => f.factor);
    const wrong = SCORE_FACTORS.map((factor) => ({
      factor,
      count: named.filter((n) => n === factor).length,
    })).filter((c) => c.count !== 1);
    if (wrong.length > 0)
      throw new RuleError(
        `${at}: every factor must appear exactly once — ` +
          wrong.map((c) => `"${c.factor}" appears ${String(c.count)}`).join(', '),
      );

    return { occasion: occasion as Occasion, factors };
  });

  for (const occasion of OCCASIONS)
    if (!seen.has(occasion))
      throw new RuleError(
        `${where}: no weights for occasion "${occasion}". Every occasion the engine can be ` +
          'asked for must be published, or selecting it would fall back to something nobody ' +
          'chose.',
      );

  const falloffRaw = o['falloff'];
  const polesRaw = o['poles'];

  /*
   * THE SUM CONSTRAINT IS CHECKED BY THE ENGINE'S OWN VALIDATOR, once per occasion. Building a
   * RuleSet here and discarding it is the point: what is wanted is the THROW, so a published
   * file that would produce incomparable scores never reaches a device.
   */
  const content = {
    versionId,
    publishedAt,
    occasions,
    outfit: parseOutfitWeights(o['outfit'], `${where}: outfit`),
  };
  let firstRules: RuleSet | null = null;
  for (const entry of occasions) {
    const rules = parseRuleSet(
      {
        versionId,
        weights: Object.fromEntries(entry.factors.map((f) => [f.factor, f.weight])),
        falloff: falloffRaw,
        poles: polesRaw,
      },
      `${where}: occasions.${entry.occasion}`,
    );
    firstRules ??= rules;
  }
  // Unreachable — `OCCASIONS` is non-empty and every one is required above — but the compiler
  // does not know that, and a non-null assertion here would be the thing this file refuses to
  // do everywhere else.
  if (firstRules === null) throw new RuleError(`${where}: no occasions to validate`);

  return { ...content, falloff: firstRules.falloff, poles: firstRules.poles };
}

/**
 * The outfit block, or `null` when the version predates it.
 *
 * ABSENT AND EMPTY ARE DIFFERENT. A missing key is a version published before F-031; a present
 * block that is incomplete is a publish somebody got wrong, and it is refused. Treating the
 * second as the first is how a half-written weight set reaches a device.
 */
function parseOutfitWeights(
  value: unknown,
  where: string,
): Readonly<Record<OutfitWeightComponent, WeightedComponent>> | null {
  if (value === undefined || value === null) return null;
  const o = requireObject(value, where);

  for (const key of Object.keys(o))
    if (!(OUTFIT_WEIGHT_COMPONENTS as readonly string[]).includes(key))
      throw new RuleError(
        `${where}.${key} is not a component this engine scores ` +
          `(${OUTFIT_WEIGHT_COMPONENTS.join(', ')})`,
      );

  let total = 0;
  const out: Record<string, WeightedComponent> = {};
  for (const component of OUTFIT_WEIGHT_COMPONENTS) {
    const entry = requireObject(o[component], `${where}.${component}`);
    const weight = entry['weight'];
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1)
      throw new RuleError(
        `${where}.${component}.weight must be a number in [0,1]; got ${JSON.stringify(weight)}`,
      );
    const rationale = entry['rationale'];
    if (typeof rationale !== 'string' || rationale.trim().length < MIN_RATIONALE)
      throw new RuleError(
        `${where}.${component}.rationale is required and must say something (at least ` +
          `${String(MIN_RATIONALE)} characters). ADR-0011 section 4 applies to every weight, ` +
          'not only to the four a colour is scored on.',
      );
    out[component] = { weight, rationale };
    total += weight;
  }
  if (Math.abs(total - 1) > WEIGHT_TOLERANCE)
    throw new RuleError(
      `${where}: weights sum to ${String(total)}, not 1. An outfit score is the weighted sum ` +
        'of six component scores in [0,100], so weights that do not sum to 1 do not produce an ' +
        'overall in [0,100].',
    );
  return out as Record<OutfitWeightComponent, WeightedComponent>;
}

/**
 * The outfit weights for a published version, or a throw naming it.
 *
 * **No fallback.** A version published before F-031 carries none, and substituting a number
 * nobody published would make "scored under 2026.08.1" and "scored under weights we invented"
 * the same sentence on a screen whose whole proposition is explainability.
 */
export function outfitWeights(
  content: WeightContent,
): Readonly<Record<OutfitWeightComponent, number>> {
  if (content.outfit === null)
    throw new RuleError(
      `weights ${content.versionId} carry no outfit block. That version was published before ` +
        'outfit scoring existed; publish a version that includes one rather than scoring ' +
        'against weights nobody chose.',
    );
  const outfit = content.outfit;
  return Object.fromEntries(OUTFIT_WEIGHT_COMPONENTS.map((c) => [c, outfit[c].weight])) as Record<
    OutfitWeightComponent,
    number
  >;
}

/**
 * The `RuleSet` for one occasion.
 *
 * Throws on an occasion the content does not carry rather than falling back to `default`: a
 * silent fallback would make "the office weighting" and "the weighting nobody configured"
 * indistinguishable on screen, which is the one thing a versioned, explainable ranking cannot
 * afford.
 */
export function ruleSetFor(content: WeightContent, occasion: Occasion): RuleSet {
  const found = content.occasions.find((o) => o.occasion === occasion);
  if (found === undefined)
    throw new RuleError(
      `weights ${content.versionId} carry no occasion "${occasion}". Falling back to default ` +
        'would report a ranking under a context nobody published.',
    );
  return {
    versionId: content.versionId,
    weights: Object.fromEntries(found.factors.map((f) => [f.factor, f.weight])) as Record<
      ScoreFactor,
      number
    >,
    falloff: content.falloff,
    poles: content.poles,
  };
}

/** Every rationale in the file, for a gate that wants to report how many it checked. */
export function rationaleCount(content: WeightContent): number {
  // The outfit block's six count too. A ledger row that recorded only the occasion rationales
  // would let six weights be added, or removed, without the count moving.
  const outfit = content.outfit === null ? 0 : Object.keys(content.outfit).length;
  return outfit + occasionRationaleCount(content);
}

/** The occasion half, kept separate so `rationaleCount` reads as the sum it is. */
function occasionRationaleCount(content: WeightContent): number {
  return content.occasions.reduce((n, o) => n + o.factors.length, 0);
}
