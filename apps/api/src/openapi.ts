/**
 * The OpenAPI document, **derived** from the route registry.
 *
 * ADR-0012 claims one artefact serves runtime validation, TypeScript types and OpenAPI. The
 * first two are visible the moment a schema is written. The third was not, and
 * `contracts/src/json-schema.ts` said so in as many words: *"a schema can validate perfectly and
 * still be impossible to express as JSON Schema, and nothing says so until the document is
 * generated, which does not happen until F-015."*
 *
 * It happens here. E-004's first arrow — contract → OpenAPI — stops being a diagram.
 *
 * ## Derived, compared, never hand-edited
 *
 * `apps/api/openapi.json` is committed, and two independent things check it is current:
 * `scripts/generate-openapi.mjs --check` (from `dist`, for CI) and `openapi.test.ts` (from
 * source, so it runs under `pnpm test` without depending on a build having happened). Both call
 * `openApiStaleness`, so they cannot drift from each other or from the writer.
 *
 * That is the ADR-0043 shape for a third dataset. A generator whose output nobody compares is a
 * generator nobody is checking: the file rots the first time a route changes, and the SDK
 * generated from it describes a server that no longer exists.
 *
 * ## Why the health routes are in it, tagged rather than omitted
 *
 * `health-routes.ts` argues that `/healthz` and `/readyz` are operator-facing and deliberately
 * outside `/v1`'s additive-only promise. Omitting them here was the obvious reading of that —
 * and it would have produced a document with **zero paths** until F-016, which is the
 * gate-before-its-data problem in a fourth costume: a `--check` over an empty document compares
 * nothing and passes for a reason unrelated to the rule.
 *
 * So they are included and **tagged `operations`**, with the tag's own description saying they
 * carry no compatibility promise. The distinction ends up stated in the artefact instead of
 * implied by an absence, and the check has something to check.
 */

import { API_VERSION, toJsonSchema } from '@irodora/contracts';
import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';

import { pathParameterNames, registeredRoutes, type RegisteredRoute } from './http/route.js';

