/**
 * The surface the e2e suite exercises — the real server, plus fixture routes.
 *
 * ## Why fixture routes, and why they cannot become production routes
 *
 * F-015 ships the machinery; **F-016 ships the domain routes.** So an e2e suite over the shipped
 * route table alone would exercise two health endpoints and nothing else: the error envelope,
 * idempotency, pagination and rate limiting would all be green over a surface that never invokes
 * them. That is the same failing-open shape F-011's content gate had, and it gets the same
 * answer — a fixture, structurally unable to be mistaken for the real thing:
 *
 * - **It lives in `e2e/`**, which `tsconfig.build.json` does not include. These routes cannot be
 *   compiled into `dist`, so they cannot be served by the process `main.ts` starts.
 * - **Nothing in `src/` imports this file**, and the suite asserts it: a server built by
 *   `buildServer` alone carries the health routes and nothing more.
 * - **The generated `openapi.json` does not contain them**, which the suite also asserts. If a
 *   fixture route ever reached the published contract, the document would say so.
 *
 * Every fixture route is registered through the same `route()` wrapper and served by the same
 * hooks as a real one. That is the point: what is being tested is the machinery, and the routes
 * are only something for it to act on.
 */

import { pageParamsSchema, paginatedSchema } from '@irodora/contracts';
import { InMemoryCache, InMemoryDatabase } from '@irodora/ports';
import type { CachePort, DatabasePort } from '@irodora/ports';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { parsePageParams } from '../src/http/pagination.js';
import { assertRoutesDeclared, route } from '../src/http/route.js';
import { buildServer } from '../src/server.js';

/**
 * A string that must never appear in a response body.
 *
 * The decoy for *"no internal detail is ever serialised to a client"*. Distinctive enough that
 * finding it anywhere in a response is unambiguous, and it is thrown as a **plain `Error`** —
 * the case `mapError` refuses to read the message of.
 */
export const LEAKY_SECRET = 'postgres://irodora:hunter2@db.internal:5432/irodora';

const okSchema = z.object({ ok: z.literal(true), echoed: z.number() });
const itemSchema = z.object({ id: z.string(), name: z.string() });
const listSchema = paginatedSchema(itemSchema);

export interface FixtureSurface {
  readonly app: FastifyInstance;
  readonly cache: CachePort;
  /** How many times the mutating handler actually ran — the only honest test of a replay. */
  readonly creations: () => number;
}

export interface SurfaceOptions {
  readonly cache?: CachePort;
  readonly database?: DatabasePort;
}

/** A database that is reachable, or not, on demand. `/readyz` is the only thing that asks. */
export function stubDatabase(reachable: boolean): DatabasePort {
  const inner = new InMemoryDatabase();
  return {
    ping: () => Promise.resolve(reachable),
    withAdvisoryLock: inner.withAdvisoryLock.bind(inner),
    close: () => Promise.resolve(),
  };
}

export function buildFixtureSurface(options: SurfaceOptions = {}): FixtureSurface {
  const cache = options.cache ?? new InMemoryCache();
  const { app } = buildServer({
    database: options.database ?? new InMemoryDatabase(),
    cache,
    serviceName: 'irodora-api-e2e',
    logLevel: 'silent',
  });

  let creations = 0;

  route(app, {
    method: 'GET',
    url: '/v1/fixture/echo',
    schema: { query: z.object({ n: z.int() }), response: { 200: okSchema } },
    handler: (request) => ({ ok: true as const, echoed: (request.query as { n: number }).n }),
  });

  route(app, {
    method: 'GET',
    url: '/v1/fixture/boom',
    schema: { response: { 200: okSchema } },
    handler: () => {
      // A plain Error, deliberately. An ApiError would be shown; this must not be.
      throw new Error(`connection refused: ${LEAKY_SECRET}`);
    },
  });

  route(app, {
    method: 'GET',
    url: '/v1/fixture/list',
    schema: { query: pageParamsSchema, response: { 200: listSchema } },
    handler: (request) => {
      // AJV admitted the request; Zod produces the values the handler was promised. Both, for
      // the reason `pagination.ts` spells out — AJV does not apply `.default()`.
      const page = parsePageParams(request.query);
      return {
        data: Array.from({ length: Math.min(page.limit, 3) }, (_, i) => ({
          id: `item-${String(i)}`,
          name: `Item ${String(i)}`,
        })),
        page: { nextCursor: null, hasMore: false },
      };
    },
  });

  route(app, {
    method: 'POST',
    url: '/v1/fixture/items',
    schema: { body: z.object({ name: z.string().min(1) }), response: { 201: itemSchema } },
    handler: (request, reply) => {
      creations += 1;
      const body = request.body as { name: string };
      return reply.code(201).send({ id: `created-${String(creations)}`, name: body.name });
    },
  });

  route(app, {
    method: 'GET',
    url: '/v1/fixture/colors/:slug',
    schema: {
      params: z.object({ slug: z.string().min(2) }),
      response: { 200: z.object({ slug: z.string() }) },
    },
    handler: (request) => ({ slug: (request.params as { slug: string }).slug }),
  });

  // Over the fixture table as well as the real one — the assertion is about the whole app, and
  // running it here is what proves the wrapper's boot check is not specific to `buildServer`.
  assertRoutesDeclared(app);

  return { app, cache, creations: () => creations };
}
