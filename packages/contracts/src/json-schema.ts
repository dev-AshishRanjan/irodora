/**
 * The third use of a schema: the OpenAPI document.
 *
 * ADR-0012 claims one artefact serves runtime validation, TypeScript types AND OpenAPI.
 * The first two are visible the moment a schema is written. The third is not — a schema can
 * validate perfectly and still be impossible to express as JSON Schema, and nothing says so
 * until the document is generated, which does not happen until F-015.
 *
 * This module makes that leg testable now. `toJsonSchema` throwing on a schema is the whole
 * signal: it means the schema uses something (a transform, a custom refinement with no
 * declarative form) that the published contract cannot describe.
 */

import { z } from 'zod';

/**
 * Derived, never declared. OpenAPI 3.1 is aligned with JSON Schema draft 2020-12, so that
 * is the target — an OpenAPI 3.0 target would silently lose `prefixItems` and rewrite
 * nullability, and we would not find out until a consumer generated a wrong client.
 *
 * `z.toJSONSchema` is overloaded — one form takes a schema, another takes a registry — and
 * a bare `ReturnType<typeof …>` silently resolves to the LAST overload, which returns a
 * registry payload. The explicit instantiation is what picks the right one.
 */
export type JsonSchemaDocument = ReturnType<typeof z.toJSONSchema<z.ZodType>>;

/**
 * Convert a contract schema to the JSON Schema dialect OpenAPI 3.1 is built on.
 *
 * `io` is required, and has no default on purpose. A schema with a `.default()` has two
 * different JSON Schema representations, and picking the wrong one publishes a contract that
 * contradicts the validator:
 *
 * ```
 * pageParamsSchema  io: 'input'   required: []          ← what a client must send
 * pageParamsSchema  io: 'output'  required: ['limit']   ← what a handler receives
 * ```
 *
 * `pageParamsSchema.parse({})` succeeds. Published as `output`, the document would tell
 * every generated client that `limit` is mandatory — a contract that is wrong in the
 * direction clients cannot work around. Zod's own default is `output`, which is right for a
 * response body and wrong for a request, so the caller has to say which it is.
 */
export function toJsonSchema(schema: z.ZodType, io: 'input' | 'output'): JsonSchemaDocument {
  return z.toJSONSchema(schema, { target: 'draft-2020-12', io });
}
