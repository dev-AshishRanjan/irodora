/**
 * Grouping by how colours look, and the two pairs that tell it apart from sorting hex.
 *
 * ## The assertion that earns this file
 *
 * A test using well-separated colours passes against a hex sort, a Lab sort, a random shuffle
 * and a correct implementation alike. So the fixtures here are chosen to be **adversarial to
 * the wrong implementation specifically**:
 *
 * - `#800000` and `#800080` are one hex digit apart and sort adjacently. They are maroon and
 *   purple, ΔE00 ≈ 39. A hex sort puts them together; this must not.
 * - `#FF0000` and `#FE0102` are far apart as strings — the first three bytes all differ — and
 *   are the same red to within ΔE00 ≈ 0.4. A hex sort separates them; this must not.
 *
 * Those two cases are the criterion. Everything else here is scaffolding around them.
 *
 * The Lab values are computed from the sRGB by `@irodora/color-spaces` in the fixture rather
 * than typed in, because a hand-copied Lab triple is a number nobody can check and the whole
 * point of this file is that the numbers decide the answer.
 */

import { describe, expect, it } from 'vitest';
import { deltaE00 } from '@irodora/color-difference';
import { toXyz, xyzToLab } from '@irodora/color-spaces';
import { groupByColor, DEFAULT_GROUPING_THRESHOLD } from '../src/grouping.js';
import type { SavedColorRow, StoredGarment } from '../src/index.js';

/** A garment carrying a colour derived from a hex string. Only the colour matters here. */
const garment = (id: string, hex: string): StoredGarment => {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  // srgb -> xyz -> Lab, through the engine. A hand-copied Lab triple is a number nobody can
  // check, and the numbers are what decide the answer in this file.
  const [l, aa, bb] = xyzToLab(toXyz([r, g, b], 'srgb'));

  const color: SavedColorRow = {
    id: `color-${id}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: hex,
    xyz_x: 0,
    xyz_y: 0,
    xyz_z: 0,
    lab_l: l,
    lab_a: aa,
    lab_b: bb,
    oklch_l: 0,
    oklch_c: 0,
    oklch_h: 0,
    hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: null,
    // A reference colour owes no capture conditions (F-108) — it was published, not measured.
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };

  return {
    id,
    type: 'jumper',
    color,
    name: null,
    pattern: null,
    material: null,
    formality: null,
    brand: null,
    size: null,
    purchaseDate: null,
    costMinor: null,
    currency: null,
    wearCount: 0,
    seasons: [],
    colors: [],
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  };
};

const lab = (g: StoredGarment): [number, number, number] => [
  g.color.lab_l,
  g.color.lab_a,
  g.color.lab_b,
];

describe('the two pairs the criterion is about', () => {
  it('separates colours a hex sort would put together', () => {
    const maroon = garment('maroon', '#800000');
    const purple = garment('purple', '#800080');

    // The premise, asserted rather than assumed: these really are adjacent as strings and far
    // apart perceptually. If a future change to the colour engine moved this distance, the
    // fixture would stop being a decoy and this line is what would say so.
    expect(deltaE00(lab(maroon), lab(purple))).toBeGreaterThan(DEFAULT_GROUPING_THRESHOLD);

    const groups = groupByColor([maroon, purple]);
    expect(groups).toHaveLength(2);
  });

  it('groups colours a hex sort would separate', () => {
    const red = garment('red', '#FF0000');
    const nearlyRed = garment('nearly', '#FE0102');

    expect(deltaE00(lab(red), lab(nearlyRed))).toBeLessThan(DEFAULT_GROUPING_THRESHOLD);
    // And they are genuinely far apart as strings — the decoy only works if this is true.
    expect(red.color.hex.slice(1, 4)).not.toBe(nearlyRed.color.hex.slice(1, 4));

    const groups = groupByColor([red, nearlyRed]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.garments.map((g) => g.id)).toEqual(['red', 'nearly']);
  });
});

describe('grouping a wardrobe', () => {
  it('puts every garment in exactly one group', () => {
    const wardrobe = [
      garment('a', '#FF0000'),
      garment('b', '#FE0102'),
      garment('c', '#800000'),
      garment('d', '#800080'),
      garment('e', '#0000FF'),
    ];
    const groups = groupByColor(wardrobe);

    const placed = groups.flatMap((g) => g.garments.map((x) => x.id)).sort();
    expect(placed).toEqual(['a', 'b', 'c', 'd', 'e']);
    // No garment in two groups. A `find`-based assignment can only place one, and this is
    // what would catch a future rewrite to something that does not.
    expect(placed).toHaveLength(new Set(placed).size);
  });

  it('names the first garment in each group as its leader', () => {
    const groups = groupByColor([garment('first', '#FF0000'), garment('second', '#FE0102')]);
    expect(groups[0]?.leader.hex).toBe('#FF0000');
  });

  it('is a list when the threshold is tight, and one group when it is loose', () => {
    // The two extremes bound the behaviour. Without them, a grouping that ignored the
    // threshold entirely would pass every test above.
    const wardrobe = [garment('a', '#FF0000'), garment('b', '#FE0102'), garment('c', '#800080')];
    expect(groupByColor(wardrobe, 0.1)).toHaveLength(3);
    expect(groupByColor(wardrobe, 200)).toHaveLength(1);
  });

  it('refuses a threshold of zero rather than returning a list wearing a grouping', () => {
    expect(() => groupByColor([garment('a', '#FF0000')], 0)).toThrow(RangeError);
  });

  it('groups nothing into nothing', () => {
    expect(groupByColor([])).toEqual([]);
  });
});
