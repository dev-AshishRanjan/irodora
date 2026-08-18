/**
 * The generated OpenAPI document — acceptance criterion 5, and decoy 6 from the plan.
 *
 * Three separate claims, and the first is the one that carries the other two:
 *
 * 1. **The committed `apps/api/openapi.json` matches what the registry produces right now.**
 *    Read from disk, compared here. This is what makes a hand-edit fail and a route added
 *    without regenerating fail, and it runs under `pnpm test` — no build required, unlike the
 *    `--check` script, which imports from `dist`.
 * 2. **The comparison can actually fail.** Asserted against six hand-edits of a real document,
 *    with the unedited baseline asserted current before and after — the mutation-proof shape
 *    this repository uses everywhere else. A check nobody has watched go red is a comment.
 * 3. **The output is deterministic.** Two independently assembled apps serialise byte-identical.
 *    Without this, (1) is a gate that fails at random and gets switched off.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { API_VERSION } from '@irodora/contracts';
import { InMemoryCache, InMemoryDatabase } from '@irodora/ports';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { describeApi } from './describe.js';
import { registeredRoutes, route } from './http/route.js';
import { useContractValidation } from './http/validation.js';
import {
  buildOpenApiDocument,
  openApiStaleness,
  OPERATIONS_TAG,
  serialiseOpenApi,
  tagFor,
  toOpenApiPath,
  type OpenApiDocument,
} from './openapi.js';
import { buildServer } from './server.js';

const DOCUMENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'openapi.json');

let app: FastifyInstance | undefined;

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

describe('the committed document is current', () => {
  it('matches what the route registry produces', () => {
    // The check that matters. A hand-edit fails here, and so does a route added without running
    // `pnpm --filter @irodora/api generate:openapi`.
    let onDisk: string | undefined;
    try {
      onDisk = readFileSync(DOCUMENT, 'utf8');
    } catch {
      onDisk = undefined;
    }

    expect(openApiStaleness(serialiseOpenApi(describeApi()), onDisk)).toBeNull();
  });

  it('describes a non-zero number of operations', () => {
    // A document with no paths would make every check above pass for a reason unrelated to the
    // rule — the gate-before-its-data problem, which this feature has in common with the last
    // three. Until F-016 the honest number is small, and it is asserted rather than assumed.
    const paths = Object.values(describeApi().paths);
    const operations = paths.reduce((total, methods) => total + Object.keys(methods).length, 0);

    expect(paths.length).toBeGreaterThan(0);
    expect(operations).toBeGreaterThan(0);
  });
});

describe('the comparison can fail — six hand-edits, and a baseline either side', () => {
  const generated = serialiseOpenApi(describeApi());

  /** Serialise a document after `mutate` has had its way with a deep copy. */
  function edited(mutate: (document: OpenApiDocument) => void): string {
    const copy = JSON.parse(generated) as OpenApiDocument;
    mutate(copy);
    return serialiseOpenApi(copy);
  }

  const cases: readonly [name: string, edit: (d: OpenApiDocument) => void, reason: RegExp][] = [
    [
      'a response description reworded by hand',
      (d) => {
        const first = Object.values(d.paths)[0] as Record<
          string,
          { responses: Record<string, { description: string }> }
        >;
        const operation = Object.values(first)[0]!;
        Object.values(operation.responses)[0]!.description = 'Tweaked by a human.';
      },
      /differs from the generated document/u,
    ],
    [
      'a path deleted, as if a route were removed and the file left alone',
      (d) => {
        (d as { paths: Record<string, unknown> }).paths = Object.fromEntries(
          Object.entries(d.paths).slice(1),
        );
      },
      /not on disk/u,
    ],
    [
      'a path invented, describing a route the server does not serve',
      (d) => {
        (d.paths as Record<string, unknown>)['/v1/imaginary'] = { get: { responses: {} } };
      },
      /on disk but not generated/u,
    ],
    [
      'a required response status removed from an operation',
      (d) => {
        const first = Object.values(d.paths)[0] as Record<
          string,
          { responses: Record<string, unknown> }
        >;
        const operation = Object.values(first)[0]!;
        delete operation.responses['500'];
      },
      /differs from the generated document/u,
    ],
    [
      'the version bumped by hand',
      (d) => {
        (d.info as { version: string }).version = 'v2';
      },
      /outside its paths/u,
    ],
    [
      'the file corrupted rather than edited',
      () => {
        /* replaced wholesale below */
      },
      /not valid JSON/u,
    ],
  ];

  it('the baseline is current BEFORE any mutation', () => {
    expect(openApiStaleness(generated, generated)).toBeNull();
  });

  for (const [name, edit, reason] of cases)
    it(`catches ${name}`, () => {
      const tampered = name.startsWith('the file corrupted') ? '{ not json' : edited(edit);
      const staleness = openApiStaleness(generated, tampered);

      expect(staleness).not.toBeNull();
      // The REASON, not just the fact. "openapi.json is stale" sends the reader to a diff.
      expect(staleness).toMatch(reason);
    });

  it('the baseline is still current AFTER every mutation', () => {
    // The other half of the proof: the mutations above must be the DOCUMENT's fault, not a
    // comparison that reports everything as stale.
    expect(openApiStaleness(generated, generated)).toBeNull();
  });

  it('reports a missing file as its own reason rather than as a diff', () => {
    expect(openApiStaleness(generated, undefined)).toMatch(/does not exist/u);
  });
});

