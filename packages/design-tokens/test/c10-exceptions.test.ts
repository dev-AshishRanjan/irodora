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
  emitRuntime,
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
  m.exceptions.filter((e): e is ElementChromaException => 'elements' in e && 'kind' in e);

/**
 * Every exception that covers drawn elements: the element exceptions, and the token groups minted
 * for them (F-232), which carry their elements forward when the element exception is retired.
 */
const covering = (
  m: Manifest,
): readonly { readonly elements: readonly string[]; readonly mintedBy: string }[] =>
  m.exceptions.flatMap((e) => ('elements' in e ? [e] : []));

/** What a manifest leaves uncovered, and what it covers twice. Empty on both is the pass. */
function coverage(
  m: Manifest,
  needed: ReadonlySet<string>,
): { readonly missing: string[]; readonly twice: string[] } {
  const covered = new Map<string, number>();
  for (const e of covering(m))
    for (const el of e.elements) covered.set(el, (covered.get(el) ?? 0) + 1);
  const missing = [...needed].filter((el) => !MEASURED_ACHROMATIC.has(el) && !covered.has(el));
  const twice = [...covered].filter(([, n]) => n > 1).map(([el]) => el);
  return { missing: missing.sort(), twice };
}

describe('the chroma the mockups draw in chrome', () => {
  const { ids, needed } = inventories();

  it('reads the inventories and the manifest — an empty read would agree with anything', () => {
    expect(needed.size).toBeGreaterThan(25);
    expect(elementExceptions(manifest).length).toBeGreaterThan(10);
  });

  it('covers every C10 and ADR-0110 element exactly once, but those measured achromatic', () => {
    expect(coverage(manifest, needed)).toStrictEqual({ missing: [], twice: [] });
  });

  it('names no element no inventory draws', () => {
    const unknown = covering(manifest)
      .flatMap((e) => e.elements)
      .filter((el) => !ids.has(el));
    expect(unknown).toStrictEqual([]);
  });

  it('names the feature that mints each token', () => {
    for (const e of covering(manifest)) expect(e.mintedBy).toMatch(/^F-\d{3}$/u);
  });

  it('DECOY — an element dropped from its exception is missing', () => {
    const raw = JSON.parse(source) as { exceptions: { elements?: string[] }[] };
    for (const e of raw.exceptions)
      if (e.elements?.includes('02.conditions') === true)
        e.elements = e.elements.filter((el) => el !== '02.conditions');
    // The SAME computation the real test runs, on the mutated manifest, must name the element.
    expect(coverage(parseManifest(raw), needed)).toStrictEqual({
      missing: ['02.conditions'],
      twice: [],
    });
  });

  it('DECOY — an element covered by two exceptions is named', () => {
    const raw = JSON.parse(source) as { exceptions: { elements?: string[] }[] };
    const first = raw.exceptions.find((e) => e.elements?.includes('11.gap.icon') === true);
    first?.elements?.push('02.conditions');
    expect(coverage(parseManifest(raw), needed)).toStrictEqual({
      missing: [],
      twice: ['02.conditions'],
    });
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

/**
 * A token GROUP minted for elements (F-232): 00's colour wheel and palette. The element exceptions
 * that waited for them are retired, and each group carries its element forward, so coverage is
 * unchanged and the group is held to the same rules as any exception.
 */
describe('the glyph groups F-232 mints', () => {
  interface Raw {
    color: Record<string, Record<string, { oklch: { l: number; c: number; h: number } }>>;
    exceptions: {
      token?: string;
      tokens?: string[];
      elements?: string[];
      kind?: string;
    }[];
  }
  const raw = (): Raw => JSON.parse(source) as Raw;
  const groups = manifest.exceptions.flatMap((e) => ('tokens' in e ? [e] : []));

  it('holds eight minted stops for each drawing, and carries the element that draws them', () => {
    expect(groups.map((g) => [g.elements, g.tokens.length, g.mintedBy])).toStrictEqual([
      [['00.controls.icon-wheel'], 8, 'F-232'],
      [['00.buttons.icon-palette'], 8, 'F-232'],
    ]);
    for (const g of groups)
      for (const t of g.tokens) {
        expect(manifest.color.dark[t]).toBeDefined();
        expect(manifest.color.light[t]).toBeDefined();
      }
  });

  it('retired the two element exceptions it replaces (E-149)', () => {
    expect(
      elementExceptions(manifest).filter((e) =>
        e.elements.some(
          (el) => el === '00.controls.icon-wheel' || el === '00.buttons.icon-palette',
        ),
      ),
    ).toStrictEqual([]);
  });

  it('DECOY — a group that carries the wrong element leaves the drawn one uncovered', () => {
    const r = raw();
    for (const e of r.exceptions)
      if (e.tokens !== undefined && e.elements?.[0] === '00.controls.icon-wheel')
        e.elements = ['00.controls.icon-camera'];
    const { needed } = inventories();
    expect(coverage(parseManifest(r), needed).missing).toStrictEqual(['00.controls.icon-wheel']);
  });

  it('refuses a group that carries no elements, and one that also names a token', () => {
    const bare = raw();
    for (const e of bare.exceptions) if (e.tokens !== undefined) e.elements = [];
    expect(() => parseManifest(bare)).toThrow(/carries the elements that draw it/u);
    const both = raw();
    for (const e of both.exceptions) if (e.tokens !== undefined) e.token = 'status.ok';
    // Refused either way: a token beside a group is ambiguous about what is excepted.
    expect(() => parseManifest(both)).toThrow(/names a token AND/u);
  });

  it('reports a group whose every stop has fallen under the ceiling', () => {
    const r = raw();
    for (const theme of Object.keys(r.color))
      for (let i = 1; i <= 8; i++) {
        const token = r.color[theme]?.[`glyph.wheel.${String(i)}`];
        if (token !== undefined) token.oklch = { ...token.oklch, c: 0.01 };
      }
    const findings = checkChromaCeiling(parseManifest(r));
    expect(findings.some((f) => f.detail.includes('glyph.wheel.1'))).toBe(true);
  });

  it('reaches a device as one token exception per stop', () => {
    const emitted = emitRuntime(manifest);
    for (const g of groups) for (const t of g.tokens) expect(emitted).toContain(`"token": "${t}"`);
  });
});
