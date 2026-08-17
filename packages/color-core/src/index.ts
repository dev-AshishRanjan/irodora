/**
 * The colour engine facade.
 *
 * A Colour cannot exist without its Provenance (ADR-0005). That is what makes it
 * structurally impossible to render an estimate as though it were a measurement.
 *
 * **Nothing here computes a colour.** Every conversion is `@irodora/color-spaces`, every
 * metric `@irodora/color-difference`, every simulation `@irodora/cvd-engine`. This package
 * owns the *value type* and the *envelope* — what a colour is and how an answer is replayed
 * — and a conversion written here would be a second implementation in the one package
 * everything else imports.
 */

export type { ColorSpace } from '@irodora/color-spaces';

export {
  assertProvenance,
  isCaptured,
  ProvenanceError,
  type CaptureConditions,
  type CapturedProvenance,
  type CapturedSource,
  type CaptureQuality,
  type DeviceProfile,
  type Illuminant,
  type MeasurementSource,
  type Provenance,
  type UntrackedProvenance,
  type UntrackedSource,
} from './provenance.js';

export {
  fromSpace,
  fromXyz,
  unsafeFromHex,
  UNSAFE_HEX_PROVENANCE,
  withProvenance,
  type Color,
} from './color.js';

export {
  assertEnvelope,
  envelopesMatch,
  EnvelopeError,
  parseEnvelope,
  serialiseEnvelope,
  type ReproducibilityEnvelope,
} from './envelope.js';

/**
 * Semver of this package, recorded as `engine` in every `ReproducibilityEnvelope`.
 *
 * **Changing this invalidates nothing and explains everything**: an envelope written under
 * `0.1.0` must still parse and still compare after this moves, which is what the replay
 * fixture asserts.
 */
export const CORE_VERSION = '0.1.0' as const;
