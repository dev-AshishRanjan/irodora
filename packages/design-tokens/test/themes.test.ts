/**
 * The themes a person can choose (F-225, ADR-0111).
 *
 * ## What is being proven
 *
 * That the themes are the ones mockup `15` draws, in its order, each painting exactly one palette —
 * and that the manifest cannot say otherwise. The fuka, yama and aota recipes (ADR-0096) are
 * withdrawn: no mockup draws them, and a palette nothing draws is a design nobody made.
 *
 * Gates 9 and 10 run over every palette in `THEMES`; that is where contrast is proven. What they
 * cannot prove is which palettes exist and in what order a person is offered them.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  BASE_THEMES,
  DERIVED_THEMES,
  DRAWN_THEME_PALETTE,
  DRAWN_THEMES,
  ManifestError,
  parseManifest,
  themeMode,
  THEMES,
} from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/*
 * ONE `join` WITH EVERY SEGMENT IN IT: `verify-cache-scope.mjs` reads the literal segments to
 * learn which file this test reaches outside its package.
 */
const source = readFileSync(
  join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
  'utf8',
);

type Json = Record<string, unknown>;
const clone = (): Json => JSON.parse(source) as Json;

const manifest = parseManifest(clone());

describe('the themes 15 draws', () => {
  it('are offered in the order 15 draws them, each painting a declared palette', () => {
    expect([...DRAWN_THEMES]).toEqual(['sumi', 'slate', 'obsidian', 'washi']);
    for (const id of DRAWN_THEMES) expect(THEMES).toContain(DRAWN_THEME_PALETTE[id]);
    expect(DRAWN_THEME_PALETTE.sumi).toBe('dark');
    expect(DRAWN_THEME_PALETTE.slate).toBe('slate.dark');
    expect(DRAWN_THEME_PALETTE.obsidian).toBe('obsidian.dark');
    expect(DRAWN_THEME_PALETTE.washi).toBe('light');
  });

  it('gives every palette the same token names', () => {
    const [first, ...rest] = THEMES;
    const reference = Object.keys(manifest.color[first]).sort();
    for (const theme of rest) expect(Object.keys(manifest.color[theme]).sort()).toEqual(reference);
  });

  it('withdraws the recipes: no palette and no manifest key names fuka, yama or aota', () => {
    for (const theme of THEMES) expect(theme).not.toMatch(/fuka|yama|aota/u);
    expect(clone()).not.toHaveProperty('themeRecipes');
  });

  it('keeps the authored pair as the base themes', () => {
    expect([...BASE_THEMES]).toEqual(['dark', 'light']);
  });
});

/*
 * SLATE GRAPHITE AND OBSIDIAN NOIR (ADR-0107). Derived at parse time — so every gate reads the
 * values a device paints — and held here to the table the ADR publishes, which F-289 measured.
 */
describe('the two themes 15 draws as one swatch each', () => {
  const ramp = (palette: string): string[] =>
    ['background', 'surface.1', 'surface.2', 'surface.3'].map(
      (n) => manifest.color[palette as (typeof THEMES)[number]][n]?.srgb ?? '',
    );

  it('re-anchor Sumi’s drawn steps at their drawn grounds, as ADR-0107 publishes', () => {
    expect(ramp(DERIVED_THEMES.slate)).toEqual(['#2C323A', '#3B3F46', '#444952', '#4F5460']);
    expect(ramp(DERIVED_THEMES.obsidian)).toEqual(['#101114', '#1A1D24', '#22262E', '#2B303B']);
  });

  it('Obsidian needs no move at all; Slate’s are lightness only, but for one hue-held CVD move', () => {
    const raw = clone()['themeDerivations'] as Record<
      string,
      { moves: { token: string; c?: number }[] }
    >;
    expect(raw['obsidian']?.moves).toHaveLength(0);
    const slate = raw['slate']?.moves ?? [];
    expect(slate.length).toBeGreaterThan(0);
    for (const move of slate) {
      const derived = manifest.color['slate.dark'][move.token];
      const sumi = manifest.color.dark[move.token];
      // Hue is never moved; chroma only where a move says so.
      expect([move.token, derived?.oklch.h]).toStrictEqual([move.token, sumi?.oklch.h]);
      if (move.c === undefined)
        expect([move.token, derived?.oklch.c]).toStrictEqual([move.token, sumi?.oklch.c]);
    }
    expect(slate.filter((m) => m.c !== undefined).map((m) => m.token)).toStrictEqual([
      'status.bad',
    ]);
  });

  it('holds every token it was not told to move at Sumi’s value', () => {
    const raw = clone()['themeDerivations'] as Record<
      string,
      { reanchor: string[]; moves: { token: string }[] }
    >;
    for (const [id, palette] of Object.entries(DERIVED_THEMES)) {
      const touched = new Set([
        'background',
        ...(raw[id]?.reanchor ?? []),
        ...(raw[id]?.moves ?? []).map((m) => m.token),
      ]);
      for (const [name, token] of Object.entries(manifest.color[palette]))
        if (!touched.has(name))
          expect([palette, name, token.srgb]).toStrictEqual([
            palette,
            name,
            manifest.color.dark[name]?.srgb,
          ]);
    }
  });

  it('refuses a derivation the constant does not name, and a move that would shift a hue', () => {
    const extra = clone();
    (extra['themeDerivations'] as Json)['mizu'] = {};
    expect(() => parseManifest(extra)).toThrow(/DERIVED_THEMES expects/u);
    const wrongSpace = clone();
    const moves = ((wrongSpace['themeDerivations'] as Json)['slate'] as Json)['moves'] as Json[];
    if (moves[0] !== undefined) moves[0]['space'] = 'cielab';
    expect(() => parseManifest(wrongSpace)).toThrow(/moves in OKLab/u);
  });
});

describe('the manifest cannot disagree with the picker', () => {
  it('refuses a theme list in another order', () => {
    const m = clone();
    m['themes'] = [...(m['themes'] as Json[])].reverse();
    expect(() => parseManifest(m)).toThrow(ManifestError);
    expect(() => parseManifest(m)).toThrow(/in 15's order/u);
  });

  it('refuses a theme that paints another palette', () => {
    const m = clone();
    m['themes'] = (m['themes'] as Json[]).map((t) =>
      t['id'] === 'washi' ? { ...t, palette: 'dark' } : t,
    );
    expect(() => parseManifest(m)).toThrow(/DRAWN_THEMES expects/u);
  });

  it('refuses a missing theme list', () => {
    const m = clone();
    delete m['themes'];
    expect(() => parseManifest(m)).toThrow(/themes/u);
  });

  it('DECOY — the shipped list parses', () => {
    expect(() => parseManifest(clone())).not.toThrow();
  });
});

describe('themeMode', () => {
  it('reads the mode off every palette name', () => {
    for (const theme of THEMES)
      expect(themeMode(theme)).toBe(theme.endsWith('light') ? 'light' : 'dark');
  });
});
