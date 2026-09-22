/**
 * F-289 — what Slate Graphite and Obsidian Noir would have to be, and whether it passes.
 *
 * ## This measures. It does not decide, and it changes nothing.
 *
 * `OQ-36` asks a person whether the two themes `15` draws as ONE SWATCH EACH should be derived by
 * a stated rule, supplied by hand, or shipped as a ground change only. It is a fair question and
 * it is being asked blind: nobody knows whether the obvious derivation produces a palette that
 * clears gates 9 and 10.
 *
 * So this runs the obvious derivation and measures it **with the real checkers** —
 * `checkContrast` and `checkSeparation` out of `@irodora/design-tokens`, the same functions the
 * gates call. A ratio reimplemented here would agree with itself on day one
 * [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].
 *
 * Nothing in the build moves. No manifest value is touched. `F-225` is where an answer lands.
 *
 * ## The derivation, stated before it is run
 *
 * `OQ-36`'s own row proposes it: **Sumi Charcoal's lightness steps above its ground, re-anchored
 * at each theme's ground, with the text roles held.** Chroma and hue come from Sumi's
 * corresponding step — a derivation that also moved hue would be a different design — and the
 * text roles, both borders and everything else are held at Sumi's values, which is what makes the
 * result checkable rather than a second free choice.
 *
 * It cannot go through `themeRecipes`: that mechanism is a tint that never moves lightness
 * (ADR-0096), and these two are ground changes. `F-225`'s fourth criterion already supersedes
 * ADR-0096, so what is measured here is the world `F-225` would create.
 *
 * ## No gate runs this
 *
 * Like every other helper in this directory, it is an authoring tool. Its output is evidence for
 * a person, recorded in `OQ-36` and in `R9-MOCKUP-FIDELITY` §5.
 *
 * ```
 * node mockups/tools/derive-theme.mjs            # the report
 * node mockups/tools/derive-theme.mjs --json     # the same numbers, machine-readable
 * ```
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

/*
 * FROM THE BUILT PACKAGES, by path.
 *
 * `mockups/` is not a workspace package, so a bare specifier does not resolve from here — and
 * `pathToFileURL` rather than the bare path because on Windows an absolute path starts with a
 * drive letter, which the ESM loader reads as a URL scheme and rejects. The same two lines
 * `scripts/verify-contrast.mjs` needs, for the same two reasons.
 */
const dist = (pkg) => pathToFileURL(join(ROOT, 'packages', pkg, 'dist', 'index.js')).href;
const { checkContrast, checkSeparation } = await import(dist('design-tokens'));
const { srgbToXyz, xyzToOklch, oklchToXyz, xyzToSrgb, srgbToHex } = await import(
  dist('color-spaces')
);
const manifest = JSON.parse(
  readFileSync(join(ROOT, 'docs', 'design', 'design-system.manifest.json'), 'utf8'),
);

/* ------------------------------------------------------------------ colour */

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
};
const hexToOklch = (hex) => {
  const [l, c, h] = xyzToOklch(srgbToXyz(hexToRgb(hex)));
  return { l, c, h };
};
const oklchToHex = ({ l, c, h }) => srgbToHex(xyzToSrgb(oklchToXyz([l, c, h])));

/* ------------------------------------- the R9 ramp, from R9-MOCKUP-FIDELITY §5 */

/**
 * Sumi Charcoal's dark ramp as `F-220` read it, by manifest token name.
 *
 * The SHIPPED manifest is still the pre-R9 palette (`#12100F`, a warm near-neutral) because
 * `F-225` is what adopts this one and it is blocked on the very question this measures. So the
 * reference palette is built here from §5's table rather than read out of the manifest — and the
 * control below re-derives Sumi from itself to prove the arithmetic reproduces what it was given.
 */
