#!/usr/bin/env node
/**
 * Irodora — the claims copy lint (NFR-21, F-025, ADR-0031).
 *
 * > No user-facing claim about colour accuracy may exist without a published measurement
 * > behind it.
 *
 * ADR-0031 says this is **enforced by a copy lint, not by review**, and the governance
 * document says why: the pressure to overstate comes from everywhere, every individual
 * instance seems reasonable, and reviewer vigilance does not survive a launch week.
 *
 * ## The problem this gate has, and the whole of its design
 *
 * **The banned phrases must appear in this repository.** ADR-0031 lists them; so does the
 * governance document, three skills, two rule files and this script. A naive scan flags
 * eighteen files, and most of them are the policy rather than a violation of it.
 *
 * A blanket exemption for "documents that discuss the policy" would then BE the gate: every
 * real claim in `docs/` would sit inside it. So exemptions are split by kind, and the kinds
 * are not interchangeable:
 *
 * | kind | covers | must carry |
 * |---|---|---|
 * | `policySource` | files that DEFINE the ban | an explicit path — never a glob — and a reason |
 * | inline `claims-ok:` | a line that FORBIDS the phrase, or records its absence | a reason on that line |
 * | `measured` | an actual claim with a measurement | a link to the device-lab row (NFR-2) |
 *
 * `measured` is empty, because the device colour lab is F-063 and there are no measurements
 * yet. The count is printed on every run so an empty allowlist cannot be mistaken for a
 * thorough one.
 *
 * ## What this does NOT check, printed on every run
 *
 * ADR-0031 section 1 binds permissible language to `Provenance.source` — "measured" is legal
 * for a calibrated value and a lie for an estimated one. Deciding that statically needs the
 * render tree, which arrives with F-017. The table lives in `claims.json` as data so the
 * check has it when it can run. Gate 9 sets the precedent: it prints, on every run, that it
 * does not scan rendered surfaces.
 *
 * Zero dependencies, Node built-ins only.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(ROOT, '.harness/verification/claims.json');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

/** A gate that cannot find its inputs FAILS. It never passes over an empty set. */
if (!existsSync(CONFIG)) {
  console.error(`${RED}claims: ${CONFIG} is missing. Refusing to report zero violations.${OFF}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const banned = config.banned ?? [];
const allow = config.allowlist ?? {};
const marker = allow.inlineMarker?.token ?? 'claims-ok:';

if (banned.length === 0) {
  console.error(
    `${RED}claims: no banned constructions defined. That is not a passing state.${OFF}`,
  );
  process.exit(1);
}

const policyPaths = new Set((allow.policySource ?? []).map((e) => e.path));
const measured = allow.measured ?? [];

// A `measured` entry exempts a real claim, so it must carry the measurement. An entry without
// one is a hole shaped exactly like the thing this gate exists to stop.
const badMeasured = measured.filter((m) => !m.claim || !m.measurement || !m.why);
if (badMeasured.length > 0) {
  console.error(
    `${RED}claims: ${String(badMeasured.length)} allowlist.measured entr(ies) lack claim, measurement or why.${OFF}\n` +
      `  An accuracy claim is exempt only when a device-lab row supports it (NFR-2).\n`,
  );
  process.exit(1);
}

/**
 * `archive` is here on purpose and is the only judgement call in this list.
 *
 * `docs/archive/brainstorm/` holds the superseded documents the PRD replaced. They contain the
 * banned constructions because they are what the product decided NOT to say — linting them
 * would mean editing a record of what was superseded, which destroys the only thing an archive
 * is for. Everything else in this set is generated output or someone else's code.
 */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.turbo',
  '.git',
  '.next',
  '.expo',
  'coverage',
  '.changeset',
  'archive',
]);
const SCAN = /\.(ts|tsx|js|mjs|cjs|md|json)$/;

const walk = (dir, acc = []) => {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && SCAN.test(entry.name)) acc.push(full);
  }
  return acc;
};

const posix = (p) => p.split(sep).join('/');

const files = walk(ROOT).filter((f) => {
  const rel = posix(relative(ROOT, f));
  // Fixtures are scanned only by the proof, which plants violations in them on purpose.
  return !rel.startsWith('packages/testing/fixtures/claims/');
});

const violations = [];
let markerUses = 0;
let bareMarkers = 0;

for (const file of files) {
  const rel = posix(relative(ROOT, file));
  if (policyPaths.has(rel)) continue;

  const lines = readFileSync(file, 'utf8').split('\n');

  for (const [i, line] of lines.entries()) {
    const markerAt = line.indexOf(marker);
    if (markerAt >= 0) {
      const reason = line.slice(markerAt + marker.length).trim();
      // A marker nobody had to justify is not an exemption; it is a way to turn the gate off.
      if (reason.length < 12) {
        bareMarkers++;
        violations.push({
          file: rel,
          line: i + 1,
          id: 'bare-marker',
          text: line.trim().slice(0, 100),
          why: `A "${marker}" marker needs a reason of at least 12 characters on the same line.`,
        });
        continue;
      }
      markerUses++;
      continue;
    }

    for (const b of banned) {
      const re = new RegExp(b.pattern, 'i');
      if (!re.test(line)) continue;
      violations.push({
        file: rel,
        line: i + 1,
        id: b.id,
        text: line.trim().slice(0, 100),
        why: b.why,
      });
    }
  }
}

console.log(`\n${BOLD}Irodora — claims copy lint${OFF}`);
console.log(
  `${DIM}  ${String(files.length)} file(s) scanned · ${String(banned.length)} banned construction(s) · ` +
    `${String(policyPaths.size)} policy source(s) exempt · ${String(markerUses)} inline marker(s)` +
    (bareMarkers > 0 ? ` · ${String(bareMarkers)} REJECTED for having no reason` : '') +
    OFF,
);

/*
 * ============================================================================================
 * DOES THIS GATE COVER THE COPY IT IS SCANNING? (F-172, E-089)
 * ============================================================================================
 *
 * It walked every file in the repository, `apps/mobile/src/i18n/ja.ts` included, and reported
 * `0 violation(s)` — while every one of its patterns was ASCII and could not match a single
 * character of that file. **Half the product's user-facing copy had never been checked against
 * the rule the product cares about most**, and the Japanese Home screen had been calling a camera
 * estimate a measurement the whole time.
 *
 * That is a different failure from every blind spot recorded before it. The others were checkers
 * that could not SEE their subject. This one read every byte and had nothing to say, because what
 * it knows how to recognise is written in one language — and *"it scans everything"* and *"it
 * checks everything"* are different claims, of which only the first was ever stated.
 *
 * So the gate now counts two things and fails when they disagree: text it cannot read, and
 * patterns that could read it. **This half needs no Japanese at all**, which is why it is here
 * rather than waiting on the review the patterns themselves owe — and it holds for the third
 * language too, which will fail this check on the day it arrives rather than passing silently
 * until somebody notices.
 */

/** CJK ideographs, hiragana and katakana. The scripts this product's second locale is written in. */
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u;

/** A pattern that can match non-ASCII text at all. A pure-ASCII regex never will. */
const readsCjk = (pattern) => CJK.test(pattern);

/*
 * A WEAKENING THE PROOF CAN APPLY WITHOUT PLANTING INTO A TRACKED FILE.
 *
 * The coverage check below is worth nothing until something has watched it fail, and the only way
 * to make it fail is to take the Japanese patterns away — which live in `claims.json`, a tracked
 * file. Planting into one of those has left this working tree broken four times: a `finally` does
 * not survive a timeout, a Windows file lock, or a kill.
 *
 * So the mutation is an environment variable, and it is safe by construction rather than by
 * convention: dropping patterns makes the gate find LESS, at which point the check fires and the
 * build goes red. **No setting of this variable lets anything through** — that is the property
 * that makes a switch inside a gate acceptable, and without it this would just be a bypass.
 */
const dropped = process.env['CLAIMS_PROOF_DROP_NON_ASCII'] === '1';

const cjkPatterns = dropped ? [] : banned.filter((b) => readsCjk(b.pattern));
const cjkFiles = files.filter((f) => {
  const rel = posix(relative(ROOT, f));
  if (policyPaths.has(rel)) return false;
  // Only source and copy: a memory note discussing the ban is not user-facing text.
  if (!/^apps\/mobile\/src\/i18n\//u.test(rel)) return false;
  return CJK.test(readFileSync(f, 'utf8'));
});

if (cjkFiles.length > 0 && cjkPatterns.length === 0) {
  console.error(
    `\n${RED}${BOLD}Claims lint COVERS NOTHING in ${String(cjkFiles.length)} file(s).${OFF}\n` +
      `${DIM}  These carry copy in a script no banned pattern can match, so a green run over them\n` +
      `  says nothing at all — which is how the Japanese Home screen came to call an estimate a\n` +
      `  measurement while this gate reported zero violations (E-089).\n\n` +
      cjkFiles.map((f) => `  ${posix(relative(ROOT, f))}\n`).join('') +
      `\n  Add patterns to .harness/verification/claims.json, and have somebody who reads the\n` +
      `  language check them.${OFF}\n`,
  );
  process.exit(1);
}

if (violations.length > 0) {
  console.error('');
  for (const v of violations) {
    console.error(`${RED}  ✗ ${v.file}:${String(v.line)}${OFF}  ${DIM}[${v.id}]${OFF}`);
    console.error(`      ${v.text}`);
    console.error(`      ${DIM}${v.why}${OFF}`);
  }
  console.error(
    `\n${RED}${BOLD}Claims lint FAILED.${OFF} ${String(violations.length)} violation(s).\n` +
      `${DIM}  Fix the language. If the line FORBIDS the phrase or records its absence, add\n` +
      `  "${marker} <reason>" on that line. If it is a real claim, it needs a device-lab row\n` +
      `  (NFR-2) and an allowlist.measured entry — and there are none yet.${OFF}\n`,
  );
  process.exit(1);
}

// Said on every run, not left for someone to discover.
console.log(
  `${YELLOW}  !${OFF} ${DIM}NOT CHECKED HERE: the provenance-conditional half of ADR-0031 §1 — whether ` +
    `"measured" sits\n    near an estimated value. That needs the render tree and activates with ` +
    `${config.provenanceLanguage?.activatesWith ?? 'F-017'}; the table is\n    already in claims.json. ` +
    `allowlist.measured holds ${String(measured.length)} entr(ies), which is correct while the\n` +
    `    device colour lab (F-063) has produced no rows — no number without a row.${OFF}`,
);

console.log(
  `${YELLOW}  !${OFF} ${DIM}${String(cjkPatterns.length)} of ${String(banned.length)} pattern(s) can match Japanese, over ` +
    `${String(cjkFiles.length)} file(s) of it. A pattern that never\n    fires looks exactly like clean copy, so this ` +
    `number is the SCOPE of the check rather than\n    evidence about the copy — F-172 owes the review that closes ` +
    `the difference.${OFF}`,
);

console.log(`\n${GREEN}${BOLD}Claims lint passed.${OFF} ${DIM}0 violation(s).${OFF}\n`);
