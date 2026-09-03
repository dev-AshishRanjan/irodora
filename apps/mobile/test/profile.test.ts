/**
 * The guided profile: what the trials claim about the corpus, and what the derivation claims
 * about the person.
 *
 * ## The half that would rot silently
 *
 * `TRIALS` names slugs and encodes a claim about the published values behind them — that each
 * comparison separates on its own axis and stays matched on the others. Nothing in the type
 * system holds that. A corpus publish that moved one entry would turn a temperature question
 * into a lightness question, produce a plausible profile, and be invisible from the screen.
 *
 * So the first block checks every trial against the bundle's own OKLCh, trial by trial, and
 * names the one that fails.
 *
 * ## What is asserted about the 90 seconds, and what is not
 *
 * The **arithmetic** of the design budget, which is checkable. Whether a real person finishes
 * inside 90 seconds is attested on F-026 and blocks the release; no assertion here may be
 * quoted as evidence for it (ADR-0031).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { allEntries, entryBySlug } from '../src/corpus';
import {
  applyDerivation,
  correctedDimensions,
  dimensionValue,
  setDimension,
  USER_STATED_CONFIDENCE,
  type Profile,
} from '../src/profile/dimensions';
import {
  CHROMA_PAD,
  CONFIDENCE_MAJORITY,
  CONFIDENCE_NONE,
  CONFIDENCE_UNANIMOUS,
  deriveProfile,
  isComplete,
  LIGHTNESS_PAD,
  LIST_LENGTH,
  remaining,
} from '../src/profile/derive';
import {
  estimateFromReading,
  PHOTO_CEILING,
  readingOklch,
  worthOffering,
} from '../src/profile/photo';
import type { LensReading } from '../src/lens/reading';
import { hueBias } from '@irodora/recommendation';
import { ruleSet } from '../src/rules';
import {
  budgetSeconds,
  FLOW_CEILING_SECONDS,
  TRIALS,
  TRIALS_PER_AXIS,
  TRIAL_AXES,
  trialSlugs,
  type TrialAnswer,
} from '../src/profile/trials';

/** How close two published values have to be to count as "held constant" for a trial. */
const MATCHED_L = 0.03;
const MATCHED_C = 0.03;
const MATCHED_H = 20;
/** How far apart they have to be to count as "the thing this trial is asking about". */
const SEPARATED_L = 0.2;
const SEPARATED_C = 0.04;
const HIGH_CONTRAST_MIN = 0.5;
const LOW_CONTRAST_MAX = 0.12;

const oklch = (slug: string): readonly [number, number, number] => {
  const found = entryBySlug(slug);
  if (found === null) throw new Error(`${slug} is not in the published corpus`);
  const [l, c, h] = found.derived.oklch;
  return [l, c, h];
};

const temperatureOf = (slug: string): string => {
  const found = entryBySlug(slug);
  if (found === null) throw new Error(`${slug} is not in the published corpus`);
  return found.entry.taxonomy.temperature;
};

/** Hue is circular: 350° and 10° are 20° apart, not 340°. */
const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const only = (slugs: readonly string[]): string => {
  if (slugs.length !== 1) throw new Error(`expected one slug, got ${slugs.length.toString()}`);
  return slugs[0]!;
};

