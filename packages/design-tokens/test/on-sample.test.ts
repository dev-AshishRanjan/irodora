/**
 * E3 applied per sample (F-233, ADR-0116): whatever a sample is, the text on it clears 4.5:1 and
 * its edge clears 3:1, and nothing moves that did not have to.
 *
 * Two kinds of proof, because a grid cannot prove the second:
 * - **The scan** runs `onSample` over the sRGB gamut on a 0.05 grid (9,261 samples) in every
 *   palette.
 * - **The reach.** `onSample` depends on a sample only through its luminance, and a grid misses a
 *   narrow band of it. Every luminance is covered exactly when √((Y_max + 0.05) / (Y_min + 0.05))
 *   clears the floor over the colours a lightness move can reach. That is computed here from the
 *   candidates, independently of the search, for the four palettes; and for the 720 device palettes,
 *   where it does NOT hold on 222, the sample in each one's gap is drawn and answered.
 *
 * The decoys show none of it is vacuous: the drawn values unmoved do fail; a device palette's inks
 * do leave a gap; a sample one ink already passes is left alone; a move is the smallest one.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deltaE00, wcagContrast } from '@irodora/color-difference';
import { oklchToXyz, xyzToLab } from '@irodora/color-spaces';
import {
  BASE_THEMES,
  hexToOklch,
  ON_SAMPLE_FLOOR,
  onSample,
  paintedOver,
  parseManifest,
  smallestLightnessMove,
  themeFromSeed,
  THEMES,
} from '../src/index.js';
import { compositeEncoded, isInGamut, oklchToRgb, toHex } from '../src/derive.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = parseManifest(
  JSON.parse(
    readFileSync(
      join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
      'utf8',
    ),
  ) as unknown,
);

const rgbOf = (hex: string): readonly [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const contrast = (a: string, b: string): number => wcagContrast(rgbOf(a), rgbOf(b));
const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** WCAG relative luminance of an 8-bit hex. */
const luminance = (hex: string): number => {
  const [r, g, b] = rgbOf(hex).map(lin);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};
const labOf = (hex: string): readonly [number, number, number] => {
  const o = hexToOklch(hex);
  return xyzToLab(oklchToXyz([o.l, o.c, o.h]));
};

/** The sRGB gamut on a 0.05 grid, as hex. */
const GRID: readonly string[] = (() => {
  const out: string[] = [];
  for (let r = 0; r <= 20; r++)
    for (let g = 0; g <= 20; g++)
      for (let b = 0; b <= 20; b++) out.push(toHex([r / 20, g / 20, b / 20]));
  return out;
})();

/** A palette's two inks and its keyline over its well, as the sample family draws them. */
function drawn(colors: Readonly<Record<string, { readonly srgb: string } | undefined>>): {
  readonly inks: readonly [string, string];
  readonly keyline: string;
  readonly well: string;
} {
  const srgb = (name: string): string => {
    const v = colors[name]?.srgb;
    if (v === undefined) throw new Error(`no ${name}`);
    return v;
  };
  return {
    inks: [srgb('foreground'), srgb('inverse.foreground')],
    keyline: paintedOver(srgb('swatch.keyline'), srgb('swatch.well')),
    well: srgb('swatch.well'),
  };
}
const palette = (theme: (typeof THEMES)[number]): ReturnType<typeof drawn> =>
  drawn(MANIFEST.color[theme]);

/**
 * The luminances a lightness move of these candidates can reach, on the search's own grid (0.001
 * of OKLab L from the candidate, in gamut, drawn as 8-bit hex), and the floor every sample then
 * clears. Computed without calling the search.
 */
function reach(candidates: readonly string[]): {
  readonly low: number;
  readonly high: number;
  readonly floor: number;
} {
  let low = Infinity;
  let high = -Infinity;
  for (const hex of candidates) {
    const o = hexToOklch(hex);
    for (let units = -1000; units <= 1000; units += 1) {
      const l = o.l + units * 0.001;
      if (l < 0 || l > 1) continue;
      const rgb = oklchToRgb({ ...o, l });
      if (!isInGamut(rgb)) continue;
      const y = luminance(toHex(rgb));
      low = Math.min(low, y);
      high = Math.max(high, y);
    }
  }
  return { low, high, floor: Math.sqrt((high + 0.05) / (low + 0.05)) };
}

