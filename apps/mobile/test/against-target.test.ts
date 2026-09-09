/**
 * How far a reading is from the target, and which way (F-201).
 *
 * The distance, the temperature and the hue arc are all published functions tested in their own
 * packages. What is checked here is the product decision on top of them: **the directions, the
 * dead bands, and the ordering rule that a poor capture speaks before a number does.**
 */

import {
  differenceFrom,
  SAME_CHROMA,
  SAME_LIGHTNESS,
  type CaptureConditions,
} from '../src/against-target';
import { displayFromOklch } from '../src/engine';
import { ruleSet } from '../src/rules';

const POLES = ruleSet().poles;

/** An unremarkable capture. The axes are the subject; the conditions are held still. */
const GOOD: CaptureConditions = { quality: 'good', illumination: 'daylight', confidence: 0.8 };
const POOR: CaptureConditions = { quality: 'poor', illumination: 'mixed', confidence: 0.2 };

const colour = (l: number, c: number, h: number) => displayFromOklch([l, c, h]).color;

const TARGET = colour(0.55, 0.06, 240);

describe('each axis says which way it is off', () => {
  it('reports lighter and darker', () => {
    expect(differenceFrom(TARGET, colour(0.75, 0.06, 240), GOOD, POLES).lightness.direction).toBe(
      'more',
    );
    expect(differenceFrom(TARGET, colour(0.35, 0.06, 240), GOOD, POLES).lightness.direction).toBe(
      'less',
    );
  });

  it('reports more and less vivid', () => {
    expect(differenceFrom(TARGET, colour(0.55, 0.12, 240), GOOD, POLES).chroma.direction).toBe(
      'more',
    );
    expect(differenceFrom(TARGET, colour(0.55, 0.01, 240), GOOD, POLES).chroma.direction).toBe(
      'less',
    );
  });

  it('reports warmer and cooler, from the published poles', () => {
    // A warm hue against a cool target, and back. `temperatureOf` is the outfit engine's, so a
    // change to the published poles moves this rather than leaving two definitions of warm.
    expect(differenceFrom(TARGET, colour(0.55, 0.12, 60), GOOD, POLES).temperature.direction).toBe(
      'more',
    );
    expect(
      differenceFrom(colour(0.55, 0.12, 60), colour(0.55, 0.12, 240), GOOD, POLES).temperature
        .direction,
    ).toBe('less');
  });

  /**
   * THE DECOY FOR THE DIRECTIONS.
   *
   * A reading identical to the target must report `same` on all three. Without it, every
   * assertion above passes on an implementation that generates a direction from the sign of a
   * random-ish float — or that never returns `same` at all, which would make the dead bands
   * decorative.
   */
  it('reports the same on every axis for a reading identical to the target', () => {
    const d = differenceFrom(TARGET, TARGET, GOOD, POLES);
    expect([d.lightness.direction, d.chroma.direction, d.temperature.direction]).toEqual([
      'same',
      'same',
      'same',
    ]);
    expect(d.deltaE00).toBeCloseTo(0, 6);
  });
});

describe('the dead band is a band, not a threshold nobody crosses', () => {
  it('calls a difference just inside it the same', () => {
    const inside = colour(0.55 + SAME_LIGHTNESS * 0.5, 0.06, 240);
    expect(differenceFrom(TARGET, inside, GOOD, POLES).lightness.direction).toBe('same');
  });

  it('and one just outside it a direction', () => {
    // Both sides asserted. A band checked only from the inside is a band that could be infinite.
    const outside = colour(0.55 + SAME_LIGHTNESS * 3, 0.06, 240);
    expect(differenceFrom(TARGET, outside, GOOD, POLES).lightness.direction).toBe('more');
  });

  it('holds for chroma too, on its own scale', () => {
    expect(
      differenceFrom(TARGET, colour(0.55, 0.06 + SAME_CHROMA * 0.5, 240), GOOD, POLES).chroma
        .direction,
    ).toBe('same');
    expect(
      differenceFrom(TARGET, colour(0.55, 0.06 + SAME_CHROMA * 4, 240), GOOD, POLES).chroma
        .direction,
    ).toBe('more');
  });
});

describe('the hue arc is the shortest one', () => {
  it('reads 350° against 10° as +20, not −340', () => {
    const near350 = colour(0.55, 0.09, 350);
    const near10 = colour(0.55, 0.09, 10);
    const arc = differenceFrom(near350, near10, GOOD, POLES).hueArc;
    expect(Math.abs(arc)).toBeLessThan(180);
    expect(arc).toBeGreaterThan(0);
  });

  it('and is signed, so the reverse reads the other way', () => {
    const a = differenceFrom(colour(0.55, 0.09, 350), colour(0.55, 0.09, 10), GOOD, POLES).hueArc;
    const b = differenceFrom(colour(0.55, 0.09, 10), colour(0.55, 0.09, 350), GOOD, POLES).hueArc;
    expect(Math.sign(a)).toBe(-Math.sign(b));
  });
});

describe('a poor capture is a poor capture whatever the number says', () => {
  /**
   * CRITERION 4, AND THE CASE IT EXISTS FOR.
   *
   * A reading that lands exactly on the target is not evidence that the capture was good — it is
   * evidence that a bad number and a good one can look alike. So the flag is read off the
   * quality and never inferred from the distance.
   */
  it('flags a poor capture even at a perfect distance', () => {
    const d = differenceFrom(TARGET, TARGET, POOR, POLES);
    expect(d.deltaE00).toBeCloseTo(0, 6);
    expect(d.poorCapture).toBe(true);
  });

  it('does not flag a good capture at a large distance', () => {
    // The decoy: a flag that were always true would satisfy the case above.
    const d = differenceFrom(TARGET, colour(0.9, 0.02, 90), GOOD, POLES);
    expect(d.deltaE00).toBeGreaterThan(10);
    expect(d.poorCapture).toBe(false);
  });

  it('carries the conditions through, so a number is never read without them', () => {
    const d = differenceFrom(TARGET, TARGET, POOR, POLES);
    expect(d.capture).toEqual(POOR);
  });
});
