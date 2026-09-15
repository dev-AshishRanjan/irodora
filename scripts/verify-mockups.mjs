#!/usr/bin/env node
/**
 * The mockup index — golden rule 14, made checkable (F-218).
 *
 * `mockups/` is the specification for everything a person can see. Before this, nothing a machine
 * could read said which image governs which route, so three failures were silent:
 *
 * | failure | what it looks like later |
 * |---|---|
 * | a route nobody drew | a screen an agent designed by taste — the thing rule 14 forbids |
 * | an image that governs nothing | a picture every feature ignores and nobody notices |
 * | an image that changes | every feature built from it now checks against a picture nobody specified |
 *
 * Each is now a red build. `mockups/index.json` is the map; this reads it against the files on
 * disk, the route tree, the open questions in PRD §10 and the human view in
 * `R9-MOCKUP-FIDELITY.md` §7.
 *
 * ## The route tree is enumerated once
 *
 * `routePatterns()` from `verify-route-targets.mjs` is the only enumerator. A second one would
 * disagree with it about groups and `index` sooner or later, and F-215 is what that costs.
 *
 * ## The two maps are compared as SETS, both columns, both directions
 *
 * §7's "governing" column must name exactly the index's primaries for a route, and its "variants"
 * column exactly its variants — an id missing from either side, or extra on either side, is a
 * disagreement. Every mockup id must also appear somewhere in §7, and every id §7 names must be
 * indexed, which is what covers the rows that are not routes (icon and splash, components). The
 * first version compared only that each primary appeared somewhere on the row, which let a variant
 * drift and an extra id sit there unnoticed (found by the evaluator, F-218).
 *
 * ## Inventories have an end condition
 *
 * An inventory (F-220) records the sha256 of the image it describes, so an image cannot change
 * under its structure, and is checked element by element by `mockup-inventory.mjs` — ids, reading
 * order, parents, bindings, dp against box, boxes inside their image and screen, and the §4 and §6
 * ids it cites. **Once F-220 is done, a null inventory is a failure**, read from its status rather
 * than from a date somebody has to remember.
 *
 * ## What this does not check
 *
 * **That a screen looks like its mockup.** That is F-220's inventories (structure) and F-221's
 * captures (appearance). This checks that the map from screens to pictures is complete, unique
 * and pinned — the precondition for either of those meaning anything.
 *
 * node scripts/verify-mockups.mjs
 * node scripts/verify-mockups.mjs --prove
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routePatterns } from './verify-route-targets.mjs';
import { guardPlants } from './plant.mjs';
import { conflictIdsIn, imageSize, inventoryProblems, ruleIdsIn } from './mockup-inventory.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MOCKUPS = join(ROOT, 'mockups');
const INDEX = join(MOCKUPS, 'index.json');
const MOCKUP_MANUAL = join(MOCKUPS, 'AGENTS.md');
const SPEC = join(ROOT, 'docs', 'design', 'R9-MOCKUP-FIDELITY.md');
const PRD = join(ROOT, 'docs', 'PRD.md');
const FEATURES = join(ROOT, '.harness', 'state', 'feature_list.json');
const APP = join(ROOT, 'apps', 'mobile', 'app');
const IMAGE = /\.(jpe?g|png|webp)$/iu;
/** The feature whose completion makes every image's inventory mandatory. */
const INVENTORY_OWNER = 'F-220';

const GREEN = '\x1b[32m',
  RED = '\x1b[31m',
  DIM = '\x1b[2m',
  BOLD = '\x1b[1m',
  OFF = '\x1b[0m';

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const short = (hash) => String(hash).slice(0, 12);
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const list = (set) => (set.size ? [...set].sort().join(', ') : 'none');

/** The text between two markers, or null when the first is missing. */
function section(text, from, to) {
  const start = text.indexOf(from);
  if (start < 0) return null;
  const end = text.indexOf(to, start + from.length);
  return text.slice(start, end < 0 ? undefined : end);
}

