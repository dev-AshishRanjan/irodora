/**
 * Gate 5 — gamut mapping.
 *
 * **The expected values in this dataset are our own output, and that is why the assertions
 * below are shaped the way they are.** A golden set assembled by pasting your own results
 * proves only that the code still agrees with itself, so each entry is checked against two
 * things it could not have produced:
 *
 * 1. **The boundary property.** The result is in gamut, and one bisection step MORE chroma
 *    is not. That is the definition of "the largest chroma that fits", so any correct
 *    chroma-reduction mapper reproduces it — including one written by someone else.
 * 2. **An independent implementation of the same algorithm** — `culori`'s `clampChroma`.
 *
 * Neither alone is enough. The boundary property would pass for a mapper that also moved
 * hue; the oracle would pass for two implementations sharing a mistake
 * [[two-oracles-agreeing-against-you-is-evidence-about-you]]. Together with the hue and
 * lightness assertions they pin the answer.
 *
 * **This dataset is deliberately NOT checked against `colorjs.io`'s `toGamut({method:
 * 'css'})`.** That is a different algorithm — CSS Color 4 with its MINDE early stop — and it
 * disagrees with this one by up to 5.21 ΔE00. The disagreement is the subject of ADR-0045
 * and is asserted, with its direction, in `gamut.test.ts`.
 */

import { clampChroma, converter } from 'culori';
import { describe, expect, it } from 'vitest';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/gamut.golden.json' with { type: 'json' };
import {
  gamutMapDetail,
  isInGamut,
  oklchToXyz,
  srgbToXyz,
  xyzToOklch,
  xyzToSrgb,
  type Rgb,
} from '../../src/index.js';

const dataset = assertGoldenDataset(raw, 'gamut');
const toRgb = converter('rgb');

interface Input {
  readonly oklch: [number, number, number];
}
interface Expected {
  readonly rgb: [number, number, number];
  readonly chromaAfter: number;
  readonly wasInGamut: boolean;
  readonly lightnessOutOfRange: boolean;
}

const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe('gamut golden dataset', () => {
  it('has entries, and every one of them cites a source', () => {
    // assertGoldenDataset enforces the citation; this pins the count so an entry cannot be
    // quietly dropped to make the suite pass.
    expect(dataset.entries).toHaveLength(14);
  });

  for (const entry of dataset.entries) {
    const input = entry.input as Input;
    const expected = entry.expected as Expected;

    describe(entry.id, () => {
      const xyz = oklchToXyz(input.oklch);
      const detail = gamutMapDetail(xyz, 'srgb');

      it('reproduces the recorded value', () => {
        for (const i of [0, 1, 2] as const)
          expect(detail.rgb[i]).toBeCloseTo(expected.rgb[i], -Math.log10(entry.tolerance));
        expect(detail.wasInGamut).toBe(expected.wasInGamut);
        expect(detail.lightnessOutOfRange).toBe(expected.lightnessOutOfRange);
      });

      it('is in gamut', () => {
        expect(isInGamut(detail.rgb)).toBe(true);
      });

      it('sits ON the boundary — one step more chroma does not fit', () => {
        // The assertion that makes this dataset evidence rather than a snapshot. Skipped
        // only where there is no boundary to sit on: an in-gamut colour was not moved, and a
        // colour outside in lightness has no chroma that fits.
        if (detail.wasInGamut || detail.lightnessOutOfRange) return;
        const more = xyzToSrgb(oklchToXyz([input.oklch[0], detail.chromaAfter * 1.02, input.oklch[2]]));
        expect(isInGamut(more), 'more chroma should NOT fit').toBe(false);
      });

      it('preserves lightness and hue', () => {
        if (detail.lightnessOutOfRange) return;
        const after = xyzToOklch(srgbToXyz(detail.rgb));
        expect(Math.abs(after[0] - input.oklch[0])).toBeLessThan(1e-6);
        // Hue is meaningless at chroma 0, so it is only asserted where there is chroma.
        if (detail.chromaAfter > 1e-6)
          expect(hueGap(after[2], input.oklch[2])).toBeLessThan(1e-3);
      });

      it('agrees with culori clampChroma, an independent implementation', () => {
        if (detail.lightnessOutOfRange) return;
        const c = toRgb(
          clampChroma(
            { mode: 'oklch', l: input.oklch[0], c: input.oklch[1], h: input.oklch[2] },
            'oklch',
            'rgb',
          ),
        );
        const theirs: Rgb = [c.r, c.g, c.b];
        // 2e-3 per channel. culori bisects to its OWN precision — it stops at an epsilon
        // of 1e-4 in chroma where we run 32 halvings — so the two land a fraction of a byte
        // apart. Still tight enough that a different ALGORITHM fails it by a wide margin:
        // CSS MINDE differs from us by up to 5.21 dE00, and a clip by more.
        for (const i of [0, 1, 2] as const) expect(Math.abs(detail.rgb[i] - theirs[i])).toBeLessThan(2e-3);
      });
    });
  }
});
