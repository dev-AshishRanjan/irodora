/**
 * The inventories' colour roles, mapped to the manifest's tokens (F-225; hoisted by F-230).
 *
 * The inventories record the README's ROLE names — `text.primary`, `level1` — and the manifest names
 * TOKENS. Three checks read one through the other: every drawn text pairing is declared
 * (`inventory-pairings.test.ts`), every ground the mark is drawn on is a declared CVD pair
 * (`cvd/mark.test.ts`), and every mark is drawn in a neutral ink (`mark-census.test.ts`). One mapping
 * for the three, so they cannot read the same role as two tokens.
 *
 * Not a test file: vitest runs `*.test.ts` only.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const INVENTORY = join(HERE, '..', '..', '..', 'mockups', 'inventory');

export interface InventoryElement {
  readonly id: string;
  readonly parent: string | null;
  readonly component?: string;
  readonly tokens?: Readonly<Record<string, string>>;
  readonly copy?: unknown;
  readonly children?: readonly InventoryElement[];
}

export interface Inventory {
  /** The mockup's id, from its file name. */
  readonly id: string;
  /** What the mockup governs: `layout` and `state` draw the product; `vocabulary` and `palette` do not. */
  readonly governs: string;
  /** Every element, flattened. */
  readonly elements: readonly InventoryElement[];
}

/** Every inventory, its elements flattened. */
export function inventories(): Inventory[] {
  const out: Inventory[] = [];
  for (const file of readdirSync(INVENTORY)) {
    if (!file.endsWith('.json')) continue;
    const inv = JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as {
      governs: string;
      elements: readonly InventoryElement[];
    };
    const all: InventoryElement[] = [];
    const walk = (els: readonly InventoryElement[] | undefined): void => {
      for (const e of els ?? []) {
        all.push(e);
        walk(e.children);
      }
    };
    walk(inv.elements);
    out.push({ id: file.replace(/\.json$/u, ''), governs: inv.governs, elements: all });
  }
  return out;
}

/** README surface role → manifest token. */
export const SURFACE: Readonly<Record<string, string>> = {
  ground: 'background',
  level1: 'surface.1',
  level2: 'surface.2',
  level3: 'surface.3',
  'action.primary': 'accent',
};

/**
 * README foreground role → manifest token, by surface. Tertiary text has two drawn values — the
 * ground keeps #768290, cards take §4 E3's #94A1AF — so it is two tokens. The ground's own colour
 * ON the primary action is the pill's text. The strong border drawn as a FOREGROUND is the sheet's
 * drag handle, which has no label, so it is `border.indicator` — checked, not decorative.
 */
export function textToken(role: string, surface: string): string | null {
  if (role === 'border.strong') return 'border.indicator';
  if (role === 'text.primary') return 'foreground';
  if (role === 'text.secondary') return 'foreground.2';
  if (role === 'text.tertiary')
    return surface === 'background' ? 'foreground.3' : 'foreground.3.card';
  if (role === 'ground' && surface === 'accent') return 'accent.foreground';
  return null;
}

/**
 * The surface ROLE an element sits on: the nearest ancestor that paints one, or its own `bg` where
 * that differs from its ink; an element on nothing sits on the ground.
 */
export function surfaceOf(
  e: InventoryElement,
  byId: ReadonlyMap<string, InventoryElement>,
): string {
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
  if (own !== undefined && own !== e.tokens?.['fg']) surface = own;
  return surface;
}
