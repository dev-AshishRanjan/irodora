/**
 * Gamut mapping — the properties, and the algorithm this is not.
 *
 * The claim "we preserve hue" is untestable without something that does not. So the decoy
 * here is **per-channel clipping**, implemented in the test and measured: it is what almost
 * every other system does, it looks correct, and it moves hue by up to 33.6°. Without it,
 * nothing distinguishes a hue-preserving mapper from a clip
 * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
 */

import Color from 'colorjs.io';
import { describe, expect, it } from 'vitest';
import { createPrng } from '@irodora/testing';
import {
  displayP3ToXyz,
  gamutMap,
  gamutMapDetail,
  GAMUT_BISECTION_STEPS,
  GAMUT_EPSILON,
  isInGamut,
  isXyzInGamut,
  oklchToXyz,
  srgbToXyz,
  xyzToOklch,
  xyzToSrgb,
  type Rgb,
  type Xyz,
} from '../src/index.js';

const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** A spread of out-of-gamut colours, plus in-gamut ones, deterministic. */
function samples(): { xyz: Xyz; label: string }[] {
  const out: { xyz: Xyz; label: string }[] = [];
  const random = createPrng('gamut-f009');
  for (let i = 0; i < 400; i++) {
    const l = random.next();
    const c = random.between(0, 0.45);
    const h = random.between(0, 360);
    out.push({
      xyz: oklchToXyz([l, c, h]),
      label: `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`,
    });
  }
  for (const rgb of [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ] as const)
    out.push({ xyz: displayP3ToXyz(rgb), label: `p3(${rgb.join(',')})` });
  return out;
}

const cases = samples();
const outOfGamut = cases.filter((c) => !isXyzInGamut(c.xyz, 'srgb'));
const inGamut = cases.filter((c) => isXyzInGamut(c.xyz, 'srgb'));

describe('the sample set discriminates', () => {
  it('contains both in-gamut and out-of-gamut colours', () => {
    // Without this, every property below could pass on a set that never exercised the
    // mapping at all.
    expect(outOfGamut.length).toBeGreaterThan(50);
    expect(inGamut.length).toBeGreaterThan(50);
  });
});

describe('isInGamut', () => {
  it('accepts the unit cube and rejects outside it', () => {
    expect(isInGamut([0, 0, 0])).toBe(true);
    expect(isInGamut([1, 1, 1])).toBe(true);
    expect(isInGamut([0.5, 0.5, 1.0000001])).toBe(true); // within epsilon
    expect(isInGamut([0.5, 0.5, 1.01])).toBe(false);
    expect(isInGamut([-0.01, 0.5, 0.5])).toBe(false);
  });

  it('has an epsilon far below what a byte can express', () => {
    // A tolerance on the float round trip, not on colour. If it ever grew past 1/255 it
    // would start admitting colours that genuinely do not fit.
    expect(GAMUT_EPSILON).toBeLessThan(1 / 255 / 100);
  });
});

