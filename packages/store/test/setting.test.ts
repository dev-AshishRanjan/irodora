/**
 * Migration 8 — device settings (F-153, FR-70).
 *
 * ## What earns this file
 *
 * A migration with no test is the failure mode: it runs once on a device somebody already has
 * data on, and if it is wrong there is no second chance.
 *
 * The table is also the first thing in this database that is **not the person's data**, and
 * that distinction is the thing most likely to be eroded later. So it is asserted rather than
 * described: the table is not in `SYNC_TABLES`, because an export is what somebody made and
 * their choice of theme is not part of it.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { nodeDriver } from '../src/drivers/node.js';
import { createRepository } from '../src/index.js';
import { SCHEMA_VERSION, SYNC_TABLES } from '../src/schema.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-setting-'));
let n = 0;

/*
 * Every handle is kept and closed. On Windows an open SQLite file cannot be deleted, so a
 * suite that opens a database per case and forgets them fails its own teardown with EPERM.
 */
const opened: { close: () => void }[] = [];
const open = () => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  const repository = createRepository(driver, info);
  opened.push(driver);
  return { driver, repository };
};

afterAll(() => {
  for (const handle of opened) handle.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('migration 8', () => {
  it('brings the schema to at least 8 and creates the table', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(8);
    const { driver } = open();
    expect(
      driver.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'setting'",
      ),
    ).toHaveLength(1);
  });

  it('is NOT a sync table, because a setting is not something somebody made', () => {
    // The assertion that keeps this table what it is. An export carries a person's colours,
    // palettes and garments; restoring one on a second device must not repaint it.
    expect([...SYNC_TABLES]).not.toContain('setting');
  });
});

describe('getSetting / putSetting', () => {
  it('returns undefined for a key nobody has set', () => {
    /*
     * UNDEFINED RATHER THAN A DEFAULT, and that is the interesting half. A store that answered
     * `'light'` here would be making a design decision from inside the persistence layer, and
     * the manifest is what makes that one — the same reasoning `ThemeProvider` gives for taking
     * `defaultTheme` from the manifest rather than from a `??` in a layout.
     */
    const { repository } = open();
    expect(repository.getSetting('appearance')).toBeUndefined();
  });

  it('round-trips a value', () => {
    const { repository } = open();
    repository.putSetting('appearance', 'fuka:system', 1_000);
    expect(repository.getSetting('appearance')).toBe('fuka:system');
  });

  it('last write wins, and there is one row per key', () => {
    const { driver, repository } = open();
    repository.putSetting('appearance', 'base:light', 1_000);
    repository.putSetting('appearance', 'aota:dark', 2_000);

    expect(repository.getSetting('appearance')).toBe('aota:dark');
    expect(driver.query<{ n: number }>('SELECT COUNT(*) AS n FROM setting')[0]?.n).toBe(1);
  });

  it('keeps keys apart', () => {
    // The decoy for the case above: a table that upserted on nothing would also have one row.
    const { repository } = open();
    repository.putSetting('appearance', 'base:dark', 1_000);
    repository.putSetting('something-else', 'x', 1_000);
    expect(repository.getSetting('appearance')).toBe('base:dark');
    expect(repository.getSetting('something-else')).toBe('x');
  });

  it('writes no change-log row, because nothing will ever reconcile it', () => {
    /*
     * The log exists so a future sync can reconcile what a person MADE. A setting is how this
     * device looks; it is not in `SYNC_TABLES`, so a log row for it would be a change nothing
     * can ever act on — and a log full of those is a log nobody reads.
     */
    const { repository } = open();
    const before = repository.changeLog().length;
    repository.putSetting('appearance', 'yama:light', 1_000);
    expect(repository.changeLog()).toHaveLength(before);
  });
});
