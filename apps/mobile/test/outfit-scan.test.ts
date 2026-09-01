/**
 * The outfit scanner (FR-36, F-054).
 *
 * > *Estimates per-garment colours with confidence and returns the full score set.
 * > Classical CV only, with manual region override always available.*
 *
 * ## What earns this file
 *
 * A band-finder is easy to write and almost impossible to check by looking at it, because
 * **every wrong version returns three plausible colours.** The dangerous ones:
 *
 * | The plausible wrong code | What a person would read |
 * |---|---|
 * | no floor on the boundary strength | three garments in a photograph of a wall |
 * | no separation between the two boundaries | one edge counted twice, and a one-row "garment" |
 * | letting `read` handle an empty band | **black, at a confidence**, because `aggregate([])` is 0 |
 * | scoring a partial outfit | a six-component score for an outfit nobody is wearing |
 *
 * Each has its own case below, and each case has a decoy: the frame that must still be
 * accepted, so a function that refused everything could not pass
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { aggregate, averageEncoded, type Sample } from '@irodora/color-sampling';
import { outfitWeights, parseWeightContent, OUTFIT_SLOTS } from '@irodora/recommendation';
import { allEntries } from '../src/corpus';
import { colorOf, toStoreWrite, EMPTY_DRAFT } from '../src/wardrobe';
import { engineProfile } from '../src/outfit/builder';
import { ruleSet } from '../src/rules';
import { WEIGHTS_TEXT } from '../src/rules/generated/weights';
import { readingOklch } from '../src/profile/photo';
import { differenceOklch } from '../src/engine';
import { read } from '../src/lens/modes';
import type { LensReading } from '../src/lens/reading';
import {
  BOUNDARY_DELTA_E,
  MIN_BAND_FRACTION,
  colorFromReading,
  proposeBands,
  scanOutfit,
  type Band,
  type ScanContext,
  type ScanFrame,
} from '../src/lens/outfit-scan';

const rules = ruleSet();
const weights = outfitWeights(parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.test.json'));

const CONTEXT: ScanContext = {
  profile: engineProfile({
    id: 'p',
    method: 'guided',
    lightness: { min: 0.3, max: 0.8 },
    temperatureBias: 0.2,
    chroma: { min: 0.02, max: 0.2 },
    contrast: 'medium',
    confidence: {
      lightness: 0.7,
      temperature: 0.7,
      chroma: 0.7,
      contrast: 0.7,
      neutrals: 0.7,
      accents: 0.7,
      avoid: 0.7,
    },
    origin: {
      lightness: 'derived',
      temperature: 'derived',
      chroma: 'derived',
      contrast: 'derived',
      neutrals: 'derived',
      accents: 'derived',
      avoid: 'derived',
    },
    neutrals: [],
    accents: [],
    avoid: [],
  }),
  rules,
  reference: allEntries()
    .slice(0, 8)
    .map((e) => ({
      id: e.entry.slug,
      color: colorOf({
        id: e.entry.slug,
        created_at: 1,
        updated_at: 1,
        deleted_at: null,
        name: e.entry.name.en,
        xyz_x: e.entry.color.xyz[0],
        xyz_y: e.entry.color.xyz[1],
        xyz_z: e.entry.color.xyz[2],
        lab_l: e.derived.lab[0],
        lab_a: e.derived.lab[1],
        lab_b: e.derived.lab[2],
        oklch_l: e.derived.oklch[0],
        oklch_c: e.derived.oklch[1],
        oklch_h: e.derived.oklch[2],
        hex: e.derived.hex,
        source: 'reference',
        confidence: 1,
        corpus_slug: e.entry.slug,
        capture_illuminant: null,
        capture_quality: null,
        capture_samples: null,
        capture_variance: null,
      }),
    })),
  weights,
};

const WIDTH = 8;
const HEIGHT = 36;

const px = (r: number, g: number, b: number): Sample => ({ r, g, b, alpha: 1 });

/** Three stacked blocks of a given colour each, at `WIDTH × HEIGHT`. */
function stacked(
  blocks: readonly (readonly [number, number, number])[],
  height = HEIGHT,
  width = WIDTH,
): ScanFrame {
  const per = height / blocks.length;
  const samples: Sample[] = [];
  for (let row = 0; row < height; row += 1) {
    const block = blocks[Math.min(blocks.length - 1, Math.floor(row / per))] ?? blocks[0]!;
    for (let col = 0; col < width; col += 1) samples.push(px(block[0], block[1], block[2]));
  }
  return { samples, width, height, space: 'srgb' };
}

