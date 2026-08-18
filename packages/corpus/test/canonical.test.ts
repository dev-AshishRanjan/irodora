/**
 * Canonicalisation and the corpus digest — E-014.
 *
 * `canonicalize` decides what a checksum *means*. Changing it invalidates every digest ever
 * recorded, with no import edge to the data and no test that would notice, because both sides
 * of every comparison move together. The golden fixture is the only thing that can catch it,
 * and its expected values come from `node:crypto` rather than from this package.
 *
 * The hasher is `node:crypto` here — this is a test, and the ESLint portability override
 * deliberately excludes tests. `src/` stays pure; the seam is what makes that possible.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  assertSha256,
  canonicalize,
  CanonicalError,
  DigestError,
  entryDigest,
  rootDigest,
  SHA256_VECTORS,
  type DigestFn,
} from '../src/index.js';

const sha256: DigestFn = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

interface GoldenCase {
  readonly name: string;
  readonly note: string;
  readonly input: unknown;
  readonly canonical: string;
  readonly sha256: string;
}

const golden = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'golden', 'canonical-digest.fixture.json'),
    'utf8',
  ),
) as { readonly cases: readonly GoldenCase[] };

describe('the golden fixture (E-014)', () => {
  it('has cases, so an empty file cannot pass as agreement', () => {
    expect(golden.cases.length).toBeGreaterThanOrEqual(7);
  });

  for (const c of golden.cases) {
    it(`${c.name}: canonicalises to the recorded string`, () => {
      expect(canonicalize(c.input)).toBe(c.canonical);
    });

    it(`${c.name}: the recorded string hashes to the recorded digest`, () => {
      // Deliberately hashes `c.canonical` — the string in the FILE — not `canonicalize(input)`.
      // Hashing our own output would make this row agree with the implementation by
      // construction, which is the failure the fixture exists to prevent.
      expect(sha256(c.canonical)).toBe(c.sha256);
    });

    it(`${c.name}: end to end, input to digest`, () => {
      expect(entryDigest(c.input, sha256)).toBe(c.sha256);
    });
  }

  it('gives the empty object and the empty array different digests', () => {
    expect(entryDigest({}, sha256)).not.toBe(entryDigest([], sha256));
  });
});

describe('the injected hasher is checked, not trusted', () => {
  it('accepts a real SHA-256', () => {
    expect(() => {
      assertSha256(sha256);
    }).not.toThrow();
  });

  it('rejects a stub that returns a constant', () => {
    expect(() => {
      assertSha256(() => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    }).toThrow(DigestError);
  });

  it('rejects a different hash function', () => {
    const sha1: DigestFn = (s) => createHash('sha1').update(s, 'utf8').digest('hex');
    expect(() => {
      assertSha256(sha1);
    }).toThrow(/is not SHA-256/u);
  });

  it('rejects a hasher that encodes UTF-16 rather than UTF-8', () => {
    // The failure this catches is invisible on ASCII and wrong on every kanji in the corpus.
    const utf16: DigestFn = (s) => createHash('sha256').update(s, 'utf16le').digest('hex');
    expect(() => {
      assertSha256(utf16);
    }).toThrow(/is not SHA-256/u);
  });

  it('covers ASCII and non-ASCII, so the UTF-16 case is reachable', () => {
    // Code-unit indexing rather than spreading: this asks whether any BYTE will differ between
    // a UTF-8 and a UTF-16 encoding, and a code unit above 127 is exactly that question. Grapheme
    // boundaries are irrelevant here, which is why `Intl.Segmenter` would be the wrong tool.
    const hasNonAscii = SHA256_VECTORS.some(([input]) => {
      for (let i = 0; i < input.length; i += 1) if (input.charCodeAt(i) > 127) return true;
      return false;
    });
    expect(hasNonAscii).toBe(true);
  });
});

describe('canonical form is stable under formatting', () => {
  it('ignores key order', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it('ignores nesting order at every depth', () => {
    const one = { outer: { z: 1, a: { y: 2, b: 3 } } };
    const two = { outer: { a: { b: 3, y: 2 }, z: 1 } };
    expect(canonicalize(one)).toBe(canonicalize(two));
  });

  it('preserves array order, because array order is data', () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it('emits no whitespace', () => {
    expect(canonicalize({ a: 1, b: [1, 2] })).not.toMatch(/\s/u);
  });

  it('distinguishes null from a missing key', () => {
    expect(canonicalize({ a: null })).not.toBe(canonicalize({}));
  });

  it('normalises negative zero, which JSON cannot represent distinctly anyway', () => {
    expect(canonicalize({ a: -0 })).toBe('{"a":0}');
  });
});

describe('canonical form refuses what it cannot hash consistently', () => {
  it('rejects undefined rather than dropping the key', () => {
    // Dropping it would make an absent field and a present-but-undefined one hash the same,
    // which is the exact ambiguity FR-21's `unknowns` mechanism exists to remove.
    expect(() => canonicalize({ a: undefined })).toThrow(CanonicalError);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => canonicalize({ a: Number.NaN })).toThrow(CanonicalError);
    expect(() => canonicalize({ a: Number.POSITIVE_INFINITY })).toThrow(CanonicalError);
  });

  it('rejects a magnitude where ECMAScript and RFC 8785 disagree', () => {
    expect(() => canonicalize({ a: 1e21 })).toThrow(/outside the range/u);
    expect(() => canonicalize({ a: 1e-7 })).toThrow(/outside the range/u);
  });

  it('accepts the range corpus values actually occupy', () => {
    for (const n of [0, 1, 0.1284, 0.000001, 1908, 0.9, 1e20])
      expect(() => canonicalize({ a: n })).not.toThrow();
  });

  it('rejects a function, which would otherwise vanish silently', () => {
    expect(() => canonicalize({ a: () => 1 })).toThrow(CanonicalError);
  });
});

describe('properties', () => {
  /**
   * Numbers in the range a corpus record actually occupies.
   *
   * `fc.double` reaches subnormals — 5e-324 — and `canonicalize` rejects those deliberately,
   * because ECMAScript and RFC 8785 disagree on how to serialise them. The first version of
   * this generator did not say so and failed on its own out-of-domain input; the domain is
   * narrowed here rather than the guard being loosened, since a tristimulus value, a weight,
   * a rank and a year are all comfortably inside it. The rejection itself is asserted above.
   */
  const corpusNumber = fc
    .double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true })
    .map((n) => (Math.abs(n) < 1e-6 ? 0 : n));

  const jsonValue = fc.letrec<{ value: unknown }>((tie) => ({
    value: fc.oneof(
      { depthSize: 'small' },
      fc.constant(null),
      fc.boolean(),
      corpusNumber,
      fc.string(),
      fc.array(tie('value'), { maxLength: 4 }),
      fc.dictionary(fc.string({ minLength: 1 }), tie('value'), { maxKeys: 4 }),
    ),
  })).value;

  it('is invariant under key permutation', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string({ minLength: 1 }), fc.integer()), (o) => {
        const shuffled = Object.fromEntries(Object.entries(o).reverse());
        expect(canonicalize(shuffled)).toBe(canonicalize(o));
      }),
      { numRuns: 500 },
    );
  });

  it('round-trips: parsing the canonical form and re-canonicalising is a fixed point', () => {
    fc.assert(
      fc.property(jsonValue, (v) => {
        const once = canonicalize(v);
        expect(canonicalize(JSON.parse(once))).toBe(once);
      }),
      { numRuns: 500 },
    );
  });

  it('is deterministic across repeated runs', () => {
    fc.assert(
      fc.property(jsonValue, (v) => {
        expect(entryDigest(v, sha256)).toBe(entryDigest(v, sha256));
      }),
      { numRuns: 300 },
    );
  });

  it('changes when any single value changes', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (a, b) => {
        fc.pre(a !== b);
        expect(canonicalize({ k: a })).not.toBe(canonicalize({ k: b }));
      }),
      { numRuns: 500 },
    );
  });
});