describe('every trial is about the axis it claims', () => {
  it('names only slugs the published corpus has', () => {
    const missing = trialSlugs().filter((s) => entryBySlug(s) === null);
    expect(missing).toHaveLength(0);
  });

  it('asks three questions per axis, and no more', () => {
    for (const axis of TRIAL_AXES)
      expect(TRIALS.filter((t) => t.axis === axis)).toHaveLength(TRIALS_PER_AXIS);
    expect(TRIALS).toHaveLength(TRIAL_AXES.length * TRIALS_PER_AXIS);
    // Distinct ids: two trials sharing one would make an answer ambiguous, and the tally would
    // silently count the first match twice.
    expect(new Set(TRIALS.map((t) => t.id)).size).toBe(TRIALS.length);
  });

  for (const trial of TRIALS.filter((t) => t.axis === 'temperature'))
    it(`${trial.id} separates temperature and holds lightness and chroma`, () => {
      const [a, b] = [only(trial.options[0].slugs), only(trial.options[1].slugs)];
      const [la, ca] = oklch(a);
      const [lb, cb] = oklch(b);
      expect(Math.abs(la - lb)).toBeLessThanOrEqual(MATCHED_L);
      expect(Math.abs(ca - cb)).toBeLessThanOrEqual(MATCHED_C);
      // The `a` pole is the warm one, everywhere. The derivation reads the pole, so a trial
      // declared the other way round would invert that axis for this question alone.
      expect(temperatureOf(a)).toBe('warm');
      expect(temperatureOf(b)).toBe('cool');
    });

  for (const trial of TRIALS.filter((t) => t.axis === 'lightness'))
    it(`${trial.id} separates lightness and holds hue, chroma and temperature`, () => {
      const [a, b] = [only(trial.options[0].slugs), only(trial.options[1].slugs)];
      const [la, ca, ha] = oklch(a);
      const [lb, cb, hb] = oklch(b);
      expect(la - lb).toBeGreaterThanOrEqual(SEPARATED_L);
      expect(Math.abs(ca - cb)).toBeLessThanOrEqual(MATCHED_C);
      expect(hueGap(ha, hb)).toBeLessThanOrEqual(MATCHED_H);
      expect(temperatureOf(a)).toBe(temperatureOf(b));
    });

  for (const trial of TRIALS.filter((t) => t.axis === 'chroma'))
    it(`${trial.id} separates chroma and holds lightness, hue and temperature`, () => {
      const [a, b] = [only(trial.options[0].slugs), only(trial.options[1].slugs)];
      const [la, ca, ha] = oklch(a);
      const [lb, cb, hb] = oklch(b);
      expect(ca - cb).toBeGreaterThanOrEqual(SEPARATED_C);
      expect(Math.abs(la - lb)).toBeLessThanOrEqual(MATCHED_L);
      expect(hueGap(ha, hb)).toBeLessThanOrEqual(MATCHED_H);
      expect(temperatureOf(a)).toBe(temperatureOf(b));
    });

  for (const trial of TRIALS.filter((t) => t.axis === 'contrast'))
    it(`${trial.id} offers a high-separation pairing against a low one`, () => {
      const gap = (slugs: readonly string[]): number => {
        const ls = slugs.map((s) => oklch(s)[0]);
        return Math.max(...ls) - Math.min(...ls);
      };
      expect(trial.options[0].slugs).toHaveLength(2);
      expect(trial.options[1].slugs).toHaveLength(2);
      expect(gap(trial.options[0].slugs)).toBeGreaterThanOrEqual(HIGH_CONTRAST_MIN);
      expect(gap(trial.options[1].slugs)).toBeLessThanOrEqual(LOW_CONTRAST_MAX);
    });

  it('the thresholds discriminate — a pair that is NOT separated fails them', () => {
    /*
     * The decoy. Without it, "every lightness trial clears SEPARATED_L" would also be true of
     * a threshold of zero, and the block above would pass on a corpus where every trial had
     * collapsed [[a-decoy-that-is-not-broken-proves-nothing]].
     *
     * `usu-gami` and `kai-jiro` are two off-whites 0.018 apart.
     */
    const [near] = oklch('usu-gami');
    const [alsoNear] = oklch('kai-jiro');
    expect(Math.abs(near - alsoNear)).toBeLessThan(SEPARATED_L);
  });
});

describe('the design budget', () => {
  it('fits inside FR-26’s ceiling, with the arithmetic stated', () => {
    // A BUDGET, NOT A MEASUREMENT. This asserts the design leaves room; whether a person
    // finishes in 90 seconds is F-026's attested criterion and is not evidenced here.
    expect(budgetSeconds()).toBeLessThanOrEqual(FLOW_CEILING_SECONDS);
  });

  it('has room that a thirteenth trial would actually consume', () => {
    // Without this, "the budget fits" would stay true of a per-trial budget of zero. It says
    // the margin is real and finite: the flow could not absorb another whole axis.
    expect(budgetSeconds()).toBeGreaterThan(FLOW_CEILING_SECONDS / 2);
  });
});

/**
 * FR-26's "no camera", re-scoped by F-027 — and the guarantee is stronger, not weaker.
 *
 * The first version scanned everything under `src/profile/` for anything camera-shaped. F-027
 * put `photo.ts` in that directory, and it names `LensReading` **on purpose** — so the original
 * scan would have failed on the feature it was meant to coexist with, and the tempting repair
 * is to add an exclusion and move on.
 *
 * That would have quietly changed what is guaranteed. What FR-26 protects is that **a person
 * who will not photograph their face can finish the guided flow** — which is a claim about what
 * the guided modules DEPEND ON, not about which files sit next to them. So the check now asserts
 * the dependency directly:
 *
 * 1. no guided module matches a camera pattern, **and none of them imports `./photo`**;
 * 2. `photo.ts` itself reaches the lens **by type only**, so nothing camera-shaped is in the
 *    runtime graph at all — an `import type` is erased before the bundler sees it;
 * 3. the guided flow renders start to finish with no reading supplied.
 *
 * (1) is what the old check meant to say. (2) and (3) are new, and neither was true-by-accident
 * before — they are the two things a reader would want to know once a photo path exists.
 */
