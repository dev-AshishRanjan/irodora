#!/usr/bin/env node
/**
 * Irodora — run a turbo task with the running toolchain in the cache key.
 *
 * ## The failure this exists to stop
 *
 * `pnpm test` printed **31 successful, 31 total — 26 cached** while the same command with
 * `--force` was **red in four tests**. Part of that was a test reading outside its package;
 * the rest was this: **turbo's global hash contains no fact about the runtime executing it.**
 *
 * `turbo run test --dry=json` shows exactly what it does contain:
 *
 * ```
 * files:   { ".nvmrc": <git blob>, "tsconfig.base.json": <git blob>, … }
 * engines: { "node": ">=24.19.0 <25", "pnpm": ">=11.0.0" }
 * env:     ["NODE_ENV"]
 * ```
 *
 * `.nvmrc` is hashed as **the file that requests a version**, not the one running. `engines` is
 * a **range**. So a cache produced under Node 24 is replayed under Node 22 — and the tests that
 * differ between V8 builds are precisely the bitwise ones this product's central guarantee
 * rests on. WCAG contrast came back `4.500078715444717` against a pinned `…719`: two units in
 * the last place, a hard failure, and invisible behind a cache hit.
 *
 * ## Why a wrapper rather than a preflight in the script chain
 *
 * `globalDependencies` hashes **tracked** files, so a generated toolchain file would not be
 * seen. `globalEnv` hashes **values**, which is the mechanism that fits — but a `&&`-chained
 * preflight cannot mutate its sibling's environment, and `FOO=x cmd` is not portable to
 * Windows. So the thing that knows the toolchain has to be the thing that starts turbo.
 *
 * ## Warn, do not refuse — and why the keying is the part that must be airtight
 *
 * A mismatched run produces a **false red** (the pinned toolchain would be green). A replayed
 * cache produces a **false green**. Only one of those is dangerous, so the guarantee this file
 * makes is about the cache: a run on an unsupported toolchain can neither reuse nor produce an
 * entry that a supported run would consume, because `IRODORA_TOOLCHAIN` carries the exact
 * versions and is declared in `globalEnv`.
 *
 * Refusing outright was considered and rejected — see
 * [ADR-0068](../docs/adr/0068-a-gate-on-an-unsupported-toolchain-warns-and-re-keys-rather-than-refusing.md).
 * The short version: this workstation cannot run `pnpm install` at all, and a repository change
 * cannot upgrade anybody's Node.
 *
 * ## The two comparisons are deliberately different
 *
 * **Keying is exact** — 24.19.0 and 24.20.0 are different cache namespaces, because nothing
 * says a patch release cannot move a transcendental by an ULP.
 *
 * **Warning is by major version** — because a warning that fires on a legitimate setup is a
 * warning people learn to scroll past, and that is worse than not printing one.
 *
 * Usage:
 *   node scripts/gate.mjs test
 *   node scripts/gate.mjs test --force --filter=@irodora/ui
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const [task, ...rest] = process.argv.slice(2);
if (task === undefined) {
  console.error('usage: node scripts/gate.mjs <turbo-task> [turbo args…]');
  process.exit(2);
}

const pinned = readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim();
const running = process.versions.node;

/**
 * The pnpm version, from the user agent pnpm sets when it runs a script.
 *
 * Read rather than executed: shelling out to `pnpm --version` costs a process on every gate to
 * learn something the environment already says. `unknown` when the script was invoked directly
 * by node, which is honest — and it still varies the key when it changes.
 */
const packageManager = /\b(pnpm|npm|yarn)\/(\S+)/u.exec(process.env['npm_config_user_agent'] ?? '');
const pm = packageManager === null ? 'unknown' : `${packageManager[1]}@${packageManager[2]}`;

const major = (v) => v.split('.')[0];
const supported = major(running) === major(pinned);

if (!supported) {
  console.log(
    `\n${YELLOW}${BOLD}!${OFF} ${BOLD}This is Node ${running}; the repository pins ${pinned}.${OFF}\n` +
      `${DIM}  The result below is not evidence for a release. The bitwise identity and golden\n` +
      `  fixtures are exact to the last bit and V8 builds disagree on transcendentals, so a red\n` +
      `  run here may be the toolchain rather than the code (F-083, F-093).\n\n` +
      `  It is keyed separately, so nothing cached here can be replayed as a supported run and\n` +
      `  nothing from a supported run is replayed here. Upgrade with \`nvm use\`.${OFF}\n`,
  );
}

/**
 * The cache namespace. Declared in `turbo.json`'s `globalEnv`, which is what puts it in the
 * hash — this file setting it is only half, and the half that is easy to forget.
 */
const env = { ...process.env, IRODORA_TOOLCHAIN: `node@${running} ${pm}` };

const bin = join(
  ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'turbo.CMD' : 'turbo',
);
const windows = process.platform === 'win32';
const result = spawnSync(windows ? `"${bin}"` : bin, ['run', task, ...rest], {
  stdio: 'inherit',
  env,
  // A `.CMD` shim is not an executable image; Windows needs a shell to run it. The path is
  // quoted above for the same reason — `shell: true` re-parses the command line, and this
  // repository can sit under a path with a space in it.
  shell: windows,
});

if (result.error) {
  console.error(`\n${RED}${BOLD}Could not start turbo.${OFF} ${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);
