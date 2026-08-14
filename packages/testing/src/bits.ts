/**
 * Exact float64 serialisation, and a digest over it.
 *
 * NFR-3 says Node, the browser and React Native produce **bitwise identical** output. That
 * word has to be taken literally or the check is worth nothing: `toFixed(10)` would hide a
 * difference in the last few bits, and a difference in the last few bits is exactly what a
 * platform-specific `Math.pow` produces. So a value is compared by its IEEE-754 bytes.
 *
 * This also distinguishes `-0` from `0` and any two NaNs with different payloads. That is
 * intentional. A `-0` appearing on one platform and not another is a real divergence, and it
 * is the kind that a numeric comparison would call equal.
 *
 * `DataView` is a language builtin, not a platform API — it exists in every JavaScript
 * runtime we target, including Hermes. Nothing here touches `node:*`, the DOM or `process`,
 * so this module can be executed unchanged in a browser and on a device.
 */

const SCRATCH = new DataView(new ArrayBuffer(8));

/** The 16 hex digits of a float64's big-endian IEEE-754 representation. */
export function float64ToHex(value: number): string {
  SCRATCH.setFloat64(0, value, false);
  let out = '';
  for (let i = 0; i < 8; i++) out += SCRATCH.getUint8(i).toString(16).padStart(2, '0');
  return out;
}

/** Reads back a value written by `float64ToHex`. Used to prove the encoding round-trips. */
export function hexToFloat64(hex: string): number {
  for (let i = 0; i < 8; i++) SCRATCH.setUint8(i, Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16));
  return SCRATCH.getFloat64(0, false);
}

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

/**
 * FNV-1a over the IEEE-754 bytes of every value, in order.
 *
 * FNV-1a rather than SHA-256 because `node:crypto` is a platform API and `crypto.subtle` is
 * async and absent on some React Native runtimes — and neither buys anything here. This
 * digest is not defending against an adversary choosing a collision; it is answering "did any
 * bit of any of 60 000 numbers change", where a 64-bit non-cryptographic hash is decisive.
 * BigInt is used so the multiply cannot lose the high word the way a Number multiply would.
 */
export function float64Digest(values: Iterable<number>): string {
  let hash = FNV_OFFSET_BASIS;

  for (const value of values) {
    SCRATCH.setFloat64(0, value, false);
    for (let i = 0; i < 8; i++) {
      hash = (hash ^ BigInt(SCRATCH.getUint8(i))) & MASK_64;
      hash = (hash * FNV_PRIME) & MASK_64;
    }
  }

  return hash.toString(16).padStart(16, '0');
}
