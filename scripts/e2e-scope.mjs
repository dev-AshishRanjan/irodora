/**
 * Say what gate 7 actually covers, on every run.
 *
 * Gate 7's charter is broader than what exists. It names the human journeys, the accessibility
 * assertions, a simulated-CVD journey, the NFR-12 assertion that a Lens scan transmits nothing,
 * and the two things a local-first app cannot ship without — that data survives a restart, and
 * that an export can be re-imported.
 *
 * **The API half of this charter was retired with the server tier** ([ADR-0051](
 * ../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)). What replaced
 * it is not smaller: on a device, "no image left the phone" is a stronger claim than "the
 * request carried no image", and it is checkable as *the process opened no socket*.
 *
 * A gate whose charter outruns its subject has two honest options: leave it pending until the
 * whole charter is met, or activate it and say on every run what it does not cover. Gate 7 is
 * **pending** today for a reason this file enforces: nothing in the workspace declares a
 * `test:e2e` task, so there is no surface to run. It activates with F-039, the Expo app.
 *
 * It **fails if it finds no surface to run**. `pnpm test:e2e` was once `turbo run test:e2e` with
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
 * exist for another reason. When the file lands, the line flips on its own.
 */
const CHARTER = [
  {
    item: 'human journeys against the running app',
    requires: 'apps/mobile/e2e',
    feature: 'F-039',
  },
  {
    item: 'accessibility assertions — roles, labels, focus order (gate 8)',
    requires: 'apps/mobile/e2e/a11y',
    feature: 'F-039',
  },
  {
    item: 'simulated-CVD journey',
    requires: 'apps/mobile/e2e/cvd',
    feature: 'F-039',
  },
  {
    item: 'NFR-12: a Lens scan opens no socket',
    requires: 'apps/mobile/e2e/offline',
    feature: 'F-040',
  },
  {
    item: 'local data survives a cold restart',
    requires: 'apps/mobile/e2e/persistence',
    feature: 'F-041',
  },
  {
    item: 'an export re-imports to a byte-identical database',
    requires: 'apps/mobile/e2e/backup',
    feature: 'F-041',
  },
];

const surfaces = surfacesWithE2e();

console.log('\nGate 7 — e2e scope\n');

if (surfaces.length === 0) {
  console.error(
    '  NO surface declares a `test:e2e` script. Gate 7 would pass over an empty set, which is\n' +
      '  a gate failing open. Refusing to report that as coverage.\n\n' +
      '  This is expected while gate 7 is `pending`: the API surface it used to run went with\n' +
      '  the server tier (ADR-0051) and the app surface arrives with F-039. gates.json records\n' +
      '  the gate as pending with ciStep:false, so CI does not invoke this script yet. If you\n' +
      '  are seeing this from CI, the gate was activated without a surface to run.\n',
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
      '  A green gate 7 means what the covered lines above say it means, and nothing more.\n',
  );
} else {
  console.log('\n  Every charter item is covered.\n');
}