/** A mid blue, a mid ochre and a mid green — far apart in ΔE00 and all inside sRGB. */
const BLUE = [0.2, 0.3, 0.55] as const;
const OCHRE = [0.65, 0.5, 0.2] as const;
const GREEN = [0.25, 0.45, 0.28] as const;

const THREE_GARMENTS = stacked([BLUE, OCHRE, GREEN]);

/**
 * The same three garments, with **texture across each row** — and it is the fixture that makes
 * the averaging space observable.
 *
 * Every row of `THREE_GARMENTS` is one value repeated, and averaging identical values gives the
 * same answer in any space. So that fixture cannot tell `aggregate` (linear light) from
 * `averageEncoded` (the mistake), which is the single most consequential colour bug this
 * repository has a lesson about [[averaging-non-linear-srgb-reads-too-dark]] — the error is
 * one-directional and looks like slightly worse light rather than like a defect.
 *
 * Alternating a lit and a shaded version of each colour along the row is what fabric actually
 * does, and it is what makes the two averages differ.
 */
const TEXTURED: ScanFrame = (() => {
  const shade = (c: readonly [number, number, number], k: number) =>
    [c[0] * k, c[1] * k, c[2] * k] as const;
  const samples: Sample[] = [];
  for (let row = 0; row < HEIGHT; row += 1) {
    const base = row < 12 ? BLUE : row < 24 ? OCHRE : GREEN;
    for (let col = 0; col < WIDTH; col += 1) {
      const c = col % 2 === 0 ? shade(base, 1.35) : shade(base, 0.45);
      samples.push(px(c[0], c[1], c[2]));
    }
  }
  return { samples, width: WIDTH, height: HEIGHT, space: 'srgb' };
})();

/**
 * One SOFT edge and one moderate one — the fixture the separation rule needs.
 *
 * Every edge in `THREE_GARMENTS` is one row wide, so its jump profile has exactly two non-zero
 * values and the two largest are the two real edges however they are chosen. **A real
 * photograph does not look like that.** An edge crossed over two rows produces two large jumps
 * side by side, and "take the two largest" then returns one garment boundary twice and a band
 * one row tall.
 *
 * Rows 0–11 blue, row 12 a blend, rows 13–23 yellow, rows 24–35 ochre: a strong edge spread
 * over two rows, and a moderate edge on its own.
 */
const SOFT_EDGE: ScanFrame = (() => {
  const YELLOW = [0.85, 0.8, 0.25] as const;
  const blend = [
    (BLUE[0] + YELLOW[0]) / 2,
    (BLUE[1] + YELLOW[1]) / 2,
    (BLUE[2] + YELLOW[2]) / 2,
  ] as const;
  const samples: Sample[] = [];
  for (let row = 0; row < HEIGHT; row += 1) {
    const colour = row < 12 ? BLUE : row === 12 ? blend : row < 24 ? YELLOW : OCHRE;
    for (let col = 0; col < WIDTH; col += 1) samples.push(px(colour[0], colour[1], colour[2]));
  }
  return { samples, width: WIDTH, height: HEIGHT, space: 'srgb' };
})();

const MANUAL_BANDS: readonly Band[] = [
  { slot: 'top', top: 0, bottom: 12 },
  { slot: 'trouser', top: 12, bottom: 24 },
  { slot: 'shoe', top: 24, bottom: 36 },
];

describe('finding the garment boundaries', () => {
  it('puts them at the block edges', () => {
    const proposal = proposeBands(THREE_GARMENTS);

    expect(proposal.found).toBe(true);
    if (!proposal.found) throw new Error('unreachable');
    expect(proposal.bands.map((b) => b.slot)).toEqual([...OUTFIT_SLOTS]);
    expect(proposal.bands.map((b) => [b.top, b.bottom])).toEqual([
      [0, 12],
      [12, 24],
      [24, 36],
    ]);
  });

  it('covers the frame exactly, with no overlap and no gap', () => {
    const proposal = proposeBands(THREE_GARMENTS);
    if (!proposal.found) throw new Error('unreachable');

    expect(proposal.bands[0]!.top).toBe(0);
    expect(proposal.bands.at(-1)!.bottom).toBe(THREE_GARMENTS.height);
    for (let i = 1; i < proposal.bands.length; i += 1)
      expect(proposal.bands[i]!.top).toBe(proposal.bands[i - 1]!.bottom);
  });

  it('reports the strength of each boundary it found', () => {
    const proposal = proposeBands(THREE_GARMENTS);

    expect(proposal.strengths).toHaveLength(2);
    for (const s of proposal.strengths) expect(s).toBeGreaterThanOrEqual(BOUNDARY_DELTA_E);
  });
});

