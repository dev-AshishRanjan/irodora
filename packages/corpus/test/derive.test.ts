/**
 * Derived corpus values — the destination end of E-001.
 *
 * The expected values here are **published**, not captured from our own output. CIE 15:2018
 * fixes L* for the reference white and for a known reflectance; sRGB's own definition fixes
 * what `#FFFFFF` and `#808080` are. A derivation test that compares our generator to our
 * engine is a test of self-agreement, and it would stay green through the exact change E-001
 * exists to catch.
 *
 * The values that genuinely have no published table — a gamut-mapped hex — are asserted
 * against their DEFINITION instead, the same way F-009's gamut dataset is.
 */

import {
  displayP3ToXyz,
  srgbToHex,
  srgbToXyz,
  xyzToLab,
  xyzToOklch,
  xyzToSrgb,
  type Triple,
} from '@irodora/color-spaces';
import { describe, expect, it } from 'vitest';
import { deriveColor, hexToXyz } from '../src/index.js';

/** The Display-P3 corners — the colours furthest outside sRGB, so the mapping has real work. */
const P3_CORNERS: readonly Triple[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, 0, 1],
  [0, 1, 1],
];

/** Shortest angular distance in degrees. 359° and 1° are two degrees apart, not 358. */
function hueDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** CIELAB hue angle in degrees, from a Lab triple. */
function labHue(lab: Triple): number {
  return (Math.atan2(lab[2], lab[1]) * 180) / Math.PI;
}

describe('published anchors', () => {
  it('the reference white has L* = 100 and no chroma (CIE 15:2018)', () => {
    const d = deriveColor(srgbToXyz([1, 1, 1]));
    expect(d.lab[0]).toBeCloseTo(100, 10);
    expect(d.lab[1]).toBeCloseTo(0, 10);
    expect(d.lab[2]).toBeCloseTo(0, 10);
    expect(d.hex).toBe('#FFFFFF');
  });

  it('black is the origin', () => {
    const d = deriveColor([0, 0, 0]);
    expect(d.lab).toEqual([0, 0, 0]);
    expect(d.hex).toBe('#000000');
  });

  it('sRGB 50% grey round-trips to #808080', () => {
    // 0.5 * 255 = 127.5, and the byte encoding rounds half away from zero. This pins the
    // rounding rule, which is the part a reimplementation gets wrong.
    expect(deriveColor(srgbToXyz([0.5, 0.5, 0.5])).hex).toBe('#808080');
  });

  it('a neutral grey has zero a* and b*, whatever its lightness', () => {
    for (const v of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const d = deriveColor(srgbToXyz([v, v, v]));
      expect(d.lab[1]).toBeCloseTo(0, 9);
      expect(d.lab[2]).toBeCloseTo(0, 9);
      expect(d.oklch[1]).toBeCloseTo(0, 6);
    }
  });
});

describe('lch is lab in polar form', () => {
  it('agrees with lab by construction, for every hue', () => {
    for (const rgb of [
      [0.8, 0.2, 0.2],
      [0.2, 0.8, 0.2],
      [0.2, 0.2, 0.8],
      [0.7, 0.7, 0.1],
    ] as const) {
      const d = deriveColor(srgbToXyz([...rgb] as unknown as Triple));
      expect(d.lch[0]).toBeCloseTo(d.lab[0], 10);
      expect(d.lch[1]).toBeCloseTo(Math.hypot(d.lab[1], d.lab[2]), 8);
    }
  });
});

describe('a colour that fits in sRGB', () => {
  it('reports zero render error and no mapping', () => {
    const d = deriveColor(srgbToXyz([0.32, 0.41, 0.42]));
    expect(d.inSrgbGamut).toBe(true);
    expect(d.renderDeltaE00).toBe(0);
    expect(d.lightnessOutOfRange).toBe(false);
  });
});

