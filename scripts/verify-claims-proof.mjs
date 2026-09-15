#!/usr/bin/env node
/**
 * Irodora — the proof that the claims lint can fail (F-025, acceptance criterion 4).
 *
 * A gate nobody has watched fail is configuration that parses. This plants each banned
 * construction into a real file the lint scans, asserts the lint goes red **and names the right
 * construction**, then restores — with the baseline asserted green before and after every case.
 *
 * ## Two things it proves that a simpler proof would not
 *
 * **One case must stay GREEN.** `packages/testing/fixtures/claims/clean.md` is copied in
 * unmutated. A proof where everything is red cannot distinguish a working gate from one that
 * fails on everything — and this repository has already shipped a decoy that did not
 * discriminate, twice.
 *
 * **The marker must be checked in both directions.** A `claims-ok:` marker with a real reason
 * must SUPPRESS a finding; a bare marker with no reason must ITSELF be a finding. An exemption
 * nobody had to justify is not an exemption, it is a way to turn the gate off, and a proof that
 * only tests the suppressing direction would not notice.
 *
 * The mutation target is a real path under `docs/`, not the fixture directory, because the
 * fixture directory is excluded from the scan — planting there would prove only that excluded
 * files are excluded.
 */

import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardPlants } from './plant.mjs';
import { ciError } from './annotate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LINT = join(ROOT, 'scripts/verify-claims.mjs');
const FIXTURE = join(ROOT, 'packages/testing/fixtures/claims/clean.md');

/**
 * The Japanese negative control (F-172).
 *
 * Two green baselines rather than one, because the patterns are now written in two languages and
 * **a green baseline in a language the patterns cannot read proves nothing about the ones that
 * can**. Its content is the product's own copy — the six legitimate uses of a measurement word on
 * the `measure` screen — so a pattern set that flags it is wrong about the shipping app rather
 * than about a fixture somebody invented.
 */
const JA_FIXTURE = join(ROOT, 'packages/testing/fixtures/claims/japanese.md');

// A real, scanned path. Removed in `finally`; its directory is created only if absent.
const TARGET = join(ROOT, 'docs/__claims_proof__.md');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

if (!existsSync(FIXTURE)) {
  console.error(
    `${RED}claims-proof: fixture missing at ${FIXTURE}. Refusing to prove nothing.${OFF}`,
  );
  process.exit(1);
}
if (existsSync(TARGET)) {
  console.error(`${RED}claims-proof: ${TARGET} already exists. Refusing to overwrite it.${OFF}`);
  process.exit(1);
}

const clean = readFileSync(FIXTURE, 'utf8');

if (!existsSync(JA_FIXTURE)) {
  console.error(
    `${RED}claims-proof: Japanese fixture missing at ${JA_FIXTURE}. Refusing to prove nothing.${OFF}`,
  );
  process.exit(1);
}
const japanese = readFileSync(JA_FIXTURE, 'utf8');

/*
 * F-219. THE LINE-BY-LINE FIXTURES: every construction the mockups draw, verbatim; the forms copy
 * actually takes; and near-misses that must stay green. The first two are held line by line, not
 * as whole files, so one line the lint misses cannot hide behind another it catches.
 */
const LINE_FIXTURES = Object.fromEntries(
  ['drawn', 'variants', 'near-misses'].map((name) => {
    const file = join(ROOT, `packages/testing/fixtures/claims/${name}.md`);
    if (!existsSync(file)) {
      console.error(
        `${RED}claims-proof: fixture missing at ${file}. Refusing to prove nothing.${OFF}`,
      );
      process.exit(1);
    }
    return [name, readFileSync(file, 'utf8')];
  }),
);

