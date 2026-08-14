/**
 * Golden datasets, property helpers and fixtures. Dev-only; never published.
 *
 * Everything here is deliberately free of workspace dependencies and of platform APIs. The
 * cross-platform identity check (NFR-3) executes this code in Node, in a browser and on a
 * React Native device, and a package that cannot be loaded in all three cannot host it.
 *
 * The absence of an `@irodora/*` dependency is also what keeps the Turborepo graph acyclic:
 * `@irodora/color-spaces` devDepends on this package, and F-010 will make
 * `@irodora/color-core` depend on `@irodora/color-spaces`.
 */

export { createPrng, type Prng } from './prng.js';
export { sampleSrgb, STRATA_CYCLE, type Sample, type Stratum, type Triple } from './sampling.js';
export { float64ToHex, hexToFloat64, float64Digest } from './bits.js';
export {
  runIdentityVectors,
  type IdentityOptions,
  type IdentityProbe,
  type IdentityRun,
} from './identity.js';
export {
  assertGoldenDataset,
  type GoldenDataset,
  type GoldenEntry,
  type GoldenDerivation,
} from './golden.js';

export const TESTING_VERSION = '0.1.0' as const;
