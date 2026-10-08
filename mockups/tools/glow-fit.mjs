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
 *   node glow-fit.mjs --radial <dump.json> --centre X,Y --inner R --outer R --ink L [--dp-per-px N]
 *       a glow read as a function of radius alone (THE RADIAL MODE, below): whether it is radial,
 *       and its profile as a Gaussian spot or a blurred disc (F-236, `27`'s working mark)
 *   node glow-fit.mjs --calibrate-radial
 *       renders known radial glows around a mark at 27's size through a JPEG at quality 85, and
 *       fails unless each profile is recovered beyond the ink within 0.01 and each centre within
 *       0.5 px, and the decoy — 14's blurred mark — is read as mark-shaped
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

/*
 * THE RADIAL MODE (F-236). Not every glow is the mark blurred. `27` draws its working mark as an
 * OUTLINE in a soft purple cloud, and the cloud is as bright between the petals as along them —
 * which a blur of the mark cannot be, because a notch lies further from the ink than a petal's tip
 * at the same radius. So the radial mode reads a glow as a function of the distance from the
 * centre alone, and asks the dump two questions:
 *
 * 1. IS IT RADIAL? Just beyond the ink, the excess along the petals' directions against the
 *    notches' — the `modulation`. A blurred mark is brighter on one side (`--calibrate-radial`'s
 *    decoy is 14's own glow, and it must be read as `mark-shaped`).
 * 2. WHAT PROFILE? Two models, each fitted by least squares with the opacity in closed form:
 *    - `gaussian`: alpha · exp(−r² / 2σ²), a Gaussian spot;
 *    - `disc`: a disc of radius R at opacity alpha, blurred by a Gaussian of σ — the shape a design
 *      tool draws when a circle is given a layer blur. Its value at r is the share of the kernel
 *      centred there that falls inside the disc, integrated radially with the scaled Bessel I0.
 *    The one with the smaller residual is the reading; both are printed, beside the free profile
 *    (one median per pixel of radius), which neither can beat.
 *
 * WHAT IT CANNOT READ: the glow under the ink. Only the annulus beyond it is fitted, and two
 * models that agree there can disagree by a third of the ink at the centre (`--calibrate-radial`
 * prints `worstInsideInk`). A record that uses the profile inside `--inner` says it extrapolated.
 *
 * The ink is excluded inside `--inner` (the mark's reach plus a JPEG's smear); the ground is the
 * median of the annulus `--outer` to `--outer` + 4. The excess is a fraction of `--ink` − ground,
 * in the ENCODED channels — how an opacity composites, as above. The centre is refined from the
 * `--centre` given: the centroid of the excess inside `--inner`, three times.
 */

/** exp(−x) · I0(x) for x ≥ 0 (Abramowitz and Stegun 9.8.1 and 9.8.2, |error| < 2e-7). */
function besselI0e(x) {
  if (x <= 3.75) {
    const t = (x / 3.75) ** 2;
    return (
      (1 +
        t *
          (3.5156229 +
            t *
              (3.0899424 + t * (1.2067492 + t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))))) *
      Math.exp(-x)
    );
  }
  const t = 3.75 / x;
  return (
    (0.39894228 +
      t *
        (0.01328592 +
          t *
            (0.00225319 +
              t *
                (-0.00157565 +
                  t *
                    (0.00916281 +
                      t *
                        (-0.02057706 + t * (0.02635537 + t * (-0.01647633 + t * 0.00392377)))))))) /
    Math.sqrt(x)
  );
}

/** The share of a Gaussian kernel of deviation `sigma`, centred `r` from a disc's centre, inside it. */
export function blurredDisc(r, radius, sigma) {
  if (radius <= 0) return 0;
  const steps = 240;
  const h = radius / steps;
  const s2 = sigma * sigma;
  let sum = 0;
  for (let i = 0; i <= steps; i += 1) {
    const rho = i * h;
    const w = i === 0 || i === steps ? 0.5 : 1;
    sum += w * (rho / s2) * Math.exp(-((r - rho) ** 2) / (2 * s2)) * besselI0e((r * rho) / s2);
  }
  return sum * h;
}

