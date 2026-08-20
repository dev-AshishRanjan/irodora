/**
 * Reading a corpus off disk.
 *
 * This is where the filesystem lives. `packages/corpus/src` may not import `node:*` — it is
 * imported by `packages/color-naming` (F-013), which is inside the colour-engine zone and must
 * be byte-identical in Node, the browser and React Native (NFR-3). The ESLint portability
 * override and boundary guard #11 enforce that; this module is the other half of the bargain.
 *
 * Shared by `generate-corpus.mjs` (which writes a version) and `verify-content.mjs` (gate 11).
 * One reader, so the gate and the generator can never disagree about what is on disk.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * SHA-256 over UTF-8, as the corpus digest seam expects.
 *
 * `assertSha256` checks this against published vectors before it is trusted anywhere — a
 * checksum is a tamper control and it cannot rest on an unverified primitive.
 */
export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/**
 * Load the built corpus package.
 *
 * `pathToFileURL`, not the bare path: on Windows an absolute path starts with a drive letter,
 * which the ESM loader reads as a URL scheme and rejects.
 */
export async function loadCorpusPackage() {
  const dist = join(ROOT, 'packages', 'corpus', 'dist', 'index.js');
  if (!existsSync(dist))
    throw new Error(
      `@irodora/corpus is not built (${dist} is missing). Run \`pnpm build\` first — this ` +
        'script deliberately uses the built package rather than re-implementing the rules, ' +
        'so the gate and the tests run the same code.',
    );
  return import(pathToFileURL(dist).href);
}

/** Every `*.json` in a directory, sorted, with its filename. Missing directory → `[]`. */
export function readJsonDir(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      let value;
      try {
        value = JSON.parse(text);
      } catch (error) {
        throw new Error(`${name}: is not valid JSON — ${error.message}`, { cause: error });
      }
      return { file: name, value, text };
    });
}

export function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Read one corpus root — a directory holding `colors/`, `palettes/`, `editors.json` and
 * `versions/`.
 *
 * `registerPath` is separate because the real corpus reads it from a governed document in
 * `docs/`, while a fixture corpus carries its own copy. Both go through the same parser.
 *
 * **Nothing here is optional-with-a-default.** A missing `editors.json` throws rather than
 * yielding an empty roster: "there are no editors" and "I could not find the editors" are
 * opposite facts, and only one of them means a record may proceed
 * [[a-gate-that-errors-is-failing-open]].
 */
export function readCorpusRoot(corpus, { root, registerPath, allowFixtureSlugs = false }) {
  const { parseEntry, parsePalette, parseRegister, parseRoster, parseLedger, CorpusError } = corpus;

  const failures = [];
  const push = (error) => {
    if (error instanceof CorpusError) failures.push(error);
    else throw error;
  };

  const rosterPath = join(root, 'editors.json');
  if (!existsSync(rosterPath))
    throw new Error(
      `${rosterPath} is missing. The editorial identity check cannot run without the roster, ` +
        'and a check that cannot run must fail rather than pass.',
    );
  const roster = parseRoster(readJsonFile(rosterPath), 'editors.json');

  if (!existsSync(registerPath))
    throw new Error(`${registerPath} is missing — the source register cannot be read.`);
  const register = parseRegister(readFileSync(registerPath, 'utf8'), registerPath);

  const entries = [];
  for (const { file, value } of readJsonDir(join(root, 'colors'))) {
    try {
      entries.push({ file, record: parseEntry(value, file) });
    } catch (error) {
      push(error);
    }
  }

  const palettes = [];
  for (const { file, value } of readJsonDir(join(root, 'palettes'))) {
    try {
      palettes.push({ file, record: parsePalette(value, file) });
    } catch (error) {
      push(error);
    }
  }

  const ledgerPath = join(root, 'versions', 'index.json');
  const ledger = existsSync(ledgerPath)
    ? parseLedger(readJsonFile(ledgerPath), 'versions/index.json')
    : [];

  return { roster, register, entries, palettes, ledger, failures, allowFixtureSlugs };
}
