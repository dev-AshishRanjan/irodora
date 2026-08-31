/**
 * The repository, over any driver.
 *
 * One implementation, two drivers underneath it. Every rule that matters — the tombstone, the
 * change-log append, the atomicity of the pair — lives here rather than in a driver, so the
 * device and CI cannot diverge on the behaviour the product depends on. What a driver may
 * differ in is how it talks to SQLite; what it may not differ in is what the data means.
 */

import type { SanitisedImage } from './image.js';
import { migrate } from './migrate.js';
import {
  CONTRAST_PREFERENCES,
  DIMENSION_ORIGINS,
  PROFILE_DIMENSIONS,
  PROFILE_LIST_DIMENSIONS,
  PROFILE_METHODS,
  StoreError,
  GARMENT_COLOR_ROLES,
  GARMENT_SEASONS,
  type ChangeLogRow,
  type ContrastPreference,
  type DimensionOrigin,
  type Driver,
  type DriverInfo,
  type Millis,
  type GarmentColorRole,
  type GarmentImageInfo,
  type GarmentEnrichment,
  type GarmentRow,
  type GarmentSeason,
  type NewGarment,
  type NewGarmentColor,
  type NewPalette,
  type NewPersonalProfile,
  type NewSavedColor,
  type PaletteMemberRow,
  type PaletteRow,
  type PersonalProfileRow,
  type ProfileDimensionColorRow,
  type ProfileListDimension,
  type ProfileMethod,
  type Repository,
  type SavedColorRow,
  type StoredPalette,
  type StoredGarment,
  type StoredPaletteMember,
  type StoredPersonalProfile,
} from './repository.js';

const COLOR_COLUMNS =
  'id, created_at, updated_at, deleted_at, name, xyz_x, xyz_y, xyz_z, ' +
  'lab_l, lab_a, lab_b, oklch_l, oklch_c, oklch_h, hex, source, confidence, corpus_slug';

const PALETTE_COLUMNS =
  'id, created_at, updated_at, deleted_at, name, name_ja, classification, category, version_id';

const MEMBER_COLUMNS =
  'id, created_at, updated_at, deleted_at, palette_id, color_id, position, role, weight';

const GARMENT_COLUMNS =
  'id, created_at, updated_at, deleted_at, type, primary_color_id, name, pattern, material, ' +
  'formality, brand, size, purchase_date, cost_minor, currency, wear_count';

/**
 * The patchable scalar fields, as `[key on the patch, column]`.
 *
 * A table rather than fifteen `if` blocks, so a field added to `GarmentEnrichment` and not
 * added here is one line to find rather than a silently ignored key — which is the failure
 * mode of a hand-written patch builder, and it presents as "the edit did not save".
 */
const GARMENT_PATCH_COLUMNS = [
  ['type', 'type'],
  ['name', 'name'],
  ['pattern', 'pattern'],
  ['material', 'material'],
  ['formality', 'formality'],
  ['brand', 'brand'],
  ['size', 'size'],
  ['purchaseDate', 'purchase_date'],
  ['costMinor', 'cost_minor'],
  ['currency', 'currency'],
  ['wearCount', 'wear_count'],
] as const satisfies readonly (readonly [keyof GarmentEnrichment, string])[];

/**
 * The profile's own columns, **derived from `PROFILE_DIMENSIONS` rather than listed twice**.
 *
 * Fourteen of these twenty-one are a confidence or an origin per dimension, and a hand-written
 * list would be the second place a dimension has to be added — the kind of pair that agrees on
 * the day it is written and disagrees the first time somebody is in a hurry. Here, adding a
 * dimension to the union adds its two columns to the INSERT, the UPDATE and the SELECT at
 * once, and the migration is the only other place that has to know.
 */
const PROFILE_VALUE_COLUMNS: readonly string[] = [
  'method',
  'lightness_min',
  'lightness_max',
  'temperature_bias',
  'chroma_min',
  'chroma_max',
  'contrast_preference',
  ...PROFILE_DIMENSIONS.map((d) => `confidence_${d}`),
  ...PROFILE_DIMENSIONS.map((d) => `origin_${d}`),
];

const PROFILE_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  ...PROFILE_VALUE_COLUMNS,
].join(', ');

const PROFILE_COLOR_COLUMNS =
  'id, created_at, updated_at, deleted_at, profile_id, dimension, corpus_slug, position';

/**
 * Resolve a migration-2 column, or say which row and which column is empty.
 *
 * The alternative is a default, and a default here is a value nobody chose standing in for
 * one somebody must: a palette silently classified `editorial` because the column was null
 * is a claim about its origin that no editor made.
 */