/** The two radial models, as functions of r. */
export const radialModels = {
  gaussian:
    ({ sigma }) =>
    (r) =>
      Math.exp(-(r * r) / (2 * sigma * sigma)),
  disc:
    ({ radius, sigma }) =>
    (r) =>
      blurredDisc(r, radius, sigma),
};

/** Golden-section minimum of f over [lo, hi]. */
function golden(f, lo, hi, steps = 36) {
  const phi = (Math.sqrt(5) - 1) / 2;
  let a = hi - phi * (hi - lo);
  let b = lo + phi * (hi - lo);
  let fa = f(a);
  let fb = f(b);
  for (let s = 0; s < steps; s += 1) {
    if (fa.rms < fb.rms) {
      hi = b;
      b = a;
      fb = fa;
      a = hi - phi * (hi - lo);
      fa = f(a);
    } else {
      lo = a;
      a = b;
      fa = fb;
      b = lo + phi * (hi - lo);
      fb = f(b);
    }
  }
  return fa.rms < fb.rms ? fa : fb;
}

/** The radial reading of a dump (see THE RADIAL MODE above). */
export function fitRadial(dump, { centre, inner, outer, ink, petals = 5, phaseDeg = 0 }) {
  const { w, h, lum } = dump;
  let cx = centre[0] - dump.x;
  let cy = centre[1] - dump.y;
  const radius = (i, j) => Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
  const groundOf = () => {
    const ring = [];
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const r = radius(i, j);
        if (r >= outer && r <= outer + 4) ring.push(lum[j][i]);
      }
    if (ring.length < 50) throw new Error('glow-fit --radial: the dump reaches too little ground');
    return median(ring);
  };
  for (let pass = 0; pass < 3; pass += 1) {
    const g = groundOf();
    let s = 0;
    let sx = 0;
    let sy = 0;
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1)
        if (radius(i, j) < inner) {
          const e = Math.max(0, lum[j][i] - g);
          s += e;
          sx += e * (i + 0.5);
          sy += e * (j + 0.5);
        }
    cx = sx / s;
    cy = sy / s;
  }
  const ground = groundOf();
  const span = ink - ground;

  // Every pixel read, with its radius, binned to a quarter pixel so a model is tabulated once.
  const BIN = 0.25;
  const read = [];
  for (let j = 0; j < h; j += 1)
    for (let i = 0; i < w; i += 1) {
      const r = radius(i, j);
      if (r >= inner && r < outer)
        read.push({ r, bin: Math.round(r / BIN), e: (lum[j][i] - ground) / span, i, j });
    }
  const bins = [...new Set(read.map((p) => p.bin))];
  const fitModel = (shape) => {
    const tab = new Map(bins.map((b) => [b, shape(b * BIN)]));
    let sxy = 0;
    let sxx = 0;
    for (const p of read) {
      const x = tab.get(p.bin);
      sxy += x * p.e;
      sxx += x * x;
    }
    const alpha = sxx > 0 ? sxy / sxx : 0;
    let ss = 0;
    for (const p of read) ss += (p.e - alpha * tab.get(p.bin)) ** 2;
    return { alpha, rms: Math.sqrt(ss / read.length) };
  };

  const gaussian = golden(
    (sigma) => ({ sigma, ...fitModel(radialModels.gaussian({ sigma })) }),
    0.5,
    2 * outer,
  );
  let disc = { rms: Infinity };
  for (let r0 = 0.5; r0 <= outer; r0 += 0.5) {
    const best = golden(
      (sigma) => ({ radius: r0, sigma, ...fitModel(radialModels.disc({ radius: r0, sigma })) }),
      0.5,
      outer,
      28,
    );
    if (best.rms < disc.rms) disc = best;
  }

  // The free profile: one median per pixel of radius.
  const rings = new Map();
  for (const p of read) {
    const k = Math.floor(p.r);
    (rings.get(k) ?? rings.set(k, []).get(k)).push(p.e);
  }
  const ringValue = new Map([...rings].map(([k, xs]) => [k, median(xs)]));
  const radialRms = Math.sqrt(
    read.reduce((s, p) => s + (p.e - ringValue.get(Math.floor(p.r))) ** 2, 0) / read.length,
  );

  // Petals against notches, in the first 6 px beyond the ink.
  const half = 180 / petals / 2;
  const sector = (p) => {
    const deg =
      ((Math.atan2(p.i + 0.5 - cx, -(p.j + 0.5 - cy)) * 180) / Math.PI - phaseDeg + 720) %
      (360 / petals);
    return deg <= half || deg >= 360 / petals - half ? 'petal' : 'notch';
  };
  const near = read.filter((p) => p.r < inner + 6);
  const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const P = mean(near.filter((p) => sector(p) === 'petal').map((p) => p.e));
  const N = mean(near.filter((p) => sector(p) === 'notch').map((p) => p.e));
  const modulation = (P - N) / ((P + N) / 2);

  const model = disc.rms < gaussian.rms ? 'disc' : 'gaussian';
  const chosen = model === 'disc' ? disc : gaussian;
  const at = model === 'disc' ? radialModels.disc(disc) : radialModels.gaussian(gaussian);
  const profile = Object.fromEntries(
    Array.from({ length: Math.floor(outer / 4) + 1 }, (_, k) => [
      k * 4,
      Number((chosen.alpha * at(k * 4)).toFixed(4)),
    ]),
  );
  return {
    centre: [cx + dump.x, cy + dump.y],
    ground,
    ink,
    modulation,
    shape: Math.abs(modulation) <= RADIAL_MODULATION ? 'radial' : 'mark-shaped',
    gaussian,
    disc,
    radialRms,
    model,
    profile,
    pixels: read.length,
  };
}

