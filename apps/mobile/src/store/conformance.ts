/**
 * The device attestation, in executable form.
 *
 * F-041 attests that the store conforms on a real device, because `expo-sqlite` and SQLCipher
 * cannot run in CI. An attestation that has no code behind it is a day's work whenever someone
 * finally has a device; this makes it one call.
 *
 * **It imports the same `checkStore` `packages/store` runs against `node:sqlite`.** Not a copy
 * — a copy is a second thing to keep in step, and the copy that drifts is always the one nobody
 * is looking at. A dependency nobody imports ships nothing, and this repository has already
 * lost six increments to exactly that
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 */

import { checkStore, formatStoreFindings } from '@irodora/store/testing';
import { openDeviceDriver } from './index.js';

export interface DeviceConformanceResult {
  readonly driver: string;
  readonly encryptsAtRest: boolean;
  readonly ran: number;
  readonly passed: boolean;
  readonly report: string;
}

/**
 * Run the store conformance suite against the real device driver.
 *
 * The result is returned rather than thrown or logged: this is evidence for an attestation,
 * and evidence that only exists in a console is evidence nobody can paste into `progress.md`.
 */
export function runDeviceStoreConformance(): DeviceConformanceResult {
  const { findings, ran, info } = checkStore(openDeviceDriver);
  return {
    driver: info.name,
    // On this driver the value is `true` because the connection opened with a key pragma.
    // Whether the bytes on disk are actually encrypted is what the device run confirms, and
    // no assertion in this process can stand in for it.
    encryptsAtRest: info.encryptsAtRest,
    ran,
    passed: findings.length === 0,
    report:
      findings.length === 0
        ? `${info.name}: ${String(ran)} check(s), no findings`
        : formatStoreFindings(findings),
  };
}
