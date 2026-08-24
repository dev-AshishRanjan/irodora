/**
 * The Dynamic Type ramp each step scales along.
 *
 * Two kinds of assertion here, and the second is the reason the file exists.
 *
 * **Behaviour** — the nearest-size match, including the tie our own scale actually produces.
 *
 * **A pin.** The whole step → ramp table, asserted literally. It is derived, so changing the
 * type scale silently changes every ramp with it — and a derivation nobody can see change is
 * the same hazard as a hand-written copy that nobody remembers to update. The pin turns it
 * into a diff someone has to read.
 */

import { describe, expect, it } from 'vitest';
import {
  APPLE_TYPE_RAMP,
  dynamicTypeRampFor,
  nativeDynamicTypeRamp,
  nativeType,
} from '../src/index.js';

describe('the nearest-size match', () => {
  it('an exact size returns its own ramp', () => {
    for (const { ramp, pt } of APPLE_TYPE_RAMP) {
      // `headline` and `body` are BOTH 17pt and differ only in weight, so 17 is a tie the
      // ascending walk resolves to the later one. Asserting equality there would be asserting
      // the tie-break, which the dedicated test below does on purpose.
      if (pt === 17) continue;
      expect(dynamicTypeRampFor(pt), `${String(pt)}pt`).toBe(ramp);
    }
  });

  it('resolves a tie to the LARGER ramp, which our own scale hits at xs', () => {
    // 11.5 is exactly equidistant from caption2 (11) and caption1 (12). This is a live case,
    // not a defensive one — it is the size of the `xs` step.
    expect(Math.abs(11.5 - 11)).toBe(Math.abs(11.5 - 12));
    expect(dynamicTypeRampFor(11.5)).toBe('caption1');
  });

  it('clamps above the largest ramp rather than returning nothing', () => {
    // display.1 is 72px. Apple publishes nothing above 34, and there is no curve beyond it.
    expect(dynamicTypeRampFor(72)).toBe('largeTitle');
    expect(dynamicTypeRampFor(1000)).toBe('largeTitle');
  });

  it('clamps below the smallest', () => {
    expect(dynamicTypeRampFor(1)).toBe('caption2');
  });

  it('is a total function over the scale — every step gets a ramp', () => {
    const names = Object.keys(nativeType.latin);
    expect(Object.keys(nativeDynamicTypeRamp).sort()).toEqual(names.sort());
  });
});

describe('THE PIN — the emitted table, asserted literally', () => {
  it('has not changed', () => {
    // If this fails, the type scale moved. That is allowed; it is a DESIGN change, and the
    // right response is to read the new mapping and update this table deliberately — not to
    // relax the assertion.
    expect(nativeDynamicTypeRamp).toEqual({
      'display.1': 'largeTitle',
      'display.2': 'largeTitle',
      title: 'title2',
      body: 'subheadline',
      small: 'footnote',
      xs: 'caption1',
      label: 'caption2',
    });
  });

  it('body maps by SIZE, not by name, and that is the point', () => {
    // Our `body` is 15px; Apple's `body` is 17. Matching by name would scale our body text
    // along a curve calibrated for something larger, so it would drift from its intended
    // appearance as the user's setting moves.
    expect(nativeType.latin.body.fontSize).toBe(15);
    expect(nativeDynamicTypeRamp.body).toBe('subheadline');
    expect(nativeDynamicTypeRamp.body).not.toBe('body');
  });
});