/** Runs the lint. Returns {code, out}. Never throws on a non-zero exit — that is the signal. */
function runLint(env = {}) {
  try {
    const out = execFileSync(process.execPath, [LINT], {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, ...env },
    });
    return { code: 0, out };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

/**
 * THE COVERAGE CHECK, WATCHED FAILING (F-172).
 *
 * Every other case here proves a banned phrase is caught. This one proves the thing that was
 * actually wrong, which no phrase case can reach: a gate can walk a file it cannot read, report
 * `0 violation(s)`, and be believed. That is how the Japanese Home screen came to call a camera
 * estimate a measurement across four green runs (E-089).
 *
 * The mutation is an environment variable rather than a plant into `claims.json`, because
 * planting into a tracked file has broken this tree four times. It only ever removes patterns,
 * so the sole thing it can cause is the failure asserted below.
 */
function proveCoverage() {
  const withPatterns = runLint();
  const without = runLint({ CLAIMS_PROOF_DROP_NON_ASCII: '1' });
  const ok =
    withPatterns.code === 0 && without.code !== 0 && without.out.includes('COVERS NOTHING');

  console.log(
    `${ok ? `${GREEN}OK ` : `${RED}BAD`}${OFF} a gate with no pattern for a script it scans is REFUSED: ` +
      `${DIM}${
        ok
          ? 'green with the Japanese patterns, red without them'
          : `with ${String(withPatterns.code)} · without ${String(without.code)}`
      }${OFF}`,
  );
  return ok;
}

const config = JSON.parse(readFileSync(join(ROOT, '.harness/verification/claims.json'), 'utf8'));

/** One case per banned construction, plus the two marker directions. */
const CASES = [
  ...config.banned.map((b) => ({
    name: `banned: ${b.id}`,
    body: `# Proof\n\nThis copy says ${sampleFor(b.id)} and must be caught.\n`,
    expect: 'red',
    names: b.id,
  })),
  {
    name: 'a bare claims-ok: marker with no reason is ITSELF a finding',
    body: `# Proof\n\nA line about the exact colour of a garment. claims-ok:\n`,
    expect: 'red',
    names: 'bare-marker',
  },
  {
    name: 'a claims-ok: marker WITH a reason suppresses the finding',
    body: `# Proof\n\nA line about the exact colour of a garment. claims-ok: this line documents the banned phrase for the proof suite\n`,
    expect: 'green',
  },
  {
    name: 'the clean fixture, unmutated — must stay GREEN',
    body: clean,
    expect: 'green',
  },
  {
    /*
     * THE CASE THAT MATTERS MOST IN THE JAPANESE HALF, and it is a green one.
     *
     * A pattern set that banned the measurement VOCABULARY would pass every red case above and
     * break the product's only honest use of it — the `measure` screen, where a person enters
     * values from their own instrument, which is exactly the provenance the word is reserved
     * for. Six such strings are in this fixture, verbatim from the shipping catalogue.
     */
    name: "the product's real Japanese copy, unmutated — must stay GREEN",
    body: japanese,
    expect: 'green',
  },
  {
    /*
     * F-219. WHY "N% confidence" IS NOT BANNED. BRAND.md's replacement column recommends exactly
     * this sentence as the honest form of a reading. A pattern set that caught it would ban the
     * copy the policy exists to produce.
     */
    name: "the voice guide's own honest sentence, in both languages — must stay GREEN",
    body: '# Proof\n\nEstimated, 81% confidence, mixed lighting.\n\n推定値、信頼度81%、混合光。\n',
    expect: 'green',
  },
  {
    /*
     * F-219. Harmony is FR-6's vocabulary — twelve named relationships — and a separation score is
     * FR-5's. Only a verdict stacked on a score is banned, never the words themselves.
     */
    name: 'harmony relationships, a gradient and a separation score — must stay GREEN',
    body: '# Proof\n\nAn analogous harmony and a complementary harmony. 類似色の調和と補色の調和。\nA gradient track from cool to warm. 区別しやすさのスコア 92。\n',
    expect: 'green',
  },
  {
    /*
     * F-219. NEAR-MISSES for the widened patterns: words that sit next to a banned construction
     * and are not one. The engine's own honest sentence that it has no spectral data; grade and
     * quality as ordinary adjectives; and the Japanese on-device security statement mockup 15 will
     * need, which a colour-vision pattern not tied to 色覚 would have refused.
     */
    name: 'near-misses for the F-219 patterns, in both languages — must stay GREEN',
    body: '# Proof\n\nHigh-grade wool, a studio visit, a museum of dyes. The full spectrum of seasonal colours, and no spectral data anywhere in the dependency tree.\nデータは完全にオフラインで安全に保存されます。完全には区別できない場合があります。高品質なウール、スペクトル状の配色。\n',
    expect: 'green',
  },
  {
    // F-219. The bar the feature is held to: every construction a mockup draws, verbatim.
    name: 'every construction the mockups draw — refused LINE BY LINE',
    body: LINE_FIXTURES.drawn,
    expect: 'red',
    everyListLine: true,
  },
  {
    // F-219. The forms that copy actually takes, in both languages. An evaluation that finds a
    // variant the lint lets through adds it here first.
    name: 'their natural variants, English and Japanese — refused LINE BY LINE',
    body: LINE_FIXTURES.variants,
    expect: 'red',
    everyListLine: true,
  },
  {
    name: 'the near-miss fixture, unmutated — must stay GREEN',
    body: LINE_FIXTURES['near-misses'],
    expect: 'green',
  },
];

/** A phrase that trips each pattern. Written out rather than generated from the regex, so a
 *  pattern that stops matching real prose is caught rather than silently still matching itself. */
function sampleFor(id) {
  return {
    'exact-colour': 'we show the exact colour of your shirt',

    /*
     * THE JAPANESE HALF (F-172). Written as sentences a product might actually ship rather
     * than as strings assembled from the regex — a pattern that has stopped matching real
     * prose is then caught here, instead of silently still matching itself.
     */
    'ja-exact-colour': 'この機能はあなたの服の正確な色をお見せします',
    'ja-true-colour': 'カメラがその本当の色をとらえます',
    'ja-perfect-match': '収録された色と完全に一致します',
    'ja-percent-accurate': '99 % の正確さでお答えします',
    'ja-guaranteed-accuracy': 'この端末は色を保証します',
    'ja-professional-grade': 'プロ仕様の色管理をあなたの手に',
    'ja-ai-powered': 'AI搭載のエンジンが色を選びます',

    /*
     * F-155. An equivalent is a distance or a recorded judgement, and describing either as a
     * match is the claim FR-72 forbids by name.
     */
    'equivalent-is-a-match': 'this fabric is an exact match for this colour',
    // Deliberately NOT 完全に一致: that sentence also trips `ja-perfect-match` from F-172, so
    // the case went red for the wrong reason — which the proof's own "names the right thing"
    // assertion caught, and which is exactly what that assertion is for.
    'ja-equivalent-is-a-match': 'この生地はこの色にマッチします',
    'true-colour': 'this is the true colour of the fabric',
    'actual-colour': 'the actual colour is shown below',
    'percent-accurate': 'our detection is 99% accurate',
    'perfect-match': 'we found a perfect match',
    'lab-accurate': 'lab-accurate results on any phone',
    'professional-grade': 'professional-grade colour capture',
    'guaranteed-accuracy': 'guaranteed accuracy on every scan',
    'ai-powered': 'AI-powered colour detection',
    'measures-the-colour': 'the app measures the colour precisely',
    'is-exact-match-identifier': 'the response carries isExactMatch as a field',

    /*
     * F-219. The constructions the R9 mockups draw. Each is a sentence a screen might actually
     * carry, in the mockup's own words — not a string assembled from its pattern.
     */
    'percent-match': 'The nearest corpus colour is a 97% match for your shirt',
    'ja-percent-match': 'あなたのシャツは収録色と97%一致します',
    'absolute-cvd-safety': 'Every palette here is 100% CVD-safe',
    'ja-absolute-cvd-safety': 'すべての配色は色覚特性に対して100%安全です',
    'verdict-harmony': 'Outfit score 93 out of 100 — Master Harmony',
    'ja-verdict-harmony': '完璧な調和のコーディネートです',
    'institution-grade': 'Generate a museum-grade PDF report',
    'ja-institution-grade': '美術館品質のPDFレポートを作成',
    'unmeasured-spectra': 'Extracting reflectance spectra from the fabric',
    'ja-unmeasured-spectra': '生地の分光反射率を抽出しています',
  }[id];
}

const missing = config.banned.filter((b) => !sampleFor(b.id));
if (missing.length > 0) {
  console.error(
    `${RED}claims-proof: no sample phrase for ${missing.map((m) => m.id).join(', ')}.${OFF}\n` +
      `  Every banned construction needs a case, or the proof silently covers less than the gate.\n`,
  );
  process.exit(1);
}

console.log(`\n${BOLD}Irodora — claims lint mutation proof${OFF}`);
console.log(
  `${DIM}  ${String(CASES.length + 1)} case(s) · target ${'docs/__claims_proof__.md'}${OFF}\n`,
);

let failures = 0;

let journal = null;

try {
  const baseline = runLint();
  if (baseline.code !== 0) {
    console.error(
      `${RED}claims-proof: the BASELINE is already red. Nothing below is interpretable.${OFF}`,
    );
    console.error(baseline.out);
    process.exit(1);
  }

  /*
   * THE PLANT JOURNAL (F-173), even though this target is UNTRACKED.
   *
   * An untracked leftover is not harmless: `git add -A` adds it, and a file called
   * `__claims_proof__.md` in `docs/` is exactly the kind of thing that gets committed and then
   * lives there. The journal records that this path did not exist, so recovery removes it.
   */
  /*
   * OPENED HERE, not at the top: every exit above plants nothing, and a journal opened before
   * one of them claims a plant that never happened, so the next run refuses to start (F-271).
   */
  journal = guardPlants('verify-claims-proof', [TARGET]);

  mkdirSync(dirname(TARGET), { recursive: true });

  for (const c of CASES) {
    writeFileSync(TARGET, c.body, 'utf8');
    const result = runLint();
    rmSync(TARGET, { force: true });

    const wentRed = result.code !== 0;
    const wanted = c.expect === 'red';
    let ok = wentRed === wanted;

    // A whole-file red is not enough for a line fixture: every list line must be reported by its
    // number, or one line the lint misses hides behind another it catches (F-219).
    if (ok && wanted && c.everyListLine) {
      const reported = new Set(
        [...result.out.matchAll(/__claims_proof__\.md:(\d+)/gu)].map((m) => Number(m[1])),
      );
      const missed = c.body
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line, n }) => line.startsWith('- ') && !reported.has(n));
      if (missed.length > 0) {
        ok = false;
        console.error(`${RED}BAD ${c.name}: ${String(missed.length)} line(s) not refused${OFF}`);
        for (const m of missed) console.error(`    ${String(m.n)}: ${m.line}`);
      }
    }

    // Red is not enough: it must be red for the RIGHT reason.
    if (ok && wanted && c.names && !result.out.includes(`[${c.names}]`)) {
      ok = false;
      console.error(
        `${RED}BAD ${c.name}: went red, but did not name "${c.names}" — red for the wrong reason.${OFF}`,
      );
    } else {
      console.log(
        `${ok ? `${GREEN}OK ` : `${RED}BAD`}${OFF} ${c.name}: ${DIM}exit ${String(result.code)}, expected ${c.expect}${OFF}`,
      );
    }

    if (!ok) failures++;

    const after = runLint();
    if (after.code !== 0) {
      console.error(`${RED}claims-proof: baseline did not recover after "${c.name}".${OFF}`);
      failures++;
      break;
    }
  }
} finally {
  rmSync(TARGET, { force: true });
  if (existsSync(TARGET)) console.error(`${RED}claims-proof: FAILED TO REMOVE ${TARGET}.${OFF}`);
  else journal?.close();
}

if (!proveCoverage()) failures++;

if (failures > 0) {
  console.error(`\n${RED}${BOLD}AT LEAST ONE PROOF FAILED.${OFF} ${String(failures)} case(s).\n`);
  ciError(
    `gate 2 claims mutation proof: ${String(failures)} case(s) did not discriminate`,
    'See the job log for the per-case detail; this annotation exists so the COUNT is visible ' +
      'without a token.',
  );
  process.exit(1);
}

console.log(
  `\n${GREEN}${BOLD}All ${String(CASES.length + 1)} cases discriminate.${OFF} ` +
    `${DIM}Baseline green before and after each one.${OFF}\n`,
);
