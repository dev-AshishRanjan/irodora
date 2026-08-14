/**
 * The health contract.
 *
 * Two endpoints answering two different questions, and conflating them is the classic
 * outage amplifier:
 *
 * | | Question | Checks | A failure means |
 * |---|---|---|---|
 * | `/healthz` | Is this process alive? | **nothing external** | restart the container |
 * | `/readyz` | Can it serve traffic? | database, cache | stop sending traffic |
 *
 * **`/healthz` must not touch the database.** If it did, a brief Postgres blip would fail
 * the liveness probe, the orchestrator would restart a perfectly healthy container, and a
 * dependency hiccup would become an outage. Coolify and Dokploy both restart on probe
 * failure without much ceremony, so the distinction matters more here, not less
 * (docs/architecture/api-contract.md §3).
 *
 * The contract lands with F-005 because deployment needs it. F-015 mounts the real API
 * around it and conforms to it, rather than inventing it a second time.
 */

import type { CachePort, DatabasePort } from '@irodora/ports';

export interface HealthReport {
  readonly status: 'ok';
  readonly service: string;
  /** Seconds since this process started. The one thing a liveness probe can legitimately report. */
  readonly uptimeSeconds: number;
}

export interface ReadinessReport {
  readonly status: 'ready' | 'not_ready';
  readonly checks: Readonly<Record<string, 'ok' | 'unavailable'>>;
}

export interface HealthDependencies {
  readonly database: DatabasePort;
  readonly cache: CachePort;
  readonly serviceName: string;
  /** Injected so uptime is testable without waiting. */
  readonly now?: () => number;
  readonly startedAt?: number;
}

export function buildHealthReport(deps: HealthDependencies): HealthReport {
  const now = deps.now ?? Date.now;
  const startedAt = deps.startedAt ?? now();

  return {
    status: 'ok',
    service: deps.serviceName,
    uptimeSeconds: Math.max(0, Math.floor((now() - startedAt) / 1000)),
  };
}

/**
 * Probe every dependency, always.
 *
 * Not short-circuiting on the first failure is deliberate: when a deployment is half-broken,
 * "database ok, cache unavailable" is the sentence that ends the investigation, and
 * "not ready" is the sentence that starts one.
 */
export async function buildReadinessReport(deps: HealthDependencies): Promise<ReadinessReport> {
  const [database, cache] = await Promise.all([
    probe(() => deps.database.ping()),
    probe(() => deps.cache.ping()),
  ]);

  const checks = { database, cache } as const;
  const ready = Object.values(checks).every((c) => c === 'ok');

  return { status: ready ? 'ready' : 'not_ready', checks };
}

/**
 * A port's `ping` is documented as returning rather than throwing — but readiness is exactly
 * where an adapter's unhappy path is least exercised, so a throw is caught and reported as
 * unavailable. The alternative is a 500 from `/readyz`, which an orchestrator reads as a
 * broken container rather than one that is not ready.
 */
async function probe(ping: () => Promise<boolean>): Promise<'ok' | 'unavailable'> {
  try {
    return (await ping()) ? 'ok' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
