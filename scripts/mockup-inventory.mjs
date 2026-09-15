/**
 * The element inventory check (F-220) — golden rule 14, per element.
 *
 * An inventory (`mockups/inventory/NN.json`, shape in `mockups/inventory.schema.json`) lists every
 * element one image draws: its box in the image, its dp at its screen's scale, its token, face,
 * icon, binding and action, in reading order — plus what the image draws that is not design, where
 * the build departs from it (a §4 rule), and which §6 conflicts decide it.
 *
 * This is STRUCTURAL. It never re-measures a picture: a box is a reading somebody took by the method
 * §2 states, with the helpers in `mockups/tools/`. What it checks is the RECORD — that every element
 * is named once and in order, sits inside its image and its screen, has dp that agree with its box,
 * binds to something §8 recognises, and that every departure and conflict it cites exists in the
 * contract. `add(what, detail)` is verify-mockups' own reporter.
 */

import { readFileSync } from 'node:fs';

const REQUIRED = [
  'mockup',
  'mockupSha256',
  'kind',
  'governs',
  'frame',
  'elements',
  'notDesign',
  'departures',
  'conflicts',
];
const KINDS = new Set(['screen', 'board']);
const GOVERNS = new Set(['layout', 'palette', 'locale', 'state', 'vocabulary']);
const NOT_DESIGN = new Set([
  'bezel',
  'status-bar',
  'callout',
  'leaked-label',
  'garbled-text',
  'outside-art',
  'board-annotation',
  'presentation',
]);
const BINDING = /^(static|engine|corpus|store|derived|route|oq):\S+$/u;
const COMPONENT = /^(ui|new|app):[A-Z][A-Za-z0-9.]*$/u;
/** Consecutive tops within this many px chain into one reading row (4 dp at 2 px/dp). */
const ROW_CHAIN_PX = 8;
/** dp are recorded to the half; a reading that disagrees by more than this is a wrong record. */
const DP_TOLERANCE = 0.5;

