/**
 * Teaching Fastify the JSON Schema dialect our contracts actually speak.
 *
 * ## The seam, and why it is not a workaround
 *
 * `@irodora/contracts` emits **draft 2020-12**, deliberately: OpenAPI 3.1 is aligned with it, and
 * `json-schema.ts` says an OpenAPI 3.0 target "would silently lose `prefixItems` and rewrite
 * nullability, and we would not find out until a consumer generated a wrong client".
 *
 * Fastify 5's default validator is AJV's **draft-07** build. Handed a 2020-12 schema it fails
 * with *"no schema with key or ref https://json-schema.org/draft/2020-12/schema"* — which is the
 * good outcome. It refuses rather than validating against a dialect it does not implement.
 *
 * There were two ways out and only one of them is honest:
 *
 * - **Strip `$schema` and let the draft-07 validator have it.** It would start working
 *   immediately. It would also silently mis-validate every 2020-12 construct — `prefixItems` on
 *   a tuple, `$defs`, the 2020-12 `items` semantics — and a tuple schema like `Triple` would
 *   validate a three-element array by rules nobody chose. That is the exact failure
 *   `json-schema.ts` was written to avoid, moved one layer down.
 * - **Give Fastify the 2020-12 validator.** Which is this file.
 *
 * `ajv` is declared as a direct dependency rather than reached for through Fastify's own
 * install. It is a transitive dependency either way, but importing a package we did not declare
 * means a Fastify upgrade could change its AJV major under us with nothing to say so.
 *
 * ## Response serialisation is a different question
 *
 * Fastify serialises responses with `fast-json-stringify`, not AJV. It ignores keywords it does
 * not know rather than refusing, so a 2020-12 response schema serialises correctly today — but
 * it is **not validating** the response, only shaping it. The response contract is enforced by
 * the tests and by the generated OpenAPI document, not by the serialiser, and saying so here
 * stops someone reading a green boot as proof that responses are checked.
 */

import { Ajv2020 } from 'ajv/dist/2020.js';
import type { FastifyInstance } from 'fastify';

/**
 * A 2020-12 AJV configured the way a published contract needs.
 *
 * `strict: false` because a contract schema legitimately carries annotations AJV's strict mode
 * rejects — `$schema` itself, and the `description` fields that become OpenAPI documentation.
 * Strict mode is a linter for hand-written schemas; ours are generated from Zod, and their
 * correctness is checked where they are written.
 *
 * `removeAdditional: false` always: quietly deleting unknown fields makes a typo in a client
 * indistinguishable from a field we chose to ignore.
 *
 * ## Coercion is decided per part of the request, not once
 *
 * The first version of this file set `coerceTypes: false` everywhere, on the reasoning that
 * coercion silently accepts requests that violate the contract. A test caught it immediately:
 * `?n=3` was rejected, because **a querystring is always strings on the wire.** There is no
 * version of HTTP where `n` arrives as a number.
 *
 * So the two halves are genuinely different questions:
 *
 * - **`querystring` and `params` — coerce.** The transport has already destroyed the type; the
 *   schema is what restores it. Refusing here does not enforce a contract, it makes numeric
 *   query parameters impossible.
 * - **`body` and `headers` — never coerce.** A JSON body *can* carry a real number, so a string
 *   where a number was declared is a client that is actually wrong. Coercing it would turn
 *   `{"limit": "abc"}` into `NaN` and hand a handler a value nobody sent.
 *
 * Note what this means for `z.coerce` in a schema: it does **not** run. This wrapper converts
 * Zod to JSON Schema and AJV validates; Zod's own parser is never in the request path. Coercion
 * is AJV's, configured here — so a `z.coerce` in a contract schema documents intent for the
 * generated client and changes nothing at the server.
 */
function createAjv(coerceTypes: boolean): Ajv2020 {
  return new Ajv2020({ strict: false, coerceTypes, allErrors: false, removeAdditional: false });
}

/** The request parts whose values arrive as strings no matter what the client meant. */
const COERCED_PARTS = new Set(['querystring', 'params']);

/**
 * Install the compiler on an instance.
 *
 * Must run **before any route is registered**: Fastify compiles a route's schema at registration
 * time, so a compiler installed afterwards would not apply to routes already added — and the
 * failure would be a subset of routes silently validating under the wrong dialect, which is
 * worse than none of them working.
 */
export function useContractValidation(app: FastifyInstance): void {
  const coercing = createAjv(true);
  const strictTypes = createAjv(false);

  app.setValidatorCompiler(({ schema, httpPart }) =>
    (COERCED_PARTS.has(httpPart ?? '') ? coercing : strictTypes).compile(schema as object),
  );
}
