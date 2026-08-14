/**
 * The colour engine facade.
 *
 * A Colour cannot exist without its Provenance (ADR-0005). That is what makes it
 * structurally impossible to render an estimate as though it were a measurement.
 */

import type { ColorSpace } from '@irodora/color-spaces';

/** How a colour value came to exist. Determines what may be claimed about it. */
export type MeasurementSource = 'reference' | 'calibrated' | 'estimated' | 'declared';

export interface Provenance {
  readonly source: MeasurementSource;
  /** [0,1]. A bounded quality signal from stated inputs — NOT a probability. */
  readonly confidence: number;
  /** The space this value ARRIVED in. Round-tripping is only honest back to it. */
  readonly originSpace: ColorSpace;
  readonly capturedAt?: string;
}

/** The version tuple stored with every result, so any answer can be replayed. */
export interface ReproducibilityEnvelope {
  readonly engine: string;
  readonly corpus: string;
  readonly rules: string;
  readonly profile?: string;
}

/** Implemented in F-010. */
export const CORE_VERSION = '0.0.0' as const;