const SUMI_R9 = {
  background: '#15171B',
  'surface.1': '#20232A',
  'surface.2': '#282C35',
  'surface.3': '#323742',
  border: '#2E333D',
  // §4/E3 already moves this from the drawn `#464D5B`, which clears 3:1 against nothing — the
  // first run of this script measured the drawn value and Sumi itself failed five pairings,
  // which is what sent it back to §4. Both are measured; `--drawn` uses the mockup's.
  'border.strong': process.argv.includes('--drawn') ? '#464D5B' : '#5C6472',
  foreground: '#F7F8FA',
  'foreground.2': '#A6B0BC',
  'foreground.3': '#94A1AF',
};

/** The two `15` draws as one swatch each. Slate was read off a render, so it carries ΔE00 ≈ 2. */
const CANDIDATES = {
  'slate-graphite': { ground: '#2C323A', read: 'from the render (ΔE00 ≈ 2)' },
  'obsidian-noir': { ground: '#101114', read: 'printed on its tile' },
};

/** The steps the derivation moves. Everything else is held at Sumi's value. */
const RAMP = ['surface.1', 'surface.2', 'surface.3'];

/* ------------------------------------------------------------- the derivation */

/**
 * One theme's palette, by the rule `OQ-36` proposes.
 *
 * Returns manifest-shaped tokens — `oklch`, `srgb`, `usage`, `role`, `pairsWith` — so the real
 * checkers can read them without knowing they were derived.
 */
function derive(groundHex) {
  const base = manifest.color.dark;
  const sumiGround = hexToOklch(SUMI_R9.background);
  const ground = hexToOklch(groundHex);

  const values = { ...SUMI_R9, background: groundHex };
  for (const step of RAMP) {
    const sumiStep = hexToOklch(SUMI_R9[step]);
    const moved = { l: ground.l + (sumiStep.l - sumiGround.l), c: sumiStep.c, h: sumiStep.h };
    values[step] = oklchToHex(moved);
  }

  const palette = {};
  for (const [name, token] of Object.entries(base)) {
    const hex = values[name];
    palette[name] =
      hex === undefined ? token : { ...token, srgb: hex.toUpperCase(), oklch: hexToOklch(hex) };
  }
  return { palette, values };
}

/* ---------------------------------------------------------------- the report */

const checkable = (palettes) => ({
  color: palettes,
  gate: manifest.gate,
  cvdPairs: manifest.cvdPairs,
  salience: manifest.salience,
  statusPairing: manifest.statusPairing,
});

/**
 * The smallest lightness move on the TEXT side that clears the requirement.
 *
 * Reported instead of stopping at a failure: *"the rule works if this token moves by this much"*
 * is a different question for a person, and a much easier one than *"the rule does not work"*.
 * The candidate is re-checked with the real checker rather than asserted.
 */
function nearestPassing(palettes, theme, textToken, surfaceToken) {
  const start = palettes[theme][textToken];
  /*
   * WHICH WAY TO MOVE is decided by the SURFACE, not by the text. A dark ground needs its text
   * lighter and a light ground needs it darker, and asking the text where it already sits gets
   * that backwards for a mid-lightness token — which is the case most likely to be failing.
   */
  const up = palettes[theme][surfaceToken].oklch.l < 0.5;
  for (let step = 1; step <= 120; step += 1) {
    const l = Math.min(1, Math.max(0, start.oklch.l + (up ? step : -step) * 0.005));
    const candidateHex = oklchToHex({ l, c: start.oklch.c, h: start.oklch.h });
    const trial = {
      ...palettes,
      [theme]: {
        ...palettes[theme],
        [textToken]: {
          ...start,
          srgb: candidateHex.toUpperCase(),
          oklch: hexToOklch(candidateHex),
        },
      },
    };
    const { results } = checkContrast(checkable(trial), [theme], trial);
    const pairing = results.find(
      (r) => r.foreground === textToken && r.background === surfaceToken,
    );
    if (pairing?.passes === true)
      return {
        hex: candidateHex.toUpperCase(),
        deltaL: Number((l - start.oklch.l).toFixed(4)),
        wcag: Number(pairing.wcag.toFixed(2)),
      };
    if (l === 0 || l === 1) break;
  }
  return null;
}

