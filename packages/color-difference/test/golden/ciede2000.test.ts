/**
 * Gate 5 — CIEDE2000 against all 34 Sharma–Wu–Dalal pairs.
 *
 * Two things are checked here that are usually conflated:
 *
 * 1. **Is our implementation right?** Every pair to four decimal places.
 * 2. **Is the transcription right?** 34 rows × 7 numbers is 238 opportunities for a typo, and
 *    a typo and a genuine bug are indistinguishable from inside — both look like "our answer
 *    disagrees with the expected one". So `culori` computes ΔE00 on each transcribed pair
 *    independently. A row that a third-party implementation also reproduces is a row whose
 *    seven numbers are internally consistent, and any remaining disagreement is ours.
 *
 * F-006 shipped a transcription error that six golden datasets could not see. This is what
 * that lesson looks like applied to tabular data.
 * [[measure-what-a-golden-set-can-detect-before-trusting-it]]
 */

import { describe, expect, it } from 'vitest';
import { differenceCiede2000 } from 'culori';
import { assertGoldenDataset } from '@irodora/testing';
import raw from '../../golden/ciede2000.golden.json' with { type: 'json' };
import { deltaE00 } from '../../src/index.js';
import { degreesToRadians, radiansToDegrees, type Lab } from '@irodora/color-spaces';

const dataset = assertGoldenDataset(raw, 'ciede2000');
const rawDeltaE00 = differenceCiede2000();

/** `lab65`, never `lab`. [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]] */
const oracle = (a: Lab, b: Lab): number =>
  rawDeltaE00(
    { mode: 'lab65', l: a[0], a: a[1], b: a[2] },
    { mode: 'lab65', l: b[0], a: b[1], b: b[2] },
  );

const lab = (value: unknown): Lab => {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('not a Lab triple');
  return value as unknown as Lab;
};

interface PairInput {
  lab1: number[];
  lab2: number[];
}

const pairs = dataset.entries.map((entry) => {
  const input = entry.input as PairInput;
  if (typeof entry.expected !== 'number') throw new Error(`${entry.id}: expected is not a number`);
  return { entry, a: lab(input.lab1), b: lab(input.lab2), expected: entry.expected };
});

describe('the published set is complete', () => {
  it('has all 34 pairs', () => {
    expect(pairs).toHaveLength(34);
  });

  it('every entry cites the paper and is a published value', () => {
    for (const { entry } of pairs) {
      expect(entry.source).toMatch(/Sharma, Wu & Dalal \(2005\)/);
      expect(entry.derivation).toBe('published-value');
    }
  });
});

describe('our ΔE00 reproduces every pair to four decimal places', () => {
  for (const { entry, a, b, expected } of pairs)
    it(`${entry.id}: ${String(expected)}`, () => {
      expect(Math.abs(deltaE00(a, b) - expected)).toBeLessThanOrEqual(entry.tolerance);
    });

  it('and the worst deviation is the published rounding, not slack', () => {
    // The tolerance is 5e-5 because the paper quotes four decimals. If our worst case were,
    // say, 3e-5, that would be fine; if it were 4.99e-5 with a tolerance of 5e-4, the
    // tolerance would be hiding something. Pinned so the margin is visible.
    const worst = Math.max(...pairs.map(({ a, b, expected }) => Math.abs(deltaE00(a, b) - expected)));
    expect(worst).toBeLessThan(5e-5);
    expect(worst).toBeGreaterThan(1e-5);
  });
});

describe('the transcription is checked independently of the implementation', () => {
  for (const { entry, a, b, expected } of pairs)
    it(`${entry.id}: culori also reproduces it, so the seven numbers are consistent`, () => {
      expect(Math.abs(oracle(a, b) - expected)).toBeLessThanOrEqual(entry.tolerance);
    });

  it('and a single mistyped digit in a pair would break that consistency', () => {
    // The decoy for the transcription check. If perturbing one number left culori still
    // agreeing with the expected value, the check above would prove nothing about typos.
    const { a, b, expected } = pairs[24]!;
    const mistyped: Lab = [a[0], a[1] + 0.01, a[2]];
    expect(Math.abs(oracle(mistyped, b) - expected)).toBeGreaterThan(5e-5);
  });
});

