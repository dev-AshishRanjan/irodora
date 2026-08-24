#!/usr/bin/env node
/**
 * Irodora — the dependency-audit half of gate 15.
 *
 * `pnpm audit --audit-level high` has exited 1 on every run since F-039, because two HIGH
 * advisories against `image-size` **have no fixed version** — the latest published release
 * is 2.0.2 and both advisories cover `<= 2.0.2` with `first_patched_version: null`. There is
 * nothing to upgrade to and nothing to override to.
 *
 * A gate that is permanently red is a gate nobody reads, which is the same outcome as
 * deleting it and takes longer. So the verdict moves here, and the rule becomes:
 *
 *   **A blocking advisory either stops the build, or it is written down with a reason, an
 *   owner, and a date on which it stops being accepted.**
 *
 * ## Why not `auditConfig.ignoreGhsas`
 *
 * pnpm has that built in and it is one line in `package.json`. It has no expiry, no owner
 * and no reason — so an entry added at 6pm under a deadline is indistinguishable from one
 * that was thought about, and it stays silent for years. That is precisely the failure this
 * file exists to prevent, so the built-in is the wrong tool despite being the obvious one.
 *
 * ## Three ways this goes red, and the third is the point
 *
 * 1. A blocking advisory that is not in the register.
 * 2. A register entry whose `expires` has passed. **The exception stops working by itself.**
 *    An expiry someone has to remember is not an expiry.
 * 3. A register entry that matches nothing in today's report. A dead exception is how a live
 *    one gets waved through later — so a stale entry is a failure, not tidy-up.
 *
 * It also fails if `pnpm audit` cannot run at all. A gate that errors is failing open.
 *
 * Usage:
 *   node scripts/verify-audit.mjs                    # run pnpm audit and judge it
 *   node scripts/verify-audit.mjs --report <file>    # judge a saved report instead
 *   node scripts/verify-audit.mjs --prove            # watch every way it goes red
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciError } from './lib/annotate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTER = resolve(ROOT, '.harness/verification/advisories.json');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/**
 * What blocks. Moderate and low are REPORTED, never blocking — matching the policy the CI
 * workflow has carried since F-004, so this script changes the mechanism and not the bar.
 */
const BLOCKING = new Set(['high', 'critical']);

/** Every field a register entry must carry, and why each one is not optional. */
const REQUIRED_FIELDS = {
  id: 'the GHSA id, so the entry names one advisory rather than a package',
  package: 'the package, so an entry cannot silently widen to another dependency',
  severity: 'what was accepted',
  reachability: 'what would have to be true for this to reach a user — the actual argument',
  owner: 'a person who is accountable for looking again',
  decidedOn: 'when the argument was made, so its age is visible',
  expires: 'when it stops being accepted, whether or not anyone remembers',
  removeWhen: 'the condition that ends this entry, so it is not open-ended',
  adr: 'where the decision is recorded',
};

/** A reason short enough to be a shrug is not a reason. */
const MIN_REACHABILITY = 80;

/* ============================================================== reading the report */

