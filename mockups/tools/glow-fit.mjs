#!/usr/bin/env node
/**
 * Fit the glow a drawn mark sits in (F-231): how strong it is, how far it spreads, and what shape.
 *
 * THE MODEL. The glow is the mark's own ink, blurred by a Gaussian of deviation `sigma` and laid
 * behind the mark at opacity `alpha`; the mark is drawn over it. So a pixel's luminance is
 *
 *   L = ground + (ink − ground) · (c + (1 − c) · alpha · B)
 *
 * where `c` is the mark's coverage of the pixel and `B` the blurred coverage — a fraction, in the
 * ENCODED channels, which is how an opacity composites (`opacity.art`'s convention). The geometry
 * is `mark-fit.mjs`'s, read from the same dump, so the glow is fitted around the mark the record
 * already holds.
 *
 * THE SHAPE IS A READING, NOT AN ASSUMPTION. A glow can be a blurred mark (brighter in the notches,
 * where two petals both reach) or a radial gradient (a function of the distance from the centre
 * alone). The fit is run both ways — the blurred mark with its two parameters, and the best radial
 * profile, one free value per pixel of radius — and the dump is called `blurred-mark` only where
 * the two-parameter model leaves less residual than the radial one with all its freedom.
 *
 * WHAT IT READS. Pixels outside the mark by more than `GUARD` px (a JPEG smears the ink's edge into
 * its neighbours, and a cut is narrower than that smear), inside `REACH_FACTOR` × the mark's reach,
 * and above `--exclude-below` (14's wordmark starts under the mark). The ground is the median of
 * the dump beyond that reach, where the glow has faded.
 *
 * USE
 *   node glow-fit.mjs <dump.json> [--exclude-below Y] [--dp-per-px N]
 *       the glow's alpha, its sigma (px, dp, and as a fraction of the mark's grid), and its shape
 *   node glow-fit.mjs --calibrate
 *       renders known glows around 14's mark, round-trips each through a JPEG at quality 85
 *       (mark.ps1 -jpeg), and fails unless alpha and sigma are recovered within tolerance and the
 *       decoy — a radial glow of the same strength — is read as radial
 *
 * A dump is mark.ps1's output: {x, y, w, h, lum: [row, ...]}.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { covers, fit as fitMark } from './mark-fit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Samples per pixel, per axis, for the mark's coverage. */
const SUPERSAMPLE = 4;
/** How far outside the ink a pixel must be to be read (px). */
const GUARD = 2.5;
/** Pixels read lie within this multiple of the mark's reach from its centre. */
const REACH_FACTOR = 2;
/** The ground is read beyond this multiple of the reach. */
const GROUND_FACTOR = 2.05;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The mark's coverage of every pixel of a w × h grid, its centre at (cx, cy). */
function coverage(g, w, h, cx, cy) {
  const n = SUPERSAMPLE;
  const out = new Float64Array(w * h);
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1) {
      let hit = 0;
      for (let b = 0; b < n; b += 1)
        for (let a = 0; a < n; a += 1)
          if (covers(g, i + (a + 0.5) / n - cx, j + (b + 0.5) / n - cy)) hit += 1;
      out[j * w + i] = hit / (n * n);
    }
  return out;
}

/** A separable Gaussian blur of a w × h field, zero outside it. */
export function blur(field, w, h, sigma) {
  const r = Math.ceil(4 * sigma);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) =>
    Math.exp(-((i - r) ** 2) / (2 * sigma ** 2)),
  );
  const sum = k.reduce((s, v) => s + v, 0);
  for (let i = 0; i < k.length; i += 1) k[i] /= sum;
  const tmp = new Float64Array(w * h);
  const out = new Float64Array(w * h);
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1) {
      let s = 0;
      for (let t = -r; t <= r; t += 1) {
        const x = i + t;
        if (x >= 0 && x < w) s += field[j * w + x] * k[t + r];
      }
      tmp[j * w + i] = s;
    }
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1) {
      let s = 0;
      for (let t = -r; t <= r; t += 1) {
        const y = j + t;
        if (y >= 0 && y < h) s += tmp[y * w + i] * k[t + r];
      }
      out[j * w + i] = s;
    }
  return out;
}

/** Whether a pixel is within GUARD px of any ink (so a JPEG's smear of the edge reaches it). */
function nearInk(cov, w, h) {
  const g = Math.ceil(GUARD);
  const near = new Uint8Array(w * h);
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1) {
      if (cov[j * w + i] <= 0) continue;
      for (let b = -g; b <= g; b += 1)
        for (let a = -g; a <= g; a += 1) {
          const x = i + a;
          const y = j + b;
          if (x >= 0 && x < w && y >= 0 && y < h && a * a + b * b <= GUARD * GUARD)
            near[y * w + x] = 1;
        }
    }
  return near;
}

