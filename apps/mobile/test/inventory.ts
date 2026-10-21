/**
 * The structural half of the conformance sweep: every element an enrolled surface's inventory
 * records is drawn on the rendered tree (F-221 criterion 4, ADR-0134 D1 and D7).
 *
 * An element is found by WHAT IT DRAWS: its catalogue words in the locale, the glyph or the
 * illustration it is, the specific component it is, or an engine value computed by the screen's
 * own function. A `testID` counts only when the node it lands on draws something, because an id
 * proves a node claims to be the element, not that the element is there.
 *
 * The sweep asserts PRESENCE. Order, grouping and proportion belong to each surface feature's own
 * first criterion; tokens to the contrast and colour gates.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { render } from '@testing-library/react-native';
import * as ui from '@irodora/ui';
import { drawsSomething, flattenStyle, renderedTexts, type TestNode } from '@irodora/ui/testing';
import { t, type Locale, type MessageKey } from '../src/i18n';

/**
 * The live tree's nodes, as the sweep reads them: each node's component, its `name` prop, the test
 * ids on it and above it, and whether a static `opacity: 0` on it or above it hides it. The JSON
 * tree carries only host nodes, so a component is found here. Taken while the tree is still mounted
 * (`snapshot`), because a live tree cannot be walked once it is unmounted.
 */
export type LiveNodes = readonly {
  readonly type: unknown;
  readonly name: unknown;
  readonly ids: readonly string[];
  readonly hidden: boolean;
}[];

/**
 * Whether a node's own props hide what it draws: a static `opacity: 0`, as the lockup withholds its
 * mark until the travelling one arrives. An opacity an ANIMATION drives (the node carries
 * reanimated's `jestAnimatedStyle`) is where a motion starts at mount, not the drawing: the launch's
 * composition and a list's arrival begin at 0 and rise, and reading that frame would call every
 * element in them undrawn.
 */
function staticallyHidden(props: Readonly<Record<string, unknown>>): boolean {
  return (
    flattenStyle(props['style'])['opacity'] === 0 &&
    !('jestAnimatedStyle' in props) &&
    !('animatedStyle' in props)
  );
}

/** A live root's nodes, read before it unmounts. */
export function snapshot(root: ReturnType<typeof render>['UNSAFE_root']): LiveNodes {
  return root
    .findAll(() => true)
    .map((n) => {
      const ids: string[] = [];
      let hidden = false;
      for (let at: typeof n | null = n; at !== null; at = at.parent) {
        const id = at.props['testID'] as unknown;
        if (typeof id === 'string') ids.push(id);
        if (staticallyHidden(at.props)) hidden = true;
      }
      return { type: n.type, name: n.props['name'] as unknown, ids, hidden };
    });
}

/**
 * ONE SURFACE, AND ONLY WHAT SHOWS (F-221's review, B1). Counted anywhere on the screen, a
 * component another part of it also draws stands in for a missing element: the Lens's mode chips
 * for 27's step chips, the lockup's mark withheld at `opacity: 0` for the visible one. So every
 * count is taken inside the surface's own root, and a node a static `opacity: 0` hides is not
 * drawn. An opacity an animation sets is not read here: the sweep draws each surface at mount.
 */
export function scopeLive(live: LiveNodes, root: string): LiveNodes {
  return live.filter((n) => n.ids.includes(root) && !n.hidden);
}

/** The JSON subtree a surface's root id starts, its hidden branches pruned; null if none. */
export function scopeJson(json: TestNode, root: string): TestNode | null {
  const prune = (node: TestNode): TestNode => ({
    ...node,
    children: (node.children ?? [])
      .filter((c) => typeof c === 'string' || !staticallyHidden(c.props))
      .map((c) => (typeof c === 'string' ? c : prune(c))),
  });
  const found = byTestID(json, root)[0];
  return found === undefined ? null : prune(found);
}

/** One element of an F-220 inventory, at the fields the sweep reads. */
export interface InventoryElement {
  readonly id: string;
  readonly screen?: string | null;
  readonly component: string | null;
  readonly icon: string | null;
  readonly illustration: string | null;
  readonly binding: string | null;
}

