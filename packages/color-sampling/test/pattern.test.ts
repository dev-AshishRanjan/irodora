/**
 * Pattern and multi-colour extraction (FR-19, F-064).
 *
 * ## The corpus is CONSTRUCTED, and that is what makes the target derivable
 *
 * Every image here is built from known colours in known proportions, so its ground truth
 * carries **no measurement error at all**. A correct quantiser must therefore recover the
 * colours of a two-colour stripe essentially exactly — which is why `PATTERN_TARGET_DELTA_E` is
 * 1.0 rather than a perceptual tolerance somebody chose. See ADR-0081, and
 * `../golden/patterns.md` for each construction written out.
 *
 * It tests **the algorithm, not the camera path**. The camera path's accuracy is F-063's, is
 * attested, and is blocked.
 *
 * ## Why a blended-edge variant exists, one day after the lesson that demanded it
 *
 * Every hard-edged construction has the property that **each pixel is exactly one of the source
 * colours** — so a quantiser and a mere colour *counter* score identically on all of them, and
 * the whole corpus would rate two very different implementations the same
 * [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
 *
 * A photograph of a striped shirt has a blended pixel at every boundary. `blendedStripes`
 * carries a two-pixel ramp in linear light between the stripes, so the image contains colours
 * that are in no palette — and recovering the two stripe colours from it is a different task
 * from counting.
 */

import { describe, expect, it } from 'vitest';
import { deltaE00 } from '@irodora/color-difference';
import { srgbToLinear, linearToSrgb, srgbToXyz, xyzToLab } from '@irodora/color-spaces';
import {
  extractPattern,
  PATTERN_TARGET_DELTA_E,
  PATTERN_TARGET_PROPORTION,
  type Sample,
} from '../src/index.js';

const px = (r: number, g: number, b: number): Sample => ({ r, g, b, alpha: 1 });

/** The four colours every construction draws from. Mid-range, so nothing is near a clip. */
const NAVY = px(0.13, 0.18, 0.32);
const CREAM = px(0.93, 0.9, 0.8);
const RUST = px(0.66, 0.29, 0.16);
const MOSS = px(0.35, 0.44, 0.28);

const WIDTH = 40;
const HEIGHT = 40;

/** A row-major image as a flat sample list, from a function of the coordinates. */
function build(at: (x: number, y: number) => Sample): readonly Sample[] {
  const out: Sample[] = [];
  for (let y = 0; y < HEIGHT; y += 1) for (let x = 0; x < WIDTH; x += 1) out.push(at(x, y));
  return out;
}

/** Horizontal stripes: 30 rows navy, 10 rows cream — exactly 75 % and 25 %. */
const stripes = build((_x, y) => (y < 30 ? NAVY : CREAM));

/**
 * A check: **10-pixel** squares alternating navy and cream — exactly 50 % each.
 *
 * Ten and not eight, and the fixture assertion is why. Eight gives five squares per side and
 * twenty-five squares in total, which cannot be halved: it was 13 navy to 12 cream, 52 %, and
 * the "exactly 50 %" this file claimed was simply wrong. The corpus check caught it before any
 * accuracy assertion could be measured against a truth that was not the fixture's.
 */
