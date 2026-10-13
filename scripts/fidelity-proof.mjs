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
