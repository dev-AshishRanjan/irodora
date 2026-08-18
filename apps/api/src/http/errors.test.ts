/**
 * The error mapper — acceptance criterion 3, "no internal detail ever serialised to a client".
 *
 * The leak tests are the ones that matter. `errorResponseSchema` cannot enforce this (a schema
 * cannot tell a helpful sentence from a stack trace), so the mapper is the mechanism — and a
 * mechanism nobody has watched fail is a comment.
 */

import { ERROR_CODES_V1, errorResponseSchema, requestIdSchema } from '@irodora/contracts';
import { describe, expect, it } from 'vitest';
import { z, ZodError } from 'zod';
import { ApiError, INTERNAL_ERROR_MESSAGE, mapError, validationDetails } from './errors.js';

// Branded, because `requestId` is a RequestId on the wire (F-002). Parsing here rather than
// casting keeps the test honest about what a caller must actually do.
const REQUEST_ID = requestIdSchema.parse('01JD3Z9Q7K8X4M2N6P5R3T1V0W');

/** A string no legitimate response could contain, so finding it proves a leak. */
const SECRET = 'postgres://irodora:hunter2@db.internal:5432/irodora';

describe('an ApiError is the only error whose message is shown', () => {
  it('serialises its code, message and mapped status', () => {
    const mapped = mapError(new ApiError('not_found', 'No colour with that slug.'), REQUEST_ID);
    expect(mapped.status).toBe(404);
    expect(mapped.body.error.code).toBe('not_found');
    expect(mapped.body.error.message).toBe('No colour with that slug.');
    expect(mapped.body.error.requestId).toBe(REQUEST_ID);
  });

  it('carries optional details when given', () => {
    const mapped = mapError(
      new ApiError('conflict', 'Version moved.', { expected: 3 }),
      REQUEST_ID,
    );
    expect(mapped.body.error.details).toEqual({ expected: 3 });
  });

  it('omits `details` entirely when absent rather than sending null', () => {
    // `exactOptionalPropertyTypes` is on, and a null where the schema says "absent" is a
    // contract break that only shows up in a consumer.
    const mapped = mapError(new ApiError('not_found', 'Gone.'), REQUEST_ID);
    expect('details' in mapped.body.error).toBe(false);
  });

  it('maps every code in the closed enum to a status, with no gaps', () => {
    for (const code of ERROR_CODES_V1) {
      const mapped = mapError(new ApiError(code, 'x'), REQUEST_ID);
      expect(typeof mapped.status).toBe('number');
      expect(errorResponseSchema.safeParse(mapped.body).success).toBe(true);
    }
  });
});

describe('nothing else contributes a message — the leak tests', () => {
  it('a raw Error carrying a connection string leaks NOTHING', () => {
    const mapped = mapError(new Error(`connect failed: ${SECRET}`), REQUEST_ID);
    expect(mapped.status).toBe(500);
    expect(mapped.body.error.code).toBe('internal_error');
    expect(mapped.body.error.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(JSON.stringify(mapped.body)).not.toContain(SECRET);
    expect(JSON.stringify(mapped.body)).not.toContain('hunter2');
  });

  it('a stack trace never reaches the body', () => {
    const error = new Error('boom');
    const mapped = mapError(error, REQUEST_ID);
    expect(JSON.stringify(mapped.body)).not.toContain('errors.test');
    expect(JSON.stringify(mapped.body)).not.toContain('at ');
  });

  it('a nested `cause` is not read either', () => {
    const mapped = mapError(new Error('outer', { cause: new Error(SECRET) }), REQUEST_ID);
    expect(JSON.stringify(mapped.body)).not.toContain(SECRET);
  });

  it('a thrown string, a thrown object and null are all handled', () => {
    // The mapper runs where the value genuinely can be anything. A non-total mapper would throw
    // inside the error handler, which is the worst possible place to throw.
    for (const thrown of [SECRET, { secret: SECRET }, null, undefined, 42]) {
      const mapped = mapError(thrown, REQUEST_ID);
      expect(mapped.status).toBe(500);
      expect(JSON.stringify(mapped.body)).not.toContain(SECRET);
    }
  });

  it('still returns the request id, so support can find what the client cannot see', () => {
    const mapped = mapError(new Error(SECRET), REQUEST_ID);
    expect(mapped.body.error.requestId).toBe(REQUEST_ID);
  });

  it('hands the ORIGINAL error back for logging, not the sanitised body', () => {
    // The other half of the bargain: the client sees nothing, the log sees everything.
    const error = new Error(SECRET);
    expect(mapError(error, REQUEST_ID).logged).toBe(error);
  });

  it('the decoy — the secret IS present in the error that was passed in', () => {
    // Without this, every assertion above could be passing because SECRET never existed
    // [[a-decoy-that-is-not-broken-proves-nothing]].
    const error = new Error(`connect failed: ${SECRET}`);
    expect(error.message).toContain(SECRET);
    expect(JSON.stringify(mapError(error, REQUEST_ID).body)).not.toContain(SECRET);
  });
});

describe('validation reports paths, never values', () => {
  const schema = z.object({ email: z.email(), age: z.number().int().min(18) });

  it('names the failing field', () => {
    const result = schema.safeParse({ email: 'not-an-email', age: 30 });
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = validationDetails(result.error)['fields'] as Record<string, string>;
    expect(Object.keys(fields)).toEqual(['email']);
    expect(typeof fields['email']).toBe('string');
  });

  it('never echoes the offending input', () => {
    // A 422 that echoes the body puts user data in the network tab and every proxy between.
    const typed = 'correct-horse-battery-staple';
    const result = schema.safeParse({ email: typed, age: 30 });
    if (result.success) throw new Error('expected a validation failure');
    expect(JSON.stringify(validationDetails(result.error))).not.toContain(typed);
  });

  it('reports a whole-object refinement as (root) rather than an empty key', () => {
    const refined = z.object({ a: z.number() }).refine((v) => v.a > 0, 'must be positive');
    const result = refined.safeParse({ a: -1 });
    if (result.success) throw new Error('expected a validation failure');
    expect(Object.keys(validationDetails(result.error)['fields'] as object)).toContain('(root)');
  });

  it('maps a ZodError thrown into the handler to 422', () => {
    const result = schema.safeParse({ email: 'x', age: 1 });
    if (result.success) throw new Error('expected a validation failure');
    const mapped = mapError(new ZodError(result.error.issues), REQUEST_ID);
    expect(mapped.status).toBe(422);
    expect(mapped.body.error.code).toBe('validation_failed');
  });
});

describe('every mapped body satisfies the wire contract', () => {
  it('parses as errorResponseSchema for each branch', () => {
    for (const thrown of [
      new ApiError('rate_limited', 'Slow down.'),
      new Error('boom'),
      'a thrown string',
    ]) {
      const mapped = mapError(thrown, REQUEST_ID);
      expect(errorResponseSchema.safeParse(mapped.body).success).toBe(true);
    }
  });
});