describe('the guided flow reaches no camera', () => {
  /** Anything that would put a lens between the person and the answer. */
  const CAMERA = /vision-camera|expo-camera|\.\.\/lens\/|from '\.\/camera'|ImagePicker/;

  /** The modules the guided flow depends on. `photo.ts` is deliberately not one of them. */
  const GUIDED = ['dimensions.ts', 'trials.ts', 'derive.ts', 'store.ts'];

  const guidedSources = (): { file: string; text: string }[] =>
    GUIDED.map((name) => {
      const file = join(__dirname, '..', 'src', 'profile', name);
      return { file, text: readFileSync(file, 'utf8') };
    });

  it('imports nothing that opens one', () => {
    const offenders = guidedSources()
      .filter(({ text }) => CAMERA.test(text))
      .map(({ file }) => file);
    expect(offenders).toHaveLength(0);
  });

  it('does not depend on the photo path either', () => {
    // The dependency claim, which is the one FR-26 actually makes. Without it "no camera" would
    // be satisfied by a guided module that imported `photo.ts`, which imports the lens.
    for (const { file, text } of guidedSources())
      expect(`${file}: ${String(text.includes('./photo'))}`).toBe(`${file}: false`);
  });

  it('and photo.ts reaches the lens by TYPE ONLY, so no camera is in the runtime graph', () => {
    // `import type` is erased before Metro sees it. This is what lets a photo path exist in the
    // same directory without putting a native module into the bundle the guided user loads.
    const photo = readFileSync(join(__dirname, '..', 'src', 'profile', 'photo.ts'), 'utf8');
    expect(photo).toContain('import type { LensReading }');
    // The negative half: not a value import of the same module, which would NOT be erased.
    expect(photo).not.toMatch(/^import \{[^}]*\} from '\.\.\/lens\//mu);
  });

  it('and the check can see one — the decoy', () => {
    /*
     * A scanner over files that happen not to contain the pattern proves nothing about the
     * scanner [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
     *
     * THE FIXTURES ARE ASSEMBLED RATHER THAN WRITTEN WHOLE, and that is not fussiness:
     * `scripts/verify-app-imports.mjs` scans this repository for relative imports and checks
     * each one resolves under Metro. It reads the SOURCE TEXT, so a decoy written as a whole
     * import line is indistinguishable from a real one — and so is a comment quoting it, which
     * is how this note failed the gate on its own second draft. Splitting the specifier keeps
     * the runtime string identical and leaves nothing in the file that reads as an import.
     */
    const lensPath = ['..', 'lens', 'reading'].join('/');
    const lens = `import { readOnce } from '${lensPath}';`;
    expect(CAMERA.test("import { Camera } from 'react-native-vision-camera';")).toBe(true);
    expect(CAMERA.test(lens)).toBe(true);
    expect(CAMERA.test("import { Swatch } from '@irodora/ui';")).toBe(false);
  });

  it('scanned the files it meant to', () => {
    // A walk that found nothing reports the same "no offenders" as a clean one
    // [[a-gate-that-errors-is-failing-open]]. And the roster is asserted against the directory,
    // so a NEW guided module is a failure here rather than a file nothing scans.
    const files = guidedSources();
    expect(files).toHaveLength(GUIDED.length);
    expect(files.every(({ text }) => text.length > 0)).toBe(true);
    const onDisk = readdirSync(join(__dirname, '..', 'src', 'profile')).filter((f) =>
      f.endsWith('.ts'),
    );
    expect([...onDisk].sort()).toEqual([...GUIDED, 'photo.ts'].sort());
  });
});

/** Answer every trial on one axis with one pole, and the rest with `a`. */
const answers = (over: Partial<Record<string, 'a' | 'b'>> = {}): TrialAnswer[] =>
  TRIALS.map((t) => ({ trialId: t.id, pole: over[t.id] ?? 'a' }));

/** Every trial on `axis` answered with `pole`; every other trial answered `a`. */
const axisAnswers = (axis: string, pole: 'a' | 'b'): TrialAnswer[] =>
  TRIALS.map((t) => ({ trialId: t.id, pole: t.axis === axis ? pole : 'a' }));

