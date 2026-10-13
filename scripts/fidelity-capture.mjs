#!/usr/bin/env node
/**
 * Every route, captured from the running app beside its mockup (F-221, ADR-0134).
 *
 * ```
 * pnpm fidelity:capture -- --erase-app-data [--serial <adb serial>] [--locale-by-hand en|ja]
 * pnpm fidelity:capture -- --compose <run folder>
 * ```
 *
 * A person runs this, on an Android device or emulator reachable over adb, with a NON-debuggable
 * build of the app installed and the Maestro CLI on the path. It writes, under
 * `.harness/verification/evidence/fidelity/<UTC>/` (gitignored):
 *
 * - `restore.txt`: the device settings it changes, and the commands that put them back, written
 *   before the first change;
 * - `raw/<theme>-<locale>/<route>/`: `capture.png`, `hierarchy.xml`, `maestro.log`, `claims.txt`;
 * - `compose/<route>.<theme>.<locale>.svg`: the capture beside the mockups that govern it;
 * - `record.json` and `record.md`: every route in every condition, captured or not and why.
 *
 * It exits 0 only when every route was captured in all four conditions, every capture's text was
 * read, and no banned construction was found.
 *
 * ## What it changes on the device, and only with consent (ADR-0134 D5, D6)
 *
 * - The app's data, cleared before every route (`pm clear`), so each capture is what a fresh
 *   install reaches. **Nothing changes on the device without `--erase-app-data`**: export what
 *   matters first, or use an emulator.
 * - The display density, so the screen is 384 dp wide; the font scale (1); the animation scales
 *   (0, which Android reports as reduced motion, so screens are captured at rest); night mode
 *   (Sumi, then Washi); the app's own language (API 33+), unless `--locale-by-hand` says the person
 *   sets the phone's language instead, one language per run.
 * - Each is put back in a `finally` and on Ctrl+C. A restore that fails prints its command.
 *
 * ## What is decided without a device
 *
 * Everything but the device's own answers: the flows (`generate-e2e-flows --check`), the panels and
 * the page (`fidelity-compose`), the record and the text (`fidelity-record`), and this file's own
 * order of events — consent, `restore.txt` before the first change, every restore after a failure —
 * by `fidelity-proof`, through the same `runCapture` with a fake device.
 *
 * ## What it cannot know until it runs
 *
 * The device-side formats are documented, not observed here (ADR-0134, "revisit after the first
 * run"): `openLink`'s URL form, where `takeScreenshot` lands, `uiautomator`'s XML, and whether the
 * per-app language survives `pm clear`. Every step fails closed into the record.
 */