/** §4's exception ids, read from its headings — `### E2 — …`. */
export const ruleIdsIn = (spec) => new Set([...spec.matchAll(/^### (E\d+) —/gmu)].map((m) => m[1]));

/** §6's conflict ids, read from its table — `| **C12** | …`. */
export const conflictIdsIn = (spec) =>
  new Set([...spec.matchAll(/^\| \*\*(C\d+)\*\*/gmu)].map((m) => m[1]));

/** Width and height of a JPEG or PNG, read from its header — no decoder, no dependency. */
export function imageSize(file) {
  const b = readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // SOF0–SOF15 carry the frame size; C4, C8 and CC share the range and do not.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

const inside = (a, b, slack = 1) =>
  a.x >= b.x - slack &&
  a.y >= b.y - slack &&
  a.x + a.w <= b.x + b.w + slack &&
  a.y + a.h <= b.y + b.h + slack;
const isBox = (b) => Boolean(b) && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(b[k]));
const fmt = (b) => `${b.x},${b.y} ${b.w}×${b.h}`;

export function inventoryProblems(
  inventory,
  id,
  { add, ruleIds, conflictIds, openQuestions, image },
) {
  const where = `the inventory for mockup ${id}`;
  for (const key of REQUIRED)
    if (!(key in inventory))
      add(
        `${where} has no ${key}`,
        'Every inventory carries the same keys (mockups/inventory.schema.json). A missing one is a part of the image nobody recorded.',
      );
  if (inventory.mockup !== id)
    add(
      `${where} says it describes mockup ${String(inventory.mockup)}`,
      'An inventory describes the image whose row points at it.',
    );
  if ('kind' in inventory && !KINDS.has(inventory.kind))
    add(`${where} has kind "${String(inventory.kind)}"`, 'A mockup is a screen or a board.');
  if ('governs' in inventory && !GOVERNS.has(inventory.governs))
    add(
      `${where} governs "${String(inventory.governs)}"`,
      'layout (P1), palette, locale or state (P2), or vocabulary (P3).',
    );

  const picture = image ? { x: 0, y: 0, w: image.w, h: image.h } : null;
  const screens = new Map((inventory.frame?.screens ?? []).map((s) => [s.id, s]));
  const elements = Array.isArray(inventory.elements) ? inventory.elements : [];
  const byId = new Map(elements.map((e) => [e.id, e]));
  const overhangs = new Set(inventory.overhangs ?? []);
  const presentation = (inventory.notDesign ?? [])
    .filter((n) => n.what === 'presentation')
    .map((n) => n.note ?? '');

  const seen = new Set();
  let expected = 1;
  for (const e of elements) {
    const name = `${where}: element ${String(e.id)}`;
    if (typeof e.id !== 'string' || !e.id.startsWith(`${id}.`))
      add(
        `${name} is not prefixed ${id}.`,
        'Features and the conformance sweep name elements by id; the prefix says which image drew it.',
      );
    if (seen.has(e.id))
      add(
        `${name} appears twice`,
        'Two elements with one id are one name for two things a feature must build.',
      );
    if (e.order !== expected)
      add(
        `${name} is number ${String(e.order)} where ${expected} comes next`,
        'Order is the reading order — a strict sequence, so an element inserted or dropped shows up as a gap rather than as nothing.',
      );
    expected += 1;
    if (e.parent !== null && !seen.has(e.parent))
      add(
        `${name} names ${String(e.parent)} as its parent`,
        'A parent is an element listed before its children.',
      );
    seen.add(e.id);

    if (e.component !== null && !COMPONENT.test(e.component ?? ''))
      add(
        `${name} is built by "${String(e.component)}"`,
        'ui:<an @irodora/ui export>, new:<a component a feature adds to it>, app:<a screen-local composition>, or null for a pure container.',
      );
    if (e.binding !== null && !BINDING.test(e.binding ?? ''))
      add(
        `${name} binds to "${String(e.binding)}"`,
        'A binding is static:, engine:, corpus:, store:, derived:, route: or oq: (§8). Anything else is a value copied off the picture (E1).',
      );
    if (
      typeof e.binding === 'string' &&
      e.binding.startsWith('oq:') &&
      !openQuestions.has(e.binding.slice(3))
    )
      add(
        `${name} waits on ${e.binding.slice(3)}, which is not an open question`,
        'An oq: binding names a question in PRD §10 that is still open.',
      );

    if (!isBox(e.box)) {
      add(`${name} has no box`, 'Every element is a reading of where the image draws it.');
      continue;
    }
    if (picture && !inside(e.box, picture, 0))
      add(
        `${name} lies outside the image`,
        `Its box is ${fmt(e.box)}; the image is ${image.w}×${image.h}.`,
      );

    const screen = e.screen
      ? screens.get(e.screen)
      : screens.size === 1
        ? [...screens.values()][0]
        : undefined;
    if (e.screen && !screen)
      add(
        `${name} sits in screen ${e.screen}, which the frame does not draw`,
        'Name one of frame.screens.',
      );
    if (!e.screen && screens.size > 1)
      add(
        `${name} names no screen, and mockup ${id} draws ${screens.size}`,
        'dp is measured from a screen’s origin; say which.',
      );
    const k = screen?.dpPerPx ?? null;
    const scaled = k !== null && k !== undefined;
    if (scaled !== isBox(e.dp))
      add(
        `${name} ${scaled ? 'has no dp on a scaled screen' : 'has dp on a sheet with no screen scale'}`,
        'dp is the box at the screen’s scale (§2). A board draws at no screen’s scale, and there a screen decides the size (P3).',
      );
    if (scaled && isBox(e.dp)) {
      const want = {
        x: (e.box.x - screen.box.x) * k,
        y: (e.box.y - screen.box.y) * k,
        w: e.box.w * k,
        h: e.box.h * k,
      };
      if (['x', 'y', 'w', 'h'].some((key) => Math.abs(e.dp[key] - want[key]) > DP_TOLERANCE))
        add(
          `${name} is at ${fmt(e.dp)} dp where its box puts it at ${fmt(Object.fromEntries(Object.entries(want).map(([key, v]) => [key, Math.round(v * 2) / 2])))}`,
          'dp is derived from the box and the screen — a record where the two disagree has been edited on one side only.',
        );
    }
    if (screen && isBox(screen.box) && !inside(e.box, screen.box)) {
      let owner = null;
      for (let at = e; at && !owner; at = at.parent ? byId.get(at.parent) : null)
        if (overhangs.has(at.id)) owner = at.id;
      if (!owner)
        add(
          `${name} lies outside its screen ${screen.id}`,
          'A screen cannot draw past its edge. If the image does, declare the element in `overhangs` and record the overhang as presentation — and raise it as a question.',
        );
      else if (!presentation.some((note) => note.includes(owner)))
        add(
          `${name} overhangs its screen through ${owner}, and no presentation region names it`,
          'The overhang itself is presentation, and says so.',
        );
    }
  }

  // Reading order on a single screen: tops sorted, consecutive tops within ROW_CHAIN_PX chain into a
  // row, each row read left to right.
  if (inventory.kind === 'screen' && screens.size === 1 && elements.every((e) => isBox(e.box))) {
    const byTop = [...elements].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
    const rows = [];
    for (const e of byTop) {
      const row = rows.at(-1);
      if (row && e.box.y - row.last <= ROW_CHAIN_PX) {
        row.items.push(e);
        row.last = e.box.y;
      } else rows.push({ last: e.box.y, items: [e] });
    }
    const rule = rows.flatMap((r) => r.items.sort((a, b) => a.box.x - b.box.x)).map((e) => e.id);
    const at = elements.findIndex((e, i) => e.id !== rule[i]);
    if (at >= 0)
      add(
        `${where}: reading order — position ${at + 1} is ${String(elements[at].id)}, and the rule puts ${rule[at]} there`,
        `Top to bottom; tops within ${ROW_CHAIN_PX} px of the one before chain into a row, read left to right.`,
      );
  }

  for (const n of inventory.notDesign ?? []) {
    if (!NOT_DESIGN.has(n.what))
      add(
        `${where}: a not-design region is "${String(n.what)}"`,
        `§2 names ${[...NOT_DESIGN].join(', ')}.`,
      );
    if (picture && isBox(n.box) && !inside(n.box, picture, 0))
      add(`${where}: a not-design region lies outside the image`, `Its box is ${fmt(n.box)}.`);
  }
  for (const d of inventory.departures ?? []) {
    if (!ruleIds.has(d.rule))
      add(
        `${where} departs under ${String(d.rule)}, which §4 does not list`,
        'A departure exists only if R9-MOCKUP-FIDELITY §4 lists its rule (golden rule 14). Anything else is a question for a person.',
      );
    if (!seen.has(d.element))
      add(
        `${where} departs from ${String(d.element)}, which is not one of its elements`,
        'Name the element the build will not draw as drawn.',
      );
  }
  for (const c of inventory.conflicts ?? []) {
    if (!conflictIds.has(c.id))
      add(
        `${where} cites conflict ${String(c.id)}, which §6 does not register`,
        'A contradiction between mockups is resolved in §6 first, then cited here.',
      );
    for (const el of c.elements ?? [])
      if (!seen.has(el))
        add(
          `${where} resolves ${String(c.id)} for ${String(el)}, which is not one of its elements`,
          'Name elements this image draws.',
        );
  }
}
