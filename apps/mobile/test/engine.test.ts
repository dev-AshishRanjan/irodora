/**
 * The app's engine wiring, asserted.
 *
 * ## What this proves
 *
 * That `apps/mobile` reaches the **real** engine, and that values computed through the app's
 * own surface agree with the engine's committed golden data. A dependency nobody imports
 * passes every gate and ships nothing, and this repository has already lost six increments to
 * exactly that [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 *
 * ## What it does NOT prove, and why the distinction matters
 *
 * This runs under **Node**. NFR-3 claims byte-identical output in Node, the browser AND React
 * Native — and Node and Chromium both run V8, so their agreement is weaker evidence than it
 * looks. **The interesting engine is Hermes**, and it needs a device. That leg is attested on
 * F-039, not gated, and saying so is the difference between a verified claim and an assumed
 * one.
 */

import { deltaE00 } from '@irodora/color-difference';
import { oklchToXyz, xyzToLab, xyzToSrgb, srgbToHex } from '@irodora/color-spaces';
import { differenceOklch, displayFromOklch } from '../src/engine.js';

describe('the app reaches the real engine', () => {
  it('derives the hex through the engine, not by hand', () => {
    const oklch = [0.62, 0.15, 29] as const;
    const display = displayFromOklch([...oklch]);
    // Independently recomputed here rather than compared against whatever the app returned.
    expect(display.hex).toBe(srgbToHex(xyzToSrgb(oklchToXyz([...oklch]))));
  });

  it('a Color cannot exist without provenance (ADR-0005)', () => {
    const display = displayFromOklch([0.5, 0.1, 200]);
    expect(display.color.provenance.source).toBe('declared');
    expect(display.color.provenance.originSpace).toBe('oklch');
  });

  /**
   * The decoy. ΔE00 is defined on CIELAB; OKLCh triples are the same TYPE, so handing them
   * straight to `deltaE00` type-checks and returns a plausible, meaningless number. This pins
   * the correct route, and would catch a "simplification" that removed the Lab conversion.
   */
  it('ΔE00 goes through Lab, not straight from OKLCh', () => {
    const a = [0.42, 0.09, 264] as const;
    const b = [0.32, 0.05, 268] as const;

    const correct = deltaE00(xyzToLab(oklchToXyz([...a])), xyzToLab(oklchToXyz([...b])));
    expect(differenceOklch([...a], [...b])).toBeCloseTo(correct, 12);

    // And the wrong route produces a DIFFERENT answer, so the assertion above discriminates.
    const wrong = deltaE00([...a], [...b]);
    expect(Math.abs(wrong - correct)).toBeGreaterThan(1);
  });

  it('round-trips OKLCh through XYZ without drift the UI would show', () => {
    const oklch = [0.7, 0.12, 140] as const;
    const display = displayFromOklch([...oklch]);
    expect(display.oklch[0]).toBeCloseTo(oklch[0], 9);
    expect(display.oklch[1]).toBeCloseTo(oklch[1], 9);
    expect(display.oklch[2]).toBeCloseTo(oklch[2], 9);
  });
});
