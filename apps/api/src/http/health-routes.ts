/**
 * The health endpoints, registered through the same wrapper as everything else.
 *
 * They were the API's only routes before F-015 and they were registered with a bare `app.get`.
 * Moving them here is not tidying: the rule *"every route declares schemas"* would otherwise
 * have a carve-out on the day it was written, and the two routes exempted would be the ones an
 * orchestrator depends on. A rule with an exception nobody argued for is a convention.
 *
 * ## The schemas live here, not in `@irodora/contracts`
 *
 * `contracts` is the **client** contract — what the web app, the mobile app and the SDK import.
 * `/healthz` and `/readyz` are read by Coolify, Dokploy and Kubernetes, not by a customer, and
 * they are deliberately outside `/v1`'s additive-only promise so an operator-facing field can
 * change without minting `/v2`. Putting them in `contracts` would publish an operational detail
 * as a client guarantee.
 *
 * ## They still check different things, and that is load-bearing
 *
 * `apps/api/AGENTS.md`: `/healthz` checks the process and **nothing external**; `/readyz` checks
 * the database, the cache and the content version. A liveness probe that fails when the database
 * blips causes the orchestrator to restart a healthy container, turning a brief hiccup into an
 * outage — and under Coolify and Dokploy that restart is quick and unceremonious, so the
 * distinction matters more rather than less.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildHealthReport, buildReadinessReport, type HealthDependencies } from '../health.js';
import { route } from './route.js';

/** `/healthz`. `status` is a literal because there is no unhealthy answer — the process replies or it does not. */
export const healthReportSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  uptimeSeconds: z.number().nonnegative(),
});

export const readinessReportSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: z.record(z.string(), z.enum(['ok', 'unavailable'])),
});

export interface HealthRouteOptions extends HealthDependencies {
  readonly startedAt: number;
}

export function registerHealthRoutes(app: FastifyInstance, options: HealthRouteOptions): void {
  route(app, {
    method: 'GET',
    url: '/healthz',
    // No 503. A liveness probe that can report "not alive" over HTTP has already contradicted
    // itself: if the process can answer, it is alive. Anything worse is a connection failure,
    // which is what the orchestrator is actually watching for.
    schema: { response: { 200: healthReportSchema } },
    handler: () => buildHealthReport(options),
  });

  route(app, {
    method: 'GET',
    url: '/readyz',
    schema: { response: { 200: readinessReportSchema, 503: readinessReportSchema } },
    handler: async (_request, reply) => {
      const report = await buildReadinessReport(options);

      // 503, not 500. "Not ready" is a normal state during boot and during a dependency blip;
      // 500 would tell the orchestrator this container is broken and should be replaced.
      if (report.status !== 'ready') return reply.code(503).send(report);
      return report;
    },
  });
}