describe('the derivation', () => {
  it('is unanimous only when the answers were', () => {
    const all = deriveProfile('p', answers());
    expect(all.confidence.temperature).toBe(CONFIDENCE_UNANIMOUS);

    const split = deriveProfile('p', answers({ 'temperature-mid': 'b' }));
    expect(split.confidence.temperature).toBe(CONFIDENCE_MAJORITY);
    // The other axes are untouched by one changed temperature answer.
    expect(split.confidence.lightness).toBe(CONFIDENCE_UNANIMOUS);
  });

  it('never claims more than agreement across three taps can support', () => {
    // Golden rule 11. F-028 weights recommendations by this number, so an overstated
    // confidence is authority the answer did not earn.
    const profile = deriveProfile('p', answers());
    for (const value of Object.values(profile.confidence))
      expect(value).toBeLessThanOrEqual(CONFIDENCE_UNANIMOUS);
  });

  it('reaches the poles of the temperature bias, and the middle of it', () => {
    expect(deriveProfile('p', axisAnswers('temperature', 'a')).temperatureBias).toBe(1);
    expect(deriveProfile('p', axisAnswers('temperature', 'b')).temperatureBias).toBe(-1);
    const leaning = deriveProfile('p', answers({ 'temperature-mid': 'b' })).temperatureBias;
    expect(leaning).toBeCloseTo(1 / 3, 10);
  });

  it('produces a WIDER lightness range when the answers disagreed', () => {
    const agreed = deriveProfile('p', axisAnswers('lightness', 'a')).lightness;
    const split = deriveProfile('p', answers({ 'lightness-blue': 'b' })).lightness;
    // The property that makes the range and the confidence consistent: they come from the
    // same fact rather than from two independent guesses.
    expect(split.max - split.min).toBeGreaterThan(agreed.max - agreed.min);
  });

  it('pads a range around the values that were chosen, and clamps to the axis', () => {
    const profile = deriveProfile('p', axisAnswers('lightness', 'a'));
    const chosen = TRIALS.filter((t) => t.axis === 'lightness').map(
      (t) => oklch(only(t.options[0].slugs))[0],
    );
    expect(profile.lightness.min).toBeCloseTo(Math.min(...chosen) - LIGHTNESS_PAD, 10);
    expect(profile.lightness.max).toBeCloseTo(Math.max(...chosen) + LIGHTNESS_PAD, 10);
    expect(profile.lightness.min).toBeGreaterThanOrEqual(0);
    expect(profile.lightness.max).toBeLessThanOrEqual(1);
    // And the chroma axis takes its own pad, not the lightness one.
    const chosenC = TRIALS.filter((t) => t.axis === 'chroma').map(
      (t) => oklch(only(t.options[0].slugs))[1],
    );
    expect(profile.chroma.max).toBeCloseTo(Math.max(...chosenC) + CHROMA_PAD, 10);
  });

  it('maps contrast answers to three preferences and no more', () => {
    expect(deriveProfile('p', axisAnswers('contrast', 'a')).contrast).toBe('high');
    expect(deriveProfile('p', axisAnswers('contrast', 'b')).contrast).toBe('low');
    expect(deriveProfile('p', answers({ 'contrast-warm': 'b' })).contrast).toBe('medium');
  });

  it('is a pure function of the answers', () => {
    // FR-29's shape, one release early: the same answers must produce the same profile, or
    // nothing downstream is reproducible from a stored envelope.
    const a = deriveProfile('p', answers({ 'chroma-warm-mid': 'b' }));
    const b = deriveProfile('p', answers({ 'chroma-warm-mid': 'b' }));
    expect(a).toEqual(b);
  });

  it('answers nothing when it was asked nothing', () => {
    const empty = deriveProfile('p', []);
    expect(empty.confidence.temperature).toBe(CONFIDENCE_NONE);
    expect(empty.temperatureBias).toBe(0);
    // The full axis rather than a narrow guess: a range derived from no evidence must not
    // exclude anything.
    expect(empty.lightness).toEqual({ min: 0, max: 1 });
  });
});

