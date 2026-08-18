/**
 * Route declaration — acceptance criterion 2.
 *
 * There are no domain routes until F-016, so a check that walks the route table today finds
 * nothing to complain about and passes for a reason unrelated to the rule. That is F-011's
 * gate-before-its-data problem, third repeat, and it gets the same answer: **decoy routes that
 * omit a schema and are watched to be rejected.** Without them, everything in `route.ts` is a
 * comment.
 */

import { errorResponseSchema } from '@irodora/contracts';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  assertRoutesDeclared,
  isMutating,
  MUTATING_METHODS,
  registeredRoutes,
  route,
  RouteDeclarationError,
  ROUTE_METHODS,
} from './route.js';
import { useContractValidation } from './validation.js';

let app: FastifyInstance | undefined;

/** A fresh instance per test: the registry is per-app so decoys cannot leak between them. */
function newApp(): FastifyInstance {
  app = Fastify({ logger: false });
  useContractValidation(app);
  return app;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const ok = z.object({ ok: z.literal(true) });

describe('a route cannot be registered without a success schema', () => {
  it('the decoy — no 2xx at all is rejected, and the message says why it matters', () => {
    expect(() => {
      route(newApp(), {
        method: 'GET',
        url: '/v1/decoy',
        schema: { response: { 404: errorResponseSchema } },
        handler: () => ({ ok: true }),
      });
    }).toThrow(RouteDeclarationError);

    expect(() => {
      route(newApp(), {
        method: 'GET',
        url: '/v1/decoy',
        schema: { response: { 404: errorResponseSchema } },
        handler: () => ({ ok: true }),
      });
    }).toThrow(/describes a route that can only fail/u);
  });

  it('accepts one that declares a 2xx', () => {
    const instance = newApp();
    expect(() => {
      route(instance, {
        method: 'GET',
        url: '/v1/fine',
        schema: { response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    }).not.toThrow();
    expect(registeredRoutes(instance)).toHaveLength(1);
  });

  it('rejects a response key that is not an HTTP status', () => {
    expect(() => {
      route(newApp(), {
        method: 'GET',
        url: '/v1/bad-status',
        schema: { response: { 99: ok } },
        handler: () => ({ ok: true }),
      });
    }).toThrow(/must be HTTP statuses/u);
  });
});

describe('the framework adds what the framework can produce', () => {
  it('adds 500 to every route, so the document is complete without boilerplate', () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/thing',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    expect(registeredRoutes(instance)[0]?.statuses).toEqual([200, 500]);
  });

  it('adds 422 when there is anything to validate, and not otherwise', () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/with-query',
      schema: { query: z.object({ q: z.string() }), response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    route(instance, {
      method: 'GET',
      url: '/v1/no-input',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });

    const [withQuery, noInput] = registeredRoutes(instance);
    expect(withQuery?.statuses).toEqual([200, 422, 500]);
    expect(noInput?.statuses).toEqual([200, 500]);
  });

  it('never overwrites a status the author declared', () => {
    const instance = newApp();
    const custom = z.object({ custom: z.literal(true) });
    route(instance, {
      method: 'GET',
      url: '/v1/custom-500',
      schema: { response: { 200: ok, 500: custom } },
      handler: () => ({ ok: true }),
    });
    expect(registeredRoutes(instance)[0]?.schema.response[500]).toBe(custom);
  });
});

describe('mutating routes', () => {
  it('the decoy — a POST with no body and no stated exemption is rejected', () => {
    expect(() => {
      route(newApp(), {
        method: 'POST',
        url: '/v1/mutate',
        schema: { response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    }).toThrow(/an unexplained exemption is one nobody can evaluate later/u);
  });

  it('accepts one that states why it takes no body', () => {
    const instance = newApp();
    expect(() => {
      route(instance, {
        method: 'POST',
        url: '/v1/revoke',
        schema: { response: { 200: ok } },
        handler: () => ({ ok: true }),
        idempotencyExemptBecause: 'revocation is idempotent by construction: the token is gone',
      });
    }).not.toThrow();
    expect(registeredRoutes(instance)[0]?.requiresIdempotencyKey).toBe(false);
  });

  it('marks a normal mutation as needing an idempotency key', () => {
    const instance = newApp();
    route(instance, {
      method: 'POST',
      url: '/v1/create',
      schema: { body: z.object({ name: z.string() }), response: { 201: ok } },
      handler: () => ({ ok: true }),
    });
    expect(registeredRoutes(instance)[0]?.requiresIdempotencyKey).toBe(true);
  });

  it('classifies every method exactly once', () => {
    expect(ROUTE_METHODS.filter(isMutating)).toEqual([...MUTATING_METHODS]);
    expect(ROUTE_METHODS.filter((m) => !isMutating(m))).toEqual(['GET']);
  });
});

describe('the boot assertion catches what the type system cannot', () => {
  it('passes over a well-declared table and REPORTS THE COUNT', () => {
    // The count is the point. "All good" over zero routes has said nothing, and printing it is
    // what stops a green boot being read as coverage while F-016 is still to come.
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/a',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    expect(assertRoutesDeclared(instance)).toBe(1);
  });

  it('returns 0 over an empty table rather than pretending to have checked something', () => {
    expect(assertRoutesDeclared(newApp())).toBe(0);
  });

  it('the decoy — a route smuggled into the registry without a 500 is caught at boot', () => {
    // This is the path the type system cannot see: a plugin building a route object
    // dynamically. Simulated by registering a valid route and then corrupting the record, which
    // is the only way to reach the state a dynamic registration could produce.
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/dynamic',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });

    const smuggled = registeredRoutes(instance) as unknown as { statuses: number[] }[];
    smuggled[0]!.statuses = [200];

    expect(() => {
      assertRoutesDeclared(instance);
    }).toThrow(/has no 500 response schema/u);
  });

  it('the decoy — a route with only an error status is caught at boot too', () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/dynamic',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    const smuggled = registeredRoutes(instance) as unknown as { statuses: number[] }[];
    smuggled[0]!.statuses = [404, 500];

    expect(() => {
      assertRoutesDeclared(instance);
    }).toThrow(/has no 2xx response schema/u);
  });

  it('names every offending route rather than stopping at the first', () => {
    const instance = newApp();
    for (const url of ['/v1/a', '/v1/b'])
      route(instance, {
        method: 'GET',
        url,
        schema: { response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    const smuggled = registeredRoutes(instance) as unknown as { statuses: number[] }[];
    for (const record of smuggled) record.statuses = [200];

    expect(() => {
      assertRoutesDeclared(instance);
    }).toThrow(/2 route\(s\) are missing/u);
  });
});

describe('the registry is per-app', () => {
  it('does not leak between instances', () => {
    // A module-level array would let one test's decoy leak into another's assertions, which is
    // exactly how a suite passes for the wrong reason.
    const one = Fastify({ logger: false });
    const two = Fastify({ logger: false });
    route(one, {
      method: 'GET',
      url: '/v1/only-on-one',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    expect(registeredRoutes(one)).toHaveLength(1);
    expect(registeredRoutes(two)).toHaveLength(0);
  });
});

describe('the route actually serves', () => {
  it('validates the query and returns the declared body', async () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/echo',
      schema: { query: z.object({ n: z.number().int() }), response: { 200: ok } },
      handler: () => ({ ok: true }),
    });

    const good = await instance.inject({ method: 'GET', url: '/v1/echo?n=3' });
    expect(good.statusCode).toBe(200);
    expect(good.json()).toEqual({ ok: true });
  });

  it('rejects a query value that is not the declared type even after coercion', async () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/echo',
      schema: { query: z.object({ n: z.number().int() }), response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    expect((await instance.inject({ method: 'GET', url: '/v1/echo?n=abc' })).statusCode).toBe(400);
  });

  it('coerces a QUERY string to a number but never a BODY one', async () => {
    // The split this pins: a querystring is always strings on the wire, so refusing to coerce
    // makes numeric query parameters impossible. A JSON body CAN carry a real number, so a
    // string there is a client that is actually wrong — coercing it would hand a handler a
    // value nobody sent. The first version of `validation.ts` used one setting for both and a
    // test caught it.
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/q',
      schema: { query: z.object({ n: z.number().int() }), response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    route(instance, {
      method: 'POST',
      url: '/v1/b',
      schema: { body: z.object({ n: z.number().int() }), response: { 200: ok } },
      handler: () => ({ ok: true }),
    });

    // Same value, same declared type, opposite outcomes — deliberately.
    expect((await instance.inject({ method: 'GET', url: '/v1/q?n=3' })).statusCode).toBe(200);
    expect(
      (await instance.inject({ method: 'POST', url: '/v1/b', payload: { n: '3' } })).statusCode,
    ).toBe(400);
    expect(
      (await instance.inject({ method: 'POST', url: '/v1/b', payload: { n: 3 } })).statusCode,
    ).toBe(200);
  });
});

describe('a path parameter must be declared, by name', () => {
  // Added when the OpenAPI document was first generated — which is exactly what made the hole
  // visible. Fastify serves `/v1/x/:slug` with no `params` schema and validates nothing, so the
  // published document would have had to invent a type for an input the server never checks.

  it('the decoy — a path parameter with no params schema at all is rejected', () => {
    expect(() => {
      route(newApp(), {
        method: 'GET',
        url: '/v1/colors/:slug',
        schema: { response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    }).toThrow(/is an unvalidated input/u);
  });

  it('the decoy that matters — a params schema naming the WRONG parameter is rejected', () => {
    // The near-miss a rename produces: this type-checks, validates nothing, and would publish a
    // phantom `id` beside an undocumented `slug`.
    expect(() => {
      route(newApp(), {
        method: 'GET',
        url: '/v1/colors/:slug',
        schema: { params: z.object({ id: z.string() }), response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    }).toThrow(/path parameter\(s\) slug that the `params` schema does not name/u);
  });

  it('names every missing parameter, not just the first', () => {
    expect(() => {
      route(newApp(), {
        method: 'GET',
        url: '/v1/a/:one/b/:two',
        schema: { params: z.object({ three: z.string() }), response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    }).toThrow(/one, two/u);
  });

  it('THE CASE THAT MUST STAY GREEN — a correctly declared path parameter is accepted', () => {
    // A rule that rejects everything is indistinguishable from a rule that works.
    const instance = newApp();
    expect(() => {
      route(instance, {
        method: 'GET',
        url: '/v1/colors/:slug',
        schema: { params: z.object({ slug: z.string() }), response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    }).not.toThrow();
    expect(registeredRoutes(instance)).toHaveLength(1);
  });

  it('leaves routes with no path parameters alone', () => {
    const instance = newApp();
    expect(() => {
      route(instance, {
        method: 'GET',
        url: '/v1/colors',
        schema: { response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    }).not.toThrow();
    expect(registeredRoutes(instance)).toHaveLength(1);
  });
});

describe('the registry records what the route can actually return', () => {
  it('carries a schema for every status, including the ones the framework added', () => {
    // The OpenAPI generator reads this. Before it existed, that module would have had to guess
    // that an undeclared status must be the error envelope — a guess that is right today and
    // wrong the moment `route()` injects something else.
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/with-query',
      schema: { query: z.object({ q: z.string() }), response: { 200: ok } },
      handler: () => ({ ok: true }),
    });

    const registered = registeredRoutes(instance)[0]!;
    expect(
      Object.keys(registered.responses)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([200, 422, 500]);
    expect(registered.responses[422]).toBe(errorResponseSchema);
    expect(registered.responses[500]).toBe(errorResponseSchema);
    // And the author's own map is untouched — it is what they declared, not what we added.
    expect(Object.keys(registered.schema.response)).toEqual(['200']);
  });
});
