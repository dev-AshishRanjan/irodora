/**
 * The one place a token becomes a renderable value.
 *
 * Two properties matter here and neither is obvious from reading the code: that a token
 * survives the round trip through sRGB, and that compositing happens in linear light. The
 * second has a decoy — the encoded-sRGB blend the function must NOT equal — because "we
 * composite in linear light" is exactly the kind of claim that passes review and is wrong in
 * the implementation [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deltaE00 } from '@irodora/color-difference';
import { srgbToXyz, xyzToLab, xyzToOklch, type Rgb } from '@irodora/color-spaces';
import { describe, expect, it } from 'vitest';
import {
  compositeOver,
  derivedSrgb,
  isInGamut,
  oklchToRgb,
  OutOfGamutError,
  parseManifest,
  resolveAll,
  THEMES,
  toHex,
  toRgbaString,
  tokenRgb,
  type ColorToken,
  type Manifest,
} from '../src/index.js';

const MANIFEST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'design',
  'design-system.manifest.json',
);

const raw: unknown = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const manifest: Manifest = parseManifest(raw);

const everyToken = (): { theme: string; name: string; token: ColorToken }[] =>
  THEMES.flatMap((theme) =>
    Object.entries(manifest.color[theme]).map(([name, token]) => ({ theme, name, token })),
  );

describe('gamut', () => {
  it('every token in the manifest fits inside sRGB', () => {
    // xyzToSrgb does not clamp — deliberately, so F-009 can see an out-of-gamut result. Here
    // that means an out-of-gamut token would silently become a clipped hex that no longer
    // matches its own OKLCh, which is exactly the drift ADR-0043 exists to end.
    for (const { theme, name, token } of everyToken())
      expect(isInGamut(oklchToRgb(token.oklch)), `${theme}.${name}`).toBe(true);
  });

  it('refuses an out-of-gamut token rather than clipping it', () => {
    // The decoy is a real colour: OKLCh chroma 0.37 at hue 145 is a green well outside sRGB,
    // not a nonsense coordinate. An impossible input would prove only that the guard rejects
    // impossible inputs.
    const outside: ColorToken = {
      oklch: { l: 0.86, c: 0.37, h: 145 },
      srgb: '#000000',
      role: 'decoy',
      usage: 'text',
      pairsWith: [],
    };
    expect(isInGamut(oklchToRgb(outside.oklch))).toBe(false);
    expect(() => tokenRgb('decoy', outside)).toThrow(OutOfGamutError);

    // The baseline: the same assertion must pass for a token that IS in gamut, or the test
    // above proves only that the function throws.
    const inside: ColorToken = { ...outside, oklch: { l: 0.86, c: 0.1, h: 145 } };
    expect(() => tokenRgb('baseline', inside)).not.toThrow();
  });
});

describe('round trip', () => {
  it('oklch -> sRGB -> oklch returns the same colour', () => {
    // The tolerance is on the 8-bit hex quantisation, not on the maths: a hex holds ~1/255
    // per channel, so a perceptible-but-tiny difference is expected and anything larger is
    // a defect. 0.5 ΔE00 is well under the ~2.3 just-noticeable difference.
    for (const { theme, name, token } of everyToken()) {
      if (token.oklch.alpha !== undefined) continue;
      const rgb = tokenRgb(name, token);
      const back = xyzToOklch(srgbToXyz(rgb));
      const delta = deltaE00(
        xyzToLab(srgbToXyz(rgb)),
        xyzToLab(srgbToXyz(oklchToRgb({ l: back[0], c: back[1], h: back[2] }))),
      );
      expect(delta, `${theme}.${name}`).toBeLessThan(0.5);
    }
  });

  it('the hex a token declares is the hex its own oklch derives (ADR-0043)', () => {
    for (const { theme, name, token } of everyToken())
      expect(derivedSrgb(name, token), `${theme}.${name}`).toBe(token.srgb);
  });
});

describe('compositing', () => {
  const white: Rgb = [1, 1, 1];
  const black: Rgb = [0, 0, 0];

  it('blends in linear light, not in encoded sRGB', () => {
    const result = compositeOver(white, 0.5, black);

    // 50% white over black is half the LIGHT, which is 0.5 in linear terms and ~0.7354
    // encoded — mid-grey #BCBCBC, not #808080. Averaging encoded sRGB is the most common
    // colour bug there is and it always reads too dark.
    // [[averaging-non-linear-srgb-reads-too-dark]]
    expect(toHex(result)).toBe('#BCBCBC');

    // The decoy: the wrong answer, computed the wrong way, asserted to be different. If the
    // implementation ever regresses to an encoded blend, this is what it would produce.
    const encodedBlend: Rgb = [0.5, 0.5, 0.5];
    expect(toHex(encodedBlend)).toBe('#808080');
    expect(toHex(result)).not.toBe(toHex(encodedBlend));
  });

  it('is the identity at alpha 1 and the backdrop at alpha 0', () => {
    // Not exact equality: alpha 1 still round-trips through the sRGB transfer function and
    // back, which lands on 0.9999999999999999. Asserting bit-equality here would be
    // asserting something about IEEE-754 rather than about compositing, and it would fail
    // for a correct implementation.
    for (const v of compositeOver(white, 1, black)) expect(v).toBeCloseTo(1, 12);
    for (const v of compositeOver(white, 0, black)) expect(v).toBeCloseTo(0, 12);
  });

  it('resolves a translucent token over every ground it declares', () => {
    const tokens = manifest.color.dark;
    const lookup = (name: string): ColorToken => {
      const t = tokens[name];
      if (t === undefined) throw new Error(`no token ${name}`);
      return t;
    };
    // `border`, the hairline — NOT `border.strong`, which F-070 made OPAQUE because a
    // translucent boundary reached only 1.17 against every surface. This test needs a token
    // that is genuinely translucent, and moving it is the point rather than a workaround.
    const border = lookup('border');
    const grounds = border.compositeOver ?? [];
    expect(grounds.length).toBeGreaterThan(1);

    // Two per ground: the linear blend and the encoded one. Neither model is uniformly
    // stricter, so both are produced and the caller takes the worst.
    const appearances = resolveAll('border', border, lookup);
    expect(appearances).toHaveLength(grounds.length * 2);
    expect(new Set(appearances.map((a) => a.model))).toEqual(new Set(['linear', 'encoded']));

    for (const { over, rgb } of appearances) {
      expect(over).not.toBeNull();
      const base = tokenRgb(over!, lookup(over!));
      // A 14% white overlay on a dark ground must land ABOVE the ground and BELOW pure
      // white. Bracketing rather than pinning a hex keeps this about the operation rather
      // than about the current value of any one surface.
      expect(rgb[0], `over ${String(over)}`).toBeGreaterThan(base[0]);
      expect(rgb[0], `over ${String(over)}`).toBeLessThan(1);
    }
  });

  it('the appearances differ between grounds, which is why one is not enough', () => {
    const tokens = manifest.color.light;
    const lookup = (name: string): ColorToken => {
      const t = tokens[name];
      if (t === undefined) throw new Error(`no token ${name}`);
      return t;
    };
    // The decoy for the whole worst-ground change: if every ground produced the same
    // appearance, checking all of them would be ceremony. In the light theme the same 8%
    // black hairline is measurably different on white than on a meter track.
    const appearances = resolveAll('border', lookup('border'), lookup);
    const hexes = new Set(appearances.map((a) => toHex(a.rgb)));
    expect(hexes.size).toBeGreaterThan(1);
  });
});

describe('string forms', () => {
  it('emits uppercase hex', () => {
    expect(toHex([1, 0.5, 0])).toBe('#FF8000');
  });

  it('emits rgba with integer channels and the alpha as authored', () => {
    expect(toRgbaString([1, 1, 1], 0.16)).toBe('rgba(255, 255, 255, 0.16)');
  });

  it('clamps only at the byte boundary, and only after the gamut check', () => {
    // toHex clamps because a byte cannot hold -0.001. That is a formatting concern; the
    // gamut check above is what makes sure clamping never hides a real out-of-gamut token.
    expect(toHex([-0.001, 1.001, 0.5])).toBe('#00FF80');
  });
});
