#!/usr/bin/env node
/**
 * Fit a drawn mark's geometry from its pixels (F-230): petals, ring, stamens and seams.
 *
 * THE MODEL. A blossom of `petals` discs of radius `petal`, centred `orbit` from the mark's centre,
 * the first at `phase` degrees clockwise from straight up, over a filled hub of radius `hub` (14 and
 * 01 fill the blossom out to where its petals meet); a centre disc (`eye`) inside a ring cut out to
 * `ringOuter`; a stamen cut from the ring along each petal's direction to `stamenOuter`,
 * `stamenWidth` wide, with a dot of radius `anther` at its tip where one is drawn; and a seam cut
 * along each notch's direction, `seamWidth` wide, from the ring to beyond the edge. Every cut is a
 * hole. `covers()` is the point test, and the calibration renders through it.
 *
 * THE READINGS, each made so blur leaves it in place:
 * - the centre, the coverage-weighted centroid of the ink, read twice with the local ground;
 * - the outer contour, the last 50 % crossing along each ray, every 0.5°;
 * - the petal count and phase, the dominant harmonic of the contour;
 * - each petal's circle, an algebraic (Kasa) fit to its lobe of the contour, notches left out;
 * - the ring, the stamens and the seams as INTEGRALS of missing coverage across them — the area a
 *   cut removes survives a blur that moves its edges — with the radial ends at 50 % crossings.
 *
 * Coverage is (L − ground) / (ink − ground). The ground is read in an annulus just outside the
 * reach, because 14's splash mark sits in a glow.
 *
 * USE
 *   node mark-fit.mjs <dump.json> [--dp-per-px N] [--polarity light|dark]
 *       the readings, in px (and in dp where a scale is given), as JSON
 *   node mark-fit.mjs --box <dump.json> [--polarity light|dark]
 *       the ink box of whatever a dump holds — a word, a line, a mark — at the 50 % crossing of each
 *       row's and column's peak coverage, the ground read off the dump's border: the lockups' gaps
 *   node mark-fit.mjs --calibrate
 *       renders known geometries at 14's and 01's pixel sizes, round-trips each through a JPEG at
 *       quality 85 (mark.ps1 -jpeg), fits it, and fails unless every parameter is recovered within
 *       its tolerance and each decoy (four petals, six petals, no ring, no seams) reads as itself
 *
 * A dump is mark.ps1's output: {x, y, w, h, lum: [row, ...]}.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEG = Math.PI / 180;

/** A unit vector `deg` clockwise from straight up, in image axes (y down). */
const dir = (deg) => [Math.sin(deg * DEG), -Math.cos(deg * DEG)];

/** Whether the point (dx, dy) from the mark's centre is ink. */
export function covers(g, dx, dy) {
  const r = Math.hypot(dx, dy);
  const step = 360 / g.petals;
  let ink = r <= Math.max(g.eye, g.hub ?? 0);
  for (let k = 0; k < g.petals && !ink; k += 1) {
    const [ex, ey] = dir(g.phase + k * step);
    if (Math.hypot(dx - g.orbit * ex, dy - g.orbit * ey) <= g.petal) ink = true;
  }
  if (!ink) return false;
  if (g.ringOuter > g.eye && r > g.eye && r < g.ringOuter) return false;
  const cut = (deg, from, to, width) => {
    const [ex, ey] = dir(deg);
    const along = dx * ex + dy * ey;
    const across = Math.abs(-dx * ey + dy * ex);
    return along >= from && along <= to && across <= width / 2;
  };
  for (let k = 0; k < g.petals; k += 1) {
    const petalDeg = g.phase + k * step;
    if (g.stamenWidth > 0 && cut(petalDeg, g.ringOuter - 0.5, g.stamenOuter, g.stamenWidth))
      return false;
    if (g.anther > 0) {
      const [ex, ey] = dir(petalDeg);
      if (Math.hypot(dx - g.stamenOuter * ex, dy - g.stamenOuter * ey) <= g.anther) return false;
    }
    if (g.seamWidth > 0 && cut(petalDeg + step / 2, g.ringOuter - 0.5, 1e9, g.seamWidth))
      return false;
  }
  return true;
}