/** The largest petal-against-notch modulation a radial glow is read with (`--calibrate-radial`). */
const RADIAL_MODULATION = 0.12;

/** A mark in a radial glow, as a luminance grid: the glow's opacity at each pixel is `glow(r)`. */
function renderRadial(g, w, h, cx, cy, ground, ink, glow) {
  const cov = coverage(g, w, h, cx, cy);
  const lum = [];
  for (let j = 0; j < h; j += 1) {
    const row = [];
    for (let i = 0; i < w; i += 1) {
      const c = cov[j * w + i];
      const e = glow(Math.hypot(i + 0.5 - cx, j + 0.5 - cy));
      row.push(ground + (ink - ground) * (c + (1 - c) * e));
    }
    lum.push(row);
  }
  return { x: 0, y: 0, w, h, lum };
}

function calibrateRadial() {
  // 14's splash mark scaled to 27's reach (26.3 px), in 27's ground and ink, at 27's dump size.
  const s = 26.3 / 57.44;
  const g = {
    petals: 5,
    phase: 0,
    orbit: 36.02 * s,
    petal: 21.11 * s,
    hub: 29.14 * s,
    eye: 9.79 * s,
    ringOuter: 11.86 * s,
    stamenOuter: 28.16 * s,
    stamenWidth: 2.3 * s,
    anther: 0,
    seamWidth: 2.56 * s,
  };
  const [w, h, cx, cy, ground, ink] = [116, 116, 58.3, 57.6, 31.8, 185.8];
  const options = { centre: [cx + 0.7, cy - 0.6], inner: 29, outer: 52, ink };
  const cases = [
    {
      name: 'a blurred disc like 27’s',
      model: 'disc',
      params: { alpha: 0.55, radius: 18, sigma: 9 },
    },
    { name: 'a wider, fainter disc', model: 'disc', params: { alpha: 0.3, radius: 24, sigma: 6 } },
    { name: 'a Gaussian spot', model: 'gaussian', params: { alpha: 0.6, sigma: 13 } },
  ];
  let failed = 0;
  for (const c of cases) {
    const f = radialModels[c.model](c.params);
    const truth = (r) => c.params.alpha * f(r);
    const read = fitRadial(
      jpegRoundTrip(renderRadial(g, w, h, cx, cy, ground, ink, truth)),
      options,
    );
    const chosen = read.model === 'disc' ? read.disc : read.gaussian;
    const at = radialModels[read.model](chosen);
    let worst = 0;
    for (let r = options.inner; r <= options.outer; r += 0.5)
      worst = Math.max(worst, Math.abs(chosen.alpha * at(r) - truth(r)));
    // inside the ink, where the build draws the glow under the mark's cuts, by extrapolation
    let worstInside = 0;
    for (let r = 0; r < options.inner; r += 0.5)
      worstInside = Math.max(worstInside, Math.abs(chosen.alpha * at(r) - truth(r)));
    const report = {
      case: c.name,
      shape: read.shape,
      modulation: Number(read.modulation.toFixed(3)),
      model: read.model,
      worstBeyondInk: Number(worst.toFixed(4)),
      worstInsideInk: Number(worstInside.toFixed(4)),
      centreError: Number(Math.hypot(read.centre[0] - cx, read.centre[1] - cy).toFixed(2)),
    };
    // Under the ink nothing is read, so worstInsideInk is printed and never passed or failed: it
    // is how far an extrapolation can go wrong, which is why the record says it is one.
    if (read.shape !== 'radial') report.FAILS = 'a radial glow read as mark-shaped';
    else if (worst > 0.01)
      report.FAILS = 'the profile beyond the ink is more than 0.01 from the truth';
    else if (report.centreError > 0.5) report.FAILS = 'the centre is more than 0.5 px out';
    if (report.FAILS) failed += 1;
    console.log(JSON.stringify(report));
  }
  // The decoy: 14's own glow, the mark blurred, as strong as 27's.
  const decoy = fitRadial(
    jpegRoundTrip(
      renderGlow(g, w, h, cx, cy, ground, ink, { alpha: 0.55, sigma: 5, shape: 'blurred-mark' }),
    ),
    options,
  );
  const report = {
    case: 'DECOY a blurred mark',
    shape: decoy.shape,
    modulation: Number(decoy.modulation.toFixed(3)),
  };
  if (decoy.shape !== 'mark-shaped') {
    failed += 1;
    report.FAILS = 'a blurred mark read as radial';
  }
  console.log(JSON.stringify(report));
  if (failed > 0) {
    console.error(`glow-fit: radial calibration FAILED, ${String(failed)} case(s)`);
    process.exit(1);
  }
  console.log(
    'glow-fit: radial calibration passed — every profile within 0.01 beyond the ink, every centre within 0.5 px, and the blurred mark read as mark-shaped (under the ink the profile is an extrapolation: worstInsideInk)',
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
} else if (args.includes('--calibrate-radial')) calibrateRadial();
else if (args.includes('--calibrate')) calibrate();
else if (args[0] === '--radial') {
  const [cx, cy] = String(flag('--centre')).split(',').map(Number);
  const read = fitRadial(JSON.parse(readFileSync(args[1], 'utf8')), {
    centre: [cx, cy],
    inner: Number(flag('--inner')),
    outer: Number(flag('--outer')),
    ink: Number(flag('--ink')),
  });
  const dpPerPx = Number(flag('--dp-per-px') ?? NaN);
  if (Number.isFinite(dpPerPx))
    read.dp = {
      gaussianSigma: read.gaussian.sigma * dpPerPx,
      discRadius: read.disc.radius * dpPerPx,
      discSigma: read.disc.sigma * dpPerPx,
    };
  console.log(JSON.stringify(read, null, 2));
} else if (args.length > 0 && !args[0].startsWith('--')) {
  const read = fitGlow(JSON.parse(readFileSync(args[0], 'utf8')), {
    excludeBelow: Number(flag('--exclude-below') ?? Infinity),
  });
  const dpPerPx = Number(flag('--dp-per-px') ?? NaN);
  if (Number.isFinite(dpPerPx))
    read.dp = { sigma: read.sigma * dpPerPx, reach: read.reach * dpPerPx };
  console.log(JSON.stringify(read, null, 2));
} else {
  console.error(
    'usage: node glow-fit.mjs <dump.json> [--exclude-below Y] [--dp-per-px N] | --calibrate\n' +
      '       node glow-fit.mjs --radial <dump.json> --centre X,Y --inner R --outer R --ink L [--dp-per-px N] | --calibrate-radial',
  );
  process.exit(2);
}
