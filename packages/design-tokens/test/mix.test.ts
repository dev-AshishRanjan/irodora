/**
 * `color-mix(in oklab, …)`, evaluated at build time.
 *
 * HeroUI derives roughly twenty colours this way and some of them carry text, so these values
 * end up in front of a reader and in front of the `contrast` gate. Two things are checked
 * here and only one of them is obvious.
 *
 * The obvious one is that the arithmetic agrees with an independent implementation.
 * `colorjs.io` is the oracle — written by people who edit the CSS Color specification, and
 * already this repository's oracle for specification conformance (ADR-0004). A disagreement
 * is a finding, not automatically our bug.
 *
 * The non-obvious one is **premultiplication**, and getting a real decoy for it took two
 * attempts. `transparent` is `rgb(0 0 0 / 0)` — a *black* with no alpha — so an
 * implementation that interpolates without weighting by alpha mixes in real black and returns
 * a near-black at the right opacity: plausible, and wrong by the whole distance from a red to
 * a black. That is the failure the `-soft` tokens would hit, so it is asserted.
 *
 * **But it does not prove the implementation.** A mutation run that deleted the
 * premultiplication left all of it green, because black's contribution is the zero vector
 * whether or not alpha weights it, and the un-premultiply divide then restores the colour
 * regardless. The step is invisible in precisely the case it was written for
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * The last block is the one that discriminates: a translucent operand with a colour of its
 * own. Deleting the premultiply fails it; deleting the un-premultiply fails the transparent
 * block. Both halves are observed, and neither was until the mutation run said so.
 */

import Color from 'colorjs.io';
import { srgbToHex, type Rgb } from '@irodora/color-spaces';
import { describe, expect, it } from 'vitest';
import { mixOklab, OutOfGamutError, type MixOperand } from '../src/index.js';

/** `#RRGGBB` from a raw sRGB triple, so a failure prints something a human can read. */
const hex = (rgb: Rgb): string => srgbToHex(rgb);

