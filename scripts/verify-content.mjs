/**
 * Gate 11 — content (NFR-20).
 *
 * Fails the build if ANY record lacks source, sourceType, sourceLicence, derivation,
 * authoredBy, verifiedBy or verifiedAt; if author and reviewer are the same identity; if a
 * `historical` classification has no dated primary source; if a derived value is inconsistent
 * with its `xyz` under the current engine; if a palette has no anchor; if a relation points at
 * a missing slug; if a published bundle differs from its checksum; if a slug is duplicated; or
 * if a cited source is not in the licensing register.
 *
 * **There is no partial publication.** A corpus that is 95% verified is one where nobody knows
 * which 5% to distrust.
 *
 * ## The problem this gate has, and what is done about it
 *
 * F-011 ships the gate. F-012 ships the entries. **A gate that passes because there is nothing
 * to check is failing open** — and every gate activated in this repository so far was watched
 * fail on a real mutation before it was called active.
 *
 * Four things, together:
 *
 * 1. **It fails on an empty world it did not expect.** It asserts it located `content/colors/`,
 *    the roster, the register and the fixture corpora, and stops if any is missing. A check
 *    that silently passes over an empty set has either lost its data or is looking in the wrong
 *    place, and both are failures [[a-gate-that-errors-is-failing-open]].
 * 2. **It runs its rules against fixtures every time**, so the number of rules exercised is
 *    never zero. The valid fixture corpus must pass; each invalid one must fail with the
 *    expected message.
 * 3. **The fixtures cannot be mistaken for content.** They live under `packages/`, the corpus
 *    scan globs `content/` only, and a `fixture-` slug appearing under `content/` is itself a
 *    failure.
 * 4. **`scripts/verify-content-proof.mjs`** mutates the valid fixture corpus and asserts this
 *    gate goes red and names the right field, with the baseline asserted green either side.
 *
 * The authored-entry count is printed on every run beside the fixture rule count, so a green
 * gate over an empty corpus cannot be read as coverage.
 *
 * ## What this gate does NOT check
 *
 * Immutability is enforced against accident and DETECTED against intent. A committer who edits
 * an entry *and* updates the ledger in the same commit passes here; the two-file diff and
 * review are the control, and there is no publish path beyond them — the admin application
 * was withdrawn with the server tier (ADR-0051), which makes repository write access product
 * write access. That line is printed on every run rather than left for someone to discover.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCorpusPackage, readCorpusRoot, readJsonFile, ROOT, sha256 } from './corpus-io.mjs';

const GREEN = '[32m';
const RED = '[31m';
const YELLOW = '[33m';
const DIM = '[2m';
const BOLD = '[1m';
const OFF = '[0m';

const CONTENT = join(ROOT, 'content');
const REGISTER = join(ROOT, 'docs', 'content', 'licensing-and-provenance.md');
const FIXTURES = join(ROOT, 'packages', 'corpus', 'test', 'fixtures');

const corpus = await loadCorpusPackage();
const {
  assertSha256,
  bundleRootDigest,
  checkCorpus,
  CorpusError,
  deriveColor,
  FIXTURE_PREFIX,
  hexToXyz,
  ledgerRowFor,
  loadPublishedVersion,
} = corpus;

const failures = [];
const notes = [];
let rulesExercised = 0;

const fail = (detail) => failures.push(detail);

console.log(`${BOLD}Irodora — gate 11: content${OFF}`);

// --- the gate must know it found its inputs -------------------------------------------

for (const [what, path] of [
  ['the corpus root', CONTENT],
  ['the editor roster', join(CONTENT, 'editors.json')],
  ['the source register', REGISTER],
  ['the fixture corpora', FIXTURES],
  ['the valid fixture corpus', join(FIXTURES, 'valid')],
  ['the invalid fixture corpora', join(FIXTURES, 'invalid')],
])
  if (!existsSync(path)) {
    console.log(
      `\n${RED}${BOLD}Gate 11 cannot run.${OFF} ${what} is missing (${path}).\n` +
        'A gate that lost its own inputs must fail rather than pass over an empty set.\n',
    );
    process.exit(1);
  }

// A checksum is a tamper control. It cannot rest on an unverified primitive.
assertSha256(sha256);
rulesExercised += 1;

// --- the real corpus --------------------------------------------------------------------

let real;
try {
  real = readCorpusRoot(corpus, { root: CONTENT, registerPath: REGISTER });
} catch (error) {
  console.log(`\n${RED}${BOLD}Gate 11 cannot run.${OFF} ${error.message}\n`);
  process.exit(1);
}

for (const failure of real.failures) fail(failure.message);
for (const failure of checkCorpus(real)) fail(failure.message);
rulesExercised += 1;

// --- published bundles: checksum, and agreement with the current engine -------------------

/**
 * Verify every published bundle under one corpus root.
 *
 * **This is a function, and takes a root, because the real corpus has no bundles yet.** The
 * first version of this gate inlined the loop over `content/versions/` — and with zero bundles
 * on disk and no fixture carrying one, the entire block was unreachable while
 * `gates.json` claimed the gate enforced checksums and the E-001 destination check. The code
 * was correct and ran nowhere, which is the same failure this gate's own lesson note describes
 * for the entry rules: a guard with nothing to guard.
 *
 * The valid fixture corpus now carries a published version, so these rules execute on every
 * invocation and the mutation proof can attack them.
 */
