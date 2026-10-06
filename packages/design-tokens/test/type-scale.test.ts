/**
 * The type scale is board 00's, and its caption is MEASURED (F-226, ADR-0113).
 *
 * Board 00 prints four steps — Display 1 72, Title 22, Body 16, Label 14 — and the screens draw a
 * fifth, below 12 dp, that the board's labels do not name (OQ-12). Its size is not chosen: it is the
 * median of every em the inventories record below 12 dp, recomputed here from `raw.emDp`, so a
 * remeasured inventory that moves the median fails this test with the new number.
 *
 * And the manifest's steps are EXACTLY the inventory schema's `type.size` vocabulary, so a screen's
 * record and the scale it is built from cannot name different steps.
 *
 * ADR-0121 (F-230) adds the rule for type drawn off the scale: within 4 dp of a board step it takes
 * the step; beyond, a MEASURED step bound to the elements drawn at that size, at their median em.
 * The census below accounts for every such element — bound here, or owed in
 * `.harness/verification/type-census.json` by the feature that builds it — both ways.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseManifest } from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const INVENTORY = join(HERE, '..', '..', '..', 'mockups', 'inventory');
const SCHEMA = join(HERE, '..', '..', '..', 'mockups', 'inventory.schema.json');
const CENSUS = join(HERE, '..', '..', '..', '.harness', 'verification', 'type-census.json');
const manifest = parseManifest(
  JSON.parse(
    readFileSync(
      join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
      'utf8',
    ),
  ) as unknown,
);

interface Element {
  readonly id: string;
  readonly raw?: { readonly emDp?: number };
  readonly type?: { readonly size?: string; readonly face?: string; readonly weight?: number };
  readonly children?: readonly Element[];
}

/** Every element of every inventory, children included. */
function allElements(): Element[] {
  const out: Element[] = [];
  for (const file of readdirSync(INVENTORY)) {
    if (!file.endsWith('.json')) continue;
    const walk = (els: readonly Element[] | undefined): void => {
      for (const e of els ?? []) {
        out.push(e);
        walk(e.children);
      }
    };
    walk(
      (JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as { elements: readonly Element[] })
        .elements,
    );
  }
  return out;
}

/**
 * Type inside a DRAWN DOCUMENT is the document's type at thumbnail scale, not the app's: `18` draws
 * its report as a miniature page (5.5–7.5 dp, illegible — "not design" under §2). ADR-0113 leaves
 * those five readings out, by this rule rather than by value.
 */
const IN_A_DRAWN_DOCUMENT = (id: string): boolean => id.startsWith('18.report.preview.');

/** Every em the inventories record below 12 dp, outside drawn documents. */
function smallEms(extra: readonly number[] = []): number[] {
  const out: number[] = [...extra];
  for (const file of readdirSync(INVENTORY)) {
    if (!file.endsWith('.json')) continue;
    const walk = (els: readonly Element[] | undefined): void => {
      for (const e of els ?? []) {
        const em = e.raw?.emDp;
        if (typeof em === 'number' && em < 12 && !IN_A_DRAWN_DOCUMENT(e.id)) out.push(em);
        walk(e.children);
      }
    };
    walk(
      (JSON.parse(readFileSync(join(INVENTORY, file), 'utf8')) as { elements: readonly Element[] })
        .elements,
    );
  }
  return out;
}

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[mid] ?? NaN) : ((s[mid - 1] ?? NaN) + (s[mid] ?? NaN)) / 2;
};
const toTenth = (n: number): number => Math.round(n * 10) / 10;

/** The schema's `type.size` enum, found by what it contains rather than by a path into it. */
function schemaSizes(): string[] {
  const hits: string[][] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      if (v.includes('display1') && v.includes('caption')) hits.push(v as string[]);
      for (const x of v) walk(x);
    } else if (v !== null && typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  walk(JSON.parse(readFileSync(SCHEMA, 'utf8')) as unknown);
  const [found] = hits;
  if (found === undefined) throw new Error('the inventory schema has no type.size enum');
  return found;
}

describe("the type scale is board 00's, plus the measured caption (ADR-0113)", () => {
  it('names exactly the steps the inventories record type at', () => {
    expect(Object.keys(manifest.typography.scale).sort()).toStrictEqual(schemaSizes().sort());
  });

  it('sets the four steps board 00 prints at the sizes it prints', () => {
    const size = (step: string): number | undefined => manifest.typography.scale[step]?.size;
    expect([size('display1'), size('title'), size('body'), size('label')]).toStrictEqual([
      72, 22, 16, 14,
    ]);
  });

  it('reads enough ems to take a median of — an empty read would agree with anything', () => {
    expect(smallEms().length).toBeGreaterThan(80);
  });

  it('sets the caption at the median of every em drawn below 12 dp', () => {
    expect(manifest.typography.scale['caption']?.size).toBe(toTenth(median(smallEms())));
  });

  it('DECOY — a remeasured inventory that moves the median is caught', () => {
    // Forty readings at 9 dp: a remeasure of that size moves a median over ~90 values.
    const moved = toTenth(median(smallEms(Array.from({ length: 40 }, () => 9))));
    expect(moved).not.toBe(manifest.typography.scale['caption']?.size);
  });
});