const check = build((x, y) => ((Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0 ? NAVY : CREAM));

/** Colour blocks: four quarters, one per colour — exactly 25 % each. */
const blocks = build((x, y) => (y < 20 ? (x < 20 ? NAVY : CREAM) : x < 20 ? RUST : MOSS));

/**
 * A "print": a cream ground with a deterministic scatter of small rust and moss marks.
 *
 * Many small regions and a dominant ground, which is the shape a floral is. **It is not a
 * photograph of one**, and ADR-0081 states that limit rather than letting the corpus imply a
 * coverage it does not have.
 */
const print = build((x, y) => {
  const mark = (x * 7 + y * 13) % 23;
  if (mark === 0) return RUST;
  if (mark === 1) return MOSS;
  return CREAM;
});

/** Linear-light interpolation between two samples. The blend a real edge pixel actually is. */
function mix(a: Sample, b: Sample, t: number): Sample {
  const channel = (x: number, y: number): number =>
    linearToSrgb(srgbToLinear(x) * (1 - t) + srgbToLinear(y) * t);
  return px(channel(a.r, b.r), channel(a.g, b.g), channel(a.b, b.b));
}

/**
 * The same stripes with a two-row ramp at the boundary.
 *
 * Rows 0–28 navy, 29 and 30 the ramp, 31–39 cream. The ramp is 2 of 40 rows — 5 % of the image
 * in colours that are in no palette.
 */
const blendedStripes = build((_x, y) => {
  if (y < 29) return NAVY;
  if (y === 29) return mix(NAVY, CREAM, 1 / 3);
  if (y === 30) return mix(NAVY, CREAM, 2 / 3);
  return CREAM;
});

/**
 * A smooth ramp from navy to cream across every row — no flat region anywhere.
 *
 * The blended stripes were not enough, and a mutation proved it: with a 20 % trimmed mean, a
 * cluster that is 97 % a single colour has a mean EQUAL to that colour, so "the mean of the
 * members" and "a member" were still the same value and replacing `aggregate` with
 * `cluster[0].sample` passed the case written to catch it.
 *
 * Here every cluster spans a wide range and its trimmed mean is a value the image contains at
 * most once. It is also what a real garment looks like under uneven light.
 */
const graded = build((_x, y) => mix(NAVY, CREAM, y / (HEIGHT - 1)));

const labOf = (s: Sample): readonly [number, number, number] =>
  xyzToLab(srgbToXyz([s.r, s.g, s.b]));

const difference = (a: Sample, b: Sample): number => deltaE00(labOf(a), labOf(b));

describe('the corpus is what the accuracy assertions assume', () => {
  /*
   * A generator that built the wrong image would make every accuracy case below vacuous — the
   * extractor would be measured against a truth that is not the fixture's.
   */
  it('has the sizes and the exact proportions each construction claims', () => {
    for (const image of [stripes, check, blocks, print, blendedStripes])
      expect(image).toHaveLength(WIDTH * HEIGHT);

    const navyRows = stripes.filter((s) => s === NAVY).length;
    expect(navyRows / stripes.length).toBeCloseTo(0.75, 10);

    const checkNavy = check.filter((s) => s === NAVY).length;
    expect(checkNavy / check.length).toBeCloseTo(0.5, 10);

    for (const colour of [NAVY, CREAM, RUST, MOSS])
      expect(blocks.filter((s) => s === colour).length / blocks.length).toBeCloseTo(0.25, 10);
  });

  it('has a blended variant whose ramp pixels are in no palette', () => {
    const palette = [NAVY, CREAM, RUST, MOSS];
    const offPalette = blendedStripes.filter(
      (s) => !palette.some((p) => p.r === s.r && p.g === s.g && p.b === s.b),
    );
    // Two rows of forty.
    expect(offPalette).toHaveLength(2 * WIDTH);
  });
});

describe('what the pattern is made of', () => {
  it('recovers both stripe colours, with their shares', () => {
    const { colours, usable, rejected } = extractPattern(stripes, 2);

    expect(rejected).toBe(0);
    expect(usable).toBe(WIDTH * HEIGHT);
    expect(colours).toHaveLength(2);
    expect(difference(colours[0]!.colour, NAVY)).toBeLessThan(PATTERN_TARGET_DELTA_E);
    expect(colours[0]!.proportion).toBeCloseTo(0.75, 2);
    expect(difference(colours[1]!.colour, CREAM)).toBeLessThan(PATTERN_TARGET_DELTA_E);
    expect(colours[1]!.proportion).toBeCloseTo(0.25, 2);
  });

  it('recovers a check at half and half', () => {
    const { colours } = extractPattern(check, 2);

    expect(colours).toHaveLength(2);
    for (const found of colours) {
      expect(Math.abs(found.proportion - 0.5)).toBeLessThanOrEqual(PATTERN_TARGET_PROPORTION);
      expect(
        Math.min(difference(found.colour, NAVY), difference(found.colour, CREAM)),
      ).toBeLessThan(PATTERN_TARGET_DELTA_E);
    }
  });

  it('recovers four colour blocks at a quarter each', () => {
    const { colours } = extractPattern(blocks, 4);

    expect(colours).toHaveLength(4);
    for (const found of colours) {
      expect(Math.abs(found.proportion - 0.25)).toBeLessThanOrEqual(PATTERN_TARGET_PROPORTION);
      const nearest = Math.min(
        ...[NAVY, CREAM, RUST, MOSS].map((c) => difference(found.colour, c)),
      );
      expect(nearest).toBeLessThan(PATTERN_TARGET_DELTA_E);
    }
    // And each construction colour is found once, not one of them twice.
    const matched = [NAVY, CREAM, RUST, MOSS].map((c) =>
      colours.findIndex((f) => difference(f.colour, c) < PATTERN_TARGET_DELTA_E),
    );
    expect(new Set(matched).size).toBe(4);
  });

  it('reports the ground of a print as the dominant colour', () => {
    const { colours } = extractPattern(print, 4);

    expect(difference(colours[0]!.colour, CREAM)).toBeLessThan(PATTERN_TARGET_DELTA_E);
    // 21 of every 23 pixels are ground.
    expect(colours[0]!.proportion).toBeGreaterThan(0.85);
  });

  /*
   * THE CASE A COLOUR COUNTER FAILS. Every hard-edged construction above has each pixel exactly
   * equal to a source colour, so counting distinct values scores full marks on all of them.
   * Here 5 % of the image is in colours that are in no palette, and both stripe colours still
   * have to come back.
   */
  it('recovers both stripe colours through a blended edge', () => {
    const { colours } = extractPattern(blendedStripes, 2);

    expect(colours).toHaveLength(2);
    expect(difference(colours[0]!.colour, NAVY)).toBeLessThan(3);
    expect(difference(colours[1]!.colour, CREAM)).toBeLessThan(3);
  });

  it('DECOY — the hard-edged stripes are recovered far more tightly', () => {
    // If the blended case passed at the same tolerance as this one, the ramp would not be
    // testing anything.
    const hard = extractPattern(stripes, 2);
    expect(difference(hard.colours[0]!.colour, NAVY)).toBeLessThan(PATTERN_TARGET_DELTA_E);
  });
});

describe('the properties that hold for every pattern', () => {
  const corpus = { stripes, check, blocks, print, blendedStripes };

  it('has proportions summing to one over the usable pixels', () => {
    for (const [name, image] of Object.entries(corpus)) {
      const { colours } = extractPattern(image, 4);
      const total = colours.reduce((sum, c) => sum + c.proportion, 0);
      expect(`${name} sums to 1: ${total.toFixed(10)}`).toBe(
        `${name} sums to 1: ${(1).toFixed(10)}`,
      );
    }
  });

  it('ranks by area, descending', () => {
    for (const [name, image] of Object.entries(corpus)) {
      const { colours } = extractPattern(image, 4);
      for (let i = 1; i < colours.length; i += 1)
        expect(`${name} ${String(i)}: ${String(colours[i]!.count <= colours[i - 1]!.count)}`).toBe(
          `${name} ${String(i)}: true`,
        );
    }
  });

  /*
   * THE CASE THAT CATCHES A SPLIT ON ARRIVAL ORDER. Median cut sorts within a bucket, but a
   * tie-break that fell through to input order would make the answer depend on scan direction —
   * and NFR-3 is a claim about producing the same result everywhere.
   */
  it('gives the same answer for the same pixels in a different order', () => {
    for (const [name, image] of Object.entries(corpus)) {
      const forward = extractPattern(image, 4);
      const backward = extractPattern([...image].reverse(), 4);
      expect(`${name}: ${JSON.stringify(backward.colours)}`).toBe(
        `${name}: ${JSON.stringify(forward.colours)}`,
      );
    }
  });

  it('returns one colour for a uniform image, whatever k is', () => {
    const flat = build(() => NAVY);
    for (const k of [1, 2, 4, 8]) {
      const { colours } = extractPattern(flat, k);
      expect(`k=${String(k)}: ${String(colours.length)}`).toBe(`k=${String(k)}: 1`);
      expect(colours[0]!.proportion).toBe(1);
    }
  });

  it('does not pad out to k with duplicates when the pattern has fewer colours', () => {
    const { colours } = extractPattern(stripes, 8);
    // Two distinct stripe colours; asking for eight must not invent six more.
    const distinct = colours.filter((c, i) =>
      colours.every((other, j) => j >= i || difference(c.colour, other.colour) > 1),
    );
    expect(distinct).toHaveLength(colours.length);
    expect(colours.length).toBeLessThanOrEqual(2);
  });
});

describe('the numbers come from the engine, not from this file', () => {
  /*
   * A bucket's colour must be `aggregate`'s answer for its members. An inlined average — or an
   * OKLab centroid, which is the other tempting choice — fails here rather than agreeing with
   * itself (E-008).
   */
  it('gives a bucket the mean aggregate computes for its members', () => {
    /*
     * THE BLENDED FIXTURE, and the reason is a mutation that did not fail.
     *
     * Run against `stripes`, every cluster is uniform — so "the mean of the members" and "the
     * first member" are the SAME VALUE, and replacing `aggregate` with `cluster[0].sample`
     * passed this case. The blended variant was not enough either: a 20 % trimmed mean over a
     * cluster that is 97 % one colour is still that colour, and the mutation passed a SECOND
     * time [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
     *
     * `graded` has no flat region at all, so every cluster spans a range and its trimmed mean
     * is not any single member of it.
     */
    const { colours } = extractPattern(graded, 2);

    /*
     * ASSERTED AS A PROPERTY, not by reconstructing the clustering. An earlier draft rebuilt
     * the cluster by nearest-reported-colour and compared means; the extractor assigns by
     * distance to the SEED centroid, so a handful of boundary pixels land differently and the
     * comparison failed for a reason that had nothing to do with the claim.
     *
     * The claim is that the reported colour is an AVERAGE of its members. On a fully graded
     * image an average is a value the image does not contain, and a member is by definition one
     * it does — so this separates the two without needing to know which pixels went where.
     */
    for (const found of colours) {
      const isAMember = graded.some(
        (s) => s.r === found.colour.r && s.g === found.colour.g && s.b === found.colour.b,
      );
      expect(`${found.colour.r.toFixed(6)} is a member of the image: ${String(isAMember)}`).toBe(
        `${found.colour.r.toFixed(6)} is a member of the image: false`,
      );
    }

    // And it must still sit inside the image's range, or "not a member" would pass for nonsense.
    const reds = graded.map((s) => s.r);
    for (const found of colours) {
      expect(found.colour.r).toBeGreaterThan(Math.min(...reds));
      expect(found.colour.r).toBeLessThan(Math.max(...reds));
    }
  });
});

describe('pixels that should not count', () => {
  /*
   * THE DECOY PAIR. A proportion computed over a shrinking denominator with no mention of it is
   * a number that means something other than what it says.
   */
  it('rejects blown-out pixels and reports how many', () => {
    const blown = stripes.map((s, i) => (i % 10 === 0 ? px(1.02, 1.02, 1.02) : s));
    const { rejected, usable } = extractPattern(blown, 2);

    expect(rejected).toBeGreaterThan(0);
    expect(usable + rejected).toBe(blown.length);
  });

  it('DECOY — the same image unclipped rejects nothing', () => {
    expect(extractPattern(stripes, 2).rejected).toBe(0);
  });

  it('returns nothing rather than throwing when every pixel is rejected', () => {
    const allBlown = build(() => px(1.05, 1.05, 1.05));
    const { colours, usable } = extractPattern(allBlown, 2);

    expect(colours).toEqual([]);
    expect(usable).toBe(0);
  });
});
