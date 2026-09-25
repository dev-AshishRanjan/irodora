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
import {
  checkContrast,
  checkSeparation,
  COLOR,
  hexToOklch,
  parseManifest,
  smallestLightnessMove,
  withOklch,
  type ColorToken,
} from '../src/index.js';

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
 * README role → manifest token, for the values the manifest takes AS DRAWN, in both themes. The E3
 * moves are recomputed by the rule that moved them, in the last block of this file; everything
 * criterion 1 names is covered by one or the other.
 */
const AS_DRAWN: Readonly<Record<string, string>> = {
  'background.ground': 'background',
  'background.level1': 'surface.1',
  'background.level2': 'surface.2',
  'background.level3': 'surface.3',
  'border.subtle': 'border',
  'border.strong': 'border.strong',
  'typography.primary': 'foreground',
  'typography.secondary': 'foreground.2',
};

/**
 * Roles drawn as-is in ONE theme, or drawn by a mockup rather than the table. Sumi's tertiary keeps
 * its drawn value on the ground, where it passes. Sumi's primary action is the table's white.
 * Washi's is `25`'s ink pill, which the table leaves out; the ink is its `typography.primary`.
 * The handle's border keeps the drawn ink on Washi, where it passes.
 */
const AS_DRAWN_IN: readonly (readonly ['dark' | 'light', string, string])[] = [
  ['dark', 'typography.tertiary', 'foreground.3'],
  ['dark', 'accent.primary', 'accent'],
  ['light', 'typography.primary', 'accent'],
  ['light', 'border.strong', 'border.indicator'],
];

/** Every drawn/declared mismatch, by name. Empty is the pass. */
function mismatches(color: typeof COLOR): string[] {
  const out: string[] = [];
  for (const [theme, drawn] of [
    ['dark', DARK],
    ['light', LIGHT],
  ] as const)
    for (const [role, token] of [
      ...Object.entries(AS_DRAWN),
      ...AS_DRAWN_IN.filter(([t]) => t === theme).map(([, r, k]) => [r, k] as const),
    ]) {
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
    const ink = hexToOklch('#1A1B1E');
    expect([light.oklch.l, light.oklch.c, light.oklch.h]).toStrictEqual([ink.l, ink.c, ink.h]);
  });

  it('puts the ground on the primary action, as the pill draws it', () => {
    for (const theme of ['dark', 'light'] as const)
      expect(COLOR[theme]['accent.foreground'].srgb).toBe(COLOR[theme].background.srgb);
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

/*
 * THE E3 MOVES, RECOMPUTED. Each forced value is the smallest OKLab lightness step off the drawn
 * value that the GATE'S OWN CHECKER passes (R9-MOCKUP-FIDELITY §4 E3). So a hand-edited move, or a
 * drawn value that changes under it, fails here by name rather than passing every gate.
 */
describe('every E3 move is what the rule gives from the drawn value', () => {
  const manifest = parseManifest(JSON.parse(source) as unknown);

  const inTheme = (theme: 'dark' | 'light', name: string, candidate: ColorToken) => ({
    ...manifest.color,
    [theme]: { ...manifest.color[theme], [name]: candidate },
  });

  /** The token's own declared pairings, in its theme, judged by `checkContrast`. */
  const clears =
    (theme: 'dark' | 'light', name: string) =>
    (candidate: ColorToken): boolean =>
      checkContrast(manifest, [theme], inTheme(theme, name, candidate))
        .results.filter((r) => r.foreground === name || r.background === name)
        .every((r) => r.passes);

  /** And gate 10's pairs that name it. */
  const separates =
    (theme: 'dark' | 'light', name: string) =>
    (candidate: ColorToken): boolean =>
      checkSeparation(manifest, [theme], inTheme(theme, name, candidate))
        .filter((r) => r.a === name || r.b === name)
        .every((r) => r.passes);

  const move = (
    theme: 'dark' | 'light',
    name: string,
    drawn: string,
    direction: 'lighter' | 'darker',
    passes: (t: ColorToken) => boolean,
  ): string | undefined => {
    const held = manifest.color[theme][name];
    if (held === undefined) throw new Error(`${theme}.${name} is not in the manifest`);
    const start = withOklch(held, hexToOklch(drawn), `${theme}.${name}`);
    // It IS forced: the drawn value fails, or this row would be a discretionary departure.
    expect(passes(start)).toBe(false);
    return smallestLightnessMove({ token: start, direction, space: 'oklab', passes, where: name })
      ?.srgb;
  };

  const drawnValue = (theme: 'dark' | 'light', role: string): string => {
    const v = (theme === 'dark' ? DARK : LIGHT)[role];
    if (v === undefined) throw new Error(`the README has no ${role}`);
    return v;
  };

  /*
   * A row moves a ROLE, which may be several tokens: on Washi the tertiary role is one value on the
   * ground and on the cards (§4's row 2), so it is judged over the pairings of both tokens. On Sumi
   * the ground keeps the drawn value and only the card token moves.
   */
  it.each([
    ['dark', ['foreground.3.card'], 'typography.tertiary', 'lighter', '#94A1AF'],
    ['light', ['foreground.3', 'foreground.3.card'], 'typography.tertiary', 'darker', '#5D6674'],
    ['dark', ['ring'], 'border.strong', 'lighter', '#788090'],
    ['dark', ['border.indicator'], 'border.strong', 'lighter', '#788090'],
  ] as const)('%s %s — %s moved %s is %s', (theme, names, role, direction, value) => {
    const asEach = (t: ColorToken): boolean =>
      names.every((name) => {
        const held = manifest.color[theme][name];
        if (held === undefined) throw new Error(`${theme}.${name} is not in the manifest`);
        return clears(theme, name)(withOklch(held, t.oklch, `${theme}.${name}`));
      });
    const [first] = names;
    expect(move(theme, first, drawnValue(theme, role), direction, asEach)).toBe(value);
    for (const name of names) expect(COLOR[theme][name].srgb).toBe(value);
  });

  it('light ring — the drawn ink moved lighter until gate 10 separates it is #3A3B3E', () => {
    const both = (t: ColorToken): boolean =>
      clears('light', 'ring')(t) && separates('light', 'ring')(t);
    expect(move('light', 'ring', drawnValue('light', 'border.strong'), 'lighter', both)).toBe(
      '#3A3B3E',
    );
    expect(COLOR.light.ring.srgb).toBe('#3A3B3E');
  });
});