/** A luminance grid of a geometry, supersampled 8 × 8 a pixel. */
export function render(g, w, h, cx, cy, ground, ink) {
  const n = 8;
  const lum = [];
  for (let j = 0; j < h; j += 1) {
    const row = [];
    for (let i = 0; i < w; i += 1) {
      let hit = 0;
      for (let b = 0; b < n; b += 1)
        for (let a = 0; a < n; a += 1)
          if (covers(g, i + (a + 0.5) / n - cx, j + (b + 0.5) / n - cy)) hit += 1;
      row.push(ground + ((ink - ground) * hit) / (n * n));
    }
    lum.push(row);
  }
  return { x: 0, y: 0, w, h, lum };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The ink box at the 50 % crossing, in the image's px, the ground read off the dump's border. */
export function inkBox(dump, { polarity = 'light' } = {}) {
  const { w, h } = dump;
  const lum = polarity === 'dark' ? dump.lum.map((r) => r.map((v) => 255 - v)) : dump.lum;
  const border = [];
  for (let i = 0; i < w; i += 1) border.push(lum[0][i], lum[h - 1][i]);
  for (let j = 0; j < h; j += 1) border.push(lum[j][0], lum[j][w - 1]);
  const ground = median(border);
  const ink = [...lum.flat()].sort((a, b) => a - b)[Math.floor(w * h * 0.995)];
  const cov = (v) => (v - ground) / (ink - ground);
  const cols = Array.from({ length: w }, (_, i) => Math.max(...lum.map((row) => cov(row[i]))));
  const rows = lum.map((row) => Math.max(...row.map(cov)));
  // The first and last crossing of 0.5 along a peak profile, interpolated within the pixel.
  const span = (peaks) => {
    const first = peaks.findIndex((c) => c >= 0.5);
    let last = -1;
    for (let k = peaks.length - 1; k >= 0; k -= 1)
      if (peaks[k] >= 0.5) {
        last = k;
        break;
      }
    const lead =
      first > 0 ? first - (peaks[first] - 0.5) / (peaks[first] - peaks[first - 1]) + 0.5 : first;
    const trail =
      last < peaks.length - 1
        ? last + (peaks[last] - 0.5) / (peaks[last] - peaks[last + 1]) + 0.5
        : last + 1;
    return [lead, trail];
  };
  const [x0, x1] = span(cols);
  const [y0, y1] = span(rows);
  return { x0: x0 + dump.x, x1: x1 + dump.x, y0: y0 + dump.y, y1: y1 + dump.y, ground, ink };
}

/** The geometry a dump draws, in px. */
export function fit(dump, { polarity = 'light' } = {}) {
  const { w, h } = dump;
  const lum = polarity === 'dark' ? dump.lum.map((r) => r.map((v) => 255 - v)) : dump.lum;
  const at = (i, j) => lum[Math.min(h - 1, Math.max(0, j))][Math.min(w - 1, Math.max(0, i))];
  // Bilinear, with pixel (i, j)'s centre at (i + 0.5, j + 0.5).
  const sample = (u, v) => {
    const x = u - 0.5;
    const y = v - 0.5;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    return (
      at(i, j) * (1 - fx) * (1 - fy) +
      at(i + 1, j) * fx * (1 - fy) +
      at(i, j + 1) * (1 - fx) * fy +
      at(i + 1, j + 1) * fx * fy
    );
  };
  const flat = lum.flat().sort((a, b) => a - b);
  let ground = flat[Math.floor(flat.length * 0.05)];
  let ink = flat[Math.floor(flat.length * 0.995)];
  let cx = w / 2;
  let cy = h / 2;
  let reach = Math.min(w, h) / 2;
  const coverage = (u, v) => Math.min(1, Math.max(0, (sample(u, v) - ground) / (ink - ground)));
  let clipped = 0;
  const contour = () => {
    clipped = 0;
    const limit = Math.min(cx, cy, w - cx, h - cy) - 0.5;
    const out = [];
    for (let deg = 0; deg < 360; deg += 0.5) {
      const [ex, ey] = dir(deg);
      let last = 0;
      let prev = coverage(cx, cy);
      for (let r = 0.1; r <= limit; r += 0.1) {
        const c = coverage(cx + r * ex, cy + r * ey);
        if (prev >= 0.5 && c < 0.5) last = r - 0.1 + (0.1 * (prev - 0.5)) / (prev - c);
        prev = c;
      }
      // A ray that reaches the crop's edge still in ink is cut short: its reach is the edge, not the
      // last crossing inside, and the reading says the crop was too tight.
      if (prev >= 0.5) {
        last = limit;
        clipped += 1;
      }
      out.push({ deg, r: last });
    }
    return out;
  };
  for (let pass = 0; pass < 3; pass += 1) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const c = (at(i, j) - ground) / (ink - ground);
        if (c >= 0.5 && Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= reach + 2) {
          sx += i + 0.5;
          sy += j + 0.5;
          n += 1;
        }
      }
    cx = sx / n;
    cy = sy / n;
    reach = Math.max(...contour().map((p) => p.r));
    // The local ground: an annulus just outside the reach, where the crop allows it.
    const ring = [];
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1) {
        const r = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
        if (r >= reach + 2 && r <= reach + 6) ring.push(at(i, j));
      }
    if (ring.length > 20) ground = median(ring);
    const inside = [];
    for (let j = 0; j < h; j += 1)
      for (let i = 0; i < w; i += 1)
        if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= reach * 0.9) inside.push(at(i, j));
    ink = median(inside.filter((v) => v > (ground + ink) / 2));
  }
  const edge = contour();

  // The petal count and phase: the contour's dominant harmonic.
  const mean = edge.reduce((s, p) => s + p.r, 0) / edge.length;
  let petals = 0;
  let best = 0;
  let phase = 0;
  for (let k = 3; k <= 8; k += 1) {
    let re = 0;
    let im = 0;
    for (const p of edge) {
      re += (p.r - mean) * Math.cos(k * p.deg * DEG);
      im -= (p.r - mean) * Math.sin(k * p.deg * DEG);
    }
    const amp = Math.hypot(re, im);
    if (amp > best) {
      best = amp;
      petals = k;
      phase = -Math.atan2(im, re) / DEG / k;
    }
  }
  const step = 360 / petals;
  phase = ((((phase + step / 2) % step) + step) % step) - step / 2;

  // Each petal's circle, from its lobe of the contour; the notches and their seams left out.
  const fits = [];
  for (let k = 0; k < petals; k += 1) {
    const centre = phase + k * step;
    const pts = edge
      .filter((p) => {
        const d = ((((p.deg - centre) % 360) + 540) % 360) - 180;
        return Math.abs(d) <= step * 0.32 && p.r > 0.6 * reach;
      })
      .map((p) => {
        const [ex, ey] = dir(p.deg);
        return [p.r * ex, p.r * ey];
      });
    // Kasa: minimise sum (x² + y² + Dx + Ey + F)².
    let sxx = 0,
      sxy = 0,
      syy = 0,
      sx = 0,
      sy = 0,
      sz = 0,
      sxz = 0,
      syz = 0;
    const n = pts.length;
    for (const [x, y] of pts) {
      const z = x * x + y * y;
      sxx += x * x;
      sxy += x * y;
      syy += y * y;
      sx += x;
      sy += y;
      sz += z;
      sxz += x * z;
      syz += y * z;
    }
    const m = [
      [sxx, sxy, sx, -sxz],
      [sxy, syy, sy, -syz],
      [sx, sy, n, -sz],
    ];
    for (let c = 0; c < 3; c += 1) {
      let p = c;
      for (let r = c + 1; r < 3; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
      [m[c], m[p]] = [m[p], m[c]];
      for (let r = 0; r < 3; r += 1) {
        if (r === c) continue;
        const f = m[r][c] / m[c][c];
        for (let q = c; q < 4; q += 1) m[r][q] -= f * m[c][q];
      }
    }
    const D = m[0][3] / m[0][0];
    const E = m[1][3] / m[1][1];
    const F = m[2][3] / m[2][2];
    const ox = -D / 2;
    const oy = -E / 2;
    fits.push({ orbit: Math.hypot(ox, oy), petal: Math.sqrt(ox * ox + oy * oy - F) });
  }
  const orbit = median(fits.map((f) => f.orbit));
  const petal = median(fits.map((f) => f.petal));

  // The ring: missing coverage along the bisectors between each stamen and its seams.
  const dr = 0.05;
  const profile = (degs, from, to) => {
    const out = [];
    for (let r = from; r <= to; r += dr) {
      let s = 0;
      for (const d of degs) {
        const [ex, ey] = dir(d);
        s += coverage(cx + r * ex, cy + r * ey);
      }
      out.push({ r, c: s / degs.length });
    }
    return out;
  };
  const bisectors = [];
  for (let k = 0; k < petals; k += 1)
    bisectors.push(phase + k * step - step / 4, phase + k * step + step / 4);
  const radial = profile(bisectors, 0, orbit * 0.8);
  let eye = 0;
  let ringOuter = 0;
  const fall = radial.findIndex((p, i) => i > 0 && radial[i - 1].c >= 0.5 && p.c < 0.5);
  if (fall > 0) {
    const rise = radial.findIndex((p, i) => i > fall && radial[i - 1].c < 0.5 && p.c >= 0.5);
    if (rise > 0) {
      const lo = Math.max(0, radial[fall].r - 3);
      const hi = radial[rise].r + 3;
      const span = radial.filter((p) => p.r >= lo && p.r <= hi);
      const width = span.reduce((s, p) => s + (1 - p.c) * dr, 0);
      const mid = span.reduce((s, p) => s + p.r * (1 - p.c) * dr, 0) / width;
      eye = mid - width / 2;
      ringOuter = mid + width / 2;
    }
  }

  // A cut's width at radius r along direction deg: the missing coverage across it, as arc length.
  const cutWidth = (deg, r) => {
    let s = 0;
    const half = Math.min(10, (step / 2) * 0.6);
    const base = [];
    for (let d = -half; d <= half; d += 0.05) {
      const [ex, ey] = dir(deg + d);
      base.push(coverage(cx + r * ex, cy + r * ey));
    }
    for (const c of base) s += (1 - c) * 0.05 * DEG * r;
    return s;
  };
  const widthAlong = (offset, from, to) => {
    const ws = [];
    for (let r = from; r <= to; r += 0.5)
      ws.push(
        median(Array.from({ length: petals }, (_, k) => cutWidth(phase + k * step + offset, r))),
      );
    return ws;
  };
  const inner = Math.max(ringOuter, eye) + 2;

  // The hub: whether the blossom is filled between the ring and the petals' inner edges, read a
  // third of the way from each notch to its petal, clear of the seams. Behind the petals the hub
  // cannot be seen, and at the notch the seam hides the cusp; a filled hub is taken to reach the
  // petals' tangency, the one radius that leaves no gap a drawing could show.
  const between = [];
  const envelope =
    orbit * Math.cos((step / 3) * DEG) -
    Math.sqrt(Math.max(0, petal ** 2 - (orbit * Math.sin((step / 3) * DEG)) ** 2));
  for (let k = 0; k < petals; k += 1)
    for (const side of [-1, 1])
      for (let rr = Math.max(ringOuter, eye) + 2; rr <= envelope - 1; rr += 0.5) {
        const [ex, ey] = dir(phase + k * step + step / 2 + side * (step / 6));
        between.push(coverage(cx + rr * ex, cy + rr * ey));
      }
  const hubFilled = between.length > 0 && median(between) >= 0.9;
  const hub = hubFilled ? orbit * Math.cos((step / 2) * DEG) : 0;

  // Stamens: where the cut along each petal's direction ends, and its width before the tip.
  const along = profile(
    Array.from({ length: petals }, (_, k) => phase + k * step),
    inner,
    reach - 1,
  );
  const end = along.findIndex((p, i) => i > 0 && along[i - 1].c < 0.5 && p.c >= 0.5);
  const startsCut = along.length > 0 && along[0].c < 0.5;
  let stamenOuter = 0;
  let stamenWidth = 0;
  let anther = 0;
  let tip = 0;
  if (startsCut && end > 0) {
    stamenOuter = along[end].r;
    const body = widthAlong(0, inner, stamenOuter - 3);
    stamenWidth = median(body);
    tip = median(widthAlong(0, stamenOuter - 1.5, stamenOuter - 0.5));
    // A dot at the tip: the cut ends a radius past the stamen's own end.
    if (tip > 1.6 * stamenWidth) {
      anther = tip / 2;
      stamenOuter -= anther;
    }
  }

  // Seams: the width of the cut along each notch's direction, ring to edge.
  const notchReach = Math.min(...edge.map((p) => p.r).filter((r) => r > inner)) || reach * 0.6;
  const seam = widthAlong(
    step / 2,
    inner + 1,
    Math.max(inner + 1.5, Math.min(notchReach, orbit) - 1),
  );
  const seamWidth = median(seam) > 0.3 ? median(seam) : 0;

  if (clipped > 0)
    throw new Error(`mark-fit: ${String(clipped)} ray(s) reach the crop's edge in ink; crop wider`);
  return {
    centre: [cx + (dump.x ?? 0), cy + (dump.y ?? 0)],
    ground,
    ink,
    reach,
    petals,
    phase,
    orbit,
    petal,
    lobeSpread: {
      orbit: Math.max(...fits.map((f) => f.orbit)) - Math.min(...fits.map((f) => f.orbit)),
      petal: Math.max(...fits.map((f) => f.petal)) - Math.min(...fits.map((f) => f.petal)),
    },
    tangencyGap: orbit * Math.sin((step / 2) * DEG) - petal,
    hub,
    eye,
    ringOuter,
    stamenOuter,
    stamenWidth,
    stamenTip: tip,
    anther,
    seamWidth,
  };
}

