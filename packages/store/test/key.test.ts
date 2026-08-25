/**
 * The key lifecycle, and the failure that no device would reveal.
 *
 * A key regenerated on every launch encrypts a database nobody can open again. On a phone
 * that presents as "the app lost my data" — reported once, months later, unreproducible. It
 * is a two-line test here, which is the entire argument for the keystore being an interface.
 */

import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DATABASE_KEY_NAME,
  forgetDatabaseKey,
  getOrCreateDatabaseKey,
  keyPragma,
  type SecureKeyStore,
} from '../src/key.js';

const fakeStore = (): SecureKeyStore & { readonly seen: Map<string, string> } => {
  const seen = new Map<string, string>();
  return {
    seen,
    get: (n) => seen.get(n) ?? null,
    set: (n, v) => {
      seen.set(n, v);
    },
    remove: (n) => {
      seen.delete(n);
    },
  };
};

describe('the key is generated once and never again', () => {
  it('returns the SAME key on a second call', () => {
    // THE TEST THAT MATTERS. A second generation produces a key that cannot open the first
    // database, and nothing anywhere reports an error.
    const store = fakeStore();
    const first = getOrCreateDatabaseKey(store);
    const second = getOrCreateDatabaseKey(store);
    expect(second).toBe(first);
  });

  it('generates a DIFFERENT key for a different device', () => {
    // The decoy for the assertion above: a constant key would satisfy "same on second call"
    // perfectly, and would be a key every user shares — which is not encryption.
    const a = getOrCreateDatabaseKey(fakeStore());
    const b = getOrCreateDatabaseKey(fakeStore());
    expect(a).not.toBe(b);
  });

  it('is 256 bits of hex, which is what SQLCipher takes as a raw key', () => {
    expect(getOrCreateDatabaseKey(fakeStore())).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('treats an empty stored value as absent rather than as a key', () => {
    // A keystore that returns '' on a missing entry is a real platform behaviour, and an
    // empty key would be accepted by a naive `!== null` check and then rejected by SQLCipher
    // at the worst possible moment.
    const store = fakeStore();
    store.set(DATABASE_KEY_NAME, '');
    expect(getOrCreateDatabaseKey(store)).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('erasure removes it, and the next call is a NEW key', () => {
    // FR-58: erasure is immediate and local. Removing the key is what makes that true of
    // data already on disk — a file delete leaves recoverable blocks.
    const store = fakeStore();
    const first = getOrCreateDatabaseKey(store);
    forgetDatabaseKey(store);
    expect(store.get(DATABASE_KEY_NAME)).toBeNull();
    expect(getOrCreateDatabaseKey(store)).not.toBe(first);
  });
});

describe('the key reaches SQLCipher through PRAGMA, and nothing else', () => {
  it('builds the raw-key pragma', () => {
    const key = 'a'.repeat(64);
    expect(keyPragma(key)).toBe(`PRAGMA key = "x'${key}'"`);
  });

  it('REFUSES anything that is not 64 hex characters', () => {
    // PRAGMA takes no bound parameter, so the key is interpolated. A key from a keystore an
    // attacker can write would otherwise be an injection into the one statement that runs
    // before any other.
    expect(() => keyPragma("' OR 1=1 --")).toThrow(/64 hex/u);
    expect(() => keyPragma('abc')).toThrow(/64 hex/u);
    expect(() => keyPragma('A'.repeat(64))).toThrow(/64 hex/u);
  });
});

/**
 * "Never in the bundle" (FR-56). A key committed to source is a key every user shares.
 *
 * ## Why this check needed correcting, and what it was NOT allowed to become
 *
 * It scanned for any 64-hex literal and went red the moment F-018 generated the corpus
 * bundle — because a **SHA-256 digest is also 64 hex characters**, and the bundle carries 126
 * of them. It stayed red for two features without anyone seeing it: `turbo`'s `test` task is
 * keyed on the inputs of the package it runs in, and `packages/store` had not changed, so a
 * cached pass was replayed while the file it reads changed underneath it.
 *
 * The tempting repair is an exemption — skip `**\/generated/**` — and it is the wrong one: it
 * would switch the check off for a whole directory to remove one class of false positive, and
 * a key written into a generated file is exactly as dangerous as one written by hand.
 *
 * So the discriminator is the **ledger**, not the path. Every digest in shipped source is one
 * `content/versions/` records; a database key is not in the ledger and never could be, because
 * the ledger is built from corpus content. The check therefore stays total over the same files
 * and rejects any 64-hex literal it cannot account for.
 */
describe('no key is in the bundle', () => {
  /** Every 64-hex string the committed corpus ledger records. */
  const ledgerDigests = (): ReadonlySet<string> => {
    const dir = join(process.cwd(), '..', '..', 'content', 'versions');
    const found = new Set<string>();
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      for (const m of readFileSync(join(dir, file), 'utf8').matchAll(/\b[0-9a-f]{64}\b/gu))
        found.add(m[0]);
    }
    return found;
  };

  const shippedSource = (): readonly string[] => {
    // The test files themselves are excluded BY PATH, because this one necessarily contains
    // 'a'.repeat(64) fixtures. `src` is what ships.
    const roots = [
      join(process.cwd(), 'src'),
      join(process.cwd(), '..', '..', 'apps', 'mobile', 'src'),
    ];
    const files: string[] = [];
    const walk = (dir: string): void => {
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const e of entries) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/u.test(e)) files.push(full);
      }
    };
    for (const r of roots) walk(r);
    return files;
  };

  /** A 64-hex literal that is not a digest the ledger records. */
  const unaccounted = (source: string, ledger: ReadonlySet<string>): readonly string[] =>
    [...source.matchAll(/['"`]([0-9a-fA-F]{64})['"`]/gu)]
      .map((m) => m[1] ?? '')
      .filter((hex) => !ledger.has(hex.toLowerCase()));

  it('has no unaccounted 64-hex literal anywhere in shipped source', () => {
    const ledger = ledgerDigests();
    // The ledger must have been FOUND. An empty set would make every digest unaccounted and
    // the test would fail loudly — which is the right direction, but say it plainly.
    expect(ledger.size).toBeGreaterThan(0);

    const files = shippedSource();
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((f) => unaccounted(readFileSync(f, 'utf8'), ledger).length > 0);
    expect(offenders).toEqual([]);
  });

  /*
   * THE DECOY. Without it, "no offenders" is equally true of a check that accepts everything —
   * and this check now has an allow-list, which is precisely the shape that stops discriminating
   * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
   */
  it('DECOY — a key literal is reported even though digests are not', () => {
    const ledger = ledgerDigests();
    const digest = [...ledger][0] ?? '';
    expect(digest).toHaveLength(64);

    // A real digest: accounted for, so silent.
    expect(unaccounted(`export const D = '${digest}';`, ledger)).toEqual([]);

    // A key: same shape, same length, not in the ledger, and therefore reported.
    const key = 'f'.repeat(63) + '0';
    expect(unaccounted(`const KEY = '${key}';`, ledger)).toEqual([key]);
  });
});
