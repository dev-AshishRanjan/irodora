/**
 * `@irodora/store` — the device is the system of record (ADR-0051).
 *
 * **`node:sqlite` is deliberately NOT re-exported here.** `apps/mobile` bundles this package,
 * and a `node:*` import reachable from this entry is a crash on a phone. The Node driver is at
 * `@irodora/store/node`, the app never imports it, and a boundary guard proves the rule fires.
 */

export {
  CONNECTION_PRAGMAS,
  MIGRATIONS,
  SCHEMA_VERSION,
  SYNC_TABLES,
  type SyncTable,
} from './schema.js';
export { applyPragmas, migrate } from './migrate.js';
export {
  assertMigrationsClean,
  findProhibited,
  prohibitedError,
  sqlCode,
  PROHIBITED_IDENTIFIERS,
  type ProhibitedFinding,
  type ProhibitedIdentifier,
} from './prohibited.js';
export { createRepository } from './createRepository.js';
export {
  ARCHIVE_TABLES,
  ArchiveError,
  digest,
  eraseEverything,
  exportArchive,
  importArchive,
  type Archive,
  parseArchive,
} from './archive.js';
export {
  archiveFileName,
  eraseWithBackupPrompt,
  serialiseArchive,
  type ArchiveSink,
  type DestructiveConfirm,
  type EraseOutcome,
} from './backup.js';
export { uuidv7 } from './id.js';
export { DEFAULT_GROUPING_THRESHOLD, groupByColor, type ColorGroup } from './grouping.js';
export {
  DEFAULT_IMAGE_LIMITS,
  ImageRejected,
  ingestImage,
  type ImageLimits,
  type SanitisedImage,
} from './image.js';

/**
 * The randomness port (F-104).
 *
 * `setRandomBytes` is what a platform without a `crypto` global calls at startup — React
 * Native has none, and calling neither is a loud refusal rather than a weak key.
 */
export { randomBytes, resetRandomBytes, setRandomBytes, type RandomBytes } from './random.js';
export {
  StoreError,
  captureConditionsOf,
  CONTRAST_PREFERENCES,
  DIMENSION_ORIGINS,
  PROFILE_DIMENSIONS,
  PROFILE_LIST_DIMENSIONS,
  PROFILE_METHODS,
  GARMENT_SEASONS,
  GARMENT_COLOR_ROLES,
} from './repository.js';
export {
  DATABASE_KEY_NAME,
  forgetDatabaseKey,
  getOrCreateDatabaseKey,
  keyPragma,
  rekeyPragma,
  rotateDatabaseKey,
  type RekeyableDriver,
  type SecureKeyStore,
} from './key.js';
export type {
  ChangeLogRow,
  ContrastPreference,
  DimensionOrigin,
  Driver,
  DriverFactory,
  DriverInfo,
  Millis,
  GarmentColorRole,
  GarmentImageInfo,
  GarmentEnrichment,
  GarmentRow,
  GarmentSeason,
  NewGarment,
  NewGarmentColor,
  NewPalette,
  NewPaletteMember,
  NewPersonalProfile,
  NewSavedColor,
  PaletteMemberRow,
  PaletteRow,
  PersonalProfileRow,
  ProfileDimension,
  ProfileDimensionColorRow,
  ProfileListDimension,
  ProfileMethod,
  Range,
  Repository,
  SavedColorRow,
  StoredCaptureConditions,
  StoredGarment,
  StoredGarmentColor,
  StoredPalette,
  StoredPaletteMember,
  StoredPersonalProfile,
  SyncRow,
} from './repository.js';
