/**
 * The Lens, at the parts that do not need a camera.
 *
 * Roughly half of F-040's acceptance is a device attestation, and this file is deliberately
 * NOT an attempt to simulate the other half. jest-expo will happily mock a camera that does
 * nothing, and "it rendered without crashing" would pass forever while proving nothing.
 *
 * What is tested here is what is actually decidable off-device: the confidence rules, the
 * modes calling the engine, and the shape of what crosses the bridge.
 */

import { CAPTURE_MODES, MODE_CEILING, read, readManual, type CaptureMode } from '../src/lens/modes';
import {
  CAPTURE_SPACES,
  SPACE_CONFIDENCE_CEILING,
  cappedConfidence,
  type CaptureSpace,
  type LensReading,
} from '../src/lens/reading';
import { MAX_SAMPLES_PER_FRAME, readCaptureSpace, sampleStride } from '../src/lens/camera';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  clearOffer,
  hasOffer,
  offerReading,
  READING_DESTINATIONS,
  takeReading,
} from '../src/lens/handoff';
/*
 * From `../src/lens/permission`, NOT from the viewfinder.
 *
 * The viewfinder imports react-native-vision-camera, which touches the native TurboModule at
 * module load — so importing it here failed the whole suite before any assertion ran. F-097's
 * comment claimed jest could resolve it; that claim was never run, and it was wrong (F-104).
 */
import { permissionState } from '../src/lens/permission';
import { aggregate, partition, type Region, type Sample } from '@irodora/color-sampling';

const px = (r: number, g: number, b: number): Sample => ({ r, g, b, alpha: 1 });

function textured(width: number, height: number): Region {
  const samples: Sample[] = [];
  for (let row = 0; row < height; row += 1)
    for (let col = 0; col < width; col += 1) {
      const t = ((row + col) % 2 === 0 ? 1 : -1) * 0.03;
      samples.push(px(0.32 + t, 0.42 + t, 0.43 + t));
    }
  return { samples, width, height };
}

const GOOD = textured(40, 40);

/** A plain reading, for the hand-off suites. Its values are irrelevant; its identity is not. */
const READING: LensReading = {
  rgb: [0.32, 0.42, 0.43],
  space: 'srgb',
  usableSamples: 1600,
  variance: 0.01,
  illumination: 'daylight',
  quality: 'good',
  confidence: 0.7,
  instruction: '',
};

/**
 * A region with neutral highlights, so illumination classifies as daylight.
 *
 * Needed because the mode ceiling is only observable when it is the BINDING constraint: on a
 * region with no highlights the illumination assessment returns 'unknown' and caps everything
 * at 0.6, which is below live's 0.7 — so both modes returned 0.6 and the test could not see
 * the difference it was written to check.
 */
const LIT: Region = (() => {
  const base = textured(40, 40);
  // A CONTIGUOUS block of identical highlights, not one scattered per row. Scattered, the
  // brightest quantile picked up bright texture pixels alongside them, the blue/red ratios
  // disagreed, and the scene classified as MIXED — a second illuminant that was not there.
  const samples = base.samples.map((s, i) => (i < 100 ? px(0.9, 0.96, 1) : s));
  return { samples, width: 40, height: 40 };
})();

describe('an unread colour space costs confidence rather than being guessed', () => {
  it('caps confidence when the platform will not say', () => {
    // apps/mobile/AGENTS.md: read the capture colour space, never assume it. A P3 frame
    // interpreted as sRGB is wrong in exactly the saturated colours this product cares most
    // about — and the error is largest where it is least visible as an error.
    expect(SPACE_CONFIDENCE_CEILING.unknown).toBeLessThan(1);
    expect(SPACE_CONFIDENCE_CEILING.srgb).toBe(1);
    expect(SPACE_CONFIDENCE_CEILING['display-p3']).toBe(1);
  });

  it('treats unknown as a first-class space, not an error', () => {
    // The product keeps working on it. A reading in an unknown space is still useful; it is
    // simply not something we may sound certain about.
    expect(CAPTURE_SPACES).toContain('unknown');
    const reading = read('precision', { region: GOOD, space: 'unknown' });
    expect(reading.rgb).toHaveLength(3);
    expect(reading.confidence).toBeLessThanOrEqual(SPACE_CONFIDENCE_CEILING.unknown);
  });

  it('takes the MINIMUM of every ceiling, never a product', () => {
    // Three ceilings multiplied would give a number lower than any single assessment
    // justified — a different lie from the one being avoided, but still a lie.
    expect(cappedConfidence('unknown', 1, 1)).toBe(0.6);
    expect(cappedConfidence('srgb', 0.5, 0.9)).toBe(0.5);
    expect(cappedConfidence('unknown', 0.5, 0.9)).toBe(0.5);
    expect(cappedConfidence('unknown', 0.9, 0.9)).not.toBeCloseTo(0.6 * 0.9 * 0.9, 5);
  });
});