/** `pnpm audit --json`, or a saved report. Never a silent empty result. */
function readReport(reportPath) {
  if (reportPath) {
    if (!existsSync(reportPath)) throw new Error(`no report at ${reportPath}`);
    return JSON.parse(readFileSync(reportPath, 'utf8'));
  }

  // pnpm audit exits NON-ZERO when it finds anything, so a throw here is the normal case
  // and the output is on stdout either way. Only an unparseable result is a real failure.
  //
  // `execSync` with a fixed literal rather than execFileSync with args: on Windows `pnpm` is
  // a `.cmd`, which Node 20+ refuses to spawn without a shell, and passing an args ARRAY
  // alongside `shell: true` is deprecated (DEP0190) because the arguments are concatenated
  // rather than escaped. There is no interpolation in this command, so a literal is both
  // warning-free and the honest description of what runs.
  let stdout;
  try {
    stdout = execSync('pnpm audit --json', {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    stdout = String(error.stdout ?? '');
    if (!stdout.trim())
      throw new Error(
        `pnpm audit produced no output. It needs the network, and a gate that cannot run is ` +
          `failing open, so this is a failure rather than a pass.\n${String(error.stderr ?? error.message)}`,
        { cause: error },
      );
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`pnpm audit did not return JSON. It said:\n${stdout.slice(0, 2000)}`, {
      cause: error,
    });
  }
}

/** The advisories, flattened to the shape the verdict needs. */
function advisoriesFrom(report) {
  return Object.values(report.advisories ?? {}).map((a) => ({
    ghsa: a.github_advisory_id,
    package: a.module_name,
    severity: String(a.severity).toLowerCase(),
    title: a.title,
    vulnerable: a.vulnerable_versions,
    patched: a.patched_versions,
    url: a.url,
    paths: (a.findings ?? []).flatMap((f) => f.paths ?? []).length,
  }));
}

/* ===================================================================== the verdict */

/**
 * Judge one report against one register.
 *
 * Pure, and returns findings as data, so `--prove` can assert over the RESULT rather than
 * grepping console output — a proof of the formatting is not a proof of the check.
 *
 * `today` is a parameter so an expiry can be tested without waiting three months.
 */
export function judge(report, register, today) {
  const advisories = advisoriesFrom(report);
  const failures = [];
  const accepted = [];
  const entries = register.accepted ?? [];

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.id))
      failures.push({
        what: 'duplicate register entry',
        detail: `${entry.id} appears twice. Two entries for one advisory means one of them is unread.`,
      });
    seen.add(entry.id);

    const missing = Object.keys(REQUIRED_FIELDS).filter((f) => !String(entry[f] ?? '').trim());
    if (missing.length) {
      failures.push({
        what: 'incomplete register entry',
        detail:
          `${entry.id ?? '(no id)'} is missing ${missing.join(', ')}. ` +
          missing.map((f) => `${f}: ${REQUIRED_FIELDS[f]}`).join('; '),
      });
      continue;
    }

    if (entry.reachability.trim().length < MIN_REACHABILITY)
      failures.push({
        what: 'register entry with no real argument',
        detail:
          `${entry.id} gives ${String(entry.reachability.trim().length)} characters of reachability, ` +
          `and ${String(MIN_REACHABILITY)} is the floor. An exemption nobody had to justify is a way ` +
          `to turn the gate off quietly.`,
      });

    const match = advisories.find((a) => a.ghsa === entry.id && a.package === entry.package);

    // A dead exception is how a live one gets waved through later.
    if (!match) {
      failures.push({
        what: 'stale register entry',
        detail:
          `${entry.id} (${entry.package}) is accepted but no longer reported. Delete the entry. ` +
          `A register carrying entries nobody has re-read is a register nobody re-reads.`,
      });
      continue;
    }

    // The exception stops working by itself. An expiry someone has to remember is not one.
    if (entry.expires < today) {
      failures.push({
        what: 'expired exception',
        detail:
          `${entry.id} was accepted until ${entry.expires} and today is ${today}. ` +
          `Re-decide it: is there a fix now, is the reachability argument still true, or does ` +
          `this finally block the build? Extending the date is a decision, not a formality.`,
      });
      continue;
    }

    accepted.push({ entry, match });
  }

  const acceptedIds = new Set(accepted.map((a) => a.entry.id));
  for (const a of advisories) {
    if (!BLOCKING.has(a.severity)) continue;
    if (acceptedIds.has(a.ghsa)) continue;
    failures.push({
      what: `unaccepted ${a.severity} advisory`,
      detail:
        `${a.ghsa} — ${a.package} ${a.vulnerable}: ${a.title}. ${a.url}\n` +
        `      Fix it by upgrading if a patched version exists (${a.patched}). If none does, ` +
        `add it to .harness/verification/advisories.json with a reachability argument, an ` +
        `owner and an expiry — and read the ADR before you do.`,
    });
  }

  return {
    advisories,
    accepted,
    failures,
    reported: advisories.filter((a) => !BLOCKING.has(a.severity)),
  };
}

