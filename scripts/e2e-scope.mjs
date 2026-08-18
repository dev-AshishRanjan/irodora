/**
 * Say what gate 7 actually covers, on every run.
 *
 * Gate 7's charter is broader than what exists. It names Playwright, axe WCAG 2.2 A/AA, a
 * keyboard-only journey, a simulated-CVD journey, and the NFR-12 assertion that a Lens scan
 * transmits no image bytes — **all of which are the web surface**, and `apps/web` does not exist
 * until F-017. F-015 activates the gate for the API half.
 *
 * A gate whose charter outruns its subject has two honest options: leave it pending until the
 * whole charter is met, or activate it and say on every run what it does not cover. The first
 * means the API surface ships with no e2e gate at all for the whole of R1. So: the second, which
 * is gate 9's precedent — it prints, on every run, that the half of its charter scanning rendered
 * surfaces is not implemented.
 *
 * It also **fails if it finds no surface to run**. `pnpm test:e2e` was `turbo run test:e2e` with
 * nothing in the workspace declaring that task: a green gate over zero suites, which is the
 * failing-open shape this repository keeps finding and keeps answering the same way.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every workspace package that declares a `test:e2e` task. */
function surfacesWithE2e() {
  const found = [];
  for (const group of ['apps', 'packages', 'tests']) {
    const dir = join(ROOT, group);
    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(dir, entry.name, 'package.json');
      if (!existsSync(manifest)) continue;

      const parsed = JSON.parse(readFileSync(manifest, 'utf8'));
      if (parsed.scripts?.['test:e2e'] !== undefined)
        found.push({
          name: parsed.name ?? `${group}/${entry.name}`,
          path: `${group}/${entry.name}`,
        });
    }
  }
  return found;
}

/**
 * The charter items, and the FILE that supplies each.
 *
 * A file rather than a package, so an item cannot read as covered because its owner happens to
 * exist for another reason. `apps/api` exists today and covers the HTTP surface; it does not
 * cover tenancy, and it will not until F-034 writes the suite named here. When that file lands
 * the line flips on its own.
 */
const CHARTER = [
  {
    item: 'HTTP surface end to end (app.inject)',
    requires: 'apps/api/e2e/http.e2e.test.ts',
    feature: 'F-015',
  },
  {
    item: 'Playwright journeys against a real web server',
    requires: 'apps/web/e2e',
    feature: 'F-017',
  },
  { item: 'axe WCAG 2.2 A/AA assertions (gate 8)', requires: 'apps/web/e2e', feature: 'F-017' },
  { item: 'keyboard-only journey', requires: 'apps/web/e2e', feature: 'F-017' },
  { item: 'simulated-CVD journey', requires: 'apps/web/e2e', feature: 'F-017' },
  {
    item: 'NFR-12: a Lens scan transmits no image bytes',
    requires: 'apps/web/e2e',
    feature: 'F-020',
  },
  {
    item: 'tenancy negatives against a POPULATED decoy tenant',
    requires: 'apps/api/e2e/tenancy.e2e.test.ts',
    feature: 'F-034',
  },
];

const surfaces = surfacesWithE2e();

console.log('\nGate 7 — e2e scope\n');

if (surfaces.length === 0) {
  console.error(
    '  NO surface declares a `test:e2e` script. Gate 7 would pass over an empty set, which is\n' +
      '  a gate failing open. Refusing to report that as coverage.\n',
  );
  process.exit(1);
}

console.log(`  running: ${surfaces.map((surface) => surface.name).join(', ')}\n`);

const unmet = [];
for (const { item, requires, feature } of CHARTER) {
  if (existsSync(join(ROOT, requires))) console.log(`  covered      ${item}`);
  else unmet.push({ item, requires, feature });
}

if (unmet.length > 0) {
  console.log('');
  for (const { item, requires, feature } of unmet)
    console.log(`  NOT COVERED  ${item} — needs ${requires} (${feature})`);
  console.log(
    `\n  ${String(unmet.length)} of ${String(CHARTER.length)} charter items are not covered by this run.\n` +
      '  A green gate 7 today means the API surface passed. It does not mean the web surface\n' +
      '  was checked, because there is no web surface yet.\n',
  );
} else {
  console.log('\n  Every charter item is covered.\n');
}
