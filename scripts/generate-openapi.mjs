/**
 * Write `apps/api/openapi.json` from the route registry, or check that it is current.
 *
 * The document is **derived**. Nobody edits it: `apps/api/src/openapi.ts` builds it from the
 * routes the server actually registers, and this script is only the part that touches the disk.
 *
 * `--check` writes nothing and exits 1 if anything would change. That is what CI runs, and it is
 * the whole point — a generator whose output is never compared is a generator nobody is
 * checking. Same shape as `generate-design-tokens.mjs --check` (ADR-0043), third application.
 *
 * It lives in `scripts/` rather than in the package because it reads and writes files: `src/` is
 * built for a server *and* imported by the test suite, and a `node:fs` import there is a
 * dependency the app does not need.
 *
 * **It imports from `dist`**, so it needs `pnpm build` first. That is deliberate — it runs the
 * same compiled code the server runs. `apps/api/src/openapi.test.ts` covers the same ground from
 * source, so `pnpm test` catches a stale document without waiting for a build.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCUMENT = join(ROOT, 'apps', 'api', 'openapi.json');
const DIST = join(ROOT, 'apps', 'api', 'dist', 'index.js');

let api;
try {
  api = await import(pathToFileURL(DIST).href);
} catch (error) {
  console.error(
    'openapi: could not load apps/api/dist — run `pnpm build` first.\n' +
      `  ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const { describeApi, serialiseOpenApi, openApiStaleness } = api;

const checkOnly = process.argv.includes('--check');

const generated = serialiseOpenApi(describeApi());

let onDisk;
try {
  onDisk = readFileSync(DOCUMENT, 'utf8');
} catch {
  onDisk = undefined;
}

const stale = openApiStaleness(generated, onDisk);

// The operation count, printed on every run. A document with no paths would otherwise make this
// script pass for a reason that has nothing to do with the routes — the same failing-open shape
// gates 9 and 11 print their own counts to avoid.
const document = JSON.parse(generated);
const operations = Object.values(document.paths).reduce((n, ops) => n + Object.keys(ops).length, 0);
const summary = `${String(Object.keys(document.paths).length)} path(s), ${String(operations)} operation(s)`;

if (operations === 0) {
  console.error(
    'openapi: the document describes NO operations. Refusing to treat that as current.',
  );
  process.exit(1);
}

if (checkOnly) {
  if (stale === null) {
    console.log(`openapi: apps/api/openapi.json is current — ${summary}.`);
    process.exit(0);
  }

  console.error(
    `openapi: apps/api/openapi.json is STALE — ${stale}.\n` +
      '  Regenerate with `pnpm --filter @irodora/api generate:openapi`.\n' +
      '  Do not edit it by hand; it is derived from the route registry.',
  );
  process.exit(1);
}

if (stale === null) {
  console.log(`openapi: apps/api/openapi.json already current — ${summary}.`);
  process.exit(0);
}

writeFileSync(DOCUMENT, generated);
console.log(`openapi: wrote apps/api/openapi.json — ${summary} (was: ${stale}).`);
