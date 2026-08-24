#!/usr/bin/env node
/**
 * Irodora — the proof that the claims lint can fail (F-025, acceptance criterion 4).
 *
 * A gate nobody has watched fail is configuration that parses. This plants each banned
 * construction into a real file the lint scans, asserts the lint goes red **and names the right
 * construction**, then restores — with the baseline asserted green before and after every case.
 *
 * ## Two things it proves that a simpler proof would not
 *
 * **One case must stay GREEN.** `packages/testing/fixtures/claims/clean.md` is copied in
 * unmutated. A proof where everything is red cannot distinguish a working gate from one that
 * fails on everything — and this repository has already shipped a decoy that did not
 * discriminate, twice.
 *
 * **The marker must be checked in both directions.** A `claims-ok:` marker with a real reason
 * must SUPPRESS a finding; a bare marker with no reason must ITSELF be a finding. An exemption
 * nobody had to justify is not an exemption, it is a way to turn the gate off, and a proof that
 * only tests the suppressing direction would not notice.
 *
 * The mutation target is a real path under `docs/`, not the fixture directory, because the
 * fixture directory is excluded from the scan — planting there would prove only that excluded
 * files are excluded.
 */

import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciError } from './annotate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LINT = join(ROOT, 'scripts/verify-claims.mjs');
const FIXTURE = join(ROOT, 'packages/testing/fixtures/claims/clean.md');

// A real, scanned path. Removed in `finally`; its directory is created only if absent.
const TARGET = join(ROOT, 'docs/__claims_proof__.md');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

if (!existsSync(FIXTURE)) {
  console.error(
    `${RED}claims-proof: fixture missing at ${FIXTURE}. Refusing to prove nothing.${OFF}`,
  );
  process.exit(1);
}
if (existsSync(TARGET)) {
  console.error(`${RED}claims-proof: ${TARGET} already exists. Refusing to overwrite it.${OFF}`);
  process.exit(1);
}

const clean = readFileSync(FIXTURE, 'utf8');

/** Runs the lint. Returns {code, out}. Never throws on a non-zero exit — that is the signal. */
function runLint() {
  try {
    const out = execFileSync(process.execPath, [LINT], { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

const config = JSON.parse(readFileSync(join(ROOT, '.harness/verification/claims.json'), 'utf8'));

/** One case per banned construction, plus the two marker directions. */
const CASES = [
  ...config.banned.map((b) => ({
    name: `banned: ${b.id}`,
    body: `# Proof\n\nThis copy says ${sampleFor(b.id)} and must be caught.\n`,
    expect: 'red',
    names: b.id,
  })),
  {
    name: 'a bare claims-ok: marker with no reason is ITSELF a finding',
    body: `# Proof\n\nA line about the exact colour of a garment. claims-ok:\n`,
    expect: 'red',
    names: 'bare-marker',
  },
  {
    name: 'a claims-ok: marker WITH a reason suppresses the finding',
    body: `# Proof\n\nA line about the exact colour of a garment. claims-ok: this line documents the banned phrase for the proof suite\n`,
    expect: 'green',
  },
  {
    name: 'the clean fixture, unmutated — must stay GREEN',
    body: clean,
    expect: 'green',
  },
];

/** A phrase that trips each pattern. Written out rather than generated from the regex, so a
 *  pattern that stops matching real prose is caught rather than silently still matching itself. */
function sampleFor(id) {
  return {
    'exact-colour': 'we show the exact colour of your shirt',
    'true-colour': 'this is the true colour of the fabric',
    'actual-colour': 'the actual colour is shown below',
    'percent-accurate': 'our detection is 99% accurate',
    'perfect-match': 'we found a perfect match',
    'lab-accurate': 'lab-accurate results on any phone',
    'professional-grade': 'professional-grade colour capture',
    'guaranteed-accuracy': 'guaranteed accuracy on every scan',
    'ai-powered': 'AI-powered colour detection',
    'measures-the-colour': 'the app measures the colour precisely',
    'is-exact-match-identifier': 'the response carries isExactMatch as a field',
  }[id];
}

const missing = config.banned.filter((b) => !sampleFor(b.id));
if (missing.length > 0) {
  console.error(
    `${RED}claims-proof: no sample phrase for ${missing.map((m) => m.id).join(', ')}.${OFF}\n` +
      `  Every banned construction needs a case, or the proof silently covers less than the gate.\n`,
  );
  process.exit(1);
}

console.log(`\n${BOLD}Irodora — claims lint mutation proof${OFF}`);
console.log(
  `${DIM}  ${String(CASES.length)} case(s) · target ${'docs/__claims_proof__.md'}${OFF}\n`,
);

let failures = 0;

try {
  const baseline = runLint();
  if (baseline.code !== 0) {
    console.error(
      `${RED}claims-proof: the BASELINE is already red. Nothing below is interpretable.${OFF}`,
    );
    console.error(baseline.out);
    process.exit(1);
  }

  mkdirSync(dirname(TARGET), { recursive: true });

  for (const c of CASES) {
    writeFileSync(TARGET, c.body, 'utf8');
    const result = runLint();
    rmSync(TARGET, { force: true });

    const wentRed = result.code !== 0;
    const wanted = c.expect === 'red';
    let ok = wentRed === wanted;

    // Red is not enough: it must be red for the RIGHT reason.
    if (ok && wanted && c.names && !result.out.includes(c.names)) {
      ok = false;
      console.error(
        `${RED}BAD ${c.name}: went red, but did not name "${c.names}" — red for the wrong reason.${OFF}`,
      );
    } else {
      console.log(
        `${ok ? `${GREEN}OK ` : `${RED}BAD`}${OFF} ${c.name}: ${DIM}exit ${String(result.code)}, expected ${c.expect}${OFF}`,
      );
    }

    if (!ok) failures++;

    const after = runLint();
    if (after.code !== 0) {
      console.error(`${RED}claims-proof: baseline did not recover after "${c.name}".${OFF}`);
      failures++;
      break;
    }
  }
} finally {
  rmSync(TARGET, { force: true });
  if (existsSync(TARGET)) console.error(`${RED}claims-proof: FAILED TO REMOVE ${TARGET}.${OFF}`);
}

if (failures > 0) {
  console.error(`\n${RED}${BOLD}AT LEAST ONE PROOF FAILED.${OFF} ${String(failures)} case(s).\n`);
  ciError(
    `gate 2 claims mutation proof: ${String(failures)} case(s) did not discriminate`,
    'See the job log for the per-case detail; this annotation exists so the COUNT is visible ' +
      'without a token.',
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}All ${String(CASES.length)} cases discriminate.${OFF} ` +
    `${DIM}Baseline green before and after each one.${OFF}\n`,
);
