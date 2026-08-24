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

/**
 * How many representable doubles lie between `a` and `b`.
 *
 * The honest unit for a platform disagreement. A relative epsilon flatters values near zero
 * and punishes values near a binade edge, so "1e-16 apart" says almost nothing while "1 ulp
 * apart" says exactly what happened: the two runtimes rounded the same real number to
 * adjacent representable neighbours.
 *
 * IEEE-754 doubles are **ordered by their bit patterns when read as signed magnitudes**, which
 * is what makes this a subtraction at all. Negative values are not ordered that way, so they
 * are mapped: for a negative, the distance from the most-negative pattern. That handles the
 * `-0`/`+0` pair correctly too — they are adjacent, distance 1, not equal, because a `-0`
 * appearing on one platform and not another is a real divergence.
 *
 * Subnormals need no special case: they are contiguous with the normals in this encoding,
 * which is the property the format was designed to have.
 *
 * Returns `Number.POSITIVE_INFINITY` when either side is NaN or Infinity. Those are not
 * "very far apart", they are **not comparable**, and returning a large finite number would let
 * a caller average them into a summary and report a meaningless mean.
 */
export function ulpDistance(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;

  const SIGN_BIT = 1n << 63n;

  const ordered = (value: number): bigint => {
    SCRATCH.setFloat64(0, value, false);
    const bits = SCRATCH.getBigUint64(0, false);
    const magnitude = bits & ~SIGN_BIT;
    // A negative double's magnitude grows as its pattern grows, i.e. it is ordered backwards.
    // Mapping it to `-(magnitude + 1)` puts every double on one monotonic line AND leaves -0
    // at -1 with +0 at 0, so they are adjacent rather than equal.
    //
    // The textbook version is `INT64_MIN - asSigned(bits)`, which collapses -0 onto +0 —
    // correct for "are these numerically close", wrong here. A `-0` on one platform and a
    // `+0` on another is a real divergence and the digest already treats it as one; a
    // distance function that called it zero would report the fixture as agreeing with a run
    // that had disagreed with it.
    return bits & SIGN_BIT ? -(magnitude + 1n) : magnitude;
  };

  const difference = ordered(a) - ordered(b);
  return Number(difference < 0n ? -difference : difference);
}

/**
 * Significant digits at which a cross-platform disagreement stops existing.
 *
 * **Rounding does not remove a disagreement, it moves it.** Two values `d` apart land in
 * different buckets only if they straddle a boundary, with probability `d / g` for a grid
 * `g`. So the precision is a correctness property, not a preference:
 *
 * | grid | straddle per value | over ~400 000 values |
 * |---|---|---|
 * | 12 significant digits | 1e-3 | certain, every run |
 * | 8 | 1e-7 | ~4 % |
 * | **5** | **1e-10** | **~4e-5** |
 * | 4 | 1e-11 | ~4e-6 |
 *
 * Measured platform noise is 2–4 ULP, or ~1e-15 relative (F-083, ADR-0061). Five significant
 * digits sits ten orders above it and still resolves a change of 1e-5 relative — finer than
 * any value the product displays, and far finer than the ~1e-4 that a just-perceptible colour
 * difference corresponds to.
 *
 * **Significant digits rather than decimal places**, because the quantities span scales: XYZ
 * is ~0.1, Lab L is ~50, Lab a and b reach ±100. A fixed decimal grid would be far too coarse
 * for one and too fine for another, and "too fine" is the direction that flakes.
 *
 * `-0` normalises to `0`. The byte encoding distinguishes them deliberately, and a value
 * within a few ULP of zero could round to `-0` on one platform and `0` on the other — a
 * difference in a digit nobody can see.
 */
export function canonicalise(value: number, significantDigits = 5): number {
  if (!Number.isFinite(value)) return value;
  if (value === 0) return 0;
  const rounded = Number(value.toPrecision(significantDigits));
  return rounded === 0 ? 0 : rounded;
}