export interface OpenApiDocument {
  readonly openapi: '3.1.0';
  readonly info: { readonly title: string; readonly version: string; readonly description: string };
  /**
   * Declared once at the root instead of repeated on every embedded schema.
   *
   * OpenAPI 3.1 defines this as *"the default value for the `$schema` keyword within Schema
   * Objects contained within this OAS document"*. `z.toJSONSchema` emits `$schema` on each
   * schema it produces; carrying all of them would repeat the same URI dozens of times and,
   * worse, would let one subschema silently declare a different dialect from the document.
   */
  readonly jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema';
  readonly tags: readonly { readonly name: string; readonly description: string }[];
  readonly paths: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

export const JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema' as const;

/**
 * A schema as it is embedded in the document: the dialect keyword removed, because the document
 * declares it once at the root.
 *
 * Only the top level is touched — that is the only place `z.toJSONSchema` puts it, and stripping
 * a nested `$schema` would be rewriting a schema rather than relocating a declaration.
 */
function embed(schema: z.ZodType, io: 'input' | 'output'): Record<string, unknown> {
  const { $schema: dialect, ...rest } = toJsonSchema(schema, io) as Record<string, unknown> & {
    $schema?: string;
  };

  if (dialect !== undefined && dialect !== JSON_SCHEMA_DIALECT)
    throw new Error(
      `a contract schema declares dialect ${dialect}, which is not the document's ` +
        `${JSON_SCHEMA_DIALECT}. Relocating it to the root would change what it means.`,
    );

  return rest;
}

/** The tag for routes outside `/v1`, which carry no compatibility promise. */
export const OPERATIONS_TAG = 'operations';

/**
 * Fastify's `/:slug` becomes OpenAPI's `/{slug}`.
 *
 * Not cosmetic. A client generated from a document containing `/:slug` builds a URL with a
 * literal colon in it, and the failure shows up as a 404 in somebody else's codebase.
 */
export function toOpenApiPath(url: string): string {
  return url.replaceAll(/:([A-Za-z0-9_]+)/gu, '{$1}');
}

/**
 * Which part of the API a route belongs to.
 *
 * `/v1/colors/:slug` → `colors`. Anything outside `/v1` → `operations`, because the
 * additive-only promise is a property of the version prefix and nothing else.
 */
export function tagFor(url: string): string {
  const segments = url.split('/').filter((segment) => segment.length > 0);
  if (segments[0] !== API_VERSION) return OPERATIONS_TAG;
  return segments[1] ?? OPERATIONS_TAG;
}

/**
 * What a status means, for the statuses this API can produce.
 *
 * OpenAPI requires a description on every response, and `"Response."` on all of them would be
 * the honest-looking way of saying nothing. An unknown status gets a generic line rather than a
 * guess — a wrong description is worse than a bland one.
 */
const STATUS_DESCRIPTIONS: Readonly<Record<number, string>> = {
  200: 'Success.',
  201: 'Created.',
  204: 'Success, with no body.',
  400: 'The request could not be understood.',
  401: 'Authentication is required, or it failed.',
  403: 'Authenticated, but not permitted.',
  404: 'No such resource.',
  409: 'The request conflicts with the current state.',
  422:
    'The request did not match the contract. The body names the offending field paths, never ' +
    'the values received.',
  429: 'Rate limited. Retry after the interval named in the Retry-After header.',
  500: 'An unexpected error. The body carries a request id and nothing internal.',
  503: 'Not ready to serve traffic. A dependency is unavailable.',
};

function describeStatus(status: number): string {
  return STATUS_DESCRIPTIONS[status] ?? `Response with status ${String(status)}.`;
}

/** The `parameters` array: path first in URL order, then query in schema order, then headers. */
function parametersFor(route: RegisteredRoute): readonly Record<string, unknown>[] {
  const parameters: Record<string, unknown>[] = [];

  // `route()` refuses a path parameter the params schema does not name, so this lookup cannot
  // come up empty for a registered route. The fallback exists because a missing property would
  // otherwise emit `"schema": undefined`, which JSON.stringify drops — an invalid parameter
  // object rather than a visible failure.
  const params =
    route.schema.params === undefined
      ? {}
      : ((toJsonSchema(route.schema.params, 'input') as { properties?: Record<string, unknown> })
          .properties ?? {});

  for (const name of pathParameterNames(route.url))
    parameters.push({
      name,
      in: 'path',
      // Always. A URL cannot be built without it, and an optional path segment is a different
      // route rather than an optional parameter.
      required: true,
      schema: params[name] ?? { type: 'string' },
    });

  if (route.schema.query !== undefined) {
    // `input`: a field with a `.default()` is optional for the CLIENT. Publishing it as required
    // would be a contract wrong in the one direction clients cannot work around — the exact
    // failure `toJsonSchema` takes an `io` argument to prevent.
    const query = toJsonSchema(route.schema.query, 'input') as {
      properties?: Record<string, unknown>;
      required?: readonly string[];
    };
    for (const [name, schema] of Object.entries(query.properties ?? {}))
      parameters.push({
        name,
        in: 'query',
        required: (query.required ?? []).includes(name),
        schema,
      });
  }

  if (route.requiresIdempotencyKey)
    // Documented, not merely enforced. A client that learns this rule from a 400 has already had
    // a request fail for something the contract could have told it up front.
    parameters.push({
      name: 'Idempotency-Key',
      in: 'header',
      required: true,
      description:
        'Send the same key when retrying, so a network failure cannot apply the change twice. ' +
        'Reusing a key with a different body is refused rather than served from the cache.',
      schema: { type: 'string', minLength: 8, maxLength: 255 },
    });

  return parameters;
}

function operationFor(route: RegisteredRoute): Record<string, unknown> {
  const parameters = parametersFor(route);

  const responses: Record<string, unknown> = {};
  for (const status of route.statuses) {
    // `route.responses`, not `route.schema.response` — the augmented map, so the statuses the
    // framework added carry their real schema rather than one this module guessed.
    const schema = route.responses[status];
    if (schema === undefined)
      throw new Error(
        `${route.method} ${route.url}: status ${String(status)} has no schema. The registry is ` +
          'inconsistent, which assertRoutesDeclared should have caught at boot.',
      );

    responses[String(status)] = {
      description: describeStatus(status),
      content: {
        // `output`: this is what a client RECEIVES, so a `.default()` really has been applied
        // and the field really is present.
        'application/json': { schema: embed(schema, 'output') },
      },
    };
  }

  return {
    tags: [tagFor(route.url)],
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(route.schema.body === undefined
      ? {}
      : {
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: embed(route.schema.body, 'input') },
            },
          },
        }),
    responses,
  };
}