/** An F-220 inventory, at the fields the sweep reads. */
export interface Inventory {
  readonly mockup: string;
  readonly kind: string;
  readonly governs: string;
  readonly frame?: { readonly screens: readonly { readonly id: string }[] };
  readonly elements: readonly InventoryElement[];
  /** The §6 conflicts the drawing is resolved by, each with the elements it applies to. */
  readonly conflicts?: readonly { readonly id: string; readonly elements: readonly string[] }[];
}

/**
 * What is wrong with a surface's declared supersessions (ADR-0144 D1, D2): each element must be one
 * the inventory lists under the §6 conflict the declaration names. A declaration that holds takes
 * the element out of the count; one that does not is a finding, so a missing element cannot be
 * waved through by calling it superseded.
 */
export function supersededFindings(
  inventory: Inventory,
  superseded: Readonly<Record<string, string>>,
): readonly string[] {
  return Object.entries(superseded).flatMap(([id, conflict]) =>
    (inventory.conflicts?.find((c) => c.id === conflict)?.elements ?? []).includes(id)
      ? []
      : [`${id}: declared superseded by ${conflict}, which the inventory does not list it under`],
  );
}

/** How an element is found on the rendered tree (ADR-0134 D1). */
export type Locator =
  | { readonly by: 'text'; readonly key: MessageKey }
  | { readonly by: 'value'; readonly text: (locale: Locale) => string }
  | { readonly by: 'component'; readonly name: string }
  | { readonly by: 'glyph'; readonly name: string }
  | { readonly by: 'illustration'; readonly name: string }
  | { readonly by: 'testID'; readonly id: string };

const INVENTORIES = join(__dirname, '../../../mockups/inventory');

/** Every inventory, in mockup order. */
export function loadInventories(): readonly Inventory[] {
  return readdirSync(INVENTORIES)
    .filter((f) => /^\d\d\.json$/u.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(INVENTORIES, f), 'utf8')) as Inventory);
}

/**
 * The surface an element belongs to. A framed inventory's screen; on board 27, which draws four
 * separate cards, the card (its first two id segments); anywhere else, the one screen.
 */
export function surfaceOf(inventory: Inventory, element: InventoryElement): string {
  if (inventory.kind === 'board' && inventory.governs === 'state')
    return element.id.split('.').slice(0, 2).join('.');
  if (typeof element.screen === 'string') return element.screen;
  return inventory.frame?.screens[0]?.id ?? inventory.mockup;
}

/** Every surface the inventories record, with its elements. */
export function surfacesOf(
  inventories: readonly Inventory[],
): ReadonlyMap<string, { readonly mockup: string; readonly elements: InventoryElement[] }> {
  const out = new Map<string, { mockup: string; elements: InventoryElement[] }>();
  for (const inventory of inventories)
    for (const element of inventory.elements) {
      const surface = surfaceOf(inventory, element);
      const entry = out.get(surface) ?? { mockup: inventory.mockup, elements: [] };
      entry.elements.push(element);
      out.set(surface, entry);
    }
  return out;
}

/**
 * Components too general to identify an element: a `Text` or a `Card` is half of every screen, so
 * finding one proves nothing about which element it is.
 */
const GENERIC = new Set(['Text', 'Card']);

/** The library's exports, by name, so an inventory's `ui:` and `new:` components can be matched. */
const UI = ui as unknown as Readonly<Record<string, unknown>>;

/**
 * The locator an element's own record implies, or `undefined` when it implies none and the surface
 * must give one: a catalogue binding is its words; an icon, its glyph; an illustration, itself; a
 * specific component of the library, that component.
 */
export function derivedLocator(element: InventoryElement): Locator | undefined {
  if (element.binding?.startsWith('static:') === true)
    return { by: 'text', key: element.binding.slice('static:'.length) as MessageKey };
  if (element.icon !== null) return { by: 'glyph', name: element.icon };
  if (element.illustration !== null) return { by: 'illustration', name: element.illustration };
  const name = /^(?:ui|new):(\w+)$/u.exec(element.component ?? '')?.[1];
  if (name !== undefined && !GENERIC.has(name) && typeof UI[name] === 'function')
    return { by: 'component', name };
  return undefined;
}