function checkBundles(root, ledger, { label: rootLabel, report }) {
  const versionsDir = join(root, 'versions');
  const bundleFiles = existsSync(versionsDir)
    ? readdirSync(versionsDir)
        .filter((n) => n.endsWith('.json') && n !== 'index.json')
        .sort()
    : [];

  const latest = bundleFiles.at(-1) ?? null;
  const found = [];
  const record = (detail) => found.push(detail);

  for (const file of bundleFiles) {
    const label = file.replace(/\.json$/u, '');
    const where = `${rootLabel}/versions/${file}`;
    let bundle;
    try {
      const row = ledgerRowFor(ledger, label, `${rootLabel}/versions/index.json`);
      bundle = loadPublishedVersion(
        readFileSync(join(versionsDir, file), 'utf8'),
        row.checksum,
        sha256,
        where,
      );
    } catch (error) {
      record(error instanceof CorpusError ? error.message : String(error));
      continue;
    }

    // E-001, DESTINATION END. Only the latest version is compared against the current engine:
    // an older one was derived by an engine we no longer have, and re-deriving it here would be
    // asserting that today's engine should reproduce yesterday's answer — which is exactly the
    // claim FR-10 says we must NOT make. Skipping is printed rather than implied.
    if (file !== latest) {
      report?.(
        `${where} — checksum verified; derived values NOT re-checked against the current ` +
          'engine, because it was produced by a different one and reproducing it is not ' +
          'something we claim (FR-10).',
      );
      continue;
    }

    for (const { entry, derived } of bundle.entries) {
      const fresh = deriveColor(entry.color.xyz);
      for (const key of ['hex', 'inSrgbGamut', 'lightnessOutOfRange'])
        if (fresh[key] !== derived[key])
          record(
            `${where}: entries.${entry.slug}.derived.${key} is ${JSON.stringify(derived[key])} ` +
              `but the CURRENT engine derives ${JSON.stringify(fresh[key])} from the same xyz. ` +
              'The engine moved (E-001): publish a NEW corpus version — never edit a published ' +
              'one (FR-10, ADR-0046).',
          );
      for (const key of ['lab', 'lch', 'oklch', 'rgb'])
        for (const [i, value] of fresh[key].entries())
          if (Math.abs(value - derived[key][i]) > 1e-12)
            record(
              `${where}: entries.${entry.slug}.derived.${key}[${String(i)}] is ` +
                `${String(derived[key][i])} but the CURRENT engine derives ${String(value)}. ` +
                'The engine moved (E-001): publish a NEW corpus version.',
            );
    }

    const recomputedRoot = bundleRootDigest(bundle, sha256);
    const row = ledger.find((r) => r.label === label);
    if (row !== undefined && row.checksum !== recomputedRoot)
      record(`${where}: recomputed root ${recomputedRoot} != ledger ${row.checksum}`);
  }

  return { failures: found, bundleCount: bundleFiles.length };
}

const realBundles = checkBundles(CONTENT, real.ledger, {
  label: 'content',
  report: (note) => notes.push(note),
});
for (const failure of realBundles.failures) fail(failure);
rulesExercised += 1;

// --- an authored sourceHex must agree with its own xyz ------------------------------------

for (const { file, record } of real.entries) {
  if (record.color.sourceHex === null) continue;
  const fromHex = hexToXyz(record.color.sourceHex);
  const fresh = deriveColor(record.color.xyz);
  if (fresh.hex.toUpperCase() !== record.color.sourceHex.toUpperCase())
    notes.push(
      `${file}: color.sourceHex is ${record.color.sourceHex} but xyz derives ${fresh.hex}. ` +
        'That is legitimate when `derivation` records a lossy conversion, and a transcription ' +
        `error when it does not. Distance: ${fromHex.map((v) => v.toFixed(4)).join(', ')} vs ` +
        `${record.color.xyz.map((v) => v.toFixed(4)).join(', ')}.`,
    );
}
rulesExercised += 1;

