/**
 * The Lens, at the parts that do not need a camera.
 *
 * Roughly half of F-040's acceptance is a device attestation, and this file is deliberately
 * NOT an attempt to simulate the other half. jest-expo will happily mock a camera that does
 * nothing, and "it rendered without crashing" would pass forever while proving nothing.
 *
 * What is tested here is what is actually decidable off-device: the confidence rules, the
 * modes calling the engine, and the shape of what crosses the bridge.
 */

import { CAPTURE_MODES, MODE_CEILING, read, readManual, type CaptureMode } from '../src/lens/modes';
import {
  CAPTURE_SPACES,
  SPACE_CONFIDENCE_CEILING,
  cappedConfidence,
  type CaptureSpace,
  type LensReading,
} from '../src/lens/reading';
import { MAX_SAMPLES_PER_FRAME, readCaptureSpace, sampleStride } from '../src/lens/camera';
import { aggregate, partition, type Region, type Sample } from '@irodora/color-sampling';

const px = (r: number, g: number, b: number): Sample => ({ r, g, b, alpha: 1 });

function textured(width: number, height: number): Region {
  const samples: Sample[] = [];
  for (let row = 0; row < height; row += 1)
    for (let col = 0; col < width; col += 1) {
      const t = ((row + col) % 2 === 0 ? 1 : -1) * 0.03;
      samples.push(px(0.32 + t, 0.42 + t, 0.43 + t));
    }
  return { samples, width, height };
}

const GOOD = textured(40, 40);

/**
 * A region with neutral highlights, so illumination classifies as daylight.
 *
 * Needed because the mode ceiling is only observable when it is the BINDING constraint: on a
 * region with no highlights the illumination assessment returns 'unknown' and caps everything
 * at 0.6, which is below live's 0.7 — so both modes returned 0.6 and the test could not see
 * the difference it was written to check.
 */
const LIT: Region = (() => {
  const base = textured(40, 40);
  // A CONTIGUOUS block of identical highlights, not one scattered per row. Scattered, the
  // brightest quantile picked up bright texture pixels alongside them, the blue/red ratios
  // disagreed, and the scene classified as MIXED — a second illuminant that was not there.
  const samples = base.samples.map((s, i) => (i < 100 ? px(0.9, 0.96, 1) : s));
  return { samples, width: 40, height: 40 };
})();

describe('an unread colour space costs confidence rather than being guessed', () => {
  it('caps confidence when the platform will not say', () => {
    // apps/mobile/AGENTS.md: read the capture colour space, never assume it. A P3 frame
    // interpreted as sRGB is wrong in exactly the saturated colours this product cares most
    // about — and the error is largest where it is least visible as an error.
    expect(SPACE_CONFIDENCE_CEILING.unknown).toBeLessThan(1);
    expect(SPACE_CONFIDENCE_CEILING.srgb).toBe(1);
    expect(SPACE_CONFIDENCE_CEILING['display-p3']).toBe(1);
  });

  it('treats unknown as a first-class space, not an error', () => {
    // The product keeps working on it. A reading in an unknown space is still useful; it is
    // simply not something we may sound certain about.
    expect(CAPTURE_SPACES).toContain('unknown');
    const reading = read('precision', { region: GOOD, space: 'unknown' });
    expect(reading.rgb).toHaveLength(3);
    expect(reading.confidence).toBeLessThanOrEqual(SPACE_CONFIDENCE_CEILING.unknown);
  });

  it('takes the MINIMUM of every ceiling, never a product', () => {
    // Three ceilings multiplied would give a number lower than any single assessment
    // justified — a different lie from the one being avoided, but still a lie.
    expect(cappedConfidence('unknown', 1, 1)).toBe(0.6);
    expect(cappedConfidence('srgb', 0.5, 0.9)).toBe(0.5);
    expect(cappedConfidence('unknown', 0.5, 0.9)).toBe(0.5);
    expect(cappedConfidence('unknown', 0.9, 0.9)).not.toBeCloseTo(0.6 * 0.9 * 0.9, 5);
  });
});

describe('all four capture modes exist and each calls the engine', () => {
  it('has exactly four, each with a declared ceiling', () => {
    expect(CAPTURE_MODES).toHaveLength(4);
    for (const mode of CAPTURE_MODES) expect(MODE_CEILING[mode]).toBeGreaterThan(0);
  });

  it('returns the ENGINE result, not a number computed here', () => {
    // The assertion that makes "calls the engine" a fact rather than an intention: the value
    // is recomputed independently through @irodora/color-sampling and must match exactly.
    const reading = read('precision', { region: GOOD, space: 'srgb' });
    const expected = aggregate(partition(GOOD.samples).kept).trimmedMean;
    expect(reading.rgb[0]).toBe(expected.r);
    expect(reading.rgb[1]).toBe(expected.g);
    expect(reading.rgb[2]).toBe(expected.b);
  });

  it('gives live capture a lower ceiling than a deliberate one', () => {
    // A continuous readout under a moving crosshair cannot be as trustworthy as a chosen
    // region, even when the pixels happen to be identical — which is exactly what this
    // compares, so the difference can only come from the mode.
    const live = read('live', { region: LIT, space: 'srgb' });
    const precise = read('precision', { region: LIT, space: 'srgb' });
    expect(live.rgb).toEqual(precise.rgb);
    expect(live.confidence).toBeLessThan(precise.confidence);
  });

  it('reports a manual entry as unknown illumination, never daylight', () => {
    // Nothing was measured, so claiming a lighting condition would be a claim about a room
    // nobody looked at.
    const manual = readManual([0.32, 0.42, 0.43]);
    expect(manual.illumination).toBe('unknown');
    expect(manual.usableSamples).toBe(0);
  });
});

