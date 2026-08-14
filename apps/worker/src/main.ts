/**
 * The worker process entry point.
 *
 * Same boot contract as the API — validate the environment, construct adapters, refuse to
 * start if anything is wrong, shut down cleanly on SIGTERM — minus the HTTP surface, because
 * the worker has no ingress (see the topology in docs/operations/deployment/coolify.md).
 *
 * **No jobs are registered yet.** That is not a placeholder pretending to be a feature: the
 * queue and its handlers arrive with the features that need them (F-042 image processing,
 * F-056 exports). What has to exist now is the deployable shape — a process that proves its
 * configuration and its connections at boot, so a misconfigured worker fails at start rather
 * than on the first job hours later.
 */

import { loadEnvironment, redactEnvironment } from '@irodora/config';
import { PostgresDatabase, ValkeyCache } from '@irodora/adapters';

async function main(): Promise<void> {
  const env = loadEnvironment('worker', process.env);

  const database = new PostgresDatabase({
    connectionString: env.IRODORA_DATABASE_URL,
    poolMax: env.IRODORA_DATABASE_POOL_MAX,
  });
  const cache = new ValkeyCache({ url: env.IRODORA_REDIS_URL });

  const log = (message: string, detail: unknown = {}): void => {
    // Structured from the start. The worker's output is the only view into it, and switching
    // a log format later means rewriting every dashboard that reads it.
    console.log(
      JSON.stringify({ level: 'info', service: 'worker', message, ...(detail as object) }),
    );
  };

  log('configuration resolved', { config: redactEnvironment(env) });

  // Prove the connections at boot rather than on the first job. A worker that starts
  // "successfully" and then cannot reach Postgres is a worker whose queue silently backs up.
  const [databaseUp, cacheUp] = await Promise.all([database.ping(), cache.ping()]);
  log('dependencies checked', { database: databaseUp, cache: cacheUp });

  if (!databaseUp || !cacheUp) {
    log('refusing to start: a dependency is unreachable');
    await Promise.all([database.close(), cache.close()]);
    process.exit(1);
  }

  log('worker ready', { registeredJobs: 0 });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    log('shutting down', { signal });
    void Promise.all([database.close(), cache.close()]).then(
      () => process.exit(0),
      () => process.exit(1),
    );
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  // Hold the process open. With no jobs registered there is no other reference keeping the
  // event loop alive, and a worker container that exits 0 immediately looks to an
  // orchestrator like a crash loop with a confusing exit code.
  await new Promise<never>(() => {
    /* until a signal */
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