/** The OQ ids in PRD §10's open-questions table — and only there, not anywhere a row happens to start that way. */
function openQuestions() {
  const table = section(readFileSync(PRD, 'utf8'), '**Open questions**', '\n## ') ?? '';
  return new Set([...table.matchAll(/^\| (OQ-\d+) \|/gmu)].map((m) => m[1]));
}

/** Whether the inventory owner is done, read from its status. */
function inventoriesRequired() {
  const features = JSON.parse(readFileSync(FEATURES, 'utf8')).features;
  return features.find((f) => f.id === INVENTORY_OWNER)?.status === 'done';
}

/** The two-digit mockup ids a piece of §7 names. */
const idsIn = (text) => new Set([...(text ?? '').matchAll(/`(\d{2})`/gu)].map((m) => m[1]));

export function findProblems() {
  const problems = [];
  const add = (what, detail) => problems.push({ what, detail });

  let index;
  try {
    index = JSON.parse(readFileSync(INDEX, 'utf8'));
  } catch (error) {
    add('mockups/index.json cannot be read', String(error.message));
    return { problems, stats: null };
  }

  const entries = Object.entries(index.mockups ?? {});
  const undrawn = index.undrawn ?? {};
  const routes = routePatterns(APP).map(({ url, file }) => ({ url, file }));
  const routeUrls = new Set(routes.map((r) => r.url));
  const primariesOf = (url) =>
    new Set(entries.filter(([, e]) => (e.primaryFor ?? []).includes(url)).map(([id]) => id));
  const variantsOf = (url) =>
    new Set(entries.filter(([, e]) => (e.variantFor ?? []).includes(url)).map(([id]) => id));
  const required = inventoriesRequired();
  const specText = readFileSync(SPEC, 'utf8');
  const contract = {
    ruleIds: ruleIdsIn(specText),
    conflictIds: conflictIdsIn(specText),
    openQuestions: openQuestions(),
  };

  /* ---- images on disk ↔ rows ---- */

  const onDisk = readdirSync(MOCKUPS)
    .filter((f) => IMAGE.test(f))
    .sort();
  const indexed = new Set(entries.map(([, e]) => e.file));
  for (const file of onDisk)
    if (!indexed.has(file))
      add(
        `${file} is not in the index`,
        'An image nobody indexed governs nothing, and nothing notices when it changes. Add a row to mockups/index.json naming what it governs.',
      );

  for (const [id, e] of entries) {
    if (!/^[0-9]{2}$/u.test(id))
      add(`index id "${id}" is not two digits`, 'The id is the image file’s two-digit prefix.');
    if (!e.file || !existsSync(join(MOCKUPS, e.file))) {
      add(
        `mockup ${id} names ${String(e.file)}, which is not in mockups/`,
        'A row for a picture that is gone describes a specification nobody can open. Remove the row, or restore the image.',
      );
      continue;
    }
    if (!e.file.startsWith(`${id}_`))
      add(
        `mockup ${id} names ${e.file}`,
        'The id is the file’s prefix. A row pointing at another image describes the wrong picture.',
      );

    const actual = sha256(join(MOCKUPS, e.file));
    if (actual !== e.sha256)
      add(
        `mockup ${id} (${e.file}) changed without its index row`,
        `Recorded ${short(e.sha256)}, the file is ${short(actual)}. A changed image is a changed specification (mockups/AGENTS.md rule 3): update this row, and its inventory, in the same commit.`,
      );

    const primary = e.primaryFor ?? [];
    const variant = e.variantFor ?? [];
    const surfaces = e.surfaces ?? [];
    if (primary.length + variant.length + surfaces.length === 0)
      add(
        `mockup ${id} governs nothing`,
        'Every image is the primary for a route, a variant of one, or a non-route surface. One that is none of those is a picture every feature is free to ignore.',
      );
    for (const url of [...primary, ...variant])
      if (!routeUrls.has(url))
        add(
          `mockup ${id} names ${url}, which is not a route`,
          'Routes come from apps/mobile/app through routePatterns(). A row naming one that does not exist has either a typo or a route that moved.',
        );

    if (e.inventory !== null && e.inventory !== undefined) {
      const path = join(ROOT, e.inventory);
      if (!existsSync(path)) {
        add(
          `mockup ${id}’s inventory ${e.inventory} does not exist`,
          'Point at the file, or set it to null.',
        );
      } else {
        let inventory = null;
        try {
          inventory = JSON.parse(readFileSync(path, 'utf8'));
        } catch (error) {
          add(`mockup ${id}’s inventory cannot be read`, String(error.message));
        }
        if (inventory && inventory.mockupSha256 !== actual)
          add(
            `the inventory for mockup ${id} was written against a different image`,
            `It records ${short(inventory.mockupSha256)}; the image is ${short(actual)}. Re-inventory the image — the elements it describes may no longer be the ones drawn.`,
          );
        else if (inventory)
          inventoryProblems(inventory, id, {
            add,
            ...contract,
            image: imageSize(join(MOCKUPS, e.file)),
          });
      }
    } else if (required) {
      add(
        `mockup ${id} has no element inventory, and ${INVENTORY_OWNER} is done`,
        `Once ${INVENTORY_OWNER} is done every image carries its inventory, or the image can change without the structure it describes (${INVENTORY_OWNER}, E-126).`,
      );
    }
  }

  /* ---- every route: one layout, or a question asking for one ---- */

  const questions = openQuestions();
  for (const r of routes) {
    const primaries = primariesOf(r.url);
    if (primaries.size > 1)
      add(
        `${r.url} has ${String(primaries.size)} primary mockups (${list(primaries)})`,
        'A screen has one layout (precedence P1). Make one of them a variant, or resolve the contradiction in the conflict register.',
      );
    const question = undrawn[r.url];
    if (primaries.size === 0) {
      if (!question)
        add(
          `${r.url} has no governing mockup`,
          'Every route is drawn, or waits for a drawing (golden rule 14). Index its mockup, or name the open question that asks for one under "undrawn".',
        );
      else if (!questions.has(question))
        add(
          `${r.url} waits on ${question}, which is not an open question in PRD §10`,
          'An undrawn route is allowed only while a real question asks for its mockup.',
        );
    } else if (question) {
      add(
        `${r.url} is listed as undrawn, but mockup ${[...primaries][0]} governs it`,
        'Close the open question and remove the undrawn row.',
      );
    }
  }
  for (const url of Object.keys(undrawn))
    if (!routeUrls.has(url)) add(`undrawn ${url} is not a route`, 'Remove the row.');

  /* ---- the human view agrees, column for column ---- */

  const s7 = section(readFileSync(SPEC, 'utf8'), '## 7.', '## 8.');
  if (!s7) {
    add('R9-MOCKUP-FIDELITY.md has no §7', 'The route map a person reads is missing.');
  } else {
    const lines = s7.split('\n');
    for (const r of routes) {
      const row = lines.find((l) => l.includes(`\`${r.file}\``));
      if (!row) {
        add(
          `§7 of R9-MOCKUP-FIDELITY.md does not list ${r.file}`,
          'The route map a person reads and the one the build reads must name the same routes.',
        );
        continue;
      }
      // | route(s) | governing | variants and states | feature |
      const cells = row.split('|').map((c) => c.trim());
      const [written, index] = [
        { governing: idsIn(cells[2]), variants: idsIn(cells[3]) },
        { governing: primariesOf(r.url), variants: variantsOf(r.url) },
      ];
      for (const column of ['governing', 'variants'])
        if (!sameSet(written[column], index[column]))
          add(
            `§7 of R9-MOCKUP-FIDELITY.md disagrees with the index about ${r.file} (${column})`,
            `§7 names ${list(written[column])}; the index names ${list(index[column])}. The row reads: ${row}`,
          );
      if (index.governing.size === 0 && undrawn[r.url] && !row.includes(undrawn[r.url]))
        add(
          `§7 of R9-MOCKUP-FIDELITY.md does not name ${undrawn[r.url]} for ${r.file}`,
          `The row reads: ${row}`,
        );
    }

    // Both directions over the whole table: this is what covers the rows that are not routes.
    const mentioned = idsIn(s7);
    const indexedIds = new Set(entries.map(([id]) => id));
    for (const id of indexedIds)
      if (!mentioned.has(id))
        add(
          `mockup ${id} is not in §7 of R9-MOCKUP-FIDELITY.md`,
          'Every image appears in the route map a person reads — governing a route, varying one, or on a surface row (icon and splash, components).',
        );
    for (const id of mentioned)
      if (!indexedIds.has(id))
        add(
          `§7 of R9-MOCKUP-FIDELITY.md names mockup ${id}, which is not in the index`,
          'The map a person reads names a picture the build does not know.',
        );
  }

  const withoutInventory = entries.filter(([, e]) => !e.inventory).length;
  return {
    problems,
    stats: {
      images: onDisk.length,
      rows: entries.length,
      routes: routes.length,
      withoutInventory,
      required,
    },
  };
}

