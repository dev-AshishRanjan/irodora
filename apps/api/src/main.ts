/**
 * The process entry point.
 *
 * Boot order matters and is the deployment contract in miniature:
 *
 *   1. validate the environment — refuse to start if it is wrong
 *   2. construct the adapters
 *   3. migrate, under an advisory lock, if this container is allowed to
 *   4. listen
 *   5. shut down cleanly on SIGTERM
 *
 * Validating first is what turns a misconfiguration into a boot failure with a named
 * variable, instead of a 500 on someone's first request an hour later.
 */

import { loadEnvironment, redactEnvironment } from '@irodora/config';
import { migrateAtBoot, PostgresDatabase, ValkeyCache } from '@irodora/adapters';

import { buildServer } from './server.js';

async function main(): Promise<void> {
  const env = loadEnvironment('api', process.env);

  const database = new PostgresDatabase({
    connectionString: env.IRODORA_DATABASE_URL,
    poolMax: env.IRODORA_DATABASE_POOL_MAX,
  });
  const cache = new ValkeyCache({ url: env.IRODORA_REDIS_URL });

  const app = buildServer({
    database,
    cache,
    serviceName: env.IRODORA_SERVICE_NAME,
    logLevel: env.IRODORA_LOG_LEVEL,
  });

  // Redacted, and the redaction is the function's job rather than this call site's — most
  // "it works locally" incidents are a variable that is not what someone believes.
  app.log.info({ config: redactEnvironment(env) }, 'configuration resolved');

  // No migrations exist yet; the schema arrives with F-034. The LOCK is infrastructure and
  // belongs here — retrofitting it after the first migration has raced is data recovery.
  const migration = await migrateAtBoot({
    database,
    migrations: [],
    enabled: env.IRODORA_DATABASE_MIGRATE_ON_BOOT,
  });
  app.log.info({ migration }, 'migration step complete');

  // SIGTERM is what Docker, Coolify and Dokploy send. Draining before exit is the difference
  // between a rolling deploy and a handful of dropped requests per release.
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    app.log.info({ signal }, 'shutting down');
    void app
      .close()
      .then(() => Promise.all([database.close(), cache.close()]))
      .then(
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

  await app.listen({ host: env.IRODORA_HTTP_HOST, port: env.IRODORA_HTTP_PORT });
}

main().catch((error: unknown) => {
  // Deliberately console, not the logger: this path includes "the environment is wrong", and
  // at that point there is no configured logger to trust.
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
