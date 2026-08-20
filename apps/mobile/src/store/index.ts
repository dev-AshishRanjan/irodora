/**
 * The device driver: `expo-sqlite` with SQLCipher, keyed from `expo-secure-store`.
 *
 * This lives in the app rather than in `@irodora/store` on purpose. The package stays
 * platform-neutral so its tests run anywhere; the platform bindings live at the one place that
 * has a platform. It is also what keeps `node:sqlite` and `expo-sqlite` from ever being in the
 * same dependency graph.
 *
 * ## What is proven here, and what is not
 *
 * The **conformance suite is the same function** `packages/store` runs against `node:sqlite` —
 * imported, not reimplemented. Running it against this driver needs a device, so that run is
 * **attested** on F-041 rather than gated.
 *
 * What CI can and does prove: the key lifecycle (`packages/store/test/key.test.ts`), that no
 * key literal is in the bundle, and that this module compiles against the same `Driver`
 * interface the suite judges.
 *
 * **SQLCipher is not verifiable off-device at all.** `node:sqlite` has no encryption, so
 * nothing in CI says anything about encryption at rest. That is FR-56's attested half, and the
 * driver reports `encryptsAtRest: true` only because it opened with a key pragma — a claim
 * about what it asked for, which the device attestation is what actually confirms.
 */

import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import {
  getOrCreateDatabaseKey,
  keyPragma,
  type Driver,
  type DriverInfo,
  type SecureKeyStore,
} from '@irodora/store';

/** iOS Keychain / Android Keystore, behind the interface the key module takes. */
export const secureKeyStore: SecureKeyStore = {
  get: (name) => SecureStore.getItem(name),
  set: (name, value) => {
    SecureStore.setItem(name, value, {
      // The key is useless to an attacker who cannot unlock the device, and useless to us if
      // the OS will not return it in the background. AFTER_FIRST_UNLOCK is the pairing that
      // keeps a background write working without leaving the key readable on a locked, cold
      // device.
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  remove: (name) => {
    SecureStore.deleteItemAsync(name).catch(() => undefined);
  },
};

const DATABASE_NAME = 'irodora.db';

/**
 * Open the encrypted database.
 *
 * **`PRAGMA key` runs before any other statement**, which is not a style choice: SQLCipher
 * decrypts lazily, so a connection that runs anything else first has already failed — and it
 * fails as *"file is not a database"* rather than as *"wrong key"*, which sends whoever debugs
 * it looking for file corruption.
 */
export function openDeviceDriver(): { driver: Driver; info: DriverInfo } {
  const key = getOrCreateDatabaseKey(secureKeyStore);
  let db = SQLite.openDatabaseSync(DATABASE_NAME);
  db.execSync(keyPragma(key));

  const driver: Driver = {
    exec(sql) {
      db.execSync(sql);
    },
    query<T>(sql: string, params: readonly unknown[] = []): T[] {
      return db.getAllSync<T>(sql, ...(params as never[]));
    },
    run(sql, params = []) {
      db.runSync(sql, ...(params as never[]));
    },
    transaction<T>(fn: () => T): T {
      // Explicit BEGIN/COMMIT/ROLLBACK rather than expo-sqlite's helper, so this driver and
      // the Node one have the same semantics — a write and its change_log append must be
      // atomic on both, and a helper that differs would make the shared suite meaningless.
      db.execSync('BEGIN');
      try {
        const result = fn();
        db.execSync('COMMIT');
        return result;
      } catch (error) {
        db.execSync('ROLLBACK');
        throw error;
      }
    },
    close() {
      db.closeSync();
    },
    reopen() {
      db.closeSync();
      db = SQLite.openDatabaseSync(DATABASE_NAME);
      // The key AND the pragmas are per connection. Reopening without re-keying fails as file
      // corruption; reopening without the pragmas silently turns foreign keys back off.
      db.execSync(keyPragma(getOrCreateDatabaseKey(secureKeyStore)));
    },
  };

  return {
    driver,
    info: {
      name: 'expo-sqlite+sqlcipher',
      // A claim about what this connection ASKED FOR. That it actually encrypted is the
      // device attestation on F-041, and nothing in CI can stand in for it.
      encryptsAtRest: true,
    },
  };
}
