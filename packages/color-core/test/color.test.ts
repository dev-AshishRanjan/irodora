/**
 * The `Color` value type, and the objects it must refuse to build.
 *
 * Most of the value here is in `@ts-expect-error`: `tsc` errors on an *unused* directive, so
 * every one of them is an assertion that the type still rejects what it claims to. Delete
 * the requirement and `pnpm typecheck` goes red on the directive rather than quietly passing.
 */

import { srgbToXyz } from '@irodora/color-spaces';
import { describe, expect, it } from 'vitest';
import {
  fromSpace,
  fromXyz,
  isCaptured,
  ProvenanceError,
  unsafeFromHex,
  UNSAFE_HEX_PROVENANCE,
  withProvenance,
  type CaptureConditions,
  type Color,
  type Provenance,
} from '../src/index.js';

const conditions: CaptureConditions = {
  illuminant: 'warm-indoor',
  quality: 'good',
  sampleCount: 1000,
  variance: 0.004,
};

const declared: Provenance = { source: 'declared', confidence: 0.5, originSpace: 'srgb' };
const estimated: Provenance = {
  source: 'estimated',
  confidence: 0.81,
  originSpace: 'srgb',
  conditions,
};

describe('a colour cannot exist without its provenance', () => {
  it('builds one that has it — the baseline', () => {
    // Without this, every rejection below would also pass for a type that rejects
    // everything. [[a-decoy-that-is-not-broken-proves-nothing]]
    const color = fromXyz(srgbToXyz([0.2, 0.3, 0.4]), declared);
    expect(color.provenance.source).toBe('declared');
    expect(color.xyz).toHaveLength(3);
  });

  it('does not compile without provenance — and throws clearly if called anyway', () => {
    // Two assertions in one, deliberately. The `@ts-expect-error` is the compile-time half.
    // The runtime half matters because this package is published: a JavaScript consumer, or
    // a value arriving from `JSON.parse`, reaches `assertProvenance` with nothing at all,
    // and "Cannot destructure property 'confidence'" would tell them nothing.
    expect(() => {
      // @ts-expect-error — provenance is positional and has no default. This is ADR-0005.
      const missing: Color = fromXyz(srgbToXyz([0, 0, 0]));
      return missing;
    }).toThrow(ProvenanceError);
  });

  it('does not compile with provenance made optional', () => {
    // The edit that would undo the whole design, asserted to be a type error rather than
    // left to review.
    // @ts-expect-error — `provenance` is required on Color.
    const loose: Color = { xyz: srgbToXyz([0, 0, 0]) };
    void loose;
  });
});

describe('an estimate cannot lose its capture conditions', () => {
  it('accepts one that has them — the baseline', () => {
    const color = fromXyz(srgbToXyz([0.5, 0.5, 0.5]), estimated);
    expect(isCaptured(color.provenance)).toBe(true);
    if (isCaptured(color.provenance)) expect(color.provenance.conditions.quality).toBe('good');
  });

  it('does not compile for `estimated` without conditions', () => {
    // The discriminated union's entire purpose. With `conditions?: CaptureConditions` on a
    // flat interface, this object would be perfectly legal.
    // @ts-expect-error — `estimated` requires `conditions`.
    const bad: Provenance = { source: 'estimated', confidence: 0.9, originSpace: 'srgb' };
    void bad;
  });

  it('does not compile for `calibrated` without conditions either', () => {
    // @ts-expect-error — `calibrated` is a capture too.
    const bad: Provenance = { source: 'calibrated', confidence: 0.95, originSpace: 'lab' };
    void bad;
  });

  it('does not compile for `declared` WITH conditions', () => {
    // The other direction, which matters just as much: a typed hex value did not come from
    // a capture, and attaching conditions to it would be inventing a measurement.
    //
    // The directive sits against the OFFENDING PROPERTY, not above the statement:
    // `@ts-expect-error` suppresses the next LINE, and Prettier reflowing an object literal
    // moves the error away from a directive placed above the whole declaration — which turns
    // a passing negative test into "Unused '@ts-expect-error' directive".
    const bad: Provenance = {
      source: 'declared',
      confidence: 0.5,
      originSpace: 'srgb',
      // @ts-expect-error — `declared` has no conditions.
      conditions,
    };
    void bad;
  });
});

