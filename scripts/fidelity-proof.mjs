#!/usr/bin/env node
/**
 * The fidelity run's composer and record, proven without a device (F-221, ADR-0134).
 *
 * The run itself is a person's, on a phone or an emulator. Everything it does that does not need
 * one is decided here, against the real mockups and inventories, fixture captures built in memory,
 * and hierarchy fixtures under `packages/testing/fixtures/claims/rendered/`:
 *
 * - which mockups govern a route in each condition, and the notes for what none draws;
 * - the composed page: the capture and each mockup at 384 units, a framed mockup cropped to its
 *   screen, every mockup's bytes held to the index's sha256;
 * - the record: every route in every condition exactly once, and a summary in which "nothing
 *   captured" can never read as "no difference";
 * - the text a device drew, read for claims, with an unreadable dump counted as unread;
 * - a finding's words written to `claims.txt` and never to the record a repository walker reads.
 *
 * Each rule is shown on a baseline that passes and on a decoy that is actually broken
 * [[a-decoy-that-is-not-broken-proves-nothing]]. Pure: it writes nothing, so it needs no plant
 * journal and nothing is left behind if it is killed.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileBanned, loadClaims } from './claims-patterns.mjs';
import { APP, capturePlan, runCapture } from './fidelity-capture.mjs';
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
import { indexRoutes } from './generate-e2e-flows.mjs';
import { encodePng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  BOLD = '\x1b[1m',
  DIM = '\x1b[2m',
  OFF = '\x1b[0m';

let failures = 0;
const check = (name, ok, detail) => {
  console.log(
    `  ${ok ? `${GREEN}✓` : `${RED}✗`}${OFF} ${name}${ok || detail === undefined ? '' : ` ${DIM}— ${String(detail)}${OFF}`}`,
  );
  if (!ok) failures += 1;
};
const throws = (fn) => {
  try {
    fn();
    return null;
  } catch (error) {
    return String(error.message);
  }
};

console.log(`\n${BOLD}Fidelity — the composer and the record, proven without a device${OFF}\n`);

const index = JSON.parse(readFileSync(join(ROOT, 'mockups', 'index.json'), 'utf8'));
const inventories = new Map(
  Object.entries(index.mockups).map(([id, row]) => [
    id,
    JSON.parse(readFileSync(join(ROOT, row.inventory), 'utf8')),
  ]),
);
const ids = (panels) => panels.panels.map((p) => p.id).join(',');

/* ------------------------------------------------------------- which mockups govern (P1, P2) */

{
  const atlas = governingPanels('/atlas', { theme: 'dark', locale: 'en' }, index, inventories);
  check(
    '/atlas in Sumi and English is governed by 05 alone',
    ids(atlas) === '05' && atlas.notes.length === 0,
    ids(atlas),
  );
  const home = governingPanels('/', { theme: 'light', locale: 'en' }, index, inventories);
  check('/ in Washi is 01, with 25 for the light palette', ids(home) === '01,25', ids(home));
  const colour = governingPanels(
    '/atlas/[slug]',
    { theme: 'dark', locale: 'ja' },
    index,
    inventories,
  );
  check(
    '/atlas/[slug] in Japanese is 06, with 26 for the language',
    ids(colour) === '06,26',
    ids(colour),
  );
  const washi = governingPanels('/atlas', { theme: 'light', locale: 'en' }, index, inventories);
  check(
    'DECOY — /atlas in Washi has no light drawing, and the page says so rather than showing nothing',
    ids(washi) === '05' &&
      washi.notes.some((n) => n.startsWith('no mockup draws this route in Washi')),
    washi.notes.join('; '),
  );
  const measure = governingPanels(
    '/profile/measure',
    { theme: 'dark', locale: 'en' },
    index,
    inventories,
  );
  check(
    'an undrawn route has no panel, and names the question it waits on',
    measure.panels.length === 0 && measure.notes.some((n) => n.includes('waits on OQ-7')),
    measure.notes.join('; '),
  );
  const lens = governingPanels('/lens', { theme: 'dark', locale: 'en' }, index, inventories);
  check(
    'a state variant is named as not composed, never silently left out',
    lens.notes.some((n) => n.startsWith('state variant 03 is not composed')),
    lens.notes.join('; '),
  );
}