describe('the decoys: the two errors that produce plausible results', () => {
  /**
   * ΔE00 with `Rt` forced positive. Every other term is untouched.
   *
   * `Rt` only bites near h ≈ 275°, so this implementation is correct almost everywhere and
   * wrong exactly where indigo lives — which is why the published set has to be run whole.
   */
  const withFlippedRt = (a: Lab, b: Lab): number => {
    const [l1, a1, b1] = a;
    const [l2, a2, b2] = b;
    const pow7 = (v: number): number => v ** 7;
    const c1 = Math.hypot(a1, b1);
    const c2 = Math.hypot(a2, b2);
    const cBar = (c1 + c2) / 2;
    const g = 0.5 * (1 - Math.sqrt(pow7(cBar) / (pow7(cBar) + 6103515625)));
    const a1p = (1 + g) * a1;
    const a2p = (1 + g) * a2;
    const c1p = Math.hypot(a1p, b1);
    const c2p = Math.hypot(a2p, b2);
    const h1p = a1p === 0 && b1 === 0 ? 0 : radiansToDegrees(Math.atan2(b1, a1p));
    const h2p = a2p === 0 && b2 === 0 ? 0 : radiansToDegrees(Math.atan2(b2, a2p));
    const product = c1p * c2p;
    let dhp: number;
    if (product === 0) dhp = 0;
    else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
    else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
    else dhp = h2p - h1p + 360;
    const dHp = 2 * Math.sqrt(product) * Math.sin(degreesToRadians(dhp) / 2);
    const lBar = (l1 + l2) / 2;
    const cBarP = (c1p + c2p) / 2;
    let hBar: number;
    if (product === 0) hBar = h1p + h2p;
    else if (Math.abs(h1p - h2p) <= 180) hBar = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hBar = (h1p + h2p + 360) / 2;
    else hBar = (h1p + h2p - 360) / 2;
    const t =
      1 -
      0.17 * Math.cos(degreesToRadians(hBar - 30)) +
      0.24 * Math.cos(degreesToRadians(2 * hBar)) +
      0.32 * Math.cos(degreesToRadians(3 * hBar + 6)) -
      0.2 * Math.cos(degreesToRadians(4 * hBar - 63));
    const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
    const rc = 2 * Math.sqrt(pow7(cBarP) / (pow7(cBarP) + 6103515625));
    const dL = lBar - 50;
    const sl = 1 + (0.015 * dL * dL) / Math.sqrt(20 + dL * dL);
    const sc = 1 + 0.045 * cBarP;
    const sh = 1 + 0.015 * cBarP * t;
    // The mutation: the correct term is `-Math.sin(...)`.
    const rt = Math.sin(degreesToRadians(2 * dTheta)) * rc;
    const tl = (l2 - l1) / sl;
    const tc = (c2p - c1p) / sc;
    const th = dHp / sh;
    return Math.sqrt(tl * tl + tc * tc + th * th + rt * tc * th);
  };

  it('a sign-flipped Rt fails the set — but only on some pairs, which is the point', () => {
    const failing = pairs.filter(
      ({ a, b, expected, entry }) => Math.abs(withFlippedRt(a, b) - expected) > entry.tolerance,
    );
    const passing = pairs.length - failing.length;

    expect(failing.length).toBeGreaterThan(0);
    // Most pairs still pass. An implementation with this defect looks correct on a spot check
    // and is wrong in the blue region — the region this corpus is about.
    expect(passing).toBeGreaterThan(pairs.length / 2);
  });

  /**
   * ΔE00 with the hue-difference wrap removed. Everything else is untouched.
   *
   * The first version of this test asserted only that `|h2 − h1| > 180` for some pairs, and
   * named pairs 9–15 as the ones that catch it. **Both were wrong**, and an independent review
   * found it: the mutation was never actually run through ΔE00, and pairs 9–15 all *pass*
   * under it. They have ΔC′ ≈ 0 and near-equal chroma, so the sign flip in ΔH′ is squared
   * away and the `Rt` cross-term vanishes — they test the branch *selection* at exactly ±180°,
   * not an unwrapped subtraction.
   */
  const withoutHueWrap = (a: Lab, b: Lab): number => {
    const [l1, a1, b1] = a;
    const [l2, a2, b2] = b;
    const pow7 = (v: number): number => v ** 7;
    const c1 = Math.hypot(a1, b1);
    const c2 = Math.hypot(a2, b2);
    const cBar = (c1 + c2) / 2;
    const g = 0.5 * (1 - Math.sqrt(pow7(cBar) / (pow7(cBar) + 6103515625)));
    const a1p = (1 + g) * a1;
    const a2p = (1 + g) * a2;
    const c1p = Math.hypot(a1p, b1);
    const c2p = Math.hypot(a2p, b2);
    const h1p = a1p === 0 && b1 === 0 ? 0 : radiansToDegrees(Math.atan2(b1, a1p));
    const h2p = a2p === 0 && b2 === 0 ? 0 : radiansToDegrees(Math.atan2(b2, a2p));
    const product = c1p * c2p;
    const dhp = product === 0 ? 0 : h2p - h1p; // the mutation: no wrap
    const dHp = 2 * Math.sqrt(product) * Math.sin(degreesToRadians(dhp) / 2);
    const lBar = (l1 + l2) / 2;
    const cBarP = (c1p + c2p) / 2;
    let hBar: number;
    if (product === 0) hBar = h1p + h2p;
    else if (Math.abs(h1p - h2p) <= 180) hBar = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hBar = (h1p + h2p + 360) / 2;
    else hBar = (h1p + h2p - 360) / 2;
    const t =
      1 -
      0.17 * Math.cos(degreesToRadians(hBar - 30)) +
      0.24 * Math.cos(degreesToRadians(2 * hBar)) +
      0.32 * Math.cos(degreesToRadians(3 * hBar + 6)) -
      0.2 * Math.cos(degreesToRadians(4 * hBar - 63));
    const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
    const rc = 2 * Math.sqrt(pow7(cBarP) / (pow7(cBarP) + 6103515625));
    const dL = lBar - 50;
    const sl = 1 + (0.015 * dL * dL) / Math.sqrt(20 + dL * dL);
    const sc = 1 + 0.045 * cBarP;
    const sh = 1 + 0.015 * cBarP * t;
    const rt = -Math.sin(degreesToRadians(2 * dTheta)) * rc;
    const tl = (l2 - l1) / sl;
    const tc = (c2p - c1p) / sc;
    const th = dHp / sh;
    return Math.sqrt(tl * tl + tc * tc + th * th + rt * tc * th);
  };

  it('an unwrapped hue difference is caught by pairs 16, 17 and 19 — not by 9–15', () => {
    const failing = pairs
      .map(({ entry: e, a, b, expected }, i) => ({
        n: i + 1,
        fails: Math.abs(withoutHueWrap(a, b) - expected) > e.tolerance,
      }))
      .filter((r) => r.fails)
      .map((r) => r.n);

    expect(failing).toEqual([16, 17, 19]);
  });

  it('and pair 19 catches it by 10.8 ΔE00, which is not a rounding difference', () => {
    const { a, b, expected } = pairs[18]!;
    expect(expected).toBe(31.903);
    expect(Math.abs(withoutHueWrap(a, b) - expected)).toBeGreaterThan(10);
  });

  it('pairs 9–15 test the branch SELECTION at ±180°, which is a different defect', () => {
    // Recorded so the next person does not re-derive the wrong conclusion. These pairs differ
    // from each other by 1e-4 in b*, straddling the point where the wrap changes branch, and
    // their published answers differ accordingly (7.1792 vs 7.2195, 4.8045 vs 4.7461). They
    // are a boundary test, not an unwrapped-subtraction test.
    for (const n of [9, 10, 11, 12, 13, 14, 15]) {
      const { a, b, expected, entry: e } = pairs[n - 1]!;
      expect(Math.abs(withoutHueWrap(a, b) - expected), `pair ${String(n)}`).toBeLessThanOrEqual(
        e.tolerance,
      );
    }
    expect(pairs[8]!.expected).not.toBe(pairs[10]!.expected);
  });
});
