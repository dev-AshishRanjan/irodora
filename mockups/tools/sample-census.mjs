/**
 * F-233 — how the shipped corpus's colours fare as SAMPLES: text on them, and the edge around them.
 *
 * ## This measures. It changes nothing.
 *
 * The census has three parts, each over every corpus entry's derived hex, in each of the four
 * palettes:
 *
 * - **Neither ink.** Criterion 3 asks text on a sample to take whichever of the two inks passes
 *   4.5:1. The inks are `foreground`, and `inverse.foreground` (the ground's value): one light and
 *   one dark in every palette. A mid-tone can clear 4.5:1 with neither, and this lists the entries
 *   that do.
 * - **The keyline alone.** The share of entries against which the README `swatch.keyline`, drawn
 *   over `swatch.well`, clears 3:1. F-225's `swatch-edge.test` says it cannot hold every sample's
 *   edge by itself; this says how many it misses.
 * - **Compositing.** The keyline is translucent, and its composite is taken in encoded sRGB — the
 *   way React Native blends — which is the model the gate reports.
 * - **The move (ADR-0116).** `onSample`, the E3 rule applied per sample: for the text and for the
 *   edge, how many entries need a move, whether any has none, and the largest move in 0.001 steps
 *   of OKLab L and in ΔE00 from what is drawn.
 * - **A line where none is drawn (OQ-46).** The same for an element that binds no keyline: the line
 *   starts as the well, and the count is how many samples it has to show on.
 *
 * ```
 * pnpm --filter @irodora/design-tokens build   # the tool reads the built package
 * node mockups/tools/sample-census.mjs
 * ```
 *
 * No gate runs this. Like every helper in this directory, it is an authoring tool; the gate-9 test
 * F-233 adds recounts the same set from the same inputs.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const dist = (pkg) => pathToFileURL(join(ROOT, 'packages', pkg, 'dist', 'index.js')).href;
const { nativeColors, onSample, ON_SAMPLE_FLOOR, paintedOver } = await import(
  dist('design-tokens')
);
const { deltaE00, wcagContrast } = await import(dist('color-difference'));
const { srgbToXyz, xyzToLab } = await import(dist('color-spaces'));

/** The corpus the app ships: the label its generated bundle pins, read from the published version. */
const pinned = readFileSync(
  join(ROOT, 'apps', 'mobile', 'src', 'corpus', 'generated', 'bundle.ts'),
  'utf8',
).match(/export const CORPUS_LABEL = "([^"]+)";/u)?.[1];
if (pinned === undefined) throw new Error('no CORPUS_LABEL in the generated bundle');
const bundle = JSON.parse(
  readFileSync(join(ROOT, 'content', 'versions', `${pinned}.json`), 'utf8'),
);
const entries = bundle.entries.map((e) => ({ slug: e.entry.slug, hex: e.derived.hex }));

const rgbOf = (hex) => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
console.log(`corpus ${pinned}: ${String(entries.length)} entries\n`);
for (const [palette, colors] of Object.entries(nativeColors)) {
  const light = rgbOf(colors.foreground);
  const dark = rgbOf(colors['inverse.foreground']);
  // The keyline as it shows over the well, drawn as the 8-bit hex `onSample` starts from.
  const keyline = rgbOf(paintedOver(colors['swatch.keyline'], colors['swatch.well']));
  const neither = [];
  let keylinePasses = 0;
  for (const { slug, hex } of entries) {
    const s = rgbOf(hex);
    const best = Math.max(wcagContrast(s, light), wcagContrast(s, dark));
    if (best < 4.5) neither.push(`${slug} ${hex} ${best.toFixed(2)}`);
    if (wcagContrast(s, keyline) >= 3) keylinePasses++;
  }
  console.log(`== ${palette}`);
  console.log(`  neither ink clears 4.5:1 on ${String(neither.length)}:`);
  for (const n of neither) console.log(`    ${n}`);
  console.log(
    `  the keyline alone clears 3:1 on ${String(keylinePasses)} of ${String(entries.length)}`,
  );
  const inks = [colors.foreground, colors['inverse.foreground']];
  const edge = [paintedOver(colors['swatch.keyline'], colors['swatch.well'])];
  for (const [what, candidates, floor] of [
    ['text', inks, ON_SAMPLE_FLOOR.text],
    ['edge', edge, ON_SAMPLE_FLOOR.edge],
    ['line where no keyline is drawn (the well)', [colors['swatch.well']], ON_SAMPLE_FLOOR.edge],
  ]) {
    let moved = 0;
    let none = 0;
    let steps = 0;
    let far = 0;
    for (const { hex } of entries) {
      let r;
      try {
        r = onSample({ candidates, sampleHex: hex, floor });
      } catch {
        none++;
        continue;
      }
      if (!r.moved) continue;
      moved++;
      steps = Math.max(steps, r.steps);
      const lab = (h) => xyzToLab(srgbToXyz(rgbOf(h)));
      far = Math.max(far, deltaE00(lab(candidates[r.from]), lab(r.hex)));
    }
    console.log(
      `  the ${what} moves on ${String(moved)}, with none found on ${String(none)}; the largest move ${String(steps)} steps, ΔE00 ${far.toFixed(2)}`,
    );
  }
}