/* ----------------------------------------------------------------- the composed page (D4) */

/** A capture as a device would write it: a PNG of the given size, one colour. */
const capturePng = (w, h) => encodePng(w, h, Buffer.alloc(w * h * 4, 200));
const mockupOf = (id, governs, rule) => {
  const row = index.mockups[id];
  const frame = inventories.get(id).frame;
  return {
    id,
    rule,
    ...(governs === undefined ? {} : { governs }),
    bytes: readFileSync(join(ROOT, 'mockups', row.file)),
    sha256: row.sha256,
    box: frame.kind === 'full-bleed' ? null : (frame.screens[0]?.box ?? null),
  };
};

{
  const wide = composeSvg({
    capture: { bytes: capturePng(1080, 2400) },
    mockups: [mockupOf('06', undefined, 'P1'), mockupOf('26', 'locale', 'P2')],
    label: '/atlas/[slug] — dark/ja',
  });
  const box06 = inventories.get('06').frame.screens[0].box;
  check(
    'the page holds the capture and both mockups, each embedded and 384 units wide',
    (wide.match(/<image /gu) ?? []).length === 3 &&
      (wide.match(new RegExp(`width="${String(REFERENCE_DP)}"`, 'gu')) ?? []).length === 3 &&
      wide.includes('href="data:image/jpeg;base64,') &&
      wide.includes('href="data:image/png;base64,'),
  );
  check(
    "a framed mockup is cropped to its inventory's screen, not shown whole",
    wide.includes(
      `viewBox="${String(box06.x)} ${String(box06.y)} ${String(box06.w)} ${String(box06.h)}"`,
    ),
  );
  check(
    'the capture is shown whole, from its own pixels',
    wide.includes('viewBox="0 0 1080 2400"'),
  );
  check(
    'each panel says what it is: first viewport only, and the mockup by id and pinned sha256',
    wide.includes('first viewport only') &&
      wide.includes(`mockup 06 · P1`) &&
      wide.includes(`sha256 ${index.mockups['06'].sha256.slice(0, 12)}`),
  );
  const narrow = composeSvg({
    capture: { bytes: capturePng(720, 1600) },
    mockups: [mockupOf('05', undefined, 'P1')],
    label: '/atlas — dark/en',
  });
  check(
    "DECOY — a capture of another width is scaled from its own size, not a fixed device's",
    narrow.includes('viewBox="0 0 720 1600"') && !narrow.includes('viewBox="0 0 1080 2400"'),
  );
  const flipped = mockupOf('06', undefined, 'P1');
  flipped.sha256 = `${flipped.sha256[0] === 'a' ? 'b' : 'a'}${flipped.sha256.slice(1)}`;
  const refused = throws(() =>
    composeSvg({ capture: { bytes: capturePng(1080, 2400) }, mockups: [flipped], label: 'x' }),
  );
  check(
    'DECOY — a mockup whose bytes are not the pinned ones is refused, by name',
    refused?.startsWith('mockup 06: its bytes are not the ones the index pins') === true,
    refused ?? 'composed anyway',
  );
}

/* --------------------------------------------------------------------------- the record */

