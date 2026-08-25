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
  /**
   * The corpus entry this value came from, or `null` for one that came from somewhere else.
   *
   * Nullable because a Lens capture (F-040) has no slug and never will — its origin is a
   * camera, which is what `source` already says. What it is NOT is optional: a row that came
   * from the corpus and does not record which entry cannot be re-expressed as a palette
   * member, because `parsePalette` addresses colours by slug and nothing else.
   */
  readonly corpus_slug: string | null;
}

export type NewSavedColor = Omit<SavedColorRow, keyof SyncRow> & { readonly id: string };

/**
 * A palette row. The migration-2 columns are `string | null` in the ROW because that is what
 * the database can hold; the read path refuses the `null` rather than passing it on.
 */
export interface PaletteRow extends SyncRow {
  /** The English name. `palette.id` doubles as the corpus `slug` — see `StoredPalette`. */
  readonly name: string;
  readonly name_ja: string | null;
  readonly classification: string | null;
  readonly category: string | null;
  readonly version_id: string | null;
}

export interface PaletteMemberRow extends SyncRow {
  readonly palette_id: string;
  readonly color_id: string;
  /** The corpus `rank`. One column, one meaning — a second `rank` column could disagree. */
  readonly position: number;
  readonly role: string;
  readonly weight: number | null;
}

/** A member of a palette being written. `rank` and `weight` are the corpus schema's. */
export interface NewPaletteMember {
  /**
   * The colour, as it will be stored.
   *
   * `color.id` is a **proposal**: if a live `saved_color` already carries this
   * `corpus_slug`, that row is reused and this id is discarded. A colour saved once may be
   * in two palettes, and writing a second row for it would make "which palettes hold this
   * colour" a question with two right answers.
   */
  readonly color: NewSavedColor;
  readonly role: string;
  readonly rank: number;
  readonly weight: number;
}

export interface NewPalette {
  /** UUIDv7. Also the corpus `slug` — a uuid is valid kebab-case and claims to be an id. */
  readonly id: string;
  readonly nameEn: string;
  readonly nameJa: string;
  readonly classification: string;
  readonly category: string;
  /** The corpus version this palette was built against (FR-25 shape). */
  readonly versionId: string;
  readonly members: readonly NewPaletteMember[];
}

export interface StoredPaletteMember {
  readonly colorId: string;
  /** `saved_color.corpus_slug`. Refused rather than defaulted when the column is null. */
  readonly slug: string;
  readonly role: string;
  readonly rank: number;
  readonly weight: number;
  readonly color: SavedColorRow;
}

/**
 * A palette read back out, with every migration-2 column resolved to a value.
 *
 * This is the shape a caller turns into a corpus-schema record. It deliberately does **not**
 * import `@irodora/corpus`: this package has no runtime dependencies, and the conversion is
 * the app's job. What this package guarantees is that the fields are present and typed, so
 * the conversion has nothing to invent.
 */
export interface StoredPalette {
  readonly id: string;
  readonly nameEn: string;
  readonly nameJa: string;
  readonly classification: string;
  readonly category: string;
  readonly versionId: string;
  readonly createdAt: Millis;
  readonly updatedAt: Millis;
  readonly deletedAt: Millis | null;
  /** In rank order, ascending. */
  readonly members: readonly StoredPaletteMember[];
}

/**
 * A row the database can hold but the product cannot use.
 *
 * Its own class so a caller can tell "this database is older than this build" from a driver
 * error, and so the message can name the column instead of surfacing a `TypeError` three
 * frames later.
 */
export class StoreError extends Error {}

/** What the app is allowed to do to the database. */
export interface Repository {
  readonly info: DriverInfo;
  saveColor(row: NewSavedColor, now: Millis): void;
  /** Live rows only. A tombstoned row is not "missing" — it is deleted, and that differs. */
  listColors(): SavedColorRow[];
  getColor(id: string): SavedColorRow | undefined;
  /** Soft delete. Writes a tombstone and a `change_log` row; never removes the row. */
  deleteColor(id: string, now: Millis): void;
  /**
   * Write a palette and its members, atomically.
   *
   * An edit is a whole-palette write rather than a set of member operations, because roles
   * and ranks move together: reordering one member renumbers the others, and a caller
   * applying that as N separate updates would leave the palette invalid between them —
   * which is the one state `parsePalette` exists to reject.
   *
   * Members are reconciled by `(palette_id, color_id)`: an existing one is updated, a new
   * one inserted, and one that is no longer present is **tombstoned**, not deleted. The
   * change log therefore says what happened to each member rather than showing the whole
   * palette torn down and rebuilt on every keystroke.
   */
  savePalette(palette: NewPalette, now: Millis): void;
  /** Live palettes, oldest first. Throws `StoreError` on a row missing a migration-2 column. */
  listPalettes(): StoredPalette[];
  /** One palette, tombstoned or not — same reason as `getColor`. */
  getPalette(id: string): StoredPalette | undefined;
  /** Tombstones the palette and every live member. The colours themselves are left alone. */
  deletePalette(id: string, now: Millis): void;
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
