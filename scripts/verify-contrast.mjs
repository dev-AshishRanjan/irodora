/**
 * Gate 9 — contrast.
 *
 * Reads `docs/design/design-system.manifest.json` and asserts, in BOTH themes:
 *
 *   - every declared `pairsWith` combination meets the WCAG 2.2 AA minimum its `usage`
 *     selects, with APCA Lc reported alongside (ADR-0021);
 *   - every `srgb` value matches what the engine derives from that token's OKLCh (ADR-0043);
 *   - the chroma ceiling, with exceptions recorded in the manifest rather than in code;
 *   - the structural rules that carry NFR-9.
 *
 * **Report-only while the manifest status is `placeholder`; blocking once it is `approved`.**
 * That switch is read from the manifest, not hard-coded here.
 *
 * The arithmetic is not in this file. `checkContrast`, `checkSeparation` and
 * `checkChromaCeiling` live in `@irodora/design-tokens`, so the gate and the tests run the
 * same code; and every colour number underneath them comes from `@irodora/color-difference`
 * and `@irodora/cvd-engine`. A gate that carries its own copy of the rules is checking
 * itself.
 *
 * ## What this gate does NOT do yet
 *
 * Its charter in `gates.json` also covers scanning rendered surfaces for colour-only status
 * indicators. There are no rendered surfaces: `apps/web` is a stub until F-017. That half is
 * recorded as outstanding rather than quietly implied by a green gate.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'docs', 'design', 'design-system.manifest.json');

// pathToFileURL, not the bare path: on Windows an absolute path starts with a drive letter,
// which the ESM loader reads as a URL scheme and rejects.
const { parseManifest, derivedSrgb, checkContrast, checkChromaCeiling, checkStructure, THEMES } =
  await import(pathToFileURL(join(ROOT, 'packages', 'design-tokens', 'dist', 'index.js')).href);

const c = {
  reset: '[0m',
  dim: '[2m',
  bold: '[1m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
};

const failures = [];
const notes = [];
const severeNotes = [];

const manifest = parseManifest(JSON.parse(readFileSync(MANIFEST, 'utf8')));
const blocking = manifest.status === manifest.gate.contrast.blockingWhenStatus;

console.log(`${c.bold}Irodora — gate 9: contrast${c.reset}`);
console.log(
  `${c.dim}  ${manifest.gate.contrast.standard} · manifest status "${manifest.status}" · ` +
    `${blocking ? 'BLOCKING' : 'report-only'}${c.reset}\n`,
);

// --- derived srgb (ADR-0043) ---------------------------------------------------------

for (const theme of THEMES)
  for (const [name, token] of Object.entries(manifest.color[theme])) {
    const expected = derivedSrgb(name, token);
    if (token.srgb !== expected)
      failures.push({
        check: 'derived',
        detail:
          `${theme}.${name}: srgb is "${token.srgb}" but its own oklch derives "${expected}". ` +
          'The hex is generated output (ADR-0043) — run `pnpm --filter @irodora/design-tokens generate`.',
      });
  }

// --- contrast ------------------------------------------------------------------------

const { results, findings } = checkContrast(manifest);
failures.push(...findings);

const width = Math.max(
  ...results.map((r) => `${r.theme}: ${r.foreground} on ${r.background}`.length),
);
for (const r of results) {
  const label = `${r.theme}: ${r.foreground} on ${r.background}`.padEnd(width);
  const mark = r.passes ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
  console.log(
    `  ${mark} ${label}  ${r.wcag.toFixed(2).padStart(6)}:1  ` +
      `${c.dim}need ${r.required.toFixed(1)} (${r.usage})  APCA Lc ${r.apca.toFixed(1)}${c.reset}`,
  );
  if (!r.passes)
    failures.push({
      check: 'contrast',
      detail:
        `${r.theme}: ${r.foreground} on ${r.background} is ${r.wcag.toFixed(2)}:1, below the ` +
        `${r.required.toFixed(1)} required for ${r.usage}. Change the colour or add the ` +
        'non-colour channel — never widen the tolerance.',
    });

  // APCA is reported, never substituted. A disagreement is flagged for design review because
  // it is usually a real perceptual issue, even though the gate remains WCAG.
  //
  // BANDED, because "Lc 52" and "Lc 37" are not the same statement and printing them
  // identically buries the second in a list of the first. Against 0.98G-4g: Lc 60 is the
  // floor for body text, Lc 45 the floor for large or bold text. A `text` token below 45 is
  // below even the large-text floor while WCAG calls it a pass.
  if (r.passes && r.usage === 'text') {
    const lc = Math.abs(r.apca);
    if (lc < 45)
      severeNotes.push(
        `${r.theme}: ${r.foreground} on ${r.background} passes WCAG (${r.wcag.toFixed(2)}:1) ` +
          `but APCA Lc is ${r.apca.toFixed(1)} — below the Lc 45 LARGE-text floor, on a token ` +
          'declared `text`. This one needs a decision, not a note.',
      );
    else if (lc < 60)
      notes.push(
        `${r.theme}: ${r.foreground} on ${r.background} passes WCAG (${r.wcag.toFixed(2)}:1) ` +
          `but APCA Lc is ${r.apca.toFixed(1)}, below the Lc 60 body-text floor.`,
      );
  }
}

// --- chroma ceiling and structure ----------------------------------------------------

failures.push(...checkChromaCeiling(manifest));
failures.push(...checkStructure(manifest));

// --- report --------------------------------------------------------------------------

console.log();
console.log(
  `${c.dim}  ${results.length} declared pairing(s) across ${THEMES.length} theme(s); ` +
    `${manifest.exceptions.length} recorded exception(s).${c.reset}`,
);
console.log(
  `${c.dim}  NOT CHECKED HERE: rendered surfaces, for colour-only status indicators. ` +
    'No component exists until F-017.' +
    c.reset,
);

if (severeNotes.length > 0) {
  console.log(
    `\n${c.red}${severeNotes.length} pairing(s) below the APCA LARGE-text floor, on a token ` +
      `declared \`text\`${c.reset}`,
  );
  for (const n of severeNotes) console.log(`  ${c.red}!${c.reset} ${n}`);
}

if (notes.length > 0) {
  console.log(`\n${c.yellow}${notes.length} note(s) for design review${c.reset}`);
  for (const n of notes) console.log(`  ${c.yellow}!${c.reset} ${n}`);
}

if (failures.length === 0) {
  console.log(`\n${c.green}${c.bold}Gate 9 passed.${c.reset}`);
  process.exit(0);
}

console.log(`\n${c.red}${c.bold}${failures.length} failure(s)${c.reset}`);
for (const f of failures)
  console.log(`  ${c.red}✗${c.reset} ${c.bold}${f.check}${c.reset}  ${f.detail}`);

if (!blocking) {
  console.log(
    `\n${c.yellow}Report-only: the manifest status is "${manifest.status}", not ` +
      `"${manifest.gate.contrast.blockingWhenStatus}".${c.reset}`,
  );
  process.exit(0);
}

process.exit(1);
