/**
 * The device repository, opened once.
 *
 * ## Imported by routes only, and that is a load-bearing rule
 *
 * This module reaches `expo-sqlite` through [`./index`](./index.ts). `expo-sqlite` needs a
 * device, so a **screen** importing it could not be rendered by jest at all — and the screen
 * suite is where NFR-8 and NFR-9 are actually checked. So the screens take a narrow
 * `PaletteStore` port, the conformance registry passes an in-memory one, and the route passes
 * this.
 *
 * What that leaves unproven off-device is stated rather than implied: `typecheck` proves this
 * satisfies the port, and `screens.test.tsx` proves the route imports it — nothing in CI
 * proves a row reaches SQLCipher. That is F-041's standing attestation, not a new gap.
 *
 * ## Memoised, because opening is not free and re-keying twice proves nothing
 *
 * `getOrCreateDatabaseKey` hits the Keychain / Keystore and `createRepository` runs the
 * migration ladder. Both are idempotent and neither is cheap enough to do per render.
 */

import { createRepository, type Repository } from '@irodora/store';
import { openDeviceDriver } from './index';

let cached: Repository | null = null;

export function deviceRepository(): Repository {
  if (cached !== null) return cached;
  const { driver, info } = openDeviceDriver();
  cached = createRepository(driver, info);
  return cached;
}