describe('frames that are not three garments', () => {
  /*
   * THE DECOY FOR "NO FLOOR ON THE BOUNDARY STRENGTH". Two largest jumps exist in any frame.
   * Without BOUNDARY_DELTA_E this returns three garments for a photograph of a wall, and every
   * test above still passes.
   */
  it('refuses a uniform frame, and says how weak the jumps were', () => {
    const proposal = proposeBands(stacked([BLUE, BLUE, BLUE]));

    expect(proposal.found).toBe(false);
    if (proposal.found) throw new Error('unreachable');
    expect(proposal.reason).toBe('noBoundaries');
    for (const s of proposal.strengths) expect(s).toBeLessThan(BOUNDARY_DELTA_E);
  });

  it('refuses two garments rather than inventing a third boundary inside one', () => {
    // A top and trousers, no shoes in view. There is one real edge and the second-largest jump
    // is somewhere inside a block of one colour.
    const proposal = proposeBands(stacked([BLUE, OCHRE]));

    expect(proposal.found).toBe(false);
    if (proposal.found) throw new Error('unreachable');
    expect(proposal.reason).toBe('noBoundaries');
  });

  it('refuses a frame too short to hold three bands', () => {
    const proposal = proposeBands(stacked([BLUE, OCHRE, GREEN], 2, WIDTH));

    expect(proposal).toEqual({ found: false, reason: 'tooShort', strengths: [] });
  });

  it('refuses a frame whose samples do not match its dimensions', () => {
    const proposal = proposeBands({ ...THREE_GARMENTS, width: WIDTH + 1 });

    expect(proposal).toEqual({ found: false, reason: 'malformed', strengths: [] });
  });

  /*
   * THE ASSERTION THE SEPARATION RULE EARNS, and it needs a soft edge to be observable at all.
   *
   * Without a minimum separation the two largest jumps here are the two halves of ONE edge —
   * rows 11 and 12 — and the middle band comes back a single row tall. That is not a garment,
   * and nothing else in this file can see it: the slot count, the ordering, the coverage and
   * the strengths are all still correct.
   */
  it('never returns a band thinner than a garment could be', () => {
    const proposal = proposeBands(SOFT_EDGE);

    expect(proposal.found).toBe(true);
    if (!proposal.found) throw new Error('unreachable');
    const minimum = Math.floor(SOFT_EDGE.height * MIN_BAND_FRACTION);
    for (const band of proposal.bands)
      expect(band.bottom - band.top).toBeGreaterThanOrEqual(minimum);
  });

  it('DECOY — the three-garment frame is still accepted', () => {
    // Without this, every refusal above passes against a function that refuses everything.
    expect(proposeBands(THREE_GARMENTS).found).toBe(true);
  });
});

describe('reading each garment', () => {
  it('returns one result per slot, in slot order', () => {
    const scan = scanOutfit(THREE_GARMENTS, MANUAL_BANDS, CONTEXT);

    expect(scan.slots.map((s) => s.slot)).toEqual([...OUTFIT_SLOTS]);
  });

  it('reads the colour the band actually contains', () => {
    const scan = scanOutfit(THREE_GARMENTS, MANUAL_BANDS, CONTEXT);
    const top = scan.slots.find((s) => s.slot === 'top');
    if (!top?.read) throw new Error('the top should have been read');

    // Asserted against the ENGINE's answer for those samples, not against a literal — a
    // re-implementation of the averaging in outfit-scan.ts fails here rather than agreeing
    // with itself (E-008).
    const expected = aggregate(THREE_GARMENTS.samples.slice(0, 12 * WIDTH)).trimmedMean;
    expect(top.reading.rgb[0]).toBeCloseTo(expected.r, 10);
    expect(top.reading.rgb[1]).toBeCloseTo(expected.g, 10);
    expect(top.reading.rgb[2]).toBeCloseTo(expected.b, 10);
  });

  it('cannot claim more confidence than a garment scan justifies', () => {
    const scan = scanOutfit(THREE_GARMENTS, MANUAL_BANDS, CONTEXT);

    for (const slot of scan.slots) {
      if (!slot.read) continue;
      expect(slot.reading.confidence).toBeLessThanOrEqual(0.9);
      expect(slot.reading.confidence).toBeGreaterThan(0);
    }
  });

  it('takes the bands it is given — the manual override is the only input path', () => {
    // Deliberately not the proposal's bands: two thirds and a third.
    const manual: readonly Band[] = [
      { slot: 'top', top: 0, bottom: 24 },
      { slot: 'trouser', top: 24, bottom: 30 },
      { slot: 'shoe', top: 30, bottom: 36 },
    ];
    const scan = scanOutfit(THREE_GARMENTS, manual, CONTEXT);
    const trouser = scan.slots.find((s) => s.slot === 'trouser');
    if (!trouser?.read) throw new Error('unreachable');

    const expected = aggregate(THREE_GARMENTS.samples.slice(24 * WIDTH, 30 * WIDTH)).trimmedMean;
    expect(trouser.reading.rgb[0]).toBeCloseTo(expected.r, 10);
  });
});

