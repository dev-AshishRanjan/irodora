#!/usr/bin/env node
/**
 * Irodora — the production compose file stays portable across Coolify and Dokploy.
 *
 * F-005 claims the file is "consumed UNMODIFIED by both". Actually deploying to both needs a
 * VPS, and that half is recorded as an attested obligation (ADR-0038). But most of the risk
 * is not runtime — it is a set of STATIC properties of the file, and those are checkable
 * here, today, on every commit.
 *
 * Every rule below is something a platform rejects, overrides, or silently reinterprets.
 * None of them is a style preference; a rule nobody can name a failure for does not belong.
 *
 * Deliberately dependency-free: a small YAML reader for the subset this file uses, rather
 * than adding a parser to the root toolchain for one script. It is strict about what it does
 * not understand — an unparsable file FAILS rather than silently checking nothing.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'infra/compose/docker-compose.prod.yml';

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Parse the compose subset we use: two-space-indented mappings, `- ` sequences, scalars.
 * Comments and blank lines are dropped. Inline JSON-ish arrays are kept as raw strings —
 * the rules that care about them match textually.
 */
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, node: root }];

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    let content = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;

    if (content.startsWith('- ')) {
      const value = content.slice(2).trim();
      if (!Array.isArray(parent.__list)) parent.__list = [];
      parent.__list.push(value);
      continue;
    }

    const colon = content.indexOf(':');
    if (colon === -1) continue;

    const key = content.slice(0, colon).trim();
    const value = content.slice(colon + 1).trim();

    if (value === '') {
      const node = {};
      parent[key] = node;
      stack.push({ indent, node });
    } else {
      parent[key] = value;
    }
  }

  return root;
}

/** Flatten `{__list: [...]}` and nested maps into the raw text lines belonging to a service. */
function serviceBlocks(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^services:\s*$/.test(l));
  if (start === -1) return {};

  const blocks = {};
  let current = null;

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line) && line.trim()) break; // a new top-level key ends `services:`

    const service = /^ {2}([A-Za-z0-9_.-]+):\s*$/.exec(line);
    if (service) {
      current = service[1];
      blocks[current] = [];
      continue;
    }
    if (current) blocks[current].push(line);
  }

  return blocks;
}

const path = resolve(ROOT, FILE);
console.log(`\n${BOLD}Irodora — compose portability${OFF}\n`);

if (!existsSync(path)) {
  console.log(`  ${RED}✗ ${FILE} does not exist${OFF}\n`);
  process.exit(1);
}

const text = readFileSync(path, 'utf8');
const doc = parseYaml(text);
const blocks = serviceBlocks(text);
const services = Object.keys(blocks);

if (services.length === 0) {
  console.log(`  ${RED}✗ no services parsed from ${FILE}${OFF}`);
  console.log(`    ${DIM}This check COULD NOT RUN, which is not the same as passing.${OFF}\n`);
  process.exit(1);
}

const problems = [];
const note = (rule, service, what, why) => problems.push({ rule, service, what, why });

