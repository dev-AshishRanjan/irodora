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
export {
  StoreError,
  CONTRAST_PREFERENCES,
  DIMENSION_ORIGINS,
  PROFILE_DIMENSIONS,
  PROFILE_LIST_DIMENSIONS,
  PROFILE_METHODS,
} from './repository.js';
export {
  DATABASE_KEY_NAME,
  forgetDatabaseKey,
  getOrCreateDatabaseKey,
  keyPragma,
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
  StoredPalette,
  StoredPaletteMember,
  StoredPersonalProfile,
  SyncRow,
} from './repository.js';
