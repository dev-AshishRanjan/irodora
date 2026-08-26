/**
 * UUIDv7 — time-ordered, generated on the device.
 *
 * ## Why not v4, and why this is not a preference
 *
 * `data-model.md` §2: client-generated ids are "the half of sync that cannot be retrofitted —
 * a database written with rowid keys cannot be merged with another one later without every
 * user reinstalling". v7 adds the property that makes it usable at scale on a phone: the first
 * 48 bits are a millisecond timestamp, so ids sort by creation and index inserts stay local
 * rather than scattering across the B-tree.
 *
 * ## Monotonic within a millisecond
 *
 * Two rows written in the same millisecond must still order. The 12-bit `rand_a` field is used
 * as a counter within the current millisecond rather than as random bits, which is the method
 * RFC 9562 §6.2 describes. Without it, a batch insert produces ids whose order is random inside
 * each millisecond — and "insert order is meaningful" quietly stops being true for exactly the
 * writes that happen fastest.
 */

import { randomBytes } from './random.js';

let lastMillis = -1;
let counter = 0;

const hex = (n: number, digits: number): string => n.toString(16).padStart(digits, '0');

/** A UUIDv7. `now` is injectable so the ordering property can be tested at chosen instants. */
export function uuidv7(now: number = Date.now()): string {
  if (now === lastMillis) {
    counter += 1;
    // 12 bits. Overflowing means >4096 ids in one millisecond; borrowing the next millisecond
    // keeps ids ordered and unique rather than silently colliding.
    if (counter > 0xfff) {
      lastMillis += 1;
      counter = 0;
      now = lastMillis;
    }
  } else {
    lastMillis = now;
    counter = 0;
  }

  const timeHigh = Math.floor(now / 0x100000000);
  const timeLow = now >>> 0;
  // Through the PORT, never the ambient global. `crypto` exists in Node and not in Hermes,
  // so the direct call passed every test and killed the app on the first screen that made an
  // id (F-104). See `random.ts`.
  const bytes = randomBytes(16);

  const a = hex(timeHigh & 0xffff, 4) + hex(timeLow >>> 16, 4);
  const b = hex(timeLow & 0xffff, 4);
  // version 7 in the high nibble, then the monotonic counter in the remaining 12 bits
  const c = hex(0x7000 | counter, 4);
  // variant 10xx in the two high bits
  // `?? 0` rather than a non-null assertion: `noUncheckedIndexedAccess` is on, and a
  // getRandomValues buffer of a fixed length is exactly the case where an assertion is
  // tempting and a default is free.
  const d = hex(((0x80 | ((bytes[8] ?? 0) & 0x3f)) << 8) | (bytes[9] ?? 0), 4);
  const e = [...bytes.slice(10, 16)].map((n) => hex(n, 2)).join('');

  return `${a.slice(0, 8)}-${b}-${c}-${d}-${e}`;
}