/** A locator's identity, so elements located the same way must be found as many times. */
const signature = (locator: Locator, locale: Locale): string => {
  switch (locator.by) {
    case 'text':
      return `text:${t(locale, locator.key)}`;
    case 'value':
      return `text:${locator.text(locale)}`;
    case 'component':
    case 'glyph':
    case 'illustration':
      return `${locator.by}:${locator.name}`;
    case 'testID':
      return `testID:${locator.id}`;
  }
};

const normal = (s: string): string => s.replace(/\s+/gu, ' ').trim();

/** Every host node with a given `testID` in a JSON tree. */
function byTestID(node: TestNode | string, id: string, out: TestNode[] = []): TestNode[] {
  if (typeof node === 'string') return out;
  if (node.props['testID'] === id) out.push(node);
  for (const child of node.children ?? []) byTestID(child, id, out);
  return out;
}

/** How many times a locator is satisfied on a surface, and whether a `testID` lands on nothing. */
function count(
  locator: Locator,
  live: LiveNodes,
  json: TestNode,
  locale: Locale,
): { readonly found: number; readonly undrawn: number } {
  switch (locator.by) {
    case 'text':
    case 'value': {
      /*
       * PARAGRAPHS FIRST. A control's words are often both its paragraph and its accessible name,
       * and counting both would let one element satisfy two located the same way. A text only
       * spoken, an icon control's name, is found among the names when no paragraph carries it.
       */
      const want = normal(locator.by === 'text' ? t(locale, locator.key) : locator.text(locale));
      const read = renderedTexts(json).filter((r) => normal(r.text) === want);
      const paragraphs = read.filter((r) => r.kind === 'paragraph').length;
      const found = paragraphs > 0 ? paragraphs : read.filter((r) => r.kind === 'name').length;
      return { found, undrawn: 0 };
    }
    case 'component': {
      const component = UI[locator.name];
      return { found: live.filter((n) => n.type === component).length, undrawn: 0 };
    }
    case 'glyph':
      return {
        found: live.filter((n) => n.type === ui.Glyph && n.name === locator.name).length,
        undrawn: 0,
      };
    case 'illustration':
      return {
        found: live.filter((n) => n.type === ui.Illustration && n.name === locator.name).length,
        undrawn: 0,
      };
    case 'testID': {
      const nodes = byTestID(json, locator.id);
      const drawn = nodes.filter((n) => drawsSomething(n)).length;
      return { found: drawn, undrawn: nodes.length - drawn };
    }
  }
}

/**
 * What is missing from one rendered surface: an element with no locator, a locator for no element,
 * an element not found as many times as the elements located the same way, and a `testID` that
 * lands on a node drawing nothing. Empty when every element is drawn.
 */
export function elementFindings(
  live: LiveNodes,
  json: TestNode,
  elements: readonly InventoryElement[],
  explicit: Readonly<Record<string, Locator>>,
  locale: Locale,
): readonly string[] {
  const findings: string[] = [];
  const ids = new Set(elements.map((e) => e.id));
  for (const id of Object.keys(explicit))
    if (!ids.has(id))
      findings.push(`${id}: a locator for an element the inventory does not record`);

  const located = elements.flatMap((element) => {
    const locator = explicit[element.id] ?? derivedLocator(element);
    if (locator === undefined) {
      findings.push(`${element.id}: no locator — its record implies none, and none is given`);
      return [];
    }
    return [{ element, locator, key: signature(locator, locale) }];
  });

  const needed = new Map<string, number>();
  for (const { key } of located) needed.set(key, (needed.get(key) ?? 0) + 1);

  const checked = new Set<string>();
  for (const { locator, key } of located) {
    if (checked.has(key)) continue;
    checked.add(key);
    const { found, undrawn } = count(locator, live, json, locale);
    const want = needed.get(key) ?? 1;
    if (found < want) {
      const sharing = located.filter((l) => l.key === key).map((l) => l.element.id);
      findings.push(
        `${sharing.join(', ')}: not drawn — ${key} found ${String(found)} time(s), needed ${String(want)}` +
          (undrawn > 0 ? ` (${String(undrawn)} node(s) carry the id and draw nothing)` : ''),
      );
    }
  }
  return findings;
}