function jpegRoundTrip(grid, quality = 85) {
  const dirPath = mkdtempSync(join(tmpdir(), 'mark-fit-'));
  const gridPath = join(dirPath, 'grid.json');
  const jpgPath = join(dirPath, 'mark.jpg');
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

function calibrate() {
  // A geometry like 14's at 14's splash size, and the same at 01's: the readings each must recover.
  // Tangent petals over a hub to their tangency, as 14 draws them.
  const truth14 = {
    petals: 5,
    phase: 0,
    orbit: 36,
    petal: 36 * Math.sin(36 * DEG),
    hub: 36 * Math.cos(36 * DEG),
    eye: 9.8,
    ringOuter: 11.9,
    stamenOuter: 28.2,
    stamenWidth: 2.3,
    anther: 0,
    seamWidth: 2.5,
  };
  const scale = (g, f) => ({
    ...g,
    orbit: g.orbit * f,
    petal: g.petal * f,
    hub: g.hub * f,
    eye: g.eye * f,
    ringOuter: g.ringOuter * f,
    stamenOuter: g.stamenOuter * f,
    stamenWidth: g.stamenWidth * f,
    anther: g.anther * f,
    seamWidth: g.seamWidth * f,
  });
  const cases = [
    { name: '14 splash size', g: truth14, w: 132, h: 130, cx: 66.3, cy: 65.7 },
    {
      name: '01 size, with anthers',
      g: { ...scale(truth14, 0.69), anther: 1.9, stamenWidth: 1.8, seamWidth: 1.9 },
      w: 92,
      h: 92,
      cx: 46.4,
      cy: 45.6,
    },
    {
      name: 'DECOY four petals',
      g: {
        ...truth14,
        petals: 4,
        orbit: 33,
        petal: 33 * Math.sin(45 * DEG),
        hub: 33 * Math.cos(45 * DEG),
      },
      w: 132,
      h: 130,
      cx: 66.3,
      cy: 65.7,
      expect: { petals: 4 },
    },
    {
      name: 'DECOY six petals',
      g: { ...truth14, petals: 6, orbit: 38, petal: 19, hub: 38 * Math.cos(30 * DEG) },
      w: 132,
      h: 130,
      cx: 66.3,
      cy: 65.7,
      expect: { petals: 6 },
    },
    {
      name: 'DECOY no ring',
      g: { ...truth14, ringOuter: 0 },
      w: 132,
      h: 130,
      cx: 66.3,
      cy: 65.7,
      expect: { ring: false },
    },
    {
      name: 'DECOY no seams',
      g: { ...truth14, seamWidth: 0 },
      w: 132,
      h: 130,
      cx: 66.3,
      cy: 65.7,
      expect: { seams: false },
    },
    {
      name: 'DECOY no hub',
      g: { ...truth14, hub: 0 },
      w: 132,
      h: 130,
      cx: 66.3,
      cy: 65.7,
      expect: { hub: false },
    },
  ];
  const tol = {
    phase: 1,
    orbit: 0.5,
    petal: 0.5,
    hub: 0.6,
    eye: 0.5,
    ringOuter: 0.5,
    stamenOuter: 0.6,
    stamenWidth: 0.4,
    seamWidth: 0.4,
    anther: 0.6,
  };
  let failed = 0;
  for (const c of cases) {
    const read = fit(jpegRoundTrip(render(c.g, c.w, c.h, c.cx, c.cy, 38, 246)));
    const report = { case: c.name };
    if (c.expect === undefined) {
      for (const [k, t] of Object.entries(tol)) {
        const err = read[k] - c.g[k];
        report[k] = `${read[k].toFixed(2)} (${err >= 0 ? '+' : ''}${err.toFixed(2)})`;
        if (Math.abs(err) > t) {
          failed += 1;
          report[`${k}FAILS`] = `beyond ±${t}`;
        }
      }
      if (read.petals !== c.g.petals) {
        failed += 1;
        report.petalsFAILS = read.petals;
      }
      const cerr = Math.hypot(read.centre[0] - c.cx, read.centre[1] - c.cy);
      report.centre = cerr.toFixed(2);
      if (cerr > 0.5) {
        failed += 1;
        report.centreFAILS = 'beyond 0.5';
      }
    } else {
      if (c.expect.petals !== undefined && read.petals !== c.expect.petals) {
        failed += 1;
        report.FAILS = `read ${read.petals} petals`;
      }
      if (c.expect.ring === false && read.ringOuter - read.eye > 0.5) {
        failed += 1;
        report.FAILS = `read a ring ${read.eye.toFixed(2)}–${read.ringOuter.toFixed(2)}`;
      }
      if (c.expect.seams === false && read.seamWidth > 0) {
        failed += 1;
        report.FAILS = `read seams ${read.seamWidth.toFixed(2)}`;
      }
      if (c.expect.hub === false && read.hub > 0) {
        failed += 1;
        report.FAILS = `read a hub ${read.hub.toFixed(2)}`;
      }
      report.read = {
        petals: read.petals,
        ring: [read.eye.toFixed(2), read.ringOuter.toFixed(2)],
        seam: read.seamWidth.toFixed(2),
        hub: read.hub.toFixed(2),
      };
    }
    console.log(JSON.stringify(report));
  }
  if (failed > 0) {
    console.error(`mark-fit: calibration FAILED, ${failed} reading(s) outside tolerance`);
    process.exit(1);
  }
  console.log(
    'mark-fit: calibration passed — every parameter recovered within tolerance, every decoy read as itself',
  );
}

// Run as a command only, so the fit can be imported (the brand test reads the same model).
const main =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
const args = main ? process.argv.slice(2) : ['--imported'];
if (args[0] === '--imported') {
  // imported: nothing to run
} else if (args[0] === '--box') {
  const i = args.indexOf('--polarity');
  console.log(
    JSON.stringify(
      inkBox(JSON.parse(readFileSync(args[1], 'utf8')), {
        polarity: i < 0 ? 'light' : args[i + 1],
      }),
    ),
  );
} else if (args.includes('--calibrate')) calibrate();
else if (args.length > 0 && !args[0].startsWith('--')) {
  const dump = JSON.parse(readFileSync(args[0], 'utf8'));
  const flag = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
  const read = fit(dump, { polarity: flag('--polarity') ?? 'light' });
  const dpPerPx = Number(flag('--dp-per-px') ?? NaN);
  if (Number.isFinite(dpPerPx)) {
    read.dp = Object.fromEntries(
      [
        'reach',
        'orbit',
        'petal',
        'hub',
        'eye',
        'ringOuter',
        'stamenOuter',
        'stamenWidth',
        'stamenTip',
        'anther',
        'seamWidth',
      ].map((k) => [k, read[k] * dpPerPx]),
    );
  }
  console.log(JSON.stringify(read, null, 2));
} else {
  console.error(
    'usage: node mark-fit.mjs <dump.json> [--dp-per-px N] [--polarity light|dark] | --calibrate',
  );
  process.exit(2);
}
