/**
 * The corpus entry schema, as a parser.
 *
 * ## Why a parser and not Zod
 *
 * `@irodora/contracts` owns the wire schemas, and this is not a wire type — a source entry is
 * read from disk at build time and never crosses a process boundary. Pulling Zod in would put
 * a runtime dependency into a package the colour engine imports (F-013), and NFR-3 is the one
 * guarantee that cannot bend.
 *
 * The second reason is the one that matters day to day: NFR-20 promises the build fails **on a
 * single incomplete entry**, and keeping that promise means naming the entry and the field.
 * `CorpusError(source, path, detail)` does; an issue tree does not, without a formatter longer
 * than this parser.
 *
 * ## Three things this schema refuses to let an editor do
 *
 * 1. **Type a derived value.** `lab`, `lch`, `oklch`, `rgb`, `hex` and `gamut` are computed
 *    from `xyz` by the engine at publish time (spec §3, ADR-0043). Here they are not merely
 *    regenerated — they are *unauthorable*, and the rejection names them specifically because
 *    the spec's own §1 example shows them and an editor will copy it.
 * 2. **Leave a silent blank.** FR-21 requires every field present or explicitly `null` **with a
 *    reason**. A `null` with no matching entry in `unknowns` fails; an `unknowns` entry whose
 *    field is not `null` fails too, so the reasons cannot rot into decoration.
 * 3. **Record a reviewer before there is one — or omit one after.** See `provenance.ts`.
 */

import type { Triple } from '@irodora/color-spaces';
import { checkClassification, isClassification, type Classification } from './classification.js';
import { CorpusError } from './errors.js';
import {
  checkUnknowns,
  nullable,
  parseUnknowns,
  rejectUnknownKeys,
  requireMatch,
  requireMember,
  requireRecord,
  requireString,
  requireStringArray,
  SLUG_PATTERN,
  VERSION_ID_PATTERN,
} from './primitives.js';
import { parseProvenance, type RecordProvenance } from './provenance.js';
import { isEntryStatus, type EntryStatus } from './workflow.js';

// --- vocabularies -------------------------------------------------------------------

/**
 * The colorimetric illuminant a measurement was taken under.
 *
 * **Not** `@irodora/color-core`'s `Illuminant`, which is FR-17's *camera* condition
 * (`warm-indoor`, `low-light`) and answers a different question. Reusing it would allow
 * "measured under low-light" into a corpus record, which is not a colorimetric statement.
 */
export const MEASURED_UNDER = ['D65', 'D50', 'C', 'A', 'F2', 'F7', 'F11'] as const;
export type MeasuredUnder = (typeof MEASURED_UNDER)[number];

/** Mirrors `AdaptationMethod` in `@irodora/color-spaces`. */
export const ADAPTATIONS = ['cat16', 'bradford'] as const;
export type Adaptation = (typeof ADAPTATIONS)[number];

export const TEMPERATURES = ['warm', 'cool', 'neutral'] as const;
export type Temperature = (typeof TEMPERATURES)[number];

export const LIGHTNESS_BANDS = ['dark', 'mid', 'light'] as const;
export type LightnessBand = (typeof LIGHTNESS_BANDS)[number];

export const CHROMA_BANDS = ['low', 'mid', 'high'] as const;
export type ChromaBand = (typeof CHROMA_BANDS)[number];

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

// --- the shape ----------------------------------------------------------------------

export interface EntryName {
  readonly kanji: string;
  readonly kana: string;
  readonly romaji: string;
  /** An editorial DECISION, not a translation (spec §7). The reasoning goes in `editorialNotes`. */
  readonly en: string;
}

export interface EntryColor {
  /** Canonical CIE XYZ at D65 (ADR-0003), as the engine consumes it. */
  readonly xyz: Triple;
  readonly measuredUnder: MeasuredUnder;
  /**
   * The chromatic adaptation applied to reach D65-canonical `xyz`.
   *
   * Required whenever `measuredUnder` is not `D65`, and forbidden when it is. The transform is
   * a product decision rather than an implementation detail
   * [[the-adaptation-transform-is-a-product-decision-not-a-detail]], and two entries adapted by
   * different transforms are not comparable unless the record says which.
   */
  readonly adaptation: Adaptation | null;
  /**
   * What the source *printed*, if it printed a hex.
   *
   * Never a derived value — the derived hex lives in the published bundle. This exists so the
   * gate can check `srgbToXyz(sourceHex)` against `xyz` and catch a transcription error in
   * exactly the lossy path most likely to have one (spec §3).
   */
  readonly sourceHex: string | null;
}

export interface EntryTaxonomy {
  readonly family: string;
  readonly temperature: Temperature;
  readonly lightnessBand: LightnessBand | null;
  readonly chromaBand: ChromaBand | null;
  readonly era: string | null;
  readonly material: string | null;
  readonly season: readonly Season[] | null;
}

export interface EntryEditorial {
  readonly description_en: string;
  /** Written, never machine-translated (ADR-0028, content rules). */
  readonly description_ja: string;
  readonly historicalNote_en: string | null;
  readonly contemporaryNote_en: string | null;
  readonly fashionUse: readonly string[] | null;
}