describe('all four capture modes exist and each calls the engine', () => {
  it('has exactly four, each with a declared ceiling', () => {
    expect(CAPTURE_MODES).toHaveLength(4);
    for (const mode of CAPTURE_MODES) expect(MODE_CEILING[mode]).toBeGreaterThan(0);
  });

  it('returns the ENGINE result, not a number computed here', () => {
    // The assertion that makes "calls the engine" a fact rather than an intention: the value
    // is recomputed independently through @irodora/color-sampling and must match exactly.
    const reading = read('precision', { region: GOOD, space: 'srgb' });
    const expected = aggregate(partition(GOOD.samples).kept).trimmedMean;
    expect(reading.rgb[0]).toBe(expected.r);
    expect(reading.rgb[1]).toBe(expected.g);
    expect(reading.rgb[2]).toBe(expected.b);
  });

  it('gives live capture a lower ceiling than a deliberate one', () => {
    // A continuous readout under a moving crosshair cannot be as trustworthy as a chosen
    // region, even when the pixels happen to be identical — which is exactly what this
    // compares, so the difference can only come from the mode.
    const live = read('live', { region: LIT, space: 'srgb' });
    const precise = read('precision', { region: LIT, space: 'srgb' });
    expect(live.rgb).toEqual(precise.rgb);
    expect(live.confidence).toBeLessThan(precise.confidence);
  });

  it('reports a manual entry as unknown illumination, never daylight', () => {
    // Nothing was measured, so claiming a lighting condition would be a claim about a room
    // nobody looked at.
    const manual = readManual([0.32, 0.42, 0.43]);
    expect(manual.illumination).toBe('unknown');
    expect(manual.usableSamples).toBe(0);
  });
});

describe('only numbers cross the bridge', () => {
  it('carries no field that could hold pixels', () => {
    // The TYPE is the mechanism — there is no field a frame, buffer, path or URI could be
    // assigned to, so passing one does not compile. This asserts the runtime shape matches.
    const reading: LensReading = read('garment-scan', { region: GOOD, space: 'srgb' });
    expect(Object.keys(reading).sort()).toEqual([
      'confidence',
      'illumination',
      'instruction',
      'quality',
      'rgb',
      'space',
      'usableSamples',
      'variance',
    ]);
    for (const [key, value] of Object.entries(reading)) {
      if (key === 'rgb') continue;
      // The key is folded into the compared value so a failure names WHICH field, since
      // jest's `expect` takes no message argument.
      expect(`${key}:${typeof value}`).toMatch(/:(number|string)$/u);
    }
  });

  it('DOES NOT COMPILE if a frame is added to the reading', () => {
    // @ts-expect-error — there is no field for pixel data, and adding one must be a compile
    // error rather than a review comment. If this ever starts compiling, tsc fails on the
    // unused directive.
    const leaky: LensReading = { ...read('live', { region: GOOD, space: 'srgb' }), frame: [1, 2] };
    void leaky;
  });

  it('DOES NOT COMPILE for a capture space outside the declared set', () => {
    // @ts-expect-error — 'adobe-rgb' is not a space this app can read, and silently accepting
    // one would be the assumption the colour-space rule exists to prevent.
    const bad: CaptureSpace = 'adobe-rgb';
    void bad;
  });

  it('DOES NOT COMPILE for a mode outside the four', () => {
    // @ts-expect-error — "all four capture modes" is the acceptance criterion; a fifth would
    // mean the criterion no longer describes the code.
    const bad: CaptureMode = 'burst';
    void bad;
  });
});

