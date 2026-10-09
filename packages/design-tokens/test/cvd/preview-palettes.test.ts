/**
 * The census: how legible each declared palette stays under each preview mode (F-240, ADR-0131 §6).
 *
 * Gates 9 and 10 keep measuring the palettes as declared, which are the contract. This measures the
 * palettes as the preview paints them — every declared pairing, through `checkContrast` and the
 * same palette argument the device path uses (E-095) — and pins what it finds. It is a census, not a
 * gate: a failure in a model's output could only be fixed by moving a declared token, which is the
 * gates' own subject, and a threshold for simulated legibility would be a person's decision.
 *
 * The decoy shows the census measures: red on black clears the body-text floor as declared and falls
 * through it under protanopia, which is what a protanope's dim reds do.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkContrast,
  hexToOklch,
  oklchToRgb,
  parseManifest,
  PREVIEW_MODES,
  simulatePaint,
  THEMES,
  type ColorToken,
  type Manifest,
  type Palettes,
  type PreviewMode,
} from '../../src/index.js';
import { toHex } from '../../src/derive.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ONE `join` per path, every segment literal, so verify-cache-scope can see what is read. */
const manifest: Manifest = parseManifest(
  JSON.parse(
    readFileSync(
      join(HERE, '..', '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
      'utf8',
    ),
  ),
);

/** A token as the preview paints it: its colour simulated, its alpha, roles and pairings kept. */
function simulatedToken(token: ColorToken, mode: PreviewMode): ColorToken {
  const hex = simulatePaint(toHex(oklchToRgb(token.oklch)), mode);
  const { l, c, h } = hexToOklch(hex);
  return {
    ...token,
    oklch: { ...token.oklch, l, c, h },
    srgb: hex,
  };
}

const simulatedPalettes = (palettes: Palettes, mode: PreviewMode): Palettes =>
  Object.fromEntries(
    Object.entries(palettes).map(([theme, tokens]) => [
      theme,
      Object.fromEntries(
        Object.entries(tokens).map(([name, token]) => [name, simulatedToken(token, mode)]),
      ),
    ]),
  );

/** Every declared pairing that falls below its requirement in one mode, as `theme: fg / bg`. */
const failing = (palettes: Palettes, themes: readonly string[] = THEMES): string[] =>
  checkContrast(manifest, themes, palettes)
    .results.filter((r) => !r.passes)
    .map((r) => `${r.theme}: ${r.foreground} / ${r.background}`)
    .sort();

describe('the declared palettes, as each preview mode paints them', () => {
  it('measures every declared pairing in every palette — the census reads something', () => {
    const { results } = checkContrast(
      manifest,
      THEMES,
      simulatedPalettes(manifest.color, 'protanopia'),
    );
    expect(results.length).toBeGreaterThan(THEMES.length * 20);
  });

  it('passes every pairing as declared, so a finding below is the simulation’s, not the palette’s', () => {
    expect(failing(manifest.color)).toStrictEqual([]);
  });

  it.each(PREVIEW_MODES.filter((m) => m !== 'standard'))(
    '%s: pins which declared pairings fall below their requirement',
    (mode) => {
      expect(failing(simulatedPalettes(manifest.color, mode))).toStrictEqual(PINNED[mode]);
    },
  );

  it('DECOY — red on black clears the floor as declared, and falls through it under protanopia', () => {
    // One real palette, with its body text made pure red on pure black: the pairing and its
    // requirement are the manifest's own, only the two colours are planted.
    const plant = (token: ColorToken, hex: string): ColorToken => {
      const { l, c, h } = hexToOklch(hex);
      return { ...token, oklch: { ...token.oklch, l, c, h }, srgb: hex };
    };
    const dark = manifest.color.dark;
    const fg = dark['foreground'];
    const bg = dark['background'];
    if (fg === undefined || bg === undefined)
      throw new Error('the dark palette lost its text tokens');
    const planted: Palettes = {
      dark: { ...dark, foreground: plant(fg, '#FF0000'), background: plant(bg, '#000000') },
    };
    const pair = 'dark: foreground / background';
    expect(failing(planted, ['dark'])).not.toContain(pair);
    expect(failing(simulatedPalettes(planted, 'protanopia'), ['dark'])).toContain(pair);
  });
});

/**
 * What the census found when it first ran (F-240 increment 2), pinned so a change to the palette or
 * the model shows up here. An entry is a finding to read, never a failure to fix in place: see the
 * module comment.
 */
const PINNED: Readonly<Record<Exclude<PreviewMode, 'standard'>, readonly string[]>> = {
  protanopia: [
    'dark: status.warn / surface.2',
    'light: foreground.3.card / surface.3',
    'slate.dark: status.warn / surface.2',
  ],
  deuteranopia: [
    'dark: foreground.3 / background',
    'dark: status.ok / surface.2',
    'slate.dark: foreground.3 / background',
    'slate.dark: status.ok / surface.2',
  ],
  tritanopia: [
    'light: foreground.3.card / surface.3',
    'slate.dark: foreground.3 / background',
    'slate.dark: status.ok / surface.2',
    'slate.dark: status.warn / surface.2',
  ],
};
