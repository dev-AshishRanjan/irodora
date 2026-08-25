#!/usr/bin/env node
/**
 * Irodora — no signing key material is tracked by git.
 *
 * ## Why this exists
 *
 * On 2026-08-24 a release keystore — `irodora-release.p12`, generated in the repository root
 * by following `docs/operations/signing-and-credentials.md` — was **committed and pushed to a
 * public repository** by a `git add -A` in an unrelated commit. The private key was
 * downloadable by anyone for as long as it took to notice. It had to be destroyed and
 * regenerated.
 *
 * Three things were in place and none of them stopped it:
 *
 * - **`.gitignore` had `*.keystore` and `*.key`.** It did not have `*.p12`, because the
 *   keytool path produces `.keystore` and the openssl path — added later, for a machine with
 *   no JDK — produces `.p12`. The instruction changed and the ignore list did not follow it.
 * - **The documentation said "NEVER put the keystore in the repository".** Prose does not
 *   stop `git add -A`.
 * - **gitleaks runs on every push.** It matches secret *patterns* in text. A PKCS#12 is a
 *   binary DER blob with no pattern to match, so it walked straight past.
 *
 * ## What this checks, and why it is `git ls-files` rather than a directory walk
 *
 * **Tracked, not present.** A keystore sitting in the working tree is correct and necessary —
 * it is how a person signs. The failure is it being *tracked*, and `.gitignore` cannot prevent
 * that: an ignored file added with `git add -f`, or added before the rule existed, is tracked
 * for ever and silently.
 *
 * So the question is asked of the index, which is the thing that is actually wrong.
 *
 * ## Where it runs
 *
 * Inside gate 15, beside the secret scan, because it is the same question asked of a file type
 * gitleaks cannot see.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * Extensions that carry private keys or signing identities.
 *
 * `.crt`, `.cer` and `.der` are PUBLIC certificates and are listed anyway. Not because they
 * are secret — the release fingerprint is published deliberately — but because they arrive in
 * the same `openssl` command as the private key, and a rule that admits the harmless half of a
 * pair invites the other half in behind it.
 */
const KEY_MATERIAL = [
  '.p12',
  '.pfx',
  '.jks',
  '.keystore',
  '.key',
  '.pem',
  '.crt',
  '.cer',
  '.der',
  '.p8',
  '.mobileprovision',
];

/**
 * The exceptions, each an explicit path rather than a glob.
 *
 * A glob here would be the hole: `**\/debug.keystore` reads as "the Android debug key" and
 * matches any file with that name anywhere, including one somebody put beside a real one.
 */
const ALLOWED = new Set([
  // The public React Native debug key. Its password is `android` and it is in every RN
  // project on earth; it signs nothing anyone should trust, and the template needs it.
  'apps/mobile/android/app/debug.keystore',
]);

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const found = tracked.filter(
  (f) => KEY_MATERIAL.some((ext) => f.toLowerCase().endsWith(ext)) && !ALLOWED.has(f),
);

console.log(`\n${BOLD}Irodora — tracked key material${OFF}\n`);
console.log(
  `${DIM}  ${String(tracked.length)} tracked file(s) scanned for ${String(KEY_MATERIAL.length)} key-material extensions${OFF}`,
);
console.log(
  `  ${YELLOW}!${OFF} ${DIM}NOT CHECKED HERE: key material under a name this list does not cover, ` +
    `and anything already in git HISTORY. This asks what is tracked NOW — a key that was ` +
    `committed and later removed is still compromised, and the answer to that is rotation, ` +
    `not a gate.${OFF}`,
);

if (found.length) {
  console.log(`\n${RED}${BOLD}${String(found.length)} tracked file(s) carry key material${OFF}\n`);
  for (const f of found) console.log(`  ${RED}✗ ${f}${OFF}`);
  console.log(
    `\n  ${DIM}A keystore in the working tree is fine — it is how a person signs. TRACKED is the\n` +
      `  failure, and .gitignore cannot prevent it: a file added with -f, or added before the\n` +
      `  rule existed, stays tracked silently.\n\n` +
      `  Untrack it:  git rm --cached <file>\n\n` +
      `  AND IF IT WAS EVER PUSHED, untracking is not enough. The key is compromised: treat\n` +
      `  every artefact signed with it as untrusted, generate a new one, rotate the repository\n` +
      `  secrets and publish the new fingerprint. See docs/operations/signing-and-credentials.md.${OFF}\n`,
  );
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}No key material is tracked.${OFF}\n`);

/**
 * The second question: is a key **pasted into source**?
 *
 * The scan above asks about file types gitleaks cannot read. This one asks about a 64-hex
 * literal in shipped source — the shape of a SQLCipher key (FR-56, *"never in the bundle"*).
 *
 * ## Why it lives here rather than in `packages/store`
 *
 * It was a test in `packages/store`, and it read `apps/mobile/src`. Turbo keys the `test` task
 * on the inputs of the package it runs in, so when F-018 generated a corpus bundle carrying
 * **126 SHA-256 digests** — also 64 hex characters — the check went red and its cached pass was
 * replayed for two whole features while `pnpm test` printed 31/31 successful.
 *
 * **A repository-wide check does not belong inside one package's test suite.** Not because
 * caching is hard to configure, but because the scope of the question and the scope of the
 * cache key disagree by construction, and nothing reports that. Here there is no cache at all,
 * and gate 15 is `requiredFor: always` rather than `requiredFor: code`.
 *
 * ## The discriminator is the ledger, not a path
 *
 * A SHA-256 digest and a database key are the same shape. The tempting repair was to skip
 * `**\/generated/**`, and it is the wrong one: a key written into a generated file is exactly
 * as dangerous as one written by hand, and that would switch the check off for a directory to
 * remove one class of false positive.
 *
 * So a 64-hex literal is an offender **unless `content/versions/` records it as a digest**. A
 * database key is not in the corpus ledger and never could be — the ledger is built from
 * corpus content. The check therefore stays total over the same files.
 */