describe('the gamut scan: every sample, every palette', () => {
  it.each(THEMES)(
    '%s: text on any sample clears 4.5:1, and its edge clears 3:1',
    (theme) => {
      const { inks, keyline } = palette(theme);
      let textMoves = 0;
      let edgeMoves = 0;
      for (const sample of GRID) {
        const ink = onSample({ candidates: inks, sampleHex: sample, floor: ON_SAMPLE_FLOOR.text });
        expect(contrast(ink.hex, sample)).toBeGreaterThanOrEqual(4.5);
        if (ink.moved) textMoves++;
        const edge = onSample({
          candidates: [keyline],
          sampleHex: sample,
          floor: ON_SAMPLE_FLOOR.edge,
        });
        expect(contrast(edge.hex, sample)).toBeGreaterThanOrEqual(3);
        if (edge.moved) edgeMoves++;
      }
      // DECOY: what is drawn does fail somewhere, so the moves above were exercised, not assumed.
      expect(textMoves).toBeGreaterThan(0);
      expect(edgeMoves).toBeGreaterThan(0);
    },
    120_000,
  );
});

describe('the reach: every luminance, not only the grid', () => {
  it.each(THEMES)(
    '%s: a lightness move reaches every sample, for the text and the edge',
    (theme) => {
      const { inks, keyline, well } = palette(theme);
      expect(reach(inks).floor).toBeGreaterThanOrEqual(ON_SAMPLE_FLOOR.text);
      expect(reach([keyline]).floor).toBeGreaterThanOrEqual(ON_SAMPLE_FLOOR.edge);
      // Where an element draws no keyline, the line starts as the well.
      expect(reach([well]).floor).toBeGreaterThanOrEqual(ON_SAMPLE_FLOOR.edge);
    },
  );

  it('DECOY: pure white and black are not what a move reaches — the inks stop short of them', () => {
    // The argument this replaced said white and black clear 4.58:1 against anything. A move holds
    // chroma, so it never gets there: Sumi's inks reach 4.54, not 4.58.
    const { inks } = palette('dark');
    const { floor } = reach(inks);
    expect(floor).toBeGreaterThanOrEqual(4.5);
    expect(floor).toBeLessThan(4.58);
  });
});

/** A device palette's seed, as seed.test builds them. */
const seedAt = (h: number): { l: number; c: number; h: number } => {
  let c = 0.12;
  while (c > 0 && !isInGamut(oklchToRgb({ l: 0.55, c, h }))) c -= 0.002;
  return { l: 0.55, c: Math.round(c * 1000) / 1000, h };
};

/** 8-bit colours by luminance, to find one inside a band. */
const BY_LUMINANCE: readonly { readonly hex: string; readonly y: number }[] = (() => {
  const out: { hex: string; y: number }[] = [];
  for (let r = 0; r < 256; r += 3)
    for (let g = 0; g < 256; g += 3)
      for (let b = 0; b < 256; b += 3) {
        const hex = toHex([r / 255, g / 255, b / 255]);
        out.push({ hex, y: luminance(hex) });
      }
  return out.sort((a, b) => a.y - b.y);
})();

describe('a device palette, where the inks do not reach (step 2)', () => {
  it('answers the sample in every gap, holding the hue and giving up only chroma', () => {
    let gaps = 0;
    let answered = 0;
    for (const mode of BASE_THEMES)
      for (let h = 0; h < 360; h += 1) {
        const outcome = themeFromSeed(MANIFEST, mode, seedAt(h));
        if (outcome.kind !== 'applied') continue;
        const inks = drawn(outcome.colors).inks;
        const { low, high, floor } = reach(inks);
        if (floor >= ON_SAMPLE_FLOOR.text) continue;
        gaps += 1;
        // The band of luminance neither end of either ink clears.
        const from = (high + 0.05) / ON_SAMPLE_FLOOR.text - 0.05;
        const to = ON_SAMPLE_FLOOR.text * (low + 0.05) - 0.05;
        const sample = BY_LUMINANCE.find(({ y }) => y > from && y < to);
        if (sample === undefined) continue;
        const answer = onSample({ candidates: inks, sampleHex: sample.hex, floor: 4.5 });
        expect(contrast(answer.hex, sample.hex)).toBeGreaterThanOrEqual(4.5);
        expect(answer.chroma).toBeLessThan(1);
        expect(answer.chroma).toBeGreaterThanOrEqual(0.2);
        answered += 1;
      }
    // DECOY: the gap is real, on the count the source states, and it was exercised.
    expect(gaps).toBe(222);
    expect(answered).toBeGreaterThan(100);
  }, 120_000);

  it('holds a chromatic candidate’s hue — #FF0000 on #777777 stays red', () => {
    const answer = onSample({ candidates: ['#FF0000'], sampleHex: '#777777', floor: 4.5 });
    expect(contrast(answer.hex, '#777777')).toBeGreaterThanOrEqual(4.5);
    expect(answer.chroma).toBeLessThan(1);
    const hue = hexToOklch(answer.hex);
    expect(hue.c).toBeGreaterThan(0.02);
    expect(Math.abs(hue.h - hexToOklch('#FF0000').h)).toBeLessThan(2);
    // DECOY: the grey the old fallback drew (chroma dropped to 0) is farther from what was drawn.
    expect(deltaE00(labOf(answer.hex), labOf('#FF0000'))).toBeLessThan(
      deltaE00(labOf('#060606'), labOf('#FF0000')),
    );
  });
});

