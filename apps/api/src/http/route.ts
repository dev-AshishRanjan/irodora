/**
 * Route registration, and why a route cannot exist here without its schemas.
 *
 * `apps/api/AGENTS.md`: *"Params, query, body, **and every response status**. A route without
 * response schemas cannot appear in the generated OpenAPI document, so the contract silently
 * omits it."*
 *
 * "Silently omits it" is the whole problem. A missing response schema does not break anything
 * visible — the route still works, the tests still pass, and the published contract simply does
 * not mention it. The client generated from that document then has no type for the response, and
 * nobody finds out until someone consumes it.
 *
 * So the rule is enforced three ways, deliberately overlapping:
 *
 * 1. **The type refuses first.** `schema.response` is a required property. A route object
 *    without it is a compile error, not a lint warning.
 * 2. **The runtime refuses at registration**, because a plugin can build a route object
 *    dynamically and defeat (1).
 * 3. **`assertRoutesDeclared` refuses at boot**, over the whole registry, so a route registered
 *    by any path at all is still caught before the server accepts a request.
 *
 * And because there are no domain routes until F-016, `test/route.test.ts` carries **decoy
 * routes** that omit a schema and are asserted to be rejected. Without them these three checks
 * are green over an empty set — the same problem F-011's content gate had, third repeat, so it
 * gets the same answer rather than being rediscovered.
 *
 * ## The universal error responses are added, not demanded
 *
 * Every route can return 500. Every route with an input schema can return 422. Requiring an
 * author to write those out each time produces boilerplate that gets copy-pasted and then drifts
 * — so the wrapper **adds them**. What an author declares is the domain: the 200, the 404, the
 * 409. What the framework can produce, the framework documents.
 *
 * ## A path parameter must be declared, by name
 *
 * Added when the OpenAPI document was first generated, which is what made the hole visible:
 * Fastify serves `/v1/x/:slug` with no `params` schema perfectly happily and validates nothing,
 * so the published document would have had to invent a type for a parameter the server never
 * checks. The names are compared too — `:slug` against a schema naming `id` is a rename that
 * validates nothing and publishes a phantom.
 *
 * ## `input` for requests, `output` for responses
 *
 * Not interchangeable, and F-002 already found out why: `pageParamsSchema` has a `.default()`,
 * so as `output` it publishes `limit` as **required** — a contract that is wrong in the one
 * direction clients cannot work around. `toJsonSchema` demands the caller say which, and this is
 * the caller.
 */

import { errorResponseSchema, toJsonSchema } from '@irodora/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';

/** The methods this API uses. `HEAD` and `OPTIONS` are Fastify's to manage, not ours. */
export const ROUTE_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type RouteMethod = (typeof ROUTE_METHODS)[number];

/** Methods that change state, and therefore need an `Idempotency-Key` (api-contract §6). */
export const MUTATING_METHODS = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const satisfies readonly RouteMethod[];

export function isMutating(method: RouteMethod): boolean {
  return (MUTATING_METHODS as readonly RouteMethod[]).includes(method);
}

export interface RouteSchemas {
  readonly params?: z.ZodType;
  readonly query?: z.ZodType;
  readonly body?: z.ZodType;
  /**
   * One schema per status this route can return. **Required** — that is the point of the type.
   *
   * Declare the domain statuses. 500, and 422 where an input schema exists, are added for you.
   */
  readonly response: Readonly<Record<number, z.ZodType>>;
}

export interface RouteDefinition {
  readonly method: RouteMethod;
  readonly url: string;
  readonly schema: RouteSchemas;
  readonly handler: (request: FastifyRequest, reply: FastifyReply) => unknown;
  /**
   * Why this route needs no `Idempotency-Key` despite mutating.
   *
   * Required rather than a boolean flag: an exemption with no stated reason is one nobody can
   * evaluate later, and this is the rule most likely to be switched off under deadline.
   */
  readonly idempotencyExemptBecause?: string;
}

/** A route as recorded, with the statuses the framework added. */
export interface RegisteredRoute {
  readonly method: RouteMethod;
  readonly url: string;
  /** What the author declared. */
  readonly schema: RouteSchemas;
  /**
   * What the route can actually return — the author's map plus what the framework added.
   *
   * Stored rather than recomputed. The OpenAPI generator needs a schema for *every* status,
   * including the ones `route()` injected, and the alternative was for it to guess that an
   * undeclared status must be the error envelope. A guess that is right today is a document
   * that quietly becomes wrong the moment this function injects something else.
   */
  readonly responses: Readonly<Record<number, z.ZodType>>;
  readonly statuses: readonly number[];
  readonly requiresIdempotencyKey: boolean;
}

/**
 * The registry, per Fastify instance.
 *
 * A `WeakMap` rather than a module-level array: tests build many isolated apps, and a shared
 * array would let one test's decoy route leak into another's assertions — which is exactly the
 * kind of cross-talk that makes a suite pass for the wrong reason.
 */
const REGISTRIES = new WeakMap<FastifyInstance, RegisteredRoute[]>();

export function registeredRoutes(app: FastifyInstance): readonly RegisteredRoute[] {
  return REGISTRIES.get(app) ?? [];
}

