#!/usr/bin/env node
/**
 * Irodora — the colour-vision preview stays inside its boundary (F-240, ADR-0131).
 *
 * The preview repaints every token and sample through the engine's simulation, and three promises
 * make that honest. Each is a property of the SOURCE, so each is checked here, in gate 2, in a second:
 *
 * 1. **It never reaches what is stored or exported** (criterion 2). The store, the export writers,
 *    the app's export and store adapters, and the colour card's document builder (`cardSvg`) name
 *    none of the preview's API. Byte-identity tests hold the outputs (`export-screen.test`,
 *    `add-garment-offer.test`, `card.test`); this holds the code paths, so a new writer that reached
 *    for the theme would be named before any test had a fixture for it.
 * 2. **One simulation, the engine's** (criterion 1). No Machado coefficient is written anywhere but
 *    `packages/cvd-engine/src`: a second copy of the model would be a second implementation, and the
 *    preview would drift from the scoring the moment either changed.
 * 3. **The engine's tritan refusal is never bypassed.** The preview's own modules name neither
 *    `simulateDichromacy`, `VIENOT_1999` nor `hasDichromacySupport` (ADR-0131 §1).
 *
 * It proves itself on every run: planted text that breaks each promise must be named, and the
 * repository must not be.
 *
 * Usage:
 *   node scripts/verify-preview-boundary.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciError } from './annotate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Every TypeScript source under a directory. */
function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/u.test(name) ? [full] : [];
  });
}
/**
 * Code without its comments: a comment may NAME what the code must not use, and say why — the
 * preview's own module explains the tritan refusal it never reaches. Block comments, and line
 * comments that start a line or follow whitespace (so a '//' inside a URL string survives).
 */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|\s)\/\/[^\n]*/gu, '$1');
const read = (file) => ({
  path: relative(ROOT, file).replaceAll('\\', '/'),
  text: code(readFileSync(file, 'utf8')),
});

/* --- 1. the stored and exported paths -------------------------------------------------------- */