const palettes = {};
for (const [name, { ground }] of Object.entries(CANDIDATES))
  palettes[name] = derive(ground).palette;
// The control: Sumi through the same arithmetic must reproduce Sumi.
palettes['sumi-charcoal'] = derive(SUMI_R9.background).palette;

const themes = Object.keys(palettes);
const { results, findings } = checkContrast(checkable(palettes), themes, palettes);
const separation = checkSeparation(checkable(palettes), themes, palettes);

const report = { derivation: {}, contrast: {}, separation: {}, control: {} };

for (const theme of themes) {
  const { values } = derive(
    theme === 'sumi-charcoal' ? SUMI_R9.background : CANDIDATES[theme].ground,
  );
  report.derivation[theme] = Object.fromEntries(
    ['background', ...RAMP].map((k) => [k, values[k].toUpperCase()]),
  );

  const mine = results.filter((r) => r.theme === theme);
  report.contrast[theme] = mine.map((r) => ({
    pairing: `${r.foreground} on ${r.background}`,
    usage: r.usage,
    wcag: Number(r.wcag.toFixed(2)),
    required: r.required,
    verdict: r.passes ? 'pass' : 'FAIL',
    ...(r.passes
      ? { margin: Number((r.wcag - r.required).toFixed(2)) }
      : { nearestPassing: nearestPassing(palettes, theme, r.foreground, r.background) }),
  }));

  const sep = separation.filter((s) => s.theme === theme);
  report.separation[theme] = sep.map((s) => ({
    pair: `${s.a} / ${s.b}`,
    deficiency: s.deficiency,
    score: Number(s.score.toFixed(2)),
    required: s.required,
    verdict: s.passes ? 'pass' : 'FAIL',
  }));
}

/*
 * THE CONTROL. A derivation that cannot re-derive the palette it was read from is measuring
 * something else, and would do it silently.
 */
report.control = {
  claim: "Sumi's ramp, through the same arithmetic, reproduces the values it was given",
  expected: Object.fromEntries(['background', ...RAMP].map((k) => [k, SUMI_R9[k].toUpperCase()])),
  actual: report.derivation['sumi-charcoal'],
};
report.control.reproduced =
  JSON.stringify(report.control.expected) === JSON.stringify(report.control.actual);

/*
 * THE QUESTION OQ-36 IS ACTUALLY ASKING is not "does this palette pass" — that is F-225's
 * criterion 5, over a palette a person has not chosen yet. It is "does DERIVING these two make
 * anything worse than the theme they are derived from".
 *
 * So the headline is the difference. A pairing that fails in Sumi too is inherited: it is a
 * property of the R9 ramp and of the tokens §5 does not list, and it is F-225's to answer for
 * every theme at once. A pairing that passes in Sumi and fails here is what the derivation COST.
 */
const failedIn = (theme) =>
  new Set(report.contrast[theme].filter((r) => r.verdict === 'FAIL').map((r) => r.pairing));
const sumiFailures = failedIn('sumi-charcoal');
report.derivationCost = {};
for (const theme of themes) {
  if (theme === 'sumi-charcoal') continue;
  const mine = failedIn(theme);
  /*
   * AND WHETHER §5 EVEN SPECIFIES THE TOKENS INVOLVED. The R9 table gives the ground, the three
   * levels, both borders, the keyline, the three text roles and the primary action — and nothing
   * else. `status.*`, `ring`, `accent`, `chart.*` and `swatch.well` are held at the SHIPPED
   * manifest's values, which were tuned against the old warm ground (#12100F). A failure on one
   * of those says the token needs re-tuning against a new ground, which F-225 owes for every
   * theme including Sumi; a failure between two tokens §5 DOES specify is the derivation's.
   */
  const specified = (pairing) =>
    pairing.split(' on ').every((t) => Object.keys(SUMI_R9).includes(t));
  const introduced = [...mine].filter((p) => !sumiFailures.has(p));
  report.derivationCost[theme] = {
    introduced,
    introducedOnSpecifiedTokens: introduced.filter(specified),
    introducedOnTokensR9DoesNotList: introduced.filter((p) => !specified(p)),
    inherited: [...mine].filter((p) => sumiFailures.has(p)),
    fixedByTheDerivation: [...sumiFailures].filter((p) => !mine.has(p)),
  };
}