describe('the checks the type cannot make', () => {
  it('rejects a confidence outside [0,1]', () => {
    for (const confidence of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => fromXyz(srgbToXyz([0, 0, 0]), { ...declared, confidence })).toThrow(
        ProvenanceError,
      );
    // Both ends are legal, so the assertion above is about the range and not about throwing.
    for (const confidence of [0, 1])
      expect(() => fromXyz(srgbToXyz([0, 0, 0]), { ...declared, confidence })).not.toThrow();
  });

  it('rejects a capture that sampled nothing', () => {
    const bad = { ...estimated, conditions: { ...conditions, sampleCount: 0 } };
    expect(() => fromXyz(srgbToXyz([0, 0, 0]), bad)).toThrow(/at least one pixel/u);
  });

  it('rejects a negative variance', () => {
    const bad = { ...estimated, conditions: { ...conditions, variance: -1 } };
    expect(() => fromXyz(srgbToXyz([0, 0, 0]), bad)).toThrow(/variance cannot be negative/u);
  });

  it('rejects non-finite XYZ', () => {
    expect(() => fromXyz([Number.NaN, 0, 0], declared)).toThrow(TypeError);
  });
});

describe('originSpace records where the value actually came from', () => {
  it('is taken from the constructor, not from the caller', () => {
    // A caller converting from Display-P3 while labelling it `srgb` has produced a value
    // whose round trip is dishonest. `fromSpace` does not accept the argument that would
    // let them.
    const color = fromSpace('display-p3', [1, 0, 0], { source: 'declared', confidence: 0.5 });
    expect(color.provenance.originSpace).toBe('display-p3');
  });

  it('does not compile if the caller tries to pass originSpace anyway', () => {
    const bad = fromSpace('srgb', [0, 0, 0], {
      source: 'declared',
      confidence: 0.5,
      // @ts-expect-error — `originSpace` is set by `fromSpace`, never supplied.
      originSpace: 'oklch',
    });
    void bad;
  });

  it('agrees with the direct construction for the same colour', () => {
    const viaSpace = fromSpace('srgb', [0.2, 0.4, 0.6], { source: 'declared', confidence: 0.5 });
    const direct = fromXyz(srgbToXyz([0.2, 0.4, 0.6]), declared);
    expect(viaSpace.xyz).toEqual(direct.xyz);
  });
});

describe('unsafeFromHex', () => {
  it('records exactly what ADR-0005 says it must', () => {
    const color = unsafeFromHex('#8B857E');
    expect(color.provenance).toEqual(UNSAFE_HEX_PROVENANCE);
    expect(color.provenance.source).toBe('declared');
    expect(color.provenance.confidence).toBe(0.5);
  });

  it('accepts the short form and is case-insensitive', () => {
    expect(unsafeFromHex('#abc').xyz).toEqual(unsafeFromHex('#AABBCC').xyz);
    expect(unsafeFromHex('aabbcc').xyz).toEqual(unsafeFromHex('#AABBCC').xyz);
  });

  it('throws rather than guessing', () => {
    for (const bad of ['', '#', '#12', '#12345', 'rebeccapurple', '#gggggg'])
      expect(() => unsafeFromHex(bad), bad).toThrow(TypeError);
  });

  it('is not a way to claim confidence it does not have', () => {
    // 0.5 is the honest value for "a string with no history". A 1.0 here would let the
    // claims lint (F-025) permit language this colour cannot support.
    expect(UNSAFE_HEX_PROVENANCE.confidence).toBeLessThan(1);
    expect(UNSAFE_HEX_PROVENANCE.source).not.toBe('measured' as never);
  });
});

describe('withProvenance', () => {
  it('replaces provenance without touching the value', () => {
    const original = unsafeFromHex('#526A6B');
    const corrected = withProvenance(original, estimated);
    expect(corrected.xyz).toEqual(original.xyz);
    expect(corrected.provenance).toEqual(estimated);
  });

  it('validates the replacement', () => {
    const original = unsafeFromHex('#526A6B');
    expect(() => withProvenance(original, { ...declared, confidence: 2 })).toThrow(ProvenanceError);
  });

  it('takes a whole provenance, never a patch', () => {
    // A partial update is how an `estimated` source silently keeps someone else's
    // `conditions`. Rejected at compile time, and at runtime for the same reason as above.
    expect(() => {
      // @ts-expect-error — a patch is not a Provenance.
      const bad = withProvenance(unsafeFromHex('#000'), { confidence: 0.9 });
      return bad;
    }).toThrow(ProvenanceError);
  });
});
