/**
 * The CVD preview's arithmetic is the engine's, and nothing else (F-240, ADR-0131).
 *
 * - **Equal to the engine**, for every token of every declared palette, in every mode.
 * - **Machado at full severity**, held against the matrix Chrome publishes for its deuteranopia
 *   preview, with a lower severity as the decoy.
 * - **It commutes with compositing**, which is why a token-layer preview is honest about
 *   translucent paint; Viénot's projection, the engine's other model, is the decoy that does not.
 * - **Formats and alpha are kept**, and a format it cannot read is refused, never passed through.
 */

import { describe, expect, it } from 'vitest';
import {
  machadoMatrix,
  simulateAnomalous,
  simulateDichromacy,
  type Deficiency,
} from '@irodora/cvd-engine';
import { srgbToHex } from '@irodora/color-spaces';
import {
  CVD_SEVERITY,
  nativeColors,
  PREVIEW_DEFICIENCY,
  PREVIEW_MODES,
  simulatePaint,
  simulatePalette,
  THEMES,
  type PreviewMode,
} from '../src/index.js';
import { compositeEncoded } from '../src/derive.js';

type Rgb = readonly [number, number, number];
const SIMULATED = PREVIEW_MODES.filter(
  (m): m is Exclude<PreviewMode, 'standard'> => m !== 'standard',
);

const rgbOf = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** A seeded generator, so a failure names the colour that failed and reruns identically. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('the modes are 15’s, and each runs one deficiency', () => {
  it('lists Standard and the three -opias in 15’s order', () => {
    expect(PREVIEW_MODES).toStrictEqual(['standard', 'protanopia', 'deuteranopia', 'tritanopia']);
    expect(PREVIEW_DEFICIENCY).toStrictEqual({
      protanopia: 'protan',
      deuteranopia: 'deutan',
      tritanopia: 'tritan',
    });
  });
});

describe('the preview is the engine, for every token of every palette', () => {
  it('leaves Standard exactly as it was — the same string, the same object', () => {
    const palette = nativeColors.dark;
    expect(simulatePalette(palette, 'standard')).toBe(palette);
    for (const value of Object.values(palette))
      expect(simulatePaint(value, 'standard')).toBe(value);
  });

  it('equals simulateAnomalous at full severity, token by token, in every mode', () => {
    let checked = 0;
    for (const theme of THEMES)
      for (const mode of SIMULATED) {
        const deficiency = PREVIEW_DEFICIENCY[mode];
        const painted = simulatePalette(nativeColors[theme], mode);
        for (const [token, value] of Object.entries(nativeColors[theme])) {
          const rgba = /^rgba\((\d+), (\d+), (\d+), (.+)\)$/u.exec(value);
          const expected =
            rgba === null
              ? srgbToHex(simulateAnomalous(rgbOf(value), deficiency, 1))
              : (() => {
                  const out = simulateAnomalous(
                    [Number(rgba[1]) / 255, Number(rgba[2]) / 255, Number(rgba[3]) / 255],
                    deficiency,
                    1,
                  ).map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
                  return `rgba(${out.join(', ')}, ${rgba[4] ?? ''})`;
                })();
          expect({
            [`${theme}.${mode}.${token}`]: painted[token as keyof typeof painted],
          }).toStrictEqual({
            [`${theme}.${mode}.${token}`]: expected,
          });
          checked += 1;
        }
      }
    // Four palettes, three modes, and every token in each: an empty loop would agree with anything.
    expect(checked).toBeGreaterThan(4 * 3 * 30);
  });

  it('runs at the engine’s full severity, the model’s dichromacy case', () => {
    expect(CVD_SEVERITY).toBe(1);
  });

  it('memoises one palette per source and mode, so identity is stable across renders', () => {
    const palette = nativeColors.light;
    expect(simulatePalette(palette, 'protanopia')).toBe(simulatePalette(palette, 'protanopia'));
    expect(simulatePalette(palette, 'protanopia')).not.toBe(
      simulatePalette(palette, 'deuteranopia'),
    );
  });
});

