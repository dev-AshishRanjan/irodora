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
import { dirname, resolve } from 'node:path';
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
