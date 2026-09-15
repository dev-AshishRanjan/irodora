/**
 * The seasonal summary (F-223, ADR-0102): what the parser refuses, and what the evaluator
 * guarantees over every profile it can be given.
 *
 * **Fixtures, not the published rule.** The rule file is content published in a later increment;
 * these tests pin the engine's behaviour on rule sets built here, whose numbers claim nothing.
 * The published file is parsed by gate 11 and by the app's tests.
 *
 * **Grids rather than random sampling.** The summary is a finite classification, so an exhaustive
 * grid that includes every boundary value exactly — the values where a comparison can go the wrong
 * way — covers more of what can fail than random draws would, and needs no new dependency.
 */

import { describe, expect, it } from 'vitest';
import {
  AXIS_CLASSES,
  classifyAxis,
  MODIFIER_IDS,
  parseSeasonalRules,
  RuleError,
  SEASON_IDS,
  seasonalCellCount,
  summariseSeason,
  type AxisClass,
  type ContrastPreference,
  type PersonalProfile,
  type ScoreFactor,
  type SeasonalAxis,
  type SeasonalSummary,
} from '../src/index.js';

const WHY = 'a fixture rationale that is long enough to count';

type Json = Record<string, unknown>;

/** A fixture rule: temperature, lightness and chroma, 27 rows, "none" wherever temperature is middle. */
function fixture(options: { tempAt?: number; words?: 'a' | 'b' } = {}): Json {
  const t = options.tempAt ?? 1 / 6;
  const axes = [
    {
      axis: 'temperature',
      statistic: 'bias',
      boundaries: [
        { at: -t, side: 'above' },
        { at: t, side: 'below' },
      ],
      rationale: WHY,
    },
    {
      axis: 'lightness',
      statistic: 'midpoint',
      boundaries: [
        { at: 0.4, side: 'below' },
        { at: 0.7, side: 'below' },
      ],
      rationale: WHY,
    },
    {
      axis: 'chroma',
      statistic: 'midpoint',
      boundaries: [
        { at: 0.04, side: 'below' },
        { at: 0.1, side: 'below' },
      ],
      rationale: WHY,
    },
  ];
  const table: Json[] = [];
  for (const temperature of AXIS_CLASSES)
    for (const lightness of AXIS_CLASSES)
      for (const chroma of AXIS_CLASSES) {
        const when = { temperature, lightness, chroma };
        if (temperature === 'middle') {
          table.push({ when, none: true, rationale: WHY });
          continue;
        }
        const warm = temperature === 'high';
        const deep = lightness === 'low';
        const season = warm ? (deep ? 'autumn' : 'spring') : deep ? 'winter' : 'summer';
        const modifier =
          options.words === 'b'
            ? warm
              ? 'warm'
              : 'cool'
            : chroma === 'low'
              ? 'muted'
              : chroma === 'high'
                ? 'bright'
                : deep
                  ? 'deep'
                  : 'light';
        table.push({ when, season, modifier, rationale: WHY });
      }
  return { versionId: 'test.1', publishedAt: '2026-09-15', axes, table };
}

const profile = (
  bias: number,
  lightness: readonly [number, number],
  chroma: readonly [number, number],
  contrast: ContrastPreference = 'medium',
  confidence: Partial<Record<ScoreFactor, number>> = {},
): PersonalProfile => ({
  temperatureBias: bias,
  lightness: { min: lightness[0], max: lightness[1] },
  chroma: { min: chroma[0], max: chroma[1] },
  contrast,
  confidence: { temperature: 0.75, lightness: 0.75, chroma: 0.75, contrast: 0.75, ...confidence },
});

const rules = parseSeasonalRules(fixture(), 'fixture');