describe('serialisation is deterministic', () => {
  it('two independently assembled servers produce byte-identical documents', () => {
    // If this drifts, the committed-document check becomes a gate that fails at random — and a
    // gate that fails at random is a gate somebody switches off.
    const build = (): string => {
      const { app: instance } = buildServer({
        database: new InMemoryDatabase(),
        cache: new InMemoryCache(),
        serviceName: 'irodora-api',
        logLevel: 'silent',
        now: () => 0,
      });
      return serialiseOpenApi(buildOpenApiDocument(instance));
    };

    expect(build()).toBe(build());
  });

  it('ends with exactly one newline, so the file is not a diff magnet', () => {
    const text = serialiseOpenApi(describeApi());
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });
});

describe('the document describes the routes rather than a list somebody maintains', () => {
  it('gains an operation when a route is registered', () => {
    const instance = newApp();
    const before = Object.keys(buildOpenApiDocument(instance).paths).length;

    route(instance, {
      method: 'GET',
      url: '/v1/things',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });

    const document = buildOpenApiDocument(instance);
    expect(Object.keys(document.paths).length).toBe(before + 1);
    expect(document.paths['/v1/things']).toHaveProperty('get');
  });

  it('has exactly one operation per registered route', () => {
    const instance = newApp();
    for (const url of ['/v1/a', '/v1/b'])
      route(instance, {
        method: 'GET',
        url,
        schema: { response: { 200: ok } },
        handler: () => ({ ok: true }),
      });
    route(instance, {
      method: 'POST',
      url: '/v1/a',
      schema: { body: z.object({ n: z.number() }), response: { 201: ok } },
      handler: () => ({ ok: true }),
    });

    const operations = Object.values(buildOpenApiDocument(instance).paths).reduce(
      (total, methods) => total + Object.keys(methods).length,
      0,
    );
    expect(operations).toBe(registeredRoutes(instance).length);
  });

  it('publishes every status the route can return, including the ones the framework added', () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/with-query',
      schema: { query: z.object({ q: z.string() }), response: { 200: ok } },
      handler: () => ({ ok: true }),
    });

    const operation = buildOpenApiDocument(instance).paths['/v1/with-query']?.['get'] as {
      responses: Record<string, unknown>;
    };
    // 422 and 500 are the framework's. They are in the document because `route()` records the
    // AUGMENTED response map — this module does not guess what an undeclared status means.
    expect(Object.keys(operation.responses).sort()).toEqual(['200', '422', '500']);
  });
});

