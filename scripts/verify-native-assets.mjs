#!/usr/bin/env node
/**
 * The icon and the splash in the NATIVE PROJECTS `expo prebuild` writes (F-231, criterion 5).
 *
 * `generate-brand-assets.mjs --check` holds the source assets to the mark; gate 16 (`verify-apk.mjs`)
 * holds the built APK. Between them sits what Expo makes of the config — resized launcher layers,
 * composited splash logos, colour resources, an asset catalog and a storyboard — and a plugin, a
 * template or an SDK upgrade can change any of it while both ends stay green. This reads that middle,
 * on every pull request, without a JDK or a device:
 *
 * - **Android** (`android/app/src/main/res`): every launcher layer and both splash logos at every
 *   density, decoded by their bytes and held to their verdicts (`brand-verdicts.mjs`); the adaptive
 *   icon's XML naming all three layers; the splash's light and night backgrounds and the icon's
 *   background colour; the splash theme naming its logo.
 * - **iOS** (`ios/<app>/Images.xcassets`, `SplashScreen.storyboard`): the 1024 px app icon (Expo
 *   writes a WHITE SQUARE when a config has none), the splash images at 1, 2 and 3× in both
 *   appearances, the splash background in both, and the storyboard's image width.
 *
 * `expo prebuild` drops iOS on Windows, so here the iOS half prints NOT RUN and never claims a pass;
 * CI runs on Linux with `--require-ios`, where a missing `ios/` is a failure.
 *
 * ```
 * pnpm build                                  # runs expo prebuild
 * node scripts/verify-native-assets.mjs [--require-ios]
 * node scripts/verify-native-assets.mjs --prove
 * ```
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ciError } from './annotate.mjs';
import { decodePng, downscale, encodePng } from './png.mjs';
import {
  decodeResource,
  iosIconVerdict,
  iosSplashVerdict,
  kindOf,
  verdictFor,
} from './brand-verdicts.mjs';
import {
  drawings,
  expoSplashComposite,
  palette,
  render,
  markGeometry,
  SPLASH,
} from './generate-brand-assets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'apps', 'mobile');
const BRAND = join(APP, 'assets', 'brand');

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  YELLOW = '\x1b[33m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

/** Android's densities, and how many pixels a dp is at each. */
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

/** What every check below holds the files to, from the generator and the manifest. */
function expectations() {
  const p = palette();
  return { light: p.lightGround, dark: p.darkGround, imageWidth: SPLASH.imageWidth };
}

/** `<color name="…">#…</color>` in a resources file, or null. */
function colourIn(xml, name) {
  const m = new RegExp(`<color name="${name}">(#[0-9A-Fa-f]{6})</color>`, 'u').exec(xml);
  return m === null ? null : m[1].toUpperCase();
}

/**
 * Every finding in an Android `res/` tree. `read` counts the images actually decoded, so a run over
 * an empty tree cannot report clean.
 */