const TAG_DESCRIPTIONS: Readonly<Record<string, string>> = {
  [OPERATIONS_TAG]:
    'Operator-facing endpoints outside /v1. They are read by the orchestrator, not by clients, ' +
    'and they carry no compatibility promise — /v1 is additive-only; this is not.',
};

/**
 * Build the document from an assembled app.
 *
 * Takes the app rather than a list of routes so it cannot be handed a stale registry. The
 * document describes what the server would actually serve, which is the only version worth
 * publishing.
 */
export function buildOpenApiDocument(app: FastifyInstance): OpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {};
  const tags = new Set<string>();

  for (const route of registeredRoutes(app)) {
    const path = toOpenApiPath(route.url);
    const operations = (paths[path] ??= {});
    const method = route.method.toLowerCase();

    if (method in operations)
      throw new Error(
        `${route.method} ${route.url} is registered twice; the document would lose one`,
      );

    operations[method] = operationFor(route);
    tags.add(tagFor(route.url));
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Irodora API',
      // The URL-path version, which is what a consumer of this document needs. The package
      // version would change on every release without the contract changing at all.
      version: API_VERSION,
      description:
        'Generated from the route registry. Do not edit by hand — `pnpm --filter @irodora/api ' +
        'generate:openapi` writes it and CI compares it.',
    },
    jsonSchemaDialect: JSON_SCHEMA_DIALECT,
    tags: [...tags].sort().map((name) => ({
      name,
      description: TAG_DESCRIPTIONS[name] ?? `Endpoints under /${API_VERSION}/${name}.`,
    })),
    paths,
  };
}

/**
 * The document as it is written to disk.
 *
 * Two-space JSON, trailing newline, keys in registration order. Deterministic output is what
 * makes the comparison a comparison rather than a diff of formatting — and the determinism is
 * asserted rather than assumed, because a document that serialises differently on each run turns
 * `--check` into a gate that fails at random and then gets switched off.
 */
export function serialiseOpenApi(document: OpenApiDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * Why the document on disk is out of date, or `null` if it is current.
 *
 * A reason rather than a boolean. "openapi.json is stale" sends whoever reads it to a diff;
 * "/v1/colors/{slug} is in the generated document and not on disk" tells them what happened,
 * which is usually that they added a route and did not regenerate.
 */
export function openApiStaleness(generated: string, onDisk: string | undefined): string | null {
  if (onDisk === undefined) return 'apps/api/openapi.json does not exist';
  if (onDisk === generated) return null;

  // Deliberately NOT parsed as an OpenApiDocument. The file on disk is whatever somebody left
  // there — valid JSON with no `paths` at all is a real possibility, and asserting the type
  // would make the reader of this function believe a field exists that may not.
  let current: { paths?: Record<string, unknown> };
  try {
    current = JSON.parse(onDisk) as { paths?: Record<string, unknown> };
  } catch {
    return 'apps/api/openapi.json is not valid JSON';
  }

  const expected = JSON.parse(generated) as OpenApiDocument;

  const currentPaths = current.paths ?? {};
  const onDiskPaths = Object.keys(currentPaths);
  const expectedPaths = Object.keys(expected.paths);

  // Both directions name the observation first and the likely cause second. They are genuinely
  // ambiguous — adding a route and deleting a path from the file leave identical evidence — and
  // a message that picks one confidently sends the reader looking in the wrong place.
  const added = expectedPaths.filter((path) => !onDiskPaths.includes(path));
  if (added.length > 0)
    return (
      `in the generated document but not on disk: ${added.join(', ')} ` +
      '(a route was added without regenerating, or the file was edited)'
    );

  const removed = onDiskPaths.filter((path) => !expectedPaths.includes(path));
  if (removed.length > 0)
    return (
      `on disk but not generated: ${removed.join(', ')} ` +
      '(a route was removed without regenerating, or the file was edited)'
    );

  // Same paths, different content: an operation changed, or the file was edited by hand. Name
  // the first path whose operations differ, so the reader has somewhere to look.
  for (const path of expectedPaths)
    if (JSON.stringify(currentPaths[path]) !== JSON.stringify(expected.paths[path]))
      return `${path} differs from the generated document`;

  return 'the document differs outside its paths (info, dialect or tags)';
}
