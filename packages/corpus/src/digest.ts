/**
 * Corpus checksums: what is hashed, at what granularity, and with which primitive.
 *
 * ## Two levels, for two different jobs
 *
 * - **Per entry** — so a mismatch can *name the entry*. A single version-level digest turns a
 *   SEV1 into a manhunt across two hundred files.
 * - **Per version (root)** — the value that goes in the ledger, in every cache key, and behind
 *   `ReproducibilityEnvelope.corpus` (E-006). It is domain-separated and order-independent, so
 *   the same set of entries in any order gives the same root.
 *
 * ## Why the hasher is injected
 *
 * Nothing in `packages/corpus/src` may import `node:crypto` — this package is imported by the
 * colour engine (F-013) and NFR-3 forbids platform APIs there. The alternative to injection is
 * a hand-written SHA-256, which would be homegrown crypto in a colour product for no benefit.
 *
 * So callers pass one. `scripts/verify-content.mjs` and, later, `apps/api` pass
 * `createHash('sha256')`. `assertSha256` exists so the injected function is *checked* against
 * published test vectors rather than trusted to be what it claims.
 *
 * ## What a checksum here does and does not defend against
 *
 * It catches any edit to a published entry, a reformat that changed a value, a restored
 * backup, and a swapped file. It does **not** catch an editor who changes an entry *and*
 * updates the ledger in the same commit — that is a two-file diff caught by review, and in
 * production by the audit-logged admin publish path (F-061). Saying so here is the point:
 * "immutable" must not imply more than it delivers (ADR-0046).
 */

import { canonicalize } from './canonical.js';

/** A hash over a UTF-8 encoded string, returned as lowercase hex. */
export type DigestFn = (canonical: string) => string;

/** Domain separator. Two different structures must never collide by looking alike. */
export const ROOT_DOMAIN = 'irodora-corpus-v1';

/**
 * Separates a slug from its digest in the root pre-image.
 *
 * NUL, because `SLUG_PATTERN` and lowercase hex both exclude it — so no two different sets of
 * (slug, digest) pairs can serialise to the same string by shifting the boundary between them.
 * Built with `fromCharCode` rather than written literally, so the source file stays plain text:
 * a NUL byte in a `.ts` file makes git call it binary and stops showing the diff.
 */
const FIELD_SEPARATOR = String.fromCharCode(0);

/**
 * FIPS 180-4 published SHA-256 test vectors.
 *
 * We are not implementing SHA-256; we are proving the thing that was injected *is* SHA-256.
 * An injected digest that is FNV-1a, or a truncated hash, or a stub returning a constant,
 * passes every other test in this package and fails here.
 */
export const SHA256_VECTORS: readonly (readonly [input: string, expected: string])[] = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
  // Non-ASCII, so a hasher that encodes UTF-16 rather than UTF-8 is caught. NOT a FIPS
  // vector — computed with node:crypto over the UTF-8 bytes of 藍鼠 — and labelled as such,
  // because a value produced by our own toolchain is not a published one and must not be read
  // as though it were.
  ['藍鼠', '2e4f11086a73e790e15a5ad94911828c116dd78cd9bbec7da72bf043c538655a'],
];

export class DigestError extends Error {
  constructor(detail: string) {
    super(`corpus digest: ${detail}`);
    this.name = 'DigestError';
  }
}

/**
 * Check an injected hasher against the published vectors before trusting it.
 *
 * Called by the gate and by `publishVersion`, not only by a test — a hasher swapped at a call
 * site would otherwise be checked nowhere the build can see.
 */
export function assertSha256(digestOf: DigestFn): void {
  for (const [input, expected] of SHA256_VECTORS) {
    const actual = digestOf(input);
    if (actual !== expected)
      throw new DigestError(
        `the injected hash function is not SHA-256. For input ${JSON.stringify(input)} it ` +
          `returned "${actual}"; the published value is "${expected}". A corpus checksum is a ` +
          'tamper control whose mismatch is a SEV1 — it cannot rest on an unverified primitive.',
      );
  }
}

/** The digest of one record — an entry or a palette. */
export function entryDigest(record: unknown, digestOf: DigestFn): string {
  return digestOf(canonicalize(record));
}

/**
 * The root digest of a set of records.
 *
 * Order-independent by construction: the lines are sorted, so two publishes that visited the
 * files in a different order produce the same root.
 */
export function rootDigest(
  entries: readonly (readonly [slug: string, digest: string])[],
  digestOf: DigestFn,
): string {
  const seen = new Set<string>();
  for (const [slug] of entries) {
    if (seen.has(slug))
      throw new DigestError(
        `"${slug}" appears twice. A root digest over a set with a duplicate slug is not a ` +
          'digest of anything well defined.',
      );
    seen.add(slug);
  }
  const lines = entries.map(([slug, digest]) => `${slug}${FIELD_SEPARATOR}${digest}\n`).sort();
  return digestOf(`${ROOT_DOMAIN}\n${lines.join('')}`);
}
