/**
 * How a colour value came to exist — and the reason it is a **discriminated union** rather
 * than an interface with an optional field.
 *
 * [ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md) says `conditions`
 * is "required when source is `estimated` or `calibrated`". There are two ways to write
 * that, and only one of them is true:
 *
 * ```ts
 * // The comment version. An estimate that lost its capture conditions still compiles.
 * interface Provenance { source: MeasurementSource; conditions?: CaptureConditions }
 *
 * // The type version. It does not.
 * type Provenance = Untracked | Measured;
 * ```
 *
 * The first is a note asking people to be careful; the second makes the careless object
 * unbuildable. That distinction is the entire argument of ADR-0005 applied one level down —
 * [[provenance-in-the-type-is-what-makes-honesty-structural]].
 *
 * The cost is real and worth stating: `keyof Provenance` on a union is the **common** keys
 * only, so any check written against `keyof` silently checks less than it looks like it
 * does. The wire-schema pin in `@irodora/contracts` had to be rewritten rather than
 * adjusted for exactly that reason.
 */

import type { ColorSpace } from '@irodora/color-spaces';

/**
 * How a colour value came to exist. Determines what may be claimed about it.
 *
 * The claims copy lint (F-025, NFR-21) binds permissible language to this: only `reference`
 * and `calibrated` may appear near the word "measured".
 */
export type MeasurementSource = 'reference' | 'calibrated' | 'estimated' | 'declared';

/** The sources that come from a capture, and therefore owe their conditions. */
export type CapturedSource = Extract<MeasurementSource, 'calibrated' | 'estimated'>;

/** The sources that do not: a published reference value, or a hex someone typed. */
export type UntrackedSource = Exclude<MeasurementSource, CapturedSource>;

/** FR-17. Shown *before* the colour value, and it reduces reported confidence. */
export type Illuminant =
  'daylight' | 'warm-indoor' | 'cool-indoor' | 'mixed' | 'low-light' | 'unknown';

/** FR-18. `poor` blocks a confident claim and returns an actionable instruction. */
export type CaptureQuality = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * The camera and settings a capture came from.
 *
 * Deliberately minimal and deliberately all-optional: the fields that can be read reliably
 * differ by platform, and inventing a field the Lens cannot fill would be inviting a
 * placeholder. F-040 (the Lens) adds what it can actually measure.
 */
export interface DeviceProfile {
  readonly model?: string | undefined;
  readonly os?: string | undefined;
  /** The capture colour space, READ rather than assumed. Unknown caps the confidence. */
  readonly captureSpace?: ColorSpace | undefined;
}

/** The conditions a capture happened under (FR-17, FR-18). */
export interface CaptureConditions {
  readonly illuminant: Illuminant;
  readonly quality: CaptureQuality;
  /** How many pixels were sampled. A single pixel is a coin toss on real fabric. */
  readonly sampleCount: number;
  /** Spread across the sampled pixels. High variance is a pattern, not a colour. */
  readonly variance: number;
  readonly device?: DeviceProfile | undefined;
}

/** What every provenance carries, whatever its source. */
interface ProvenanceCommon {
  /** [0,1]. A bounded quality signal from stated inputs — **not** a probability. */
  readonly confidence: number;
  /** The space this value ARRIVED in. Round-tripping is only honest back to it. */
  readonly originSpace: ColorSpace;
  /**
   * `| undefined` is not noise. Under `exactOptionalPropertyTypes`, `?: string` promises the
   * key is either absent or a string and never present-and-undefined — a promise nothing
   * arriving through a validator can keep.
   */
  readonly capturedAt?: string | undefined;
}

/** A published reference value, or a colour someone declared. No capture, no conditions. */
export interface UntrackedProvenance extends ProvenanceCommon {
  readonly source: UntrackedSource;
}

/** A capture. `conditions` is required — that is the whole point of the union. */
export interface CapturedProvenance extends ProvenanceCommon {
  readonly source: CapturedSource;
  readonly conditions: CaptureConditions;
}

export type Provenance = UntrackedProvenance | CapturedProvenance;

/** Narrowing helper, so callers do not re-derive which sources owe conditions. */
export function isCaptured(provenance: Provenance): provenance is CapturedProvenance {
  return provenance.source === 'estimated' || provenance.source === 'calibrated';
}

/** Thrown when a provenance is structurally valid but says something impossible. */
export class ProvenanceError extends Error {
  constructor(detail: string) {
    super(`provenance: ${detail}`);
    this.name = 'ProvenanceError';
  }
}

/**
 * Check what the type cannot.
 *
 * The union guarantees the *shape*; these are the value constraints that a number sneaking
 * in from a validator or a database could still violate. Called by every constructor, so
 * there is no path that skips it.
 */
export function assertProvenance(provenance: Provenance): void {
  // Widened to `unknown` on purpose, and not defensive programming for its own sake. The
  // type stops a TypeScript caller; nothing stops a value arriving from `JSON.parse`, a
  // database row, or a JavaScript consumer of the published package — and for those,
  // destructuring `undefined` produces "Cannot destructure property 'confidence'", which
  // tells the reader nothing about what they actually did wrong.
  const value: unknown = provenance;
  if (typeof value !== 'object' || value === null)
    throw new ProvenanceError(
      `required, and must be an object; got ${value === null ? 'null' : typeof value}. ` +
        'A colour without provenance is the thing ADR-0005 exists to make impossible.',
    );

  const record = value as Record<string, unknown>;
  const source = record['source'];
  if (
    typeof source !== 'string' ||
    !['reference', 'calibrated', 'estimated', 'declared'].includes(source)
  )
    throw new ProvenanceError(`source must be a MeasurementSource; got ${JSON.stringify(source)}`);

  const { confidence } = provenance;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
    throw new ProvenanceError(`confidence must be within [0,1]; got ${String(confidence)}`);

  if (!isCaptured(provenance)) return;

  const { sampleCount, variance } = provenance.conditions;
  if (!Number.isInteger(sampleCount) || sampleCount < 1)
    throw new ProvenanceError(
      `a capture sampled at least one pixel; got sampleCount ${String(sampleCount)}`,
    );
  if (!Number.isFinite(variance) || variance < 0)
    throw new ProvenanceError(`variance cannot be negative; got ${String(variance)}`);
}