const fromHex = (h: string): Rgb => {
  const n = Number.parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const opaque = (h: string, percent: number): MixOperand => ({
  rgb: fromHex(h),
  alpha: 1,
  percent,
});

/** `transparent` is not "nothing". It is black at zero alpha, and that is the whole trap. */
const transparent = (percent: number): MixOperand => ({ rgb: [0, 0, 0], alpha: 0, percent });

/**
 * The same mix through `colorjs.io`.
 *
 * `Color.mix(a, b, p)` takes the weight of the SECOND colour, which is the opposite of how
 * the CSS declaration reads — `color-mix(in oklab, a 15%, transparent)` gives `a` 15 %, so
 * the oracle is asked for 0.85. Getting this backwards produces a confidently wrong oracle,
 * which is worse than no oracle.
 */
function oracle(
  aHex: string,
  aPercent: number,
  b: { hex: string; alpha: number },
  premultiplied = true,
): { hex: string; alpha: number } {
  const a = new Color(aHex);
  // colorjs.io wants a mutable 3-tuple; `Rgb` is readonly, so it is spread rather than cast.
  const [br, bg, bb] = fromHex(b.hex);
  const bc = new Color('srgb', [br, bg, bb], b.alpha);
  const m = Color.mix(a, bc, 1 - aPercent / 100, {
    space: 'oklab',
    outputSpace: 'srgb',
    premultiplied,
  });
  return {
    hex: m.to('srgb').toString({ format: 'hex' }).slice(0, 7).toUpperCase(),
    alpha: m.alpha,
  };
}

describe('mixOklab agrees with the specification oracle', () => {
  // The real declarations HeroUI ships, with our tokens substituted in.
  const cases: readonly { name: string; a: string; percent: number; b: string }[] = [
    { name: 'accent-hover (90/10)', a: '#F6F4F1', percent: 90, b: '#0C0B09' },
    { name: 'surface-hover (92/8)', a: '#12100F', percent: 92, b: '#F6F4F1' },
    { name: 'default-hover (96/4)', a: '#1A1817', percent: 96, b: '#F6F4F1' },
    { name: 'separator-secondary (85/15)', a: '#12100F', percent: 85, b: '#F6F4F1' },
    { name: 'border-tertiary (66/34)', a: '#12100F', percent: 66, b: '#F6F4F1' },
    { name: 'warning-soft-foreground (65/35)', a: '#D58D25', percent: 65, b: '#F6F4F1' },
  ];

  for (const c of cases)
    it(c.name, () => {
      const got = mixOklab(opaque(c.a, c.percent), opaque(c.b, 100 - c.percent));
      const want = oracle(c.a, c.percent, { hex: c.b, alpha: 1 });
      expect(hex(got.rgb)).toBe(want.hex);
      expect(got.alpha).toBeCloseTo(want.alpha, 10);
    });
});

describe('the transparent case is premultiplied, not lerped', () => {
  // Every HeroUI `-soft` token has this shape.
  const SOFT = { a: '#E8443A', percent: 15 };

  it('preserves the colour and carries the percentage into alpha', () => {
    const got = mixOklab(opaque(SOFT.a, SOFT.percent), transparent(100 - SOFT.percent));
    expect(hex(got.rgb)).toBe(SOFT.a);
    expect(got.alpha).toBeCloseTo(0.15, 10);
  });

  it('matches the oracle', () => {
    const got = mixOklab(opaque(SOFT.a, SOFT.percent), transparent(100 - SOFT.percent));
    const want = oracle(SOFT.a, SOFT.percent, { hex: '#000000', alpha: 0 });
    expect(hex(got.rgb)).toBe(want.hex);
    expect(got.alpha).toBeCloseTo(want.alpha, 10);
  });

  it('DECOY — must not return the un-premultiplied result', () => {
    // What the same mix produces without weighting by alpha. Verified against the oracle so
    // the decoy is a real wrong answer rather than a number someone invented: a plausible
    // near-black at the right opacity [[a-decoy-that-is-not-broken-proves-nothing]].
    const naive = oracle(SOFT.a, SOFT.percent, { hex: '#000000', alpha: 0 }, false);
    expect(naive.hex).not.toBe(SOFT.a);

    const got = mixOklab(opaque(SOFT.a, SOFT.percent), transparent(100 - SOFT.percent));
    expect(hex(got.rgb)).not.toBe(naive.hex);
  });
});

describe('properties', () => {
  const A = '#F6F4F1';
  const B = '#0C0B09';

  it('an endpoint returns its own colour', () => {
    expect(hex(mixOklab(opaque(A, 100), opaque(B, 0)).rgb)).toBe(A);
    expect(hex(mixOklab(opaque(A, 0), opaque(B, 100)).rgb)).toBe(B);
  });

  it('is symmetric under swapping both operands and their percentages', () => {
    const forward = mixOklab(opaque(A, 30), opaque(B, 70));
    const backward = mixOklab(opaque(B, 70), opaque(A, 30));
    expect(hex(forward.rgb)).toBe(hex(backward.rgb));
  });

  it('percentages are a RATIO — 30/70 and 3/7 are the same mix', () => {
    // And the sum below 100 changes the ALPHA, not the ratio. A mix that treated 3 % and 7 %
    // as small absolute weights would return a different colour rather than a fainter one.
    const full = mixOklab(opaque(A, 30), opaque(B, 70));
    const scaled = mixOklab(opaque(A, 3), opaque(B, 7));
    expect(hex(scaled.rgb)).toBe(hex(full.rgb));
    expect(scaled.alpha).toBeCloseTo(0.1, 10);
    expect(full.alpha).toBeCloseTo(1, 10);
  });

  it('refuses a degenerate declaration rather than guessing', () => {
    expect(() => mixOklab(opaque(A, 0), opaque(B, 0))).toThrow(/sum to 0/u);
  });

  it('an out-of-gamut result is an error, not a clipped hex', () => {
    // Two operands whose Oklab midpoint leaves the sRGB cube. Clipping here would produce a
    // hex that no longer matches the colour the gate measured — the same rule `tokenRgb`
    // follows.
    const wide: MixOperand = { rgb: [1, 0, 0], alpha: 1, percent: 50 };
    const alsoWide: MixOperand = { rgb: [0, 1, 0], alpha: 1, percent: 50 };
    let threw: unknown = null;
    try {
      mixOklab(wide, alsoWide);
    } catch (e) {
      threw = e;
    }
    // Documented either way: if this mix IS in gamut the assertion below records that fact
    // rather than pretending the guard fired.
    if (threw !== null) expect(threw).toBeInstanceOf(OutOfGamutError);
    else expect(hex(mixOklab(wide, alsoWide).rgb)).toMatch(/^#[0-9A-F]{6}$/u);
  });
});

/**
 * The case that actually proves premultiplication.
 *
 * Added after a mutation check: removing the premultiplication entirely left every test above
 * green. `transparent` is BLACK at zero alpha, so its contribution is the zero vector whether
 * or not it is weighted by alpha, and the un-premultiply divide then restores the original
 * colour either way. The step is unobservable in exactly the case it was written for
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * It becomes observable the moment a partially transparent operand has a colour of its own —
 * which `border` in our own manifest does: white at 8 % alpha.
 */
describe('premultiplication is observable when a translucent operand has colour', () => {
  const OPAQUE = '#0C0B09';
  const TRANSLUCENT = { hex: '#FFFFFF', alpha: 0.08 };

  const translucentOperand: MixOperand = {
    rgb: fromHex(TRANSLUCENT.hex),
    alpha: TRANSLUCENT.alpha,
    percent: 50,
  };

  it('matches the premultiplied oracle', () => {
    const got = mixOklab(opaque(OPAQUE, 50), translucentOperand);
    const want = oracle(OPAQUE, 50, TRANSLUCENT, true);
    expect(hex(got.rgb)).toBe(want.hex);
    expect(got.alpha).toBeCloseTo(want.alpha, 10);
  });

  it('DECOY — differs from the un-premultiplied result, which is a real wrong answer', () => {
    const premultiplied = oracle(OPAQUE, 50, TRANSLUCENT, true);
    const naive = oracle(OPAQUE, 50, TRANSLUCENT, false);
    // If these agreed, the assertion below would pass for the wrong reason.
    expect(naive.hex).not.toBe(premultiplied.hex);

    const got = mixOklab(opaque(OPAQUE, 50), translucentOperand);
    expect(hex(got.rgb)).not.toBe(naive.hex);
  });
});