export function androidFindings(res, expect = expectations()) {
  const findings = [];
  let read = 0;
  const image = (rel, size, night = false) => {
    const path = join(res, rel);
    if (!existsSync(path)) {
      findings.push(`${rel} is missing`);
      return;
    }
    const decoded = decodeResource(readFileSync(path));
    if (!decoded.ok) {
      findings.push(`${rel}: ${decoded.why}`);
      return;
    }
    read += 1;
    if (decoded.image.width !== size || decoded.image.height !== size)
      findings.push(
        `${rel} is ${String(decoded.image.width)}×${String(decoded.image.height)}, not ${String(size)}`,
      );
    const kind = kindOf(rel);
    const verdict =
      kind === null ? { ok: false, why: 'no verdict' } : verdictFor(kind, decoded.image, { night });
    if (!verdict.ok) findings.push(`${rel}: ${verdict.why}`);
  };
  for (const [density, k] of Object.entries(DENSITIES)) {
    image(`mipmap-${density}/ic_launcher.webp`, 48 * k);
    image(`mipmap-${density}/ic_launcher_round.webp`, 48 * k);
    for (const layer of ['foreground', 'background', 'monochrome'])
      image(`mipmap-${density}/ic_launcher_${layer}.webp`, 108 * k);
    image(`drawable-${density}/splashscreen_logo.png`, 288 * k);
    image(`drawable-night-${density}/splashscreen_logo.png`, 288 * k, true);
  }
  const text = (rel) => (existsSync(join(res, rel)) ? readFileSync(join(res, rel), 'utf8') : null);
  for (const rel of [
    'mipmap-anydpi-v26/ic_launcher.xml',
    'mipmap-anydpi-v26/ic_launcher_round.xml',
  ]) {
    const xml = text(rel);
    if (xml === null) findings.push(`${rel} is missing`);
    else
      for (const [layer, drawable] of [
        ['background', '@mipmap/ic_launcher_background'],
        ['foreground', '@mipmap/ic_launcher_foreground'],
        ['monochrome', '@mipmap/ic_launcher_monochrome'],
      ])
        if (!xml.includes(`<${layer} android:drawable="${drawable}"/>`))
          findings.push(`${rel} does not name ${drawable} as its ${layer}`);
  }
  const colours = text('values/colors.xml') ?? '';
  const night = text('values-night/colors.xml') ?? '';
  for (const [where, xml, name, want] of [
    ['values/colors.xml', colours, 'splashscreen_background', expect.light],
    ['values-night/colors.xml', night, 'splashscreen_background', expect.dark],
    ['values/colors.xml', colours, 'iconBackground', expect.dark],
  ]) {
    const got = colourIn(xml, name);
    if (got !== want) findings.push(`${where} ${name} is ${String(got)}, not ${want}`);
  }
  const styles = text('values/styles.xml') ?? '';
  for (const item of [
    '<item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>',
    '<item name="windowSplashScreenBackground">@color/splashscreen_background</item>',
  ])
    if (!styles.includes(item)) findings.push(`values/styles.xml does not carry ${item}`);
  return { findings, read };
}

/** The iOS project's named root: the directory under `ios/` holding `Images.xcassets`. */
function iosProjectRoot(ios) {
  for (const name of readdirSync(ios))
    if (existsSync(join(ios, name, 'Images.xcassets'))) return join(ios, name);
  return null;
}

/** Every finding in an `ios/` tree. */
export function iosFindings(ios, expect = expectations()) {
  const findings = [];
  let read = 0;
  const root = iosProjectRoot(ios);
  if (root === null) return { findings: ['ios/ has no project with an Images.xcassets'], read };
  const assets = join(root, 'Images.xcassets');
  const png = (rel) => {
    const path = join(assets, rel);
    if (!existsSync(path)) {
      findings.push(`Images.xcassets/${rel} is missing`);
      return null;
    }
    read += 1;
    return decodePng(readFileSync(path));
  };
  const icon = png('AppIcon.appiconset/App-Icon-1024x1024@1x.png');
  if (icon !== null) {
    const v = iosIconVerdict(icon);
    if (!v.ok) findings.push(`AppIcon.appiconset/App-Icon-1024x1024@1x.png: ${v.why}`);
  }
  for (const [name, night] of [
    ['image', false],
    ['dark_image', true],
  ])
    for (const [suffix, k] of [
      ['', 1],
      ['@2x', 2],
      ['@3x', 3],
    ]) {
      const rel = `SplashScreenLogo.imageset/${name}${suffix}.png`;
      const img = png(rel);
      if (img === null) continue;
      if (img.width !== expect.imageWidth * k)
        findings.push(`${rel} is ${String(img.width)} px, not ${String(expect.imageWidth * k)}`);
      const v = iosSplashVerdict(img, { night });
      if (!v.ok) findings.push(`${rel}: ${v.why}`);
    }
  const colorset = join(assets, 'SplashScreenBackground.colorset', 'Contents.json');
  if (!existsSync(colorset))
    findings.push('SplashScreenBackground.colorset/Contents.json is missing');
  else {
    const { colors } = JSON.parse(readFileSync(colorset, 'utf8'));
    const hexOf = (c) =>
      `#${['red', 'green', 'blue']
        .map((k) =>
          Math.round(Number(c.color.components[k]) * 255)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
        .toUpperCase()}`;
    const light = colors.find((c) => c.appearances === undefined);
    const dark = colors.find((c) => c.appearances?.some((a) => a.value === 'dark'));
    if (light === undefined || hexOf(light) !== expect.light)
      findings.push(
        `the splash background is ${light === undefined ? 'missing' : hexOf(light)}, not ${expect.light}`,
      );
    if (dark === undefined || hexOf(dark) !== expect.dark)
      findings.push(
        `the dark splash background is ${dark === undefined ? 'missing' : hexOf(dark)}, not ${expect.dark}`,
      );
  }
  const storyboard = join(root, 'SplashScreen.storyboard');
  if (!existsSync(storyboard)) findings.push('SplashScreen.storyboard is missing');
  else {
    const xml = readFileSync(storyboard, 'utf8');
    const w = String(expect.imageWidth);
    if (
      !new RegExp(`<image name="SplashScreenLogo" width="${w}" height="${w}"\\s*/>`, 'u').test(xml)
    )
      findings.push(`SplashScreen.storyboard does not draw SplashScreenLogo at ${w} × ${w}`);
  }
  return { findings, read };
}

