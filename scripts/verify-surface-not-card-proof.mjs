/**
 * The Surface-not-Card check, watched refusing (F-210).
 *
 * A check nobody has seen fail is a check that might be scanning nothing. This one is
 * particularly exposed to that: it walks a tree looking for a pattern, and a walker that finds
 * no files reports "every Surface is deliberate" in exactly the words a clean run uses.
 *
 * **Nothing is written to the working tree.** The fixtures live in a temp directory and the
 * scanner is pointed at it, which is why the scanner takes a zone argument at all.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCANNER = join(ROOT, 'scripts', 'verify-surface-not-card.mjs');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const problems = [];
const say = (ok, name, detail) => {
  if (!ok) problems.push(name);
  console.log(`  ${ok ? GREEN + '✓' : RED + '✗'}${OFF} ${name} ${DIM}${detail}${OFF}`);
};

/** Run the scanner over a fixture tree; return its exit status and output. */
function scan(files) {
  const dir = mkdtempSync(join(tmpdir(), 'irodora-surface-'));
  try {
    for (const [name, source] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      writeFileSync(join(dir, name), source);
    }
    try {
      const out = execFileSync(process.execPath, [SCANNER, dir], { encoding: 'utf8' });
      return { ok: true, out };
    } catch (error) {
      return { ok: false, out: `${String(error.stdout ?? '')}${String(error.stderr ?? '')}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const MARKED = `export function A(): null {
  return (
    <Surface
      /* surface-not-card: a camera preview, whose rectangle converts a tap into a point. */
      level="1"
    >
      {null}
    </Surface>
  );
}
`;

console.log(`\n${BOLD}Irodora — the Surface-not-Card check, watched refusing${OFF}\n`);

/*
 * 1. THE BASELINE MUST BE GREEN, and it is first because every case below is a comparison
 *    against it. A proof whose "before" is already red proves nothing about its "after".
 */
say(
  scan({ 'src/Marked.tsx': MARKED }).ok,
  'a marked Surface is ACCEPTED',
  'the baseline — without this, every refusal below could be the scanner refusing everything',
);

/* 2. The refusal this check exists for. */
const bare = scan({
  'src/Bare.tsx': `export function A(): null {
  return <Surface level="1">{null}</Surface>;
}
`,
});
say(
  !bare.ok && bare.out.includes('does not say why'),
  'an UNMARKED Surface is refused, and the message says what to do',
  'the whole point: a judgement nobody wrote down cannot be reviewed',
);

/* 3. A marker that is a shrug is not a reason. */
const shrug = scan({
  'src/Shrug.tsx': `export function A(): null {
  return (
    <Surface
      /* surface-not-card: no. */
      level="1"
    >
      {null}
    </Surface>
  );
}
`,
});
say(
  !shrug.ok && shrug.out.includes('no reason in it'),
  'a marker with no reason in it is refused',
  'an exemption wearing the shape of a decision is worse than no exemption',
);

/* 4. A reason that outlived its element. */
const stale = scan({
  'src/Stale.tsx': `export function A(): null {
  /* surface-not-card: this explained an element somebody has since deleted entirely. */
  return <View />;
}
`,
});
say(
  !stale.ok && stale.out.includes('sit above no'),
  'a marker with no Surface under it is refused',
  'a stale reason reads as a decision about the code that is there now',
);

/*
 * 5. THE DECOY, and it is the one that matters. The marker must be ATTACHED, not merely
 *    present in the file — a check that scanned for the string anywhere would pass a file
 *    where one site is explained and a second is not.
 */
const detached = scan({
  'src/Detached.tsx': `export function A(): null {
  return (
    <Surface
      /* surface-not-card: this one is genuinely a preview frame and not a card at all. */
      level="1"
    >
      {null}
    </Surface>
  );
}

export function B(): null {
  return <Surface level="1">{null}</Surface>;
}
`,
});
say(
  !detached.ok && detached.out.includes('does not say why'),
  'DECOY — a marker on ONE site does not cover a second site in the same file',
  'a substring search over the file would have passed this, and it is the likely mistake',
);

/*
 * 6. THE SECOND DECOY. The gate must fail when it cannot find its inputs, rather than
 *    reporting zero problems over an empty tree.
 */
const empty = scan({});
say(
  empty.ok && empty.out.includes('0 site(s)'),
  'an empty tree reports ZERO SITES rather than a clean verdict',
  'the count is what stops "nothing scanned" reading like "nothing wrong"',
);

if (problems.length > 0) {
  console.log(`\n${RED}${BOLD}${String(problems.length)} case(s) did not discriminate.${OFF}\n`);
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}The Surface-not-Card check discriminates.${OFF} ` +
    `${DIM}Six cases: one baseline, three refusals, two decoys. Nothing was written to the ` +
    `working tree.${OFF}\n`,
);
