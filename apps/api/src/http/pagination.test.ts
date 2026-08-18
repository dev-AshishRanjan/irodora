/**
 * Cursor pagination and the hard limit — acceptance criterion 5.
 *
 * The test that carries this file is the one proving **AJV alone is not enough**. A request with
 * no `limit` passes AJV against a schema that declares `default: 50`, and reaches the handler
 * with `limit` undefined — because applying a default would mean letting a validator mutate the
 * request. That gap is invisible until a handler does arithmetic on `undefined`, so it is pinned
 * here in both directions: AJV admits it, and `parsePageParams` is what supplies the promised
 * value.
 */

import {
  PAGE_LIMIT_DEFAULT,
  PAGE_LIMIT_MAX,
  pageParamsSchema,
  toJsonSchema,
} from '@irodora/contracts';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from './errors.js';
import { parsePageParams } from './pagination.js';
import { route } from './route.js';
import { useContractValidation } from './validation.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('the hard limit', () => {
  it('is a number, not a preference', () => {
    expect(PAGE_LIMIT_MAX).toBe(100);
    expect(PAGE_LIMIT_DEFAULT).toBe(50);
  });

  it('rejects a client asking for more than the ceiling', () => {
    expect(() => parsePageParams({ limit: 10_000 })).toThrow(ApiError);
    expect(() => parsePageParams({ limit: PAGE_LIMIT_MAX + 1 })).toThrow(/between 1 and 100/u);
  });

  it('accepts exactly the ceiling', () => {
    expect(parsePageParams({ limit: PAGE_LIMIT_MAX }).limit).toBe(PAGE_LIMIT_MAX);
  });

  it('rejects zero, a negative and a fraction', () => {
    for (const limit of [0, -1, 2.5]) expect(() => parsePageParams({ limit })).toThrow(ApiError);
  });

  it('maps an over-limit request to 422, not 400', () => {
    // The request is well-formed and semantically invalid, which is what 422 means in this
    // contract. A 400 would tell a client its JSON was malformed.
    try {
      parsePageParams({ limit: 10_000 });
      throw new Error('expected a rejection');
    } catch (error) {
      expect((error as ApiError).status).toBe(422);
    }
  });
});

describe('the seam AJV cannot close', () => {
  it('the published schema DOES declare the default', () => {
    // If this ever stops being true, the gap below closes for a different reason and the
    // reasoning in `pagination.ts` needs revisiting.
    const json = toJsonSchema(pageParamsSchema, 'input') as unknown as {
      properties: { limit: { default?: number } };
    };
    expect(json.properties.limit.default).toBe(PAGE_LIMIT_DEFAULT);
  });

  it('AJV admits a request with no limit and does NOT fill it in', async () => {
    // The whole point. Validation passes; the handler receives nothing. Asserted through a real
    // route rather than by reasoning about AJV's options, because the claim is about what a
    // handler actually gets.
    app = Fastify({ logger: false });
    useContractValidation(app);

    let seen: unknown;
    route(app, {
      method: 'GET',
      url: '/v1/list',
      schema: {
        query: pageParamsSchema,
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
      handler: (request) => {
        seen = request.query;
        return { ok: true };
      },
    });

    const response = await app.inject({ method: 'GET', url: '/v1/list' });
    expect(response.statusCode).toBe(200);
    expect((seen as { limit?: number }).limit).toBeUndefined();
  });

  it('parsePageParams is what supplies the promised value', () => {
    expect(parsePageParams({}).limit).toBe(PAGE_LIMIT_DEFAULT);
  });

  it('and the brand, which AJV also cannot produce', () => {
    // `cursor` is branded so a caller cannot construct one. AJV sees a string; only the Zod
    // parse produces the `Cursor` type that brand exists for.
    const parsed = parsePageParams({ cursor: 'opaque-cursor-value' });
    expect(parsed.cursor).toBe('opaque-cursor-value');
  });
});

describe('a bad cursor gets its own code', () => {
  it('is invalid_cursor, not validation_failed', () => {
    // A client told `validation_failed` for a stale cursor retries the same cursor. Told
    // `invalid_cursor`, it restarts the scan — which is the only thing that recovers.
    try {
      parsePageParams({ cursor: '' });
      throw new Error('expected a rejection');
    } catch (error) {
      expect((error as ApiError).code).toBe('invalid_cursor');
      expect((error as ApiError).status).toBe(400);
    }
  });

  it('says what to do about it', () => {
    expect(() => parsePageParams({ cursor: '' })).toThrow(/Start the scan again without a cursor/u);
  });

  it('the decoy — a bad LIMIT is still validation_failed, so the branch discriminates', () => {
    // Without this, `invalid_cursor` could be what every failure returns
    // [[a-decoy-that-is-not-broken-proves-nothing]].
    try {
      parsePageParams({ limit: 10_000 });
      throw new Error('expected a rejection');
    } catch (error) {
      expect((error as ApiError).code).toBe('validation_failed');
    }
  });

  it('rejects a cursor beyond the stored maximum', () => {
    expect(() => parsePageParams({ cursor: 'x'.repeat(2049) })).toThrow(/cursor/iu);
  });
});

describe('what is deliberately not built', () => {
  it('cursors are opaque but NOT signed, and that is F-016s obligation', () => {
    // `contracts/pagination.ts` says "opaque and signed". Opaque is delivered — the brand stops
    // a caller constructing one. Signed is not, because nothing ISSUES a cursor until F-016
    // builds the catalog, and signing a value nothing creates would be a mechanism before its
    // data for the fourth time in this branch.
    //
    // Asserted so the gap is a fact the suite knows rather than a comment: any non-empty string
    // within bounds is accepted today.
    expect(parsePageParams({ cursor: 'not-actually-signed' }).cursor).toBe('not-actually-signed');
  });
});
