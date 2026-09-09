/**
 * Every `<Surface>` left in the app says why it is not a `Card` (F-210, FR-71).
 *
 * ## What this is for
 *
 * `Card` was built in F-184 because `<Surface level="1">` was the whole card vocabulary — one
 * tint, one radius, one padding — appearing dozens of times with a heading stacked inside it.
 * F-210 converted the twenty-four sites that were cards. The rest are genuinely not cards: a
 * camera preview, a pressable target, an empty state, a bar.
 *
 * **The distinction is a judgement, and a judgement nobody wrote down is a judgement nobody can
 * check.** Six months from now the difference between "this is deliberately a Surface" and
 * "nobody got to this one" is invisible, and the second is what the card vocabulary was
 * flattened by in the first place.
 *
 * ## Why the reason lives at the site
 *
 * A registry keyed by line number rots the moment anything above it moves. One keyed by ordinal
 * silently mis-assigns a reason when two sites swap. The marker sits inside the element's own
 * opening tag, so the grammar attaches it rather than proximity
 * [[a-proof-that-names-a-file-rots-when-the-file-is-not-the-only-one]].
 *
 * ## What it does NOT check
 *
 * Whether the reason is any good. It checks that one exists, is not empty, and is not a
 * restatement of the marker itself — a human still has to read it. That is the same bargain
 * every exemption list in this repository makes, and the reason they are all printed in full.
 *
 * Zero dependencies, Node built-ins only.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * The tree to scan. `apps/mobile` in production; the proof passes a fixture directory.
 *
 * An argument rather than an env var, so a run that scanned the wrong tree says so in the
 * command that produced it.
 */
const ZONE = process.argv[2] ?? join(ROOT, 'apps', 'mobile');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/** The path separator, taken from its code point: a backslash literal here is a shell hazard. */
const SEP = String.fromCharCode(92);
const MARKER = 'surface-not-card:';
/**
 * How many lines of an opening tag to read looking for the marker.
 *
 * A tag longer than this is a tag whose marker has been pushed out of sight, which is the thing
 * the marker exists to prevent — so the bound is a rule rather than a buffer.
 */
const REACH = 8;
/** Short enough to be a shrug rather than a reason. */
const MIN_REASON = 20;

/** A gate that cannot find its inputs FAILS. It never passes over an empty set. */
if (!statSync(ZONE, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`${RED}surface-not-card: ${ZONE} is missing. Refusing to report zero.${OFF}`);
  process.exit(1);
}

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'node_modules') walk(p);
    } else if (p.endsWith('.tsx') && !p.includes('.test.')) files.push(p);
  }
};
walk(ZONE);

const problems = [];
const reasons = [];
let markers = 0;

for (const file of files.sort()) {
  const rel = file
    .slice(ROOT.length + 1)
    .split(SEP)
    .join('/');
  const lines = readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    if (line.includes(MARKER)) markers += 1;
    if (!line.includes('<Surface')) return;

    /*
     * THE OPENING TAG, from `<Surface` to the `>` that closes it.
     *
     * The marker lives inside the tag rather than above the element, so the grammar binds it
     * rather than proximity. That was not the first design — a JSX comment child is what
     * anybody would write, and eight of these sites sit directly inside a parenthesised
     * ternary branch, where a comment and an element are two expressions and do not parse.
     * The position that works everywhere turned out to be the position that binds properly.
     */
    const tag = [];
    for (let j = i; j < lines.length && j < i + REACH; j += 1) {
      tag.push(lines[j]);
      if (/>\s*$/u.test(lines[j])) break;
    }
    const marked = tag.find((l) => l.includes(MARKER));
    if (marked === undefined) {
      problems.push(
        `${rel}:${String(i + 1)} draws a <Surface> and does not say why it is not a <Card>.\n` +
          `      Put a /* ${MARKER} … */ comment inside its opening tag, or convert it. A\n` +
          '      heading plus a body IS a card, and this check exists because that judgement\n' +
          '      is invisible once it has been made.',
      );
      return;
    }
    const why = marked
      .slice(marked.indexOf(MARKER) + MARKER.length)
      .replace(/\*\/\}?\s*$/u, '')
      .trim();
    if (why.length < MIN_REASON)
      problems.push(
        `${rel}:${String(i + 1)} has a ${MARKER} marker with no reason in it — "${why}".\n` +
          '      A marker that says nothing is an exemption wearing the shape of a decision.',
      );
    else reasons.push(`${rel}:${String(i + 1)} ${DIM}${why}${OFF}`);
  });
}

/* A marker with no Surface under it is a reason for something that is no longer there. */
const stale = markers - (reasons.length + problems.filter((p) => p.includes('no reason')).length);
if (stale > 0)
  problems.push(
    `${String(stale)} ${MARKER} marker(s) sit above no <Surface>. A reason that outlived the\n` +
      '      element it explained is the same rot as a stale exemption: it reads as a decision\n' +
      '      about the code that is there now.',
  );

console.log(`\n${BOLD}Irodora — every Surface says why it is not a Card${OFF}\n`);
for (const r of reasons) console.log(`  ${GREEN}✓${OFF} ${r}`);

if (problems.length > 0) {
  console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s)${OFF}`);
  for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}`);
  console.log('');
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}Every Surface is deliberate.${OFF} ${DIM}${String(reasons.length)} site(s) ` +
    `across ${String(files.length)} file(s) scanned.${OFF}`,
);
console.log(
  `${DIM}  NOT CHECKED HERE: whether the reason is a good one. This checks that one exists and ` +
    `is not a shrug —\n  a person still has to read them, which is why they are all printed ` +
    `above.${OFF}\n`,
);