import { spawnSync } from 'node:child_process';
import {
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

import { compileBanned, loadClaims } from './claims-patterns.mjs';
import { composeSvg, governingPanels, REFERENCE_DP } from './fidelity-compose.mjs';
import {
  buildRecord,
  captureClaims,
  claimsFile,
  CONDITIONS,
  hierarchyTexts,
  recordMarkdown,
  runPassed,
  summaryLine,
} from './fidelity-record.mjs';
import { captureId, captureSpecs, indexRoutes } from './generate-e2e-flows.mjs';
import { imageSizeOf } from './mockup-inventory.mjs';
import { onPath } from './on-path.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The app the flows target. */
export const APP = 'com.irodora.app';

/** The three animation scales Android has, all set to 0 for a capture at rest. */
const ANIMATIONS = [
  'window_animation_scale',
  'transition_animation_scale',
  'animator_duration_scale',
];

const TAGS = { en: 'en-GB', ja: 'ja-JP' };

/** What a run captures: the routes, each one's flow per locale, and why any is unreachable. */
export function capturePlan(root = ROOT) {
  const index = JSON.parse(readFileSync(join(root, 'mockups', 'index.json'), 'utf8'));
  const spec = JSON.parse(
    readFileSync(join(root, 'apps', 'mobile', 'e2e', 'capture', 'routes.json'), 'utf8'),
  );
  const indexed = indexRoutes(index);
  const { specs, unreachable, problems } = captureSpecs(spec, indexed);
  const flows = new Map();
  for (const s of specs) flows.set(`${s.route} ${s.locale}`, s.path);
  const inventories = new Map(
    Object.entries(index.mockups).map(([id, row]) => [
      id,
      JSON.parse(readFileSync(join(root, row.inventory), 'utf8')),
    ]),
  );
  return {
    index,
    inventories,
    routes: [...indexed].sort(),
    flows,
    unreachable: new Map(unreachable.map((u) => [u.route, u.why])),
    problems,
  };
}

/** A value from a `key: value` line in a command's output, or null. */
const field = (text, label) => {
  const m = new RegExp(`${label}:\\s*(\\S+)`, 'u').exec(text ?? '');
  return m === null ? null : m[1];
};

/**
 * One run. Everything the device does goes through `driver`, and everything written through `sink`,
 * so the proof drives this same function with a fake device and an in-memory folder.
 *
 * - `driver`: `{ tools(), devices(), shell(serial, command), runFlow(serial, flow), dumpHierarchy(serial) }`
 * - `sink`: `{ write(path, data) }`, paths relative to the run folder
 * - `args`: `{ eraseAppData, serial, localeByHand }`
 * - `plan`: from `capturePlan`; `readMockup(id)`: the image's bytes; `checkFlows()`: problems
 * - `onInterrupt(restore)`: registers the restore for Ctrl+C (the CLI); the proof passes nothing
 *
 * Returns `{ record, exitCode }`.
 */
export function runCapture({
  driver,
  sink,
  args,
  plan,
  readMockup,
  checkFlows,
  commit,
  compiled,
  log = () => undefined,
  onInterrupt = () => undefined,
}) {
  const routes = plan.routes;
  const notCaptured = (reason, only = () => true) =>
    routes.flatMap((route) =>
      CONDITIONS.filter(only).map((c) => ({ route, ...c, status: 'not-captured', reason })),
    );
  const finish = (results, device = null, app = { package: APP }, claims = undefined) => {
    const record = buildRecord({ commit, app, device, routes, results, claims });
    sink.write('record.json', `${JSON.stringify(record, null, 2)}\n`);
    sink.write('record.md', recordMarkdown(record));
    log(summaryLine(record));
    return { record, exitCode: runPassed(record) ? 0 : 1 };
  };

  /* ---------------------------------------------------- preflight: nothing changes here */

  const flowProblems = [...plan.problems, ...checkFlows()];
  if (flowProblems.length > 0)
    return finish(notCaptured(`the capture flows are not current: ${flowProblems[0]}`));
  const tools = driver.tools();
  if (!tools.adb) return finish(notCaptured('adb is not on the PATH'));
  if (!tools.maestro) return finish(notCaptured('the Maestro CLI is not on the PATH'));

  const devices = driver.devices();
  if (devices.length === 0)
    return finish(notCaptured('no device is attached (adb devices lists none)'));
  const serial = args.serial ?? (devices.length === 1 ? devices[0] : null);
  if (serial === null)
    return finish(
      notCaptured(`${String(devices.length)} devices are attached: name one with --serial`),
    );
  if (!devices.includes(serial)) return finish(notCaptured(`device ${serial} is not attached`));

  const sh = (command) => driver.shell(serial, command);
  if (!sh(`pm list packages ${APP}`).stdout.split(/\s+/u).includes(`package:${APP}`))
    return finish(notCaptured(`${APP} is not installed on ${serial}`));
  const packageInfo = sh(`dumpsys package ${APP}`).stdout;
  const app = {
    package: APP,
    versionName: field(packageInfo, 'versionName'),
    debuggable: /\bDEBUGGABLE\b/u.test(packageInfo),
  };
  if (app.debuggable)
    return finish(
      notCaptured(
        'the installed build is debuggable, and a development client opens its launcher, not the app: install a release build',
      ),
      null,
      app,
    );

  const physical = /Physical size:\s*(\d+)x(\d+)/u.exec(sh('wm size').stdout);
  const densityText = sh('wm density').stdout;
  const original = {
    density: Number(field(densityText, 'Physical density')),
    densityOverride: field(densityText, 'Override density'),
    fontScale: sh('settings get system font_scale').stdout.trim(),
    animations: ANIMATIONS.map((a) => sh(`settings get global ${a}`).stdout.trim()),
    night: field(sh('cmd uimode night').stdout, 'Night mode'),
  };
  const device = {
    serial,
    model: sh('getprop ro.product.model').stdout.trim(),
    sdk: Number(sh('getprop ro.build.version.sdk').stdout.trim()),
    emulator:
      ['1'].includes(sh('getprop ro.kernel.qemu').stdout.trim()) ||
      sh('getprop ro.boot.qemu').stdout.trim() === '1',
    physicalPx: physical === null ? null : [Number(physical[1]), Number(physical[2])],
    density: { original: original.density, used: null },
    dpWidth: null,
    fontScale: { original: original.fontScale, used: 1 },
    restored: null,
  };
  if (physical === null || !Number.isFinite(original.density))
    return finish(
      notCaptured('the device did not report its size and density (wm size, wm density)'),
      device,
      app,
    );

  if (args.eraseAppData !== true)
    return finish(
      notCaptured(
        '--erase-app-data was not given: the run clears the app’s data on the device before every route, and changes nothing without that consent',
      ),
      device,
      app,
    );

  /* ------------------------------------------- the restore, written before the first change */

  const restores = [
    original.densityOverride === null
      ? 'wm density reset'
      : `wm density ${original.densityOverride}`,
    `settings put system font_scale ${original.fontScale === 'null' ? '1.0' : original.fontScale}`,
    ...ANIMATIONS.map(
      (a, i) =>
        `settings put global ${a} ${original.animations[i] === 'null' ? '1' : original.animations[i]}`,
    ),
    `cmd uimode night ${original.night ?? 'auto'}`,
  ];
  sink.write(
    'restore.txt',
    `What fidelity:capture changed on ${serial}, and what puts it back (adb -s ${serial} shell <command>):\n\n${restores.join('\n')}\n`,
  );
  let restored = false;
  const restore = () => {
    if (restored) return [];
    restored = true;
    const failed = restores.filter((command) => sh(command).status !== 0);
    device.restored = failed.length === 0;
    if (failed.length > 0)
      log(
        `Could not restore ${String(failed.length)} setting(s). Run, for each: adb -s ${serial} shell <command>\n${failed.join('\n')}`,
      );
    return failed;
  };
  onInterrupt(restore);

  const results = [];
  const claims = { capturesChecked: 0, texts: 0, findings: 0, unread: 0 };
  try {
    /* ---------------------------------------------------------------- the reference width */
    const width = device.physicalPx[0];
    const target = Math.round((width * 160) / REFERENCE_DP);
    sh(`wm density ${String(target)}`);
    const used = Number(field(sh('wm density').stdout, 'Override density') ?? original.density);
    device.density.used = used;
    device.dpWidth = Math.round(((width * 160) / used) * 100) / 100;
    const offWidth = Math.abs(device.dpWidth - REFERENCE_DP) > 0.5;
    if (offWidth)
      results.push(
        ...notCaptured(
          `the screen is ${String(device.dpWidth)} dp wide at density ${String(used)}, not ${String(REFERENCE_DP)}`,
        ),
      );
    else {
      sh('settings put system font_scale 1.0');
      for (const a of ANIMATIONS) sh(`settings put global ${a} 0`);
    }

    // Written once, after the restore below: the record says whether the device was put back.
    for (const condition of offWidth ? [] : CONDITIONS) {
      const { theme, locale } = condition;
      const here = (c) => c.theme === theme && c.locale === locale;
      if (args.localeByHand !== undefined && args.localeByHand !== locale) {
        results.push(
          ...notCaptured(
            `--locale-by-hand ${args.localeByHand}: the phone is set to that language by hand; run again for this one`,
            here,
          ),
        );
        continue;
      }
      const night = theme === 'dark' ? 'yes' : 'no';
      sh(`cmd uimode night ${night}`);
      const readBack = field(sh('cmd uimode night').stdout, 'Night mode');
      if (readBack !== night) {
        results.push(
          ...notCaptured(`night mode reads back "${String(readBack)}", not "${night}"`, here),
        );
        continue;
      }

      for (const route of routes) {
        const id = captureId(route);
        const dir = `raw/${theme}-${locale}/${id}`;
        const miss = (reason) =>
          results.push({ route, theme, locale, status: 'not-captured', reason });
        const why = plan.unreachable.get(route);
        if (why !== undefined) {
          results.push({
            route,
            theme,
            locale,
            status: 'not-captured',
            unreachable: true,
            reason: why,
          });
          continue;
        }

        sh(`pm clear ${APP}`);
        if (args.localeByHand === undefined) {
          sh(`cmd locale set-app-locales ${APP} --locales ${TAGS[locale]}`);
          const locales = sh(`cmd locale get-app-locales ${APP}`).stdout.replace(/_/gu, '-');
          if (!locales.includes(TAGS[locale])) {
            miss(
              `the app's language reads back "${locales.trim()}", not ${TAGS[locale]} (API ${String(device.sdk)}; try --locale-by-hand ${locale})`,
            );
            continue;
          }
        }

        const flow = plan.flows.get(`${route} ${locale}`);
        const run = driver.runFlow(serial, flow);
        sink.write(`${dir}/maestro.log`, run.log ?? '');
        if (run.status !== 0) {
          miss(`maestro exited ${String(run.status)} (see ${dir}/maestro.log)`);
          continue;
        }
        if (run.pngs.length !== 1) {
          miss(`maestro exited 0 and wrote ${String(run.pngs.length)} capture(s), not one`);
          continue;
        }
        const png = run.pngs[0];
        const size = imageSizeOf(png);
        if (size === null || size.w !== width) {
          miss(`the capture is ${String(size?.w)} px wide; the screen is ${String(width)}`);
          continue;
        }
        sink.write(`${dir}/capture.png`, png);

        /* the text it drew, read for claims (D3) */
        const xml = driver.dumpHierarchy(serial);
        if (xml !== null) sink.write(`${dir}/hierarchy.xml`, xml);
        let text;
        try {
          const texts = hierarchyTexts(xml ?? '');
          const findings = captureClaims(texts, compiled);
          claims.capturesChecked += 1;
          claims.texts += texts.length;
          claims.findings += findings.length;
          text = claimsFile(findings);
        } catch (error) {
          claims.unread += 1;
          text = `UNREAD: the hierarchy could not be read (${String(error.message)}).\n`;
        }
        sink.write(`${dir}/claims.txt`, text);

        /* beside its mockups (D4) */
        const { panels, notes } = governingPanels(route, condition, plan.index, plan.inventories);
        const composed = `compose/${id}.${theme}.${locale}.svg`;
        sink.write(
          composed,
          composeSvg({
            capture: { bytes: png },
            mockups: panels.map((p) => {
              const frame = plan.inventories.get(p.id).frame;
              return {
                ...p,
                bytes: readMockup(p.id),
                sha256: plan.index.mockups[p.id].sha256,
                box: frame.kind === 'full-bleed' ? null : (frame.screens[0]?.box ?? null),
              };
            }),
            label: `${route} — ${theme}/${locale} — ${device.model}, API ${String(device.sdk)}`,
            notes,
          }),
        );
        results.push({
          route,
          theme,
          locale,
          status: 'captured',
          state: null,
          capture: `${dir}/capture.png`,
          widthPx: size.w,
          governing: panels.map((p) => p.id),
          composed,
          claims: `${dir}/claims.txt`,
        });
      }
    }
  } finally {
    restore();
  }
  return finish(results, device, app, claims);
}

/* =========================================================================== the real device */

/** Every file called `name` under a folder, read. */
function filesNamed(dir, name, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) filesNamed(path, name, out);
    else if (entry.name === name) out.push(readFileSync(path));
  }
  return out;
}

