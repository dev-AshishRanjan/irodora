/**
 * F-233 — a pinked edge's teeth, read off a mockup: how far apart their tips are, and how deep.
 *
 * ## This measures. It changes nothing.
 *
 * `12` draws its fabric sample with a pinked edge. This reads the edge profile along the box's top
 * (one reading per column) and down its left (one per row): the position, to a fraction of a pixel,
 * where each line of pixels crosses half-way from the card to the fill. The tips are the profile's
 * local minima, the valleys its maxima; the pitch is the mean distance between tips, the depth the
 * mean valley less the mean tip.
 *
 * ```
 * node mockups/tools/pinking.mjs 12_add_garment_flow.jpg 67 156 167 167
 * ```
 *
 * The box is the sample's inventory box. The strips start 8 px outside it, so the card is read
 * before the teeth. No gate runs this; the inventory records what it printed (`raw.toothPx`,
 * `raw.pitchPx`).
 */

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [image, ...box] = process.argv.slice(2);
if (image === undefined || box.length !== 4) {
  console.error('usage: node mockups/tools/pinking.mjs <mockup image> <x> <y> <w> <h>');
  process.exit(2);
}
const [x, y, w, h] = box.map(Number);
const MARGIN = 8;
const DEPTH = 26;

/** A rectangle of the image as rows of luminance (0–1), read through GDI+. */
function read(rx, ry, rw, rh) {
  const script = `
Add-Type -AssemblyName System.Drawing
$b = New-Object System.Drawing.Bitmap '${join(HERE, '..', image).replace(/'/gu, "''")}'
$out = New-Object System.Text.StringBuilder
for ($j = 0; $j -lt ${rh}; $j++) {
  $row = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt ${rw}; $i++) {
    $p = $b.GetPixel(${rx} + $i, ${ry} + $j)
    $row.Add(('{0:X2}{1:X2}{2:X2}' -f $p.R, $p.G, $p.B))
  }
  [void]$out.AppendLine([string]::Join(' ', $row))
}
$b.Dispose()
$out.ToString()`;
  const text = execFileSync('powershell', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return text
    .trim()
    .split(/\r?\n/u)
    .map((r) =>
      r.split(' ').map((hex) => {
        const n = Number.parseInt(hex, 16);
        return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
      }),
    );
}

/** Where each line crosses half-way from the card (index 0) to the fill (the far end). */
function profile(lines) {
  return lines.map((line) => {
    const t = (line[0] + line[line.length - 1]) / 2;
    for (let j = 1; j < line.length; j += 1) {
      const a = line[j - 1];
      const b = line[j];
      if ((a - t) * (b - t) <= 0 && a !== b) return j - 1 + (t - a) / (b - a);
    }
    return null;
  });
}

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;

/** How far in from each end of a side the corner cut reaches, in px: its extrema are not teeth. */
const CORNER = 8;

function teeth(p) {
  const tips = [];
  const valleys = [];
  for (let i = CORNER; i < p.length - CORNER; i += 1) {
    const around = p.slice(i - 2, i + 3);
    if (around.some((v) => v === null)) continue;
    if (p[i] === Math.min(...around)) tips.push([i, p[i]]);
    if (p[i] === Math.max(...around)) valleys.push([i, p[i]]);
  }
  const gaps = tips.slice(1).map(([at], i) => at - tips[i][0]);
  return {
    tips: tips.length,
    pitch: mean(gaps),
    depth: mean(valleys.map(([, v]) => v)) - mean(tips.map(([, v]) => v)),
    span: tips.length > 1 ? tips[tips.length - 1][0] - tips[0][0] : 0,
  };
}

// The top: columns across the box, each read downward from above it.
const top = read(x, y - MARGIN, w, DEPTH);
const columns = top[0].map((_, i) => top.map((row) => row[i]));
// The left: rows down the box, each read rightward from left of it.
const left = read(x - MARGIN, y, DEPTH, h);

const results = [
  ['top', teeth(profile(columns))],
  ['left', teeth(profile(left))],
];
for (const [side, r] of results)
  console.log(
    `${side}: ${String(r.tips)} tips over ${r.span.toFixed(0)} px — pitch ${r.pitch.toFixed(2)} px, depth ${r.depth.toFixed(2)} px`,
  );
const pooledPitch =
  results.reduce((s, [, r]) => s + r.span, 0) / results.reduce((s, [, r]) => s + r.tips - 1, 0);
const pooledDepth = mean(results.map(([, r]) => r.depth));
console.log(`pooled: pitch ${pooledPitch.toFixed(2)} px, depth ${pooledDepth.toFixed(2)} px`);
