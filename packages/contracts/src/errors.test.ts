import { describe, expect, it } from 'vitest';

import {
  ERROR_CODES_V1,
  ERROR_CODE_STATUS,
  ERROR_HTTP_STATUSES,
  errorCodeSchema,
  errorResponseSchema,
  type ErrorCode,
} from './errors.js';

/**
 * What `v1` promised, written out independently of the implementation.
 *
 * This looks like duplication and it is not. `ERROR_CODES_V1` is what the code says today;
 * this list is what we told clients `v1` would contain. The check below is that the first
 * still honours the second. Deriving this from `ERROR_CODES_V1` would make the test agree
 * with any change, including a removal — which is the one thing it exists to catch.
 *
 * **Do not DRY this away.** Add a line when a code is added. Removing a line means minting
 * `/v2` (docs/architecture/api-contract.md §9).
 */
const PROMISED_IN_V1 = [
  'bad_request',
  'validation_failed',
  'unauthorized',
  'entitlement_required',
  'not_found',
  'conflict',
  'idempotency_key_required',
  'idempotency_key_conflict',
  'invalid_cursor',
  'rate_limited',
  'colour_out_of_gamut',
  'internal_error',
  'service_unavailable',
] as const;

describe('the error-code enum is versioned', () => {
  it.each(PROMISED_IN_V1)('still contains %s', (code) => {
    expect(ERROR_CODES_V1).toContain(code);
  });

  it('has no duplicate codes', () => {
    expect(new Set(ERROR_CODES_V1).size).toBe(ERROR_CODES_V1.length);
  });
});

describe('the error-code enum is closed', () => {
  it('accepts a documented code', () => {
    expect(errorCodeSchema.safeParse('colour_out_of_gamut').success).toBe(true);
  });

  it('rejects the American spelling of our own code', () => {
    // The decoy is the mistake that will actually be made. Our codes use British spelling
    // because the whole domain vocabulary does — "colour", "colour_out_of_gamut". A handler
    // that returns `color_out_of_gamut` is a broken client, and this is the assertion that
    // makes the difference between the two strings matter.
    expect(errorCodeSchema.safeParse('color_out_of_gamut').success).toBe(false);
  });

  it('rejects a plausible code we deliberately did not mint', () => {
    // Codes are added by the feature that raises them, never in advance. Under an
    // additive-only rule they cost nothing to add later and cannot be removed once added,
    // so they are absent until something returns them.
    expect(errorCodeSchema.safeParse('quota_exceeded').success).toBe(false);
    expect(errorCodeSchema.safeParse('corpus_version_unknown').success).toBe(false);
  });

  it('rejects an arbitrary string', () => {
    expect(errorCodeSchema.safeParse('something_went_wrong').success).toBe(false);
  });
});

/**
 * The status each code is published under — pinned, for the same reason as `PROMISED_IN_V1`
 * above and written out for the same reason.
 *
 * A code's status is as client-visible as its name. Changing `validation_failed` from 422 to
 * 400 breaks every client that branches on the status, and it is a one-character edit that
 * typechecks, lints and — before this existed — passed the whole suite. Asserting only that
 * each status is *a* documented status is not enough; it has to be *the* documented one.
 */
const PUBLISHED_STATUS: Readonly<Record<ErrorCode, number>> = {
  bad_request: 400,
  validation_failed: 422,
  unauthorized: 401,
  entitlement_required: 403,
  not_found: 404,
  conflict: 409,
  idempotency_key_required: 400,
  idempotency_key_conflict: 409,
  invalid_cursor: 400,
  rate_limited: 429,
  colour_out_of_gamut: 422,
  internal_error: 500,
  service_unavailable: 503,
};

describe('every code has a status', () => {
  it.each(ERROR_CODES_V1)('%s keeps the status v1 published', (code) => {
    expect(ERROR_CODE_STATUS[code]).toBe(PUBLISHED_STATUS[code]);
  });

  it.each(ERROR_CODES_V1)('%s maps to a documented status', (code) => {
    // The compiler already forces the key to exist. What it cannot see is a status outside
    // the set the contract documents — a 418 would typecheck against `number`.
    expect(ERROR_HTTP_STATUSES).toContain(ERROR_CODE_STATUS[code]);
  });

  it('maps nothing that is not a code', () => {
    expect(Object.keys(ERROR_CODE_STATUS).sort()).toStrictEqual([...ERROR_CODES_V1].sort());
  });

  it('never answers 403 for a missing resource', () => {
    // 404 for another tenant's resource, never 403. A 403 confirms the id exists, which is
    // a free enumeration oracle (api-contract §5).
    const notFound: ErrorCode = 'not_found';
    expect(ERROR_CODE_STATUS[notFound]).toBe(404);
  });
});

describe('the error envelope', () => {
  it('accepts the documented shape', () => {
    expect(
      errorResponseSchema.safeParse({
        error: {
          code: 'colour_out_of_gamut',
          message: 'The requested colour cannot be represented in the target gamut.',
          details: { space: 'srgb', suggestion: 'Enable gamut mapping.' },
          requestId: '01H8XGJWBWBAQ4ZZ3N1PQRSTUV',
        },
      }).success,
    ).toBe(true);
  });

  it('requires a requestId, because it is the user handle into our traces', () => {
    expect(
      errorResponseSchema.safeParse({
        error: { code: 'internal_error', message: 'Something failed.' },
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown code inside a well-formed envelope', () => {
    // The envelope being valid is not enough. This is the case a client actually breaks on:
    // the response parses as JSON, has the right keys, and carries a code nothing switches on.
    expect(
      errorResponseSchema.safeParse({
        error: {
          code: 'teapot',
          message: 'I am a teapot.',
          requestId: '01H8XGJWBWBAQ4ZZ3N1PQRSTUV',
        },
      }).success,
    ).toBe(false);
  });
});