describe('only numbers cross the bridge', () => {
  it('carries no field that could hold pixels', () => {
    // The TYPE is the mechanism — there is no field a frame, buffer, path or URI could be
    // assigned to, so passing one does not compile. This asserts the runtime shape matches.
    const reading: LensReading = read('garment-scan', { region: GOOD, space: 'srgb' });
    expect(Object.keys(reading).sort()).toEqual([
      'confidence',
      'illumination',
      'instruction',
      'quality',
      'rgb',
      'space',
      'usableSamples',
      'variance',
    ]);
    for (const [key, value] of Object.entries(reading)) {
      if (key === 'rgb') continue;
      // The key is folded into the compared value so a failure names WHICH field, since
      // jest's `expect` takes no message argument.
      expect(`${key}:${typeof value}`).toMatch(/:(number|string)$/u);
    }
  });

  it('DOES NOT COMPILE if a frame is added to the reading', () => {
    // @ts-expect-error — there is no field for pixel data, and adding one must be a compile
    // error rather than a review comment. If this ever starts compiling, tsc fails on the
    // unused directive.
    const leaky: LensReading = { ...read('live', { region: GOOD, space: 'srgb' }), frame: [1, 2] };
    void leaky;
  });

  it('DOES NOT COMPILE for a capture space outside the declared set', () => {
    // @ts-expect-error — 'adobe-rgb' is not a space this app can read, and silently accepting
    // one would be the assumption the colour-space rule exists to prevent.
    const bad: CaptureSpace = 'adobe-rgb';
    void bad;
  });

  it('DOES NOT COMPILE for a mode outside the four', () => {
    // @ts-expect-error — "all four capture modes" is the acceptance criterion; a fifth would
    // mean the criterion no longer describes the code.
    const bad: CaptureMode = 'burst';
    void bad;
  });
});

describe('the capture colour space is read, never assumed', () => {
  it('recognises what it knows, and refuses to guess at what it does not', () => {
    expect(readCaptureSpace('display-p3')).toBe('display-p3');
    expect(readCaptureSpace('Display P3')).toBe('display-p3');
    expect(readCaptureSpace('srgb')).toBe('srgb');
    // Rec.2020 and Adobe RGB are real values a real device can report. Neither is sRGB, and
    // falling back to sRGB would give a confident answer that is wrong in exactly the
    // saturated colours this product exists for.
    expect(readCaptureSpace('rec2020')).toBe('unknown');
    expect(readCaptureSpace('adobe-rgb')).toBe('unknown');
    expect(readCaptureSpace(null)).toBe('unknown');
    expect(readCaptureSpace(undefined)).toBe('unknown');
    expect(readCaptureSpace('')).toBe('unknown');
  });

  it('costs confidence when it is unknown, rather than being silently sRGB', () => {
    // LIT, not GOOD: on a region with no highlights the ILLUMINATION ceiling is also 0.6,
    // so it binds first and the space ceiling becomes invisible. Third time that has caught a
    // fixture in this feature — 'unknown' illumination is a strong default cap doing real work.
    const unknown = read('precision', { region: LIT, space: readCaptureSpace('rec2020') });
    const known = read('precision', { region: LIT, space: readCaptureSpace('srgb') });
    expect(unknown.space).toBe('unknown');
    expect(unknown.confidence).toBeLessThan(known.confidence);
  });
});

describe('the sample that crosses the bridge is bounded', () => {
  it('never returns a stride of zero, which would hang the camera pipeline', () => {
    // A stride of 0 loops forever on the WORKLET thread. That is not a hang anyone can
    // debug — the preview simply stops, with no error anywhere.
    for (const pixels of [0, 1, 999, 2000, 2_073_600]) {
      expect(`${String(pixels)}:${String(sampleStride(pixels) >= 1)}`).toMatch(/:true$/u);
    }
  });

  it('keeps a 1080p frame under the cap', () => {
    // ~2 million pixels down to at most 2000 — three orders of magnitude, and what crosses is
    // a flat array of numbers with no reference to the buffer it came from.
    const pixels = 1920 * 1080;
    expect(Math.floor(pixels / sampleStride(pixels))).toBeLessThanOrEqual(MAX_SAMPLES_PER_FRAME);
  });

  it('leaves headroom above FR-15 floor, because rejection happens AFTER the crossing', () => {
    // Sending exactly 1000 would leave fewer than 1000 usable once specular and shadow
    // pixels are discarded on the other side.
    expect(MAX_SAMPLES_PER_FRAME).toBeGreaterThan(1000);
  });
});