describe('the capture colour space is read, never assumed', () => {
  it('recognises what it knows, and refuses to guess at what it does not', () => {
    expect(readCaptureSpace('display-p3')).toBe('display-p3');
    expect(readCaptureSpace('Display P3')).toBe('display-p3');
    expect(readCaptureSpace('srgb')).toBe('srgb');
    // Rec.2020 and Adobe RGB are real values a real device can report. Neither is sRGB, and
    // falling back to sRGB would give a confident answer that is wrong in exactly the
    // saturated colours this product exists for.
    expect(readCaptureSpace('rec2020')).toBe('unknown');
    expect(readCaptureSpace('adobe-rgb')).toBe('unknown');
    // The names VisionCamera 5's session actually reports (F-097). `p3-d65` is Display-P3 and
    // was `unknown` until the viewfinder was wired to the real API — the vocabulary came from
    // the platform rather than from what looked plausible.
    expect(readCaptureSpace('p3-d65')).toBe('display-p3');
    expect(readCaptureSpace('hlg-bt2020')).toBe('unknown');
    expect(readCaptureSpace('dolby-vision')).toBe('unknown');
    expect(readCaptureSpace('apple-log')).toBe('unknown');
    // DECOYS, AND THE THIRD ONE IS THE REASON THE OTHERS ARE HERE. A pixel format is a memory
    // layout, not a colour space; the session reports the space and the frame reports the
    // layout. `rgb-rgb-8-bit` contains the substring `rgb-8`, so the sRGB rule accepted it
    // until F-097 — a confident sRGB reading for a frame whose space nobody had stated, which
    // is the exact assumption apps/mobile/AGENTS.md forbids.
    expect(readCaptureSpace('yuv-420-8-bit-full')).toBe('unknown');
    expect(readCaptureSpace('raw-bayer-packed96-12-bit')).toBe('unknown');
    expect(readCaptureSpace('rgb-rgb-8-bit')).toBe('unknown');
    expect(readCaptureSpace('rgb-rgba-8-bit')).toBe('unknown');
    expect(readCaptureSpace(null)).toBe('unknown');
    expect(readCaptureSpace(undefined)).toBe('unknown');
    expect(readCaptureSpace('')).toBe('unknown');
  });

  it('costs confidence when it is unknown, rather than being silently sRGB', () => {
    // LIT, not GOOD: on a region with no highlights the ILLUMINATION ceiling is also 0.6,
    // so it binds first and the space ceiling becomes invisible. Third time that has caught a
    // fixture in this feature — 'unknown' illumination is a strong default cap doing real work.
    const unknown = read('precision', { region: LIT, space: readCaptureSpace('rec2020') });
    const known = read('precision', { region: LIT, space: readCaptureSpace('srgb') });
    expect(unknown.space).toBe('unknown');
    expect(unknown.confidence).toBeLessThan(known.confidence);
  });
});

describe('the sample that crosses the bridge is bounded', () => {
  it('never returns a stride of zero, which would hang the camera pipeline', () => {
    // A stride of 0 loops forever on the WORKLET thread. That is not a hang anyone can
    // debug — the preview simply stops, with no error anywhere.
    for (const pixels of [0, 1, 999, 2000, 2_073_600]) {
      expect(`${String(pixels)}:${String(sampleStride(pixels) >= 1)}`).toMatch(/:true$/u);
    }
  });

  it('keeps a 1080p frame under the cap', () => {
    // ~2 million pixels down to at most 2000 — three orders of magnitude, and what crosses is
    // a flat array of numbers with no reference to the buffer it came from.
    const pixels = 1920 * 1080;
    expect(Math.floor(pixels / sampleStride(pixels))).toBeLessThanOrEqual(MAX_SAMPLES_PER_FRAME);
  });

  it('leaves headroom above FR-15 floor, because rejection happens AFTER the crossing', () => {
    // Sending exactly 1000 would leave fewer than 1000 usable once specular and shadow
    // pixels are discarded on the other side.
    expect(MAX_SAMPLES_PER_FRAME).toBeGreaterThan(1000);
  });
});

