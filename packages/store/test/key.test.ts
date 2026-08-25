/**
 * The key lifecycle, and the failure that no device would reveal.
 *
 * A key regenerated on every launch encrypts a database nobody can open again. On a phone
 * that presents as "the app lost my data" — reported once, months later, unreproducible. It
 * is a two-line test here, which is the entire argument for the keystore being an interface.
 */

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

/*
 * THE 64-HEX LITERAL SCAN USED TO LIVE HERE, AND THAT WAS THE DEFECT (F-093).
 *
 * FR-56 says the database key is never in the bundle, and the check for it scanned
 * `apps/mobile/src` — a directory this package does not own. Turbo keys the `test` task on
 * the inputs of the package it runs in, so when F-018 generated a corpus bundle carrying 126
 * SHA-256 digests the check went red and its cached pass was replayed for two whole features
 * while `pnpm test` printed 31 successful, 31 total.
 *
 * It now runs in `scripts/verify-no-key-material.mjs`, inside gate 15, uncached — beside the
 * question it is a variant of, and in a gate that is `requiredFor: always` rather than
 * `requiredFor: code`.
 *
 * The rule worth carrying: a REPOSITORY-WIDE check does not belong inside one package's test
 * suite. Not because caching is awkward to configure, but because the scope of the question
 * and the scope of the cache key disagree by construction, and nothing reports that
 * [[a-cache-key-describes-the-package-not-the-world-the-test-read]].
 */
