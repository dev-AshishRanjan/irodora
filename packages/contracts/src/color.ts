/**
 * Colour on the wire.
 *
 * ## Why these schemas are derived from the engine rather than owning it
 *
 * `packages/color-*` has zero runtime dependencies and must produce byte-identical results
 * in Node, the browser and React Native (NFR-3). Zod is a runtime dependency. The engine
 * therefore cannot own its own schemas, and declares `Provenance`, `MeasurementSource` and
 * `ReproducibilityEnvelope` as plain TypeScript instead.
 *
 * That leaves one shape defined in two places, which is the exact thing
 * `.harness/rules/typescript/typescript.md` forbids. It is forced by a golden constraint,
 * so it is recorded as ADR-0036 — and made safe rather than tolerated: `color.test.ts`
 * asserts the schema and the engine type are mutually assignable, at compile time. Drift in
 * either direction fails `pnpm typecheck`.
 *
 * The dependency runs one way only. The engine never learns about the wire.
 */

import { z } from 'zod';

import { corpusVersionSchema, semanticVersionSchema, unitIntervalSchema } from './primitives.js';

/**
 * Spaces a colour may arrive in or be rendered to. Never canonical — CIE XYZ (D65) is
 * (ADR-0003), and it is deliberately absent from the wire: a client sending XYZ would be
 * asserting a canonical value it has no way to have measured.
 */
export const colorSpaceSchema = z.enum([
  'srgb',
  'display-p3',
  'linear-srgb',
  'lab',
  'lch',
  'oklab',
  'oklch',
]);

/** How a colour value came to exist. Determines what may be claimed about it (ADR-0031). */
export const measurementSourceSchema = z.enum(['reference', 'calibrated', 'estimated', 'declared']);

/**
 * Required on every colour that crosses a boundary (FR-9, ADR-0005). Not optional, not
 * defaulted, not inferred from context — an unclassified colour must be impossible to
 * construct, and `.optional()` here would be the one edit that makes it possible again.
 */
/** FR-17. Shown before the result, and it reduces reported confidence. */
export const illuminantSchema = z.enum([
  'daylight',
  'warm-indoor',
  'cool-indoor',
  'mixed',
  'low-light',
  'unknown',
]);

/** FR-18. `poor` blocks a confident claim. */
export const captureQualitySchema = z.enum(['excellent', 'good', 'fair', 'poor']);

export const deviceProfileSchema = z.object({
  model: z.string().min(1).optional(),
  os: z.string().min(1).optional(),
  /** The capture colour space, READ rather than assumed. Unknown caps the confidence. */
  captureSpace: colorSpaceSchema.optional(),
});

export const captureConditionsSchema = z.object({
  illuminant: illuminantSchema,
  quality: captureQualitySchema,
  sampleCount: z.int().positive(),
  variance: z.number().nonnegative(),
  device: deviceProfileSchema.optional(),
});

const provenanceCommon = {
  confidence: unitIntervalSchema,
  /** The space this value ARRIVED in. Round-tripping is only honest back to it. */
  originSpace: colorSpaceSchema,
  capturedAt: z.iso.datetime().optional(),
};

/**
 * A published reference value, or a colour someone declared. No capture, no conditions.
 *
 * Split from the captured case because ADR-0005 requires `conditions` when the source is
 * `estimated` or `calibrated`, and an OPTIONAL field would only ask nicely. A
 * discriminated union refuses the object instead — matching the engine's `Provenance`,
 * which is pinned to this at compile time (ADR-0036).
 */
export const untrackedProvenanceSchema = z.object({
  source: z.enum(['reference', 'declared']),
  ...provenanceCommon,
});

/** A capture. `conditions` is required, and that is the whole point of the union. */
export const capturedProvenanceSchema = z.object({
  source: z.enum(['calibrated', 'estimated']),
  ...provenanceCommon,
  conditions: captureConditionsSchema,
});

export const provenanceSchema = z.discriminatedUnion('source', [
  untrackedProvenanceSchema,
  capturedProvenanceSchema,
]);

/** A colour value as it appears in a request or a response. */
export const colorValueSchema = z.object({
  space: colorSpaceSchema,
  components: z.tuple([z.number(), z.number(), z.number()]),
  provenance: provenanceSchema,
});

/**
 * The version tuple stored with every derived result, so any answer can be replayed
 * (FR-10). Returned on `X-Irodora-Envelope` and embedded in every export.
 */
export const reproducibilityEnvelopeSchema = z.object({
  engine: semanticVersionSchema,
  corpus: corpusVersionSchema,
  /** Rule weights ship from `content/` on the same publish scheme as the corpus, so they carry the same version shape. */
  rules: corpusVersionSchema,
  profile: z.string().min(1).optional(),
});

export type ColorSpaceWire = z.infer<typeof colorSpaceSchema>;
export type MeasurementSourceWire = z.infer<typeof measurementSourceSchema>;
export type ProvenanceWire = z.infer<typeof provenanceSchema>;
export type UntrackedProvenanceWire = z.infer<typeof untrackedProvenanceSchema>;
export type CapturedProvenanceWire = z.infer<typeof capturedProvenanceSchema>;
export type CaptureConditionsWire = z.infer<typeof captureConditionsSchema>;
export type IlluminantWire = z.infer<typeof illuminantSchema>;
export type CaptureQualityWire = z.infer<typeof captureQualitySchema>;
export type DeviceProfileWire = z.infer<typeof deviceProfileSchema>;
export type ColorValue = z.infer<typeof colorValueSchema>;
export type ReproducibilityEnvelopeWire = z.infer<typeof reproducibilityEnvelopeSchema>;