export class RouteDeclarationError extends Error {
  constructor(method: string, url: string, detail: string) {
    super(`${method} ${url}: ${detail}`);
    this.name = 'RouteDeclarationError';
  }
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/** Every path parameter a URL declares, in order. */
export function pathParameterNames(url: string): readonly string[] {
  return [...url.matchAll(/:([A-Za-z0-9_]+)/gu)].map((match) => match[1] ?? '');
}

/**
 * A path parameter with no schema is an unvalidated input, and generating the document is what
 * made that visible.
 *
 * OpenAPI requires every template parameter to be described. Fastify does not: `/v1/x/:slug`
 * with no `params` schema serves happily and validates nothing, so the published document would
 * either omit the parameter or invent `{ type: 'string' }` for it. Both describe a server that
 * is not the one running.
 *
 * Names are checked, not just presence. `/v1/colors/:slug` with `params: { id: string }`
 * type-checks today, validates nothing, and publishes a phantom parameter beside an
 * undocumented one — the near-miss a rename produces and nothing else here would catch.
 */
function assertPathParametersDeclared(
  method: RouteMethod,
  url: string,
  params: z.ZodType | undefined,
): void {
  const names = pathParameterNames(url);
  if (names.length === 0) return;

  if (params === undefined)
    throw new RouteDeclarationError(
      method,
      url,
      `declares path parameter(s) ${names.join(', ')} with no \`params\` schema. A path ` +
        'parameter without one is an unvalidated input, and the generated document has nothing ' +
        'to publish for it.',
    );

  const json = toJsonSchema(params, 'input') as { properties?: Record<string, unknown> };
  const described = Object.keys(json.properties ?? {});
  const missing = names.filter((name) => !described.includes(name));

  if (missing.length > 0)
    throw new RouteDeclarationError(
      method,
      url,
      `has path parameter(s) ${missing.join(', ')} that the \`params\` schema does not name ` +
        `(it names: ${described.length === 0 ? 'nothing' : described.join(', ')}). A renamed ` +
        'parameter validates nothing and publishes a phantom one beside an undocumented one.',
    );
}

/**
 * Register a route, or refuse to.
 *
 * The refusals are the feature. Each one names the route and says what a correct declaration
 * looks like, because a message that only says "invalid" makes the author guess.
 */
export function route(app: FastifyInstance, definition: RouteDefinition): void {
  const { method, url, schema, handler } = definition;

  const declared = Object.keys(schema.response).map(Number);
  if (declared.some((status) => !Number.isInteger(status) || status < 100 || status > 599))
    throw new RouteDeclarationError(method, url, `response keys must be HTTP statuses`);

  if (!declared.some(isSuccess))
    throw new RouteDeclarationError(
      method,
      url,
      'declares no 2xx response. Every route needs at least one success schema — without it the ' +
        'generated OpenAPI document describes a route that can only fail, and the SDK gives ' +
        'consumers no type for what they actually receive.',
    );

  assertPathParametersDeclared(method, url, schema.params);

  if (
    isMutating(method) &&
    schema.body === undefined &&
    definition.idempotencyExemptBecause === undefined
  )
    throw new RouteDeclarationError(
      method,
      url,
      `is a ${method} with no body schema. If it genuinely takes no body, say why with ` +
        '`idempotencyExemptBecause` — an unexplained exemption is one nobody can evaluate later.',
    );

  // The framework's own statuses, added rather than demanded. See the module comment.
  const responses: Record<number, z.ZodType> = { ...schema.response };
  if (!(500 in responses)) responses[500] = errorResponseSchema;
  const hasInput =
    schema.params !== undefined || schema.query !== undefined || schema.body !== undefined;
  if (hasInput && !(422 in responses)) responses[422] = errorResponseSchema;

  const registered: RegisteredRoute = {
    method,
    url,
    schema,
    responses,
    statuses: Object.keys(responses)
      .map(Number)
      .sort((a, b) => a - b),
    requiresIdempotencyKey: isMutating(method) && definition.idempotencyExemptBecause === undefined,
  };

  const registry = REGISTRIES.get(app) ?? [];
  registry.push(registered);
  REGISTRIES.set(app, registry);

  app.route({
    method,
    url,
    schema: {
      // `input` for what a client sends, `output` for what it receives. Not interchangeable —
      // see the module comment.
      ...(schema.params === undefined ? {} : { params: toJsonSchema(schema.params, 'input') }),
      ...(schema.query === undefined ? {} : { querystring: toJsonSchema(schema.query, 'input') }),
      ...(schema.body === undefined ? {} : { body: toJsonSchema(schema.body, 'input') }),
      response: Object.fromEntries(
        Object.entries(responses).map(([status, s]) => [status, toJsonSchema(s, 'output')]),
      ),
    },
    handler,
  });
}

/**
 * Assert every registered route declares what it returns.
 *
 * Runs at boot, over the whole registry, after every plugin has registered. This is the check
 * that catches a route built dynamically — the path the type system cannot see.
 *
 * Returns the number verified, so a caller can print it. A check that reports "all good" over
 * zero routes has said nothing, and printing the count is what stops a green run being read as
 * coverage.
 */
export function assertRoutesDeclared(app: FastifyInstance): number {
  const routes = registeredRoutes(app);
  const problems: string[] = [];

  for (const registered of routes) {
    if (!registered.statuses.some(isSuccess))
      problems.push(`${registered.method} ${registered.url} has no 2xx response schema`);
    if (!registered.statuses.includes(500))
      problems.push(`${registered.method} ${registered.url} has no 500 response schema`);
  }

  if (problems.length > 0)
    throw new RouteDeclarationError(
      'boot',
      'route table',
      `${String(problems.length)} route(s) are missing response schemas:\n  ${problems.join('\n  ')}`,
    );

  return routes.length;
}
