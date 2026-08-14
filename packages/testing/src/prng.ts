/**
 * A seeded pseudo-random generator, written here rather than imported.
 *
 * Two reasons, both structural. It is used by the cross-platform identity check (NFR-3),
 * which has to run unchanged in Node, in a browser and on a React Native device — so it may
 * not touch a platform API, and the 10 000 inputs must be regenerated bit-for-bit identically
 * in every one of them. And a test whose inputs come from `Math.random` fails on a different
 * commit than the one that broke it, which is the worst property a colour test can have.
 *
 * `sfc32` (Chris Doty-Humphrey, PractRand) is used because it is four lines of integer
 * arithmetic with no floating point in the state — which is exactly what makes it reproduce
 * across engines. `xmur3` derives the four seed words from a string so a call site can say
 * what it is seeding rather than pasting magic numbers.
 */

/** Expands a seed string into successive 32-bit words. */
function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** A deterministic source of numbers in `[0, 1)`. */
export interface Prng {
  /** The next value in `[0, 1)`. */
  next(): number;
  /** The next value in `[min, max)`. */
  between(min: number, max: number): number;
}

/**
 * `sfc32`, seeded from a string. The same seed produces the same sequence on every engine.
 *
 * The final division is by `2 ** 32` — a power of two, so it is exact in float64 and cannot
 * introduce a rounding difference between platforms.
 */
export function createPrng(seed: string): Prng {
  const next32 = xmur3(seed);
  let a = next32(),
    b = next32(),
    c = next32(),
    d = next32();

  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };

  return { next, between: (min, max) => min + next() * (max - min) };
}
