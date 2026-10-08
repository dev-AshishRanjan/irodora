/**
 * What each launcher and splash resource must be, and the verdict on one (F-231, criterion 5).
 *
 * Two checks read the same drawings out of different files: `verify-native-assets.mjs` out of the
 * project `expo prebuild` writes, and gate 16 (`verify-apk.mjs`) out of the built APK. One table
 * routes a resource to its verdict here, so the two cannot drift apart — the defect F-230's review
 * found when gate 16 read every launcher layer with one signature, and F-231's plan found again in
 * the splash logo, read with the icon's.
 *
 * Every verdict is READ from the pixels: the mark by its signature at the size it is drawn
 * (`carriesMark`), 14's tile by a fitted plane (`carriesTile`), the launcher masks and Android 12's
 * splash circle by where the ink is. A placeholder — Expo's white square, its default splash, a disc
 * — fails each one.
 */

import { carriesMark, decodePng } from './png.mjs';
import { carriesTile, insideEveryMask } from './brand-checks.mjs';
import { drawings, signatureOf, splashLogoSignature, SPLASH } from './generate-brand-assets.mjs';

/** The raster resources Expo writes, by name, and which verdict each takes (an XML resource is read as XML). */
const KINDS = [
  [/(^|\/)ic_launcher_round\.(?:png|webp)$/u, 'legacyRound'],
  [/(^|\/)ic_launcher_foreground\.(?:png|webp)$/u, 'foreground'],
  [/(^|\/)ic_launcher_monochrome\.(?:png|webp)$/u, 'monochrome'],
  [/(^|\/)ic_launcher_background\.(?:png|webp)$/u, 'background'],
  [/(^|\/)ic_launcher\.(?:png|webp)$/u, 'legacy'],
  [/(^|\/)splashscreen_logo\.(?:png|webp)$/u, 'splash'],
];

/** @typedef {'legacy' | 'legacyRound' | 'foreground' | 'monochrome' | 'background' | 'splash'} ResourceKind */

/** Which verdict a resource takes, by its path; null for a file that is none of the brand's. */
export function kindOf(path) {
  const found = KINDS.find(([pattern]) => pattern.test(path));
  return found === undefined ? null : found[1];
}

/**
 * The image in a resource file, by its MAGIC BYTES, never its name: Expo writes the launcher layers
 * as PNG bytes in \`.webp\` names (F-231's finding 2), and a release build may re-encode them. A real
 * WebP is a format this decoder does not read, and that is a refusal, not a pass.
 */
export function decodeResource(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG')
    return { ok: true, image: decodePng(bytes) };
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return {
      ok: false,
      why: 'a real WebP — this checker reads PNG only, and a layer it cannot read is not one it passed',
    };
  return { ok: false, why: `not an image it recognises (${bytes.subarray(0, 4).toString('hex')})` };
}

/** The colours the verdicts hold the pixels to, from the generator — the one place they come from. */
let cached = null;
function context() {
  if (cached !== null) return cached;
  const table = drawings();
  cached = {
    table,
    tile: table.icon.ground,
    inks: { light: table.splashLight.ink.eye, dark: table.splashDark.ink.eye },
  };
  return cached;
}

/** A round icon on its own tile: the corners Expo's circle cleared, filled with the tile's colour. */
function onTile(image, tile) {
  const out = { width: image.width, height: image.height, rgba: Buffer.from(image.rgba) };
  const a = (tile.angleDeg * Math.PI) / 180;
  const d = [Math.sin(a), Math.cos(a)];
  const lo = Math.min(0, d[0]) * image.width + Math.min(0, d[1]) * image.height;
  const hi = Math.max(0, d[0]) * image.width + Math.max(0, d[1]) * image.height;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [from, to] = [hex(tile.from), hex(tile.to)];
  for (let y = 0; y < image.height; y += 1)
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      if (out.rgba[i + 3] === 255) continue;
      const t = ((x + 0.5) * d[0] + (y + 0.5) * d[1] - lo) / (hi - lo);
      const alpha = out.rgba[i + 3] / 255;
      for (let k = 0; k < 3; k += 1)
        out.rgba[i + k] = Math.round(
          out.rgba[i + k] * alpha + (from[k] + (to[k] - from[k]) * t) * (1 - alpha),
        );
      out.rgba[i + 3] = 255;
    }
  return out;
}

/** The middle two thirds of an adaptive layer: the 72 dp a launcher shows. */
function viewport(image) {
  const x0 = Math.round(image.width / 6);
  const size = Math.round((2 * image.width) / 3);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1)
    image.rgba.copy(
      out,
      y * size * 4,
      ((x0 + y) * image.width + x0) * 4,
      ((x0 + y) * image.width + x0 + size) * 4,
    );
  return { width: size, height: size, rgba: out };
}

/** The farthest painted pixel from an image's centre, as a fraction of its width. */
function farthestInk(image) {
  let far = 0;
  for (let y = 0; y < image.height; y += 1)
    for (let x = 0; x < image.width; x += 1)
      if (image.rgba[(y * image.width + x) * 4 + 3] > 0)
        far = Math.max(far, Math.hypot(x + 0.5 - image.width / 2, y + 0.5 - image.height / 2));
  return far / image.width;
}

