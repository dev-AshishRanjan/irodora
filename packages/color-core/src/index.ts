/**
 * The colour engine facade.
 *
 * A Colour cannot exist without its Provenance (ADR-0005). That is what makes it
 * structurally impossible to render an estimate as though it were a measurement.
 */

import type { ColorSpace } from '@irodora/color-spaces';

/**
 * Re-exported because `Provenance.originSpace` is typed with it. A consumer that can hold
 * a Provenance must be able to name every type inside it, or it has to reach past this
 * package to describe what this package returned.
 */
export type { ColorSpace } from '@irodora/color-spaces';

/** How a colour value came to exist. Determines what may be claimed about it. */
export type MeasurementSource = 'reference' | 'calibrated' | 'estimated' | 'declared';

export interface Provenance {
  readonly source: MeasurementSource;
  /** [0,1]. A bounded quality signal from stated inputs — NOT a probability. */
  readonly confidence: number;
  /** The space this value ARRIVED in. Round-tripping is only honest back to it. */
  readonly originSpace: ColorSpace;
  /**
   * `| undefined` is not noise. Under `exactOptionalPropertyTypes`, `?: string` promises the
   * key is either absent or a string, and never present-and-undefined — a promise nothing
   * that arrives through a validator can keep. The wire schema in `@irodora/contracts`
   * infers the wider shape, and ADR-0036 pins the two together at compile time.
   */
  readonly capturedAt?: string | undefined;
}

/** The version tuple stored with every result, so any answer can be replayed. */
export interface ReproducibilityEnvelope {
  readonly engine: string;
  readonly corpus: string;
  readonly rules: string;
  /** `| undefined` for the same reason as `Provenance.capturedAt`. */
  readonly profile?: string | undefined;
}

/** Implemented in F-010. */
export const CORE_VERSION = '0.0.0' as const;
