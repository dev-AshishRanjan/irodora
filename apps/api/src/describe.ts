/**
 * Assemble the server for the purpose of describing it.
 *
 * One function, called by both the generator script and `openapi.test.ts`, so the committed
 * document and the check that guards it cannot be built from different route tables. Two call
 * sites each assembling their own app is how the check ends up agreeing with itself.
 *
 * ## Stand-in dependencies, and why that is not a shortcut
 *
 * The route table does not depend on the adapters. `registerHealthRoutes` needs a `DatabasePort`
 * and a `CachePort` to *serve* with, never to *register* with — so a document built over the
 * in-memory adapters describes exactly the same surface as one built over Postgres and Valkey.
 *
 * The alternative — hand-listing routes for documentation — is the defect this avoids: it
 * publishes a table someone maintains beside the real one, and the two drift the first time
 * anyone is in a hurry.
 */

import { InMemoryCache, InMemoryDatabase } from '@irodora/ports';

import { buildOpenApiDocument, type OpenApiDocument } from './openapi.js';
import { buildServer } from './server.js';

/**
 * The document, built from a freshly assembled server.
 *
 * `logLevel: 'silent'` because this runs inside a build script: a JSON document on stdout with
 * two lines of pino in front of it is not a JSON document.
 */
export function describeApi(): OpenApiDocument {
  const { app } = buildServer({
    database: new InMemoryDatabase(),
    cache: new InMemoryCache(),
    serviceName: 'irodora-api',
    logLevel: 'silent',
    // Fixed, so nothing time-dependent can reach the document. Nothing does today; a generator
    // whose output depends on when it ran is one whose `--check` fails at 3am for no reason.
    now: () => 0,
  });

  return buildOpenApiDocument(app);
}
