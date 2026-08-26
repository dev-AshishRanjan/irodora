/**
 * CVD mode: which pair is hard to tell apart, what to swap, and how much better it gets.
 *
 * ## What this file is careful about
 *
 * "It flags things" is satisfied by a function that flags everything, so every assertion here
 * has its other half: a palette that SHOULD be flagged and one that should not, a swap that
 * improves and a case where nothing does.
 *
 * The pairs are **found by asking the model**, not by reasoning about hue. F-031 learned that
 * the hard way — a red and a green scored 100 because they differ in lightness, and
 * `separationScore` weights that.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allEntries, colorFor, CORPUS_LABEL, entryBySlug } from '../src/corpus';
import {
  CVD_MODE_VERSION,
  findSeparationProblems,
  HARD_TO_SEPARATE,
  proposeAlternative,
  reproduceImprovement,
  SEVERITY,
  worstSeparation,
  WORTH_PROPOSING,
  type CheckedColour,
} from '../src/outfit/cvd';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';

const checked = (slug: string): CheckedColour => {
  const entry = entryBySlug(slug);
  if (entry === null) throw new Error(`${slug} is not in the published corpus`);
  return { id: slug, label: entry.entry.name.en, color: colorFor(entry.entry) };
};

/** The hardest pair in the corpus by the model's own reckoning — found by asking it. */
const HARD_A = 'kawaki-suna';
const HARD_B = 'usu-shiba';
/** A near-black and a near-white: separable under every deficiency. */
const EASY_A = 'soko-zumi';
const EASY_B = 'usu-gami';

describe('the corpus this runs against', () => {
  it('is the real one, so the counts below mean something', () => {
    expect(allEntries().length).toBeGreaterThanOrEqual(120);
  });
});

describe('finding the pairs that are hard to tell apart', () => {
  it('flags a pair the model says is hard', () => {
    const findings = findSeparationProblems([checked(HARD_A), checked(HARD_B)]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.separation).toBeLessThan(HARD_TO_SEPARATE);
  });

  it('does NOT flag a pair it says is fine — the other half', () => {
    // Without this, "it flags hard pairs" is equally true of a function that flags everything.
    expect(findSeparationProblems([checked(EASY_A), checked(EASY_B)])).toEqual([]);
  });

  it('reports the pair, not a colour', () => {
    // Separation is a property of two things together. Reporting "this colour is a problem"
    // would be reporting the wrong noun, and there would be no swap that could fix it.
    const finding = findSeparationProblems([checked(HARD_A), checked(HARD_B)])[0];
    expect(finding?.a.id).toBe(HARD_A);
    expect(finding?.b.id).toBe(HARD_B);
    expect(['protan', 'deutan', 'tritan']).toContain(finding?.deficiency);
  });

  it('takes the WORST deficiency, not the mean', () => {
    // A pair that survives two and vanishes under the third is a pair that vanishes.
    const a = colorFor(entryBySlug(HARD_A)!.entry);
    const b = colorFor(entryBySlug(HARD_B)!.entry);
    const worst = worstSeparation(a, b);
    expect(worst.score).toBeLessThan(HARD_TO_SEPARATE);
    // And it is genuinely the minimum: no deficiency scores below what was reported.
    const finding = findSeparationProblems([checked(HARD_A), checked(HARD_B)])[0];
    expect(finding?.separation).toBe(worst.score);
  });

  it('orders worst first, and independently of the order it was given', () => {
    const set = [checked(HARD_A), checked(HARD_B), checked('usu-gami'), checked('kai-jiro')];
    const forward = findSeparationProblems(set).map((f) => `${f.a.id}-${f.b.id}`);
    const reversed = findSeparationProblems([...set].reverse()).map((f) => `${f.a.id}-${f.b.id}`);
    expect(forward.length).toBeGreaterThan(0);
    // Same findings whichever way the members arrived — a flag that depends on input order is
    // not reproducible from anything.
    expect(new Set(reversed).size).toBe(new Set(forward).size);
    const scores = findSeparationProblems(set).map((f) => f.separation);
    expect([...scores].sort((x, y) => x - y)).toEqual(scores);
  });

  it('finds nothing in a set of one, and nothing in an empty set', () => {
    expect(findSeparationProblems([checked(HARD_A)])).toEqual([]);
    expect(findSeparationProblems([])).toEqual([]);
  });
});

describe('the alternative, and the measured improvement', () => {
  it('proposes a swap that actually raises separation', () => {
    const finding = findSeparationProblems([checked(HARD_A), checked(HARD_B)])[0];
    expect(finding?.alternative).not.toBeNull();
    const alternative = finding?.alternative;
    if (alternative === null || alternative === undefined) throw new Error('no alternative');

    expect(alternative.separation).toBeGreaterThan(finding!.separation);
    // The improvement is the arithmetic it claims — recomputed here rather than trusted.
    expect(alternative.improvement).toBeCloseTo(alternative.separation - finding!.separation, 10);
    expect(alternative.improvement).toBeGreaterThanOrEqual(WORTH_PROPOSING);
  });

  it('names a real corpus entry, with the hex the corpus published', () => {
    const alternative = findSeparationProblems([checked(HARD_A), checked(HARD_B)])[0]?.alternative;
    if (alternative == null) throw new Error('no alternative');
    const entry = entryBySlug(alternative.slug);
    expect(entry).not.toBeNull();
    expect(alternative.hex).toBe(entry?.derived.hex);
  });

  it('returns null rather than the least-bad option when nothing clears the bar', () => {
    /*
     * The decoy for "it always proposes something". Searched against a pool of ONE entry that
     * is itself the problem colour, so no swap can improve anything — and a swap gaining two
     * points is a change asked of somebody for nothing.
     */
    const keep = colorFor(entryBySlug(HARD_A)!.entry);
    const replace = colorFor(entryBySlug(HARD_B)!.entry);
    const onlyTheProblem = allEntries().filter((e) => e.entry.slug === HARD_B);
    expect(proposeAlternative(keep, replace, onlyTheProblem)).toBeNull();
    // And the baseline, in the same test: against the whole corpus it DOES find one.
    expect(proposeAlternative(keep, replace)).not.toBeNull();
  });

  it('is deterministic — the same set proposes the same swap twice', () => {
    const once = findSeparationProblems([checked(HARD_A), checked(HARD_B)]);
    const twice = findSeparationProblems([checked(HARD_A), checked(HARD_B)]);
    expect(once).toEqual(twice);
  });
});

