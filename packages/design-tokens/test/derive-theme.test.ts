/**
 * ADR-0107's rule and §4 E3's move, run on the README's own values.
 *
 * The table these pin is ADR-0107's, which F-289 measured and its review confirmed exact. A rule
 * that re-derived a theme from the wrong ground, or carried the wrong step, would still produce
 * plausible greys; the controls below are what tell those apart from the right answer.
 */

import { describe, expect, it } from 'vitest';
import { checkContrast } from '../src/check.js';
import {
  hexToOklch,
  reanchorTheme,
  smallestLightnessMove,
  withOklch,
} from '../src/derive-theme.js';
import type { ColorToken } from '../src/manifest.js';

const token = (hex: string, usage: ColorToken['usage'] = 'surface'): ColorToken =>
  withOklch(
    { oklch: { l: 0, c: 0, h: 0 }, srgb: '', role: 'test', usage, pairsWith: [] },
    hexToOklch(hex),
    hex,
  );

/** Sumi Charcoal as the README draws it (§5). */
const SUMI: Record<string, ColorToken> = {
  background: token('#15171B'),
  'surface.1': token('#20232A'),
  'surface.2': token('#282C35'),
  'surface.3': token('#323742'),
  foreground: token('#F7F8FA', 'text'),
};
const RAMP = ['surface.1', 'surface.2', 'surface.3'];
const hexes = (t: Record<string, ColorToken>): string[] =>
  ['background', ...RAMP].map((n) => t[n]?.srgb ?? '');

describe('a README value enters exactly', () => {
  it('round-trips every drawn hex through OKLCh at full precision', () => {
    for (const hex of ['#15171B', '#20232A', '#282C35', '#323742', '#F6F5F2', '#FFFFFF', '#1A1B1E'])
      expect(token(hex).srgb).toBe(hex);
  });
});

describe("ADR-0107's rule", () => {
  it('re-derives Slate Graphite as the ADR publishes it', () => {
    expect(hexes(reanchorTheme(SUMI, hexToOklch('#2C323A'), RAMP, 'slate'))).toEqual([
      '#2C323A',
      '#3B3F46',
      '#444952',
      '#4F5460',
    ]);
  });

  it('re-derives Obsidian Noir as the ADR publishes it', () => {
    expect(hexes(reanchorTheme(SUMI, hexToOklch('#101114'), RAMP, 'obsidian'))).toEqual([
      '#101114',
      '#1A1D24',
      '#22262E',
      '#2B303B',
    ]);
  });

  it('CONTROL — re-anchoring Sumi at its own ground gives Sumi back', () => {
    expect(
      hexes(reanchorTheme(SUMI, SUMI['background']?.oklch ?? { l: 0, c: 0, h: 0 }, RAMP, 's')),
    ).toEqual(hexes(SUMI));
  });

  it('CONTROL — a ground 0.1 L higher lifts every step by 0.1 L, hue and chroma held', () => {
    const g = hexToOklch('#15171B');
    const up = reanchorTheme(SUMI, { ...g, l: g.l + 0.1 }, RAMP, 'up');
    for (const n of RAMP) {
      expect(up[n]?.oklch.l).toBeCloseTo((SUMI[n]?.oklch.l ?? 0) + 0.1, 10);
      expect(up[n]?.oklch.c).toBe(SUMI[n]?.oklch.c);
      expect(up[n]?.oklch.h).toBe(SUMI[n]?.oklch.h);
    }
  });

  it('holds every token it was not told to re-anchor', () => {
    const slate = reanchorTheme(SUMI, hexToOklch('#2C323A'), RAMP, 'slate');
    expect(slate['foreground']).toBe(SUMI['foreground']);
  });

  it('MUTATION — reading Sumi’s ground where the new one belongs does not give the table', () => {
    // F-289's decoy: a derivation that re-anchors at the base's ground reproduces the base.
    const wrong = reanchorTheme(SUMI, SUMI['background']?.oklch ?? { l: 0, c: 0, h: 0 }, RAMP, 'x');
    expect(hexes(wrong)).not.toEqual(['#2C323A', '#3B3F46', '#444952', '#4F5460']);
  });
});

describe("§4 E3's move", () => {
  /** The pairing `text` on `surface`, judged by the gate's own checker. */
  const passesOn = (surface: ColorToken) => (candidate: ColorToken) => {
    const palette = { dark: { s: surface, t: { ...candidate, pairsWith: ['s'] } } };
    const manifest = {
      color: palette,
      gate: { contrast: { normalText: 4.5, largeText: 3, nonText: 3 } },
    } as unknown as Parameters<typeof checkContrast>[0];
    return checkContrast(manifest, ['dark'], palette).results.every((r) => r.passes);
  };

  it('moves a failing text token to the first grid step that passes, hue and chroma held', () => {
    const surface = token('#323742');
    const drawn = token('#768290', 'text');
    expect(passesOn(surface)(drawn)).toBe(false);
    for (const space of ['oklab', 'cielab'] as const) {
      const moved = smallestLightnessMove({
        token: drawn,
        direction: 'lighter',
        space,
        passes: passesOn(surface),
        where: 'test',
      });
      expect(moved).not.toBeNull();
      if (moved === null) continue;
      expect(passesOn(surface)(moved)).toBe(true);
      expect(moved.oklch.l).toBeGreaterThan(drawn.oklch.l);
      if (space === 'oklab') {
        expect(moved.oklch.c).toBe(drawn.oklch.c);
        expect(moved.oklch.h).toBe(drawn.oklch.h);
        // MINIMAL: one grid step back fails.
        const back = withOklch(drawn, { ...moved.oklch, l: moved.oklch.l - 0.001 }, 'back');
        expect(passesOn(surface)(back)).toBe(false);
      }
    }
  });

  it('returns null when the axis runs out before anything passes', () => {
    const moved = smallestLightnessMove({
      token: token('#768290', 'text'),
      direction: 'lighter',
      space: 'oklab',
      passes: () => false,
      where: 'never',
    });
    expect(moved).toBeNull();
  });
});