// --- the fixtures: the gate exercises its own rules on every run ---------------------------

const fixtureRegister = join(FIXTURES, 'register.md');
let fixtureRules = 0;

function checkFixtureCorpus(root, { expectFailure, matching }) {
  fixtureRules += 1;
  let result;
  try {
    result = readCorpusRoot(corpus, { root, registerPath: fixtureRegister });
  } catch (error) {
    // A read-time throw is a legitimate failure mode for an invalid fixture (a broken roster,
    // an unparseable register), so it counts as one.
    if (expectFailure && (matching === undefined || matching.test(error.message))) return;
    fail(`fixture ${root}: could not be read — ${error.message}`);
    return;
  }

  const found = [...result.failures, ...checkCorpus(result, { allowFixtureSlugs: true })].map(
    (error) => error.message,
  );

  // The bundle rules run here too. Without this the whole published-version half of the gate
  // is unreachable until F-012 ships a real corpus — correct code that never executes.
  found.push(...checkBundles(root, result.ledger, { label: root }).failures);

  if (!expectFailure) {
    for (const message of found) fail(`the VALID fixture corpus was rejected: ${message}`);
    return;
  }

  if (found.length === 0) {
    fail(
      `the invalid fixture at ${root} was ACCEPTED. Every rule this gate claims to enforce ` +
        'has a fixture that must fail; one that stops failing means the rule stopped working ' +
        'and nothing else would have told us.',
    );
    return;
  }
  if (matching !== undefined && !found.some((m) => matching.test(m)))
    fail(
      `the invalid fixture at ${root} failed, but for the wrong reason. Expected ${String(matching)}; got:\n` +
        found.map((m) => `      ${m}`).join('\n'),
    );
}

checkFixtureCorpus(join(FIXTURES, 'valid'), { expectFailure: false });

const EXPECTED = readJsonFile(join(FIXTURES, 'invalid', 'expected.json'));
for (const [dir, pattern] of Object.entries(EXPECTED))
  checkFixtureCorpus(join(FIXTURES, 'invalid', dir), {
    expectFailure: true,
    matching: new RegExp(pattern, 'u'),
  });

// --- a fixture slug must never appear in the real corpus -----------------------------------

for (const { file, record } of [...real.entries, ...real.palettes])
  if (record.slug.startsWith(FIXTURE_PREFIX))
    fail(`${file}: "${record.slug}" is a fixture slug and must not appear under content/`);
rulesExercised += 1;

// --- report --------------------------------------------------------------------------------

console.log(
  `${DIM}  ${String(real.entries.length)} authored entr${real.entries.length === 1 ? 'y' : 'ies'}, ` +
    `${String(real.palettes.length)} palette(s), ${String(realBundles.bundleCount)} published ` +
    `version(s), ${String(real.register.size)} registered source(s)${OFF}`,
);
console.log(
  `${DIM}  ${String(rulesExercised)} corpus rule group(s) + ${String(fixtureRules)} fixture ` +
    `corpora exercised${OFF}\n`,
);

if (real.entries.length === 0)
  console.log(
    `${YELLOW}!${OFF} ${DIM}content/colors/ holds NO authored entries. Everything green above ` +
      `came from the fixtures, not from the corpus — the seed corpus arrives with F-012, and ` +
      `until then this gate proves the RULES work, not that any colour passed them.${OFF}`,
  );

console.log(
  `${DIM}  NOT CHECKED HERE: that a human reviewed an entry (the gate proves two distinct ` +
    `roster identities, not that either read it — F-012 owes that as an attested criterion); ` +
    `and an edit to a published entry made together with a matching ledger update, which is a ` +
    `two-file diff caught by review and by nothing else — there is no publish path beyond the ` +
    `pull request (ADR-0051).${OFF}\n`,
);

for (const note of notes) console.log(`  ${YELLOW}!${OFF} ${note}\n`);

if (failures.length > 0) {
  console.log(`${RED}${BOLD}${String(failures.length)} content failure(s).${OFF}\n`);
  for (const detail of failures) console.log(`  ${RED}x${OFF} ${detail}\n`);
  console.log(
    `${RED}There is no partial publication — a corpus that is 95% verified is one where ` +
      `nobody knows which 5% to distrust.${OFF}`,
  );
  process.exit(1);
}

console.log(`${GREEN}${BOLD}Gate 11 passed.${OFF} ${DIM}${String(notes.length)} note(s).${OFF}`);
