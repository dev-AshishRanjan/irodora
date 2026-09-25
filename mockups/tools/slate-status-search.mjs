/**
 * F-225 — is there a LIGHTNESS-ONLY answer for Slate Graphite's status colours?
 *
 * ## This measures. It changes nothing.
 *
 * Slate is Sumi re-anchored at a lighter ground (ADR-0107), so its status colours must lift to
 * clear 4.5:1 on its levels. Lifting `status.ok` and `status.warn` brings them close to
 * `status.bad`, and the triple stops separating under CVD simulation. R9-MOCKUP-FIDELITY §4 E3's
 * rule moves lightness only, with hue and chroma held. So the question is whether ANY
 * lightness-only assignment of the three passes, and ADR-0111 §5 rests on the answer being no.
 *
 * The search is exhaustive over a stated grid and uses the gate's own checkers. The result is
 * printed as counts, so the number quoted in the ADR can be reproduced.
 *
 * 1. Start from Slate as the manifest derives it, with every move applied EXCEPT the status
 *    triple's, which is held at Sumi's values.
 * 2. For each status token, every OKLCh L on the grid (0.300 to 0.990, step 0.010) with Sumi's
 *    chroma and hue, kept if in gamut.
 * 3. A combination "passes contrast" when each token clears every pairing it declares
 *    (`checkContrast`).
 * 4. A combination is "clean" when it also separates under every CVD pair (`checkSeparation`) and
 *    keeps the salience rank (`checkSalience`).
 *
 * ```
 * pnpm --filter @irodora/design-tokens build   # the tool reads the built package
 * node mockups/tools/slate-status-search.mjs
 * ```
 *
 * No gate runs this. Like every helper in this directory, it is an authoring tool.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const dist = (pkg) => pathToFileURL(join(ROOT, 'packages', pkg, 'dist', 'index.js')).href;
const {
  checkContrast,
  checkSalience,
  checkSeparation,
  isInGamut,
  oklchToRgb,
  parseManifest,
  withOklch,
} = await import(dist('design-tokens'));

const THEME = 'slate.dark';
const STATUS = ['status.ok', 'status.warn', 'status.bad'];
const GRID = { from: 0.3, to: 0.99, step: 0.01 };

const raw = JSON.parse(
  readFileSync(join(ROOT, 'docs', 'design', 'design-system.manifest.json'), 'utf8'),
);
raw.themeDerivations.slate.moves = raw.themeDerivations.slate.moves.filter(
  (m) => !STATUS.includes(m.token),
);
const manifest = parseManifest(raw);
const base = manifest.color[THEME];

const steps = Math.round((GRID.to - GRID.from) / GRID.step);
const candidates = {};
const passing = {};
for (const name of STATUS) {
  const held = base[name];
  candidates[name] = [];
  passing[name] = [];
  for (let i = 0; i <= steps; i += 1) {
    const oklch = { ...held.oklch, l: Number((GRID.from + i * GRID.step).toFixed(3)) };
    if (!isInGamut(oklchToRgb(oklch))) continue;
    const token = withOklch(held, oklch, `${THEME}.${name}`);
    candidates[name].push(token);
    // A status token's pairings do not involve the other two, so contrast is judged per token.
    const palette = { ...base, [name]: token };
    const ok = checkContrast(manifest, [THEME], { ...manifest.color, [THEME]: palette })
      .results.filter((r) => r.foreground === name || r.background === name)
      .every((r) => r.passes);
    if (ok) passing[name].push(token);
  }
}

let clean = 0;
for (const ok of passing['status.ok'])
  for (const warn of passing['status.warn'])
    for (const bad of passing['status.bad']) {
      const palette = { ...base, 'status.ok': ok, 'status.warn': warn, 'status.bad': bad };
      const palettes = { ...manifest.color, [THEME]: palette };
      if (
        checkSeparation(manifest, [THEME], palettes).every((r) => r.passes) &&
        checkSalience({ ...manifest, color: palettes }).length === 0
      )
        clean += 1;
    }

const product = (sets) => STATUS.reduce((n, name) => n * sets[name].length, 1);
console.log(`Slate Graphite — lightness-only search over the status triple`);
console.log(`  grid: L ${GRID.from}–${GRID.to} step ${GRID.step}, chroma and hue held at Sumi's`);
for (const name of STATUS)
  console.log(
    `  ${name}: ${candidates[name].length} in gamut, ${passing[name].length} pass contrast`,
  );
console.log(`  combinations in gamut:      ${product(candidates)}`);
console.log(`  combinations past contrast: ${product(passing)}`);
console.log(`  combinations clean:         ${clean}`);
