/**
 * The seasonal summary over every profile the guided flow can produce (F-223, ADR-0102).
 *
 * Twelve two-way trials make 4,096 complete answer sets. Every one is derived against the
 * published corpus bundle and summarised by the PUBLISHED rule, so what is asserted here is what a
 * person who finishes the flow can actually be shown — not a fixture's behaviour.
 *
 * The test that earns its place is the symmetry one, with its decoy. The derivation's own
 * temperature threshold (1/3) sits on a value two-of-three answers produce, and floating point
 * lands a warm split and a cool split on opposite sides of it (F-276). The published rule puts its
 * boundary in the gap instead; a copy of the rule with the boundary moved onto 1/3 must FAIL the
 * same assertion, which is what proves the assertion can see the trap.
 */

import { parsePhraseLexicon } from '@irodora/corpus';
import {
  classifyAxis,
  parseSeasonalRules,
  summariseSeason,
  type AxisClass,
  type SeasonalRules,
} from '@irodora/recommendation';
import type { NewPersonalProfile } from '@irodora/store';
import { deriveProfile } from '../src/profile/derive';
import { seasonalSummary } from '../src/profile/season';
import { TRIALS, type TrialAnswer } from '../src/profile/trials';
import { seasonalRules } from '../src/rules';
import { LEXICON_LABEL, LEXICON_TEXT } from '../src/rules/generated/lexicon';
import { SEASONAL_TEXT } from '../src/rules/generated/seasonal';

const published = seasonalRules();

/** Every complete answer set, as a bit pattern over the twelve trials. */
function answerSet(bits: number): readonly TrialAnswer[] {
  return TRIALS.map((trial, i) => ({ trialId: trial.id, pole: (bits >> i) & 1 ? 'a' : 'b' }));
}
const everyProfile = (): NewPersonalProfile[] =>
  Array.from({ length: 1 << TRIALS.length }, (_, bits) =>
    deriveProfile(`p${String(bits)}`, answerSet(bits)),
  );
const profiles = everyProfile();

const axis = (rules: SeasonalRules, name: 'temperature' | 'lightness' | 'chroma') => {
  const found = rules.axes.find((a) => a.axis === name);
  if (found === undefined) throw new Error(`the rule does not read ${name}`);
  return found;
};

describe('the published seasonal rule over every guided profile', () => {
  it('loads through the ledger check and parses', () => {
    expect(published.rows.length).toBe(27);
    expect(published.axes.map((a) => a.axis)).toEqual(['temperature', 'lightness', 'chroma']);
  });

  it('summarises all 4,096 without throwing, and says what it did', () => {
    expect(profiles).toHaveLength(4096);
    const counts = new Map<string, number>();
    for (const profile of profiles) {
      const summary = seasonalSummary(profile);
      const key =
        summary.kind === 'label'
          ? `${summary.season} ${summary.modifier}`
          : `none (${summary.reason})`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // Printed, not asserted: the distribution is for the person reviewing the rule to read.
    console.log(
      `seasonal summary over ${String(profiles.length)} guided profiles:\n` +
        [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k, n]) => `  ${k}: ${String(n)}`)
          .join('\n'),
    );
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(4096);
    // No complete guided profile is unestablished: every read axis was asked three times.
    expect(counts.has('none (not-established)')).toBe(false);
  });

  it('reports whether a finished profile can reach "no summary" — the evidence OQ-33 needs', () => {
    const none = profiles.filter((p) => seasonalSummary(p).kind === 'none').length;
    console.log(
      `finished guided profiles with no summary: ${String(none)} of ${String(profiles.length)}`,
    );
    expect(none).toBeGreaterThanOrEqual(0);
  });

  it('puts no reachable temperature on a boundary, and reports the closest any statistic comes', () => {
    const temperature = axis(published, 'temperature');
    const biases = new Set(profiles.map((p) => p.temperatureBias));
    for (const bias of biases)
      for (const boundary of temperature.boundaries ?? []) expect(bias).not.toBe(boundary.at);
    let closest = Number.POSITIVE_INFINITY;
    for (const p of profiles)
      for (const [name, value] of [
        ['temperature', p.temperatureBias],
        ['lightness', (p.lightness.min + p.lightness.max) / 2],
        ['chroma', (p.chroma.min + p.chroma.max) / 2],
      ] as const)
        for (const b of axis(published, name).boundaries ?? [])
          closest = Math.min(closest, Math.abs(value - b.at));
    console.log(
      `smallest distance from a reachable statistic to a boundary: ${closest.toExponential(3)}`,
    );
  });
});

