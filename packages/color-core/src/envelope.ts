/**
 * The reproducibility envelope (FR-10): the versions that produced an answer.
 *
 * Every derived result carries `{engine, corpus, rules, profile}`, so any answer the product
 * ever gave can be replayed and got again. That is what makes "deterministic" checkable
 * rather than asserted — without the versions, a recommendation from last March is a number
 * with no way to reproduce it.
 *
 * ## Why the replay fixture contains versions that are not current
 *
 * A fixture written from today's versions passes today and keeps passing for the wrong
 * reason: it is comparing the current code to itself. The fixture therefore pins
 * **historical** envelopes — tuples that were never the running versions — so the check is
 * that old envelopes still parse, still compare, and still serialise byte-identically after
 * the code has moved on.
 */

/** The versions that produced a result. */
export interface ReproducibilityEnvelope {
  readonly engine: string;
  readonly corpus: string;
  readonly rules: string;
  /** `| undefined` for the same reason as `Provenance.capturedAt`. */
  readonly profile?: string | undefined;
}

export class EnvelopeError extends Error {
  constructor(detail: string) {
    super(`envelope: ${detail}`);
    this.name = 'EnvelopeError';
  }
}

/** `1.2.3`, and nothing looser. A version that does not sort is not a version. */
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

export function assertEnvelope(envelope: ReproducibilityEnvelope): void {
  for (const field of ['engine', 'corpus', 'rules'] as const) {
    const value = envelope[field];
    if (typeof value !== 'string' || !SEMVER.test(value))
      throw new EnvelopeError(`${field} must be a semantic version; got ${JSON.stringify(value)}`);
  }
  if (envelope.profile?.length === 0)
    throw new EnvelopeError('profile must be a non-empty string when present');
}

/**
 * The canonical serialisation. **Key order is fixed here**, not left to object insertion
 * order, because this string is compared byte-for-byte across sessions and platforms — and
 * `JSON.stringify` follows insertion order, which two code paths building the same envelope
 * can trivially disagree about.
 *
 * `profile` is omitted when absent rather than emitted as `null`, so an envelope without a
 * profile has one serialisation rather than two.
 */
export function serialiseEnvelope(envelope: ReproducibilityEnvelope): string {
  assertEnvelope(envelope);
  const ordered: Record<string, string> = {
    engine: envelope.engine,
    corpus: envelope.corpus,
    rules: envelope.rules,
  };
  if (envelope.profile !== undefined) ordered['profile'] = envelope.profile;
  return JSON.stringify(ordered);
}

/** Parse a serialised envelope back. Throws rather than returning a partial one. */
export function parseEnvelope(serialised: string): ReproducibilityEnvelope {
  let raw: unknown;
  try {
    raw = JSON.parse(serialised);
  } catch {
    throw new EnvelopeError(`not JSON: ${serialised.slice(0, 60)}`);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new EnvelopeError('expected an object');

  const record = raw as Record<string, unknown>;
  const read = (key: string): string => {
    const value = record[key];
    if (typeof value !== 'string') throw new EnvelopeError(`${key} is missing or not a string`);
    return value;
  };

  const envelope: ReproducibilityEnvelope =
    record['profile'] === undefined
      ? { engine: read('engine'), corpus: read('corpus'), rules: read('rules') }
      : {
          engine: read('engine'),
          corpus: read('corpus'),
          rules: read('rules'),
          profile: read('profile'),
        };
  assertEnvelope(envelope);
  return envelope;
}

/** Two envelopes describe the same computation. Field-wise, never by string comparison. */
export function envelopesMatch(a: ReproducibilityEnvelope, b: ReproducibilityEnvelope): boolean {
  return (
    a.engine === b.engine && a.corpus === b.corpus && a.rules === b.rules && a.profile === b.profile
  );
}