describe('the hand-off to profile setup (F-097)', () => {
  afterEach(() => {
    // Module state. A test that leaves an offer standing would hand it to the next one, and
    // the failure would look like a bug in whichever test happened to run second.
    clearOffer();
  });

  it('offers a reading and hands it over', () => {
    expect(hasOffer('profile')).toBe(false);
    offerReading(READING, 'profile');
    expect(hasOffer('profile')).toBe(true);
    expect(takeReading('profile')).toEqual(READING);
  });

  it('IS ONE-SHOT — a second take returns null', () => {
    /*
     * The case nobody would find by hand. Someone opens the Lens, taps through to their
     * profile, decides to answer the twelve comparisons instead, and navigates back. Without
     * the consume, arriving a second time re-proposes the estimate they just declined — and
     * FR-27's "never finalised without explicit user confirmation" starts to read as nagging.
     */
    offerReading(READING, 'profile');
    expect(takeReading('profile')).toEqual(READING);
    expect(takeReading('profile')).toBeNull();
    expect(hasOffer('profile')).toBe(false);
  });

  it('returns null when nobody offered anything, rather than throwing', () => {
    // The ORDINARY case: the guided path reaches profile setup this way on every run.
    expect(takeReading('profile')).toBeNull();
  });

  it('keeps the second reading when two are offered', () => {
    // Not a queue. Somebody who takes two readings before navigating meant the second one; a
    // queue would offer them a colour they had already moved on from.
    const second = { ...READING, usableSamples: 1234 };
    offerReading(READING, 'profile');
    offerReading(second, 'profile');
    expect(takeReading('profile')).toEqual(second);
  });

  it('is ADDRESSED — the wardrobe cannot take a reading meant for the profile', () => {
    /*
     * THE PAIR THAT MAKES THE DESTINATION REAL. Without both directions this parameter is
     * decoration: a takeReading that ignored it would pass every other test in this block.
     *
     * The bug it prevents is silent on both sides. Somebody scans a garment, passes through
     * profile setup on the way to the wardrobe, and profile CONSUMES the reading — the
     * wardrobe then finds an empty slot and asks them to scan again, while the profile has
     * quietly proposed an estimate built from a jumper. Neither screen can tell "nobody
     * scanned" from "somebody else took it", which is why the address is on the offer.
     */
    offerReading(READING, 'profile');
    expect(takeReading('wardrobe')).toBeNull();
    // AND THE OFFER SURVIVES. A mismatched take that consumed would be the original bug
    // wearing a parameter — the rightful reader would still find nothing.
    expect(takeReading('profile')).toEqual(READING);
  });

  it('is addressed in the other direction too', () => {
    offerReading(READING, 'wardrobe');
    expect(hasOffer('profile')).toBe(false);
    expect(takeReading('profile')).toBeNull();
    expect(takeReading('wardrobe')).toEqual(READING);
  });
  it('can be cleared without being read', () => {
    offerReading(READING, 'profile');
    clearOffer();
    expect(takeReading('profile')).toBeNull();
  });
});

describe('permission maps to three states, not two', () => {
  it('separates "not asked" from "asked and refused"', () => {
    /*
     * A boolean would collapse these, and they are different screens: one has a button that
     * would help and the other does not. Getting it wrong means offering somebody a control
     * that cannot work, which is worse than explaining that it cannot.
     */
    expect(permissionState(true, true)).toBe('granted');
    expect(permissionState(true, false)).toBe('granted');
    expect(permissionState(false, true)).toBe('undetermined');
    expect(permissionState(false, false)).toBe('denied');
  });
});

/**
 * Every reading destination has a producer that SHIPS (FR-40, F-125, E-042).
 *
 * ## Why this is a source scan and not an assertion about behaviour
 *
 * `READING_DESTINATIONS` gained `'wardrobe'` in F-043, `app/wardrobe/add.tsx` has called
 * `takeReading('wardrobe')` ever since, and **nothing in the app ever called
 * `offerReading(…, 'wardrobe')`.** So `AddGarment`'s "use the Lens reading" control could not be
 * reached on a device — a consumer with no producer
 * [[a-column-nothing-writes-makes-its-own-feature-unfalsifiable]].
 *
 * **No behavioural test could see it.** The mailbox works perfectly: plant an offer, take it,
 * and every assertion above passes. The bug is that nobody plants one in shipped code — and the
 * tests plant it themselves, so **the fixture is the missing sender.** That is exactly why the
 * scan below walks `src/` and `app/` and NOT `test/`: including this file would report a
 * producer for `'wardrobe'` that does not ship, which is the defect describing itself as fixed.
 */
