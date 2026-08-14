/**
 * `@irodora/adapters` — real implementations of the infrastructure ports.
 *
 * Ports define the contract and ship in-memory adapters; this package holds the ones with
 * drivers behind them. Both run the same conformance suite, which is the only honest basis
 * for calling them interchangeable.
 */

export { PostgresDatabase, type PostgresOptions } from './postgres-database.js';
export {
  migrateAtBoot,
  MIGRATION_LOCK_KEY,
  type Migration,
  type MigrateOptions,
  type MigrationOutcome,
} from './migrate.js';
export { ValkeyCache, type ValkeyOptions } from './valkey-cache.js';
