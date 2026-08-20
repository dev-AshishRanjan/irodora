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
export { createRepository } from './createRepository.js';
export { uuidv7 } from './id.js';
export type {
  ChangeLogRow,
  Driver,
  DriverFactory,
  DriverInfo,
  Millis,
  NewSavedColor,
  Repository,
  SavedColorRow,
  SyncRow,
} from './repository.js';
