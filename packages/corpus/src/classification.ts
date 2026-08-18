/**
 * The five classifications, and the evidence each one requires.
 *
 * `classification` is the single most important field in an entry, because it is what keeps
 * the corpus honest. It is required, it is displayed (FR-23), and the renderer switches on
 * it — so it cannot quietly default.
 *
 * The rule this file exists to enforce is the one that is easiest to break and hardest to
 * notice: **our own curation is never `historical`.** Presenting our editorial work as
 * attested history is the same dishonesty as ingesting someone else's dataset, pointed in
 * the other direction — and easier to commit, because it requires no external action at all
 * (ADR-0007, `content/AGENTS.md` §3).
 */

import { CorpusError } from './errors.js';

/** FR-23. Ordered from the strongest claim about the world to the weakest. */
export const CLASSIFICATIONS = [
  'historical',
  'traditional',
  'modern-japanese',
  'japanese-inspired',
  'editorial',
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

/** The source hierarchy of `licensing-and-provenance.md` §2, as a checkable union. */
export const SOURCE_TYPES = [
  'measurement',
  'publication',
  'museum-record',
  'editorial',
  'standard',
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

/**
 * The classifications that mean "this is ours".
 *
 * `satisfies readonly Classification[]` rather than a bare array, so adding a classification
 * and mistyping it here is a compile error.
 *
 * **It is load-bearing.** `checkClassification` requires a record with
 * `sourceType: "editorial"` to carry one of these — a positive list, not a single forbidden
 * value — which is what makes the constant a rule rather than documentation. An evaluation
 * found it previously exported, documented as forcing exactly that decision, and consumed by
 * nothing but its own tests.
 */
export const OUR_OWN_CURATION = [
  'japanese-inspired',
  'editorial',
] as const satisfies readonly Classification[];

export type OurOwnCuration = (typeof OUR_OWN_CURATION)[number];

export function isClassification(v: unknown): v is Classification {
  return typeof v === 'string' && (CLASSIFICATIONS as readonly string[]).includes(v);
}

export function isSourceType(v: unknown): v is SourceType {
  return typeof v === 'string' && (SOURCE_TYPES as readonly string[]).includes(v);
}

export function isOurOwnCuration(c: Classification): c is OurOwnCuration {
  return (OUR_OWN_CURATION as readonly Classification[]).includes(c);
}

/**
 * The source types that can carry a claim about the past.
 *
 * `editorial` is absent, and that absence is the whole mechanism: an entry whose value came
 * from our own judgement cannot be labelled `historical`, because there is no dated primary
 * source behind a judgement.
 */
const ATTESTING_SOURCE_TYPES = [
  'measurement',
  'publication',
  'museum-record',
  'standard',
] as const satisfies readonly SourceType[];

/** What the spec's evidence column requires, in the order the gate reports it. */
export interface ClassificationEvidence {
  readonly classification: Classification;
  readonly sourceType: SourceType;
  /** `provenance.publishedYear` — the *date* in "a dated primary source". */
  readonly publishedYear: number | null;
}

/**
 * The classification rules, as the `content` gate applies them.
 *
 * Two of the gate charter's bullets live here:
 *
 *   - a `historical` classification without a dated primary source;
 *   - our own curation marked historical.
 *
 * They are separate checks with separate messages, because they are separate mistakes: the
 * first is an entry whose paperwork is incomplete, the second is a claim about the world we
 * are not entitled to make.
 */
export function checkClassification(evidence: ClassificationEvidence, source: string): void {
  const { classification, sourceType, publishedYear } = evidence;

  // Our own curation may only wear one of OUR OWN labels — not merely "not historical".
  //
  // The rule was originally written as `classification === 'historical' && sourceType ===
  // 'editorial'`, which let an editorial source call itself `traditional` or
  // `modern-japanese`. Those are claims about the received canon and about documented current
  // practice; making either from our own judgement is the same dishonesty as `historical`,
  // just quieter. ADR-0007 says our work is `japanese-inspired` or `editorial` — a positive
  // list, and this is that list rather than a single forbidden value.
  //
  // Written against OUR_OWN_CURATION so that adding a sixth classification forces a decision
  // here. An evaluation found the constant was previously exported, documented as doing
  // exactly that, and consumed by nothing.
  if (sourceType === 'editorial' && !isOurOwnCuration(classification))
    throw new CorpusError(
      source,
      'classification',
      `a record whose sourceType is "editorial" is OUR OWN CURATION and cannot be classified ` +
        `"${classification}". Our work is ${OUR_OWN_CURATION.map((c) => `"${c}"`).join(' or ')} ` +
        '(ADR-0007; content/AGENTS.md rule 3). Presenting our curation as attested history — ' +
        'or as an established canonical name, or as documented current practice — is the same ' +
        'dishonesty as ingesting someone else’s data, pointed the other way.',
    );

  if (classification === 'historical' && publishedYear === null)
    throw new CorpusError(
      source,
      'provenance.publishedYear',
      'a "historical" classification requires a DATED primary source. Either record the ' +
        'year the source was published, or classify this "traditional" — which claims ' +
        'an established name in the received canon rather than a specific attestation.',
    );

  if (
    classification === 'historical' &&
    !(ATTESTING_SOURCE_TYPES as readonly SourceType[]).includes(sourceType)
  )
    throw new CorpusError(
      source,
      'provenance.sourceType',
      `a "historical" classification needs one of ${ATTESTING_SOURCE_TYPES.join(', ')}; ` +
        `got "${sourceType}".`,
    );
}