const failures = {
  contrast: Object.entries(report.contrast).flatMap(([t, rows]) =>
    rows.filter((r) => r.verdict === 'FAIL').map((r) => `${t}: ${r.pairing}`),
  ),
  separation: Object.entries(report.separation).flatMap(([t, rows]) =>
    rows.filter((r) => r.verdict === 'FAIL').map((r) => `${t}: ${r.pair} (${r.deficiency})`),
  ),
  pairingFindings: findings.map((f) => f.detail),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ...report, failures }, null, 2));
} else {
  console.log('\nF-289 — the derivation OQ-36 proposes, measured\n');
  console.log(
    `border.strong: ${process.argv.includes('--drawn') ? '#464D5B, as 15 DRAWS it' : '#5C6472, as §4/E3 corrects it'}`,
  );
  console.log(
    `control: ${report.control.reproduced ? 'reproduced Sumi' : 'DID NOT reproduce Sumi'}`,
  );
  for (const theme of themes) {
    console.log(`\n${theme}`);
    console.log('  ramp: ' + JSON.stringify(report.derivation[theme]));
    const c = report.contrast[theme];
    const s = report.separation[theme];
    const cf = c.filter((r) => r.verdict === 'FAIL');
    const sf = s.filter((r) => r.verdict === 'FAIL');
    console.log(`  gate 9  — ${c.length - cf.length}/${c.length} pairings pass`);
    for (const r of cf)
      console.log(
        `    FAIL ${r.pairing} (${r.usage}): ${String(r.wcag)} < ${String(r.required)}` +
          (r.nearestPassing === null || r.nearestPassing === undefined
            ? ' — no lightness on this hue passes'
            : ` — passes at ${r.nearestPassing.hex} (ΔL ${String(r.nearestPassing.deltaL)}, ` +
              `${String(r.nearestPassing.wcag)}:1)`),
      );
    console.log(`  gate 10 — ${s.length - sf.length}/${s.length} checks pass`);
    for (const r of sf)
      console.log(
        `    FAIL ${r.pair} (${r.deficiency}): ${String(r.score)} < ${String(r.required)}`,
      );
  }
  console.log('\n--- what the derivation COSTS, against Sumi as the reference ---');
  for (const [theme, cost] of Object.entries(report.derivationCost)) {
    console.log(`\n${theme}`);
    console.log(`  introduced by deriving: ${String(cost.introduced.length)}`);
    console.log(
      `    on tokens §5 specifies: ${String(cost.introducedOnSpecifiedTokens.length)}` +
        (cost.introducedOnSpecifiedTokens.length === 0
          ? ''
          : ` — ${cost.introducedOnSpecifiedTokens.join(', ')}`),
    );
    console.log(
      `    on tokens §5 does NOT list (held from the pre-R9 manifest): ` +
        `${String(cost.introducedOnTokensR9DoesNotList.length)}` +
        (cost.introducedOnTokensR9DoesNotList.length === 0
          ? ''
          : ` — ${cost.introducedOnTokensR9DoesNotList.join(', ')}`),
    );
    console.log(
      `  inherited from the palette (F-225's, not the derivation's): ${String(cost.inherited.length)}`,
    );
    for (const p of cost.inherited) console.log(`    ${p}`);
    if (cost.fixedByTheDerivation.length > 0) {
      console.log(`  no longer failing: ${String(cost.fixedByTheDerivation.length)}`);
      for (const p of cost.fixedByTheDerivation) console.log(`    ${p}`);
    }
  }
  console.log('\nnothing in the build was changed by this run.\n');
}
