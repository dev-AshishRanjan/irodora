/**
 * The store, against the CI driver.
 *
 * The same suite runs against `expo-sqlite` on a device (attested on F-041). This file is the
 * Node half plus the assertions that prove the suite discriminates — a conformance suite
 * nobody has watched reject anything might only be capable of passing.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import { checkStore, formatStoreFindings } from '../src/testing/index.js';
import { createRepository, uuidv7 } from '../src/index.js';

// A FILE, not `:memory:`. The durability check reopens the database, and a memory database
// has nothing to reopen — the check would be asserting that an object still has its property.
const dir = mkdtempSync(join(tmpdir(), 'irodora-store-'));
let n = 0;
const open = () => nodeDriver(join(dir, `db-${String(n++)}.sqlite`));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the node:sqlite driver conforms', () => {
  it('produces no findings, and actually ran its checks', () => {
    const { findings, ran, info } = checkStore(open);
    expect(formatStoreFindings(findings)).toBe('');
    // A suite reporting zero findings over zero checks is the shape this asserts against.
    // Raised with the two palette checks (F-020): a floor that never moves stops noticing a
    // check that quietly went missing.
    expect(ran).toBeGreaterThanOrEqual(9);
    expect(info.name).toBe('node:sqlite');
  });

  it('reports honestly that it does NOT encrypt at rest', () => {
    // FR-56 requires SQLCipher. node:sqlite has no encryption, so a green run here says
    // nothing about encryption — and the driver states that as data rather than leaving a
    // reader to infer it. That clause is attested on F-041, not gated.
    const { info } = checkStore(open);
    expect(info.encryptsAtRest).toBe(false);
  });
});

describe('the suite rejects what it is supposed to reject', () => {
  const findingsFor = (mutate: (d: ReturnType<typeof nodeDriver>) => void) => {
    return checkStore(() => {
      const made = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
      mutate(made);
      return made;
    }).findings.map((f) => f.check);
  };

  it('catches foreign keys being off — the default, and the usual defect', () => {
    // THE DECOY THAT MATTERS. SQLite defaults foreign_keys OFF and it is per-connection, so
    // a schema full of REFERENCES enforces nothing unless the pragma runs every time. Here
    // the pragma is turned back off after migration, which is exactly what a forgotten
    // reopen does — and the suite must notice.
    //
    // AND A SQLITE TRAP FOUND WHILE WRITING THIS: `PRAGMA foreign_keys` is a NO-OP inside a
    // transaction. The first version of this mutation turned the pragma off right after the
    // `user_version` bump — which happens inside the migration's transaction — so it did
    // nothing at all and the test failed for a reason that had nothing to do with the check.
    // It is turned off here after the pragma pass, which is outside any transaction.
    //
    // That trap is itself the argument for this check existing: a codebase that sets the
    // pragma somewhere harmless has foreign keys off and no way to notice.
    const checks = findingsFor((made) => {
      const realExec = made.driver.exec.bind(made.driver);
      made.driver.exec = (sql: string) => {
        realExec(sql);
        if (sql.includes('foreign_keys = ON')) realExec('PRAGMA foreign_keys = OFF');
      };
    });
    expect(checks).toContain('foreign-keys');
  });

  it('does not report foreign-keys on an unmutated driver', () => {
    // The baseline half. Without it the assertion above cannot distinguish "the check caught
    // my mutation" from "the check always fires".
    expect(findingsFor(() => undefined)).not.toContain('foreign-keys');
  });
});

describe('the repository keeps its own rules, not the driver', () => {
  it('separates a tombstoned row from one that never existed', () => {
    const { driver, info } = open();
    const repo = createRepository(driver, info);
    const id = uuidv7();
    repo.saveColor(
      {
        id,
        name: 'Indigo',
        xyz_x: 0.18,
        xyz_y: 0.07,
        xyz_z: 0.95,
        lab_l: 32,
        lab_a: 79,
        lab_b: -107,
        oklch_l: 0.45,
        oklch_c: 0.31,
        oklch_h: 264,
        hex: '#0000FF',
        source: 'declared',
        confidence: 1,
        corpus_slug: null,
      },
      1000,
    );
    repo.deleteColor(id, 2000);

    expect(repo.getColor(id)?.deleted_at).toBe(2000);
    expect(repo.getColor('never-existed')).toBeUndefined();
    expect(repo.listColors()).toEqual([]);
    repo.close();
  });
});