/**
 * The glow a dump draws: the mark first (`mark-fit`), then alpha and sigma by least squares —
 * alpha in closed form for each sigma, sigma by a golden-section search — and the radial model.
 */
export function fitGlow(dump, { excludeBelow = Infinity } = {}) {
  const mark = fitMark(dump);
  const { w, h } = dump;
  const cx = mark.centre[0] - dump.x;
  const cy = mark.centre[1] - dump.y;
  const lum = dump.lum;
  const radius = (i, j) => Math.hypot(i + 0.5 - cx, j + 0.5 - cy);

  const far = [];
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1)
      if (radius(i, j) > GROUND_FACTOR * mark.reach && j + dump.y < excludeBelow)
        far.push(lum[j][i]);
  if (far.length < 50)
    throw new Error('glow-fit: the dump reaches too little ground beyond the glow');
  const ground = median(far);
  const span = mark.ink - ground;

  const cov = coverage(mark, w, h, cx, cy);
  const near = nearInk(cov, w, h);
  const read = [];
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1)
      if (
        !near[j * w + i] &&
        radius(i, j) <= REACH_FACTOR * mark.reach &&
        j + dump.y < excludeBelow
      )
        read.push(j * w + i);

  // The excess over the ground, as a fraction of ink − ground, at each pixel read.
  const excess = read.map((p) => (lum[Math.floor(p / w)][p % w] - ground) / span);

  const residualFor = (sigma) => {
    const b = blur(cov, w, h, sigma);
    let sxy = 0;
    let sxx = 0;
    read.forEach((p, k) => {
      const x = (1 - cov[p]) * b[p];
      sxy += x * excess[k];
      sxx += x * x;
    });
    const alpha = sxy / sxx;
    let ss = 0;
    read.forEach((p, k) => {
      ss += (excess[k] - alpha * (1 - cov[p]) * b[p]) ** 2;
    });
    return { alpha, sigma, rms: Math.sqrt(ss / read.length) };
  };

  let lo = 0.5;
  let hi = mark.reach;
  const phi = (Math.sqrt(5) - 1) / 2;
  let a = hi - phi * (hi - lo);
  let bb = lo + phi * (hi - lo);
  let fa = residualFor(a);
  let fb = residualFor(bb);
  for (let step = 0; step < 40; step += 1) {
    if (fa.rms < fb.rms) {
      hi = bb;
      bb = a;
      fb = fa;
      a = hi - phi * (hi - lo);
      fa = residualFor(a);
    } else {
      lo = a;
      a = bb;
      fa = fb;
      bb = lo + phi * (hi - lo);
      fb = residualFor(bb);
    }
  }
  const best = fa.rms < fb.rms ? fa : fb;

  // The radial model: the median excess in each 1 px ring, every pixel predicted by its ring's.
  const rings = new Map();
  read.forEach((p, k) => {
    const ring = Math.floor(radius(p % w, Math.floor(p / w)));
    (rings.get(ring) ?? rings.set(ring, []).get(ring)).push(excess[k]);
  });
  const ringValue = new Map([...rings].map(([r, xs]) => [r, median(xs)]));
  let radialSs = 0;
  read.forEach((p, k) => {
    radialSs += (excess[k] - ringValue.get(Math.floor(radius(p % w, Math.floor(p / w))))) ** 2;
  });
  const radialRms = Math.sqrt(radialSs / read.length);

  const grid = 2 * mark.reach;
  return {
    centre: mark.centre,
    ground,
    ink: mark.ink,
    reach: mark.reach,
    alpha: best.alpha,
    sigma: best.sigma,
    sigmaOfGrid: best.sigma / grid,
    rms: best.rms,
    radialRms,
    shape: best.rms < radialRms ? 'blurred-mark' : 'radial',
    pixels: read.length,
  };
}

function jpegRoundTrip(grid, quality = 85) {
  const dirPath = mkdtempSync(join(tmpdir(), 'glow-fit-'));
  const gridPath = join(dirPath, 'grid.json');
  const jpgPath = join(dirPath, 'glow.jpg');
  const dumpPath = join(dirPath, 'dump.json');
  writeFileSync(gridPath, JSON.stringify(grid));
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      join(HERE, 'mark.ps1'),
      '-jpeg',
      '-in',
      gridPath,
      '-out',
      jpgPath,
      '-dump',
      dumpPath,
      '-quality',
      String(quality),
    ],
    { stdio: 'pipe' },
  );
  return JSON.parse(readFileSync(dumpPath, 'utf8'));
}

