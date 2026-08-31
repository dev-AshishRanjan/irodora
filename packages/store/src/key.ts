/**
 * The database key: where it comes from, where it lives, and where it must never appear.
 *
 * FR-56 — *"the database is SQLCipher-encrypted with the key in the platform keystore, never
 * in the bundle or an environment variable"*.
 *
 * ## Why this is an interface and not a call to `expo-secure-store`
 *
 * Two reasons, and the second is the one that matters. First, `packages/store` stays
 * platform-neutral so its tests run anywhere. Second, and more important: **the key lifecycle
 * is the part that can be wrong in a way no device would reveal.** A key regenerated on every
 * launch encrypts a database nobody can open again, and on a device that looks exactly like
 * "the app lost my data" — reported once, months later, unreproducible. Behind an interface it
 * is a test.
 *
 * ## What must never happen, stated because each has a check
 *
 * - **The key is never written into the database.** SQLCipher takes it through `PRAGMA key`;
 *   a row holding it would put the key inside the thing it encrypts.
 * - **The key is never a literal in source.** A key in the bundle is a key every user shares,
 *   which is not encryption. A test scans for one.
 * - **The key is never logged, thrown, or put in an error message.** An error carrying the key
 *   is how a secret reaches a crash reporter, and this product has no telemetry precisely so
 *   that cannot happen — but a thrown string would route around that.
 */

/**
 * The platform keystore. Implemented by `expo-secure-store` on the device (iOS Keychain,
 * Android Keystore) and by a fake in tests.
 *
 * Synchronous by design: the key is needed before the first statement runs, and an async
 * keystore read would make "open the database" a promise that every call site has to thread.
 * `expo-secure-store` provides synchronous variants for exactly this case.
 */
import { randomBytes } from './random.js';

export interface SecureKeyStore {
  get(name: string): string | null;
  set(name: string, value: string): void;
  /** Erasure (FR-58): removing the key makes the database permanently unreadable. */
  remove(name: string): void;
}

/** The keystore entry name. One place, so a rename cannot orphan an existing database. */
export const DATABASE_KEY_NAME = 'irodora.db.key';

/** 256 bits, hex-encoded — SQLCipher's raw-key length. */
const KEY_BYTES = 32;

/**
 * Fetch the key, generating and storing one on first run.
 *
 * **Generating is the dangerous branch.** It must happen exactly once in the lifetime of a
 * database: a second generation produces a key that cannot open the first database, and the
 * data is gone with no error anywhere. So the existing key is returned unconditionally when
 * one is present, and nothing in this function can decide to replace it.
 */
export function getOrCreateDatabaseKey(store: SecureKeyStore): string {
  const existing = store.get(DATABASE_KEY_NAME);
  if (existing !== null && existing !== '') return existing;

  // Through the PORT. This is the key that encrypts the database, and the port refuses
  // rather than falling back when no CSPRNG exists — see `random.ts` (F-104).
  const bytes = randomBytes(KEY_BYTES);
  const key = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

  store.set(DATABASE_KEY_NAME, key);
  return key;
}

/**
 * The `PRAGMA key` statement, which must be the **first** statement on a connection.
 *
 * SQLCipher decrypts lazily: a connection that runs any other statement first has already
 * failed, and the failure surfaces as "file is not a database" rather than as "wrong key".
 *
 * The key is interpolated because PRAGMA takes no bound parameter — so it is validated as hex
 * first. That is not defensive dressing: a key from a keystore an attacker can write would
 * otherwise be a SQL injection into the one statement that runs before any other.
 */
export function keyPragma(key: string): string {
  return pragma('key', key);
}

/**
 * `PRAGMA rekey` — re-encrypt every page under a new key.
 *
 * Its own function rather than a caller rewriting `keyPragma`'s output, because the validation
 * is the point: both statements interpolate a key into SQL that takes no bound parameter, and
 * a second construction path is a second place for that to be got wrong. A device driver was
 * briefly doing it by string replacement, which works and is one careless edit from not.
 *
 * Unlike `PRAGMA key`, this runs on an ALREADY-OPEN, already-keyed connection — it is a
 * rewrite, not an unlock.
 */
export function rekeyPragma(newKey: string): string {
  return pragma('rekey', newKey);
}

function pragma(name: 'key' | 'rekey', key: string): string {
  if (!/^[0-9a-f]{64}$/u.test(key))
    throw new Error(
      `the database key is not 64 hex characters. It is interpolated into PRAGMA ${name}, ` +
        'which takes no bound parameter, so anything else is refused rather than executed.',
    );
  return `PRAGMA ${name} = "x'${key}'"`;
}

/**
 * What a driver must be able to do for the key to be rotatable.
 *
 * A narrow structural type rather than the whole `Driver`, so `rotateDatabaseKey` can be
 * tested against three lines of fake and so this module keeps knowing nothing about SQL.
 */
export interface RekeyableDriver {
  readonly info: { readonly supportsRekey: boolean; readonly name: string };
  rekey(newKey: string): void;
}

/**
 * Rotate the database key (NFR-13 — *"key generation, storage and rotation are exercised in a
 * test"*).
 *
 * ## The order is the entire function
 *
 * Generate → **rekey the database** → *then* write the keystore. Any other order loses the
 * data, and loses it silently:
 *
 * - Storing first and rekeying second leaves the keystore holding a key that opens nothing if
 *   the rekey fails. The database is intact on disk and unreachable forever.
 * - Storing first and rekeying second *successfully* is fine, which is exactly what makes the
 *   bug survive review — it works every time until the one time it does not.
 *
 * The symptom either way is "the app lost my photographs", reported once, months later, on a
 * device nobody can reproduce. So the keystore write is last, and it is unreachable if
 * `rekey` throws.
 *
 * ## What this cannot check, stated rather than implied
 *
 * `node:sqlite` has no SQLCipher, so `PRAGMA rekey` cannot execute in CI — the same wall
 * F-041 hit and recorded as `encryptsAtRest: false`. A driver that cannot rekey **throws**
 * rather than returning quietly, because a rotation that reports success while changing
 * nothing would leave the old key working and everyone believing it had been replaced.
 */
export function rotateDatabaseKey(store: SecureKeyStore, driver: RekeyableDriver): string {
  if (!driver.info.supportsRekey)
    throw new Error(
      `the ${driver.info.name} driver cannot rekey, so rotation would report success while ` +
        'changing nothing — leaving the old key working and everyone believing it had been ' +
        'replaced. SQLCipher is on the device; node:sqlite has no rekey at all.',
    );

  const next = [...randomBytes(KEY_BYTES)].map((b) => b.toString(16).padStart(2, '0')).join('');

  // The database first. If this throws, the keystore still holds the key that opens the file.
  driver.rekey(next);

  store.set(DATABASE_KEY_NAME, next);
  return next;
}

/**
 * Erase the key. The database becomes permanently unreadable, which is the point.
 *
 * FR-58's erasure clause: *"erasure is immediate and local"*. Deleting the key is what makes
 * that true of data already written to disk — a file delete leaves recoverable blocks, and a
 * row-by-row delete leaves them too.
 */
export function forgetDatabaseKey(store: SecureKeyStore): void {
  store.remove(DATABASE_KEY_NAME);
}
