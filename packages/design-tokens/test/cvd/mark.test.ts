/**
 * Every ground the mark is drawn on is a declared CVD pair (F-230, ADR-0122).
 *
 * BRAND §7: *"a mark that depends on colour to be recognisable is disqualified from this product."*
 * The mark is one neutral ink (`mark-census.test.ts`); what remains is the ground under it. Gate 10
 * scores the pairs `cvdPairs` declares, and only those, so this reads every placement the governing
 * mockups draw and requires its (ink, ground) there. A mark placed on a new ground fails here until
 * that pair is declared and scored.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkSeparation,
  DEFICIENCIES,
  hexToOklch,
  parseManifest,
  THEMES,
  type ColorToken,
  type Manifest,
} from '../../src/index.js';
import {
  inventories,
  SURFACE,
  surfaceOf,
  textToken,
  type Inventory,
  type InventoryElement,
} from '../inventory-roles.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const manifest: Manifest = parseManifest(
  JSON.parse(
    readFileSync(
      join(HERE, '..', '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
      'utf8',
    ),
  ) as unknown,
);

/** The marks C4 does not use: board 00's coral outline and 25's IRODORA 彩度. */
const NOT_USED = new Set(['00.mark', '25.mark']);
/**
 * C10's one tinted mark, and the token F-236 minted for its ink (ADR-0128 §4). The inventories
 * record README roles, and no role names a minted tint, so the placement names it here; the mark
 * census holds that it is the only mark among the chroma exceptions.
 */
const TINTED: ReadonlyMap<string, string> = new Map([['27.lens-working.mark', 'state.mark']]);

interface Placement {
  readonly id: string;
  /** The ink's token, or `null` where its role does not map. */
  readonly ink: string | null;
  /** The ground's token, or `null` where its role does not map. */
  readonly ground: string | null;
}

/** Every mark a governing mockup places, with the tokens of its ink and its ground. */
function placements(from: readonly Inventory[]): Placement[] {
  const out: Placement[] = [];
  for (const inv of from) {
    const byId = new Map(inv.elements.map((e) => [e.id, e]));
    for (const e of inv.elements) {
      if (e.component !== 'ui:Mark' || NOT_USED.has(e.id)) continue;
      const role = e.tokens?.['fg'];
      const ground = SURFACE[surfaceOf(e, byId)] ?? null;
      const roleInk = role === undefined || ground === null ? null : textToken(role, ground);
      out.push({ id: e.id, ink: TINTED.get(e.id) ?? roleInk, ground });
    }
  }
  return out;
}

const declared = (a: string, b: string): boolean =>
  manifest.cvdPairs.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** Every placement whose pair is not declared, or whose roles do not map. */
function undeclared(from: readonly Placement[]): string[] {
  return from
    .filter((p) => p.ink === null || p.ground === null || !declared(p.ink, p.ground))
    .map((p) => `${p.id}: ${String(p.ink)} on ${String(p.ground)}`);
}

describe('every ground the mark is drawn on is a declared CVD pair (F-230)', () => {
  const drawn = placements(inventories());

  it('reads every placement — 01, 02, 14, 15, 20, 22 and 27 — so an empty scan cannot agree', () => {
    expect([...new Set(drawn.map((p) => p.id.split('.')[0]))].sort()).toStrictEqual([
      '01',
      '02',
      '14',
      '15',
      '20',
      '22',
      '27',
    ]);
    // The tinted mark is read with its minted ink, on the card it is drawn on (F-236).
    expect(drawn.find((p) => p.id === '27.lens-working.mark')).toStrictEqual({
      id: '27.lens-working.mark',
      ink: 'state.mark',
      ground: 'surface.1',
    });
  });

  it('declares the pair under each placement', () => {
    expect(undeclared(drawn)).toStrictEqual([]);
  });

  it('separates each pair, in all four palettes, under every deficiency', () => {
    const pairs = new Set(drawn.map((p) => `${String(p.ink)}|${String(p.ground)}`));
    const results = checkSeparation(manifest).filter(
      (r) => pairs.has(`${r.a}|${r.b}`) || pairs.has(`${r.b}|${r.a}`),
    );
    // Counted, so a pair dropped from the manifest cannot pass by having less to check.
    expect(results).toHaveLength(pairs.size * DEFICIENCIES.length * THEMES.length);
    for (const r of results) expect(r.score).toBeGreaterThanOrEqual(r.required);
  });

  it('DECOY — a mark placed on a ground nothing declares is named', () => {
    const planted: InventoryElement = {
      id: '99.mark',
      parent: null,
      component: 'ui:Mark',
      tokens: { fg: 'text.tertiary', bg: 'level2' },
    };
    expect(
      undeclared(placements([{ id: '99', governs: 'layout', elements: [planted] }])),
    ).toStrictEqual(['99.mark: foreground.3.card on surface.2']);
  });

  it('DECOY — ADR-0093’s red and green petals, as a pair, collapse under deutan', () => {
    // So the gate CAN fail for a coloured mark: the five-colour icon ADR-0122 superseded would not
    // have passed it.
    const petal = (hex: string): ColorToken => ({
      oklch: hexToOklch(hex),
      srgb: hex,
      role: 'petal',
      usage: 'nonText',
      pairsWith: [],
    });
    const decoy: Manifest = {
      ...manifest,
      cvdPairs: { ...manifest.cvdPairs, pairs: [['red', 'green']] },
    };
    const [deutan] = checkSeparation(decoy, ['dark'], {
      dark: { red: petal('#AC473E'), green: petal('#4E8164') },
    }).filter((r) => r.deficiency === 'deutan');
    expect(deutan?.score ?? Infinity).toBeLessThan(manifest.cvdPairs.minSeparation);
  });
});
