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

/* ======================================================================= launcher masks (F-231) */

const AOSP =
  'https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-10.0.0_r1';

/**
 * The shapes a launcher crops an adaptive icon to, VERBATIM from AOSP (`config_icon_mask`), each in
 * the 100-unit box `AdaptiveIconDrawable` scales to the icon's visible viewport (`MASK_SIZE`), the
 * layers reaching a quarter of the viewport past each side (`EXTRA_INSET_PERCENTAGE`): 72 of 108 dp.
 *
 * The platform default is a rounded square, unchanged through `main`; the overlays a device or a
 * person picks are a squircle, a rounded rectangle, a teardrop and a square (they shipped as
 * `packages/overlays/IconShape*Overlay` until Android 12 moved shape choice into launchers). The
 * circle is Pixel's, a circle of the whole box. A launcher may draw others; every one must contain
 * the safe zone, which is why the drawing is held to the zone as well as to these.
 */
export const LAUNCHER_MASKS = {
  default: {
    path: 'M50,0L92,0C96.42,0 100,4.58 100 8L100,92C100, 96.42 96.42 100 92 100L8 100C4.58, 100 0 96.42 0 92L0 8 C 0 4.42 4.42 0 8 0L50 0Z',
    source: `${AOSP}/core/res/res/values/config.xml`,
  },
  squircle: {
    path: 'M50,0 C10,0 0,10 0,50 0,90 10,100 50,100 90,100 100,90 100,50 100,10 90,0 50,0 Z',
    source: `${AOSP}/packages/overlays/IconShapeSquircleOverlay/res/values/config.xml`,
  },
  roundedRect: {
    path: 'M50,0L88,0 C94.4,0 100,5.4 100 12 L100,88 C100,94.6 94.6 100 88 100 L12,100 C5.4,100 0,94.6 0,88 L0 12 C0 5.4 5.4 0 12 0 L50,0 Z',
    source: `${AOSP}/packages/overlays/IconShapeRoundedRectOverlay/res/values/config.xml`,
  },
  teardrop: {
    path: 'M50,0 C77.6,0 100,22.4 100,50 L100,88 C100,94.6 94.6,100 88,100 L50,100 C22.4 100 0 77.6 0 50C0 22.4 22.4 0 50 0 Z',
    source: `${AOSP}/packages/overlays/IconShapeTeardropOverlay/res/values/config.xml`,
  },
  square: {
    path: 'M50,0L100,0 100,100 0,100 0,0z',
    source: `${AOSP}/packages/overlays/IconShapeSquareOverlay/res/values/config.xml`,
  },
  circle: {
    // Pixel's circle, as two arcs; flattened here as the circle it is.
    path: 'M50 0A50 50,0,1,1,50 100A50 50,0,1,1,50 0',
    source: 'the circle of the whole 100-unit box (Pixel launchers)',
  },
};

/** The safe zone: the 66 dp circle every mask must contain (`SAFEZONE_SCALE` = 66/72), in mask units. */
export const SAFE_RADIUS = (50 * 66) / 72;

/**
 * A mask's outline as a polygon: M, L, C (with C's implicit repeats, as the squircle writes them),
 * Z, and the two half-circle arcs the circle is written as. Curves are flattened finely enough (64
 * segments a cubic, 720 a circle) that the polygon is within 0.01 units of the curve.
 */
export function maskPolygon(path) {
  if (/A/iu.test(path))
    return Array.from({ length: 720 }, (_, k) => {
      const a = (k / 720) * 2 * Math.PI;
      return [50 + 50 * Math.sin(a), 50 - 50 * Math.cos(a)];
    });
  const tokens = path.match(/[MLCZ]|-?\d*\.?\d+/giu) ?? [];
  const points = [];
  let at = [0, 0];
  let command = 'M';
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/^[MLCZ]$/iu.test(tokens[i])) command = tokens[i++].toUpperCase();
    if (command === 'Z') continue;
    if (command === 'M' || command === 'L') {
      at = [num(), num()];
      points.push(at);
      // An M's further pairs are L's (SVG): the square writes its corners that way.
      if (command === 'M') command = 'L';
    } else if (command === 'C') {
      const c1 = [num(), num()];
      const c2 = [num(), num()];
      const end = [num(), num()];
      for (let s = 1; s <= 64; s += 1) {
        const t = s / 64;
        const u = 1 - t;
        points.push(
          [0, 1].map(
            (k) =>
              u * u * u * at[k] +
              3 * u * u * t * c1[k] +
              3 * u * t * t * c2[k] +
              t * t * t * end[k],
          ),
        );
      }
      at = end;
    }
  }
  return points;
}

/** Whether (x, y) lies inside a polygon (even–odd, by a ray to the right). */
export function insidePolygon(polygon, x, y) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Where an adaptive layer's pixel falls in mask units: the viewport is the layer's middle two thirds
 * (72 of 108 dp), and the mask's 100 units span it.
 */
export const toMaskUnits = (layerPx, p) => ((p + 0.5 - layerPx / 6) / ((2 * layerPx) / 3)) * 100;

/**
 * Whether an adaptive foreground keeps every inked pixel inside the safe zone and inside every mask
 * (F-231, criterion 2). Read from the layer's alpha, at whatever size it is given.
 */
export function insideEveryMask(layer) {
  const polygons = Object.entries(LAUNCHER_MASKS).map(([name, m]) => [name, maskPolygon(m.path)]);
  let inked = 0;
  let farthest = 0;
  for (let y = 0; y < layer.height; y += 1)
    for (let x = 0; x < layer.width; x += 1) {
      if (layer.rgba[(y * layer.width + x) * 4 + 3] === 0) continue;
      inked += 1;
      // Every corner of the pixel, so a pixel half under a mask is not passed by its centre.
      for (const [dx, dy] of [
        [-0.5, -0.5],
        [0.5, -0.5],
        [-0.5, 0.5],
        [0.5, 0.5],
      ]) {
        const u = toMaskUnits(layer.width, x + dx);
        const w = toMaskUnits(layer.height, y + dy);
        farthest = Math.max(farthest, Math.hypot(u - 50, w - 50));
        if (farthest > SAFE_RADIUS)
          return {
            ok: false,
            why: `ink at (${String(x)}, ${String(y)}) is ${farthest.toFixed(2)} units from the centre, outside the 66 dp safe zone (${SAFE_RADIUS.toFixed(2)})`,
          };
        for (const [name, polygon] of polygons)
          if (!insidePolygon(polygon, u, w))
            return {
              ok: false,
              why: `ink at (${String(x)}, ${String(y)}) is cut by the ${name} mask`,
            };
      }
    }
  return inked > 0
    ? {
        ok: true,
        why: `${String(inked)} inked pixel(s), the farthest ${farthest.toFixed(2)} units from the centre (safe zone ${SAFE_RADIUS.toFixed(2)}), inside all ${String(polygons.length)} masks`,
      }
    : { ok: false, why: 'nothing is inked — a layer with no mark' };
}