{
  const routes = [...indexRoutes(index)].sort();
  const all = routes.flatMap((route) =>
    CONDITIONS.map((c) => ({ route, ...c, status: 'captured', composed: 'compose/x.svg' })),
  );
  const base = {
    commit: 'abc1234',
    app: { package: 'com.irodora.app' },
    device: { model: 'probe' },
    routes,
  };
  const claims = (n) => ({ capturesChecked: n, texts: 10, findings: 0, unread: 0 });
  const full = buildRecord({ ...base, results: all, claims: claims(all.length) });
  check(
    `every route the index names, in four conditions: ${String(routes.length * 4)} captures expected`,
    full.expected === routes.length * 4 && full.captured === full.expected,
  );
  check(
    'a complete run summarises as complete, and passes',
    summaryLine(full) === `captured ${String(full.expected)} of ${String(full.expected)}` &&
      runPassed(full),
    summaryLine(full),
  );

  const partial = all.map((r, i) =>
    i < 4 ? { ...r, status: 'not-captured', reason: 'maestro exited 1' } : r,
  );
  const some = buildRecord({ ...base, results: partial, claims: claims(all.length - 4) });
  check(
    'a run with misses counts them, and does not pass',
    summaryLine(some) ===
      `captured ${String(all.length - 4)} of ${String(all.length)}; 4 not captured` &&
      !runPassed(some),
    summaryLine(some),
  );
  const none = buildRecord({
    ...base,
    results: all.map((r) => ({ ...r, status: 'not-captured', reason: 'no device' })),
    claims: claims(0),
  });
  check(
    'DECOY — nothing captured reads NOTHING CAPTURED, never as a run with nothing to report',
    summaryLine(none) === `NOTHING CAPTURED — 0 of ${String(all.length)}` && !runPassed(none),
    summaryLine(none),
  );
  check(
    'DECOY — a capture missing from the record is refused',
    throws(() => buildRecord({ ...base, results: all.slice(1) }))?.startsWith(
      'the record has no result',
    ) === true,
  );
  check(
    'DECOY — a capture recorded twice is refused',
    throws(() => buildRecord({ ...base, results: [...all, all[0]] }))?.endsWith('twice') === true,
  );
  check(
    'DECOY — a miss with no reason is refused',
    throws(() =>
      buildRecord({
        ...base,
        results: all.map((r, i) => (i === 0 ? { ...r, status: 'not-captured' } : r)),
      }),
    )?.endsWith('says no reason why') === true,
  );
  check(
    'DECOY — an unread capture fails the run, though every capture was taken',
    !runPassed(
      buildRecord({ ...base, results: all, claims: { ...claims(all.length), unread: 1 } }),
    ),
  );
  const declared = all.map((r, i) =>
    i < 4 ? { ...r, status: 'not-captured', unreachable: true, reason: 'needs the camera' } : r,
  );
  const withDeclared = buildRecord({ ...base, results: declared, claims: claims(all.length - 4) });
  check(
    'a miss the capture spec declares unreachable is named as that in the summary, and does not fail the run',
    runPassed(withDeclared) &&
      summaryLine(withDeclared).endsWith(
        '4 unreachable from a cleared app, as the capture spec says',
      ) &&
      recordMarkdown(withDeclared).includes('UNREACHABLE — needs the camera'),
    summaryLine(withDeclared),
  );
  check(
    'DECOY — one undeclared miss beside them fails it',
    !runPassed(
      buildRecord({
        ...base,
        results: declared.map((r, i) =>
          i === 4 ? { ...r, status: 'not-captured', reason: 'maestro exited 1' } : r,
        ),
        claims: claims(all.length - 5),
      }),
    ),
  );
}

/* --------------------------------------------- the runner, on a fake device (D5, D6) */