/** The colour most fully painted pixels share — a resized layer keeps its ink where it is opaque. */
function inkOf(image) {
  const counts = new Map();
  for (let i = 0; i < image.rgba.length; i += 4) {
    if (image.rgba[i + 3] !== 255) continue;
    const key = `#${[0, 1, 2]
      .map((k) => image.rgba[i + k].toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? null;
}

/**
 * Whether the mark is drawn in its ink (F-231's review, M6): the colour most fully opaque pixels
 * share. A resize keeps a mark's interior exact, and on the icon the mark's one ink outnumbers any
 * single colour of the tile's gradient — so a recoloured mark on the right tile is refused here, in
 * the artefact, not only by `--check` in the source.
 */
const inkIs = (image, want) => {
  const ink = inkOf(image);
  return ink === want
    ? { ok: true, why: `drawn in ${want}` }
    : { ok: false, why: `the mark is drawn in ${String(ink)}, not ${want}` };
};

const all = (...results) =>
  results.find((r) => !r.ok) ?? { ok: true, why: results.map((r) => r.why).join('; ') };

/**
 * The verdict on one resource.
 *
 * - `legacy`, `legacyRound` (`icon.png` at 48·k, the round one cut to a circle): the icon's mark,
 *   centred by its ink, on 14's tile — read from the opaque pixels only, so the round one is read
 *   inside its circle.
 * - `foreground`, `monochrome` (the adaptive layers at 108·k): the adaptive mark, inside the 66 dp
 *   safe zone and every launcher mask.
 * - `background`: 14's tile across the viewport, and nothing else (a mark breaks the plane).
 * - `splash` (`splashscreen_logo`, 288·k): the splash image as Expo composites it, inside Android
 *   12's 192 dp circle, in the appearance's own ink — `night` says which.
 */
export function verdictFor(kind, image, { night = false } = {}) {
  const { table, tile, inks } = context();
  switch (kind) {
    case 'legacy':
      return all(
        carriesMark(image, signatureOf(table.icon)),
        carriesTile(image, tile),
        inkIs(image, table.icon.ink.eye),
      );
    case 'legacyRound':
      return all(
        carriesMark(onTile(image, tile), signatureOf(table.icon)),
        carriesTile(image, tile),
        inkIs(image, table.icon.ink.eye),
      );
    case 'foreground':
      return all(
        carriesMark(image, signatureOf(table.adaptive)),
        insideEveryMask(image),
        inkIs(image, table.adaptive.ink.eye),
      );
    case 'monochrome':
      return all(carriesMark(image, signatureOf(table.monochrome)), insideEveryMask(image));
    case 'background':
      return carriesTile(viewport(image), tile, { clear: 0 });
    case 'splash': {
      const far = farthestInk(image) * SPLASH.expoCanvas;
      const ink = inkOf(image);
      const want = night ? inks.dark : inks.light;
      return all(
        carriesMark(image, splashLogoSignature(table.splashDark)),
        far <= 96
          ? { ok: true, why: `its farthest ink ${far.toFixed(1)} dp from the centre` }
          : {
              ok: false,
              why: `ink ${far.toFixed(1)} dp from the centre, outside Android 12's 96 dp circle`,
            },
        ink === want
          ? { ok: true, why: `drawn in ${want}` }
          : {
              ok: false,
              why: `drawn in ${String(ink)}, not the ${night ? 'dark' : 'light'} foreground ${want}`,
            },
      );
    }
    default:
      return { ok: false, why: `no verdict for ${String(kind)}` };
  }
}

/**
 * The verdict on the iOS app icon (the 1024 px \`App-Icon-1024x1024@1x.png\`): opaque, 14's tile, the
 * icon's mark centred by its ink. Expo writes a white square when a config has no icon; that fails.
 */
export function iosIconVerdict(image) {
  const { table, tile } = context();
  let translucent = 0;
  for (let i = 3; i < image.rgba.length; i += 4) if (image.rgba[i] !== 255) translucent += 1;
  return all(
    translucent === 0
      ? { ok: true, why: 'opaque' }
      : {
          ok: false,
          why: `${String(translucent)} pixel(s) not opaque — iOS rejects an icon with alpha`,
        },
    carriesMark(image, signatureOf(table.icon)),
    carriesTile(image, tile),
  );
}

/** The verdict on an iOS splash image (\`SplashScreenLogo.imageset\`): the splash drawing at its width. */
export function iosSplashVerdict(image, { night = false } = {}) {
  const { table, inks } = context();
  const ink = inkOf(image);
  const want = night ? inks.dark : inks.light;
  return all(
    carriesMark(image, signatureOf(table.splashDark)),
    ink === want
      ? { ok: true, why: `drawn in ${want}` }
      : {
          ok: false,
          why: `drawn in ${String(ink)}, not the ${night ? 'dark' : 'light'} foreground ${want}`,
        },
  );
}
