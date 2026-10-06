/**
 * Every mark the product draws is drawn in a neutral ink (F-230, ADR-0122; C4, C10).
 *
 * ADR-0122 makes the mark one ink everywhere, and C10 names the one place `27`'s loading state tints
 * it. This reads every `ui:Mark` the inventories draw and holds the three facts together:
 *
 * - each placement a governing mockup draws binds a role whose token is achromatic — within the
 *   manifest's chroma ceiling — in all four palettes;
 * - exactly one mark is among the chroma exceptions, `27.lens-working.mark`;
 * - `00`'s and `25`'s marks are left out by C4, and only they are.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseManifest, THEMES, type Manifest } from '../src/index.js';
import {
  inventories,
  SURFACE,
  surfaceOf,
  textToken,
  type Inventory,
  type InventoryElement,
} from './inventory-roles.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const source = JSON.parse(
  readFileSync(
    join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
    'utf8',
  ),
) as { gate: { contrast: { chromaCeiling: { maxChroma: number } } } };
const manifest: Manifest = parseManifest(source);
const CEILING = source.gate.contrast.chromaCeiling.maxChroma;

/** What a mockup governs where it draws the product (R9 §1): a screen's layout, or a state. */
const DRAWS_THE_PRODUCT = new Set(['layout', 'state']);

/** Every mark in the inventories, with the inventory that draws it. */
function marks(from: readonly Inventory[]): { inv: Inventory; e: InventoryElement }[] {
  return from.flatMap((inv) =>
    inv.elements.filter((e) => e.component === 'ui:Mark').map((e) => ({ inv, e })),
  );
}

/** The marks the chroma exceptions name, by element (C10). */
const excepted = new Set(manifest.exceptions.flatMap((x) => ('elements' in x ? x.elements : [])));

/** The token a placement's ink binds, or why it cannot be read. */
function inkOf(inv: Inventory, e: InventoryElement): string {
  const role = e.tokens?.['fg'];
  const byId = new Map(inv.elements.map((x) => [x.id, x]));
  const ground = SURFACE[surfaceOf(e, byId)];
  const token = role === undefined || ground === undefined ? null : textToken(role, ground);
  if (token === null) throw new Error(`${e.id}: ${String(role)} maps to no token`);
  return token;
}

/** Every palette a token is chromatic in. */
const chromaticIn = (token: string): string[] =>
  THEMES.filter((theme) => {
    const value = manifest.color[theme][token];
    if (value === undefined) throw new Error(`${theme}.${token} is not a token`);
    return value.oklch.c > CEILING;
  });

/** The census's refusal: every mark whose ink is chromatic in any palette, with where. */
const tinted = (inks: readonly { readonly id: string; readonly token: string }[]) =>
  inks
    .map(({ id, token }) => ({ id, token, palettes: chromaticIn(token) }))
    .filter(({ palettes }) => palettes.length > 0);

describe('every mark is drawn in a neutral ink (F-230, ADR-0122)', () => {
  const all = marks(inventories());
  const placed = all.filter(
    ({ inv, e }) => DRAWS_THE_PRODUCT.has(inv.governs) && !excepted.has(e.id),
  );

  it('reads every mark the inventories draw — an empty scan would agree with anything', () => {
    expect(all.length).toBeGreaterThanOrEqual(11);
    expect(placed.map(({ e }) => e.id)).toContain('01.header.mark');
  });

  it('binds each placement to an ink achromatic in all four palettes', () => {
    expect(tinted(placed.map(({ inv, e }) => ({ id: e.id, token: inkOf(inv, e) })))).toStrictEqual(
      [],
    );
  });

  it('declares exactly one mark among the chroma exceptions: 27’s loading state (C10)', () => {
    expect(all.filter(({ e }) => excepted.has(e.id)).map(({ e }) => e.id)).toStrictEqual([
      '27.lens-working.mark',
    ]);
  });

  it('leaves out 00’s and 25’s marks by C4, and only them', () => {
    expect(
      all.filter(({ inv }) => !DRAWS_THE_PRODUCT.has(inv.governs)).map(({ e }) => e.id),
    ).toStrictEqual(['00.mark', '25.mark']);
  });

  it('DECOY — a mark planted in a status colour is refused, in every palette', () => {
    expect(tinted([{ id: '99.mark', token: 'status.ok' }])).toStrictEqual([
      { id: '99.mark', token: 'status.ok', palettes: [...THEMES] },
    ]);
  });

  it('DECOY — a mark whose role maps to no token is refused rather than skipped', () => {
    const planted: Inventory = {
      id: '99',
      governs: 'layout',
      elements: [{ id: '99.mark', parent: null, component: 'ui:Mark', tokens: { fg: 'ok' } }],
    };
    const [mark] = marks([planted]);
    expect(() => (mark === undefined ? '' : inkOf(mark.inv, mark.e))).toThrow(/maps to no token/u);
  });
});