describe('the parser', () => {
  it('accepts a complete rule and counts its cells', () => {
    expect(seasonalCellCount(rules)).toBe(27);
    expect(rules.axes.map((a) => a.axis)).toEqual(['temperature', 'lightness', 'chroma']);
  });

  /** Each spoiling is the clean fixture plus one change, and must be refused naming its field. */
  const spoil = (mutate: (value: Json) => void): unknown => {
    const value = fixture();
    mutate(value);
    return value;
  };
  /** An element of a fixture array, or a loud failure — a spoiling aimed at nothing proves nothing. */
  const nth = (list: unknown, i: number): Json => {
    const item: unknown = (list as unknown[])[i];
    if (typeof item !== 'object' || item === null)
      throw new Error(`the fixture has no element ${String(i)}`);
    return item as Json;
  };
  /**
   * The refusal naming a planted key. Built from strings: `verify-no-inference` reads a regex
   * literal as code, and a bare prohibited word inside one is an identifier it rightly refuses.
   */
  const notAField = (at: string, key: string): RegExp =>
    new RegExp(`${at}${key} is not a field`, 'u');
  const table = (v: Json): Json[] => v['table'] as Json[];
  const axis = (v: Json, i: number): Json => nth(v['axes'], i);
  const row = (v: Json, i: number): Json => nth(v['table'], i);
  const cases: [string, (v: Json) => void, RegExp][] = [
    ['a cell removed', (v) => table(v).splice(5, 1), /no row for 1 of 27 tuples/u],
    [
      'a cell answered twice',
      (v) => table(v).push({ ...row(v, 0) }),
      /table\[27\] answers .* which table\[0\]/u,
    ],
    [
      'boundaries out of order',
      (v) => (axis(v, 1)['boundaries'] as Json[]).reverse(),
      /axes\[1\]\.boundaries must be in increasing order/u,
    ],
    [
      'a boundary on the end of its domain',
      (v) => (nth(axis(v, 0)['boundaries'], 1)['at'] = 1),
      /axes\[0\]\.boundaries\[1\]\.at is 1, outside temperature/u,
    ],
    [
      'a boundary with no side',
      (v) => delete nth(axis(v, 2)['boundaries'], 0)['side'],
      /axes\[2\]\.boundaries\[0\]\.side/u,
    ],
    [
      'an axis about undertone',
      (v) => (axis(v, 0)['axis'] = 'undertone'),
      /axes\[0\]\.axis .*"undertone".*NFR-22/u,
    ],
    [
      'an axis about skin',
      (v) => (axis(v, 0)['axis'] = 'skin'),
      /axes\[0\]\.axis .*"skin".*NFR-22/u,
    ],
    [
      'a statistic the axis does not have',
      (v) => (axis(v, 0)['statistic'] = 'midpoint'),
      /axes\[0\]\.statistic must be one of bias/u,
    ],
    [
      'boundaries on contrast',
      (v) =>
        (v['axes'] as Json[]).push({
          axis: 'contrast',
          statistic: 'preference',
          boundaries: [],
          rationale: WHY,
        }),
      /axes\[3\]\.boundaries must be absent for contrast/u,
    ],
    [
      'a season nobody published',
      (v) => (row(v, 0)['season'] = 'monsoon'),
      /table\[0\]\.season must be one of spring/u,
    ],
    [
      'a modifier nobody published',
      (v) => (row(v, 0)['modifier'] = 'fair'),
      /table\[0\]\.modifier must be one of light/u,
    ],
    [
      'a rationale that says nothing',
      (v) => (row(v, 3)['rationale'] = 'ok'),
      /table\[3\]\.rationale is required/u,
    ],
    [
      'a row on an axis the rule does not read',
      (v) => (nth([row(v, 2)['when']], 0)['contrast'] = 'low'),
      /table\[2\]\.when\.contrast: this rule does not read contrast/u,
    ],
    [
      'a row missing an axis',
      (v) => delete nth([row(v, 4)['when']], 0)['chroma'],
      /table\[4\]\.when\.chroma must be one of low/u,
    ],
    [
      'a "none" row that also names a season',
      (v) => (row(v, 9)['season'] = 'autumn'),
      /table\[9\]: a row with "none" carries no season/u,
    ],
    [
      'an axis named twice',
      (v) => (axis(v, 2)['axis'] = 'lightness'),
      /axes name lightness twice/u,
    ],
    // NFR-22's schema half: a field nobody reads is refused, at every level, by name.
    [
      'a field about skin on a row',
      (v) => (row(v, 0)['skin'] = 'fair'),
      notAField('table\\[0\\]\\.', 'skin'),
    ],
    [
      'a field about undertone at the top',
      (v) => (v['undertone'] = { yellow: 'spring' }),
      notAField('fixture\\.', 'undertone'),
    ],
    [
      'a field on an axis',
      (v) => (axis(v, 0)['group'] = 'face'),
      /axes\[0\]\.group is not a field/u,
    ],
    [
      'a field on a boundary',
      (v) => (nth(axis(v, 1)['boundaries'], 0)['label'] = 'fair'),
      /axes\[1\]\.boundaries\[0\]\.label is not a field/u,
    ],
    [
      'a date that is not one',
      (v) => (v['publishedAt'] = '2026-13-45'),
      /publishedAt must be a calendar date/u,
    ],
    [
      'a leap day in a year without one',
      (v) => (v['publishedAt'] = '2026-02-29'),
      /publishedAt must be a calendar date/u,
    ],
    ['no version', (v) => (v['versionId'] = ''), /versionId is required/u],
    [
      'two boundaries at one value',
      (v) => (nth(axis(v, 1)['boundaries'], 1)['at'] = 0.4),
      /axes\[1\]\.boundaries must be in increasing order and apart/u,
    ],
    [
      'one boundary',
      (v) => (axis(v, 2)['boundaries'] as Json[]).pop(),
      /axes\[2\]\.boundaries must be exactly two/u,
    ],
    [
      'a boundary that is a string',
      (v) => (nth(axis(v, 2)['boundaries'], 0)['at'] = '0.04'),
      /axes\[2\]\.boundaries\[0\]\.at must be a finite number/u,
    ],
    [
      'a boundary that is not finite',
      (v) => (nth(axis(v, 2)['boundaries'], 0)['at'] = Number.POSITIVE_INFINITY),
      /axes\[2\]\.boundaries\[0\]\.at must be a finite number/u,
    ],
  ];
  it.each(cases)('refuses %s, naming the field', (_name, mutate, message) => {
    expect(() => parseSeasonalRules(spoil(mutate), 'fixture')).toThrow(RuleError);
    expect(() => parseSeasonalRules(spoil(mutate), 'fixture')).toThrow(message);
  });

  it('refuses a table that is not total, whichever cell is missing', () => {
    for (let i = 0; i < 27; i += 1) {
      const v = fixture();
      table(v).splice(i, 1);
      expect(() => parseSeasonalRules(v, 'fixture')).toThrow(/no row for 1 of 27/u);
    }
  });

  it('accepts a leap day in a leap year — the date check is a calendar, not a pattern', () => {
    const v = fixture();
    v['publishedAt'] = '2028-02-29';
    expect(parseSeasonalRules(v, 'fixture').publishedAt).toBe('2028-02-29');
  });
});