describe('a band with nothing to read', () => {
  /*
   * THE DECOY FOR LETTING `read` HANDLE IT. `mean([])` is 0 in @irodora/color-sampling, so an
   * all-rejected band aggregates to rgb [0,0,0] — BLACK, with a quality assessment attached and
   * a confidence beside it. That is not a dark garment; it is no measurement.
   */
  it('refuses rather than reporting the black that an empty aggregate returns', () => {
    const blown = stacked([BLUE, OCHRE, GREEN]);
    // Every pixel of the shoe band clipped at the top of the range.
    const samples = blown.samples.map((s, i) => (i >= 24 * WIDTH ? px(1.02, 1.02, 1.02) : s));
    const scan = scanOutfit({ ...blown, samples }, MANUAL_BANDS, CONTEXT);

    const shoe = scan.slots.find((s) => s.slot === 'shoe');
    expect(shoe?.read).toBe(false);
    if (shoe === undefined || shoe.read) throw new Error('unreachable');
    expect(shoe.reason).toBe('noPixels');
  });

  it('and the other two bands are still read', () => {
    const blown = stacked([BLUE, OCHRE, GREEN]);
    const samples = blown.samples.map((s, i) => (i >= 24 * WIDTH ? px(1.02, 1.02, 1.02) : s));
    const scan = scanOutfit({ ...blown, samples }, MANUAL_BANDS, CONTEXT);

    expect(scan.slots.filter((s) => s.read)).toHaveLength(2);
  });

  it('DECOY — the same band unclipped IS read', () => {
    const scan = scanOutfit(THREE_GARMENTS, MANUAL_BANDS, CONTEXT);

    expect(scan.slots.find((s) => s.slot === 'shoe')?.read).toBe(true);
  });

  it('refuses a band outside the frame instead of slicing nothing', () => {
    const scan = scanOutfit(
      THREE_GARMENTS,
      [
        { slot: 'top', top: 0, bottom: 12 },
        { slot: 'trouser', top: 12, bottom: 24 },
        { slot: 'shoe', top: 24, bottom: 999 },
      ],
      CONTEXT,
    );

    const shoe = scan.slots.find((s) => s.slot === 'shoe');
    if (shoe === undefined || shoe.read) throw new Error('unreachable');
    expect(shoe.reason).toBe('outsideFrame');
  });

  it('refuses a slot no band covers', () => {
    const scan = scanOutfit(THREE_GARMENTS, MANUAL_BANDS.slice(0, 2), CONTEXT);

    const shoe = scan.slots.find((s) => s.slot === 'shoe');
    if (shoe === undefined || shoe.read) throw new Error('unreachable');
    expect(shoe.reason).toBe('outsideFrame');
  });
});

describe('the score set', () => {
  it('is the full six components when every slot was read', () => {
    const scan = scanOutfit(THREE_GARMENTS, MANUAL_BANDS, CONTEXT);

    expect(scan.score).not.toBeNull();
    expect(scan.score?.components).toHaveLength(6);
    expect(scan.score?.overall).toBeGreaterThanOrEqual(0);
    expect(scan.score?.overall).toBeLessThanOrEqual(100);
  });

  /*
   * THE DECOY FOR SCORING A PARTIAL OUTFIT. Two garments and a guess returns a number that
   * looks exactly like a real one, about an outfit nobody is wearing.
   */
  it('is null when any slot went unread', () => {
    const scan = scanOutfit(THREE_GARMENTS, MANUAL_BANDS.slice(0, 2), CONTEXT);

    expect(scan.score).toBeNull();
  });
});

