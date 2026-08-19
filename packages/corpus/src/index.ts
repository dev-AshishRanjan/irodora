/**
 * The corpus schema, its provenance rules, and the checks the `content` gate applies.
 *
 * ## What this package is
 *
 * The **authoring format** for `content/colors/**` and `content/palettes/**`, the rules that
 * decide whether an entry may be published, and the derivation and checksum machinery that
 * turns a set of source entries into an immutable published version (ADR-0046).
 *
 * ## What it is not
 *
 * - **Not a wire schema.** A corpus source entry never crosses a process boundary; it is read
 *   from disk at build time and shipped inside the app as an immutable bundle (ADR-0051).
 *   `@irodora/contracts` owns validation at the trust boundaries the app still has. That is
 *   also why there is no Zod here — see `entry.ts`.
 * - **Not a place colour maths lives.** Every derived value is computed by
 *   `@irodora/color-spaces` through `derive.ts`. A conversion written here would be a second
 *   implementation, which `AGENTS.md` §7 calls a defect by definition.
 * - **Not a file reader.** Nothing in `src/` touches the filesystem. This package is imported
 *   by `packages/color-naming` (F-013), which is inside the colour-engine zone and must be
 *   byte-identical in Node, the browser and React Native (NFR-3). Reading happens in
 *   `scripts/`, and the ESLint override plus boundary guard #11 are what keep it that way.
 */

export { CorpusError } from './errors.js';

export { canonicalize, CanonicalError } from './canonical.js';

export {
  assertSha256,
  DigestError,
  entryDigest,
  rootDigest,
  ROOT_DOMAIN,
  SHA256_VECTORS,
  type DigestFn,
} from './digest.js';

export {
  checkClassification,
  CLASSIFICATIONS,
  isClassification,
  isOurOwnCuration,
  isSourceType,
  OUR_OWN_CURATION,
  SOURCE_TYPES,
  type Classification,
  type ClassificationEvidence,
  type OurOwnCuration,
  type SourceType,
} from './classification.js';

export {
  assertTransition,
  canTransition,
  checkEditorialIdentity,
  EDITOR_ROLES,
  ENTRY_STATUSES,
  isEntryStatus,
  isPublishable,
  parseRoster,
  requiresReviewer,
  type Editor,
  type EditorRole,
  type EntryStatus,
  type Roster,
} from './workflow.js';

export { ISO_DATE_PATTERN, SLUG_PATTERN, VERSION_ID_PATTERN } from './primitives.js';

export { parseProvenance, type RecordProvenance } from './provenance.js';

export { deriveColor, hexToXyz, type DerivedColor } from './derive.js';

export {
  ADAPTATIONS,
  CHROMA_BANDS,
  LIGHTNESS_BANDS,
  MEASURED_UNDER,
  parseEntry,
  SEASONS,
  serialiseEntry,
  TEMPERATURES,
  type Adaptation,
  type ChromaBand,
  type CorpusEntry,
  type EntryColor,
  type EntryEditorial,
  type EntryName,
  type EntryRelations,
  type EntryTaxonomy,
  type LightnessBand,
  type MeasuredUnder,
  type Season,
  type Temperature,
} from './entry.js';

export {
  PALETTE_CATEGORIES,
  PALETTE_ROLES,
  parsePalette,
  type CorpusPalette,
  type PaletteCategory,
  type PaletteMember,
  type PaletteName,
  type PaletteRole,
} from './palette.js';

export { checkCorpus, FIXTURE_PREFIX, type CorpusInput, type Sourced } from './corpus.js';

export {
  checkSourceRegistered,
  parseRegister,
  type RegisterRow,
  type SourceRegister,
} from './register.js';

export {
  bundleRootDigest,
  publishVersion,
  serialiseBundle,
  type Ledger,
  type LedgerRow,
  type PublishedEntry,
  type PublishedPalette,
  type VersionBundle,
} from './version.js';

export { ledgerRowFor, loadPublishedVersion, parseLedger } from './load.js';

/**
 * The schema version an entry is authored against.
 *
 * It is **not** the corpus version — that is a `YYYY.MM.N` content label (FR-25) and lives in
 * the published bundle. This is the shape those entries must satisfy, and it moves when a
 * required field is added or removed.
 *
 * `1.0.0` is the first shape that can actually be published: F-011 is what made the schema
 * exist, so `0.0.0` described nothing.
 */
export const CORPUS_SCHEMA_VERSION = '1.0.0' as const;
