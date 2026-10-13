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

/**
 * WHAT A WHOLE-SUITE RUN IS GIVEN (F-306). Each case below runs every check in `checkStore`, on
 * real database files: measured at 0.3–0.65 s alone (2026-10-13, 14 checks). Under the monorepo's
 * full parallel `turbo run test --force` the same case passed vitest's 5 s default — F-306 saw
 * 5.6 s, and F-237's Tier 2 saw a decoy case time out after its two checks were added. 30 s is about
 * fifty times the measured cost: room for the load, and a hang still fails.
 */
const SUITE_BUDGET = { timeout: 30_000 };

describe('the node:sqlite driver conforms', SUITE_BUDGET, () => {
  it('produces no findings, and actually ran its checks', () => {
    const { findings, ran, info } = checkStore(open);
    expect(formatStoreFindings(findings)).toBe('');
    // A suite reporting zero findings over zero checks is the shape this asserts against.
    // Raised with the two palette checks (F-020) and again with the three profile checks
    // (F-026), again with the two bookmark checks (F-237), and with the two outfit checks (F-238):
    // a floor that never moves stops noticing a check that quietly went missing.
    expect(ran).toBeGreaterThanOrEqual(16);
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

describe('the suite rejects what it is supposed to reject', SUITE_BUDGET, () => {
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

  it('catches a bookmark written outside a transaction (F-237)', () => {
    // A `transaction` that runs its function with no BEGIN and no ROLLBACK: the bookmark row
    // is written, the change log refuses, and nothing takes the row back.
    const checks = findingsFor((made) => {
      made.driver.transaction = <T>(fn: () => T): T => fn();
    });
    expect(checks).toContain('bookmark-atomicity');
  });

  it('catches a removed bookmark that cannot come back (F-237)', () => {
    // A store whose revival is lost — what `saved_color`'s upsert, which never clears
    // `deleted_at`, would have done to a colour bookmarked a second time.
    const checks = findingsFor((made) => {
      const realRun = made.driver.run.bind(made.driver);
      made.driver.run = (sql: string, params?: readonly unknown[]) => {
        if (sql.includes('SET deleted_at = NULL') && sql.includes('color_bookmark')) return;
        realRun(sql, params);
      };
    });
    expect(checks).toContain('bookmark-durability');
  });

  it('does not report either bookmark check on an unmutated driver', () => {
    const checks = findingsFor(() => undefined);
    expect(checks).not.toContain('bookmark-atomicity');
    expect(checks).not.toContain('bookmark-durability');
  });

  it('catches an outfit written outside a transaction (F-238)', () => {
    // The outfit and its slot are written before the component's log entry is refused; with no
    // BEGIN and no ROLLBACK nothing takes them back, and a lookbook entry has no score.
    const checks = findingsFor((made) => {
      made.driver.transaction = <T>(fn: () => T): T => fn();
    });
    expect(checks).toContain('outfit-atomicity');
  });

  it('catches an outfit read back without its score (F-238)', () => {
    // A store that dropped the component rows: the outfit survives a reopen, half of it.
    const checks = findingsFor((made) => {
      const realRun = made.driver.run.bind(made.driver);
      made.driver.run = (sql: string, params?: readonly unknown[]) => {
        if (sql.includes('INSERT INTO outfit_component')) return;
        realRun(sql, params);
      };
    });
    expect(checks).toContain('outfit-durability');
  });

  it('does not report either outfit check on an unmutated driver', () => {
    const checks = findingsFor(() => undefined);
    expect(checks).not.toContain('outfit-atomicity');
    expect(checks).not.toContain('outfit-durability');
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
    expect(repo.listColors()).toHaveLength(0);
    repo.close();
  });
});