describe('the shapes a generated client depends on', () => {
  it('converts Fastify path parameters to OpenAPI templates', () => {
    // A document containing `/:slug` produces a client that requests a URL with a literal colon
    // in it, and the failure appears as a 404 in somebody else's codebase.
    expect(toOpenApiPath('/v1/colors/:slug')).toBe('/v1/colors/{slug}');
    expect(toOpenApiPath('/v1/a/:one/b/:two')).toBe('/v1/a/{one}/b/{two}');
    expect(toOpenApiPath('/healthz')).toBe('/healthz');
  });

  it('declares each path parameter as required, with the schema the route validates against', () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/colors/:slug',
      schema: {
        params: z.object({ slug: z.string().min(2) }),
        response: { 200: ok },
      },
      handler: () => ({ ok: true }),
    });

    const operation = buildOpenApiDocument(instance).paths['/v1/colors/{slug}']?.['get'] as {
      parameters: { name: string; in: string; required: boolean; schema: { minLength?: number } }[];
    };
    const slug = operation.parameters.find((p) => p.name === 'slug');

    expect(slug).toMatchObject({ in: 'path', required: true });
    // The real constraint, not `{ type: 'string' }` — otherwise the document is weaker than the
    // server and a client believes an invalid value will be accepted.
    expect(slug?.schema.minLength).toBe(2);
  });

  it('publishes a defaulted query parameter as OPTIONAL', () => {
    // The `input` half of ADR-0012's io argument, which F-002 found the hard way: as `output`,
    // a field with a `.default()` is required — a contract wrong in the one direction clients
    // cannot work around.
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/list',
      schema: {
        query: z.object({ limit: z.number().int().default(20), q: z.string() }),
        response: { 200: ok },
      },
      handler: () => ({ ok: true }),
    });

    const operation = buildOpenApiDocument(instance).paths['/v1/list']?.['get'] as {
      parameters: { name: string; required: boolean }[];
    };

    expect(operation.parameters.find((p) => p.name === 'limit')?.required).toBe(false);
    expect(operation.parameters.find((p) => p.name === 'q')?.required).toBe(true);
  });

  it('documents the Idempotency-Key a mutation requires, and omits it where it is exempt', () => {
    const instance = newApp();
    route(instance, {
      method: 'POST',
      url: '/v1/create',
      schema: { body: z.object({ name: z.string() }), response: { 201: ok } },
      handler: () => ({ ok: true }),
    });
    route(instance, {
      method: 'POST',
      url: '/v1/revoke',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
      idempotencyExemptBecause: 'revocation is idempotent by construction: the token is gone',
    });

    const document = buildOpenApiDocument(instance);
    const create = document.paths['/v1/create']?.['post'] as { parameters: { name: string }[] };
    const revoke = document.paths['/v1/revoke']?.['post'] as { parameters?: { name: string }[] };

    expect(create.parameters.map((p) => p.name)).toContain('Idempotency-Key');
    expect(revoke.parameters ?? []).toEqual([]);
  });

  it('marks a request body as required', () => {
    const instance = newApp();
    route(instance, {
      method: 'POST',
      url: '/v1/create',
      schema: { body: z.object({ name: z.string() }), response: { 201: ok } },
      handler: () => ({ ok: true }),
    });

    const operation = buildOpenApiDocument(instance).paths['/v1/create']?.['post'] as {
      requestBody: { required: boolean; content: Record<string, unknown> };
    };
    expect(operation.requestBody.required).toBe(true);
    expect(operation.requestBody.content).toHaveProperty('application/json');
  });

  it('targets OpenAPI 3.1, which is the version aligned with draft 2020-12', () => {
    // A 3.0 target would silently lose `prefixItems` and rewrite nullability — the same defect
    // `validation.ts` refused to paper over when Fastify's draft-07 AJV could not read our
    // schemas. Pinned so a well-meaning downgrade for tooling compatibility is a failing test.
    expect(describeApi().openapi).toBe('3.1.0');
  });
});

describe('the /v1 promise is stated in the document, not implied by an omission', () => {
  it('tags operator endpoints separately from versioned ones', () => {
    expect(tagFor('/healthz')).toBe(OPERATIONS_TAG);
    expect(tagFor('/readyz')).toBe(OPERATIONS_TAG);
    expect(tagFor(`/${API_VERSION}/colors/:slug`)).toBe('colors');
    expect(tagFor(`/${API_VERSION}`)).toBe(OPERATIONS_TAG);
  });

  it('says in the operations tag that those endpoints carry no compatibility promise', () => {
    // Omitting the health routes was the obvious reading of "they are not the client contract",
    // and it would have left the document with zero paths until F-016 — a `--check` comparing
    // nothing. Included and labelled instead, so the distinction survives in the artefact.
    const tag = describeApi().tags.find((t) => t.name === OPERATIONS_TAG);
    expect(tag?.description).toMatch(/no compatibility promise/u);
  });

  it('refuses to describe the same method on the same path twice', () => {
    const instance = newApp();
    route(instance, {
      method: 'GET',
      url: '/v1/dup',
      schema: { response: { 200: ok } },
      handler: () => ({ ok: true }),
    });
    // Fastify would refuse this at registration; the registry is checked separately because a
    // document that silently loses an operation is worse than one that fails to build.
    const registry = registeredRoutes(instance) as unknown as { url: string }[];
    registry.push({ ...registry[0]! });

    expect(() => buildOpenApiDocument(instance)).toThrow(/registered twice/u);
  });
});