/** Directories whose `.ts`/`.tsx` files ship. */
const SHIPPED = [join(ROOT, 'packages'), join(ROOT, 'apps')];

/**
 * Published SHA-256 vectors, accounted for by **exact value**.
 *
 * `packages/corpus/src/digest.ts` carries these to prove that the digest function injected
 * into the corpus loader really is SHA-256 — an injected stub returning a constant passes
 * every other test in that package and fails there. They are legitimate 64-hex literals in
 * shipped source and there is no rule of shape that separates them from a key.
 *
 * The first three are FIPS 180-4; the fourth is `藍鼠` hashed with `node:crypto`, labelled at
 * its definition as ours rather than published, and included because it catches a hasher
 * encoding UTF-16 instead of UTF-8.
 *
 * **Exact values, never a path.** Exempting `digest.ts` would let a key be pasted beside them.
 * Listed here rather than read from the module because gate 15 is `requiredFor: always` and
 * must not depend on `packages/corpus/dist` existing — and because a fifth vector going red
 * until somebody adds it here deliberately is the right amount of friction for the claim
 * *"this 64-hex literal is not a key"*.
 */
const PUBLISHED_VECTORS = [
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  '2e4f11086a73e790e15a5ad94911828c116dd78cd9bbec7da72bf043c538655a',
];

/** Every 64-hex string the committed corpus ledger records. */
function ledgerDigests() {
  const dir = join(ROOT, 'content', 'versions');
  const found = new Set(PUBLISHED_VECTORS);
  if (!existsSync(dir)) return found;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    for (const m of readFileSync(join(dir, file), 'utf8').matchAll(/\b[0-9a-f]{64}\b/gu))
      found.add(m[0]);
  }
  return found;
}

/** `src/` files under a shipped root. `test/` is excluded BY PATH — fixtures live there. */
function shippedSources(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'test') continue;
      shippedSources(full, out);
      continue;
    }
    if (/\.tsx?$/u.test(e.name)) out.push(full);
  }
  return out;
}

/** A 64-hex literal that is not a digest the ledger records. */
export function unaccountedHex(source, ledger) {
  return [...source.matchAll(/['"`]([0-9a-fA-F]{64})['"`]/gu)]
    .map((m) => m[1] ?? '')
    .filter((hex) => !ledger.has(hex.toLowerCase()));
}

const ledger = ledgerDigests();
const sources = SHIPPED.flatMap((d) => shippedSources(d));

console.log(`\n${BOLD}Irodora — no key pasted into source${OFF}\n`);
console.log(
  `${DIM}  ${String(sources.length)} shipped source file(s) scanned; ` +
    `${String(ledger.size)} ledger digest(s) accounted for${OFF}`,
);

/*
 * THE GATE MUST KNOW IT FOUND ITS INPUTS. An empty ledger would make every digest unaccounted
 * — a loud failure, which is the safe direction — but an empty SOURCE list would make the scan
 * pass over nothing at all [[a-gate-that-errors-is-failing-open]].
 */
if (sources.length === 0) {
  console.log(
    `\n${RED}${BOLD}Cannot run.${OFF} No shipped source found under packages/ or apps/.\n` +
      'A scan over an empty set has not passed; it has not run.\n',
  );
  process.exit(1);
}

/*
 * THE DECOY, on every run. The check now has an allow-list, which is the shape that stops
 * discriminating without anyone noticing [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
 * A real digest must be silent and a key-shaped literal must be reported, every time.
 */
const probeDigest = [...ledger][0];
const probeKey = `${'f'.repeat(63)}0`;
if (probeDigest !== undefined) {
  if (unaccountedHex(`const D = '${probeDigest}';`, ledger).length > 0) {
    console.log(`\n${RED}${BOLD}The scan reported a digest the ledger records.${OFF}\n`);
    process.exit(1);
  }
  if (unaccountedHex(`const KEY = '${probeKey}';`, ledger).length !== 1) {
    console.log(
      `\n${RED}${BOLD}The scan did not report a planted key literal.${OFF}\n` +
        'A check that cannot fire and a check that has nothing to report look identical.\n',
    );
    process.exit(1);
  }
}

const pasted = sources
  .map((f) => ({ file: relative(ROOT, f), hits: unaccountedHex(readFileSync(f, 'utf8'), ledger) }))
  .filter((r) => r.hits.length > 0);

if (pasted.length) {
  console.log(
    `\n${RED}${BOLD}${String(pasted.length)} file(s) carry a 64-hex literal the ledger does not record${OFF}\n`,
  );
  for (const { file, hits } of pasted)
    console.log(`  ${RED}✗ ${file}${OFF} ${DIM}${hits.join(', ')}${OFF}`);
  console.log(
    `\n  ${DIM}A 64-hex literal is the shape of a SQLCipher key, and FR-56 says a key is never\n` +
      `  in the bundle. If this is a corpus digest, it belongs in content/versions/ and the\n` +
      `  module should be regenerated. If it is a key, it is compromised: rotate it.${OFF}\n`,
  );
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}No key is pasted into shipped source.${OFF}\n`);
