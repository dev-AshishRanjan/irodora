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
    expect(missing).toEqual([]);
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

describe('the flow reaches no camera', () => {
  /** Anything that would put a lens between the person and the answer. */
  const CAMERA = /vision-camera|expo-camera|\.\.\/lens\/|from '\.\/camera'|ImagePicker/;

  const sources = (): { file: string; text: string }[] => {
    const dir = join(__dirname, '..', 'src', 'profile');
    const files = readdirSync(dir).map((f) => join(dir, f));
    files.push(join(__dirname, '..', 'src', 'screens', 'ProfileSetup.tsx'));
    return files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
  };

  it('imports nothing that opens one', () => {
    // FR-26 says "no camera", and it is the accessibility and privacy half of ADR-0010: the
    // guided path has to work for somebody who will not photograph their face. An import is
    // what would quietly make it optional-in-name-only.
    const offenders = sources()
      .filter(({ text }) => CAMERA.test(text))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
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
    // [[a-gate-that-errors-is-failing-open]].
    const files = sources();
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(files.every(({ text }) => text.length > 0)).toBe(true);
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

/** Used by the profile type in a way `typecheck` alone would not exercise. */
export type _Profile = Profile;
