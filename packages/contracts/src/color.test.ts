import type {
  CaptureConditions,
  CapturedProvenance,
  CaptureQuality,
  ColorSpace,
  DeviceProfile,
  Illuminant,
  MeasurementSource,
  Provenance,
  ReproducibilityEnvelope,
  UntrackedProvenance,
} from '@irodora/color-core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  colorSpaceSchema,
  colorValueSchema,
  measurementSourceSchema,
  provenanceSchema,
  reproducibilityEnvelopeSchema,
  type CaptureConditionsWire,
  type CapturedProvenanceWire,
  type CaptureQualityWire,
  type ColorSpaceWire,
  type DeviceProfileWire,
  type IlluminantWire,
  type MeasurementSourceWire,
  type ProvenanceWire,
  type ReproducibilityEnvelopeWire,
  type UntrackedProvenanceWire,
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

  /**
   * **`Provenance` is a discriminated union, and that broke this pin once already.**
   *
   * When it was a flat interface, `keyof ProvenanceWire` equality caught a field added,
   * removed or renamed on either side. `keyof` on a UNION returns only the keys common to
   * every member — so after F-010 made it a union, adding an optional field to one member
   * passed `pnpm typecheck` in silence. That was verified by doing it, not assumed.
   *
   * So the pin is asserted **per member**, plus the discriminant, plus the member count via
   * the union's own `source` values. Anything else keeps passing while checking less.
   */
  it('Provenance — the union as a whole', () => {
    expectTypeOf<ProvenanceWire>().toExtend<Provenance>();
    expectTypeOf<Provenance>().toExtend<ProvenanceWire>();
    // The discriminant, which is what makes the union a union. If a member is added on one
    // side only, this is where it shows.
    expectTypeOf<ProvenanceWire['source']>().toEqualTypeOf<Provenance['source']>();
    expectTypeOf<ProvenanceWire['source']>().toEqualTypeOf<MeasurementSource>();
  });

  it('Provenance — the untracked member', () => {
    expectTypeOf<keyof UntrackedProvenanceWire>().toEqualTypeOf<keyof UntrackedProvenance>();
    expectTypeOf<UntrackedProvenanceWire>().toExtend<UntrackedProvenance>();
    expectTypeOf<UntrackedProvenance>().toExtend<UntrackedProvenanceWire>();
  });

  it('Provenance — the captured member, which is the one that owes conditions', () => {
    expectTypeOf<keyof CapturedProvenanceWire>().toEqualTypeOf<keyof CapturedProvenance>();
    expectTypeOf<CapturedProvenanceWire>().toExtend<CapturedProvenance>();
    expectTypeOf<CapturedProvenance>().toExtend<CapturedProvenanceWire>();
  });

  it('CaptureConditions and its parts', () => {
    expectTypeOf<keyof CaptureConditionsWire>().toEqualTypeOf<keyof CaptureConditions>();
    expectTypeOf<CaptureConditionsWire>().toExtend<CaptureConditions>();
    expectTypeOf<CaptureConditions>().toExtend<CaptureConditionsWire>();

    expectTypeOf<IlluminantWire>().toEqualTypeOf<Illuminant>();
    expectTypeOf<CaptureQualityWire>().toEqualTypeOf<CaptureQuality>();

    expectTypeOf<keyof DeviceProfileWire>().toEqualTypeOf<keyof DeviceProfile>();
    expectTypeOf<DeviceProfileWire>().toExtend<DeviceProfile>();
    expectTypeOf<DeviceProfile>().toExtend<DeviceProfileWire>();
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
        // Required since F-010 made `provenance` a discriminated union: an ESTIMATE owes the
        // conditions it was captured under (ADR-0005). This fixture failing the moment the
        // union landed is the schema doing its job, not an inconvenience.
        conditions: {
          illuminant: 'warm-indoor',
          quality: 'good',
          sampleCount: 1200,
          variance: 0.0041,
        },
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
