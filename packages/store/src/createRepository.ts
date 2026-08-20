/**
 * The repository, over any driver.
 *
 * One implementation, two drivers underneath it. Every rule that matters — the tombstone, the
 * change-log append, the atomicity of the pair — lives here rather than in a driver, so the
 * device and CI cannot diverge on the behaviour the product depends on. What a driver may
 * differ in is how it talks to SQLite; what it may not differ in is what the data means.
 */

import { migrate } from './migrate.js';
import type {
  ChangeLogRow,
  Driver,
  DriverInfo,
  Millis,
  NewSavedColor,
  Repository,
  SavedColorRow,
} from './repository.js';

const COLOR_COLUMNS =
  'id, created_at, updated_at, deleted_at, name, xyz_x, xyz_y, xyz_z, ' +
  'lab_l, lab_a, lab_b, oklch_l, oklch_c, oklch_h, hex, source, confidence';

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

  return {
    info,

    saveColor(row: NewSavedColor, now: Millis): void {
      driver.transaction(() => {
        const existing = driver.query<{ id: string }>('SELECT id FROM saved_color WHERE id = ?', [
          row.id,
        ]);
        if (existing.length > 0) {
          driver.run(
            `UPDATE saved_color SET updated_at = ?, name = ?, xyz_x = ?, xyz_y = ?, xyz_z = ?,
             lab_l = ?, lab_a = ?, lab_b = ?, oklch_l = ?, oklch_c = ?, oklch_h = ?,
             hex = ?, source = ?, confidence = ? WHERE id = ?`,
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
              row.id,
            ],
          );
          log('saved_color', row.id, 'update', now);
          return;
        }
        driver.run(
          `INSERT INTO saved_color (${COLOR_COLUMNS})
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          ],
        );
        log('saved_color', row.id, 'insert', now);
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
