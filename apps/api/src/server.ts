/**
 * The server, assembled.
 *
 * Order matters here and is not incidental:
 *
 * 1. **The validator compiler goes on first.** Fastify compiles a route's schema at
 *    registration time, so a compiler installed after a route would not apply to it — and the
 *    failure mode is a *subset* of routes silently validating under the wrong dialect, which is
 *    worse than none of them working.
 * 2. **Routes register through `route()`**, never through a bare `app.get`. ESLint bans the
 *    bare form outside `src/http/` and boundary guard #12 proves that rule fires.
 * 3. **`assertRoutesDeclared` runs last**, over the assembled table, and returns the count so a
 *    caller can print it. It is the only check that can catch a route a plugin built
 *    dynamically.
 *
 * F-005 built this as health-only and said routing, the type provider and OpenAPI were F-015's.
 * They are now here; the health endpoints moved onto the same wrapper as everything else rather
 * than keeping the exemption they had while they were the only routes.
 */

import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';

import type { HealthDependencies } from './health.js';
import { registerHealthRoutes } from './http/health-routes.js';
import {
  generateRequestId,
  useErrorHandling,
  useIdempotency,
  useRateLimiting,
} from './http/lifecycle.js';
import { assertRoutesDeclared } from './http/route.js';
import { useContractValidation } from './http/validation.js';

export interface ServerOptions extends HealthDependencies {
  readonly logLevel?: string;
}

export interface BuiltServer {
  readonly app: FastifyInstance;
  /**
   * How many routes were verified as declaring their schemas.
   *
   * Returned rather than logged so a caller decides where it goes — and returned *at all*
   * because "the route table is fine" over zero routes has said nothing. F-016 is what makes
   * this number interesting; until then it is the honest small one.
   */
  readonly routesVerified: number;
}

export function buildServer(options: ServerOptions): BuiltServer {
  const app = Fastify({
    logger: { level: options.logLevel ?? 'info' },
    // Trust the proxy: Coolify and Dokploy both put Traefik in front, so the client address
    // arrives in X-Forwarded-For. Without this, every rate limit and audit entry records the
    // proxy's address and per-IP limiting silently becomes global limiting.
    trustProxy: true,
    // The correlation id, honoured from the edge when it is well formed. Fastify's default is a
    // per-process counter — `req-1` from two containers is two different requests with one name,
    // which is worse than useless in an aggregated log.
    genReqId: (request) =>
      generateRequestId(headerValue(request.headers['x-request-id']), () => randomUUID()),
  });

  useContractValidation(app);
  // Before the routes: an error handler installed afterwards would still apply, but a HOOK would
  // not — Fastify binds hooks to the encapsulation context they are added in, and adding them
  // after registration is the shape that silently covers a subset.
  useErrorHandling(app);
  useRateLimiting(app, { cache: options.cache });
  useIdempotency(app, { cache: options.cache });

  const startedAt = (options.now ?? Date.now)();
  registerHealthRoutes(app, { ...options, startedAt });

  return { app, routesVerified: assertRoutesDeclared(app) };
}

function headerValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}