describe('provenance', () => {
  const READING: LensReading = read('garment-scan', {
    region: { samples: THREE_GARMENTS.samples.slice(0, 12 * WIDTH), width: WIDTH, height: 12 },
    space: 'srgb',
  });

  it('is an estimate carrying its capture conditions, never a reference', () => {
    const color = colorFromReading(READING);

    expect(color.provenance.source).toBe('estimated');
    expect(color.provenance.confidence).toBe(READING.confidence);
  });

  /*
   * THE ASSERTION THAT REPLACED A REFACTOR.
   *
   * `wardrobe.ts` turns a reading into a stored ROW and this file turns one into a `Color`.
   * They are different functions sharing one decision — source, confidence, and the four
   * conditions ADR-0005 requires of a capture. A shared helper with one caller could not fail;
   * this fails if either path drifts.
   */
  it('agrees exactly with the provenance the wardrobe stores for the same reading', () => {
    const write = toStoreWrite(
      { ...EMPTY_DRAFT, type: 'jumper', colour: { kind: 'reading', reading: READING } },
      (() => {
        let n = 0;
        return () => `id-${String(n++)}`;
      })(),
    );
    const stored = colorOf({
      id: write.color.id,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      name: write.color.name,
      xyz_x: write.color.xyz_x,
      xyz_y: write.color.xyz_y,
      xyz_z: write.color.xyz_z,
      lab_l: write.color.lab_l,
      lab_a: write.color.lab_a,
      lab_b: write.color.lab_b,
      oklch_l: write.color.oklch_l,
      oklch_c: write.color.oklch_c,
      oklch_h: write.color.oklch_h,
      hex: write.color.hex,
      source: write.color.source,
      confidence: write.color.confidence,
      corpus_slug: write.color.corpus_slug,
      capture_illuminant: write.color.conditions?.illuminant ?? null,
      capture_quality: write.color.conditions?.quality ?? null,
      capture_samples: write.color.conditions?.sampleCount ?? null,
      capture_variance: write.color.conditions?.variance ?? null,
    });

    expect(colorFromReading(READING).provenance).toEqual(stored.provenance);
  });

  it('DECOY — the two paths could disagree, so the comparison is not vacuous', () => {
    // A different reading produces a different provenance. Without this, the assertion above
    // would pass against two functions that both returned a constant.
    const other = colorFromReading({ ...READING, confidence: READING.confidence / 2 });

    expect(other.provenance.confidence).not.toBe(colorFromReading(READING).provenance.confidence);
  });
});

describe('the row profile is the engine’s, not this file’s', () => {
  /*
   * THE ASSERTION THAT MAKES "no colour arithmetic lives in outfit-scan.ts" CHECKABLE.
   *
   * The reported boundary strength is recomputed here from the engine's own calls — `aggregate`
   * for the row colour, `readingOklch` for the space conversion, `differenceOklch` for the
   * jump — and must match to ten places. An inlined average, a power-function gamma, or a ΔE00
   * taken on OKLCh directly all produce a plausible number and all fail this
   * [[averaging-non-linear-srgb-reads-too-dark]].
   */
  it('reports a boundary strength equal to the engine’s own answer for those rows', () => {
    // TEXTURED, not THREE_GARMENTS: a uniform row averages to the same value in any space, so
    // the clean fixture cannot see the mistake this assertion exists to catch.
    const proposal = proposeBands(TEXTURED);
    if (!proposal.found) throw new Error('unreachable');

    const rowColour = (row: number) => {
      const { trimmedMean } = aggregate(TEXTURED.samples.slice(row * WIDTH, (row + 1) * WIDTH));
      return readingOklch({ rgb: [trimmedMean.r, trimmedMean.g, trimmedMean.b], space: 'srgb' });
    };

    // The bands start at 12 and 24, so the jumps are 11→12 and 23→24.
    expect(proposal.strengths[0]).toBeCloseTo(differenceOklch(rowColour(11), rowColour(12)), 10);
    expect(proposal.strengths[1]).toBeCloseTo(differenceOklch(rowColour(23), rowColour(24)), 10);
  });

  it('DECOY — the two averaging spaces disagree on this fixture, and agree on a flat one', () => {
    // If they agreed everywhere, the assertion above would not be testing which one the module
    // used — it would be testing nothing.
    const textured = TEXTURED.samples.slice(0, WIDTH);
    expect(averageEncoded(textured).r).not.toBeCloseTo(aggregate(textured).mean.r, 6);

    // And on a row of one value they DO agree, which is exactly why THREE_GARMENTS could not
    // catch it and this fixture exists.
    const flat = THREE_GARMENTS.samples.slice(0, WIDTH);
    expect(averageEncoded(flat).r).toBeCloseTo(aggregate(flat).mean.r, 10);
  });
});