/* ===================================================================== --prove */

/**
 * A native tree as Expo writes it, from the generated assets: the transforms it applies (48·k and
 * 108·k resizes, the round icon's circle, the 288·k splash composite), PNG bytes in `.webp` names,
 * and the resource and catalog files in its formats. Under the OS temp directory, never the tree.
 */
/**
 * Expo's raster resources at one density, as PNG bytes, from the generated assets: the legacy icon
 * at 48·k, the round one cut to its circle, the adaptive layers at 108·k, and both splash logos
 * composited on 288·k. Keyed by resource — `mipmap/ic_launcher`, `drawable-night/splashscreen_logo`
 * — so this proof and gate 16's build their fixtures from one place.
 */
export function expoLayers(k) {
  const t = drawings();
  const asset = (file) => decodePng(readFileSync(join(BRAND, file)));
  const png = (image) => encodePng(image.width, image.height, image.rgba);
  const round = (image) => {
    const out = { ...image, rgba: Buffer.from(image.rgba) };
    for (let y = 0; y < image.height; y += 1)
      for (let x = 0; x < image.width; x += 1)
        if (Math.hypot(x + 0.5 - image.width / 2, y + 0.5 - image.height / 2) > image.width / 2)
          out.rgba[(y * image.width + x) * 4 + 3] = 0;
    return out;
  };
  const icon = downscale(asset(t.icon.file), 48 * k);
  return {
    'mipmap/ic_launcher': png(icon),
    'mipmap/ic_launcher_round': png(round(icon)),
    'mipmap/ic_launcher_foreground': png(downscale(asset(t.adaptive.file), 108 * k)),
    'mipmap/ic_launcher_background': png(downscale(asset(t.background.file), 108 * k)),
    'mipmap/ic_launcher_monochrome': png(downscale(asset(t.monochrome.file), 108 * k)),
    'drawable/splashscreen_logo': png(expoSplashComposite(asset(t.splashLight.file), k)),
    'drawable-night/splashscreen_logo': png(expoSplashComposite(asset(t.splashDark.file), k)),
  };
}

