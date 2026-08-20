/**
 * The repository interface, and the driver contract beneath it.
 *
 * ## Why an interface at all, when there is one product and one database
 *
 * Because the database **cannot be tested on the thing it ships on**. `expo-sqlite` needs a
 * device; CI is a Windows runner with none. So there are two drivers — `node:sqlite` in CI,
 * `expo-sqlite` on the phone — and the interface is what lets one conformance suite judge
 * both.
 *
 * That is also the honest limit of what CI proves, and it is stated rather than implied: a
 * green suite here is a claim about the *device* driver only insofar as the suite covers the
 * behaviour, and SQLCipher is covered by nothing here at all.
 *
 * ## `node:sqlite` must never reach the app
 *
 * `apps/mobile` bundles this package. A `node:sqlite` import reachable from `index.ts` is a
 * crash on a phone — the same shape `@irodora/design-tokens` warns about for `node:fs`. The
 * Node driver therefore lives behind its own export (`@irodora/store/node`), and a boundary
 * guard proves that rule fires rather than trusting a comment to hold.
 */

/** Integer milliseconds since epoch, UTC. Never a float, never a string. */
export type Millis = number;

/** The columns every user row carries, so a new table cannot forget a tombstone. */
export interface SyncRow {
  readonly id: string;
  readonly created_at: Millis;
  readonly updated_at: Millis;
  /** A tombstone. `null` means live; a number means deleted at that instant. */
  readonly deleted_at: Millis | null;
}

/**
 * The minimum a driver must provide.
 *
 * Deliberately narrow, and deliberately **synchronous-shaped in its result** rather than
 * exposing a cursor: every read this product makes is small and local, and a streaming API
 * would be an interface designed for a database we do not have.
 */
export interface Driver {
  /** Run statements with no result. Multiple statements permitted. */
  exec(sql: string): void;
  /** Run one parameterised statement; return the rows. */
  query<T>(sql: string, params?: readonly unknown[]): T[];
  /** Run one parameterised statement for effect. */
  run(sql: string, params?: readonly unknown[]): void;
  /**
   * Run `fn` inside a transaction, rolling back if it throws.
   *
   * On the interface rather than left to callers because a write and its `change_log` append
   * must be atomic. A change log that can disagree with the rows it describes is worse than
   * no change log — it would make a future reconciliation confidently wrong.
   */
  transaction<T>(fn: () => T): T;
  close(): void;
  /** Reopen the same underlying database. The durability tests need this. */
  reopen(): void;
}

/** How a driver identifies itself in a conformance report. */
export interface DriverInfo {
  readonly name: string;
  /** Whether this driver encrypts at rest. `node:sqlite` does not; SQLCipher does. */
  readonly encryptsAtRest: boolean;
}

export type DriverFactory = () => { readonly driver: Driver; readonly info: DriverInfo };

/**
 * A colour as it is stored: canonical XYZ **plus** materialised derived columns.
 *
 * The derived columns are written by the engine and never computed in SQL. One implementation
 * of the maths ([E-001](../../../.harness/state/effects.json)) — a `SELECT` that derived `hex`
 * would be a second engine, in a language with no tests.
 */
export interface SavedColorRow extends SyncRow {
  readonly name: string;
  readonly xyz_x: number;
  readonly xyz_y: number;
  readonly xyz_z: number;
  readonly lab_l: number;
  readonly lab_a: number;
  readonly lab_b: number;
  readonly oklch_l: number;
  readonly oklch_c: number;
  readonly oklch_h: number;
  readonly hex: string;
  /** ADR-0005: a colour cannot exist without provenance, so the column is NOT NULL. */
  readonly source: string;
  readonly confidence: number;
}

export type NewSavedColor = Omit<SavedColorRow, keyof SyncRow> & { readonly id: string };

/** What the app is allowed to do to the database. */
export interface Repository {
  readonly info: DriverInfo;
  saveColor(row: NewSavedColor, now: Millis): void;
  /** Live rows only. A tombstoned row is not "missing" — it is deleted, and that differs. */
  listColors(): SavedColorRow[];
  getColor(id: string): SavedColorRow | undefined;
  /** Soft delete. Writes a tombstone and a `change_log` row; never removes the row. */
  deleteColor(id: string, now: Millis): void;
  /** Every change-log entry, oldest first. Read by tests and by nothing in the product. */
  changeLog(): ChangeLogRow[];
  close(): void;
  reopen(): void;
}

export interface ChangeLogRow {
  readonly seq: number;
  readonly table_name: string;
  readonly row_id: string;
  readonly op: 'insert' | 'update' | 'delete';
  readonly at: Millis;
}
