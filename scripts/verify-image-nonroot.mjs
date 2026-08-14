#!/usr/bin/env node
/**
 * Irodora — proof that the container images do not run as root.
 *
 * A `USER node` line in a Dockerfile is a CLAIM. It is also easy to defeat by accident: a
 * later stage that inherits from a base without it, a `COPY --chown` that misses, a
 * refactor that moves the line above something that needs privileges and gets "fixed" by
 * moving it back down. None of that fails a build.
 *
 * The fact is what uid the process actually runs as, and the only way to know is to start
 * the image and ask it. That is what this does.
 *
 * Same discipline as scripts/verify-guards.mjs, applied to images instead of lint rules.
 */

import { execFileSync } from 'node:child_process';

const IMAGES = [
  { tag: 'irodora/api:dev', dockerfile: 'infra/docker/Dockerfile.api' },
  { tag: 'irodora/worker:dev', dockerfile: 'infra/docker/Dockerfile.worker' },
  // Dockerfile.web lands with F-017 — apps/web is a stub with no Next.js, and an image
  // that cannot be built is not a Dockerfile, it is a wish.
];

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

console.log(`\n${BOLD}Irodora — container images run as a non-root user${OFF}\n`);

function docker(args) {
  return execFileSync('docker', args, { stdio: 'pipe', encoding: 'utf8' }).trim();
}

try {
  docker(['version', '--format', '{{.Server.Version}}']);
} catch {
  console.log(`  ${RED}✗ the Docker daemon is not reachable${OFF}`);
  console.log(`    ${DIM}This check COULD NOT RUN. That is not the same as passing — start Docker`);
  console.log(`         Desktop and run it again.${OFF}\n`);
  process.exit(1);
}

const failures = [];

for (const image of IMAGES) {
  let uid;
  try {
    uid = docker(['run', '--rm', '--entrypoint', 'id', image.tag, '-u']);
  } catch (error) {
    failures.push({
      image,
      reason: `could not start the image: ${error.message.split('\n')[0]}`,
    });
    continue;
  }

  if (uid === '0') {
    failures.push({
      image,
      reason: 'the container runs as uid 0 (root)',
    });
    continue;
  }

  console.log(`  ${GREEN}✓${OFF} ${image.tag} runs as uid ${uid}`);
  console.log(`    ${DIM}${image.dockerfile}${OFF}`);
}

if (failures.length) {
  console.log(`\n${RED}${BOLD}${failures.length} image(s) FAILED${OFF}\n`);
  for (const { image, reason } of failures) {
    console.log(`  ${RED}✗ ${image.tag}${OFF}`);
    console.log(`    ${DIM}what:${OFF} ${reason}`);
    console.log(
      `    ${DIM}why it matters:${OFF} a container escape from a root process is a host compromise;`,
    );
    console.log(`         from an unprivileged one it is usually not.`);
    console.log(
      `    ${DIM}fix:${OFF} restore USER in ${image.dockerfile} — do NOT delete this check\n`,
    );
  }
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}All ${IMAGES.length} image(s) run unprivileged.${OFF}\n`);