describe('nothing moves that did not have to', () => {
  const { inks, keyline } = palette('dark');

  it('leaves a sample an ink already passes alone — #4495A3 takes the dark ink unmoved', () => {
    expect(onSample({ candidates: inks, sampleHex: '#4495A3', floor: 4.5 })).toMatchObject({
      moved: false,
      from: 1,
      chroma: 1,
      hex: inks[1].toUpperCase(),
    });
  });

  it('moves the ink on a mid-tone neither clears (#87795D), and by the fewest steps any move takes', () => {
    const sample = '#87795D';
    expect(Math.max(contrast(inks[0], sample), contrast(inks[1], sample))).toBeLessThan(4.5);
    const moved = onSample({ candidates: inks, sampleHex: sample, floor: 4.5 });
    expect(moved.moved).toBe(true);
    expect(contrast(moved.hex, sample)).toBeGreaterThanOrEqual(4.5);
    // Every candidate, both directions, walked in full by the search itself: none passes sooner.
    for (const hex of inks)
      for (const direction of ['lighter', 'darker'] as const) {
        const token = {
          oklch: hexToOklch(hex),
          srgb: hex,
          role: 'probe',
          usage: 'nonText' as const,
          pairsWith: [],
        };
        const other = smallestLightnessMove({
          token,
          direction,
          space: 'oklab',
          passes: (c) => contrast(c.srgb, sample) >= 4.5,
          where: 'probe',
        });
        if (other === null) continue;
        expect(Math.round(Math.abs(other.oklch.l - token.oklch.l) * 1000)).toBeGreaterThanOrEqual(
          moved.steps,
        );
      }
    // And each in-gamut step short of it, from where it started, fails.
    const start = hexToOklch(inks[moved.from] ?? '');
    const toward = Math.sign(hexToOklch(moved.hex).l - start.l);
    for (let units = 1; units < moved.steps; units += 1) {
      const rgb = oklchToRgb({ ...start, l: start.l + toward * units * 0.001 });
      if (isInGamut(rgb)) expect(contrast(toHex(rgb), sample)).toBeLessThan(4.5);
    }
  });

  it('breaks an exact tie by ΔE00 — Slate’s keyline against #506074 goes dark, not light', () => {
    const slate = palette('slate.dark').keyline;
    const token = {
      oklch: hexToOklch(slate),
      srgb: slate,
      role: 'probe',
      usage: 'nonText' as const,
      pairsWith: [],
    };
    const both = (['lighter', 'darker'] as const).map((direction) =>
      smallestLightnessMove({
        token,
        direction,
        space: 'oklab',
        passes: (c) => contrast(c.srgb, '#506074') >= 3,
        where: 'probe',
      }),
    );
    const [light, dark] = both.map((m) => m?.srgb ?? '');
    // The tie: the same number of steps either way.
    const steps = both.map((m) => Math.round(Math.abs((m?.oklch.l ?? 0) - token.oklch.l) * 1000));
    expect(steps[0]).toBe(steps[1]);
    const answer = onSample({ candidates: [slate], sampleHex: '#506074', floor: 3 });
    expect(answer.hex).toBe(dark);
    // DECOY: the lighter line, which loop order alone would have drawn, is the farther one.
    expect(deltaE00(labOf(light ?? ''), labOf(slate))).toBeGreaterThan(
      deltaE00(labOf(dark ?? ''), labOf(slate)),
    );
  });

  it('draws the keyline unmoved against a sample it already edges', () => {
    // A pale sample: the drawn keyline (a dark grey over the well) clears 3:1 against it.
    expect(onSample({ candidates: [keyline], sampleHex: '#F0EDE6', floor: 3 }).moved).toBe(false);
  });
});

describe('a translucent colour is drawn over its ground the way the platform blends it', () => {
  it('composites rgba in encoded sRGB, and passes an opaque hex through', () => {
    const expected = toHex(compositeEncoded([1, 1, 1], 0.2, rgbOf('#20232A')));
    expect(paintedOver('rgba(255, 255, 255, 0.2)', '#20232A')).toBe(expected);
    expect(paintedOver('#ffffff33', '#20232A')).toBe(
      toHex(compositeEncoded([1, 1, 1], 0x33 / 255, rgbOf('#20232A'))),
    );
    expect(paintedOver('#5b6b78', '#20232A')).toBe('#5B6B78');
  });

  it('refuses to start from nothing', () => {
    expect(() => onSample({ candidates: [], sampleHex: '#808080', floor: 3 })).toThrow(
      /no candidate/u,
    );
  });
});