function synthesise(work, expect) {
  const t = drawings();
  const asset = (file) => decodePng(readFileSync(join(BRAND, file)));
  const res = join(work, 'android', 'res');
  const put = (rel, bytes) => {
    mkdirSync(dirname(join(res, rel)), { recursive: true });
    writeFileSync(join(res, rel), bytes);
  };
  const png = (image) => encodePng(image.width, image.height, image.rgba);
  for (const [density, k] of Object.entries(DENSITIES))
    for (const [resource, bytes] of Object.entries(expoLayers(k))) {
      // `mipmap` → mipmap-xxhdpi, `drawable-night` → drawable-night-xxhdpi; Expo writes the launcher
      // layers under `.webp` names and the splash logos under `.png`.
      const [type, name] = resource.split('/');
      put(`${type}-${density}/${name}.${type === 'mipmap' ? 'webp' : 'png'}`, bytes);
    }
  const adaptive =
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <background android:drawable="@mipmap/ic_launcher_background"/>\n' +
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n' +
    '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>';
  put('mipmap-anydpi-v26/ic_launcher.xml', adaptive);
  put('mipmap-anydpi-v26/ic_launcher_round.xml', adaptive);
  put(
    'values/colors.xml',
    `<resources>\n  <color name="splashscreen_background">${expect.light}</color>\n  <color name="iconBackground">${expect.dark}</color>\n</resources>`,
  );
  put(
    'values-night/colors.xml',
    `<resources>\n  <color name="splashscreen_background">${expect.dark}</color>\n</resources>`,
  );
  put(
    'values/styles.xml',
    '<resources>\n  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">\n' +
      '    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>\n' +
      '    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>\n  </style>\n</resources>',
  );

  const ios = join(work, 'ios');
  const assets = join(ios, 'Irodora', 'Images.xcassets');
  const iput = (rel, bytes) => {
    mkdirSync(dirname(join(assets, rel)), { recursive: true });
    writeFileSync(join(assets, rel), bytes);
  };
  iput('AppIcon.appiconset/App-Icon-1024x1024@1x.png', readFileSync(join(BRAND, t.icon.file)));
  for (const [name, d] of [
    ['image', t.splashLight],
    ['dark_image', t.splashDark],
  ])
    for (const [suffix, k] of [
      ['', 1],
      ['@2x', 2],
      ['@3x', 3],
    ])
      iput(
        `SplashScreenLogo.imageset/${name}${suffix}.png`,
        png(downscale(asset(d.file), expect.imageWidth * k)),
      );
  const component = (hex) =>
    Object.fromEntries(
      ['red', 'green', 'blue'].map((c, i) => [
        c,
        (parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255).toPrecision(15),
      ]),
    );
  iput(
    'SplashScreenBackground.colorset/Contents.json',
    JSON.stringify({
      colors: [
        {
          color: {
            components: { alpha: '1.000', ...component(expect.light) },
            'color-space': 'srgb',
          },
          idiom: 'universal',
        },
        {
          color: {
            components: { alpha: '1.000', ...component(expect.dark) },
            'color-space': 'srgb',
          },
          idiom: 'universal',
          appearances: [{ appearance: 'luminosity', value: 'dark' }],
        },
      ],
    }),
  );
  writeFileSync(
    join(ios, 'Irodora', 'SplashScreen.storyboard'),
    `<resources>\n  <image name="SplashScreenLogo" width="${String(expect.imageWidth)}" height="${String(expect.imageWidth)}"/>\n</resources>`,
  );
  return { res, ios, assets };
}

