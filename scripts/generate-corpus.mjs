/**
 * Publish a corpus version — validate, derive, checksum, write.
 *
 * ```
 * content/colors/**   content/palettes/**
 *         ↓ validate → derive → checksum
 * content/versions/<label>.json     immutable bundle
 * content/versions/index.json       append-only ledger row
 * ```
 *
 * Usage:
 *
 * ```
 * node scripts/generate-corpus.mjs --label 2026.08.1
 * node scripts/generate-corpus.mjs --label 2026.08.1 --check     # verify, write nothing
 * node scripts/generate-corpus.mjs --root <dir> --register <md>  # a fixture corpus
 * ```
 *
 * `--check` is what CI and the `content` gate use: it regenerates in memory and compares
 * against what is on disk, so a bundle that was hand-edited — or one produced by a different
 * engine — fails rather than being silently rewritten. This is the ADR-0043 shape applied to a
 * different dataset, and for the same reason: generated output that nobody compares is
 * generated output nobody can trust.
 *
 * **It refuses to overwrite a published bundle.** Correcting an entry means publishing a NEW
 * version (FR-10, ADR-0046). Regenerating in place would destroy the values an old
 * recommendation needs to still resolve.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCorpusPackage, readCorpusRoot, ROOT, sha256 } from './corpus-io.mjs';

const GREEN = '[32m';
const RED = '[31m';
const DIM = '[2m';
const BOLD = '[1m';
const OFF = '[0m';

function arg(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : (process.argv[at + 1] ?? fallback);
}

const CHECK = process.argv.includes('--check');
const root = arg('root', join(ROOT, 'content'));
const registerPath = arg('register', join(ROOT, 'docs', 'content', 'licensing-and-provenance.md'));

const corpus = await loadCorpusPackage();
const {
  assertSha256,
  bundleRootDigest,
  checkCorpus,
  CORPUS_SCHEMA_VERSION,
  publishVersion,
  serialiseBundle,
} = corpus;

// Before anything is hashed. A checksum is a tamper control; it cannot rest on a primitive
// nobody checked.
assertSha256(sha256);

const { roster, register, entries, palettes, ledger, failures, allowFixtureSlugs } = readCorpusRoot(
  corpus,
  {
    root,
    registerPath,
    allowFixtureSlugs: process.argv.includes('--allow-fixture-slugs'),
  },
);

const publishable = entries.filter(({ record }) => record.status === 'published');
const label =
  arg('label') ?? publishable[0]?.record.versionId ?? entries[0]?.record.versionId ?? null;

console.log(`${BOLD}Irodora — corpus publish${OFF}`);
console.log(
  `${DIM}  ${root} · ${String(entries.length)} entr${entries.length === 1 ? 'y' : 'ies'}, ` +
    `${String(palettes.length)} palette(s)${CHECK ? ' · --check' : ''}${OFF}\n`,
);

const allFailures = [
  ...failures,
  ...checkCorpus({ entries, palettes, roster, register }, { allowFixtureSlugs }),
];

if (allFailures.length > 0) {
  console.log(`${RED}${BOLD}${String(allFailures.length)} record(s) rejected.${OFF}\n`);
  for (const failure of allFailures) console.log(`  ${RED}x${OFF} ${failure.message}\n`);
  console.log(`${RED}Nothing published. There is no partial publication.${OFF}`);
  process.exit(1);
}

if (label === null) {
  console.log(`${DIM}  No entries and no --label. Nothing to publish.${OFF}`);
  process.exit(0);
}

// The engine semver comes from the engine itself, never from a constant repeated here. It is
// stamped into the bundle so that when the gate later finds a derived value disagreeing with
// the current engine, the bundle can say which engine did agree with it (E-001).
const { ENGINE_VERSION } = await import(
  pathToFileURL(join(ROOT, 'packages', 'color-spaces', 'dist', 'index.js')).href
);

const bundle = publishVersion(
  label,
  entries.map(({ record }) => record),
  palettes.map(({ record }) => record),
  {
    engine: ENGINE_VERSION,
    corpusSchemaVersion: CORPUS_SCHEMA_VERSION,
    publishedAt: arg('published-at', new Date().toISOString().slice(0, 10)),
  },
  sha256,
);

const text = serialiseBundle(bundle);
const checksum = bundleRootDigest(bundle, sha256);
const bundlePath = join(root, 'versions', `${label}.json`);
const ledgerPath = join(root, 'versions', 'index.json');
const existingRow = ledger.find((row) => row.label === label);

if (CHECK) {
  let ok = true;
  if (!existsSync(bundlePath)) {
    console.log(`  ${RED}x${OFF} ${label}.json does not exist but would be produced`);
    ok = false;
  } else if (readFileSync(bundlePath, 'utf8') !== text) {
    console.log(
      `  ${RED}x${OFF} ${label}.json on disk differs from what the current engine and ` +
        'schema produce. Either it was hand-edited, or the engine moved — in which case ' +
        'publish a NEW version rather than regenerating this one (E-001, ADR-0046).',
    );
    ok = false;
  }
  if (existingRow === undefined) {
    console.log(`  ${RED}x${OFF} the ledger has no row for ${label}`);
    ok = false;
  } else if (existingRow.checksum !== checksum) {
    console.log(
      `  ${RED}x${OFF} ledger checksum for ${label} is ${existingRow.checksum}, computed ` +
        `${checksum}`,
    );
    ok = false;
  }
  if (!ok) process.exit(1);
  console.log(`${GREEN}${BOLD}Bundle and ledger agree with the current engine.${OFF}`);
  process.exit(0);
}

// A published version is immutable. Regenerating in place would destroy the values an old
// recommendation needs in order to still resolve (FR-10).
if (existsSync(bundlePath) && existingRow !== undefined) {
  console.log(
    `${RED}${BOLD}${label} is already published.${OFF} A published version is immutable — ` +
      'correct an entry by publishing a NEW version (ADR-0046). Delete nothing.',
  );
  process.exit(1);
}

mkdirSync(join(root, 'versions'), { recursive: true });
writeFileSync(bundlePath, text, 'utf8');

const rows = [
  ...ledger,
  {
    label,
    checksum,
    engine: bundle.engine,
    publishedAt: bundle.publishedAt,
    entryCount: bundle.entries.length,
  },
];
writeFileSync(ledgerPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

console.log(
  `  ${GREEN}+${OFF} ${label}.json  ${DIM}${String(bundle.entries.length)} entries${OFF}`,
);
console.log(`  ${GREEN}+${OFF} index.json  ${DIM}checksum ${checksum}${OFF}\n`);
console.log(`${GREEN}${BOLD}Published ${label}.${OFF}`);
