// The inventory generator (F-220). Reads mockups/tools/inventory-data/NN.mjs — one per image, the
// readings taken with measure.ps1, mask.ps1 and corner.ps1, each file saying in its header what was
// derived rather than read — and writes mockups/inventory/NN.json:
//
//   node mockups/tools/generate-inventory.mjs 01 14 …      (then prettier --write the output)
//
// It computes each element's dp from its box and its screen, puts a single screen's elements in the
// reading order §2 states, and checks the result with the same inventoryProblems() the gate runs, so a
// record it writes is one the gate accepts. It never measures anything.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  conflictIdsIn,
  imageSize,
  inventoryProblems,
  ruleIdsIn,
} from '../../scripts/mockup-inventory.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MOCKUPS = join(ROOT, 'mockups');
const index = JSON.parse(readFileSync(join(MOCKUPS, 'index.json'), 'utf8'));
const schema = JSON.parse(readFileSync(join(MOCKUPS, 'inventory.schema.json'), 'utf8'));
const spec = readFileSync(join(ROOT, 'docs', 'design', 'R9-MOCKUP-FIDELITY.md'), 'utf8');
const prd = readFileSync(join(ROOT, 'docs', 'PRD.md'), 'utf8');
const questionsTable = prd.slice(prd.indexOf('**Open questions**'));
const contract = {
  ruleIds: ruleIdsIn(spec),
  conflictIds: conflictIdsIn(spec),
  openQuestions: new Set(
    [
      ...questionsTable.slice(0, questionsTable.indexOf('\n## ')).matchAll(/^\| (OQ-\d+) \|/gmu),
    ].map((m) => m[1]),
  ),
};
const ELEMENT_KEYS = Object.keys(schema.$defs.element.properties);
const REQUIRED_KEYS = new Set(schema.$defs.element.required);
const half = (v) => Math.round(v * 2) / 2;

/** §2's reading order: sorted by top, tops within 8 px of the one before chain into a row, each row
 *  read left to right. The sort is stable, so a parent keeps its place before its children. */
function readingOrder(elements) {
  const byTop = [...elements].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const rows = [];
  for (const e of byTop) {
    const row = rows.at(-1);
    if (row && e.box.y - row.last <= 8) {
      row.items.push(e);
      row.last = e.box.y;
    } else rows.push({ last: e.box.y, items: [e] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.box.x - b.box.x));
}

let failed = 0;
for (const id of process.argv.slice(2)) {
  const { default: d } = await import(
    pathToFileURL(join(MOCKUPS, 'tools', 'inventory-data', `${id}.mjs`)).href
  );
  const row = index.mockups[id];
  const single = d.kind === 'screen' && d.frame.screens.length === 1;
  const ordered = single ? readingOrder(d.elements) : d.elements;
  const screens = new Map(d.frame.screens.map((s) => [s.id, s]));
  const elements = ordered.map((e, i) => {
    const screen = e.screen ? screens.get(e.screen) : d.frame.screens[0];
    const k = screen?.dpPerPx ?? null;
    const out = {};
    for (const key of ELEMENT_KEYS) {
      if (key === 'order') out.order = i + 1;
      else if (key === 'dp')
        out.dp =
          k === null
            ? null
            : {
                x: half((e.box.x - screen.box.x) * k),
                y: half((e.box.y - screen.box.y) * k),
                w: half(e.box.w * k),
                h: half(e.box.h * k),
              };
      else if (key in e) out[key] = e[key];
      else if (REQUIRED_KEYS.has(key)) out[key] = key === 'tokens' ? {} : null;
    }
    for (const key of Object.keys(e)) if (!(key in out)) out[key] = e[key];
    return out;
  });

  const inventory = {
    $schema: '../inventory.schema.json',
    mockup: id,
    mockupSha256: row?.sha256,
    kind: d.kind,
    governs: d.governs,
    frame: d.frame,
    ...(d.overhangs?.length ? { overhangs: d.overhangs } : {}),
    elements,
    notDesign: d.notDesign,
    departures: d.departures,
    conflicts: d.conflicts,
  };
  const problems = [];
  if (!row) problems.push(`no index row for ${id}`);
  inventoryProblems(inventory, id, {
    add: (what) => problems.push(what),
    ...contract,
    image: row ? imageSize(join(MOCKUPS, row.file)) : null,
  });
  writeFileSync(
    join(MOCKUPS, 'inventory', `${id}.json`),
    `${JSON.stringify(inventory, null, 2)}\n`,
    'utf8',
  );
  console.log(
    `${id}: ${elements.length} element(s), ${d.notDesign.length} not-design, ${d.departures.length} departure(s), ${d.conflicts.length} conflict(s)` +
      (problems.length ? `\n  ${problems.join('\n  ')}` : ' — clean'),
  );
  failed += problems.length;
}
process.exit(failed ? 1 : 0);