describe('mapping', () => {
  it('returns an in-gamut colour for every input', () => {
    for (const { xyz, label } of cases) expect(isInGamut(gamutMap(xyz, 'srgb')), label).toBe(true);
  });

  it('leaves an in-gamut colour bit-identical', () => {
    for (const { xyz, label } of inGamut) {
      const direct = xyzToSrgb(xyz);
      const mapped = gamutMap(xyz, 'srgb');
      expect(mapped, label).toEqual(direct);
    }
  });

  it('is idempotent — acceptance criterion 2', () => {
    for (const { xyz, label } of cases) {
      const once = gamutMap(xyz, 'srgb');
      const second = gamutMapDetail(srgbToXyz(once), 'srgb');

      // The mapping's own idempotence is the `wasInGamut` flag: a second pass must recognise
      // the first result as already displayable and take the early return. That IS bit-exact.
      expect(second.wasInGamut, label).toBe(true);

      // The VALUES are compared to 1e-12 rather than bit-identically, and the difference is
      // not the mapping: feeding the result back requires `srgbToXyz → xyzToSrgb`, and that
      // round trip is lossy at the last bit or two. Asserting `toEqual` here would be
      // asserting a property of the conversion, and it fails on ~2e-17 in a near-zero
      // channel — noise, dressed up as a mapping defect.
      for (const i of [0, 1, 2] as const)
        expect(Math.abs(second.rgb[i] - once[i]), label).toBeLessThan(1e-12);
    }
  });

  it('never increases chroma', () => {
    for (const { xyz, label } of cases) {
      const d = gamutMapDetail(xyz, 'srgb');
      expect(d.chromaAfter, label).toBeLessThanOrEqual(d.chromaBefore + 1e-12);
    }
  });

  it('preserves lightness and hue EXACTLY in OKLCh — the construction, not an approximation', () => {
    // Acceptance criterion 1's real content. Only `C` is varied, so `L` and `H` come through
    // untouched; the 1e-11 is the OKLCh round trip, not the mapping.
    let worst = 0;
    for (const { xyz } of outOfGamut) {
      const d = gamutMapDetail(xyz, 'srgb');
      if (d.wasInGamut || d.lightnessOutOfRange) continue;
      const [l, , h] = xyzToOklch(xyz);
      const back = xyzToOklch(oklchToXyz([l, d.chromaAfter, h]));
      worst = Math.max(worst, Math.abs(back[0] - l));
      if (d.chromaAfter > 1e-9) worst = Math.max(worst, hueGap(back[2], h));
    }
    expect(worst).toBeLessThan(1e-10);
  });

  it('and the STATED bound after rendering, which degrades near the black point', () => {
    // Rendering adds one thing: a final clamp of at most GAMUT_EPSILON per channel. Near
    // black that tiny absolute movement is a large RELATIVE one, and OKLCh hue at chroma
    // 1e-3 is not a meaningful angle — so the honest bound is a function of where the result
    // lands, and it is tabulated rather than asserted at one convenient cutoff.
    //
    //   result L,C >= 0.05   |ΔL| 1.2e-7   Δhue 6.9e-5°
    //   result L,C >= 0.01   |ΔL| 3.9e-6   Δhue 7.6e-3°
    //   unfiltered           |ΔL| 5.7e-4   Δhue 23°      ← all of it within 1e-7 of a channel
    const bounds: [number, number, number][] = [
      [0.05, 1e-6, 1e-3],
      [0.01, 1e-5, 1e-1],
    ];
    for (const [floor, lBound, hBound] of bounds) {
      let maxL = 0;
      let maxH = 0;
      let counted = 0;
      for (const { xyz } of outOfGamut) {
        const d = gamutMapDetail(xyz, 'srgb');
        if (d.lightnessOutOfRange) continue;
        const before = xyzToOklch(xyz);
        const after = xyzToOklch(srgbToXyz(d.rgb));
        if (after[0] < floor || after[1] < floor) continue;
        counted++;
        maxL = Math.max(maxL, Math.abs(before[0] - after[0]));
        maxH = Math.max(maxH, hueGap(before[2], after[2]));
      }
      const at = String(floor);
      expect(counted, `floor ${at} matched nothing`).toBeGreaterThan(100);
      expect(maxL, `|dL| above floor ${at}`).toBeLessThan(lBound);
      expect(maxH, `dHue above floor ${at}`).toBeLessThan(hBound);
    }
  });

  it('and the clamp — the only thing that moves a channel — stays within GAMUT_EPSILON', () => {
    // This is what makes the table above a consequence rather than a mystery. The mapping
    // itself never moves a channel; the clamp does, by at most one epsilon.
    let worst = 0;
    for (const { xyz } of outOfGamut) {
      const d = gamutMapDetail(xyz, 'srgb');
      if (d.wasInGamut || d.lightnessOutOfRange) continue;
      const [l, , h] = xyzToOklch(xyz);
      const unclamped = xyzToSrgb(oklchToXyz([l, d.chromaAfter, h]));
      for (const i of [0, 1, 2] as const)
        worst = Math.max(worst, Math.abs(unclamped[i] - d.rgb[i]));
    }
    expect(worst).toBeLessThanOrEqual(GAMUT_EPSILON);
  });

  it('uses a bisection fine enough for the output it feeds', () => {
    // 2^-32 of a chroma interval is far below 1/255. Asserted so that trimming the loop is a
    // failure rather than a silent loss of precision.
    expect(GAMUT_BISECTION_STEPS).toBeGreaterThanOrEqual(32);
    expect(0.4 / 2 ** GAMUT_BISECTION_STEPS).toBeLessThan(1e-9);
  });
});