/** Every boundary value exactly, plus a grid between — where a comparison can go the wrong way. */
const BIASES = [
  ...Array.from({ length: 97 }, (_, i) => -1 + i / 48),
  -1 / 6,
  1 / 6,
  -1 / 3,
  1 / 3,
  (2 * 2) / 3 - 1,
  (2 * 1) / 3 - 1,
];
const RANGES: [number, number][] = [];
for (let lo = 0; lo <= 1.0001; lo += 0.1)
  for (let hi = lo; hi <= 1.0001; hi += 0.1) RANGES.push([Math.min(lo, 1), Math.min(hi, 1)]);
RANGES.push([0.4, 0.4], [0.7, 0.7], [0.3, 0.5], [0.6, 0.8]);
const CHROMAS: [number, number][] = [
  [0, 0],
  [0.02, 0.06],
  [0.04, 0.04],
  [0.03, 0.12],
  [0.1, 0.1],
  [0.08, 0.2],
  [0.2, 0.4],
];
const CONTRASTS: ContrastPreference[] = ['low', 'medium', 'high'];

function* everyProfile(): Generator<PersonalProfile> {
  for (const bias of BIASES)
    for (const lightness of RANGES)
      for (const chroma of CHROMAS) yield profile(bias, lightness, chroma);
}

