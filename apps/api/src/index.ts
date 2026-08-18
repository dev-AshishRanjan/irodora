/**
 * `@irodora/api` — the Fastify modular monolith.
 *
 * F-005 lands the deployment contract: a process that validates its environment, refuses to
 * start without it, and answers `/healthz` and `/readyz`. The API surface itself is F-015.
 */

export { buildServer, type BuiltServer, type ServerOptions } from './server.js';
export {
  buildHealthReport,
  buildReadinessReport,
  type HealthDependencies,
  type HealthReport,
  type ReadinessReport,
} from './health.js';
