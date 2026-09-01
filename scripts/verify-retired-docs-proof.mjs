#!/usr/bin/env node
/**
 Irodora — proof that the retired-vocabulary scan reaches the documents (F-107).
 *
 * F-107's proof: the widened scan is watched failing, term by term, and the superseded filter is
 * watched BOTH ways.
 *
 * A checker that passes over everything reports coverage and finds nothing. Each case plants a
 * real violation and asserts the verdict follows AND names the right term.
 *
 * THE ASSERTION IS ON THE FINDING, NOT ON THE EXIT CODE. Gate 0 runs eighteen checks, and an
 * earlier version of this proof planted a new ADR-9999 and asserted `exit === 0` — which went
 * red on the ADR INDEX check, for a file absent from README.md, and reported it as the
 * superseded filter failing. An assertion that cannot say which check failed is not evidence
 * about that check. The negative case now appends to a REAL superseded ADR, so nothing else
 * about the tree changes.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const OFF = '\u001b[0m';

const run = () => {
  try {
    execFileSync('node', ['scripts/verify-state.mjs'], { cwd: ROOT, encoding: 'utf8' });
    return '';
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
};

/** A retired-surface finding naming this file, whatever else gate 0 reports. */
const flagged = (out, file, term) =>
  out
    .split('\n')
    .some((l) => l.includes(file) && l.includes('names') && (!term || l.includes(term)));

const PROOF = `${ROOT}/docs/architecture/__proof__.md`;
const SUPERSEDED = `${ROOT}/docs/adr/0012-backend-fastify-zod-openapi.md`;

const cases = [
  ['the worker process', 'Decoding happens in the worker under hard limits.'],
  ['the API process', 'The API process never touches an image.'],
  ['transport security', 'Connections use TLS 1.3 with HSTS preloaded.'],
  ['cloud sync', 'Wardrobe photos are uploaded when cloud sync is on.'],
  ['a key management service', 'The data key is wrapped by a KMS master key.'],
];

let failures = 0;
const clean = () => {
  if (existsSync(PROOF)) unlinkSync(PROOF);
};

clean();
if (run() !== '') {
  console.log(`${RED}baseline is not green — the proof cannot attribute any failure${OFF}`);
  process.exit(1);
}
console.log(`${GREEN}baseline green${OFF}\n`);

for (const [term, sentence] of cases) {
  writeFileSync(PROOF, `# Proof\n\n${sentence}\n`);
  const out = run();
  clean();
  const fired = flagged(out, '__proof__.md', term);
  console.log(`${fired ? `${GREEN}RED  ` : `${RED}MISS `}${OFF} ${term} — ${sentence}`);
  if (!fired) failures += 1;
}

// --- The superseded filter, both ways, on a REAL superseded ADR.
const bomb = '\nThe API process never touches an image, and cloud sync is on.\n';
const original = readFileSync(SUPERSEDED, 'utf8');

writeFileSync(SUPERSEDED, original + bomb);
const supOut = run();
const supFired = flagged(supOut, '0012-backend-fastify-zod-openapi.md');
console.log(
  `\n${supFired ? `${RED}FIRED` : `${GREEN}GREEN`}${OFF} the sentence in a SUPERSEDED ADR is history, not rot`,
);
if (supFired) failures += 1;

// The same file, temporarily accepted. Only the status line differs.
writeFileSync(SUPERSEDED, `${original.replace(/\*\*Superseded by[^\n]*/u, 'Accepted')}${bomb}`);
const accOut = run();
const accFired = flagged(accOut, '0012-backend-fastify-zod-openapi.md');
console.log(
  `${accFired ? `${GREEN}RED  ` : `${RED}MISS `}${OFF} the SAME sentence in the SAME file, status Accepted, fires`,
);
if (!accFired) failures += 1;

writeFileSync(SUPERSEDED, original);

// --- The marker still works in the new zones.
writeFileSync(
  PROOF,
  '# Proof\n\nThe API process never touches an image. <!-- retired-ok: deliberate, for the proof -->\n',
);
const markedOut = run();
clean();
const markedFired = flagged(markedOut, '__proof__.md');
console.log(
  `${markedFired ? `${RED}FIRED` : `${GREEN}GREEN`}${OFF} a marked line in a new zone is exempt`,
);
if (markedFired) failures += 1;

// The tree must be exactly as the proof found it.
const restored = run() === '' && readFileSync(SUPERSEDED, 'utf8') === original;
console.log(
  `${restored ? `${GREEN}GREEN` : `${RED}DIRTY`}${OFF} baseline restored after the proof`,
);
if (!restored) failures += 1;

console.log(
  `\n${failures === 0 ? `${GREEN}Proof passed.` : `${RED}Proof FAILED — ${String(failures)} case(s).`}${OFF} ${String(cases.length + 4)} case(s).`,
);
process.exit(failures === 0 ? 0 : 1);