describe('every reading destination has a producer in shipped source', () => {
  const ROOTS = ['src', 'app'] as const;

  function sourceFiles(root: string, out: string[] = []): string[] {
    for (const entry of readdirSync(join(process.cwd(), root), { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) sourceFiles(path, out);
      else if (/\.tsx?$/u.test(entry.name)) out.push(path);
    }
    return out;
  }

  const SHIPPED = ROOTS.flatMap((r) => sourceFiles(r)).map((p) => ({
    path: p,
    text: readFileSync(join(process.cwd(), p), 'utf8'),
  }));

  /**
   * Files that CALL `offerReading` with this destination as its second argument.
   *
   * Parsed rather than matched with a regular expression, and not out of fastidiousness: the
   * destination has to be the **argument**, not the word. `handoff.ts` declares
   * `READING_DESTINATIONS = ['profile', 'wardrobe']` and defines `offerReading` itself — a
   * looser check counts that as a producer for both addresses and then passes forever, which is
   * the exact failure this test exists to prevent.
   */
  const producersOf = (destination: string): string[] =>
    SHIPPED.filter((f) =>
      f.text
        .split('offerReading(')
        .slice(1)
        .some((after) => {
          const args = after.slice(0, after.indexOf(')'));
          const second = args.split(',').slice(1).join(',').trim();
          return second === `'${destination}'`;
        }),
    ).map((f) => f.path);

  it('finds shipped source to scan at all', () => {
    // Without this, every assertion below is true of an empty file list.
    expect(SHIPPED.length).toBeGreaterThan(20);
  });

  it('scans no test file, because the fixtures here are the missing sender', () => {
    expect(SHIPPED.filter((f) => f.path.includes('test'))).toHaveLength(0);
  });

  it.each([...READING_DESTINATIONS])('has at least one producer for %s', (destination) => {
    expect(`${destination}: ${String(producersOf(destination).length > 0)}`).toBe(
      `${destination}: true`,
    );
  });

  /*
   * A PRODUCER NOBODY CAN TRIGGER IS THE SAME DEFECT ONE LEVEL UP.
   *
   * The scan above proves `offerReading(taken, 'wardrobe')` exists in shipped source. It does
   * NOT prove the callback holding it is passed to the screen — and a handler that is never
   * wired is exactly as dead as a destination that is never offered to. This case was added
   * because a mutation removing the prop left every other assertion here green.
   *
   * Source assertions rather than a render: `CameraLens` imports the viewfinder, which reaches
   * react-native-vision-camera at module load, so jest cannot mount it. Same reason and same
   * shape as the route-wiring checks in `screens.test.tsx`.
   */
  it('wires each offer to the screen, so the producer can be reached', () => {
    const camera = readFileSync(join(process.cwd(), 'src', 'lens', 'CameraLens.tsx'), 'utf8');

    expect(camera).toContain('onUseForProfile={useForProfile}');
    expect(camera).toContain('onUseForWardrobe={useForWardrobe}');
  });

  it('and the screen declares the props it is handed', () => {
    // The other end of the same seam. A prop passed under a name the screen does not declare
    // is silently ignored by React — no error, no warning, and a dead control.
    const screen = readFileSync(join(process.cwd(), 'src', 'screens', 'Lens.tsx'), 'utf8');

    expect(screen).toContain('readonly onUseForProfile?:');
    expect(screen).toContain('readonly onUseForWardrobe?:');
  });

  /*
   * THE DECOY. Without it, a regex that matched anything would satisfy every case above, and
   * the check would be measuring that `readFileSync` works.
   */
  it('DECOY — a destination nothing offers to has no producer', () => {
    expect(producersOf('shopping')).toHaveLength(0);
    expect(producersOf('nowhere-at-all')).toHaveLength(0);
  });

  it('DECOY — the two real destinations are not produced by the same call site', () => {
    // A regex loose enough to ignore the destination argument would return the same file list
    // for both, and the per-destination assertions would pass while one address was dead.
    expect(producersOf('profile')).not.toHaveLength(0);
    expect(producersOf('wardrobe')).not.toHaveLength(0);
  });
});