export interface EntryRelations {
  readonly related: readonly string[];
  readonly complementary: readonly string[];
  readonly historicalVariants: readonly string[];
}

export interface CorpusEntry {
  readonly slug: string;
  readonly classification: Classification;
  readonly name: EntryName;
  readonly color: EntryColor;
  readonly taxonomy: EntryTaxonomy;
  readonly editorial: EntryEditorial;
  readonly provenance: RecordProvenance;
  readonly relations: EntryRelations;
  /** Dotted path to why that field is `null`. FR-21: no silent blanks. */
  readonly unknowns: Readonly<Record<string, string>>;
  readonly status: EntryStatus;
  readonly versionId: string;
}

// --- sections -----------------------------------------------------------------------

function parseXyz(v: unknown, path: string, src: string): Triple {
  const o = requireRecord(v, path, src);
  rejectUnknownKeys(o, ['x', 'y', 'z'], path, src);
  const read = (k: 'x' | 'y' | 'z'): number => {
    const n: unknown = o[k];
    if (typeof n !== 'number' || !Number.isFinite(n))
      throw new CorpusError(src, `${path}.${k}`, 'expected a finite number');
    if (n < 0)
      throw new CorpusError(
        src,
        `${path}.${k}`,
        `XYZ cannot be negative; got ${String(n)}. A negative tristimulus value is a ` +
          'measurement or transcription error, not an out-of-gamut colour.',
      );
    return n;
  };
  return [read('x'), read('y'), read('z')];
}

function parseName(v: unknown, src: string): EntryName {
  const o = requireRecord(v, 'name', src);
  rejectUnknownKeys(o, ['kanji', 'kana', 'romaji', 'en'], 'name', src);
  return {
    kanji: requireString(o['kanji'], 'name.kanji', src),
    kana: requireString(o['kana'], 'name.kana', src),
    romaji: requireString(o['romaji'], 'name.romaji', src),
    en: requireString(o['en'], 'name.en', src),
  };
}

function parseColor(
  v: unknown,
  src: string,
  unknowns: Readonly<Record<string, string>>,
  seenNulls: Set<string>,
): EntryColor {
  const o = requireRecord(v, 'color', src);
  rejectUnknownKeys(o, ['xyz', 'measuredUnder', 'adaptation', 'sourceHex'], 'color', src);

  const xyz = parseXyz(o['xyz'], 'color.xyz', src);
  const measuredUnder = requireMember(
    o['measuredUnder'],
    MEASURED_UNDER,
    'color.measuredUnder',
    src,
  );

  const adaptation = nullable(
    o['adaptation'],
    'color.adaptation',
    src,
    unknowns,
    seenNulls,
    (value) => requireMember(value, ADAPTATIONS, 'color.adaptation', src),
  );

  // The two directions of one rule. `xyz` is canonical D65 (ADR-0003), so a measurement under
  // anything else went through an adaptation and the record has to say which.
  if (measuredUnder !== 'D65' && adaptation === null)
    throw new CorpusError(
      src,
      'color.adaptation',
      `measuredUnder is "${measuredUnder}" but no adaptation is recorded. \`xyz\` is canonical ` +
        'D65 (ADR-0003), so this value was adapted — name the transform. Two entries adapted ' +
        'by different transforms are not comparable unless the record says which was used.',
    );
  if (measuredUnder === 'D65' && adaptation !== null)
    throw new CorpusError(
      src,
      'color.adaptation',
      'measuredUnder is "D65", which is already canonical, so no adaptation was applied. ' +
        'Recording one claims a step that did not happen.',
    );

  const sourceHex = nullable(o['sourceHex'], 'color.sourceHex', src, unknowns, seenNulls, (value) =>
    requireMatch(
      value,
      /^#[0-9a-fA-F]{6}$/u,
      'color.sourceHex',
      src,
      'expected #RRGGBB — the hex the SOURCE printed, not a derived value',
    ),
  );

  return { xyz, measuredUnder, adaptation, sourceHex };
}

function parseTaxonomy(
  v: unknown,
  src: string,
  unknowns: Readonly<Record<string, string>>,
  seenNulls: Set<string>,
): EntryTaxonomy {
  const o = requireRecord(v, 'taxonomy', src);
  rejectUnknownKeys(
    o,
    ['family', 'temperature', 'lightnessBand', 'chromaBand', 'era', 'material', 'season'],
    'taxonomy',
    src,
  );
  return {
    family: requireMatch(
      o['family'],
      SLUG_PATTERN,
      'taxonomy.family',
      src,
      'expected lowercase kebab-case, e.g. "blue-grey"',
    ),
    temperature: requireMember(o['temperature'], TEMPERATURES, 'taxonomy.temperature', src),
    lightnessBand: nullable(
      o['lightnessBand'],
      'taxonomy.lightnessBand',
      src,
      unknowns,
      seenNulls,
      (value) => requireMember(value, LIGHTNESS_BANDS, 'taxonomy.lightnessBand', src),
    ),
    chromaBand: nullable(
      o['chromaBand'],
      'taxonomy.chromaBand',
      src,
      unknowns,
      seenNulls,
      (value) => requireMember(value, CHROMA_BANDS, 'taxonomy.chromaBand', src),
    ),
    era: nullable(o['era'], 'taxonomy.era', src, unknowns, seenNulls, (value) =>
      requireString(value, 'taxonomy.era', src),
    ),
    material: nullable(o['material'], 'taxonomy.material', src, unknowns, seenNulls, (value) =>
      requireString(value, 'taxonomy.material', src),
    ),
    season: nullable(o['season'], 'taxonomy.season', src, unknowns, seenNulls, (value) => {
      if (!Array.isArray(value))
        throw new CorpusError(src, 'taxonomy.season', 'expected an array of seasons');
      return value.map((s, i) => requireMember(s, SEASONS, `taxonomy.season[${String(i)}]`, src));
    }),
  };
}

