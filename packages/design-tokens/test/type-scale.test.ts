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
  readonly children?: readonly Element[];
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