describe('the root digest', () => {
  const entries = [
    ['fixture-a', 'aa'],
    ['fixture-b', 'bb'],
    ['fixture-c', 'cc'],
  ] as const;

  it('does not depend on the order the files were visited in', () => {
    const forward = rootDigest(entries, sha256);
    const reversed = rootDigest([...entries].reverse(), sha256);
    expect(forward).toBe(reversed);
  });

  it('changes when any entry digest changes', () => {
    const changed = rootDigest(
      [
        ['fixture-a', 'aa'],
        ['fixture-b', 'bX'],
        ['fixture-c', 'cc'],
      ],
      sha256,
    );
    expect(changed).not.toBe(rootDigest(entries, sha256));
  });

  it('changes when an entry is removed', () => {
    expect(rootDigest(entries.slice(0, 2), sha256)).not.toBe(rootDigest(entries, sha256));
  });

  it('is domain-separated from a bare digest of the same text', () => {
    expect(rootDigest([], sha256)).not.toBe(entryDigest([], sha256));
  });

  it('refuses a duplicate slug rather than digesting an ill-defined set', () => {
    expect(() =>
      rootDigest(
        [
          ['fixture-a', 'aa'],
          ['fixture-a', 'bb'],
        ],
        sha256,
      ),
    ).toThrow(DigestError);
  });

  it('cannot be confused by shifting the slug/digest boundary', () => {
    // The separator is NUL, which neither a slug nor hex can contain. Without a separator
    // that both alphabets exclude, ("ab", "cd") and ("a", "bcd") would serialise identically.
    expect(rootDigest([['fixture-ab', 'cd']], sha256)).not.toBe(
      rootDigest([['fixture-a', 'bcd']], sha256),
    );
  });
});
