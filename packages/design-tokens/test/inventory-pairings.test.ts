/**
 * Every pairing the mockups DRAW is one the manifest DECLARES (F-225, criterion 5).
 *
 * Gate 9 checks the pairings the manifest declares, and only those — so "every declared pairing
 * passes" can be bought by declaring fewer. This closes that door from the other side: it reads
 * F-220's inventories, finds every text role each mockup draws on each surface, and requires the
 * manifest to declare that pairing in both themes. A pairing a screen draws and the manifest leaves
 * out is a combination gate 9 has never measured.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseManifest } from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const INVENTORY = join(HERE, '..', '..', '..', 'mockups', 'inventory');
const MANIFEST = parseManifest(
  JSON.parse(
    readFileSync(
      join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
      'utf8',
    ),
  ) as unknown,
);

interface Element {
  readonly id: string;
  readonly parent: string | null;
  readonly tokens?: Readonly<Record<string, string>>;
  readonly children?: readonly Element[];
}

/** README surface role → manifest token. */
const SURFACE: Readonly<Record<string, string>> = {
  ground: 'background',
  level1: 'surface.1',
  level2: 'surface.2',
  level3: 'surface.3',
  'action.primary': 'accent',
};

/**
 * README text role → manifest token, by surface. Tertiary text has two drawn values — the ground
 * keeps #768290, cards take §4 E3's #94A1AF — so it is two tokens. The ground's own colour ON the
 * primary action is the pill's text.
 */
function textToken(role: string, surface: string): string | null {
  if (role === 'text.primary') return 'foreground';
  if (role === 'text.secondary') return 'foreground.2';
  if (role === 'text.tertiary')
    return surface === 'background' ? 'foreground.3' : 'foreground.3.card';
  if (role === 'ground' && surface === 'accent') return 'accent.foreground';
  return null;
}

/**
 * Roles the manifest declares UNCHECKED, each with its reason in the manifest: the subtle border
 * and the keyline are decorative or face an arbitrary sample, and the strong border is decorative
 * wherever the inventories draw it (§4 E3 ¶2). Named here so a new role cannot slip through as
 * "not text".
 */
const DECLARED_UNCHECKED = new Set(['border.subtle', 'keyline', 'border.strong']);

/** Every (text role, surface role) the inventories draw, with where. */
function drawnPairs(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of readdirSync(INVENTORY)) {
    if (!file.endsWith('.json')) continue;
    const inv = JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as {
      elements: readonly Element[];
    };
    const all: Element[] = [];
    const walk = (els: readonly Element[] | undefined): void => {
      for (const e of els ?? []) {
        all.push(e);
        walk(e.children);
      }
    };
    walk(inv.elements);
    const byId = new Map(all.map((e) => [e.id, e]));
    for (const e of all) {
      const fg = e.tokens?.['fg'];
      if (fg === undefined) continue;
      // The surface is the nearest ancestor that paints one; an element on nothing sits on the ground.
      let surface = 'ground';
      for (let at = e.parent === null ? undefined : byId.get(e.parent); at;) {
        const bg = at.tokens?.['bg'];
        if (bg !== undefined) {
          surface = bg;
          break;
        }
        at = at.parent === null ? undefined : byId.get(at.parent);
      }
      const own = e.tokens?.['bg'];
      if (own !== undefined && own !== fg) surface = own;
      const key = `${fg} on ${surface}`;
      if (!found.has(key)) found.set(key, e.id);
    }
  }
  return found;
}

const declared = (theme: 'dark' | 'light', a: string, b: string): boolean => {
  // The parsed manifest — what gate 9 reads — not the generated targets, which carry no pairings.
  const tokens = MANIFEST.color[theme];
  return (tokens[a]?.pairsWith.includes(b) ?? false) || (tokens[b]?.pairsWith.includes(a) ?? false);
};

describe('every pairing the mockups draw is declared', () => {
  const pairs = drawnPairs();

  it('reads the inventories — a scan that found nothing would agree with anything', () => {
    expect(pairs.size).toBeGreaterThan(8);
    expect(pairs.has('text.tertiary on level1')).toBe(true);
  });

  it('declares each drawn text pairing, in both themes', () => {
    const missing: string[] = [];
    for (const [pair, example] of pairs) {
      const [role, surfaceRole] = pair.split(' on ') as [string, string];
      if (DECLARED_UNCHECKED.has(role)) continue;
      const surface = SURFACE[surfaceRole];
      const text = surface === undefined ? null : textToken(role, surface);
      if (surface === undefined || text === null) {
        missing.push(`${pair} (e.g. ${example}) has no manifest mapping`);
        continue;
      }
      for (const theme of ['dark', 'light'] as const)
        if (!declared(theme, text, surface))
          missing.push(`${theme}: ${text} on ${surface} (${pair}, e.g. ${example})`);
    }
    expect(missing).toStrictEqual([]);
  });

  it('DECOY — a drawn pairing the manifest leaves out is named', () => {
    // The check above would pass for a `declared` that always said yes.
    expect(MANIFEST.color.dark['surface.1']?.pairsWith).toContain('foreground.3.card');
    expect(declared('dark', 'foreground.3', 'surface.1')).toBe(false);
  });
});