/** adb and Maestro, as `runCapture` asks for them. */
export function realDriver() {
  const adb = onPath('adb');
  const maestro = onPath('maestro');
  const run = (command, args, timeout = 120_000) => {
    // A `.cmd` or `.bat` on Windows runs only through a shell; quote what has spaces.
    const shell = process.platform === 'win32' && /\.(?:cmd|bat)$/iu.test(command);
    return spawnSync(command, shell ? args.map((a) => (/\s/u.test(a) ? `"${a}"` : a)) : args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout,
      shell,
    });
  };
  return {
    tools: () => ({ adb: adb !== null, maestro: maestro !== null }),
    devices: () =>
      (run(adb, ['devices']).stdout ?? '')
        .split('\n')
        .map((line) => /^(\S+)\s+device$/u.exec(line.trim())?.[1])
        .filter((s) => s !== undefined),
    shell: (serial, command) => {
      const r = run(adb, ['-s', serial, 'shell', command]);
      return { status: r.status ?? 1, stdout: r.stdout ?? '' };
    },
    runFlow: (serial, flow) => {
      const out = mkdtempSync(join(tmpdir(), 'fidelity-'));
      try {
        const r = run(
          maestro,
          ['--device', serial, 'test', '--test-output-dir', out, flow],
          300_000,
        );
        return {
          status: r.status ?? 1,
          log: `${r.stdout ?? ''}${r.stderr ?? ''}`,
          pngs: filesNamed(out, 'capture.png'),
        };
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
    dumpHierarchy: (serial) => {
      const path = '/sdcard/irodora-hierarchy.xml';
      if (run(adb, ['-s', serial, 'shell', `uiautomator dump ${path}`]).status !== 0) return null;
      const cat = run(adb, ['-s', serial, 'exec-out', `cat ${path}`]);
      return cat.status === 0 ? cat.stdout : null;
    },
  };
}

/** A run folder on disk. */
function folder(dir) {
  return {
    write: (path, data) => {
      const full = join(dir, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, data);
    },
  };
}

/**
 * Recompose a run folder a person sent back: every capture's page and claims, and the record, from
 * the raw files, with no device. The record's device and app are the run's own.
 */
export function recompose(dir, plan, readMockup, compiled) {
  const before = JSON.parse(readFileSync(join(dir, 'record.json'), 'utf8'));
  const sink = folder(dir);
  const claims = { capturesChecked: 0, texts: 0, findings: 0, unread: 0 };
  const results = before.results.map((r) => {
    if (r.status !== 'captured') return r;
    const png = readFileSync(join(dir, r.capture));
    const rawDir = dirname(r.capture);
    const hierarchy = join(dir, rawDir, 'hierarchy.xml');
    try {
      const texts = hierarchyTexts(existsSync(hierarchy) ? readFileSync(hierarchy, 'utf8') : '');
      const findings = captureClaims(texts, compiled);
      claims.capturesChecked += 1;
      claims.texts += texts.length;
      claims.findings += findings.length;
      sink.write(`${rawDir}/claims.txt`, claimsFile(findings));
    } catch (error) {
      claims.unread += 1;
      sink.write(
        `${rawDir}/claims.txt`,
        `UNREAD: the hierarchy could not be read (${String(error.message)}).\n`,
      );
    }
    const { panels, notes } = governingPanels(r.route, r, plan.index, plan.inventories);
    sink.write(
      r.composed,
      composeSvg({
        capture: { bytes: png },
        mockups: panels.map((p) => {
          const frame = plan.inventories.get(p.id).frame;
          return {
            ...p,
            bytes: readMockup(p.id),
            sha256: plan.index.mockups[p.id].sha256,
            box: frame.kind === 'full-bleed' ? null : (frame.screens[0]?.box ?? null),
          };
        }),
        label: `${r.route} — ${r.theme}/${r.locale} — ${String(before.device?.model)} (recomposed)`,
        notes,
      }),
    );
    return { ...r, governing: panels.map((p) => p.id) };
  });
  const record = buildRecord({
    commit: before.commit,
    app: before.app,
    device: before.device,
    routes: plan.routes,
    results,
    claims,
  });
  sink.write('record.json', `${JSON.stringify(record, null, 2)}\n`);
  sink.write('record.md', recordMarkdown(record));
  return record;
}

/* ===================================================================================== CLI */

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2);
  const value = (flag) => {
    const at = argv.indexOf(flag);
    return at < 0 ? undefined : argv[at + 1];
  };
  const plan = capturePlan();
  const readMockup = (id) => readFileSync(join(ROOT, 'mockups', plan.index.mockups[id].file));
  const compiled = compileBanned(loadClaims().banned);

  if (argv.includes('--compose')) {
    const dir = value('--compose');
    if (dir === undefined || !existsSync(join(dir, 'record.json'))) {
      console.error('--compose needs a run folder holding record.json');
      process.exit(2);
    }
    const record = recompose(dir, plan, readMockup, compiled);
    console.log(`\n${summaryLine(record)}\n  ${dir}\n`);
    process.exit(runPassed(record) ? 0 : 1);
  }

  const localeByHand = value('--locale-by-hand');
  if (localeByHand !== undefined && !['en', 'ja'].includes(localeByHand)) {
    console.error('--locale-by-hand takes en or ja');
    process.exit(2);
  }
  const stamp = new Date().toISOString().replace(/[:.]/gu, '-');
  const dir = join(ROOT, '.harness', 'verification', 'evidence', 'fidelity', stamp);
  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).stdout.trim();
  const checkFlows = () => {
    const r = spawnSync(
      process.execPath,
      [join(ROOT, 'scripts', 'generate-e2e-flows.mjs'), '--check'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    return r.status === 0
      ? []
      : `${r.stdout ?? ''}${r.stderr ?? ''}`
          .split('\n')
          .filter((line) => /MISSING|DRIFTED|STALE|REFUSED/u.test(line))
          .map((line) => line.trim());
  };

  console.log(`\nFidelity capture → ${dir}\n`);
  const { exitCode } = runCapture({
    driver: realDriver(),
    sink: folder(dir),
    args: {
      eraseAppData: argv.includes('--erase-app-data'),
      serial: value('--serial'),
      localeByHand,
    },
    plan,
    readMockup,
    checkFlows,
    commit,
    compiled,
    log: (line) => console.log(line),
    onInterrupt: (restore) => {
      process.on('SIGINT', () => {
        restore();
        process.exit(130);
      });
    },
  });
  console.log(`\n  ${join(dir, 'record.md')}\n`);
  process.exit(exitCode);
}