/* ========================================================================== --prove */

/** A report carrying exactly the advisories described. */
const reportOf = (...specs) => ({
  advisories: Object.fromEntries(
    specs.map((s, i) => [
      String(i),
      {
        github_advisory_id: s.ghsa,
        module_name: s.pkg,
        severity: s.severity,
        title: s.title ?? 'synthetic',
        vulnerable_versions: '<=1.0.0',
        patched_versions: s.patched ?? '<0.0.0',
        url: 'https://example.invalid',
        findings: [{ paths: ['a>b'] }],
      },
    ]),
  ),
});

const entryOf = (over = {}) => ({
  id: 'GHSA-aaaa-bbbb-cccc',
  package: 'left-pad',
  severity: 'high',
  reachability:
    'A synthetic entry used only by the proof. It is long enough to clear the floor because ' +
    'the floor is what stops a shrug being accepted as an argument.',
  owner: 'nobody',
  decidedOn: '2026-01-01',
  expires: '2099-01-01',
  removeWhen: 'never, it is synthetic',
  adr: 'docs/adr/0059-a-blocking-advisory-with-no-fix-is-accepted-with-an-expiry.md',
  ...over,
});

function prove() {
  console.log(`\n${BOLD}Irodora — audit disposition proof${OFF}\n`);

  const TODAY = '2026-08-23';
  const HIGH = { ghsa: 'GHSA-aaaa-bbbb-cccc', pkg: 'left-pad', severity: 'high' };
  const OTHER = { ghsa: 'GHSA-dddd-eeee-ffff', pkg: 'right-pad', severity: 'high' };

  const cases = [
    {
      name: 'an accepted advisory, in date (must stay GREEN)',
      report: reportOf(HIGH),
      register: { accepted: [entryOf()] },
      mustFail: false,
    },
    {
      // Acceptance criterion 3, exactly: an entry must not become a blanket exemption.
      name: 'a DIFFERENT high advisory, with the first one still accepted',
      report: reportOf(HIGH, OTHER),
      register: { accepted: [entryOf()] },
      mustFail: 'unaccepted high advisory',
    },
    {
      name: 'a critical advisory nobody accepted',
      report: reportOf({ ...OTHER, severity: 'critical' }),
      register: { accepted: [] },
      mustFail: 'unaccepted critical advisory',
    },
    {
      name: 'an exception whose expiry has passed',
      report: reportOf(HIGH),
      register: { accepted: [entryOf({ expires: '2026-08-22' })] },
      mustFail: 'expired exception',
    },
    {
      name: 'an exception for something no longer reported',
      report: reportOf(OTHER),
      register: { accepted: [entryOf(), entryOf({ id: OTHER.ghsa, package: 'right-pad' })] },
      mustFail: 'stale register entry',
    },
    {
      name: 'an entry accepted for one package, applied to another',
      report: reportOf(HIGH),
      register: { accepted: [entryOf({ package: 'some-other-package' })] },
      mustFail: 'stale register entry',
    },
    {
      name: 'an entry with no owner',
      report: reportOf(HIGH),
      register: { accepted: [entryOf({ owner: '' })] },
      mustFail: 'incomplete register entry',
    },
    {
      name: 'an entry whose reachability argument is a shrug',
      report: reportOf(HIGH),
      register: { accepted: [entryOf({ reachability: 'dev dependency' })] },
      mustFail: 'register entry with no real argument',
    },
    {
      name: 'the same advisory accepted twice',
      report: reportOf(HIGH),
      register: { accepted: [entryOf(), entryOf()] },
      mustFail: 'duplicate register entry',
    },
    {
      name: 'a moderate advisory nobody accepted (must stay GREEN — it does not block)',
      report: reportOf({ ...OTHER, severity: 'moderate' }),
      register: { accepted: [] },
      mustFail: false,
    },
    {
      name: 'the accepted case again (the baseline either side)',
      report: reportOf(HIGH),
      register: { accepted: [entryOf()] },
      mustFail: false,
    },
  ];

  const wrong = [];
  for (const c of cases) {
    const { failures } = judge(c.report, c.register, TODAY);
    const kinds = failures.map((f) => f.what);

    if (c.mustFail === false) {
      if (kinds.length) wrong.push({ c, why: `expected GREEN, got: ${kinds.join(', ')}` });
      else console.log(`  ${GREEN}✓${OFF} ${c.name}`);
      continue;
    }
    if (!kinds.includes(c.mustFail)) {
      wrong.push({
        c,
        why: kinds.length ? `went red for ${kinds.join(', ')} instead` : 'stayed GREEN',
      });
      continue;
    }
    console.log(`  ${GREEN}✓${OFF} ${c.name} ${DIM}→ ${c.mustFail}${OFF}`);
  }

  if (wrong.length) {
    console.log(`\n${RED}${BOLD}${String(wrong.length)} case(s) did not discriminate${OFF}\n`);
    for (const { c, why } of wrong)
      console.log(`  ${RED}✗${OFF} ${c.name}\n    ${DIM}${why}${OFF}`);
    // One annotation carrying every case: a job's log needs authentication to read and its
    // annotations do not, and GitHub caps annotations at ten per run.
    ciError(
      `gate 15 disposition proof: ${String(wrong.length)} case(s) did not discriminate`,
      wrong.map(({ c, why }) => `${c.name}: ${why}`).join('\n'),
    );
    console.log(`\n${RED}${BOLD}Audit disposition proof FAILED.${OFF}\n`);
    process.exit(1);
  }

  console.log(`\n${GREEN}${BOLD}All ${String(cases.length)} cases discriminate.${OFF}\n`);
}