/** Does a warm two-of-three split land where the mirrored cool split does, mirrored? */
function symmetric(rules: SeasonalRules): boolean {
  const temperature = axis(rules, 'temperature');
  const mirror: Record<AxisClass, AxisClass> = { low: 'high', middle: 'middle', high: 'low' };
  const temperatureTrials = TRIALS.filter((t) => t.axis === 'temperature');
  for (let bits = 0; bits < 1 << temperatureTrials.length; bits += 1) {
    const answers = (flip: boolean): TrialAnswer[] =>
      TRIALS.map((trial) => {
        const i = temperatureTrials.indexOf(trial);
        const chosen = i < 0 ? 'a' : (bits >> i) & 1 ? 'a' : 'b';
        const pole = flip && i >= 0 ? (chosen === 'a' ? 'b' : 'a') : chosen;
        return { trialId: trial.id, pole };
      });
    const one = classifyAxis(temperature, deriveProfile('one', answers(false)));
    const other = classifyAxis(temperature, deriveProfile('other', answers(true)));
    if (other !== mirror[one]) return false;
  }
  return true;
}

describe('the temperature boundary sits in a gap, and the test can tell', () => {
  it('classifies a warm split and the mirrored cool split symmetrically', () => {
    expect(symmetric(published)).toBe(true);
  });

  it('the decoy: the same rule with its boundary on 1/3 is NOT symmetric', () => {
    const raw = JSON.parse(SEASONAL_TEXT) as {
      axes: { axis: string; boundaries?: { at: number }[] }[];
    };
    const decoy = structuredClone(raw);
    const t = decoy.axes.find((a) => a.axis === 'temperature');
    if (t?.boundaries === undefined) throw new Error('the published rule has no temperature axis');
    const [low, high] = t.boundaries;
    if (low === undefined || high === undefined) throw new Error('two boundaries expected');
    low.at = -1 / 3;
    high.at = 1 / 3;
    expect(symmetric(parseSeasonalRules(decoy, 'decoy'))).toBe(false);
  });
});

describe('the rule agrees with the product’s one definition of dark and light', () => {
  const lexicon = parsePhraseLexicon(JSON.parse(LEXICON_TEXT), `${LEXICON_LABEL}.json`);
  const region = (term: string, name: 'lightness' | 'chroma') => {
    const found = lexicon.terms.find((t) => t.term === term && t.locale === 'en');
    const range = found?.constrains[name];
    if (range === undefined) throw new Error(`the lexicon has no ${name} region for "${term}"`);
    return range;
  };

  it('lightness: its boundaries are the lexicon’s dark|medium and medium|light edges', () => {
    const [first, second] = axis(published, 'lightness').boundaries ?? [];
    expect(first?.at).toBe(region('dark', 'lightness').max);
    expect(second?.at).toBe(region('light', 'lightness').min);
  });

  it('chroma: its boundaries are the lexicon’s grey and vivid edges', () => {
    const [first, second] = axis(published, 'chroma').boundaries ?? [];
    expect(first?.at).toBe(region('grey', 'chroma').max);
    expect(second?.at).toBe(region('vivid', 'chroma').min);
  });
});

describe('the rule is content, not code (FR-67)', () => {
  it('one unchanged engine, the published rule and an edited copy, different summaries', () => {
    const edited = structuredClone(JSON.parse(SEASONAL_TEXT)) as {
      table: { none?: boolean; season?: string; modifier?: string }[];
    };
    for (const row of edited.table)
      if (row.none !== true) {
        row.season = 'winter';
        row.modifier = 'cool';
      }
    const other = parseSeasonalRules(edited, 'edited');
    const profile = profiles.find((p) => summariseSeason(p, published).kind === 'label');
    if (profile === undefined) throw new Error('no guided profile gets a label');
    expect(summariseSeason(profile, other)).not.toEqual(summariseSeason(profile, published));
  });
});

describe('the label has nowhere to be stored', () => {
  it('a profile carrying a label is not a profile the store accepts', () => {
    const save = (profile: NewPersonalProfile): NewPersonalProfile => profile;
    const profile = profiles[0];
    if (profile === undefined) throw new Error('no profile');
    // @ts-expect-error — NewPersonalProfile has no field for a seasonal label (ADR-0102).
    save({ ...profile, seasonalLabel: 'autumn muted' });
    expect(Object.keys(profile)).not.toContain('seasonalLabel');
  });
});