/** What a summary says, as one string: the words, or the kind of no. */
const said = (s: SeasonalSummary): string =>
  s.kind === 'label' ? `${s.season} ${s.modifier}` : `none ${s.reason}`;

describe('the evaluator, over every profile in the grid', () => {
  /*
   * ONE ASSERTION PER PROPERTY over a list of what went wrong, not one per profile. The grid is
   * about 50,000 profiles, and an `expect` for each made these tests take seconds on their own and
   * time out under turbo's parallel load (F-223's review). The list also names every offender at
   * once, where a failing `expect` stops at the first.
   */
  it('is total and deterministic, and answers with a closed vocabulary', () => {
    let labels = 0;
    const problems: string[] = [];
    for (const p of everyProfile()) {
      const first = summariseSeason(p, rules);
      const again = summariseSeason({ ...p, confidence: { ...p.confidence } }, rules);
      if (JSON.stringify(again) !== JSON.stringify(first))
        problems.push(`differs on a second read: ${JSON.stringify(p)}`);
      if (first.kind === 'label') {
        labels += 1;
        if (!SEASON_IDS.includes(first.season) || !MODIFIER_IDS.includes(first.modifier))
          problems.push(`outside the vocabulary: ${said(first)}`);
        if (Object.keys(first.basis).sort().join(' ') !== 'chroma lightness temperature')
          problems.push(`basis ${Object.keys(first.basis).join(' ')}: ${JSON.stringify(p)}`);
      } else if (first.reason !== 'not-summarised')
        problems.push(`${said(first)}: ${JSON.stringify(p)}`);
    }
    expect(problems).toHaveLength(0);
    expect(labels).toBeGreaterThan(0);
  });

  it('never reads what it discards: contrast, and any confidence above zero', () => {
    const problems: string[] = [];
    for (const p of everyProfile()) {
      const base = summariseSeason(p, rules);
      const baseText = JSON.stringify(base);
      for (const contrast of CONTRASTS)
        if (JSON.stringify(summariseSeason({ ...p, contrast }, rules)) !== baseText)
          problems.push(`contrast ${contrast} changed it: ${JSON.stringify(p)}`);
      const surer = summariseSeason(
        { ...p, confidence: { temperature: 1, lightness: 0.5, chroma: 0.25, contrast: 0 } },
        rules,
      );
      if (said(surer) !== said(base))
        problems.push(`a surer confidence changed ${said(base)} to ${said(surer)}`);
    }
    expect(problems).toHaveLength(0);
  });

  it('withholds the label exactly when an axis it reads was never established', () => {
    const p = profile(0.9, [0.1, 0.3], [0.01, 0.03]);
    expect(summariseSeason(p, rules).kind).toBe('label');
    for (const axis of ['temperature', 'lightness', 'chroma'] as const) {
      const result = summariseSeason({ ...p, confidence: { ...p.confidence, [axis]: 0 } }, rules);
      expect(result).toEqual({
        kind: 'none',
        reason: 'not-established',
        axes: [axis],
        ruleVersion: 'test.1',
      });
    }
    // Contrast is not read, so an unestablished contrast changes nothing.
    expect(summariseSeason({ ...p, confidence: { ...p.confidence, contrast: 0 } }, rules)).toEqual(
      summariseSeason(p, rules),
    );
  });

  it('classifies each axis monotonically: raising one statistic never moves it back down', () => {
    const order = (c: AxisClass): number => AXIS_CLASSES.indexOf(c);
    const [temperature, lightness, chroma] = rules.axes as [
      (typeof rules.axes)[number],
      (typeof rules.axes)[number],
      (typeof rules.axes)[number],
    ];
    const sortedBiases = [...BIASES].sort((a, b) => a - b);
    let last = -1;
    for (const bias of sortedBiases) {
      const now = order(classifyAxis(temperature, profile(bias, [0.5, 0.5], [0.05, 0.05])));
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
    for (const [ax, place] of [
      [lightness, (v: number) => profile(0.5, [v, v], [0.05, 0.05])],
      [chroma, (v: number) => profile(0.5, [0.5, 0.5], [v, v])],
    ] as const) {
      last = -1;
      for (let v = 0; v <= 1.0001; v += 0.005) {
        const now = order(classifyAxis(ax, place(Math.min(v, 1))));
        expect(now).toBeGreaterThanOrEqual(last);
        last = now;
      }
    }
  });

  it('puts a value exactly on a boundary on the side the rule declares', () => {
    const [temperature] = rules.axes as [(typeof rules.axes)[number]];
    // -1/6 is declared "above": it belongs to the middle class. +1/6 is "below": middle too.
    expect(classifyAxis(temperature, profile(-1 / 6, [0.5, 0.5], [0.05, 0.05]))).toBe('middle');
    expect(classifyAxis(temperature, profile(1 / 6, [0.5, 0.5], [0.05, 0.05]))).toBe('middle');
    expect(classifyAxis(temperature, profile(-1 / 6 - 1e-12, [0.5, 0.5], [0.05, 0.05]))).toBe(
      'low',
    );
    expect(classifyAxis(temperature, profile(1 / 6 + 1e-12, [0.5, 0.5], [0.05, 0.05]))).toBe(
      'high',
    );
  });

  it('refuses a profile that is not one, rather than labelling it', () => {
    expect(() => summariseSeason(profile(Number.NaN, [0.5, 0.5], [0.05, 0.05]), rules)).toThrow(
      /temperature is NaN/u,
    );
    expect(() => summariseSeason(profile(5, [0.5, 0.5], [0.05, 0.05]), rules)).toThrow(
      /temperature is 5, not a bias/u,
    );
    expect(() => summariseSeason(profile(0.5, [0.8, 0.2], [0.05, 0.05]), rules)).toThrow(
      /lightness is 0\.8 … 0\.2/u,
    );
    expect(() => summariseSeason(profile(0.5, [0.5, 0.5], [-0.1, 0.05]), rules)).toThrow(
      /chroma is -0\.1 … 0\.05/u,
    );
  });

  it('classifies contrast by its three values, and refuses a fourth rather than calling it high', () => {
    const contrast: SeasonalAxis = {
      axis: 'contrast',
      statistic: 'preference',
      boundaries: null,
      rationale: WHY,
    };
    expect(
      CONTRASTS.map((c) => classifyAxis(contrast, profile(0.5, [0.5, 0.5], [0.05, 0.05], c))),
    ).toEqual(['low', 'middle', 'high']);
    const bogus = {
      ...profile(0.5, [0.5, 0.5], [0.05, 0.05]),
      contrast: 'bogus' as unknown as ContrastPreference,
    };
    expect(() => classifyAxis(contrast, bogus)).toThrow(/contrast is "bogus"/u);
  });
});

describe('the rule is content, not code (FR-67)', () => {
  it('one unchanged engine, two rule sets, the same profile, two answers', () => {
    const other = parseSeasonalRules(fixture({ tempAt: 0.5, words: 'b' }), 'other');
    const p = profile(0.3, [0.2, 0.3], [0.01, 0.02]);
    const a = summariseSeason(p, rules);
    const b = summariseSeason(p, other);
    expect(a).toMatchObject({ kind: 'label', season: 'autumn', modifier: 'muted' });
    // At 0.3 the other rule's temperature boundary (0.5) has not been crossed: no summary.
    expect(b).toMatchObject({ kind: 'none', reason: 'not-summarised' });
    const warm = profile(0.9, [0.2, 0.3], [0.01, 0.02]);
    expect(summariseSeason(warm, other)).toMatchObject({ season: 'autumn', modifier: 'warm' });
  });
});
