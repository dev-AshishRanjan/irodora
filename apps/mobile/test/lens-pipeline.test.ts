/**
 * The capture pipeline the working state shows (F-236; ADR-0128 D4 and D5).
 *
 * - **D65 at its published temperature.** `D65_CCT_K` is held against McCamy's cubic from the
 *   engine's own D65 chromaticity, so the figure cannot drift from the white the engine converts
 *   under; `27`'s 5500 K and D55's chromaticity are the decoys.
 * - **The steps are the pipeline's**: a camera frame, then the conversion, and the ring's value is
 *   the share of them done. A photograph has no working state (F-236's review, B1).
 * - **The conversion's words name the engine's illuminant**, appended to the copy with each
 *   script's own separator, in both languages.
 */

import { CANONICAL_ILLUMINANT, CANONICAL_WHITE } from '@irodora/color-spaces';
import { t } from '../src/i18n';
import {
  CAPTURE_STEPS,
  D65_CCT_K,
  pipelineProgress,
  progressText,
  stepText,
} from '../src/lens/pipeline';

/**
 * McCamy's approximation of correlated colour temperature from CIE 1931 chromaticity (McCamy,
 * *Color Research & Application* 17 (1992) 142–144): within about 2 K across 2856–6504 K.
 */
const mccamy = (x: number, y: number): number => {
  const n = (x - 0.332) / (0.1858 - y);
  return 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33;
};
const chromaticity = ([X, Y, Z]: readonly [number, number, number]): [number, number] => [
  X / (X + Y + Z),
  Y / (X + Y + Z),
];

describe('D65 at its published temperature', () => {
  const [x, y] = chromaticity(CANONICAL_WHITE);

  it('is the canonical white the engine converts under', () => {
    expect(CANONICAL_ILLUMINANT).toBe('D65');
    expect(x).toBeCloseTo(0.3127, 4);
    expect(y).toBeCloseTo(0.329, 4);
  });

  it('agrees with McCamy’s approximation from the engine’s own chromaticity, within 2 K', () => {
    expect(Math.abs(mccamy(x, y) - D65_CCT_K)).toBeLessThan(2);
  });

  it('DECOY — 27’s 5500 K is a thousand kelvin off, and D55’s chromaticity gives D55', () => {
    expect(Math.abs(mccamy(x, y) - 5500)).toBeGreaterThan(900);
    // CIE D55: x = 0.33242, y = 0.34743.
    const d55 = mccamy(0.33242, 0.34743);
    expect(Math.abs(d55 - 5503)).toBeLessThan(3);
    expect(Math.abs(d55 - D65_CCT_K)).toBeGreaterThan(900);
  });
});

describe('the steps are the pipeline’s', () => {
  it('waits for a camera frame, then converts — and names no photo step, since none waits', () => {
    expect(CAPTURE_STEPS).toStrictEqual(['frame', 'convert']);
  });

  it('shows the share of steps done, and refuses a count that is not one', () => {
    expect([0, 1, 2].map((done) => pipelineProgress(CAPTURE_STEPS, done))).toStrictEqual([
      0, 0.5, 1,
    ]);
    for (const done of [-1, 0.5, 3, Number.NaN])
      expect(() => pipelineProgress(CAPTURE_STEPS, done)).toThrow(RangeError);
  });

  it('says which step is under way, out of how many', () => {
    const say = (key: Parameters<typeof t>[1]): string => t('en', key);
    expect(progressText(CAPTURE_STEPS, 0, say)).toBe('Step 1 / 2');
    expect(progressText(CAPTURE_STEPS, 2, say)).toBe('Step 2 / 2');
  });
});

describe('the conversion names the engine’s white, in both languages', () => {
  it.each(['en', 'ja'] as const)('appends D65 and its temperature to the %s copy', (locale) => {
    const script = locale === 'ja' ? 'japanese' : 'latin';
    const text = stepText('convert', (key) => t(locale, key), script);
    // Each script's own colon, as the refusal's: full-width and unspaced in Japanese (M5).
    const colon = locale === 'ja' ? '：' : ': ';
    expect(text).toBe(`${t(locale, 'lens.pipeline.convert')}${colon}D65 (6504K)`);
    // DECOY — neither the drawn 5500 K nor a spectrum reaches the words.
    expect(text).not.toMatch(/5500|spectr|スペクトル/u);
  });

  it('DECOY — the ASCII colon is not the Japanese separator', () => {
    expect(stepText('convert', (key) => t('ja', key), 'japanese')).not.toContain(': ');
  });

  it('says the step under way', () => {
    expect(stepText('frame', (key) => t('en', key), 'latin')).toBe('Waiting for a camera frame…');
  });
});
