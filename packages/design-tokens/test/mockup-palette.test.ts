/**
 * The palette is the mockups' (F-225, criterion 1).
 *
 * `mockups/README.md` §3 declares the token table the renders were drawn from (precedence P4). The
 * manifest takes it EXACTLY, except where a blocking gate forces a listed move (R9-MOCKUP-FIDELITY
 * §4 E3). This file reads the README itself — not a copy of its numbers — and holds the manifest to
 * it, so a hand-nudged grey fails here with the token's name rather than passing every gate.
 *
 * It also recomputes the chroma ceiling from what the mockups DRAW, because a ceiling copied into
 * the manifest by hand would drift the first time a value moved (ADR-0111).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deltaE00 } from '@irodora/color-difference';
import { oklchToXyz, xyzToLab } from '@irodora/color-spaces';
import { COLOR, hexToOklch, parseManifest } from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const readme = readFileSync(join(HERE, '..', '..', '..', 'mockups', 'README.md'), 'utf8');
const source = readFileSync(
  join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
  'utf8',
);

/** The `key: '#RRGGBB'` pairs inside one `export const NAME = { … };` block of the README. */
function tokensOf(block: string): Record<string, string> {
  const start = readme.indexOf(`export const ${block} = {`);
  if (start < 0) throw new Error(`README §3 has no ${block}`);
  const end = readme.indexOf('};', start);
  const body = readme.slice(start, end);
  const out: Record<string, string> = {};
  let group = '';
  for (const line of body.split('\n')) {
    const g = /^\s{2}(\w+): \{/u.exec(line);
    if (g?.[1] !== undefined) group = g[1];
    const v = /^\s{4}(\w+): '(#[0-9A-Fa-f]{6,8})'/u.exec(line);
    if (v?.[1] !== undefined && v[2] !== undefined) out[`${group}.${v[1]}`] = v[2].toUpperCase();
  }
  return out;
}

const DARK = tokensOf('darkMonochromeTokens');
const LIGHT = tokensOf('lightWashiTokens');

/**
 * README role → manifest token, for the values the manifest takes AS DRAWN. The E3 moves (text
 * tertiary, the state border) are asserted beside the rule that moved them, not here.
 */
const AS_DRAWN: Readonly<Record<string, string>> = {
  'background.ground': 'background',
  'background.level1': 'surface.1',
  'background.level2': 'surface.2',
  'background.level3': 'surface.3',
  'border.subtle': 'border',
  'typography.primary': 'foreground',
  'typography.secondary': 'foreground.2',
};

/** Every drawn/declared mismatch, by name. Empty is the pass. */
function mismatches(color: typeof COLOR): string[] {
  const out: string[] = [];
  for (const [theme, drawn] of [
    ['dark', DARK],
    ['light', LIGHT],
  ] as const)
    for (const [role, token] of Object.entries(AS_DRAWN)) {
      const want = drawn[role];
      const have = color[theme][token as keyof (typeof color)['dark']].srgb.toUpperCase();
      if (want === undefined) out.push(`${theme}: the README has no ${role}`);
      else if (have !== want) out.push(`${theme}.${token} is ${have}; the README draws ${want}`);
    }
  return out;
}

describe('the README table, read from the README', () => {
  it('finds both tables, so an empty read cannot pass', () => {
    expect(DARK['background.ground']).toBe('#15171B');
    expect(LIGHT['background.ground']).toBe('#F6F5F2');
    expect(Object.keys(DARK).length).toBeGreaterThan(8);
  });

  it('is what the manifest paints, value for value', () => {
    expect(mismatches(COLOR)).toStrictEqual([]);
  });

  it('DECOY — a level nudged by one step is named', () => {
    const nudged = structuredClone(COLOR) as { dark: Record<string, { srgb: string }> };
    const level = nudged.dark['surface.2'];
    if (level !== undefined) level.srgb = '#282C36';
    expect(mismatches(nudged as unknown as typeof COLOR)).toEqual([
      'dark.surface.2 is #282C36; the README draws #282C35',
    ]);
  });

  it('declares the keyline as drawn, alpha and all', () => {
    const dark = COLOR.dark['swatch.keyline'];
    const light = COLOR.light['swatch.keyline'];
    expect(DARK['border.neutralKeyline']).toBe('#FFFFFF22');
    expect(LIGHT['border.neutralKeyline']).toBe('#1A1B1E18');
    expect(dark.oklch.alpha).toBeCloseTo(0x22 / 255, 12);
    expect(light.oklch.alpha).toBeCloseTo(0x18 / 255, 12);
    expect(hexToOklch('#FFFFFF').l).toBe(dark.oklch.l);
  });
});

describe('the chroma ceiling is what the mockups draw', () => {
  it('is the largest drawn OKLCh chroma, rounded up to the third decimal', () => {
    const drawn = [...Object.values(DARK), ...Object.values(LIGHT)].map((hex) =>
      hexToOklch(hex.slice(0, 7)),
    );
    const max = Math.max(...drawn.map((o) => o.c));
    const ceiling = parseManifest(JSON.parse(source) as unknown).gate.contrast.chromaCeiling
      .maxChroma;
    expect(ceiling).toBe(Math.ceil(max * 1000) / 1000);
    // And it is a real ceiling: every drawn value sits under it.
    for (const o of drawn) expect(o.c).toBeLessThanOrEqual(ceiling);
  });
});

/*
 * THE CONSEQUENCE ADR-0111 STATES, reproduced rather than quoted. Samples sit on the drawn cards
 * (C11), and those carry chroma: a neutral well at the same lightness would differ visibly. These are
 * the numbers the ADR prints; if the palette moves, this names the new ones.
 */
describe('the surround a sample is judged against (C11, ADR-0111)', () => {
  const lab = (o: { l: number; c: number; h: number }) => xyzToLab(oklchToXyz([o.l, o.c, o.h]));
  const SURROUND = ['background', 'surface.1', 'surface.2', 'surface.3'] as const;

  it('carries chroma up to 0.0206, which a neutral well at the same lightness could not hide', () => {
    const measured = SURROUND.map((n) => {
      const o = COLOR.dark[n].oklch;
      return { c: o.c, d: deltaE00(lab(o), lab({ ...o, c: 0 })) };
    });
    expect(Math.max(...measured.map((m) => m.c)).toFixed(4)).toBe('0.0206');
    expect(measured.map((m) => m.d.toFixed(2))).toStrictEqual(['2.94', '4.64', '5.63', '6.50']);
    // And the well IS a card: the sample sits on level 1, as drawn.
    expect(COLOR.dark['swatch.well'].srgb).toBe(COLOR.dark['surface.1'].srgb);
  });
});