describe('the cases that are not chroma reduction', () => {
  it('handles a colour outside in LIGHTNESS rather than looping to nothing', () => {
    const d = gamutMapDetail(oklchToXyz([1.2, 0.1, 120]), 'srgb');
    expect(d.lightnessOutOfRange).toBe(true);
    expect(isInGamut(d.rgb)).toBe(true);
    // The flag is not inferable from chromaAfter === 0 — a genuinely achromatic input also
    // ends at 0 — so it is asserted separately.
    const white = gamutMapDetail(srgbToXyz([1, 1, 1]), 'srgb');
    expect(white.chromaAfter).toBeLessThan(1e-6);
    expect(white.lightnessOutOfRange).toBe(false);
  });

  it('handles an achromatic colour without producing NaN', () => {
    for (const grey of [0, 0.25, 0.5, 0.75, 1]) {
      const d = gamutMapDetail(srgbToXyz([grey, grey, grey]), 'srgb');
      expect(d.rgb.every(Number.isFinite)).toBe(true);
      expect(d.wasInGamut).toBe(true);
    }
  });

  it('maps into Display-P3 as well as sRGB', () => {
    const wide = oklchToXyz([0.7, 0.4, 150]);
    expect(isXyzInGamut(wide, 'display-p3')).toBe(false);
    expect(isInGamut(gamutMap(wide, 'display-p3'))).toBe(true);
    // P3 is the larger gamut, so it must keep at least as much chroma as sRGB does.
    const p3 = gamutMapDetail(wide, 'display-p3');
    const srgb = gamutMapDetail(wide, 'srgb');
    expect(p3.chromaAfter).toBeGreaterThan(srgb.chromaAfter);
  });
});

describe('THE DECOY — what per-channel clipping does instead', () => {
  const clip = (rgb: Rgb): Rgb => [
    Math.min(1, Math.max(0, rgb[0])),
    Math.min(1, Math.max(0, rgb[1])),
    Math.min(1, Math.max(0, rgb[2])),
  ];

  it('clipping shifts hue, and by a lot', () => {
    let worst = 0;
    for (const { xyz } of outOfGamut) {
      const before = xyzToOklch(xyz);
      if (before[1] < 0.05) continue;
      const after = xyzToOklch(srgbToXyz(clip(xyzToSrgb(xyz))));
      worst = Math.max(worst, hueGap(before[2], after[2]));
    }
    // The wrong algorithm, measured. If this ever came out small, the hue-preservation
    // assertion above would be proving nothing and would need a different decoy.
    expect(worst).toBeGreaterThan(20);
  });

  it('and our mapping does not — same colours, same measurement', () => {
    // The baseline beside the decoy. [[a-decoy-that-is-not-broken-proves-nothing]]
    let worst = 0;
    let counted = 0;
    for (const { xyz } of outOfGamut) {
      const before = xyzToOklch(xyz);
      if (before[1] < 0.05) continue;
      const d = gamutMapDetail(xyz, 'srgb');
      if (d.lightnessOutOfRange) continue;
      const after = xyzToOklch(srgbToXyz(d.rgb));
      // Same floor as the stated bound: below it, OKLCh hue is not an angle for EITHER
      // algorithm, so comparing them there measures the coordinate system, not the mapping.
      if (after[0] < 0.05 || after[1] < 0.05) continue;
      counted++;
      worst = Math.max(worst, hueGap(before[2], after[2]));
    }
    expect(counted).toBeGreaterThan(100);
    expect(worst).toBeLessThan(1e-3);
  });
});

describe('the deliberate difference from CSS Color 4 (ADR-0045)', () => {
  it('disagrees with toGamut({method: "css"}), and in the direction the ADR claims', () => {
    // Not a bug being tolerated — a documented choice, pinned so that a future switch to the
    // CSS variant cannot happen by accident. CSS adds a MINDE early stop that returns the
    // CLIPPED colour once it is within a JND in ΔEok, and ΔEok tolerates hue movement.
    let maxTheirHueDrift = 0;
    let maxOurHueDrift = 0;
    for (const { xyz } of outOfGamut.slice(0, 60)) {
      const before = xyzToOklch(xyz);
      if (before[1] < 0.05) continue;

      const css = new Color('xyz-d65', [xyz[0], xyz[1], xyz[2]])
        .toGamut({ space: 'srgb', method: 'css' })
        .to('srgb').coords as [number, number, number];
      maxTheirHueDrift = Math.max(
        maxTheirHueDrift,
        hueGap(before[2], xyzToOklch(srgbToXyz(css))[2]),
      );

      const d = gamutMapDetail(xyz, 'srgb');
      if (d.lightnessOutOfRange) continue;
      const after = xyzToOklch(srgbToXyz(d.rgb));
      if (after[0] < 0.05 || after[1] < 0.05) continue;
      maxOurHueDrift = Math.max(maxOurHueDrift, hueGap(before[2], after[2]));
    }
    expect(maxTheirHueDrift).toBeGreaterThan(1);
    expect(maxOurHueDrift).toBeLessThan(1e-3);
  });
});
