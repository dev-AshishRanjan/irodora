/**
 * The combination schema (FR-73, NFR-20).
 *
 * ## What a combination is, and why it is not a palette
 *
 * A **palette** is a family: five to eight colours, an `anchor`, ranks and weights, meaning
 * *these belong together*. A **combination** is a different claim — **two to four colours meant
 * to be worn or used together** — and it gets its own record type rather than a `category` on
 * palettes so that no consumer downstream has to guess which claim it is holding.
 *
 * ```
 * palette      family    5–8   anchor + weights     "these belong together"
 * combination  pairing   2–4   lead + companions    "these go together"
 * ```
 *
 * The role vocabulary is `lead` and `companion`, which is the vocabulary the outfit engine
 * already thinks in: the lead is what you are holding.
 *
 * ## The rule this file exists to enforce
 *
 * > **A combination is ours, and can never be presented as historical.**
 *
 * The reference is *A Dictionary of Color Combinations*. We do what the book does, from our own
 * corpus. We do not ingest anyone's digitisation of it — `content/AGENTS.md` §2 — because *"Wada
 * is public domain" is not the same statement as "this website's Wada dataset is free to
 * ingest"*: the digitiser's choices about printing, paper ageing and illuminant **are** the
 * dataset.
 *
 * So `classification` is constrained to {@link OUR_OWN_CURATION} **unconditionally** here, where
 * for an entry the constraint is conditional on `sourceType`. An entry can legitimately be
 * `historical` — somebody measured a dyed silk. A combination cannot: pairing two colours is an
 * editorial act, and there is no version of it that is a measurement of the world.
 *
 * ## Two is the floor and four is the ceiling, and both are load-bearing
 *
 * **One colour is not a combination**, it is a colour. **Five is a palette**, and a schema that
 * accepted five would make the distinction above a naming convention rather than a rule — the
 * two record types would drift into synonyms and the claim each one makes would stop being
 * legible from the type.
 */

import {
  checkClassification,
  isClassification,
  OUR_OWN_CURATION,
  type Classification,
} from './classification.js';
import { CorpusError } from './errors.js';
import {
  checkUnknowns,
  parseUnknowns,
  rejectUnknownKeys,
  requireMatch,
  requireMember,
  requireRecord,
  requireString,
  SLUG_PATTERN,
  VERSION_ID_PATTERN,
} from './primitives.js';
import { parseProvenance, type RecordProvenance } from './provenance.js';
import { isEntryStatus, type EntryStatus } from './workflow.js';

/** What a colour does in a combination. Exactly one `lead`; the rest answer to it. */
export const COMBINATION_ROLES = ['lead', 'companion'] as const;
export type CombinationRole = (typeof COMBINATION_ROLES)[number];

/** Two is not a pairing you can get wrong; one is a colour and five is a palette. */
export const COMBINATION_MIN = 2;
export const COMBINATION_MAX = 4;

/**
 * What a combination is *for*.
 *
 * Deliberately about the colours rather than about an occasion: an occasion is a weighting
 * question the recommendation engine already answers from `content/rules`, and putting one here
 * would be the second place that vocabulary lives.
 */
export const COMBINATION_INTENTS = ['contrast', 'harmony', 'accent', 'tonal'] as const;
export type CombinationIntent = (typeof COMBINATION_INTENTS)[number];

export interface CombinationMember {
  /** A slug in `content/colors/`. Resolved by the whole-corpus check, not here. */
  readonly slug: string;
  readonly role: CombinationRole;
  readonly rank: number;
}

export interface CombinationName {
  readonly en: string;
  readonly ja: string;
}

export interface CorpusCombination {
  readonly slug: string;
  readonly name: CombinationName;
  readonly classification: Classification;
  readonly intent: CombinationIntent;
  readonly colors: readonly CombinationMember[];
  readonly provenance: RecordProvenance;
  readonly unknowns: Readonly<Record<string, string>>;
  readonly status: EntryStatus;
  readonly versionId: string;
}

const COMBINATION_KEYS = [
  'slug',
  'name',
  'classification',
  'intent',
  'colors',
  'provenance',
  'unknowns',
  'status',
  'versionId',
] as const;

/**
 * No `weight`, and that is the difference from a palette rather than an omission.
 *
 * A palette weights its members because it is a family with a centre of gravity. A combination
 * of three colours in which one contributes 0.4 of something is a claim nobody can act on — the
 * lead is named by its role, and the rest are companions or they are not in the record.
 */
function parseMember(v: unknown, index: number, src: string): CombinationMember {
  const path = `colors[${String(index)}]`;
  const o = requireRecord(v, path, src);
  rejectUnknownKeys(o, ['slug', 'role', 'rank'], path, src);

  const rank: unknown = o['rank'];
  if (typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1)
    throw new CorpusError(src, `${path}.rank`, `expected an integer >= 1; got ${String(rank)}`);

  return {
    slug: requireMatch(
      o['slug'],
      SLUG_PATTERN,
      `${path}.slug`,
      src,
      'expected a lowercase kebab-case colour slug',
    ),
    role: requireMember(o['role'], COMBINATION_ROLES, `${path}.role`, src),
    rank,
  };
}