describe('a colour that does not fit in sRGB', () => {
  const p3red = displayP3ToXyz([1, 0, 0]);

  it('is flagged rather than silently approximated', () => {
    const d = deriveColor(p3red);
    expect(d.inSrgbGamut).toBe(false);
  });

  it('carries the number that "closest digital reference" rests on', () => {
    // ADR-0031: the phrase is only honest if there is a measurement behind it. A positive
    // ΔE00 is that measurement; zero here would mean the flag and the number disagree.
    const d = deriveColor(p3red);
    expect(d.renderDeltaE00).toBeGreaterThan(0);
  });

  it('preserves OKLCh hue where per-channel clipping does not', () => {
    // The claim is a COMPARISON, not an assertion: a bound with nothing beside it says
    // nothing about whether the algorithm earned it [[a-decoy-that-is-not-broken-proves-nothing]].
    // The decoy is per-channel clipping — what almost everything else does.
    //
    // Measured over the six Display-P3 primaries and secondaries, after the byte rounding a
    // hex imposes:
    //
    //   | max OKLCh hue drift | ours   | clipping |
    //   |---------------------|--------|----------|
    //   |                     | 0.167° | 3.150°   |
    //
    // Our residual is byte rounding, not the algorithm: F-009 measured the mapping itself at
    // 2.6e-5 degrees before a hex is involved.
    let worstOurs = 0;
    let worstClipped = 0;

    for (const p3 of P3_CORNERS) {
      const xyz = displayP3ToXyz(p3);
      const trueHue = xyzToOklch(xyz)[2];

      const ours = xyzToOklch(hexToXyz(deriveColor(xyz).hex))[2];

      const raw = xyzToSrgb(xyz);
      const clamp = (v: number): number => Math.min(1, Math.max(0, v));
      const clippedRgb: Triple = [clamp(raw[0]), clamp(raw[1]), clamp(raw[2])];
      const clipped = xyzToOklch(hexToXyz(srgbToHex(clippedRgb)))[2];

      worstOurs = Math.max(worstOurs, hueDelta(trueHue, ours));
      worstClipped = Math.max(worstClipped, hueDelta(trueHue, clipped));
    }

    expect(worstOurs).toBeLessThan(0.5);
    expect(worstClipped).toBeGreaterThan(3);
    expect(worstOurs).toBeLessThan(worstClipped / 10);
  });

  it('does NOT claim to preserve CIELAB hue — and the measurement says why', () => {
    // Recorded rather than hidden, because the first version of this file asserted a CIELAB
    // bound, guessed it at 6 degrees, and was wrong at 7.97. Investigating produced something
    // more useful than a corrected constant:
    //
    //   | max hue drift over the P3 corners | ours   | clipping |
    //   |-----------------------------------|--------|----------|
    //   | OKLCh                             | 0.167° | 3.150°   |
    //   | CIELAB                            | 7.966° | 5.206°   |
    //
    // In CIELAB, clipping looks BETTER than we do. That is not an algorithm failure — it is
    // CIELAB and OKLab disagreeing about what "the same hue" means, most sharply in exactly
    // the blue-red region the P3 primaries occupy, which is the reason OKLab exists.
    // `gamutMap` holds OKLCh hue by construction (ADR-0045), so OKLCh is the metric that
    // describes what it does. Asserting the CIELAB figure would be picking the ruler that
    // flatters us, in the one direction that matters.
    const d = deriveColor(p3red);
    const trueLabHue = labHue(d.lab);
    const renderedLabHue = labHue(xyzToLab(hexToXyz(d.hex)));
    expect(hueDelta(trueLabHue, renderedLabHue)).toBeGreaterThan(6);
  });

  it('reports lightnessOutOfRange separately from chroma reduction', () => {
    // "We reduced saturation" is the wrong sentence for a colour that is out of range in
    // lightness, and the flag exists so a caller cannot infer the wrong one.
    expect(deriveColor(p3red).lightnessOutOfRange).toBe(false);
  });
});

describe('hexToXyz', () => {
  it('round-trips every derived hex back into its own rendered colour', () => {
    for (const rgb of [
      [0, 0, 0],
      [1, 1, 1],
      [0.32, 0.41, 0.42],
      [0.9, 0.1, 0.4],
    ] as const) {
      const d = deriveColor(srgbToXyz([...rgb] as unknown as Triple));
      const back = deriveColor(hexToXyz(d.hex));
      expect(back.hex).toBe(d.hex);
    }
  });

  it('accepts a hex with or without the hash', () => {
    expect(hexToXyz('#526A6B')).toEqual(hexToXyz('526A6B'));
  });

  it('rejects anything that is not #RRGGBB', () => {
    for (const bad of ['#FFF', 'FFFFFG', '#12345', 'rgb(0,0,0)', ''])
      expect(() => hexToXyz(bad)).toThrow(TypeError);
  });
});

describe('determinism', () => {
  it('two runs over the same xyz produce identical values', () => {
    const xyz = srgbToXyz([0.32, 0.41, 0.42]);
    expect(deriveColor(xyz)).toEqual(deriveColor(xyz));
  });
});