function parseEditorial(
  v: unknown,
  src: string,
  unknowns: Readonly<Record<string, string>>,
  seenNulls: Set<string>,
): EntryEditorial {
  const o = requireRecord(v, 'editorial', src);
  rejectUnknownKeys(
    o,
    ['description_en', 'description_ja', 'historicalNote_en', 'contemporaryNote_en', 'fashionUse'],
    'editorial',
    src,
  );
  return {
    description_en: requireString(o['description_en'], 'editorial.description_en', src),
    description_ja: requireString(o['description_ja'], 'editorial.description_ja', src),
    historicalNote_en: nullable(
      o['historicalNote_en'],
      'editorial.historicalNote_en',
      src,
      unknowns,
      seenNulls,
      (value) => requireString(value, 'editorial.historicalNote_en', src),
    ),
    contemporaryNote_en: nullable(
      o['contemporaryNote_en'],
      'editorial.contemporaryNote_en',
      src,
      unknowns,
      seenNulls,
      (value) => requireString(value, 'editorial.contemporaryNote_en', src),
    ),
    fashionUse: nullable(
      o['fashionUse'],
      'editorial.fashionUse',
      src,
      unknowns,
      seenNulls,
      (value) => requireStringArray(value, 'editorial.fashionUse', src),
    ),
  };
}

function parseRelations(v: unknown, src: string): EntryRelations {
  const o = requireRecord(v, 'relations', src);
  rejectUnknownKeys(o, ['related', 'complementary', 'historicalVariants'], 'relations', src);
  const read = (k: 'related' | 'complementary' | 'historicalVariants'): readonly string[] =>
    requireStringArray(o[k], `relations.${k}`, src).map((slug, i) =>
      requireMatch(
        slug,
        SLUG_PATTERN,
        `relations.${k}[${String(i)}]`,
        src,
        'expected a lowercase kebab-case slug',
      ),
    );
  // Empty arrays rather than null: "no related colours" is a statement, and an editor who has
  // not looked would otherwise write the same thing as one who has.
  return {
    related: read('related'),
    complementary: read('complementary'),
    historicalVariants: read('historicalVariants'),
  };
}

// --- the parser ---------------------------------------------------------------------

const ENTRY_KEYS = [
  'slug',
  'classification',
  'name',
  'color',
  'taxonomy',
  'editorial',
  'provenance',
  'relations',
  'unknowns',
  'status',
  'versionId',
] as const;

/**
 * Parse one corpus entry, or throw a `CorpusError` naming the field.
 *
 * `source` is the filename it came from, and it is required rather than optional because the
 * message is the deliverable: "expected a non-empty string" without a filename is not a failure
 * an editor can act on.
 */
export function parseEntry(value: unknown, source: string): CorpusEntry {
  const o = requireRecord(value, '', source);
  rejectUnknownKeys(o, ENTRY_KEYS, '', source);

  const slug = requireMatch(
    o['slug'],
    SLUG_PATTERN,
    'slug',
    source,
    'expected lowercase kebab-case, e.g. "ai-nezumi"',
  );

  const classification: unknown = o['classification'];
  if (!isClassification(classification))
    throw new CorpusError(
      source,
      'classification',
      'expected one of historical, traditional, modern-japanese, japanese-inspired, editorial; ' +
        `got ${JSON.stringify(classification)}. It is required and displayed (FR-23) — the ` +
        'renderer switches on it, so it cannot default.',
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

  const entry: CorpusEntry = {
    slug,
    classification,
    name: parseName(o['name'], source),
    color: parseColor(o['color'], source, unknowns, seenNulls),
    taxonomy: parseTaxonomy(o['taxonomy'], source, unknowns, seenNulls),
    editorial: parseEditorial(o['editorial'], source, unknowns, seenNulls),
    provenance: parseProvenance(o['provenance'], source, status, unknowns, seenNulls),
    relations: parseRelations(o['relations'], source),
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

  checkClassification(
    {
      classification: entry.classification,
      sourceType: entry.provenance.sourceType,
      publishedYear: entry.provenance.publishedYear,
    },
    source,
  );

  const self = [
    ...entry.relations.related,
    ...entry.relations.complementary,
    ...entry.relations.historicalVariants,
  ].includes(slug);
  if (self) throw new CorpusError(source, 'relations', `"${slug}" relates to itself`);

  return entry;
}