{
  const plan = capturePlan(ROOT);
  const readMockup = (id) => readFileSync(join(ROOT, 'mockups', plan.index.mockups[id].file));
  const compiled = compileBanned(loadClaims().banned);
  const rendered = (name) =>
    readFileSync(join(ROOT, 'packages', 'testing', 'fixtures', 'claims', 'rendered', name), 'utf8');
  const cleanXml = rendered('clean.xml');

  /**
   * A phone that answers adb as one would: settings it keeps, a screen it reports, flows that
   * write one capture of its width. `events` is every write and every command, in order.
   */
  const fakeDevice = (over = {}) => {
    const state = {
      density: 420,
      override: null,
      fontScale: '1.15',
      animations: {
        window_animation_scale: '1',
        transition_animation_scale: '1',
        animator_duration_scale: '1',
      },
      night: 'no',
      locales: '',
      width: 1080,
    };
    const events = [];
    const ok = (stdout = '') => ({ status: 0, stdout });
    const shell = (_serial, command) => {
      events.push(`shell ${command}`);
      if (over.failing?.test(command) === true) return { status: 1, stdout: '' };
      let m;
      if (command === `pm list packages ${APP}`)
        return ok(over.installed === false ? '' : `package:${APP}`);
      if (command === `dumpsys package ${APP}`)
        return ok(
          `versionName=1.0.0\n    pkgFlags=[ ${over.debuggable === true ? 'DEBUGGABLE ' : ''}HAS_CODE ]`,
        );
      if (command === 'wm size') return ok(`Physical size: ${String(state.width)}x2400`);
      if (command === 'wm density')
        return ok(
          `Physical density: ${String(state.density)}` +
            (state.override === null ? '' : `\nOverride density: ${String(state.override)}`),
        );
      if ((m = /^wm density (\d+)$/u.exec(command))) {
        if (over.refusesDensity !== true) state.override = Number(m[1]);
        return ok();
      }
      if (command === 'wm density reset') {
        state.override = null;
        return ok();
      }
      if (command === 'settings get system font_scale') return ok(state.fontScale);
      if ((m = /^settings put system font_scale (\S+)$/u.exec(command))) {
        state.fontScale = m[1];
        return ok();
      }
      if ((m = /^settings get global (\w+)$/u.exec(command))) return ok(state.animations[m[1]]);
      if ((m = /^settings put global (\w+) (\S+)$/u.exec(command))) {
        state.animations[m[1]] = m[2];
        return ok();
      }
      if (command === 'cmd uimode night') return ok(`Night mode: ${state.night}`);
      if ((m = /^cmd uimode night (\w+)$/u.exec(command))) {
        if (over.ignoresNight !== true) state.night = m[1];
        return ok();
      }
      if (command === `pm clear ${APP}`) {
        state.locales = '';
        return ok('Success');
      }
      if ((m = /^cmd locale set-app-locales \S+ --locales (\S+)$/u.exec(command))) {
        state.locales = m[1];
        return ok();
      }
      if (command === `cmd locale get-app-locales ${APP}`)
        return ok(`Locales for ${APP} for user 0 are [${state.locales}]`);
      if (command === 'getprop ro.product.model') return ok('sdk_gphone64_x86_64');
      if (command === 'getprop ro.build.version.sdk') return ok('34');
      if (command.startsWith('getprop ro.')) return ok('1');
      return { status: 1, stdout: `unknown command: ${command}` };
    };
    const driver = {
      tools: () => ({ adb: true, maestro: true }),
      devices: () => over.devices ?? ['emulator-5554'],
      shell,
      runFlow: (_serial, flow) => {
        events.push(`flow ${flow}`);
        return (
          over.flow?.(flow) ?? {
            status: 0,
            log: 'Flow passed',
            pngs: [encodePng(state.width, 4, Buffer.alloc(state.width * 4 * 4, 128))],
          }
        );
      },
      dumpHierarchy: () => over.hierarchy ?? cleanXml,
    };
    const files = new Map();
    const sink = {
      write: (path, data) => {
        events.push(`write ${path}`);
        files.set(path, data);
      },
    };
    return { driver, sink, state, events, files };
  };
  const run = (device, args = { eraseAppData: true }) =>
    runCapture({
      driver: device.driver,
      sink: device.sink,
      args,
      plan,
      readMockup,
      checkFlows: () => [],
      commit: 'abc1234',
      compiled,
    });
  const MUTATING =
    /^shell (?:wm density (?:\d+|reset)|settings put|cmd uimode night (?:yes|no|auto)|pm clear|cmd locale set-app-locales)/u;
  const reachable = plan.routes.length - plan.unreachable.size;

  {
    const d = fakeDevice();
    const { record, exitCode } = run(d, { eraseAppData: false });
    check(
      'DECOY — without --erase-app-data nothing on the device changes, and the record says why',
      !d.events.some((e) => MUTATING.test(e)) &&
        record.captured === 0 &&
        record.results.every((r) => r.reason.startsWith('--erase-app-data was not given')) &&
        exitCode === 1,
      d.events.filter((e) => MUTATING.test(e)).join('; '),
    );
  }
  {
    const none = run(fakeDevice({ devices: [] })).record;
    const two = run(fakeDevice({ devices: ['a', 'b'] })).record;
    const debug = run(fakeDevice({ debuggable: true })).record;
    const missing = run(fakeDevice({ installed: false })).record;
    check(
      'DECOY — no device, two devices unnamed, a debuggable build, no app: each refused and named',
      none.results[0].reason.startsWith('no device is attached') &&
        two.results[0].reason.startsWith('2 devices are attached') &&
        debug.results[0].reason.startsWith('the installed build is debuggable') &&
        missing.results[0].reason.endsWith('is not installed on emulator-5554') &&
        [none, two, debug, missing].every((r) => r.captured === 0),
    );
  }
  {
    const d = fakeDevice();
    const { record, exitCode } = run(d);
    const firstChange = d.events.findIndex((e) => MUTATING.test(e));
    check(
      `a full run captures every reachable route in four conditions (${String(reachable * 4)}), and passes`,
      record.captured === reachable * 4 &&
        record.unreachable === plan.unreachable.size * 4 &&
        exitCode === 0,
      `${summaryLine(record)} (exit ${String(exitCode)})`,
    );
    check(
      'it writes restore.txt before its first change to the device',
      firstChange > 0 &&
        d.events.indexOf('write restore.txt') >= 0 &&
        d.events.indexOf('write restore.txt') < firstChange,
    );
    check(
      'it sets the screen to 384 dp (density 450 for 1080 px), and puts every setting back',
      record.device.dpWidth === REFERENCE_DP &&
        record.device.density.used === 450 &&
        record.device.restored === true &&
        d.state.override === null &&
        d.state.fontScale === '1.15' &&
        d.state.night === 'no' &&
        Object.values(d.state.animations).every((v) => v === '1'),
      JSON.stringify(d.state),
    );
    check(
      'it clears the app before every capture, and composes each one beside its mockups',
      d.events.filter((e) => e === `shell pm clear ${APP}`).length === reachable * 4 &&
        [...d.files.keys()].filter((p) => p.startsWith('compose/')).length === reachable * 4 &&
        d.files.has('raw/dark-ja/atlas-slug/capture.png') &&
        d.files.has('compose/atlas-slug.light.ja.svg'),
    );
  }
  {
    const d = fakeDevice({
      flow: (flow) =>
        flow.endsWith('compare.yaml')
          ? { status: 1, log: 'Element not found', pngs: [] }
          : undefined,
    });
    const { record } = run(d);
    check(
      'DECOY — a flow failing mid-run is a miss with its log; the rest are captured, and the device is put back',
      record.notCaptured - record.unreachable === 4 &&
        record.results.some(
          (r) => r.route === '/atlas/compare' && r.reason.startsWith('maestro exited 1'),
        ) &&
        record.device.restored === true &&
        d.state.override === null &&
        !runPassed(record),
      summaryLine(record),
    );
  }
  {
    const nopng = run(fakeDevice({ flow: () => ({ status: 0, log: 'passed', pngs: [] }) })).record;
    const narrow = run(
      fakeDevice({
        flow: () => ({
          status: 0,
          log: 'passed',
          pngs: [encodePng(720, 4, Buffer.alloc(720 * 4 * 4, 1))],
        }),
      }),
    ).record;
    check(
      'DECOY — maestro passing with no capture, or a capture of the wrong width, is a miss, not a picture',
      nopng.captured === 0 &&
        nopng.results.some(
          (r) => r.reason === 'maestro exited 0 and wrote 0 capture(s), not one',
        ) &&
        narrow.captured === 0 &&
        narrow.results.some((r) => r.reason === 'the capture is 720 px wide; the screen is 1080'),
    );
  }
  {
    const d = fakeDevice({ refusesDensity: true });
    const { record } = run(d);
    check(
      'DECOY — a screen left at 411 dp is not the reference viewport: nothing is captured, and it is put back',
      record.captured === 0 &&
        record.results[0].reason.startsWith('the screen is 411.43 dp wide') &&
        record.device.restored === true &&
        !d.events.some((e) => e.startsWith('flow ')),
      record.results[0]?.reason,
    );
  }
  {
    const record = run(fakeDevice({ ignoresNight: true })).record;
    check(
      'DECOY — night mode that does not change: Sumi is not captured as Washi',
      record.results
        .filter((r) => r.theme === 'dark')
        .every(
          (r) =>
            r.status === 'not-captured' &&
            (r.unreachable === true || r.reason.startsWith('night mode reads back')),
        ),
    );
  }
  {
    const { record } = run(fakeDevice({ failing: /^wm density reset$/u }));
    check(
      'DECOY — a restore that fails is recorded as not restored',
      record.device.restored === false,
    );
  }
  {
    const unread = run(fakeDevice({ hierarchy: '<hierarchy><node text="cut' })).record;
    const found = fakeDevice({ hierarchy: rendered('composed.xml') });
    const claimed = run(found).record;
    check(
      'DECOY — unreadable text fails the run; a composed claim fails it, its words in claims.txt alone',
      !runPassed(unread) &&
        unread.claims.unread === reachable * 4 &&
        !runPassed(claimed) &&
        claimed.claims.findings === reachable * 4 &&
        String(found.files.get('raw/dark-en/home/claims.txt')).includes('(line)') &&
        !String(found.files.get('record.json')).includes('(line)'),
    );
  }
}

