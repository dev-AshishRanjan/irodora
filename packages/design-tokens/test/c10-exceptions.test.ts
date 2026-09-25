/**
 * Every chroma the mockups draw in chrome is a declared exception (F-225, criterion 3).
 *
 * The chroma ceiling covers TOKENS. The mockups also draw chroma that no token holds yet — C10's
 * gold HUD, green verdicts, tinted rows and state art, and ADR-0110's coloured icons — and the
 * feature that builds each surface mints its token. Until then the manifest declares it by ELEMENT.
 * This holds the two lists together: every element C10 or ADR-0110 names is covered exactly once,
 * and no exception names an element no inventory draws.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkChromaCeiling,
  parseManifest,
  type ElementChromaException,
  type Manifest,
} from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const INVENTORY = join(HERE, '..', '..', '..', 'mockups', 'inventory');
const source = readFileSync(
  join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
  'utf8',
);
const manifest = parseManifest(JSON.parse(source) as unknown);

interface Element {
  readonly id: string;
  readonly icon?: string | null;
  readonly children?: readonly Element[];
}

/** The icons ADR-0110 follows in colour, by the glyph they bind. */
const COLOURED_GLYPHS = new Set([
  'colour-wheel',
  'palette-solid',
  'hue-ring',
  'seal-check',
  'lock-solid',
  'bulb',
  'score-harmony',
  'sparkle',
]);

/** `15`'s CVD badge binds `contrast`, which is coloured on 15 only (ADR-0110). */
const COLOURED_ELEMENTS = new Set(['15.cvd.badge']);

/**
 * C10 elements measured ACHROMATIC (F-225's census): 23's depth, chroma and contrast tracks are
 * greyscale gradients. They are in C10's list and need no exception; named so that is a record,
 * not an omission.
 */
const MEASURED_ACHROMATIC = new Set([
  '23.profile.depth.range',
  '23.profile.chroma.range',
  '23.profile.contrast.range',
]);

function inventories(): { ids: Set<string>; needed: Set<string> } {
  const ids = new Set<string>();
  const needed = new Set<string>();
  for (const file of readdirSync(INVENTORY)) {
    if (!file.endsWith('.json')) continue;
    const inv = JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as {
      elements: readonly Element[];
      conflicts?: readonly { id: string; elements: readonly string[] }[];
    };
    const walk = (els: readonly Element[] | undefined): void => {
      for (const e of els ?? []) {
        ids.add(e.id);
        if (
          (e.icon !== undefined && e.icon !== null && COLOURED_GLYPHS.has(e.icon)) ||
          COLOURED_ELEMENTS.has(e.id)
        )
          needed.add(e.id);
        walk(e.children);
      }
    };
    walk(inv.elements);
    for (const c of inv.conflicts ?? [])
      if (c.id === 'C10') for (const e of c.elements) needed.add(e);
  }
  return { ids, needed };
}

const elementExceptions = (m: Manifest): readonly ElementChromaException[] =>
  m.exceptions.filter((e): e is ElementChromaException => 'elements' in e);

describe('the chroma the mockups draw in chrome', () => {
  const { ids, needed } = inventories();

  it('reads the inventories and the manifest — an empty read would agree with anything', () => {
    expect(needed.size).toBeGreaterThan(25);
    expect(elementExceptions(manifest).length).toBeGreaterThan(10);
  });

  it('covers every C10 and ADR-0110 element exactly once, but those measured achromatic', () => {
    const covered = new Map<string, number>();
    for (const e of elementExceptions(manifest))
      for (const el of e.elements) covered.set(el, (covered.get(el) ?? 0) + 1);
    const missing = [...needed].filter((el) => !MEASURED_ACHROMATIC.has(el) && !covered.has(el));
    const twice = [...covered].filter(([, n]) => n > 1).map(([el]) => el);
    expect({ missing: missing.sort(), twice }).toStrictEqual({ missing: [], twice: [] });
  });

  it('names no element no inventory draws', () => {
    const unknown = elementExceptions(manifest)
      .flatMap((e) => e.elements)
      .filter((el) => !ids.has(el));
    expect(unknown).toStrictEqual([]);
  });

  it('names the feature that mints each token', () => {
    for (const e of elementExceptions(manifest)) expect(e.mintedBy).toMatch(/^F-\d{3}$/u);
  });

  it('DECOY — an element dropped from its exception is missing', () => {
    const raw = JSON.parse(source) as { exceptions: { elements?: string[] }[] };
    for (const e of raw.exceptions)
      if (e.elements?.includes('02.conditions') === true)
        e.elements = e.elements.filter((el) => el !== '02.conditions');
    const dropped = parseManifest(raw);
    const covered = new Set(elementExceptions(dropped).flatMap((e) => e.elements));
    expect(covered.has('02.conditions')).toBe(false);
    expect(needed.has('02.conditions')).toBe(true);
  });

  it('reports an element exception whose every measured tint is under the ceiling', () => {
    const raw = JSON.parse(source) as {
      exceptions: { elements?: string[]; measured?: string[] }[];
    };
    for (const e of raw.exceptions)
      if (e.elements?.[0] === '23.profile.label') e.measured = ['#595959'];
    const findings = checkChromaCeiling(parseManifest(raw));
    expect(findings.some((f) => f.detail.includes('23.profile.label'))).toBe(true);
    // And the shipped manifest reports nothing.
    expect(checkChromaCeiling(manifest)).toStrictEqual([]);
  });
});
