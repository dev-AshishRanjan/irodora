/**
 * The order of operations, which is the whole feature.
 *
 * With no server there is no other copy. A destructive action that runs before the user has
 * been offered a backup is the one moment this product can lose data permanently, so the
 * sequence is enforced in code and asserted here — not left to whoever writes the call site.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import {
  archiveFileName,
  createRepository,
  eraseWithBackupPrompt,
  uuidv7,
  type ArchiveSink,
  type DestructiveConfirm,
  type SecureKeyStore,
} from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-backup-'));
let n = 0;
const open = () => nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const keys = (): SecureKeyStore => {
  const m = new Map<string, string>([['irodora.db.key', 'c'.repeat(64)]]);
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
    remove: (k) => {
      m.delete(k);
    },
  };
};

/** Records the order every step happened in — which is what these tests are about. */
function harness(opts: { export: boolean; erase: boolean; sinkThrows?: boolean }) {
  const order: string[] = [];
  const sink: ArchiveSink = {
    write: (name, contents) => {
      order.push('write');
      if (opts.sinkThrows === true) throw new Error('no space left on device');
      return `/backups/${name}:${String(contents.length)}`;
    },
  };
  const confirm: DestructiveConfirm = {
    offerExport: () => {
      order.push('offerExport');
      return opts.export;
    },
    confirmErase: () => {
      order.push('confirmErase');
      return opts.erase;
    },
  };
  return { order, sink, confirm };
}

function seeded() {
  const { driver, info } = open();
  const repo = createRepository(driver, info);
  repo.saveColor(
    {
      id: uuidv7(),
      name: 'Ai-nezumi',
      xyz_x: 0.1,
      xyz_y: 0.1,
      xyz_z: 0.1,
      lab_l: 40,
      lab_a: 0,
      lab_b: 0,
      oklch_l: 0.5,
      oklch_c: 0.01,
      oklch_h: 180,
      hex: '#526A6B',
      source: 'declared',
      confidence: 1,
      corpus_slug: null,
    },
    1000,
  );
  return { driver, repo };
}

describe('the export is offered BEFORE anything is destroyed', () => {
  it('offers, writes, confirms, then erases — in that order', () => {
    const { driver, repo } = seeded();
    const h = harness({ export: true, erase: true });
    const out = eraseWithBackupPrompt(driver, keys(), h.sink, h.confirm, 1_700_000_000_000);

    // The ORDER is the assertion. A test that only checked "a backup exists and the data is
    // gone" would pass on an implementation that erased first and backed up an empty
    // database — which is the failure mode that matters and looks fine afterwards.
    expect(h.order).toEqual(['offerExport', 'write', 'confirmErase']);
    expect(out.erased).toBe(true);
    expect(out.backupPath).toContain('irodora-backup-');
    expect(repo.listColors()).toHaveLength(0);
    repo.close();
  });

  it('erases nothing when the final confirmation is declined', () => {
    const { driver, repo } = seeded();
    const h = harness({ export: false, erase: false });
    const out = eraseWithBackupPrompt(driver, keys(), h.sink, h.confirm, 1);

    expect(out.erased).toBe(false);
    expect(repo.listColors()).toHaveLength(1);
    repo.close();
  });

  it('erases NOTHING when the requested backup could not be written', () => {
    // THE CASE THAT MATTERS MOST. Losing the data AND the backup in one action is the worst
    // outcome available here, and it is exactly what a try/catch that carries on produces.
    const { driver, repo } = seeded();
    const h = harness({ export: true, erase: true, sinkThrows: true });

    expect(() => eraseWithBackupPrompt(driver, keys(), h.sink, h.confirm, 1)).toThrow(/no space/u);
    // Never reached the confirmation, and never erased.
    expect(h.order).toEqual(['offerExport', 'write']);
    expect(repo.listColors()).toHaveLength(1);
    repo.close();
  });

  it('skips the write when the user declines a backup, but still erases', () => {
    // The decoy for the first test: without this, an implementation that ALWAYS wrote a
    // backup would pass everything above while ignoring the user's answer.
    const { driver, repo } = seeded();
    const h = harness({ export: false, erase: true });
    const out = eraseWithBackupPrompt(driver, keys(), h.sink, h.confirm, 1);

    expect(h.order).toEqual(['offerExport', 'confirmErase']);
    expect(out.backupPath).toBeUndefined();
    expect(out.erased).toBe(true);
    repo.close();
  });
});

describe('the file name is one a person can find again', () => {
  it('is dated, in UTC', () => {
    expect(archiveFileName(Date.UTC(2026, 7, 20))).toBe('irodora-backup-2026-08-20.json');
  });
});
