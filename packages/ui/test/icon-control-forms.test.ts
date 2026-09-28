/**
 * Which component an icon-only control is, read off the inventories (F-232, ADR-0115).
 *
 * A `ui:Button` with an icon and no copy is drawn either ON A PLATE (a `bg` or `border` token) or
 * bare. On a plate it is Button's icon-only form, and the plate is the pressable. Bare, it is
 * `IconButton`, the glyph alone that F-228 built. The rule is the schema's `component` description.
 * This test holds every recorded control to it and pins the counts, so a re-recorded control that
 * changes form is a visible diff rather than a quiet one. The inventories are a declared global
 * dependency in turbo.json, so an inventory change reruns this.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');
const SCHEMA = join(__dirname, '..', '..', '..', 'mockups', 'inventory.schema.json');

interface Element {
  readonly id: string;
  readonly parent: string | null;
  readonly component: string | null;
  readonly icon?: string | null;
  readonly tokens?: Readonly<Record<string, string>>;
  readonly copy?: unknown;
  readonly children?: readonly Element[];
}

/** Every element of every inventory, flattened, per file. */
function inventories(): Element[][] {
  return readdirSync(INVENTORY)
    .filter((f) => /^\d\d\.json$/u.test(f))
    .map((file) => {
      const inv = JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as {
        elements?: readonly Element[];
      };
      const all: Element[] = [];
      const walk = (els: readonly Element[] | undefined): void => {
        for (const e of els ?? []) {
          all.push(e);
          walk(e.children);
        }
      };
      walk(inv.elements);
      return all;
    });
}

type Form = 'button' | 'icon-button' | 'ambiguous';

const hasCopy = (e: Element): boolean => e.copy !== null && e.copy !== undefined;

/**
 * ADR-0115. `null` when the element is not an icon-only `ui:Button` at all. A plate's GEOMETRY with
 * no paint (a radius and nothing to round) is neither form, and is named rather than guessed.
 */
function iconOnlyForm(e: Element, all: readonly Element[]): Form | null {
  if (e.component !== 'ui:Button' || typeof e.icon !== 'string') return null;
  if (hasCopy(e) || all.some((k) => k.parent === e.id && hasCopy(k))) return null;
  const tokens = e.tokens ?? {};
  if (tokens['bg'] !== undefined || tokens['border'] !== undefined) return 'button';
  if (tokens['radius'] !== undefined) return 'ambiguous';
  return 'icon-button';
}

const classified = inventories().flatMap((all) =>
  all.flatMap((e) => {
    const form = iconOnlyForm(e, all);
    return form === null ? [] : [{ id: e.id, form }];
  }),
);
const ids = (form: Form): string[] =>
  classified
    .filter((c) => c.form === form)
    .map((c) => c.id)
    .sort();

describe('an icon-only control is a Button on a plate and an IconButton bare (ADR-0115)', () => {
  it('reads thirty icon-only controls — an empty scan would agree with anything', () => {
    expect(classified).toHaveLength(30);
  });

  it('builds the fifteen drawn on a plate as Button: twelve on board 00, three locks on 13', () => {
    const plated = ids('button');
    expect(plated).toHaveLength(15);
    expect(plated.filter((id) => id.startsWith('00.'))).toHaveLength(12);
    expect(plated.filter((id) => id.startsWith('13.'))).toStrictEqual([
      '13.slots.slot-2.lock',
      '13.slots.slot-3.lock',
      '13.slots.slot-4.lock',
    ]);
  });

  it('builds the fifteen drawn bare as IconButton', () => {
    expect(ids('icon-button')).toHaveLength(15);
    expect(ids('icon-button')).toContain('09.search.clear');
  });

  it('finds no plate drawn without paint', () => {
    expect(ids('ambiguous')).toStrictEqual([]);
  });

  it('DECOY — a radius with no bg or border is named ambiguous, not guessed', () => {
    const e: Element = {
      id: 'x.icon',
      parent: null,
      component: 'ui:Button',
      icon: 'camera',
      tokens: { radius: 'sm' },
      copy: null,
    };
    expect(iconOnlyForm(e, [e])).toBe('ambiguous');
  });

  it('DECOY — a button labelled by a child is not icon-only, whatever it is drawn on', () => {
    const e: Element = {
      id: 'x.labelled',
      parent: null,
      component: 'ui:Button',
      icon: 'back',
      tokens: { bg: 'level2' },
      copy: null,
    };
    const label: Element = {
      id: 'x.labelled.text',
      parent: 'x.labelled',
      component: 'ui:Text',
      copy: { shape: 'label', script: 'latin' },
    };
    expect(iconOnlyForm(e, [e, label])).toBeNull();
    expect(iconOnlyForm(e, [e])).toBe('button');
  });

  it('is the rule the schema states, so an inventory author reads the same thing', () => {
    const schema = JSON.parse(readFileSync(SCHEMA, 'utf8')) as {
      $defs: { element: { properties: { component: { description: string } } } };
    };
    const rule = schema.$defs.element.properties.component.description;
    expect(rule).toContain("a bg or border token is Button's icon-only form");
    expect(rule).toContain('With neither, it is IconButton');
    expect(rule).toContain('ADR-0115');
  });
});