function prove() {
  console.log(
    `\n${BOLD}Irodora — the native projects' icon and splash, discrimination proof${OFF}\n`,
  );
  const expect = expectations();
  const t = drawings();
  const g = markGeometry();
  const work = mkdtempSync(join(tmpdir(), 'irodora-native-assets-'));
  const wrong = [];
  let ran = 0;
  // The baseline is synthesised once; each case plants into a fresh copy of it.
  const base = join(work, 'base');
  mkdirSync(base, { recursive: true });
  synthesise(base, expect);
  const check = (name, mutate, fail) => {
    ran += 1;
    const dir = join(work, 'case');
    rmSync(dir, { recursive: true, force: true });
    cpSync(base, dir, { recursive: true });
    const tree = {
      res: join(dir, 'android', 'res'),
      ios: join(dir, 'ios'),
      assets: join(dir, 'ios', 'Irodora', 'Images.xcassets'),
    };
    mutate(tree);
    const android = androidFindings(tree.res, expect);
    const ios = iosFindings(tree.ios, expect);
    const findings = [...android.findings, ...ios.findings];
    const failed = findings.length > 0 || android.read === 0 || ios.read === 0;
    if (failed !== fail)
      wrong.push(
        `${name}: expected ${fail ? 'RED' : 'GREEN'}, got ${failed ? 'RED' : 'GREEN'}${findings.length > 0 ? ` (${findings[0]})` : ''}`,
      );
    else
      console.log(
        `  ${GREEN}✓${OFF} ${name} ${DIM}→ ${fail ? `rejected: ${findings[0] ?? 'nothing read'}` : `accepted, ${String(android.read + ios.read)} image(s) read`}${OFF}`,
      );
  };
  const png = (image) => encodePng(image.width, image.height, image.rgba);
  const disc = () => {
    const size = 324;
    const rgba = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y += 1)
      for (let x = 0; x < size; x += 1)
        if (Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) < size / 5) {
          const i = (y * size + x) * 4;
          rgba.fill(255, i, i + 4);
        }
    return png({ width: size, height: size, rgba });
  };
  const white = (size) =>
    png({ width: size, height: size, rgba: Buffer.alloc(size * size * 4, 255) });

  check(
    'the baseline: every layer, logo, colour and catalog as Expo writes them',
    () => undefined,
    false,
  );
  check(
    'a foreground replaced by a solid disc',
    (tr) => writeFileSync(join(tr.res, 'mipmap-xxhdpi/ic_launcher_foreground.webp'), disc()),
    true,
  );
  check(
    'a FLAT background layer — the tile gone',
    (tr) =>
      writeFileSync(
        join(tr.res, 'mipmap-xxhdpi/ic_launcher_background.webp'),
        png(decodePng(render(324, 0, null, palette().darkGround, g))),
      ),
    true,
  );
  check(
    "F-230's splash: a 768 grid at 160 pt",
    (tr) =>
      writeFileSync(
        join(tr.res, 'drawable-night-xxhdpi/splashscreen_logo.png'),
        png(
          expoSplashComposite(decodePng(render(1024, 768, t.splashDark.ink, null, g, 0)), 3, 160),
        ),
      ),
    true,
  );
  check(
    'the night splash drawn in the LIGHT ink',
    (tr) =>
      writeFileSync(
        join(tr.res, 'drawable-night-xxhdpi/splashscreen_logo.png'),
        png(expoSplashComposite(decodePng(readFileSync(join(BRAND, t.splashLight.file))), 3)),
      ),
    true,
  );
  check(
    'a night splash background that is the light one',
    (tr) =>
      writeFileSync(
        join(tr.res, 'values-night/colors.xml'),
        `<resources>\n  <color name="splashscreen_background">${expect.light}</color>\n</resources>`,
      ),
    true,
  );
  check(
    'the themed layer missing',
    (tr) => rmSync(join(tr.res, 'mipmap-hdpi/ic_launcher_monochrome.webp')),
    true,
  );
  check(
    'an adaptive icon that does not name its monochrome layer',
    (tr) => {
      const p = join(tr.res, 'mipmap-anydpi-v26/ic_launcher.xml');
      writeFileSync(p, readFileSync(p, 'utf8').replace(/\s*<monochrome[^>]*\/>/u, ''));
    },
    true,
  );
  check(
    'a real WebP, which this checker cannot read',
    (tr) =>
      writeFileSync(
        join(tr.res, 'mipmap-mdpi/ic_launcher.webp'),
        Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 ', 'latin1'),
      ),
    true,
  );
  check(
    "iOS: Expo's white square, written when a config has no icon",
    (tr) =>
      writeFileSync(join(tr.assets, 'AppIcon.appiconset/App-Icon-1024x1024@1x.png'), white(1024)),
    true,
  );
  check(
    'iOS: a dark splash background that is the light one',
    (tr) => {
      const p = join(tr.assets, 'SplashScreenBackground.colorset/Contents.json');
      const json = JSON.parse(readFileSync(p, 'utf8'));
      json.colors[1] = { ...json.colors[1], color: json.colors[0].color };
      writeFileSync(p, JSON.stringify(json));
    },
    true,
  );
  check(
    'iOS: the storyboard drawing the splash at 160',
    (tr) => {
      const p = join(tr.ios, 'Irodora', 'SplashScreen.storyboard');
      writeFileSync(
        p,
        readFileSync(p, 'utf8').replace(/width="\d+" height="\d+"/u, 'width="160" height="160"'),
      );
    },
    true,
  );
  check(
    'iOS: the dark splash image drawn in the light ink',
    (tr) =>
      writeFileSync(
        join(tr.assets, 'SplashScreenLogo.imageset/dark_image@3x.png'),
        png(
          downscale(
            decodePng(readFileSync(join(BRAND, t.splashLight.file))),
            expect.imageWidth * 3,
          ),
        ),
      ),
    true,
  );
  check('the baseline again', () => undefined, false);
  rmSync(work, { recursive: true, force: true });

  if (wrong.length > 0) {
    console.log(`\n${RED}${BOLD}${String(wrong.length)} case(s) did not discriminate${OFF}\n`);
    for (const w of wrong) console.log(`  ${RED}✗${OFF} ${w}`);
    ciError('native assets proof: cases did not discriminate', wrong.join('\n'));
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}All ${String(ran)} cases discriminate.${OFF} ${DIM}Nothing was written to the tree.${OFF}\n`,
  );
}

/* ======================================================================== main */

function main() {
  const requireIos = process.argv.includes('--require-ios');
  const res = join(APP, 'android', 'app', 'src', 'main', 'res');
  const ios = join(APP, 'ios');
  console.log(`\n${BOLD}Irodora — the native projects carry the icon and the splash${OFF}\n`);
  const problems = [];
  if (!existsSync(res))
    problems.push('no android/ project — run `pnpm build`, which runs expo prebuild');
  else {
    const { findings, read } = androidFindings(res);
    if (read === 0) problems.push('android: no image was read');
    problems.push(...findings.map((f) => `android: ${f}`));
    if (findings.length === 0 && read > 0)
      console.log(
        `  ${GREEN}✓${OFF} android ${DIM}${String(read)} launcher and splash image(s), the adaptive icon's XML, the colours and the splash theme${OFF}`,
      );
  }
  if (existsSync(ios)) {
    const { findings, read } = iosFindings(ios);
    if (read === 0) problems.push('ios: no image was read');
    problems.push(...findings.map((f) => `ios: ${f}`));
    if (findings.length === 0 && read > 0)
      console.log(
        `  ${GREEN}✓${OFF} ios ${DIM}${String(read)} icon and splash image(s), the splash colours and the storyboard${OFF}`,
      );
  } else if (requireIos) problems.push('no ios/ project, and --require-ios was given');
  else
    console.log(
      `  ${YELLOW}!${OFF} ios ${BOLD}NOT RUN${OFF} ${DIM}— no ios/ project here (expo prebuild skips iOS on Windows); CI runs this with --require-ios on Linux${OFF}`,
    );
  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} finding(s)${OFF}\n`);
    for (const p of problems) console.log(`  ${RED}✗${OFF} ${p}`);
    ciError(`${String(problems.length)} native asset finding(s)`, problems.join('\n'));
    process.exit(1);
  }
  console.log(`\n${GREEN}${BOLD}The native projects carry the icon and the splash.${OFF}\n`);
}

const invoked =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  if (process.argv.includes('--prove')) prove();
  else main();
}