function parseMembers(v: unknown, src: string): readonly CombinationMember[] {
  if (!Array.isArray(v)) throw new CorpusError(src, 'colors', 'expected an array of members');

  if (v.length < COMBINATION_MIN || v.length > COMBINATION_MAX)
    throw new CorpusError(
      src,
      'colors',
      `expected ${String(COMBINATION_MIN)} to ${String(COMBINATION_MAX)} colours; got ` +
        `${String(v.length)}. One colour is a colour, not a combination; five or more is a ` +
        'palette, and `content/palettes/` is where a family of colours belongs. The two record ' +
        'types make different claims and the bounds are what keep them from becoming synonyms.',
    );

  const members = v.map((m, i) => parseMember(m, i, src));

  const leads = members.filter((m) => m.role === 'lead');
  if (leads.length !== 1)
    throw new CorpusError(
      src,
      'colors',
      `expected exactly one member with role "lead"; got ${String(leads.length)}. The lead is ` +
        'the colour somebody is holding and the companions are what goes with it — two leads is ' +
        'two combinations written as one, and none is a set of colours with nothing to answer to.',
    );

  const seen = new Set<string>();
  for (const m of members) {
    if (seen.has(m.slug))
      throw new CorpusError(
        src,
        'colors',
        `"${m.slug}" appears twice. A colour paired with itself is not a combination.`,
      );
    seen.add(m.slug);
  }

  const ranks = members.map((m) => m.rank).sort((a, b) => a - b);
  const expected = members.map((_, i) => i + 1);
  if (ranks.join(',') !== expected.join(','))
    throw new CorpusError(
      src,
      'colors',
      `ranks are [${ranks.join(', ')}]; expected [${expected.join(', ')}]. A gap or a duplicate ` +
        'means a member was removed and the order left for the next reader to guess.',
    );

  return members;
}

function parseName(v: unknown, src: string): CombinationName {
  const o = requireRecord(v, 'name', src);
  rejectUnknownKeys(o, ['en', 'ja'], 'name', src);
  return {
    en: requireString(o['en'], 'name.en', src),
    ja: requireString(o['ja'], 'name.ja', src),
  };
}

/** Parse one combination, or throw a `CorpusError` naming the field. */
export function parseCombination(value: unknown, source: string): CorpusCombination {
  const o = requireRecord(value, '', source);
  rejectUnknownKeys(o, COMBINATION_KEYS, '', source);

  const classification: unknown = o['classification'];
  if (!isClassification(classification))
    throw new CorpusError(
      source,
      'classification',
      'expected one of historical, traditional, modern-japanese, japanese-inspired, editorial; ' +
        `got ${JSON.stringify(classification)}.`,
    );

  /*
   * CRITERION 2, IN THE PARSER RATHER THAN IN A REVIEW.
   *
   * Unconditional, unlike the entry rule — `checkClassification` constrains an entry to our own
   * curation only when its `sourceType` is `editorial`, because an entry CAN legitimately be
   * historical: somebody measured a dyed silk. Pairing two colours is an editorial act and there
   * is no version of it that is a measurement of the world, so there is no `sourceType` under
   * which `historical` would be honest here.
   */
  if (!(OUR_OWN_CURATION as readonly Classification[]).includes(classification))
    throw new CorpusError(
      source,
      'classification',
      `a combination is our own editorial work and can only be ${OUR_OWN_CURATION.join(' or ')}; ` +
        `got "${classification}". Presenting our curation as attested history is the same ` +
        "dishonesty as ingesting somebody else's dataset, pointed the other way — and easier " +
        'to commit, because it requires no external action at all (content/AGENTS.md §3). The ' +
        'reference is A Dictionary of Color Combinations; we do what the book does, from our ' +
        "own corpus, and we do not transcribe anyone's digitisation of it.",
    );

  const status: unknown = o['status'];
  if (!isEntryStatus(status))
    throw new CorpusError(
      source,
      'status',
      'expected one of draft, review, verified, published, superseded; got ' +
        JSON.stringify(status),
    );

  const unknowns = parseUnknowns(o['unknowns'] ?? {}, source);
  const seenNulls = new Set<string>();

  const combination: CorpusCombination = {
    slug: requireMatch(
      o['slug'],
      SLUG_PATTERN,
      'slug',
      source,
      'expected lowercase kebab-case, e.g. "indigo-and-straw"',
    ),
    name: parseName(o['name'], source),
    classification,
    intent: requireMember(o['intent'], COMBINATION_INTENTS, 'intent', source),
    colors: parseMembers(o['colors'], source),
    provenance: parseProvenance(o['provenance'], source, status, unknowns, seenNulls),
    unknowns,
    status,
    versionId: requireMatch(
      o['versionId'],
      VERSION_ID_PATTERN,
      'versionId',
      source,
      'expected YYYY.MM.N (FR-25)',
    ),
  };

  checkUnknowns(unknowns, seenNulls, source);

  // Still run, and NOT redundant with the check above: it also enforces the publishedYear rule,
  // and it is where the entry-shaped constraints live. This file adds one; it replaces none.
  checkClassification(
    {
      classification: combination.classification,
      sourceType: combination.provenance.sourceType,
      publishedYear: combination.provenance.publishedYear,
    },
    source,
  );

  return combination;
}

/** The lead, which the schema guarantees exists. */
export function leadOf(combination: CorpusCombination): CombinationMember {
  const lead = combination.colors.find((c) => c.role === 'lead');
  if (lead === undefined)
    throw new CorpusError(
      combination.slug,
      'colors',
      'no lead. `parseCombination` cannot produce this, so a record reaching here without one ' +
        'was built by something that bypassed the parser.',
    );
  return lead;
}
