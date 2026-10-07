/**
 * Verdicts about the brand's drawings that more than one check reaches (F-231).
 *
 * The generator's `--prove`, the prebuild check and gate 16 (`verify-apk.mjs`) read the same
 * drawings out of different files — the generated PNG, Expo's resized copies, the APK's resources —
 * so the question *"is this 14's tile?"* is answered once, here, and each of them asks it.
 */

/**
 * A pixel's channels, or null where it is not fully opaque (a launcher's round mask, a corner).
 */
const opaquePixel = (image, x, y) => {
  const d = (y * image.width + x) * 4;
  return image.rgba[d + 3] === 255 ? [image.rgba[d], image.rgba[d + 1], image.rgba[d + 2]] : null;
};

/** Least squares for v = a + b·u + c·w over the samples, per channel; the residual's rms. */
function fitPlane(samples) {
  const n = samples.length;
  let su = 0;
  let sw = 0;
  let suu = 0;
  let sww = 0;
  let suw = 0;
  for (const { u, w } of samples) {
    su += u;
    sw += w;
    suu += u * u;
    sww += w * w;
    suw += u * w;
  }
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const M = [
    [n, su, sw],
    [su, suu, suw],
    [sw, suw, sww],
  ];
  const D = det3(M);
  return [0, 1, 2].map((k) => {
    let sv = 0;
    let suv = 0;
    let swv = 0;
    for (const s of samples) {
      sv += s.c[k];
      suv += s.u * s.c[k];
      swv += s.w * s.c[k];
    }
    const r = [sv, suv, swv];
    const [a, b, c] = [0, 1, 2].map(
      (col) => det3(M.map((row, i) => row.map((v, j) => (j === col ? r[i] : v)))) / D,
    );
    let ss = 0;
    for (const s of samples) ss += (s.c[k] - (a + b * s.u + c * s.w)) ** 2;
    return { a, b, c, rms: Math.sqrt(ss / n) };
  });
}

const hexRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

/**
 * Whether an image is 14's tile (F-231, ADR-0126): a LINEAR gradient from `tile.from` at one corner
 * to `tile.to` at the opposite one, its axis `tile.angleDeg` clockwise from straight down.
 *
 * READ, NOT COMPARED. The tile is measured from the image as 14's was: a plane fitted to every
 * opaque pixel clear of the mark (a disc of `clear` of the side around the centre), per channel.
 * The plane gives the axis and the colour at each end, and those are held to the tokens. Averaging
 * keeps a plane a plane, so the same reading holds at a launcher's 48 px and at 1024; a round mask
 * leaves an annulus, which a plane still fits.
 *
 * Refused: no gradient (a flat ground — F-230's interim icon), a reversed one, one on another axis,
 * one between other colours (a light tile), and anything a plane does not fit (a texture, a photo).
 */
export function carriesTile(image, tile, { clear = 0.36, tolerance = 2.5 } = {}) {
  const { width, height } = image;
  const side = Math.min(width, height);
  const step = Math.max(1, Math.floor(side / 96));
  const samples = [];
  for (let y = 0; y < height; y += step)
    for (let x = 0; x < width; x += step) {
      const u = (x + 0.5) / width - 0.5;
      const w = (y + 0.5) / height - 0.5;
      if (Math.hypot(u, w) < clear) continue;
      const c = opaquePixel(image, x, y);
      if (c !== null) samples.push({ u, w, c });
    }
  if (samples.length < 24)
    return { ok: false, why: 'too few opaque pixels clear of the mark to read a ground' };

  const plane = fitPlane(samples);
  const worst = Math.max(...plane.map((p) => p.rms));
  if (worst > tolerance)
    return {
      ok: false,
      why: `the ground is not a plane — it leaves ${worst.toFixed(2)} levels (rms), not ≤ ${String(tolerance)}`,
    };

  // The axis: the direction the luminance falls, from the fitted slopes.
  const fall = [0.2126, 0.7152, 0.0722].reduce(
    (acc, weight, k) => [acc[0] - weight * plane[k].b, acc[1] - weight * plane[k].c],
    [0, 0],
  );
  const span = Math.hypot(fall[0], fall[1]);
  const want = hexRgb(tile.from).map((v, k) => v - hexRgb(tile.to)[k]);
  const wantSpan = Math.hypot(...want);
  if (span < wantSpan / 4)
    return {
      ok: false,
      why: `the ground is flat — it falls ${span.toFixed(1)} levels across, 14's tile falls by the span of its two tokens`,
    };
  const angle = (Math.atan2(fall[0], fall[1]) * 180) / Math.PI;
  if (Math.abs(angle - tile.angleDeg) > 1.5)
    return {
      ok: false,
      why: `the gradient runs ${angle.toFixed(1)}° from vertical, 14's runs ${String(tile.angleDeg)}°`,
    };

  // Each end, where the axis leaves the image: the corners it starts and finishes at.
  const a = (tile.angleDeg * Math.PI) / 180;
  const d = [Math.sin(a), Math.cos(a)];
  const corners = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
  ].sort((p, q) => p[0] * d[0] + p[1] * d[1] - (q[0] * d[0] + q[1] * d[1]));
  const at = ([u, w]) => plane.map((p) => p.a + p.b * u + p.c * w);
  const ends = { from: at(corners[0]), to: at(corners[3]) };
  for (const [end, value] of Object.entries(ends)) {
    const token = hexRgb(tile[end]);
    const off = Math.max(...value.map((v, k) => Math.abs(v - token[k])));
    if (off > tolerance)
      return {
        ok: false,
        why: `its ${end === 'from' ? 'lightest' : 'darkest'} corner reads rgb(${value.map((v) => v.toFixed(0)).join(', ')}), ${off.toFixed(1)} levels from ${tile[end]}`,
      };
  }
  return {
    ok: true,
    why: `a plane to ${worst.toFixed(2)} levels, ${angle.toFixed(1)}° from vertical, ${tile.from} → ${tile.to} at its corners`,
  };
}
