import type {
  ColorSpace,
  MeasurementSource,
  Provenance,
  ReproducibilityEnvelope,
} from '@irodora/color-core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  colorSpaceSchema,
  colorValueSchema,
  measurementSourceSchema,
  provenanceSchema,
  reproducibilityEnvelopeSchema,
  type ColorSpaceWire,
  type MeasurementSourceWire,
  type ProvenanceWire,
  type ReproducibilityEnvelopeWire,
} from './color.js';

/**
 * These assertions do nothing at runtime. They fail in `pnpm typecheck`, which is the
 * point: the colour engine cannot import Zod (NFR-3), so its types and these schemas are
 * two artefacts describing one shape, and the compiler is what stops them drifting
 * (ADR-0036).
 *
 * ## Why two assertions per object type, and not one
 *
 * `toEqualTypeOf` is exact and unusable here: Zod infers mutable properties, the engine
 * declares `readonly` ones, and the check would fail forever for a difference with no wire
 * meaning.
 *
 * Mutual assignability handles that — but on its own it is **weaker than it looks**, and
 * this was proven rather than assumed. Adding `device?: string` to `provenanceSchema` and
 * running `pnpm typecheck` produced no error at all: an object with an extra OPTIONAL
 * property is still assignable in both directions. Removing an optional property slips
 * through the same hole. Both are exactly the drift this pins.
 *
 * So the key set is asserted separately. Together:
 *
 * | Drift | Caught by |
 * |---|---|
 * | field renamed, added, removed (required or optional) | the `keyof` equality |
 * | field retyped | mutual assignability |
 * | field became optional, or stopped being | mutual assignability |
 * | `readonly` differs | deliberately neither — it has no wire meaning |
 */
describe('the wire schema and the engine type are one shape (asserted by tsc)', () => {
  it('MeasurementSource', () => {
    // A plain string union: no readonly, no optionality, so exact equality is usable.
    expectTypeOf<MeasurementSourceWire>().toEqualTypeOf<MeasurementSource>();
  });

  it('ColorSpace', () => {
    expectTypeOf<ColorSpaceWire>().toEqualTypeOf<ColorSpace>();
  });

  it('Provenance', () => {
    expectTypeOf<keyof ProvenanceWire>().toEqualTypeOf<keyof Provenance>();
    expectTypeOf<ProvenanceWire>().toExtend<Provenance>();
    expectTypeOf<Provenance>().toExtend<ProvenanceWire>();
  });

  it('ReproducibilityEnvelope', () => {
    expectTypeOf<keyof ReproducibilityEnvelopeWire>().toEqualTypeOf<
      keyof ReproducibilityEnvelope
    >();
    expectTypeOf<ReproducibilityEnvelopeWire>().toExtend<ReproducibilityEnvelope>();
    expectTypeOf<ReproducibilityEnvelope>().toExtend<ReproducibilityEnvelopeWire>();
  });
});

describe('provenance is not optional', () => {
  it('rejects a colour value with no provenance', () => {
    const result = colorValueSchema.safeParse({
      space: 'oklch',
      components: [0.58, 0.06, 155],
    });

    expect(result.success).toBe(false);
  });

  it('rejects provenance without originSpace, because round-tripping is only honest back to it', () => {
    // This is the shape docs/architecture/api-contract.md §4 used to show. It is not valid.
    const result = provenanceSchema.safeParse({ source: 'estimated', confidence: 0.81 });

    expect(result.success).toBe(false);
  });

  it('rejects a confidence outside [0,1]', () => {
    expect(
      provenanceSchema.safeParse({ source: 'estimated', confidence: 1.4, originSpace: 'srgb' })
        .success,
    ).toBe(false);
  });

  it('accepts a fully classified colour and survives its own validator', () => {
    const wire = {
      space: 'oklch',
      components: [0.58, 0.06, 155],
      provenance: {
        source: 'estimated',
        confidence: 0.81,
        originSpace: 'display-p3',
        capturedAt: '2026-08-14T09:12:00Z',
      },
    };

    const parsed = colorValueSchema.parse(wire);
    expect(colorValueSchema.parse(parsed)).toStrictEqual(parsed);
  });
});

describe('enumerations are closed', () => {
  it('rejects a colour space we do not support', () => {
    // XYZ is the canonical internal representation (ADR-0003) and deliberately not on the
    // wire — a client sending it would be asserting a value it cannot have measured.
    expect(colorSpaceSchema.safeParse('xyz').success).toBe(false);
  });

  it('rejects a measurement source that sounds plausible', () => {
    // "measured" is the word someone will reach for. It is not one of the four, because
    // every one of the four says HOW (ADR-0031).
    expect(measurementSourceSchema.safeParse('measured').success).toBe(false);
  });
});

describe('the reproducibility envelope', () => {
  it('accepts the documented shape', () => {
    expect(
      reproducibilityEnvelopeSchema.safeParse({
        engine: '1.0.0',
        corpus: '2026.08.1',
        rules: '2026.08.4',
        profile: 'p_01H8XGJWBWBAQ4ZZ3N1P:v3',
      }).success,
    ).toBe(true);
  });

  it('rejects a corpus version that is not a published version', () => {
    expect(
      reproducibilityEnvelopeSchema.safeParse({
        engine: '1.0.0',
        corpus: 'latest',
        rules: '2026.08.4',
      }).success,
    ).toBe(false);
  });
});