describe('Machado at full severity is the matrix the browsers ship (ADR-0131 §1)', () => {
  /** The matrix the preview applies, read back through the engine one basis colour at a time. */
  const applied = (deficiency: Deficiency, severity: number): number[] => {
    const columns = (
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as const
    ).map((e) => simulateAnomalous(e, deficiency, severity));
    // Row-major: row r is the r-th channel of each column.
    return [0, 1, 2].flatMap((r) => columns.map((c) => c[r] ?? Number.NaN));
  };
  // Chrome's *Simulating CVD in Blink* (developer.chrome.com/docs/chromium/cvd), its deuteranopia
  // feColorMatrix, sourced there to Machado, Oliveira and Fernandes. Chrome prints three decimals.
  const CHROME_DEUTERANOPIA = [0.367, 0.861, -0.228, 0.28, 0.673, 0.047, -0.012, 0.043, 0.969];
  const at3 = (xs: readonly number[]): number[] => xs.map((x) => Math.round(x * 1000) / 1000);

  it('applies Chrome’s published deuteranopia matrix, to its three decimals', () => {
    expect(at3(applied(PREVIEW_DEFICIENCY.deuteranopia, CVD_SEVERITY))).toStrictEqual(
      CHROME_DEUTERANOPIA,
    );
    // And it is the engine's own table, read the same way.
    expect(at3(machadoMatrix('deutan', 1))).toStrictEqual(CHROME_DEUTERANOPIA);
  });

  it('DECOY — at severity 0.9 the same model is not Chrome’s matrix', () => {
    expect(at3(applied('deutan', 0.9))).not.toStrictEqual(CHROME_DEUTERANOPIA);
  });

  it('DECOY — Viénot’s dichromacy is a different simulation, for protan and deutan alike', () => {
    const sample: Rgb = [0.8, 0.3, 0.2];
    for (const [mode, deficiency] of [
      ['protanopia', 'protan'],
      ['deuteranopia', 'deutan'],
    ] as const) {
      const preview = simulatePaint(srgbToHex(sample), mode);
      expect(preview).not.toBe(srgbToHex(simulateDichromacy(sample, deficiency)));
    }
  });
});

describe('it commutes with compositing, so a token layer is honest about translucency', () => {
  const random = lcg(240);
  const cases = Array.from({ length: 400 }, () => {
    const a: Rgb = [random(), random(), random()];
    const b: Rgb = [random(), random(), random()];
    return { a, b, alpha: random() };
  });
  const inRange = (rgb: Rgb): boolean => rgb.every((v) => v >= 0 && v <= 1);
  const apart = (x: Rgb, y: Rgb): number => Math.max(...x.map((v, i) => Math.abs(v - (y[i] ?? 0))));

  it.each(SIMULATED)(
    '%s: simulating each paint, then blending, equals blending, then simulating',
    (mode) => {
      const deficiency = PREVIEW_DEFICIENCY[mode];
      const sim = (rgb: Rgb): Rgb => simulateAnomalous(rgb, deficiency, CVD_SEVERITY);
      let measured = 0;
      for (const { a, b, alpha } of cases) {
        const blendThenSim = sim(compositeEncoded(a, alpha, b));
        const simThenBlend = compositeEncoded(sim(a), alpha, sim(b));
        // Where nothing clips: clipping is the one place a matrix stops being linear.
        if (!inRange(sim(a)) || !inRange(sim(b)) || !inRange(blendThenSim)) continue;
        expect(apart(blendThenSim, simThenBlend)).toBeLessThan(1 / 255);
        measured += 1;
      }
      expect(measured).toBeGreaterThan(cases.length / 4);
    },
  );

  it('DECOY — Viénot’s projection in linear light does not commute', () => {
    const sim = (rgb: Rgb): Rgb => simulateDichromacy(rgb, 'protan');
    const gaps = cases.map(({ a, b, alpha }) =>
      apart(sim(compositeEncoded(a, alpha, b)), compositeEncoded(sim(a), alpha, sim(b))),
    );
    // Not a rare edge: measured on these 400 blends, 46.5 % come out more than a level apart.
    expect(gaps.filter((g) => g > 1 / 255).length / cases.length).toBeGreaterThan(0.4);
    // And not by a hair: the worst is many levels off.
    expect(Math.max(...gaps)).toBeGreaterThan(10 / 255);
  });
});

describe('formats and alpha are kept, and an unreadable format is refused', () => {
  it('keeps #RRGGBBAA’s alpha and rgba()’s alpha exactly as written', () => {
    expect(simulatePaint('#C0392B80', 'protanopia')).toMatch(/^#[0-9A-F]{6}80$/u);
    expect(simulatePaint('rgba(26, 27, 30, 0.09411764705882353)', 'tritanopia')).toMatch(
      /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, 0\.09411764705882353\)$/u,
    );
    expect(simulatePaint('transparent', 'deuteranopia')).toBe('transparent');
  });

  it.each(['red', '#FFF', 'hsl(0, 0%, 50%)', 'rgb(1, 2, 3)', ''])(
    'refuses %j rather than pass it through unsimulated',
    (css) => {
      expect(() => simulatePaint(css, 'protanopia')).toThrow(TypeError);
    },
  );

  it('leaves a grey grey, within one level', () => {
    for (const level of [0, 32, 128, 200, 255])
      for (const mode of SIMULATED) {
        const hex = `#${level.toString(16).padStart(2, '0').repeat(3)}`.toUpperCase();
        for (const channel of rgbOf(simulatePaint(hex, mode)))
          expect(Math.abs(channel * 255 - level)).toBeLessThanOrEqual(1);
      }
  });

  it('returns a colour for any colour, in every mode', () => {
    const random = lcg(720);
    for (let i = 0; i < 720; i += 1) {
      const hex = srgbToHex([random(), random(), random()]);
      for (const mode of SIMULATED) expect(simulatePaint(hex, mode)).toMatch(/^#[0-9A-F]{6}$/u);
    }
  });
});