describe('the three lists', () => {
  const profile = deriveProfile('p', answers());

  it('keeps neutrals inside the lightness range and low in chroma', () => {
    expect(profile.neutrals.length).toBeGreaterThan(0);
    expect(profile.neutrals.length).toBeLessThanOrEqual(LIST_LENGTH);
    for (const slug of profile.neutrals) {
      const found = entryBySlug(slug);
      expect(found?.entry.taxonomy.chromaBand).toBe('low');
      const [l] = oklch(slug);
      expect(l).toBeGreaterThanOrEqual(profile.lightness.min);
      expect(l).toBeLessThanOrEqual(profile.lightness.max);
    }
  });

  it('does NOT confine accents to the lightness range', () => {
    // Stated as a property because it is a design decision that reads like an oversight: an
    // accent is a small area, and the lightness that suits next to the face constrains the
    // large ones. A list identical to `neutrals` with more chroma would mean the word had
    // stopped meaning anything.
    const accents = profile.accents.map((s) => oklch(s)[0]);
    const outside = accents.filter((l) => l < profile.lightness.min || l > profile.lightness.max);
    expect(outside.length).toBeGreaterThan(0);
    expect(profile.accents.some((s) => profile.neutrals.includes(s))).toBe(false);
  });

  it('gives a list no more confidence than the dimensions behind it', () => {
    const split = deriveProfile('p', answers({ 'temperature-mid': 'b' }));
    expect(split.confidence.temperature).toBe(CONFIDENCE_MAJORITY);
    // neutrals is min(lightness, temperature); lightness stayed unanimous, so the minimum is
    // the temperature reading. A mean would have laundered it up to 0.625.
    expect(split.confidence.neutrals).toBe(CONFIDENCE_MAJORITY);
    expect(split.confidence.accents).toBe(CONFIDENCE_MAJORITY);
  });

  it('leaves the avoid list empty rather than inventing difficulty', () => {
    // Every trial answered `b` on chroma gives a wide-enough tolerance that little exceeds it.
    // An empty list is a real answer — "nothing here contradicts what you told us".
    const tolerant = deriveProfile('p', axisAnswers('chroma', 'a'));
    for (const slug of tolerant.avoid) expect(oklch(slug)[1]).toBeGreaterThan(tolerant.chroma.max);
  });

  it('draws every slug from the published corpus', () => {
    for (const slug of [...profile.neutrals, ...profile.accents, ...profile.avoid])
      expect(entryBySlug(slug)).not.toBeNull();
    // And the corpus is the real one, not an empty set that would satisfy every loop above.
    expect(allEntries().length).toBeGreaterThan(100);
  });
});

describe('a correction is never overwritten', () => {
  const derived = deriveProfile('p', answers());

  it('latches the dimension to `user` and records where the value came from', () => {
    const edited = setDimension(derived, { kind: 'contrast', preference: 'low' });
    expect(edited.contrast).toBe('low');
    expect(edited.origin.contrast).toBe('user');
    expect(edited.confidence.contrast).toBe(USER_STATED_CONFIDENCE);
    expect(correctedDimensions(edited)).toEqual(['contrast']);
  });

  it('latches even when the value did not move', () => {
    // "I looked at this and it is right" is a correction. Inferring intent from whether the
    // value changed would make the latch depend on the person choosing a different answer,
    // which is not what they were asked.
    const confirmed = setDimension(derived, { kind: 'contrast', preference: derived.contrast });
    expect(confirmed.origin.contrast).toBe('user');
  });

  it('keeps the corrected dimension across a re-derivation — AND moves the others', () => {
    /*
     * THE TABLE THAT MATTERS, both halves in one test. Without the second expectation,
     * "the correction survived" would also pass on an implementation where nothing is ever
     * updated [[a-decoy-that-is-not-broken-proves-nothing]].
     */
    const edited = setDimension(derived, { kind: 'contrast', preference: 'low' });
    const fresh = deriveProfile('p', axisAnswers('contrast', 'a'));
    expect(fresh.contrast).toBe('high');

    const merged = applyDerivation(edited, fresh);
    expect(merged.contrast).toBe('low');
    expect(merged.origin.contrast).toBe('user');
    expect(merged.confidence.contrast).toBe(USER_STATED_CONFIDENCE);

    // The baseline: a `derived` dimension DOES take the new value.
    const wider = deriveProfile('p', answers({ 'lightness-blue': 'b' }));
    const merged2 = applyDerivation(edited, wider);
    expect(merged2.lightness).toEqual(wider.lightness);
    expect(merged2.origin.lightness).toBe('derived');
  });

  it('protects a list dimension the same way it protects a number', () => {
    const edited = setDimension(derived, { kind: 'avoid', slugs: ['usu-gami'] });
    const merged = applyDerivation(edited, deriveProfile('p', axisAnswers('chroma', 'b')));
    expect(merged.avoid).toEqual(['usu-gami']);
  });

  it('orders a range whichever way the person dragged it', () => {
    const edited = setDimension(derived, { kind: 'lightness', range: { min: 0.9, max: 0.2 } });
    expect(edited.lightness).toEqual({ min: 0.2, max: 0.9 });
  });

  it('reads every dimension back in the shape the editor takes', () => {
    // Totality: a dimension added to the union without a case here is a compile error, not a
    // control that silently does nothing.
    for (const dimension of [
      'lightness',
      'temperature',
      'chroma',
      'contrast',
      'neutrals',
      'accents',
      'avoid',
    ] as const)
      expect(dimensionValue(derived, dimension).kind).toBe(dimension);
  });
});

