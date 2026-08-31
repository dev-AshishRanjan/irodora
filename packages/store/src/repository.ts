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

import type { SanitisedImage } from './image.js';

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
  /**
   * Re-encrypt the database under a new key (NFR-13).
   *
   * On the DRIVER because only the driver knows whether its SQLite has SQLCipher. A driver
   * that cannot do it MUST THROW rather than return: a rotation that reports success while
   * changing nothing leaves the old key working and everyone believing it was replaced.
   */
  rekey(newKey: string): void;
}

/** How a driver identifies itself in a conformance report. */
export interface DriverInfo {
  readonly name: string;
  /** Whether this driver encrypts at rest. `node:sqlite` does not; SQLCipher does. */
  readonly encryptsAtRest: boolean;
  /**
   * Whether `rekey` does anything. Data rather than a comment, for the same reason
   * `encryptsAtRest` is: the conformance report prints it, so a green CI run cannot be read
   * as a statement about a rotation that never ran.
   */
  readonly supportsRekey: boolean;
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
 * The seven dimensions of a personal colour profile (FR-30, ADR-0010).
 *
 * Ordered as the person meets them: the four scalar dimensions the comparisons establish
 * directly, then the three lists derived from those. The order is load-bearing in exactly one
 * place — it is the order a summary is read in — and nowhere else.
 */
export const PROFILE_DIMENSIONS = [
  'lightness',
  'temperature',
  'chroma',
  'contrast',
  'neutrals',
  'accents',
  'avoid',
] as const;
export type ProfileDimension = (typeof PROFILE_DIMENSIONS)[number];

/** The three dimensions that are lists of corpus slugs. */
export const PROFILE_LIST_DIMENSIONS = ['neutrals', 'accents', 'avoid'] as const;
export type ProfileListDimension = (typeof PROFILE_LIST_DIMENSIONS)[number];

/**
 * Where a dimension's current value came from.
 *
 * **`user` is a latch, not a label.** Re-derivation writes into a dimension only when this
 * says `derived` — which is acceptance criterion 4 of F-026 and clause 6 of ADR-0010, *"the
 * user's correction always wins"*. Storing it as a column rather than inferring it from a
 * timestamp is the difference between a rule and a heuristic that is usually right.
 */
export const DIMENSION_ORIGINS = ['derived', 'user'] as const;
export type DimensionOrigin = (typeof DIMENSION_ORIGINS)[number];

/** How a profile was arrived at. `professional` is FR-28 and nothing writes it yet. */
export const PROFILE_METHODS = ['guided', 'photo-assisted', 'professional'] as const;
export type ProfileMethod = (typeof PROFILE_METHODS)[number];

export const CONTRAST_PREFERENCES = ['low', 'medium', 'high'] as const;
export type ContrastPreference = (typeof CONTRAST_PREFERENCES)[number];

/** A closed interval. `min <= max` is a table CHECK, not a convention. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

/** The profile row exactly as the database holds it. Flat, because CHECK constraints are. */
export interface PersonalProfileRow extends SyncRow {
  readonly method: string;
  readonly lightness_min: number;
  readonly lightness_max: number;
  readonly temperature_bias: number;
  readonly chroma_min: number;
  readonly chroma_max: number;
  readonly contrast_preference: string;
  readonly confidence_lightness: number;
  readonly confidence_temperature: number;
  readonly confidence_chroma: number;
  readonly confidence_contrast: number;
  readonly confidence_neutrals: number;
  readonly confidence_accents: number;
  readonly confidence_avoid: number;
  readonly origin_lightness: string;
  readonly origin_temperature: string;
  readonly origin_chroma: string;
  readonly origin_contrast: string;
  readonly origin_neutrals: string;
  readonly origin_accents: string;
  readonly origin_avoid: string;
}

export interface ProfileDimensionColorRow extends SyncRow {
  readonly profile_id: string;
  readonly dimension: string;
  readonly corpus_slug: string;
  readonly position: number;
}

/**
 * A profile being written.
 *
 * `confidence` and `origin` are **total records over `ProfileDimension`**, so a new dimension
 * is a compile error at every call site rather than a column silently left at a default. That
 * is the same move `MessageKey` makes for the catalogues: the type is the completeness check.
 */
export interface NewPersonalProfile {
  /** UUIDv7. */
  readonly id: string;
  readonly method: ProfileMethod;
  readonly lightness: Range;
  /** -1 fully cool … +1 fully warm. */
  readonly temperatureBias: number;
  readonly chroma: Range;
  readonly contrast: ContrastPreference;
  readonly confidence: Readonly<Record<ProfileDimension, number>>;
  readonly origin: Readonly<Record<ProfileDimension, DimensionOrigin>>;
  /** Corpus slugs, in the order they should be read. */
  readonly neutrals: readonly string[];
  readonly accents: readonly string[];
  readonly avoid: readonly string[];
}

/** A profile read back out, with its timestamps. */
export interface StoredPersonalProfile extends NewPersonalProfile {
  readonly createdAt: Millis;
  readonly updatedAt: Millis;
  readonly deletedAt: Millis | null;
}

/* ------------------------------------------------------------------- the wardrobe (F-042) */

export const GARMENT_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type GarmentSeason = (typeof GARMENT_SEASONS)[number];

/** `primary` is a column on `garment`, so it is not a role a member row can carry. */
export const GARMENT_COLOR_ROLES = ['secondary', 'accent'] as const;
export type GarmentColorRole = (typeof GARMENT_COLOR_ROLES)[number];

export interface GarmentRow extends SyncRow {
  readonly type: string;
  readonly primary_color_id: string;
  readonly name: string | null;
  readonly pattern: string | null;
  readonly material: string | null;
  readonly formality: string | null;
  readonly brand: string | null;
  readonly size: string | null;
  readonly purchase_date: string | null;
  readonly cost_minor: number | null;
  readonly currency: string | null;
  readonly wear_count: number;
}

/**
 * Everything needed to create a garment — **and nothing else** (FR-39).
 *
 * *"Only colour and type are required at creation; every other field is progressively
 * enriched."* This type is that sentence: there is no optional field to leave out, so there
 * is no field a caller can be tempted to invent a value for.
 *
 * **The nullable columns are not enough on their own.** A `NewGarment` carrying twelve
 * optional properties satisfies every NOT NULL constraint in migration 4 while still putting
 * twelve decisions in front of somebody adding a jumper — the constraint says a value may be
 * absent, and the type says the caller is never asked. TypeScript's excess-property check
 * refuses a `brand` here at the call site, and a `ts-expect-error` test proves it.
 */
export interface NewGarment {
  readonly id: string;
  readonly type: string;
  /** The primary colour. Written as a `saved_color` row, reused by `corpus_slug` when it is one. */
  readonly color: NewSavedColor;
}

/** A secondary or accent colour, added by enrichment rather than at creation. */
export interface NewGarmentColor {
  readonly role: GarmentColorRole;
  readonly color: NewSavedColor;
  /** How much of the garment this colour covers, if anybody measured it. */
  readonly proportion: number | null;
}

/**
 * The progressive half of FR-39. Every key optional; an explicit `null` **clears** a field.
 *
 * `undefined` and `null` mean different things here and the distinction is load-bearing:
 * omitting `brand` leaves whatever is recorded, and passing `brand: null` erases it. A patch
 * that could not express "remove this" would make every field write-once in practice.
 */
export interface GarmentEnrichment {
  readonly type?: string;
  readonly name?: string | null;
  readonly pattern?: string | null;
  readonly material?: string | null;
  readonly formality?: string | null;
  readonly brand?: string | null;
  readonly size?: string | null;
  readonly purchaseDate?: string | null;
  readonly costMinor?: number | null;
  readonly currency?: string | null;
  readonly wearCount?: number;
  /** Replaces the set. `[]` clears it. */
  readonly seasons?: readonly GarmentSeason[];
  /** Replaces the secondary and accent colours. `[]` clears them. */
  readonly colors?: readonly NewGarmentColor[];
}

export interface StoredGarmentColor {
  readonly role: GarmentColorRole;
  readonly color: SavedColorRow;
  readonly proportion: number | null;
}

export interface StoredGarment {
  readonly id: string;
  readonly type: string;
  readonly color: SavedColorRow;
  readonly name: string | null;
  readonly pattern: string | null;
  readonly material: string | null;
  readonly formality: string | null;
  readonly brand: string | null;
  readonly size: string | null;
  readonly purchaseDate: string | null;
  readonly costMinor: number | null;
  readonly currency: string | null;
  readonly wearCount: number;
  readonly seasons: readonly GarmentSeason[];
  readonly colors: readonly StoredGarmentColor[];
  readonly createdAt: Millis;
  readonly updatedAt: Millis;
  readonly deletedAt: Millis | null;
}

/** What a caller can learn about an image without loading it. */
export interface GarmentImageInfo {
  readonly byteLength: number;
  readonly width: number;
  readonly height: number;
  readonly format: 'jpeg' | 'png';
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
  /**
   * Write a profile and its three slug lists, atomically.
   *
   * A whole-profile write for the same reason `savePalette` is one: the lists are positional,
   * and a caller applying an edit as N member operations would leave the profile in states
   * that are not profiles between them.
   *
   * **What this method does NOT do is decide what may be overwritten.** The `origin` latch is
   * applied by the caller before it gets here — a store that silently refused to update a
   * `user` dimension would be a second copy of a product rule, in the layer least able to
   * explain itself, and the caller would have no way to tell a rejection from a no-op.
   */
  saveProfile(profile: NewPersonalProfile, now: Millis): void;
  /** Live profiles, oldest first. Throws `StoreError` on a row holding an unknown enum value. */
  listProfiles(): StoredPersonalProfile[];
  /** One profile, tombstoned or not — same reason as `getColor`. */
  getProfile(id: string): StoredPersonalProfile | undefined;
  /** Tombstones the profile and every live list entry. */
  deleteProfile(id: string, now: Millis): void;
  /**
   * Create a garment from a colour and a type, and nothing else (FR-39).
   *
   * Separate from `enrichGarment` rather than one upsert taking a big optional object,
   * because the split is the requirement: a creation path that *accepts* twelve fields is a
   * creation path somebody will fill in, and the sentence in FR-39 is about what the person
   * is asked for, not about what the columns permit.
   */
  createGarment(garment: NewGarment, now: Millis): void;
  /**
   * Apply a patch. Absent keys are left alone; an explicit `null` clears the field.
   *
   * Throws `StoreError` if the garment does not exist — an enrichment that silently created
   * one would turn a typo in an id into a second garment nobody can find.
   */
  enrichGarment(id: string, patch: GarmentEnrichment, now: Millis): void;
  /** Live garments, oldest first. */
  listGarments(): StoredGarment[];
  /** One garment, tombstoned or not — same reason as `getColor`. */
  getGarment(id: string): StoredGarment | undefined;
  /** Tombstones the garment, its seasons, its extra colours and its image. */
  deleteGarment(id: string, now: Millis): void;
  /**
   * Attach a photograph, replacing any existing one.
   *
   * **Takes a `SanitisedImage` and nothing else.** No overload accepts a raw buffer, so an
   * un-ingested image — one whose EXIF still carries the address it was taken at — cannot
   * reach this method without somebody widening the type on purpose. That is the enforcement;
   * the ingest function is only where it happens.
   *
   * The bytes go into the SQLCipher database rather than beside it (ADR-0078). NFR-13 says
   * *"the database and any stored imagery are encrypted with SQLCipher"*, and a file in the
   * app's private directory is covered by the OS — real protection, and not that sentence.
   */
  putGarmentImage(garmentId: string, image: SanitisedImage, now: Millis): void;
  /**
   * The image's dimensions and size **without reading the blob**.
   *
   * Separate from `getGarmentImage` because a blob read is all-or-nothing: a list screen that
   * wants to know whether a garment has a photograph, and how big it is, must not pull every
   * photograph in the wardrobe into memory to find out.
   */
  getGarmentImageInfo(garmentId: string): GarmentImageInfo | undefined;
  /** The bytes. Loads the whole blob, which is why the info call above exists. */
  getGarmentImage(garmentId: string): Uint8Array | undefined;
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