/* ------------------------------------------------------- the text a device drew, for claims */

{
  const compiled = compileBanned(loadClaims().banned);
  const fixture = (name) =>
    readFileSync(join(ROOT, 'packages', 'testing', 'fixtures', 'claims', 'rendered', name), 'utf8');

  const composedTexts = hierarchyTexts(fixture('composed.xml'));
  const composed = captureClaims(composedTexts, compiled);
  check(
    'a figure and a label side by side on the screen are read as one line, and refused',
    composed.some((f) => f.kind === 'line') && composedTexts.some((t) => t.kind === 'line'),
    JSON.stringify(composedTexts),
  );
  const stacked = hierarchyTexts(fixture('stacked.xml'));
  check(
    'DECOY — the same two texts on two lines are not one claim',
    !stacked.some((t) => t.kind === 'line') && captureClaims(stacked, compiled).length === 0,
    JSON.stringify(stacked),
  );
  const clean = hierarchyTexts(fixture('clean.xml'));
  check(
    'an honest screen yields its texts, its names and its lines, and no finding',
    clean.some((t) => t.kind === 'paragraph') &&
      clean.some((t) => t.kind === 'name') &&
      clean.some((t) => t.kind === 'line') &&
      captureClaims(clean, compiled).length === 0,
    JSON.stringify(clean),
  );
  const unread = throws(() => hierarchyTexts(fixture('unreadable.xml')));
  check(
    'DECOY — a dump cut off part-way is unread, never a screen with nothing on it',
    unread !== null,
  );

  // The finding's words go to the capture's claims.txt and nowhere a repository walker reads.
  const line = composed.find((f) => f.kind === 'line');
  const record = buildRecord({
    commit: 'abc1234',
    app: { package: 'com.irodora.app' },
    device: { model: 'probe' },
    routes: ['/atlas'],
    results: CONDITIONS.map((c) => ({
      route: '/atlas',
      ...c,
      status: 'captured',
      claims: 'raw/x/claims.txt',
    })),
    claims: { capturesChecked: 4, texts: 4, findings: 1, unread: 0 },
  });
  check(
    "a finding's words are in claims.txt, and in neither record.json nor record.md",
    line !== undefined &&
      claimsFile(composed).includes(line.text) &&
      !JSON.stringify(record).includes(line.text) &&
      !recordMarkdown(record).includes(line.text),
  );
}

if (failures > 0) {
  console.log(`\n${RED}${BOLD}${String(failures)} case(s) did not hold.${OFF}\n`);
  process.exit(1);
}
console.log(
  `\n${GREEN}${BOLD}Composer and record proven.${OFF} ${DIM}The device run is a person's (ADR-0134).${OFF}\n`,
);