function required<T>(value: T | null, column: string, id: string): T {
  if (value === null)
    throw new StoreError(
      `palette row ${id} has no ${column}. The column arrived with schema version 2, so a ` +
        'row without it was written by an older build — which cannot be re-expressed as a ' +
        'corpus-schema palette, because there is no honest value to put there.',
    );
  return value;
}

export function createRepository(driver: Driver, info: DriverInfo): Repository {
  migrate(driver);

  /**
   * Append to the change log. **Always called inside the caller's transaction**, never in one
   * of its own: a change-log row that survives a rolled-back write describes something that
   * did not happen, and a future reconciliation would apply it confidently.
   */
  const log = (table: string, rowId: string, op: ChangeLogRow['op'], at: Millis): void => {
    driver.run('INSERT INTO change_log (table_name, row_id, op, at) VALUES (?, ?, ?, ?)', [
      table,
      rowId,
      op,
      at,
    ]);
  };

  /**
   * The id an incoming colour should be written under.
   *
   * A colour already saved under the same `corpus_slug` is reused, exactly as `savePalette`
   * does. A Lens capture has no slug and never will (F-040), so it always writes its own row.
   */
  const reusableColorId = (color: NewSavedColor): string => {
    const slug = color.corpus_slug;
    if (slug === null) return color.id;
    const existing = driver.query<{ id: string }>(
      'SELECT id FROM saved_color WHERE corpus_slug = ? AND deleted_at IS NULL',
      [slug],
    );
    return existing[0]?.id ?? color.id;
  };

  /**
   * The colour upsert, **without a transaction of its own**.
   *
   * Extracted so `savePalette` can write a member's colour inside the palette's transaction.
   * `Driver.transaction` issues an explicit `BEGIN`, and SQLite has no nested transactions —
   * so a palette write that called `saveColor` would fail at the second statement, or worse
   * would work on one driver and not the other. Every caller here opens exactly one.
   */
  const upsertColor = (row: NewSavedColor, now: Millis): void => {
    const existing = driver.query<{ id: string }>('SELECT id FROM saved_color WHERE id = ?', [
      row.id,
    ]);
    if (existing.length > 0) {
      driver.run(
        `UPDATE saved_color SET updated_at = ?, name = ?, xyz_x = ?, xyz_y = ?, xyz_z = ?,
         lab_l = ?, lab_a = ?, lab_b = ?, oklch_l = ?, oklch_c = ?, oklch_h = ?,
         hex = ?, source = ?, confidence = ?, corpus_slug = ? WHERE id = ?`,
        [
          now,
          row.name,
          row.xyz_x,
          row.xyz_y,
          row.xyz_z,
          row.lab_l,
          row.lab_a,
          row.lab_b,
          row.oklch_l,
          row.oklch_c,
          row.oklch_h,
          row.hex,
          row.source,
          row.confidence,
          row.corpus_slug,
          row.id,
        ],
      );
      log('saved_color', row.id, 'update', now);
      return;
    }
    driver.run(
      `INSERT INTO saved_color (${COLOR_COLUMNS})
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        now,
        now,
        row.name,
        row.xyz_x,
        row.xyz_y,
        row.xyz_z,
        row.lab_l,
        row.lab_a,
        row.lab_b,
        row.oklch_l,
        row.oklch_c,
        row.oklch_h,
        row.hex,
        row.source,
        row.confidence,
        row.corpus_slug,
      ],
    );
    log('saved_color', row.id, 'insert', now);
  };

  /**
   * Read one palette, resolving every migration-2 column or refusing by name.
   *
   * Members come back in **rank order**, because `parsePalette` requires ranks contiguous
   * from 1 and a caller re-expressing this record would otherwise have to sort them itself —
   * differently, eventually.
   */
  const readPalette = (row: PaletteRow): StoredPalette => {
    const memberRows = driver.query<PaletteMemberRow & { readonly corpus_slug: string | null }>(
      `SELECT m.id, m.created_at, m.updated_at, m.deleted_at, m.palette_id, m.color_id,
              m.position, m.role, m.weight, c.corpus_slug
         FROM palette_member m
         JOIN saved_color c ON c.id = m.color_id
        WHERE m.palette_id = ? AND m.deleted_at IS NULL
        ORDER BY m.position`,
      [row.id],
    );

    const members: StoredPaletteMember[] = memberRows.map((m) => {
      const color = driver.query<SavedColorRow>(
        `SELECT ${COLOR_COLUMNS} FROM saved_color WHERE id = ?`,
        [m.color_id],
      )[0];
      if (color === undefined)
        throw new StoreError(
          `palette member ${m.id} references colour ${m.color_id}, which is not in ` +
            'saved_color. The foreign key should make this impossible; seeing it means ' +
            'foreign_keys was off on the connection that wrote it.',
        );
      return {
        colorId: m.color_id,
        slug: required(m.corpus_slug, `member ${m.color_id} corpus_slug`, row.id),
        role: m.role,
        rank: m.position,
        weight: required(m.weight, `member ${m.color_id} weight`, row.id),
        color,
      };
    });

    return {
      id: row.id,
      nameEn: row.name,
      nameJa: required(row.name_ja, 'name_ja', row.id),
      classification: required(row.classification, 'classification', row.id),
      category: required(row.category, 'category', row.id),
      versionId: required(row.version_id, 'version_id', row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      members,
    };
  };

  /**
   * Resolve a column whose value must be one of a closed set, or say which row and which set.
   *
   * The database has the same CHECK, so this can only fire on a row written by something that
   * bypassed it — which is precisely the case where a silent cast to the union type would let
   * an unknown string travel as a `ContrastPreference` and be compared against three values it
   * is not any of, forever, without an error.
   */
  const oneOf = <T extends string>(
    value: string,
    allowed: readonly T[],
    column: string,
    id: string,
  ): T => {
    const found = allowed.find((a) => a === value);
    if (found === undefined)
      throw new StoreError(
        `profile row ${id} has ${column} = "${value}", which is not one of ` +
          `${allowed.join(', ')}. The table CHECK makes this impossible to write, so the row ` +
          'came from a build with a different vocabulary — reading it as one of ours would be ' +
          'a guess about what somebody meant.',
      );
    return found;
  };

  /** The three slug lists for one profile, live rows only, in position order. */
  const profileLists = (
    profileId: string,
  ): Readonly<Record<ProfileListDimension, readonly string[]>> => {
    const rows = driver.query<ProfileDimensionColorRow>(
      `SELECT ${PROFILE_COLOR_COLUMNS} FROM profile_dimension_color
       WHERE profile_id = ? AND deleted_at IS NULL ORDER BY dimension, position`,
      [profileId],
    );
    const lists: Record<ProfileListDimension, string[]> = {
      neutrals: [],
      accents: [],
      avoid: [],
    };
    for (const row of rows) {
      const dimension = oneOf(row.dimension, PROFILE_LIST_DIMENSIONS, 'dimension', profileId);
      lists[dimension].push(row.corpus_slug);
    }
    return lists;
  };

  /**
   * Replace a garment's seasons.
   *
   * Wholesale rather than reconciled member-by-member, because a season set is small,
   * unordered and has no identity of its own — there is no "this autumn row" a change log
   * reader would want to follow. `palette_member` is reconciled precisely because a member
   * DOES have identity: its rank and role move, and the log should say so.
   *
   * Tombstoned rather than deleted, like every other row here: a hard delete would leave a
   * sync reconciler unable to tell "removed" from "never existed".
   */
  const replaceSeasons = (
    garmentId: string,
    seasons: readonly GarmentSeason[],
    now: Millis,
  ): void => {
    for (const row of driver.query<{ id: string }>(
      'SELECT id FROM garment_season WHERE garment_id = ? AND deleted_at IS NULL',
      [garmentId],
    )) {
      driver.run('UPDATE garment_season SET deleted_at = ?, updated_at = ? WHERE id = ?', [
        now,
        now,
        row.id,
      ]);
      log('garment_season', row.id, 'delete', now);
    }
    // De-duplicated: the CHECK constrains the vocabulary and nothing constrains repetition,
    // so ['autumn','autumn'] would otherwise store a garment as twice-autumnal.
    for (const season of new Set(seasons)) {
      const id = `${garmentId}:${season}`;
      driver.run(
        `INSERT INTO garment_season (id, created_at, updated_at, deleted_at, garment_id, season)
         VALUES (?, ?, ?, NULL, ?, ?)
         ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, updated_at = excluded.updated_at`,
        [id, now, now, garmentId, season],
      );
      log('garment_season', id, 'insert', now);
    }
  };

  /** Replace a garment's secondary and accent colours. Same wholesale reasoning as seasons. */
  const replaceGarmentColors = (
    garmentId: string,
    colors: readonly NewGarmentColor[],
    now: Millis,
  ): void => {
    for (const row of driver.query<{ id: string }>(
      'SELECT id FROM garment_color WHERE garment_id = ? AND deleted_at IS NULL',
      [garmentId],
    )) {
      driver.run('UPDATE garment_color SET deleted_at = ?, updated_at = ? WHERE id = ?', [
        now,
        now,
        row.id,
      ]);
      log('garment_color', row.id, 'delete', now);
    }
    for (const entry of colors) {
      const colorId = reusableColorId(entry.color);
      upsertColor({ ...entry.color, id: colorId }, now);
      const id = `${garmentId}:${entry.role}:${colorId}`;
      driver.run(
        `INSERT INTO garment_color
           (id, created_at, updated_at, deleted_at, garment_id, color_id, role, proportion)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, updated_at = excluded.updated_at,
           proportion = excluded.proportion`,
        [id, now, now, garmentId, colorId, entry.role, entry.proportion],
      );
      log('garment_color', id, 'insert', now);
    }
  };

  /** One colour row by id, or a `StoreError` naming what is missing rather than a `TypeError`. */
  const colorById = (id: string, context: string): SavedColorRow => {
    const row = driver.query<SavedColorRow>(
      `SELECT ${COLOR_COLUMNS} FROM saved_color WHERE id = ?`,
      [id],
    )[0];
    if (row === undefined)
      throw new StoreError(
        `${context}: saved_color ${id} is missing. The foreign key should make this ` +
          'impossible, which means foreign_keys was off when the row was written.',
      );
    return row;
  };

  const readGarment = (row: GarmentRow): StoredGarment => {
    const seasons = driver
      .query<{
        season: string;
      }>(
        'SELECT season FROM garment_season WHERE garment_id = ? AND deleted_at IS NULL ORDER BY season',
        [row.id],
      )
      .map((s) => {
        // Refused BY NAME rather than cast into the union — the move migration 3's read path
        // makes. A value the CHECK would reject can still be in a database written by a build
        // that had a wider vocabulary, and `as GarmentSeason` would make it everyone's problem.
        if (!(GARMENT_SEASONS as readonly string[]).includes(s.season))
          throw new StoreError(
            `garment ${row.id} carries season "${s.season}", which is not one of ` +
              `${GARMENT_SEASONS.join(', ')}.`,
          );
        return s.season as GarmentSeason;
      });

    const colors = driver
      .query<{ color_id: string; role: string; proportion: number | null }>(
        `SELECT color_id, role, proportion FROM garment_color
         WHERE garment_id = ? AND deleted_at IS NULL ORDER BY role, id`,
        [row.id],
      )
      .map((c) => {
        if (!(GARMENT_COLOR_ROLES as readonly string[]).includes(c.role))
          throw new StoreError(
            `garment ${row.id} carries colour role "${c.role}", which is not one of ` +
              `${GARMENT_COLOR_ROLES.join(', ')}.`,
          );
        return {
          role: c.role as GarmentColorRole,
          color: colorById(c.color_id, `garment ${row.id}`),
          proportion: c.proportion,
        };
      });

    return {
      id: row.id,
      type: row.type,
      color: colorById(row.primary_color_id, `garment ${row.id}`),
      name: row.name,
      pattern: row.pattern,
      material: row.material,
      formality: row.formality,
      brand: row.brand,
      size: row.size,
      purchaseDate: row.purchase_date,
      costMinor: row.cost_minor,
      currency: row.currency,
      wearCount: row.wear_count,
      seasons,
      colors,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  };

  const readProfile = (row: PersonalProfileRow): StoredPersonalProfile => {
    const lists = profileLists(row.id);
    const origin = (column: string, value: string): DimensionOrigin =>
      oneOf(value, DIMENSION_ORIGINS, column, row.id);
    return {
      id: row.id,
      method: oneOf<ProfileMethod>(row.method, PROFILE_METHODS, 'method', row.id),
      lightness: { min: row.lightness_min, max: row.lightness_max },
      temperatureBias: row.temperature_bias,
      chroma: { min: row.chroma_min, max: row.chroma_max },
      contrast: oneOf<ContrastPreference>(
        row.contrast_preference,
        CONTRAST_PREFERENCES,
        'contrast_preference',
        row.id,
      ),
      confidence: {
        lightness: row.confidence_lightness,
        temperature: row.confidence_temperature,
        chroma: row.confidence_chroma,
        contrast: row.confidence_contrast,
        neutrals: row.confidence_neutrals,
        accents: row.confidence_accents,
        avoid: row.confidence_avoid,
      },
      origin: {
        lightness: origin('origin_lightness', row.origin_lightness),
        temperature: origin('origin_temperature', row.origin_temperature),
        chroma: origin('origin_chroma', row.origin_chroma),
        contrast: origin('origin_contrast', row.origin_contrast),
        neutrals: origin('origin_neutrals', row.origin_neutrals),
        accents: origin('origin_accents', row.origin_accents),
        avoid: origin('origin_avoid', row.origin_avoid),
      },
      neutrals: lists.neutrals,
      accents: lists.accents,
      avoid: lists.avoid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  };

  /** The profile's own columns, in `PROFILE_COLUMNS` order minus the sync four. */
  const profileValues = (p: NewPersonalProfile): readonly unknown[] => [
    p.method,
    p.lightness.min,
    p.lightness.max,
    p.temperatureBias,
    p.chroma.min,
    p.chroma.max,
    p.contrast,
    ...PROFILE_DIMENSIONS.map((d) => p.confidence[d]),
    ...PROFILE_DIMENSIONS.map((d) => p.origin[d]),
  ];

  return {
    info,

    saveColor(row: NewSavedColor, now: Millis): void {
      driver.transaction(() => {
        upsertColor(row, now);
      });
    },

    listColors(): SavedColorRow[] {
      // Live rows only. "Deleted" and "never existed" are different facts, and conflating
      // them is exactly what a tombstone exists to prevent.
      return driver.query<SavedColorRow>(
        `SELECT ${COLOR_COLUMNS} FROM saved_color WHERE deleted_at IS NULL ORDER BY created_at`,
      );
    },

    getColor(id: string): SavedColorRow | undefined {
      // Returns a tombstoned row too: a caller asking for a specific id needs to be able to
      // tell "you deleted this" from "this was never here".
      return driver.query<SavedColorRow>(`SELECT ${COLOR_COLUMNS} FROM saved_color WHERE id = ?`, [
        id,
      ])[0];
    },

    deleteColor(id: string, now: Millis): void {
      driver.transaction(() => {
        driver.run('UPDATE saved_color SET deleted_at = ?, updated_at = ? WHERE id = ?', [
          now,
          now,
          id,
        ]);
        log('saved_color', id, 'delete', now);
      });
    },

    savePalette(palette: NewPalette, now: Millis): void {
      driver.transaction(() => {
        const existing = driver.query<{ id: string }>('SELECT id FROM palette WHERE id = ?', [
          palette.id,
        ]);
        if (existing.length > 0) {
          driver.run(
            `UPDATE palette SET updated_at = ?, deleted_at = NULL, name = ?, name_ja = ?,
             classification = ?, category = ?, version_id = ? WHERE id = ?`,
            [
              now,
              palette.nameEn,
              palette.nameJa,
              palette.classification,
              palette.category,
              palette.versionId,
              palette.id,
            ],
          );
          log('palette', palette.id, 'update', now);
        } else {
          driver.run(
            `INSERT INTO palette (${PALETTE_COLUMNS}) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
            [
              palette.id,
              now,
              now,
              palette.nameEn,
              palette.nameJa,
              palette.classification,
              palette.category,
              palette.versionId,
            ],
          );
          log('palette', palette.id, 'insert', now);
        }

        /*
         * The colour rows come first: `palette_member.color_id` REFERENCES `saved_color`, and
         * with foreign_keys ON — which is the whole point of CONNECTION_PRAGMAS — a member
         * written before its colour is rejected rather than silently orphaned.
         *
         * A colour already saved under the same `corpus_slug` is REUSED. The alternative is a
         * second saved_color row for the same entry every time it joins a palette, which
         * makes "which palettes hold this colour" a question with two right answers, and
         * makes the row count grow with edits rather than with what the person saved.
         */
        const colorIdFor = new Map<string, string>();
        for (const member of palette.members) {
          const slug = member.color.corpus_slug;
          const reusable =
            slug === null
              ? []
              : driver.query<{ id: string }>(
                  'SELECT id FROM saved_color WHERE corpus_slug = ? AND deleted_at IS NULL',
                  [slug],
                );
          const id = reusable[0]?.id ?? member.color.id;
          upsertColor({ ...member.color, id }, now);
          colorIdFor.set(member.color.id, id);
        }

        /*
         * EVERY member row, tombstoned ones included.
         *
         * Filtering to live rows here was a real defect, and the test that found it is the
         * one that removes a member and then adds it back: the lookup missed the tombstone,
         * took the insert branch, and hit `UNIQUE constraint failed` on an id derived from
         * the pair. Re-adding a member is a RESURRECTION of its row, not a second row —
         * which is also what makes the change log say "update" rather than describing a
         * delete and an insert of two different identities for the same thing.
         */
        const existingMembers = driver.query<{
          id: string;
          color_id: string;
          deleted_at: number | null;
        }>('SELECT id, color_id, deleted_at FROM palette_member WHERE palette_id = ?', [
          palette.id,
        ]);
        const rowFor = new Map(existingMembers.map((r) => [r.color_id, r.id]));
        const wanted = new Set<string>();

        for (const member of palette.members) {
          const colorId = colorIdFor.get(member.color.id) ?? member.color.id;
          wanted.add(colorId);
          const memberId = rowFor.get(colorId);
          if (memberId === undefined) {
            // The id is DERIVED from the pair rather than generated, so re-saving an
            // unchanged palette produces the same row rather than a new one every time.
            const fresh = `${palette.id}:${colorId}`;
            driver.run(
              `INSERT INTO palette_member (${MEMBER_COLUMNS})
               VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
              [fresh, now, now, palette.id, colorId, member.rank, member.role, member.weight],
            );
            log('palette_member', fresh, 'insert', now);
            continue;
          }
          driver.run(
            `UPDATE palette_member SET updated_at = ?, deleted_at = NULL, position = ?,
             role = ?, weight = ? WHERE id = ?`,
            [now, member.rank, member.role, member.weight, memberId],
          );
          log('palette_member', memberId, 'update', now);
        }

        // Removed members are TOMBSTONED, not deleted. "This colour was taken out of the
        // palette" and "it was never in it" are different facts, and only the tombstone keeps
        // them apart for a future reconciliation. A row already tombstoned is left alone —
        // re-stamping it would log a second delete for one removal.
        for (const row of existingMembers) {
          if (wanted.has(row.color_id) || row.deleted_at !== null) continue;
          driver.run('UPDATE palette_member SET deleted_at = ?, updated_at = ? WHERE id = ?', [
            now,
            now,
            row.id,
          ]);
          log('palette_member', row.id, 'delete', now);
        }
      });
    },

    listPalettes(): StoredPalette[] {
      return driver
        .query<PaletteRow>(
          `SELECT ${PALETTE_COLUMNS} FROM palette WHERE deleted_at IS NULL ORDER BY created_at`,
        )
        .map((row) => readPalette(row));
    },

    getPalette(id: string): StoredPalette | undefined {
      const row = driver.query<PaletteRow>(`SELECT ${PALETTE_COLUMNS} FROM palette WHERE id = ?`, [
        id,
      ])[0];
      return row === undefined ? undefined : readPalette(row);
    },

    deletePalette(id: string, now: Millis): void {
      driver.transaction(() => {
        driver.run('UPDATE palette SET deleted_at = ?, updated_at = ? WHERE id = ?', [
          now,
          now,
          id,
        ]);
        log('palette', id, 'delete', now);
        /*
         * The members are tombstoned explicitly rather than left to `ON DELETE CASCADE`. A
         * cascade fires on a DELETE, and this is an UPDATE — so relying on it would leave
         * every member live under a deleted palette, and nothing would report it. The COLOURS
         * are deliberately untouched: a colour saved once may be in another palette.
         */
        for (const row of driver.query<{ id: string }>(
          'SELECT id FROM palette_member WHERE palette_id = ? AND deleted_at IS NULL',
          [id],
        )) {
          driver.run('UPDATE palette_member SET deleted_at = ?, updated_at = ? WHERE id = ?', [
            now,
            now,
            row.id,
          ]);
          log('palette_member', row.id, 'delete', now);
        }
      });
    },

    saveProfile(profile: NewPersonalProfile, now: Millis): void {
      driver.transaction(() => {
        const existing = driver.query<{ id: string }>(
          'SELECT id FROM personal_color_profile WHERE id = ?',
          [profile.id],
        );
        if (existing.length > 0) {
          driver.run(
            `UPDATE personal_color_profile SET updated_at = ?, deleted_at = NULL,
             ${PROFILE_VALUE_COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
            [now, ...profileValues(profile), profile.id],
          );
          log('personal_color_profile', profile.id, 'update', now);
        } else {
          driver.run(
            `INSERT INTO personal_color_profile (${PROFILE_COLUMNS})
             VALUES (?, ?, ?, NULL${', ?'.repeat(PROFILE_VALUE_COLUMNS.length)})`,
            [profile.id, now, now, ...profileValues(profile)],
          );
          log('personal_color_profile', profile.id, 'insert', now);
        }

        /*
         * The lists are reconciled by (dimension, slug), the same way palette members are
         * reconciled by (palette_id, color_id) and for the same reason: a slug taken out of
         * `avoid` and put back later is the SAME fact returning, not a second row, and the id
         * is derived from the pair so re-saving an unchanged profile writes no new rows.
         *
         * A slug may legitimately appear in two dimensions — a low-chroma entry can be a
         * neutral for one person and, at a different lightness, on another's avoid list — so
         * the dimension is part of the id rather than a column that could collide.
         */
        const existingEntries = driver.query<{
          id: string;
          dimension: string;
          corpus_slug: string;
          deleted_at: number | null;
        }>(
          'SELECT id, dimension, corpus_slug, deleted_at FROM profile_dimension_color ' +
            'WHERE profile_id = ?',
          [profile.id],
        );
        const rowFor = new Map(
          existingEntries.map((r) => [`${r.dimension}:${r.corpus_slug}`, r.id]),
        );
        const wanted = new Set<string>();

        for (const dimension of PROFILE_LIST_DIMENSIONS) {
          profile[dimension].forEach((slug, index) => {
            const key = `${dimension}:${slug}`;
            wanted.add(key);
            const rowId = rowFor.get(key);
            if (rowId === undefined) {
              const fresh = `${profile.id}:${key}`;
              driver.run(
                `INSERT INTO profile_dimension_color (${PROFILE_COLOR_COLUMNS})
                 VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
                [fresh, now, now, profile.id, dimension, slug, index],
              );
              log('profile_dimension_color', fresh, 'insert', now);
              return;
            }
            driver.run(
              `UPDATE profile_dimension_color SET updated_at = ?, deleted_at = NULL,
               position = ? WHERE id = ?`,
              [now, index, rowId],
            );
            log('profile_dimension_color', rowId, 'update', now);
          });
        }

        for (const row of existingEntries) {
          if (wanted.has(`${row.dimension}:${row.corpus_slug}`) || row.deleted_at !== null)
            continue;
          driver.run(
            'UPDATE profile_dimension_color SET deleted_at = ?, updated_at = ? WHERE id = ?',
            [now, now, row.id],
          );
          log('profile_dimension_color', row.id, 'delete', now);
        }
      });
    },

    listProfiles(): StoredPersonalProfile[] {
      return driver
        .query<PersonalProfileRow>(
          `SELECT ${PROFILE_COLUMNS} FROM personal_color_profile
           WHERE deleted_at IS NULL ORDER BY created_at`,
        )
        .map((row) => readProfile(row));
    },

    getProfile(id: string): StoredPersonalProfile | undefined {
      const row = driver.query<PersonalProfileRow>(
        `SELECT ${PROFILE_COLUMNS} FROM personal_color_profile WHERE id = ?`,
        [id],
      )[0];
      return row === undefined ? undefined : readProfile(row);
    },

    deleteProfile(id: string, now: Millis): void {
      driver.transaction(() => {
        driver.run(
          'UPDATE personal_color_profile SET deleted_at = ?, updated_at = ? WHERE id = ?',
          [now, now, id],
        );
        log('personal_color_profile', id, 'delete', now);
        // Tombstoned explicitly, not left to ON DELETE CASCADE — a cascade fires on a DELETE
        // and this is an UPDATE, so the list entries would stay live under a deleted profile
        // and nothing would report it. Same defect `deletePalette` names.
        for (const row of driver.query<{ id: string }>(
          'SELECT id FROM profile_dimension_color WHERE profile_id = ? AND deleted_at IS NULL',
          [id],
        )) {
          driver.run(
            'UPDATE profile_dimension_color SET deleted_at = ?, updated_at = ? WHERE id = ?',
            [now, now, row.id],
          );
          log('profile_dimension_color', row.id, 'delete', now);
        }
      });
    },

    /* ------------------------------------------------------------- the wardrobe (F-042) */

    createGarment(garment: NewGarment, now: Millis): void {
      driver.transaction(() => {
        /*
         * The colour first: `garment.primary_color_id` REFERENCES `saved_color` and
         * foreign_keys is ON, so the other order is rejected rather than orphaned.
         *
         * Reused by `corpus_slug` for the reason `savePalette` gives — otherwise every
         * garment in the same published navy writes its own copy of that navy, and "how many
         * navy things do I own" becomes a question about rows rather than about clothes.
         */
        const colorId = reusableColorId(garment.color);
        upsertColor({ ...garment.color, id: colorId }, now);

        driver.run(
          `INSERT INTO garment (id, created_at, updated_at, deleted_at, type, primary_color_id,
             name, pattern, material, formality, brand, size, purchase_date, cost_minor,
             currency, wear_count)
           VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0)`,
          [garment.id, now, now, garment.type, colorId],
        );
        log('garment', garment.id, 'insert', now);
      });
    },

    enrichGarment(id: string, patch: GarmentEnrichment, now: Millis): void {
      driver.transaction(() => {
        const existing = driver.query<{ id: string }>('SELECT id FROM garment WHERE id = ?', [id]);
        if (existing.length === 0)
          throw new StoreError(
            `enrichGarment: no garment ${id}. A patch never creates one — a mistyped id would ` +
              'otherwise become a second garment carrying half the edits and nothing to find it by.',
          );

        /*
         * Built from the keys PRESENT on the patch, so `undefined` and `null` stay different:
         * an absent key contributes no SET clause and leaves the column, while an explicit
         * null writes NULL and clears it. `'brand' in patch` is the only test that can tell
         * those apart — `patch.brand === undefined` cannot.
         */
        const sets: string[] = [];
        const values: unknown[] = [];
        for (const [key, column] of GARMENT_PATCH_COLUMNS) {
          if (!(key in patch)) continue;
          sets.push(`${column} = ?`);
          values.push(patch[key] ?? null);
        }

        if (sets.length > 0) {
          driver.run(`UPDATE garment SET updated_at = ?, ${sets.join(', ')} WHERE id = ?`, [
            now,
            ...values,
            id,
          ]);
        } else {
          driver.run('UPDATE garment SET updated_at = ? WHERE id = ?', [now, id]);
        }
        log('garment', id, 'update', now);

        if (patch.seasons !== undefined) replaceSeasons(id, patch.seasons, now);
        if (patch.colors !== undefined) replaceGarmentColors(id, patch.colors, now);
      });
    },

    listGarments(): StoredGarment[] {
      return driver
        .query<GarmentRow>(
          `SELECT ${GARMENT_COLUMNS} FROM garment WHERE deleted_at IS NULL ORDER BY created_at`,
        )
        .map((row) => readGarment(row));
    },

    getGarment(id: string): StoredGarment | undefined {
      const row = driver.query<GarmentRow>(`SELECT ${GARMENT_COLUMNS} FROM garment WHERE id = ?`, [
        id,
      ])[0];
      return row === undefined ? undefined : readGarment(row);
    },

    deleteGarment(id: string, now: Millis): void {
      driver.transaction(() => {
        driver.run('UPDATE garment SET deleted_at = ?, updated_at = ? WHERE id = ?', [
          now,
          now,
          id,
        ]);
        log('garment', id, 'delete', now);
        // Tombstoned explicitly rather than left to ON DELETE CASCADE, for the reason
        // `deleteProfile` states: a cascade fires on DELETE and this is an UPDATE, so the
        // children would stay live under a deleted garment with nothing to report it.
        for (const table of ['garment_season', 'garment_color', 'garment_image'] as const) {
          for (const child of driver.query<{ id: string }>(
            `SELECT id FROM ${table} WHERE garment_id = ? AND deleted_at IS NULL`,
            [id],
          )) {
            driver.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
              now,
              now,
              child.id,
            ]);
            log(table, child.id, 'delete', now);
          }
        }
      });
    },

    putGarmentImage(garmentId: string, image: SanitisedImage, now: Millis): void {
      driver.transaction(() => {
        const garment = driver.query<{ id: string }>('SELECT id FROM garment WHERE id = ?', [
          garmentId,
        ]);
        if (garment.length === 0)
          throw new StoreError(
            `putGarmentImage: no garment ${garmentId}. The foreign key would refuse this ` +
              'anyway; saying so here names the id instead of surfacing a constraint error.',
          );

        // One image per garment — `garment_image.garment_id` is UNIQUE — so this replaces
        // rather than accumulates. The row id is derived from the garment so a replacement is
        // one change-log entry about one thing, not a delete and an insert of two ids.
        const id = `${garmentId}:image`;
        driver.run(
          `INSERT INTO garment_image
             (id, created_at, updated_at, deleted_at, garment_id, bytes, byte_length,
              width, height, format)
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             deleted_at = NULL, updated_at = excluded.updated_at, bytes = excluded.bytes,
             byte_length = excluded.byte_length, width = excluded.width,
             height = excluded.height, format = excluded.format`,
          [
            id,
            now,
            now,
            garmentId,
            image.bytes,
            image.bytes.length,
            image.width,
            image.height,
            image.format,
          ],
        );
        log('garment_image', id, 'insert', now);
      });
    },

    getGarmentImageInfo(garmentId: string): GarmentImageInfo | undefined {
      // Every column EXCEPT `bytes`. The point of this method is not to touch the blob.
      const row = driver.query<{
        byte_length: number;
        width: number;
        height: number;
        format: string;
      }>(
        `SELECT byte_length, width, height, format FROM garment_image
         WHERE garment_id = ? AND deleted_at IS NULL`,
        [garmentId],
      )[0];
      if (row === undefined) return undefined;
      if (row.format !== 'jpeg' && row.format !== 'png')
        throw new StoreError(
          `garment ${garmentId} has an image in format "${row.format}", which is neither jpeg ` +
            'nor png. Refused by name rather than cast into the union.',
        );
      return {
        byteLength: row.byte_length,
        width: row.width,
        height: row.height,
        format: row.format,
      };
    },

    getGarmentImage(garmentId: string): Uint8Array | undefined {
      const row = driver.query<{ bytes: Uint8Array }>(
        'SELECT bytes FROM garment_image WHERE garment_id = ? AND deleted_at IS NULL',
        [garmentId],
      )[0];
      return row === undefined ? undefined : Uint8Array.from(row.bytes);
    },

    changeLog(): ChangeLogRow[] {
      return driver.query<ChangeLogRow>(
        'SELECT seq, table_name, row_id, op, at FROM change_log ORDER BY seq',
      );
    },

    close: () => {
      driver.close();
    },
    reopen: () => {
      driver.reopen();
      // Pragmas are PER CONNECTION. Reopening without re-applying them silently turns foreign
      // keys back off, and everything keeps working until an orphan appears months later.
      migrate(driver);
    },
  };
}