const STORED_OR_EXPORTED = [
  'packages/export/src',
  'packages/store/src',
  'apps/mobile/src/export',
  'apps/mobile/src/store',
];
/** The preview's API, and the theme it is applied through: none belongs in what is stored or written. */
const PREVIEW_API =
  /\b(simulatePaint|simulatePalette|useVisionPreview|VisionPreviewProvider|useVision|VisionProvider|useTheme)\b|\bpaint\(/u;

/** The colour card's document builder: the function body of `cardSvg`, which is what leaves the app. */
function cardDocument(text) {
  const start = text.indexOf('export function cardSvg(');
  if (start < 0) return null;
  const next = text.indexOf('\nexport function ', start + 1);
  return text.slice(start, next < 0 ? undefined : next);
}

function storedOrExportedFindings(files, card) {
  const out = [];
  for (const { path, text } of files) {
    const hit = PREVIEW_API.exec(text);
    if (hit !== null)
      out.push(`${path} names ${hit[0]} — a preview must never reach what is stored or exported`);
  }
  const document = card === null ? null : cardDocument(card.text);
  if (document === null)
    out.push(`${card?.path ?? 'apps/mobile/src/card.ts'}: cardSvg was not found`);
  else {
    const hit = PREVIEW_API.exec(document);
    if (hit !== null)
      out.push(`cardSvg names ${hit[0]} — the card's document is built from the declared palette`);
  }
  return out;
}

/* --- 2. one simulation ----------------------------------------------------------------------- */

/** Machado's matrices at full severity, read from the engine's own tables, never retyped here. */
function machadoCoefficients() {
  const engine = readFileSync(join(ROOT, 'packages/cvd-engine/src/machado.ts'), 'utf8');
  const out = new Set();
  for (const table of ['MACHADO_PROTAN', 'MACHADO_DEUTAN', 'MACHADO_TRITAN']) {
    const body = engine.slice(engine.indexOf(`export const ${table}`));
    const rows = [...body.slice(0, body.indexOf('];')).matchAll(/\[([^[\]]+)\]/gu)];
    const full = rows.at(-1)?.[1] ?? '';
    for (const n of full.split(',').map((x) => x.trim()))
      // Distinctive values only: a coefficient of 0 or 1 is everywhere for other reasons.
      if (/^-?\d\.\d{5,}$/u.test(n)) out.add(n);
  }
  if (out.size < 20)
    throw new Error(`read ${String(out.size)} Machado coefficients from the engine; expected 27`);
  return out;
}

function secondSimulationFindings(files, coefficients) {
  const out = [];
  for (const { path, text } of files)
    for (const n of coefficients)
      if (text.includes(n)) {
        out.push(`${path} writes Machado's ${n} — the model belongs to packages/cvd-engine alone`);
        break;
      }
  return out;
}

/* --- 3. the tritan refusal ------------------------------------------------------------------- */

const PREVIEW_MODULES = [
  'packages/design-tokens/src/preview.ts',
  'packages/ui/src/vision.tsx',
  'packages/ui/src/theme.tsx',
  'apps/mobile/src/vision.tsx',
  'apps/mobile/src/VisionStrip.tsx',
];
const DICHROMACY = /\b(simulateDichromacy|VIENOT_1999|hasDichromacySupport)\b/u;

function refusalFindings(files) {
  return files.flatMap(({ path, text }) => {
    const hit = DICHROMACY.exec(text);
    return hit === null
      ? []
      : [`${path} names ${hit[0]} — the preview never reaches the engine's tritan refusal`];
  });
}

/* --- run ------------------------------------------------------------------------------------- */

console.log(`\n${BOLD}Irodora — the colour-vision preview's boundary (F-240)${OFF}\n`);

const coefficients = machadoCoefficients();
const anyCoefficient = [...coefficients][0];

// The proof first: each promise, broken in planted text, must be named.
const planted = {
  stored: storedOrExportedFindings(
    [{ path: 'planted/export.ts', text: 'const ink = simulatePaint(hex, mode);' }],
    {
      path: 'planted/card.ts',
      text: 'export function cardSvg(e) { return paint(e.hex); }\nexport function other() {}',
    },
  ),
  second: secondSimulationFindings(
    [{ path: 'planted/filter.ts', text: `const m = [${anyCoefficient}, 0, 0];` }],
    coefficients,
  ),
  refusal: refusalFindings([
    { path: 'planted/preview.ts', text: "simulateDichromacy(rgb, 'tritan')" },
  ]),
};
const proven =
  planted.stored.length === 2 && planted.second.length === 1 && planted.refusal.length === 1;

// Then the repository.
const storedFiles = STORED_OR_EXPORTED.flatMap((dir) => sources(join(ROOT, dir))).map(read);
const card = read(join(ROOT, 'apps/mobile/src/card.ts'));
const engineDir = join(ROOT, 'packages/cvd-engine/src');
const allSources = [
  ...readdirSync(join(ROOT, 'packages'))
    .map((p) => join(ROOT, 'packages', p, 'src'))
    .filter((d) => {
      try {
        return statSync(d).isDirectory() && d !== engineDir;
      } catch {
        return false;
      }
    })
    .flatMap(sources),
  ...sources(join(ROOT, 'apps/mobile/src')),
  ...sources(join(ROOT, 'apps/mobile/app')),
].map(read);
const previewFiles = PREVIEW_MODULES.map((p) => read(join(ROOT, p)));

const findings = [
  ...storedOrExportedFindings(storedFiles, card),
  ...secondSimulationFindings(allSources, coefficients),
  ...refusalFindings(previewFiles),
];

console.log(
  `${DIM}  ${String(storedFiles.length)} stored or exported source(s) and cardSvg; ${String(allSources.length)} source(s) for a second simulation; ${String(previewFiles.length)} preview module(s)${OFF}`,
);
if (!proven) {
  const detail = `planted breaks named: stored ${String(planted.stored.length)}/2, second simulation ${String(planted.second.length)}/1, refusal ${String(planted.refusal.length)}/1`;
  console.log(`  ${RED}✗${OFF} the check could not see its own planted breaks — ${detail}`);
  ciError('verify-preview-boundary', detail);
  process.exit(1);
}
console.log(
  `  ${GREEN}✓${OFF} names each planted break ${DIM}(a writer reaching the preview, a copied coefficient, the tritan refusal)${OFF}`,
);
if (findings.length > 0) {
  for (const f of findings) console.log(`  ${RED}✗${OFF} ${f}`);
  ciError('verify-preview-boundary', findings.join('; '));
  console.log(`\n${RED}${BOLD}The preview's boundary is broken.${OFF}\n`);
  process.exit(1);
}
console.log(`\n${GREEN}${BOLD}The preview stays inside its boundary.${OFF}\n`);
