/**
 * The gallery's image accessor — the part that could quietly undo the schema's cheap-list split.
 */

import { galleryImages, IMAGE_CACHE_LIMIT } from '../src/wardrobe/gallery';
import { coverageBands } from '../src/screens/Wardrobe';
import { base64FromBytes, bytesFromBase64 } from '../src/wardrobe/source';
import type { GarmentImageStore } from '../src/wardrobe/gallery';

/** A store that counts what it was asked for, so cost is assertable rather than assumed. */
function countingStore(withImages: readonly string[]): {
  store: GarmentImageStore;
  infoCalls: () => number;
  blobCalls: () => number;
} {
  let info = 0;
  let blob = 0;
  const has = new Set(withImages);

  const store = {
    getGarmentImageInfo: (id: string) => {
      info += 1;
      return has.has(id)
        ? ({ byteLength: 3, width: 2, height: 2, format: 'jpeg' } as const)
        : undefined;
    },
    getGarmentImage: (id: string) => {
      blob += 1;
      return has.has(id) ? new Uint8Array([1, 2, 3]) : undefined;
    },
  } satisfies GarmentImageStore;

  return { store, infoCalls: () => info, blobCalls: () => blob };
}

describe('base64FromBytes', () => {
  it('round-trips through bytesFromBase64', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect([...bytesFromBase64(base64FromBytes(bytes))]).toEqual([...bytes]);
  });

  it('handles a payload larger than one chunk', () => {
    // The encoder chunks at 0x8000 because `String.fromCharCode(...bytes)` on a photograph is a
    // spread of a hundred thousand arguments, which Hermes refuses before it is slow. A payload
    // that fits in one chunk would never exercise the boundary this test exists for.
    const bytes = new Uint8Array(0x8000 * 2 + 7);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 256;
    expect([...bytesFromBase64(base64FromBytes(bytes))]).toEqual([...bytes]);
  });
});

describe('galleryImages', () => {
  it('answers "has a photograph" from metadata, never from the bytes', () => {
    const { store, blobCalls } = countingStore(['a']);
    const images = galleryImages(store);

    expect(images.has('a')).toBe(true);
    expect(images.has('b')).toBe(false);

    // THE ASSERTION THAT MATTERS. Every cell asks this, and reading a BLOB to answer it is
    // exactly how a gallery makes the list query expensive again by another route.
    expect(blobCalls()).toBe(0);
  });

  it('reads a garment’s bytes once, however often the cell re-renders', () => {
    const { store, blobCalls } = countingStore(['a']);
    const images = galleryImages(store);

    const first = images.uri('a');
    expect(first).toMatch(/^data:image\/jpeg;base64,/u);
    for (let i = 0; i < 5; i += 1) expect(images.uri('a')).toBe(first);

    expect(blobCalls()).toBe(1);
  });

  it('remembers that a garment has NO photograph, rather than asking again', () => {
    const { store, infoCalls } = countingStore([]);
    const images = galleryImages(store);

    expect(images.uri('b')).toBeNull();
    const afterFirst = infoCalls();
    for (let i = 0; i < 4; i += 1) expect(images.uri('b')).toBeNull();

    // A cached `null` is an answer. Written with `cache.has` rather than a truthiness check
    // precisely so this case is cached; a `!== undefined` test would re-query on every frame
    // for every garment without a picture, which is the common case in a new wardrobe.
    expect(infoCalls()).toBe(afterFirst);
  });

  it('is bounded, and evicts the oldest', () => {
    const ids = Array.from({ length: IMAGE_CACHE_LIMIT + 1 }, (_, i) => `g${String(i)}`);
    const { store, blobCalls } = countingStore(ids);
    const images = galleryImages(store);

    for (const id of ids) images.uri(id);
    expect(blobCalls()).toBe(ids.length);

    // The newest is still held; the oldest was evicted and costs a second read.
    // `at()` rather than an index: `noUncheckedIndexedAccess` is on, and it is right to be —
    // these are built arrays, but a test that indexes past the end should not typecheck.
    const newest = ids.at(-1) ?? '';
    const oldest = ids.at(0) ?? '';

    images.uri(newest);
    expect(blobCalls()).toBe(ids.length);

    images.uri(oldest);
    expect(blobCalls()).toBe(ids.length + 1);
  });
});

describe('coverageBands', () => {
  const bands = (outfits: readonly number[]): readonly number[] =>
    coverageBands(new Map(outfits.map((n, i) => [`g${String(i)}`, n])));

  it('puts every garment in exactly one band', () => {
    const counts = bands([0, 1, 2, 3, 4, 9, 10, 24, 25, 900]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('places each edge on the lower side', () => {
    // THE EDGES ARE THE POINT. A bucket boundary is where an off-by-one hides — invisible in a
    // bar and obvious in a number — so each is asserted at its exact value rather than in the
    // middle of a range where any sane implementation agrees.
    expect(bands([0])).toEqual([1, 0, 0, 0, 0]);
    expect(bands([1])).toEqual([0, 1, 0, 0, 0]);
    expect(bands([3])).toEqual([0, 1, 0, 0, 0]);
    expect(bands([4])).toEqual([0, 0, 1, 0, 0]);
    expect(bands([9])).toEqual([0, 0, 1, 0, 0]);
    expect(bands([10])).toEqual([0, 0, 0, 1, 0]);
    expect(bands([24])).toEqual([0, 0, 0, 1, 0]);
    expect(bands([25])).toEqual([0, 0, 0, 0, 1]);
  });

  it('has no ceiling on the last band', () => {
    // `Number.POSITIVE_INFINITY` rather than a large number: a wardrobe that combined into more
    // outfits than the constant would have lost garments off the end of the chart, and the sum
    // above is the only thing that would have noticed.
    expect(bands([1_000_000])).toEqual([0, 0, 0, 0, 1]);
  });

  it('is all zeroes for an empty wardrobe, rather than empty', () => {
    // Five zero bands, not no bands. A chart that vanished when there was nothing to show would
    // leave the reader unable to tell "none yet" from "this feature is missing".
    expect(bands([])).toEqual([0, 0, 0, 0, 0]);
  });
});
