#!/usr/bin/env node
/**
 * Irodora — the cloud profile's Terraform is syntactically valid and correctly formatted.
 *
 * Runs Terraform **in a container**, pinned by digest, so nothing has to be installed on a
 * workstation or a CI runner beyond Docker. That is the same principle the deployment story
 * rests on: the tool is part of the artefact, not part of the machine.
 *
 * What this proves: the configuration parses, its provider constraints resolve, and every
 * reference inside it exists. What it does NOT prove: that applying it produces working
 * infrastructure, or that remote state is configured — both need a cloud account and are
 * recorded as attested obligations on F-005 (ADR-0038).
 *
 * `terraform validate` with `-backend=false`, deliberately: initialising the real backend
 * would need credentials and a bucket, and a check that requires production access is a
 * check that stops being run.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(ROOT, 'infra/terraform');

// Pinned by digest. A moving `:1.9` tag would mean a green run today and a red one
// tomorrow on a file nobody edited.
const IMAGE =
  'hashicorp/terraform@sha256:18f9986038bbaf02cf49db9c09261c778161c51dcc7fb7e355ae8938459428cd';

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

console.log(`\n${BOLD}Irodora — cloud profile (Terraform)${OFF}\n`);

/** Docker needs a native path; Windows drive letters must not be POSIX-ified. */
const mount = DIR.replace(/\\/g, '/');

function terraform(args) {
  return execFileSync(
    'docker',
    ['run', '--rm', '-v', `${mount}:/work`, '-w', '/work', IMAGE, ...args],
    { stdio: 'pipe', encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } },
  );
}

try {
  execFileSync('docker', ['version', '--format', '{{.Server.Version}}'], { stdio: 'pipe' });
} catch {
  console.log(`  ${RED}✗ the Docker daemon is not reachable${OFF}`);
  console.log(`    ${DIM}This check COULD NOT RUN, which is not the same as passing. Start Docker`);
  console.log(`         Desktop and run it again.${OFF}\n`);
  process.exit(1);
}

const steps = [
  ['formatting', ['fmt', '-check', '-recursive']],
  ['initialisation (no backend)', ['init', '-backend=false', '-input=false']],
  ['validation', ['validate']],
];

for (const [label, args] of steps) {
  try {
    terraform(args);
    console.log(`  ${GREEN}✓${OFF} ${label}`);
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    console.log(`\n  ${RED}✗ ${label} failed${OFF}\n`);
    console.log(
      output
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n'),
    );
    console.log(`\n${RED}${BOLD}Terraform check FAILED.${OFF}\n`);
    process.exit(1);
  }
}

console.log(`\n${GREEN}${BOLD}infra/terraform is valid.${OFF}`);
console.log(
  `${DIM}Not proven here: that applying it works, or that remote state exists — both attested on F-005.${OFF}\n`,
);