describe('completion', () => {
  it('is not complete until every trial is answered', () => {
    expect(isComplete([])).toBe(false);
    expect(remaining([])).toBe(TRIALS.length);
    const partial = answers().slice(0, 5);
    expect(isComplete(partial)).toBe(false);
    expect(remaining(partial)).toBe(TRIALS.length - 5);
    expect(isComplete(answers())).toBe(true);
    expect(remaining(answers())).toBe(0);
  });
});

/**
 * F-027 — one reading into a profile nobody has agreed to yet.
 *
 * The estimate is a **pure function of a `LensReading`**, which is what makes it checkable at
 * all without a device: F-040 drew that seam precisely so the half that can be gated is gated
 * and the half that needs a phone is attested rather than faked.
 */
describe('a photo estimate', () => {
  /** A good reading: sRGB, well lit, plenty of samples, nothing capped. */
  const reading = (over: Partial<LensReading> = {}): LensReading => ({
    rgb: [0.78, 0.62, 0.5],
    space: 'srgb',
    usableSamples: 1800,
    variance: 0.01,
    illumination: 'daylight',
    quality: 'excellent',
    confidence: 1,
    instruction: '',
    ...over,
  });

  it('cannot be handed an image, and the type is what says so', () => {
    /*
     * F-040's own move, inherited rather than restated. `ts-expect-error` fails the build on an
     * UNUSED directive, so if `LensReading` ever grows a field a frame could be assigned to,
     * this line stops erroring and the test stops compiling — which is the failure mode a
     * comment saying "do not pass the frame" does not have.
     */
    // @ts-expect-error — there is no field pixels, a buffer, a path or a URI could go in.
    const withImage: LensReading = { ...reading(), pixels: new Uint8Array(4) };
    expect(withImage.usableSamples).toBe(1800);
  });

  it('never exceeds the photo ceiling, even on a perfect reading', () => {
    // NFR-23: nobody has measured this path across ITA° bands, so nothing about it may sound
    // more certain than a convention. A reading with confidence 1 is still capped.
    const p = estimateFromReading('p', reading({ confidence: 1 }));
    for (const value of Object.values(p.confidence))
      expect(value).toBeLessThanOrEqual(PHOTO_CEILING);
    expect(p.confidence.lightness).toBe(PHOTO_CEILING);
  });

  it('is never more confident than a split guided answer', () => {
    // The ordering that matters: twelve taps somebody half-disagreed with still outrank one
    // photograph. If this inverts, the compatibility engine starts preferring the camera.
    expect(PHOTO_CEILING).toBeLessThanOrEqual(CONFIDENCE_MAJORITY);
    expect(estimateFromReading('p', reading()).confidence.lightness).toBeLessThanOrEqual(
      CONFIDENCE_MAJORITY,
    );
  });

  it('STAYS capped while NFR-23’s validation is outstanding (F-037)', () => {
    /*
     * The only guard NFR-23 can have before the study exists, and it is worth having.
     *
     * NFR-23 requires this path to be validated across every ITA° band before anybody may say
     * how well it performs. **That study has not run** — it needs participants, it is F-037's
     * attested criterion, and it blocks release.
     *
     * `PHOTO_CEILING` is the number that stands in for it: 0.5 not because anything was
     * measured, but because nothing was. This assertion turns "we have not measured this" from
     * a note in a state file into a CONDITION — anybody raising the ceiling while the study is
     * outstanding gets a failing test asking them what changed, rather than a green run.
     *
     * When F-037's study lands, this test is what should be edited, deliberately, alongside the
     * per-band numbers that justify the new value.
     */
    expect(PHOTO_CEILING).toBeLessThanOrEqual(CONFIDENCE_MAJORITY);
  });

  it('carries the reading’s own cap through, rather than restating it', () => {
    // A poor reading must produce a less confident estimate. The reading has already combined
    // capture space, illumination and quality by taking a minimum; this only adds its own.
    const poor = estimateFromReading('p', reading({ confidence: 0.2 }));
    expect(poor.confidence.lightness).toBe(0.2);
    // And the baseline, so "it is capped" is distinguishable from "it is always 0.2".
    expect(estimateFromReading('p', reading()).confidence.lightness).toBe(PHOTO_CEILING);
  });

  it('ABSTAINS on contrast rather than inventing it', () => {
    /*
     * The design decision this feature turns on. One region has no second colour to be
     * contrasted with, so the estimate says "not asked yet" in the same words the guided path
     * uses for an unanswered trial — and every OTHER dimension is answered, which is what makes
     * the abstention legible as a choice rather than as a bug.
     */
    const p = estimateFromReading('p', reading());
    expect(p.confidence.contrast).toBe(CONFIDENCE_NONE);
    expect(p.confidence.lightness).toBeGreaterThan(CONFIDENCE_NONE);
    expect(p.confidence.temperature).toBeGreaterThan(CONFIDENCE_NONE);
    expect(p.confidence.chroma).toBeGreaterThan(CONFIDENCE_NONE);
  });

  it('records the method it came from', () => {
    expect(estimateFromReading('p', reading()).method).toBe('photo-assisted');
  });

  it('centres the lightness range on the reading, inside the axis', () => {
    const p = estimateFromReading('p', reading());
    const [l] = readingOklch(reading());
    expect((p.lightness.min + p.lightness.max) / 2).toBeCloseTo(l, 6);
    expect(p.lightness.min).toBeGreaterThanOrEqual(0);
    expect(p.lightness.max).toBeLessThanOrEqual(1);

    // Clamped rather than wrapped, at both ends.
    const dark = estimateFromReading('p', reading({ rgb: [0.01, 0.01, 0.01] }));
    expect(dark.lightness.min).toBe(0);
    const light = estimateFromReading('p', reading({ rgb: [1, 1, 1] }));
    expect(light.lightness.max).toBe(1);
  });

  it('reads warm and cool from the hue, and neither from the middle', () => {
    const { poles } = ruleSet();
    expect(hueBias(poles.warm, poles)).toBeCloseTo(1, 10);
    expect(hueBias(poles.cool, poles)).toBeCloseTo(-1, 10);
    // Equidistant from both references. A threshold comparison would return a confident answer
    // here and flip it on a single degree.
    expect(hueBias((poles.warm + poles.cool) / 2, poles)).toBeCloseTo(0, 10);
  });

  it('takes its poles from the PUBLISHED rule set, not from a literal (F-099)', () => {
    /*
     * Compared against the file on disk rather than against 60 and 240 typed here. Two literals
     * in a test are the same defect as two literals in the source — the test would keep passing
     * through exactly the publish that made the app and the engine disagree.
     */
    const published = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', '..', 'content', 'rules', 'weights.2026.08.2.json'),
        'utf8',
      ),
    ) as { poles: { warm: number; cool: number } };
    expect(ruleSet().poles).toEqual(published.poles);
  });

  it('COMPUTES NO BIAS OF ITS OWN — the app and the engine agree at every degree (F-099)', () => {
    /*
     * THE ASSERTION THIS FEATURE EXISTS FOR, and the reason it sweeps rather than sampling.
     *
     * `biasFromHue` and `hueBias` both passed a three-point test — warm, cool, and the middle —
     * for two features, while being two implementations of one rule. Three points is what a
     * second copy passes; 360 is what it fails as soon as anything about it differs, including
     * a pole moving underneath one of them.
     *
     * There is nothing left to compare against, which is the point: the estimate is asserted to
     * be a monotone function of the engine's answer, so a re-introduced local copy would have to
     * reproduce `hueBias` exactly at every degree to survive.
     */
    const { poles } = ruleSet();
    let previous = -Infinity;
    // `<=`, not `<`. The half-open bound stopped at 419, and 419 % 360 is 59 — one degree
    // short of the warm pole, so the final assertion compared 0.9889 against 1. The sweep was
    // right and its bound was not.
    for (let hue = poles.cool; hue <= poles.cool + 180; hue += 1) {
      const bias = hueBias(((hue % 360) + 360) % 360, poles);
      expect(bias).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = bias;
    }
    expect(previous).toBeCloseTo(1, 10);
  });

  it('pulls the bias toward the middle when the reading was poor', () => {
    // A washed-out reading should not say "fully warm" with a quiet number beside it. The
    // estimate itself moves, which is what a poor reading actually supports.
    const warm = reading({ rgb: [0.9, 0.6, 0.35] });
    const good = estimateFromReading('p', warm);
    const bad = estimateFromReading('p', { ...warm, confidence: 0.1 });
    expect(good.temperatureBias).toBeGreaterThan(0);
    expect(Math.abs(bad.temperatureBias)).toBeLessThan(Math.abs(good.temperatureBias));
  });

  it('converts through the space the platform reported, not the one it assumed', () => {
    // The same numbers in P3 are a different colour. If this ever stops differing, the space
    // is being ignored — which is the exact defect `readCaptureSpace` exists to prevent, and
    // it is invisible in every other assertion here.
    const srgb = readingOklch(reading({ space: 'srgb' }));
    const p3 = readingOklch(reading({ space: 'display-p3' }));
    expect(p3).not.toEqual(srgb);
    // `unknown` converts as sRGB deliberately; its cost is the reading's own confidence ceiling,
    // which is applied before this module sees it.
    expect(readingOklch(reading({ space: 'unknown' }))).toEqual(srgb);
  });

  it('draws its three lists from the same functions the guided path uses', () => {
    const p = estimateFromReading('p', reading());
    for (const slug of [...p.neutrals, ...p.accents, ...p.avoid])
      expect(entryBySlug(slug)).not.toBeNull();
    expect(p.accents.length).toBeGreaterThan(0);
  });

  it('declines to offer an estimate built on nothing', () => {
    expect(worthOffering(reading())).toBe(true);
    expect(worthOffering(reading({ confidence: 0 }))).toBe(false);
    expect(worthOffering(reading({ usableSamples: 0 }))).toBe(false);
  });

  it('is subject to the SAME correction latch as the guided path', () => {
    /*
     * There are two producers of a `Profile` now, and only one implementation of "a user
     * correction is never overwritten". This is the assertion that says the second producer did
     * not get its own path — with both halves, so "the correction survived" is distinguishable
     * from "nothing ever moves".
     */
    const guided = deriveProfile('p', answers());
    const edited = setDimension(guided, { kind: 'chroma', range: { min: 0, max: 0.05 } });
    const merged = applyDerivation(edited, estimateFromReading('p', reading()));
    expect(merged.chroma).toEqual({ min: 0, max: 0.05 });
    expect(merged.origin.chroma).toBe('user');
    // The baseline: an untouched dimension DOES take the estimate's value.
    expect(merged.lightness).toEqual(estimateFromReading('p', reading()).lightness);
  });
});

