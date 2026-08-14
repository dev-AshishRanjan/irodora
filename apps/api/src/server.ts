/**
 * The smallest server that satisfies the deployment contract.
 *
 * Health endpoints only. No routing, no Zod type provider, no OpenAPI, no auth — those are
 * F-015, and building them here would be scope creep dressed as momentum. What lands now is
 * what a container orchestrator needs on day one, because F-015 is blocked by F-005 and
 * cannot supply it.
 */

import Fastify, { type FastifyInstance } from 'fastify';

import { buildHealthReport, buildReadinessReport, type HealthDependencies } from './health.js';

export interface ServerOptions extends HealthDependencies {
  readonly logLevel?: string;
}

export function buildServer(options: ServerOptions): FastifyInstance {
  const app = Fastify({
    logger: { level: options.logLevel ?? 'info' },
    // Trust the proxy: Coolify and Dokploy both put Traefik in front, so the client address
    // arrives in X-Forwarded-For. Without this, every rate limit and audit entry records the
    // proxy's address and per-IP limiting silently becomes global limiting.
    trustProxy: true,
  });

  const startedAt = (options.now ?? Date.now)();

  app.get('/healthz', () => buildHealthReport({ ...options, startedAt }));

  app.get('/readyz', async (_request, reply) => {
    const report = await buildReadinessReport(options);

    // 503, not 500. "Not ready" is a normal state during boot and during a dependency blip;
    // 500 would tell the orchestrator this container is broken.
    if (report.status !== 'ready') return reply.code(503).send(report);

    return report;
  });

  return app;
}