describe('reproducible from the envelope (criterion 2)', () => {
  it('records the versions the number came from', () => {
    const finding = findSeparationProblems([checked(HARD_A), checked(HARD_B)])[0];
    expect(finding?.envelope.corpus).toBe(CORPUS_LABEL);
    expect(finding?.envelope.engine).toBe(CVD_MODE_VERSION);
    expect(finding?.envelope.severity).toBe(SEVERITY);
  });

  it('recomputes the same improvement from the envelope and the three colours', () => {
    const finding = findSeparationProblems([checked(HARD_A), checked(HARD_B)])[0];
    const alternative = finding?.alternative;
    if (finding === undefined || alternative == null) throw new Error('no finding');

    const again = reproduceImprovement(
      finding.envelope,
      finding.a.color,
      finding.b.color,
      colorFor(entryBySlug(alternative.slug)!.entry),
    );
    expect(again).toBeCloseTo(alternative.improvement, 10);
  });

  it('REFUSES to recompute at a severity the envelope did not record', () => {
    // A number recomputed under different conditions is not the number that was reported, and
    // returning it anyway is how an explanation quietly stops explaining the thing it describes.
    const finding = findSeparationProblems([checked(HARD_A), checked(HARD_B)])[0];
    if (finding === undefined) throw new Error('no finding');
    expect(() =>
      reproduceImprovement(
        { ...finding.envelope, severity: 0.5 },
        finding.a.color,
        finding.b.color,
        finding.a.color,
      ),
    ).toThrow(/severity/u);
  });
});

describe('it reads as an observation about the colours (criterion 3)', () => {
  /**
   * Second-person language about seeing, in either catalogue.
   *
   * The product knows nothing about the reader's vision and must not imply that it does. This
   * is NFR-22's discipline arriving from a different direction: the failure is not a stored
   * field, it is a sentence that diagnoses somebody.
   */
  const DIAGNOSES =
    /\byou (?:may|might|could|cannot|can't|will) (?:not )?(?:be able to )?(?:see|tell|distinguish|perceive)\b|\byour (?:eyes|vision|colour vision|color vision)\b|あなたの目|あなたには見/iu;

  const CVD_KEYS = Object.keys(en).filter((k) => k.startsWith('cvd.'));

  it('has copy to check at all', () => {
    // A scan over an empty set reports the same "no offenders" as a clean one.
    expect(CVD_KEYS.length).toBeGreaterThanOrEqual(7);
  });

  it('says nothing about the reader, in either language', () => {
    for (const key of CVD_KEYS) {
      expect(en[key as keyof typeof en]).not.toMatch(DIAGNOSES);
      expect(ja[key as keyof typeof en]).not.toMatch(DIAGNOSES);
    }
  });

  it('DECOY — the check can see a diagnosis', () => {
    // Without this, the assertion above would pass on a pattern that matches nothing
    // [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
    expect(DIAGNOSES.test('You may not be able to distinguish these two.')).toBe(true);
    expect(DIAGNOSES.test('This depends on your colour vision.')).toBe(true);
    expect(DIAGNOSES.test('あなたの目には見分けにくいかもしれません。')).toBe(true);
    expect(DIAGNOSES.test('These two are hard to tell apart')).toBe(false);
  });

  it('describes the colours, not a person — positively', () => {
    // The decoy proves the check fires; this proves the copy says the right thing rather than
    // merely avoiding the wrong one.
    expect(en['cvd.hard']).toContain('These two');
    expect(en['cvd.none']).toContain('Every pair here');
  });

  it('states how the number was produced, rather than presenting it bare', () => {
    // ADR-0031: a measurement without its conditions is a claim. The method line names the
    // model, the severity and the pinned corpus version.
    expect(en['cvd.method']).toContain('published model');
    expect(en['cvd.method']).toContain('strongest tabulated severity');
  });
});

describe('no simulation preview exists', () => {
  it('the module renders nothing and simulates nothing for display', () => {
    /*
     * [[cvd-is-scoring-not-rendering]]. A display filter shows a person what their palette looks
     * like TO SOMEONE ELSE — the industry default, and close to useless for the person it names.
     * `simulateAnomalous` is legitimately used INSIDE `separationScore`; what must not appear is
     * this module calling it to produce a colour for the screen.
     */
    const source = readFileSync(join(__dirname, '..', 'src', 'outfit', 'cvd.ts'), 'utf8');
    expect(source).not.toMatch(/simulateAnomalous|simulateDichromacy/u);
    expect(source).toContain('separationScore');
    // And the screen draws no simulated colour either.
    const screen = readFileSync(
      join(__dirname, '..', 'src', 'screens', 'PaletteStudio.tsx'),
      'utf8',
    );
    expect(screen).not.toMatch(/simulateAnomalous|simulateDichromacy/u);
  });
});
