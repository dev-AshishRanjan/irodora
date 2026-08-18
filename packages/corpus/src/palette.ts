/**
 * The palette schema (spec §4, FR-22).
 *
 * ## The rule this file is really about
 *
 * > A palette without an anchor is a colour list, not a palette.
 *
 * That sentence is in the spec, and it is the kind of statement that stays true and unchecked
 * for years. The anchor is what everything else is positioned against; without one the roles
 * are labels rather than a structure, and every consumer downstream — harmony, outfit scoring,
 * the share card — has to invent a reference point, differently.
 *
 * ## What else cannot be left to good intentions
 *
 * - **Ranks are contiguous from 1.** A gap means an entry was deleted and the order silently
 *   re-interpreted by whoever reads it next.
 * - **Weights are `(0, 1]`.** A zero weight is a colour that is in the palette and contributes
 *   nothing, which is a deletion written in a way that survives review.
 * - **A slug appears once.** The same colour twice is either a mistake or an attempt to weight
 *   by repetition, and both should be said out loud instead.
 *
 * Note what is *not* here: no check that the weights sum to 1. Spec §4 does not ask for it, and
 * `content/rules/` — where weights DO have to normalise (F-029, E-009) — is a different file
 * with a different meaning. Importing that rule here because it sounds similar would produce a
 * gate that rejects correct palettes.
 */

import { checkClassification, isClassification, type Classification } from './classification.js';
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

/** Spec §4. `anchor` is the one that must be present. */
export const PALETTE_ROLES = ['anchor', 'neutral', 'light', 'accent'] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];

export const PALETTE_CATEGORIES = ['contemporary', 'traditional', 'seasonal'] as const;
export type PaletteCategory = (typeof PALETTE_CATEGORIES)[number];

export interface PaletteMember {
  /** A slug in `content/colors/`. Resolved by the whole-corpus check, not here. */
  readonly slug: string;
  readonly role: PaletteRole;
  readonly rank: number;
  readonly weight: number;
}

export interface PaletteName {
  readonly en: string;
  readonly ja: string;
}

export interface CorpusPalette {
  readonly slug: string;
  readonly name: PaletteName;
  readonly classification: Classification;
  readonly category: PaletteCategory;
  readonly colors: readonly PaletteMember[];
  readonly provenance: RecordProvenance;
  readonly unknowns: Readonly<Record<string, string>>;
  readonly status: EntryStatus;
  readonly versionId: string;
}

const PALETTE_KEYS = [
  'slug',
  'name',
  'classification',
  'category',
  'colors',
  'provenance',
  'unknowns',
  'status',
  'versionId',
] as const;

function parseMember(v: unknown, index: number, src: string): PaletteMember {
  const path = `colors[${String(index)}]`;
  const o = requireRecord(v, path, src);
  rejectUnknownKeys(o, ['slug', 'role', 'rank', 'weight'], path, src);

  const rank: unknown = o['rank'];
  if (typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1)
    throw new CorpusError(src, `${path}.rank`, `expected an integer >= 1; got ${String(rank)}`);

  const weight: unknown = o['weight'];
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0 || weight > 1)
    throw new CorpusError(
      src,
      `${path}.weight`,
      `expected a number in (0, 1]; got ${String(weight)}. A zero weight is a colour that is ` +
        'in the palette and contributes nothing — remove it instead, so the removal is visible.',
    );

  return {
    slug: requireMatch(
      o['slug'],
      SLUG_PATTERN,
      `${path}.slug`,
      src,
      'expected a lowercase kebab-case colour slug',
    ),
    role: requireMember(o['role'], PALETTE_ROLES, `${path}.role`, src),
    rank,
    weight,
  };
}

function parseMembers(v: unknown, src: string): readonly PaletteMember[] {
  if (!Array.isArray(v)) throw new CorpusError(src, 'colors', 'expected an array of members');
  if (v.length === 0)
    throw new CorpusError(src, 'colors', 'a palette with no colours is not a palette');

  const members = v.map((m, i) => parseMember(m, i, src));

  if (!members.some((m) => m.role === 'anchor'))
    throw new CorpusError(
      src,
      'colors',
      'no member has role "anchor". A palette without an anchor is a colour list, not a ' +
        'palette (spec §4): the anchor is what the other roles are positioned against, and ' +
        'without one every consumer downstream invents a reference point of its own.',
    );

  const seen = new Set<string>();
  for (const m of members) {
    if (seen.has(m.slug))
      throw new CorpusError(
        src,
        'colors',
        `"${m.slug}" appears twice. Weighting by repetition is not a thing this schema does — ` +
          'say it in `weight` instead.',
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
        'means an entry was removed and the order left for the next reader to guess.',
    );

  return members;
}

function parseName(v: unknown, src: string): PaletteName {
  const o = requireRecord(v, 'name', src);
  rejectUnknownKeys(o, ['en', 'ja'], 'name', src);
  return {
    en: requireString(o['en'], 'name.en', src),
    ja: requireString(o['ja'], 'name.ja', src),
  };
}

/** Parse one palette, or throw a `CorpusError` naming the field. */
export function parsePalette(value: unknown, source: string): CorpusPalette {
  const o = requireRecord(value, '', source);
  rejectUnknownKeys(o, PALETTE_KEYS, '', source);

  const classification: unknown = o['classification'];
  if (!isClassification(classification))
    throw new CorpusError(
      source,
      'classification',
      'expected one of historical, traditional, modern-japanese, japanese-inspired, editorial; ' +
        `got ${JSON.stringify(classification)}. FR-23: the UI never presents an inspired ` +
        'palette as historical, and this field is how it knows.',
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

  const palette: CorpusPalette = {
    slug: requireMatch(
      o['slug'],
      SLUG_PATTERN,
      'slug',
      source,
      'expected lowercase kebab-case, e.g. "quiet-neutrals"',
    ),
    name: parseName(o['name'], source),
    classification,
    category: requireMember(o['category'], PALETTE_CATEGORIES, 'category', source),
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

  checkClassification(
    {
      classification: palette.classification,
      sourceType: palette.provenance.sourceType,
      publishedYear: palette.provenance.publishedYear,
    },
    source,
  );

  return palette;
}