/** The board's four printed steps (ADR-0113). */
const BOARD = ['display1', 'title', 'body', 'label'] as const;
const boardSize = (step: string): number => manifest.typography.scale[step]?.size ?? NaN;
/** `25` governs the light palette and `00` is the board: neither sets a screen's type (P2, P3). */
const governing = (id: string): boolean => !/^(00|25)./u.test(id) && !IN_A_DRAWN_DOCUMENT(id);
/** ADR-0121's band: every governing element at or above 12 dp drawn more than 4 dp from every step. */
function offScale(elements: readonly Element[]): string[] {
  return elements
    .filter((e) => governing(e.id))
    .filter((e) => {
      const em = e.raw?.emDp;
      return (
        typeof em === 'number' &&
        em >= 12 &&
        BOARD.every((step) => Math.abs(boardSize(step) - em) > 4)
      );
    })
    .map((e) => e.id);
}
const measured = Object.entries(manifest.typography.scale).filter(
  ([, step]) => step.elements !== undefined,
);
const owed = (
  JSON.parse(readFileSync(CENSUS, 'utf8')) as {
    owed: readonly { element: string; feature: string }[];
  }
).owed;

describe('type drawn off the scale (ADR-0121)', () => {
  const elements = allElements();
  const byId = new Map(elements.map((e) => [e.id, e]));

  it('declares the measured steps F-230 binds, and the serif sets them', () => {
    expect(measured.map(([name]) => name).sort()).toStrictEqual(['wordmark', 'wordmarkSplash']);
    const serif = manifest.typography.faces['serif'];
    for (const [name] of measured) expect(serif?.steps).toContain(name);
  });

  /** The manifest face each inventory face is set in (ADR-0112): the gothic is the bundled jp. */
  const FACE_OF: Readonly<Record<string, string>> = {
    serif: 'serif',
    gothic: 'jp',
    mincho: 'mincho',
  };

  /**
   * The tallest own line among the faces a step's bound elements are drawn in (F-230's review). iOS
   * centres a line in its box only at or above its face's own line; below it, React Native 0.86
   * applies no baseline offset, TextKit bottom-aligns the glyphs, and a tall line's top is clipped
   * (RCTApplyBaselineOffsetForRange). The platform sans has no bundled face, so it reads 0 here.
   */
  const ownLineOf = (name: string): number =>
    Math.max(
      0,
      ...(manifest.typography.scale[name]?.elements ?? []).map((id) => {
        const face = FACE_OF[byId.get(id)?.type?.face ?? ''];
        return face === undefined ? 0 : (manifest.typography.faces[face]?.ownLine ?? 0);
      }),
    );

  it('sets each measured step at its elements’ median em, leading at least its face’s own line', () => {
    for (const [name, step] of measured) {
      const ems = (step.elements ?? []).map((id) => {
        const e = byId.get(id);
        if (e === undefined) throw new Error(`${name} binds ${id}, which no inventory records`);
        // Each bound element records the step, so the record and the scale name one size.
        expect(e.type?.size).toBe(name);
        return e.raw?.emDp ?? NaN;
      });
      expect(step.size).toBe(toTenth(median(ems)));
      const nearest = [...BOARD].sort(
        (a, b) => Math.abs(boardSize(a) - step.size) - Math.abs(boardSize(b) - step.size),
      )[0];
      // The nearest board step's leading, or the face's own line where that is taller (ADR-0121).
      const board = manifest.typography.scale[nearest ?? '']?.lineHeight ?? NaN;
      expect(step.lineHeight).toBe(Math.max(board, ownLineOf(name)));
      expect([step.weight, step.tracking]).toStrictEqual([400, '0']);
    }
    // DECOY: the snap ADR-0121 replaces would have set the wordmark at title.
    expect(manifest.typography.scale['wordmark']?.size).not.toBe(boardSize('title'));
    // DECOY: display1's 0.98, which the splash wordmark first took, is under the serif's own line.
    expect(manifest.typography.scale['display1']?.lineHeight).toBeLessThan(
      ownLineOf('wordmarkSplash'),
    );
  });

  it('accounts for every element drawn more than 4 dp from every step: bound, or owed', () => {
    const bound = measured.flatMap(([, step]) => step.elements ?? []);
    const owing = owed.map((row) => row.element);
    expect(bound.filter((id) => owing.includes(id))).toStrictEqual([]);
    // Both ways: nothing off the scale unaccounted, and no row for an element in the band.
    expect(offScale(elements).sort()).toStrictEqual([...bound, ...owing].sort());
  });

  it('DECOY — an element drawn off the scale and accounted for nowhere is caught', () => {
    const planted = [...elements, { id: '99.planted', raw: { emDp: 40 } }];
    expect(offScale(planted)).toContain('99.planted');
    // …while one drawn 4 dp from a step is in the band, as 05's and 07's titles are.
    expect(offScale([{ id: '99.near', raw: { emDp: 26 } }])).toStrictEqual([]);
  });
});