for (const [service, body] of Object.entries(blocks)) {
  const joined = body.join('\n');

  // --- naming ------------------------------------------------------------
  if (/^\s+container_name:/m.test(joined))
    note(
      'container_name',
      service,
      'sets container_name',
      'Coolify and Dokploy name containers themselves. A fixed name collides across projects on a shared host, and a second deploy fails to start.',
    );

  // --- networking --------------------------------------------------------
  if (/^\s+network_mode:\s*['"]?host/m.test(joined))
    note(
      'network_mode',
      service,
      'uses network_mode: host',
      'Both platforms route through their own Traefik on a managed network. Host networking bypasses it — no TLS, and the port is public.',
    );

  if (/^\s+ports:\s*$/m.test(joined))
    note(
      'ports',
      service,
      'publishes ports',
      'On a VPS a published port is reachable from the internet, bypassing the platform TLS termination. Use `expose` and let the proxy attach.',
    );

  // --- storage -----------------------------------------------------------
  // A host bind mount is `- /abs/path:/in/container` or `- ./relative:/in/container`.
  for (const m of joined.matchAll(/^\s+-\s+([./~][^\s:]*|[A-Za-z]:[\\/][^\s:]*):/gm))
    note(
      'bind-mount',
      service,
      `bind-mounts a host path (${m[1]})`,
      'The platform controls the filesystem layout and the path will not exist. Named volumes are the portable form, and they survive a redeploy.',
    );

  // --- images ------------------------------------------------------------
  const image = /^\s+image:\s*(\S+)/m.exec(joined);
  if (image) {
    const ref = image[1];
    if (!ref.includes('@sha256:'))
      note(
        'image-digest',
        service,
        `image is not pinned by digest (${ref})`,
        'A tag moves. Two deploys of "the same" compose file would then run different code, which makes a rollback a guess.',
      );
    if (/:latest\b/.test(ref))
      note('image-latest', service, 'image uses :latest', 'Never reproducible.');
  }

  // --- resilience --------------------------------------------------------
  if (!/^\s+restart:/m.test(joined))
    note(
      'restart',
      service,
      'has no restart policy',
      'A container that exits stays down until someone notices. Both platforms honour `restart`.',
    );

  if (!/^\s+healthcheck:\s*$/m.test(joined))
    note(
      'healthcheck',
      service,
      'has no healthcheck',
      'Without one, `depends_on: condition: service_healthy` cannot be satisfied and the platform has nothing to gate a rolling deploy on.',
    );

  // --- platform-specific escape hatches ----------------------------------
  if (/^\s+(deploy|configs|secrets):\s*$/m.test(joined))
    note(
      'swarm-key',
      service,
      'uses a Swarm-only key (deploy/configs/secrets)',
      'Dokploy runs Compose over Swarm and Coolify does not; a key that means something to one is ignored by the other, silently.',
    );

  if (/^\s+env_file:/m.test(joined))
    note(
      'env_file',
      service,
      'uses env_file',
      'The file is not in the platform build context. Both platforms inject environment from their own UI, so `environment:` with ${VAR} is the portable form.',
    );
}

// --- dependency conditions need healthchecks on the TARGET ----------------
for (const [service, body] of Object.entries(blocks)) {
  for (const m of body.join('\n').matchAll(/^\s{6}([A-Za-z0-9_.-]+):\s*$/gm)) {
    const target = m[1];
    if (!services.includes(target)) continue;
    if (!/^\s+healthcheck:\s*$/m.test(blocks[target].join('\n')))
      note(
        'depends-on-health',
        service,
        `depends_on ${target}, which has no healthcheck`,
        'The condition can never be satisfied, so the dependent service waits forever or starts too early depending on the platform.',
      );
  }
}

// --- volumes must be declared --------------------------------------------
const declared = Object.keys(doc.volumes ?? {});
for (const [service, body] of Object.entries(blocks))
  for (const m of body.join('\n').matchAll(/^\s+-\s+([A-Za-z0-9_-]+):\//gm))
    if (!declared.includes(m[1]))
      note(
        'undeclared-volume',
        service,
        `uses volume "${m[1]}" which is not in the top-level volumes:`,
        'Compose creates an anonymous volume instead, and the data is lost on the next redeploy.',
      );

if (problems.length) {
  console.log(`${RED}${BOLD}${problems.length} portability problem(s)${OFF}\n`);
  for (const p of problems) {
    console.log(`  ${RED}✗${OFF} ${BOLD}${p.service}${OFF} ${p.what}`);
    console.log(`    ${DIM}rule:${OFF} ${p.rule}`);
    console.log(`    ${DIM}why:${OFF}  ${p.why}\n`);
  }
  console.log(
    `${RED}${BOLD}FAILED.${OFF} "Consumed unmodified by both platforms" is a claim; these are the checks behind it.\n`,
  );
  process.exit(1);
}

console.log(`  ${GREEN}✓${OFF} ${services.length} services: ${services.join(', ')}`);
console.log(`  ${DIM}no platform-specific keys, images pinned by digest, volumes declared,${OFF}`);
console.log(`  ${DIM}every dependency condition backed by a healthcheck${OFF}`);
console.log(`\n${GREEN}${BOLD}${FILE} is portable.${OFF}\n`);
