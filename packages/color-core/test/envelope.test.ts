/**
 * The reproducibility envelope, and the replay that makes FR-10 checkable.
 *
 * **The fixture's versions are deliberately not the current ones.** A fixture written from
 * today's `CORE_VERSION` passes today because the code is being compared to itself, and it
 * stops meaning anything the moment a version bumps. These are historical tuples: the check
 * is that an answer recorded under an old engine still parses, still compares and still
 * serialises byte-identically now.
 */

import { describe, expect, it } from 'vitest';
import fixture from '../golden/envelopes.fixture.json' with { type: 'json' };
import {
  assertEnvelope,
  CORE_VERSION,
  envelopesMatch,
  EnvelopeError,
  parseEnvelope,
  serialiseEnvelope,
  type ReproducibilityEnvelope,
} from '../src/index.js';

interface Entry {
  readonly id: string;
  readonly note: string;
  readonly envelope: ReproducibilityEnvelope;
  readonly serialised: string;
}

const entries = fixture.entries as unknown as readonly Entry[];

describe('the replay fixture', () => {
  it('pins historical envelopes, not the current ones', () => {
    // The assertion that keeps this fixture honest. If every entry carried CORE_VERSION,
    // the suite would be comparing the code to itself and would go green for free.
    expect(entries.length).toBeGreaterThanOrEqual(4);
    for (const entry of entries)
      expect(entry.envelope.engine, `${entry.id} uses the CURRENT engine version`).not.toBe(
        CORE_VERSION,
      );
  });

  for (const entry of entries)
    describe(entry.id, () => {
      it('serialises byte-identically', () => {
        expect(serialiseEnvelope(entry.envelope)).toBe(entry.serialised);
      });

      it('parses back to the same envelope', () => {
        expect(parseEnvelope(entry.serialised)).toEqual(entry.envelope);
      });

      it('round-trips', () => {
        expect(serialiseEnvelope(parseEnvelope(entry.serialised))).toBe(entry.serialised);
        expect(envelopesMatch(parseEnvelope(entry.serialised), entry.envelope)).toBe(true);
      });
    });
});

describe('serialisation is canonical, not incidental', () => {
  it('fixes key order regardless of how the object was built', () => {
    // JSON.stringify follows insertion order, and two code paths building the same envelope
    // can trivially disagree about it. If that reached the wire, two identical computations
    // would produce two different envelope strings.
    const a: ReproducibilityEnvelope = { engine: '1.0.0', corpus: '2026.01.0', rules: '2026.01.0' };
    const b = {
      rules: '2026.01.0',
      corpus: '2026.01.0',
      engine: '1.0.0',
    } as ReproducibilityEnvelope;
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b)); // the decoy: the naive way differs
    expect(serialiseEnvelope(a)).toBe(serialiseEnvelope(b)); // ours does not
  });

  it('omits an absent profile rather than emitting null', () => {
    const without: ReproducibilityEnvelope = {
      engine: '1.0.0',
      corpus: '2026.01.0',
      rules: '2026.01.0',
    };
    expect(serialiseEnvelope(without)).not.toContain('profile');
    // One serialisation for "no profile", not two.
    expect(serialiseEnvelope({ ...without, profile: undefined })).toBe(serialiseEnvelope(without));
  });
});

describe('what an envelope refuses to be', () => {
  it('rejects a version that is not a version', () => {
    for (const engine of ['1.0', 'v1.0.0', 'latest', '', '1.0.0.0'])
      expect(() => {
        assertEnvelope({ engine, corpus: '2026.01.0', rules: '2026.01.0' });
      }, engine).toThrow(EnvelopeError);
    // The baseline: a real version is accepted, so the above is about the format.
    expect(() => {
      assertEnvelope({ engine: '1.0.0', corpus: '2026.01.0', rules: '2026.01.0' });
    }).not.toThrow();
  });

  it('rejects an empty profile', () => {
    expect(() => {
      assertEnvelope({ engine: '1.0.0', corpus: '2026.01.0', rules: '2026.01.0', profile: '' });
    }).toThrow(/profile/u);
  });

  it('rejects malformed input rather than returning a partial envelope', () => {
    for (const bad of ['', 'null', '[]', '{}', '{"engine":"1.0.0"}', '{"engine":1}'])
      expect(() => parseEnvelope(bad), bad).toThrow(EnvelopeError);
  });
});

describe('envelopesMatch', () => {
  const base: ReproducibilityEnvelope = {
    engine: '1.0.0',
    corpus: '2026.01.0',
    rules: '2026.01.0',
  };

  it('compares field-wise, so a formatting difference is not a mismatch', () => {
    expect(envelopesMatch(base, { ...base })).toBe(true);
  });

  it('distinguishes every field', () => {
    // Each field asserted separately: a comparison that ignored one would still pass a test
    // that only changed another.
    expect(envelopesMatch(base, { ...base, engine: '1.0.1' })).toBe(false);
    expect(envelopesMatch(base, { ...base, corpus: '2026.02.0' })).toBe(false);
    expect(envelopesMatch(base, { ...base, rules: '2026.02.0' })).toBe(false);
    expect(envelopesMatch(base, { ...base, profile: 'prof_1' })).toBe(false);
  });
});