/** Used by the profile type in a way `typecheck` alone would not exercise. */
export type _Profile = Profile;

/**
 * ADR-0076, at the surface that writes a profile.
 *
 * The engine's own suite asserts the rule. This asserts the CONSEQUENCE the app is responsible
 * for: a reading of something grey must not propose a temperature preference, because that
 * preference is written into a stored profile and every later recommendation reads it.
 */
describe('a near-neutral reading proposes no temperature (ADR-0076)', () => {
  const reading = (rgb: readonly [number, number, number]): LensReading => ({
    rgb: [rgb[0], rgb[1], rgb[2]],
    space: 'srgb',
    usableSamples: 1800,
    variance: 0.01,
    illumination: 'daylight',
    quality: 'excellent',
    confidence: 1,
    instruction: '',
  });

  it('a grey reading lands near zero, whichever side of the circle its hue falls', () => {
    /*
     * TWO GREYS WHOSE RGB DIFFERS BY 0.004. Measured: both land at OKLCh C = 0.0010, hue 67.8°
     * and 247.8°. Under the raw hue question they came back at **+0.913 and −0.913** — a
     * near-complete temperature verdict, in opposite directions, from a difference no eye could
     * resolve. Chroma-weighted they are ±0.023.
     *
     * This mattered more here than in the engine: the value is written into a stored PROFILE,
     * where it then biases every recommendation the person ever sees.
     */
    const warmish = estimateFromReading('p', reading([0.502, 0.5, 0.498]));
    const coolish = estimateFromReading('p', reading([0.498, 0.5, 0.502]));
    expect(Math.abs(warmish.temperatureBias)).toBeLessThan(0.15);
    expect(Math.abs(coolish.temperatureBias)).toBeLessThan(0.15);
  });

  it('DECOY — a saturated reading still proposes a temperature', () => {
    // Without this, the assertion above is also true of an estimate that stopped reading hue.
    const orange = estimateFromReading('p', reading([0.85, 0.45, 0.15]));
    const blue = estimateFromReading('p', reading([0.15, 0.35, 0.8]));
    expect(orange.temperatureBias).toBeGreaterThan(0.2);
    expect(blue.temperatureBias).toBeLessThan(-0.2);
  });
});