/** A mark in its glow, as a luminance grid: blurred-mark or radial, of a given strength. */
function renderGlow(g, w, h, cx, cy, ground, ink, { alpha, sigma, shape }) {
  const cov = coverage(g, w, h, cx, cy);
  let b;
  if (shape === 'radial') {
    // The decoy: the blurred mark's ring-mean profile, laid out as a pure function of radius, so
    // it is as strong and as wide as the real glow and differs only in shape.
    const real = blur(cov, w, h, sigma);
    const rings = new Map();
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const r = Math.floor(Math.hypot(i + 0.5 - cx, j + 0.5 - cy));
        (rings.get(r) ?? rings.set(r, []).get(r)).push(real[j * w + i]);
      }
    const mean = new Map(
      [...rings].map(([r, xs]) => [r, xs.reduce((s, v) => s + v, 0) / xs.length]),
    );
    b = new Float64Array(w * h);
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1)
        b[j * w + i] = mean.get(Math.floor(Math.hypot(i + 0.5 - cx, j + 0.5 - cy)));
  } else b = blur(cov, w, h, sigma);
  const lum = [];
  for (let j = 0; j < h; j += 1) {
    const row = [];
    for (let i = 0; i < w; i += 1) {
      const c = cov[j * w + i];
      row.push(ground + (ink - ground) * (c + (1 - c) * alpha * b[j * w + i]));
    }
    lum.push(row);
  }
  return { x: 0, y: 0, w, h, lum };
}

function calibrate() {
  // 14's splash mark as mark-fit reads it, in 14's ground and ink, at the dump's size.
  const g = {
    petals: 5,
    phase: 0,
    orbit: 36.02,
    petal: 21.11,
    hub: 29.14,
    eye: 9.79,
    ringOuter: 11.86,
    stamenOuter: 28.16,
    stamenWidth: 2.3,
    anther: 0,
    seamWidth: 2.56,
  };
  const [w, h, cx, cy, ground, ink] = [240, 240, 120.3, 119.6, 24.7, 246.9];
  const cases = [
    { name: 'a glow like 14’s', glow: { alpha: 0.42, sigma: 11, shape: 'blurred-mark' } },
    { name: 'a tighter, stronger glow', glow: { alpha: 0.6, sigma: 6, shape: 'blurred-mark' } },
    { name: 'a wide, faint glow', glow: { alpha: 0.25, sigma: 18, shape: 'blurred-mark' } },
    {
      name: 'DECOY a radial glow of the same strength',
      glow: { alpha: 0.42, sigma: 11, shape: 'radial' },
    },
  ];
  let failed = 0;
  for (const c of cases) {
    const dump = jpegRoundTrip(renderGlow(g, w, h, cx, cy, ground, ink, c.glow));
    const read = fitGlow(dump);
    const report = { case: c.name, shape: read.shape };
    if (c.glow.shape === 'radial') {
      if (read.shape !== 'radial') {
        failed += 1;
        report.FAILS = 'a radial glow read as a blurred mark';
      }
    } else {
      report.alpha = [c.glow.alpha, Number(read.alpha.toFixed(3))];
      report.sigma = [c.glow.sigma, Number(read.sigma.toFixed(2))];
      if (read.shape !== 'blurred-mark') {
        failed += 1;
        report.FAILS = 'a blurred mark read as radial';
      }
      if (Math.abs(read.alpha / c.glow.alpha - 1) > 0.05) {
        failed += 1;
        report.FAILS = `alpha ${read.alpha.toFixed(3)} is more than 5 % from ${String(c.glow.alpha)}`;
      }
      if (Math.abs(read.sigma / c.glow.sigma - 1) > 0.05) {
        failed += 1;
        report.FAILS = `sigma ${read.sigma.toFixed(2)} is more than 5 % from ${String(c.glow.sigma)}`;
      }
    }
    console.log(JSON.stringify(report));
  }
  if (failed > 0) {
    console.error(`glow-fit: calibration FAILED, ${String(failed)} reading(s) outside tolerance`);
    process.exit(1);
  }
  console.log(
    'glow-fit: calibration passed — alpha and sigma recovered within 5 %, and the radial decoy read as radial',
  );
}

const main =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
const args = main ? process.argv.slice(2) : ['--imported'];
const flag = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
if (args[0] === '--imported') {
  // imported: nothing to run
} else if (args.includes('--calibrate')) calibrate();
else if (args.length > 0 && !args[0].startsWith('--')) {
  const read = fitGlow(JSON.parse(readFileSync(args[0], 'utf8')), {
    excludeBelow: Number(flag('--exclude-below') ?? Infinity),
  });
  const dpPerPx = Number(flag('--dp-per-px') ?? NaN);
  if (Number.isFinite(dpPerPx))
    read.dp = { sigma: read.sigma * dpPerPx, reach: read.reach * dpPerPx };
  console.log(JSON.stringify(read, null, 2));
} else {
  console.error(
    'usage: node glow-fit.mjs <dump.json> [--exclude-below Y] [--dp-per-px N] | --calibrate',
  );
  process.exit(2);
}