/* ============================================================================= main */

const argv = process.argv.slice(2);

if (argv.includes('--prove')) {
  prove();
} else {
  const reportFlag = argv.indexOf('--report');
  const reportPath = reportFlag === -1 ? null : argv[reportFlag + 1];

  console.log(`\n${BOLD}Irodora — gate 15: dependency advisories${OFF}\n`);

  const register = JSON.parse(readFileSync(REGISTER, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const { advisories, accepted, failures, reported } = judge(
    readReport(reportPath),
    register,
    today,
  );

  console.log(
    `${DIM}  ${String(advisories.length)} advisory(ies) reported · ` +
      `${String(accepted.length)} accepted with an expiry · blocking severities: high, critical${OFF}\n`,
  );

  for (const { entry, match } of accepted) {
    const daysLeft = Math.round(
      (Date.parse(entry.expires) - Date.parse(today)) / (24 * 60 * 60 * 1000),
    );
    console.log(`  ${YELLOW}!${OFF} ${entry.id} ${DIM}${match.package} ${match.severity}${OFF}`);
    console.log(
      `    ${DIM}accepted by ${entry.owner} until ${entry.expires} (${String(daysLeft)} days) — ${entry.removeWhen}${OFF}`,
    );
  }

  for (const a of reported)
    console.log(`  ${DIM}· ${a.severity} ${a.ghsa} ${a.package} — reported, does not block${OFF}`);

  console.log(
    `\n  ${YELLOW}!${OFF} ${DIM}NOT CHECKED HERE: whether the vulnerable code is REACHABLE. ` +
      `That needs call-graph analysis this repository does not have, so every acceptance rests ` +
      `on a written argument a person can disagree with — which is why each one carries an ` +
      `owner and an expiry rather than a tick.${OFF}`,
  );

  if (failures.length) {
    console.log(`\n${RED}${BOLD}${String(failures.length)} failure(s)${OFF}\n`);
    for (const f of failures)
      console.log(`  ${RED}✗ ${f.what}${OFF}\n      ${DIM}${f.detail}${OFF}\n`);
    console.log(`${RED}${BOLD}Gate 15 (advisories) FAILED.${OFF}\n`);
    process.exit(1);
  }

  console.log(`\n${GREEN}${BOLD}Gate 15 (advisories) passed.${OFF}\n`);
}
