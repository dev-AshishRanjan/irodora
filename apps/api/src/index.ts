/**
 * `@irodora/api` — the Fastify modular monolith.
 *
 * F-005 landed the deployment contract: a process that validates its environment, refuses to
 * start without it, and answers `/healthz` and `/readyz`. F-015 adds the HTTP machinery around
 * it — the route wrapper, the closed error set, idempotency, pagination, rate limiting and the
 * generated OpenAPI document. The domain routes themselves are F-016.
 */

export { buildServer, type BuiltServer, type ServerOptions } from './server.js';
export {
  buildHealthReport,
  buildReadinessReport,
  type HealthDependencies,
  type HealthReport,
  type ReadinessReport,
} from './health.js';

// The OpenAPI document. Exported because `scripts/generate-openapi.mjs` writes it from `dist`,
// and a build script reaching into a package's internals is how a private path becomes a public
// one by accident.
export {
  buildOpenApiDocument,
  openApiStaleness,
  serialiseOpenApi,
  type OpenApiDocument,
} from './openapi.js';
export { describeApi } from './describe.js';