/* ===================================================================== --prove */

if (process.argv.includes('--prove')) {
  console.log(`\n${BOLD}Mockup index — proving the check${OFF}\n`);

  const probeImage = join(MOCKUPS, '99_probe.png');
  const probeRoute = join(APP, '(tabs)', 'atlas', '__mockup_probe__.tsx');
  const probeInventory = join(MOCKUPS, '__probe_inventory__.json');
  const created = [probeImage, probeRoute, probeInventory];
  const tracked = [INDEX, FEATURES, SPEC, PRD, MOCKUP_MANUAL];

  const original = Object.fromEntries(tracked.map((f) => [f, readFileSync(f, 'utf8')]));
  const restore = () => {
    for (const f of tracked) writeFileSync(f, original[f], 'utf8');
    for (const file of created) if (existsSync(file)) unlinkSync(file);
  };
  const withIndex = (mutate) => {
    const index = JSON.parse(original[INDEX]);
    mutate(index);
    writeFileSync(INDEX, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  };
  const withFeatures = (mutate) => {
    const features = JSON.parse(original[FEATURES]);
    mutate(Object.fromEntries(features.features.map((f) => [f.id, f])));
    writeFileSync(FEATURES, `${JSON.stringify(features, null, 2)}\n`, 'utf8');
  };
  /** Replace one exact §7 row fragment. A fragment that is not there is a broken case, not a pass. */
  const withSpec = (from, to) => {
    if (!original[SPEC].includes(from)) throw new Error(`proof: §7 text not found — ${from}`);
    writeFileSync(SPEC, original[SPEC].replace(from, to), 'utf8');
  };
  /** Put a line in the PRD OUTSIDE §10's open-questions table — above it, where a stray row could sit. */
  const withPrdLineAbove = (line) => {
    const at = original[PRD].indexOf('\n') + 1;
    if (original[PRD].indexOf('**Open questions**') < at)
      throw new Error('proof: the PRD has no open-questions table below its first line');
    writeFileSync(PRD, `${original[PRD].slice(0, at)}${line}\n${original[PRD].slice(at)}`, 'utf8');
  };
  /** A real inventory, mutated, planted as its row's inventory — mockup 01's unless another is named. */
  const withInventory = (mutate, id = '01') => {
    const inventory = JSON.parse(readFileSync(join(MOCKUPS, 'inventory', `${id}.json`), 'utf8'));
    mutate(inventory);
    writeFileSync(probeInventory, JSON.stringify(inventory));
    withIndex((i) => {
      i.mockups[id].inventory = 'mockups/__probe_inventory__.json';
    });
  };
  /** Gate 0, run as the build runs it. Returns its exit status and everything it printed. */
  const gate0 = () => {
    try {
      const out = execFileSync(process.execPath, [join(ROOT, 'scripts', 'verify-state.mjs')], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return { status: 0, out };
    } catch (error) {
      return { status: error.status ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  };

  if (findProblems().problems.length !== 0) {
    console.log(`  ${RED}✗${OFF} the index is not clean before planting anything`);
    process.exit(1);
  }
  if (gate0().status !== 0) {
    console.log(`  ${RED}✗${OFF} gate 0 is not green before planting anything`);
    process.exit(1);
  }
  console.log(
    `  ${GREEN}✓${OFF} baseline clean, and gate 0 green ${DIM}(asserted first, or a plant proves nothing)${OFF}`,
  );

  /*
   * THE PLANT JOURNAL (F-173). Opened only now, after the baseline is known to be clean: a journal
   * opened before an exit that plants nothing claims plants that never happened, and the next run
   * refuses to start until somebody recovers files that were never broken. Five tracked files may
   * be mutated and three created; each is journalled before it is touched.
   */
  const journal = guardPlants('verify-mockups --prove', [...tracked, ...created]);
  const results = { rejected: 0, allowed: 0, bad: 0 };
  const report = (name, expectRed, hit, problems = []) => {
    if (hit) results[expectRed ? 'rejected' : 'allowed'] += 1;
    else results.bad += 1;
    console.log(
      `  ${hit ? GREEN + '✓' : RED + '✗'}${OFF} ${name} ${DIM}${expectRed ? 'rejected' : 'allowed'}${OFF}`,
    );
    if (!hit) for (const p of problems) console.log(`      ${DIM}${p.what}${OFF}`);
  };

  try {
    const cases = [
      /* ---- the images and their rows ---- */
      {
        name: 'an image nobody indexed',
        plant: () => writeFileSync(probeImage, 'not a picture'),
        expect: 'is not in the index',
      },
      {
        name: 'a row for an image that is gone',
        plant: () =>
          withIndex((i) => {
            i.mockups['98'] = {
              file: '98_gone.jpg',
              sha256: '0',
              surfaces: ['components'],
              inventory: null,
            };
          }),
        expect: 'which is not in mockups/',
      },
      {
        name: 'an id that is not two digits',
        plant: () =>
          withIndex((i) => {
            i.mockups['7'] = { ...i.mockups['07'] };
          }),
        expect: 'is not two digits',
      },
      {
        name: 'a row pointing at another image',
        plant: () =>
          withIndex((i) => {
            i.mockups['01'].file = i.mockups['02'].file;
          }),
        expect: `mockup 01 names 02_`,
      },
      {
        name: 'an image that changed under its row',
        plant: () =>
          withIndex((i) => {
            i.mockups['01'].sha256 = 'f'.repeat(64);
          }),
        expect: 'changed without its index row',
      },
      {
        name: 'an image that governs nothing',
        plant: () =>
          withIndex((i) => {
            i.mockups['00'].surfaces = [];
          }),
        expect: 'governs nothing',
      },
      {
        name: 'an inventory written against another image',
        plant: () => {
          writeFileSync(probeInventory, JSON.stringify({ mockupSha256: '0' }));
          withIndex((i) => {
            i.mockups['01'].inventory = 'mockups/__probe_inventory__.json';
          });
        },
        expect: 'written against a different image',
      },
      {
        // Every row carries an inventory now, so the case takes one away itself; relying on a row
        // the set had not reached yet stopped discriminating the day the last one was written.
        name: `no inventory once ${INVENTORY_OWNER} is done`,
        plant: () => {
          withIndex((i) => {
            i.mockups['27'].inventory = null;
          });
          withFeatures((f) => {
            f[INVENTORY_OWNER].status = 'done';
          });
        },
        expect: `has no element inventory, and ${INVENTORY_OWNER} is done`,
      },

      /* ---- the routes ---- */
      {
        name: 'a route nobody drew',
        plant: () =>
          writeFileSync(probeRoute, 'export default function Probe() {\n  return null;\n}\n'),
        expect: 'has no governing mockup',
      },
      {
        name: 'a route with two layouts',
        plant: () =>
          withIndex((i) => {
            i.mockups['05'].primaryFor.push('/');
          }),
        expect: 'primary mockups',
      },
      {
        name: 'a row naming a route that does not exist',
        plant: () =>
          withIndex((i) => {
            i.mockups['01'].variantFor = ['/nowhere'];
          }),
        expect: 'which is not a route',
      },
      {
        name: 'an undrawn route waiting on a question nobody asked',
        plant: () =>
          withIndex((i) => {
            i.undrawn['/profile/measure'] = 'OQ-999';
          }),
        expect: 'is not an open question',
      },
      {
        // The lookup reads §10's table only. A row that merely LOOKS like an open question,
        // anywhere else in the PRD, must not count as one.
        name: 'an open question written outside PRD §10',
        plant: () => {
          withPrdLineAbove('| OQ-99 | a row outside the open-questions table | R9 |');
          withIndex((i) => {
            i.undrawn['/profile/measure'] = 'OQ-99';
          });
        },
        expect: 'waits on OQ-99, which is not an open question',
      },
      {
        name: 'a route listed as undrawn that a mockup already governs',
        plant: () =>
          withIndex((i) => {
            i.undrawn['/atlas'] = 'OQ-7';
          }),
        expect: 'is listed as undrawn, but mockup',
      },
      {
        name: 'an undrawn row that is not a route',
        plant: () =>
          withIndex((i) => {
            i.undrawn['/nowhere'] = 'OQ-7';
          }),
        expect: 'undrawn /nowhere is not a route',
      },

      /* ---- the specification's §7 ---- */
      {
        name: 'a primary swapped in the index but not in §7',
        plant: () =>
          withIndex((i) => {
            i.mockups['08'].primaryFor = [];
            i.mockups['08'].variantFor = ['/atlas/compare'];
            i.mockups['09'].primaryFor.push('/atlas/compare');
          }),
        expect: 'disagrees with the index about (tabs)/atlas/compare (governing)',
      },
      {
        name: 'a variant in the index that §7 does not list',
        plant: () =>
          withIndex((i) => {
            i.mockups['16'].variantFor.push('/atlas');
          }),
        expect: 'disagrees with the index about (tabs)/atlas/index (variants)',
      },
      {
        name: 'an extra id on a §7 row',
        plant: () =>
          withSpec('| `(tabs)/atlas/compare` | `08` |', '| `(tabs)/atlas/compare` | `08` · `09` |'),
        expect: 'disagrees with the index about (tabs)/atlas/compare (governing)',
      },
      {
        name: 'a route §7 does not list',
        plant: () => withSpec('| `(tabs)/atlas/find` | `09` | | `F-250` |\n', ''),
        expect: 'does not list (tabs)/atlas/find',
      },
      {
        name: 'a §7 row that forgets the open question',
        plant: () => withSpec('**none — OQ-7**', '**none**'),
        expect: 'does not name OQ-7',
      },
      {
        // A non-route row: nothing route-shaped would notice it losing its mockup.
        name: 'a mockup §7 never mentions',
        plant: () =>
          withSpec(
            '| app icon · adaptive icon · splash | `14` |',
            '| app icon · adaptive icon · splash | |',
          ),
        expect: 'mockup 14 is not in §7',
      },

      /* ---- the inventories, element by element (F-220) ---- */
      {
        name: 'an inventory missing a key',
        plant: () =>
          withInventory((v) => {
            delete v.notDesign;
          }),
        expect: 'has no notDesign',
      },
      {
        name: 'two elements with one id',
        plant: () =>
          withInventory((v) => {
            v.elements[1].id = v.elements[0].id;
          }),
        expect: 'appears twice',
      },
      {
        name: 'an element id from another image',
        plant: () =>
          withInventory((v) => {
            v.elements[0].id = '99.header';
          }),
        expect: 'is not prefixed 01.',
      },
      {
        name: 'a gap in the order',
        plant: () =>
          withInventory((v) => {
            v.elements[2].order = 99;
          }),
        expect: 'where 3 comes next',
      },
      {
        name: 'two elements out of reading order',
        plant: () =>
          withInventory((v) => {
            [v.elements[1], v.elements[2]] = [v.elements[2], v.elements[1]];
            v.elements.forEach((e, i) => {
              e.order = i + 1;
            });
          }),
        expect: 'reading order',
      },
      {
        name: 'a child listed before its parent',
        plant: () =>
          withInventory((v) => {
            v.elements[1].parent = '01.hero';
          }),
        expect: 'as its parent',
      },
      {
        name: 'a value copied off the picture',
        plant: () =>
          withInventory((v) => {
            v.elements[0].binding = 'hex:#5B6B78';
          }),
        expect: 'binds to',
      },
      {
        name: 'a binding waiting on a question nobody asked',
        plant: () =>
          withInventory((v) => {
            v.elements[0].binding = 'oq:OQ-999';
          }),
        expect: 'which is not an open question',
      },
      {
        name: 'dp edited on one side only',
        plant: () =>
          withInventory((v) => {
            v.elements[0].dp.x += 5;
          }),
        expect: 'where its box puts it at',
      },
      {
        name: 'an element past its screen, undeclared',
        plant: () =>
          withInventory((v) => {
            v.elements[0].box.w = 900;
          }),
        expect: 'lies outside its screen',
      },
      {
        name: 'a declared overhang with no presentation region',
        plant: () =>
          withInventory((v) => {
            v.notDesign = v.notDesign.filter((n) => n.what !== 'presentation');
          }, '04'),
        expect: 'no presentation region names it',
      },
      {
        name: 'a departure under a rule §4 does not list',
        plant: () =>
          withInventory((v) => {
            v.departures.push({
              rule: 'E9',
              element: v.elements[0].id,
              why: 'planted by the proof',
            });
          }),
        expect: 'which §4 does not list',
      },
      {
        name: 'a conflict §6 does not register',
        plant: () =>
          withInventory((v) => {
            v.conflicts.push({
              id: 'C99',
              elements: [],
              resolution: 'planted by the proof',
              flippedByUser: false,
            });
          }),
        expect: 'which §6 does not register',
      },

      /* ---- must stay GREEN ---- */
      {
        // Row order carries no meaning; a check that depended on it would fail a harmless re-sort.
        name: 'the same index in another order — must stay GREEN',
        plant: () =>
          withIndex((i) => {
            i.mockups = Object.fromEntries(Object.entries(i.mockups).reverse());
          }),
        expect: null,
      },
      {
        // A variant is legitimate when BOTH maps say so — the check compares, it does not forbid.
        name: 'a variant added to the index and §7 together — must stay GREEN',
        plant: () => {
          withIndex((i) => {
            i.mockups['25'].variantFor.push('/atlas');
          });
          withSpec(
            '| `(tabs)/atlas/index` | `05` | |',
            '| `(tabs)/atlas/index` | `05` | `25` light |',
          );
        },
        expect: null,
      },
      {
        // A real inventory, copied under another name: the check reads the record, not the path.
        name: 'an inventory that matches its image — must stay GREEN',
        plant: () => withInventory((v) => v),
        expect: null,
      },
      {
        // 04 draws two cards past its frame, declared and recorded as presentation — legitimate.
        name: 'a declared overhang with its presentation region — must stay GREEN',
        plant: () => withInventory((v) => v, '04'),
        expect: null,
      },
      {
        // The other half of the null-inventory case: the same missing row, with its owner not done.
        // The status is planted too, so the case means the same thing after F-220 closes.
        name: `no inventory while ${INVENTORY_OWNER} is not done — must stay GREEN`,
        plant: () => {
          withIndex((i) => {
            i.mockups['27'].inventory = null;
          });
          withFeatures((f) => {
            f[INVENTORY_OWNER].status = 'in_progress';
          });
        },
        expect: null,
      },
    ];

    for (const c of cases) {
      let problems;
      let expect = c.expect;
      try {
        c.plant();
        ({ problems } = findProblems());
      } catch (error) {
        problems = [{ what: `the case itself broke: ${String(error.message)}` }];
        // A broken case can never count as a pass, whichever way it was meant to go.
        expect = ' never';
      } finally {
        restore();
      }
      const hit =
        expect === null ? problems.length === 0 : problems.some((p) => p.what.includes(expect));
      report(c.name, c.expect !== null, hit, problems);
    }

    /* ---- gate 0's half: a UI feature names what it materialises, and it reads this scope ---- */

    const gateCases = [
      {
        name: 'gate 0: a UI feature that names no mockup',
        plant: () =>
          withFeatures((f) => {
            delete f['F-242'].mockups;
          }),
        expect: 'F-242 is a UI feature in R9 and names no mockup',
      },
      {
        name: 'gate 0: a UI feature with an empty list and no open question',
        plant: () =>
          withFeatures((f) => {
            f['F-242'].mockups = [];
          }),
        expect: 'F-242 names no mockup and no open question',
      },
      {
        name: 'gate 0: a UI feature naming a mockup that does not exist',
        plant: () =>
          withFeatures((f) => {
            f['F-242'].mockups = ['99'];
          }),
        expect: 'F-242 names mockup 99, which is not in mockups/index.json',
      },
      {
        // The package arm: an engine-service feature that touches @irodora/ui is still visible.
        name: 'gate 0: a feature in @irodora/ui that names no mockup',
        plant: () =>
          withFeatures((f) => {
            f['F-222'].package = '@irodora/ui';
            delete f['F-222'].mockups;
          }),
        expect: 'F-222 is a UI feature in R9 and names no mockup',
      },
      {
        // The scope walk: mockups/AGENTS.md is a scoped harness, so gate 0 must read it for
        // language that would relax a golden rule. Without the walk this plant goes unseen.
        name: 'gate 0: a sentence in mockups/AGENTS.md relaxing a golden rule',
        plant: () =>
          writeFileSync(
            MOCKUP_MANUAL,
            `${original[MOCKUP_MANUAL]}\nGolden rule 14 does not apply to drafts.\n`,
            'utf8',
          ),
        expect: 'mockups/AGENTS.md appears to relax a golden rule',
      },
      {
        // MUST STAY GREEN. The rule is scoped to what a person sees; an engine feature is not.
        name: 'gate 0: an engine feature with no mockups — must stay GREEN',
        plant: () =>
          withFeatures((f) => {
            delete f['F-222'].mockups;
          }),
        expect: null,
      },
    ];
    for (const c of gateCases) {
      c.plant();
      const { status, out } = gate0();
      restore();
      const hit = c.expect === null ? status === 0 : status !== 0 && out.includes(c.expect);
      report(c.name, c.expect !== null, hit);
    }
  } finally {
    restore();
  }
  journal.close();

  if (results.bad > 0) {
    console.log(
      `\n${RED}${BOLD}The check does not discriminate.${OFF} ${String(results.bad)} case(s).\n`,
    );
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Check proven.${OFF} ${DIM}${String(results.rejected)} planted failures rejected and ` +
      `named; ${String(results.allowed)} cases that must pass, allowed.${OFF}\n`,
  );
  process.exit(0);
}

/* ======================================================================== main */

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(`\n${BOLD}Mockup index${OFF}\n`);
  const { problems, stats } = findProblems();
  if (stats)
    console.log(
      `${DIM}  ${String(stats.images)} image(s), ${String(stats.rows)} row(s), ${String(stats.routes)} route(s). ` +
        (stats.required
          ? `Every image must carry its inventory (${INVENTORY_OWNER} is done).`
          : `${String(stats.withoutInventory)} image(s) have no element inventory yet, which is allowed until ` +
            `${INVENTORY_OWNER} is done — until then their structure is checked by nothing, only their bytes.`) +
        OFF,
    );
  console.log(
    `${DIM}  NOT CHECKED HERE: that a screen looks like its mockup. That is F-220 (structure) and ` +
      `F-221 (appearance); this checks the map they both depend on.${OFF}`,
  );
  if (problems.length > 0) {
    console.log(`\n${RED}${BOLD}${String(problems.length)} problem(s)${OFF}`);
    for (const p of problems)
      console.log(`  ${RED}✗${OFF} ${BOLD}${p.what}${OFF}\n    ${DIM}${p.detail}${OFF}`);
    console.log();
    process.exit(1);
  }
  console.log(
    `\n${GREEN}${BOLD}Every route is drawn or waits on a question, and every image is indexed and pinned.${OFF}\n`,
  );
}
